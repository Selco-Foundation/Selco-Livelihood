import '../../utils/amc/amc_utils.dart' show amcVisitLocality;
import 'amc_site_details.dart';
import 'scheduled_visit.dart';

/// View Schedule: the periods the vendor can choose, in days from
/// today. Only up to 30 days, the same limit as New Report
/// ([amcSubmissionWindowDays]), so the schedule never lists a visit that
/// cannot be reported on yet.
const List<int> amcSchedulePeriods = [10, 20, 30];

/// The period selected when the screen opens.
const int amcDefaultSchedulePeriod = 30;

/// First instant of the schedule: the start of today, on the device's
/// calendar. Overdue visits are not part of the schedule (New Report lists
/// them under "AMC delayed").
DateTime amcScheduleStart([DateTime? now]) {
  final today = now ?? DateTime.now();
  return DateTime(today.year, today.month, today.day);
}

/// Last instant of a [days]-day schedule: the end of the day [days] days
/// from today (so "next 10 days" on 17 Nov runs to the end of 27 Nov,
/// matching New Report's 30-day window).
DateTime amcScheduleEnd(int days, [DateTime? now]) {
  final today = now ?? DateTime.now();
  return DateTime(today.year, today.month, today.day + days + 1)
      .subtract(const Duration(milliseconds: 1));
}

/// True when [visit] is a not-started (`SCHEDULED`) visit due between today
/// and the end of the [days]-day period.
bool isInAmcSchedule(ScheduledVisit visit, int days, [DateTime? now]) {
  if (visit.status != 'SCHEDULED') return false;
  final date = visit.scheduledDate?.toLocal();
  if (date == null) return false;
  return !date.isBefore(amcScheduleStart(now)) &&
      !date.isAfter(amcScheduleEnd(days, now));
}

/// The visits of a [days]-day schedule, earliest due first.
List<ScheduledVisit> amcScheduleVisits(
    Iterable<ScheduledVisit> visits, int days,
    [DateTime? now]) {
  final byId = <String, ScheduledVisit>{};
  final withoutId = <ScheduledVisit>[];
  for (final visit in visits.where((v) => isInAmcSchedule(v, days, now))) {
    final id = visit.id?.trim() ?? '';
    id.isEmpty ? withoutId.add(visit) : byId[id] = visit;
  }
  return [...byId.values, ...withoutId]
    ..sort((a, b) => a.scheduledDate!.compareTo(b.scheduledDate!));
}

/// Names of the machines installed with the end user, from the visit's
/// `siteDetails.machines` (each `{activityFacilityId, solutionId, status,
/// name}`; `name` already joins the machine's asset names). Falls back to
/// the solution id when a machine has no asset name yet.
List<String> amcMachineNames(Map<String, dynamic>? siteDetails) {
  final machines = siteDetails?['machines'];
  if (machines is! List) return const [];
  final names = <String>[];
  for (final machine in machines) {
    final String? name;
    if (machine is Map) {
      name = [machine['name'], machine['solutionId']]
          .map((v) => v?.toString().trim() ?? '')
          .firstWhere((v) => v.isNotEmpty, orElse: () => '');
    } else {
      name = machine?.toString().trim();
    }
    if (name != null && name.isNotEmpty) names.add(name);
  }
  return names;
}

/// One row of the schedule, on screen and in the Excel file.
class AmcScheduleEntry {
  const AmcScheduleEntry({
    required this.visitId,
    required this.endUserName,
    required this.phone,
    required this.state,
    required this.district,
    required this.block,
    required this.scheduledDate,
    this.machines = const [],
  });

  final String? visitId;
  final String endUserName;
  final String phone;
  final String state;
  final String district;
  final String block;
  final DateTime scheduledDate;

  /// Only in the Excel file.
  final List<String> machines;

  /// Uses the same end user name and phone as the report's Site Details,
  /// and the same state/district/block as the visit cards.
  factory AmcScheduleEntry.fromVisit(ScheduledVisit visit) {
    final site = AmcSiteDetails.fromVisit(visit);
    final locality = amcVisitLocality(visit);
    return AmcScheduleEntry(
      visitId: visit.id,
      endUserName: site.endUserName ?? '',
      phone: site.endUserPhone ?? '',
      state: locality.state,
      district: locality.district,
      block: locality.block,
      scheduledDate: visit.scheduledDate!.toLocal(),
      machines: amcMachineNames(visit.siteDetails),
    );
  }
}
