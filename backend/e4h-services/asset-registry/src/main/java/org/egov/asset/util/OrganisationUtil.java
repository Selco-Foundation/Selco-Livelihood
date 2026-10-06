package org.egov.asset.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.asset.config.Configuration;
import org.egov.asset.repository.ServiceRequestRepository;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads vendor organisations and their users from vendor-registry.
 *
 * <p>Only used to validate a vendor before it is written onto an asset: the
 * organisation must be an active Vendor, and the chosen user must belong to it.
 * asset-registry had no vendor-registry client before this; it is read-only.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrganisationUtil {

    private static final String VENDOR_ORG_TYPE = "VENDOR";
    private static final String ACTIVE_STATUS = "ACTIVE";

    private final Configuration configuration;
    private final ServiceRequestRepository serviceRequestRepository;

    /**
     * Throws unless {@code organisationId} is an active Vendor organisation and
     * {@code vendorUserId} is one of its users.
     *
     * <p>Both checks are needed. An active organisation does not make an arbitrary
     * user uuid one of its vendors, and a valid user does not make a suspended
     * organisation a legitimate target.
     */
    public void validateVendorUser(RequestInfo requestInfo, String tenantId,
                                   String organisationId, String vendorUserId) {
        validateActiveVendorOrganisation(requestInfo, tenantId, organisationId);
        validateUserBelongsToOrganisation(requestInfo, tenantId, organisationId, vendorUserId);
    }

    private void validateActiveVendorOrganisation(RequestInfo requestInfo, String tenantId,
                                                  String organisationId) {
        Map<String, Object> searchCriteria = new HashMap<>();
        searchCriteria.put("tenantId", tenantId);
        searchCriteria.put("id", organisationId);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("limit", 1);
        pagination.put("offset", 0);

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("SearchCriteria", searchCriteria);
        body.put("Pagination", pagination);

        StringBuilder uri = new StringBuilder(configuration.getOrganisationHost())
                .append(configuration.getOrganisationSearchPath());

        Map<?, ?> response = callVendorRegistry(uri, body, organisationId);
        List<Map<String, Object>> organisations = asListOfMaps(response.get("organisations"));

        if (CollectionUtils.isEmpty(organisations)) {
            throw new CustomException(ErrorConstants.VENDOR_ORG_NOT_FOUND_CODE,
                    "No organisation found with id " + organisationId);
        }

        Map<String, Object> organisation = organisations.get(0);
        String orgType = asString(organisation.get("orgType"));
        String orgStatus = asString(organisation.get("orgStatus"));

        if (!VENDOR_ORG_TYPE.equalsIgnoreCase(orgType)) {
            throw new CustomException(ErrorConstants.VENDOR_ORG_NOT_VENDOR_CODE,
                    "Organisation " + organisationId + " is not a Vendor organisation");
        }
        if (!ACTIVE_STATUS.equalsIgnoreCase(orgStatus)) {
            throw new CustomException(ErrorConstants.VENDOR_ORG_NOT_ACTIVE_CODE,
                    "Vendor organisation " + organisationId + " is not active (status " + orgStatus + ")");
        }
    }

    private void validateUserBelongsToOrganisation(RequestInfo requestInfo, String tenantId,
                                                   String organisationId, String vendorUserId) {
        Map<String, Object> orgUser = new HashMap<>();
        orgUser.put("tenantId", tenantId);
        orgUser.put("organizationIds", List.of(organisationId));

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("OrgUser", orgUser);

        StringBuilder uri = new StringBuilder(configuration.getOrganisationHost())
                .append(configuration.getOrganisationUserSearchPath())
                .append("?tenantId=").append(tenantId)
                .append("&limit=1000&offset=0");

        Map<?, ?> response = callVendorRegistry(uri, body, organisationId);

        for (Map<String, Object> entry : asListOfMaps(response.get("OrgUsers"))) {
            if (Boolean.TRUE.equals(entry.get("isDeleted"))) {
                continue;
            }
            // userId on the membership row, uuid on the nested user - ingestion reads
            // the same two, in the same order.
            String userId = asString(entry.get("userId"));
            if (userId == null) {
                Object user = entry.get("user");
                if (user instanceof Map<?, ?> userMap) {
                    userId = asString(userMap.get("uuid"));
                }
            }
            if (vendorUserId.equals(userId)) {
                return;
            }
        }

        throw new CustomException(ErrorConstants.VENDOR_USER_NOT_IN_ORG_CODE,
                "Vendor user " + vendorUserId + " does not belong to organisation " + organisationId);
    }

    private Map<?, ?> callVendorRegistry(StringBuilder uri, Map<String, Object> body, String organisationId) {
        try {
            Map<?, ?> response = serviceRequestRepository.fetchResult(uri, body, Map.class);
            if (response == null) {
                throw new CustomException(ErrorConstants.VENDOR_SERVICE_ERROR_CODE,
                        ErrorConstants.VENDOR_SERVICE_ERROR_MSG);
            }
            return response;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error calling vendor-registry for organisation {}", organisationId, e);
            throw new CustomException(ErrorConstants.VENDOR_SERVICE_ERROR_CODE,
                    ErrorConstants.VENDOR_SERVICE_ERROR_MSG);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> asListOfMaps(Object value) {
        return value instanceof List ? (List<Map<String, Object>>) value : List.of();
    }

    private String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
