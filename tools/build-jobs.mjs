/* ---------------------------------------------------------------------------
   Build the public job pages from the postings in the hub.

   Why static files rather than fetching in the browser: Google for Jobs reads
   the JobPosting markup out of the HTML it is served, and Indeed's crawler is
   worse still with JavaScript. A page that assembles itself after load is a
   page that may never get listed, which is the whole point of doing this.

   So: one real .html file per published posting, with the structured data
   already in it. A GitHub Action reruns this and commits whatever changed,
   which means publishing from the hub is all Samantha has to do.

   Header and footer are lifted out of careers.html rather than copied here,
   so the site navigation can change without these pages drifting out of date.
   --------------------------------------------------------------------------- */
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SUPA = 'https://zngsgedlsxinbygwmxwn.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY;
const SITE = 'https://mo-care.com';
const ROOT = path.resolve(process.argv[2] || '.');
const JOBS = path.join(ROOT, 'jobs');

/* Our own pre-screener. Augusta's postings keep their own apply flow, so the
   two funnels run side by side and can be compared honestly. */
const applyUrl = slug => '/apply' + (slug ? '?job=' + encodeURIComponent(slug) : '');

/* Where a job page keeps the channel it was reached by, so it survives the hop
   into the apply form. Indeed sends people here with ?src=indeed, Google for
   Jobs sends them with no marker at all, and both end up as a word on the
   applicant's record rather than a guess made later. */
const CHANNEL_SCRIPT = `<script>
(function(){
  var q = new URLSearchParams(location.search);
  var src = q.get('src') || q.get('utm_source') || '';
  if (!src) {
    var r = document.referrer || '';
    src = /indeed\\./i.test(r) ? 'indeed'
        : /google\\./i.test(r) ? 'google'
        : /facebook\\.|fb\\./i.test(r) ? 'facebook'
        : /linkedin\\./i.test(r) ? 'linkedin'
        : r && r.indexOf(location.host) === -1 ? 'referral' : '';
  }
  if (!src) return;
  document.querySelectorAll('a[href*="/apply"]').forEach(function(a){
    if (a.href.indexOf('channel=') > -1) return;
    a.href += (a.href.indexOf('?') === -1 ? '?' : '&') + 'channel=' + encodeURIComponent(src);
  });
})();
</script>`;

const ORG = {
  name: 'Caring Companions In-Home Senior Care',
  site: SITE,
  logo: SITE + '/assets/cc-logo.webp',
  phone: '(417) 234-8494',
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Postings are written in a textarea, so blank lines are paragraphs and single
   lines are line breaks. Anything that looks like a tag is escaped first. */
const para = t => !t ? '' : esc(t).trim().split(/\n{2,}/)
  .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('\n');

const bullets = t => !t ? '' : '<ul>' + esc(t).trim().split(/\n+/)
  .map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
  .map(l => '<li>' + l + '</li>').join('') + '</ul>';

const TYPE_LABEL = {
  FULL_TIME: 'Full time', PART_TIME: 'Part time', PER_DIEM: 'PRN, as needed',
  TEMPORARY: 'Temporary', CONTRACTOR: 'Contractor', OTHER: 'Other',
};

async function fetchPostings() {
  if (!ANON) throw new Error('SUPABASE_ANON_KEY is not set');
  const r = await fetch(`${SUPA}/rest/v1/job_postings?select=*&status=eq.published&order=date_posted.desc`, {
    headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
  });
  if (!r.ok) throw new Error(`Supabase said ${r.status}: ${await r.text()}`);
  return r.json();
}

/* The site's own header and footer, so these pages never look bolted on. */
async function chrome() {
  const src = await readFile(path.join(ROOT, 'careers.html'), 'utf8');
  const head = src.slice(src.indexOf('<body>') + 6, src.indexOf('</header>') + 9);
  const foot = src.slice(src.indexOf('<footer'), src.indexOf('</body>'));
  if (!head.includes('cc-header') || !foot.includes('cc-siteftr'))
    throw new Error('could not find the header/footer in careers.html — has its markup changed?');
  return { head, foot };
}

/* Exactly what Google documents for JobPosting. Fields we have no value for
   are left out entirely rather than emitted empty, which Google treats as an
   error rather than as an omission. */
function jsonLd(p) {
  const d = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: p.title,
    description: `<div>${para(p.description)}${
      p.responsibilities ? '<h3>Responsibilities</h3>' + bullets(p.responsibilities) : ''}${
      p.qualifications ? '<h3>Qualifications</h3>' + bullets(p.qualifications) : ''}${
      p.benefits ? '<h3>Benefits</h3>' + bullets(p.benefits) : ''}</div>`,
    identifier: { '@type': 'PropertyValue', name: ORG.name, value: p.slug },
    datePosted: p.date_posted,
    employmentType: p.employment_type,
    hiringOrganization: {
      '@type': 'Organization', name: ORG.name, sameAs: ORG.site, logo: ORG.logo,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: p.street || '1331 N Stewart Ave Ste B',
        addressLocality: p.city || 'Springfield',
        addressRegion: p.region || 'MO',
        postalCode: p.postal_code || '65802',
        addressCountry: 'US',
      },
    },
    directApply: true,      // they apply on our own site now, which Google prefers
  };
  if (p.valid_through) d.validThrough = p.valid_through + 'T23:59:59-05:00';
  if (p.openings > 1) d.totalJobOpenings = p.openings;
  if (p.pay_min) {
    const v = { '@type': 'QuantitativeValue', unitText: p.pay_unit || 'HOUR' };
    if (p.pay_max && Number(p.pay_max) > Number(p.pay_min)) {
      v.minValue = Number(p.pay_min); v.maxValue = Number(p.pay_max);
    } else v.value = Number(p.pay_min);
    d.baseSalary = { '@type': 'MonetaryAmount', currency: 'USD', value: v };
  }
  return JSON.stringify(d, null, 2);
}

/* Live-in work is paid by the day, so the unit comes off the posting. Saying
   "/hr" next to a day rate is the kind of wrong that ends up in a complaint. */
const PAY_PER = { HOUR: '/hr', DAY: '/day', WEEK: '/wk', YEAR: '/yr' };
const payLabel = p => !p.pay_min ? '' :
  '$' + Number(p.pay_min).toFixed(2) +
  (p.pay_max && Number(p.pay_max) > Number(p.pay_min) ? '–$' + Number(p.pay_max).toFixed(2) : '') +
  (PAY_PER[p.pay_unit || 'HOUR'] || '/hr');

function page(p, c) {
  const url = `${SITE}/jobs/${p.slug}`;
  const blurb = (p.summary || String(p.description || '').replace(/<[^>]*>/g, '')).slice(0, 155);
  const chips = [TYPE_LABEL[p.employment_type] || p.employment_type,
                 `${p.city || 'Springfield'}, ${p.region || 'MO'}`, payLabel(p)].filter(Boolean);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} in ${esc(p.city || 'Springfield')}, MO | Caring Companions</title>
<meta name="description" content="${esc(blurb)}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(ORG.name)}">
<meta property="og:title" content="${esc(p.title)} in ${esc(p.city || 'Springfield')}, MO">
<meta property="og:description" content="${esc(blurb)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/photos/hero-caregiver.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">
${jsonLd(p)}
</script>
<style>
.jb-wrap{max-width:820px;margin:0 auto;padding:52px 24px 30px;}
.jb-back{font-size:13.5px;color:var(--muted);text-decoration:none;}
.jb-h1{font-family:var(--serif);font-size:40px;line-height:1.14;font-weight:600;color:var(--brand-blue);margin:14px 0 14px;letter-spacing:-.015em;}
.jb-chips{display:flex;gap:9px;flex-wrap:wrap;margin:0 0 24px;}
.jb-chip{background:#fff;border:1px solid var(--border);border-radius:999px;padding:6px 14px;font-size:13.5px;color:var(--ink-2);font-weight:500;}
.jb-chip.pay{background:#e8f1ec;border-color:#cfe3d6;color:#1c6b45;font-weight:700;}
.jb-body{font-size:15.5px;line-height:1.75;color:var(--body-text);}
.jb-body p{margin:0 0 14px;}
.jb-body h2{font-family:var(--serif);font-size:22px;font-weight:600;color:var(--brand-blue);margin:30px 0 10px;}
.jb-body ul{margin:0 0 16px;padding-left:22px;}
.jb-body li{margin:0 0 7px;}
.jb-apply{background:var(--soft-panel);border:1px solid var(--border);border-radius:16px;padding:28px;text-align:center;margin:34px 0 8px;}
.jb-note{font-size:13px;color:var(--muted);margin:12px 0 0;}
@media(max-width:639px){.jb-h1{font-size:30px;}.jb-wrap{padding:34px 20px 20px;}}
</style>
</head>
<body>
<div style="font-family:'Inter',Helvetica,Arial,sans-serif;background:#faf9f6;color:#16283a;min-height:100vh">
${c.head}

<main class="jb-wrap">
<a class="jb-back" href="/careers">&larr; All careers</a>
<h1 class="jb-h1">${esc(p.title)}</h1>
<div class="jb-chips">
${chips.map((t, i) => `<span class="jb-chip${i === 2 ? ' pay' : ''}">${esc(t)}</span>`).join('\n')}
</div>
<div class="jb-body">
${para(p.description)}
${p.responsibilities ? '<h2>What you would be doing</h2>' + bullets(p.responsibilities) : ''}
${p.qualifications ? '<h2>What we are looking for</h2>' + bullets(p.qualifications) : ''}
${p.benefits ? '<h2>What we offer</h2>' + bullets(p.benefits) : ''}
</div>

<div class="jb-apply">
<p style="font-size:16px;font-weight:600;color:#122236;margin:0 0 8px">Interested?</p>
<p style="font-size:14px;line-height:1.6;color:var(--muted);margin:0 auto 20px;max-width:440px">The application takes about five minutes. No uploads required.</p>
<a href="${applyUrl(p.slug)}" class="btn-apply" style="display:inline-block;background:var(--accent);color:#fbfaf7;border-radius:9px;padding:14px 28px;font-size:15px;font-weight:600;text-decoration:none">Apply for this role &rarr;</a>
<p class="jb-note">Questions first? Call us on ${ORG.phone}.</p>
</div>
</main>

${c.foot}
</div>
${CHANNEL_SCRIPT}
</body>
</html>
`;
}

/* The list on careers.html, rewritten between markers so this is safe to run
   over and over. */
function openingsHtml(list) {
  if (!list.length) {
    return `<div class="cr-openings-card">
<p style="font-size:15.5px;font-weight:600;color:#122236;margin:0 0 8px">No openings posted right now</p>
<p style="font-size:14px;line-height:1.6;color:var(--muted);margin:0 auto 20px;max-width:460px">We are always glad to hear from good caregivers. Send an application and we will be in touch when something opens.</p>
<a href="${applyUrl()}" class="js-apply btn-apply">Apply anyway &rarr;</a>
</div>`;
  }
  return '<div style="display:grid;gap:12px;max-width:760px;margin:0 auto">\n' + list.map(p => {
    const pay = payLabel(p);
    return `<a href="/jobs/${esc(p.slug)}" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px 20px;text-decoration:none">
<span style="flex:1 1 220px">
<span style="display:block;font-family:'Source Serif 4',Georgia,serif;font-size:18px;font-weight:600;color:#0D365F">${esc(p.title)}</span>
<span style="display:block;font-size:13.5px;color:var(--muted);margin-top:3px">${esc(p.city || 'Springfield')}, ${esc(p.region || 'MO')} &middot; ${esc(TYPE_LABEL[p.employment_type] || p.employment_type)}${p.summary ? ' &middot; ' + esc(p.summary) : ''}</span>
</span>
${pay ? `<span style="background:#e8f1ec;border-radius:999px;padding:5px 13px;font-size:13.5px;font-weight:700;color:#1c6b45">${esc(pay)}</span>` : ''}
<span style="font-size:14px;font-weight:600;color:var(--accent)">View &amp; apply &rarr;</span>
</a>`;
  }).join('\n') + '\n</div>';
}

async function updateCareersIndex(list) {
  const file = path.join(ROOT, 'careers.html');
  let html = await readFile(file, 'utf8');
  const START = '<!-- JOBS:START (generated by tools/build-jobs.mjs, do not edit by hand) -->';
  const END = '<!-- JOBS:END -->';
  const block = `${START}\n${openingsHtml(list)}\n${END}`;

  const a = html.indexOf(START), b = html.indexOf(END);
  if (a !== -1 && b !== -1) {
    html = html.slice(0, a) + block + html.slice(b + END.length);
  } else {
    /* First run: take over the placeholder card that pointed at Augusta. */
    const cardStart = html.indexOf('<div class="cr-openings-card">');
    if (cardStart === -1) throw new Error('careers.html has no openings card and no markers — cannot place the list');
    const cardEnd = html.indexOf('</div>', html.lastIndexOf('</a>', html.indexOf('</section>', cardStart))) + 6;
    html = html.slice(0, cardStart) + block + html.slice(cardEnd);
  }
  await writeFile(file, html);
}

/* ---------------------------------------------------------------------------
   The Indeed feed.

   This is the part of Augusta that is actually worth $340: it puts our jobs on
   Indeed, where three quarters of applicants come from. Indeed will take a feed
   directly from any employer who publishes one, at no cost, and it is a file at
   a fixed address that Indeed fetches on its own schedule.

   Give Indeed https://mo-care.com/indeed-jobs.xml once, in the employer account
   under Job Feeds, and every posting published in the hub from then on appears
   on Indeed without anybody logging into anything.

   Do NOT feed a role Augusta is also posting while the contract runs. Two
   listings for one job on one Indeed account split the applicants between them
   and one of the two gets suppressed as a duplicate. The `indeed_feed` flag on
   the posting decides, so a role can be moved across one at a time.
   --------------------------------------------------------------------------- */
const INDEED_TYPE = {
  FULL_TIME: 'fulltime', PART_TIME: 'parttime', PER_DIEM: 'parttime',
  TEMPORARY: 'temporary', CONTRACTOR: 'contract', OTHER: '',
};
const INDEED_PER = { HOUR: 'per hour', DAY: 'per day', WEEK: 'per week', YEAR: 'per year' };

const cdata = s => '<![CDATA[' + String(s ?? '').replace(/\]\]>/g, ']]]]><![CDATA[>') + ']]>';

/* Indeed wants RFC 822. Anything else is accepted inconsistently, so be exact. */
const rfc822 = d => new Date(d + 'T12:00:00Z').toUTCString();

function indeedFeed(list) {
  const jobs = list.map(p => {
    const salary = p.pay_min
      ? '$' + Number(p.pay_min).toFixed(2) +
        (p.pay_max && Number(p.pay_max) > Number(p.pay_min) ? ' - $' + Number(p.pay_max).toFixed(2) : '') +
        ' ' + (INDEED_PER[p.pay_unit || 'HOUR'] || 'per hour')
      : '';
    const body = `<div>${para(p.description)}${
      p.responsibilities ? '<h3>Responsibilities</h3>' + bullets(p.responsibilities) : ''}${
      p.qualifications ? '<h3>Qualifications</h3>' + bullets(p.qualifications) : ''}${
      p.benefits ? '<h3>Benefits</h3>' + bullets(p.benefits) : ''}</div>`;
    return [
      '<job>',
      `<title>${cdata(p.title)}</title>`,
      `<date>${cdata(rfc822(p.date_posted || new Date().toISOString().slice(0, 10)))}</date>`,
      `<referencenumber>${cdata(p.slug)}</referencenumber>`,
      `<url>${cdata(`${SITE}/jobs/${p.slug}?src=indeed`)}</url>`,
      `<company>${cdata(ORG.name)}</company>`,
      `<city>${cdata(p.city || 'Springfield')}</city>`,
      `<state>${cdata(p.region || 'MO')}</state>`,
      `<postalcode>${cdata(p.postal_code || '65802')}</postalcode>`,
      `<country>${cdata('US')}</country>`,
      `<description>${cdata(body)}</description>`,
      salary ? `<salary>${cdata(salary)}</salary>` : '',
      INDEED_TYPE[p.employment_type] ? `<jobtype>${cdata(INDEED_TYPE[p.employment_type])}</jobtype>` : '',
      '</job>',
    ].filter(Boolean).join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<source>
<publisher>${cdata(ORG.name)}</publisher>
<publisherurl>${cdata(SITE)}</publisherurl>
<lastBuildDate>${cdata(new Date().toUTCString())}</lastBuildDate>
${jobs}
</source>
`;
}

/* Google finds job pages by crawling, and it crawls the sitemap first. A page
   that exists but is listed nowhere can sit unindexed for weeks, which for a
   job posting is the whole life of the posting. Kept between markers so this
   is safe to run over and over, and so unpublished roles drop back out. */
async function updateSitemap(list) {
  const file = path.join(ROOT, 'sitemap.xml');
  if (!existsSync(file)) return;
  const START = '  <!-- JOBS:START (generated by tools/build-jobs.mjs) -->';
  const END = '  <!-- JOBS:END -->';
  const today = new Date().toISOString().slice(0, 10);
  const lines = list.map(p =>
    `  <url><loc>${SITE}/jobs/${esc(p.slug)}</loc><lastmod>${esc(p.updated_at ? String(p.updated_at).slice(0, 10) : today)}</lastmod></url>`);
  const block = [START, ...lines, END].join('\n');

  let xml = await readFile(file, 'utf8');
  const a = xml.indexOf(START), b = xml.indexOf(END);
  if (a !== -1 && b !== -1) xml = xml.slice(0, a) + block + xml.slice(b + END.length);
  else xml = xml.replace('</urlset>', block + '\n</urlset>');
  await writeFile(file, xml);
}

async function main() {
  const list = await fetchPostings();
  const c = await chrome();
  if (!existsSync(JOBS)) await mkdir(JOBS, { recursive: true });

  for (const p of list) await writeFile(path.join(JOBS, p.slug + '.html'), page(p, c));

  /* A posting that was unpublished must stop being served, or Google keeps
     showing a job nobody can be hired for. */
  const keep = new Set(list.map(p => p.slug + '.html'));
  for (const f of await readdir(JOBS)) {
    if (f.endsWith('.html') && !keep.has(f)) { await unlink(path.join(JOBS, f)); console.log('removed ' + f); }
  }

  /* With nothing published, leave careers.html exactly as it is. Replacing a
     working Augusta card with "no openings" would be a worse page than the one
     we started with, and zero postings usually means the table is empty rather
     than that the agency has stopped hiring. */
  if (list.length) await updateCareersIndex(list);
  else console.log('no published postings — careers.html left untouched');

  await updateSitemap(list);

  /* Only the roles marked for it, so nothing competes with an Augusta listing
     for the same job while both are running. */
  const feed = list.filter(p => p.indeed_feed);
  await writeFile(path.join(ROOT, 'indeed-jobs.xml'), indeedFeed(feed));
  console.log(`indeed feed: ${feed.length} of ${list.length} posting(s)`
    + (feed.length ? ' — ' + feed.map(p => p.slug).join(', ') : ' (none flagged for Indeed yet)'));

  console.log(`${list.length} posting(s) published: ${list.map(p => p.slug).join(', ') || '(none)'}`);
}

main().catch(e => { console.error(String(e && e.message || e)); process.exit(1); });
