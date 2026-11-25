package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The 7 rules as loaded on dev MDMS (config/step1_6-mdms.json, 2026-11-16). */
class AutoApprovalTest {

    static List<AutoApproval.Rule> RULES;

    @BeforeAll
    static void load() throws Exception {
        RULES = AutoApproval.parse(new ObjectMapper().readTree(("{'MdmsRes':{'AMC':{'AutoApprovalRules':["
                + "{'code':'NE_VOLTAGE_PCU_OUTPUT','fieldName':'neVoltagePcuOutput','operator':'LT','min':null,'max':7,'unit':'V','appliesToSystemTypes':[],'active':true},"
                + "{'code':'NE_VOLTAGE_GRID_INPUT','fieldName':'neVoltageGridInput','operator':'LT','min':null,'max':7,'unit':'V','appliesToSystemTypes':[],'active':true},"
                + "{'code':'INVERTER_OUTPUT_VOLTAGE','fieldName':'inverterOutputVoltage','operator':'BETWEEN','min':215,'max':250,'unit':'V','appliesToSystemTypes':[],'active':true},"
                + "{'code':'EARTHING_ELECTRODE_AVAILABLE','fieldName':'earthingElectrodeAvailable','operator':'EQ','value':'YES','appliesToSystemTypes':[],'active':true},"
                + "{'code':'EARTHING_WIRE_CONNECTED','fieldName':'earthingWireConnected','operator':'EQ','value':'YES','appliesToSystemTypes':[],'active':true},"
                + "{'code':'SOLAR_SPD_STATUS','fieldName':'solarSpdStatus','operator':'EQ','value':'WORKING','appliesToSystemTypes':['DC','HYBRID_*'],'active':true},"
                + "{'code':'GRID_SPD_STATUS','fieldName':'gridSpdStatus','operator':'EQ','value':'WORKING','appliesToSystemTypes':['AC_OFF_GRID*','HYBRID_*'],'active':true},"
                + "{'code':'OLD_RULE','fieldName':'x','operator':'EQ','value':'YES','active':false}]}}}").replace('\'', '"')));
    }

    static Map<String, Object> good() {
        Map<String, Object> r = new HashMap<>();
        r.put("neVoltagePcuOutput", 3);
        r.put("neVoltageGridInput", "2.5");
        r.put("inverterOutputVoltage", 230);
        r.put("earthingElectrodeAvailable", "YES");
        r.put("earthingWireConnected", "yes");
        r.put("solarSpdStatus", "WORKING");
        return r;
    }

    static Map<String, Object> ruleResult(Map<String, Object> result, String code) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rules = (List<Map<String, Object>>) result.get("rules");
        return rules.stream().filter(r -> code.equals(r.get("code"))).findFirst().orElseThrow();
    }

    static boolean passes(Map<String, Object> responses, String systemType) {
        return Boolean.TRUE.equals(AutoApproval.evaluate(RULES, responses, systemType, 1L).get("passed"));
    }

    @Test
    void inactiveRulesAreIgnored() {
        assertEquals(7, RULES.size());
    }

    @Test
    void allInRangePasses() {
        assertTrue(passes(good(), null));
        Map<String, Object> res = AutoApproval.evaluate(RULES, good(), null, 99L);
        assertEquals(99L, res.get("evaluatedAt"));
        assertEquals("less than 7 V", ruleResult(res, "NE_VOLTAGE_PCU_OUTPUT").get("acceptedRange"));
        assertEquals("215 to 250 V", ruleResult(res, "INVERTER_OUTPUT_VOLTAGE").get("acceptedRange"));
        assertEquals("Working", ruleResult(res, "SOLAR_SPD_STATUS").get("acceptedRange"));
    }

    @Test
    void lessThanIsStrict() {
        AutoApproval.Rule lt = RULES.get(0);
        assertNull(AutoApproval.judge(lt, 6.99));
        assertEquals("OUT_OF_RANGE", AutoApproval.judge(lt, 7));
        assertEquals("OUT_OF_RANGE", AutoApproval.judge(lt, "7.0"));
        assertEquals("OUT_OF_RANGE", AutoApproval.judge(lt, 9));
        assertNull(AutoApproval.judge(lt, -1), "below zero is still less than 7");
    }

    @Test
    void betweenIncludesBothEnds() {
        AutoApproval.Rule between = RULES.get(2);
        assertNull(AutoApproval.judge(between, 215));
        assertNull(AutoApproval.judge(between, "250"));
        assertEquals("OUT_OF_RANGE", AutoApproval.judge(between, 214.9));
        assertEquals("OUT_OF_RANGE", AutoApproval.judge(between, 250.01));
    }

    @Test
    void equalsIgnoresCaseAndReadsBooleans() {
        AutoApproval.Rule eq = RULES.get(3);
        assertNull(AutoApproval.judge(eq, "Yes"));
        assertNull(AutoApproval.judge(eq, true));
        assertEquals("NOT_EQUAL", AutoApproval.judge(eq, false));
        assertEquals("NOT_EQUAL", AutoApproval.judge(eq, "NO"));
        assertEquals("NOT_EQUAL", AutoApproval.judge(RULES.get(5), "FAILED"));
    }

    @Test
    void blankNaAndNonNumbersGoToAReviewer() {
        AutoApproval.Rule lt = RULES.get(0);
        assertEquals("MISSING", AutoApproval.judge(lt, null));
        assertEquals("MISSING", AutoApproval.judge(lt, "  "));
        assertEquals("NOT_APPLICABLE_ANSWER", AutoApproval.judge(lt, "N/A"));
        assertEquals("NOT_APPLICABLE_ANSWER", AutoApproval.judge(RULES.get(3), "na"));
        assertEquals("NOT_A_NUMBER", AutoApproval.judge(lt, "abc"));
        assertEquals("NOT_A_NUMBER", AutoApproval.judge(lt, "12 volts"));
        Map<String, Object> r = good();
        r.remove("inverterOutputVoltage");
        assertFalse(passes(r, null), "case (b): a rule for all systems without a reading fails");
        r = good();
        r.put("neVoltageGridInput", "N/A");
        assertFalse(passes(r, null), "case (c): DC off-grid N/A on grid input -> reviewer");
    }

    @Test
    void knownSystemTypeSkipsRulesThatDoNotApply() {
        Map<String, Object> acSite = good();
        acSite.remove("solarSpdStatus");
        acSite.put("gridSpdStatus", "WORKING");
        Map<String, Object> res = AutoApproval.evaluate(RULES, acSite, "AC_OFF_GRID_SINGLE_PHASE", 1L);
        assertTrue((Boolean) res.get("passed"));
        assertEquals(false, ruleResult(res, "SOLAR_SPD_STATUS").get("applicable"), "case (a): skipped, not failed");
        assertEquals(true, ruleResult(res, "GRID_SPD_STATUS").get("applicable"), "AC_OFF_GRID* prefix");

        Map<String, Object> dc = good();
        assertTrue(passes(dc, "DC"));
        dc.remove("solarSpdStatus");
        assertFalse(passes(dc, "DC"), "DC site without its Solar SPD answer");

        Map<String, Object> hybrid = good();
        assertFalse(passes(hybrid, "HYBRID_ON_GRID"), "hybrid needs both SPD answers");
        hybrid.put("gridSpdStatus", "working");
        assertTrue(passes(hybrid, "HYBRID_ON_GRID"));
    }

    @Test
    void unknownSystemTypeJudgesWhicheverSpdAnswerWasGiven() {
        // one answer: judged; the other skipped
        Map<String, Object> res = AutoApproval.evaluate(RULES, good(), null, 1L);
        assertTrue((Boolean) res.get("passed"));
        assertEquals(false, ruleResult(res, "GRID_SPD_STATUS").get("applicable"));
        // both answered: both judged
        Map<String, Object> both = good();
        both.put("gridSpdStatus", "FAILED");
        assertFalse(passes(both, "LIVELIHOOD"));
        both.put("gridSpdStatus", "WORKING");
        assertTrue(passes(both, ""));
        // neither answered: fail
        Map<String, Object> none = good();
        none.remove("solarSpdStatus");
        Map<String, Object> r = AutoApproval.evaluate(RULES, none, null, 1L);
        assertFalse((Boolean) r.get("passed"));
        assertEquals("MISSING", ruleResult(r, "SOLAR_SPD_STATUS").get("reason"));
        assertEquals("MISSING", ruleResult(r, "GRID_SPD_STATUS").get("reason"));
        assertNull(r.get("systemType"));
    }

    @Test
    void noRulesMeansNoAutoApproval() {
        assertFalse((Boolean) AutoApproval.evaluate(List.of(), good(), null, 1L).get("passed"));
    }

    @Test
    void patternMatching() {
        assertTrue(AutoApproval.matches("HYBRID_*", "hybrid_off_grid"));
        assertTrue(AutoApproval.matches("DC", "dc"));
        assertFalse(AutoApproval.matches("DC", "DC_SOMETHING"));
        assertFalse(AutoApproval.matches("AC_OFF_GRID*", "AC_ON_GRID"));
        assertEquals(new BigDecimal("2.5"), AutoApproval.toNumber("2.5"));
    }
}
