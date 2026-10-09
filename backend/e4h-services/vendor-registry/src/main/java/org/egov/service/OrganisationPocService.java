package org.egov.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.models.RequestInfoWrapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.config.Configuration;
import org.egov.kafka.OrganizationProducer;
import org.egov.tracer.model.CustomException;
import org.egov.util.HRMSUtils;
import org.egov.util.UserUtil;
import org.egov.web.models.Employee;
import org.egov.web.models.EmployeeRequest;
import org.egov.web.models.Organisation;
import org.egov.web.models.OrgUserRequest;
import org.egov.web.models.Role;
import org.egov.web.models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

import static org.egov.util.OrganisationConstant.EMPLOYEE_ROLE_CODE;
import static org.egov.util.OrganisationConstant.EMPLOYEE_ROLE_NAME;
import static org.egov.util.OrganisationConstant.ORG_ADMIN_ROLE_CODE;
import static org.egov.util.OrganisationConstant.ORG_ADMIN_ROLE_NAME;
import static org.egov.util.OrganisationConstant.ORG_TYPE_PLATFORM;
import static org.egov.util.OrganisationConstant.ORG_TYPE_VENDOR;
import static org.egov.util.OrganisationConstant.VENDOR_ADMIN_ROLE_CODE;
import static org.egov.util.OrganisationConstant.VENDOR_ADMIN_ROLE_NAME;

/**
 * Provisions the Point of Contact of a PLATFORM or VENDOR organisation as an HRMS employee when the
 * organisation is created: PLATFORM POC gets ORG_ADMIN + EMPLOYEE, VENDOR POC gets VENDOR_ADMIN + EMPLOYEE.
 * The POC is also linked to the organisation as an org user (eg_org_user).
 */
@Service
@Slf4j
public class OrganisationPocService {

    private static final String EMPLOYEE_USER_TYPE = "EMPLOYEE";

    private final HRMSUtils hrmsUtils;

    private final UserUtil userUtil;

    private final OrganisationUserEnrichmentService organisationUserEnrichmentService;

    private final OrganizationProducer organizationProducer;

    private final Configuration configuration;

    @Autowired
    public OrganisationPocService(HRMSUtils hrmsUtils, UserUtil userUtil,
                                  OrganisationUserEnrichmentService organisationUserEnrichmentService,
                                  OrganizationProducer organizationProducer, Configuration configuration) {
        this.hrmsUtils = hrmsUtils;
        this.userUtil = userUtil;
        this.organisationUserEnrichmentService = organisationUserEnrichmentService;
        this.organizationProducer = organizationProducer;
        this.configuration = configuration;
    }

    /**
     * A POC user is provisioned only for PLATFORM / VENDOR organisations that actually carry POC
     * details, so creating an organisation without a POC keeps working as before.
     */
    public static boolean shouldCreatePocUser(Organisation organisation) {
        return isPocProvisionedOrgType(organisation.getOrgType()) && hasPocDetails(organisation);
    }

    private static boolean isPocProvisionedOrgType(String orgType) {
        return ORG_TYPE_PLATFORM.equalsIgnoreCase(StringUtils.trimToEmpty(orgType))
                || ORG_TYPE_VENDOR.equalsIgnoreCase(StringUtils.trimToEmpty(orgType));
    }

    private static boolean hasPocDetails(Organisation organisation) {
        return StringUtils.isNotBlank(organisation.getOrgPocUsername())
                || StringUtils.isNotBlank(organisation.getOrgPocName())
                || StringUtils.isNotBlank(organisation.getOrgPocPhone())
                || StringUtils.isNotBlank(organisation.getOrgPocEmail())
                || StringUtils.isNotBlank(organisation.getOrgPocPassword());
    }

    /**
     * @param pocPhone the plain (not yet encrypted) POC mobile number
     */
    public void createPocUser(RequestInfo requestInfo, Organisation organisation, String pocPhone) {
        String username = organisation.getOrgPocUsername().trim();
        log.info("Creating {} organisation POC '{}' in HRMS", organisation.getOrgType(), username);

        // An existing HRMS user is never reused: that would let an org request rewrite someone else's roles and password.
        RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        if (hrmsUtils.getUserByUsername(requestInfoWrapper, username) != null) {
            throw new CustomException("ORG_POC_USERNAME_EXISTS",
                    "A user with username '" + username + "' already exists in HRMS");
        }
        if (hrmsUtils.getUserByPhoneNumber(requestInfoWrapper, pocPhone) != null) {
            throw new CustomException("ORG_POC_PHONE_EXISTS",
                    "A user with the provided PoC phone number already exists in HRMS");
        }

        User user = User.builder()
                .userName(username)
                .name(organisation.getOrgPocName())
                .mobileNumber(pocPhone)
                .emailId(organisation.getOrgPocEmail())
                .active(true)
                .type(EMPLOYEE_USER_TYPE)
                .tenantId(organisation.getTenantId())
                .roles(buildPocRoles(organisation))
                .build();

        Employee employee = hrmsUtils.buildEmployee(user, organisation.getOrgType().trim().toUpperCase());
        EmployeeRequest employeeRequest = EmployeeRequest.builder()
                .requestInfo(requestInfo)
                .employees(List.of(employee))
                .build();
        List<Employee> createdEmployees = hrmsUtils.createHRMSUser(employeeRequest);
        if (createdEmployees == null || createdEmployees.isEmpty() || createdEmployees.get(0).getUser() == null) {
            log.error("HRMS did not return a created employee for POC '{}'", username);
            throw new CustomException("HRMS_CREATION", "Error occurred while creating the organisation PoC user in HRMS");
        }

        Employee createdEmployee = createdEmployees.get(0);
        try {
            User hrmsUser = hrmsUtils.resolveUserForPasswordUpdate(requestInfo, createdEmployee);
            userUtil.updatePasswordWithHrmsUser(requestInfo, hrmsUser, organisation.getOrgPocPassword());
        } catch (Exception e) {
            log.error("HRMS user {} was created for organisation POC '{}' but setting its password failed: {}",
                    createdEmployee.getUser().getUuid(), username, e.getMessage());
            throw new CustomException("ORG_POC_PASSWORD_UPDATE_FAILED",
                    "PoC user '" + username + "' was created in HRMS but its password could not be set");
        }
        log.info("Organisation POC '{}' created in HRMS with uuid {}", username, createdEmployee.getUser().getUuid());

        linkPocToOrganisation(requestInfo, organisation, createdEmployee.getUser());
    }

    /** Same message /organisation/v1/user/_create publishes, so the POC shows up as a regular user of the organisation. */
    private void linkPocToOrganisation(RequestInfo requestInfo, Organisation organisation, User hrmsUser) {
        OrgUserRequest orgUserRequest = OrgUserRequest.builder()
                .requestInfo(requestInfo)
                .organizationId(organisation.getId())
                .userId(hrmsUser.getUuid())
                .user(hrmsUser)
                .build();
        organisationUserEnrichmentService.enrichOrgUserRequestOnCreate(orgUserRequest, requestInfo);
        organizationProducer.push(configuration.getCreateOrgUserTopic(), orgUserRequest);
        log.info("Organisation POC {} linked to organisation {} (org user {})",
                hrmsUser.getUuid(), organisation.getId(), orgUserRequest.getId());
    }

    private List<Role> buildPocRoles(Organisation organisation) {
        String roleTenantId = userUtil.getStateLevelTenant(organisation.getTenantId());
        List<Role> roles = new ArrayList<>();
        if (ORG_TYPE_PLATFORM.equalsIgnoreCase(organisation.getOrgType().trim())) {
            roles.add(Role.builder().code(ORG_ADMIN_ROLE_CODE).name(ORG_ADMIN_ROLE_NAME).tenantId(roleTenantId).build());
        } else {
            roles.add(Role.builder().code(VENDOR_ADMIN_ROLE_CODE).name(VENDOR_ADMIN_ROLE_NAME).tenantId(roleTenantId).build());
        }
        roles.add(Role.builder().code(EMPLOYEE_ROLE_CODE).name(EMPLOYEE_ROLE_NAME).tenantId(roleTenantId).build());
        return roles;
    }
}
