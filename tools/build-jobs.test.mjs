/* Offline check of the job page generator (no network, nothing published): node tools/build-jobs.test.mjs
   Hiring wording 415 (2026-10-02): one in-person interview, then the rest from home; the application is about
   2 minutes; never "remote", no em dashes. 2026-10-15: only the 2-hour orientation is required; old postings that still
   say "6 hours of paid orientation and dementia training" are rewritten when the page is built. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, jsonLd, indeedFeed, ONE_LINER, OLD_ONE_LINERS, TRAINING_FIXES } from './build-jobs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ck = (name, ok, info) => { if (ok) pass++; else { fail++; console.log('FAIL ' + name + (info ? '  ' + String(info).slice(0, 300) : '')); } };
const count = (s, sub) => s.split(sub).length - 1;

const src = await readFile(path.join(ROOT, 'careers.html'), 'utf8');
const c = { head: src.slice(src.indexOf('<body>') + 6, src.indexOf('</header>') + 9), foot: src.slice(src.indexOf('<footer'), src.indexOf('</body>')) };

const base = { slug: 'caregiver-springfield', title: 'Caregiver', status: 'published', date_posted: '2026-10-02', employment_type: 'PART_TIME',
  pay_min: 16, pay_max: 17, summary: 'Help older adults stay safe at home.', responsibilities: 'Follow the care plan', qualifications: 'Be at least 18',
  benefits: 'Paid weekly\nPaid orientation and dementia training' };
const withLine = { ...base, description: 'Caring Companions is hiring.\n\nYou complete 6 hours of paid orientation and dementia training from home before you start.\n\n' + ONE_LINER };
const without = { ...base, slug: 'respite-caregiver-mount-vernon', city: 'Mount Vernon', postal_code: '65712', description: 'A sweet family in Mount Vernon.' };

for (const [name, p] of [['posting with the one-liner (after 415 SQL)', withLine], ['posting without it, not Springfield', without]]) {
  const html = page(p, c);
  const ld = JSON.parse(jsonLd(p));
  ck(name + ': the structured data opens with the one-liner, once', ld.description.startsWith('<div><p>' + ONE_LINER.replace(/'/g, '&#39;')) || ld.description.startsWith('<div><p>' + ONE_LINER), ld.description.slice(0, 200));
  ck(name + ': one-liner appears exactly once in the structured data', count(ld.description, ONE_LINER) === 1, count(ld.description, ONE_LINER));
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  ck(name + ': the page body does not repeat the one-liner (the How hiring works block says it)', count(body, ONE_LINER) === 0);
  ck(name + ': How hiring works block is on the page', body.includes('<h2>How hiring works</h2>') && body.includes('After your interview, you can do the rest from home.'));
  ck(name + ': five steps', count(body.slice(body.indexOf('jb-how'), body.indexOf('</ol>')), '<li>') === 5);
  ck(name + ': 2-hour paid orientation named, extra courses optional', body.includes('<b>Paid orientation from home.</b> 2 hours') && body.includes("offered when a client&#39;s needs call for them") || body.includes("offered when a client's needs call for them"));
  for (const where of [['page', html], ['structured data', jsonLd(p)], ['Indeed feed', indeedFeed([p])]])
    ck(name + ': no required dementia training or 6 hours in the ' + where[0], !/6 hours|dementia training|on-the-job|hours of training a year/i.test(where[1]), (where[1].match(/.{60}(6 hours|dementia training).{60}/i) || [])[0]);
  ck(name + ': footer says about 2 minutes and one in-person interview', body.includes('The application takes about 2 minutes. No uploads required. One in-person interview, then the rest from home.'));
  ck(name + ': no "five minutes" anywhere', !/five minutes|5 minutes/i.test(html));
  ck(name + ': never says remote', !/\bremote(ly)?\b/i.test(body));
  ck(name + ': no phone interview offered', body.includes('We do not do phone interviews.'));
  const how = body.slice(body.indexOf('<section class="jb-how">'), body.indexOf('</section>', body.indexOf('jb-how')));
  ck(name + ': no em dash in the new wording', !how.includes('\u2014') && !body.includes('\u2014 '), how);
  const feed = indeedFeed([p]);
  ck(name + ': Indeed feed opens with the one-liner, once', feed.includes('<description><![CDATA[<div><p>' + ONE_LINER) && count(feed, ONE_LINER) === 1);
}
ck('Springfield job: interview "at our Springfield office"', page(withLine, c).includes('A 20-minute interview at our Springfield office.'));
ck('Mount Vernon job: interview "at our office" (no town, no street)', page(without, c).includes('A 20-minute interview at our office.')
  && !page(without, c).slice(page(without, c).indexOf('jb-how')).split('</section>')[0].includes('Stewart'));
ck('Mount Vernon job: structured data still has no office street', JSON.parse(jsonLd(without)).jobLocation.address.streetAddress === undefined);

/* 2026-10-11: a posting still carrying the old sentence (before the Hub's step 602) shows only the new one */
const oldLine = { ...base, description: 'Caring Companions is hiring.\n\n' + OLD_ONE_LINERS[0] };
const ldOld = JSON.parse(jsonLd(oldLine)).description, pgOld = page(oldLine, c), feedOld = indeedFeed([oldLine])
ck('old sentence in a posting: the structured data opens with the new one-liner, the old one is gone', ldOld.includes(ONE_LINER) && !ldOld.includes('welcome call'), ldOld)
ck('old sentence in a posting: the page and the Indeed feed never say welcome call', !/welcome (video )?call/i.test(pgOld) && !/welcome (video )?call/i.test(feedOld))
/* 2026-10-15: every old training sentence saved in a posting is rewritten */
const oldTraining = { ...base, benefits: TRAINING_FIXES.map(f => f[0]).join('\n'), description: 'W-2. You are paid weekly, and you complete 6 hours of paid orientation and dementia training from home before you start.\n\n' + OLD_ONE_LINERS[1] };
const pgT = page(oldTraining, c), ldT = jsonLd(oldTraining), feedT = indeedFeed([oldTraining]);
for (const [w, t] of [['page', pgT], ['structured data', ldT], ['Indeed feed', feedT]])
  ck('old training wording in a posting: rewritten in the ' + w, !/6 hours|dementia training/i.test(t) && /2-hour paid orientation|Paid 2-hour orientation/.test(t), (t.match(/.{60}(6 hours|dementia training).{60}/i) || [])[0]);
ck('the How hiring works block says Orientation Video Call', /A 15-minute Orientation Video Call/.test(page(base, c)))

console.log(`build-jobs.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
