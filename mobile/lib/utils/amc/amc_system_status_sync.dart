import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../../repositories/amc/amc_system_status_repo.dart';

/// Sends queued AMC "system not functional" updates (#247) once the device
/// is online:
///  * when the app starts,
///  * whenever connectivity comes back while the app is running,
///  * when AMC home is opened (e.g. right after logging in).
///
/// Nothing is sent while the app is closed; the queue is kept on the device
/// and sent on the next of the triggers above.
class AmcSystemStatusSync {
  AmcSystemStatusSync._();

  static final AmcSystemStatusSync instance = AmcSystemStatusSync._();

  StreamSubscription<List<ConnectivityResult>>? _subscription;
  Future<int>? _inFlight;

  /// Starts listening for connectivity and flushes once now.
  void start() {
    if (_subscription != null) return;
    try {
      _subscription = Connectivity().onConnectivityChanged.listen((results) {
        if (results.any((r) => r != ConnectivityResult.none)) flush();
      });
    } catch (e) {
      debugPrint('AmcSystemStatusSync.start error=$e');
    }
    flush();
  }

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
  }

  /// Flushes the queue; concurrent calls share one run.
  Future<int> flush() {
    return _inFlight ??= () async {
      try {
        final sent = await AmcSystemStatusRepository().flushQueue();
        if (sent > 0) debugPrint('AMC system status: sent $sent queued');
        return sent;
      } catch (e) {
        debugPrint('AmcSystemStatusSync.flush error=$e');
        return 0;
      } finally {
        _inFlight = null;
      }
    }();
  }
}
