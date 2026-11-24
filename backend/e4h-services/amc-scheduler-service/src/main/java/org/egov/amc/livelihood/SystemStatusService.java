package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.ScheduledVisitRepository;
import org.egov.amc.util.FacilityPocPhoneUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitSearchCriteria;
import org.egov.amc.web.models.ScheduledVisitSearchRequest;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.egov.tracer.model.CustomException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Pre-report system status and the non-functional email (LLD §6.7). The visit is loaded as the system user, removed
 * visits included, because the caller may no longer be its active assignee (review A18).
 */
@Slf4j
@Service
public class SystemStatusService {

    /** Targeted write (review A8): an offline-queued call can land at any moment, so never a full-row update. */
    static final String STORE_SQL = "UPDATE scheduled_visits SET additional_details = jsonb_set(CASE WHEN additional_details IS NULL"
            + " OR jsonb_typeof(additional_details) <> 'object' THEN '{}'::jsonb ELSE additional_details END, '{systemStatus}', ?::jsonb),"
            + " last_modified_by = ?, last_modified_time = ? WHERE id = ? AND is_active AND status IN ('SCHEDULED','PENDING_OTP_APPROVAL','REJECTED')";
    /** One email per visit: only the caller whose update hits the row sends. */
    static final String CLAIM_SQL = "UPDATE scheduled_visits SET non_functional_notified_at = ? WHERE id = ? AND non_functional_notified_at IS NULL";

    private final AMCServiceConfiguration config;
    private final ScheduledVisitRepository visitRepository;
    private final SystemUserProvider systemUser;
    private final AmcMdmsOptions mdmsOptions;
    private final LivelihoodReportPdfService names;
    private final FacilityPocPhoneUtil phones;
    private final Producer producer;
    private final JdbcTemplate jdbcTemplate;
    private final String emailHtml = readTemplate();

    public SystemStatusService(AMCServiceConfiguration config, ScheduledVisitRepository visitRepository, SystemUserProvider systemUser,
                               AmcMdmsOptions mdmsOptions, LivelihoodReportPdfService names, FacilityPocPhoneUtil phones,
                               Producer producer, JdbcTemplate jdbcTemplate) {
        this.config = config;
        this.visitRepository = visitRepository;
        this.systemUser = systemUser;
        this.mdmsOptions = mdmsOptions;
        this.names = names;
        this.phones = phones;
        this.producer = producer;
        this.jdbcTemplate = jdbcTemplate;
    }

    public LivelihoodSystemStatus.Result update(String tenantId, String visitId, Boolean inUse, Boolean functional, RequestInfo caller) {
        long now = System.currentTimeMillis();
        if (visitId == null || visitId.isBlank()) {
            throw new CustomException("AMC_VISIT_NOT_FOUND", "visitId is required");
        }
        String tenant = tenantId == null ? config.getStateTenantId() : tenantId;
        RequestInfo sys = systemUser.requestInfo();
        List<ScheduledVisit> found = visitRepository.getScheduledVisit(ScheduledVisitSearchRequest.builder().RequestInfo(sys)
                .searchCriteria(ScheduledVisitSearchCriteria.builder().tenantId(tenant).ids(List.of(visitId)).build()).build(), 1, 0, tenant, true, null);
        if (found == null || found.isEmpty()) {
            throw new CustomException("AMC_VISIT_NOT_FOUND", "Visit not found: " + visitId);
        }
        ScheduledVisit visit = found.get(0);
        String by = caller != null && caller.getUserInfo() != null ? caller.getUserInfo().getUuid() : null;

        LivelihoodSystemStatus.Result r = LivelihoodSystemStatus.run(visit, by, inUse, functional, now,
                LivelihoodSystemStatus.EMAIL_SUBJECT, emailHtml, new LivelihoodSystemStatus.Steps() {
                    @Override
                    public List<String> pocEmails() {
                        return mdmsOptions.programPocEmails(tenant, sys);
                    }

                    @Override
                    public boolean storeAnswers(Map<String, Object> systemStatus) {
                        String json = "{\"isSystemInUse\":" + systemStatus.get("isSystemInUse")
                                + ",\"isSystemFunctional\":" + systemStatus.get("isSystemFunctional") + "}";
                        return jdbcTemplate.update(STORE_SQL, json, by, System.currentTimeMillis(), visit.getId()) > 0;
                    }

                    @Override
                    public boolean claim(long now) {
                        return jdbcTemplate.update(CLAIM_SQL, now, visit.getId()) > 0;
                    }

                    @Override
                    public Map<String, String> emailFields() {
                        Facility f = visit.getFacility();
                        if (f != null) {
                            phones.decryptPocPhoneIfPresent(f);
                        }
                        String[] b = names.boundary(f, sys);
                        Map<String, String> m = new LinkedHashMap<>();
                        m.put("end_user_name", f != null ? f.getFacilityName() : null);
                        m.put("end_user_phone", f != null ? f.getFacilityPocPhone() : null);
                        m.put("state", b[0]);
                        m.put("district", b[1]);
                        m.put("block", b[2]);
                        AmcConfiguration cfg = configuration(visit);
                        m.put("vendor_name", names.vendorName(visit, cfg, sys));
                        m.putAll(LivelihoodSystemStatus.amcFields(visit, cfg, now));
                        return m;
                    }

                    @Override
                    public void sendEmail(List<String> to, String subject, String body) {
                        Map<String, Object> email = new HashMap<>();
                        email.put("emailTo", new LinkedHashSet<>(to));
                        email.put("subject", subject);
                        email.put("body", body);
                        email.put("isHTML", true);
                        email.put("tenantId", tenant);
                        Map<String, Object> request = new HashMap<>();
                        request.put("requestInfo", new HashMap<>());
                        request.put("email", email);
                        producer.push(config.getNotificationEmailTopic(), request);
                    }
                });
        log.info("System status for visit {}: inUse={} functional={} stored={} emailSent={}", visitId, inUse, functional, r.stored(), r.emailSent());
        return r;
    }

    /** Best effort: the visit is already claimed, so a failed look-up must not lose the email. */
    private AmcConfiguration configuration(ScheduledVisit visit) {
        try {
            return names.configuration(visit);
        } catch (RuntimeException e) {
            log.warn("AMC not read for the non-functional email of visit {}: {}", visit.getId(), e.getMessage());
            return null;
        }
    }

    /** The client's email template. */
    static String readTemplate() {
        try (InputStream in = new ClassPathResource("templates/amc-non-functional-email.html").getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
