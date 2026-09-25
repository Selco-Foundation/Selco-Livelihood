package org.selco.e4h.web.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What the backfill did, per index.
 *
 * <p>{@code missing} counts ids the index does not hold. On the ticket index that is normal — the
 * run is driven off the incident table, which also holds tickets that never reached the index —
 * so it is reported apart from {@code failed}, which means Elasticsearch rejected the write.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IndexBackfillSummary {

    @JsonProperty("index")
    private String index;

    @JsonProperty("scanned")
    private int scanned;

    @JsonProperty("updated")
    private int updated;

    @JsonProperty("missing")
    private int missing;

    @JsonProperty("failed")
    private int failed;

    @JsonProperty("durationMs")
    private long durationMs;
}
