package org.egov.asset.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.config.Configuration;
import org.egov.asset.web.models.Asset;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AssetLocalizationService {

    private static final String LOCALIZATION_MODULE = "rainmaker-in";
    private static final String LOCALIZATION_LOCALE = "en_IN";

    private final RestTemplate restTemplate;
    private final Configuration configuration;

    public void upsertAssetBoundaryLocalizations(Asset asset, RequestInfo requestInfo) {
        if (asset == null) {
            return;
        }

        String assetBoundaryCode = asset.getBoundaryCode();
        if (StringUtils.isBlank(assetBoundaryCode)) {
            return;
        }

        String localizationCode = "Boundary_" + assetBoundaryCode;
        String displayName = resolveDisplayName(asset, localizationCode);

        List<Map<String, String>> messages = List.of(Map.of(
                "code", localizationCode,
                "message", displayName,
                "module", LOCALIZATION_MODULE,
                "locale", LOCALIZATION_LOCALE
        ));

        upsertMessages(requestInfo, messages);
    }

    public void upsertAssetBoundaryLocalizations(List<Asset> assets, RequestInfo requestInfo) {
        if (assets == null || assets.isEmpty()) {
            return;
        }

        List<Map<String, String>> messages = new ArrayList<>();
        for (Asset asset : assets) {
            if (asset == null || StringUtils.isBlank(asset.getBoundaryCode())) {
                continue;
            }
            String localizationCode = "Boundary_" + asset.getBoundaryCode();
            messages.add(Map.of(
                    "code", localizationCode,
                    "message", resolveDisplayName(asset, localizationCode),
                    "module", LOCALIZATION_MODULE,
                    "locale", LOCALIZATION_LOCALE
            ));
        }

        upsertMessages(requestInfo, messages);
    }

    private String resolveDisplayName(Asset asset, String localizationCode) {
        if (StringUtils.isNotBlank(asset.getName())) {
            return asset.getName();
        }
        if (StringUtils.isNotBlank(asset.getItemCode())) {
            return asset.getItemCode();
        }
        if (StringUtils.isNotBlank(asset.getAssetId())) {
            return asset.getAssetId();
        }
        return localizationCode;
    }

    private void upsertMessages(RequestInfo requestInfo, List<Map<String, String>> messages) {
        if (messages.isEmpty()) {
            return;
        }

        String localizationHost = configuration.getLocalizationHost();
        String localizationContextPath = configuration.getLocalizationContextPath();
        String localizationUpsertPath = configuration.getLocalizationUpsertPath();
        if (StringUtils.isBlank(localizationHost)
                || StringUtils.isBlank(localizationContextPath)
                || StringUtils.isBlank(localizationUpsertPath)) {
            log.warn("Localization host/context/upsert path not configured; skipping asset boundary localization upsert");
            return;
        }

        String upsertUrl = UriComponentsBuilder.fromUriString(localizationHost)
                .path(localizationContextPath)
                .path(localizationUpsertPath)
                .toUriString();

        log.info("Upserting asset boundary localizations: messages={}, module={}, locale={}",
                messages.size(), LOCALIZATION_MODULE, LOCALIZATION_LOCALE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("RequestInfo", requestInfo);
        payload.put("tenantId", configuration.getLocalizationTenantId());
        payload.put("messages", messages);

        try {
            restTemplate.postForObject(upsertUrl, payload, Map.class);
            log.info("Completed asset boundary localization upsert successfully: messages={}", messages.size());
        } catch (Exception e) {
            log.error("Localization upsert failed for asset boundary localizations: messages={}", messages.size(), e);
        }
    }
}
