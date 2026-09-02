package org.egov.activity.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.activity.service.ServiceRequestRepository;
import org.egov.activity.web.models.OrgUserEnriched;
import org.egov.activity.web.models.OrgUserResponseSearch;
import org.egov.activity.web.models.OrgUserSearchCriteria;
import org.egov.activity.web.models.OrgUserSearchRequest;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Who actually belongs to a vendor organisation, according to vendor-registry.
 *
 * Vendor Assignment will not trust an organisation/vendor pair that arrived in a request: the
 * pairing decides who is dispatched to a site, assignment is one-shot, and a stale dropdown or a
 * hand-built payload would otherwise persist a vendor who does not work for that organisation.
 * So the pair is resolved live, and the vendor's contact details are taken from here rather than
 * from the request.
 *
 * Uses the same endpoint and configuration ActivityService already calls for org users -- this
 * adds no new deployment configuration.
 */
@Component
@Slf4j
public class VendorDirectory {

    /**
     * vendor-registry enriches each org user by forwarding this RequestInfo to egov-hrms, whose
     * EmployeeValidator calls userInfo.getType().equalsIgnoreCase(..) with no null check. A
     * RequestInfo that reaches us without a type therefore fails as an opaque 400
     * NullPointerException raised two services away, so default it rather than pass it on.
     */
    private static final String DEFAULT_USER_TYPE = "EMPLOYEE";

    /** One page is plenty: this is the staff of a handful of organisations, not a directory. */
    private static final int PAGE_LIMIT = 1000;

    private final ServiceRequestRepository serviceRequest;
    private final ActivityConfiguration configuration;
    private final ObjectMapper mapper;

    @Autowired
    public VendorDirectory(ServiceRequestRepository serviceRequest,
                           ActivityConfiguration configuration,
                           @Qualifier("objectMapper") ObjectMapper mapper) {
        this.serviceRequest = serviceRequest;
        this.configuration = configuration;
        this.mapper = mapper;
    }

    /**
     * The live membership of the given organisations, keyed {@code organisationId|userId} so a
     * caller can ask "is this vendor in this organisation?" in one lookup.
     *
     * All organisations are fetched in a single call -- a submission covering several vendor
     * organisations should not cost one round trip each, least of all inside a transaction.
     * Deleted memberships are dropped: an org user who has been removed is not assignable.
     */
    public Map<String, OrgUserEnriched> membersOf(RequestInfo requestInfo, String tenantId,
                                                  Collection<String> organisationIds) {
        Map<String, OrgUserEnriched> members = new LinkedHashMap<>();
        if (CollectionUtils.isEmpty(organisationIds) || !StringUtils.hasText(tenantId)) {
            return members;
        }

        OrgUserSearchRequest searchRequest = OrgUserSearchRequest.builder()
                .requestInfo(withUserType(requestInfo))
                .criteria(OrgUserSearchCriteria.builder()
                        .organizationId(new ArrayList<>(organisationIds))
                        .tenantId(tenantId)
                        .build())
                .build();

        StringBuilder url = new StringBuilder(configuration.getOrgUserHost())
                .append(configuration.getOrgUserSearchUrl())
                .append("?tenantId=").append(tenantId)
                .append("&offset=0&limit=").append(PAGE_LIMIT);

        Map<String, Object> raw = serviceRequest.fetchResult(url, searchRequest,
                new TypeReference<Map<String, Object>>() {
                });
        OrgUserResponseSearch response = mapper.convertValue(raw, OrgUserResponseSearch.class);

        List<OrgUserEnriched> orgUsers = response == null ? null : response.getOrgUsers();
        if (CollectionUtils.isEmpty(orgUsers)) {
            log.info("org-user search returned no members for organisations {} in tenant {}",
                    organisationIds, tenantId);
            return members;
        }

        for (OrgUserEnriched orgUser : orgUsers) {
            if (Boolean.TRUE.equals(orgUser.getIsDeleted())) {
                continue;
            }
            if (!StringUtils.hasText(orgUser.getOrganizationId()) || !StringUtils.hasText(orgUser.getUserId())) {
                continue;
            }
            members.put(key(orgUser.getOrganizationId(), orgUser.getUserId()), orgUser);
        }
        return members;
    }

    /** The lookup key {@link #membersOf} returns its map under. */
    public static String key(String organisationId, String userId) {
        return organisationId + "|" + userId;
    }

    /**
     * Fills in a missing userInfo.type so the downstream HRMS enrichment does not NPE. Mutating
     * the caller's RequestInfo is deliberate: the alternative is copying a contract object field
     * by field, and a request with no user type is malformed however it is handled.
     */
    private RequestInfo withUserType(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null) {
            return requestInfo;
        }
        User user = requestInfo.getUserInfo();
        if (!StringUtils.hasText(user.getType())) {
            log.warn("RequestInfo.userInfo.type was absent; defaulting to {} so the org-user "
                    + "lookup's HRMS enrichment does not fail", DEFAULT_USER_TYPE);
            user.setType(DEFAULT_USER_TYPE);
        }
        return requestInfo;
    }
}
