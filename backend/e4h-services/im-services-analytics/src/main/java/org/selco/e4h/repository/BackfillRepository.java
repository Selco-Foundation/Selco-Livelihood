package org.selco.e4h.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.selco.e4h.repository.querybuilder.BackfillQueryBuilder;
import org.selco.e4h.web.models.TicketBackfillRow;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Slf4j
@Repository
@RequiredArgsConstructor
public class BackfillRepository {

    private final BackfillQueryBuilder queryBuilder;
    private final JdbcTemplate jdbcTemplate;

    public int countIncidents() {
        Integer count = jdbcTemplate.queryForObject(queryBuilder.getIncidentCountQuery(), Integer.class);
        return count == null ? 0 : count;
    }

    /** One page of incidents, ordered by incident id so paging does not skip or repeat rows. */
    public List<TicketBackfillRow> getTicketBackfillRows(int limit, int offset) {
        return jdbcTemplate.query(
                queryBuilder.getTicketBackfillQuery(),
                (rs, rowNum) -> new TicketBackfillRow(
                        rs.getString("incidentid"),
                        rs.getString("facilityid"),
                        rs.getString("facility_category"),
                        rs.getString("facility_poc_name"),
                        rs.getBoolean("is_reopened")),
                limit, offset);
    }
}
