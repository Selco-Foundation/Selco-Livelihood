package org.egov.im.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import org.egov.im.web.models.workflow.ProcessInstance;

import jakarta.validation.Valid;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class IncidentWrapper {


    @Valid
    @NonNull
    @JsonProperty("incident")
    private Incident incident = null;

    @Valid
    @JsonProperty("workflow")
    private Workflow workflow = null;

    @JsonProperty("processHistory")
    private List<ProcessInstance> processHistory = null;

}
