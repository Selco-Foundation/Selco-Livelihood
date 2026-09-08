class BillOfMaterial {
  const BillOfMaterial({
    this.id,
    this.facilityId,
    this.activityFacilityId,
    this.name,
    this.data = const {},
    this.documents = const [],
    this.additionalDetails = const {},
  });

  final String? id;
  final String? facilityId;
  final String? activityFacilityId;
  final String? name;
  final Map<String, dynamic> data;
  final List<Map<String, dynamic>> documents;
  final Map<String, dynamic> additionalDetails;

  factory BillOfMaterial.fromJson(Map<String, dynamic> json) => BillOfMaterial(
        id: json['id']?.toString(),
        facilityId: json['facilityId']?.toString(),
        activityFacilityId: json['activityFacilityId']?.toString(),
        name: json['name']?.toString(),
        data: _map(json['data']),
        documents: (json['documents'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((value) => Map<String, dynamic>.from(value))
            .toList(),
        additionalDetails: _map(json['additionalDetails']),
      );

  static Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : const {};
}
