-- Widen boundary codes from VARCHAR(64).
--
-- Codes are the full path through the hierarchy, so long state and district names overflow
-- 64 characters on their own:
--   INDIA_ANDAMAN/AND/NICOBAR/ISLANDS_NORTH/AND/MIDDLE/ANDAMAN_DIGLIPUR          (67)
--   INDIA_THE/DADRA/AND/NAGAR/HAVELI/AND/DAMAN/AND/DIU_..._DADRA/NAGAR/HAVELI    (92)
-- 18 of the boundaries being onboarded are already over the limit.
--
-- It also overflows below Block. facility-registry appends '_ED/2026/NNNN' to a block code
-- and asset-registry appends '_Ast/2026/NNNN' to that, so a leaf runs ~27 characters longer
-- than its block - which puts roughly a third of all blocks over 64 the moment an admin
-- adds a facility under one.
--
-- 256 leaves headroom without approaching the btree key limit: the widest possible
-- boundary_relationship primary key is 64 + 256 + 64 bytes, well under ~2704.
--
-- PostgreSQL treats varchar(n) -> varchar(m > n) as binary-coercible, so there is no table
-- rewrite and dependent indexes and constraints are left alone - unique_code_tenantId,
-- idx_boundary_tenantId_code and pk_boundary_relationship all stay valid. Expect a brief
-- ACCESS EXCLUSIVE lock. Confirm on a restored dump first: pg_relation_filenode('boundary')
-- should be unchanged afterwards, which proves no rewrite happened.

ALTER TABLE boundary              ALTER COLUMN code   TYPE VARCHAR(256);
ALTER TABLE boundary_relationship ALTER COLUMN code   TYPE VARCHAR(256);
ALTER TABLE boundary_relationship ALTER COLUMN parent TYPE VARCHAR(256);

-- ancestralMaterializedPath is already TEXT and needs no change.
