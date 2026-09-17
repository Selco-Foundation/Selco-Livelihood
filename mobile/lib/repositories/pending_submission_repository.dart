import 'dart:convert';
import 'dart:io';

import 'package:isar/isar.dart';
import 'package:flutter/foundation.dart';

import '../data/nosql/cache_pending_submission.dart';
import '../model/activity_facility_workflow/activity_facility_workflow.dart';
import '../utils/constants.dart';

enum PendingSubmissionState { pendingOtpApproval, pendingApproval }

class PendingSubmissionRecord {
  const PendingSubmissionRecord({
    required this.activityFacilityId,
    required this.facilityId,
    required this.componentType,
    required this.state,
    required this.workflowMode,
    required this.workflow,
    required this.otpRequested,
    required this.otpVerified,
    required this.submissionCompleted,
    required this.createdAt,
    required this.updatedAt,
  });

  final String activityFacilityId;
  final String facilityId;
  final String componentType;
  final PendingSubmissionState state;
  final String workflowMode;
  final ActivityFacilityWorkflow workflow;
  final bool otpRequested;
  final bool otpVerified;
  final bool submissionCompleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get canSync =>
      state == PendingSubmissionState.pendingApproval &&
      otpVerified &&
      !submissionCompleted;

  bool matchesAttempt(
    ActivityFacilityWorkflow current,
    String currentMode,
  ) {
    if (submissionCompleted || workflowMode != currentMode) return false;
    String cycle(ActivityFacilityWorkflow value) {
      final workflow = value.workflow;
      final status = (workflow?.state ??
              value.status ??
              value.activityFacility.status ??
              '')
          .trim()
          .toUpperCase();
      final action = workflow?.action?.trim().toUpperCase() ?? '';
      final modifiedAt = workflow?.auditDetails?.lastModifiedTime ?? 0;
      return '$status|$action|$modifiedAt';
    }

    return cycle(workflow) == cycle(current);
  }
}

class PendingSubmissionRepository {
  final Map<String, CachePendingSubmission> _testRows = {};

  bool get _usesTestMemory => Platform.environment.containsKey('FLUTTER_TEST');

  @visibleForTesting
  void clearForTests() => _testRows.clear();

  Future<Isar> get _isar =>
      Constants().isar.timeout(const Duration(seconds: 2));

  Future<PendingSubmissionRecord?> read(String activityFacilityId) async {
    if (_usesTestMemory) {
      final row = _testRows[activityFacilityId];
      return row == null ? null : _toRecord(row);
    }
    try {
      final isar = await _isar;
      final row = await isar.cachePendingSubmissions
          .filter()
          .activityFacilityIdEqualTo(activityFacilityId)
          .findFirst();
      return row == null ? null : _toRecord(row);
    } catch (_) {
      return null;
    }
  }

  Future<List<PendingSubmissionRecord>> readAll({
    PendingSubmissionState? state,
  }) async {
    if (_usesTestMemory) {
      final rows = _testRows.values
          .where((row) => state == null || row.state == state.name)
          .toList()
        ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return rows.map(_toRecord).whereType<PendingSubmissionRecord>().toList();
    }
    try {
      final isar = await _isar;
      final rows = state == null
          ? await isar.cachePendingSubmissions.where().findAll()
          : await isar.cachePendingSubmissions
              .filter()
              .stateEqualTo(state.name)
              .findAll();
      rows.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return rows.map(_toRecord).whereType<PendingSubmissionRecord>().toList();
    } catch (_) {
      return const [];
    }
  }

  Future<Set<String>> activityFacilityIds() async =>
      (await readAll()).map((record) => record.activityFacilityId).toSet();

  Future<void> markOtpRequested(
    ActivityFacilityWorkflow workflow, {
    String workflowMode = 'newReport',
  }) =>
      _upsert(
        workflow,
        desiredState: PendingSubmissionState.pendingOtpApproval,
        workflowMode: workflowMode,
        otpRequested: true,
      );

  Future<void> saveDraft(
    ActivityFacilityWorkflow workflow, {
    String workflowMode = 'newReport',
  }) =>
      _upsert(
        workflow,
        desiredState: PendingSubmissionState.pendingOtpApproval,
        workflowMode: workflowMode,
      );

  Future<void> markOtpVerified(
    ActivityFacilityWorkflow workflow, {
    String workflowMode = 'newReport',
  }) =>
      _upsert(
        workflow,
        desiredState: PendingSubmissionState.pendingApproval,
        workflowMode: workflowMode,
        otpRequested: true,
        otpVerified: true,
      );

  Future<void> markSubmissionCompleted(String activityFacilityId) async {
    if (_usesTestMemory) {
      final row = _testRows[activityFacilityId];
      if (row != null) {
        row
          ..submissionCompleted = true
          ..updatedAt = DateTime.now();
      }
      return;
    }
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final row = await isar.cachePendingSubmissions
            .filter()
            .activityFacilityIdEqualTo(activityFacilityId)
            .findFirst();
        if (row == null) return;
        row
          ..submissionCompleted = true
          ..updatedAt = DateTime.now();
        await isar.cachePendingSubmissions.put(row);
      });
    } catch (_) {}
  }

  Future<void> remove(String activityFacilityId) async {
    if (_usesTestMemory) {
      _testRows.remove(activityFacilityId);
      return;
    }
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final row = await isar.cachePendingSubmissions
            .filter()
            .activityFacilityIdEqualTo(activityFacilityId)
            .findFirst();
        if (row != null) await isar.cachePendingSubmissions.delete(row.id);
      });
    } catch (_) {}
  }

  Future<void> removeConfirmed(Iterable<String> backendIds) async {
    for (final id in backendIds.toSet()) {
      await remove(id);
    }
  }

  Future<void> _upsert(
    ActivityFacilityWorkflow workflow, {
    required PendingSubmissionState desiredState,
    required String workflowMode,
    bool otpRequested = false,
    bool otpVerified = false,
  }) async {
    final activityFacilityId = workflow.activityFacility.id?.trim() ?? '';
    final facilityId = workflow.activityFacility.facilityId?.trim() ?? '';
    if (activityFacilityId.isEmpty || facilityId.isEmpty) return;
    if (_usesTestMemory) {
      final existing = _testRows[activityFacilityId];
      final row = existing ?? CachePendingSubmission();
      final alreadyApproved =
          existing?.state == PendingSubmissionState.pendingApproval.name;
      row
        ..activityFacilityId = activityFacilityId
        ..facilityId = facilityId
        ..componentType =
            workflow.activityFacility.componentType?.trim().toUpperCase() ?? ''
        ..state = alreadyApproved
            ? PendingSubmissionState.pendingApproval.name
            : desiredState.name
        ..workflowMode = workflowMode
        ..rawWorkflowJson = jsonEncode(workflow.toJson())
        ..otpRequested = (existing?.otpRequested ?? false) || otpRequested
        ..otpVerified = (existing?.otpVerified ?? false) || otpVerified
        ..submissionCompleted = existing?.submissionCompleted ?? false
        ..updatedAt = DateTime.now();
      _testRows[activityFacilityId] = row;
      return;
    }
    try {
      final isar = await _isar;
      await isar.writeTxn(() async {
        final existing = await isar.cachePendingSubmissions
            .filter()
            .activityFacilityIdEqualTo(activityFacilityId)
            .findFirst();
        final row = existing ?? CachePendingSubmission();
        final alreadyApproved =
            existing?.state == PendingSubmissionState.pendingApproval.name;
        row
          ..activityFacilityId = activityFacilityId
          ..facilityId = facilityId
          ..componentType =
              workflow.activityFacility.componentType?.trim().toUpperCase() ??
                  ''
          ..state = alreadyApproved
              ? PendingSubmissionState.pendingApproval.name
              : desiredState.name
          ..workflowMode = workflowMode
          ..rawWorkflowJson = jsonEncode(workflow.toJson())
          ..otpRequested = (existing?.otpRequested ?? false) || otpRequested
          ..otpVerified = (existing?.otpVerified ?? false) || otpVerified
          ..submissionCompleted = existing?.submissionCompleted ?? false
          ..updatedAt = DateTime.now();
        await isar.cachePendingSubmissions.put(row);
      });
    } catch (_) {}
  }

  PendingSubmissionRecord? _toRecord(CachePendingSubmission row) {
    try {
      final decoded = jsonDecode(row.rawWorkflowJson);
      if (decoded is! Map) return null;
      return PendingSubmissionRecord(
        activityFacilityId: row.activityFacilityId,
        facilityId: row.facilityId,
        componentType: row.componentType,
        state: PendingSubmissionState.values.firstWhere(
          (value) => value.name == row.state,
          orElse: () => PendingSubmissionState.pendingOtpApproval,
        ),
        workflowMode: row.workflowMode,
        workflow: ActivityFacilityWorkflow.fromJson(
          Map<String, dynamic>.from(decoded),
        ),
        otpRequested: row.otpRequested,
        otpVerified: row.otpVerified,
        submissionCompleted: row.submissionCompleted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      );
    } catch (_) {
      return null;
    }
  }
}

PendingSubmissionRepository pendingSubmissionRepository =
    PendingSubmissionRepository();
