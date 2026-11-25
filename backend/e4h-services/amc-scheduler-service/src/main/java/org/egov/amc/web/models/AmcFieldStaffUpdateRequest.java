package org.egov.amc.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.request.RequestInfo;

import java.util.List;

/** {@code POST /v1/configuration/field-staff/_update} body (LLD §6.6). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmcFieldStaffUpdateRequest {

    @JsonProperty("RequestInfo")
    private RequestInfo requestInfo;

    @JsonProperty("AmcFieldStaffUpdates")
    private List<Item> amcFieldStaffUpdates;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Item {
        private String tenantId;
        private String activityFacilityId;
        /** Only when the org also changes. */
        private String vendorOrgId;
        private String fieldStaffUserId;
        /** Who fixes a rework report that stayed with an earlier org. */
        private String rejectedVisitFieldStaffUserId;
    }
}
