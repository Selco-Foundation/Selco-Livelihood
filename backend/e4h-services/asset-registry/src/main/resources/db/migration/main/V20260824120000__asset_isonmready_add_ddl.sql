-- is_onm_ready is the per-asset O&M eligibility gate (distinct from the existing is_operational column,
-- which is a different, unrelated flag). Set true by the Installation feature's handoff step when the
-- asset's bom row reaches APPROVE; consumed by Setu4Livelihoods ticket-raising and the WhatsApp chatbot
-- asset picker.
ALTER TABLE asset ADD COLUMN is_onm_ready BOOLEAN DEFAULT false;
