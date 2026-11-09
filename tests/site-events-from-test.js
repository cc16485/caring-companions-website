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
check('localhost sends nothing', run('http://localhost:8000/?from=youtube', '').length, 0);
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
