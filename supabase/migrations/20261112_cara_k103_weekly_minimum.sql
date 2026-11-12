-- 2026-11-12: the weekly minimum is now one 4-hour visit a week (her decision; it was 8 hours a week).
-- Only Cara's K103 answer changes, and only when it still differs. Same text as supabase/knowledge/cara-2026-10-27.mjs.
update public.kb_items set answer = 'Scheduled care has a minimum of 4 hours per visit, at least once a week.', version = version + 1, updated_at = now(),
  verified_on = '2026-11-12', verified_by = 'Samantha 11-12: weekly minimum is 4 hours, not 8'
  where id = 'K103' and answer is distinct from 'Scheduled care has a minimum of 4 hours per visit, at least once a week.';
