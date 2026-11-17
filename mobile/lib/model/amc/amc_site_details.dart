import 'package:intl/intl.dart';

import 'scheduled_visit.dart';

/// Site Details fields of the AMC report form (#250, field list 2.1–2.7),
/// in display order. They are auto-fetched and read-only, and are not sent
/// back with the report (the backend already has them).
const List<String> amcSiteDetailFields = [
  'endUserName',
  'endUserPhone',
  'installationDate',
  'block',
  'district',
  'pinCode',
  'purchaseOrderNumber',
];

/// Hidden form fields holding the site's battery and system type, tested by
/// the conditional fields (specific gravity, Solar SPD, Grid SPD). Not sent
/// back with the report.
const String amcBatteryTypeField = 'batteryType';
const String amcSystemTypeField = 'systemType';

/// Values written to [amcBatteryTypeField] / [amcSystemTypeField].
const String amcLeadAcidBattery = 'LEAD_ACID';
const String amcDcSystem = 'DC';
const String amcAcSystem = 'AC';

/// The end user's site record shown in the report's Site Details section.
///
/// From the visit search with `includeSiteDetails: true` (AMC API contract):
/// `siteDetails` gives the installation date, purchase order, PIN code and
/// battery/system type; the visit gives the district and block, and its
/// facility the end user's phone.
class AmcSiteDetails {
  const AmcSiteDetails({
    this.endUserName,
    this.endUserPhone,
    this.installationDate,
    this.block,
    this.district,
    this.pincode,
    this.purchaseOrderNumber,
    this.batteryType,
    this.systemType,
  });

  final String? endUserName;
  final String? endUserPhone;
  final DateTime? installationDate;
  final String? block;
  final String? district;
  final String? pincode;
  final String? purchaseOrderNumber;

  /// [amcLeadAcidBattery] or the site's other battery type, upper-cased.
  final String? batteryType;

  /// [amcDcSystem], [amcAcSystem] or null when unknown. The contract says
  /// `systemType` is blank for every installation today, so neither SPD
  /// question shows until the backend fills it.
  final String? systemType;

  factory AmcSiteDetails.fromVisit(ScheduledVisit visit) {
    final site = visit.siteDetails ?? const <String, dynamic>{};
    String? text(Object? raw) {
      final value = raw?.toString().trim();
      return value == null || value.isEmpty ? null : value;
    }

    final installed = site['installationDate'];
    return AmcSiteDetails(
      // TODO(backend): the contract has no end user name on the visit;
      // the facility's contact name, then the site name, stand in for it.
      endUserName: text(site['endUserName']) ??
          text(visit.facility?.facility_poc_name) ??
          text(visit.displayFacilityName),
      endUserPhone:
          text(site['endUserPhone']) ?? text(visit.facility?.facility_poc_phone),
      installationDate: installed is num
          ? DateTime.fromMillisecondsSinceEpoch(installed.toInt())
          : DateTime.tryParse(installed?.toString() ?? '')?.toLocal(),
      block: text(visit.block) ?? text(site['block']),
      district: text(visit.district) ?? text(site['district']),
      pincode: text(site['pinCode']) ?? text(site['pincode']),
      purchaseOrderNumber: text(site['purchaseOrderNumber']),
      batteryType: normaliseBatteryType(text(site['batteryType'])),
      systemType: normaliseSystemType(text(site['systemType'])),
    );
  }

  /// "Lead acid", "lead-acid", "LEAD_ACID" → [amcLeadAcidBattery].
  static String? normaliseBatteryType(String? value) {
    if (value == null) return null;
    final code = value.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]+'), '_');
    return code.contains('LEAD') ? amcLeadAcidBattery : code;
  }

  /// "DC", "DC system", "dc_system" → [amcDcSystem]; likewise for AC.
  static String? normaliseSystemType(String? value) {
    final words = (value ?? '').toUpperCase().split(RegExp(r'[^A-Z]+'));
    if (words.contains(amcDcSystem)) return amcDcSystem;
    if (words.contains(amcAcSystem)) return amcAcSystem;
    return null;
  }

  /// Form values for the Site Details fields and the two hidden type fields.
  /// Missing values are left out, so whatever was saved is kept.
  Map<String, dynamic> toFormValues() {
    final values = <String, dynamic>{
      'endUserName': endUserName,
      'endUserPhone': endUserPhone,
      'installationDate': installationDate == null
          ? null
          : DateFormat('dd/MM/yyyy').format(installationDate!),
      'block': block,
      'district': district,
      'pinCode': pincode,
      'purchaseOrderNumber': purchaseOrderNumber,
      amcBatteryTypeField: batteryType,
      amcSystemTypeField: systemType,
    };
    return values..removeWhere((_, value) => value == null);
  }
}
