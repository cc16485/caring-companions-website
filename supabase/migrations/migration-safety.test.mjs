// Caring Companions Core — migration safety
// -----------------------------------------------------------------------------
// Run:  node supabase/migrations/migration-safety.test.mjs
//
// THE RULE THIS ENFORCES:
//   A migration may CREATE, and may CORRECT a specific known value it names
//   explicitly. It may never RESTORE.
//
// This exists because the original seed used `on conflict (id) do update`, so
// every installer run reset the six governed records to the values written in
// that file. N001, N003 and N004 reached version 26 that way, flipping between
// the seed and a later correction, writing a junk history row each time. Once
// Core holds hundreds of verified records, the same pattern would silently
// revert months of human verification and look like a successful install.
//
// The installer applies every migration on every run, by design. That is only
// safe if every migration is genuinely idempotent, and "idempotent" here means
// something stricter than "does not error twice".
//
// A migration that truly needs to make a broad change can say so:
//   -- migration-safety: reviewed <why>
// on the line above the statement. That is deliberately noisy to write.
// -----------------------------------------------------------------------------

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))

// Columns that carry human judgement. Touching one of these in an UPDATE means
// the migration is overruling a person, and it had better say whose value it
// expects to find. `roles`, `program` and other structural columns are not here
// on purpose: backfilling a newly added column is not overruling anyone.
const GOVERNED = ['question', 'answer', 'answer_key', 'topics', 'status', 'audience',
                  'confidence', 'conservative', 'verified_on', 'verified_by']

let pass = 0, fail = 0
const results = []
const check = (name, ok, detail = '') => {
  results.push([ok ? 'PASS' : 'FAIL', name + (ok ? '' : `\n          ${detail}`)])
  ok ? pass++ : fail++
}

/** Strip comments so a rule quoted in prose does not read as a violation. */
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
            .split('\n').map((l) => l.replace(/--.*$/, '')).join('\n')
}

const reviewed = (sql, index) => {
  // Look back a few lines for the explicit opt-out.
  const before = sql.slice(0, index).split('\n').slice(-4).join('\n')
  return /--\s*migration-safety:\s*reviewed\b/i.test(before)
}

/** Statements are split on semicolons outside string literals and $$ bodies. */
function statements(sql) {
  const out = []
  let cur = '', i = 0, inStr = false, inDollar = false
  while (i < sql.length) {
    const two = sql.slice(i, i + 2)
    if (!inStr && two === '$$') { inDollar = !inDollar; cur += two; i += 2; continue }
    const c = sql[i]
    if (!inDollar && c === "'") {
      if (inStr && sql[i + 1] === "'") { cur += "''"; i += 2; continue }
      inStr = !inStr
    }
    if (c === ';' && !inStr && !inDollar) { out.push(cur); cur = ''; i++; continue }
    cur += c; i++
  }
  if (cur.trim()) out.push(cur)
  return out
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
console.log(`Checking ${files.length} migration file(s)\n`)

for (const f of files) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8')
  const sql = stripComments(raw)
  const problems = []

  // ── RULE 1: no ON CONFLICT DO UPDATE against kb_items ────────────────────
  // The exact pattern that caused the damage. `do nothing` is the only correct
  // conflict action for seed knowledge.
  for (const m of sql.matchAll(/insert\s+into\s+(kb_\w+)[\s\S]*?on\s+conflict[\s\S]*?do\s+update/gi)) {
    if (reviewed(sql, m.index)) continue
    const table = m[1].toLowerCase()
    if (table === 'kb_items')
      problems.push(`ON CONFLICT DO UPDATE against kb_items. A seed must not overrule a verified record. Use "on conflict (id) do nothing".`)
    else if (table === 'kb_sources')
      problems.push(`ON CONFLICT DO UPDATE against kb_sources. Sources are cited by verified records; use "do nothing".`)
  }

  // ── RULES 2 and 3: UPDATE kb_items must be guarded, and a governed change
  //    must name the prior value it expects to find ───────────────────────────
  for (const st of statements(sql)) {
    const m = /^\s*update\s+kb_items\s+set\s+([\s\S]*)$/i.exec(st)
    if (!m) continue
    if (reviewed(sql, sql.indexOf(st))) continue

    const body = m[1]
    const wi = body.search(/\bwhere\b/i)
    const setClause = wi >= 0 ? body.slice(0, wi) : body
    const where = wi >= 0 ? body.slice(wi) : ''

    if (wi < 0) {
      problems.push(`UPDATE kb_items with no WHERE clause. That rewrites every record in the knowledge base.`)
      continue
    }

    const touches = GOVERNED.filter((c) => new RegExp(`\\b${c}\\s*=`, 'i').test(setClause))
    if (!touches.length) continue      // structural backfill, not overruling anyone

    // The anti-pattern: guarding on "anything that isn't my own result". It
    // re-fires forever and reverts whatever a person changed since.
    const negated = GOVERNED.filter((c) => new RegExp(`\\b${c}\\s*(<>|!=)`, 'i').test(where))
    if (negated.length)
      problems.push(`Guards on "${negated[0]} <> ..." while setting ${touches.join(', ')}. `
                  + `That matches any human edit and reverts it. Match the prior value with "=" instead.`)

    // A correction must name the value it expects, not merely the row. Any
    // column will do: "and aliases = '{}'" is a legitimate one-time backfill
    // guard. What is forbidden is matching the row alone, which is a restore.
    const named = /\b(?!id\b)\w+\s*=\s*(?:'|array\[|\{)/i.test(where.replace(/\bid\s*=\s*'[^']*'/gi, ''))
                  || /\bany\s*\(\s*\w+\s*\)/i.test(where)
    if (!named)
      problems.push(`Sets ${touches.join(', ')} but the WHERE names no prior value, only the row. `
                  + `That is a restore, not a correction. Add the expected prior value to the WHERE.`)
  }

  // ── RULE 4: views must be dropped in reverse dependency order ────────────
  // "cannot drop view X because other objects depend on it" has broken this
  // project's installer four times. It always passes on the first run and
  // fails on every run after, which is the worst possible way to find it.
  {
    const created = new Map()          // view name -> its definition
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(\w+)\s+as([\s\S]*?);/gi))
      created.set(m[1].toLowerCase(), m[2].toLowerCase())

    const dropAt = new Map()
    for (const m of sql.matchAll(/drop\s+view\s+(?:if\s+exists\s+)?(\w+)/gi))
      if (!dropAt.has(m[1].toLowerCase())) dropAt.set(m[1].toLowerCase(), m.index)

    for (const [view, body] of created) {
      for (const other of created.keys()) {
        if (other === view) continue
        // Does `view` read `other`? Then `view` must be dropped first.
        if (!new RegExp(`\\b${other}\\b`).test(body)) continue
        const dOther = dropAt.get(other), dView = dropAt.get(view)
        if (dOther === undefined) continue
        if (dView === undefined)
          problems.push(`View ${other} is dropped, but ${view}, which reads it, is never dropped. `
                      + `The drop will fail on the second run with "other objects depend on it".`)
        else if (dOther < dView)
          problems.push(`Drops ${other} before ${view}, but ${view} reads ${other}. `
                      + `Drop the dependent view FIRST, or the second run fails with `
                      + `"cannot drop view ${other} because other objects depend on it".`)
      }
    }
  }

  check(f, problems.length === 0, problems.join('\n          '))
}

// ── The test must actually catch the thing it was written for ───────────────
// A safety check nobody has seen fail is a check nobody should trust.
{
  const BAD = [
    [`insert into kb_items (id) values ('N001')
      on conflict (id) do update set answer = excluded.answer;`,
     'the original seed pattern'],
    [`update kb_items set answer = 'x' where id = 'N001';`,
     'a restore that names only the row'],
    [`update kb_items set answer = 'new' where id = 'N001' and answer <> 'new';`,
     'the re-firing "not my own result" guard'],
    [`update kb_items set status = 'verified';`,
     'an UPDATE with no WHERE at all'],
  ]
  const scan = (sql) => {
    const s = stripComments(sql)
    let n = 0
    for (const m of s.matchAll(/insert\s+into\s+(kb_\w+)[\s\S]*?on\s+conflict[\s\S]*?do\s+update/gi))
      if (m[1].toLowerCase() === 'kb_items') n++
    for (const st of statements(s)) {
      const m = /^\s*update\s+kb_items\s+set\s+([\s\S]*)$/i.exec(st)
      if (!m) continue
      const body = m[1], wi = body.search(/\bwhere\b/i)
      const setClause = wi >= 0 ? body.slice(0, wi) : body
      const where = wi >= 0 ? body.slice(wi) : ''
      if (wi < 0) { n++; continue }
      const touches = GOVERNED.filter((c) => new RegExp(`\\b${c}\\s*=`, 'i').test(setClause))
      if (!touches.length) continue
      if (GOVERNED.some((c) => new RegExp(`\\b${c}\\s*(<>|!=)`, 'i').test(where))) { n++; continue }
      const named = /\b(?!id\b)\w+\s*=\s*(?:'|array\[|\{)/i.test(where.replace(/\bid\s*=\s*'[^']*'/gi, ''))
                    || /\bany\s*\(\s*\w+\s*\)/i.test(where)
      if (!named) n++
    }
    return n
  }
  for (const [sql, what] of BAD) check(`catches ${what}`, scan(sql) > 0, 'this pattern slipped through')

  // The view-order rule, checked against the exact shape that broke twice.
  {
    const viewScan = (sql) => {
      const created = new Map()
      for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(\w+)\s+as([\s\S]*?);/gi))
        created.set(m[1].toLowerCase(), m[2].toLowerCase())
      const dropAt = new Map()
      for (const m of sql.matchAll(/drop\s+view\s+(?:if\s+exists\s+)?(\w+)/gi))
        if (!dropAt.has(m[1].toLowerCase())) dropAt.set(m[1].toLowerCase(), m.index)
      let n = 0
      for (const [view, body] of created)
        for (const other of created.keys()) {
          if (other === view || !new RegExp(`\\b${other}\\b`).test(body)) continue
          const a = dropAt.get(other), b = dropAt.get(view)
          if (a !== undefined && (b === undefined || a < b)) n++
        }
      return n
    }
    check('catches views dropped in the wrong order', viewScan(
      `drop view if exists base; create view base as select 1 as x;
       drop view if exists derived; create view derived as select x from base;`) > 0,
      'the second-run failure would slip through')
    check('allows views dropped in reverse dependency order', viewScan(
      `drop view if exists derived; drop view if exists base;
       create view base as select 1 as x;
       create view derived as select x from base;`) === 0,
      'a correct migration was rejected')
  }

  const GOOD = [
    [`insert into kb_items (id) values ('N001') on conflict (id) do nothing;`, 'an insert-only seed'],
    [`update kb_items set answer = 'new' where id = 'N001' and answer = 'old';`, 'a correction naming its prior value'],
    [`update kb_items set roles = '{staff}' where roles is null;`, 'a structural backfill'],
    [`update kb_items set topics = array['a'], aliases = array['b'] where id = 'N001' and aliases = '{}';`,
     'a one-time backfill guarded on the column being empty'],
  ]
  for (const [sql, what] of GOOD) check(`allows ${what}`, scan(sql) === 0, 'a legitimate migration was rejected')
}

console.log('=== RESULTS ===\n')
for (const [s, n] of results) console.log(`  ${s === 'PASS' ? 'ok  ' : 'FAIL'}  ${n}`)
console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
