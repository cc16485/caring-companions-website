"""1561 · the booking link for someone who finished applying before the paid-year question existed: one question, then the
times. Offline: Supabase is a stub, nothing is sent. (python3 tests/apply_year_on_link_look.py)"""
import pathlib
from playwright.sync_api import sync_playwright
PAGE = pathlib.Path(__file__).resolve().parent.parent / 'apply.html'
STUB = """window.supabase={ createClient:()=>({ rpc:(fn,a)=>window.__rpc(fn,a), from:()=>({ select(){return this;}, eq(){return this;}, maybeSingle:async()=>({data:null,error:null}), then(ok){ return Promise.resolve({data:[],error:null}).then(ok); } }) }) };
window.__calls=[]; window.__answered=null;
window.__rpc=async(fn,a)=>{ window.__calls.push([fn,a]);
  if(fn==='interview_mine') return {data: window.__answered==='yes' ? null : {status:'screen_first',gap:'questions',can_finish:true,ask:'one_year',position:'caregiver'}, error:null};
  if(fn==='apply_answer_year'){ if(window.__fail) return {data:null,error:{message:'NOT_OPEN'}}; window.__answered=a.p_one_year; return {data:null,error:null}; }
  if(fn==='interview_open_slots') return {data:[{starts_at:new Date(Date.now()+864e5).toISOString()}],error:null};
  if(fn==='interview_where') return {data:{minutes:20},error:null}; return {data:null,error:null}; };"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const g=id=>document.getElementById(id), show=()=>{ g('formView').style.display='none'; g('noView').style.display='none'; g('bookView').style.display='block'; };
  const reset=()=>{ window.__answered=null; window.__fail=false; window.__calls=[]; ROW='a1'; show(); };
  try{
  reset(); await resumeBooking(); await sleep(50);
  const t=g('bookView').innerText;
  ok('their link: one question, three answers, no "please call us", no times yet', /One quick question/.test(t) && /one year of paid caregiving experience/.test(t)
     && document.querySelectorAll('#yearChips button').length===3 && !/call or text us/.test(t) && g('formView').style.display==='none', t);
  document.querySelectorAll('#yearChips button')[0].click(); await sleep(120);
  ok('yes: saved through apply_answer_year with their id', window.__calls.some(([f,a])=>f==='apply_answer_year' && a.p_id==='a1' && a.p_one_year==='yes'), window.__calls);
  ok('...then the times appear', !!g('slotsBody').querySelector('button') && !/One quick question/.test(g('bookView').innerText) && /Now pick a time/.test(g('bookHead').textContent), g('bookView').innerText);

  reset(); await resumeBooking(); await sleep(50);
  document.querySelectorAll('#yearChips button')[2].click(); await sleep(120);
  ok('no: the same kind stop as the form, no times', g('noView').style.display==='block' && g('bookView').style.display==='none' && /one year of paid caregiving experience before they start/.test(g('noWhy').textContent), g('noWhy').textContent);

  reset(); await resumeBooking(); await sleep(50);
  document.querySelectorAll('#yearChips button')[1].click(); await sleep(120);
  ok('family: the office calls first message, no times', /caring for a family member, someone from our office will call you/.test(g('bookView').innerText) && !g('slotsBody').querySelector('button'), g('bookView').innerText);

  reset(); window.__fail=true; await resumeBooking(); await sleep(50);
  document.querySelectorAll('#yearChips button')[0].click(); await sleep(120);
  ok('if it does not save: says so with the office number, buttons work again', /did not save/.test(g('yearErr').textContent) && !document.querySelectorAll('#yearChips button')[0].disabled, g('yearErr').textContent);

  reset(); window.__rpc0=window.__rpc; window.__rpc=async(fn,a)=> fn==='interview_mine' ? {data:{status:'screen_first',gap:'questions',can_finish:false},error:null} : window.__rpc0(fn,a);
  await resumeBooking(); await sleep(50);
  ok('anyone else who cannot finish online still gets the call-us message', /call or text us at \(417\) 234-8494/.test(g('bookView').innerText) && !document.getElementById('yearChips'), g('bookView').innerText);
  window.__rpc=window.__rpc0;
  ok('no em dash in the new code', !/—/.test(showYearAsk.toString()+yearAnswer.toString()));
  }catch(e){ R.push(['FAIL','crashed',String(e)]); }
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.fulfill(body=STUB, content_type='text/javascript') if 'supabase-js' in r.request.url
             else (r.continue_() if r.request.url.startswith('file:') else r.abort()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(PAGE.as_uri()); pg.wait_for_timeout(800)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ document.getElementById('formView').style.display='none'; document.getElementById('noView').style.display='none'; document.getElementById('bookView').style.display='block'; window.__answered=null; window.__fail=false; ROW='a1'; return resumeBooking(); }")
    pg.wait_for_timeout(200); pg.set_viewport_size({'width': 390, 'height': 900})
    pg.screenshot(path=str(pathlib.Path(__file__).resolve().parent / 'apply_year_on_link.png'), full_page=False)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
