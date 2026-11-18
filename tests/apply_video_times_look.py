"""Katlin video interviews (2026-11-17): the apply page marks the times only a video interviewer can take as "Video", says
what that means, and a video booking shows no office address, says the link comes by text and email, and asks for the
driver's license. With the database part missing, every time looks exactly as before.
Offline: Supabase is a stub, nothing is sent. (python3 tests/apply_video_times_look.py)"""
import pathlib
from playwright.sync_api import sync_playwright
PAGE = pathlib.Path(__file__).resolve().parent.parent / 'apply.html'
STUB = """window.supabase={ createClient:()=>({ rpc:(fn,a)=>window.__rpc(fn,a), from:()=>({ select(){return this;}, eq(){return this;}, maybeSingle:async()=>({data:null,error:null}), then(ok){ return Promise.resolve({data:[],error:null}).then(ok); } }) }) };
const D=(h)=>{ const d=new Date(); d.setDate(d.getDate()+2); d.setHours(h,0,0,0); return d.toISOString(); };
window.__T={ am:D(10), pm:D(18) };
window.__calls=[]; window.__rpc=async(fn,a)=>{ window.__calls.push([fn,a]);
  if(fn==='interview_open_slots') return {data:[{starts_at:window.__T.am},{starts_at:window.__T.pm}],error:null};
  if(fn==='interview_video_times') return window.__NOVID ? {data:null,error:{message:'function interview_video_times() does not exist'}} : {data:[{starts_at:window.__T.pm}],error:null};
  if(fn==='interview_where') return {data:{minutes:20,name:'Caring Companions',line1:'1331 N Stewart Ave',line2:'Springfield, MO'},error:null};
  if(fn==='interview_mine_video') return {data:window.__MINEV===undefined?null:window.__MINEV,error:null};
  if(fn==='interview_mine') return {data:window.__MINE||null,error:null};
  return {data:null,error:null}; };"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const g=id=>document.getElementById(id), show=()=>{ g('formView').style.display='none'; g('bookView').style.display='block'; g('doneView').style.display='none'; };
  try{
  ROW='a1'; show(); await loadSlots(); await sleep(50);
  const btns=[...g('slotsBody').querySelectorAll('button')];
  const vb=btns.filter(b=>b.dataset.video==='1');
  ok('two times shown, only the evening one marked Video', btns.length===2 && vb.length===1 && /Video/.test(vb[0].innerText) && !/Video/.test(btns.find(b=>!b.dataset.video).innerText), btns.map(b=>b.innerText));
  ok('a line says what Video means (phone or computer, a link we send)', /Times marked Video are video interviews/.test(g('slotsBody').innerText) && /phone or computer/.test(g('slotsBody').innerText));
  ok('the video time reads out as a video interview to screen readers', /video interview/.test(vb[0].getAttribute('aria-label')||''));
  /* book the video time */
  window.__MINEV=true; await bookSlot(vb[0], window.__T.pm); await sleep(80);
  const lede=g('doneLede').innerText;
  ok('booked: "Your video interview is booked", the link by text and email, the license line', /Your video interview is booked for/.test(lede) && /text and email you the link/.test(lede) && /driver's license ready to hold up to the camera/.test(lede), lede);
  ok('...no office address card and no "Where to go"', g('whereCard').style.display==='none' && !/Where to go/.test(lede), [g('whereCard').style.display, lede]);
  ok('...messages 8am to 9pm for a video interview', /between 8am and 9pm/.test(lede));
  ok('...asked the database whether the booking is video', window.__calls.some(c=>c[0]==='interview_mine_video' && c[1].p_applicant==='a1'));
  ok('...the Meet link is never on the page', !/meet\.google/.test(document.body.innerHTML));
  /* book an in-person time */
  show(); await loadSlots(); await sleep(50); window.__MINEV=false;
  const ib=[...g('slotsBody').querySelectorAll('button')].find(b=>!b.dataset.video);
  await bookSlot(ib, window.__T.am); await sleep(80);
  const l2=g('doneLede').innerText;
  ok('in person: the same words as before, Where to go, the address card, 8am to 6pm', /^Your interview is (booked for|now)/.test(l2) && /Where to go is below/.test(l2) && /between 8am and 6pm/.test(l2) && g('whereCard').style.display==='block' && !/video/i.test(l2), l2);
  /* the database part not installed yet */
  window.__NOVID=true; delete window.__MINEV; show(); await loadSlots(); await sleep(50);
  const b3=[...g('slotsBody').querySelectorAll('button')];
  ok('before the database step: nothing marked, no Video line, times still show', b3.length===2 && !b3.some(b=>b.dataset.video) && !/Video/.test(g('slotsBody').innerText), g('slotsBody').innerText);
  await bookSlot(b3[1], window.__T.pm); await sleep(80);
  ok('...and booking reads as before (in person words)', /Where to go is below/.test(g('doneLede').innerText));
  /* coming back to a video booking */
  window.__NOVID=false; window.__MINEV=true; window.__MINE={ status:'booked', starts_at:window.__T.pm, can_change:true }; show(); await resumeBooking(); await sleep(80);
  ok('their link later: "This is a video interview", the license line, no link', /This is a video interview/.test(g('manageWhen').innerText) && /driver's license/.test(g('manageWhen').innerText), g('manageWhen').innerText);
  window.__MINEV=false; await resumeBooking(); await sleep(80);
  ok('...an in-person booking: no video line', !/video interview/.test(g('manageWhen').innerText), g('manageWhen').innerText);
  ok('no em dash in the new words', !/—/.test(VIDEO_NOTE+VIDEO_BOOKED_LINE+g('doneLede').innerText));
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
