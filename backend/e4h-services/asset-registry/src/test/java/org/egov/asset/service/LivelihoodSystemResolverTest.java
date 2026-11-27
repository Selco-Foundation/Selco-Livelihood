package org.egov.asset.service;

import org.egov.asset.util.MdmsUtil;
import org.egov.asset.web.models.Asset;
import org.egov.common.contract.request.RequestInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LivelihoodSystemResolverTest {

    private final MdmsUtil mdms = mock(MdmsUtil.class);
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final LivelihoodSystemResolver resolver = new LivelihoodSystemResolver(mdms, jdbc);
    private final RequestInfo requestInfo = new RequestInfo();

    @BeforeEach
    void types() {
        when(mdms.getSystemCodes(any(), anyString())).thenReturn(Set.of("AC", "DC"));
        solutionType("AC");
    }

    private void solutionType(String... types) {
        when(jdbc.queryForList(anyString(), eq(String.class), eq("af-1"), eq("livelihood"))).thenReturn(Arrays.asList(types));
    }

    private static Asset asset(String system) {
        return Asset.builder().tenantId("livelihood").activityFacilityID("af-1").system(system).build();
    }

    private String resolved(String sent) {
        Asset asset = asset(sent);
        resolver.resolve(asset, requestInfo);
        return asset.getSystem();
    }

    @Test
    void listedTypeIsKeptAsSentWithoutLookingAtTheSolution() {
        assertEquals("AC", resolved("AC"));
        assertEquals("DC", resolved("DC"), "the Solution is AC, but a listed type is saved as sent");
        verifyNoInteractions(jdbc);
    }

    @Test
    void anythingElseComesFromTheSolution() {
        for (String sent : new String[]{"SOLAR", "LIVELIHOOD", "", " ", null, "ac"}) {
            assertEquals("AC", resolved(sent), "sent " + sent);
        }
    }

    @Test
    void newTypeAddedInMdmsIsKept() {
        when(mdms.getSystemCodes(any(), anyString())).thenReturn(Set.of("AC", "DC", "HYBRID"));
        assertEquals("HYBRID", resolved("HYBRID"));
    }

    @Test
    void staysAsSentWhenTheSolutionGivesNothing() {
        solutionType((String) null);
        assertEquals("SOLAR", resolved("SOLAR"));
        solutionType();
        assertEquals("LIVELIHOOD", resolved("LIVELIHOOD"));
        assertNull(resolved(null));
        Asset bulkSheet = Asset.builder().tenantId("livelihood").system("LIVELIHOOD").build();
        resolver.resolve(bulkSheet, requestInfo);
        assertEquals("LIVELIHOOD", bulkSheet.getSystem(), "no installation");
    }

    @Test
    void mdmsDownFallsBackToTheSolution() {
        when(mdms.getSystemCodes(any(), anyString())).thenThrow(new RuntimeException("down"));
        assertEquals("AC", resolved("DC"));
        solutionType();
        assertEquals("DC", resolved("DC"));
    }

    @Test
    void databaseErrorNeverFailsTheRequest() {
        when(jdbc.queryForList(anyString(), eq(String.class), any(), any())).thenThrow(new RuntimeException("no such table"));
        assertEquals("SOLAR", resolved("SOLAR"));
    }

    @Test
    void unitsGetTheSameValue() {
        Asset parent = asset("SOLAR");
        Asset unit = asset(null);
        Asset other = asset("SOLAR");
        parent.setChildren(Arrays.asList(unit, null, other));
        resolver.resolveWithUnits(parent, requestInfo);
        assertEquals(List.of("AC", "AC", "AC"), List.of(parent.getSystem(), unit.getSystem(), other.getSystem()));
    }

    @Test
    void typesAreCached() {
        resolved("AC");
        resolved("DC");
        verify(mdms, times(1)).getSystemCodes(any(), anyString());
    }

    @Test
    void emptyListIsNotCached() {
        when(mdms.getSystemCodes(any(), anyString())).thenReturn(Set.of(), Set.of("DC"));
        assertEquals("AC", resolved("DC"));
        assertEquals("DC", resolved("DC"));
    }
}
