package org.egov.util;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.user.UserDetailResponse;
import org.egov.config.Configuration;
import org.egov.repository.ServiceRequestRepository;
import lombok.extern.slf4j.Slf4j;
import org.egov.tracer.model.CustomException;
import org.egov.web.models.CreateUserRequest;
import org.egov.web.models.RoleRequest;
import org.egov.web.models.User;
import org.egov.web.models.UserRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@Slf4j
public class UserUtil {

	private ObjectMapper mapper;

	private ServiceRequestRepository serviceRequestRepository;

	private final Configuration configs;
	private static final String LAST_MODIFIED_DATE = "lastModifiedDate";
	private static final String PWD_EXPIRY_DATE = "pwdExpiryDate";
	@Autowired
	public UserUtil(ObjectMapper mapper, ServiceRequestRepository serviceRequestRepository, Configuration configs) {
		this.mapper = mapper;
		this.serviceRequestRepository = serviceRequestRepository;
		this.configs = configs;
	}

	/**
	 * Returns UserDetailResponse by calling user service with given uri and object
	 * 
	 * @param userRequest Request object for user service
	 * @param uri         The address of the endpoint
	 * @return Response from user service as parsed as userDetailResponse
	 */

	public UserDetailResponse userCall(Object userRequest, StringBuilder uri) {
		log.trace("UserUtil::userCall entry");
		String dobFormat = null;
		if (uri.toString().contains(configs.getUserSearchEndpoint())
				|| uri.toString().contains(configs.getUserUpdateEndpoint()))
			dobFormat = "yyyy-MM-dd";
		else if (uri.toString().contains(configs.getUserCreateEndpoint()))
			dobFormat = "dd/MM/yyyy";
		log.debug("Calling user service with URI: {}, date format: {}", uri.toString(), dobFormat);
		try {
			LinkedHashMap responseMap = (LinkedHashMap) serviceRequestRepository.fetchResult(uri, userRequest);
			parseResponse(responseMap, dobFormat);
            UserDetailResponse response = mapper.convertValue(responseMap, UserDetailResponse.class);
            log.debug("User service call completed successfully");
            return response;
		} catch (IllegalArgumentException e) {
			log.error("Error converting user service response", e);
			throw new CustomException("IllegalArgumentException", "ObjectMapper not able to convertValue in userCall");
		}
	}

	public UserDetailResponse updateUserPassword(Object userRequest, StringBuilder uri) {
		String dobFormat = "yyyy-MM-dd";
		try {
			LinkedHashMap responseMap = (LinkedHashMap) serviceRequestRepository.fetchResult(uri, userRequest);
			parseResponse(responseMap, dobFormat);
			return mapper.convertValue(responseMap, UserDetailResponse.class);
		} catch (IllegalArgumentException e) {
			throw new CustomException("IllegalArgumentException", "ObjectMapper not able to convertValue in userCall");
		}
	}

	/**
	 * Parses date formats to long for all users in responseMap
	 * 
	 * @param responseMap LinkedHashMap got from user api response
	 */

	public void parseResponse(LinkedHashMap responseMap, String dobFormat) {
		log.trace("UserUtil::parseResponse entry");
		List<LinkedHashMap> users = (List<LinkedHashMap>) responseMap.get("user");
		String format1 = "dd-MM-yyyy HH:mm:ss";
		if (users != null) {
			log.debug("Parsing dates for {} users", users.size());
			users.forEach(map -> {
				map.put("createdDate", dateTolong((String) map.get("createdDate"), format1));
				if ((String) map.get(LAST_MODIFIED_DATE) != null)
					map.put(LAST_MODIFIED_DATE, dateTolong((String) map.get(LAST_MODIFIED_DATE), format1));
				if ((String) map.get("dob") != null)
					map.put("dob", dateTolong((String) map.get("dob"), dobFormat));
				if ((String) map.get(PWD_EXPIRY_DATE) != null)
					map.put(PWD_EXPIRY_DATE, dateTolong((String) map.get(PWD_EXPIRY_DATE), format1));
			});
		}
	}

	/**
	 * Converts date to long
	 * 
	 * @param date   date to be parsed
	 * @param format Format of the date
	 * @return Long value of date
	 */
	private Long dateTolong(String date, String format) {
		log.trace("UserUtil::dateTolong entry");
		SimpleDateFormat f = new SimpleDateFormat(format);
		Date d = null;
		try {
			d = f.parse(date);
		} catch (ParseException e) {
			log.error("Failed to parse date: {} with format: {}", date, format, e);
			throw new CustomException("INVALID_DATE_FORMAT", "Failed to parse date format in user");
		}
		return d.getTime();
	}

	/**
	 * enriches the userInfo with statelevel tenantId and other fields The function
	 * creates user with username as mobile number.
	 * 
	 * @param mobileNumber
	 * @param tenantId
	 * @param userInfo
	 */
//	public void addUserDefaultFields(String mobileNumber, String tenantId, User userInfo, UserType userType) {
//		Role role = getCitizenRole(tenantId);
//		userInfo.setRoles(Collections.singletonList(role));
//		userInfo.setType(userType.toString());
//		userInfo.setUserName(mobileNumber);
//		userInfo.setTenantId(getStateLevelTenant(tenantId));
//	}

	/**
	 * Returns role object for citizen
	 * 
	 * @param tenantId
	 * @return
	 */
//	private Role getCitizenRole(String tenantId) {
//		Role role = Role.builder().build();
//		role.setCode("CITIZEN");
//		role.setName("Citizen");
//		role.setTenantId(getStateLevelTenant(tenantId));
//		return role;
//	}

	public String getStateLevelTenant(String tenantId) {
		log.trace("UserUtil::getStateLevelTenant entry");
		String stateLevelTenant = tenantId.split("\\.")[0];
		log.debug("Extracted state level tenant: {} from tenant: {}", stateLevelTenant, tenantId);
		return stateLevelTenant;
	}

	public UserRequest mapToUserRequest(User user) {

		if (user == null) return null;

		return UserRequest.builder()
				.id(user.getId())
				.uuid(user.getUuid())
				.userName(user.getUserName())
				.salutation(user.getSalutation())
				.name(user.getName())
				.gender(user.getGender())
				.mobileNumber(user.getMobileNumber())
				.emailId(user.getEmailId())
				.altContactNumber(user.getAltContactNumber())
				.pan(user.getPan())
				.aadhaarNumber(user.getAadhaarNumber())
				.permanentAddress(user.getPermanentAddress())
				.permanentCity(user.getPermanentCity())
				.permanentPinCode(user.getPermanentPincode())
				.correspondenceAddress(user.getCorrespondenceAddress())
				.correspondenceCity(user.getCorrespondenceCity())
				.correspondencePinCode(user.getCorrespondencePincode())
				.active(user.getActive())
				.locale(user.getLocale())
				.accountLocked(user.getAccountLocked())
				.fatherOrHusbandName(user.getFatherOrHusbandName())
				.signature(user.getSignature())
				.bloodGroup(user.getBloodGroup())
				.photo(user.getPhoto())
				.identificationMark(user.getIdentificationMark())
				.password(user.getPassword())
				.otpReference(user.getOtpReference())
				.tenantId(user.getTenantId())

				// Long → Date
				.createdDate(user.getCreatedDate() != null
						? new Date(user.getCreatedDate())
						: null)
				.lastModifiedDate(user.getLastModifiedDate() != null
						? new Date(user.getLastModifiedDate())
						: null)
				.dob(user.getDob() != null
						? new Date(user.getDob())
						: null)
				.pwdExpiryDate(user.getPwdExpiryDate() != null
						? new Date(user.getPwdExpiryDate())
						: null)

				// Roles
				.roles(mapRoleRequests(user.getRoles()))

				.build();
	}

	private Set<RoleRequest> mapRoleRequests(List<org.egov.web.models.Role> roles) {

		if (roles == null) return new HashSet<>();

		return roles.stream()
				.map(r -> RoleRequest.builder()
						.code(r.getCode())
						.name(r.getName())
						.tenantId(r.getTenantId())
						.build())
				.collect(Collectors.toSet());
	}

	/**
	 * Sets default password via egov-user {@code _updatenovalidate} using the HRMS user object
	 * (Long epoch dates, roles, id/uuid) — same shape as the working E4H manual curl.
	 */
	public void updatePasswordWithHrmsUser(RequestInfo requestInfo, User hrmsUser, String password) {
		if (requestInfo == null || hrmsUser == null || hrmsUser.getUuid() == null || hrmsUser.getUuid().isBlank()) {
			throw new CustomException("USER_UPDATE", "RequestInfo and HRMS user uuid are required to update password");
		}
		if (password == null || password.isBlank()) {
			throw new CustomException("USER_UPDATE", "Password is required to update user");
		}
		User userForUpdate = prepareHrmsUserForPasswordUpdate(hrmsUser, password);
		CreateUserRequest payload = CreateUserRequest.builder()
				.requestInfo(requestInfo)
				.user(userForUpdate)
				.build();
		String updateUrl = configs.getUserHost() + configs.getUserUpdateEndpoint();
		serviceRequestRepository.fetchResult(new StringBuilder(updateUrl), payload);
		log.info("Default password updated in egov-user for HRMS user uuid {}", userForUpdate.getUuid());
	}

	private User prepareHrmsUserForPasswordUpdate(User hrmsUser, String password) {
		User userForUpdate = copyUser(hrmsUser);
		userForUpdate.setPassword(password);
		if (userForUpdate.getActive() == null) {
			userForUpdate.setActive(true);
		}
		if (userForUpdate.getType() == null || userForUpdate.getType().isBlank()) {
			userForUpdate.setType("EMPLOYEE");
		}
		if (userForUpdate.getAccountLocked() == null) {
			userForUpdate.setAccountLocked(false);
		}
		if (userForUpdate.getCreatedBy() == null || userForUpdate.getCreatedBy().isBlank()) {
			userForUpdate.setCreatedBy("0");
		}
		if (userForUpdate.getLastModifiedBy() == null || userForUpdate.getLastModifiedBy().isBlank()) {
			userForUpdate.setLastModifiedBy("0");
		}
		return userForUpdate;
	}

	private User copyUser(User source) {
		if (source == null) {
			return null;
		}
		return User.builder()
				.id(source.getId())
				.uuid(source.getUuid())
				.userName(source.getUserName())
				.name(source.getName())
				.gender(source.getGender())
				.mobileNumber(source.getMobileNumber())
				.emailId(source.getEmailId())
				.altContactNumber(source.getAltContactNumber())
				.pan(source.getPan())
				.aadhaarNumber(source.getAadhaarNumber())
				.permanentAddress(source.getPermanentAddress())
				.permanentCity(source.getPermanentCity())
				.permanentPincode(source.getPermanentPincode())
				.correspondenceCity(source.getCorrespondenceCity())
				.correspondencePincode(source.getCorrespondencePincode())
				.correspondenceAddress(source.getCorrespondenceAddress())
				.active(source.getActive())
				.dob(source.getDob())
				.pwdExpiryDate(source.getPwdExpiryDate())
				.locale(source.getLocale())
				.type(source.getType())
				.signature(source.getSignature())
				.accountLocked(source.getAccountLocked())
				.roles(source.getRoles())
				.fatherOrHusbandName(source.getFatherOrHusbandName())
				.relationship(source.getRelationship())
				.bloodGroup(source.getBloodGroup())
				.identificationMark(source.getIdentificationMark())
				.photo(source.getPhoto())
				.createdBy(source.getCreatedBy())
				.createdDate(source.getCreatedDate())
				.lastModifiedBy(source.getLastModifiedBy())
				.lastModifiedDate(source.getLastModifiedDate())
				.otpReference(source.getOtpReference())
				.tenantId(source.getTenantId())
				.jurisdictions(source.getJurisdictions())
				.build();
	}

	/**
	 * @deprecated Prefer {@link #updatePasswordWithHrmsUser(RequestInfo, User, String)} with HRMS user payload.
	 */
	@SuppressWarnings("unchecked")
	public void updateDefaultPassword(RequestInfo requestInfo, String tenantId, String uuid, String password) {
		if (requestInfo == null || tenantId == null || tenantId.isBlank() || uuid == null || uuid.isBlank()) {
			throw new CustomException("USER_UPDATE", "RequestInfo, tenantId and uuid are required to update password");
		}
		String searchUrl = configs.getUserHost() + configs.getUserSearchEndpoint() + "?tenantId=" + tenantId;
		Map<String, Object> searchRequest = new HashMap<>();
		searchRequest.put("RequestInfo", requestInfo);
		searchRequest.put("uuid", Collections.singletonList(uuid));
		searchRequest.put("tenantId", tenantId);
		searchRequest.put("type", "EMPLOYEE");

		LinkedHashMap<String, Object> searchResponse = (LinkedHashMap<String, Object>) serviceRequestRepository
				.fetchResult(new StringBuilder(searchUrl), searchRequest);
		List<LinkedHashMap<String, Object>> users = (List<LinkedHashMap<String, Object>>) searchResponse.get("user");
		if (users == null || users.isEmpty()) {
			throw new CustomException("USER_SEARCH", "User not found in egov-user for uuid " + uuid);
		}

		LinkedHashMap<String, Object> userForUpdate = new LinkedHashMap<>(users.get(0));
		normalizeUserForEgovUserUpdate(userForUpdate);
		userForUpdate.put("password", password);

		Map<String, Object> updateRequest = new HashMap<>();
		updateRequest.put("RequestInfo", requestInfo);
		updateRequest.put("user", userForUpdate);

		String updateUrl = configs.getUserHost() + configs.getUserUpdateEndpoint();
		serviceRequestRepository.fetchResult(new StringBuilder(updateUrl), updateRequest);
		log.info("Default password updated in egov-user for uuid {}", uuid);
	}

	/** v1 search uses {@code yyyy-MM-dd} for dob; {@code _updatenovalidate} expects {@code dd/MM/yyyy}. */
	private void normalizeUserForEgovUserUpdate(Map<String, Object> user) {
		Object dob = user.get("dob");
		if (dob instanceof String dobStr && !dobStr.isBlank()) {
			if (dobStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
				String[] parts = dobStr.split("-");
				user.put("dob", parts[2] + "/" + parts[1] + "/" + parts[0]);
			}
		}
		if (user.get("accountLocked") == null) {
			user.put("accountLocked", false);
		}
		if (user.get("accountLockedDate") == null) {
			user.put("accountLockedDate", 0);
		}
		if (user.get("createdBy") == null) {
			user.put("createdBy", 0);
		}
		if (user.get("lastModifiedBy") == null) {
			user.put("lastModifiedBy", 0);
		}
	}


}