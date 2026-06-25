
package org.egov.im.consumer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egov.common.contract.request.RequestInfo;
import org.egov.im.service.IMService;
import org.egov.im.service.LivelihoodNotificationService;
import org.egov.im.service.NotificationService;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.util.IMConstants;
import static org.egov.im.util.IMConstants.CLOSE;
import static org.egov.im.util.IMConstants.LIVELIHOOD_BUSINESSSERVICE;
import static org.egov.im.util.IMConstants.LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR;
import static org.egov.im.util.IMConstants.LIVELIHOOD_RESOLVED;
import static org.egov.im.util.IMConstants.LIVELIHOOD_WF_AUTO_CLOSE;
import static org.egov.im.util.IMConstants.RESOLVED;
import org.egov.im.web.models.IMEscalationInstance;
import org.egov.im.web.models.IMEscalationRequest;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.IncidentWrapper;
import org.egov.im.web.models.RequestSearchCriteria;
import org.egov.im.web.models.Workflow;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class NotificationConsumer {
    @Autowired
    NotificationService notificationService;

    @Autowired
    private ObjectMapper mapper;
    
    @Autowired
	private IMService imService;

    @Autowired
    private LivelihoodTenantUtil livelihoodTenantUtil;

    @Autowired
    private LivelihoodNotificationService livelihoodNotificationService;


/**
     * Consumes record and send notification
     *
     * @param record
     * @param topic
     */

    @KafkaListener(topics = {"${im.kafka.create.topic}","${im.kafka.update.topic}"})
    public void listen(final HashMap<String, Object> record, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
        	IncidentRequest request = mapper.convertValue(record, IncidentRequest.class);

            String tenantId = request.getIncident().getTenantId();

            // Adding in MDC so that tracer can add it in header
            MDC.put(IMConstants.TENANTID_MDC_STRING, tenantId);

            notificationService.process(request, topic);
        } catch (Exception ex) {
            StringBuilder builder = new StringBuilder("Error while listening to value: ").append(record)
                    .append("on topic: ").append(topic);
            log.error(builder.toString(), ex);
        }
    }
    
    
    @KafkaListener(topics = { "${persister.auto.escalation.topic}"})
	public void generateEscalationDemand(final HashMap<String, Object> record, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
		ObjectMapper mapper = new ObjectMapper();
		IMEscalationRequest processInstanceRequest = new IMEscalationRequest();
		List<IncidentWrapper> incidents=new ArrayList<IncidentWrapper>();
		RequestInfo requestInfo=new RequestInfo();
       		Workflow workflow = new Workflow();
			try {
				log.info("Consuming record: " + record);
				processInstanceRequest = mapper.convertValue(record, IMEscalationRequest.class);
				requestInfo.setAuthToken(processInstanceRequest.getImEscalationInstance().get(0).getAuthToken());
				requestInfo.setUserInfo(processInstanceRequest.getImEscalationInstance().get(0).getUserInfo());

				RequestSearchCriteria criteria = new RequestSearchCriteria();
			criteria.setTenantId(processInstanceRequest.getImEscalationInstance().get(0).getTenantId());
			criteria.setIncidentId(processInstanceRequest.getImEscalationInstance().get(0).getBusinessId());
			incidents = imService.search(requestInfo,criteria);
			log.info("exiting Search function2");

			log.debug("BPA Received: " + processInstanceRequest.getImEscalationInstance().get(0).getBusinessId());

		} catch (final Exception e) {
			log.error("Error while listening to valueeee : " + record + " on topic: " + topic + ": " + e);
		}
		log.debug("BPA Received: " + processInstanceRequest.getImEscalationInstance().get(0).getBusinessId());

        if (!incidents.isEmpty()) {
        	log.info("inside update");
            IMEscalationInstance escalationInstance =
                    processInstanceRequest.getImEscalationInstance().get(0);
            Incident existing = incidents.get(0).getIncident();
            boolean livelihood = livelihoodTenantUtil.isLivelihood(escalationInstance.getTenantId())
                    || LIVELIHOOD_BUSINESSSERVICE.equalsIgnoreCase(escalationInstance.getBusinessService());

            if (livelihood && LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equalsIgnoreCase(
                    existing.getApplicationStatus())) {
                IncidentRequest reminderRequest = new IncidentRequest();
                reminderRequest.setIncident(existing);
                reminderRequest.setRequestInfo(requestInfo);
                reminderRequest.setWorkflow(workflow);
                livelihoodNotificationService.processOowRemindersIfDue(reminderRequest, 0L);
                return;
            }

            if (livelihood && !LIVELIHOOD_RESOLVED.equalsIgnoreCase(existing.getApplicationStatus())
                    && !RESOLVED.equalsIgnoreCase(existing.getApplicationStatus())) {
                log.info("Skipping livelihood auto-escalation close for incidentId={} status={}",
                        existing.getIncidentId(), existing.getApplicationStatus());
                return;
            }

			workflow.setAssignes(new ArrayList<>());
            String escalationAction = CLOSE;
            if (livelihood && (LIVELIHOOD_RESOLVED.equalsIgnoreCase(existing.getApplicationStatus())
                    || RESOLVED.equalsIgnoreCase(existing.getApplicationStatus()))) {
                escalationAction = LIVELIHOOD_WF_AUTO_CLOSE;
            }
            	workflow.setAction(escalationAction);
            	workflow.setVerificationDocuments(null);
        	IncidentRequest incidentRequest=new IncidentRequest();
        	incidentRequest.setIncident(existing);
        	incidentRequest.setRequestInfo(requestInfo);
        	incidentRequest.setWorkflow(workflow);
		log.info("Proceeding for Update call");

        	//bpasearch (response)  -> Approve bpa request
		log.info("Proceeding for Update call2");
            imService.update(incidentRequest);
	}
    }
}

