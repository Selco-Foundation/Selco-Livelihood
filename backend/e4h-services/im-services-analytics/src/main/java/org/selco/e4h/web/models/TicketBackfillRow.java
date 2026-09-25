package org.selco.e4h.web.models;

/**
 * The fields the ticket index takes from the facility registry and the workflow history, keyed by
 * the incident id that doubles as the Elasticsearch document id.
 *
 * @param facilityCategory registry category, null when the incident has no facility linked
 * @param endUserName      facility point of contact — the person the field team calls about a
 *                         ticket, not the ticket's creator
 * @param endUserMobile    point-of-contact phone
 * @param reopened         whether the ticket has ever been reopened
 */
public record TicketBackfillRow(
        String incidentId,
        String facilityCategory,
        String endUserName,
        String endUserMobile,
        boolean reopened) {
}
