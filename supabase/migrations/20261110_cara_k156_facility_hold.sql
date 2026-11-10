-- 2026-11-10: K156 (care in facilities) no longer promises nursing home, assisted living or hospital care (her "yes").
-- Only Cara's K156 answer changes, and only when it still differs. Same text as supabase/knowledge/cara-2026-10-27.mjs.
update public.kb_items set answer = 'We provide care at home. If your loved one lives in assisted living or a nursing home, or is in the hospital, please call us at (417) 234-8494. What''s possible depends on the facility''s rules, and we''ll talk it through with you.', version = version + 1, updated_at = now(),
  verified_on = '2026-11-10', verified_by = 'Samantha 11-10: no facility promise until facility policy is confirmed'
  where id = 'K156' and answer is distinct from 'We provide care at home. If your loved one lives in assisted living or a nursing home, or is in the hospital, please call us at (417) 234-8494. What''s possible depends on the facility''s rules, and we''ll talk it through with you.';
