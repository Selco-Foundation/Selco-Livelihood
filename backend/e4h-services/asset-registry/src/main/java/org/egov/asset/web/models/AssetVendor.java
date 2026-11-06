package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Vendor mapped to an asset (asset.vendorId), resolved from vendor-registry for display.
 * Response only - not persisted.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AssetVendor {

    /** Vendor user's UUID (asset.vendorId). Null when vendorId was an organisation id. */
    @JsonProperty("userId")
    private String userId;

    @JsonProperty("userName")
    private String userName;

    /** Vendor user's display name. */
    @JsonProperty("name")
    private String name;

    @JsonProperty("mobileNumber")
    private String mobileNumber;

    @JsonProperty("organisationId")
    private String organisationId;

    @JsonProperty("organisationName")
    private String organisationName;

    @JsonProperty("orgNumber")
    private String orgNumber;

    @JsonProperty("applicationNumber")
    private String applicationNumber;
}
