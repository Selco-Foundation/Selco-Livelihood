import 'package:isar/isar.dart';

part 'cache_amc_media_upload.g.dart';

/// Photos picked on the AMC media screen, uploaded by the background
/// submission. Ported from E4H.
@Collection()
class CacheAmcMediaUpload {
  Id id = Isar.autoIncrement;

  @Index()
  late String scheduledVisitId;

  @Index()
  late String userType;

  late String itemNumber;
  late String itemType;
  late String filePath;
  late String latitude;
  late String longitude;
  DateTime createdAt = DateTime.now();
  DateTime? updatedAt;

  CacheAmcMediaUpload({
    required this.scheduledVisitId,
    required this.itemNumber,
    required this.itemType,
    required this.filePath,
    required this.latitude,
    required this.longitude,
    required this.userType,
  });
}
