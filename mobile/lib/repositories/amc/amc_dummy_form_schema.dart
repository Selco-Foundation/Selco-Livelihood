import '../../model/amc/amc_site_details.dart';

/// DUMMY-BACKEND: the Livelihood AMC report form (#250) as a
/// `common-masters.AMCFormSchema` MDMS v2 record, built from "Livelihood AMC
/// report form final field list" (PRD 5.4.4, Section 10). The backend uploads
/// the same record (`data` below) to MDMS; delete this file once
/// `kAmcUseDummyBackend` is false (the form then comes from MDMS).
///
/// Conventions the app relies on:
///  * `uniqueIdentifier` / `data.name` = `AssetForm.AMC_SCHEDULED_MAINTENANCE`
///    and the first page is `amcFormFirstPage` (`Report_Header`).
///  * Site Details values are filled by the app from the visit
///    (`AmcSiteDetails`), keyed by the field names in `amcSiteDetailFields`.
///  * `battery_type` / `system_type` are hidden copies of the site's battery
///    and system type, so the conditional fields can test them.
///  * `format: custom` fields are drawn by the app: a field name ending in
///    `_photo` is a photo, any other is a decimal reading.
///  * Labels, section headings and options are localisation keys.
const String amcDummySchemaCode = 'common-masters.AMCFormSchema';

Map<String, dynamic> _option(String code, String name) =>
    {'code': code, 'name': name};

const _required = [
  {'type': 'required', 'value': true, 'message': 'CORE_COMMON_IS_REQUIRED'}
];

final _yesNo = [_option('YES', 'COMMON_YES'), _option('NO', 'COMMON_NO')];
final _yesNoNa = [..._yesNo, _option('NA', 'AMC_FORM_NA')];

Map<String, dynamic> _readOnly(String field, int order) => {
      'fieldName': field,
      'type': 'string',
      'format': 'text',
      'label': 'AMC_FORM_${field.toUpperCase()}',
      'order': order,
      'readOnly': true,
    };

/// A required Yes/No (or Yes/No/N/A) observation, optionally opening a
/// section heading.
Map<String, dynamic> _radio(
  String field,
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
      'label': 'AMC_FORM_${field.toUpperCase()}',
      'order': order,
      'enums': options,
      if (section != null) 'section': section,
      if (visibleWhen != null)
        'visibilityCondition': {'expression': visibleWhen},
      if (required) 'validations': _required,
    };

Map<String, dynamic> _custom(String field, int order, {String? visibleWhen}) =>
    {
      'fieldName': field,
      'type': 'string',
      'format': 'custom',
      'label': 'AMC_FORM_${field.toUpperCase()}',
      'order': order,
      if (visibleWhen != null)
        'visibilityCondition': {'expression': visibleWhen},
      'validations': _required,
    };

Map<String, dynamic> _text(String field, int order,
        {String? visibleWhen, String? section, String format = 'text'}) =>
    {
      'fieldName': field,
      'type': 'string',
      'format': format,
      'label': 'AMC_FORM_${field.toUpperCase()}',
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

const _leadAcid = 'Capture_Readings.battery_type == "LEAD_ACID"';
const _dcSystem = 'Capture_Readings.system_type == "DC"';
const _acSystem = 'Capture_Readings.system_type == "AC"';

Map<String, dynamic> dummyAmcFormSchemaDoc(String tenantId) {
  var o = 0;
  int next() => ++o;

  return {
    'id': 'dummy-amc-form-schema',
    'tenantId': tenantId,
    'schemaCode': amcDummySchemaCode,
    'uniqueIdentifier': 'AssetForm.AMC_SCHEDULED_MAINTENANCE',
    'isActive': true,
    'data': {
      'name': 'AssetForm.AMC_SCHEDULED_MAINTENANCE',
      'version': 2,
      'order': 1,
      'summary': false,
      'pages': [
        // 1. Report header
        _page('Report_Header', 1, 'AMC_FORM_REPORT_HEADER', [
          {
            'fieldName': 'date_of_visit',
            'type': 'string',
            'format': 'date',
            'label': 'AMC_FORM_DATE_OF_VISIT',
            'order': 1,
            'systemDate': true,
            'validations': _required,
          },
          {
            ..._text('service_by', 2),
            'validations': _required,
          },
          {
            ..._text('service_contact_number', 3, format: 'mobileNumber'),
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
            _readOnly(field, i + 1),
        ]),

        // 3. Charge controller / PCU
        _page('Charge_Controller_PCU', 3, 'AMC_FORM_CHARGE_CONTROLLER_PCU', [
          _radio('pcu_priority', 1, [
            _option('SOLAR_BATTERY_GRID', 'AMC_FORM_SOLAR_BATTERY_GRID'),
            _option('SOLAR_GRID_BATTERY', 'AMC_FORM_SOLAR_GRID_BATTERY'),
          ]),
          {
            'fieldName': 'panels_per_string',
            'type': 'integer',
            'format': 'text',
            'label': 'AMC_FORM_PANELS_PER_STRING',
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
            _radio('solar_cables_tied', next(), _yesNoNa,
                section: 'AMC_FORM_SECTION_SOLAR_PANEL'),
            _radio('solar_panels_clean', next(), _yesNo),
            _radio('solar_mms_rusting', next(), _yesNoNa),
            _radio('solar_nuts_bolts_rusting', next(), _yesNo),
            // 4B Array junction box
            _radio('ajb_mounted_firm', next(), _yesNo,
                section: 'AMC_FORM_SECTION_AJB'),
            // 4C Battery
            _radio('battery_terminals_clean', next(), _yesNo,
                section: 'AMC_FORM_SECTION_BATTERY'),
            _radio('battery_petroleum_jelly', next(), _yesNo),
            _radio('battery_float_indicators_ok', next(), _yesNoNa),
            _radio('battery_water_level_ok', next(), _yesNoNa),
            // 4D Inverter / PCU
            _radio('pcu_cables_intact', next(), _yesNo,
                section: 'AMC_FORM_SECTION_INVERTER_PCU'),
            // 4E Lightning arrestor
            _radio('la_insulation', next(), _yesNoNa,
                section: 'AMC_FORM_SECTION_LIGHTNING_ARRESTOR'),
            _radio('la_firmly_fixed', next(), _yesNoNa),
            _radio('la_saddle_insulators', next(), _yesNoNa),
            // 4F Earthing
            _radio('earthing_conduit', next(), _yesNo,
                section: 'AMC_FORM_SECTION_EARTHING'),
            _radio('earthing_cable_contact', next(), _yesNo),
            _radio('earthing_electrodes_buried', next(), _yesNo),
            // 4G Cable management
            _radio('cable_lugs_used', next(), _yesNo,
                section: 'AMC_FORM_SECTION_CABLE_MANAGEMENT'),
            _radio('cable_lugs_crimped', next(), _yesNo),
            _radio('cable_lugs_insulated', next(), _yesNo),
            _radio('mc4_interlocked', next(), _yesNoNa),
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
              _hidden('battery_type', next()),
              _hidden('system_type', next()),
              _custom('pcu_neutral_earth_voltage', next()),
              _custom('pcu_neutral_earth_voltage_photo', next()),
              _custom('grid_neutral_earth_voltage', next()),
              _custom('grid_neutral_earth_voltage_photo', next()),
              _custom('inverter_output_voltage', next()),
              _radio('earthing_electrode_available', next(), _yesNo),
              _radio('earthing_wire_connected', next(), _yesNo),
              _radio(
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
              _text('battery_specific_gravity_action', next(),
                  visibleWhen: _leadAcid),
              _radio('solar_spd', next(), _spdOptions, visibleWhen: _dcSystem),
              _custom('solar_spd_photo', next(), visibleWhen: _dcSystem),
              _text('solar_spd_action', next(), visibleWhen: _dcSystem),
              _radio('grid_spd', next(), _spdOptions, visibleWhen: _acSystem),
              _custom('grid_spd_photo', next(), visibleWhen: _acSystem),
              _text('grid_spd_action', next(), visibleWhen: _acSystem),
              _text('vendor_remarks', next(),
                  format: 'textArea', section: 'AMC_FORM_SECTION_REMARKS'),
              _text('end_user_remarks', next(), format: 'textArea'),
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
