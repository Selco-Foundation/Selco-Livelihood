import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';

import '../data/nosql/cache_activity_facility_workflow.dart';
import '../data/nosql/cache_installation_data.dart';
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
