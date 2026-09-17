package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.validation.annotation.Validated;

/**
 * Request for QR → facility end-user (COMPLAINANT) resolve used by OTP login.
 * Primary key is facilityId (end user is created at facility level).
 * Optional assetId pre-selects a linked asset after login.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class QrResolveRequest {

    @JsonProperty("RequestInfo")
    private RequestInfo requestInfo;

    @JsonProperty("tenantId")
    private String tenantId;

    /** Preferred — QR encodes facilityId (1 end user per facility). */
    @JsonProperty("facilityId")
    private String facilityId;

    /** Optional — when QR is stuck on a specific asset; resolves via asset → facility. */
    @JsonProperty("assetId")
    private String assetId;

    /**
     * Optional alternate payload. When present without facilityId/assetId,
     * treated as facilityId for Phase-2 OTP login.
     */
    @JsonProperty("qrPayload")
    private String qrPayload;
}
