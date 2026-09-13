// Retrieval regression set. Run: node supabase/functions/_shared/retrieval.test.mjs
import { decide, scoreRecord, ANSWER_MIN, CANDIDATE_MIN } from './knowledge-policy.js'

// Mirrors kb_items after both migrations.
const R = (id,status,audience,question,answer,answer_key,topics,aliases,alt_questions,phrases,extra={}) =>
  ({id,status,audience,question,answer,answer_key,topics,aliases,alt_questions,phrases,
    confidence:extra.c??90,conservative:!!extra.cons,verified_on:'2026-08-01',version:1,
    source_name:extra.src??'Missouri Medicaid Manual'})

const DB=[
 R('N001','verified','public','Can my daughter be my CDS caregiver?',
   'Sometimes. Missouri Consumer Directed Services, usually called CDS, can pay a family member as the attendant when the consumer is eligible and directs their own care. A spouse cannot be paid.',
   'cds_family_attendant',
   ['cds','medicaid','mo healthnet','attendant','caregiver','family caregiver','daughter','son','relative','paid','consumer directed','self directed','home care'],
   ['CDS','consumer directed services','self-directed care','MO HealthNet','medicad','consumer direction'],
   ['Can Medicaid pay my daughter to care for me?','Can my family member get paid to help me?','Can a relative be paid as my caregiver?','Can my son get paid to take care of me?','Does Medicaid pay family members to provide care at home?','Can I hire my own daughter as my caregiver?','Who can be paid as a CDS attendant?'],
   ['family member get paid','daughter get paid','son get paid','pay my daughter','pay a relative','paid to care for me','paid to take care of','family caregiver paid','relative as caregiver'],{cons:true,c:92}),
 R('N002','stale','public','What does a CDS attendant get paid?','$14.00 per hour.','cds_pay_rate',
   ['cds','pay','rate','wage','attendant','caregiver','hourly','how much'],
   ['CDS','attendant pay','caregiver wage','hourly rate'],
   ['How much does a CDS caregiver make?','What is the hourly rate for a CDS attendant?','How much would my daughter get paid?','What does the caregiver earn?'],
   ['how much does it pay','what is the pay','hourly rate','per hour','how much would I make','what do you pay'],{c:38,src:'Internal payroll policy'}),
 R('N003','verified','public','Who directs care under CDS?',
   'The consumer does. Under Missouri Consumer Directed Services, usually called CDS, the consumer hires, schedules, trains and dismisses their own attendant.','cds_who_directs',
   ['cds','medicaid','consumer','directs','supervision','choose caregiver','self directed','consumer directed','hire','control','manage'],
   ['CDS','consumer directed services','self-directed care','consumer direction'],
   ['Can I choose my own caregiver?','Who is in charge of the caregiver under CDS?','Can I pick who takes care of me?','Do I get to hire and manage my own attendant?','Who supervises the caregiver in CDS?'],
   ['choose my own caregiver','pick my own caregiver','hire my own','who is in charge','who manages the caregiver','decide who takes care of me','control who comes'],{c:96}),
 R('N004','verified','public','Can a spouse be paid as a CDS attendant?',
   'No. Under Missouri Consumer Directed Services, usually called CDS, a spouse cannot be paid as the attendant. Other family members may be able to.','cds_spouse',
   ['cds','medicaid','spouse','husband','wife','married','attendant','caregiver','paid','eligibility'],
   ['CDS','consumer directed services','spousal caregiver','MO HealthNet'],
   ['Can my spouse be my caregiver?','Can my husband get paid to take care of me?','Can my wife be paid as my attendant?','Is a married partner allowed to be the paid caregiver?'],
   ['my spouse','my husband','my wife','married to','spouse be paid','husband be my caregiver','wife be my caregiver'],{cons:true,c:95}),
 R('N005','verified','internal','What happens when a caregiver calls off?',
   'The coordinator confirms the call-off, checks the coverage board, offers the shift to the on-call list.','calloff_procedure',
   ['calloff','call off','coverage','staffing','shift','scheduling','no show','caregiver','coordinator'],
   ['call-off','no-show','shift coverage'],
   ['What do we do when a caregiver calls out?','What is the coverage procedure for a missed shift?','Who do we call when a caregiver does not show up?'],
   ['calls off','called off','call out','does not show','no show','missed shift'],{c:88,src:'Employee handbook'}),
 R('N006','verified','public','What does HomeTogether TV cost?',
   'HomeTogether TV is $99 per month flat, free shipping, 30-day money-back guarantee, no contract.','httv_price',
   ['hometogether','tv','price','cost','device','monthly','subscription','how much','video calling'],
   ['HomeTogether','HomeTogether TV','HT TV','home together','the device'],
   ['How much is HomeTogether?','What does the TV device cost per month?','Is there a contract for HomeTogether TV?','How much does the video calling device cost?'],
   ['how much is hometogether','what does hometogether cost','monthly cost','per month','is there a contract','cost of the device'],{c:98,src:'HomeTogether pricing'}),
]

const CASES=[
 ['NATURAL','Can Medicaid pay my daughter to care for me?','ok','N001'],
 ['NATURAL','Can my family member get paid to help me?','ok','N001'],
 ['NATURAL','Can my spouse be my caregiver?','ok','N004'],
 ['NATURAL','Can my husband get paid to take care of me?','ok','N004'],
 ['NATURAL','Can I choose my own caregiver?','ok','N003'],
 ['NATURAL','Can I pick who takes care of me?','ok','N003'],
 ['NATURAL','Can my son get paid to look after me?','ok','N001'],
 ['NATURAL','Is my wife allowed to be my paid caregiver?','ok','N004'],
 ['NATURAL','How much does HomeTogether cost per month?','ok','N006'],
 ['NATURAL','Can a relative be paid to care for me at home?','ok','N001'],
 ['ABBREV','Can my daughter be my CDS attendant?','ok','N001'],
 ['ABBREV','Does MO HealthNet pay family caregivers?','ok','N001'],
 ['ABBREV','What is consumer directed care?','ok','N003'],
 ['ABBREV','Is there a contract for HT TV?','ok','N006'],
 ['ABBREV','Can a spouse be a CDS attendant?','ok','N004'],
 ['VAGUE','Can my daughter get paid?','ok','N001'],
 ['VAGUE','Who is in charge of the caregiver?','ok','N003'],
 ['VAGUE','How much is the device?','ok','N006'],
 ['VAGUE','Can my husband do it?','ok','N004'],
 ['VAGUE','Does medicad pay my daughter?','ok','N001'],
 ['WITHHELD','How much does a CDS attendant get paid?','withheld','N002'],
 ['WITHHELD','What is the hourly rate for a CDS caregiver?','withheld','N002'],
 ['WITHHELD','How much would my daughter get paid per hour?','withheld','N002'],
 ['WITHHELD','What happens when a caregiver calls off?','withheld','N005'],
 ['WITHHELD','Who do you call when a caregiver does not show up?','withheld','N005'],
 ['NONE','Do you take Humana Medicare Advantage in Branson?','none',null],
 ['NONE','Is the parking lot getting plowed?','none',null],
 ['NONE','What time does the office close?','none',null],
 ['NONE','Can someone fix the copier?','none',null],
 ['NONE','Do you provide transportation to dialysis?','none',null],
]

let pass=0, fail=0; const fails=[]
console.log('\n=== RETRIEVAL REGRESSION, ' + CASES.length + ' cases ===')
console.log('thresholds: candidate ' + CANDIDATE_MIN + ', answer ' + ANSWER_MIN + '\n')
let group=''
for (const [g,q,expect,expectId] of CASES) {
  if (g!==group) { console.log('── ' + g + ' ' + '─'.repeat(60-g.length)); group=g }
  const d = decide(DB, q, {audience:'public'})
  const cands = (d.candidates||[]).slice(0,3).map(c=>`${c.id}:${c.confidence}`).join(' ')
  const got = d.decision
  const gotId = got==='ok' ? (d.records[0]||{}).id
              : got==='withheld' ? ((d.withheld[0]||{}).id) : null
  const ok = got===expect && (expectId===null || gotId===expectId)
  if (ok) pass++; else { fail++; fails.push(`${q}\n      expected ${expect}/${expectId}, got ${got}/${gotId}  [${cands}]`) }
  console.log(`${ok?'ok  ':'FAIL'}  ${q}`)
  console.log(`      CANDIDATES ${cands||'none'}`)
  console.log(`      POLICY ${got}${gotId?' -> '+gotId:''}${d.reason?'  ('+d.reason.slice(0,70)+')':''}`)
}
console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===')
if (fails.length) { console.log('\nFAILURES:'); fails.forEach(f=>console.log('  - '+f)) }
process.exit(fail?1:0)
