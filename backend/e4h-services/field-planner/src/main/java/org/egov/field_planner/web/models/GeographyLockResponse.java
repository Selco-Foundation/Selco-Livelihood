package org.egov.field_planner.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.response.ResponseInfo;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GeographyLockResponse {
    @JsonProperty("ResponseInfo")
    private ResponseInfo responseInfo;

    @JsonProperty("GeographyLocks")
    @Builder.Default
    private List<GeographyLock> geographyLocks = new ArrayList<>();

    /** A plan's sectors that cannot be removed; empty for a project. */
    @JsonProperty("SectorLocks")
    @Builder.Default
    private List<GeographyLock> sectorLocks = new ArrayList<>();
}
