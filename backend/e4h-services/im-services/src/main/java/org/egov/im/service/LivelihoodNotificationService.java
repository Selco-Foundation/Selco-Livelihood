package org.egov.im.service;

import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.im.repository.ServiceRequestRepository;
import org.egov.im.util.HRMSUtil;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.RequestInfoWrapper;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

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
    private final LivelihoodEmailNotificationService livelihoodEmailNotificationService;
    private final NotificationService notificationService;
    private final HRMSUtil hrmsUtil;
    private final ServiceRequestRepository repository;

    public LivelihoodNotificationService(
            LivelihoodSmsNotificationService livelihoodSmsNotificationService,
            LivelihoodEmailNotificationService livelihoodEmailNotificationService,
            @Lazy NotificationService notificationService,
            HRMSUtil hrmsUtil,
            ServiceRequestRepository repository
    ) {
        this.livelihoodSmsNotificationService = livelihoodSmsNotificationService;
        this.livelihoodEmailNotificationService = livelihoodEmailNotificationService;
        this.notificationService = notificationService;
        this.hrmsUtil = hrmsUtil;
        this.repository = repository;
    }

    /**
     * Ticket create notifications. Only end user (self) or Program POC (on behalf) can create —
     * vendors never create. Vendor receives assignment SMS after auto-assign.
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
            // POC raised on behalf of end user (LIV-TPL-002 / 003)
            notifyComplainantSms(request, LIV_TPL_002);
            notifyVendorSms(request, LIV_TPL_003);
        } else {
            // End user self-create, auto-assigned (LIV-TPL-001 / 017 / 018).
            notifyComplainantSms(request, LIV_TPL_001);
            notifyVendorSms(request, LIV_TPL_017);
            notifyPoc(request);
        }
    }

    /**
     * Livelihood workflow notifications on vendor/POC actions.
     */
    public void notifyOnUpdate(IncidentRequest request, String previousStatus) {
        notifyOnUpdate(request, previousStatus, null);
    }

    public void notifyOnUpdate(IncidentRequest request, String previousStatus, Incident persistedIncident) {
        if (request == null || request.getIncident() == null || request.getWorkflow() == null) {
            return;
        }
        enrichNotificationContext(request, persistedIncident);

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
            case LIVELIHOOD_WF_DECLINE -> {
                if (LIVELIHOOD_CLOSED_AFTER_DECLINE.equalsIgnoreCase(newStatus)) {
                    notifyComplainantSms(request, LIV_TPL_014);
                    notifyPocVendorDeclined(request);
                }
            }
            case LIVELIHOOD_WF_DECLINE_POC -> {
                if (LIVELIHOOD_CLOSED_AFTER_DECLINE.equalsIgnoreCase(newStatus)) {
                    log.info("Sending closed-without-resolution / POC-decline SMS templates={} / {} incidentId={}",
                            LIV_TPL_012, LIV_TPL_016, request.getIncident().getIncidentId());
                    notifyComplainantSms(request, LIV_TPL_012);
                    notifyComplainantSms(request, LIV_TPL_016);
                    sendPocEmail(request, LIV_TPL_013, Map.of("reason", resolveDeclineReason(request)));
                } else {
                    log.warn("Skipped POC decline notifications for incidentId={} action={} status={}",
                            request.getIncident().getIncidentId(), normalizedAction, newStatus);
                }
            }
            case REASSIGN, LIVELIHOOD_WF_ASSIGN_VENDOR -> {
                if (LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR.equalsIgnoreCase(newStatus)) {
                    notifyOosReassignment(request);
                }
            }
            default -> { }
        }
    }

    /**
     * Vendor SLA breached — vendor SMS (LIV-TPL-004) and POC email (LIV-TPL-005).
     */
    public void notifyVendorSlaBreached(IncidentRequest request) {
        notifyVendorSms(request, LIV_TPL_004);
        notifyPocSlaBreached(request);
    }

    /**
     * POC SLA breached (e.g. OUT_OF_SCOPE_PENDING_POC) — POC email only (LIV-TPL-005).
     */
    public void notifyPocSlaBreached(IncidentRequest request) {
        sendPocEmail(request, LIV_TPL_005);
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

    private void notifyOosReassignment(IncidentRequest request) {
        notifyComplainantSms(request, LIV_TPL_007);
        notifyVendorSms(request, LIV_TPL_008);
    }

    /**
     * Update payloads are often partial; merge persisted incident fields needed for SMS/email recipients.
     */
    private void enrichNotificationContext(IncidentRequest request, Incident persisted) {
        if (persisted == null || request.getIncident() == null) {
            return;
        }
        Incident incident = request.getIncident();
        mergeIfBlank(incident.getIncidentId(), incident::setIncidentId, persisted.getIncidentId());
        mergeIfBlank(incident.getBoundaryCode(), incident::setBoundaryCode, persisted.getBoundaryCode());
        mergeIfBlank(incident.getFacilityId(), incident::setFacilityId, persisted.getFacilityId());
        mergeIfBlank(incident.getAssetId(), incident::setAssetId, persisted.getAssetId());
        mergeIfBlank(incident.getIncidentType(), incident::setIncidentType, persisted.getIncidentType());
        mergeIfBlank(incident.getAccountId(), incident::setAccountId, persisted.getAccountId());

        if (incident.getCreatedOnBehalf() == null) {
            incident.setCreatedOnBehalf(persisted.getCreatedOnBehalf());
        }

        if (incident.getAuditDetails() == null
                || incident.getAuditDetails().getCreatedTime() == null) {
            incident.setAuditDetails(persisted.getAuditDetails());
        }

        if (incident.getReporter() == null && persisted.getReporter() != null) {
            incident.setReporter(persisted.getReporter());
        }

        // Preserve assetCategory (and other details) for SMS/email placeholders on partial updates.
        if (incident.getAdditionalDetail() == null && persisted.getAdditionalDetail() != null) {
            incident.setAdditionalDetail(persisted.getAdditionalDetail());
        }
    }

    private static void mergeIfBlank(String current, java.util.function.Consumer<String> setter, String value) {
        if (StringUtils.isBlank(current) && StringUtils.isNotBlank(value)) {
            setter.accept(value);
        }
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
        sendPocEmail(request, LIV_TPL_006,
                Map.of("out_of_scope_reason", resolveOutOfScopeReason(request)));
    }

    private void notifyPocOutOfWarranty(IncidentRequest request) {
        sendPocEmail(request, LIV_TPL_010);
    }

    private void notifyPocVendorDeclined(IncidentRequest request) {
        sendPocEmail(request, LIV_TPL_015, Map.of("reason", resolveDeclineReason(request)));
    }

    private void notifyPoc(IncidentRequest request) {
        sendPocEmail(request, LIV_TPL_018);
    }

    private void sendPocEmail(IncidentRequest request, String templateCode) {
        sendPocEmail(request, templateCode, Map.of());
    }

    private void sendPocEmail(IncidentRequest request, String templateCode, Map<String, String> extras) {
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
            livelihoodEmailNotificationService.sendEmail(request, pocEmail, templateCode, extras);
        } catch (Exception e) {
            log.error("Failed to send POC email template={} incidentId={}",
                    templateCode, request.getIncident().getIncidentId(), e);
        }
    }

    private String resolveDeclineReason(IncidentRequest request) {
        if (request.getWorkflow() != null && StringUtils.isNotBlank(request.getWorkflow().getComments())) {
            return request.getWorkflow().getComments();
        }
        return "Not specified";
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

        if (StringUtils.isNotBlank(request.getIncident().getAccountId())) {
            String mobile = fetchUserMobile(
                    request.getIncident().getAccountId(),
                    request.getRequestInfo(),
                    request.getIncident().getTenantId()
            );
            if (StringUtils.isNotBlank(mobile)) {
                return mobile;
            }
        }

        String facilityBoundary = resolveFacilityBoundaryForComplainant(request.getIncident());
        if (StringUtils.isBlank(facilityBoundary)) {
            log.warn("Complainant mobile not found for incidentId={} — missing boundary",
                    request.getIncident().getIncidentId());
            return null;
        }

        try {
            Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                    request.getRequestInfo(),
                    request.getIncident().getTenantId(),
                    facilityBoundary
            );
            return complainant.get("mobile");
        } catch (Exception e) {
            log.warn("Complainant HRMS lookup failed for incidentId={}", request.getIncident().getIncidentId(), e);
            return null;
        }
    }

    private String resolveFacilityBoundaryForComplainant(Incident incident) {
        String assetBoundary = incident.getBoundaryCode();
        String assetId = incident.getAssetId();
        if (StringUtils.isNotBlank(assetBoundary) && StringUtils.isNotBlank(assetId)) {
            String suffix = "_" + assetId;
            if (assetBoundary.endsWith(suffix)) {
                return assetBoundary.substring(0, assetBoundary.length() - suffix.length());
            }
        }
        return assetBoundary;
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
}
