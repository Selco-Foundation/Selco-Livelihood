package org.egov.im.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.im.repository.IMRepository;
import org.egov.im.util.AssetRegistryUtil;
import org.egov.im.util.HRMSUtil;
import org.egov.im.util.LivelihoodIssueTypeUtil;
import org.egov.im.util.LivelihoodPocScopeService;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.util.VendorRegistryUtil;
import org.egov.im.web.models.Document;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.RequestSearchCriteria;
import org.egov.im.web.models.User;
import org.egov.im.web.models.Workflow;
import org.egov.im.web.models.asset.Asset;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.egov.im.util.IMConstants.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LivelihoodCreateService {

    private static final List<String> VENDOR_UUID_KEYS = Arrays.asList(
            "vendorUserUuid", "vendorEmployeeUuid", "assignedVendorUserId", "vendorUserId"
    );

    /**
     * Active / unresolved LivelihoodIncident states. RESOLVED and the CLOSED_* states are deliberately
     * excluded: once an issue is resolved or closed, the end user may raise a fresh ticket for it.
     */
    static final Set<String> ACTIVE_DUPLICATE_STATUSES = Set.of(
            LIVELIHOOD_PENDING_FOR_RESOLUTION,
            LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC,
            LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR,
            LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR
    );

    static final String DUPLICATE_TICKET_CODE = "DUPLICATE_TICKET";
    static final String IVR_DUPLICATE_TICKET_CODE = "IVR_DUPLICATE_TICKET";
    static final String DUPLICATE_TICKET_MESSAGE =
            "You already have a ticket raised for this asset with the same issue. Please refer to the existing ticket: ";

    private final IMRepository imRepository;
    private final AssetRegistryUtil assetRegistryUtil;
    private final LivelihoodTenantUtil livelihoodTenantUtil;
    private final VendorRegistryUtil vendorRegistryUtil;
    private final LivelihoodIssueTypeUtil livelihoodIssueTypeUtil;
    private final LivelihoodPocScopeService livelihoodPocScopeService;
    private final HRMSUtil hrmsUtil;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public void prepareCreate(IncidentRequest request, Object mdmsData) {
        if (!livelihoodTenantUtil.isLivelihood(request.getIncident().getTenantId())) {
            return;
        }

        Incident incident = request.getIncident();
        Workflow workflow = request.getWorkflow();
        if (workflow == null) {
            throw new CustomException("INVALID_REQUEST", "Workflow is required for Livelihood incident creation");
        }

        validateVerificationDocuments(workflow);

        Asset asset = assetRegistryUtil.fetchAsset(
                request.getRequestInfo(),
                incident.getTenantId(),
                incident.getAssetId(),
                incident.getFacilityId()
        );

        if (asset.getFacilityID() == null
                || !asset.getFacilityID().equalsIgnoreCase(incident.getFacilityId())) {
            throw new CustomException(
                    "INVALID_ASSET_FACILITY",
                    "Asset facility does not match the provided facilityId"
            );
        }

        String assetCategory = livelihoodIssueTypeUtil.resolveAssetCategory(
                request.getRequestInfo(),
                incident.getTenantId(),
                asset
        );
        livelihoodIssueTypeUtil.validateIssueType(incident.getIncidentType(), assetCategory, mdmsData);
        livelihoodIssueTypeUtil.storeAssetCategory(incident, assetCategory);
        incident.setIncidentSubType(null);

        if (StringUtils.isBlank(incident.getBoundaryCode()) && StringUtils.isNotBlank(asset.getBoundaryCode())) {
            incident.setBoundaryCode(asset.getBoundaryCode());
        }

        livelihoodPocScopeService.assertBoundaryInScope(
                request.getRequestInfo(),
                incident.getTenantId(),
                incident.getBoundaryCode()
        );

        String vendorUserUuid = resolveVendorUserUuid(asset, request.getRequestInfo(), incident.getTenantId());
        workflow.setAssignes(List.of(vendorUserUuid));
        workflow.setAction(resolveCreateWorkflowAction(request.getRequestInfo()));

        enrichEntryMetadata(request);
        rejectDuplicate(request);
    }

    private void validateVerificationDocuments(Workflow workflow) {
        if (CollectionUtils.isEmpty(workflow.getVerificationDocuments())) {
            return;
        }
        int maxFiles = 7;
        if (workflow.getVerificationDocuments().size() > maxFiles) {
            throw new CustomException("INVALID_DOCUMENTS", "Cannot attach more than " + maxFiles + " files");
        }
        for (Document document : workflow.getVerificationDocuments()) {
            if (document == null || StringUtils.isEmpty(document.getFileStoreId())) {
                throw new CustomException("INVALID_DOCUMENTS", "fileStoreId is required for each verification document");
            }
            if (document.getDocumentType() != null) {
                String type = document.getDocumentType().toUpperCase();
                if (!IMAGE_DOCUMENT_TYPE.equals(type) && !"VIDEO".equals(type) && !"HLS".equals(type)) {
                    throw new CustomException(
                            "INVALID_DOCUMENTS",
                            "Only PHOTO, VIDEO and HLS document types are supported during ticket creation"
                    );
                }
            }
        }
    }

    private String resolveVendorUserUuid(Asset asset, RequestInfo requestInfo, String tenantId) {
        if (StringUtils.isNotBlank(asset.getVendorId())) {
            String vendorId = asset.getVendorId().trim();
            if (isUuid(vendorId)) {
                return vendorId;
            }
            String resolved = vendorRegistryUtil.resolveVendorUserUuid(requestInfo, tenantId, vendorId);
            if (StringUtils.isNotBlank(resolved)) {
                return resolved;
            }
        }

        String vendorUuid = extractVendorUuid(asset.getAdditionalDetails());
        if (StringUtils.isEmpty(vendorUuid)) {
            vendorUuid = extractVendorUuid(asset.getAssetDetails());
        }
        if (StringUtils.isEmpty(vendorUuid)) {
            throw new CustomException(
                    "VENDOR_NOT_MAPPED",
                    "No vendor is mapped to the selected asset. Ticket creation cannot proceed."
            );
        }
        return vendorUuid;
    }

    private boolean isUuid(String value) {
        return value.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    }

    private String extractVendorUuid(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        for (String key : VENDOR_UUID_KEYS) {
            Object value = details.get(key);
            if (value != null && StringUtils.isNotBlank(String.valueOf(value))) {
                return String.valueOf(value).trim();
            }
        }
        Object vendorId = details.get("vendorId");
        if (vendorId != null && StringUtils.isNotBlank(String.valueOf(vendorId))) {
            return String.valueOf(vendorId).trim();
        }
        return null;
    }

    private void enrichEntryMetadata(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();
        boolean pocUser = isPocUser(requestInfo);

        if (incident.getEntryChannel() == null || incident.getEntryChannel().isBlank()) {
            incident.setEntryChannel(pocUser ? ENTRY_CHANNEL_POC_MANUAL : ENTRY_CHANNEL_DIRECT);
        }

        // IVR/WhatsApp: only end users call in. The API caller is the IVR backend's service account,
        // so the reporter is the facility's end user, verified against the caller's phone number.
        if (ENTRY_CHANNEL_IVR_WHATSAPP.equalsIgnoreCase(incident.getEntryChannel())) {
            resolveIvrEndUser(request);
            return;
        }

        if (incident.getCreatedOnBehalf() == null) {
            incident.setCreatedOnBehalf(pocUser);
        }

        if (pocUser || Boolean.TRUE.equals(incident.getCreatedOnBehalf())) {
            enrichOnBehalfComplainant(request);
            return;
        }

        if (StringUtils.isEmpty(incident.getReporterType())) {
            incident.setReporterType(ROLE_COMPLAINANT);
        }
    }

    /**
     * IVR tickets are raised by the end user themselves: the reporter is the facility's registered end user
     * (HRMS COMPLAINANT at the facility boundary), and the caller — {@code reporter.mobileNumber}, or
     * {@code reporter.uuid} — must be that same user. Rejects the request otherwise; never creates a user.
     */
    private void resolveIvrEndUser(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();

        User sent = incident.getReporter();
        String callerMobile = sent != null ? StringUtils.trimToNull(sent.getMobileNumber()) : null;
        String callerUuid = sent != null ? StringUtils.trimToNull(sent.getUuid()) : null;
        if (callerMobile == null && callerUuid == null) {
            throw new CustomException(
                    "IVR_CALLER_REQUIRED",
                    "reporter.mobileNumber of the IVR caller is required for IVR/WhatsApp tickets"
            );
        }

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                requestInfo,
                incident.getTenantId(),
                resolveFacilityBoundary(incident)
        );
        User endUser = userService.resolveReporterFromComplainant(complainant, requestInfo, incident.getTenantId());

        boolean callerIsEndUser = endUser != null && (
                (callerUuid != null && callerUuid.equals(endUser.getUuid()))
                        || (callerMobile != null && (samePhone(callerMobile, endUser.getMobileNumber())
                        || samePhone(callerMobile, endUser.getUserName())))
        );
        if (!callerIsEndUser) {
            log.warn("IVR caller does not match the facility end user | facilityId={}", incident.getFacilityId());
            throw new CustomException(
                    "IVR_CALLER_NOT_END_USER",
                    "Caller is not the registered end user of facility " + incident.getFacilityId()
            );
        }

        incident.setReporter(endUser);
        incident.setAccountId(endUser.getUuid());
        incident.setCreatedOnBehalf(false);
        incident.setReporterType(ROLE_COMPLAINANT);
    }

    /**
     * Blocks a duplicate ticket on every channel (Web direct, POC on-behalf, IVR/WhatsApp): an active ticket
     * for the same end user + asset + issue type already exists. A different issue type or a different
     * asset is allowed, and so is a new ticket once the earlier one is RESOLVED or CLOSED.
     * <p>
     * Runs after {@link #enrichEntryMetadata} so the end user is already resolved for POC and IVR creates.
     * Web: the message ends with the existing ticket number (code DUPLICATE_TICKET).
     * IVR: code IVR_DUPLICATE_TICKET, message also carries the current status for the IVR to announce.
     */
    void rejectDuplicate(IncidentRequest request) {
        Incident incident = request.getIncident();
        String endUserUuid = resolveEndUserUuid(request);

        RequestSearchCriteria.RequestSearchCriteriaBuilder criteria = RequestSearchCriteria.builder()
                .tenantId(incident.getTenantId())
                .assetIds(Set.of(incident.getAssetId().trim()))
                .incidentType(Set.of(incident.getIncidentType().trim()))
                .applicationStatus(ACTIVE_DUPLICATE_STATUSES)
                .offset(0)
                .limit(1);
        if (endUserUuid != null) {
            criteria.userIds(Set.of(endUserUuid));
        } else {
            // Each asset belongs to one facility with one end user, so asset + issue type is still the right key.
            log.warn("Duplicate check without end user uuid | assetId={}", incident.getAssetId());
        }

        List<Incident> active = imRepository.getIncidents(criteria.build());
        if (CollectionUtils.isEmpty(active)) {
            return;
        }

        Incident existing = active.get(0); // newest first (ORDER BY createdtime DESC)
        log.info("Duplicate ticket blocked | existing={} status={} assetId={} incidentType={} channel={}",
                existing.getIncidentId(), existing.getApplicationStatus(), incident.getAssetId(),
                incident.getIncidentType(), incident.getEntryChannel());

        if (ENTRY_CHANNEL_IVR_WHATSAPP.equalsIgnoreCase(incident.getEntryChannel())) {
            throw new CustomException(
                    IVR_DUPLICATE_TICKET_CODE,
                    "A ticket already exists for this asset with the same issue: " + existing.getIncidentId()
                            + ". Current status: " + existing.getApplicationStatus()
            );
        }
        throw new CustomException(DUPLICATE_TICKET_CODE, DUPLICATE_TICKET_MESSAGE + existing.getIncidentId());
    }

    /**
     * The end user the ticket is raised for, i.e. what will be stored as {@code accountId}:
     * POC/IVR creates already set it to the facility COMPLAINANT; a direct web create is raised by the
     * logged-in end user, sent as {@code reporter.uuid}.
     */
    private String resolveEndUserUuid(IncidentRequest request) {
        Incident incident = request.getIncident();
        if (StringUtils.isNotBlank(incident.getAccountId())) {
            return incident.getAccountId().trim();
        }
        if (incident.getReporter() != null && StringUtils.isNotBlank(incident.getReporter().getUuid())) {
            return incident.getReporter().getUuid().trim();
        }
        RequestInfo requestInfo = request.getRequestInfo();
        if (requestInfo != null && requestInfo.getUserInfo() != null
                && StringUtils.isNotBlank(requestInfo.getUserInfo().getUuid()) && !isPocUser(requestInfo)
                && !isSystemUser(requestInfo)) {
            return requestInfo.getUserInfo().getUuid();
        }
        return null;
    }

    /** Compares the last 10 digits, so "+91 63617 82350" and "6361782350" match. */
    private static boolean samePhone(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        String da = a.replaceAll("\\D", "");
        String db = b.replaceAll("\\D", "");
        if (da.length() < 10 || db.length() < 10) {
            return false;
        }
        return da.substring(da.length() - 10).equals(db.substring(db.length() - 10));
    }

    private void enrichOnBehalfComplainant(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();

        incident.setCreatedOnBehalf(true);
        incident.setReporterType(ROLE_COMPLAINANT);

        if (requestInfo != null && requestInfo.getUserInfo() != null
                && StringUtils.isNotBlank(requestInfo.getUserInfo().getUuid())) {
            storeRaisedByPoc(incident, requestInfo.getUserInfo().getUuid());
        }

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                requestInfo,
                incident.getTenantId(),
                resolveFacilityBoundary(incident)
        );
        User reporter = userService.resolveReporterFromComplainant(
                complainant, requestInfo, incident.getTenantId());
        incident.setAccountId(reporter.getUuid());
        incident.setReporter(reporter);
    }

    /**
     * COMPLAINANT HRMS users are registered at facility boundary; incident boundary is asset-level.
     */
    private String resolveFacilityBoundary(Incident incident) {
        String assetBoundary = incident.getBoundaryCode();
        String assetId = incident.getAssetId();
        if (StringUtils.isNotBlank(assetBoundary) && StringUtils.isNotBlank(assetId)) {
            String suffix = "_" + assetId;
            if (assetBoundary.endsWith(suffix)) {
                return assetBoundary.substring(0, assetBoundary.length() - suffix.length());
            }
        }
        return assetBoundary;
    }

    private void storeRaisedByPoc(Incident incident, String pocUuid) {
        Map<String, Object> details = toMutableMap(incident.getAdditionalDetail());
        details.put(LIVELIHOOD_RAISED_BY_POC_DETAIL_KEY, pocUuid);
        incident.setAdditionalDetail(details);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMutableMap(Object additionalDetail) {
        if (additionalDetail == null) {
            return new HashMap<>();
        }
        if (additionalDetail instanceof Map<?, ?> map) {
            return new HashMap<>((Map<String, Object>) map);
        }
        return objectMapper.convertValue(additionalDetail, Map.class);
    }

    private boolean isPocUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> ROLE_LIVELIHOOD_POC.equalsIgnoreCase(code));
    }

    /**
     * LivelihoodIncident start state exposes two create paths:
     * CREATE for COMPLAINANT / LIVELIHOOD_POC, AUTO_ASSIGN for SYSTEM_USER (IVR/cron).
     * Vendor is still pre-assigned via workflow.assignes in both cases.
     */
    private String resolveCreateWorkflowAction(RequestInfo requestInfo) {
        if (isSystemUser(requestInfo)) {
            return LIVELIHOOD_WF_AUTO_ASSIGN;
        }
        return LIVELIHOOD_WF_CREATE;
    }

    private boolean isSystemUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> "SYSTEM_USER".equalsIgnoreCase(code));
    }
}
