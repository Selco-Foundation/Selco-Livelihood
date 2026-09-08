/// Splits a DIGIT hierarchical boundary code (e.g.
/// `INDIA_ASSAM_BAKSA_BORABARI`) into its state/district/block segments.
/// The leading country segment (`INDIA`) is always dropped; segments beyond
/// block are ignored.
class BoundaryLocality {
  const BoundaryLocality({
    this.state = '',
    this.district = '',
    this.block = '',
  });

  final String state;
  final String district;
  final String block;

  factory BoundaryLocality.parse(String? boundaryCode) {
    if (boundaryCode == null || boundaryCode.trim().isEmpty) {
      return const BoundaryLocality();
    }

    final segments = boundaryCode.split('_');
    return BoundaryLocality(
      state: segments.length > 1 ? segments[1] : '',
      district: segments.length > 2 ? segments[2] : '',
      block: segments.length > 3 ? segments[3] : '',
    );
  }
}
