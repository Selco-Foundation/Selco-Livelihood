package org.egov.im.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.egov.im.config.IMConfiguration;
import org.egov.im.web.models.asset.Asset;
import org.egov.im.web.models.asset.AssetSearchCriteria;
import org.egov.im.web.models.asset.AssetSearchRequest;
import org.egov.tracer.model.CustomException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class AssetRegistryUtil {

    private static final int VENDOR_ASSET_PAGE_SIZE = 200;

    private final IMConfiguration config;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public Asset fetchAsset(RequestInfo requestInfo, String tenantId, String assetId, String facilityId) {
        AssetSearchCriteria criteria = AssetSearchCriteria.builder()
                .tenantId(tenantId)
                .assetID(assetId)
                .facilityID(facilityId)
                .build();

        AssetSearchRequest searchRequest = AssetSearchRequest.builder()
                .requestInfo(requestInfo)
                .criteria(criteria)
                .build();

        String url = UriComponentsBuilder
                .fromHttpUrl(config.getAssetRegistryHost() + config.getAssetRegistrySearchPath())
                .queryParam("limit", 1)
                .queryParam("offset", 0)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<AssetSearchRequest> entity = new HttpEntity<>(searchRequest, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    String.class
            );
            if (response.getBody() == null || response.getBody().isBlank()) {
                throw new CustomException("ASSET_NOT_FOUND", "No asset found for assetId: " + assetId);
            }
            List<Asset> assets = objectMapper.readValue(response.getBody(), new TypeReference<List<Asset>>() {});
            if (CollectionUtils.isEmpty(assets)) {
                throw new CustomException("ASSET_NOT_FOUND", "No asset found for assetId: " + assetId);
            }
            return assets.get(0);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch asset from asset-registry for assetId={}", assetId, e);
            throw new CustomException("ASSET_REGISTRY_ERROR", "Failed to fetch asset from asset-registry");
        }
    }

    public List<Asset> searchAssetsByFacility(RequestInfo requestInfo, String tenantId, String facilityId) {
        AssetSearchCriteria criteria = AssetSearchCriteria.builder()
                .tenantId(tenantId)
                .facilityID(facilityId)
                .build();
        return searchAssets(requestInfo, criteria, 100, 0);
    }

    /**
     * Returns asset IDs mapped to any of the given vendor keys (org code, org id, or user uuid).
     */
    public Set<String> searchAssetIdsByVendorKeys(RequestInfo requestInfo, String tenantId, Set<String> vendorKeys) {
        Set<String> assetIds = new LinkedHashSet<>();
        if (CollectionUtils.isEmpty(vendorKeys)) {
            return assetIds;
        }
        for (String vendorKey : vendorKeys) {
            if (vendorKey == null || vendorKey.isBlank()) {
                continue;
            }
            int offset = 0;
            while (true) {
                AssetSearchCriteria criteria = AssetSearchCriteria.builder()
                        .tenantId(tenantId)
                        .vendorId(vendorKey.trim())
                        .build();
                List<Asset> page = searchAssets(requestInfo, criteria, VENDOR_ASSET_PAGE_SIZE, offset);
                if (CollectionUtils.isEmpty(page)) {
                    break;
                }
                for (Asset asset : page) {
                    if (asset != null && asset.getAssetId() != null && !asset.getAssetId().isBlank()) {
                        assetIds.add(asset.getAssetId().trim());
                    }
                }
                if (page.size() < VENDOR_ASSET_PAGE_SIZE) {
                    break;
                }
                offset += VENDOR_ASSET_PAGE_SIZE;
            }
        }
        return assetIds;
    }

    private List<Asset> searchAssets(RequestInfo requestInfo, AssetSearchCriteria criteria, int limit, int offset) {
        AssetSearchRequest searchRequest = AssetSearchRequest.builder()
                .requestInfo(requestInfo)
                .criteria(criteria)
                .build();

        String url = UriComponentsBuilder
                .fromHttpUrl(config.getAssetRegistryHost() + config.getAssetRegistrySearchPath())
                .queryParam("limit", limit)
                .queryParam("offset", offset)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<AssetSearchRequest> entity = new HttpEntity<>(searchRequest, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    String.class
            );
            if (response.getBody() == null || response.getBody().isBlank()) {
                return List.of();
            }
            List<Asset> assets = objectMapper.readValue(response.getBody(), new TypeReference<List<Asset>>() {});
            return assets != null ? assets : new ArrayList<>();
        } catch (Exception e) {
            log.error("Failed to search assets from asset-registry criteria={}", criteria, e);
            throw new CustomException("ASSET_REGISTRY_ERROR", "Failed to search assets from asset-registry");
        }
    }
}
