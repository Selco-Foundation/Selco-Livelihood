import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:digit_ui_components/services/location_bloc.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/theme/spacers.dart';
import 'package:digit_ui_components/widgets/atoms/digit_checkbox.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:digit_ui_components/widgets/scrollable_content.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:path/path.dart' show basename;

import '../../blocs/cache_amc_media_upload/cache_amc_media_upload.dart';
import '../../blocs/scheduled_visit_submission/scheduled_visit_submission.dart';
import '../../blocs/selected_amc_origin/selected_amc_origin.dart';
import '../../blocs/selected_scheduled_visit/selected_scheduled_visit.dart';
import '../../data/nosql/cache_amc_media_upload.dart';
import '../../model/amc/scheduled_visit.dart';
import '../../model/solar_installation_draft.dart';
import '../../router/app_router.dart';
import '../../utils/amc/amc_utils.dart';
import '../../utils/extensions.dart';
import '../../utils/i18_key_constants.dart' as i18;
import '../../utils/role_login_resolver.dart';
import '../../widgets/amc/amc_back_navigation_help_header.dart';
import '../../widgets/amc/amc_existing_images.dart';
import '../../widgets/footer_button.dart';
import '../../widgets/image_uploader.dart';

/// Ported from E4H `pages/amc_media_upload.dart`: photos (with GPS) for the
/// AMC report. Submit caches the photos and hands the report to the
/// background service, then opens the completion-code (OTP) screen. When
/// resubmitting a rejected visit, every rejection reason must be ticked.
/// Read-only (photos only) when opened from the inbox/submitted lists.
@RoutePage()
class AmcMediaUploadPage extends StatefulWidget {
  const AmcMediaUploadPage({super.key});

  @override
  State<AmcMediaUploadPage> createState() => _AmcMediaUploadPageState();
}

class _AmcMediaUploadPageState extends State<AmcMediaUploadPage> {
  String? _currentScheduledVisitId;
  ScheduledVisit? scheduledVisit;
  FormOrigin? origin;
  String userType = USER_TYPES.AMC.name;
  List<File> _selectedImages = [];
  bool _isImagesInitLoading = false;
  double? _latitude;
  double? _longitude;
  List<String>? existingImagePaths;
  StreamSubscription<LocationState>? _locSub;

  List<String> _rejectionReasons = const [];
  final Set<String> _selectedRejectionReasons = <String>{};

  @override
  void initState() {
    super.initState();

    final locBloc = context.read<LocationBloc>();
    locBloc.add(const LocationEvent.requestPermission());
    locBloc.add(const LocationEvent.requestService());
    _locSub = locBloc.stream.listen((st) {
      if (st.latitude != null && st.longitude != null) {
        setState(() {
          _latitude = st.latitude;
          _longitude = st.longitude;
        });
      }
    });

    context.read<SelectedAmcOriginBloc>().state.whenOrNull(
        selected: (originAmc) {
      origin = originAmc;
    });

    context.read<SelectedScheduledVisitBloc>().state.whenOrNull(
        selected: (visit) {
      _currentScheduledVisitId = visit.id;
      scheduledVisit = visit;

      _loadRejectionReasonsFromVisit(visit);

      context.read<CacheAmcMediaUploadBloc>().add(
          CacheAmcMediaUploadEvent.get(_currentScheduledVisitId!, userType));
    });
  }

  @override
  void dispose() {
    _locSub?.cancel();
    super.dispose();
  }

  Future<bool> _ensureLocationLoaded({
    Duration timeout = const Duration(seconds: 10),
  }) async {
    final locBloc = context.read<LocationBloc>();
    if (locBloc.state.latitude != null && locBloc.state.longitude != null) {
      return true;
    }
    try {
      final st = await locBloc.stream
          .firstWhere((s) => s.latitude != null && s.longitude != null)
          .timeout(timeout);
      setState(() {
        _latitude = st.latitude;
        _longitude = st.longitude;
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _populateFromCacheOrSubmittedDocuments({
    List<CacheAmcMediaUpload> cacheEntries = const [],
  }) async {
    setState(() {
      _isImagesInitLoading = true;
    });

    final List<File> images = [];
    if (cacheEntries.isNotEmpty) {
      final futures = cacheEntries.map((e) async {
        final file = await getCachedFile(e.filePath);
        if (file == null) return null;
        return File(file.path);
      }).toList();

      final results = await Future.wait(futures);
      for (final pf in results) {
        if (pf == null) continue;
        images.add(pf);
      }
    } else {
      final visitReport = scheduledVisit?.visitReport;
      final docs = visitReport?.documents ?? const [];

      if (docs.isEmpty) {
        if (mounted) {
          setState(() {
            _selectedImages = [];
            _isImagesInitLoading = false;
          });
        }
        return;
      }

      final futures = docs.map((e) async {
        final file = await getCachedFile(e.fileStore ?? '');
        if (file == null) return null;
        return File(file.path);
      }).toList();

      final results = await Future.wait(futures);

      for (final pf in results) {
        if (pf == null) continue;
        images.add(pf);
      }
    }

    if (!mounted) return;

    setState(() {
      _selectedImages = images;
      _isImagesInitLoading = false;
      existingImagePaths = _selectedImages
          .where((f) => f.path.isNotEmpty)
          .map((f) => f.path)
          .toList();
    });
  }

  List<String> _extractRejectionReasons(ScheduledVisit? visit) {
    if (visit == null) return const <String>[];

    final candidates = <String>[];

    void addFromRawJson(String? rawJson) {
      if (rawJson == null || rawJson.trim().isEmpty) return;
      try {
        final decoded = jsonDecode(rawJson);

        if (decoded is Map<String, dynamic>) {
          final commentField = decoded['comment'];
          if (commentField is String && commentField.trim().isNotEmpty) {
            candidates.add(commentField);
          }
          if (commentField is List) {
            candidates.add(jsonEncode(commentField));
          }
        }
      } catch (_) {}
    }

    final processes = visit.processInstances;
    if (processes.isEmpty) return const <String>[];

    addFromRawJson(processes.first.rawJson);

    if (candidates.isEmpty) return const <String>[];

    final rawCommentJson = candidates.last;

    try {
      final decodedList = jsonDecode(rawCommentJson);

      if (decodedList is List) {
        final reasons = decodedList
            .whereType<Map<String, dynamic>>()
            .map((m) => m['reason']?.toString().trim())
            .where((r) => r != null && r.isNotEmpty)
            .cast<String>()
            .toList();

        return reasons;
      }
    } catch (_) {}

    return const <String>[];
  }

  void _loadRejectionReasonsFromVisit(ScheduledVisit? visit) {
    final reasons = _extractRejectionReasons(visit);
    setState(() {
      _rejectionReasons = reasons;
      _selectedRejectionReasons.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);

    final currentOrigin = context.select((SelectedAmcOriginBloc b) =>
        b.state.maybeWhen(selected: (o) => o, orElse: () => null));

    final bool isReadOnlyMedia = currentOrigin != FormOrigin.overallSummary &&
        currentOrigin != FormOrigin.submitForApproval;

    return MultiBlocListener(
      listeners: [
        BlocListener<CacheAmcMediaUploadBloc, CacheAmcMediaUploadState>(
          listener: (context, state) {
            state.maybeWhen(
              loaded: (entries) {
                _populateFromCacheOrSubmittedDocuments(cacheEntries: entries);
              },
              notFound: () => _populateFromCacheOrSubmittedDocuments(),
              orElse: () {},
            );
          },
        ),
        BlocListener<ScheduleVisitSubmitBloc, ScheduleVisitSubmitState>(
          listener: (context, state) {
            state.maybeWhen(
              success: () => context.router.push(const AmcOtpRoute()),
              failure: (error) {
                if (isSessionExpiredMessage(error)) {
                  handleSessionExpired(context);
                  return;
                }
                context.showSnackBar(SnackBar(content: Text(error)));
              },
              orElse: () {},
            );
          },
        ),
        BlocListener<SelectedAmcOriginBloc, SelectedAmcOriginState>(
          listener: (context, state) {
            state.whenOrNull(selected: (o) {
              setState(() {
                origin = o;
              });
            });
          },
        ),
        BlocListener<SelectedScheduledVisitBloc, SelectedScheduledVisitState>(
          listener: (context, state) {
            state.whenOrNull(selected: (visit) {
              _currentScheduledVisitId = visit.id;
              scheduledVisit = visit;

              _loadRejectionReasonsFromVisit(visit);

              context.read<CacheAmcMediaUploadBloc>().add(
                    CacheAmcMediaUploadEvent.get(visit.id!, userType),
                  );
            });
          },
        ),
      ],
      child: BlocBuilder<ScheduleVisitSubmitBloc, ScheduleVisitSubmitState>(
        builder: (context, scheduleState) {
          String footerText = isReadOnlyMedia
              ? context.translate(i18.amcCommon.backToHome)
              : context.translate(i18.amcCommon.coreCommonSubmit);

          final mustPickRejection =
              currentOrigin == FormOrigin.submitForApproval;
          final notAllRejectionsChecked = mustPickRejection &&
              _rejectionReasons.isNotEmpty &&
              _selectedRejectionReasons.length != _rejectionReasons.length;
          return Scaffold(
            body: ScrollableContent(
              enableFixedDigitButton: true,
              backgroundColor: theme.colorTheme.generic.background,
              header: const BackNavigationHelpHeaderWidget(
                showBackNavigation: true,
                showHelp: false,
              ),
              footer: FooterButton(
                key: const ValueKey('amc-media-footer'),
                isDisabled: scheduleState.maybeWhen(
                      loading: () => true,
                      orElse: () => false,
                    ) ||
                    notAllRejectionsChecked,
                showSuffixIcon: false,
                text: scheduleState.maybeWhen(
                  loading: () => context.translate(i18.amcCommon.loading),
                  orElse: () => footerText,
                ),
                onPressed: () async {
                  switch (currentOrigin) {
                    case FormOrigin.overallSummary:
                    case FormOrigin.submitForApproval:
                      if (_currentScheduledVisitId == null) return;
                      context.read<CacheAmcMediaUploadBloc>().add(
                          CacheAmcMediaUploadEvent.deleteAll(
                              _currentScheduledVisitId!, userType));
                      await context
                          .read<CacheAmcMediaUploadBloc>()
                          .stream
                          .firstWhere((state) => state.maybeWhen(
                                deleted: () => true,
                                error: (_) => true,
                                orElse: () => false,
                              ));
                      for (final file in _selectedImages) {
                        final copied =
                            await copyFileToLocalDir(File(file.path));
                        final entry = CacheAmcMediaUpload(
                          scheduledVisitId: _currentScheduledVisitId!,
                          itemNumber: file.path,
                          itemType: 'image',
                          userType: userType,
                          filePath: copied,
                          longitude: _longitude.toString(),
                          latitude: _latitude.toString(),
                        );
                        if (!context.mounted) return;
                        context
                            .read<CacheAmcMediaUploadBloc>()
                            .add(CacheAmcMediaUploadEvent.add(entry));
                      }

                      if (!context.mounted) return;
                      context.read<ScheduleVisitSubmitBloc>().add(
                          ScheduleVisitSubmitEvent.submit(
                              scheduledVisitId: _currentScheduledVisitId!,
                              userType: userType));
                      break;
                    default:
                      context.router.push(const AmcHomeRoute());
                  }
                },
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                      vertical: spacer2, horizontal: spacer4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: spacer4),
                      DigitCard(children: [
                        SizedBox(width: context.width),
                        Text(
                          context.translate(i18.amcCommon.images),
                          style: textTheme.headingXl.copyWith(
                              color: theme.colorTheme.primary.primary2),
                        ),
                        if (!isReadOnlyMedia)
                          Text(
                            context.translate(
                                i18.amcMediaUpload.selfieInstruction),
                            style: textTheme.headingS
                                .copyWith(color: theme.colorTheme.text.primary),
                          ),
                        if (!isReadOnlyMedia) const SizedBox(height: spacer2),
                        if (isReadOnlyMedia &&
                            existingImagePaths != null &&
                            _isImagesInitLoading == false)
                          AmcExistingImages(paths: existingImagePaths!),
                        if (!isReadOnlyMedia)
                          ImageUploader(
                            key: const ValueKey('amc-media-image-uploader'),
                            allowMultiples: true,
                            initialImages: _selectedImages
                                .map((file) => SolarFileRef(
                                      name: basename(file.path),
                                      path: file.path,
                                      localPath: file.path,
                                      kind: SolarFileKind.image,
                                    ))
                                .toList(),
                            onImagesSelected: (images) async {
                              setState(() {
                                _selectedImages = images
                                    .map((ref) =>
                                        File(ref.localPath ?? ref.path))
                                    .toList();
                              });

                              final ok = await _ensureLocationLoaded();
                              if (!context.mounted) return;
                              if (!ok) {
                                context.showSnackBar(
                                  SnackBar(
                                      content: Text(context.translate(i18
                                          .amcCommon.couldNotFetchLocation))),
                                );
                              }
                            },
                          ),
                        if (_isImagesInitLoading)
                          const Center(child: CircularProgressIndicator())
                      ]),
                      const SizedBox(height: spacer4),
                      if (origin == FormOrigin.submitForApproval)
                        DigitCard(
                          children: [
                            SizedBox(width: context.width),
                            Text(
                              context
                                  .translate(i18.amcMediaUpload.rejectionList),
                              style: textTheme.headingXl.copyWith(
                                  color: theme.colorTheme.primary.primary2),
                            ),
                            const SizedBox(height: spacer1),
                            if (_rejectionReasons.isEmpty)
                              Text(
                                context.translate(
                                    i18.amcMediaUpload.noRejectionReasonsFound),
                                style: textTheme.bodyS,
                              )
                            else
                              for (final reason in _rejectionReasons) ...[
                                DigitCheckbox(
                                  key: ValueKey(
                                      'amc-rej-${_currentScheduledVisitId ?? "none"}-$reason'),
                                  label: reason,
                                  value: _selectedRejectionReasons
                                      .contains(reason),
                                  onChanged: (value) {
                                    setState(() {
                                      if (value == true) {
                                        _selectedRejectionReasons.add(reason);
                                      } else {
                                        _selectedRejectionReasons
                                            .remove(reason);
                                      }
                                    });
                                  },
                                ),
                                const SizedBox(height: spacer1),
                              ],
                          ],
                        )
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
