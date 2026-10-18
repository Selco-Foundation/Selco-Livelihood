-- LGD identity for every boundary.
--
-- Boundary codes are derived from names, and the two modules spell them differently
-- (INDIA_KARNATAKA_KOPPAL vs India_Karnataka_Koppal), so a code is not a reliable key for
-- reconciling against LGD. These columns hold the Local Government Directory codes, which
-- are stable across renames: when LGD renames a district the code stays, so a later import
-- can match on code and update the label instead of creating a second boundary.
--
-- Codes are denormalised down the hierarchy, so each row carries its own tier and its
-- ancestors: a State row fills lgd_state_code only, a District row fills state + district,
-- a Block row fills all three.
--
-- Facility and Asset rows may carry their block's codes too. They are not LGD entities
-- themselves, but they sit inside one: a Facility boundary is '<blockBoundaryCode>_<facilityId>'
-- with that block as its parent, and an Asset extends the facility code the same way.
-- Carrying the block's codes down (lgd_backfill_existing.py --propagate) means a facility
-- can be found by LGD district in one predicate; by default they are left NULL.
--
-- lgd_block_code holds a Development Block or a Sub-district code depending on which tier
-- the name matched - in LGD both hang directly off District and our Block slot holds a mix
-- of the two. lgd_block_tier records which:
--   Block, Sub-district, Both   the boundary IS that LGD entity
--   Panchayat, Village          the boundary is a panchayat/village filed in the Block slot,
--                               and lgd_block_code is the sub-district containing it
-- so the code is never read against the wrong LGD master. Reconciliation by code should
-- filter on the first three.

ALTER TABLE boundary ADD COLUMN IF NOT EXISTS lgd_state_code    VARCHAR(16);
ALTER TABLE boundary ADD COLUMN IF NOT EXISTS lgd_district_code VARCHAR(16);
ALTER TABLE boundary ADD COLUMN IF NOT EXISTS lgd_block_code    VARCHAR(16);
ALTER TABLE boundary ADD COLUMN IF NOT EXISTS lgd_block_tier    VARCHAR(16);

COMMENT ON COLUMN boundary.lgd_state_code    IS 'LGD State code';
COMMENT ON COLUMN boundary.lgd_district_code IS 'LGD District code';
COMMENT ON COLUMN boundary.lgd_block_code    IS 'LGD Development Block or Sub-district code; see lgd_block_tier';
COMMENT ON COLUMN boundary.lgd_block_tier    IS 'Block, Sub-district or Both: lgd_block_code is this boundary. Panchayat or Village: it is the containing sub-district';

-- Reconciliation looks a boundary up by its LGD codes within a tenant. Partial, because
-- only the State/District/Block rows carry codes - Facility and Asset rows need not.
CREATE INDEX IF NOT EXISTS idx_boundary_lgd_codes
    ON boundary (tenantId, lgd_state_code, lgd_district_code, lgd_block_code)
    WHERE lgd_state_code IS NOT NULL;
