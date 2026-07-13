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
 * QR → facility → COMPLAINANT mobile resolve for OTP-based login.
 * End user is facility-level; assets are linked to the facility.
 * Optional assetId returns scanned asset context for post-login pre-select.
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
        if (StringUtils.isBlank(tenantId)) {
            throw new CustomException(ErrorConstants.INVALID_QR_CODE, ErrorConstants.INVALID_QR_MSG);
        }

        String facilityId = trim(request.getFacilityId());
        String assetId = trim(request.getAssetId());
        ScannedAssetSummary scannedAsset = null;

        // Optional asset path: asset → facility (same end user as facility QR)
        if (StringUtils.isNotBlank(assetId)) {
            Asset asset = assetService.getAssetById(tenantId, assetId);
            if (StringUtils.isBlank(asset.getFacilityID())) {
                throw new CustomException(ErrorConstants.QR_FACILITY_NOT_FOUND_CODE, ErrorConstants.QR_FACILITY_NOT_FOUND_MSG);
            }
            if (StringUtils.isNotBlank(facilityId) && !facilityId.equalsIgnoreCase(asset.getFacilityID().trim())) {
                throw new CustomException(ErrorConstants.INVALID_QR_CODE,
                        "assetId does not belong to the provided facilityId");
            }
            facilityId = asset.getFacilityID().trim();
            scannedAsset = ScannedAssetSummary.builder()
                    .assetId(asset.getAssetId())
                    .facilityID(asset.getFacilityID())
                    .itemCode(asset.getItemCode())
                    .name(asset.getName())
                    .vendorId(asset.getVendorId())
                    .boundaryCode(asset.getBoundaryCode())
                    .serialNumber(asset.getSerialNumber())
                    .build();
        }

        if (StringUtils.isBlank(facilityId) && StringUtils.isNotBlank(request.getQrPayload())) {
            facilityId = request.getQrPayload().trim();
        }

        if (StringUtils.isBlank(facilityId)) {
            throw new CustomException(ErrorConstants.INVALID_QR_CODE, ErrorConstants.INVALID_QR_MSG);
        }

        log.info("QR resolve started | tenantId={} facilityId={} assetId={}", tenantId, facilityId, assetId);

        Map<String, String> facility = facilityUtil.resolveFacilityDetails(tenantId, facilityId);
        if (facility == null || StringUtils.isBlank(facility.get("boundaryCode"))) {
            throw new CustomException(ErrorConstants.QR_FACILITY_NOT_FOUND_CODE, ErrorConstants.QR_FACILITY_NOT_FOUND_MSG);
        }

        String facilityBoundary = facility.get("boundaryCode");
        RequestInfo requestInfo = request.getRequestInfo() != null ? request.getRequestInfo() : RequestInfo.builder().build();

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(requestInfo, tenantId, facilityBoundary);

        // OTP SMS goes to registered mobile; OAuth username is often employee code and may differ.
        String mobileNumber = firstNonBlank(complainant.get("mobile"), facility.get("facilityPocPhone"));
        if (StringUtils.isBlank(mobileNumber)) {
            throw new CustomException(ErrorConstants.MOBILE_NOT_REGISTERED_CODE, ErrorConstants.MOBILE_NOT_REGISTERED_MSG);
        }
        String loginUserName = firstNonBlank(complainant.get("userName"), mobileNumber);

        QrResolveResponse response = QrResolveResponse.builder()
                .responseInfo(responseInfoFactory.createResponseInfoFromRequestInfo(requestInfo, true))
                .userName(loginUserName)
                .mobileNumber(mobileNumber)
                .name(complainant.get("name"))
                .userUuid(complainant.get("uuid"))
                .facilityId(firstNonBlank(facility.get("facilityId"), facilityId))
                .facilityBoundaryCode(facilityBoundary)
                .scannedAsset(scannedAsset)
                .build();

        log.info("QR resolve succeeded | facilityId={} userUuid={} userName={} mobileNumber={}",
                response.getFacilityId(), response.getUserUuid(), loginUserName, mobileNumber);
        return response;
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
