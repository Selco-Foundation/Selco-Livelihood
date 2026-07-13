package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.response.ResponseInfo;

/**
 * Response for QR resolve — username/mobile for OTP pre-fill + scanned asset context.
 * Does not issue an auth token; client sends OTP via user-otp then logs in via OAuth.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class QrResolveResponse {

    @JsonProperty("ResponseInfo")
    private ResponseInfo responseInfo;

    /** DIGIT login username (registered phone number). */
    @JsonProperty("userName")
    private String userName;

    @JsonProperty("mobileNumber")
    private String mobileNumber;

    @JsonProperty("userUuid")
    private String userUuid;

    @JsonProperty("facilityId")
    private String facilityId;

    @JsonProperty("facilityBoundaryCode")
    private String facilityBoundaryCode;

    @JsonProperty("scannedAsset")
    private ScannedAssetSummary scannedAsset;
}
