package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.LivelihoodReportPdfData.Input;
import org.egov.amc.livelihood.LivelihoodReportPdfData.Step;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.amc.util.BoundaryLocalizationUtil;
import org.egov.amc.util.BoundaryUtil;
import org.egov.amc.validator.AmcConfigurationValidator;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationSearchCriteria;
import org.egov.amc.web.models.AmcConfigurationSearchRequest;
import org.egov.amc.web.models.Boundary;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.VisitReport;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.models.project.Project;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * The one place every report step makes its PDF (LLD §6.10): submit/resubmit, code verification, approve, reject.
 * Strict: no file back from pdf-service means {@code AMC_PDF_GENERATION_FAILED}, and the caller saves nothing.
 * Name look-ups (vendor, project, boundary, site details) are best-effort: a failed look-up prints "-" rather than failing the step.
 */
@Service
@Slf4j
public class LivelihoodReportPdfService {

    public static final String AMC_PDF_GENERATION_FAILED = "AMC_PDF_GENERATION_FAILED";

    private final AMCServiceConfiguration config;
    private final ServiceRequestRepository requestRepository;
    private final AmcConfigurationRepository configurationRepository;
    private final VendorOrgDirectory vendors;
    private final AmcConfigurationValidator projects;
    private final BoundaryUtil boundaryUtil;
    private final BoundaryLocalizationUtil boundaryNames;
    private final SiteDetailsReader siteDetailsReader;
    private final ObjectMapper mapper;

    public LivelihoodReportPdfService(AMCServiceConfiguration config, ServiceRequestRepository requestRepository,
                                      AmcConfigurationRepository configurationRepository, VendorOrgDirectory vendors,
                                      AmcConfigurationValidator projects, BoundaryUtil boundaryUtil,
                                      BoundaryLocalizationUtil boundaryNames, SiteDetailsReader siteDetailsReader,
                                      @Qualifier("objectMapper") ObjectMapper mapper) {
        this.config = config;
        this.requestRepository = requestRepository;
        this.configurationRepository = configurationRepository;
        this.vendors = vendors;
        this.projects = projects;
        this.boundaryUtil = boundaryUtil;
        this.boundaryNames = boundaryNames;
        this.siteDetailsReader = siteDetailsReader;
        this.mapper = mapper;
    }

    public boolean enabled() {
        return config.isAmcPdfEnabled();
    }

    /**
     * Makes the PDF for one step and returns its fileStoreId, or null when {@code amc.pdf.enabled=false}.
     *
     * @param fieldStaffName shown in the header; the caller knows it (submitter on submit, assignee later)
     */
    public String generate(RequestInfo requestInfo, ScheduledVisit visit, VisitReport report, Facility facility,
                           String fieldStaffName, Step step) {
        if (!enabled()) {
            log.info("AMC report PDF switched off (amc.pdf.enabled=false); visit {} step {}", visit.getId(), step.action());
            return null;
        }
        Map<String, Object> amc = buildData(requestInfo, visit, report, facility, fieldStaffName, step);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", withLocale(requestInfo));
        body.put("amc", amc);
        StringBuilder url = new StringBuilder(config.getPdfServiceHost()).append(config.getPdfServiceCreateUrl())
                .append("?key=").append(config.getAmcPdfKey()).append("&tenantId=").append(visit.getTenantId());
        Object response;
        try {
            response = requestRepository.fetchResult(url, body);
        } catch (RuntimeException e) {
            log.error("pdf-service call failed for visit {} step {}", visit.getId(), step.action(), e);
            throw new CustomException(AMC_PDF_GENERATION_FAILED, "Could not make the AMC report PDF. Please try again.");
        }
        String fileStoreId = fileStoreId(mapper.valueToTree(response));
        if (fileStoreId == null) {
            log.error("pdf-service returned no filestoreId for visit {} step {}", visit.getId(), step.action());
            throw new CustomException(AMC_PDF_GENERATION_FAILED, "Could not make the AMC report PDF. Please try again.");
        }
        log.info("AMC report PDF made for visit {} step {}: {}", visit.getId(), step.action(), fileStoreId);
        return fileStoreId;
    }

    Map<String, Object> buildData(RequestInfo requestInfo, ScheduledVisit visit, VisitReport report, Facility facility,
                                  String fieldStaffName, Step step) {
        AmcConfiguration cfg = configuration(visit);
        Facility site = facility != null ? facility : visit.getFacility();
        String projectId = visit.getProjectId() != null ? visit.getProjectId() : (cfg != null ? cfg.getProjectId() : null);

        String[] names = boundary(site, requestInfo);
        return LivelihoodReportPdfData.build(new Input(visit, report, site, cfg,
                vendorName(visit, cfg, requestInfo), projectName(projectId, visit.getTenantId(), requestInfo),
                names[0], names[1], names[2], fieldStaffName, fieldStaffMobile(visit),
                siteDetails(cfg != null ? cfg.getActivityFacilityId() : null), step));
    }

    private static String fieldStaffMobile(ScheduledVisit visit) {
        Map<String, Object> staff = VisitReadFields.fieldStaff(visit);
        return staff == null ? null : (String) staff.get("mobile");
    }

    /** Installation date, PIN code and purchase order number; empty when unknown. */
    private Map<String, Object> siteDetails(String activityFacilityId) {
        if (activityFacilityId == null) {
            return Map.of();
        }
        try {
            return siteDetailsReader.read(List.of(activityFacilityId)).getOrDefault(activityFacilityId, Map.of());
        } catch (RuntimeException e) {
            log.warn("AMC PDF: site details look-up failed for {}: {}", activityFacilityId, e.getMessage());
            return Map.of();
        }
    }

    /** The visit's AMC; null when it has none. */
    AmcConfiguration configuration(ScheduledVisit visit) {
        return visit.getAmcConfiguration() != null ? visit.getAmcConfiguration()
                : loadConfiguration(visit.getAmcConfigurationId(), visit.getTenantId());
    }

    /** Includes turned-off AMCs: a reviewer may act on a report after the AMC was cancelled. */
    private AmcConfiguration loadConfiguration(String configurationId, String tenantId) {
        if (configurationId == null) {
            return null;
        }
        AmcConfigurationSearchRequest request = AmcConfigurationSearchRequest.builder()
                .searchCriteria(AmcConfigurationSearchCriteria.builder().tenantId(tenantId).ids(List.of(configurationId)).build())
                .build();
        List<AmcConfiguration> found = configurationRepository.getAmcConfiguration(request, 1, 0, tenantId, true, null);
        return found == null || found.isEmpty() ? null : found.get(0);
    }

    /** The visit's vendor organisation, else the AMC's; null when unknown. */
    String vendorName(ScheduledVisit visit, AmcConfiguration cfg, RequestInfo requestInfo) {
        String orgId = visit.getVendorId() != null ? visit.getVendorId() : (cfg != null ? cfg.getVendorId() : null);
        String tenantId = visit.getTenantId();
        if (orgId == null) {
            return null;
        }
        try {
            VendorOrgDirectory.VendorOrg org = vendors.findOrgs(List.of(orgId), tenantId, requestInfo).get(orgId);
            return org != null ? org.name() : null;
        } catch (RuntimeException e) {
            log.warn("AMC PDF: vendor name look-up failed for {}: {}", orgId, e.getMessage());
            return null;
        }
    }

    private String projectName(String projectId, String tenantId, RequestInfo requestInfo) {
        if (projectId == null) {
            return null;
        }
        try {
            Project p = projects.getProjectById(requestInfo, projectId, tenantId);
            return p == null ? null : (p.getName() != null ? p.getName() : p.getProjectNumber());
        } catch (RuntimeException e) {
            log.warn("AMC PDF: project look-up failed for {}: {}", projectId, e.getMessage());
            return null;
        }
    }

    /** {state, district, block} names; the code itself when a name is missing; nulls when unknown. */
    public String[] boundary(Facility site, RequestInfo requestInfo) {
        String[] out = new String[3];
        try {
            Map<String, Boundary> byCode = site == null || site.getBoundaryCode() == null ? null : boundaryUtil.getBoundaryByCode();
            Boundary b = byCode == null ? null : byCode.get(site.getBoundaryCode());
            if (b == null) {
                return out;
            }
            List<String> codes = Stream.of(b.getState(), b.getDistrict(), b.getBlock()).filter(Objects::nonNull).toList();
            Map<String, String> names = boundaryNames.localizeBoundaryCodes(codes, requestInfo);
            out[0] = boundaryNames.localizedNameOrCode(names, b.getState());
            out[1] = boundaryNames.localizedNameOrCode(names, b.getDistrict());
            out[2] = boundaryNames.localizedNameOrCode(names, b.getBlock());
        } catch (RuntimeException e) {
            log.warn("AMC PDF: boundary look-up failed for {}: {}", site != null ? site.getBoundaryCode() : null, e.getMessage());
        }
        return out;
    }

    /**
     * pdf-service reads the locale with {@code RequestInfo.msgId.split('|')[1]} and fails with
     * "Cannot read property 'split' of undefined" when msgId is missing (dev, 2026-11-16). The system
     * user's RequestInfo (auto-approval) has none, so always send "<msgId>|<locale>".
     */
    @SuppressWarnings("unchecked")
    Map<String, Object> withLocale(RequestInfo requestInfo) {
        Map<String, Object> ri = requestInfo == null ? new HashMap<>() : new HashMap<>(mapper.convertValue(requestInfo, Map.class));
        Object msgId = ri.get("msgId");
        String id = msgId == null || String.valueOf(msgId).isBlank() ? String.valueOf(System.currentTimeMillis()) : String.valueOf(msgId);
        if (!id.contains("|")) {
            id = id + "|" + PDF_LOCALE;
        }
        ri.put("msgId", id);
        return ri;
    }

    static final String PDF_LOCALE = "en_IN";

    static String fileStoreId(JsonNode response) {
        JsonNode ids = response == null ? null : response.get("filestoreIds");
        if (ids != null && ids.isArray() && !ids.isEmpty() && !ids.get(0).asText("").isBlank()) {
            return ids.get(0).asText();
        }
        return null;
    }
}
