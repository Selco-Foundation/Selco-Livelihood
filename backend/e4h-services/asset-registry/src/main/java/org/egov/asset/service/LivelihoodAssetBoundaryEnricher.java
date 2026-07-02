package org.egov.asset.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.util.ErrorConstants;
import org.egov.asset.util.FacilityUtil;
import org.egov.asset.web.models.Asset;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodAssetBoundaryEnricher {

    private final FacilityUtil facilityUtil;
    private final AssetBoundaryService assetBoundaryService;
    private final AssetLocalizationService assetLocalizationService;

    public void enrichAndRegister(Asset asset, RequestInfo requestInfo) {
        if (!isLivelihoodTenant(asset.getTenantId())) {
            return;
        }
        if (StringUtils.isBlank(asset.getAssetId())) {
            throw new CustomException(
                    ErrorConstants.ASSET_BOUNDARY_ENRICHMENT_CODE,
                    ErrorConstants.ASSET_BOUNDARY_ENRICHMENT_MSG
            );
        }

        String facilityBoundaryCode = facilityUtil.resolveFacilityBoundaryCode(
                asset.getTenantId(), asset.getFacilityID()
        );
        if (StringUtils.isBlank(facilityBoundaryCode)) {
            throw new CustomException(
                    ErrorConstants.FACILITY_BOUNDARY_NOT_FOUND_CODE,
                    ErrorConstants.FACILITY_BOUNDARY_NOT_FOUND_MSG
            );
        }

        String assetBoundaryCode = facilityUtil.buildAssetBoundaryCode(facilityBoundaryCode, asset.getAssetId());
        assetBoundaryService.createAssetBoundary(
                requestInfo,
                asset.getTenantId(),
                assetBoundaryCode,
                facilityBoundaryCode
        );
        asset.setBoundaryCode(assetBoundaryCode);
        assetLocalizationService.upsertAssetBoundaryLocalizations(asset, requestInfo);
        log.info("Assigned asset boundary {} for assetId={}", assetBoundaryCode, asset.getAssetId());
    }

    private boolean isLivelihoodTenant(String tenantId) {
        return tenantId != null && tenantId.toLowerCase().startsWith("livelihood");
    }
}
