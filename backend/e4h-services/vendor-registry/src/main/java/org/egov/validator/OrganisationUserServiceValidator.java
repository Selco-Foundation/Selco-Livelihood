package org.egov.validator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.models.core.URLParams;
import org.egov.config.Configuration;
import org.egov.repository.OrganisationRepository;
import org.egov.repository.OrganisationUserRepository;
import org.egov.tracer.model.CustomException;
import org.egov.util.FacilityUtil;
import org.egov.util.HRMSUtils;
import org.egov.util.MDMSUtil;
import org.egov.util.OrganisationUtil;
import org.egov.util.UserUtil;
import org.egov.web.models.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

import static org.egov.util.OrganisationConstant.MASTER_ORG_ROLES;
import static org.egov.util.OrganisationConstant.LIVELIHOOD_VENDOR_ROLE_CODE;
import static org.egov.util.OrganisationConstant.MDMS_ORGANIZATION_MODULE_NAME;
import static org.egov.util.OrganisationConstant.ORG_TYPE_VENDOR;
import static org.egov.util.OrganisationConstant.VENDOR_ADMIN_ROLE_CODE;

@Component
@Slf4j
public class OrganisationUserServiceValidator {

    private final MDMSUtil mdmsUtil;

    private final Configuration configuration;

    private final OrganisationRepository organisationRepository;

    private final OrganisationUtil organisationUtil;

    private final HRMSUtils hrmsUtils;
    private final UserUtil userUtil;

    private final OrganisationUserRepository userRepository;

    private final FacilityUtil facilityUtil;

    private final ObjectMapper mapper;
    private static final String MDMS_RES = "$.MdmsRes.";
    private static final String NOT_PRESENT_IN_MDMS = " is not present in MDMS";
    private static final String VALID_FROM_PARAMETER_SHOULD_BE_LESS_THAN_VALID_TO = "Valid From in search parameters should be less than Valid To";
    private static final String INVALID_ORG_SEARCH_DATE ="INVALID_ORG_SEARCH_DATE";
    /** Default country jurisdiction when none are supplied; must match {@link HRMSUtils#buildJurisdictions(List)}. */
    private static final String DEFAULT_HRMS_JURISDICTION_BOUNDARY = "India";

    private static final String EMPLOYEE_ROLE_CODE = "EMPLOYEE";
    private static final String EMPLOYEE_ROLE_NAME = "Employee";
    @Autowired
    public OrganisationUserServiceValidator(MDMSUtil mdmsUtil, Configuration configuration, OrganisationRepository organisationRepository,
                                            OrganisationUtil organisationUtil, HRMSUtils hrmsUtils, UserUtil userUtil,
                                            OrganisationUserRepository userRepository, FacilityUtil facilityUtil, ObjectMapper mapper) {
        this.mdmsUtil = mdmsUtil;
        this.configuration = configuration;
        this.organisationRepository = organisationRepository;
        this.organisationUtil = organisationUtil;
        this.hrmsUtils = hrmsUtils;
        this.userUtil = userUtil;
        this.userRepository = userRepository;
        this.facilityUtil = facilityUtil;
        this.mapper = mapper;

    }

    public void validateCreateOrgUserRequest(OrgUserRequest request) {
        RequestInfo requestInfo = request.getRequestInfo();

        //Verify if RequestInfo and UserInfo is present
        validateRequestInfo(requestInfo);
        //Verify if org users request and mandatory fields are present
        validateUserOrgCreation(request);
    }

    private void validateRequestInfo(RequestInfo requestInfo) {
        log.trace("OrganisationUserServiceValidator::validateRequestInfo entry");
        if (requestInfo == null) {
            log.error("Request info is mandatory");
            throw new CustomException("REQUEST_INFO", "Request info is mandatory");
        }
        if (requestInfo.getUserInfo() == null) {
            log.error("UserInfo is mandatory in RequestInfo");
            throw new CustomException("USERINFO", "UserInfo is mandatory");
        }
        if (requestInfo.getUserInfo() != null && StringUtils.isBlank(requestInfo.getUserInfo().getUuid())) {
            log.error("UUID is mandatory in UserInfo");
            throw new CustomException("USERINFO_UUID", "UUID is mandatory");
        }
        log.debug("Request info validation completed");
    }

    private void validateUserOrgCreation(OrgUserRequest request) {
        Map<String, String> errorMap = new HashMap<>();
        User orgUser = request.getUser();
        List<Jurisdiction> facilitySyncJurisdictions = copyJurisdictions(orgUser != null ? orgUser.getJurisdictions() : null);
        String facilitySyncVendorName = orgUser != null ? orgUser.getName() : null;
        String facilitySyncVendorUserName = orgUser != null ? orgUser.getUserName() : null;
        if (orgUser == null) {
            log.error("User is mandatory in creation");
            throw new CustomException("Org User", "User is mandatory");
        }

        if (request.getOrganizationId() == null || request.getOrganizationId().isBlank()) {
            log.error("Organization is mandatory in org user request body");
            errorMap.put("ORGANIZATION", "Organization ID is mandatory");
        }

        // Check if organisationId already exist
        OrgSearchCriteria searchCriteria = OrgSearchCriteria.builder().ids(List.of(request.getOrganizationId())).tenantId(orgUser.getTenantId()).build();
        OrgSearchRequest orgSearchRequest = OrgSearchRequest.builder().requestInfo(request.getRequestInfo()).searchCriteria(searchCriteria).build();
        List<Organisation> organisations = organisationRepository.getOrganisations(orgSearchRequest);
        if(organisations == null || organisations.isEmpty()){
            log.error("Organization is mandatory in org user request body");
            throw new CustomException("Organization", "Organization ID do not exist");
        }
        // Validate user object fields
        validateUserRequest(orgUser);

        // Get existing user with mobile number from hrms service
        List<Employee> employee = hrmsUtils.getUserByPhoneNumber(request, orgUser.getMobileNumber());
        boolean matchedByPhone = employee != null && !employee.isEmpty();
        if (!matchedByPhone) {
            // A deleted user is only deactivated in HRMS, so its username stays taken even when it comes back with another phone
            employee = hrmsUtils.getUserByUsername(request, orgUser.getUserName());
        }
        if (employee != null && !employee.isEmpty()) {
            Employee existingEmployee = employee.get(0);
            if (!isDeactivated(existingEmployee)) {
                log.error("An active HRMS user already exists for this {}", matchedByPhone ? "phone number" : "username");
                throw new CustomException("USER_ALREADY_EXISTS", matchedByPhone
                        ? "A user with this phone number already exists"
                        : "A user with username '" + orgUser.getUserName() + "' already exists");
            }
            recreateDeactivatedOrgUser(request, orgUser, existingEmployee, organisations.get(0));
        } else { //If user doesn't exist
            // Only a newly created HRMS user gets the password from the request; an existing user's password is never touched
            String password = orgUser.getPassword();
            if (StringUtils.isBlank(password)) {
                log.error("Password is mandatory to create a new organisation user");
                throw new CustomException("OrgUserCreation", "Password is mandatory");
            }
            // Keep the plain password out of the request object that is later pushed to Kafka
            orgUser.setPassword(null);
            Organisation organisation = organisations.get(0);
            String orgType = organisation.getOrgType();
            Map<String, List<Role>> rolesMap =  getOrgRoles(request.getRequestInfo(), orgUser.getTenantId());
            if (rolesMap !=null && !rolesMap.isEmpty() && orgType !=null && !orgType.isBlank()){
                List<Role> roles = rolesMap.get(orgType);
                List<String> roleCodesMDMS = roles.stream().map(Role::getCode).filter(Objects::nonNull).toList();
                List<String> requestRoleCodes = orgUser.getRoles().stream().map(Role::getCode).filter(Objects::nonNull).toList();
                Set<String> orgRolesReqSet = new HashSet<>();
                orgRolesReqSet.addAll(requestRoleCodes);
                // Check if Roles from request are valid
                validateOrgRoles(orgRolesReqSet, roleCodesMDMS);
                //Encrypt poc mobile number
                String mobileNumber = orgUser.getMobileNumber();
                String encryptedPocMobileNumber = organisationUtil.encryptMobileNumber(orgUser.getMobileNumber());
                if(encryptedPocMobileNumber!=null && !encryptedPocMobileNumber.isBlank()){
                    orgUser.setMobileNumber(encryptedPocMobileNumber);
                }

                // Call HRMS service to create user
                User user = User.builder()
                        .userName(orgUser.getUserName())
                        .name(orgUser.getName())
                        .gender(orgUser.getGender())
                        .mobileNumber(mobileNumber)
                        .emailId(orgUser.getEmailId())
                        .active(orgUser.getActive())
                        .dob(orgUser.getDob())
                        .locale(orgUser.getLocale())
                        .type(orgUser.getType())
                        .tenantId(orgUser.getTenantId())
                        .roles(orgUser.getRoles())
                        .jurisdictions(orgUser.getJurisdictions())
                        .build();

                ensureDefaultEmployeeRoleForOrgUser(user);

                Employee employee1 = hrmsUtils.buildEmployee(user, orgType);
                EmployeeRequest employeeRequest = EmployeeRequest.builder().requestInfo(request.getRequestInfo()).employees(List.of(employee1)).build();
                List<Employee> employees = hrmsUtils.createHRMSUser(employeeRequest);
                if (employees != null && !employees.isEmpty()) {
                    // User created successfully, get uuid and user infos
                    Employee employeeResp = employees.get(0);
                    request.setUser(employeeResp.getUser());
                    request.setUserId(employeeResp.getUser().getUuid());
                    String hrmsUserUuid = employeeResp.getUser().getUuid();
                    try {
                        User hrmsUser = hrmsUtils.resolveUserForPasswordUpdate(request.getRequestInfo(), employeeResp);
                        userUtil.updatePasswordWithHrmsUser(request.getRequestInfo(), hrmsUser, password);
                        log.info("New user created and password set for uuid {}", hrmsUserUuid);
                    } catch (Exception passwordUpdateEx) {
                        // The admin chose this password, so a silent failure would leave a user nobody can log in as
                        log.error("HRMS user {} created but setting its password failed: {}",
                                hrmsUserUuid, passwordUpdateEx.getMessage());
                        throw new CustomException("ORG_USER_PASSWORD_UPDATE_FAILED",
                                "User was created in HRMS but its password could not be set: " + passwordUpdateEx.getMessage());
                    }
                }
                else{
                    log.error("Error occured while creating the new user");
                    throw new CustomException("HRMS_CREATION", "Error occured while creating the new user");
                }
            }

        }

        facilityUtil.syncMappedVendorToFacilities(request, facilitySyncJurisdictions, facilitySyncVendorName, facilitySyncVendorUserName);

        if (!errorMap.isEmpty())
            throw new CustomException(errorMap);
    }

    /**
     * Re-creating a user that matches a deactivated HRMS employee by phone or username (it was deleted from its
     * organisation): reactivate that employee with the submitted details instead of creating a new one, and bring
     * its soft-deleted eg_org_user link back (or let the service create a fresh link when there is none).
     */
    private void recreateDeactivatedOrgUser(OrgUserRequest request, User orgUser, Employee existingEmployee, Organisation organisation) {
        String username = orgUser.getUserName();

        String password = orgUser.getPassword();
        if (StringUtils.isBlank(password)) {
            log.error("Password is mandatory to re-create organisation user {}", username);
            throw new CustomException("OrgUserCreation", "Password is mandatory");
        }
        orgUser.setPassword(null);

        String hrmsUserUuid = existingEmployee.getUser().getUuid();
        OrgUserSearchRequest linksSearch = OrgUserSearchRequest.builder()
                .requestInfo(request.getRequestInfo())
                .criteria(OrgUserSearchCriteria.builder().userId(List.of(hrmsUserUuid)).tenantId(orgUser.getTenantId()).build())
                .build();
        List<OrgUser> activeLinks = userRepository.getOrgUsers(linksSearch, URLParams.builder().limit(100).offset(0).build());
        if (activeLinks != null && activeLinks.stream().anyMatch(l -> !request.getOrganizationId().equals(l.getOrganizationId()))) {
            log.error("User {} is still linked to another organisation", username);
            throw new CustomException("Organization", "This user already belong to another org");
        }

        String orgType = organisation.getOrgType();
        Map<String, List<Role>> rolesMap = getOrgRoles(request.getRequestInfo(), orgUser.getTenantId());
        if (rolesMap != null && !rolesMap.isEmpty() && orgType != null && !orgType.isBlank()) {
            List<Role> roles = rolesMap.get(orgType);
            if (roles != null) {
                List<String> roleCodesMDMS = roles.stream().map(Role::getCode).filter(Objects::nonNull).toList();
                Set<String> requestRoleCodes = orgUser.getRoles().stream().map(Role::getCode).filter(Objects::nonNull).collect(Collectors.toSet());
                validateOrgRoles(requestRoleCodes, roleCodesMDMS);
            }
        }
        ensureDefaultEmployeeRoleForOrgUser(orgUser);

        existingEmployee.getUser().setName(orgUser.getName());
        existingEmployee.getUser().setEmailId(orgUser.getEmailId());
        existingEmployee.getUser().setMobileNumber(orgUser.getMobileNumber());
        existingEmployee.getUser().setRoles(orgUser.getRoles());
        existingEmployee.getUser().setActive(true);
        existingEmployee.setIsActive(true);
        existingEmployee.setEmployeeStatus("ACTIVE");
        existingEmployee.setReActivateEmployee(true);
        existingEmployee.setJurisdictions(
                mergeJurisdictionsForRecreateUser(existingEmployee.getJurisdictions(), orgUser.getJurisdictions()));

        List<Employee> updatedEmployees = hrmsUtils.updateHRMSUser(EmployeeRequest.builder()
                .requestInfo(request.getRequestInfo())
                .employees(List.of(existingEmployee))
                .build());
        if (updatedEmployees == null || updatedEmployees.isEmpty()) {
            throw new CustomException("HRMS_UPDATE", "Error occurred while reactivating the existing user");
        }
        Employee reactivated = updatedEmployees.get(0);

        try {
            User hrmsUser = hrmsUtils.resolveUserForPasswordUpdate(request.getRequestInfo(), reactivated);
            userUtil.updatePasswordWithHrmsUser(request.getRequestInfo(), hrmsUser, password);
        } catch (Exception passwordUpdateEx) {
            log.error("HRMS user {} was reactivated but setting its password failed: {}", hrmsUserUuid, passwordUpdateEx.getMessage());
            throw new CustomException("ORG_USER_PASSWORD_UPDATE_FAILED",
                    "User was reactivated in HRMS but its password could not be set: " + passwordUpdateEx.getMessage());
        }

        request.setUser(reactivated.getUser());
        request.setUserId(reactivated.getUser().getUuid());
        Optional<String> softDeletedLinkId = userRepository.ensureActiveOrgUserLinkOrReactivateDeleted(hrmsUserUuid, request.getOrganizationId());
        if (softDeletedLinkId.isPresent()) {
            request.setId(softDeletedLinkId.get());
            request.setIsDeleted(false);
        }
        log.info("Deactivated HRMS user {} reactivated for organisation {}", hrmsUserUuid, request.getOrganizationId());
    }

    private static boolean isDeactivated(Employee employee) {
        return Boolean.FALSE.equals(employee.getIsActive())
                || (employee.getUser() != null && Boolean.FALSE.equals(employee.getUser().getActive()));
    }

    private void validateUserRequest(User user) {
        if (StringUtils.isBlank(user.getTenantId())) {
            log.error("Tenant ID is mandatory in user request body");
            throw new CustomException("Organization", "Tenant ID is mandatory in user request body");
        }

        if (user.getName() == null) {
            log.error("Name is mandatory in User object");
            throw new CustomException("OrgUserCreation", "Name is mandatory in User object");
        }

        if (user.getMobileNumber() == null) {
            log.error("Mobile Number is mandatory in FieldPlans");
            throw new CustomException("OrgUserCreation", "Mobile Number is mandatory");
        }

        if (user.getEmailId() == null) {
            log.error("Email is mandatory in FieldPlans");
            throw new CustomException("OrgUserCreation", "Email is mandatory in User object");
        }

        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            log.error("Roles are mandatory in User object");
            throw new CustomException("OrgUserCreation", "Roles are mandatory in User object");
        }
    }

    public void validateUpdateOrgUserRequest(OrgUserRequest request) {
        RequestInfo requestInfo = request.getRequestInfo();
        //Verify if RequestInfo and UserInfo is present
        validateRequestInfo(requestInfo);
        //Verify if org users request and mandatory fields are present
        validateUserOrgUpdate(request);
    }

    private void validateUserOrgUpdate(OrgUserRequest request) {

        Map<String, String> errorMap = new HashMap<>();
        List<Organisation> organisations = new ArrayList<>();
        User orgUser = request.getUser();
        // Use jurisdictions from the UI request, not HRMS response (HRMS may omit or return stale list).
        List<Jurisdiction> facilitySyncJurisdictions = copyJurisdictions(orgUser != null ? orgUser.getJurisdictions() : null);
        String facilitySyncVendorName = orgUser != null ? orgUser.getName() : null;
        String facilitySyncVendorUserName = orgUser != null ? orgUser.getUserName() : null;
        if (orgUser == null) {
            log.error("User is mandatory in update");
            throw new CustomException("Org User", "User is mandatory");
        }

        if (request.getId() == null || request.getId().isBlank()) {
            log.error("Org User Id is mandatory in org user request body");
            throw new CustomException("UserOrg", "Org User Id is mandatory in org user request body");
        }

        if (request.getOrganizationId() == null || request.getOrganizationId().isBlank()) {
            log.error("Organization is mandatory in org user request body");
            throw new CustomException("ORGANIZATION", "Organization ID is mandatory");
        }

        // Check if user org id already exist in DB
        OrgUserSearchCriteria searchUserCriteria = OrgUserSearchCriteria.builder().id(List.of(request.getId())).tenantId(configuration.getGlobalTenantId()).build();
        OrgUserSearchRequest orgUserSearchRequest = OrgUserSearchRequest.builder().requestInfo(request.getRequestInfo()).criteria(searchUserCriteria).build();
        URLParams urlParams = URLParams.builder().limit(1).offset(0).build();
        List<OrgUser> users = userRepository.getOrgUsers(orgUserSearchRequest, urlParams);
        if(users == null || users.isEmpty()){
            log.error("This org user id do not exist");
            throw new CustomException("Organization", "This org user id do not exist");
        }

        OrgUser existingOrgUser = users.get(0);
        if (existingOrgUser ==null)
            throw new CustomException("Organization", "This org user id do not exist");

        // If new organizationId is used for update
        if(!Objects.equals(existingOrgUser.getOrganizationId(), request.getOrganizationId())){
            // Check if new organisationId already exist
            OrgSearchCriteria searchCriteria = OrgSearchCriteria.builder().ids(List.of(request.getOrganizationId())).tenantId(orgUser.getTenantId()).build();
            OrgSearchRequest orgSearchRequest = OrgSearchRequest.builder().requestInfo(request.getRequestInfo()).searchCriteria(searchCriteria).build();
            organisations = organisationRepository.getOrganisations(orgSearchRequest);
            if(organisations == null || organisations.isEmpty()){
                log.error("Organization is mandatory in org user request body");
                throw new CustomException("Organization", "Organization ID do not exist");
            }
        }

        // Checked before the password or HRMS update so a rejected request changes nothing
        validateVendorOrgKeepsRequiredUsers(request, existingOrgUser);

        // Get existing user with mobile number from hrms service
        List<Employee> employees = hrmsUtils.getUserByUsername(request, orgUser.getUserName());
        if (employees == null || employees.isEmpty()) {
            //If user doesn't exist
            log.error("This user with this username do not exist: {}", orgUser.getUserName());
            throw new CustomException("Organization", "This user with this username do not exist: "+orgUser.getUserName());
        }

        // Get employee details fetched from HRMS
        Employee employee = employees.get(0);

        // Optional: a non-blank password replaces the current one, omitting it leaves it untouched.
        // Done before the HRMS update so a rejected password (e.g. policy violation) changes nothing else.
        String newPassword = orgUser.getPassword();
        orgUser.setPassword(null);
        if (StringUtils.isNotBlank(newPassword)) {
            try {
                userUtil.updatePasswordWithHrmsUser(request.getRequestInfo(), employee.getUser(), newPassword);
                log.info("Password updated for organisation user {}", employee.getUser().getUuid());
            } catch (Exception passwordUpdateEx) {
                log.error("Password update failed for organisation user {}: {}",
                        employee.getUser().getUuid(), passwordUpdateEx.getMessage());
                throw new CustomException("ORG_USER_PASSWORD_UPDATE_FAILED",
                        "The user's password could not be updated: " + passwordUpdateEx.getMessage());
            }
        }

        // -----------------------------------------
        // Detect Changes
        // -----------------------------------------
        UserChangeSet changes = detectUserChanges(existingOrgUser.getUser(), orgUser);

        // -----------------------------------------
        // HRMS Update
        // -----------------------------------------
        if (changes.shouldUpdateHRMS()) {
            // Mobile special handling
            if (changes.isMobileChanged()) {
                log.error("phone number is being updated. Old phoneNumber {} with new phoneNumber {}", existingOrgUser.getUser().getMobileNumber(), orgUser.getMobileNumber());
                employee.getUser().setMobileNumber(orgUser.getMobileNumber());
            }

            if(changes.isUsernameChanged()){
                // Get existing user with username from hrms service
                List<Employee> response = hrmsUtils.getUserByUsername(request, orgUser.getUserName());
                if (response != null && !response.isEmpty()) {
                    //If user exist
                    log.error("This user with this username already exist: {}", orgUser.getUserName());
                    throw new CustomException("Organization", "This user with this username already exist: "+orgUser.getUserName());
                }
                employee.getUser().setUserName(orgUser.getUserName());
                facilityUtil.syncMappedVendorToFacilities(request, facilitySyncJurisdictions, facilitySyncVendorName, facilitySyncVendorUserName);
            }

            if (changes.isNameChanged()) {
                employee.getUser().setName(orgUser.getName());
                facilityUtil.syncMappedVendorToFacilities(request, facilitySyncJurisdictions, facilitySyncVendorName, facilitySyncVendorUserName);
            }

            if (changes.isEmailChanged()) {
                employee.getUser().setEmailId(orgUser.getEmailId());
            }

            if (changes.isRolesChanged()) {
                // Roles are updated
                OrgSearchCriteria searchCriteria = OrgSearchCriteria.builder().ids(List.of(request.getOrganizationId())).tenantId(orgUser.getTenantId()).build();
                OrgSearchRequest orgSearchRequest = OrgSearchRequest.builder().requestInfo(request.getRequestInfo()).searchCriteria(searchCriteria).build();
                organisations = organisationRepository.getOrganisations(orgSearchRequest);
                if(organisations == null || organisations.isEmpty()){
                    log.error("Organization ID do not exist");
                    throw new CustomException("Organization", "Organization ID do not exist");
                }
                Organisation organisation = organisations.get(0);
                String orgType = organisation.getOrgType();
                Map<String, List<Role>> rolesMap =  getOrgRoles(request.getRequestInfo(), orgUser.getTenantId());
                if (rolesMap !=null && !rolesMap.isEmpty() && orgType !=null && !orgType.isBlank()){
                    List<Role> roles = rolesMap.get(orgType);
                    List<String> roleCodesMDMS = roles.stream().map(Role::getCode).filter(Objects::nonNull).toList();
                    List<String> requestRoleCodes = orgUser.getRoles().stream().map(Role::getCode).filter(Objects::nonNull).toList();
                    Set<String> orgRolesReqSet = new HashSet<>();
                    orgRolesReqSet.addAll(requestRoleCodes);
                    // Check if Roles from request are valid
                    validateOrgRoles(orgRolesReqSet, roleCodesMDMS);
                }
                ensureDefaultEmployeeRoleForOrgUser(orgUser);
                employee.getUser().setRoles(orgUser.getRoles());
            }

            if (changes.isJurisdictionChanged()) {
                employee.setJurisdictions(
                        hrmsUtils.buildJurisdictions(orgUser.getJurisdictions())
                );
                facilityUtil.clearMappedVendorForRemovedFacilityJurisdictions(
                        request,
                        existingOrgUser.getUser().getJurisdictions(),
                        facilitySyncJurisdictions
                );
                facilityUtil.syncMappedVendorToFacilities(request, facilitySyncJurisdictions, facilitySyncVendorName, facilitySyncVendorUserName);
            }

            EmployeeRequest employeeRequest = EmployeeRequest.builder()
                    .requestInfo(request.getRequestInfo())
                    .employees(List.of(employee))
                    .build();

            List<Employee> updatedEmployees = hrmsUtils.updateHRMSUser(employeeRequest);

            if (updatedEmployees == null || updatedEmployees.isEmpty()) {
                throw new CustomException("HRMS_UPDATE", "Error occurred while updating the user");
            }

            Employee employeeResp = updatedEmployees.get(0);
            request.setUser(employeeResp.getUser());
            request.getUser().setJurisdictions(employeeResp.getJurisdictions());
            request.setUserId(employeeResp.getUser().getUuid());
        } else {
            log.info("No HRMS update required — no user changes detected");
            request.setUserId(existingOrgUser.getUserId());
            request.setUser(employee.getUser());
            request.getUser().setJurisdictions(employee.getJurisdictions());
        }

//        facilityUtil.syncMappedVendorToFacilities(request, facilitySyncJurisdictions, facilitySyncVendorName, facilitySyncVendorUserName);

        if (!errorMap.isEmpty()) {
            log.error("Validation failed with {} errors", errorMap.size());
            throw new CustomException(errorMap);
        }
        log.debug("Organisation user request validation completed");
    }

    private List<Jurisdiction> copyJurisdictions(List<Jurisdiction> jurisdictions) {
        if (jurisdictions == null || jurisdictions.isEmpty()) {
            return List.of();
        }
        return new ArrayList<>(jurisdictions);
    }

    /* Validates search FieldPlan request body and parameters*/
    public void validateSearchOrgUsersRequest(OrgUserSearchRequest request, Integer limit, Integer offset, String tenantId) {
        log.trace("OrganisationUserServiceValidator::validateSearchOrgUsersRequest entry");
        Map<String, String> errorMap = new HashMap<>();
        RequestInfo requestInfo = request.getRequestInfo();
        log.info("Starting validation for organisation user search, tenant: {}", tenantId);

        //Verify if RequestInfo and UserInfo is present
        validateRequestInfo(requestInfo);
        log.debug("Request info validation completed");

        //Verify if search fieldplan request is valid
        validateSearchOrgUsersCriteria(request.getCriteria(), tenantId);
        log.debug("Search criteria validation completed");
        //Verify MDMS Data
        // TODO: Uncomment and fix as per HCM once we get clarity
        // validateRequestMDMSData(project, tenantId, errorMap);

        if (!errorMap.isEmpty()) {
            log.error("Search validation failed with {} errors", errorMap.size());
            throw new CustomException(errorMap);
        }
        log.info("Organisation user search validation completed successfully");
    }

    private void validateSearchOrgUsersCriteria(OrgUserSearchCriteria criteria, String tenantId) {
        if (criteria == null) {
            log.error("criteria is mandatory in Org search");
            throw new CustomException("OrgSearch", "criteria is mandatory");
        }
        if (StringUtils.isBlank(criteria.getTenantId())) {
            log.error("Tenant ID is mandatory in search criteria");
            throw new CustomException("TENANT_ID", "Tenant ID is mandatory");
        }
        if ((criteria.getId()==null || criteria.getId().isEmpty()) && (criteria.getUserId()==null || criteria.getUserId().isEmpty())
                && (criteria.getOrganizationId()==null || criteria.getOrganizationId().isEmpty()))
        {
            log.error("Any one org user search field is required for users Search");
            throw new CustomException("USER_SEARCH_FIELDS", "Any one user search field is required");
        }

        if (!criteria.getTenantId().equals(tenantId)) {
            log.warn("Tenant ID mismatch: URL param {} does not match request body {}", tenantId, criteria.getTenantId());
            throw new CustomException("MULTIPLE_TENANTS", "Tenant Id must be same in URL param and project request");
        }
        log.debug("Search criteria validation completed");
    }

    public void validateDeleteOrgUserRequest(DeleteOrgUserRequest request) {
        RequestInfo requestInfo = request.getRequestInfo();

        //Verify if RequestInfo and UserInfo is present
        validateRequestInfo(requestInfo);
        //Verify if org users request and mandatory fields are present
        validateDeleteUserOrgRequest(request);
    }

    private void validateDeleteUserOrgRequest(DeleteOrgUserRequest request) {
        String orgUserId = request.getId();
        if (orgUserId == null || orgUserId.isBlank()) {
            log.error("OrgUserId is mandatory in delete");
            throw new CustomException("Org User", "User is mandatory in delete");
        }

        OrgUserSearchCriteria searchUserCriteria = OrgUserSearchCriteria.builder().id(List.of(request.getId())).tenantId(configuration.getGlobalTenantId()).build();
        OrgUserSearchRequest orgUserSearchRequest = OrgUserSearchRequest.builder().requestInfo(request.getRequestInfo()).criteria(searchUserCriteria).build();
        URLParams urlParams = URLParams.builder().limit(1).offset(0).build();
        List<OrgUser> users = userRepository.getOrgUsers(orgUserSearchRequest, urlParams);
        if(users == null || users.isEmpty()){
            log.error("This org user id do not exist");
            throw new CustomException("Organization", "This org user id do not exist");
        }

        // Ensure userId is populated on the delete request so that activity assignment lookup works
        OrgUser existingOrgUser = users.get(0);
        if (existingOrgUser != null && existingOrgUser.getUserId() != null) {
            request.setUserId(existingOrgUser.getUserId());
        }

        validateVendorOrgKeepsRequiredUsers(request, existingOrgUser);

        //Check if user has any activity assignments
        List<ActivityAssignment> activityAssignmentList = organisationUtil.getFieldPlanActivityAssignment(request);
        //user has active assignments exist
        if(activityAssignmentList != null && !activityAssignmentList.isEmpty()){
            try {
                OrgUserDeleteErrorResponse errorResponse = OrgUserDeleteErrorResponse.builder()
                        .message("User cannot be deleted because they have active or pending assignments.")
                        .blockingAssignments(activityAssignmentList)
                        .build();
                throw new ResponseStatusException(HttpStatus.CONFLICT, mapper.writeValueAsString((errorResponse))); // Ici on renvoie l'objet comme message JSON
            } catch (Exception e) {
                throw new CustomException("Organization", "User cannot be deleted because they have active or pending assignments.");
            }
        }
    }

    /** Deleting the user takes every role it holds away from its organisation. */
    private void validateVendorOrgKeepsRequiredUsers(DeleteOrgUserRequest request, OrgUser orgUserToDelete) {
        if (orgUserToDelete == null || orgUserToDelete.getUser() == null) {
            return;
        }
        validateVendorOrgKeepsRequiredUsers(request.getRequestInfo(), orgUserToDelete,
                upperCaseRoleCodes(orgUserToDelete.getUser().getRoles()));
    }

    /**
     * On update, the existing organisation loses the user's roles that are no longer requested, or all of them
     * when the user is moved to another organisation.
     */
    private void validateVendorOrgKeepsRequiredUsers(OrgUserRequest request, OrgUser existingOrgUser) {
        if (existingOrgUser.getUser() == null) {
            return;
        }
        Set<String> removedRoles = upperCaseRoleCodes(existingOrgUser.getUser().getRoles());
        if (Objects.equals(existingOrgUser.getOrganizationId(), request.getOrganizationId())) {
            removedRoles.removeAll(upperCaseRoleCodes(request.getUser().getRoles()));
        }
        validateVendorOrgKeepsRequiredUsers(request.getRequestInfo(), existingOrgUser, removedRoles);
    }

    /**
     * A VENDOR organisation must always keep at least one active VENDOR POC (VENDOR_ADMIN) and one active
     * vendor user (LIVELIHOOD_VENDOR), so the last active holder of either role cannot lose it.
     */
    private void validateVendorOrgKeepsRequiredUsers(RequestInfo requestInfo, OrgUser orgUser, Set<String> removedRoles) {
        if (StringUtils.isBlank(orgUser.getOrganizationId())) {
            return;
        }
        boolean losesVendorPoc = removedRoles.contains(VENDOR_ADMIN_ROLE_CODE);
        boolean losesVendorUser = removedRoles.contains(LIVELIHOOD_VENDOR_ROLE_CODE);
        if (!losesVendorPoc && !losesVendorUser) {
            return;
        }

        OrgSearchCriteria orgCriteria = OrgSearchCriteria.builder()
                .ids(List.of(orgUser.getOrganizationId()))
                .tenantId(StringUtils.defaultIfBlank(orgUser.getTenantId(), configuration.getGlobalTenantId()))
                .build();
        List<Organisation> organisations = organisationRepository.getOrganisations(
                OrgSearchRequest.builder().requestInfo(requestInfo).searchCriteria(orgCriteria).build());
        if (organisations == null || organisations.isEmpty()
                || !ORG_TYPE_VENDOR.equalsIgnoreCase(StringUtils.trimToEmpty(organisations.get(0).getOrgType()))) {
            return;
        }

        if (losesVendorPoc && !hasOtherActiveOrgUserWithRole(requestInfo, orgUser, VENDOR_ADMIN_ROLE_CODE)) {
            log.error("Org user {} is the last active VENDOR POC of organisation {}", orgUser.getId(), orgUser.getOrganizationId());
            throw new CustomException("LAST_VENDOR_POC", "At least one VENDOR POC is needed for an organization");
        }
        if (losesVendorUser && !hasOtherActiveOrgUserWithRole(requestInfo, orgUser, LIVELIHOOD_VENDOR_ROLE_CODE)) {
            log.error("Org user {} is the last active vendor user of organisation {}", orgUser.getId(), orgUser.getOrganizationId());
            throw new CustomException("LAST_VENDOR_USER", "At least one VENDOR user is needed for an organization");
        }
    }

    /** Active means the eg_org_user link is not deleted and the HRMS user is not deactivated. */
    private boolean hasOtherActiveOrgUserWithRole(RequestInfo requestInfo, OrgUser orgUser, String roleCode) {
        OrgUserSearchCriteria criteria = OrgUserSearchCriteria.builder()
                .organizationId(List.of(orgUser.getOrganizationId()))
                .tenantId(orgUser.getTenantId())
                .roles(List.of(roleCode))
                .build();
        OrgUserSearchRequest searchRequest = OrgUserSearchRequest.builder().requestInfo(requestInfo).criteria(criteria).build();
        List<OrgUser> holders = userRepository.getOrgUsers(searchRequest,
                URLParams.builder().limit(configuration.getMaxLimit()).offset(0).build());
        return holders != null && holders.stream()
                .filter(holder -> !Objects.equals(holder.getId(), orgUser.getId()))
                .filter(holder -> !Objects.equals(holder.getUserId(), orgUser.getUserId()))
                .anyMatch(holder -> holder.getUser() != null && !Boolean.FALSE.equals(holder.getUser().getActive()));
    }

    private Set<String> upperCaseRoleCodes(List<Role> roles) {
        return safeRoleSet(roles).stream()
                .map(code -> code.toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(HashSet::new));
    }

    private void validateOrgRoles(Set<String> orgRolesReqSet, List<String> orgRolesCodesMDMS) {
        if (CollectionUtils.isEmpty(orgRolesCodesMDMS)) {
            log.error("Org Roles is not configured in MDMS");
            throw new CustomException("INVALID_ROLES", "Org Roles is not configured in MDMS");
        } else {
            if (!CollectionUtils.isEmpty(orgRolesReqSet)) {
                orgRolesReqSet.removeAll(orgRolesCodesMDMS);
                if (!CollectionUtils.isEmpty(orgRolesReqSet)) {
                    log.error("Invalid role assigned to the employee");
                    throw new CustomException("INVALID_ROLES", "Invalid role assigned to the employee "+orgRolesReqSet);
                }
            }
        }
    }

    public Map<String, List<Role>> getOrgRoles(RequestInfo requestInfo, String tenantId){
        Object mdmsData = mdmsUtil.mDMSCall(requestInfo, tenantId);
        final String jsonPathForOrgRoles = MDMS_RES + MDMS_ORGANIZATION_MODULE_NAME + "." + MASTER_ORG_ROLES + "[*]";
        try {
            List<Map<String, Object>> orgRolesRes = JsonPath.read(mdmsData, jsonPathForOrgRoles);
            if (CollectionUtils.isEmpty(orgRolesRes)) {
                throw new CustomException("INVALID_ROLES", "Org Roles is not configured in MDMS for tenant " + tenantId);
            }
            List<Role> orgRolesList = orgRolesRes.stream()
                    .map(item -> mapper.convertValue(item, Role.class))
                    .toList();
            return orgRolesList.stream().collect(Collectors.groupingBy(Role::getOrgType));
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse MDMS OrgRoles for tenant {}", tenantId, e);
            throw new CustomException("JSONPATH_ERROR", "Failed to parse mdms response for Organisation.OrgRoles (tenant: " + tenantId + ")");
        }
    }

    private UserChangeSet detectUserChanges(User existing, User incoming) {
        UserChangeSet changes = new UserChangeSet();

        changes.setMobileChanged(
                !Objects.equals(existing.getMobileNumber(), incoming.getMobileNumber())
        );

        changes.setNameChanged(
                !Objects.equals(existing.getName(), incoming.getName())
        );

        changes.setUsernameChanged(
                !Objects.equals(existing.getUserName(), incoming.getUserName())
        );

        changes.setEmailChanged(
                !Objects.equals(existing.getEmailId(), incoming.getEmailId())
        );

        changes.setRolesChanged(
                !safeRoleSet(existing.getRoles())
                        .equals(safeRoleSet(incoming.getRoles()))
        );

        changes.setJurisdictionChanged(
                !safeJurisSet(existing.getJurisdictions())
                        .equals(safeJurisSet(incoming.getJurisdictions())) || !safeJurisSetActive(existing.getJurisdictions())
                        .equals(safeJurisSetActive(incoming.getJurisdictions()))
        );

        return changes;
    }

    private Set<String> safeRoleSet(List<Role> roles) {
        if (roles == null) return Set.of();
        return roles.stream()
                .map(Role::getCode)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<String> safeJurisSet(List<Jurisdiction> jurisdictions) {
        if (jurisdictions == null) return Set.of();
        return jurisdictions.stream()
                .map(Jurisdiction::getBoundary)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<Boolean> safeJurisSetActive(List<Jurisdiction> jurisdictions) {
        if (jurisdictions == null) return Set.of();
        return jurisdictions.stream()
                .map(Jurisdiction::getIsActive)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    /**
     * When create finds an existing HRMS user for the same org: deactivate all prior jurisdictions
     * except the default country boundary used on create ({@link HRMSUtils#buildJurisdictions(List)}),
     * then merge in jurisdictions from the request (including default India when the list is empty).
     */
    private List<Jurisdiction> mergeJurisdictionsForRecreateUser(
            List<Jurisdiction> existingFromEmployee,
            List<Jurisdiction> requestedOnUser) {

        List<Jurisdiction> merged = new ArrayList<>();
        if (existingFromEmployee != null) {
            for (Jurisdiction j : existingFromEmployee) {
                if (j == null) {
                    continue;
                }
                if (isDefaultIndiaJurisdictionBoundary(j.getBoundary())) {
                    j.setIsActive(true);
                } else {
                    j.setIsActive(false);
                }
                merged.add(j);
            }
        }

        List<Jurisdiction> incoming = hrmsUtils.buildJurisdictions(requestedOnUser);
        for (Jurisdiction j : incoming) {
            if (j == null) {
                continue;
            }
            int idx = indexOfJurisdictionByBoundaryIgnoreCase(merged, j.getBoundary());
            if (idx >= 0) {
                Jurisdiction target = merged.get(idx);
                if (j.getHierarchy() != null) {
                    target.setHierarchy(j.getHierarchy());
                }
                if (j.getBoundaryType() != null) {
                    target.setBoundaryType(j.getBoundaryType());
                }
                if (j.getTenantId() != null) {
                    target.setTenantId(j.getTenantId());
                }
                if (j.getId() != null) {
                    target.setId(j.getId());
                }
                target.setIsActive(j.getIsActive() != null ? j.getIsActive() : Boolean.TRUE);
            } else {
                if (j.getIsActive() == null) {
                    j.setIsActive(true);
                }
                merged.add(j);
            }
        }
        return merged;
    }

    private static int indexOfJurisdictionByBoundaryIgnoreCase(List<Jurisdiction> list, String boundary) {
        if (boundary == null) {
            return -1;
        }
        for (int i = 0; i < list.size(); i++) {
            Jurisdiction x = list.get(i);
            if (x != null && x.getBoundary() != null && boundary.equalsIgnoreCase(x.getBoundary())) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Ensures vendor org users created via /organisation/v1/user/_create get the EMPLOYEE role (and user type)
     * when not already provided, so HRMS / egov-user behave like other internal staff users.
     */
    private void ensureDefaultEmployeeRoleForOrgUser(User user) {
        if (StringUtils.isBlank(user.getType())) {
            user.setType(EMPLOYEE_ROLE_CODE);
        }
        if (user.getRoles() == null) {
            user.setRoles(new ArrayList<>());
        }
        boolean hasEmployeeRole = user.getRoles().stream()
                .filter(Objects::nonNull)
                .anyMatch(r -> r.getCode() != null && EMPLOYEE_ROLE_CODE.equalsIgnoreCase(r.getCode()));
        if (!hasEmployeeRole) {
            String roleTenantId = StringUtils.isNotBlank(user.getTenantId())
                    ? userUtil.getStateLevelTenant(user.getTenantId())
                    : configuration.getStateLevelTenantId();
            user.getRoles().add(Role.builder()
                    .code(EMPLOYEE_ROLE_CODE)
                    .name(EMPLOYEE_ROLE_NAME)
                    .tenantId(roleTenantId)
                    .build());
        }
    }

    private static boolean isDefaultIndiaJurisdictionBoundary(String boundary) {
        return boundary != null && DEFAULT_HRMS_JURISDICTION_BOUNDARY.equalsIgnoreCase(boundary.trim());
    }

}
