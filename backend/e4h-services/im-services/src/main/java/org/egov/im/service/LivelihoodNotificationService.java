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

import java.util.*;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.*;

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
        notifyPoc(request);
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
                "New ticket %s assigned to you for asset %s at facility %s. Issue: %s - %s",
                incident.getIncidentId(),
                incident.getAssetId(),
                incident.getFacilityId(),
                incident.getIncidentType(),
                incident.getIncidentSubType()
        );
    }

    private String buildPocEmailBody(IncidentRequest request) {
        Incident incident = request.getIncident();
        return String.format(
                "A new Livelihood support ticket has been created.%n%n"
                        + "Ticket ID: %s%n"
                        + "Facility: %s%n"
                        + "Asset: %s%n"
                        + "Issue: %s / %s%n"
                        + "Status: %s%n"
                        + "Entry channel: %s%n",
                incident.getIncidentId(),
                incident.getFacilityId(),
                incident.getAssetId(),
                incident.getIncidentType(),
                incident.getIncidentSubType(),
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
