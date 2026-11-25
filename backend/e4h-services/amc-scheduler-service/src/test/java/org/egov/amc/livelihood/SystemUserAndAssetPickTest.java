package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.common.contract.request.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** Response shapes captured from dev on 2026-11-16. */
class SystemUserAndAssetPickTest {

    static JsonNode json(String s) throws Exception {
        return new ObjectMapper().readTree(s.replace('\'', '"'));
    }

    @Test
    void picksTheCronjobAccountHoldingSystemUserOnTheTenant() throws Exception {
        // dev has two accounts named CRONJOB: an EMPLOYEE with SYSTEM only, and a SYSTEM one with SYSTEM_USER
        User u = SystemUserProvider.pick(json("{'user':["
                + "{'userName':'CRONJOB','uuid':'9186','type':'EMPLOYEE','active':true,'roles':[{'code':'SYSTEM','tenantId':'livelihood'}]},"
                + "{'userName':'CRONJOB','uuid':'a0f7','type':'SYSTEM','active':true,'roles':[{'code':'SYSTEM_USER','tenantId':'livelihood'},{'code':'SYSTEM','tenantId':'livelihood'}]}]}"),
                "livelihood");
        assertEquals("a0f7", u.getUuid());
        assertEquals("SYSTEM", u.getType());
        assertEquals(2, u.getRoles().size());
    }

    @Test
    void noSystemUserOnTheTenantMeansNone() throws Exception {
        assertNull(SystemUserProvider.pick(json("{'user':[{'uuid':'x','roles':[{'code':'SYSTEM_USER','tenantId':'in'}]}]}"), "livelihood"));
        assertNull(SystemUserProvider.pick(json("{'user':[{'uuid':'x','active':false,'roles':[{'code':'SYSTEM_USER','tenantId':'livelihood'}]}]}"), "livelihood"));
        assertNull(SystemUserProvider.pick(json("{'user':[]}"), "livelihood"));
    }

    @Test
    void solarAssetIsTheTopLevelSolarAsset() throws Exception {
        assertEquals("Ast/2026/0150", SolarAssetClient.pickSolar(json("["
                + "{'assetId':'Ast/2026/0153','assetTypeID':'PANEL','parentId':'Ast/2026/0150','isActive':true},"
                + "{'assetId':'Ast/2026/0150','assetTypeID':'SOLAR','parentId':null,'isActive':true},"
                + "{'assetId':'Ast/2026/0151','assetTypeID':'BATTERY','parentId':'Ast/2026/0150','isActive':true}]")));
        // older rows: loose components only, no SOLAR asset
        assertNull(SolarAssetClient.pickSolar(json("[{'assetId':'Ast/2026/0086','assetTypeID':'PANEL','parentId':null},"
                + "{'assetId':'Ast/2026/0082','assetTypeID':'BATTERY','parentId':null}]")));
        assertNull(SolarAssetClient.pickSolar(json("[]")));
        assertNull(SolarAssetClient.pickSolar(json("[{'assetId':'x','assetTypeID':'SOLAR','parentId':null,'isActive':false}]")));
    }
}
