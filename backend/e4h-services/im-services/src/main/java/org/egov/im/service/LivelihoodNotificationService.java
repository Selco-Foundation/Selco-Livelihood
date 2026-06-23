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
import org.egov.im.util.NotificationUtil;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.Notification.SMSRequest;
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

    private final NotificationUtil notificationUtil;
    private final NotificationService notificationService;
    private final IMConfiguration config;
    private final HRMSUtil hrmsUtil;
    private final ServiceRequestRepository repository;
    private final Producer producer;

    public LivelihoodNotificationService(
            NotificationUtil notificationUtil,
            @Lazy NotificationService notificationService,
            IMConfiguration config,
            HRMSUtil hrmsUtil,
            ServiceRequestRepository repository,
            Producer producer
    ) {
        this.notificationUtil = notificationUtil;
        this.notificationService = notificationService;
        this.config = config;
        this.hrmsUtil = hrmsUtil;
        this.repository = repository;
        this.producer = producer;
    }

    public void notifyOnCreate(IncidentRequest request) {
        if (request == null || request.getIncident() == null) {
            return;
        }
        Incident incident = request.getIncident();
        if (!LIVELIHOOD_PENDING_FOR_RESOLUTION.equalsIgnoreCase(incident.getApplicationStatus())) {
            return;
        }

        notifyVendor(request);
        if (Boolean.TRUE.equals(incident.getCreatedOnBehalf())) {
            notifyComplainantOnBehalf(request);
        } else {
            notifyPoc(request);
        }
    }

    /**
     * Livelihood workflow notifications on vendor/POC actions (#36).
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
                    notifyComplainantResolved(request);
                }
            }
            case "OUT_OF_SCOPE" -> {
                if (LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC.equalsIgnoreCase(newStatus)) {
                    notifyPocOutOfScope(request);
                    notifyComplainantOutOfScope(request);
                }
            }
            case "OUT_OF_WARRANTY" -> {
                if (LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equalsIgnoreCase(newStatus)) {
                    notifyComplainantOutOfWarranty(request);
                    notifyPocOutOfWarranty(request);
                }
            }
            case "DECLINE" -> {
                if (LIVELIHOOD_CLOSED_AFTER_DECLINE.equalsIgnoreCase(newStatus)) {
                    notifyPocVendorDeclined(request);
                }
            }
            case "REASSIGN", "ASSIGN_VENDOR" -> {
                // POC reassignment: do not notify the original vendor (#36)
                log.debug("Skipping vendor notification for POC reassignment on incidentId={}",
                        request.getIncident().getIncidentId());
            }
            default -> { }
        }
    }

    /**
     * Sends OOW reminder SMS at day 7 and T-2 days (14-day window). Invoked from auto-escalation consumer.
     */
    public void processOowRemindersIfDue(IncidentRequest request, long slaRemainingMs) {
        if (request == null || request.getIncident() == null) {
            return;
        }
        if (!LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equalsIgnoreCase(
                request.getIncident().getApplicationStatus())) {
            return;
        }
        if (config.getIsSMSEnabled() == null || !config.getIsSMSEnabled()) {
            return;
        }

        long fourteenDaysMs = 14L * 24 * 60 * 60 * 1000;
        long sevenDaysMs = 7L * 24 * 60 * 60 * 1000;
        long twoDaysMs = 2L * 24 * 60 * 60 * 1000;

        boolean day7Reminder = slaRemainingMs <= (fourteenDaysMs - sevenDaysMs)
                && slaRemainingMs > (fourteenDaysMs - sevenDaysMs - 24 * 60 * 60 * 1000);
        boolean tMinus2Reminder = slaRemainingMs <= twoDaysMs
                && slaRemainingMs > (twoDaysMs - 24 * 60 * 60 * 1000);

        if (!day7Reminder && !tMinus2Reminder) {
            return;
        }

        String reminderLabel = day7Reminder ? "7-day" : "T-2 day";
        notifyComplainantSms(request, String.format(
                "Reminder (%s): Ticket %s for %s is awaiting your out-of-warranty decision. "
                        + "Please review the vendor quotation.",
                reminderLabel, request.getIncident().getIncidentId(), request.getIncident().getFacilityId()
        ));
        notifyVendorSms(request, String.format(
                "Reminder (%s): Ticket %s is in out-of-warranty pending state. "
                        + "Awaiting end-user decision.",
                reminderLabel, request.getIncident().getIncidentId()
        ));
    }

    private void notifyComplainantResolved(IncidentRequest request) {
        notifyComplainantSms(request, String.format(
                "Your ticket %s has been resolved by the vendor. "
                        + "You may reopen within 72 hours if the issue persists.",
                request.getIncident().getIncidentId()
        ));
    }

    private void notifyComplainantOutOfScope(IncidentRequest request) {
        String reason = resolveOutOfScopeReason(request);
        notifyComplainantSms(request, String.format(
                "Your ticket %s has been marked out of scope by the vendor. Reason: %s. "
                        + "A program officer will review it.",
                request.getIncident().getIncidentId(), reason
        ));
    }

    private void notifyComplainantOutOfWarranty(IncidentRequest request) {
        String quotationLink = buildQuotationLink(request);
        notifyComplainantSms(request, String.format(
                "Your ticket %s is out of warranty. Vendor quotation is available%s. "
                        + "Please review and decide off-platform.",
                request.getIncident().getIncidentId(),
                StringUtils.isNotBlank(quotationLink) ? " at " + quotationLink : ""
        ));
    }

    private void notifyPocOutOfScope(IncidentRequest request) {
        String reason = resolveOutOfScopeReason(request);
        sendPocEmail(request,
                "Out of scope – action required: " + request.getIncident().getIncidentId(),
                String.format(
                        "Vendor marked ticket %s as out of scope.%nReason: %s%nFacility: %s%nAsset: %s%n"
                                + "Please review within 3 days.",
                        request.getIncident().getIncidentId(),
                        reason,
                        request.getIncident().getFacilityId(),
                        request.getIncident().getAssetId()
                ));
    }

    private void notifyPocOutOfWarranty(IncidentRequest request) {
        String quotationLink = buildQuotationLink(request);
        sendPocEmail(request,
                "Out of warranty quotation uploaded: " + request.getIncident().getIncidentId(),
                String.format(
                        "Vendor uploaded an out-of-warranty quotation for ticket %s.%nFacility: %s%nAsset: %s%n"
                                + "Quotation: %s%nEnd-user has been notified.",
                        request.getIncident().getIncidentId(),
                        request.getIncident().getFacilityId(),
                        request.getIncident().getAssetId(),
                        StringUtils.defaultIfBlank(quotationLink, "see ticket attachments")
                ));
    }

    private void notifyPocVendorDeclined(IncidentRequest request) {
        sendPocEmail(request,
                "Ticket closed after OOW decline: " + request.getIncident().getIncidentId(),
                String.format(
                        "Vendor closed ticket %s after out-of-warranty rejection.%nComment: %s",
                        request.getIncident().getIncidentId(),
                        StringUtils.defaultIfBlank(request.getWorkflow().getComments(), "N/A")
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

    private void notifyComplainantSms(IncidentRequest request, String message) {
        if (config.getIsSMSEnabled() == null || !config.getIsSMSEnabled()) {
            return;
        }
        try {
            String mobile = resolveComplainantMobile(request);
            if (StringUtils.isBlank(mobile)) {
                return;
            }
            notificationUtil.sendSMS(
                    request.getIncident().getTenantId(),
                    Collections.singletonList(SMSRequest.builder().mobileNumber(mobile).message(message).build())
            );
        } catch (Exception e) {
            log.error("Failed complainant SMS for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private void notifyVendorSms(IncidentRequest request, String message) {
        if (config.getIsSMSEnabled() == null || !config.getIsSMSEnabled()) {
            return;
        }
        List<String> assignees = request.getWorkflow() != null ? request.getWorkflow().getAssignes() : null;
        if (CollectionUtils.isEmpty(assignees)) {
            return;
        }
        try {
            String mobile = fetchUserMobile(assignees.get(0), request.getRequestInfo(), request.getIncident().getTenantId());
            if (StringUtils.isBlank(mobile)) {
                return;
            }
            notificationUtil.sendSMS(
                    request.getIncident().getTenantId(),
                    Collections.singletonList(SMSRequest.builder().mobileNumber(mobile).message(message).build())
            );
        } catch (Exception e) {
            log.error("Failed vendor SMS for incidentId={}", request.getIncident().getIncidentId(), e);
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

    private String buildQuotationLink(IncidentRequest request) {
        if (request.getWorkflow() == null || CollectionUtils.isEmpty(request.getWorkflow().getVerificationDocuments())) {
            return "";
        }
        return request.getWorkflow().getVerificationDocuments().stream()
                .filter(doc -> doc != null && StringUtils.isNotBlank(doc.getFileStoreId()))
                .map(doc -> String.format("%s?tenantId=%s&fileStoreId=%s",
                        config.getFileStoreDownloadEndpoint(),
                        request.getIncident().getTenantId(),
                        doc.getFileStoreId()))
                .findFirst()
                .orElse("");
    }

    private void notifyVendor(IncidentRequest request) {
        if (config.getIsSMSEnabled() == null || !config.getIsSMSEnabled()) {
            return;
        }
        List<String> assignees = request.getWorkflow() != null ? request.getWorkflow().getAssignes() : null;
        if (CollectionUtils.isEmpty(assignees)) {
            return;
        }

        try {
            String vendorUuid = assignees.get(0);
            String mobile = fetchUserMobile(vendorUuid, request.getRequestInfo(), request.getIncident().getTenantId());
            if (StringUtils.isBlank(mobile)) {
                log.warn("Vendor mobile not found for uuid={}", vendorUuid);
                return;
            }

            String message = buildVendorSmsMessage(request);
            if (StringUtils.isNotBlank(message)) {
                notificationUtil.sendSMS(
                        request.getIncident().getTenantId(),
                        Collections.singletonList(SMSRequest.builder().mobileNumber(mobile).message(message).build())
                );
            }
        } catch (Exception e) {
            log.error("Failed to send vendor SMS for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private void notifyComplainantOnBehalf(IncidentRequest request) {
        if (config.getIsSMSEnabled() == null || !config.getIsSMSEnabled()) {
            return;
        }

        try {
            String mobile = resolveComplainantMobile(request);
            if (StringUtils.isBlank(mobile)) {
                log.warn("Complainant mobile not found for on-behalf incidentId={}",
                        request.getIncident().getIncidentId());
                return;
            }

            String message = buildComplainantOnBehalfSmsMessage(request);
            notificationUtil.sendSMS(
                    request.getIncident().getTenantId(),
                    Collections.singletonList(SMSRequest.builder().mobileNumber(mobile).message(message).build())
            );
        } catch (Exception e) {
            log.error("Failed to send on-behalf complainant SMS for incidentId={}",
                    request.getIncident().getIncidentId(), e);
        }
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

            String subject = "New Livelihood ticket: " + request.getIncident().getIncidentId();
            String body = buildPocEmailBody(request);
            sendEmailViaKafka(pocEmail, subject, body, tenantId);
        } catch (Exception e) {
            log.error("Failed to send POC email for incidentId={}", request.getIncident().getIncidentId(), e);
        }
    }

    private String buildVendorSmsMessage(IncidentRequest request) {
        Incident incident = request.getIncident();
        return String.format(
                "New ticket %s assigned to you for asset %s at facility %s. Issue: %s",
                incident.getIncidentId(),
                incident.getAssetId(),
                incident.getFacilityId(),
                incident.getIncidentType()
        );
    }

    private String buildComplainantOnBehalfSmsMessage(IncidentRequest request) {
        Incident incident = request.getIncident();
        return String.format(
                "A support ticket %s has been raised on your behalf for facility %s. Issue: %s. "
                        + "A vendor has been assigned to resolve it.",
                incident.getIncidentId(),
                incident.getFacilityId(),
                incident.getIncidentType()
        );
    }

    private String buildPocEmailBody(IncidentRequest request) {
        Incident incident = request.getIncident();
        return String.format(
                "A new Livelihood support ticket has been created.%n%n"
                        + "Ticket ID: %s%n"
                        + "Facility: %s%n"
                        + "Asset: %s%n"
                        + "Issue: %s%n"
                        + "Status: %s%n"
                        + "Entry channel: %s%n",
                incident.getIncidentId(),
                incident.getFacilityId(),
                incident.getAssetId(),
                incident.getIncidentType(),
                incident.getApplicationStatus(),
                incident.getEntryChannel()
        );
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
