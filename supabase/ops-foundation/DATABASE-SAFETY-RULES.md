# Database safety rules

Project `zngsgedlsxinbygwmxwn`, shared by the Care Coordinator Hub, the Staffing
Hub and the Team Hub. Written 12 August 2026 after an audit found 28 tables a
signed-in browser could empty.

---

## 1. Never run a blanket GRANT

**Do not run `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated`, or any
variation of it.** Not to fix a permission error, not to unblock a build, not
temporarily.

**What actually happened.** 28 tables — including `app_data`, which holds every
lead, staff profile, position, duty window, work item and review — grant
`authenticated` the full set `arwdDxtm`. That includes `TRUNCATE`.

It was tempting to blame Supabase defaults. It was not the defaults:

- `app_data` is owned by `postgres`
- `postgres`'s default for a new table grants `authenticated` only `m` (MAINTAIN)
- yet `app_data` holds `arwdDxtm`

A default cannot produce a privilege it does not grant. Somebody ran an explicit
blanket `GRANT` at some point, and it landed on every table that existed at that
moment. That is exactly why the affected tables are the older ones and every
table created since by the ops-foundation scripts is clean.

**So the prevention problem is not what it first looked like.** New tables do not
inherit the broad set — a real table was created and inspected to confirm it.
The risk is a person or a script running the blanket grant again.

**Instead:** grant exactly what the caller needs, on the table it needs it on.

```sql
grant select on public.some_table to authenticated;
```

## 2. TRUNCATE is not covered by row-level security

RLS filters `SELECT`, `INSERT`, `UPDATE` and `DELETE` row by row. It is not
consulted for `TRUNCATE` at all. A table with perfect policies and `TRUNCATE`
granted to `authenticated` can be emptied by any signed-in user.

No application in this project has ever needed `TRUNCATE` from a browser. The
hubs delete individual rows.

**Rule:** `authenticated` and `anon` should never hold `TRUNCATE` on any table.

## 3. "RLS is enabled" is not a finding

Enabled says nothing about restrictive. A policy of `USING (true)` is enabled and
permits everything. When answering "what stops user A touching user B's rows",
read the policy expression for that specific command, and read the function
definition of anything that writes on the user's behalf.

## 4. Know whether a function is DEFINER or INVOKER before revoking anything

A `SECURITY INVOKER` function runs with the **caller's** privileges, so it needs
the table grants the caller has. A `SECURITY DEFINER` function runs as its owner
and does not.

This nearly caused an outage: a migration was written to remove `DELETE` from
`authenticated` on `app_data`, on the reasoning that deletion goes through
`delete_app_data_item`. That function is `SECURITY INVOKER`, so removing `DELETE`
would have broken every deletion in the hub. The migration checked first and
refused to run.

**Rule:** before revoking a table privilege, list every function that performs
that operation and check `prosecdef` for each.

```sql
select proname, prosecdef from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public';
```

## 5. Converting a function to DEFINER also removes its RLS check

`SECURITY DEFINER` is not just "let it write". It runs as the owner, which
normally bypasses row-level security entirely. A function converted to definer
must re-implement, in its own body, whatever the policy was doing for it.

**Rule:** never convert a function to `SECURITY DEFINER` without reading the
policies it currently relies on, and replacing them explicitly.

## 6. Test that secured functions WORK, not only that they refuse

Two functions in this project — `set_staff_role` and `upsert_staff_person` —
were installed, reviewed and reported as verified while being completely broken.
Both died on their first statement from a PL/pgSQL name collision. Every test
had only ever checked that they refused an unauthorised caller.

**A broken function refuses everybody, perfectly.**

**Rule:** every secured function needs its success path executed against real
rows before it is called done. The safe pattern is a `DO` block that does the
real work and then raises an exception, so the whole transaction rolls back and
the outcome is read from the error message:

```sql
do $probe$
declare o text := '';
begin
  perform set_config('request.jwt.claim.sub', '<an auth_user_id>', true);
  -- do the real thing, collect the result into o
  raise exception 'PROBE_RESULT: %', o;   -- rolls everything back
end $probe$;
```

## 7. Do not name a PL/pgSQL variable after a table alias or a column

The two broken functions above:

- `set_staff_role` declared `r record` and also used `r` as the alias for
  `staff_roles`. `r.person_id` resolved to the unassigned variable.
- `upsert_staff_person` had an OUT parameter `person_id` and used
  `on conflict (person_id, entity)`. Ambiguous, and fatal.

**Rule:** prefix every local with `v_`, and never give an OUT parameter the same
name as a column used unqualified in the body.

## 8. anon holds nothing on app_data

Deliberate and long-standing. `anon` INSERT is intentional on `evv_submissions`,
`client_queue` and `orient_bookings` only — those take submissions from public
pages.

## 9. Three hubs share this project

`app_data` keys belong to different hubs. A policy or grant change made for one
affects all three. In July 2026 debug-era allow-all policies plus a pre-login
save wiped the Staffing Hub's candidates and caregivers keys.

**Rule:** before changing a policy, grant or shared table, check all three
codebases.
