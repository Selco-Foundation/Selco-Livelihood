package org.egov.amc.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.amc.web.models.DecryptionRequest;
import org.egov.amc.web.models.DecryptionRequestWrapper;
import org.egov.amc.web.models.EncryptObject;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class EncryptionDecryptionUtil {

    private final ServiceRequestRepository serviceRequestRepository;
    private final ObjectMapper objectMapper;

    @Value("${egov.enc.host}")
    private String encServiceHost;

    @Value("${egov.enc.decrypt.endpoint}")
    private String encServiceDecryptPath;

    public EncryptionDecryptionUtil(
            ServiceRequestRepository serviceRequestRepository,
            @Qualifier("objectMapper") ObjectMapper objectMapper) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.objectMapper = objectMapper;
    }

    @Value("${egov.enc.encrypt.endpoint:/egov-enc-service/crypto/v1/_encrypt}")
    private String encServiceEncryptPath;

    /** The tenant key the facility registry encrypts phones with (review A22). */
    @Value("${egov.enc.facility.phone.tenant:livelihood}")
    private String facilityPhoneTenant;

    /**
     * Encrypts a phone exactly as the facility registry does (type Normal, deterministic, checked on dev 2026-11-16),
     * so the result can be matched against facility.facility_poc_phone. Null when encryption fails.
     */
    public String encryptPhone(String phone) {
        String uri = UriComponentsBuilder.fromUriString(encServiceHost).path(encServiceEncryptPath).toUriString();
        Map<String, Object> body = Map.of("encryptionRequests", List.of(Map.of("tenantId", facilityPhoneTenant, "type", "Normal",
                "value", Map.of("userObject", Map.of("mobileNumber", phone)))));
        try {
            Object response = serviceRequestRepository.fetchEncServiceResult(new StringBuilder(uri), body);
            List<Map<String, Map<String, Object>>> list = objectMapper.convertValue(response, new TypeReference<>() {});
            Object cipher = list == null || list.isEmpty() || list.get(0).get("userObject") == null ? null : list.get(0).get("userObject").get("mobileNumber");
            return cipher == null ? null : cipher.toString();
        } catch (RuntimeException e) {
            log.warn("Phone encryption for search failed: {}", e.getMessage());
            return null;
        }
    }

    public List<Map<String, EncryptObject>> decryptObject(DecryptionRequest request) {
        String uri = UriComponentsBuilder
                .fromUriString(encServiceHost)
                .path(encServiceDecryptPath)
                .toUriString();

        Object response = serviceRequestRepository.fetchEncServiceResult(new StringBuilder(uri), request);
        DecryptionRequestWrapper wrapper = objectMapper.convertValue(response, DecryptionRequestWrapper.class);
        return wrapper.getDecryptionRequests();
    }
}
