class BillOfMaterial {
  const BillOfMaterial({
    this.id,
    this.tenantId,
    this.facilityId,
    this.activityFacilityId,
    this.name,
    this.assignUser,
    this.isActive,
    this.data = const {},
    this.documents = const [],
    this.additionalDetails = const {},
  });

  final String? id;
  final String? tenantId;
  final String? facilityId;
  final String? activityFacilityId;
  final String? name;
  final String? assignUser;
  final bool? isActive;
  final Map<String, dynamic> data;
  final List<Map<String, dynamic>> documents;
  final Map<String, dynamic> additionalDetails;

  factory BillOfMaterial.fromJson(Map<String, dynamic> json) => BillOfMaterial(
        id: json['id']?.toString(),
        tenantId: json['tenantId']?.toString(),
        facilityId: json['facilityId']?.toString(),
        activityFacilityId: json['activityFacilityId']?.toString(),
        name: json['name']?.toString(),
        assignUser: json['assignUser']?.toString(),
        isActive: json['isActive'] is bool ? json['isActive'] as bool : null,
        data: _map(json['data']),
        documents: (json['documents'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map((value) => Map<String, dynamic>.from(value))
            .toList(),
        additionalDetails: _map(json['additionalDetails']),
      );

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        if (tenantId != null) 'tenantId': tenantId,
        if (facilityId != null) 'facilityId': facilityId,
        if (activityFacilityId != null) 'activityFacilityId': activityFacilityId,
        if (name != null) 'name': name,
        if (assignUser != null) 'assignUser': assignUser,
        if (isActive != null) 'isActive': isActive,
        'data': data,
        'documents': documents,
        'additionalDetails': additionalDetails,
      };

  BillOfMaterial copyWith({
    Map<String, dynamic>? data,
    List<Map<String, dynamic>>? documents,
    bool? isActive,
  }) =>
      BillOfMaterial(
        id: id,
        tenantId: tenantId,
        facilityId: facilityId,
        activityFacilityId: activityFacilityId,
        name: name,
        assignUser: assignUser,
        isActive: isActive ?? this.isActive,
        data: data ?? this.data,
        documents: documents ?? this.documents,
        additionalDetails: additionalDetails,
      );

  static Map<String, dynamic> _map(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : const {};
}
