import 'package:flutter_bloc/flutter_bloc.dart';

import '../../model/mdms/common_masters.dart';
import '../../repositories/installation_images_repository.dart';

sealed class InstallationImagesEvent {
  const InstallationImagesEvent();
}

class FetchInstallationImages extends InstallationImagesEvent {
  const FetchInstallationImages({
    required this.systemCode,
    this.forceRefresh = false,
  });

  final String systemCode;
  final bool forceRefresh;
}

sealed class InstallationImagesState {
  const InstallationImagesState();
}

class InstallationImagesInitial extends InstallationImagesState {
  const InstallationImagesInitial();
}

class InstallationImagesLoading extends InstallationImagesState {
  const InstallationImagesLoading();
}

class InstallationImagesLoaded extends InstallationImagesState {
  const InstallationImagesLoaded(this.items);

  final List<InstallationImageRequirement> items;
}

class InstallationImagesError extends InstallationImagesState {
  const InstallationImagesError(this.message);

  final String message;
}

class InstallationImagesBloc
    extends Bloc<InstallationImagesEvent, InstallationImagesState> {
  InstallationImagesBloc({
    InstallationImagesRepository? repository,
    List<InstallationImageRequirement> initialItems = const [],
  })  : _repository = repository ?? InstallationImagesRepository(),
        super(initialItems.isEmpty
            ? const InstallationImagesInitial()
            : InstallationImagesLoaded(initialItems)) {
    on<FetchInstallationImages>(_onFetch);
  }

  final InstallationImagesRepository _repository;

  Future<void> _onFetch(
    FetchInstallationImages event,
    Emitter<InstallationImagesState> emit,
  ) async {
    final previous = state;
    final hasUsableCache =
        previous is InstallationImagesLoaded && previous.items.isNotEmpty;
    if (!hasUsableCache) emit(const InstallationImagesLoading());
    try {
      final items = await _repository.fetch(
        systemCode: event.systemCode,
        forceRefresh: event.forceRefresh,
      );
      if (items.isEmpty) {
        if (!hasUsableCache) {
          emit(const InstallationImagesError(
            'No active installation image configuration was found for this system.',
          ));
        }
      } else {
        emit(InstallationImagesLoaded(items));
      }
    } catch (_) {
      if (!hasUsableCache) {
        emit(const InstallationImagesError(
          'Failed to load installation image configuration. Please try again.',
        ));
      }
    }
  }
}
