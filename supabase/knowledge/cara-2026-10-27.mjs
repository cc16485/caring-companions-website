// The website chat's family-facing answers, 2026-10-27 (K101-K131) and 2026-11-06 (K132-K152, K125 update).
// Every answer is taken from mo-care.com as published on 2026-10-27, plus
// Samantha's standing rules (Medicaid goes to Caring Companions Consumer
// Directed Services; never say AI; no em dashes).
// 2026-11-07: the Booking App is no longer offered (her decision). K103 drops the app line and K120 says there is no app.
// Load with: node supabase/knowledge/build-sql.mjs > the migration.

const CDS = 'our sister company, Caring Companions Consumer Directed Services, at (417) 218-2888 or caringcds.com'

export const SOURCE = { id: 'S7', name: 'mo-care.com published pages (2026-10-27)' }
// 2026-11-06: answers from the "Questions families ask" page and the Client Care Agreement and Client Handbook it links to.
// 2026-11-06 (later): wording Samantha wrote herself for hospice, weekends and same-day care.
export const SOURCE3 = { id: 'S9', name: 'Samantha, approved wording (2026-11-06)' }
export const SOURCE2 = { id: 'S8', name: 'mo-care.com/before-your-assessment, Client Care Agreement and Client Handbook (Rev. 10/2026)' }

export const RECORDS = [
  { id: 'K101', key: 'services_overview',
    question: 'What services do you offer?',
    alt: ['What kind of care do you provide?', 'What types of care do you offer?', 'What do you help with?'],
    answer: 'We offer non-medical home care at three levels. Wellness Care is companionship, meals, light housekeeping, errands, rides and medication reminders. Personal Care adds hands-on help with bathing, dressing, toileting and getting around. Advanced Care is for advanced dementia, wandering or significant mobility needs. We also do Overnight Care, 24-Hour Care, Respite Care, help after a hospital stay, and HomeTogether TV video check-ins. You can move between levels without changing agencies.',
    topics: ['services', 'home care', 'care', 'offer'] },

  { id: 'K102', key: 'hourly_rates',
    question: 'How much does home care cost?',
    alt: ['What are your rates?', 'How much per hour?', 'What is the price of care?', 'How much does a caregiver cost?'],
    answer: 'Our published rates are Wellness Care $30 an hour, Personal Care $32 an hour, and Advanced Care $34 an hour. Overnight and 24-Hour Care use the same hourly rates, based on the level of care needed. An in-home assessment gives you an exact number for your schedule and needs.',
    topics: ['cost', 'price', 'rate', 'hourly', 'how much'] },

  { id: 'K103', key: 'minimum_hours',
    question: 'What is the minimum number of hours?',
    alt: ['Is there a minimum?', 'How few hours can we book?', 'Can we get a short visit?', 'Do you have a weekly minimum?'],
    answer: 'Scheduled care has a minimum of 4 hours per visit and 8 hours per week.',
    topics: ['minimum', 'hours', 'per visit', 'per week'] },

  { id: 'K104', key: 'medicaid',
    question: 'Do you accept Medicaid?',
    alt: ['Does Medicaid pay for your care?', 'Can we use Medicaid?', 'Do you take MO HealthNet?', 'Is Medicaid accepted?'],
    answer: `Caring Companions does not take Medicaid. For Medicaid-funded care at home, please reach ${CDS}. They can talk you through Consumer Directed Services, where the person receiving care chooses their own attendant.`,
    topics: ['medicaid', 'accept', 'mo healthnet', 'cds'] },

  { id: 'K105', key: 'ways_to_pay',
    question: 'How can we pay for care?',
    alt: ['What payment do you accept?', 'Do you take insurance?', 'What are the ways to pay?', 'Do you accept private pay?'],
    answer: `There are a few ways to pay. Private pay is billed directly at our published rates. We work with VA benefits, including Community Care and Aid and Attendance. We verify and bill long-term care insurance policies. Medicare GUIDE covers dementia respite visits for eligible families. We do not take Medicaid. For Medicaid, please reach ${CDS}.`,
    topics: ['pay', 'payment', 'accept', 'insurance', 'private pay', 'va', 'long term care insurance', 'medicare'] },

  { id: 'K106', key: 'medicare_guide',
    question: 'Does Medicare pay for home care?',
    alt: ['What is the Medicare GUIDE program?', 'Does Medicare cover dementia respite?', 'Can Medicare pay for a caregiver?'],
    answer: 'The Medicare program we work with is GUIDE, for people living with dementia at home. Families further along in the disease can get 20 four-hour respite visits a year, billed to Medicare. Medicare decides who qualifies. Caring Companions is an approved GUIDE respite provider in southwest Missouri. Call (417) 234-8494 and we will check eligibility with you.',
    topics: ['medicare', 'guide', 'dementia', 'respite'] },

  { id: 'K107', key: 'va_benefits',
    question: 'Do you work with VA benefits?',
    alt: ['Does the VA pay for home care?', 'My dad is a veteran, can the VA help?', 'Do you accept Aid and Attendance?'],
    answer: 'Yes. We work with VA benefits, including VA Community Care and Aid and Attendance. Community Care is arranged through the veteran\'s VA primary care team. Call (417) 234-8494 and a care coordinator can talk through what fits.',
    topics: ['va', 'veteran', 'aid and attendance', 'benefits'] },

  { id: 'K108', key: 'ltc_insurance',
    question: 'Do you take long-term care insurance?',
    alt: ['Will my long-term care policy pay for this?', 'Can you bill my LTC insurance?'],
    answer: 'Yes. We verify your benefits, set up a call with your carrier, help with the claim forms, and can bill the insurance company directly or give you paid invoices to submit. Most policies pay once help is needed with 2 or more daily activities, or with a cognitive impairment. We review your policy with you before you commit to anything.',
    topics: ['long term care insurance', 'ltc', 'policy', 'insurance'] },

  { id: 'K109', key: 'service_area',
    question: 'What area do you serve?',
    alt: ['Do you serve my town?', 'What counties do you cover?', 'Are you near me?', 'Do you come to Branson?'],
    answer: 'We are based in Springfield. We actively serve Greene, Christian, Webster and Polk counties. In Taney, Lawrence, Dallas and Stone counties we start care when we have a caregiver nearby and enough weekly hours to keep care steady, so please call first. You can check your ZIP code on mo-care.com/service-area or call (417) 234-8494.',
    topics: ['area', 'county', 'serve', 'town', 'springfield', 'zip'] },

  { id: 'K110', key: 'getting_started',
    question: 'How do we get started?',
    alt: ['How does getting started work?', 'What is the first step?', 'How do I set up care?', 'How do I sign up?', 'Can we schedule an assessment?'],
    answer: 'It starts with an in-home assessment. An experienced care coordinator comes to the home for about an hour and a half, meets your loved one, and builds a care plan with you. There is no charge and no obligation. You can book it at mo-care.com/book or call (417) 234-8494. If you would rather start online, the Care Questionnaire takes about 8 minutes.',
    topics: ['assessment', 'start', 'first step', 'book', 'consultation'] },

  { id: 'K111', key: 'dementia_care',
    question: 'Do you provide dementia care?',
    alt: ['Can you help with Alzheimer\'s?', 'My mom has memory problems, can you help?', 'Do you handle wandering?'],
    answer: 'Yes. Advanced Care, $34 an hour, is for advanced Alzheimer\'s and other dementias, confusion or wandering, Parkinson\'s, stroke-related challenges and significant mobility needs. Caregivers are matched to your loved one. It is still non-medical care, not skilled nursing. Families caring for someone with dementia may also qualify for respite through the Medicare GUIDE program.',
    topics: ['dementia', 'alzheimers', 'memory', 'advanced care'] },

  { id: 'K112', key: 'overnight_care',
    question: 'Do you offer overnight care?',
    alt: ['Can someone stay at night?', 'Do you have night shifts for clients?', 'Can a caregiver stay overnight?'],
    answer: 'Yes. A caregiver comes in the evening and stays through the night, usually an 8 to 12 hour shift, to help with bathroom trips, wandering, medication reminders or anything after dark. It is $30 to $34 an hour depending on the level of care, as many nights a week as you need.',
    topics: ['overnight', 'night', 'nights'] },

  { id: 'K113', key: 'round_the_clock',
    question: 'Do you offer 24-hour care?',
    alt: ['Can someone be there around the clock?', 'Do you offer live-in care?', 'Can she have a caregiver 24/7?'],
    answer: 'Yes, through 24-Hour Care. Caregivers work rotating shifts, usually two 12-hour or three 8-hour shifts a day, so someone awake is always there. We do not offer live-in care. 24-Hour Care is billed hourly at $30 to $34 an hour depending on the level of care.',
    topics: ['24 hour', 'around the clock', 'live in', '24 7'] },

  { id: 'K114', key: 'respite_care',
    question: 'Do you offer respite care?',
    alt: ['I need a break from caregiving', 'Can someone give me relief?', 'Can you cover while I am away?'],
    answer: 'Yes. Respite care gives a family caregiver time off while one of our caregivers steps in. It can be a regular shift, daily, weekly or monthly, from 4 to 24 hours, or as needed when something comes up. Respite visits can include an outing too. For families caring for someone with dementia, the Medicare GUIDE program may cover respite visits.',
    topics: ['respite', 'break', 'relief', 'family caregiver'] },

  { id: 'K115', key: 'not_medical',
    question: 'Do you provide nursing or medical care?',
    alt: ['Do you have nurses?', 'Can your caregivers do medical care?', 'Do you do skilled nursing?'],
    answer: 'No. Our care is non-medical. Our caregivers help with daily living, personal care, dementia support and safety at home, but we do not provide skilled nursing.',
    topics: ['nurse', 'nursing', 'medical', 'skilled'] },

  { id: 'K116', key: 'jobs_apply',
    question: 'How do I apply for a job?',
    alt: ['Do you have caregiver jobs?', 'I am interested in overnight or full time caregiver work', 'I want to work for you', 'Do you have job openings?', 'Where is the job application?', 'I want to be a caregiver', 'I am interested in employment'],
    answer: 'We would love to hear from you. You can apply at mo-care.com/apply, it takes about 2 minutes, and then you pick your interview time. We ask for at least one year of paid caregiving experience. Caregivers are W-2 employees with paid training, weekly pay, and full time or part time schedules, mostly in Greene, Christian, Webster and Polk counties.',
    topics: ['job', 'apply', 'application', 'hiring', 'employment', 'caregiver', 'career'] },

  { id: 'K117', key: 'jobs_requirements',
    question: 'What do I need to be a caregiver with you?',
    alt: ['Do I need a CNA license?', 'Do I need a high school diploma?', 'What experience do I need?', 'What are the job requirements?'],
    answer: 'We ask for at least one year of paid caregiving experience. Work at home, in a nursing home, assisted living or a hospital counts, and so does being paid to care for a family member. Wellness Care roles need no license. Advanced Care roles are for licensed CNAs. You must be 21 or older and able to work in the United States. For anything else, apply at mo-care.com/apply and we will talk it through.',
    topics: ['job', 'requirements', 'license', 'cna', 'experience', 'diploma'] },

  { id: 'K118', key: 'contact',
    question: 'How do I reach your office?',
    alt: ['What is your phone number?', 'Where are you located?', 'Can I talk to a person?', 'What are your office hours?'],
    answer: 'Call (417) 234-8494. A real person answers 24 hours a day, 7 days a week, including nights, weekends and holidays. Our office is at 1331 N Stewart Ave, Suite B, Springfield, MO 65802.',
    topics: ['phone', 'call', 'office', 'address', 'contact'] },

  { id: 'K119', key: 'hometogether_included',
    question: 'Is HomeTogether TV included with care?',
    alt: ['Do clients get HomeTogether?', 'Is the TV device included with 20 hours?'],
    answer: 'Yes. Families who receive 20 or more hours of care a week get HomeTogether TV included at no extra cost. It brings video calls, reminders and quiet safety monitoring to the TV they already watch.',
    topics: ['hometogether', 'tv', 'included', '20 hours'] },

  { id: 'K120', key: 'booking_app',
    question: 'Do you have an app?',
    alt: ['Can I book visits online?', 'Can I book care from my phone?'],
    answer: 'We do not have an app for booking care. To set up care or change a visit, call (417) 234-8494 and a care coordinator will help.',
    topics: ['app', 'booking app', 'book online', 'phone'] },

  { id: 'K121', key: 'choose_caregiver_cc',
    question: 'Can we choose our caregiver?',
    alt: ['Can my dad choose his caregiver?', 'Do we get the same caregiver?', 'How do you pick the caregiver?'],
    answer: 'Every client gets a personalized care plan, and our team works to match your loved one with the right caregiver for their needs. Tell us what matters to your family and we will take it into account. If you are on Medicaid and want to pick your own attendant, that is Consumer Directed Services through ' + CDS + '.',
    topics: ['choose', 'caregiver', 'match', 'same caregiver'] },

  { id: 'K122', key: 'transfer_agency',
    question: 'We are moving and already have home care, can you take over?',
    alt: ['He already has in home services and we just relocated', 'Can we switch to you from another agency?', 'Our previous company does not have a branch in our new location'],
    answer: `If the current care is paid by Medicaid, please reach ${CDS}, since Caring Companions does not take Medicaid. If you pay privately, or through VA or long-term care insurance, we can start with an in-home assessment. Call (417) 234-8494 and we will check that your new address is in our area.`,
    topics: ['transfer', 'switch', 'moved', 'another agency'] },

  { id: 'K123', key: 'outings',
    question: 'Can caregivers take my mom on outings?',
    alt: ['Can a caregiver get him out of the house?', 'Do you do activities or trips?', 'What is Good Days Out?'],
    answer: 'Yes. A visit can include an outing, like the library, lunch at a senior center, a garden walk or a local event. The caregiver drives, stays with them the whole time and brings them home. We call it Good Days Out.',
    topics: ['outings', 'activities', 'get out', 'senior center'] },

  { id: 'K124', key: 'family_academy',
    question: 'Do you have training for family caregivers?',
    alt: ['Is there a class for families?', 'What is the Family Care Academy?', 'Do you have a dementia course for families?'],
    answer: 'Yes. The Family Care Academy has the same training our caregivers get, rebuilt for families, with no sign-up. The Dementia Journey is a nine-module course for families, narrated by Samantha, and every module is open now. Hands-on care skills lessons are in production.',
    topics: ['family care academy', 'training', 'course', 'class', 'dementia journey'] },

  { id: 'K125', key: 'caregivers_employees',
    question: 'Are your caregivers employees?',
    alt: ['Are caregivers background checked?', 'Are your caregivers insured and bonded?', 'Are your caregivers contractors?'],
    // 2026-11-06 (her OK): the detail from mo-care.com/before-your-assessment.
    answer: 'Yes. Every caregiver is a Caring Companions employee, never a contractor, and we handle their payroll and taxes. Before they start, every caregiver has federal, state and county background checks, a driving record check and verification that they can work, and the checks are repeated over time. Caregivers are bonded and insured, including when they drive clients.',
    src: 'S8', on: '2026-11-06',
    topics: ['employees', 'insured', 'bonded', 'screened', 'background check'] },

  { id: 'K126', key: 'price_guarantee',
    question: 'Do you match lower prices?',
    alt: ['Can you beat another agency\'s rate?', 'Do you have a price guarantee?'],
    answer: 'Yes, our Best Price Guarantee. If another professional home care agency gives you a lower written rate for comparable care, we will beat it for your first six months. It is for new private-pay clients, and our standard rates apply after six months.',
    topics: ['price match', 'guarantee', 'cheaper', 'beat'] },

  { id: 'K127', key: 'about_company',
    question: 'How long have you been in business?',
    alt: ['Are you a franchise?', 'Who owns Caring Companions?', 'Tell me about your company'],
    answer: 'Caring Companions has been family owned in Springfield since 2017. We are locally owned, not a franchise, and when you call our office you reach people right here in southwest Missouri.',
    topics: ['company', 'since 2017', 'franchise', 'locally owned'] },

  { id: 'K128', key: 'personal_care',
    question: 'Do you help with bathing and personal care?',
    alt: ['What is personal care?', 'Can you help with showers and dressing?', 'Do you offer PCA services?'],
    answer: 'Yes. Personal Care is $32 an hour and includes everything in Wellness Care plus bathing and showering, dressing and grooming, toileting and incontinence care, help walking, safe transfers and help with eating.',
    topics: ['personal care', 'bathing', 'dressing', 'toileting', 'pca'] },

  { id: 'K129', key: 'wellness_care',
    question: 'Do you offer companion care and help around the house?',
    alt: ['What is Wellness Care?', 'Can someone help with meals and errands?', 'My mom is lonely, can someone visit?', 'Can you help with housekeeping?'],
    answer: 'Yes. Wellness Care is $30 an hour, for someone mostly independent who could use company and help around the house. It covers companionship, meal planning and cooking, light housekeeping and laundry, groceries, errands and rides, medication reminders, help with phones and video calls, and pets, plants and mail.',
    topics: ['wellness care', 'companionship', 'housekeeping', 'meals', 'errands', 'lonely'] },

  { id: 'K130', key: 'hospital_recovery',
    question: 'Can you help when someone comes home from the hospital?',
    alt: ['My dad is being discharged from rehab', 'Do you help after surgery?'],
    answer: 'Yes. The first days home from a hospital or rehab carry the highest risk of a fall, so many families start with Personal Care, $32 an hour, and taper as their loved one recovers. Some choose Overnight or 24-Hour Care for the first stretch. Call (417) 234-8494 and we will talk through what fits.',
    topics: ['hospital', 'rehab', 'discharge', 'surgery', 'coming home'] },

  { id: 'K131', key: 'cds_jobs',
    question: 'Can I get paid to care for my family member?',
    alt: ['How do I get paid to take care of my mom?', 'Can I be paid as my dad\'s caregiver through Medicaid?'],
    answer: `Through Missouri Consumer Directed Services, a family member other than a spouse can sometimes be paid as the attendant, when the person receiving care is eligible for Medicaid. That is handled by ${CDS}.`,
    topics: ['cds', 'paid', 'family', 'medicaid'] },

  // ── 2026-11-06 (her "start with 1", approved with her six changes): from mo-care.com/before-your-assessment and the
  // Client Care Agreement and Client Handbook (Rev. 10/2026). src S8. ──────────────────────────────────────────────
  { id: 'K132', key: 'start_timing', src: 'S9', on: '2026-11-06',
    // 2026-11-06 (her change): the assessment and care plan come first, and no start date is promised.
    question: 'How soon can care start?',
    alt: ['How quickly can you start?', 'Can care start right away?', 'How long until a caregiver can come?', 'We need help as soon as possible', 'Can you start this week?', 'How soon can care start after the assessment?'],
    answer: 'Before care begins, we complete a free in-home assessment and build a care plan, so your caregivers know your loved one\'s needs, routines, preferences and safety. How soon care starts after that depends on how quickly we can complete the assessment and find the right caregiver. Care can sometimes begin the same day or next day, but our office confirms the start once a caregiver is matched. We never want to rush the process at the expense of good care. You can book your free in-home assessment at mo-care.com/book or call (417) 234-8494.',
    topics: ['start', 'how soon', 'quickly', 'right away'] },

  { id: 'K133', key: 'caregiver_sick', src: 'S8', on: '2026-11-06',
    question: 'What happens if our caregiver is sick?',
    alt: ['What if the caregiver calls in sick?', 'What if our caregiver cannot make it?', 'Do you have backup caregivers?', 'What if the caregiver does not show up?'],
    answer: 'Your caregiver calls our office, and we let you know right away. The office works to find another caregiver to cover the visit, but a replacement cannot always be guaranteed. If you chose text updates, your family gets a text with the new caregiver\'s profile, so you are never surprised by who is at the door.',
    topics: ['sick', 'backup', 'replacement', 'call off'] },

  { id: 'K134', key: 'contract_deposit', src: 'S8', on: '2026-11-06',
    question: 'Is there a contract or a deposit?',
    alt: ['Do we have to sign a long-term contract?', 'Do you require a deposit?', 'Is there a commitment?', 'Are we locked in?'],
    answer: 'No deposit and no long-term contract. You are billed weekly, after the visits have happened, from your caregiver\'s actual clock-in and clock-out times. Your rate is written in your Client Care Agreement, and we give at least 4 weeks\' written notice before any rate change.',
    topics: ['contract', 'deposit', 'commitment'] },

  { id: 'K135', key: 'cancel_visit', src: 'S8', on: '2026-11-06',
    question: 'What if we need to cancel a visit?',
    alt: ['Is there a cancellation fee?', 'Can we cancel a visit?', 'What is your cancellation policy for a visit?', 'Can we skip a visit?'],
    answer: 'There is no fee to cancel a visit with at least 24 hours\' notice. With less than 24 hours\' notice, the visit is billed at 2 hours, because your caregiver counted on that time for their pay. Please call the office at (417) 234-8494 to cancel a visit.',
    topics: ['cancel', 'cancellation', 'visit'] },

  { id: 'K136', key: 'end_services', src: 'S8', on: '2026-11-06',
    question: 'How do we stop care?',
    alt: ['Can we stop care any time?', 'How much notice do you need to end care?', 'What if we no longer need care?', 'How do we discontinue care?'],
    answer: 'You can end services at any time. If you know about a change ahead of time, the agreement asks for two weeks\' notice so we can plan for your caregivers, and we understand that many times there is no notice at all. Just call the office at (417) 234-8494.',
    topics: ['end services', 'stop care', 'discontinue', 'notice'] },

  { id: 'K137', key: 'billing', src: 'S8', on: '2026-11-06',
    question: 'How does billing work?',
    alt: ['How often are we billed?', 'When do we get an invoice?', 'Can we pay by credit card?', 'Do you have autopay?'],
    answer: 'You get one invoice each week, Monday through Sunday, by email, showing every visit from your caregiver\'s clock-in and clock-out times. Autopay then pays it from the card or bank account you keep on file. Credit cards have a 3% processing fee. Debit cards and bank (ACH) payments have no fee.',
    topics: ['billing', 'invoice', 'autopay', 'credit card'] },

  { id: 'K138', key: 'holidays', src: 'S8', on: '2026-11-06',
    question: 'Do you provide care on holidays?',
    alt: ['Do caregivers work on Christmas?', 'Do you charge more on holidays?', 'Is there holiday pay?', 'What about overtime?'],
    answer: 'Yes. Care on New Year\'s Day, Easter Sunday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving and Christmas Day is billed at time and a half. If you ask a caregiver to work more than 40 hours in a week, the extra hours are also billed at time and a half.',
    topics: ['holiday', 'holidays', 'time and a half', 'overtime'] },

  { id: 'K139', key: 'rides_appointments', src: 'S8', on: '2026-11-06',
    question: 'Can a caregiver drive Mom to appointments?',
    alt: ['Do you provide transportation to the doctor?', 'Can a caregiver take my dad to dialysis?', 'Do caregivers drive clients?', 'Is there a mileage charge?'],
    answer: 'Yes, in your car or theirs. In your car there is no mileage charge, but your auto insurance must be current. In the caregiver\'s car, mileage is billed at $0.69 a mile. Caregivers are bonded and insured, including when they drive clients.',
    topics: ['appointments', 'doctor', 'drive', 'mileage', 'transportation'] },

  { id: 'K140', key: 'medications', src: 'S8', on: '2026-11-06',
    question: 'Can caregivers give medications?',
    alt: ['Can a caregiver give Mom her pills?', 'Can caregivers fill a pill organizer?', 'Can a caregiver check blood sugar?', 'Do you help with medicine?'],
    answer: 'Caregivers can remind about medicines, read the label, and hand over or open the container. They cannot give or set out any medicine, fill a pill organizer, apply creams or drops, or check blood sugar. A family member or another responsible person can fill the pill organizer, and our office can help find a solution for anything beyond that.',
    topics: ['medication', 'medicine', 'pills', 'pill organizer'] },

  { id: 'K141', key: 'cannot_do', src: 'S8', on: '2026-11-06',
    question: 'What can\'t caregivers do?',
    alt: ['What are caregivers not allowed to do?', 'Can a caregiver climb a ladder?', 'Can caregivers do yard work?', 'Can caregivers move furniture?'],
    answer: 'Our care is non-medical, so caregivers cannot give medicines, change dressings or do nursing procedures. For everyone\'s safety, they also cannot do unsafe lifting, move heavy furniture, climb ladders or stools, or do outdoor maintenance. Everything they do follows your care plan.',
    topics: ['not allowed', 'limits', 'ladder', 'furniture', 'yard work'] },

  { id: 'K142', key: 'couples', src: 'S8', on: '2026-11-06',
    question: 'Can you care for a couple?',
    alt: ['Both of my parents need care', 'Can one caregiver help my mom and dad?', 'How much for two people?'],
    answer: 'Yes. Shared household help for a couple is billed at the standard hourly rate. If both people need personal care, dementia care or hands-on supervision, care is billed at 1.5 times the hourly rate.',
    topics: ['couple', 'both', 'two people'] },

  { id: 'K143', key: 'know_who_coming', src: 'S8', on: '2026-11-06',
    question: 'Will we know who is coming?',
    alt: ['Can we meet the caregiver first?', 'Will we see a photo of the caregiver?', 'Who will be coming to our home?'],
    answer: 'Always. Before the first visit, we send your caregiver\'s profile with a friendly photo, so you know who is coming. If your caregiver ever changes, the family members you choose get a text with the new caregiver\'s profile.',
    topics: ['who is coming', 'photo', 'profile', 'meet'] },

  { id: 'K144', key: 'not_good_fit', src: 'S8', on: '2026-11-06',
    question: 'What if our caregiver is not a good fit?',
    alt: ['What if we do not like the caregiver?', 'Can we change caregivers?', 'Mom does not get along with her caregiver', 'Can we ask for a different caregiver?'],
    answer: 'Tell us. We call a few days after the first visit to see how it is going, and you can call us any time before then. Most things can be worked out with a quick change to the care plan. If it still is not right, we will do our best to send a different caregiver.',
    topics: ['good fit', 'different caregiver', 'change caregiver'] },

  { id: 'K145', key: 'visit_updates', src: 'S8', on: '2026-11-06',
    question: 'How will we know how the visits are going?',
    alt: ['Will we get updates?', 'Can we see the caregiver notes?', 'How do you keep the family informed?', 'Do caregivers write notes?'],
    answer: 'Caregivers write a note after every visit. Our office reviews caregiver notes and follows up when something needs attention. If a caregiver has not clocked in a few minutes after a visit should start, our office is alerted right away. The family members you choose can see the care calendar, visit notes and invoices in AxisCare.',
    topics: ['updates', 'notes', 'informed', 'axiscare'] },

  { id: 'K146', key: 'tips_gifts', src: 'S8', on: '2026-11-06',
    question: 'Can we tip our caregiver or give a gift?',
    alt: ['Can I give the caregiver a gift?', 'Is tipping allowed?', 'Can we give our caregiver a present?'],
    answer: 'No gifts or tips, please. Caregivers are not allowed to accept them. A thank-you card, or a call to the office to say thank you, means the world.',
    topics: ['tip', 'tips', 'gift', 'gifts'] },

  { id: 'K147', key: 'hire_privately', src: 'S8', on: '2026-11-06',
    question: 'Can we hire our caregiver privately?',
    alt: ['Can we pay the caregiver directly?', 'Can our caregiver work for us on the side?', 'Can we hire her for a few extra hours ourselves?'],
    answer: 'Every caregiver is a Caring Companions employee, so caregivers cannot be hired privately, even for a few extra hours. This is covered in your Client Care Agreement. If you need more hours, call the office at (417) 234-8494 and we will set them up.',
    topics: ['hire privately', 'pay directly', 'on the side'] },

  { id: 'K148', key: 'hospital_pause', src: 'S8', on: '2026-11-10',
    question: 'What if Mom goes into the hospital?',
    alt: ['Dad was admitted to the hospital, what about his visits?', 'Can we pause care?', 'Can we put visits on hold?'],
    // 2026-11-10 (her "Yes, change it"): no promise of hospital sitting until the facility policy is confirmed.
    answer: 'Please call the office as soon as you can. We\'ll pause visits while your loved one is in the hospital. Whether a caregiver can sit with them there depends on the hospital\'s rules, so we\'ll talk it through with you. Before care at home starts again, we\'ll check the care plan with you, because needs often change after a hospital stay.',
    topics: ['pause', 'on hold', 'admitted', 'hospital'] },

  { id: 'K149', key: 'read_agreement', src: 'S8', on: '2026-11-06',
    question: 'Can we read your agreement before we decide?',
    alt: ['Can I see a copy of the client agreement?', 'Do you have a client handbook?', 'Can we read your policies?'],
    answer: 'Yes. Our Client Handbook and a sample Client Care Agreement are on mo-care.com/before-your-assessment. They are the same documents our clients get, and we go through your agreement with you in person.',
    topics: ['agreement', 'handbook', 'policies', 'documents'] },

  { id: 'K150', key: 'concerns', src: 'S8', on: '2026-11-06',
    question: 'How do I raise a concern or complaint?',
    alt: ['I have a complaint', 'Who do I talk to about a problem with our care?', 'Can I speak to a manager?', 'I am not happy with our care'],
    answer: 'Call the office any time at (417) 234-8494, or write to us. Every concern goes to the agency administrator. We look into it right away, tell you what we found, and your care continues as normal while we work it out. Still not right? Call Samantha directly. For abuse, neglect or exploitation, you can also call the Missouri hotline at 1-800-392-0210.',
    topics: ['complaint', 'concern', 'problem', 'manager'] },

  { id: 'K151', key: 'pets', src: 'S8', on: '2026-11-06',
    question: 'Is it okay if we have pets?',
    alt: ['We have a dog, is that okay?', 'Do caregivers mind cats?', 'Can caregivers help with our pets?'],
    answer: 'Yes. Help with pets is even part of Wellness Care. We ask that any pet that could be aggressive is secured before your caregiver arrives.',
    topics: ['pets', 'dog', 'cat', 'animals'] },

  { id: 'K152', key: 'smoking', src: 'S8', on: '2026-11-06',
    question: 'Can someone smoke in the home during visits?',
    alt: ['My dad smokes, is that a problem?', 'Do caregivers smoke?', 'Is smoking allowed?'],
    answer: 'We ask for a smoke-free space while your caregiver is there. Caregivers cannot be in the home during active smoking.',
    topics: ['smoking', 'smoke', 'cigarettes'] },
  // ── 2026-11-06 (later, her wording, approved): same-day or next-day care, hospice, weekends. src S9. ─────────────────
  { id: 'K153', key: 'start_today', src: 'S9', on: '2026-11-06',
    question: 'Can care start today or tomorrow?',
    alt: ['We need someone today', 'Can a caregiver come tomorrow?', 'Do you take same-day requests?', 'Can you send someone tonight?', 'We need help urgently today'],
    answer: 'Sometimes! We understand that families may need help quickly, and we will do our best to accommodate urgent requests. Before care begins, we do need to complete a free in-home assessment. This lets us understand your loved one\'s needs, routines, preferences and safety, so we can create a personalized care plan for the caregivers we send. Care can sometimes begin the same day or next day, depending on how quickly we can complete the assessment and find the right caregiver. We never want to rush the process at the expense of good care. Call us at (417) 234-8494, and we will talk through what you need and how soon we may be able to get started.',
    topics: ['today', 'tomorrow', 'same day', 'next day', 'urgent'] },

  { id: 'K154', key: 'hospice', src: 'S9', on: '2026-11-06',
    question: 'Can you help someone receiving hospice care?',
    alt: ['Do you work with hospice?', 'My mom is on hospice, can you help?', 'Do you provide end of life care?', 'Can a caregiver stay with dad while he is on hospice?'],
    answer: 'Yes! Caring Companions can work alongside your loved one\'s hospice team to provide additional non-medical care and support. Our caregivers can help with personal care, bathing, dressing, repositioning within their training and safety limits, companionship and everyday household tasks. We can also provide support during the day or overnight for families who need more help. The hospice team continues to provide medical care, while our caregivers focus on comfort, personal care and helping your loved one stay supported. We coordinate with the family and the hospice team so everyone understands the care plan and their responsibilities.',
    topics: ['hospice', 'end of life', 'comfort care'] },

  { id: 'K155', key: 'weekends', src: 'S9', on: '2026-11-06',
    question: 'Do you provide care on weekends?',
    alt: ['Can a caregiver come on Saturday?', 'Do you work Sundays?', 'Are you open 7 days a week?', 'We need weekend help'],
    answer: 'Yes! Caring Companions provides care seven days a week, including weekends and holidays. Whether your family needs a few hours of help, regular weekend visits or overnight care, we can talk through your schedule and check caregiver availability. Certain holidays are billed at a higher hourly rate, and we will explain any charges before care begins.',
    topics: ['weekends', 'saturday', 'sunday', 'seven days'] },

  { id: 'K156', key: 'facility_care', src: 'S9', on: '2026-11-10',
    question: 'Can you provide care in assisted living, nursing homes or hospitals?',
    alt: ['Can a caregiver sit with my mom in the hospital?', 'Do you go to assisted living?', 'Can you help my dad in his nursing home?', 'Can a caregiver help with showers in a nursing home?', 'My mom lives in senior living, can you still help?'],
    answer: 'We provide care at home. If your loved one lives in assisted living or a nursing home, or is in the hospital, please call us at (417) 234-8494. What\'s possible depends on the facility\'s rules, and we\'ll talk it through with you.',
    topics: ['assisted living', 'nursing home', 'hospital', 'facility'] },
]

// Nothing is held. K156 (care in facilities) was held until 2026-11-06, when Samantha confirmed: "we provide care wherever
// home is - could be sitting with someone in a hospital, providing care, shower, et in a nursing home".
// 2026-11-10 (her "yes"): K156 now promises nothing about facilities until she answers the facility questions
// (permission, insurance, tasks per setting). Setting-by-setting wording is drafted in the SEO phase 2 review.
export const HELD = []

// N002 was a stale $14 rate. CDS attendants are paid $15 to $16 an hour (her correction 2026-10-27).
export const N002 = {
  answer: `CDS attendants are paid $15 to $16 an hour. CDS is handled by ${CDS}.`,
}
