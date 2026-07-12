package org.selco.e4h.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import static org.selco.e4h.util.IMConstants.*;

/**
 * POC digest metrics. Ticket metrics (001–006, 011) are counted from eg_incident_v2;
 * 007–012 are reserved for future livelihood modules and return zero until wired.
 */
@Getter
@RequiredArgsConstructor
public enum LivelihoodSummaryEventType {

    NEW_TICKETS(LIV_SUM_D_001, LIV_SUM_W_001, true),
    SLA_BREACHES(LIV_SUM_D_002, LIV_SUM_W_002, true),
    OUT_OF_SCOPE(LIV_SUM_D_003, LIV_SUM_W_003, true),
    QUOTATIONS_PENDING(LIV_SUM_D_004, LIV_SUM_W_004, true),
    CLOSED_WITHOUT_RESOLUTION(LIV_SUM_D_005, LIV_SUM_W_005, true),
    VENDOR_DECLINED(LIV_SUM_D_006, LIV_SUM_W_006, true),
    ACTIVITIES_REGISTERED(LIV_SUM_D_007, LIV_SUM_W_007, false),
    SUPPORT_APPROVED(LIV_SUM_D_008, LIV_SUM_W_008, false),
    SUPPORT_REJECTED(LIV_SUM_D_009, LIV_SUM_W_009, false),
    FIELD_VISITS_ASSIGNED(LIV_SUM_D_010, LIV_SUM_W_010, false),
    SLA_NEARING(LIV_SUM_D_011, LIV_SUM_W_011, true),
    EQUIPMENT_REPORTS(LIV_SUM_D_012, LIV_SUM_W_012, false);

    private final String dailyTemplateCode;
    private final String weeklyTemplateCode;
    private final boolean imTicketMetric;

    public String templateCode(boolean weekly) {
        return weekly ? weeklyTemplateCode : dailyTemplateCode;
    }
}
