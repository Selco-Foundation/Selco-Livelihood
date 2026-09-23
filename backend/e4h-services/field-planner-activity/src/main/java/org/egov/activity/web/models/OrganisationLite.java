package org.egov.activity.web.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Only the fields this service actually reads off vendor-registry's Organisation. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrganisationLite {

    @JsonProperty("id")
    private String id;

    @JsonProperty("name")
    private String name;
}
