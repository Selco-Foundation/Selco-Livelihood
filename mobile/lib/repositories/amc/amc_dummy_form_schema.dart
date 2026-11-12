/// DUMMY-BACKEND: an invented `common-masters.AMCFormSchema` MDMS v2
/// record, shaped like the E4H record the AMC screens expect
/// (`uniqueIdentifier` / `data.name` = `AssetForm.AMC_SCHEDULED_MAINTENANCE`,
/// first page `AMC_Report`). The only field E4H itself guarantees exists is
/// `faults_observed` (its default value is hard-coded to "YES"); every other
/// question below is a placeholder.
///
/// Replace with the real record exported from E4H MDMS, or delete once
/// `kAmcUseDummyBackend` is false (the form then comes from MDMS).
const String amcDummySchemaCode = 'common-masters.AMCFormSchema';

Map<String, dynamic> _option(String code, String name) =>
    {'code': code, 'name': name};

const _required = [
  {'type': 'required', 'value': true, 'message': 'CORE_COMMON_IS_REQUIRED'}
];

Map<String, dynamic> dummyAmcFormSchemaDoc(String tenantId) {
  final conditions = [
    _option('GOOD', 'Good'),
    _option('NEEDS_REPAIR', 'Needs repair'),
    _option('NOT_WORKING', 'Not working'),
  ];

  return {
    'id': 'dummy-amc-form-schema',
    'tenantId': tenantId,
    'schemaCode': amcDummySchemaCode,
    'uniqueIdentifier': 'AssetForm.AMC_SCHEDULED_MAINTENANCE',
    'isActive': true,
    'data': {
      'name': 'AssetForm.AMC_SCHEDULED_MAINTENANCE',
      'version': 1,
      'order': 1,
      'summary': false,
      'pages': [
        {
          'page': 'AMC_Report',
          'type': 'object',
          'label': 'AMC Report',
          'order': 1,
          'description': 'Record the condition of the installed system.',
          'properties': [
            {
              'fieldName': 'faults_observed',
              'type': 'string',
              'format': 'radio',
              'label': 'Faults observed?',
              'order': 1,
              'enums': [_option('YES', 'Yes'), _option('NO', 'No')],
              'validations': _required,
            },
            {
              'fieldName': 'panel_condition',
              'type': 'string',
              'format': 'dropdown',
              'label': 'Solar panel condition',
              'order': 2,
              'enums': conditions,
              'validations': _required,
            },
            {
              'fieldName': 'battery_condition',
              'type': 'string',
              'format': 'dropdown',
              'label': 'Battery condition',
              'order': 3,
              'enums': conditions,
              'validations': _required,
            },
            {
              'fieldName': 'inverter_condition',
              'type': 'string',
              'format': 'dropdown',
              'label': 'Inverter condition',
              'order': 4,
              'enums': conditions,
              'validations': _required,
            },
          ],
        },
        {
          'page': 'AMC_Remarks',
          'type': 'object',
          'label': 'Remarks',
          'order': 2,
          'properties': [
            {
              'fieldName': 'remarks',
              'type': 'string',
              'format': 'textArea',
              'label': 'Remarks',
              'order': 1,
            },
          ],
        },
      ],
    },
  };
}
