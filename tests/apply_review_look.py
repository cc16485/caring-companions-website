"""461 · the apply page when someone has to wait for the office (applied before and declined, or on the do-not-rehire list),
and when their application is closed. Offline: Supabase is a stub, nothing is sent. (python3 tests/apply_review_look.py)"""
import pathlib
from playwright.sync_api import sync_playwright
PAGE = pathlib.Path(__file__).resolve().parent.parent / 'apply.html'
STUB = """window.supabase={ createClient:()=>({ rpc:(fn,a)=>window.__rpc(fn,a), from:()=>({ select(){return this;}, eq(){return this;}, maybeSingle:async()=>({data:null,error:null}), then(ok){ return Promise.resolve({data:[],error:null}).then(ok); } }) }) };
window.__calls=[]; window.__rpc=async(fn,a)=>{ window.__calls.push(fn); if(fn==='interview_open_slots') return {data:[{starts_at:new Date(Date.now()+864e5).toISOString()}],error:null};
  if(fn==='interview_where') return {data:{minutes:20},error:null}; return {data:null,error:null}; };"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const g=id=>document.getElementById(id), show=()=>{ g('formView').style.display='none'; g('bookView').style.display='block'; };
  const base=window.__rpc;
  try{
  ROW='a1'; show();
  window.__rpc=async(fn,a)=> fn==='interview_mine' ? {data:{status:'review'},error:null} : base(fn,a);
  await resumeBooking(); await sleep(50);
  const t=g('bookView').innerText;
  ok('their link: says the office reviews it first, no times, no "call me" button', /the office reviews your application before an interview is booked/.test(t) && !g('slotsBody').querySelector('button') && g('skipBtn').style.display==='none', t);
  ok('...never "That time was just taken"', !/just taken/.test(t));
  window.__rpc=base; g('bookHead').textContent='x'; await resumeBooking(); await sleep(50);
  ok('someone with nothing in the way still sees the times', !!g('slotsBody').querySelector('button'));
  window.__rpc=async(fn,a)=> fn==='interview_book' ? {data:null,error:{message:'REVIEW_FIRST: applied before; the office reviews it before an interview is booked'}} : base(fn,a);
  await bookSlot(g('slotsBody').querySelector('button'), new Date(Date.now()+864e5).toISOString()); await sleep(50);
  ok('picking a time when the office has to review first: the review message, not "just taken"', /reviews your application/.test(g('bookView').innerText) && !/just taken/.test(g('bookView').innerText), g('bookView').innerText);
  window.__rpc=base; await loadSlots(); await sleep(30);
  window.__rpc=async(fn,a)=> fn==='interview_book' ? {data:null,error:{message:'application not open'}} : base(fn,a);
  await bookSlot(g('slotsBody').querySelector('button'), new Date(Date.now()+864e5).toISOString()); await sleep(50);
  ok('a closed application says it is closed, not "just taken"', /This application is closed/.test(g('bookView').innerText) && !/just taken/.test(g('bookView').innerText), g('bookView').innerText);
  window.__rpc=base; await loadSlots(); await sleep(30);
  window.__rpc=async(fn,a)=> fn==='interview_book' ? {data:null,error:{message:'that time was just taken'}} : base(fn,a);
  await bookSlot(g('slotsBody').querySelector('button'), new Date(Date.now()+864e5).toISOString()); await sleep(80);
  ok('a time really taken by someone else: unchanged (the times load again; no review or closed message)', !!g('slotsBody').querySelector('button') && !/reviews your application|is closed/.test(g('bookView').innerText), g('bookView').innerText);
  ok('finishing the form now asks the database first (their booking or the review), not straight to the times', /resumeBooking\(\);\s*\/\/ 461/.test(finish.toString()));
  ok('no em dash in the new words', !/\u2014/.test(REVIEW_MSG+CLOSED_MSG));
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
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
