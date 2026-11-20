import 'package:livelihood/model/amc/amc_site_details.dart';
import 'package:livelihood/utils/amc/amc_utils.dart';

/// The Livelihood AMC report form (#250) as an `amcFormMdmsSchemaCode`
/// MDMS v2 record, built from "Livelihood AMC report form final field list"
/// (PRD 5.4.4, Section 10). The app loads it from MDMS; tests use this copy.
///
/// Conventions the app relies on:
///  * `uniqueIdentifier` / `data.name` = `AssetForm.AMC_SCHEDULED_MAINTENANCE`
///    and the first page is `amcFormFirstPage` (`Report_Header`).
///  * Field names are the report keys of the AMC API contract
///    (`visitReport.responses.<key>`), which the auto-approval rules read.
///    Labels keep the `AMC_FORM_*` localisation keys.
///  * Site Details values are filled by the app from the visit
///    (`AmcSiteDetails`), keyed by the field names in `amcSiteDetailFields`.
///  * `batteryType` / `systemType` are hidden copies of the site's battery
///    and system type, so the conditional fields can test them.
///  * `format: custom` fields are drawn by the app: a field name ending in
///    `Photo` is a photo (sent as a report document, see
///    `amcReadingPhotoDocumentTypes`), any other is a decimal reading.
const String amcReportFormSchemaCode = amcFormMdmsSchemaCode;
const String amcReportFormIdentifier = 'AssetForm.AMC_SCHEDULED_MAINTENANCE';

Map<String, dynamic> _option(String code, String name) =>
    {'code': code, 'name': name};

const _required = [
  {'type': 'required', 'value': true, 'message': 'CORE_COMMON_IS_REQUIRED'}
];

final _yesNo = [_option('YES', 'COMMON_YES'), _option('NO', 'COMMON_NO')];
final _yesNoNa = [..._yesNo, _option('NA', 'AMC_FORM_NA')];

/// `AMC_FORM_<label>`: the localisation key, kept from the first version of
/// the form (#250), whose field names were snake_case.
String _label(String label) => 'AMC_FORM_${label.toUpperCase()}';

Map<String, dynamic> _readOnly(String field, String label, int order) => {
      'fieldName': field,
      'type': 'string',
      'format': 'text',
      'label': _label(label),
      'order': order,
      'readOnly': true,
    };

/// A required Yes/No (or Yes/No/N/A) observation, optionally opening a
/// section heading.
Map<String, dynamic> _radio(
  String field,
  String label,
  int order,
  List<Map<String, dynamic>> options, {
  String? section,
  String? visibleWhen,
  bool required = true,
}) =>
    {
      'fieldName': field,
      'type': 'string',
      'format': 'radio',
      'label': _label(label),
      'order': order,
      'enums': options,
      if (section != null) 'section': section,
      if (visibleWhen != null)
        'visibilityCondition': {'expression': visibleWhen},
      if (required) 'validations': _required,
    };

Map<String, dynamic> _custom(String field, String label, int order,
        {String? visibleWhen}) =>
    {
      'fieldName': field,
      'type': 'string',
      'format': 'custom',
      'label': _label(label),
      'order': order,
      if (visibleWhen != null)
        'visibilityCondition': {'expression': visibleWhen},
      'validations': _required,
    };

Map<String, dynamic> _text(String field, String label, int order,
        {String? visibleWhen, String? section, String format = 'text'}) =>
    {
      'fieldName': field,
      'type': 'string',
      'format': format,
      'label': _label(label),
      'order': order,
      if (section != null) 'section': section,
      if (visibleWhen != null)
        'visibilityCondition': {'expression': visibleWhen},
    };

Map<String, dynamic> _hidden(String field, int order) => {
      'fieldName': field,
      'type': 'string',
      'format': 'text',
      'label': field,
      'order': order,
      'hidden': true,
      'includeInForm': true,
    };

Map<String, dynamic> _page(String page, int order, String label,
        List<Map<String, dynamic>> properties,
        {String? actionLabel}) =>
    {
      'page': page,
      'type': 'object',
      'label': label,
      'order': order,
      if (actionLabel != null) 'actionLabel': actionLabel,
      'properties': properties,
    };

const _leadAcid = 'Capture_Readings.batteryType == "LEAD_ACID"';
const _dcSystem = 'Capture_Readings.systemType == "DC"';
const _acSystem = 'Capture_Readings.systemType == "AC"';

/// Site Details field (`amcSiteDetailFields`) → its label.
const _siteDetailLabels = {
  'endUserName': 'end_user_name',
  'endUserPhone': 'end_user_contact_number',
  'installationDate': 'installation_date',
  'block': 'block',
  'district': 'district',
  'pinCode': 'pincode',
  'purchaseOrderNumber': 'purchase_order_number',
};

Map<String, dynamic> amcReportFormSchemaDoc(String tenantId) {
  var o = 0;
  int next() => ++o;

  return {
    'id': 'amc-report-form-schema',
    'tenantId': tenantId,
    'schemaCode': amcReportFormSchemaCode,
    'uniqueIdentifier': amcReportFormIdentifier,
    'isActive': true,
    'data': {
      'name': amcReportFormIdentifier,
      'version': 2,
      'order': 1,
      'summary': false,
      'pages': [
        // 1. Report header
        _page('Report_Header', 1, 'AMC_FORM_REPORT_HEADER', [
          {
            'fieldName': 'visitDate',
            'type': 'string',
            'format': 'date',
            'label': _label('date_of_visit'),
            'order': 1,
            'systemDate': true,
            'validations': _required,
          },
          {
            ..._text('serviceBy', 'service_by', 2),
            'validations': _required,
          },
          {
            ..._text('serviceByPhone', 'service_contact_number', 3,
                format: 'mobileNumber'),
            'validations': [
              ..._required,
              {
                'type': 'pattern',
                'value': r'^[0-9]{10}$',
                'message': 'AMC_FORM_INVALID_PHONE',
              },
              {'type': 'maxLength', 'value': 10},
            ],
          },
        ]),

        // 2. Site details: auto-fetched, read-only.
        _page('Site_Details', 2, 'AMC_FORM_SITE_DETAILS', [
          for (final (i, field) in amcSiteDetailFields.indexed)
            _readOnly(field, _siteDetailLabels[field]!, i + 1),
        ]),

        // 3. Charge controller / PCU
        _page('Charge_Controller_PCU', 3, 'AMC_FORM_CHARGE_CONTROLLER_PCU', [
          _radio('pcuPriority', 'pcu_priority', 1, [
            _option('SOLAR_BATTERY_GRID', 'AMC_FORM_SOLAR_BATTERY_GRID'),
            _option('SOLAR_GRID_BATTERY', 'AMC_FORM_SOLAR_GRID_BATTERY'),
          ]),
          {
            'fieldName': 'panelsPerString',
            'type': 'integer',
            'format': 'text',
            'label': _label('panels_per_string'),
            'order': 2,
            'validations': [
              ..._required,
              {'type': 'pattern', 'value': r'^[0-9]{1,3}$'},
              {'type': 'maxLength', 'value': 3},
            ],
          },
        ]),

        // 4. Observation points (20, all required)
        () {
          o = 0;
          return _page('Observation_Points', 4, 'AMC_FORM_OBSERVATION_POINTS', [
            // 4A Solar panel
            _radio('obsPanelCablesTied', 'solar_cables_tied', next(), _yesNoNa,
                section: 'AMC_FORM_SECTION_SOLAR_PANEL'),
            _radio('obsPanelsClean', 'solar_panels_clean', next(), _yesNo),
            _radio('obsMmsRusting', 'solar_mms_rusting', next(), _yesNoNa),
            _radio('obsNutsBoltsRusting', 'solar_nuts_bolts_rusting', next(),
                _yesNo),
            // 4B Array junction box
            _radio('obsAjbMounted', 'ajb_mounted_firm', next(), _yesNo,
                section: 'AMC_FORM_SECTION_AJB'),
            // 4C Battery
            _radio('obsBatteryTerminalsClean', 'battery_terminals_clean',
                next(), _yesNo,
                section: 'AMC_FORM_SECTION_BATTERY'),
            _radio(
                'obsPetroleumJelly', 'battery_petroleum_jelly', next(), _yesNo),
            _radio('obsFloatIndicators', 'battery_float_indicators_ok', next(),
                _yesNoNa),
            _radio('obsDistilledWaterLevel', 'battery_water_level_ok', next(),
                _yesNoNa),
            // 4D Inverter / PCU
            _radio('obsPcuCablesIntact', 'pcu_cables_intact', next(), _yesNo,
                section: 'AMC_FORM_SECTION_INVERTER_PCU'),
            // 4E Lightning arrestor
            _radio('obsLaInsulation', 'la_insulation', next(), _yesNoNa,
                section: 'AMC_FORM_SECTION_LIGHTNING_ARRESTOR'),
            _radio('obsLaFixed', 'la_firmly_fixed', next(), _yesNoNa),
            _radio('obsGiStripsInsulated', 'la_saddle_insulators', next(),
                _yesNoNa),
            // 4F Earthing
            _radio(
                'obsDownConductorConduit', 'earthing_conduit', next(), _yesNo,
                section: 'AMC_FORM_SECTION_EARTHING'),
            _radio('obsEarthCableContact', 'earthing_cable_contact', next(),
                _yesNo),
            _radio('obsEarthElectrodesBuried', 'earthing_electrodes_buried',
                next(), _yesNo),
            // 4G Cable management
            // TODO(backend): the contract has no keys for 4.17 (lugs used)
            // and 4.19 (lugs insulated), and lists `obsCablesDamaged`, which
            // no question asks. The two keys below are the app's own.
            _radio('obsCableLugsUsed', 'cable_lugs_used', next(), _yesNo,
                section: 'AMC_FORM_SECTION_CABLE_MANAGEMENT'),
            _radio('obsCablesCrimped', 'cable_lugs_crimped', next(), _yesNo),
            _radio('obsCableLugsInsulated', 'cable_lugs_insulated', next(),
                _yesNo),
            _radio('obsMc4Intact', 'mc4_interlocked', next(), _yesNoNa),
          ]);
        }(),

        // 5. Capture readings
        () {
          o = 0;
          return _page(
            'Capture_Readings',
            5,
            'AMC_FORM_CAPTURE_READINGS',
            actionLabel: 'AMC_FORM_SAVE_AND_NEXT',
            [
              _hidden(amcBatteryTypeField, next()),
              _hidden(amcSystemTypeField, next()),
              _custom(
                  'neVoltagePcuOutput', 'pcu_neutral_earth_voltage', next()),
              _custom('neVoltagePcuOutputPhoto',
                  'pcu_neutral_earth_voltage_photo', next()),
              _custom(
                  'neVoltageGridInput', 'grid_neutral_earth_voltage', next()),
              _custom('neVoltageGridInputPhoto',
                  'grid_neutral_earth_voltage_photo', next()),
              _custom(
                  'inverterOutputVoltage', 'inverter_output_voltage', next()),
              _radio('earthingElectrodeAvailable',
                  'earthing_electrode_available', next(), _yesNo),
              _radio('earthingWireConnected', 'earthing_wire_connected', next(),
                  _yesNo),
              _radio(
                'batterySpecificGravity',
                'battery_specific_gravity',
                next(),
                [
                  _option('GOOD', 'AMC_FORM_GOOD'),
                  _option('OK', 'AMC_FORM_OK'),
                  _option('BAD', 'AMC_FORM_BAD'),
                  _option('NA', 'AMC_FORM_NA'),
                ],
                visibleWhen: _leadAcid,
              ),
              _text('batterySpecificGravityAction',
                  'battery_specific_gravity_action', next(),
                  visibleWhen: _leadAcid),
              _radio('solarSpdStatus', 'solar_spd', next(), _spdOptions,
                  visibleWhen: _dcSystem),
              _custom('solarSpdPhoto', 'solar_spd_photo', next(),
                  visibleWhen: _dcSystem),
              _text('solarSpdAction', 'solar_spd_action', next(),
                  visibleWhen: _dcSystem),
              _radio('gridSpdStatus', 'grid_spd', next(), _spdOptions,
                  visibleWhen: _acSystem),
              _custom('gridSpdPhoto', 'grid_spd_photo', next(),
                  visibleWhen: _acSystem),
              _text('gridSpdAction', 'grid_spd_action', next(),
                  visibleWhen: _acSystem),
              _text('vendorRemarks', 'vendor_remarks', next(),
                  format: 'textArea', section: 'AMC_FORM_SECTION_REMARKS'),
              _text('endUserRemarks', 'end_user_remarks', next(),
                  format: 'textArea'),
            ],
          );
        }(),
      ],
    },
  };
}

final _spdOptions = [
  _option('WORKING', 'AMC_FORM_WORKING'),
  _option('FAILED', 'AMC_FORM_FAILED'),
];
