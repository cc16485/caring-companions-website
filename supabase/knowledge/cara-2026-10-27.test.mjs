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
  // 2026-11-05 real chat (Ask Cara chats): a family asking for night help must land on overnight care
  ['mainly need help at night with my mom','overnight_care'], ['getting up many times in the night','overnight_care'],
  ['need help at night for my dad','overnight_care'], ['my mother wanders at night','overnight_care'],
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
  // 2026-11-06: the "Questions families ask" answers (K132-K152), several ways each
  ['How soon can care start?','start_timing'], ['how quickly can you get someone out here','start_timing'],
  ['we need someone as soon as possible','start_timing'], ['can you start this week','start_timing'],
  ['what if our caregiver is sick','caregiver_sick'], ['what happens if the caregiver calls in sick','caregiver_sick'],
  ['do you have backup caregivers','caregiver_sick'], ['what if the caregiver does not show up','caregiver_sick'],
  ['is there a contract','contract_deposit'], ['do you require a deposit','contract_deposit'], ['are we locked into a long term contract','contract_deposit'],
  ['is there a cancellation fee','cancel_visit'], ['can we cancel a visit','cancel_visit'], ['what if I need to cancel tomorrow','cancel_visit'],
  ['how do we stop services','end_services'], ['how do we end services','end_services'], ['can we stop services','end_services'], ['what if we no longer need care','end_services'], ['how much notice to end care','end_services'],
  ['how does billing work','billing'], ['can I pay with a credit card','billing'], ['how often will we get an invoice','billing'],
  ['do you work on Christmas','holidays'], ['do you charge more on holidays','holidays'], ['is there overtime','holidays'],
  ['can a caregiver drive my mom to her doctor appointments','rides_appointments'], ['Do you provide transportation to dialysis?','rides_appointments'],
  ['is there a mileage charge','rides_appointments'], ['can she take him to the pharmacy','rides_appointments'],
  ['can caregivers give medications','medications'], ['can the caregiver give mom her pills','medications'],
  ['can a caregiver fill a pill organizer','medications'], ['can you check blood sugar','medications|not_medical'],
  ["what can't caregivers do",'cannot_do'], ['can a caregiver climb a ladder','cannot_do'], ['can caregivers do yard work','cannot_do'],
  ['do you care for couples','couples'], ['both of my parents need care','couples'], ['my mom and dad both need help','couples'],
  ['will we know who is coming','know_who_coming'], ['can we meet the caregiver first','know_who_coming'], ['will we get a photo of the caregiver','know_who_coming'],
  ['what if we do not like the caregiver','not_good_fit'], ['can we change caregivers','not_good_fit'], ['mom does not get along with her caregiver','not_good_fit'],
  ['how will we know how the visits are going','visit_updates'], ['can we see the caregiver notes','visit_updates'], ['will the family get updates','visit_updates'],
  ['can I tip the caregiver','tips_gifts'], ['can we give her a christmas gift','tips_gifts'],
  ['can we hire our caregiver privately','hire_privately'], ['can we pay the caregiver directly','hire_privately'],
  ['mom is in the hospital what about her visits','hospital_pause'], ['can we put care on hold','hospital_pause'],
  ['can I read your agreement','read_agreement'], ['do you have a client handbook','read_agreement'],
  ['I have a complaint','concerns'], ['can I speak to a manager','concerns'], ['I am not happy with our care','concerns'],
  ['we have a dog','pets'], ['is it ok if we have cats','pets'],
  ['my dad smokes','smoking'], ['is smoking allowed','smoking'],
  // 2026-11-06 (later): same-day or next-day, hospice, weekends; the facilities answer is held, so those must not answer
  ['Can care start today?','start_today'], ['can someone come tomorrow','start_today'], ['we need a caregiver tonight','start_today'],
  ['do you take same day requests','start_today'], ['my mom just got home and we need help today','start_today|hospital_recovery'],
  ['How soon can care start?','start_timing'], ['how quickly can someone start','start_timing'],
  ['Do you work with hospice?','hospice'], ['my dad is on hospice can you help','hospice'], ['do you do end of life care','hospice'],
  ['can a caregiver sit with mom while she is on hospice','hospice'],
  ['Do you work weekends?','weekends'], ['can a caregiver come on Saturday','weekends'], ['are you open 7 days a week','weekends'],
  ['we need help on sundays','weekends'], ['Do you work on Christmas?','holidays'], ['How soon can care start after the assessment?','start_timing'],
  ['Do you go to assisted living?','facility_care'], ['can you sit with my mom in the nursing home','facility_care'],
  ['can a caregiver sit with dad in the hospital','facility_care|hospital_pause'], ['can you help with showers in her nursing home','facility_care'],
  ['my mom lives in senior living','facility_care'], ['do you provide care in a nursing facility','facility_care'],
  ['Do you have nurses?','not_medical'],
  ['what do I do in an emergency', null],
  ['What does the DHSS manual say about a participant with a Power of Attorney?', null],
  ['Do you take Humana in Joplin?', null],
]
// Consistency (her rules 1, 2, 4): every start-of-care answer says the assessment comes first, none promises 24 to 48 hours,
// and no answer promises coverage. The held facilities answer is not loaded.
const byKey = Object.fromEntries(RECORDS.map(r => [r.key, r]))
const consistency = [
  ['start answers name the assessment and care plan', ['start_timing','start_today'].every(k => /in-home assessment/.test(byKey[k].answer) && /care plan/.test(byKey[k].answer))],
  ['no answer promises 24 to 48 hours', RECORDS.every(r => !/24 to 48|24-48|48 hours/.test(r.answer))],
  ['start answers point to the next step', ['start_timing','start_today'].every(k => /234-8494/.test(byKey[k].answer))],
  ['the facilities answer is published (her OK 11-06) and says wherever home is', !!byKey.facility_care && /wherever home is/.test(byKey.facility_care.answer)],
  ['the hospital answer agrees: care can continue in the hospital', /in the hospital/.test(byKey.hospital_pause.answer)],
  ['hospice keeps medical care with the hospice team', /hospice team continues to provide medical care/.test(byKey.hospice.answer)],
  ['weekends and holidays agree with the holiday answer', /holidays/.test(byKey.weekends.answer) && /time and a half/.test(byKey.holidays.answer)],
  ['no answer says "covered" about staffing or rides', !/will be covered|you are covered|guaranteed a caregiver/.test(RECORDS.map(r => r.answer).join(' '))],
]
let pass = 0, fail = 0
for (const [name, ok] of consistency) { ok ? pass++ : fail++; if (!ok || process.env.V) console.log(`${ok ? 'ok  ' : 'FAIL'} consistency: ${name}`) }
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
