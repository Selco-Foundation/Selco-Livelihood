package org.egov.field_planner.repository.rowmapper;

import org.egov.field_planner.web.models.IccTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.SQLException;

@Component
public class IccTemplateRowMapper implements RowMapper<IccTemplate> {

    @Override
    public IccTemplate mapRow(ResultSet resultSet, int rowNum) throws SQLException {
        return IccTemplate.builder()
                .id(resultSet.getString("icc_id"))
                .tenantId(resultSet.getString("icc_tenantId"))
                .solutionCode(resultSet.getString("icc_solutionCode"))
                .solutionName(resultSet.getString("icc_solutionName"))
                .fileStoreId(resultSet.getString("icc_fileStoreId"))
                .build();
    }
}
