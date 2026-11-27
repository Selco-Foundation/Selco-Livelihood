-- system_type is now the system type of the Solution (a code from MDMS), or NULL when it has none.
--
-- The old index allowed one row per (system_type, total_system_capacity). Capacity is blank on
-- every row, so it would allow only one Solution per system type. uk_icc_templates_solution
-- stays: one row per Solution per tenant.
DROP INDEX IF EXISTS uk_icc_templates;
