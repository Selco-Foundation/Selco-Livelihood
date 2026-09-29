package org.selco.e4h.repository.querybuilder;

import org.springframework.stereotype.Component;

/**
 * Queries backing the index backfill.
 *
 * <p>im-services, the facility registry and egov-workflow-v2 all persist into the same database,
 * so the facility point-of-contact, the facility category and the reopen history can be read in
 * one join instead of one HTTP call per ticket.
 */
@Component
public class BackfillQueryBuilder {

    /**
     * One row per incident carrying everything the ticket index takes from outside the incident
     * table.
     *
     * <p>{@code facility_category} has no column on {@code eg_incident_v2} — im-services resolves
     * it from the registry on every publish — so it is joined in here the same way.
     *
     * <p>The point-of-contact phone is deliberately NOT selected. The registry stores it encrypted
     * via egov-enc-service (see {@code FacilityService.encryptMobileNumber}) and only decrypts it
     * on the way out of its search APIs, so reading the column directly yields ciphertext. The
     * facility id is carried instead, and the phone is fetched decrypted from the registry.
     *
     * <p>{@code is_reopened} means "this ticket has been through a reopen", matching how
     * im-services sets it: once true it stays true for the rest of the ticket's life, including
     * after it closes. A ticket with no REOPEN transition indexes as an explicit false rather than
     * null so the field stays filterable.
     *
     * <p>Ordered by incident id so that {@code LIMIT}/{@code OFFSET} paging is stable across pages.
     */
    private static final String TICKET_BACKFILL_QUERY =
            "SELECT i.incidentid, " +
                    "       i.facilityid, " +
                    "       f.facility_category, " +
                    "       f.facility_poc_name, " +
                    "       EXISTS ( " +
                    "           SELECT 1 FROM public.eg_wf_processinstance_v2 wf " +
                    "           WHERE wf.businessid = i.incidentid " +
                    "             AND upper(wf.action) = 'REOPEN' " +
                    "       ) AS is_reopened " +
                    "FROM public.eg_incident_v2 i " +
                    "LEFT JOIN public.facility f ON f.id = i.facilityid " +
                    "ORDER BY i.incidentid " +
                    "LIMIT ? OFFSET ?";

    private static final String INCIDENT_COUNT_QUERY =
            "SELECT COUNT(*) FROM public.eg_incident_v2";

    public String getTicketBackfillQuery() {
        return TICKET_BACKFILL_QUERY;
    }

    public String getIncidentCountQuery() {
        return INCIDENT_COUNT_QUERY;
    }
}
