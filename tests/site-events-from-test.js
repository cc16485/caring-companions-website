// Tests the channel tag in assets/site-events.js (2026-11-09): run `node tests/site-events-from-test.js`
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/../assets/site-events.js', 'utf8');
let pass = 0, fail = 0;
function run(url, referrer) {
  const sent = [];
  const store = {};
  const u = new URL(url);
  const ctx = {
    location: { hostname: u.hostname, pathname: u.pathname, search: u.search },
    document: { referrer, head: { appendChild() {} }, createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }], addEventListener() {} },
    sessionStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    fetch: (_u, o) => { sent.push(JSON.parse(o.body)); return { catch() {} }; },
    URL, URLSearchParams, JSON, Math, Date, String,
  };
  ctx.window = ctx; ctx.dataLayer = [];
  vm.runInNewContext(src, ctx);
  ctx.CCTrack('lead_submitted', { x: 1 });
  return sent;
}
function check(name, got, want) { if (got === want) pass++; else { fail++; console.log('FAIL', name, 'got', got, 'want', want); } }
let s = run('https://mo-care.com/?from=YouTube', '');
check('tag wins', s[0].props.from, 'youtube');
check('later event keeps channel', s[1].props.from, 'youtube');
check('props kept', s[1].props.x, 1);
check('referrer google', run('https://mo-care.com/cost.html', 'https://www.google.com/')[0].props.from, 'google');
check('referrer fb mobile', run('https://mo-care.com/', 'https://m.facebook.com/')[0].props.from, 'facebook');
check('youtu.be', run('https://mo-care.com/', 'https://youtu.be/abc')[0].props.from, 'youtube');
check('utm_source', run('https://mo-care.com/?utm_source=facebook&utm_medium=post', 'https://l.facebook.com/')[0].props.from, 'facebook');
check('own site is not a source', run('https://mo-care.com/a.html', 'https://mo-care.com/')[0].props.from, 'direct');
check('typed in', run('https://mo-care.com/', '')[0].props.from, 'direct');
check('junk tag cleaned', run('https://mo-care.com/?from=%3Cscript%3E', '')[0].props.from, 'script');
check('other site', run('https://mo-care.com/', 'https://www.caring.com/x')[0].props.from, 'other_site');
(function () {
  const store = {}, u = new URL('https://mo-care.com/assessment.html?from=youtube'), sent = [], ga = [];
  const ctx = { location: { hostname: u.hostname, pathname: u.pathname, search: u.search },
    document: { referrer: '', head: { appendChild() {} }, createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }], addEventListener() {} },
    sessionStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    fetch: (_u, o) => { sent.push(JSON.parse(o.body)); return { catch() {} }; }, URL, URLSearchParams, JSON, Math, Date, String };
  ctx.window = ctx; ctx.dataLayer = [];
  vm.runInNewContext(src, ctx);
  ctx.gtag = function () { ga.push([...arguments]); };
  ctx.CCTrack('tool_completed', { tool: 'assessment', level: 'Level 3', urgent: true, score: 7 });
  const g = ga.find(x => x[0] === 'event' && x[1] === 'tool_completed') || [];
  check('Google gets the tool name', g[2] && g[2].tool, 'assessment');
  check('Google never gets the care level, urgent or score', JSON.stringify(g[2]).match(/level|urgent|score/) === null, true);
  check('our own counter keeps the level', sent[sent.length - 1].props.level, 'Level 3');
})();
// 2026-11-11 Google tracking: key events for Google Ads, no doubled page views, no health topics in Google event names.
(function () {
  const store = {}, u = new URL('https://mo-care.com/free-assessment'), sent = [], ga = [];
  const ctx = { location: { hostname: u.hostname, pathname: u.pathname, search: u.search },
    document: { referrer: '', head: { appendChild() {} }, createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }], addEventListener() {} },
    sessionStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    fetch: (_u, o) => { sent.push(JSON.parse(o.body)); return { catch() {} }; }, URL, URLSearchParams, JSON, Math, Date, String };
  ctx.window = ctx; ctx.dataLayer = [];
  vm.runInNewContext(src, ctx);
  ctx.gtag = function () { ga.push([...arguments]); };
  const names = () => ga.filter(x => x[0] === 'event').map(x => x[1]);
  ctx.CCTrack('page_view');
  check('page view not sent to Google twice', names().includes('page_view'), false);
  check('our own counter still gets page views', sent[sent.length - 1].event, 'page_view');
  ctx.CCTrack('lead_submitted', { form: 'free_assessment' });
  check('lead goes to Google', names().includes('lead_submitted'), true);
  check('free assessment gets its own Google event', names().includes('free_assessment_request'), true);
  const lead = ga.find(x => x[1] === 'lead_submitted');
  check('Google gets the form name', lead[2].form, 'free_assessment');
  ga.length = 0;
  ctx.CCTrack('lead_submitted', { form: 'contact' });
  check('contact form is not a free assessment', names().join(), 'lead_submitted');
  ga.length = 0;
  ctx.CCTrack('lead_submitted', { form: 'my mom has dementia' });
  check('unknown form names never reach Google', 'form' in ga[0][2], false);
  ga.length = 0;
  ctx.CCTrack('dj_module3_complete'); ctx.CCTrack('guide_eligible'); ctx.CCTrack('guide_not_eligible');
  check('course and eligibility steps stay off Google', ga.length, 0);
  check('but our own counter keeps them', sent[sent.length - 1].event, 'guide_not_eligible');
  ctx.CCTrack('call_click'); ctx.CCTrack('email_signup'); ctx.CCTrack('apply_click');
  check('calls, sign-ups and apply clicks reach Google', names().join(), 'call_click,email_signup,apply_click');
})();
check('localhost sends nothing', run('http://localhost:8000/?from=youtube', '').length, 0);
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
