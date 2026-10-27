// Cara's family-facing answers, 2026-10-27.
// Every answer is taken from mo-care.com as published on 2026-10-27, plus
// Samantha's standing rules (Medicaid goes to Caring Companions Consumer
// Directed Services; never say AI; no em dashes; app visits never promised).
// Load with: node supabase/knowledge/build-sql.mjs > the migration.

const CDS = 'our sister company, Caring Companions Consumer Directed Services, at (417) 218-2888 or caringcds.com'

export const SOURCE = { id: 'S7', name: 'mo-care.com published pages (2026-10-27)' }

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
    answer: 'Scheduled care has a minimum of 4 hours per visit and 8 hours per week. Our Booking App is coming soon for clients. It will let you request Wellness Care visits from 2 hours with no weekly minimum. App visits depend on which caregivers are available, so a request is sent, not guaranteed.',
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
    answer: 'We ask for at least one year of paid caregiving experience. Work at home, in a nursing home, assisted living or a hospital counts, and so does being paid to care for a family member. Wellness Care roles need no license. Advanced Care roles are for licensed CNAs. You must be 18 or older and able to work in the United States. For anything else, apply at mo-care.com/apply and we will talk it through.',
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
    alt: ['How does the Booking App work?', 'Can I book visits online?', 'Can I book care from my phone?'],
    answer: 'Our Booking App is coming soon for clients. After an in-home assessment and care plan, it lets you request Wellness Care visits, $30 an hour, any day from 7am to 6pm, for 2 hours or more, with no weekly minimum. The app has no charge any month you have a visit, and months without a visit are $15. Visits depend on which caregivers are available, so a request is sent, not guaranteed.',
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
    answer: 'Yes. Our caregivers are screened, insured and bonded employees of Caring Companions, never contractors.',
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
]

// N002 was a stale $14 rate. CDS attendants are paid $15 to $16 an hour (her correction 2026-10-27).
export const N002 = {
  answer: `CDS attendants are paid $15 to $16 an hour. CDS is handled by ${CDS}.`,
}
