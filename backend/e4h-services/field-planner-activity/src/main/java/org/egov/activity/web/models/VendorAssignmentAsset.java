package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

/**
 * One vendor-assignable asset at one End User Site.
 *
 * A site's Solution expands into exactly one SOLAR asset for the whole solar section, plus one
 * MACHINE asset per machine in the Solution's IC Report template. Used in both directions: the
 * search response returns it with the vendor fields empty for the Project Manager to fill, and
 * the submit request returns it populated.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VendorAssignmentAsset {

    /** SOLAR | MACHINE */
    @JsonProperty("componentType")
    private String componentType = null;

    /** 1-based within componentType. SOLAR is always 1; MACHINE runs 1..N in template order. */
    @JsonProperty("componentSequence")
    private Integer componentSequence = null;

    /**
     * What the Project Manager sees in the Asset column: "Solar" for the solar asset, and the
     * machine's product name from the template for each machine.
     */
    @JsonProperty("assetName")
    private String assetName = null;

    @JsonProperty("vendorOrgId")
    private String vendorOrgId = null;

    @JsonProperty("vendorOrgName")
    private String vendorOrgName = null;

    /** The chosen vendor: an eg_org_user, i.e. a platform user linked to that organisation. */
    @JsonProperty("vendorUserId")
    private String vendorUserId = null;

    @JsonProperty("vendorUserName")
    private String vendorUserName = null;

    @JsonProperty("vendorEmail")
    private String vendorEmail = null;

    @JsonProperty("vendorPhone")
    private String vendorPhone = null;

    /** Populated on read once the assignment has been submitted; null beforehand. */
    @JsonProperty("reportNumber")
    private String reportNumber = null;
}
