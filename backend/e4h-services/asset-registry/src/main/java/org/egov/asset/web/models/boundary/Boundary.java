package org.egov.asset.web.models.boundary;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Boundary {

    @JsonProperty("tenantId")
    private String tenantId;

    @JsonProperty("code")
    @NotNull
    private String code;

    @JsonProperty("geometry")
    @Valid
    private JsonNode geometry = null;
}
