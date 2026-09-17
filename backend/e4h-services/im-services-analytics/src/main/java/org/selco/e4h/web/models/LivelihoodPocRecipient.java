package org.selco.e4h.web.models;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class LivelihoodPocRecipient {
    String uuid;
    String name;
    String email;
    List<String> stateBoundaryCodes;
}
