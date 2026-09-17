package org.egov.asset.util;

import com.jayway.jsonpath.JsonPath;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.config.Configuration;
import org.egov.asset.repository.ServiceRequestRepository;
import org.egov.asset.web.models.RequestInfoWrapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves facility manager (COMPLAINANT) from HRMS by facility boundary —
 * same binding used by im-services for Livelihood tickets.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HRMSUtil {

    public static final String ROLE_COMPLAINANT = "COMPLAINANT";
    private static final String HRMS_EMP_UUID_JSONPATH = "$.Employees.*.user.uuid";
    private static final String HRMS_EMP_NAME_JSONPATH = "$.Employees.*.user.name";
    private static final String HRMS_EMP_MOBILE_JSONPATH = "$.Employees.*.user.mobileNumber";
    /** Login id used by OAuth / E4H QR (employee code), may differ from mobile. */
    private static final String HRMS_EMP_CODE_JSONPATH = "$.Employees.*.code";
    private static final String HRMS_EMP_USERNAME_JSONPATH = "$.Employees.*.user.userName";

    private final ServiceRequestRepository serviceRequestRepository;
    private final Configuration configuration;

    /**
     * Finds the active COMPLAINANT at the given facility-level boundary.
     *
     * @return map with keys: uuid, name, mobile, userName, tenantId
     */
    public Map<String, String> findComplainantAtBoundary(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (StringUtils.isBlank(boundaryCode)) {
            throw new CustomException(ErrorConstants.COMPLAINANT_NOT_FOUND_CODE, ErrorConstants.COMPLAINANT_NOT_FOUND_MSG);
        }

        StringBuilder url = new StringBuilder(configuration.getHrmsHost())
                .append(configuration.getHrmsEndPoint())
                .append("?tenantId=").append(tenantId)
                .append("&roles=").append(ROLE_COMPLAINANT)
                .append("&boundaryCodes=").append(boundaryCode.trim())
                .append("&searchOnlyInBoundary=true")
                .append("&isActive=true");

        RequestInfoWrapper wrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        Object response = serviceRequestRepository.fetchResult(url, wrapper, Map.class);

        try {
            List<String> uuids = JsonPath.read(response, HRMS_EMP_UUID_JSONPATH);
            if (CollectionUtils.isEmpty(uuids) || StringUtils.isBlank(uuids.get(0))) {
                throw new CustomException(ErrorConstants.COMPLAINANT_NOT_FOUND_CODE, ErrorConstants.COMPLAINANT_NOT_FOUND_MSG);
            }

            List<String> names = safeRead(response, HRMS_EMP_NAME_JSONPATH);
            List<String> mobiles = safeRead(response, HRMS_EMP_MOBILE_JSONPATH);
            List<String> codes = safeRead(response, HRMS_EMP_CODE_JSONPATH);
            List<String> userNames = safeRead(response, HRMS_EMP_USERNAME_JSONPATH);

            String loginUserName = firstNonBlank(codes);
            if (StringUtils.isBlank(loginUserName)) {
                loginUserName = firstNonBlank(userNames);
            }

            Map<String, String> complainant = new HashMap<>();
            complainant.put("uuid", uuids.get(0));
            complainant.put("name", firstNonBlank(names));
            complainant.put("mobile", firstNonBlank(mobiles));
            complainant.put("userName", loginUserName);
            complainant.put("tenantId", tenantId);
            return complainant;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse HRMS COMPLAINANT response for boundary={}", boundaryCode, e);
            throw new CustomException(ErrorConstants.HRMS_COMPLAINANT_ERROR_CODE, ErrorConstants.HRMS_COMPLAINANT_ERROR_MSG);
        }
    }

    private List<String> safeRead(Object response, String jsonPath) {
        try {
            return JsonPath.read(response, jsonPath);
        } catch (Exception e) {
            return List.of();
        }
    }

    private String firstNonBlank(List<String> values) {
        if (CollectionUtils.isEmpty(values)) {
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
