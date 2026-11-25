package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.VendorOrgDirectory.OrgMember;
import org.egov.amc.livelihood.VendorOrgDirectory.VendorOrg;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Parsers for the three look-ups, with response shapes captured from dev on 2026-11-16. */
class LivelihoodLookupParsersTest {

    static final ObjectMapper M = new ObjectMapper();

    static JsonNode json(String s) throws Exception {
        return M.readTree(s.replace('\'', '"'));
    }

    @Test
    void installationRows() throws Exception {
        Map<String, InstallationRow> rows = InstallationRowClient.parse(json("{'totalCount':3,'facility':["
                + "{'activityFacility':{'id':'7c9e','tenantId':'livelihood','facilityId':'ED/2026/0027','fieldPlanId':'fp1',"
                + "'fieldPlan':{'projectId':'fa06'},'componentType':'SOLAR','status':'APPROVED_BY_QC_SPOC','completedAt':1793006953267,'isDeleted':null}},"
                + "{'activityFacility':{'id':'6799','facilityId':'ED/2026/0039','fieldPlanId':'fp2','fieldPlan':{'projectId':'8d46'},"
                + "'componentType':'SOLAR','status':'SUBMITTED_BY_FIELD_STAFF','completedAt':0}},"
                + "{'activityFacility':{'id':'gone','componentType':'SOLAR','isDeleted':true}}]}"));
        assertEquals(2, rows.size(), "deleted rows are dropped");
        InstallationRow a = rows.get("7c9e");
        assertEquals("ED/2026/0027", a.facilityId());
        assertEquals("fa06", a.projectId());
        assertTrue(a.isSolar());
        assertTrue(a.isApproved());
        assertEquals(1793006953267L, a.completedAt());
        InstallationRow b = rows.get("6799");
        assertFalse(b.isApproved());
        assertEquals(0L, b.completedAt());
        assertTrue(InstallationRowClient.parse(json("{'facility':[]}")).isEmpty());
        assertTrue(InstallationRowClient.parse(null).isEmpty());
    }

    @Test
    void vendorOrgs() throws Exception {
        Map<String, VendorOrg> orgs = VendorOrgDirectory.parseOrgs(json("{'organisations':["
                + "{'id':'e768','name':'KhushVendor','isActive':true,'orgType':'VENDOR'},"
                + "{'id':'78e6','name':'khushPlatform','isActive':true,'orgType':'PLATFORM'}]}"));
        assertTrue(orgs.get("e768").isActiveVendor());
        assertFalse(orgs.get("78e6").isActiveVendor());
    }

    @Test
    void orgMembersWithRoles() throws Exception {
        Map<String, OrgMember> members = VendorOrgDirectory.parseMembers(json("{'OrgUsers':["
                + "{'userId':'e918','organizationId':'e768','isDeleted':false,'roles':[{'code':'EMPLOYEE'},{'code':'AMC_FIELD_STAFF'}]},"
                + "{'userId':'45a3','organizationId':'e768','isDeleted':true,'roles':[{'code':'VENDOR_ADMIN'}]},"
                + "{'userId':'dup','organizationId':'e768','isDeleted':true,'roles':[]},"
                + "{'userId':'dup','organizationId':'e768','isDeleted':false,'roles':[{'code':'AMC_FIELD_STAFF'}]}],'TotalCount':4}"));
        OrgMember fs = members.get(VendorOrgDirectory.memberKey("e768", "e918"));
        assertTrue(fs.hasRole("AMC_FIELD_STAFF"));
        assertFalse(fs.deleted());
        assertTrue(members.get(VendorOrgDirectory.memberKey("e768", "45a3")).deleted());
        assertFalse(members.get(VendorOrgDirectory.memberKey("e768", "dup")).deleted(), "a live membership wins");
    }

    @Test
    void mdmsOptions() throws Exception {
        AmcMdmsOptions.Options o = AmcMdmsOptions.parse(json("{'MdmsRes':{'AMC':{"
                + "'Frequency':[{'code':'SIX_MONTHS','months':6,'active':true},{'code':'ONE_YEAR','months':12,'active':true},{'code':'OLD','months':3,'active':false}],"
                + "'Duration':[{'code':'ONE_YEAR','years':1,'active':true},{'code':'TWO_YEARS','years':2,'active':true}]}}}"));
        assertEquals(Set.of(6, 12), o.frequencyMonths());
        assertEquals(Set.of(1, 2), o.durationYears());
        assertTrue(AmcMdmsOptions.parse(json("{'MdmsRes':{}}")).frequencyMonths().isEmpty());
    }
}
