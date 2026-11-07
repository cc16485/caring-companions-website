// Caring Companions Core: concept layer
// -----------------------------------------------------------------------------
// Families do not use our vocabulary. They say "can my daughter get paid",
// not "family attendant eligibility under Consumer Directed Services".
//
// This maps how people actually ask onto a small set of canonical concepts.
// Retrieval then compares CONCEPTS, not words, which is what lets
// "Can my spouse be my caregiver?" find a record titled
// "Can a spouse be paid as a CDS attendant?".
//
// IMPORTANT: this layer only affects what gets FOUND. It has no power to
// change what may be SAID. The verified + public gate lives in
// knowledge-policy.js and is applied after retrieval, always.
// -----------------------------------------------------------------------------

// Contractions and possessives, expanded before anything else so that
// "can't", "cant" and "cannot" are the same question.
const CONTRACTIONS = [
  [/\bcan'?t\b/g, 'cannot'], [/\bwon'?t\b/g, 'will not'], [/\bdon'?t\b/g, 'do not'],
  [/\bdoesn'?t\b/g, 'does not'], [/\bdidn'?t\b/g, 'did not'], [/\bisn'?t\b/g, 'is not'],
  [/\baren'?t\b/g, 'are not'], [/\bi'?m\b/g, 'i am'], [/\bi'?ve\b/g, 'i have'],
  [/\bwe'?re\b/g, 'we are'], [/\bthey'?re\b/g, 'they are'], [/\bit'?s\b/g, 'it is'],
  [/\bwhat'?s\b/g, 'what is'], [/\bwho'?s\b/g, 'who is'], [/\bmom'?s\b/g, 'mom'],
  [/\bdad'?s\b/g, 'dad'], [/\bhe'?s\b/g, 'he is'], [/\bshe'?s\b/g, 'she is'],
  // 2026-11-06: a nursing home is a place, not nursing care. Kept as one word so it never matches "we do not provide
  // skilled nursing"; facility care is held until Samantha confirms it, so these questions go to the office.
  [/\bnursing homes?\b/g, 'nursinghome'],
];

export function normalize(s) {
  let t = ' ' + String(s || '').toLowerCase() + ' ';
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  t = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
  return ' ' + t.trim() + ' ';
}

// Words with no topical meaning. Matching on these is how "what time does the
// office close" retrieves a policy about seniority order.
export const STOP = new Set([
  'what','when','where','which','who','whom','how','why','does','do','did','is','are','was','were',
  'the','a','an','and','or','but','for','from','with','that','this','these','those','their','there',
  'they','you','your','our','we','us','can','could','would','should','will','shall','may','might',
  'have','has','had','been','be','it','its','of','in','on','at','to','by','as','if','not','about',
  'into','than','then','them','him','her','his','she','he','i','me','my','all','any','some','more',
  'most','say','someone','somebody','anyone','anybody','everyone','everybody','something','anything',
  'everything','nothing','people','person','need','needs','want','wants','make','makes','just','also',
  'please','tell','know','think','really','actually','am','so','out','up','down','very','much','many',
  'one','two','still','even','back','way','thing','things','okay','ok','hi','hello','thanks','thank',
  'happens','happen','work','works','like','get','gets','got','take','takes','give','gives',
  // 2026-11-05: who needs care and how much, not what they are asking. "mainly need help at night with my mom" fell to 0.43
  // on overnight care because help, mainly and mom counted as unanswered topics. husband and wife stay out: they are the
  // spouse concept (CDS).
  'help','helps','helping','mainly','mostly','mom','dad','mother','father','grandma','grandpa','grandmother','grandfather',
  'parent','parents',
]);

export function words(normalized) {
  return normalized.trim().split(' ').filter((w) => w.length > 2 && !STOP.has(w));
}

// ── The concept map ─────────────────────────────────────────────────────────
// Each entry: canonical id -> the surface forms people actually use.
// Multi-word terms are matched as phrases; single words as tokens.
// Deliberately conservative. A term that could mean two things is left out,
// because a wrong retrieval is worse than a miss.
export const CONCEPTS = {
  cds: ['cds', 'consumer directed', 'consumer direction', 'consumer directed services',
        'self directed', 'self direction', 'selfdirected', 'cds program'],

  medicaid: ['medicaid', 'mo healthnet', 'healthnet', 'health net', 'medicad', 'medicaide',
             'state insurance', 'title xix'],

  eligibility: ['eligible', 'eligibility', 'elligible', 'qualify', 'qualifies', 'qualified',
                'qualification', 'qualifications', 'entitled', 'apply', 'application',
                'sign up', 'signup', 'enroll', 'enrollment', 'requirements', 'criteria',
                'do i qualify', 'am i eligible'],
                // 'who can' was here and was wrong. It is a generic question frame,
                // not an eligibility signal: "who can I call", "who can help".
                // It made "Who can be paid as a CDS attendant?" read as an
                // eligibility record, which is how a question about who QUALIFIES
                // retrieved a record about who gets PAID.

  family_caregiver: ['family caregiver', 'family member', 'relative', 'daughter', 'son',
                     'child', 'children', 'kid', 'grandchild', 'granddaughter', 'grandson',
                     'niece', 'nephew', 'sister', 'brother', 'sibling', 'family'],

  spouse: ['spouse', 'husband', 'wife', 'married', 'partner', 'spousal'],

  paid: ['paid', 'pay', 'pays', 'payment', 'compensated', 'compensation', 'wage', 'wages',
         'salary', 'hourly', 'rate', 'rates', 'per hour', 'earn', 'earns', 'income', 'paycheck'],

  choose_caregiver: ['choose', 'chooses', 'choosing', 'pick', 'picks', 'select', 'selects',
                     'hire', 'hires', 'hiring', 'my own caregiver', 'own caregiver',
                     'who takes care', 'decide who', 'control'],

  directs_care: ['direct', 'directs', 'directing', 'in charge', 'manage', 'manages',
                 'supervise', 'supervises', 'supervision', 'boss', 'run it', 'runs it'],

  caregiver: ['caregiver', 'caregivers', 'care giver', 'attendant', 'attendants', 'aide',
              'aides', 'helper', 'worker', 'carer'],

  home_care: ['home care', 'homecare', 'at home', 'in home', 'in the home', 'care at home',
              'stay at home', 'in her home', 'in his home', 'live at home'],

  missouri: ['missouri', 'mo healthnet', 'show me state'],

  cost: ['cost', 'costs', 'price', 'pricing', 'how much', 'expensive', 'afford', 'fee', 'fees',
         'charge', 'charges', 'monthly', 'per month'],

  hometogether: ['hometogether', 'home together', 'ht tv', 'hometogether tv', 'the device',
                 'the tv', 'tablet', 'video calling'],

  calloff: ['call off', 'calls off', 'calling off', 'calloff', 'called off', 'call out',
            'calls out', 'called out', 'no show', 'noshow', 'did not show', 'does not show',
            'cancels', 'cancelled', 'coverage', 'shift'],

  guide_program: ['guide', 'guide program', 'respite', 'medicare advantage', 'dementia respite',
                  'medicare'],

  // 2026-10-27: everything we offer, so Cara can answer more than CDS and
  // HomeTogether. Most real questions were job seekers and Medicaid.
  jobs: ['job', 'jobs', 'employment', 'emppoyment', 'employed', 'career', 'careers',
         'position', 'positions', 'opening', 'openings', 'work for you', 'work here',
         'work there', 'apply for a job', 'job application', 'resume', 'interview',
         'be the caretaker', 'be a caregiver', 'become a caregiver', 'full time hours',
         'part time', 'full time'],
  license: ['license', 'licensed', 'cna', 'certified', 'certification', 'diploma', 'ged',
            'degree', 'experience', 'high school'],
  services: ['services', 'service', 'offer', 'offers', 'provide', 'provides', 'types of care',
             'kind of care', 'kinds of care', 'what do you do', 'help with'],
  service_area: ['area', 'areas', 'serve', 'county', 'counties', 'town', 'towns', 'zip',
                 'service area', 'near me', 'springfield', 'branson', 'nixa', 'ozark', 'republic',
                 'bolivar', 'marshfield', 'greene', 'christian', 'webster',
                 'polk', 'taney', 'lawrence', 'dallas', 'stone', 'cover my area'],
  assessment: ['assessment', 'consultation', 'get started', 'getting started', 'start care',
               'first step', 'next step', 'how do i start', 'how do we start', 'set up care',
               'sign up', 'how do i buy', 'book a visit', 'schedule a visit', 'meet with'],
  minimum: ['minimum', 'minimums', 'at least', 'few hours', 'short visit', 'short visits',
            'fewest', 'how few'],
  booking_app: ['app', 'apps', 'booking app', 'phone app', 'book online'],
  va: ['va benefits', 'the va', 'take va', 'accept va', 'va pay', 'va cover', 'va help', 'veteran', 'veterans', 'aid and attendance', 'military', 'community care network'],
  ltc_insurance: ['long term care insurance', 'ltc', 'ltc insurance', 'long term care policy',
                  'insurance policy'],
  insurance: ['insurance', 'insurances', 'covered', 'coverage plan'],
  accept_payment: ['accept', 'accepts', 'take', 'takes', 'ways to pay', 'pay for care',
                   'payment options', 'private pay', 'out of pocket', 'bill', 'billed'],
  dementia: ['dementia', 'alzheimer', 'alzheimers', 'memory', 'memory care', 'confused',
             'confusion', 'wandering', 'wanders', 'advanced care'],
  overnight: ['overnight', 'overnights', 'night', 'nights', 'nighttime', 'night shift'],
  round_clock: ['24 hour', '24 hours', 'around the clock', 'round the clock', 'live in',
                'livein', 'all day and night', '24 7'],
  respite: ['respite', 'a break', 'relief', 'time off'],
  nursing: ['nurse', 'nurses', 'nursing', 'medical', 'skilled', 'injections', 'wound',
            'shots', 'iv', 'catheter'],
  contact: ['phone number', 'call you', 'office', 'address', 'located', 'location',
            'contact', 'reach you', 'talk to someone', 'talk to a person', 'open'],
  outings: ['outing', 'outings', 'out of the house', 'get out', 'trips', 'senior center',
            'good days out', 'activities'],
  family_training: ['family care academy', 'academy', 'course', 'courses', 'class',
                    'classes', 'training for families', 'dementia journey'],
  employees: ['employee', 'employees', 'contractor', 'contractors', 'insured', 'bonded',
              'background check', 'background checks', 'screened', 'vetted', 'trustworthy'],
  transfer: ['switch', 'switching', 'transfer', 'transferring', 'moved', 'moving', 'relocated',
             'relocate', 'another agency', 'other agency', 'previous company', 'new location',
             'already has in home services', 'already has services', 'current agency'],
  price_guarantee: ['price match', 'beat', 'guarantee', 'cheaper', 'lower rate', 'lower price'],
  company: ['franchise', 'locally owned', 'family owned', 'how long', 'who owns',
            'about you', 'about your company'],
  personal_care: ['personal care', 'pca', 'bathing', 'bath', 'shower', 'showering', 'dressing',
                  'toileting', 'incontinence', 'hands on'],
  wellness: ['wellness', 'wellness care', 'companionship', 'companion', 'housekeeping',
             'cleaning', 'laundry', 'meals', 'meal', 'cooking', 'errands', 'groceries',
             'transportation', 'rides', 'driving', 'lonely'],
  hospital: ['hospital', 'rehab', 'discharge', 'discharged', 'surgery', 'coming home'],

  // 2026-11-06 (her OK): the "Questions families ask" answers, K132-K152.
  start_soon: ['how soon', 'how quickly', 'how fast', 'right away', 'start soon', 'start right away',
               'start this week', 'asap', 'as soon as possible', 'immediately',
               'how long until', 'how long before', 'quickly', 'soon', 'wait list', 'waiting list'],
  // 2026-11-06 (later): today or tomorrow is its own answer (K153); "how soon" stays with K132.
  start_today: ['today', 'tomorrow', 'tonight', 'same day', 'next day', 'same-day', 'next-day', 'start today',
                'start tomorrow', 'urgent', 'urgently', 'this afternoon', 'this evening'],
  hospice: ['hospice', 'end of life', 'palliative', 'comfort care', 'terminal', 'terminally', 'dying', 'actively dying'],
  weekend: ['weekend', 'weekends', 'saturday', 'saturdays', 'sunday', 'sundays', 'seven days', '7 days', 'days a week'],
  sick: ['sick', 'ill', 'illness', 'calls in sick', 'call in sick', 'cannot make it', 'backup', 'back up caregiver',
         'replacement', 'replace', 'fill in', 'no show', 'does not show up', 'does not come', 'did not show up'],
  contract: ['contract', 'contracts', 'deposit', 'deposits', 'down payment', 'commitment', 'commit', 'locked in',
             'lock in', 'long term contract', 'upfront', 'up front', 'sign a contract'],
  cancel_visit: ['cancel', 'canceling', 'cancelling', 'cancellation', 'reschedule', 'skip a visit', 'skip a day'],
  end_services: ['end services', 'end service', 'stop services', 'stop service', 'stop care', 'end care', 'quit',
                 'discontinue', 'discontinuing', 'terminate', 'termination', 'no longer need', 'cancel services',
                 'cancel care', 'stop using'],
  billing: ['invoice', 'invoices', 'invoiced', 'billing', 'bill', 'billed', 'bills', 'statement', 'autopay', 'auto pay',
            'credit card', 'debit card', 'bank account', 'ach', 'how often are we billed', 'pay weekly', 'pay monthly'],
  holiday: ['holiday', 'holidays', 'christmas', 'thanksgiving', 'easter', 'new year', 'new years', 'fourth of july',
            'july 4th', 'independence day', 'labor day', 'memorial day', 'juneteenth', 'time and a half', 'overtime'],
  appointments: ['appointment', 'appointments', 'doctor', 'doctors', 'dialysis', 'physical therapy', 'pharmacy',
                 'drive', 'drives', 'driving', 'transportation', 'transport', 'mileage', 'car', 'cars', 'ride to'],
  medication: ['medication', 'medications', 'medicine', 'medicines', 'meds', 'pill', 'pills', 'pill organizer',
               'pillbox', 'pill box', 'insulin', 'blood sugar', 'eye drops', 'drops', 'cream', 'creams', 'ointment',
               'prescription', 'prescriptions'],
  limits: ['not allowed', 'cannot do', 'caregivers cannot', 'cannot caregivers', 'can not do', 'limits',
           'limitations', 'ladder', 'ladders', 'furniture', 'yard', 'yard work', 'mow', 'mowing', 'outdoor',
           'heavy lifting', 'lifting', 'heavy cleaning', 'deep cleaning', 'not do', 'prohibited'],
  couple: ['couple', 'couples', 'both of them', 'both parents', 'both of my parents', 'mom and dad', 'my parents both',
           'two people', 'both need', 'husband and wife both', 'both of us'],
  who_coming: ['who is coming', 'who will be coming', 'who will come', 'who comes', 'meet the caregiver',
               'meet our caregiver', 'meet them first', 'meet her first', 'meet him first', 'photo', 'picture',
               'profile', 'stranger'],
  fit: ['good fit', 'not a fit', 'bad fit', 'not a good fit', 'not working out', 'do not like', 'does not like',
        'get along', 'change caregivers', 'change caregiver', 'different caregiver', 'new caregiver',
        'switch caregivers', 'replace our caregiver', 'personality'],
  updates: ['updates', 'update', 'notes', 'note', 'visit notes', 'care notes', 'how it is going', 'how the visits are going',
            'keep us informed', 'keep me informed', 'keep the family informed', 'informed', 'axiscare', 'clock in',
            'clocked in', 'check on'],
  tip: ['tip', 'tips', 'tipping', 'gift', 'gifts', 'present', 'presents', 'bonus'],
  private_hire: ['hire privately', 'privately', 'private arrangement', 'directly', 'pay her directly',
                 'pay him directly', 'on the side', 'off the books', 'under the table', 'ourselves', 'cash'],
  pause: ['pause', 'pausing', 'on hold', 'put visits on hold', 'admitted', 'hospitalized', 'in the hospital',
          'goes into the hospital', 'went into the hospital', 'emergency room'],
  documents: ['agreement', 'handbook', 'client handbook', 'paperwork', 'documents', 'policies', 'terms', 'sample'],
  complaint: ['complaint', 'complaints', 'complain', 'concern', 'concerns', 'problem', 'problems', 'issue', 'issues',
              'not happy', 'unhappy', 'upset', 'manager', 'supervisor', 'administrator'],
  pets: ['pet', 'pets', 'dog', 'dogs', 'cat', 'cats', 'animal', 'animals', 'puppy'],
  smoking: ['smoke', 'smokes', 'smoker', 'smoking', 'cigarette', 'cigarettes', 'vape', 'vaping', 'tobacco'],
};

// Terms that are phrases (contain a space) get matched against the normalized
// string; single tokens against the word set. Precomputed once.
const PHRASE_TERMS = {};
const TOKEN_TERMS = {};
for (const [id, terms] of Object.entries(CONCEPTS)) {
  PHRASE_TERMS[id] = terms.filter((t) => t.includes(' '));
  TOKEN_TERMS[id] = new Set(terms.filter((t) => !t.includes(' ')));
}

/** Which canonical concepts appear in a piece of text. */
export function conceptsIn(text) {
  const norm = normalize(text);
  const toks = new Set(words(norm));
  const found = new Set();
  for (const id of Object.keys(CONCEPTS)) {
    if (PHRASE_TERMS[id].some((p) => norm.includes(' ' + p + ' '))) { found.add(id); continue; }
    for (const t of TOKEN_TERMS[id]) if (toks.has(t)) { found.add(id); break; }
  }
  return found;
}

/**
 * What a QUESTION is asking about.
 *
 * Returns mapped concepts PLUS any meaningful word that mapped to nothing,
 * as `word:branson`. Unmapped words are not discarded: a question about
 * Humana in Branson must not score well against a CDS record just because
 * both mention Medicaid. Unmapped terms are real signal that we lack an
 * answer, and dropping them is how a system becomes confidently wrong.
 */
export function queryConcepts(question) {
  const norm = normalize(question);
  const mapped = conceptsIn(question);
  const covered = new Set();
  for (const id of mapped) {
    for (const t of CONCEPTS[id]) {
      if (t.includes(' ')) { if (norm.includes(' ' + t + ' ')) t.split(' ').forEach((w) => covered.add(w)); }
      else covered.add(t);
    }
  }
  const leftovers = words(norm).filter((w) => !covered.has(w)).map((w) => 'word:' + w);
  return [...mapped, ...new Set(leftovers)];
}
