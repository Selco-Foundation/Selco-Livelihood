// The AMC report form as the reviewer reads it: which `visitReport.responses` key goes in which
// section, with its English label. Source: the client's final field list
// (development/AMC_module/10-report-form.md) and the API contract's "Report form keys".
// An answer whose key is not listed here still shows, under "Other answers", with a label made
// from its key, so a field the mobile app adds later is never hidden from the reviewer.

export interface AmcFormField {
  key: string;
  label: string;
  /** Unit appended to a number, e.g. "V". */
  unit?: string;
}

export interface AmcFormSection {
  code: string;
  title: string;
  fields: AmcFormField[];
}

export const AMC_FORM_SECTIONS: AmcFormSection[] = [
  {
    code: "REPORT_HEADER",
    title: "Report header",
    fields: [
      { key: "visitDate", label: "Date of visit" },
      { key: "serviceBy", label: "Service by" },
      { key: "serviceByPhone", label: "Contact number" },
    ],
  },
  {
    code: "PCU",
    title: "Charge controller / PCU",
    fields: [
      { key: "pcuPriority", label: "Priority" },
      { key: "panelsPerString", label: "Number of panels in a string" },
    ],
  },
  {
    code: "OBSERVATIONS",
    title: "Observation points",
    fields: [
      { key: "obsPanelCablesTied", label: "Solar panel: cables are tied to the frame / protection" },
      { key: "obsPanelsClean", label: "Solar panel: are the panels clean?" },
      { key: "obsMmsRusting", label: "Solar panel: rusting on MMS" },
      { key: "obsNutsBoltsRusting", label: "Solar panel: rusting on nuts and bolts" },
      { key: "obsAjbMounted", label: "AJB: mounted firm to the vertical surface" },
      { key: "obsBatteryTerminalsClean", label: "Battery: are battery terminals clean?" },
      { key: "obsPetroleumJelly", label: "Battery: petroleum jelly applied at all battery terminals" },
      { key: "obsFloatIndicators", label: "Battery: float indicators are not damaged" },
      { key: "obsDistilledWaterLevel", label: "Battery: distilled water level between green and red marks" },
      { key: "obsPcuCablesIntact", label: "Inverter / PCU: cables entering the PCU are intact, no loose connections" },
      { key: "obsLaInsulation", label: "LA: insulation between LA and elevation pole" },
      { key: "obsLaFixed", label: "LA: set-up firmly fixed over the roof" },
      { key: "obsGiStripsInsulated", label: "LA: GI strips / cable with saddle insulators on RCC roof" },
      { key: "obsDownConductorConduit", label: "Earthing: down conductor protected with conduit pipe until the pit" },
      { key: "obsEarthCableContact", label: "Earthing: earthing cable in full contact with the electrode" },
      { key: "obsEarthElectrodesBuried", label: "Earthing: earth electrodes buried well" },
      { key: "obsCablesCrimped", label: "Cables: all connections secure, ends crimped with lugs" },
      { key: "obsCablesDamaged", label: "Cables: are any cables damaged or worn out?" },
      { key: "obsMc4Intact", label: "Cables: MC4 connectors intact and interlocked" },
    ],
  },
  {
    code: "READINGS",
    title: "Readings",
    fields: [
      { key: "neVoltagePcuOutput", label: "Neutral to earth voltage at PCU output", unit: "V" },
      { key: "neVoltageGridInput", label: "Neutral to earth voltage for grid input", unit: "V" },
      {
        key: "inverterOutputVoltage",
        label: "Inverter output voltage (solar and grid disconnected, battery connected)",
        unit: "V",
      },
      { key: "earthingElectrodeAvailable", label: "Earthing electrode available" },
      { key: "earthingWireConnected", label: "Earthing wire connected to earth pit" },
      { key: "batterySpecificGravity", label: "Battery specific gravity (hydrometer)" },
      { key: "batterySpecificGravityAction", label: "Action taken (specific gravity)" },
      { key: "solarSpdStatus", label: "Solar (DC) SPD" },
      { key: "solarSpdAction", label: "Solar SPD action taken" },
      { key: "gridSpdStatus", label: "Grid input (AC) SPD" },
      { key: "gridSpdAction", label: "Grid input SPD action taken" },
    ],
  },
  {
    code: "REMARKS",
    title: "Remarks",
    fields: [
      { key: "vendorRemarks", label: "Vendor remarks" },
      { key: "endUserRemarks", label: "End user remarks" },
    ],
  },
];

/** Photo document types, in the order the reviewer sees them. */
export const AMC_PHOTO_TYPES: Array<{ documentType: string; title: string }> = [
  { documentType: "AMC_VERIFICATION_PHOTO", title: "Field staff with the end user at the system" },
  { documentType: "AMC_PHOTO_NE_PCU", title: "Neutral to earth voltage at PCU output" },
  { documentType: "AMC_PHOTO_NE_GRID", title: "Neutral to earth voltage for grid input" },
  { documentType: "AMC_PHOTO_SOLAR_SPD", title: "Solar SPD" },
  { documentType: "AMC_PHOTO_GRID_SPD", title: "Grid input SPD" },
];

/** Display text for the coded answers the form sends. */
export const AMC_ANSWER_LABELS: Record<string, string> = {
  YES: "Yes",
  NO: "No",
  NA: "N/A",
  WORKING: "Working",
  FAILED: "Failed",
  GOOD: "Good",
  OK: "OK",
  BAD: "Bad",
  SOLAR_BATTERY_GRID: "Solar - Battery - Grid",
  SOLAR_GRID_BATTERY: "Solar - Grid - Battery",
};
