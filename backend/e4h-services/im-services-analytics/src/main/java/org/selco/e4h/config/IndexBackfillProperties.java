package org.selco.e4h.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Component
public class IndexBackfillProperties {

    @Value("${es.index.computed.sla.im.services}")
    private String ticketIndex;

    @Value("${php.kafka.topic.indexer}")
    private String facilityIndex;

    /** Rows read from Postgres, and facility documents scrolled from Elasticsearch, per page. */
    @Value("${backfill.page.size:2000}")
    private int pageSize;

    /** Documents per Elasticsearch {@code _bulk} request. */
    @Value("${backfill.bulk.size:500}")
    private int bulkSize;

    /**
     * Tenant the BOUNDARY_ localisations are registered under. Boundary labels were consolidated
     * onto the state-level tenant by the im-services localisation migrations, so this is not the
     * per-facility tenant id.
     */
    @Value("${backfill.localization.tenant.id:in}")
    private String localizationTenantId;
}
