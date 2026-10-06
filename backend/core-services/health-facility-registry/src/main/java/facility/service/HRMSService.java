package facility.service;

import facility.config.Configuration;
import facility.kafka.Producer;
import facility.repository.ServiceRequestRepository;
import facility.util.MdmsUtil;
import facility.web.models.Facility;
import facility.web.models.HealthFacilityDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.minidev.json.JSONArray;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.*;

import static org.apache.commons.lang3.StringUtils.firstNonBlank;

import static facility.service.FacilityService.usesManagerPocUsername;

@Component
@Slf4j
@RequiredArgsConstructor
public class HRMSService {

    private static final String MDMS_COMMON_MASTERS_MODULE = "common-masters";
    private static final String MDMS_DESIGNATION_MASTER = "Designation";

    // Localization module for the credentials SMS templates, matching the rainmaker-livelihood
    // LIV-TPL-* catalog used for ticket notifications (im-services).
    private static final String LOCALIZATION_MODULE = "rainmaker-livelihood";
    private static final String DEFAULT_LOCALE = "en_IN";
    private static final String LIVELIHOOD_URL_MESSAGE_CODE = "LIVELIHOOD_URL_SMS_MESSAGE";

    // Two SMS are sent per end-user on ingestion: a generic welcome/support message and a
    // login-credentials-formula message. Both are approved, DLT-registered copy per language.
    private static final String ONBOARDING_SMS_WELCOME_TEMPLATE_CODE = "LIV-TPL-034";
    private static final String ONBOARDING_SMS_LOGIN_INFO_TEMPLATE_CODE = "LIV-TPL-035";

    // End-user facility state -> egov-localization locale, used to pick which language's
    // credentials SMS copy to send. Extend as more states/languages are onboarded.
    private static final Map<String, String> STATE_LOCALE_MAP = Map.of(
            "meghalaya", "en_IN",
            "assam", "as_IN",
            "karnataka", "ka_IN"
    );

    // Client-approved fallback copy, used when localization has no override for the resolved locale.
    private static final Map<String, String> DEFAULT_SMS_TEMPLATES = buildDefaultOnboardingSmsTemplates();

    private static Map<String, String> buildDefaultOnboardingSmsTemplates() {
        Map<String, String> templates = new HashMap<>();
        templates.put(templateKey(ONBOARDING_SMS_WELCOME_TEMPLATE_CODE, "en_IN"),
                "Namaste from SELCO Foundation! Setu4Livelihoods is your bridge to quick solutions. If you are "
                        + "facing any issues with your equipment, call or WhatsApp SELCO Foundation at "
                        + "+918123479090, or visit {url} to raise an issue directly.");
        templates.put(templateKey(ONBOARDING_SMS_WELCOME_TEMPLATE_CODE, "as_IN"),
                "SELCO ফাউণ্ডেচনৰ তৰফৰ পৰা নমস্কাৰ! Setu4Livelihoods আপোনাৰ সমস্যাৰ দ্ৰুত সমাধানৰ বাবে এক সহায়ক "
                        + "মাধ্যম। আপোনাৰ সঁজুলিত কোনো সমস্যা হ'লে +918123479090 নম্বৰত ফোন কৰক বা WhatsApp-ৰ "
                        + "জৰিয়তে আমাৰ সৈতে যোগাযোগ কৰক। অথবা আপোনাৰ সমস্যা পোনপটীয়াকৈ পঞ্জীয়ন কৰিবলৈ {url} "
                        + "ভিজিট কৰক।");
        templates.put(templateKey(ONBOARDING_SMS_WELCOME_TEMPLATE_CODE, "ka_IN"),
                "ನಮಸ್ಕಾರ, ಸೆಲ್ಕೋ ಫೌಂಡೇಶನ್ ವತಿಯಿಂದ! Setu4Livelihoods ನಿಮ್ಮ ಸಮಸ್ಯೆಗಳಿಗೆ ತ್ವರಿತ ಪರಿಹಾರ ಪಡೆಯಲು "
                        + "ಸಹಾಯ ಮಾಡುವ ಸೇತುವೆಯಾಗಿದೆ. ನಿಮ್ಮ ಯಂತ್ರೋಪಕರಣಗಳು ಯಾವುದೇ ಸಮಸ್ಯೆ ಎದುರಾದರೆ, +918123479090 "
                        + "ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ವಾಟ್ಸಾಪ್ ಮೂಲಕ ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ. ಅಥವಾ ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು "
                        + "ನೇರವಾಗಿ ದಾಖಲಿಸಲು {url} ಗೆ ಭೇಟಿ ನೀಡಿ.");

        templates.put(templateKey(ONBOARDING_SMS_LOGIN_INFO_TEMPLATE_CODE, "en_IN"),
                "Hi {name}, you are now registered as a user of Setu4Livelihoods by SELCO Foundation! Your "
                        + "username is your registered phone number. Your login password is the first 4 letters "
                        + "of your name (first letter capital) + @ + the first 4 digits of your phone number. "
                        + "Example: If your name is Shreya and phone number is 6732564901, your password will "
                        + "be Shre@6732.");
        templates.put(templateKey(ONBOARDING_SMS_LOGIN_INFO_TEMPLATE_CODE, "as_IN"),
                "নমস্কাৰ {name}, আপুনি SELCO ফাউণ্ডেশ্যনৰ Setu4Livelihoods-ৰ এজন ব্যৱহাৰকাৰী হিচাপে পঞ্জীয়ন "
                        + "হৈছে। আপোনাৰ ব্যৱহাৰকাৰীৰ নাম আপোনাৰ পঞ্জীয়নভুক্ত মোবাইল নম্বৰ। আপোনাৰ লগইন পাছৱৰ্ড "
                        + "আপোনাৰ নামৰ প্ৰথম ৪টা আখৰ (প্ৰথম আখৰটো ডাঙৰ আখৰত) + @ + আপোনাৰ মোবাইল নম্বৰৰ প্ৰথম "
                        + "৪টা সংখ্যা। উদাহৰণ: আপোনাৰ নাম Shreya আৰু মোবাইল নম্বৰ 6732564901 হ'লে, আপোনাৰ "
                        + "পাছৱৰ্ড হ'ব Shre@6732।");
        templates.put(templateKey(ONBOARDING_SMS_LOGIN_INFO_TEMPLATE_CODE, "ka_IN"),
                "ನಮಸ್ಕಾರ {name}, ನೀವು SELCO ಫೌಂಡೇಶನ್‌ನ Setu4Livelihoods ಬಳಕೆದಾರರಾಗಿ ನೋಂದಾಯಿಸಲ್ಪಟ್ಟಿದ್ದೀರಿ. "
                        + "ನಿಮ್ಮ ಬಳಕೆದಾರ ಹೆಸರು ನಿಮ್ಮ ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ. ನಿಮ್ಮ ಲಾಗಿನ್ ಪಾಸ್‌ವರ್ಡ್ ನಿಮ್ಮ "
                        + "ಹೆಸರಿನ ಮೊದಲ 4 ಅಕ್ಷರಗಳು (ಮೊದಲ ಅಕ್ಷರ ದೊಡ್ಡಕ್ಷರದಲ್ಲಿ) + @ + ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯ "
                        + "ಮೊದಲ 4 ಅಂಕೆಗಳು. ಉದಾಹರಣೆ: ನಿಮ್ಮ ಹೆಸರು Shreya ಮತ್ತು ಮೊಬೈಲ್ ಸಂಖ್ಯೆ 6732564901 "
                        + "ಆಗಿದ್ದರೆ, ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ Shre@6732 ಆಗಿರುತ್ತದೆ.");
        return Collections.unmodifiableMap(templates);
    }

    private static String templateKey(String templateCode, String locale) {
        return templateCode + "|" + locale;
    }

    private final ServiceRequestRepository serviceRequestRepository;
    private final Configuration configs;
    private final MdmsUtil mdmsUtil;
    private final Producer producer;

    /**
     * Searches for an employee by mobile number (phone number) in HRMS.
     * 
     * @param mobileNumber The mobile number to search for
     * @param tenantId The tenant ID
     * @param requestInfo RequestInfo for the API call
     * @return true if an employee with the given mobile number exists, false otherwise
     */
    public boolean employeeExistsByMobileNumber(String mobileNumber, String tenantId, RequestInfo requestInfo) {
        log.trace("Entering employeeExistsByMobileNumber method");
        if (mobileNumber == null || mobileNumber.isBlank()) {
            log.debug("Mobile number is null or blank, returning false");
            return false;
        }

        log.info("Checking if employee exists by mobile number for tenant {}", tenantId);
        log.debug("Searching for employee with mobile number (last 4 digits only for privacy)");
        try {
            // Build HRMS search request
            String uri = UriComponentsBuilder
                    .fromUriString(configs.getHrmsHost())
                    .path(configs.getHrmsSearchEndPoint())
                    .queryParam("phone", mobileNumber)
                    .queryParam("tenantId", tenantId)
                    .queryParam("isActive", true)
                    .toUriString();
            log.debug("HRMS search URI constructed");

            // Request body should only contain RequestInfo (Criteria goes in query params)
            Map<String, Object> searchRequest = new HashMap<>();
            searchRequest.put("RequestInfo", requestInfo);

            // Call HRMS search API
            Map<String, Object> response = (Map<String, Object>) serviceRequestRepository.fetchResult(
                    new StringBuilder(uri), searchRequest
            );

            // Parse response to check if employee exists
            if (response != null && response.containsKey("Employees")) {
                List<Map<String, Object>> employees = (List<Map<String, Object>>) response.get("Employees");
                boolean exists = employees != null && !employees.isEmpty();
                log.info("Employee {} by mobile number for tenant {}", exists ? "exists" : "does not exist", tenantId);
                log.trace("Exiting employeeExistsByMobileNumber method");
                return exists;
            }

            log.debug("No employees found in HRMS response");
            return false;
        } catch (Exception e) {
            log.warn("Error checking if employee exists by mobile number for tenant {}: {}", tenantId, e.getMessage(), e);
            // If check fails, return false to allow creation (fail open approach)
            return false;
        }
    }

    public boolean employeeExistsByUsername(String username, String tenantId, RequestInfo requestInfo) {
        log.trace("Entering employeeExistsByMobileNumber method");
        if (username == null || username.isBlank()) {
            log.debug("Mobile number is null or blank, returning false");
            return false;
        }

        log.info("Checking if employee exists by mobile number for tenant {}", tenantId);
        log.debug("Searching for employee with mobile number (last 4 digits only for privacy)");
        try {
            // Build HRMS search request
            String uri = UriComponentsBuilder
                    .fromUriString(configs.getHrmsHost())
                    .path(configs.getHrmsSearchEndPoint())
                    .queryParam("codes", username)
                    .queryParam("tenantId", tenantId)
                    .queryParam("isActive", true)
                    .toUriString();
            log.debug("HRMS search URI constructed");

            // Request body should only contain RequestInfo (Criteria goes in query params)
            Map<String, Object> searchRequest = new HashMap<>();
            searchRequest.put("RequestInfo", requestInfo);

            // Call HRMS search API
            Map<String, Object> response = (Map<String, Object>) serviceRequestRepository.fetchResult(
                    new StringBuilder(uri), searchRequest
            );

            // Parse response to check if employee exists
            if (response != null && response.containsKey("Employees")) {
                List<Map<String, Object>> employees = (List<Map<String, Object>>) response.get("Employees");
                boolean exists = employees != null && !employees.isEmpty();
                log.info("Employee {} by mobile number for tenant {}", exists ? "exists" : "does not exist", tenantId);
                log.trace("Exiting employeeExistsByMobileNumber method");
                return exists;
            }

            log.debug("No employees found in HRMS response");
            return false;
        } catch (Exception e) {
            log.warn("Error checking if employee exists by mobile number for tenant {}: {}", tenantId, e.getMessage(), e);
            // If check fails, return false to allow creation (fail open approach)
            return false;
        }
    }

    /**
     * Creates an HRMS employee for the facility POC user with HCR role.
     * 
     * @param facility The facility for which to create the POC employee
     * @param requestInfo RequestInfo for the API call
     * @return true if employee was created successfully, false otherwise
     */
    public boolean createFacilityPOCEmployee(Facility facility, RequestInfo requestInfo) {
        log.trace("Entering createFacilityPOCEmployee method");
        HealthFacilityDetails facilityDetails = facility.getFacilityDetails();

        String normalizedCategory = facility.getFacilityCategory() == null
                ? ""
                : facility.getFacilityCategory().trim().toUpperCase(Locale.ROOT);
        boolean usesPocUsername = usesManagerPocUsername(normalizedCategory);

        String employeeCode;
        if (usesPocUsername) {
            if (facilityDetails == null || facilityDetails.getPocContact() == null
                    || facilityDetails.getPocContact().isBlank()
                    || facilityDetails.getPocName() == null || facilityDetails.getPocName().isBlank()) {
                log.warn("Cannot create POC employee for {} facility {}: missing POC contact or name",
                        normalizedCategory, sanitizeForLog(facility.getFacilityId()));
                return false;
            }
            String pocUsername = facility.getFacilityPocUsername();
            if (pocUsername == null || pocUsername.isBlank()) {
                log.warn("Cannot create POC employee for {} facility {}: missing facility POC username",
                        normalizedCategory, sanitizeForLog(facility.getFacilityId()));
                return false;
            }
            employeeCode = pocUsername.trim();
        } else {
            if (facilityDetails == null || facilityDetails.getPocContact() == null
                    || facilityDetails.getPocContact().isBlank() || facilityDetails.getPocName() == null
                    || facilityDetails.getPocName().isBlank()) {
                log.warn("Cannot create POC employee for facility {}: missing POC contact or name",
                        sanitizeForLog(facility.getFacilityId()));
                return false;
            }
            employeeCode = resolveFacilityEmployeeCode(facility);
            if (employeeCode == null || employeeCode.isBlank()) {
                log.warn("Cannot create POC employee for facility {}: missing HFR or NIN ID",
                        sanitizeForLog(facility.getFacilityId()));
                return false;
            }
        }

        log.info("Creating POC employee for facility {} with employee code {}",
                sanitizeForLog(facility.getFacilityId()), sanitizeForLog(employeeCode));
        try {
            // Build employee object
            Map<String, Object> user = new HashMap<>();
            user.put("userName", employeeCode);
            user.put("name", facilityDetails.getPocName());
            user.put("mobileNumber", facilityDetails.getPocContact());
            user.put("emailId", facility.getFacilityPocEmail());
            user.put("tenantId", facility.getTenantId());
            user.put("type", "EMPLOYEE");
            user.put("active", true);

            // Add roles - COMPLAINANT and EMPLOYEE roles
            List<Map<String, Object>> roles = new ArrayList<>();
            
            // COMPLAINANT role
            Map<String, Object> complainantRole = new HashMap<>();
            complainantRole.put("code", "COMPLAINANT");
            complainantRole.put("name", "Complainant");
            complainantRole.put("tenantId", facility.getTenantId());
            roles.add(complainantRole);
            
            // EMPLOYEE role
            Map<String, Object> employeeRole = new HashMap<>();
            employeeRole.put("code", "EMPLOYEE");
            employeeRole.put("name", "Employee");
            employeeRole.put("tenantId", facility.getTenantId());
            roles.add(employeeRole);
            
            user.put("roles", roles);

            // Get current timestamp for dateOfAppointment
            long currentTimestamp = Instant.now().toEpochMilli();

            // Build employee object
            Map<String, Object> employee = new HashMap<>();
            employee.put("code", employeeCode);
            employee.put("employeeStatus", "EMPLOYED");
            employee.put("employeeType", "PERMANENT");
            employee.put("dateOfAppointment", currentTimestamp);
            employee.put("tenantId", facility.getTenantId());
            employee.put("isActive", true);
            employee.put("user", user);

            // Add jurisdictions with facility boundary
            if (facility.getBoundaryCode() != null && !facility.getBoundaryCode().isBlank()) {
                List<Map<String, Object>> jurisdictions = new ArrayList<>();
                Map<String, Object> jurisdiction = new HashMap<>();
                jurisdiction.put("hierarchy", "ADMIN");
                jurisdiction.put("boundary", facility.getBoundaryCode());
                jurisdiction.put("boundaryType", "Facility");
                jurisdiction.put("tenantId", facility.getTenantId());
                jurisdiction.put("isActive", true);
                jurisdictions.add(jurisdiction);
                employee.put("jurisdictions", jurisdictions);
            }

            // Add assignments with designation and department
            List<Map<String, Object>> assignments = new ArrayList<>();
            Map<String, Object> assignment = new HashMap<>();
            String designationCode = null;
            if (facilityDetails.getPocDesignation() != null && !facilityDetails.getPocDesignation().isBlank()) {
                designationCode = resolveDesignationCode(
                        facilityDetails.getPocDesignation(), facility.getTenantId(), requestInfo);
                if (designationCode == null) {
                    log.warn("Could not resolve designation code for POC designation '{}' for facility {}, using default if configured",
                            sanitizeForLog(facilityDetails.getPocDesignation()), sanitizeForLog(facility.getFacilityId()));
                }
            }
            if (designationCode == null
                    && configs.getHrmsDefaultDesignationCode() != null
                    && !configs.getHrmsDefaultDesignationCode().isBlank()) {
                designationCode = configs.getHrmsDefaultDesignationCode();
            }
            if (designationCode != null) {
                assignment.put("designation", designationCode);
            }
            assignment.put("department", configs.getHrmsDefaultDepartmentCode());
            assignment.put("fromDate", currentTimestamp);
            assignment.put("toDate", null);
            assignment.put("tenantid", facility.getTenantId());
            assignment.put("isCurrentAssignment", true);
            assignments.add(assignment);
            employee.put("assignments", assignments);

            // Build create request
            Map<String, Object> createRequest = new HashMap<>();
            createRequest.put("RequestInfo", requestInfo);
            createRequest.put("Employees", Arrays.asList(employee));

            // Construct the URI
            String uri = UriComponentsBuilder
                    .fromUriString(configs.getHrmsHost())
                    .path(configs.getHrmsCreateEndPoint())
                    .toUriString();

            // Call HRMS create API
            Map<String, Object> response = (Map<String, Object>) serviceRequestRepository.fetchResult(
                    new StringBuilder(uri), createRequest
            );

            if (response != null) {
                log.info("Successfully created POC employee for facility {} with employee code {}",
                        sanitizeForLog(facility.getFacilityId()), sanitizeForLog(employeeCode));
                
                // Update user password after successful creation
                updateUserPassword(response, requestInfo, facility);
                
                log.trace("Exiting createFacilityPOCEmployee method");
                return true;
            }

            log.warn("HRMS create employee response was null for facility {}", sanitizeForLog(facility.getFacilityId()));
            return false;
        } catch (Exception e) {
            log.error("Error creating POC employee for facility {}: {}", 
                    sanitizeForLog(facility.getFacilityId()), e.getMessage(), e);
            return false;
        }
    }

    /**
     * Updates the password for a newly created user from HRMS response.
     * Extracts user details from HRMS employee response and calls user service to update password.
     * 
     * @param hrmsResponse The HRMS create employee response containing employee and user details
     * @param requestInfo RequestInfo for the API call
     */
    private void updateUserPassword(Map<String, Object> hrmsResponse, RequestInfo requestInfo, Facility facility) {
        log.trace("Entering updateUserPassword method");
        try {
            // Extract employees from HRMS response
            if (!hrmsResponse.containsKey("Employees")) {
                log.warn("HRMS response does not contain Employees, cannot update password");
                return;
            }

            List<Map<String, Object>> employees = (List<Map<String, Object>>) hrmsResponse.get("Employees");
            if (employees == null || employees.isEmpty()) {
                log.warn("No employees found in HRMS response, cannot update password");
                return;
            }

            // Get the first employee (should be the one we just created)
            Map<String, Object> employee = employees.get(0);
            if (!employee.containsKey("user")) {
                log.warn("Employee does not contain user information, cannot update password");
                return;
            }

            Map<String, Object> user = (Map<String, Object>) employee.get("user");
            if (user == null) {
                log.warn("User object is null, cannot update password");
                return;
            }

            // Verify user has required fields (uuid or id) for update
            if (!user.containsKey("uuid") && !user.containsKey("id")) {
                log.warn("User object does not contain uuid or id, cannot update password. User: {}", 
                        sanitizeForLog((String) user.get("userName")));
                return;
            }

            // Set password derived from the POC's name and mobile number
            String plainPassword = generateDefaultPassword((String) user.get("name"), (String) user.get("mobileNumber"));
            user.put("password", plainPassword);

            // Build user update request
            Map<String, Object> userUpdateRequest = new HashMap<>();
            userUpdateRequest.put("RequestInfo", requestInfo);
            userUpdateRequest.put("user", user);

            // Build user update URI
            String updateUri = configs.getUserHost() + configs.getUserContextPath() + configs.getUserUpdateEndpoint();

            log.debug("Updating password for user: {}", sanitizeForLog((String) user.get("userName")));

            // Call user service to update password
            serviceRequestRepository.fetchResult(new StringBuilder(updateUri), userUpdateRequest);

            log.info("Successfully updated password for user: {}", sanitizeForLog((String) user.get("userName")));

            sendOnboardingSms(user, requestInfo, facility);

            log.trace("Exiting updateUserPassword method");
        } catch (Exception e) {
            log.error("Error updating user password: {}", e.getMessage(), e);
        }
    }

    /**
     * Sends the two newly-generated-account SMS (welcome + login-credentials-formula) to the
     * POC's mobile number, in the language for their facility's state.
     * Failures here must never affect facility/employee creation, so all errors are logged and swallowed.
     */
    private void sendOnboardingSms(Map<String, Object> user, RequestInfo requestInfo, Facility facility) {
        String mobileNumber = (String) user.get("mobileNumber");
        if (mobileNumber == null || mobileNumber.isBlank()) {
            log.debug("Skipping credentials SMS: no mobile number on user");
            return;
        }

        String smsTopic = configs.getSmsNotificationTopic();
        if (smsTopic == null || smsTopic.isBlank()) {
            log.debug("Skipping credentials SMS: sms notification topic not configured");
            return;
        }

        try {
            String tenantId = (String) user.get("tenantId");
            String locale = resolveLocaleForFacility(facility);
            Map<String, String> localizedMessages = fetchLocalizedMessages(tenantId, locale, requestInfo);

            String name = firstNonBlank((String) user.get("name"), "");
            String url = firstNonBlank(
                    localizedMessages.get(LIVELIHOOD_URL_MESSAGE_CODE), configs.getLivelihoodUrlLink());

            String welcomeMessage = resolveTemplate(localizedMessages, ONBOARDING_SMS_WELCOME_TEMPLATE_CODE, locale)
                    .replace("{url}", url);
            String loginInfoMessage = resolveTemplate(localizedMessages, ONBOARDING_SMS_LOGIN_INFO_TEMPLATE_CODE, locale)
                    .replace("{name}", name);

            pushSms(smsTopic, mobileNumber, tenantId, welcomeMessage);
            pushSms(smsTopic, mobileNumber, tenantId, loginInfoMessage);

            log.info("Pushed credentials SMS (locale={}) for user: {}", locale, sanitizeForLog((String) user.get("userName")));
        } catch (Exception e) {
            log.error("Error sending credentials SMS for user {}: {}",
                    sanitizeForLog((String) user.get("userName")), e.getMessage(), e);
        }
    }

    private void pushSms(String smsTopic, String mobileNumber, String tenantId, String message) {
        Map<String, Object> smsRequest = new HashMap<>();
        smsRequest.put("mobileNumber", mobileNumber);
        smsRequest.put("message", message);
        smsRequest.put("category", "NOTIFICATION");
        smsRequest.put("tenantId", tenantId);
        producer.push(smsTopic, smsRequest);
    }

    /**
     * Maps the facility's state to an egov-localization locale, defaulting to English when the
     * state is missing/unmapped. address.getState() is frequently unset at this point, so the
     * state is parsed straight from the facility's hierarchical boundaryCode (e.g.
     * "India_Assam_Kamrup_Amingaon_FAC/2025/0045" -> "Assam"), falling back to address.getState()
     * only if that parse yields nothing.
     */
    private String resolveLocaleForFacility(Facility facility) {
        String state = extractStateFromBoundaryCode(facility != null ? facility.getBoundaryCode() : null);
        if (state == null || state.isBlank()) {
            state = facility != null && facility.getAddress() != null
                    ? facility.getAddress().getState() : null;
        }
        if (state == null || state.isBlank()) {
            return DEFAULT_LOCALE;
        }
        return STATE_LOCALE_MAP.getOrDefault(state.trim().toLowerCase(Locale.ROOT), DEFAULT_LOCALE);
    }

    /**
     * Extracts the state segment from a hierarchical boundary code, mirroring
     * FacilityService.enrichAddressFromBlockBoundaryCode's segment-index convention
     * (state is at index 1 once the code has an "India"-style country prefix, else index 0).
     */
    private static String extractStateFromBoundaryCode(String boundaryCode) {
        if (boundaryCode == null || boundaryCode.isBlank()) {
            return null;
        }
        String[] parts = boundaryCode.trim().split("_");
        if (parts.length < 3) {
            return null;
        }
        int stateIdx = parts.length >= 4 ? 1 : 0;
        return parts.length > stateIdx ? parts[stateIdx] : null;
    }

    /**
     * Fetches all rainmaker-livelihood localization messages for the given locale in one call
     * (covers both SMS template codes plus the shared platform-URL code).
     */
    private Map<String, String> fetchLocalizedMessages(String tenantId, String locale, RequestInfo requestInfo) {
        try {
            String searchUri = UriComponentsBuilder
                    .fromUriString(configs.getLocalizationHost())
                    .path(configs.getLocalizationContextPath())
                    .path(configs.getLocalizationSearchEndpoint())
                    .queryParam("tenantId", tenantId)
                    .queryParam("module", LOCALIZATION_MODULE)
                    .queryParam("locale", locale)
                    .toUriString();

            Map<String, Object> searchRequest = new HashMap<>();
            searchRequest.put("RequestInfo", requestInfo);

            Map<String, Object> response = (Map<String, Object>) serviceRequestRepository.fetchResult(
                    new StringBuilder(searchUri), searchRequest
            );

            List<Map<String, Object>> messages = response == null
                    ? null : (List<Map<String, Object>>) response.get("messages");
            if (messages == null) {
                return Collections.emptyMap();
            }

            Map<String, String> result = new HashMap<>();
            for (Map<String, Object> entry : messages) {
                Object code = entry.get("code");
                Object message = entry.get("message");
                if (code != null && message != null && !((String) message).isBlank()) {
                    result.put((String) code, (String) message);
                }
            }
            return result;
        } catch (Exception e) {
            log.warn("Could not fetch localized SMS templates for locale {}, using defaults: {}", locale, e.getMessage());
            return Collections.emptyMap();
        }
    }

    /**
     * Resolves one template's text: localization override for the resolved locale first,
     * else the client-approved fallback copy for that locale, else the English fallback.
     */
    private String resolveTemplate(Map<String, String> localizedMessages, String templateCode, String locale) {
        String localized = localizedMessages.get(templateCode);
        if (localized != null && !localized.isBlank()) {
            return localized;
        }
        String fallback = DEFAULT_SMS_TEMPLATES.get(templateKey(templateCode, locale));
        if (fallback != null) {
            return fallback;
        }
        return DEFAULT_SMS_TEMPLATES.get(templateKey(templateCode, DEFAULT_LOCALE));
    }

    /**
     * Builds a password from the first 4 letters of the name (first letter capitalized,
     * rest lowercase) followed by '@' and the first 4 digits of the mobile number.
     * e.g. name "Bharat", mobile "6732564901" -> "Bhar@6732"
     */
    private String generateDefaultPassword(String name, String mobileNumber) {
        String letters = name == null ? "" : name.replaceAll("[^A-Za-z]", "");
        String namePart = letters.substring(0, Math.min(4, letters.length()));
        if (!namePart.isEmpty()) {
            namePart = Character.toUpperCase(namePart.charAt(0)) + namePart.substring(1).toLowerCase();
        }

        String digits = mobileNumber == null ? "" : mobileNumber.replaceAll("[^0-9]", "");
        String phonePart = digits.substring(0, Math.min(4, digits.length()));

        return namePart + "@" + phonePart;
    }

    /**
     * Resolves HRMS designation code from a POC designation value by looking up
     * {@code common-masters.Designation} in MDMS. Matches by designation name (e.g. "Medical officer")
     * or returns the value as-is when it already matches a designation code.
     */
    private String resolveDesignationCode(String designationValue, String tenantId, RequestInfo requestInfo) {
        if (designationValue == null || designationValue.isBlank()) {
            return null;
        }

        String normalizedValue = designationValue.trim();
        try {
            Map<String, Map<String, JSONArray>> mdmsData = mdmsUtil.fetchMdmsData(
                    requestInfo, tenantId, MDMS_COMMON_MASTERS_MODULE, List.of(MDMS_DESIGNATION_MASTER));

            JSONArray designations = mdmsData
                    .getOrDefault(MDMS_COMMON_MASTERS_MODULE, Map.of())
                    .get(MDMS_DESIGNATION_MASTER);
            if (designations == null || designations.isEmpty()) {
                log.warn("No Designation records found in MDMS for tenant {}", tenantId);
                return null;
            }

            for (Object obj : designations) {
                if (!(obj instanceof Map)) {
                    continue;
                }
                Map<String, Object> designation = (Map<String, Object>) obj;
                Object codeObj = designation.get("code");
                Object nameObj = designation.get("name");
                if (codeObj != null && normalizedValue.equalsIgnoreCase(codeObj.toString().trim())) {
                    return codeObj.toString().trim();
                }
                if (nameObj != null && normalizedValue.equalsIgnoreCase(nameObj.toString().trim())
                        && codeObj != null && !codeObj.toString().isBlank()) {
                    return codeObj.toString().trim();
                }
            }

            log.warn("Designation '{}' not found in MDMS common-masters.Designation for tenant {}",
                    sanitizeForLog(normalizedValue), tenantId);
        } catch (Exception e) {
            log.warn("Error resolving designation code for '{}' in tenant {}: {}",
                    sanitizeForLog(normalizedValue), tenantId, e.getMessage(), e);
        }
        return null;
    }

    /**
     * Resolves the facility identifier used as HRMS username/employee code.
     * Prefers HFR ID over NIN ID; checks both top-level facility fields and nested facilityDetails.
     */
    private String resolveFacilityEmployeeCode(Facility facility) {
        HealthFacilityDetails facilityDetails = facility.getFacilityDetails();
        if (facility.getHfrId() != null && !facility.getHfrId().trim().isBlank()) {
            return facility.getHfrId().trim();
        }
        if (facilityDetails != null && facilityDetails.getHfrId() != null && !facilityDetails.getHfrId().isBlank()) {
            return facilityDetails.getHfrId().trim();
        }
        if (facility.getNinId() != null && !facility.getNinId().trim().isBlank()) {
            return facility.getNinId().trim();
        }
        if (facilityDetails != null && facilityDetails.getNinId() != null && !facilityDetails.getNinId().isBlank()) {
            return facilityDetails.getNinId().trim();
        }
        return null;
    }

    /**
     * Sanitizes a string value for safe logging by removing control characters
     * that could be used for log injection attacks (newlines, carriage returns).
     * 
     * @param value The string value to sanitize
     * @return null if input is null, otherwise the sanitized string with \r and \n replaced by spaces
     */
    private String sanitizeForLog(String value) {
        if (value == null) {
            return null;
        }
        return value.replace('\r', ' ').replace('\n', ' ');
    }
}

