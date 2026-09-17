package org.egov.asset.web.models.boundary;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BoundaryRelation {

    @JsonProperty("code")
    @NotNull
    private String code;

    @JsonProperty("tenantId")
    @NotNull
    private String tenantId;

    @JsonProperty("hierarchyType")
    @NotNull
    private String hierarchyType;

    @JsonProperty("boundaryType")
    @NotNull
    private String boundaryType;

    @JsonProperty("parent")
    private String parent;
}
