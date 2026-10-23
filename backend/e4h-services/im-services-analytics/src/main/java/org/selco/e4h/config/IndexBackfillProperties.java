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
     * Tenant and module the BOUNDARY_ boundary labels are registered under. These are a pair — the
     * same boundary code is registered under different modules per tenant — and they match what
     * im-services uses when it localises district and block names onto an incident.
     */
    @Value("${backfill.localization.tenant.id:livelihood}")
    private String localizationTenantId;

    @Value("${backfill.localization.module:rainmaker-livelihood}")
    private String localizationModule;
}
