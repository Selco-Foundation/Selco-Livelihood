package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.response.ResponseInfo;

/**
 * Response for QR resolve — login username + OTP mobile can differ for HRMS employees.
 * Does not issue an auth token; client sends OTP via user-otp then logs in via OAuth.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class QrResolveResponse {

    @JsonProperty("ResponseInfo")
    private ResponseInfo responseInfo;

    /** DIGIT OAuth username (often employee code / user.userName — may differ from mobile). */
    @JsonProperty("userName")
    private String userName;

    /** Phone for OTP SMS (user.mobileNumber). */
    @JsonProperty("mobileNumber")
    private String mobileNumber;

    @JsonProperty("name")
    private String name;

    @JsonProperty("userUuid")
    private String userUuid;

    @JsonProperty("facilityId")
    private String facilityId;

    @JsonProperty("facilityBoundaryCode")
    private String facilityBoundaryCode;

    @JsonProperty("scannedAsset")
    private ScannedAssetSummary scannedAsset;
}
