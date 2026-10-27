// Run: node supabase/knowledge/cara-2026-10-27.test.mjs
// Real questions families and job seekers typed to Cara, plus common ones,
// and which answer each must land on. null = she should not answer from a record.
import { decide } from '../functions/_shared/knowledge-policy.js'
import { RECORDS } from './cara-2026-10-27.mjs'

const live = [
  { id:'N001', question:'Can my daughter be my CDS caregiver?', answer_key:'cds_family_attendant', topics:['cds','medicaid','attendant','family','daughter','caregiver'], aliases:[], phrases:[], alt_questions:[] },
  { id:'N002', question:'What does a CDS attendant get paid?', answer_key:'cds_pay_rate', topics:['cds','pay','rate','wage','attendant'], aliases:['CDS','attendant pay'], phrases:[], alt_questions:['How much does a CDS caregiver make?','How much would my daughter get paid?'] },
  { id:'N003', question:'Who directs care under CDS?', answer_key:'cds_who_directs', topics:['cds','consumer','choose caregiver'], aliases:[], phrases:[], alt_questions:['Can I choose my own caregiver?','Who is in charge of the caregiver under CDS?'] },
  { id:'N004', question:'Can a spouse be paid as a CDS attendant?', answer_key:'cds_spouse', topics:['cds','spouse'], aliases:[], phrases:[], alt_questions:[] },
  { id:'N006', question:'What does HomeTogether TV cost?', answer_key:'httv_price', topics:['hometogether','price'], aliases:['HomeTogether'], phrases:[], alt_questions:['How much is HomeTogether?'] },
].map(r => ({ ...r, status:'verified', audience:'public', confidence:95, version:1, verified_on:'2026-10-27' }))

const kb = RECORDS.map(r => ({ id:r.id, question:r.question, alt_questions:r.alt, answer:r.answer, answer_key:r.key,
  topics:r.topics, aliases:[], phrases:[], status:'verified', audience:'public', confidence:95, version:1, verified_on:'2026-10-27' }))
const all = [...live, ...kb]
const keyOf = Object.fromEntries(all.map(r => [r.id, r.answer_key]))

const cases = [
  ['do you accept medicaid','medicaid'], ['do you accept mediciad','medicaid'],
  ['Mo-care.com application for a job','jobs_apply'], ['Apply for a job','jobs_apply'],
  ['I want to apply for a job here','jobs_apply'], ['Job opportunities','jobs_apply'],
  ['Interested in emppoyment','jobs_apply'], ['Trying to get an application for a job there','jobs_apply'],
  ["I'm 56 20+ years in Healthcare. I'm interested in overnight care. Full time hours",'jobs_apply|unsure'],
  ['Will I need a high school diploma?','jobs_requirements'], ['Do I need to be a CNA?','jobs_requirements'],
  ['Pca','personal_care'], ['How does getting started work? Can my dad choose his caregiver ?','choose_caregiver_cc|getting_started'],
  ['He already has in home services and we just relocated','transfer_agency'],
  ["Our previous company doesn't have a branch in our new location",'transfer_agency'],
  ['How do I buy?','getting_started'],
  ['How much does home care cost?','hourly_rates'], ['what are your rates','hourly_rates'],
  ['how much is personal care per hour','personal_care|hourly_rates'],
  ['is there a minimum number of hours','minimum_hours'], ['Do you serve Branson?','service_area'],
  ['what counties do you cover','service_area'], ['Do you take VA benefits?','va_benefits'],
  ['my dad is a veteran','va_benefits'], ['Does Medicare pay for home care?','medicare_guide'],
  ['do you take long term care insurance','ltc_insurance'], ['do you take insurance','ways_to_pay|ltc_insurance'],
  ['how can we pay for care','ways_to_pay'], ['my mom has dementia','dementia_care'],
  ['do you have overnight care','overnight_care'], ['do you do live in care','round_the_clock'],
  ['I need a break, I am exhausted','respite_care'], ['do you have nurses','not_medical'],
  ['what is your phone number','contact'], ['where is your office','contact'],
  ['do you have an app','booking_app'], ['Can caregivers take mom on outings','outings'],
  ['are your caregivers background checked','caregivers_employees'],
  ['do you price match','price_guarantee'], ['are you a franchise','about_company'],
  ['my mom is lonely','wellness_care'], ['dad is coming home from the hospital','hospital_recovery'],
  ['can I get paid to take care of my mom','cds_jobs|cds_family_attendant'],
  ['Can my daughter be my CDS caregiver?','cds_family_attendant'],
  ['How much is HomeTogether?','httv_price'], ['What services do you offer?','services_overview'],
  ['Can I choose my own caregiver?','cds_who_directs|choose_caregiver_cc'],
  ['What does the DHSS manual say about a participant with a Power of Attorney?', null],
  ['Do you take Humana in Joplin?', null],
]
let pass = 0, fail = 0
for (const [q, want] of cases) {
  const d = decide(all, q, { audience:'public' })
  const got = ['ok','conflict'].includes(d.decision) ? d.records.map(r => keyOf[r.id]) : []
  const amb = d.decision === 'ambiguous' ? d.candidates.slice(0,2).map(c => keyOf[c.id]) : []
  const ok = (want||'').includes('unsure') && d.decision==='unsure' ? true : want === null ? got.length === 0 : want.split('|').some(w => got[0] === w || (amb.length && amb.includes(w)))
  ok ? pass++ : fail++
  if (!ok || process.env.V) console.log(`${ok?'ok  ':'FAIL'} "${q}" -> ${d.decision} ${got.join(',')}${amb.length?' amb:'+amb.join(','):''} (want ${want}) ${d.candidates?.slice(0,3).map(c=>keyOf[c.id]+':'+c.confidence).join(' ')||''}`)
}
console.log(`\n  ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
