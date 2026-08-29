package org.egov.field_planner.service;

import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.field_planner.repository.FieldPlanTemplateRepository;
import org.egov.field_planner.web.models.FieldPlanTemplate;
import org.egov.field_planner.web.models.FieldPlanTemplateRequest;
import org.egov.field_planner.web.models.FieldPlanTemplateSearchCriteria;
import org.egov.field_planner.web.models.IccTemplate;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class FieldPlanTemplateService {

    private static final String INVALID_TEMPLATE = "INVALID_FIELD_PLAN_TEMPLATE";
    private static final String INVALID_SEARCH = "INVALID_SEARCH";

    private final FieldPlanTemplateRepository repository;

    @Autowired
    public FieldPlanTemplateService(FieldPlanTemplateRepository repository) {
        this.repository = repository;
    }

    /**
     * Create-or-replace. There is deliberately no separate _update: the Project Manager's only
     * action is uploading a workbook, and an upload for a Solution that already has a template
     * is a correction rather than an error.
     */
    public FieldPlanTemplate save(FieldPlanTemplateRequest request) {
        FieldPlanTemplate template = request.getFieldPlanTemplate();
        validate(template);
        enrich(template, request.getRequestInfo());
        repository.save(template);
        return template;
    }

    public List<FieldPlanTemplate> search(FieldPlanTemplateSearchCriteria criteria) {
        if (criteria == null || !StringUtils.hasText(criteria.getFieldPlanId())) {
            throw new CustomException(INVALID_SEARCH, "fieldPlanId is required");
        }
        if (!StringUtils.hasText(criteria.getTenantId())) {
            throw new CustomException(INVALID_SEARCH, "tenantId is required");
        }
        return repository.search(criteria);
    }

    public List<IccTemplate> searchIccTemplates(String tenantId, List<String> solutionCodes) {
        if (!StringUtils.hasText(tenantId)) {
            throw new CustomException(INVALID_SEARCH, "tenantId is required");
        }
        return repository.searchIccTemplates(tenantId, solutionCodes);
    }

    private void validate(FieldPlanTemplate template) {
        if (template == null) {
            throw new CustomException(INVALID_TEMPLATE, "FieldPlanTemplate is required");
        }
        if (!StringUtils.hasText(template.getTenantId())) {
            throw new CustomException(INVALID_TEMPLATE, "tenantId is required");
        }
        if (!StringUtils.hasText(template.getFieldPlanId())) {
            throw new CustomException(INVALID_TEMPLATE, "fieldPlanId is required");
        }
        if (!StringUtils.hasText(template.getSolutionId())) {
            throw new CustomException(INVALID_TEMPLATE, "solutionId is required");
        }
        // A Solution can legitimately have no machines (Textile Lighting is solar-only), but
        // never no solar bundle -- every Solution in this programme is a solar installation.
        if (CollectionUtils.isEmpty(template.getSolarSection())) {
            throw new CustomException(INVALID_TEMPLATE,
                    "solarSection must contain at least one line item");
        }
    }

    /**
     * The id is looked up rather than always minted, so a re-upload reuses the existing row's
     * id. Without this the upsert would keep the stored id while the caller got handed a fresh
     * one matching nothing -- a misleading response and a broken reference for anything that
     * recorded it.
     */
    private void enrich(FieldPlanTemplate template, RequestInfo requestInfo) {
        List<FieldPlanTemplate> existing = repository.search(FieldPlanTemplateSearchCriteria.builder()
                .tenantId(template.getTenantId())
                .fieldPlanId(template.getFieldPlanId())
                .solutionIds(List.of(template.getSolutionId()))
                .build());

        String userUuid = requestInfo != null && requestInfo.getUserInfo() != null
                ? requestInfo.getUserInfo().getUuid() : null;
        long now = System.currentTimeMillis();

        if (existing.isEmpty()) {
            template.setId(UUID.randomUUID().toString());
            template.setAuditDetails(AuditDetails.builder()
                    .createdBy(userUuid).createdTime(now)
                    .lastModifiedBy(userUuid).lastModifiedTime(now)
                    .build());
        } else {
            FieldPlanTemplate current = existing.get(0);
            AuditDetails previous = current.getAuditDetails();
            template.setId(current.getId());
            template.setAuditDetails(AuditDetails.builder()
                    .createdBy(previous == null ? null : previous.getCreatedBy())
                    .createdTime(previous == null ? now : previous.getCreatedTime())
                    .lastModifiedBy(userUuid).lastModifiedTime(now)
                    .build());
            log.info("replacing existing field plan template {} for fieldPlanId={} solutionId={}",
                    current.getId(), template.getFieldPlanId(), template.getSolutionId());
        }
    }
}
