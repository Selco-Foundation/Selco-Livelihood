package org.egov.asset.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/** Changes the vendor on one or more of an end user's asset groups in a single save. */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AssetVendorUpdateRequest {

    @JsonProperty("RequestInfo")
    private RequestInfo requestInfo;

    @JsonProperty("tenantId")
    private String tenantId;

    @JsonProperty("AssetVendorUpdates")
    @NotEmpty
    @Valid
    private List<AssetVendorUpdate> assetVendorUpdates;
}
