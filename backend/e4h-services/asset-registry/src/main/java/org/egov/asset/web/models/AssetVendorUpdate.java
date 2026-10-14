package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

/**
 * One asset group's new vendor.
 *
 * <p>{@code assetId} is the group parent (e.g. the SOLAR row); the change applies to
 * it and to every unit beneath it.
 *
 * <p>{@code vendorId} is the vendor <b>user</b> uuid - the person the End User Admin
 * picked - matching what asset ingestion stores so im-services can assign tickets
 * directly to that person. {@code organisationId} is the Vendor organisation the
 * user was chosen under, carried so the pairing can be validated in one step.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AssetVendorUpdate {

    @JsonProperty("assetId")
    @NotBlank
    private String assetId;

    @JsonProperty("vendorId")
    @NotBlank
    private String vendorId;

    @JsonProperty("organisationId")
    @NotBlank
    private String organisationId;
}
