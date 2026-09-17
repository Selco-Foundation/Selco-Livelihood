package org.egov.im.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.asset.Asset;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.egov.im.util.IMConstants.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class LivelihoodIssueTypeUtil {

    private final MDMSUtils mdmsUtils;
    private final ObjectMapper objectMapper;

    /**
     * Resolves the machine category used as ServiceDefs.menuPath from the asset's item code (MDMS ItemCode.category).
     */
    public String resolveAssetCategory(RequestInfo requestInfo, String tenantId, Asset asset) {
        if (asset == null) {
            throw new CustomException("ASSET_NOT_FOUND", "Asset is required to resolve issue type category");
        }

        if (StringUtils.isNotBlank(asset.getItemCode())) {
            Object itemCodeMdms = mdmsUtils.fetchMDMSData(
                    requestInfo,
                    tenantId,
                    MDMS_LIVELIHOOD_MODULE,
                    List.of(MDMS_ITEM_CODE_MASTER),
                    "$.[?(@.active==true)]"
            );
            String category = findItemCodeCategory(itemCodeMdms, asset.getItemCode().trim());
            if (StringUtils.isNotBlank(category)) {
                return category;
            }
            log.warn("No ItemCode MDMS category for itemCode={} on assetId={}", asset.getItemCode(), asset.getAssetId());
        }

        if (StringUtils.isNotBlank(asset.getAssetTypeID())) {
            return asset.getAssetTypeID().trim();
        }

        throw new CustomException(
                "ASSET_CATEGORY_UNKNOWN",
                "Could not resolve machine category for assetId: " + asset.getAssetId()
        );
    }

    /**
     * Validates incidentType (serviceCode) against ServiceDefs for the asset category or the catch-all menu path.
     */
    public void validateIssueType(String serviceCode, String assetCategory, Object incidentMdmsData) {
        if (StringUtils.isBlank(serviceCode)) {
            throw new CustomException("ISSUE_TYPE_MISSING", "incidentType (issue type) is mandatory for Livelihood tickets");
        }

        String issueCode = serviceCode.trim();
        if (matchesServiceDef(issueCode, assetCategory, incidentMdmsData)) {
            return;
        }
        if (matchesServiceDef(issueCode, LIVELIHOOD_CATCH_ALL_MENU_PATH, incidentMdmsData)) {
            return;
        }

        throw new CustomException(
                "INVALID_ISSUE_TYPE",
                "Issue type '" + issueCode + "' is not valid for machine category: " + assetCategory
        );
    }

    public void storeAssetCategory(Incident incident, String assetCategory) {
        Map<String, Object> details = toMutableMap(incident.getAdditionalDetail());
        details.put(LIVELIHOOD_ASSET_CATEGORY_DETAIL_KEY, assetCategory);
        incident.setAdditionalDetail(details);
    }

    public String extractAssetCategory(Incident incident) {
        if (incident == null || incident.getAdditionalDetail() == null) {
            return null;
        }
        Map<String, Object> details = toMutableMap(incident.getAdditionalDetail());
        Object value = details.get(LIVELIHOOD_ASSET_CATEGORY_DETAIL_KEY);
        return value != null ? String.valueOf(value) : null;
    }

    private boolean matchesServiceDef(String serviceCode, String menuPath, Object mdmsData) {
        if (StringUtils.isBlank(menuPath)) {
            return false;
        }
        String jsonPath = MDMS_SERVICEDEF_LIVELIHOOD_SEARCH
                .replace("{SERVICEDEF}", serviceCode)
                .replace("{MENUPATH}", menuPath);
        try {
            List<Object> matches = JsonPath.read(mdmsData, jsonPath);
            return !CollectionUtils.isEmpty(matches);
        } catch (Exception e) {
            log.error("Failed to validate issue type against MDMS | serviceCode={} menuPath={}", serviceCode, menuPath, e);
            throw new CustomException("JSONPATH_ERROR", "Failed to parse MDMS response for issue type validation");
        }
    }

    @SuppressWarnings("unchecked")
    private String findItemCodeCategory(Object mdmsData, String itemCode) {
        try {
            List<Map<String, Object>> itemCodes = JsonPath.read(mdmsData, "$.MdmsRes." + MDMS_LIVELIHOOD_MODULE + "." + MDMS_ITEM_CODE_MASTER);
            if (CollectionUtils.isEmpty(itemCodes)) {
                return null;
            }
            for (Map<String, Object> row : itemCodes) {
                Object code = row.get("code");
                if (code != null && itemCode.equalsIgnoreCase(String.valueOf(code).trim())) {
                    Object category = row.get("category");
                    return category != null ? String.valueOf(category).trim() : null;
                }
            }
        } catch (Exception e) {
            log.error("Failed to resolve ItemCode category for itemCode={}", itemCode, e);
            throw new CustomException("JSONPATH_ERROR", "Failed to parse ItemCode MDMS response");
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMutableMap(Object additionalDetail) {
        if (additionalDetail == null) {
            return new HashMap<>();
        }
        if (additionalDetail instanceof Map<?, ?> map) {
            return new HashMap<>((Map<String, Object>) map);
        }
        return objectMapper.convertValue(additionalDetail, Map.class);
    }
}
