package org.egov.field_planner.web.controllers;

import io.swagger.annotations.ApiParam;
import jakarta.validation.Valid;
import org.egov.common.contract.response.ResponseInfo;
import org.egov.common.utils.ResponseInfoFactory;
import org.egov.field_planner.service.FieldPlanTemplateService;
import org.egov.field_planner.web.models.FieldPlanTemplate;
import org.egov.field_planner.web.models.FieldPlanTemplateRequest;
import org.egov.field_planner.web.models.FieldPlanTemplateResponse;
import org.egov.field_planner.web.models.FieldPlanTemplateSearchRequest;
import org.egov.field_planner.web.models.IccTemplate;
import org.egov.field_planner.web.models.IccTemplateResponse;
import org.egov.field_planner.web.models.IccTemplateSearchRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;

@Controller
@RequestMapping("/v1/field-plan-templates")
@Validated
public class FieldPlanTemplateApiController {

    private final FieldPlanTemplateService fieldPlanTemplateService;

    @Autowired
    public FieldPlanTemplateApiController(FieldPlanTemplateService fieldPlanTemplateService) {
        this.fieldPlanTemplateService = fieldPlanTemplateService;
    }

    /**
     * Create-or-replace for one (fieldPlanId, solutionId). There is deliberately no _update
     * counterpart -- see FieldPlanTemplateService.save.
     */
    @RequestMapping(value = "/_create", method = RequestMethod.POST)
    public ResponseEntity<FieldPlanTemplateResponse> create(
            @ApiParam(value = "The Project Manager's filled template for one Solution.", required = true)
            @Valid @RequestBody FieldPlanTemplateRequest request) {

        FieldPlanTemplate saved = fieldPlanTemplateService.save(request);
        ResponseInfo responseInfo = ResponseInfoFactory.createResponseInfo(request.getRequestInfo(), true);
        return new ResponseEntity<>(FieldPlanTemplateResponse.builder()
                .responseInfo(responseInfo)
                .fieldPlanTemplates(List.of(saved))
                .totalCount(1)
                .build(), HttpStatus.OK);
    }

    /**
     * Filled templates for a Plan, optionally narrowed to given Solutions. The plan-wide form
     * is what Publish validation uses to check every unique Solution has a template.
     */
    @RequestMapping(value = "/_search", method = RequestMethod.POST)
    public ResponseEntity<FieldPlanTemplateResponse> search(
            @ApiParam(value = "Templates for a Plan.", required = true)
            @Valid @RequestBody FieldPlanTemplateSearchRequest request) {

        List<FieldPlanTemplate> templates = fieldPlanTemplateService.search(request.getCriteria());
        ResponseInfo responseInfo = ResponseInfoFactory.createResponseInfo(request.getRequestInfo(), true);
        return new ResponseEntity<>(FieldPlanTemplateResponse.builder()
                .responseInfo(responseInfo)
                .fieldPlanTemplates(templates)
                .totalCount(templates.size())
                .build(), HttpStatus.OK);
    }

    /**
     * The BLANK templates: one filestore pointer per Solution, which ingestion-service resolves
     * on every template download. Kept here rather than read straight from the database by
     * ingestion-service so nothing depends on the two services sharing one database.
     */
    @RequestMapping(value = "/blank/_search", method = RequestMethod.POST)
    public ResponseEntity<IccTemplateResponse> searchBlankTemplates(
            @ApiParam(value = "Blank templates, all or by solution code.", required = true)
            @Valid @RequestBody IccTemplateSearchRequest request) {

        List<IccTemplate> templates = fieldPlanTemplateService.searchIccTemplates(
                request.getTenantId(), request.getSolutionCodes());
        ResponseInfo responseInfo = ResponseInfoFactory.createResponseInfo(request.getRequestInfo(), true);
        return new ResponseEntity<>(IccTemplateResponse.builder()
                .responseInfo(responseInfo)
                .iccTemplates(templates)
                .totalCount(templates.size())
                .build(), HttpStatus.OK);
    }
}
