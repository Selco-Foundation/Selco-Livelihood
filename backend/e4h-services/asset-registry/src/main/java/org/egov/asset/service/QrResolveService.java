package org.egov.asset.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.util.ErrorConstants;
import org.egov.asset.util.FacilityUtil;
import org.egov.asset.util.HRMSUtil;
import org.egov.asset.util.ResponseInfoFactory;
import org.egov.asset.web.models.Asset;
import org.egov.asset.web.models.QrResolveRequest;
import org.egov.asset.web.models.QrResolveResponse;
import org.egov.asset.web.models.ScannedAssetSummary;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * QR → asset → facility → COMPLAINANT mobile resolve for OTP-based login (Issue #5 Phase 2).
 * Does not send OTP or issue tokens — client uses user-otp + OAuth.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QrResolveService {

    private final AssetService assetService;
    private final FacilityUtil facilityUtil;
    private final HRMSUtil hrmsUtil;
    private final ResponseInfoFactory responseInfoFactory;

    public QrResolveResponse resolve(QrResolveRequest request) {
        String tenantId = trim(request.getTenantId());
        String assetId = resolveAssetId(request);

        if (StringUtils.isBlank(tenantId) || StringUtils.isBlank(assetId)) {
            throw new CustomException(ErrorConstants.INVALID_QR_CODE, ErrorConstants.INVALID_QR_MSG);
        }

        log.info("QR resolve started | tenantId={} assetId={}", tenantId, assetId);

        Asset asset = assetService.getAssetById(tenantId, assetId);
        if (StringUtils.isBlank(asset.getFacilityID())) {
            throw new CustomException(ErrorConstants.QR_FACILITY_NOT_FOUND_CODE, ErrorConstants.QR_FACILITY_NOT_FOUND_MSG);
        }

        Map<String, String> facility = facilityUtil.resolveFacilityDetails(tenantId, asset.getFacilityID());
        if (facility == null || StringUtils.isBlank(facility.get("boundaryCode"))) {
            throw new CustomException(ErrorConstants.QR_FACILITY_NOT_FOUND_CODE, ErrorConstants.QR_FACILITY_NOT_FOUND_MSG);
        }

        String facilityBoundary = facility.get("boundaryCode");
        RequestInfo requestInfo = request.getRequestInfo() != null ? request.getRequestInfo() : RequestInfo.builder().build();

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(requestInfo, tenantId, facilityBoundary);

        String mobile = firstNonBlank(complainant.get("mobile"), facility.get("facilityPocPhone"));
        if (StringUtils.isBlank(mobile)) {
            throw new CustomException(ErrorConstants.MOBILE_NOT_REGISTERED_CODE, ErrorConstants.MOBILE_NOT_REGISTERED_MSG);
        }

        ScannedAssetSummary scannedAsset = ScannedAssetSummary.builder()
                .assetId(asset.getAssetId())
                .facilityID(asset.getFacilityID())
                .itemCode(asset.getItemCode())
                .name(asset.getName())
                .vendorId(asset.getVendorId())
                .boundaryCode(asset.getBoundaryCode())
                .serialNumber(asset.getSerialNumber())
                .build();

        QrResolveResponse response = QrResolveResponse.builder()
                .responseInfo(responseInfoFactory.createResponseInfoFromRequestInfo(requestInfo, true))
                .userName(mobile)
                .mobileNumber(mobile)
                .userUuid(complainant.get("uuid"))
                .facilityId(firstNonBlank(facility.get("facilityId"), asset.getFacilityID()))
                .facilityBoundaryCode(facilityBoundary)
                .scannedAsset(scannedAsset)
                .build();

        log.info("QR resolve succeeded | assetId={} facilityId={} userUuid={}",
                assetId, response.getFacilityId(), response.getUserUuid());
        return response;
    }

    private String resolveAssetId(QrResolveRequest request) {
        if (StringUtils.isNotBlank(request.getAssetId())) {
            return request.getAssetId().trim();
        }
        // Phase-2: qrPayload may be a plain assetId (or URL-decoded token that is the assetId).
        if (StringUtils.isNotBlank(request.getQrPayload())) {
            return request.getQrPayload().trim();
        }
        return null;
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value.trim();
            }
        }
        return null;
    }
}
