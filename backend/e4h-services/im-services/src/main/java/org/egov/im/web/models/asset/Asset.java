package org.egov.im.web.models.asset;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Asset {

    @JsonProperty("assetId")
    private String assetId;

    @JsonProperty("tenantId")
    private String tenantId;

    @JsonProperty("facilityID")
    private String facilityID;

    @JsonProperty("boundaryCode")
    private String boundaryCode;

    @JsonProperty("assetTypeID")
    private String assetTypeID;

    @JsonProperty("assetDetails")
    private Map<String, Object> assetDetails;

    @JsonProperty("additionalDetails")
    private Map<String, Object> additionalDetails;

    @JsonProperty("vendorId")
    private String vendorId;

    @JsonProperty("itemCode")
    private String itemCode;

    @JsonProperty("name")
    private String name;

    @JsonProperty("wfStatus")
    private String wfStatus;

    @JsonProperty("serialNumber")
    private String serialNumber;
}
