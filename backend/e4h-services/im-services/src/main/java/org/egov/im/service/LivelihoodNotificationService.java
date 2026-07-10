package org.egov.im.service;

import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.im.config.IMConfiguration;
import org.egov.im.producer.Producer;
import org.egov.im.repository.ServiceRequestRepository;
import org.egov.im.util.HRMSUtil;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.RequestInfoWrapper;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.egov.im.util.IMConstants.*;

@Service
@Slf4j
public class LivelihoodNotificationService {

    private static final String OOW_END_USER_REMINDER_REASON =
            "Awaiting your out-of-warranty decision on the vendor quotation";
    private static final String OOW_VENDOR_REMINDER_REASON = "Awaiting end-user decision on the quotation";

    private final LivelihoodSmsNotificationService livelihoodSmsNotificationService;
    private final NotificationService notificationService;
    private final IMConfiguration config;
    private final HRMSUtil hrmsUtil;
    private final ServiceRequestRepository repository;
    private final Producer producer;

    public LivelihoodNotificationService(
            LivelihoodSmsNotificationService livelihoodSmsNotificationService,
            @Lazy NotificationService notificationService,
            IMConfiguration config,
            HRMSUtil hrmsUtil,
            ServiceRequestRepository repository,
            Producer producer
    ) {
        this.livelihoodSmsNotificationService = livelihoodSmsNotificationService;
        this.notificationService = notificationService;
        this.config = config;
        this.hrmsUtil = hrmsUtil;
        this.repository = repository;
        this.producer = producer;
    }

    /**
     * LLD: ticket created (auto-assigned) — SMS to facility manager, SMS to vendor, email to POC (self-create only).
     */
    public void notifyOnCreate(IncidentRequest request) {
        if (request == null || request.getIncident() == null) {
            return;
        }
        Incident incident = request.getIncident();
        if (!LIVELIHOOD_PENDING_FOR_RESOLUTION.equalsIgnoreCase(incident.getApplicationStatus())) {
            return;
        }

        if (Boolean.TRUE.equals(incident.getCreatedOnBehalf())) {
            notifyComplainantSms(request, LIV_TPL_002);
            notifyVendorSms(request, LIV_TPL_003);
        } else {
            notifyComplainantSms(request, LIV_TPL_001);
            notifyVendorSms(request, LIV_TPL_017);
            notifyPoc(request);
        }
    }

    /**
     * Livelihood workflow notifications on vendor/POC actions.
     */
    public void notifyOnUpdate(IncidentRequest request, String previousStatus) {
        if (request == null || request.getIncident() == null || request.getWorkflow() == null) {
            return;
        }
        String action = request.getWorkflow().getAction();
        if (StringUtils.isBlank(action)) {
            return;
        }
        String normalizedAction = action.trim().toUpperCase(Locale.ROOT);
        String newStatus = request.getIncident().getApplicationStatus();

        switch (normalizedAction) {
            case "RESOLVE" -> {
                if (LIVELIHOOD_RESOLVED.equalsIgnoreCase(newStatus)) {
                    notifyComplainantSms(request, LIV_TPL_011);
                }
            }
            case "OUT_OF_SCOPE" -> {
                if (LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC.equalsIgnoreCase(newStatus)) {
                    notifyPocOutOfScope(request);
                }
            }
            case "OUT_OF_WARRANTY" -> {
                if (LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equalsIgnoreCase(newStatus)) {
                    notifyComplainantSms(request, LIV_TPL_009);
                    notifyPocOutOfWarranty(request);
                }
            }
            case "DECLINE" -> {
                if (LIVELIHOOD_CLOSED_AFTER_DECLINE.equalsIgnoreCase(newStatus)) {
                    notifyComplainantSms(request, LIV_TPL_014);
                    notifyPocVendorDeclined(request);
                }
            }
            case "REOPEN" -> {
                if (LIVELIHOOD_PENDING_FOR_RESOLUTION.equalsIgnoreCase(newStatus)) {
                    notifyVendorSms(request, LIV_TPL_017);
                }
            }
            case "REASSIGN" -> {
                if (LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR.equalsIgnoreCase(newStatus)) {
                    notifyComplainantSms(request, LIV_TPL_007);
                    notifyVendorSms(request, LIV_TPL_008);
                }
            }
            case "AUTO_CLOSE" -> {
                if (LIVELIHOOD_CLOSED_AFTER_RESOLUTION.equalsIgnoreCase(newStatus)) {
                    log.debug("Skipping optional SMS for auto-close on incidentId={}",
                            request.getIncident().getIncidentId());
                }
            }
            default -> { }
        }
    }

    /**
     * LLD: vendor SLA breached — vendor SMS (LIV-TPL-004) and POC escalation email.
     */
    public void notifyVendorSlaBreached(IncidentRequest request) {
        notifyVendorSms(request, LIV_TPL_004);
        notifyPocSlaBreached(request);
    }

    private void notifyPocSlaBreached(IncidentRequest request) {
        Map<String, String> placeholders = livelihoodSmsNotificationService.buildPlaceholders(request);
        sendPocEmail(request,
                "SLA breached: " + request.getIncident().getIncidentId(),
                String.format(
                        "SLA has been breached for livelihood ticket for %s with ID %s submitted on %s. "
                                + "Please review and take necessary action or track ticket details on %s - SELCO Foundation",
                        request.getIncident().getIncidentType(),
                        request.getIncident().getIncidentId(),
                        placeholders.get("date"),
                        placeholders.get("url")
                ));
    }

    /**
     * LLD: OOW reminder (day 7, T-2d) — SMS to facility manager and vendor.
     * Triggered by auto-escalation when ticket is in OUT_OF_WARRANTY_PENDING_VENDOR.
     */
    public void processOowRemindersIfDue(IncidentRequest request) {
        if (request == null || request.getIncident() == null) {
            return;
        }
        if (!LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equalsIgnoreCase(
                request.getIncident().getApplicationStatus())) {
            return;
        }
        notifyComplainantSms(request, LIV_TPL_032, Map.of("reason", OOW_END_USER_REMINDER_REASON));
        notifyVendorSms(request, LIV_TPL_033, Map.of("reason", OOW_VENDOR_REMINDER_REASON));
    }

    private void notifyComplainantSms(IncidentRequest request, String templateCode) {
        notifyComplainantSms(request, templateCode, Map.of());
    }

    private void notifyComplainantSms(IncidentRequest request, String templateCode, Map<String, String> extras) {
        try {
            String mobile = resolveComplainantMobile(request);
            if (StringUtils.isBlank(mobile)) {
                log.warn("Complainant mobile not found for incidentId={}", request.getIncident().getIncidentId());
                return;
            }
            livelihoodSmsNotificationService.sendSms(request, mobile, templateCode, extras);
        } catch (Exception e) {
            log.error("Failed complainant SMS for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private void notifyVendorSms(IncidentRequest request, String templateCode) {
        notifyVendorSms(request, templateCode, Map.of());
    }

    private void notifyVendorSms(IncidentRequest request, String templateCode, Map<String, String> extras) {
        List<String> assignees = request.getWorkflow() != null ? request.getWorkflow().getAssignes() : null;
        if (CollectionUtils.isEmpty(assignees)) {
            log.warn("No vendor assignee for SMS template {} incidentId={}", templateCode,
                    request.getIncident().getIncidentId());
            return;
        }
        try {
            String mobile = fetchUserMobile(assignees.get(0), request.getRequestInfo(), request.getIncident().getTenantId());
            if (StringUtils.isBlank(mobile)) {
                return;
            }
            livelihoodSmsNotificationService.sendSms(request, mobile, templateCode, extras);
        } catch (Exception e) {
            log.error("Failed vendor SMS for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private void notifyPocOutOfScope(IncidentRequest request) {
        String reason = resolveOutOfScopeReason(request);
        sendPocEmail(request,
                "Out of scope – action required: " + request.getIncident().getIncidentId(),
                String.format(
                        "Livelihood ticket for %s with ID %s submitted on %s has been marked as Out of Scope.%n"
                                + "Reason: %s%nPlease review and take necessary action or track ticket details on %s - SELCO Foundation",
                        request.getIncident().getIncidentType(),
                        request.getIncident().getIncidentId(),
                        livelihoodSmsNotificationService.buildPlaceholders(request).get("date"),
                        reason,
                        livelihoodSmsNotificationService.buildPlaceholders(request).get("url")
                ));
    }

    private void notifyPocOutOfWarranty(IncidentRequest request) {
        String quotationLink = livelihoodSmsNotificationService.resolveQuotationLink(request);
        sendPocEmail(request,
                "Out of warranty quotation uploaded: " + request.getIncident().getIncidentId(),
                String.format(
                        "A quotation has been submitted for livelihood support ticket for %s with ID %s, raised on %s. "
                                + "Please review the quotation document by clicking %s. - SELCO Foundation",
                        request.getIncident().getIncidentType(),
                        request.getIncident().getIncidentId(),
                        livelihoodSmsNotificationService.buildPlaceholders(request).get("date"),
                        quotationLink
                ));
    }

    private void notifyPocVendorDeclined(IncidentRequest request) {
        sendPocEmail(request,
                "Ticket closed after decline: " + request.getIncident().getIncidentId(),
                String.format(
                        "Livelihood ticket for %s with ID %s submitted on %s has been declined by the vendor. "
                                + "Reason: %s. Please review and take necessary action or track ticket details on %s - SELCO Foundation",
                        request.getIncident().getIncidentType(),
                        request.getIncident().getIncidentId(),
                        livelihoodSmsNotificationService.buildPlaceholders(request).get("date"),
                        StringUtils.defaultIfBlank(request.getWorkflow().getComments(), "Not specified"),
                        livelihoodSmsNotificationService.buildPlaceholders(request).get("url")
                ));
    }

    private void sendPocEmail(IncidentRequest request, String subject, String body) {
        try {
            String pocEmail = fetchPocEmail(
                    request.getIncident().getTenantId(),
                    request.getIncident().getBoundaryCode(),
                    request.getRequestInfo()
            );
            if (StringUtils.isBlank(pocEmail)) {
                log.warn("POC email not found for incidentId={}", request.getIncident().getIncidentId());
                return;
            }
            sendEmailViaKafka(pocEmail, subject, body, request.getIncident().getTenantId());
        } catch (Exception e) {
            log.error("Failed to send POC email for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private String resolveOutOfScopeReason(IncidentRequest request) {
        if (request.getWorkflow() != null && StringUtils.isNotBlank(request.getWorkflow().getOutOfScopeReason())) {
            return request.getWorkflow().getOutOfScopeReason();
        }
        if (request.getWorkflow() != null && StringUtils.isNotBlank(request.getWorkflow().getComments())) {
            return request.getWorkflow().getComments();
        }
        return "Not specified";
    }

    private String resolveComplainantMobile(IncidentRequest request) {
        org.egov.im.web.models.User reporter = request.getIncident().getReporter();
        if (reporter != null && StringUtils.isNotBlank(reporter.getMobileNumber())) {
            return reporter.getMobileNumber();
        }
        if (reporter != null && StringUtils.isNotBlank(reporter.getUuid())) {
            String mobile = fetchUserMobile(
                    reporter.getUuid(),
                    request.getRequestInfo(),
                    request.getIncident().getTenantId()
            );
            if (StringUtils.isNotBlank(mobile)) {
                return mobile;
            }
        }

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                request.getRequestInfo(),
                request.getIncident().getTenantId(),
                request.getIncident().getBoundaryCode()
        );
        return complainant.get("mobile");
    }

    private void notifyPoc(IncidentRequest request) {
        try {
            String boundaryCode = request.getIncident().getBoundaryCode();
            String tenantId = request.getIncident().getTenantId();
            String pocEmail = fetchPocEmail(tenantId, boundaryCode, request.getRequestInfo());
            if (StringUtils.isBlank(pocEmail)) {
                log.warn("POC email not found for tenantId={} boundaryCode={}", tenantId, boundaryCode);
                return;
            }

            Map<String, String> placeholders = livelihoodSmsNotificationService.buildPlaceholders(request);
            String subject = "New Livelihood ticket: " + request.getIncident().getIncidentId();
            String body = String.format(
                    "A new livelihood ticket has been registered under ID %s on %s for end user %s. "
                            + "Please review or track details on %s - SELCO Foundation",
                    request.getIncident().getIncidentId(),
                    placeholders.get("date"),
                    placeholders.get("end_user_name"),
                    placeholders.get("url")
            );
            sendEmailViaKafka(pocEmail, subject, body, tenantId);
        } catch (Exception e) {
            log.error("Failed to send POC email for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private String fetchUserMobile(String uuid, RequestInfo requestInfo, String tenantId) {
        User user = notificationService.fetchUserByUUID(uuid, requestInfo, tenantId);
        return user != null ? user.getMobileNumber() : null;
    }

    private String fetchPocEmail(String tenantId, String boundaryCode, RequestInfo requestInfo) {
        if (StringUtils.isBlank(boundaryCode)) {
            return null;
        }
        StringBuilder url = hrmsUtil.getHRMSURI(null, tenantId, ROLE_LIVELIHOOD_POC, boundaryCode);
        RequestInfoWrapper wrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        Object response = repository.fetchResult(url, wrapper);
        try {
            List<String> emails = JsonPath.read(response, "$.Employees.*.user.emailId");
            if (!CollectionUtils.isEmpty(emails)) {
                return emails.stream().filter(StringUtils::isNotBlank).findFirst().orElse(null);
            }
        } catch (Exception e) {
            log.error("Failed to fetch POC email from HRMS for boundaryCode={}", boundaryCode, e);
        }
        return null;
    }

    private void sendEmailViaKafka(String emailId, String subject, String body, String tenantId) {
        Map<String, Object> email = new HashMap<>();
        email.put("emailTo", new HashSet<>(Collections.singletonList(emailId)));
        email.put("subject", subject);
        email.put("body", body);
        email.put("tenantId", tenantId);

        Map<String, Object> emailRequest = new HashMap<>();
        emailRequest.put("requestInfo", new HashMap<>());
        emailRequest.put("email", email);

        producer.push(tenantId, config.getNotificationEmailTopic(), emailRequest);
        log.info("Published Livelihood POC email to topic {} for {}", config.getNotificationEmailTopic(), emailId);
    }
}
