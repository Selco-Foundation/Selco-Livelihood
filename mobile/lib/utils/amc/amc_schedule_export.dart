import 'dart:io';

import 'package:excel/excel.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../model/amc/amc_schedule.dart';

/// Download Schedule: the schedule as an Excel (.xlsx) file, built on
/// the device from the same visits the screen shows.

const String amcScheduleSheetName = 'AMC Schedule';

/// Android's public Downloads folder, where the vendor can find the file.
const String _androidDownloads = '/storage/emulated/0/Download';

/// "AMC_Schedule_next_30_days_2026-11-17.xlsx".
String amcScheduleFileName(int days, [DateTime? now]) =>
    'AMC_Schedule_next_${days}_days_'
    '${DateFormat('yyyy-MM-dd').format(now ?? DateTime.now())}.xlsx';

/// The workbook's bytes: one header row ([headers], already translated, in
/// the order name, phone, state, district, block, Scheduled AMC Date,
/// machines), then one row per entry. Every cell is text, so phone numbers
/// keep their digits and dates read as on screen.
List<int> buildAmcScheduleWorkbook({
  required List<AmcScheduleEntry> entries,
  required List<String> headers,
}) {
  assert(headers.length == 7, 'One header per column');
  final excel = Excel.createExcel();
  final defaultSheet = excel.getDefaultSheet();
  if (defaultSheet != null && defaultSheet != amcScheduleSheetName) {
    excel.rename(defaultSheet, amcScheduleSheetName);
  }
  final sheet = excel[amcScheduleSheetName];

  sheet.appendRow([for (final header in headers) TextCellValue(header)]);
  final bold = CellStyle(bold: true);
  for (var column = 0; column < headers.length; column++) {
    sheet
        .cell(CellIndex.indexByColumnRow(columnIndex: column, rowIndex: 0))
        .cellStyle = bold;
  }

  final date = DateFormat('dd/MM/yyyy');
  for (final entry in entries) {
    sheet.appendRow([
      TextCellValue(entry.endUserName),
      TextCellValue(entry.phone),
      TextCellValue(entry.state),
      TextCellValue(entry.district),
      TextCellValue(entry.block),
      TextCellValue(date.format(entry.scheduledDate)),
      TextCellValue(entry.machines.join(', ')),
    ]);
  }

  const widths = [26.0, 16.0, 16.0, 18.0, 18.0, 20.0, 40.0];
  for (var column = 0; column < widths.length; column++) {
    sheet.setColumnWidth(column, widths[column]);
  }

  final bytes = excel.encode();
  if (bytes == null) throw StateError('Could not create the Excel file');
  return bytes;
}

/// Saves [bytes] as [fileName], replacing an older copy with the same name.
/// On Android it goes to the public Downloads folder; if that cannot be
/// written (Android 10, or storage permission refused on Android 9 and
/// older) it falls back to the app's own folders, which the file can still
/// be opened from.
Future<File> saveAmcScheduleFile(List<int> bytes, String fileName) async {
  Future<File?> tryWrite(Directory? dir) async {
    if (dir == null) return null;
    try {
      if (!await dir.exists()) await dir.create(recursive: true);
      final file = File(p.join(dir.path, fileName));
      await file.writeAsBytes(bytes, flush: true);
      return file;
    } catch (e) {
      debugPrint('Could not save the AMC schedule in ${dir.path}: $e');
      return null;
    }
  }

  if (Platform.isAndroid) {
    final downloads = Directory(_androidDownloads);
    var saved = await tryWrite(downloads);
    // Android 9 and older need the storage permission for Downloads; on
    // newer versions the request returns at once without a dialog.
    if (saved == null &&
        await Permission.storage.request() == PermissionStatus.granted) {
      saved = await tryWrite(downloads);
    }
    if (saved != null) return saved;
    final external =
        await getExternalStorageDirectories(type: StorageDirectory.downloads)
            .catchError((Object _) => null);
    saved = await tryWrite(external?.firstOrNull);
    if (saved != null) return saved;
  } else {
    final saved = await tryWrite(
        await getDownloadsDirectory().catchError((Object _) => null));
    if (saved != null) return saved;
  }

  final saved = await tryWrite(await getApplicationDocumentsDirectory());
  if (saved == null) {
    throw FileSystemException('Could not save the AMC schedule', fileName);
  }
  return saved;
}
