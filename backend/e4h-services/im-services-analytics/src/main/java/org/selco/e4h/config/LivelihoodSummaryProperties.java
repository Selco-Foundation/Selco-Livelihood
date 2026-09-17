package org.selco.e4h.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Component
public class LivelihoodSummaryProperties {

    @Value("${livelihood.tenant.id:livelihood}")
    private String livelihoodTenantId;

    @Value("${livelihood.mobile.app.link:}")
    private String mobileAppLink;

    @Value("${livelihood.localization.module:rainmaker-livelihood}")
    private String localizationModule;

    @Value("${egov.localization.host}")
    private String localizationHost;

    @Value("${egov.localization.context.path}")
    private String localizationContextPath;

    @Value("${egov.localization.search.endpoint}")
    private String localizationSearchEndpoint;

    @Value("${co2.localization.locale:en_IN}")
    private String localizationLocale;

    @Value("${livelihood.mdms.tenant.id:livelihood}")
    private String mdmsTenantId;

    public boolean isLivelihoodDeployment() {
        return livelihoodTenantId != null
                && mdmsTenantId != null
                && livelihoodTenantId.equalsIgnoreCase(mdmsTenantId);
    }
}
