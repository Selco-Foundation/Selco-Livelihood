package org.egov.im.util;

import org.egov.im.config.IMConfiguration;
import org.springframework.stereotype.Component;

import static org.egov.im.util.IMConstants.LIVELIHOOD_TENANT_ID;

@Component
public class LivelihoodTenantUtil {

    private final IMConfiguration config;

    public LivelihoodTenantUtil(IMConfiguration config) {
        this.config = config;
    }

    public boolean isLivelihood(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return false;
        }
        String livelihoodTenant = config.getLivelihoodTenantId() != null
                ? config.getLivelihoodTenantId()
                : LIVELIHOOD_TENANT_ID;
        return tenantId.equalsIgnoreCase(livelihoodTenant)
                || tenantId.toLowerCase().startsWith(livelihoodTenant.toLowerCase() + ".");
    }
}
