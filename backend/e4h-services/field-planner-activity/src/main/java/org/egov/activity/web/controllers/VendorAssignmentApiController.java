package org.egov.activity.web.controllers;

import io.swagger.annotations.ApiParam;
import jakarta.validation.Valid;
import org.egov.activity.service.VendorAssignmentService;
import org.egov.activity.web.models.VendorAssignmentCreateResponse;
import org.egov.activity.web.models.VendorAssignmentError;
import org.egov.activity.web.models.VendorAssignmentRequest;
import org.egov.activity.web.models.VendorAssignmentSearchRequest;
import org.egov.activity.web.models.VendorAssignmentSearchResponse;
import org.egov.activity.web.models.VendorAssignmentValidationResponse;
import org.egov.common.utils.ResponseInfoFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;

/**
 * Vendor Assignment (FR-07) — the Project Manager's last step.
 *
 * Three endpoints, matching the shape the Installation Scope and Template steps already use:
 * read the grid, validate what was filled in, then create. The confirmation modal sits between
 * validate and create, in the frontend.
 */
@Controller
@RequestMapping("/v1/vendor-assignment")
@Validated
public class VendorAssignmentApiController {

    private final VendorAssignmentService vendorAssignmentService;

    @Autowired
    public VendorAssignmentApiController(VendorAssignmentService vendorAssignmentService) {
        this.vendorAssignmentService = vendorAssignmentService;
    }

    /**
     * The assets to assign, grouped by End User Site. Derived from the plan's scope and each
     * Solution's IC Report template — nothing is created by this call.
     */
    @RequestMapping(value = "/_search", method = RequestMethod.POST)
    public ResponseEntity<VendorAssignmentSearchResponse> search(
            @ApiParam(value = "The installation plan whose assets are being assigned.", required = true)
            @Valid @RequestBody VendorAssignmentSearchRequest request) {

        VendorAssignmentSearchResponse response =
                vendorAssignmentService.search(request.getCriteria());
        response.setResponseInfo(ResponseInfoFactory.createResponseInfo(request.getRequestInfo(), true));
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    /**
     * Checks the submission without writing anything. Errors come back per asset so the grid can
     * highlight the rows at fault, alongside plan-level problems that have no single row.
     *
     * An invalid submission is a normal outcome of this endpoint, not a transport failure, so it
     * comes back 200 — read `valid` and `Errors`. The exception is a vendor-registry outage:
     * the organisation/vendor pairings are confirmed live, and if that lookup cannot be made the
     * call fails outright rather than reporting the Project Manager's vendors as wrong.
     */
    @RequestMapping(value = "/_validate", method = RequestMethod.POST)
    public ResponseEntity<VendorAssignmentValidationResponse> validate(
            @ApiParam(value = "The vendor assignments to check.", required = true)
            @Valid @RequestBody VendorAssignmentRequest request) {

        List<VendorAssignmentError> errors = vendorAssignmentService.validate(request);

        return new ResponseEntity<>(VendorAssignmentValidationResponse.builder()
                .responseInfo(ResponseInfoFactory.createResponseInfo(request.getRequestInfo(), true))
                .valid(errors.isEmpty())
                .errors(errors)
                .build(), HttpStatus.OK);
    }

    /**
     * Saves the assignments and hands the work over: one asset row and one IC Report row per
     * asset, each with its vendor and Report Number, and the plan moved to SCHEDULED.
     *
     * Re-runs the whole of validate rather than trusting that it was called, and does everything
     * in one transaction — assignment is one-shot, so a partial dispatch could not be repaired.
     */
    @RequestMapping(value = "/_create", method = RequestMethod.POST)
    public ResponseEntity<VendorAssignmentCreateResponse> create(
            @ApiParam(value = "The vendor assignments to save.", required = true)
            @Valid @RequestBody VendorAssignmentRequest request) {

        VendorAssignmentCreateResponse response = vendorAssignmentService.create(request);
        response.setResponseInfo(ResponseInfoFactory.createResponseInfo(request.getRequestInfo(), true));
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
