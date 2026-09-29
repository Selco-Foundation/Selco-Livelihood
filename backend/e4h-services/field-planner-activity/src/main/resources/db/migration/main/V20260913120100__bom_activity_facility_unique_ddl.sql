-- One bill of material per asset, enforced.
--
-- BomEnrichment now reuses an asset's existing BOM id instead of minting a random one, which
-- closes the duplicate path for a single caller. This index closes the rest: two devices saving
-- at the same moment both read "no row yet" and both insert. Without it that is a silent
-- duplicate; with it, the second insert fails in the persister where it can be seen.
--
-- Partial, because activity_facility_id is nullable and several older rows predate the column.
-- NULLs are distinct in a Postgres unique index anyway, so the predicate is documentation as
-- much as constraint - but it also keeps the index off rows that can never collide.
--
-- Requires V20260913120000 to have collapsed the existing duplicates first; this statement
-- fails loudly rather than silently if any remain, which is the intended behaviour.

CREATE UNIQUE INDEX IF NOT EXISTS idx_bom_activity_facility_unique
    ON bom (activity_facility_id)
    WHERE activity_facility_id IS NOT NULL;

-- The non-unique index from V20260825120000 is now redundant: the unique index above serves the
-- same lookups. Dropping it saves a write on every bom insert and update.
DROP INDEX IF EXISTS idx_bom_activity_facility;
