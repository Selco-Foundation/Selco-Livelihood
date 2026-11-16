package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.util.FacilityPocPhoneUtil;
import org.egov.amc.util.MappedVendorUtil;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.SMSRequest;
import org.egov.amc.web.models.User;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Reminder SMS (LLD §6.8): the daily job (09:30 IST, as {@code CRONJOB}), the ops trigger
 * {@code POST /v1/visit/reminder/_run} (open point P1, no web role) and the resend after a field-staff change (§6.6).
 * With {@code notification.sms.enabled=false}, or the dev test mode {@code egov.otp.bypass.validation=true}, the
 * reminder is claimed and logged but no SMS is pushed: dev end-user phones may belong to real people.
 */
@Slf4j
@Service
public class ReminderService {

    /** New visits of running Livelihood AMCs due on the reminder day, not yet reminded. */
    static final String CANDIDATES_SQL = "SELECT sv.id, sv.scheduled_date, f.facility_poc_phone,"
            + " (SELECT sva.assigned_user FROM scheduled_visit_assignments sva WHERE sva.scheduled_visit_id = sv.id AND sva.is_active"
            + " ORDER BY sva.created_time DESC LIMIT 1) AS field_staff"
            + " FROM scheduled_visits sv JOIN amc_configuration ac ON ac.id = sv.amc_configuration_id LEFT JOIN facility f ON f.id = sv.facility_id"
            + " WHERE sv.tenant_id = ? AND sv.is_active AND sv.status = 'SCHEDULED' AND ac.status = 'ACTIVE' AND ac.activity_facility_id IS NOT NULL"
            + " AND sv.reminder_sent_at IS NULL AND sv.scheduled_date >= ? AND sv.scheduled_date < ? ORDER BY sv.scheduled_date, sv.id";
    /** JDBC, not the persister (documented exception): only the run whose update hits the row sends. */
    static final String CLAIM_SQL = "UPDATE scheduled_visits SET reminder_sent_at = ? WHERE id = ? AND reminder_sent_at IS NULL"
            + " AND is_active AND status = 'SCHEDULED'";
    /** Resend: only a visit already reminded, still New and not yet past its due day. */
    static final String RESEND_CLAIM_SQL = "UPDATE scheduled_visits SET reminder_sent_at = ? WHERE id = ? AND reminder_sent_at IS NOT NULL"
            + " AND is_active AND status = 'SCHEDULED' AND scheduled_date >= ?";

    private final AMCServiceConfiguration config;
    private final AmcMdmsOptions mdmsOptions;
    private final SystemUserProvider systemUser;
    private final MappedVendorUtil hrms;
    private final FacilityPocPhoneUtil phones;
    private final Producer producer;
    private final JdbcTemplate jdbc;

    public ReminderService(AMCServiceConfiguration config, AmcMdmsOptions mdmsOptions, SystemUserProvider systemUser, MappedVendorUtil hrms,
                           FacilityPocPhoneUtil phones, Producer producer, JdbcTemplate jdbc) {
        this.config = config;
        this.mdmsOptions = mdmsOptions;
        this.systemUser = systemUser;
        this.hrms = hrms;
        this.phones = phones;
        this.producer = producer;
        this.jdbc = jdbc;
    }

    @Scheduled(cron = "${amc.reminder.cron:0 30 9 * * *}", zone = "Asia/Kolkata")
    public void daily() {
        if (!config.isReminderEnabled()) {
            log.info("Reminder job is switched off (amc.livelihood.reminder.enabled=false)");
            return;
        }
        try {
            run(config.getStateTenantId());
        } catch (RuntimeException e) {
            log.error("Reminder job failed", e);
        }
    }

    /** One run for today (IST). Returns what it did, for the ops trigger. */
    public Map<String, Object> run(String tenantId) {
        RequestInfo sys = systemUser.requestInfo();
        int lead = AmcMdmsOptions.DEFAULT_REMINDER_LEAD_DAYS;
        try {
            lead = mdmsOptions.configDays(tenantId, sys).reminderLeadDays();
        } catch (RuntimeException e) {
            log.warn("AMC.Config not read for the reminder job, using {} days: {}", lead, e.getMessage());
        }
        long now = System.currentTimeMillis();
        LocalDate today = LivelihoodAmc.istDay(now);
        long[] window = LivelihoodReminder.dueWindow(today, lead);
        List<LivelihoodReminder.Candidate> candidates = jdbc.query(CANDIDATES_SQL, (rs, i) -> new LivelihoodReminder.Candidate(
                rs.getString("id"), rs.getLong("scheduled_date"), rs.getString("facility_poc_phone"), rs.getString("field_staff")),
                tenantId, window[0], window[1]);
        LivelihoodReminder.Result r = LivelihoodReminder.run(candidates, config.getReminderSmsTemplate(), config.getReminderDateFormat(), now,
                steps(sys, (c, at) -> jdbc.update(CLAIM_SQL, at, c.visitId()) > 0));
        log.info("Reminder job {}: lead {} days, due {}: {}", today, lead, LivelihoodAmc.istDay(window[0]), r);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("runDate", today.toString());
        out.put("reminderLeadDays", lead);
        out.put("dueDate", LivelihoodAmc.istDay(window[0]).toString());
        out.put("candidates", r.candidates());
        out.put("sent", r.sent());
        out.put("alreadySent", r.alreadySent());
        out.put("noEndUserPhone", r.noEndUserPhone());
        out.put("noFieldStaffMobile", r.noFieldStaffMobile());
        out.put("smsPushed", smsPushed());
        return out;
    }

    /**
     * After a field-staff change (LLD §6.6): each moved New visit whose reminder already went out and whose due day is
     * today or later gets it again with the new person's mobile. Never fails the change: errors are logged.
     */
    public int resendAfterFieldStaffChange(List<ScheduledVisit> visits, String newFieldStaffUuid) {
        if (visits.isEmpty() || newFieldStaffUuid == null) {
            return 0;
        }
        try {
            RequestInfo sys = systemUser.requestInfo();
            long todayStart = LivelihoodAmc.startOfIstDay(LivelihoodAmc.istDay(System.currentTimeMillis()));
            List<LivelihoodReminder.Candidate> candidates = new ArrayList<>();
            for (ScheduledVisit v : visits) {
                if (v.getScheduledDate() != null) {
                    candidates.add(new LivelihoodReminder.Candidate(v.getId(), v.getScheduledDate(),
                            v.getFacility() == null ? null : v.getFacility().getFacilityPocPhone(), newFieldStaffUuid));
                }
            }
            LivelihoodReminder.Result r = LivelihoodReminder.run(candidates, config.getReminderSmsTemplate(), config.getReminderDateFormat(),
                    System.currentTimeMillis(), steps(sys, (c, at) -> jdbc.update(RESEND_CLAIM_SQL, at, c.visitId(), todayStart) > 0));
            log.info("Reminder resend after field-staff change: {}", r);
            return r.sent();
        } catch (RuntimeException e) {
            log.error("Reminder resend after field-staff change failed", e);
            return 0;
        }
    }

    private interface Claim {
        boolean claim(LivelihoodReminder.Candidate c, long now);
    }

    private LivelihoodReminder.Steps steps(RequestInfo sys, Claim claim) {
        return new LivelihoodReminder.Steps() {
            @Override
            public String endUserPhone(LivelihoodReminder.Candidate c) {
                try {
                    return phones.decryptMobileNumber(c.endUserPhone());
                } catch (RuntimeException e) {
                    log.error("End-user phone not decrypted for visit {}", c.visitId(), e);
                    return null;
                }
            }

            @Override
            public Map<String, String> fieldStaffMobiles(Set<String> uuids) {
                Map<String, User> users = hrms.getFieldStaffByUuid(sys, new ArrayList<>(uuids), LivelihoodAmc.ROLE_AMC_FIELD_STAFF);
                Map<String, String> out = new HashMap<>();
                users.forEach((id, u) -> out.put(id, u.getMobileNumber()));
                return out;
            }

            @Override
            public boolean claim(LivelihoodReminder.Candidate c, long now) {
                return claim.claim(c, now);
            }

            @Override
            public void send(LivelihoodReminder.Candidate c, String phone, String fieldStaffMobile, String message) {
                String vendor = OtpRedaction.maskPhone(fieldStaffMobile);
                if (!smsPushed()) {
                    log.warn("Reminder for visit {} not pushed (SMS off or dev test mode): to {}, vendor number {}", c.visitId(),
                            OtpRedaction.maskPhone(phone), vendor);
                    return;
                }
                producer.push(config.getSmsNotificationTopic(), SMSRequest.builder().mobileNumber(phone).message(message).build());
                log.info("Reminder SMS queued for visit {}: to {}, vendor number {}", c.visitId(), OtpRedaction.maskPhone(phone), vendor);
            }
        };
    }

    private boolean smsPushed() {
        return !Boolean.FALSE.equals(config.getSmsEnabled()) && !config.isByPassOtpValidation();
    }
}
