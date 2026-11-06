package org.egov.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.validation.annotation.Validated;

import java.util.List;


/**
 * Encapsulates all parameters for building a project search query.
 */
@Validated
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrgUserSearchCriteria {

    @JsonProperty("ids")
    private @Valid List<String> id = null;

    @JsonProperty("userIds")
    private @Valid List<String> userId = null;

    @JsonProperty("organizationIds")
    private @Valid List<String> organizationId = null;

    @JsonProperty("tenantId")
    private String tenantId;
    /** Case-insensitive "contains" match on the user's name. */
    @JsonProperty("name")
    private String name;
    /** Role codes; a user matches when it holds at least one of them. */
    @JsonProperty("roles")
    private @Valid List<String> roles = null;

    public boolean hasUserAttributeFilter() {
        return (name != null && !name.isBlank()) || (roles != null && !roles.isEmpty());
    }

}
