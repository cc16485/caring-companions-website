# Content for the 8 "home care for X" Family Guides (rewritten 11-11 from the guides plan).
# Each guide keeps its old address. tools/build-care-guides.py writes these into guides/<slug>.html.
# House rules: no em dashes, no promises on start dates or staffing, never "Reviewed by"
# (her rule 11-11: written by us), caregivers never check blood sugar, give insulin, handle oxygen,
# give medicine, change dressings, do nursing tasks, or lift someone after a fall.

SRC = {
    'cdc-low': ('CDC: Low blood sugar (hypoglycemia)', 'https://www.cdc.gov/diabetes/about/low-blood-sugar-hypoglycemia.html'),
    'mlp-low': ('MedlinePlus: Low blood sugar, self-care', 'https://medlineplus.gov/ency/patientinstructions/000085.htm'),
    'cdc-stroke': ('CDC: Signs and symptoms of stroke', 'https://www.cdc.gov/stroke/signs-symptoms/index.html'),
    'nhlbi-copd-sym': ('NHLBI: COPD symptoms', 'https://www.nhlbi.nih.gov/health/copd/symptoms'),
    'nhlbi-copd-live': ('NHLBI: Living with COPD', 'https://www.nhlbi.nih.gov/health/copd/living-with'),
    'nhlbi-hf': ('NHLBI: Living with heart failure', 'https://www.nhlbi.nih.gov/health/heart-failure/living-with'),
    'uf-hf': ('UF Health: Heart failure, fluids and diuretics', 'https://ufhealth.org/care-sheets/heart-failure-fluids-and-diuretics'),
    'mc-hospice': ('Medicare.gov: Hospice care', 'https://www.medicare.gov/coverage/hospice-care'),
    'cms-hospice': ('CMS Medicare Benefit Policy Manual, Chapter 9: Hospice (section 40.2.1)', 'https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c09.pdf'),
    'steadi': ('CDC: STEADI, older adult fall prevention', 'https://www.cdc.gov/steadi/'),
}

GUIDES = [
# ---------------------------------------------------------------- COPD
{
 'slug': 'managing-copd-at-home', 'cat': 'Chronic Conditions',
 'title': 'Home Care for Someone with COPD',
 'desc': 'What daily help looks like for someone with COPD at home, what our caregivers do and don\u2019t do, and the signs that mean call the doctor or call 911.',
 'card': 'What a week of help looks like, what our caregivers do and don\u2019t do, and when to call.',
 'inside': ['A sample week of help', 'What we do, and what we don\u2019t', 'When to call the doctor or 911'],
 'intro': [
  'If your mom or dad has COPD, you have probably watched simple things get harder. A shower leaves them winded. The walk to the mailbox needs a rest halfway. They start skipping things they love because they are tired before they begin.',
  'The goal at home is to save their breath for the parts of the day that matter to them. This guide covers what helps, what a week of help from us can look like, and the signs that mean it is time to call.',
 ],
 'sections': [
  ('what-helps', 'What makes the day easier', [
   'p:Most of the work of COPD is pacing. A few changes make a real difference:',
   'li:Sit down for anything that can be done sitting: dressing, grooming, folding laundry, even part of cooking.',
   'li:A shower chair and a handheld shower head turn the hardest task of the day into a manageable one.',
   'li:Rest before they get worn out, not after. Plan the busy part of the day for when they feel best, often late morning.',
   'li:Keep the air clean. Smoke, strong scents and dust can all set off coughing.',
   'li:Use inhalers and oxygen the way the doctor prescribed, every day, not only on bad days.',
   'li:Ask the doctor for a written COPD action plan. It spells out what to do when breathing gets worse, so nobody has to guess.',
   'p:If they use oxygen, the oxygen company will go over safety at home. Keep their number on the fridge.',
  ]),
 ],
 'week': {
  'when': 'Tuesday and Friday, 9 a.m. to 1 p.m.',
  'items': ['A shower with a shower chair, taken slowly with rest breaks', 'Help getting dressed sitting down', 'Breakfast, and a few easy meals made for the days in between', 'Dusting, vacuuming, laundry and changing the bed', 'A ride to a doctor visit or pulmonary rehab, or picking up groceries and prescriptions', 'Reminders to use inhalers at the times the doctor set', 'A note after the visit, so our office knows how the day went'],
 },
 'do': ['Help with bathing and dressing at a slower pace, with breaks', 'Cook, clean, do laundry and keep the house dust-free', 'Remind them when it is time for inhalers or other medicine', 'Drive them to appointments, pulmonary rehab and errands', 'Keep walkways clear, including around oxygen tubing', 'Notice when they seem more short of breath or are coughing more, and tell us'],
 'dont': ['Set up, adjust or change oxygen, or swap tanks', 'Give medicine or breathing treatments', 'Check oxygen levels or other vital signs', 'Do any nursing task'],
 'dont_note': 'Your oxygen company, the doctor and, if ordered, a home health nurse handle those. We work around them.',
 'doctor': ['More short of breath than usual, or getting winded doing less', 'Coughing more, or mucus that changes color or gets thicker', 'A fever or other signs of an infection', 'Their usual treatment does not seem to be helping as much'],
 'nine11': ['Struggling to catch their breath or to talk', 'Lips or fingernails turning blue or gray', 'Not mentally alert, very confused or hard to wake', 'A very fast heartbeat', 'The treatment in their action plan is not working'],
 'srcs': ['nhlbi-copd-sym', 'nhlbi-copd-live'],
 'tell': ['Their lung doctor and any recent hospital or ER visits', 'Oxygen: how much, when, and the oxygen company\u2019s name and number', 'Their inhaler and medicine schedule, in writing if you have it', 'Which tasks tire them out most: the shower, stairs, cooking', 'Things that set off their breathing: smoke, perfume, cold air', 'What they still love to do, so we can save their energy for it'],
 'local': 'meals',
},
# ---------------------------------------------------------------- Diabetes
{
 'slug': 'diabetes-care-for-seniors', 'cat': 'Chronic Conditions',
 'title': 'Home Care for Someone with Diabetes',
 'desc': 'Daily help at home for an older adult with diabetes: steady meals, medicine reminders, what our caregivers do and don\u2019t do, and the signs of low blood sugar.',
 'card': 'Steady meals, medicine reminders, what our caregivers do and don\u2019t do, and the signs of low blood sugar.',
 'inside': ['A sample week of help', 'What we do, and what we don\u2019t', 'Low blood sugar: when to call 911'],
 'intro': [
  'Diabetes at home is mostly routine: meals at steady times, medicine on time, feet looked after, and someone noticing when something is off. That routine is the first thing to slip when a parent lives alone or starts to forget.',
  'In older adults, low blood sugar can look like confusion, shakiness or a bad mood, and it is easy to brush off as \u201cjust a bad day.\u201d This guide covers what helps day to day, where our caregivers fit in, and the signs that need a call.',
 ],
 'sections': [
  ('what-helps', 'What helps day to day', [
   'li:Meals and snacks at about the same times every day. Skipped meals are a common cause of low blood sugar, especially with some diabetes medicines.',
   'li:Food that follows the plan their doctor or dietitian gave, not a strict diet nobody can stick to.',
   'li:A written schedule for every diabetes medicine, and one person in charge of blood sugar checks and insulin. That can be your parent, you, or a home health nurse.',
   'li:A look at their feet every day, especially if they don\u2019t feel them well. Small sores can turn serious.',
   'li:Fast sugar kept handy (juice, glucose tablets), with a plan from the doctor for when to use it.',
  ]),
 ],
 'week': {
  'when': 'Monday and Thursday, 8 a.m. to 12 p.m.',
  'items': ['Breakfast at their usual time', 'Meals and snacks made ahead for the days in between, following their meal plan', 'Reminders for pills at the times the doctor set', 'A trip to the grocery store or pharmacy', 'Help with a shower. If our caregiver sees a sore, blister or color change on their feet, they write it down and we let you know', 'Light housekeeping and laundry', 'A note after the visit for our office'],
 },
 'do': ['Make meals and snacks on schedule, following their meal plan', 'Grocery shop with the plan in mind', 'Remind them when it is time for their pills', 'Help with bathing and dressing, and notice changes to their feet or skin', 'Watch for signs of low or high blood sugar and tell you and our office right away', 'Call 911 in an emergency'],
 'dont': ['Check blood sugar', 'Give insulin or any other shot', 'Give medicine or change doses', 'Do wound care or any nursing task'],
 'dont_note': 'Before care starts, we will ask who handles blood sugar checks and insulin, so nothing falls through the cracks.',
 'doctor': ['Low blood sugar happening more often', 'Blood sugar readings outside the range their doctor gave', 'Not eating, or skipping meals often', 'A sore, blister or color change on the feet that is not healing', 'Very thirsty, tired and going to the bathroom a lot (signs of high blood sugar)'],
 'nine11': ['Not alert, or can\u2019t be woken up', 'A seizure', 'Symptoms of low blood sugar that don\u2019t get better after fast sugar', 'Too confused or drowsy to eat or drink safely'],
 'pre911': 'Signs of low blood sugar include shaking, sweating, a fast heartbeat, dizziness, hunger, irritability or confusion.',
 'srcs': ['cdc-low', 'mlp-low'],
 'tell': ['Every diabetes medicine and when it is taken', 'Who checks blood sugar and gives insulin', 'Their meal plan, or what the doctor said about food', 'Any recent low blood sugar, falls or hospital visits', 'Problems with their feet or eyesight', 'Foods they love, so meals actually get eaten'],
 'local': 'meals',
},
# ---------------------------------------------------------------- Heart failure
{
 'slug': 'living-well-with-heart-failure', 'cat': 'Chronic Conditions',
 'title': 'Home Care After a Heart Failure Diagnosis',
 'desc': 'Daily help at home for someone with heart failure: low-salt meals, the daily weight check, what our caregivers do and don\u2019t do, and when to call.',
 'card': 'Low-salt meals, the daily weight check, what our caregivers do and don\u2019t do, and when to call.',
 'inside': ['A sample week of help', 'What we do, and what we don\u2019t', 'Weight gain and other signs to call'],
 'intro': [
  'Heart failure does not mean the heart has stopped. It means the heart is not pumping as well as it should, so fluid can build up in the body. With good daily habits, many people live at home with it for years.',
  'Those habits are small but they have to happen every day: a weight check in the morning, meals low in salt, medicine on time, and someone noticing swelling or new shortness of breath early. Here is how that looks at home, and where we help.',
 ],
 'sections': [
  ('what-helps', 'The daily habits that matter most', [
   'li:Weigh every morning, after the bathroom and before breakfast, on the same scale. Write it down. A quick gain is often the first sign of fluid building up.',
   'li:Follow the salt and fluid limits their doctor set. Most salt comes from packaged and restaurant food, not the salt shaker.',
   'li:Take medicine on time. Water pills work better when the day is planned around them, including outings and bathroom trips.',
   'li:Stay active the way the doctor recommends, with rest when they need it.',
   'li:Ask the doctor which weight change to report and when to go to the ER, and keep it on the fridge.',
  ]),
 ],
 'week': {
  'when': 'Monday, Wednesday and Friday, 8 a.m. to 12 p.m.',
  'items': ['A reminder to step on the scale and write the number on their log', 'A low-salt breakfast, and meals made ahead for later in the week', 'Reminders for medicine at the times the doctor set', 'A short walk if the doctor says it is okay', 'Help with a shower and getting dressed', 'Rides to cardiology visits, errands and groceries', 'A note after the visit, including anything that seemed different'],
 },
 'do': ['Cook low-salt meals and read labels at the store', 'Remind them to weigh in and write it down, and to take their medicine', 'Help with bathing, dressing and getting around safely', 'Drive them to appointments and errands', 'Notice swelling, more shortness of breath or new tiredness, and tell you and our office'],
 'dont': ['Give medicine or decide on doses', 'Check blood pressure or other vital signs', 'Do any nursing task'],
 'dont_note': 'If the doctor orders a home health nurse, we work alongside them.',
 'doctor': ['Weight up more than 2 to 3 pounds in a day, or about 5 pounds in a week (or whatever number their doctor gave)', 'More swelling in the feet, ankles or legs', 'More short of breath, or short of breath lying down or at night', 'A cough that won\u2019t go away', 'New tiredness or weakness', 'Symptoms they think may be from a medicine'],
 'nine11': ['Severe trouble breathing', 'Chest pain or pressure', 'Fainting', 'Signs of a stroke: face drooping, arm weakness, trouble speaking'],
 'srcs': ['uf-hf', 'nhlbi-hf', 'cdc-stroke'],
 'tell': ['Their heart doctor and any recent hospital stays', 'Their target weight and which weight change to report', 'Salt and fluid limits', 'Every medicine and when it is taken, especially water pills', 'How far they can walk and what wears them out', 'What they like to eat, so low-salt meals still taste like home'],
 'local': 'meals',
},
# ---------------------------------------------------------------- Parkinson's
{
 'slug': 'parkinsons-disease-at-home', 'cat': 'Chronic Conditions',
 'title': 'Home Care for Someone with Parkinson\u2019s',
 'desc': 'Daily help at home for someone with Parkinson\u2019s: medicine on time, safer moving around, what our caregivers do and don\u2019t do, and when to call.',
 'card': 'Medicine on time, safer moving around, what our caregivers do and don\u2019t do, and when to call.',
 'inside': ['A sample week of help', 'What we do, and what we don\u2019t', 'Falls and other signs to call'],
 'intro': [
  'Parkinson\u2019s changes slowly, and not in a straight line. Many families notice good hours and hard hours, often tied to when medicine was taken. Buttons get harder, steps get shorter, and sometimes feet seem to stick to the floor.',
  'Falls are usually the biggest worry early on. Later, dressing, bathing and eating can take longer and need more help. Here is what helps, and what a week of help from us can look like.',
 ],
 'sections': [
  ('what-helps', 'What helps day to day', [
   'li:Medicine on time, every time. With Parkinson\u2019s, a late dose can mean a hard few hours.',
   'li:Plan showers, outings and appointments for the times of day they move best.',
   'li:Slow down. Rushing, turning quickly and carrying things while walking all raise the chance of a fall.',
   'li:Clear walkways, grab bars and good lighting. Our Fall Prevention guide has a room-by-room check.',
   'li:Clothes that are easy to get on: elastic waists, pull-over tops, slip-on shoes with good grip.',
   'li:Keep up with the exercises their physical therapist gave them. Movement helps.',
   'li:If they cough or choke when eating or drinking, tell the doctor. A speech therapist can check swallowing.',
  ]),
 ],
 'week': {
  'when': 'Tuesday and Thursday, 9 a.m. to 1 p.m., planned around their best hours',
  'items': ['Medicine reminders right on time', 'A shower with a shower chair and grab bars, and help getting dressed', 'A walk or the exercises their therapist gave, with someone beside them', 'Lunch, with food cut small if chewing is hard', 'Laundry, light housekeeping and clearing walkways', 'Rides to the neurologist, therapy or errands', 'A note after the visit, including any near-falls'],
 },
 'do': ['Remind them to take medicine at exactly the right time', 'Help with walking and safe transfers, using their walker or other equipment', 'Help with bathing, dressing and eating', 'Encourage the exercises their therapist gave', 'Keep the house clear of things to trip on', 'Notice changes in how they move, eat or talk, and tell you and our office'],
 'dont': ['Give medicine or change the timing', 'Lift someone up off the floor after a fall', 'Do therapy or nursing tasks'],
 'dont_note': 'If they fall, our caregiver stays with them, checks for injury and keeps them comfortable, calls 911 if they are hurt or it is unclear, and calls our office every time.',
 'doctor': ['More falls or near-falls', 'Coughing or choking when eating or drinking', 'Harder hours that last longer, or medicine that seems to wear off sooner', 'New confusion, or seeing things that aren\u2019t there', 'Trouble with constipation, sleep or mood'],
 'nine11': ['A fall with an injury, or hitting their head', 'Choking that doesn\u2019t clear', 'Signs of a stroke: face drooping, arm weakness, trouble speaking', 'Any sudden, big change you can\u2019t explain'],
 'srcs': ['steadi', 'cdc-stroke'],
 'tell': ['Their medicine schedule, down to the minute', 'Their best and hardest times of day', 'Falls or near-falls in the last few months', 'Equipment they use: walker, cane, shower chair, lift chair', 'Any trouble swallowing or speaking', 'What they enjoy and still want to do'],
 'local': 'general',
},
# ---------------------------------------------------------------- Stroke
{
 'slug': 'stroke-recovery-at-home', 'cat': 'Chronic Conditions',
 'title': 'The First Months Home After a Stroke',
 'desc': 'What the first months home after a stroke look like, how home care fits around therapy, what our caregivers do and don\u2019t do, and the signs that mean call 911.',
 'card': 'How home care fits around therapy, what our caregivers do and don\u2019t do, and the signs that mean call 911.',
 'inside': ['How help changes as recovery goes', 'What we do, and what we don\u2019t', 'Stroke signs: call 911'],
 'intro': [
  'Coming home after a stroke is a relief and a shock at the same time. Therapy visits fill the calendar, simple things like buttoning a shirt take real effort, and everyone is a little afraid it could happen again.',
  'Recovery can keep going for months, and the help someone needs usually changes along the way. Most families need the most help in the first weeks, then less as therapy works. Here is how that tends to go, and where we fit in.',
 ],
 'sections': [
  ('how-it-goes', 'How help usually changes', [
   'p:<b>The first weeks home.</b> This is usually when the most help is needed: getting in and out of bed and the shower, dressing with one weaker side, meals, and getting to therapy. Many families start with more hours here.',
   'p:<b>As therapy works.</b> Physical, occupational and speech therapy each work on something different: moving, everyday tasks, and talking or swallowing. As they get stronger, help usually shifts from doing for them to standing by while they do it themselves.',
   'p:<b>The emotional side.</b> Sadness, frustration and short tempers are common after a stroke, for the person and the family. If low mood lasts for weeks, tell the doctor. It is treatable.',
  ]),
 ],
 'week': {
  'when': 'First month: Monday to Friday, 8 a.m. to 12 p.m. Later: two or three mornings a week',
  'items': ['Help getting up, showering and dressing, letting them do as much as they safely can', 'Breakfast and lunch, with help eating if one hand is weak', 'Rides to therapy, and encouraging the exercises the therapist assigned', 'Medicine reminders at the times the doctor set', 'Patience and conversation, even when words are hard to find', 'Light housekeeping and laundry', 'A note after each visit, so you know how they are doing'],
 },
 'do': ['Help with getting up, bathing, dressing and toileting', 'Help with walking and safe transfers, using their equipment', 'Make meals and help with eating', 'Drive them to therapy and appointments', 'Encourage the exercises their therapists gave', 'Notice changes and tell you and our office right away'],
 'dont': ['Give medicine', 'Do physical, occupational or speech therapy', 'Lift someone up off the floor after a fall', 'Do any nursing task'],
 'dont_note': 'If they fall, our caregiver stays with them, checks for injury, calls 911 if they are hurt or it is unclear, and calls our office every time.',
 'doctor': ['Low mood, crying or loss of interest that lasts for weeks', 'Coughing or choking when eating or drinking', 'Falls or near-falls', 'Problems with medicine, or new side effects'],
 'nine11': ['Face drooping on one side when they smile', 'One arm drifting down when they raise both', 'Slurred or strange speech', 'Sudden trouble with balance, dizziness or vision', 'A sudden, severe headache with no known cause'],
 'post911': 'Note the time the signs started. Call 911 even if the signs go away after a few minutes, and don\u2019t drive them yourself.',
 'srcs': ['cdc-stroke', 'steadi'],
 'tell': ['Which side is weaker, and what they can do on their own', 'Their therapy schedule and therapists\u2019 names', 'Equipment from the hospital or therapist', 'Trouble with speech, swallowing or memory', 'Their medicine schedule', 'How the family is holding up, and which hours are hardest to cover'],
 'local': 'general',
},
# ---------------------------------------------------------------- Medication reminders
{
 'slug': 'medication-management', 'cat': 'Medication',
 'title': 'Medication Reminders at Home: How We Help',
 'desc': 'How to keep a parent\u2019s medicines straight at home, what our caregivers do and don\u2019t do with medication, and the signs that a medicine needs a call to the doctor.',
 'card': 'Keeping medicines straight at home, what our caregivers do and don\u2019t do, and when to call.',
 'inside': ['Keeping medicines straight', 'What a reminder from us means', 'Signs a medicine needs a call'],
 'intro': [
  'Many older adults take several medicines a day, and the pills are not the hard part. The hard part is the timing, the refills, the changes after every doctor visit, and the doses that get taken twice or not at all.',
  'Here is how families keep it straight, what a medication reminder from our caregivers means, and the signs that a medicine needs a call to the doctor.',
 ],
 'sections': [
  ('keep-it-straight', 'Keeping medicines straight', [
   'li:Keep one master list: every medicine, the dose, the time, and who prescribed it. Include vitamins and anything bought over the counter.',
   'li:Bring the list to every appointment, and update it after every hospital stay. Medicines often change at discharge.',
   'li:Use one pharmacy, so the pharmacist can catch medicines that don\u2019t mix.',
   'li:Use a weekly pill organizer, filled at the same time each week. Ask the pharmacy whether they can package pills by day and time.',
   'li:Once a year, ask the doctor: \u201cCan any of these be simplified or stopped?\u201d',
  ]),
  ('our-reminders', 'What a medication reminder from us means', [
   'p:At the times on their schedule, our caregiver lets them know it is time, brings their pill organizer and a glass of water, and notes in the visit record whether they took it or said no. If something seems off, like a missed day in the organizer or a dose that looks wrong, we tell you.',
   'p:Who fills the pill organizer is decided before care starts: you, another family member, the pharmacy, or a home health nurse.',
  ]),
 ],
 'week': None,
 'do': ['Remind them when it is time to take their medicine', 'Bring their pill organizer and a glass of water', 'Note whether they took it, and tell you about missed doses', 'Pick up prescriptions', 'Drive them to the doctor and pharmacy'],
 'dont': ['Give medicine or put pills in their hand or mouth', 'Fill pill organizers or decide on doses', 'Give shots, insulin, eye drops or breathing treatments', 'Do any nursing task'],
 'dont_note': 'If someone needs medicine given to them, a home health nurse or a family member handles that part. We can help you find the right fit.',
 'doctor': ['New dizziness, sleepiness or confusion after a medicine change', 'Falls after starting a new medicine', 'A pattern of missed or doubled doses', 'Upset stomach, a rash or other new side effects'],
 'nine11': ['Can\u2019t be woken up, or very hard to wake', 'Trouble breathing', 'Swelling of the face, lips or tongue', 'They may have taken far too much of a medicine (you can also call Poison Control at 1-800-222-1222)'],
 'srcs': [],
 'tell': ['Their master medicine list', 'Who fills the pill organizer, and when', 'Their pharmacy', 'Doses that are often missed or confusing', 'Any recent medicine changes or hospital stays'],
 'local': 'general',
},
# ---------------------------------------------------------------- Eating
{
 'slug': 'eating-well-as-we-age', 'cat': 'Nutrition',
 'title': 'When Mom Stops Eating Well: Help with Meals at Home',
 'desc': 'Why older adults stop eating well, the signs to watch for, what a week of meal help from our caregivers looks like, and local help with meals in Springfield.',
 'card': 'Why it happens, what to watch for, and what a week of meal help from us looks like.',
 'inside': ['Why it happens', 'A sample week of meal help', 'Signs worth a doctor visit'],
 'intro': [
  'It often starts small. Food goes bad in the fridge. The same frozen dinner every night. Clothes that fit a little looser. Your mom says she is \u201cjust not hungry.\u201d',
  'Not eating well is one of the easiest problems to miss and one of the most important to catch, because it can lead to weakness, falls and getting sick more easily. Here is why it happens, what helps, and what meal help from us looks like.',
 ],
 'sections': [
  ('why', 'Why it happens', [
   'li:Food tastes and smells different with age, and some medicines dull appetite.',
   'li:Sore teeth or loose dentures make chewing hard.',
   'li:Cooking for one feels like too much work, and eating alone is lonely.',
   'li:Shopping and standing at the stove get tiring.',
   'li:Sometimes it is a sign of something else, like depression or memory changes. That is worth a doctor visit.',
  ]),
  ('helps', 'What helps', [
   'li:Smaller meals and snacks more often, instead of three big meals.',
   'li:Company at the table. People usually eat more when they are not eating alone.',
   'li:Easy food that is already made: soups, casseroles and snacks within reach.',
   'li:Water and drinks they like, kept where they sit.',
   'li:A dentist visit if chewing seems to hurt.',
  ]),
 ],
 'week': {
  'when': 'Monday and Thursday, 10 a.m. to 2 p.m.',
  'items': ['A grocery trip together, so they still choose their own food', 'Cooking a real lunch and sitting down to eat it together', 'Extra portions labeled for the days in between', 'Cleaning out old food from the fridge', 'Snacks and drinks set out where they sit', 'Following any diet the doctor gave, like low salt or diabetic', 'A note after the visit about how much they ate'],
 },
 'do': ['Grocery shop, cook and clean up', 'Eat with them and keep them company', 'Follow the diet their doctor gave', 'Help with eating if hands are shaky or weak', 'Notice weight loss, skipped meals or trouble chewing, and tell you and our office'],
 'dont': ['Tube feeding or any nursing task', 'Give medicine or nutrition supplements as a treatment', 'Diagnose why they are not eating'],
 'dont_note': 'If eating has changed a lot, start with their doctor. We help with the everyday part.',
 'doctor': ['Losing weight without trying', 'Skipping meals most days', 'Coughing or choking when eating or drinking', 'Trouble chewing or a sore mouth', 'Not drinking much, or seeming weak or dizzy'],
 'nine11': ['Choking that doesn\u2019t clear', 'Not alert, or very confused all of a sudden', 'Too weak to stand or get out of bed'],
 'srcs': [],
 'tell': ['What they used to love to eat', 'Any diet the doctor gave', 'Teeth, dentures or swallowing trouble', 'How their weight has changed', 'Which meals get skipped most', 'Whether they would like company at mealtime'],
 'local': 'meals',
},
# ---------------------------------------------------------------- Hospice
{
 'slug': 'planning-for-end-of-life-care', 'cat': 'End-of-Life',
 'title': 'Home Care Alongside Hospice',
 'desc': 'How home care works alongside hospice at home: what hospice covers, the hours families still need to fill, what our caregivers do, and how to start the conversation.',
 'card': 'What hospice covers, the hours families still need to fill, and how we help alongside the hospice team.',
 'inside': ['What hospice covers, and what it doesn\u2019t', 'How we work alongside hospice', 'Starting the conversation'],
 'intro': [
  'When someone chooses hospice at home, a hospice team takes charge of comfort: nurses, aides, medicine for pain and symptoms, equipment, and someone to call day or night. It is a relief for many families.',
  'What surprises families is how many hours are still theirs to cover. Hospice visits, but it usually does not stay. That is where we come in. Our caregivers work alongside the hospice team so your loved one is not alone and you can rest.',
 ],
 'sections': [
  ('hospice-covers', 'What hospice covers, and what it doesn\u2019t', [
   'p:Medicare\u2019s hospice benefit covers care for the terminal illness given or arranged by the hospice team. Nurses and aides visit on a schedule, and someone is on call around the clock.',
   'p:Hospice usually does not provide someone in the home all day. Round-the-clock care at home is only for short periods of crisis, and Medicare does not pay for room and board at home. Ask your hospice team exactly how often they will visit.',
   'p:<b>Palliative care or hospice?</b> Palliative care focuses on comfort and can happen alongside treatment, at any stage of a serious illness. Hospice is for when treatment to cure the illness has stopped and a doctor expects about six months or less.',
  ]),
  ('conversation', 'Starting the conversation', [
   'p:\u201cWhat matters most to you if things get harder?\u201d opens the door more gently than starting with paperwork. There is no perfect time, only earlier and later, and earlier is almost always better.',
   'p:An advance directive writes down their wishes for medical care. A health care power of attorney names who decides if they can\u2019t. Both are easier to finish before a crisis, and an elder law attorney can help.',
  ]),
 ],
 'week': {
  'when': 'Three overnights a week, so the family can sleep, or 9 a.m. to 1 p.m. on weekdays while family works',
  'items': ['Sitting with them, talking, reading or playing their music', 'Gentle help with bathing, changing and keeping them clean and comfortable', 'Small meals or sips of whatever they want', 'Laundry and keeping the house quiet and calm', 'Being there overnight so someone is always awake', 'Telling you and our office right away when something changes, so you can call the hospice nurse'],
 },
 'do': ['Stay with them so they are never alone', 'Help with bathing, changing and personal care, gently', 'Make small meals and help with eating and drinking', 'Do laundry and keep the house running', 'Give the family time to sleep, work or just breathe', 'Follow the hospice care plan and tell you about any change'],
 'dont': ['Give medicine, including comfort medicine', 'Do nursing tasks', 'Replace the hospice nurse or team'],
 'dont_note': 'The hospice team handles medicine and symptoms. We handle the hours in between.',
 'doctor_title': 'Call the hospice line',
 'doctor': ['New pain, or pain that isn\u2019t controlled', 'Trouble breathing, or breathing that changes', 'Restlessness or agitation', 'Not eating or drinking, or trouble swallowing', 'Anything that worries you, day or night'],
 'call_note': 'Our caregivers follow the hospice plan. If something changes during a visit, they call you and our office right away.',
 'nine11_title': 'About 911',
 'nine11_text': 'Your hospice team will tell you who to call. Most ask families to call the hospice line first, day or night, instead of 911. Keep that number by the phone and with any do-not-resuscitate paperwork.',
 'srcs': ['mc-hospice', 'cms-hospice'],
 'tell': ['The hospice agency, and the nurse line number', 'How often the hospice team visits', 'Which hours family can cover, and which they can\u2019t', 'Any do-not-resuscitate or advance directive paperwork', 'What comforts them: music, faith, a favorite blanket, quiet', 'Who makes decisions if they can\u2019t'],
 'local': 'general',
},
]
