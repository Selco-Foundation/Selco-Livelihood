package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * What one group's remap actually changed.
 *
 * <p>{@code updatedAssetIds} lists the parent and every unit written, so the caller
 * can show per-group success without re-fetching - the write is applied
 * asynchronously off Kafka, so an immediate read may still return the old vendor.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AssetVendorUpdateResult {

    @JsonProperty("assetId")
    private String assetId;

    @JsonProperty("vendorId")
    private String vendorId;

    @JsonProperty("organisationId")
    private String organisationId;

    @JsonProperty("updatedAssetIds")
    private List<String> updatedAssetIds;
}
