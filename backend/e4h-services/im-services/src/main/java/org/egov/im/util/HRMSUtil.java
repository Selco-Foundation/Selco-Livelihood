package org.egov.im.util;

import com.jayway.jsonpath.JsonPath;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.im.config.IMConfiguration;
import org.egov.im.repository.ServiceRequestRepository;
import org.egov.im.web.models.RequestInfoWrapper;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.egov.im.util.IMConstants.COMPLAINANT_NOT_FOUND_CODE;
import static org.egov.im.util.IMConstants.COMPLAINANT_NOT_FOUND_MSG;
import static org.egov.im.util.IMConstants.HRMS_DEPARTMENT_JSONPATH;
import static org.egov.im.util.IMConstants.HRMS_EMP_MOBILE_JSONPATH;
import static org.egov.im.util.IMConstants.HRMS_EMP_NAME_JSONPATH;
import static org.egov.im.util.IMConstants.HRMS_EMP_UUID_JSONPATH;
import static org.egov.im.util.IMConstants.ROLE_COMPLAINANT;
import static org.egov.im.util.IMConstants.ROLE_LIVELIHOOD_POC;

@Component
public class HRMSUtil {


    private ServiceRequestRepository serviceRequestRepository;

    private IMConfiguration config;


    @Autowired
    public HRMSUtil(ServiceRequestRepository serviceRequestRepository, IMConfiguration config) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.config = config;
    }

    /**
     * Gets the list of department for the given list of uuids of employees
     *
     * @param uuids
     * @param requestInfo
     * @return
     */
    public List<String> getDepartment(List<String> uuids, RequestInfo requestInfo) {

        StringBuilder url = getHRMSURI(uuids, null, null, null);

        RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();

        Object res = serviceRequestRepository.fetchResult(url, requestInfoWrapper);

        List<String> departments = null;

        try {
            departments = JsonPath.read(res, HRMS_DEPARTMENT_JSONPATH);
        } catch (Exception e) {
            throw new CustomException("PARSING_ERROR", "Failed to parse HRMS response");
        }

        if (CollectionUtils.isEmpty(departments))
            throw new CustomException("DEPARTMENT_NOT_FOUND", "The Department of the user with uuid: " + uuids.toString() + " is not found");

        return departments;

    }

    /**
     * Builds HRMS search URL
     *
     * @param uuids
     * @return
     */

    public StringBuilder getHRMSURI(List<String> uuids, String tenantId, String role, String boundaryCodes) {

        StringBuilder builder = new StringBuilder(config.getHrmsHost());
        builder.append(config.getHrmsEndPoint());
        if (uuids != null) {
            builder.append("?uuids=");
            builder.append(StringUtils.join(uuids, ","));
            builder.append("&tenantId=");
            builder.append(tenantId);

        } else {
            builder.append("?tenantId=");
            builder.append(tenantId);
        }

        if (boundaryCodes != null) {
            builder.append("&boundaryCodes=");
            builder.append(boundaryCodes);
        }
        if (role != null) {
            builder.append("&roles=");
            builder.append(role);
        }
        if ("COMPLAINANT".equals(role) || ROLE_LIVELIHOOD_POC.equals(role)) {
            builder.append("&searchOnlyInBoundary=");
            builder.append(true);
        }
        builder.append("&isActive=");
        builder.append(true);

        return builder;
    }

    /**
     * Resolves the facility manager (COMPLAINANT) HRMS user for a facility-level boundary.
     */
    public Map<String, String> findComplainantAtBoundary(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (StringUtils.isBlank(boundaryCode)) {
            throw new CustomException(COMPLAINANT_NOT_FOUND_CODE, COMPLAINANT_NOT_FOUND_MSG);
        }

        StringBuilder url = getHRMSURI(null, tenantId, ROLE_COMPLAINANT, boundaryCode);
        RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        Object response = serviceRequestRepository.fetchResult(url, requestInfoWrapper);

        try {
            List<String> uuids = JsonPath.read(response, HRMS_EMP_UUID_JSONPATH);
            if (CollectionUtils.isEmpty(uuids) || StringUtils.isBlank(uuids.get(0))) {
                throw new CustomException(COMPLAINANT_NOT_FOUND_CODE, COMPLAINANT_NOT_FOUND_MSG);
            }

            List<String> names = JsonPath.read(response, HRMS_EMP_NAME_JSONPATH);
            List<String> mobiles = JsonPath.read(response, HRMS_EMP_MOBILE_JSONPATH);

            Map<String, String> complainant = new HashMap<>();
            complainant.put("uuid", uuids.get(0));
            complainant.put("name", !CollectionUtils.isEmpty(names) ? names.get(0) : null);
            complainant.put("mobile", !CollectionUtils.isEmpty(mobiles) ? mobiles.get(0) : null);
            complainant.put("tenantId", tenantId);
            return complainant;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            throw new CustomException("HRMS_COMPLAINANT_ERROR", "Failed to resolve facility manager from HRMS");
        }
    }
}
