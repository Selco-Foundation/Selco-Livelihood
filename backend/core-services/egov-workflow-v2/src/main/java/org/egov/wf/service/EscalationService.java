package org.egov.wf.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.egov.wf.config.WorkflowConfig;
import org.egov.wf.producer.Producer;
import org.egov.wf.repository.EscalationRepository;
import org.egov.wf.util.EscalationUtil;
import org.egov.wf.web.models.IMEscalationInstance;
import org.egov.wf.web.models.IMEscalationRequest;
import org.egov.wf.web.models.Escalation;
import org.egov.wf.web.models.EscalationSearchCriteria;
import org.egov.wf.web.models.ProcessInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EscalationService {



    private EscalationUtil escalationUtil;

    private MDMSService mdmsService;

    private EscalationRepository escalationRepository;

    private WorkflowService workflowService;

    private Producer producer;

    private WorkflowConfig config;

    @Autowired
    public EscalationService(EscalationUtil escalationUtil, MDMSService mdmsService, EscalationRepository escalationRepository,
                             WorkflowService workflowService, Producer producer, WorkflowConfig config) {
        this.escalationUtil = escalationUtil;
        this.mdmsService = mdmsService;
        this.escalationRepository = escalationRepository;
        this.workflowService = workflowService;
        this.producer = producer;
        this.config = config;
    }


    /**
     * Fetches all escalations defined for the given businessService and escalates
     * the applications which have breached the SLA based on the escalation config defined
     * @param requestInfo
     * @param businessService
     */
    public void escalateApplications(RequestInfo requestInfo, String businessService){

        Object mdmsData = mdmsService.mDMSCall(requestInfo);
        List<Escalation> escalations = escalationUtil.getEscalationsFromConfig(businessService, mdmsData);
        List<String> tenantIds = resolveEscalationTenantIds(requestInfo, mdmsData);

        for(Escalation escalation : escalations){

            processEscalation(requestInfo, escalation, tenantIds);

        }

    }

    /**
     * MDMS tenant master may list state-level codes (e.g. {@code in}) while Livelihood
     * publishes its business service at {@code livelihood}. Always include the caller's tenant.
     */
    private List<String> resolveEscalationTenantIds(RequestInfo requestInfo, Object mdmsData) {
        LinkedHashSet<String> tenantIds = new LinkedHashSet<>(escalationUtil.getTenantIds(mdmsData));
        if (requestInfo != null && requestInfo.getUserInfo() != null
                && StringUtils.isNotBlank(requestInfo.getUserInfo().getTenantId())) {
            tenantIds.add(requestInfo.getUserInfo().getTenantId());
        }
        return new ArrayList<>(tenantIds);
    }

    private String resolveStatusUuidOrSkip(String statusCode, String tenantId, String businessService) {
        try {
            return escalationUtil.getStatusUUID(statusCode, tenantId, businessService);
        } catch (CustomException ex) {
            if ("BUSINESSSERVICE_NOT_FOUND".equals(ex.getCode()) || "STATUS_NOT_FOUND".equals(ex.getCode())) {
                log.debug("Skipping escalation for tenantId={} businessService={}: {}",
                        tenantId, businessService, ex.getMessage());
                return null;
            }
            throw ex;
        }
    }


    /**
     * Processes the escalation
     * @param escalation
     * @param tenantIds
     */
    private void processEscalation(RequestInfo requestInfo, Escalation escalation, List<String> tenantIds){

        for(String tenantId: tenantIds){

            String stateUUID = resolveStatusUuidOrSkip(
                    escalation.getStatus(), tenantId, escalation.getBusinessService());
            if (stateUUID == null) {
                continue;
            }

            EscalationSearchCriteria criteria = EscalationSearchCriteria.builder().tenantId(tenantId)
                                                .status(stateUUID)
                                                .businessService(escalation.getBusinessService())
                                                .businessSlaExceededBy(escalation.getBusinessSlaExceededBy())
                                                .stateSlaExceededBy(escalation.getStateSlaExceededBy())
                                                .build();



            List<String> businessIds = escalationRepository.getBusinessIds(criteria);
            Integer numberOfBusinessIds = businessIds.size();
            Integer batchSize = config.getEscalationBatchSize();

            for(int i = 0; i < numberOfBusinessIds; i = i +1){

                // Processing the businessIds in batches
//                Integer start = i;
//                Integer end = ((i + batchSize) < numberOfBusinessIds ? (i + batchSize) : numberOfBusinessIds) ;

                IMEscalationInstance processInstance=new IMEscalationInstance();
            	processInstance.setBusinessId(businessIds.get(i));
            	processInstance.setTenantId(tenantId);
            	processInstance.setAuthToken(requestInfo.getAuthToken());
            	processInstance.setUserInfo(requestInfo.getUserInfo());
            	List<IMEscalationInstance> processInstances=new ArrayList<IMEscalationInstance>();
            	processInstances.add(processInstance);
            	IMEscalationRequest processInstanceRequest=new IMEscalationRequest();
            	processInstanceRequest.setImEscalationInstance(processInstances);
            	log.info("pushing to topic:  "+escalation.getTopic());
            	producer.push(escalation.getTopic(),processInstanceRequest);
            }

        }

    }

    /**
     * Temporary added for testing
     * @param requestInfo
     * @param businessService
     */
    public List<String> escalateApplicationsTest(RequestInfo requestInfo, String businessService){

        Object mdmsData = mdmsService.mDMSCall(requestInfo);
        List<Escalation> escalations = escalationUtil.getEscalationsFromConfig(businessService, mdmsData);
        List<String> tenantIds = resolveEscalationTenantIds(requestInfo, mdmsData);

        List<String> ids = new LinkedList<>();

        for(Escalation escalation : escalations){

            ids.addAll(getEscalations(requestInfo, escalation, tenantIds));

        }

        return ids;
    }

    /**
     * Temporary added for testing
     * @param escalation
     * @param tenantIds
     */
    private List<String> getEscalations(RequestInfo requestInfo, Escalation escalation, List<String> tenantIds){

        List<String> ids = new LinkedList<>();

        for(String tenantId: tenantIds){

            String stateUUID = resolveStatusUuidOrSkip(
                    escalation.getStatus(), tenantId, escalation.getBusinessService());
            if (stateUUID == null) {
                continue;
            }

            EscalationSearchCriteria criteria = EscalationSearchCriteria.builder().tenantId(tenantId)
                    .status(stateUUID)
                    .businessService(escalation.getBusinessService())
                    .businessSlaExceededBy(escalation.getBusinessSlaExceededBy())
                    .stateSlaExceededBy(escalation.getStateSlaExceededBy())
                    .build();



            List<String> businessIds = escalationRepository.getBusinessIds(criteria);
            Integer numberOfBusinessIds = businessIds.size();
            Integer batchSize = config.getEscalationBatchSize();

            for(int i = 0; i < numberOfBusinessIds; i = i + batchSize){

                // Processing the businessIds in batches
                Integer start = i;
                Integer end = ((i + batchSize) < numberOfBusinessIds ? (i + batchSize) : numberOfBusinessIds) ;

                List<ProcessInstance> processInstances = escalationUtil.getProcessInstances(tenantId, businessIds.subList(start,end), escalation);
                ids.addAll(processInstances.stream().map(ProcessInstance::getBusinessId).collect(Collectors.toList()));
            }

        }

        return ids;

    }




}
