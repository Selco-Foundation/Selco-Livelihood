package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ScannedAssetSummary {

    @JsonProperty("assetId")
    private String assetId;

    @JsonProperty("facilityID")
    private String facilityID;

    @JsonProperty("itemCode")
    private String itemCode;

    @JsonProperty("name")
    private String name;

    @JsonProperty("vendorId")
    private String vendorId;

    @JsonProperty("boundaryCode")
    private String boundaryCode;

    @JsonProperty("serialNumber")
    private String serialNumber;
}
