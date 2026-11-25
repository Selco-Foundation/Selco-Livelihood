package org.egov.amc.repository.querybuilder;

import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.common.contract.request.Role;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScheduledVisitQueryBuilderTest {

    private static ScheduledVisitQueryBuilder builder() {
        AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
        when(config.getSearchSeeAllRoles()).thenReturn(List.of("PROJECT_MANAGER", "AMC_REVIEWER", "SYSTEM_USER"));
        return new ScheduledVisitQueryBuilder(config);
    }

    private static Role role(String code) {
        return Role.builder().code(code).tenantId("livelihood").build();
    }

    /** E4H let only PROJECT_MANAGER see all visits, which hid every report from reviewers (LLD §6.2). */
    @Test
    void reviewerSystemUserAndPmSeeAllVisits() {
        ScheduledVisitQueryBuilder b = builder();
        assertTrue(b.hasSeeAllRole(List.of(role("EMPLOYEE"), role("AMC_REVIEWER"))));
        assertTrue(b.hasSeeAllRole(List.of(role("SYSTEM_USER"))));
        assertTrue(b.hasSeeAllRole(List.of(role("project_manager"))));
    }

    @Test
    void fieldStaffIsScopedToOwnVisits() {
        ScheduledVisitQueryBuilder b = builder();
        assertFalse(b.hasSeeAllRole(List.of(role("EMPLOYEE"), role("AMC_FIELD_STAFF"))));
        assertFalse(b.hasSeeAllRole(List.of()));
        assertFalse(b.hasSeeAllRole(null));
        assertFalse(b.hasSeeAllRole(List.of(role(null))));
    }
}
