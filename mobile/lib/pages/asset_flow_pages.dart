import 'package:digit_ui_components/digit_components.dart';
import 'package:digit_ui_components/theme/digit_extended_theme.dart';
import 'package:digit_ui_components/widgets/atoms/input_wrapper.dart';
import 'package:digit_ui_components/widgets/molecules/digit_card.dart';
import 'package:flutter/material.dart';
// Required by auto_route when expanding the imported SolarPickMedia typedef.
// ignore: unused_import
import 'package:image_picker/image_picker.dart';

import '../utils/extensions.dart';
import '../utils/i18_key_constants.dart' as i18;
import '../model/solar_installation_draft.dart';
import '../router/app_router.dart';
import '../repositories/installation_cache_repo.dart';
import '../repositories/installation_draft_repository.dart';
import '../utils/app_permission_gateway.dart';
import '../widgets/image_uploader.dart';
import '../widgets/solar_workflow_widgets.dart';
import '../widgets/video_uploader.dart';
import 'digit_scanner_page.dart';
import 'media_viewer.dart';

typedef SolarScanSerial = Future<String?> Function(BuildContext context);

@RoutePage()
class AssetCountPage extends StatefulWidget {
  const AssetCountPage({
    super.key,
    required this.draft,
    this.pickMedia,
    this.scanSerial,
  });

  final SolarInstallationDraft draft;
  final SolarPickMedia? pickMedia;
  final SolarScanSerial? scanSerial;

  @override
  State<AssetCountPage> createState() => _AssetCountPageState();
}

class _AssetCountPageState extends State<AssetCountPage> {
  SolarInstallationDraft get draft => widget.draft;

  void _next() {
    context.router.push(
      SelectAssetTypeRoute(
        draft: draft,
        pickMedia: widget.pickMedia,
        scanSerial: widget.scanSerial,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return SolarWorkflowScaffold(
      pageKey: 'solar-asset-count',
      stepIndex: 0,
      footer: SolarFooterButton(
        label: context.translate(i18.common.next),
        isDisabled: !draft.allCountsEntered,
        onPressed: _next,
      ),
      child: DigitCard(
        key: const ValueKey('solar-asset-count-card'),
        children: [
          Text(
            context.translate(i18.assetFlow.assetCountTitle),
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          Text(context.translate(i18.assetFlow.chooseAssetCount),
              style: textTheme.bodyL),
          const SizedBox(height: spacer2),
          for (final type in draft.applicableTypes)
            LabeledField(
              label: draft.labelFor(type),
              capitalizedFirstLetter: false,
              labelStyle: textTheme.headingS,
              child: InputField(
                key: ValueKey('solar-count-${type.name}'),
                minValue: draft.minimumFor(type),
                maxValue: draft.maximumFor(type),
                type: InputType.numeric,
                editable: false,
                initialValue: draft.countFor(type).toString(),
                onChange: (value) => setState(() {
                  draft.setCount(
                      type, int.tryParse(value) ?? draft.minimumFor(type));
                  installationDraftRepository.saveSolarSoon(draft);
                }),
              ),
            ),
        ],
      ),
    );
  }
}

@RoutePage()
class SelectAssetTypePage extends StatefulWidget {
  const SelectAssetTypePage({
    super.key,
    required this.draft,
    this.pickMedia,
    this.scanSerial,
  });

  final SolarInstallationDraft draft;
  final SolarPickMedia? pickMedia;
  final SolarScanSerial? scanSerial;

  @override
  State<SelectAssetTypePage> createState() => _SelectAssetTypePageState();
}

class _SelectAssetTypePageState extends State<SelectAssetTypePage> {
  SolarAssetType? selected;

  void _next() {
    if (selected == null) return;
    context.router.push(
      SpecificationRoute(
        draft: widget.draft,
        assetType: selected!,
        pickMedia: widget.pickMedia,
        scanSerial: widget.scanSerial,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return SolarWorkflowScaffold(
      pageKey: 'solar-select-asset-type',
      stepIndex: 1,
      footer: SolarFooterButton(
        label: context.translate(i18.common.next),
        isDisabled: selected == null,
        onPressed: _next,
      ),
      child: DigitCard(
        key: const ValueKey('solar-select-type-card'),
        children: [
          Text(
            context.translate(i18.assetFlow.selectAssetTypeTitle),
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          Text(context.translate(i18.assetFlow.chooseAssetCount),
              style: textTheme.bodyL),
          LabeledField(
            label: context.translate(i18.assetFlow.selectAssetType),
            capitalizedFirstLetter: false,
            child: DigitDropdown(
              key: const ValueKey('solar-asset-type-dropdown'),
              sentenceCaseEnabled: false,
              selectedOption: DropdownItem(
                name: selected == null ? '' : widget.draft.labelFor(selected!),
                code: selected?.name ?? '',
              ),
              items: widget.draft.applicableTypes
                  .map((type) => DropdownItem(
                      name: widget.draft.labelFor(type), code: type.name))
                  .toList(),
              onSelect: (item) => setState(
                () => selected = SolarAssetType.values.byName(item.code),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

@RoutePage()
class SpecificationPage extends StatefulWidget {
  const SpecificationPage({
    super.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.scanSerial,
  });

  final SolarInstallationDraft draft;
  final SolarAssetType assetType;
  final SolarPickMedia? pickMedia;
  final SolarScanSerial? scanSerial;

  @override
  State<SpecificationPage> createState() => _SpecificationPageState();
}

class _SpecificationPageState extends State<SpecificationPage> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final draft = widget.draft;
    final assetType = widget.assetType;
    final asset = draft.assets[assetType]!;
    return SolarWorkflowScaffold(
      pageKey: 'solar-specification-${assetType.name}',
      stepIndex: 2,
      footer: SolarFooterButton(
        label: context.translate(i18.common.next),
        onPressed: () => context.router.push(
          AssetTypeDetailRoute(
            draft: draft,
            assetType: assetType,
            pickMedia: widget.pickMedia,
            scanSerial: widget.scanSerial,
          ),
        ),
      ),
      child: DigitCard(
        key: const ValueKey('solar-specification-card'),
        children: [
          Text(
            '${draft.labelFor(assetType)} ${context.translate(i18.assetFlow.specifications)}',
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          _ReadOnlyField(
              label: context.translate(i18.assetFlow.system),
              value: asset.system),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: _OptionOrReadOnlyField(
                  label: context.translate(i18.assetFlow.totalCapacity),
                  value: asset.totalCapacity,
                  options: asset.formOptions['total_capacity'] ?? const [],
                  onChanged: (value) => setState(() {
                    asset.totalCapacity = value;
                    installationDraftRepository.saveSolarSoon(draft);
                  }),
                ),
              ),
              const SizedBox(width: spacer6),
              Expanded(
                child: _OptionOrReadOnlyField(
                  label: context.translate(i18.assetFlow.unit),
                  value: asset.capacityUnit,
                  options: asset.formOptions['total_capacity_uom'] ?? const [],
                  onChanged: (value) => setState(() {
                    asset.capacityUnit = value;
                    installationDraftRepository.saveSolarSoon(draft);
                  }),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

@RoutePage()
class AssetTypeDetailPage extends StatefulWidget {
  const AssetTypeDetailPage({
    super.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.scanSerial,
  });

  final SolarInstallationDraft draft;
  final SolarAssetType assetType;
  final SolarPickMedia? pickMedia;
  final SolarScanSerial? scanSerial;

  @override
  State<AssetTypeDetailPage> createState() => _AssetTypeDetailPageState();
}

class _AssetTypeDetailPageState extends State<AssetTypeDetailPage> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final asset = widget.draft.assets[widget.assetType]!;
    return SolarWorkflowScaffold(
      pageKey: 'solar-details-${widget.assetType.name}',
      stepIndex: 3,
      footer: SolarFooterButton(
        label: context.translate(i18.common.next),
        isDisabled: !asset.detailsComplete,
        onPressed: () => context.router.push(
          AddNewAssetRoute(
            draft: widget.draft,
            assetType: widget.assetType,
            pickMedia: widget.pickMedia,
            scanSerial: widget.scanSerial,
          ),
        ),
      ),
      child: DigitCard(
        key: const ValueKey('solar-asset-details-card'),
        children: [
          Text(
            '${widget.draft.labelFor(widget.assetType)} ${context.translate(i18.assetFlow.details)}',
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          _ReadOnlyField(
            label: context.translate(i18.assetFlow.warrantyStartDate),
            value: asset.warrantyStartDate,
          ),
          LabeledField(
            label: context.translate(i18.assetFlow.warrantyDuration),
            isRequired: true,
            capitalizedFirstLetter: false,
            child: DigitDropdown(
              key: const ValueKey('solar-warranty-dropdown'),
              sentenceCaseEnabled: false,
              selectedOption: DropdownItem(
                name: asset.warrantyDuration,
                code: asset.warrantyDuration,
              ),
              items: widget.draft
                  .warrantiesFor(widget.assetType)
                  .map((value) => DropdownItem(name: value, code: value))
                  .toList(),
              onSelect: (item) => setState(() {
                asset.warrantyDuration = item.code;
                installationDraftRepository.saveSolarSoon(widget.draft);
              }),
            ),
          ),
          _OptionOrReadOnlyField(
            label: context.translate(i18.assetFlow.brand),
            value: asset.selectedBrandCode ?? '',
            options: widget.draft.brandsFor(widget.assetType),
            onChanged: (value) => setState(() {
              asset.selectedBrandCode = value;
              installationDraftRepository.saveSolarSoon(widget.draft);
            }),
          ),
        ],
      ),
    );
  }
}

@RoutePage()
class AddNewAssetPage extends StatefulWidget {
  const AddNewAssetPage({
    super.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.scanSerial,
  });

  final SolarInstallationDraft draft;
  final SolarAssetType assetType;
  final SolarPickMedia? pickMedia;
  final SolarScanSerial? scanSerial;

  @override
  State<AddNewAssetPage> createState() => _AddNewAssetPageState();
}

class _AddNewAssetPageState extends State<AddNewAssetPage> {
  @override
  void initState() {
    super.initState();
    if (widget.scanSerial == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) requestAssetWorkflowPermissions(context);
      });
    }
  }

  Future<void> _scan(int index) async {
    final value =
        await (widget.scanSerial?.call(context) ?? openDigitScanner(context));
    if (value != null && value.trim().isNotEmpty && mounted) {
      setState(() {
        widget.draft.assets[widget.assetType]!.assets[index].serialNumber =
            value.trim();
      });
      installationDraftRepository.saveSolarSoon(widget.draft);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final assetDraft = widget.draft.assets[widget.assetType]!;
    final entries = assetDraft.assets;
    final complete =
        entries.length == widget.draft.countFor(widget.assetType) &&
            entries.every((entry) => entry.isComplete);

    return SolarWorkflowScaffold(
      pageKey: 'solar-add-assets-${widget.assetType.name}',
      stepIndex: 4,
      footer: SolarFooterButton(
        label: context.translate(i18.common.next),
        isDisabled: !complete,
        onPressed: () => context.router.push(
          MediaUploadRoute(
            draft: widget.draft,
            assetType: widget.assetType,
            pickMedia: widget.pickMedia,
          ),
        ),
      ),
      child: Column(
        children: [
          for (final indexed in entries.asMap().entries)
            Padding(
              padding: const EdgeInsets.only(bottom: spacer4),
              child: DigitCard(
                key: ValueKey('solar-asset-card-${indexed.key}'),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          '${widget.assetType == SolarAssetType.panel ? 'Panel' : widget.assetType.label} ${indexed.key + 1}',
                          style: textTheme.headingXl.copyWith(
                            color: theme.colorTheme.primary.primary2,
                          ),
                        ),
                      ),
                      const SizedBox(width: spacer2),
                      Text('${indexed.key + 1}/${entries.length}'),
                    ],
                  ),
                  LabeledField(
                    label: context.translate(i18.assetFlow.serialNumber),
                    isRequired: true,
                    capitalizedFirstLetter: false,
                    child: Row(
                      children: [
                        Expanded(
                          flex: 6,
                          child: GestureDetector(
                            key: ValueKey(
                              'asset-serial-scanner-${indexed.key}',
                            ),
                            onTap: () => _scan(indexed.key),
                            child: DigitTextFormInput(
                              key: ValueKey('solar-serial-${indexed.key}'),
                              initialValue: indexed.value.serialNumber,
                              innerLabel: indexed.value.serialNumber.isEmpty
                                  ? context
                                      .translate(i18.assetFlow.scanSerialNumber)
                                  : indexed.value.serialNumber,
                              keyboardType: TextInputType.none,
                              isDisabled: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: spacer2),
                        Expanded(
                          flex: 3,
                          child: DigitButton(
                            key: ValueKey('solar-scan-${indexed.key}'),
                            mainAxisSize: MainAxisSize.max,
                            label: context.translate(i18.assetFlow.scan),
                            type: DigitButtonType.secondary,
                            size: DigitButtonSize.large,
                            onPressed: () => _scan(indexed.key),
                          ),
                        ),
                      ],
                    ),
                  ),
                  LabeledField(
                    label: context.translate(i18.assetFlow.supportingPhoto),
                    isRequired: true,
                    capitalizedFirstLetter: false,
                    child: ImageUploader(
                      key: ValueKey('solar-photo-${indexed.key}'),
                      initialImage: indexed.value.supportingPhoto,
                      label: 'Click to add photo',
                      pickMedia: widget.pickMedia,
                      onImageSelected: (file) async {
                        final persisted = file == null
                            ? null
                            : await installationCacheRepository.persistMediaRef(
                                file,
                                '${widget.draft.cacheKey}-${widget.assetType.name}-${indexed.key}-support',
                              );
                        if (!mounted) return;
                        setState(
                            () => indexed.value.supportingPhoto = persisted);
                        installationDraftRepository.saveSolarSoon(widget.draft);
                      },
                    ),
                  ),
                  _OptionOrReadOnlyField(
                    label: context.translate(i18.assetFlow.capacity),
                    value: indexed.value.capacity.split(' ').first,
                    options: assetDraft.formOptions['capacity'] ?? const [],
                    onChanged: (value) => setState(() {
                      final units = assetDraft.formOptions['capacity_uom'];
                      indexed.value.capacity =
                          '$value${units?.isNotEmpty == true ? ' ${units!.first}' : ''}';
                      installationDraftRepository.saveSolarSoon(widget.draft);
                    }),
                  ),
                  if (assetDraft.typeOptions.isNotEmpty)
                    _OptionOrReadOnlyField(
                      label: context.translate(i18.assetFlow.assetType),
                      value: indexed.value.fields['type']?.toString() ??
                          assetDraft.typeOptions.first,
                      options: assetDraft.typeOptions,
                      onChanged: (value) => setState(() {
                        indexed.value.fields['type'] = value;
                        installationDraftRepository.saveSolarSoon(widget.draft);
                      }),
                    ),
                  for (final field in assetDraft.formOptions.entries.where(
                    (field) =>
                        !const {
                          'total_capacity',
                          'total_capacity_uom',
                          'capacity',
                          'capacity_uom',
                        }.contains(field.key) &&
                        !field.key.endsWith('_uom'),
                  ))
                    _OptionOrReadOnlyField(
                      label: field.key.replaceAll('_', ' '),
                      value: indexed.value.fields[field.key]?.toString() ??
                          field.value.first,
                      options: field.value,
                      onChanged: (value) => setState(() {
                        indexed.value.fields[field.key] = value;
                        final units =
                            assetDraft.formOptions['${field.key}_uom'];
                        if (units?.isNotEmpty == true) {
                          indexed.value.fields['${field.key}_uom'] =
                              units!.first;
                        }
                        installationDraftRepository.saveSolarSoon(widget.draft);
                      }),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

@RoutePage()
class MediaUploadPage extends StatefulWidget {
  const MediaUploadPage({
    super.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
  });

  final SolarInstallationDraft draft;
  final SolarAssetType assetType;
  final SolarPickMedia? pickMedia;

  @override
  State<MediaUploadPage> createState() => _MediaUploadPageState();
}

class _MediaUploadPageState extends State<MediaUploadPage> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final asset = widget.draft.assets[widget.assetType]!;
    return SolarWorkflowScaffold(
      pageKey: 'solar-media-${widget.assetType.name}',
      stepIndex: 5,
      footer: SolarFooterButton(
        label: context.translate(i18.common.next),
        isDisabled: asset.images.isEmpty,
        onPressed: () => context.router.push(
          AssetSummaryRoute(
            draft: widget.draft,
            assetType: widget.assetType,
            pickMedia: widget.pickMedia,
          ),
        ),
      ),
      child: Column(
        children: [
          DigitCard(
            key: const ValueKey('solar-images-card'),
            children: [
              Text(
                '${widget.draft.labelFor(widget.assetType)} ${context.translate(i18.assetFlow.images)}',
                style: textTheme.headingXl.copyWith(
                  color: theme.colorTheme.primary.primary2,
                ),
              ),
              Text(
                '${context.translate(i18.assetFlow.addAllImages)} ${widget.draft.labelFor(widget.assetType)}',
                style: textTheme.bodyL,
              ),
              const SizedBox(height: spacer2),
              ImageUploader(
                label: context.translate(i18.assetFlow.uploadImages),
                allowMultiples: true,
                initialImages: asset.images,
                pickMedia: widget.pickMedia,
                onImagesSelected: (files) async {
                  final persisted = <SolarFileRef>[];
                  for (var index = 0; index < files.length; index++) {
                    persisted.add(await installationCacheRepository.persistMediaRef(
                        files[index],
                        '${widget.draft.cacheKey}-${widget.assetType.name}-image-$index'));
                  }
                  if (!mounted) return;
                  setState(() => asset.images
                    ..clear()
                    ..addAll(persisted));
                  installationDraftRepository.saveSolarSoon(widget.draft);
                },
              ),
            ],
          ),
          const SizedBox(height: spacer4),
          DigitCard(
            key: const ValueKey('solar-videos-card'),
            children: [
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    '${widget.draft.labelFor(widget.assetType)} ${context.translate(i18.assetFlow.videos)}',
                    style: textTheme.headingXl.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                  const SizedBox(width: spacer1),
                  Text(
                    context.translate(i18.common.optional),
                    style: textTheme.bodyL.copyWith(
                      color: theme.colorTheme.primary.primary2,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: spacer2),
              VideoUploader(
                label: context.translate(i18.assetFlow.uploadVideos),
                allowMultiples: true,
                initialVideos: asset.videos,
                pickMedia: widget.pickMedia,
                onVideosSelected: (files) async {
                  final persisted = <SolarFileRef>[];
                  for (var index = 0; index < files.length; index++) {
                    persisted.add(await installationCacheRepository.persistMediaRef(
                        files[index],
                        '${widget.draft.cacheKey}-${widget.assetType.name}-video-$index'));
                  }
                  if (!mounted) return;
                  setState(() => asset.videos
                    ..clear()
                    ..addAll(persisted));
                  installationDraftRepository.saveSolarSoon(widget.draft);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

@RoutePage()
class AssetSummaryPage extends StatelessWidget {
  const AssetSummaryPage({
    super.key,
    required this.draft,
    required this.assetType,
    this.pickMedia,
    this.readOnly = false,
  });

  final SolarInstallationDraft draft;
  final SolarAssetType assetType;
  final SolarPickMedia? pickMedia;
  final bool readOnly;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    final asset = draft.assets[assetType]!;
    return SolarWorkflowScaffold(
      pageKey: 'solar-asset-summary-${assetType.name}',
      footer: readOnly
          ? null
          : SolarFooterButton(
              label: context.translate(i18.common.next),
              onPressed: () => context.router.push(
                DataSaveSuccessRoute(
                  draft: draft,
                  pickMedia: pickMedia,
                ),
              ),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${draft.labelFor(assetType)} ${context.translate(i18.assetFlow.summary)}',
            style: textTheme.headingXl.copyWith(
              color: theme.colorTheme.primary.primary2,
            ),
          ),
          const SizedBox(height: spacer2),
          _SummaryCard(
            title: context.translate(i18.assetFlow.healthFacilityDetails),
            values: {
              context.translate(i18.common.name): draft.facilityName,
              context.translate(i18.common.status): context
                  .translate(i18.installationReportHome.pendingInstallation),
            },
          ),
          _SummaryCard(
            title: context.translate(i18.common.count),
            values: {
              draft.labelFor(assetType): draft.countFor(assetType).toString()
            },
            onEdit: readOnly
                ? null
                : () => context.router.push(
                      AssetCountRoute(
                        draft: draft,
                        pickMedia: pickMedia,
                      ),
                    ),
          ),
          _SummaryCard(
            title: context.translate(i18.assetFlow.specifications),
            values: {
              context.translate(i18.assetFlow.system): asset.system,
              context.translate(i18.assetFlow.capacity):
                  '${asset.totalCapacity} ${asset.capacityUnit}',
            },
            onEdit: readOnly
                ? null
                : () => context.router.push(
                      SpecificationRoute(
                        draft: draft,
                        assetType: assetType,
                        pickMedia: pickMedia,
                      ),
                    ),
          ),
          _SummaryCard(
            title: context.translate(i18.assetFlow.details),
            values: {
              context.translate(i18.assetFlow.warrantyStartDate):
                  asset.warrantyStartDate,
              context.translate(i18.assetFlow.warrantyDuration):
                  asset.warrantyDuration,
              context.translate(i18.assetFlow.brand):
                  asset.selectedBrandCode ?? '',
            },
            onEdit: readOnly
                ? null
                : () => context.router.push(
                      AssetTypeDetailRoute(
                        draft: draft,
                        assetType: assetType,
                        pickMedia: pickMedia,
                      ),
                    ),
          ),
          for (final indexed in asset.assets.asMap().entries)
            _SummaryCard(
              title: '${draft.labelFor(assetType)} ${indexed.key + 1}',
              values: {
                context.translate(i18.assetFlow.serialNumber):
                    indexed.value.serialNumber,
                context.translate(i18.assetFlow.capacity):
                    indexed.value.capacity,
                context.translate(i18.assetFlow.assetType):
                    indexed.value.fields['type']?.toString() ?? '—',
                context.translate(i18.assetFlow.images):
                    indexed.value.supportingPhoto?.name ?? '—',
              },
              media: indexed.value.supportingPhoto == null
                  ? const []
                  : [indexed.value.supportingPhoto!],
              onEdit: readOnly
                  ? null
                  : () => context.router.push(
                        AddNewAssetRoute(
                          draft: draft,
                          assetType: assetType,
                          pickMedia: pickMedia,
                        ),
                      ),
            ),
          _SummaryCard(
            title:
                '${draft.labelFor(assetType)} ${context.translate(i18.assetFlow.images)}',
            values: {
              context.translate(i18.assetFlow.images):
                  asset.images.map((file) => file.name).join(', '),
            },
            media: asset.images,
            onEdit: readOnly
                ? null
                : () => context.router.push(
                      MediaUploadRoute(
                        draft: draft,
                        assetType: assetType,
                        pickMedia: pickMedia,
                      ),
                    ),
          ),
          if (asset.videos.isNotEmpty)
            _SummaryCard(
              title:
                  '${draft.labelFor(assetType)} ${context.translate(i18.assetFlow.videos)}',
              values: {
                context.translate(i18.assetFlow.videos):
                    asset.videos.map((file) => file.name).join(', '),
              },
              media: asset.videos,
              onEdit: readOnly
                  ? null
                  : () => context.router.push(
                        MediaUploadRoute(
                          draft: draft,
                          assetType: assetType,
                          pickMedia: pickMedia,
                        ),
                      ),
            ),
        ],
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  const _ReadOnlyField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => LabeledField(
        label: label,
        capitalizedFirstLetter: false,
        child: DigitTextFormInput(
          controller: TextEditingController(),
          initialValue: value,
          isDisabled: true,
          readOnly: true,
          keyboardType: TextInputType.none,
        ),
      );
}

class _OptionOrReadOnlyField extends StatelessWidget {
  const _OptionOrReadOnlyField({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> options;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    if (options.isEmpty) return _ReadOnlyField(label: label, value: value);
    final selected = options.contains(value) ? value : options.first;
    return LabeledField(
      label: label,
      isRequired: true,
      capitalizedFirstLetter: false,
      child: DigitDropdown(
        sentenceCaseEnabled: false,
        selectedOption: DropdownItem(name: selected, code: selected),
        items: options
            .map((item) => DropdownItem(name: item, code: item))
            .toList(),
        onSelect: (item) => onChanged(item.code),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.title,
    required this.values,
    this.onEdit,
    this.media = const [],
  });

  final String title;
  final Map<String, String> values;
  final VoidCallback? onEdit;
  final List<SolarFileRef> media;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.digitTextTheme(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: spacer4),
      child: DigitCard(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: textTheme.headingM.copyWith(
                    color: theme.colorTheme.primary.primary2,
                  ),
                ),
              ),
              if (onEdit != null)
                DigitButton(
                  label: context.translate(i18.common.edit),
                  type: DigitButtonType.tertiary,
                  size: DigitButtonSize.small,
                  onPressed: onEdit!,
                ),
            ],
          ),
          for (final entry in values.entries)
            Padding(
              padding: const EdgeInsets.only(top: spacer3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(entry.key, style: textTheme.headingS),
                  ),
                  const SizedBox(width: spacer4),
                  Expanded(child: Text(entry.value, style: textTheme.bodyS)),
                ],
              ),
            ),
          if (media.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: spacer3),
              child: Wrap(
                spacing: spacer2,
                runSpacing: spacer2,
                children:
                    media.map((file) => MediaThumbnail(media: file)).toList(),
              ),
            ),
        ],
      ),
    );
  }
}
