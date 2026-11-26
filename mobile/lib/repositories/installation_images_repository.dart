import '../model/mdms/common_masters.dart';
import 'app_init_repo.dart';
import 'asset_mdms_repository.dart';

class InstallationImagesRepository {
  InstallationImagesRepository({
    AssetMdmsRepository? mdmsRepository,
    AppInitRepo? appInitRepo,
  })  : _mdmsRepository = mdmsRepository ?? assetMdmsRepository,
        _appInitRepo = appInitRepo ?? AppInitRepo();

  final AssetMdmsRepository _mdmsRepository;
  final AppInitRepo _appInitRepo;

  Future<List<InstallationImageRequirement>> fetch({
    required String systemCode,
    bool forceRefresh = false,
  }) async {
    if (forceRefresh) {
      await _appInitRepo.searchAssetRegistry();
    } else {
      await _mdmsRepository.load();
      if (_mdmsRepository.current == null) {
        await _appInitRepo.searchAssetRegistry();
      }
    }
    return _mdmsRepository.installationImagesFor(systemCode);
  }
}
