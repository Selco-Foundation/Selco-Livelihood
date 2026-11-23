package org.egov.asset.web.validator;

import org.egov.asset.service.AssetService;
import org.egov.asset.service.LivelihoodSystemResolver;
import org.egov.asset.util.FacilityUtil;
import org.egov.asset.util.MdmsUtil;
import org.egov.asset.web.models.Asset;
import org.egov.asset.web.models.AssetCreate;
import org.egov.asset.web.models.AssetCreateRequest;
import org.egov.common.contract.request.RequestInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Where the validator applies the system type; the rule itself is in LivelihoodSystemResolverTest. */
class AssetValidatorSystemTest {

    private final MdmsUtil mdms = mock(MdmsUtil.class);
    private final AssetService assets = mock(AssetService.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final FacilityUtil facilities = mock(FacilityUtil.class);
    private final AssetValidator validator = new AssetValidator(mdms, facilities, assets, new LivelihoodSystemResolver(mdms, jdbc));

    @BeforeEach
    void solutionIsAc() {
        when(mdms.getSystemCodes(any(), anyString())).thenReturn(Set.of("AC", "DC"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq("af-1"), eq("livelihood"))).thenReturn(List.of("AC"));
    }

    private static Asset asset(String type, String system) {
        return Asset.builder().tenantId("livelihood").facilityID("ED/1").activityFacilityID("af-1").vendorId("v")
                .assetTypeID(type).serialNumber("s-" + type).system(system).build();
    }

    private static AssetCreateRequest request(Asset asset) {
        return AssetCreateRequest.builder().requestInfo(new RequestInfo()).assetDetail(AssetCreate.builder().asset(asset).build()).build();
    }

    /** Only the system value matters here; the checks after it (facility lookups) are not under test. */
    private void create(Asset asset) {
        try {
            validator.validateCreateAsset(request(asset));
        } catch (org.egov.tracer.model.CustomException e) {
            if (String.valueOf(e.getErrors()).contains("does not match parent")) {
                throw e;
            }
        }
    }

    @Test
    void solarWithUnitsAsTheAppSendsIt() {
        Asset solar = asset("SOLAR", "SOLAR");
        Asset panel = asset("PANEL", null);
        Asset battery = asset("BATTERY", null);
        solar.setChildren(new ArrayList<>(List.of(panel, battery)));
        create(solar);
        assertEquals(List.of("AC", "AC", "AC"), List.of(solar.getSystem(), panel.getSystem(), battery.getSystem()));
    }

    @Test
    void machineAsTheAppSendsIt() {
        Asset machine = asset("MACHINE", "LIVELIHOOD");
        create(machine);
        assertEquals("AC", machine.getSystem());
    }

    @Test
    void unitAddedLaterTakesItsParentsValue() {
        for (String parentSystem : List.of("AC", "SOLAR")) {
            when(assets.searchAssets(any(), anyInt(), anyInt())).thenReturn(List.of(asset("SOLAR", parentSystem)), List.of());
            Asset panel = asset("PANEL", "DC");
            panel.setParentId("Ast/1");
            create(panel);
            assertEquals(parentSystem, panel.getSystem());
        }
    }

    @Test
    void updateCorrectsAnOldValueAndKeepsAListedOne() {
        Asset stored = asset("MACHINE", "LIVELIHOOD");
        stored.setAssetId("Ast/1");
        when(assets.searchAssets(any(), anyInt(), anyInt())).thenReturn(List.of(stored));
        assertEquals("AC", update(null), "approval sends no system: the stored LIVELIHOOD is corrected");
        assertEquals("AC", update("SOLAR"), "the app writes its fixed value back");
        assertEquals("DC", update("DC"));
    }

    private String update(String sent) {
        Asset asset = Asset.builder().tenantId("livelihood").assetId("Ast/1").system(sent).build();
        try {
            validator.validateAsset("Ast/1", request(asset));
        } catch (org.egov.tracer.model.CustomException ignored) {
            // facility lookup, not under test
        }
        return asset.getSystem();
    }

    @Test
    void otherTenantsAreUntouched() {
        Asset e4h = asset("MACHINE", "SOLAR");
        e4h.setTenantId("in");
        try {
            validator.validateCreateAsset(request(e4h));
        } catch (RuntimeException ignored) {
            // E4H's own validation
        }
        assertEquals("SOLAR", e4h.getSystem());
        verify(mdms, never()).getSystemCodes(any(), any());
    }
}
