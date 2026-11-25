package org.egov.amc.livelihood;

import org.egov.amc.livelihood.AmcMdmsOptions.Options;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.VendorOrgDirectory.OrgMember;
import org.egov.amc.livelihood.VendorOrgDirectory.VendorOrg;
import org.egov.amc.web.models.AmcConfiguration;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.egov.amc.livelihood.LivelihoodAmc.*;

/**
 * Livelihood rules for configuration/_create (LLD 07 §6.3), as a pure function of the request and the
 * looked-up facts. Every row is checked and every problem reported, so the caller can reject the whole
 * batch with one error per failing row (all or nothing).
 */
public final class LivelihoodAmcCreateValidator {

    private LivelihoodAmcCreateValidator() {
    }

    /** One problem on one row. */
    public record RowError(int index, String activityFacilityId, String field, String code, String message) {
    }

    /** What the server looked up for the batch. */
    public record Facts(String tenantId,
                        Map<String, InstallationRow> rows,
                        Set<String> runningActivityFacilityIds,
                        Map<String, VendorOrg> orgs,
                        Map<String, OrgMember> members,
                        Options options) {
    }

    public static List<RowError> validate(List<AmcConfiguration> request, Facts f) {
        List<RowError> errors = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < request.size(); i++) {
            AmcConfiguration c = request.get(i);
            String afId = blankToNull(c.getActivityFacilityId());

            if (c.getTenantId() == null || !c.getTenantId().equals(f.tenantId())) {
                errors.add(new RowError(i, afId, "tenantId", AMC_INVALID_TENANT, "tenantId must be " + f.tenantId()));
            }

            // Installation row
            InstallationRow row = null;
            if (afId == null) {
                errors.add(new RowError(i, null, "activityFacilityId", AMC_INVALID_ACTIVITY_FACILITY,
                        "activityFacilityId is required"));
            } else if (!seen.add(afId)) {
                errors.add(new RowError(i, afId, "activityFacilityId", DUPLICATE_AMC_CONFIGURATION,
                        "the same installation row appears twice in this request"));
            } else {
                row = f.rows().get(afId);
                if (row == null || !row.isSolar()) {
                    errors.add(new RowError(i, afId, "activityFacilityId", AMC_INVALID_ACTIVITY_FACILITY,
                            "not a SOLAR installation row (missing, deleted or a machine row)"));
                    row = null;
                } else if (f.runningActivityFacilityIds().contains(afId)) {
                    errors.add(new RowError(i, afId, "activityFacilityId", DUPLICATE_AMC_CONFIGURATION,
                            "this installation already has a running AMC"));
                }
            }

            // Frequency and duration (MDMS options; duration in months = years x 12, divisible by frequency)
            Integer freq = c.getVisitFrequencyMonths();
            Integer dur = c.getDurationMonths();
            boolean freqOk = freq != null && f.options().frequencyMonths().contains(freq);
            if (!freqOk) {
                errors.add(new RowError(i, afId, "visitFrequencyMonths", AMC_INVALID_FREQUENCY,
                        "frequency must be one of " + f.options().frequencyMonths() + " months"));
            }
            boolean durOk = dur != null && dur > 0 && dur % 12 == 0 && f.options().durationYears().contains(dur / 12);
            if (!durOk) {
                errors.add(new RowError(i, afId, "durationMonths", AMC_INVALID_DURATION,
                        "duration must be one of " + f.options().durationYears() + " years, in months"));
            } else if (freqOk && dur % freq != 0) {
                errors.add(new RowError(i, afId, "durationMonths", AMC_INVALID_DURATION,
                        "duration (" + dur + " months) is not a whole number of " + freq + "-month visits"));
            }

            // Vendor org and the one named AMC field staff
            String orgId = blankToNull(c.getVendorOrgId());
            VendorOrg org = orgId == null ? null : f.orgs().get(orgId);
            if (org == null || !org.isActiveVendor()) {
                errors.add(new RowError(i, afId, "vendorOrgId", AMC_INVALID_VENDOR_ORG,
                        "vendorOrgId must be an active vendor organisation"));
            } else {
                String userId = blankToNull(c.getAmcFieldStaffId());
                OrgMember member = userId == null ? null : f.members().get(VendorOrgDirectory.memberKey(orgId, userId));
                if (member == null || member.deleted()) {
                    errors.add(new RowError(i, afId, "amcFieldStaffId", AMC_FIELD_STAFF_NOT_IN_ORG,
                            "amcFieldStaffId must be a current member of the vendor organisation"));
                } else if (!member.hasRole(ROLE_AMC_FIELD_STAFF)) {
                    errors.add(new RowError(i, afId, "amcFieldStaffId", AMC_FIELD_STAFF_ROLE_MISSING,
                            "the field staff does not have the " + ROLE_AMC_FIELD_STAFF + " role"));
                }
            }

            // Start date: only on an already-approved row, never before the approval day (IST days)
            if (row != null) {
                Long start = c.getConfigurationStartDate();
                if (!row.isApproved()) {
                    if (isSet(start)) {
                        errors.add(new RowError(i, afId, "configurationStartDate", AMC_START_DATE_NOT_ALLOWED,
                                "the start date is set by the installation approval; leave it out"));
                    }
                } else if (row.completedAt() <= 0) {
                    errors.add(new RowError(i, afId, "activityFacilityId", AMC_INSTALLATION_APPROVAL_DATE_MISSING,
                            "the installation is approved but has no approval date"));
                } else if (!isSet(start)) {
                    errors.add(new RowError(i, afId, "configurationStartDate", AMC_START_DATE_REQUIRED,
                            "the installation is already approved: pick a start date on or after the approval date"));
                } else if (istDay(start).isBefore(istDay(row.completedAt()))) {
                    errors.add(new RowError(i, afId, "configurationStartDate", AMC_START_BEFORE_INSTALLATION,
                            "the start date is before the installation approval date " + istDay(row.completedAt())));
                }
            }
        }
        return errors;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
