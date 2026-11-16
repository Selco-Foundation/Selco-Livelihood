import 'package:intl/intl.dart';

import 'scheduled_visit.dart';

/// Site Details fields of the AMC report form (#250, field list 2.1–2.7),
/// in display order. They are auto-fetched and read-only.
const List<String> amcSiteDetailFields = [
  'end_user_name',
  'end_user_contact_number',
  'installation_date',
  'block',
  'district',
  'pincode',
  'purchase_order_number',
];

/// Hidden form fields holding the site's battery and system type, tested by
/// the conditional fields (specific gravity, Solar SPD, Grid SPD).
const String amcBatteryTypeField = 'battery_type';
const String amcSystemTypeField = 'system_type';

/// Values written to [amcBatteryTypeField] / [amcSystemTypeField].
const String amcLeadAcidBattery = 'LEAD_ACID';
const String amcDcSystem = 'DC';
const String amcAcSystem = 'AC';

/// The end user's site record shown in the report's Site Details section.
///
/// Read from the visit's `additionalDetails.siteDetails`. DUMMY-BACKEND: the
/// backend has not defined where these come from yet; this is the only place
/// to change once it does.
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

  /// [amcDcSystem], [amcAcSystem] or null when unknown.
  final String? systemType;

  factory AmcSiteDetails.fromVisit(ScheduledVisit visit) {
    final raw = visit.additionalDetails?['siteDetails'];
    final site = raw is Map ? raw : const {};
    String? text(String key) {
      final value = site[key]?.toString().trim();
      return value == null || value.isEmpty ? null : value;
    }

    final installed = site['installationDate'];
    return AmcSiteDetails(
      endUserName: text('endUserName'),
      endUserPhone: text('endUserPhone'),
      installationDate: installed is num
          ? DateTime.fromMillisecondsSinceEpoch(installed.toInt())
          : DateTime.tryParse(installed?.toString() ?? '')?.toLocal(),
      block: text('block'),
      district: text('district'),
      pincode: text('pincode'),
      purchaseOrderNumber: text('purchaseOrderNumber'),
      batteryType: normaliseBatteryType(text('batteryType')),
      systemType: normaliseSystemType(text('systemType')),
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
      'end_user_name': endUserName,
      'end_user_contact_number': endUserPhone,
      'installation_date': installationDate == null
          ? null
          : DateFormat('dd/MM/yyyy').format(installationDate!),
      'block': block,
      'district': district,
      'pincode': pincode,
      'purchase_order_number': purchaseOrderNumber,
      amcBatteryTypeField: batteryType,
      amcSystemTypeField: systemType,
    };
    return values..removeWhere((_, value) => value == null);
  }
}
