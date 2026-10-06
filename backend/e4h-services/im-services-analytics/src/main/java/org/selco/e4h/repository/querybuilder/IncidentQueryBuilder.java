package org.selco.e4h.repository.querybuilder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class IncidentQueryBuilder {

    private static final String CLOSED_STATUSES =
            "'RESOLVED', 'CLOSED_AFTER_RESOLUTION', 'CLOSED_AFTER_DECLINE'";

    private static final String STATUS_COUNT_QUERY =
            "SELECT " +
                    "    facilityid, " +
                    "    COUNT(*) AS total_occurrences, " +
                    "    SUM(CASE WHEN applicationstatus NOT IN (" +
                    "        " + CLOSED_STATUSES + ") " +
                    "    THEN 1 ELSE 0 END) AS total_open_occurrences, " +
                    "    SUM(CASE WHEN applicationstatus IN (" +
                    "        " + CLOSED_STATUSES + ") " +
                    "    THEN 1 ELSE 0 END) AS total_close_occurrences " +
                    "FROM public.eg_incident_v2 ";

    private static final String SYSTEM_FUNCTIONAL_STATUS =
            "SELECT id, systemfunctional " +
                    "FROM public.eg_incident_v2 " +
                    "WHERE applicationstatus NOT IN (" +
                    "  " + CLOSED_STATUSES +
                    ")";

    public String getStatusIncidentOccurence(String facilityId, List<Object> preparedStmtList) {
        StringBuilder queryBuilder = new StringBuilder(STATUS_COUNT_QUERY);
        if (facilityId != null && !facilityId.isEmpty()) {
            queryBuilder.append(" WHERE facilityid =? ");
            preparedStmtList.add(facilityId);
        }
        queryBuilder.append("GROUP BY facilityid;");

        return queryBuilder.toString();
    }

    public String getStatusSystemFunctionalIncident(String boundaryCode, List<Object> preparedStmtList) {
        StringBuilder queryBuilder = new StringBuilder(SYSTEM_FUNCTIONAL_STATUS);
        if (boundaryCode != null && !boundaryCode.isEmpty()) {
            queryBuilder.append(" AND boundarycode =? ");
            preparedStmtList.add(boundaryCode);
        }

        return queryBuilder.toString();
    }
}
