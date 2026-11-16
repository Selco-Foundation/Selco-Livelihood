package org.egov.amc.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.egov.common.contract.request.RequestInfo;

/** Livelihood {@code configuration/_activate}: the installation row whose report was just approved (LLD §6.3). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmcActivationRequest {
    @JsonProperty("RequestInfo")
    private RequestInfo requestInfo;
    private String tenantId;
    private String activityFacilityId;
    /** Optional: the approval time the installation service just set (its own save is asynchronous). */
    private Long approvedAt;
}
