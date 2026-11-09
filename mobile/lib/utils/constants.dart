import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';

import '../data/nosql/cache_activity_facility_workflow.dart';
import '../data/nosql/cache_amc_doc.dart';
import '../data/nosql/cache_amc_failed_scheduled_visit.dart';
import '../data/nosql/cache_amc_media_upload.dart';
import '../data/nosql/cache_asset_count.dart';
import '../data/nosql/cache_installation_data.dart';
import '../data/nosql/cache_pending_submission.dart';
import '../data/nosql/cache_prefilled_scheduled_visit.dart';
import '../data/nosql/cache_schedule_visit_form_values.dart';
import '../data/nosql/cache_scheduled_visit.dart';
import '../data/nosql/cache_submission_job.dart';
import '../data/nosql/localization.dart';

class Constants {
  late Future<Isar> _isar;
  static final Constants _instance = Constants._();

  Constants._() {
    _isar = openIsar();
  }

  factory Constants() {
    return _instance;
  }

  Future<Isar> get isar {
    return _isar;
  }

  Future<Isar> openIsar() async {
    if (Isar.instanceNames.isEmpty) {
      final directory = await getApplicationDocumentsDirectory();

      return await Isar.open(
        [
          LocalizationWrapperSchema,
          CacheActivityFacilityWorkflowSchema,
          CacheInstallationDataSchema,
          CacheSubmissionJobSchema,
          CachePendingSubmissionSchema,
          CacheAssetCountSchema,
          // AMC (ported from E4H)
          CacheScheduledVisitSchema,
          CacheAmcDocSchema,
          CacheScheduleVisitFormValuesSchema,
          CacheAmcMediaUploadSchema,
          CachePrefilledScheduledVisitSchema,
          CacheAmcFailedScheduledVisitSchema,
        ],
        name: 'Livelihood',
        inspector: true,
        directory: directory.path,
      );
    } else {
      return await Future.value(Isar.getInstance());
    }
  }
}

class RequestInfoData {
  static const String apiId = 'project-api';
  static const String ver = '.01';
  static num ts = DateTime.now().millisecondsSinceEpoch;
  static const did = "1";
  static const key = "1";
  static String? authToken;
  static String msgId = "${DateTime.now().millisecondsSinceEpoch}|en_IN";
}
