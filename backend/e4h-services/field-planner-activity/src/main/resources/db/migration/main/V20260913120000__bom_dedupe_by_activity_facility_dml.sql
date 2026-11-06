-- Collapse duplicate BOM rows so at most one survives per asset.
--
-- An asset has exactly one bill of material: Vendor Assignment seeds it, and the Field
-- Technician's app edits that same row. Nothing enforced that, though. The app chooses between
-- _create and _update from its own local cache, so a reinstall or a second device sent a _create
-- for an asset that already had a row, and BomEnrichment minted a fresh random id for it. The
-- result is two rows pointing at one activity_facility_id, with enrichBillOfMaterialOnSearch
-- resolving the ambiguity by taking whichever came back first.
--
-- Keep the earliest row per asset: where Vendor Assignment ran, that is the seeded row carrying
-- the vendor, the report number and the parts list. Fold any later rows' data into it first so a
-- technician's readings are not thrown away, then delete them.
--
-- Runs before V20260913120100, which adds the unique index this makes room for.

WITH ranked AS (
    SELECT id,
           activity_facility_id,
           data,
           row_number() OVER (PARTITION BY activity_facility_id
                              ORDER BY created_time, id) AS rn
    FROM bom
    WHERE activity_facility_id IS NOT NULL
),
extra AS (
    -- Later rows' keys, oldest first, so the newest value wins on a collision.
    SELECT r.activity_facility_id,
           jsonb_object_agg(kv.key, kv.value) AS fields
    FROM ranked r
    CROSS JOIN LATERAL jsonb_each(COALESCE(r.data, '{}'::jsonb)) AS kv
    WHERE r.rn > 1
    GROUP BY r.activity_facility_id
)
UPDATE bom b
SET data = COALESCE(b.data, '{}'::jsonb) || e.fields,
    last_modified_time = EXTRACT(EPOCH FROM NOW()) * 1000
FROM extra e,
     ranked k
WHERE k.activity_facility_id = e.activity_facility_id
  AND k.rn = 1
  AND b.id = k.id;

WITH ranked AS (
    SELECT id,
           row_number() OVER (PARTITION BY activity_facility_id
                              ORDER BY created_time, id) AS rn
    FROM bom
    WHERE activity_facility_id IS NOT NULL
)
DELETE FROM bom b
USING ranked r
WHERE b.id = r.id
  AND r.rn > 1;
