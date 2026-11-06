package org.egov.field_planner.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** A geography code (state, district or block) that cannot be removed, and what holds it. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GeographyLock {
    @JsonProperty("code")
    private String code;

    @JsonProperty("usedBy")
    @Builder.Default
    private List<Usage> usedBy = new ArrayList<>();

    /** One plan holding the code; {@code siteCount} is set only for a plan-level lock. */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class Usage {
        @JsonProperty("fieldPlanId")
        private String fieldPlanId;

        @JsonProperty("fieldPlanName")
        private String fieldPlanName;

        @JsonProperty("siteCount")
        private Integer siteCount;
    }
}
