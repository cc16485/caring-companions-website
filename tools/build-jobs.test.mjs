/* Offline check of the job page generator (no network, nothing published): node tools/build-jobs.test.mjs
   Hiring wording 415 (2026-10-02): one in-person interview, then the rest from home; the application is about
   2 minutes; only the 6 hours of orientation + dementia training are called paid; never "remote", no em dashes. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, jsonLd, indeedFeed, ONE_LINER } from './build-jobs.mjs';

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
  ck(name + ': 6 hours paid training named (2 orientation + 4 Alzheimer\'s and dementia)', body.includes("2 hours of orientation plus 4 hours of Alzheimer's and dementia training, all paid"));
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

console.log(`build-jobs.test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
