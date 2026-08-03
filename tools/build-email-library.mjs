/* ---------------------------------------------------------------------------
   Publish the email library from the design file.

   The campaign autopilot reads email-assets/library.json. That file used to be
   produced by hand from the design export, which is why emails written in the
   design tool in July were still not sendable in August: there was a step, and
   the step lived in somebody's memory.

   Now: save the design file over cc-email-library/Caring Companions Email
   Library.dc.html, run this, and every email in it becomes sendable.

     node tools/build-email-library.mjs            # write it
     node tools/build-email-library.mjs --check    # just tell me what would change

   It refuses to write a library the sender cannot use: every email needs a
   subject, an audience, a send window and a unique key, because the key is
   what stops an email going twice in a year.
   --------------------------------------------------------------------------- */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DESIGN = path.resolve(process.env.HOME,
  'Claude/Projects/cc-email-library/Caring Companions Email Library.dc.html');
const OUT = path.resolve('email-assets/library.json');
const CHECK = process.argv.includes('--check');

/* The audiences the autopilot knows how to reach. Anything else would sit in
   the file looking published and never send to a soul. */
const AUDIENCES = new Set(['monthly', 'clients', 'client_contacts', 'caregivers', 'referrers']);

/* The design file holds four arrays, not one, and they do not carry the two
   fields the sender needs. Audience is implied by which array an email is in,
   and the key is what stops an email going out twice in a year, so both are
   assigned here from the email's own id. Same scheme the published file
   already uses, so nothing that has already been sent looks new.

     this._e   the monthly calendar          → monthly          m1…
     this._c   client quarterlies, each one  → clients          c1a…
               written twice, once for the     client_contacts  c1b…
               client and once for family
     this._cg  caregiver notes               → caregivers       g1…
     this._r   referral partners (manual)    → referrers        r1…
   --------------------------------------------------------------------------- */
const ARRAYS = [
  { name: '_e',  aud: 'monthly',    key: e => 'm' + e.id },
  { name: '_cg', aud: 'caregivers', key: e => 'g' + e.id },
  { name: '_r',  aud: 'referrers',  key: e => 'r' + e.id },
];

/* The array is a JavaScript literal, not JSON: it references the shared
   call-to-action constants declared above it in the design file. So pull those
   out with it rather than trying to parse the array on its own. */
const HELPERS = new Set([
  'P', 'L', 'T', 'Q',                                    // paragraph, list, tip, quote
  'SCHED', 'CALL', 'tel', 'INTRO', 'ONEPAGER', 'SECURE', // call-to-action buttons
  'SURVEY', 'RATE', 'LUNCH', 'OFFICE', 'SV',
]);

/* The helpers are declared once, near the top, and the later arrays are
   thousands of lines away from them. So gather them from the whole file rather
   than from whatever happens to sit just above each array — that is what made
   the caregiver notes fail to read on the first attempt. */
function helpers(html) {
  const out = [];
  const seen = new Set();
  /* Several of them share a line, so stop at the first semicolon rather than at
     the end of the line. Every one of these is a one-expression helper. */
  for (const m of html.matchAll(/const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/g)) {
    if (!HELPERS.has(m[1]) || seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push(`const ${m[1]} = ${m[2]};`);
  }
  const missing = [...HELPERS].filter(n => !seen.has(n));
  if (missing.length) console.warn('  (helpers not found, harmless if unused: ' + missing.join(', ') + ')');
  return out.join('\n');
}

// Walk the brackets so a ']' inside a string cannot end the array early.
function arrayAt(html, from) {
  let depth = 0, quote = null;
  for (let i = from; i < html.length; i++) {
    const c = html[i], p = html[i - 1];
    if (quote) { if (c === quote && p !== '\\') quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (!depth) return html.slice(from, i + 1); }
  }
  throw new Error('an email array in the design file is not closed');
}

function read(html, name) {
  const at = html.search(new RegExp('this\\.' + name + '\\s*=\\s*\\['));
  if (at < 0) throw new Error(`could not find ${name} in the design file`);
  const body = arrayAt(html, html.indexOf('[', at));
  try {
    return (0, eval)(`${helpers(html)}\n(${body})`);
  } catch (e) {
    throw new Error(`${name} would not evaluate: ${e.message}`);
  }
}

const html = await readFile(DESIGN, 'utf8');
const emails = [];
for (const a of ARRAYS) {
  for (const e of read(html, a.name)) emails.push({ ...e, aud: a.aud, key: a.key(e) });
}
/* The client quarterlies are written once and sent twice: the same visit, said
   to the person receiving care and again to the family member who worries
   about them. Both variants become their own email. */
for (const e of read(html, '_c')) {
  const { v, ...shared } = e;
  if (v?.client)  emails.push({ ...shared, ...v.client,  aud: 'clients',         key: 'c' + e.id + 'a' });
  if (v?.contact) emails.push({ ...shared, ...v.contact, aud: 'client_contacts', key: 'c' + e.id + 'b' });
}
if (!emails.length) throw new Error('no emails came out of the design file');

/* ---- keep what publishing has already added -------------------------------
   The published file carries things the design file does not: a hand-picked
   header banner per email, a segment label, a footer. Regenerating from the
   design alone would wipe all of that, so anything already published wins for
   those fields and only the words come from the design.

   New emails arrive with no banner. They are listed at the end rather than
   given one at random, because which picture goes with which email is a
   judgement, not a default. */
const KEEP = ['banner', 'seg', 'footer'];
/* Deliberately NOT kept: the call-to-action link. The published file had every
   button pointing at guide.mo-care.com, a host that 404s on every path, so 70
   of the 99 emails were going out with a dead button. The design file's links
   are the real ones. */
let published = [];
try { published = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
const byKey = new Map(published.map(e => [e.key, e]));
const fresh = [];
for (const e of emails) {
  const old = byKey.get(e.key);
  if (!old) { fresh.push(e.subj); continue; }
  for (const f of KEEP) if (old[f] !== undefined && e[f] === undefined) e[f] = old[f];
}

/* ---- no em dashes ----------------------------------------------------------
   They read as machine-written, and every one was swept out of the published
   file by hand once already. Doing it here means it stays done rather than
   being somebody's job to remember every time the design changes. */
let dashes = 0;
const sweep = v => {
  if (typeof v === 'string') {
    const out = v.replace(/\s*—\s*/g, ', ');
    if (out !== v) dashes++;
    return out;
  }
  if (Array.isArray(v)) return v.map(sweep);
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = sweep(v[k]); return v; }
  return v;
};
emails.forEach(e => sweep(e));

/* ---- refuse to publish something the sender cannot use ---- */
const problems = [];
const seen = new Map();
emails.forEach((e, i) => {
  const where = e.subj ? `"${e.subj}"` : `email ${i + 1}`;
  if (!e.subj) problems.push(`${where}: no subject`);
  if (!e.aud) problems.push(`${where}: no audience`);
  else if (!AUDIENCES.has(e.aud)) problems.push(`${where}: audience "${e.aud}" is not one the sender knows`);
  if (!e.when) problems.push(`${where}: no send window, so it can never come due`);
  if (!e.key) problems.push(`${where}: no key, which is what stops it sending twice in a year`);
  else if (seen.has(e.key)) problems.push(`${where}: shares the key "${e.key}" with ${seen.get(e.key)}`);
  else seen.set(e.key, where);
});

const byAud = emails.reduce((m, e) => (m[e.aud] = (m[e.aud] || 0) + 1, m), {});
let before = 0;
try { before = JSON.parse(await readFile(OUT, 'utf8')).length; } catch { /* first run */ }

console.log(`design file: ${emails.length} emails`);
Object.entries(byAud).sort().forEach(([a, n]) => console.log(`  ${a.padEnd(16)} ${n}`));
console.log(`published now: ${before}${before === emails.length ? '' : `  →  ${emails.length}`}`);
if (dashes) console.log(`em dashes swept out of ${dashes} lines`);
if (fresh.length) {
  console.log(`\n${fresh.length} new email${fresh.length === 1 ? '' : 's'}, none of which has a header banner yet:`);
  fresh.forEach(f => console.log('  • ' + f));
}

if (problems.length) {
  console.error('\nNot publishing. These would never send:');
  problems.forEach(p => console.error('  • ' + p));
  process.exit(1);
}
/* ---- do the buttons go anywhere? -------------------------------------------
   The reason this exists: every published email had its button pointing at a
   host that answered 404 to everything. Nobody would have noticed until a
   family clicked one. A 404 is a definite answer and worth shouting about; a
   timeout is not, so it is only mentioned. */
const links = [...new Set(emails.map(e => e?.cta?.href).filter(u => /^https?:/.test(u)))];
const dead = [];
await Promise.all(links.map(async (u) => {
  try {
    const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (r.status === 404 || r.status === 410) dead.push(`${r.status}  ${u}`);
  } catch { dead.push(`unreachable  ${u}`); }
}));
console.log(`\nbutton links checked: ${links.length}${dead.length ? '' : ', all reachable'}`);
if (dead.length) {
  console.log('these go nowhere:');
  dead.sort().forEach(d => console.log('  • ' + d));
}

if (CHECK) { console.log('\nRun without --check to publish.'); process.exit(0); }

await writeFile(OUT, JSON.stringify(emails, null, 0));
console.log(`\nWritten to ${path.relative(process.cwd(), OUT)}. Commit and push to publish.`);
