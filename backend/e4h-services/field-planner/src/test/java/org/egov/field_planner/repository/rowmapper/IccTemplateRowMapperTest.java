package org.egov.field_planner.repository.rowmapper;

import org.egov.field_planner.web.models.IccTemplate;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IccTemplateRowMapperTest {

    private final IccTemplateRowMapper mapper = new IccTemplateRowMapper();

    private static ResultSet row(String systemType) throws SQLException {
        ResultSet row = mock(ResultSet.class);
        when(row.getString("icc_solutionCode")).thenReturn("202526PASF0000390");
        when(row.getString("icc_fileStoreId")).thenReturn("file-1");
        when(row.getString("icc_systemType")).thenReturn(systemType);
        return row;
    }

    @Test
    void readsTheSystemType() throws SQLException {
        IccTemplate template = mapper.mapRow(row("AC"), 0);
        assertEquals("AC", template.getSystemType());
        assertEquals("202526PASF0000390", template.getSolutionCode());
        assertEquals("file-1", template.getFileStoreId());
    }

    @Test
    void solutionWithoutASystemTypeHasNone() throws SQLException {
        assertNull(mapper.mapRow(row(null), 0).getSystemType());
    }
}
