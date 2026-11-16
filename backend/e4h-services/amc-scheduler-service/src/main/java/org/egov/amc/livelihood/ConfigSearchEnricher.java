package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.util.BoundaryLocalizationUtil;
import org.egov.amc.util.BoundaryUtil;
import org.egov.amc.util.FacilityPocPhoneUtil;
import org.egov.amc.util.MappedVendorUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.Boundary;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.User;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Config search enrichment for Livelihood (LLD §6.9): end user name and phone (decrypted), state/district/block names,
 * installationApprovedDate (the SOLAR row's completed_at, read live), vendor name and the field staff. Every look-up is
 * one batched call per page (E4H called vendor-registry once per row); a failed look-up leaves its fields empty.
 */
@Slf4j
@Component
public class ConfigSearchEnricher {

    private final VendorOrgDirectory vendors;
    private final MappedVendorUtil hrms;
    private final FacilityPocPhoneUtil phones;
    private final BoundaryUtil boundaries;
    private final BoundaryLocalizationUtil boundaryNames;
    private final InstallationRowClient installationRows;

    public ConfigSearchEnricher(VendorOrgDirectory vendors, MappedVendorUtil hrms, FacilityPocPhoneUtil phones, BoundaryUtil boundaries,
                                BoundaryLocalizationUtil boundaryNames, InstallationRowClient installationRows) {
        this.vendors = vendors;
        this.hrms = hrms;
        this.phones = phones;
        this.boundaries = boundaries;
        this.boundaryNames = boundaryNames;
        this.installationRows = installationRows;
    }

    public void enrich(List<AmcConfiguration> configs, String tenantId, RequestInfo requestInfo) {
        if (configs == null || configs.isEmpty()) {
            return;
        }
        endUsers(configs);
        safely("boundary names", () -> boundaryNames(configs, requestInfo));
        safely("vendor names", () -> {
            Map<String, VendorOrgDirectory.VendorOrg> orgs = vendors.findOrgs(
                    configs.stream().map(AmcConfiguration::getVendorId).filter(Objects::nonNull).toList(), tenantId, requestInfo);
            configs.forEach(c -> {
                VendorOrgDirectory.VendorOrg o = c.getVendorId() == null ? null : orgs.get(c.getVendorId());
                c.setVendorName(o != null ? o.name() : null);
            });
        });
        safely("field staff", () -> {
            List<String> uuids = configs.stream().map(LivelihoodAmcEditPlanner::activeFieldStaff).filter(Objects::nonNull).distinct().toList();
            Map<String, User> users = uuids.isEmpty() ? Map.of() : hrms.getFieldStaffByUuid(requestInfo, uuids, LivelihoodAmc.ROLE_AMC_FIELD_STAFF);
            configs.forEach(c -> c.setFieldStaff(fieldStaff(LivelihoodAmcEditPlanner.activeFieldStaff(c), users)));
        });
        safely("installation approval dates", () -> {
            Map<String, InstallationRowClient.InstallationRow> rows = installationRows.findByIds(
                    configs.stream().map(AmcConfiguration::getActivityFacilityId).filter(Objects::nonNull).distinct().toList(), tenantId, requestInfo);
            configs.forEach(c -> {
                InstallationRowClient.InstallationRow r = c.getActivityFacilityId() == null ? null : rows.get(c.getActivityFacilityId());
                c.setInstallationApprovedDate(r != null && r.completedAt() > 0 ? r.completedAt() : null);
            });
        });
    }

    private void endUsers(List<AmcConfiguration> configs) {
        for (AmcConfiguration c : configs) {
            Facility f = c.getFacility();
            if (f == null) {
                continue;
            }
            c.setEndUserName(f.getFacilityName());
            try {
                phones.decryptPocPhoneIfPresent(f);
                c.setEndUserPhone(FacilityPocPhoneUtil.isEncrypted(f.getFacilityPocPhone()) ? null : f.getFacilityPocPhone());
            } catch (RuntimeException e) {
                log.warn("End user phone not decrypted for AMC {}: {}", c.getId(), e.getMessage());
            }
        }
    }

    private void boundaryNames(List<AmcConfiguration> configs, RequestInfo requestInfo) {
        Map<String, Boundary> byCode = boundaries.getBoundaryByCode();
        if (byCode == null || byCode.isEmpty()) {
            return;
        }
        Set<String> codes = new LinkedHashSet<>();
        for (AmcConfiguration c : configs) {
            Boundary b = boundaryOf(c, byCode);
            if (b != null) {
                java.util.stream.Stream.of(b.getState(), b.getDistrict(), b.getBlock()).filter(Objects::nonNull).forEach(codes::add);
            }
        }
        Map<String, String> names = boundaryNames.localizeBoundaryCodes(codes, requestInfo);
        for (AmcConfiguration c : configs) {
            Boundary b = boundaryOf(c, byCode);
            if (b != null) {
                c.setState(boundaryNames.localizedNameOrCode(names, b.getState()));
                c.setDistrict(boundaryNames.localizedNameOrCode(names, b.getDistrict()));
                c.setBlock(boundaryNames.localizedNameOrCode(names, b.getBlock()));
            }
        }
    }

    private static Boundary boundaryOf(AmcConfiguration c, Map<String, Boundary> byCode) {
        return c.getFacility() == null || c.getFacility().getBoundaryCode() == null ? null : byCode.get(c.getFacility().getBoundaryCode());
    }

    static Map<String, Object> fieldStaff(String uuid, Map<String, User> users) {
        if (uuid == null) {
            return null;
        }
        User u = users.get(uuid);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("uuid", uuid);
        m.put("name", u != null ? u.getName() : null);
        m.put("mobile", u != null ? u.getMobileNumber() : null);
        return m;
    }

    private static void safely(String what, Runnable r) {
        try {
            r.run();
        } catch (RuntimeException e) {
            log.warn("Config search: {} not filled: {}", what, e.getMessage());
        }
    }
}
