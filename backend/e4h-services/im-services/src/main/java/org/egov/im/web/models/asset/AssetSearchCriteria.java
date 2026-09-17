package org.egov.im.web.models.asset;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetSearchCriteria {

    @JsonProperty("tenantId")
    private String tenantId;

    @JsonProperty("assetID")
    private String assetID;

    @JsonProperty("facilityID")
    private String facilityID;

    @JsonProperty("vendorId")
    private String vendorId;
}
