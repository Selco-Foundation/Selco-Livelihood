import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../blocs/app_init/app_init.dart';

/// Invisible widget that kicks off the MDMS v1 asset-registry/facility
/// fetch once app config has loaded, mirroring E4H's own `MdmsGate`.
///
/// Reads `AppInitialization` as nullable: many widget tests pump `HomePage`
/// (directly or via the authenticated route) without providing that bloc,
/// and a missing provider must be a no-op here rather than a crash.
class MdmsGate extends StatefulWidget {
  const MdmsGate({super.key});

  @override
  State<MdmsGate> createState() => _MdmsGateState();
}

class _MdmsGateState extends State<MdmsGate> {
  @override
  void initState() {
    super.initState();
    final appInit = context.read<AppInitialization?>();
    if (appInit == null) return;
    if (appInit.state is Defaulted) {
      appInit.add(const InitEvent.fetchMdms());
    }
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
