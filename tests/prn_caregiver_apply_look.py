"""1036 · the apply page for the PRN Caregiver Team (Samantha 2026-10-21: "Yes to all 8 PRN Caregiver recommendations"): no CNA
question and no CNA turn-away when the role does not require a CNA (requires_cna false), the year of paid experience still asked,
the pay acknowledgment and the ongoing note from the role (pay_note), never hard-coded; the PRN CNA Team exactly as before.
Offline: Supabase is a stub, nothing is sent. (python3 tests/prn_caregiver_apply_look.py)"""
import pathlib, json
from playwright.sync_api import sync_playwright
PAGE = pathlib.Path(__file__).resolve().parent.parent / 'apply.html'
ROLES = {
  'prn_caregiver': {'key': 'prn_caregiver', 'label': 'PRN Caregiver Team', 'track': 'prn', 'active': True, 'pay_min': 18, 'pay_unit': 'HOUR', 'screener': [], 'requires_cna': False,
                    'pay_ack': 'I understand that Caring Companions PRN Caregiver Team members are paid $18/hour.', 'pay_note': 'If you later move to a regular schedule, the ongoing caregiver rate is $16/hour.'},
  'prn_cna': {'key': 'prn_cna', 'label': 'PRN CNA Team', 'track': 'prn', 'active': True, 'pay_min': 20, 'pay_unit': 'HOUR', 'screener': [], 'requires_cna': True,
              'pay_ack': 'I understand that Caring Companions PRN CNA Team members are paid $20/hour.', 'pay_note': 'Note: if you would like to switch to taking an ongoing client, our CNAs are paid $18 an hour.'},
}
STUB = "window.__ROLES=" + json.dumps(ROLES) + """;
window.supabase={ createClient:()=>({ rpc:(fn,a)=>window.__rpc(fn,a), from:(t)=>{ const st={}; const b={ select(){return b;}, eq(k,v){ st[k]=v; return b; },
  maybeSingle:async()=>({data: t==='job_positions' ? (window.__ROLES[st.key]||null) : null, error:null}), then(ok){ return Promise.resolve({data:[],error:null}).then(ok); } }; return b; } }) };
window.__calls=[]; window.__rpc=async(fn,a)=>{ window.__calls.push([fn,a]); if(fn==='apply_save') return {data:'row-1',error:null}; return {data:null,error:null}; };"""
T = r"""
async(pos)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const g=id=>document.getElementById(id);
  try{
    POSITION=pos; await loadRoleQuestions(); await sleep(50);
    const qs=g('prnQs').innerText, pay=g('prnPay').innerText;
    return { qs, pay, cnaChips: !!document.querySelector('[data-k="prn_cna"]'), line: g('posLine').innerText };
  }catch(e){ return { crashed: String(e) }; }
}
"""
KO = r"""
async()=>{
  const g=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
  A.age_ok=true; A.work_auth=true; A.has_transport=true; A.prn_one_year=true; A.prn_cna=false;
  ROW='row-1'; window.__calls=[];
  try{ await next2(); }catch(e){}
  await sleep(80);
  return { calls: window.__calls.map(c=>c[0]), prnPatch: (window.__calls.find(c=>c[0]==='apply_prn_save')||[])[1], err: g('err2').style.display!=='none' ? g('err2').innerText : '', body: document.body.innerText.slice(0,4000) };
}
"""
res = []
def ck(n, c, d=''): res.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:600]))
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for pos in ('prn_caregiver', 'prn_cna'):
        pg = b.new_page()
        pg.route('**/*', lambda r: r.fulfill(body=STUB, content_type='text/javascript') if 'supabase-js' in r.request.url
                 else (r.continue_() if r.request.url.startswith('file:') else r.abort()))
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(PAGE.as_uri()); pg.wait_for_timeout(700)
        r = pg.evaluate(T, pos)
        if pos == 'prn_caregiver':
            ck('PRN Caregiver Team: no CNA question at all', not r.get('cnaChips') and 'Are you currently a CNA' not in r.get('qs', ''), r)
            ck('...the year of paid caregiving experience is still asked (without "or CNA")', 'at least one year of paid caregiving experience?' in r.get('qs', ''), r)
            ck('...the pay acknowledgment and the ongoing note from the role, word for word', 'I understand that Caring Companions PRN Caregiver Team members are paid $18/hour.' in r.get('pay', '') and 'If you later move to a regular schedule, the ongoing caregiver rate is $16/hour.' in r.get('pay', '') and '$18 an hour' not in r.get('pay', ''), r)
            ck('...the position line names the team and $18/hr', 'PRN Caregiver Team' in r.get('line', '') and '$18/hr' in r.get('line', ''), r)
            ck('...her identity line, then "Start PRN. Stay flexible." (PRN step 4)', 'Join our PRN Team. We stand in the gap so families never go without care.\nStart PRN. Stay flexible.' in r.get('line', ''), r)
            k = pg.evaluate(KO)
            ck('...saying "not a CNA" never turns them away; only the year goes to the database', 'apply_prn_save' in k['calls'] and k['prnPatch'] and 'cna' not in k['prnPatch']['p_prn'] and 'not able to take this application further' not in k['body'], k)
        else:
            ck('PRN CNA Team: the CNA question as before', r.get('cnaChips') and 'Are you currently a CNA' in r.get('qs', ''), r)
            ck('...its own acknowledgment and its $18 note, now from the role', 'paid $20/hour' in r.get('pay', '') and 'our CNAs are paid $18 an hour' in r.get('pay', ''), r)
            k = pg.evaluate(KO)
            ck('...not a CNA: turned away, in the team\'s own name', 'The PRN CNA Team is for certified nursing assistants' in k['body'], k['body'][:600])
        ck('no page errors (' + pos + ')', not errs, errs)
        pg.close()
    b.close()
src = PAGE.read_text()
ck('no em dash in the new words', '—' not in src.split('1036 (Samantha 2026-10-21')[1][:1200])
ck('the $18 note is no longer hard-coded in the page', 'our CNAs are paid $18 an hour.</p>' not in src)
for s_, n, d in res: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in res), '/', len(res))
