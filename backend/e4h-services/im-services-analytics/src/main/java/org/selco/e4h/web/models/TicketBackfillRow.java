package org.selco.e4h.web.models;

/**
 * The fields the ticket index takes from the facility registry and the workflow history, keyed by
 * the incident id that doubles as the Elasticsearch document id.
 *
 * <p>There is no point-of-contact phone here: the registry keeps it encrypted at rest, so it has to
 * come from the registry's search API rather than the table. {@link #facilityId} is what joins a
 * ticket to that lookup.
 *
 * @param facilityCategory registry category, null when the incident has no facility linked
 * @param endUserName      facility point of contact — the person the field team calls about a
 *                         ticket, not the ticket's creator
 * @param reopened         whether the ticket has ever been reopened
 */
public record TicketBackfillRow(
        String incidentId,
        String facilityId,
        String facilityCategory,
        String endUserName,
        boolean reopened) {
}
