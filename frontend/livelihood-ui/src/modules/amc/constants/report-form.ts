// The AMC report form as the reviewer reads it: which `visitReport.responses` key goes in which
// section, with its English label, worded exactly as in the source: the client's final field list
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
      { key: "panelsPerString", label: "No of panels in a string" },
    ],
  },
  {
    code: "OBSERVATIONS",
    title: "Observation points",
    fields: [
      { key: "obsPanelCablesTied", label: "Cables are tied to the frame / protection" },
      { key: "obsPanelsClean", label: "Are the panels clean?" },
      { key: "obsMmsRusting", label: "Rusting on MMS" },
      { key: "obsNutsBoltsRusting", label: "Rusting on nuts and bolts" },
      { key: "obsAjbMounted", label: "AJB is mounted firm to the vertical surface" },
      { key: "obsBatteryTerminalsClean", label: "Are battery terminals clean?" },
      { key: "obsPetroleumJelly", label: "Petroleum jelly is applied at all battery terminals" },
      { key: "obsFloatIndicators", label: "Float indicators are not damaged" },
      { key: "obsDistilledWaterLevel", label: "Is the distilled water level between the green and red marks on the float indicator?" },
      { key: "obsPcuCablesIntact", label: "Cables entering the PCU are intact, without loose connections" },
      { key: "obsLaInsulation", label: "Insulation is provided between the LA and the elevation pole using ceramic insulators" },
      { key: "obsLaFixed", label: "The entire lightning arrestor set-up is firmly fixed over the roof surface" },
      { key: "obsGiStripsInsulated", label: "GI strips / cable are provided with saddle insulators on the RCC roof" },
      { key: "obsDownConductorConduit", label: "Down conductor is protected with conduit pipe until the pit" },
      { key: "obsEarthCableContact", label: "Is the earthing cable in full contact with the electrode?" },
      { key: "obsEarthElectrodesBuried", label: "Earth electrodes are buried well in the earth" },
      { key: "obsCablesCrimped", label: "All cables connections were found secure with ends crimped with lugs" },
      { key: "obsCablesDamaged", label: "Are any cables damaged or worn out" },
      { key: "obsMc4Intact", label: "MC4 connectors are intact and properly interlocked" },
    ],
  },
  {
    code: "READINGS",
    title: "Capture readings",
    fields: [
      { key: "neVoltagePcuOutput", label: "Neutral to earth voltage at PCU output (V)", unit: "V" },
      { key: "neVoltageGridInput", label: "Neutral to earth voltage for grid input (V)", unit: "V" },
      {
        key: "inverterOutputVoltage",
        label: "Inverter output voltage, with solar and grid disconnected and battery connected (V)",
        unit: "V",
      },
      { key: "earthingElectrodeAvailable", label: "Earthing electrode available" },
      { key: "earthingWireConnected", label: "Earthing wire connected to earth pit" },
      { key: "batterySpecificGravity", label: "Battery specific gravity, measured through hydrometer" },
      { key: "batterySpecificGravityAction", label: "Action taken (for specific gravity)" },
      { key: "solarSpdStatus", label: "Solar SPD" },
      { key: "solarSpdAction", label: "Solar SPD action taken" },
      { key: "gridSpdStatus", label: "Grid input SPD" },
      { key: "gridSpdAction", label: "Grid input SPD action taken" },
    ],
  },
  {
    code: "REMARKS",
    title: "Remarks",
    fields: [
      { key: "vendorRemarks", label: "Vendor remarks" },
      { key: "endUserRemarks", label: "End User remarks" },
    ],
  },
];

/** Photo document types, in the order the reviewer sees them. */
export const AMC_PHOTO_TYPES: Array<{ documentType: string; title: string }> = [
  { documentType: "AMC_VERIFICATION_PHOTO", title: "Photo with the system and end user along with the technician" },
  { documentType: "AMC_PHOTO_NE_PCU", title: "Neutral to earth voltage at PCU output" },
  { documentType: "AMC_PHOTO_NE_GRID", title: "Neutral to earth voltage for grid input" },
  { documentType: "AMC_PHOTO_SOLAR_SPD", title: "Solar SPD photo" },
  { documentType: "AMC_PHOTO_GRID_SPD", title: "Grid input SPD photo" },
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
  SOLAR_BATTERY_GRID: "Solar-Battery-Grid",
  SOLAR_GRID_BATTERY: "Solar-Grid-Battery",
};
