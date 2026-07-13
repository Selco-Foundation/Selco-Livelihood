package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.validation.annotation.Validated;

/**
 * Request for QR → end-user (COMPLAINANT) resolve used by OTP login.
 * QR encodes assetId; backend resolves facility manager mobile for OTP pre-fill.
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

    @JsonProperty("assetId")
    private String assetId;

    /**
     * Optional alternate payload field (base64 / signed token). When present without assetId,
     * treated as plain assetId string for Phase-2 OTP login.
     */
    @JsonProperty("qrPayload")
    private String qrPayload;
}
