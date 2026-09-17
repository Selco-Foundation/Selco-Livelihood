package org.egov.asset.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.config.Configuration;
import org.egov.asset.util.MdmsUtil;
import org.egov.asset.web.models.Asset;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AssetLocalizationService {

    private static final String LOCALIZATION_MODULE = "rainmaker-livelihood";
    private static final String LOCALIZATION_LOCALE = "en_IN";
    private static final String DEFAULT_UPSERT_PATH = "/_upsert";

    private final RestTemplate restTemplate;
    private final Configuration configuration;
    private final MdmsUtil mdmsUtil;

    public void upsertAssetBoundaryLocalizations(Asset asset, RequestInfo requestInfo) {
        if (asset == null) {
            return;
        }

        String assetBoundaryCode = asset.getBoundaryCode();
        if (StringUtils.isBlank(assetBoundaryCode)) {
            log.warn("Skipping asset boundary localization upsert because boundaryCode is blank for assetId={}",
                    asset.getAssetId());
            return;
        }

        String localizationCode = "BOUNDARY_" + assetBoundaryCode;
        String displayName = resolveDisplayName(asset, requestInfo, localizationCode);

        List<Map<String, String>> messages = List.of(Map.of(
                "code", localizationCode,
                "message", displayName,
                "module", LOCALIZATION_MODULE,
                "locale", LOCALIZATION_LOCALE
        ));

        upsertMessages(requestInfo, messages, localizationCode);
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
            String localizationCode = "BOUNDARY_" + asset.getBoundaryCode();
            messages.add(Map.of(
                    "code", localizationCode,
                    "message", resolveDisplayName(asset, requestInfo, localizationCode),
                    "module", LOCALIZATION_MODULE,
                    "locale", LOCALIZATION_LOCALE
            ));
        }

        upsertMessages(requestInfo, messages, null);
    }

    private String resolveDisplayName(Asset asset, RequestInfo requestInfo, String localizationCode) {
        if (StringUtils.isNotBlank(asset.getName())) {
            return asset.getName();
        }
        if (requestInfo != null && StringUtils.isNotBlank(asset.getItemCode())) {
            String itemName = mdmsUtil.resolveItemCodeDisplayName(
                    requestInfo, asset.getTenantId(), asset.getItemCode());
            if (StringUtils.isNotBlank(itemName)) {
                return itemName;
            }
        }
        if (StringUtils.isNotBlank(asset.getItemCode())) {
            return asset.getItemCode();
        }
        if (StringUtils.isNotBlank(asset.getAssetId())) {
            return asset.getAssetId();
        }
        return localizationCode;
    }

    private void upsertMessages(RequestInfo requestInfo, List<Map<String, String>> messages, String localizationCode) {
        if (messages.isEmpty()) {
            return;
        }

        String localizationHost = configuration.getLocalizationHost();
        String localizationContextPath = configuration.getLocalizationContextPath();
        if (StringUtils.isBlank(localizationHost) || StringUtils.isBlank(localizationContextPath)) {
            log.warn("Localization host/context not configured; skipping asset boundary localization upsert");
            return;
        }

        String upsertUrl = resolveUpsertUrl(localizationHost, localizationContextPath);

        log.info("Upserting asset boundary localization code={} url={} tenantId={} module={} locale={}",
                localizationCode != null ? localizationCode : messages.get(0).get("code"),
                upsertUrl,
                configuration.getLocalizationTenantId(),
                LOCALIZATION_MODULE,
                LOCALIZATION_LOCALE);

        Map<String, Object> payload = new HashMap<>();
        payload.put("RequestInfo", requestInfo);
        payload.put("tenantId", configuration.getLocalizationTenantId());
        payload.put("messages", messages);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(upsertUrl, requestEntity, Map.class);
            log.info("Completed asset boundary localization upsert successfully: code={} status={}",
                    localizationCode != null ? localizationCode : messages.get(0).get("code"),
                    response.getStatusCode());
        } catch (HttpStatusCodeException e) {
            log.error("Localization upsert failed for asset boundary code={} status={} body={}",
                    localizationCode != null ? localizationCode : messages.get(0).get("code"),
                    e.getStatusCode(),
                    e.getResponseBodyAsString(),
                    e);
        } catch (Exception e) {
            log.error("Localization upsert failed for asset boundary code={}",
                    localizationCode != null ? localizationCode : messages.get(0).get("code"),
                    e);
        }
    }

    /**
     * Mirrors facility-registry URL construction and supports hosts that already include the localization base path.
     */
    private String resolveUpsertUrl(String localizationHost, String localizationContextPath) {
        String upsertPath = StringUtils.defaultIfBlank(configuration.getLocalizationUpsertPath(), DEFAULT_UPSERT_PATH);
        String host = localizationHost.replaceAll("/+$", "");
        if (host.contains("/localization/messages")) {
            return host + upsertPath;
        }
        String contextPath = localizationContextPath.startsWith("/")
                ? localizationContextPath
                : "/" + localizationContextPath;
        return host + contextPath + upsertPath;
    }
}
