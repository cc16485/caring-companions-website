-- =============================================================================
-- Caring Companions Core — CDS Eligibility, the gold-standard concept
-- =============================================================================
-- The first governed concept, assembled from six sections across four
-- documents and proved before extraction runs anywhere else.
--
-- Every quote below was checked against the stored chunk before this file was
-- generated. Nothing is approved: every claim arrives as 'proposed' and the
-- concept arrives as 'proposed'. Approval is a human act on the review screen.
--
-- INSERT ONLY. Re-running changes nothing. See 20260808_knowledge_core.sql for
-- why that rule exists.
-- =============================================================================

-- ── Publication identity, separated from the local artifact ────────────────
-- The DHSS manual is publicly published; record that explicitly rather than
-- inferring it from a URL at query time.
update kb_publications
   set public_availability = 'published_public',
       official_url = coalesce(official_url, home_url)
 where id = 'missouri-dhss-home-and-community-based-services-'
   and public_availability <> 'published_public';

-- The MO HealthNet Personal Care Provider Manual is a Missouri DSS
-- publication, a different agency and a different manual from the DHSS HCBS
-- manual it was filed under. Provenance established from the artifact's own
-- text: 'Missouri Title XIX (Medicaid) State Plan Personal Care Program',
-- both service models, and citations to 13 CSR 70-91.010, 19 CSR 15-7 and
-- 19 CSR 15-8, with sections numbered 2.1 to 2.14. The publication date comes
-- from the official listing, and matches the .docx originally uploaded.
insert into kb_publications
  (id, title, publisher, authority, source_type, jurisdiction, home_url,
   official_url, published_on, public_availability, programs, program, review_owner, added_by)
values
  ('mo-healthnet-personal-care-provider-manual',
   'Personal Care Provider Manual',
   'Missouri Department of Social Services, MO HealthNet Division',
   'primary', 'manual', 'MO',
   'https://mydss.mo.gov/mhd/provider-manuals',
   'https://mydss.mo.gov/media/file/personal-care-provider-manual',
   date '2026-06-12', 'published_public',
   array['CDS','IHS'], 'CDS', 'Samantha', 'samantha')
on conflict (id) do nothing;

-- Re-file the pasted copy under the publication it actually represents.
-- Guarded on the wrong value it currently holds, so this applies once.
update kb_source_documents
   set publication_id = 'mo-healthnet-personal-care-provider-manual',
       publisher      = 'Missouri Department of Social Services, MO HealthNet Division',
       ingest_origin  = 'pasted',
       provenance_note = 'Text pasted by Samantha because the official .docx could not be read in the browser. '
                      || 'The bytes Core holds are that paste, not a file retrieved from Missouri DSS. '
                      || 'Identified from internal markers: Title XIX State Plan Personal Care, agency and CDS models, '
                      || '13 CSR 70-91.010, 19 CSR 15-7, 19 CSR 15-8, sections 2.1 to 2.14.'
 where id = 9
   and publication_id = 'missouri-dhss-home-and-community-based-services-';

-- The HCBS manual pages were added without a publication, so they showed no
-- publisher and had no publication identity to inherit.
update kb_source_documents
   set publication_id = 'missouri-dhss-home-and-community-based-services-'
 where publication_id is null
   and canonical_url like 'https://health.mo.gov/%';

update kb_source_documents
   set ingest_origin = 'fetched'
 where ingest_origin is null and canonical_url is not null;


-- ── The concept ─────────────────────────────────────────────────────────────
insert into kb_concepts (id, name, description, question, program, topic, status, priority)
values ('C-CDS-ELIGIBILITY', 'CDS Eligibility',
  'Who may use Consumer Directed Services in Missouri, on what conditions, and what does not follow from being approved.',
  'Who qualifies for Consumer Directed Services?', 'CDS', 'eligibility', 'proposed', 5)
on conflict (id) do nothing;


-- ── Claims, every one 'proposed' ────────────────────────────────────────────

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-01', 'A CDS participant must be at least 18 years of age.', 'external_rule', 'AGREES',
        null, 'proposed', 'public', 98,
        'Both state manuals give the same minimum age, and neither sets an upper limit.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-02', 'A CDS participant must have a physical disability: the loss of, or loss of use of, all or part of the body''s neurological, muscular or skeletal functions, to the extent that they need another person''s help to accomplish routine tasks.', 'external_rule', 'AGREES',
        null, 'proposed', 'public', 96,
        'Both manuals use the same definition. The DHSS manual cites the regulation, 19 CSR 15-8.100; the MO HealthNet manual states it inline without the citation.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-03', 'A CDS participant must be able to self-direct their own care.', 'external_rule', 'AGREES',
        null, 'proposed', 'public', 95,
        'Three sections state the requirement. The Self-Directed Determination section supplies the statutory basis the other two assert without citing.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-04', 'Self-directing means being able to hire, train, supervise and direct the personal care attendant, and specifically to supervise the attendant, verify their wages, monitor EVV use, notify DSDS of changes affecting the care plan or residence, report quality problems, and report significant changes in health or ability to self-direct.', 'external_rule', 'SUPPLEMENTS',
        'CL-03', 'proposed', 'public', 92,
        'Turns an abstract requirement into something a coordinator can actually assess. Neither eligibility section contains it.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-05', 'Holding a Power of Attorney does not make a person ineligible for CDS. The participant must still be able to self-direct their own care.', 'external_rule', 'SUPPLEMENTS',
        'CL-03', 'proposed', 'public', 94,
        'Answers a question neither manual addresses, and closes a gap raised when this section was read on its own.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-06', 'A CDS consumer must be capable of living independently with CDS in place.', 'external_rule', 'SUPPLEMENTS',
        null, 'proposed', 'public', 90,
        'Present in the MO HealthNet manual and absent from the DHSS eligibility section. A materially different requirement appearing in only one of two authoritative manuals. Not merged, not dropped. Needs someone to say whether it is a current CDS requirement.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-07', 'A CDS participant must be in active Medicaid status.', 'external_rule', 'SINGLE_SOURCE',
        null, 'proposed', 'public', 95,
        'The MO HealthNet manual refers instead to its own general participant eligibility requirements in Section 2.1, which Core has not read yet.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-08', 'Participants eligible for Medicaid on a spenddown basis may be authorized for CDS during the periods when they meet their spenddown liability. In months the liability is not met, the participant and provider may agree privately to continue services, and the participant is responsible for the cost.', 'external_rule', 'SINGLE_SOURCE',
        null, 'proposed', 'public', 93,
        null)
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-09', 'Participants who receive Medicaid because they are eligible for Blind Pension may be authorized for CDS.', 'external_rule', 'CONFLICTS',
        'CL-10', 'proposed', 'public', 94,
        null)
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-10', 'ME code 02 Blind Pension is state-funded only and does not meet the federally funded Medicaid requirement for HCBS waivers, which makes those participants ineligible for an HCBS waiver service. ME code 03 Supplemental Aide to the Blind does meet it.', 'external_rule', 'CONFLICTS',
        'CL-09', 'proposed', 'internal', 92,
        null)
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-11', 'A CDS participant must have an appropriate Medicaid Eligibility (ME) code.', 'external_rule', 'SINGLE_SOURCE',
        null, 'proposed', 'public', 88,
        'The Respite Care guidance discusses Medicaid eligibility codes 02 and 03 for waiver services, which is related but does not list the codes CDS accepts.')
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-12', 'A CDS participant must meet nursing facility level of care.', 'external_rule', 'SINGLE_SOURCE',
        null, 'proposed', 'public', 94,
        null)
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-13', 'A CDS participant must not have been previously involved in Medicaid fraud.', 'external_rule', 'SINGLE_SOURCE',
        null, 'proposed', 'public', 93,
        null)
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-14', 'Being authorized for CDS does not by itself establish eligibility for Home and Community Based Medicaid.', 'external_rule', 'SINGLE_SOURCE',
        null, 'proposed', 'public', 96,
        null)
on conflict (concept_id, ref) do nothing;

insert into kb_claims (concept_id, ref, text, knowledge_type, relationship, related_ref,
                       status, proposed_audience, extraction_confidence, review_note)
values ('C-CDS-ELIGIBILITY', 'CL-15', 'Independent Living Waiver participants must be 18 to 64 at first enrolment, and may stay past 65 if they can still self-direct.', 'external_rule', 'DIFFERENT_SCOPE',
        'CL-01', 'proposed', 'public', 93,
        'A different programme with a different age rule. It looks like the CDS age requirement and must not be merged into it: the Independent Living Waiver has an upper age bound and CDS does not.')
on conflict (concept_id, ref) do nothing;


-- ── Evidence, with verbatim verification computed at generation time ────────

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Be at least eighteen (18) years of age',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-01'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Be at least eighteen (18) years of age');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 9, ch.id, 'mo-healthnet-personal-care-provider-manual', 'Be at least 18 years of age',
       'MO HealthNet Personal Care Manual, CDS Consumer Eligibility Requirements', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 9 and ch.ordinal = 63
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-01'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 9 and e.quote = 'Be at least 18 years of age');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Be physically disabled, as defined by 19 CSR 15-8.100 Loss of, or loss of use of, all or part of the body''s neurological, muscular, or skeletal functions to the extent the person requires the assistance of another person to accomplish routine tasks.',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-02'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Be physically disabled, as defined by 19 CSR 15-8.100 Loss of, or loss of use of, all or part of the body''s neurological, muscular, or skeletal functions to the extent the person requires the assistance of another person to accomplish routine tasks.');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 9, ch.id, 'mo-healthnet-personal-care-provider-manual', 'Have a physical disability (loss of, or loss of use of, all or part of the neurological, muscular, or skeletal functions of the body to the extent that the person requires the assistance of another person to accomplish routine tasks)',
       'MO HealthNet Personal Care Manual, CDS Consumer Eligibility Requirements', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 9 and ch.ordinal = 63
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-02'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 9 and e.quote = 'Have a physical disability (loss of, or loss of use of, all or part of the neurological, muscular, or skeletal functions of the body to the extent that the person requires the assistance of another person to accomplish routine tasks)');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Be able to self-direct their CDS',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-03'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Be able to self-direct their CDS');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 9, ch.id, 'mo-healthnet-personal-care-provider-manual', 'Be able to self-direct their own services/care (consumer-directed)',
       'MO HealthNet Personal Care Manual, CDS Consumer Eligibility Requirements', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 9 and ch.ordinal = 63
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-03'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 9 and e.quote = 'Be able to self-direct their own services/care (consumer-directed)');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'A current or potential CDS participant is required to have the ability to direct their care per 208.903.1.(4), RS Mo .',
       'DHSS HCBS Manual 3.25, Section 4, Self-Directed Determination', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 4
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-03'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'A current or potential CDS participant is required to have the ability to direct their care per 208.903.1.(4), RS Mo .');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Consumer directed is defined as the hiring, training, supervising, and directing of the personal care attendant. Section 208.909.1, RSMo states that current or potential participants must be able to fulfill the following responsibilities: Supervise the personal care attendant Verify the wages to be paid to the personal care attendant Monitor proper Electronic Visit Verification (EVV) usage',
       'DHSS HCBS Manual 3.25, Section 4, Self-Directed Determination', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 4
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-04'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Consumer directed is defined as the hiring, training, supervising, and directing of the personal care attendant. Section 208.909.1, RSMo states that current or potential participants must be able to fulfill the following responsibilities: Supervise the personal care attendant Verify the wages to be paid to the personal care attendant Monitor proper Electronic Visit Verification (EVV) usage');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 96, ch.id, 'missouri-dhss-home-and-community-based-services-', 'The fact that the potential participant has a Power of Attorney does not make the participant ineligible for CDS. The potential participant must have the ability to self-direct their own care to qualify for CDS.',
       'DHSS CDS Policy Clarification Q&A, Power of Attorney', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 96 and ch.ordinal = 1
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-05'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 96 and e.quote = 'The fact that the potential participant has a Power of Attorney does not make the participant ineligible for CDS. The potential participant must have the ability to self-direct their own care to qualify for CDS.');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 9, ch.id, 'mo-healthnet-personal-care-provider-manual', 'Be capable of living independently with CDS in place',
       'MO HealthNet Personal Care Manual, CDS Consumer Eligibility Requirements', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 9 and ch.ordinal = 63
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-06'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 9 and e.quote = 'Be capable of living independently with CDS in place');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'In active Medicaid status',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-07'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'In active Medicaid status');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Participants eligible for Medicaid on a spenddown basis may be authorized to receive CDS during periods when they meet their spenddown liability.',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-08'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Participants eligible for Medicaid on a spenddown basis may be authorized to receive CDS during periods when they meet their spenddown liability.');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Participants who receive Medicaid due to eligibility for Blind Pension (BP) may be authorized for CDS.',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-09'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Participants who receive Medicaid due to eligibility for Blind Pension (BP) may be authorized for CDS.');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 99, ch.id, 'missouri-dhss-home-and-community-based-services-', 'ME code 03 Supplemental Aide to the Blind meets the federally funded Medicaid requirement for HCBS waivers. ME code 02 Blind Pension does not, as it is a state-funded only code.',
       'DHSS Respite Care Q&A, Blind Pension ME codes', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 99 and ch.ordinal = 5
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-10'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 99 and e.quote = 'ME code 03 Supplemental Aide to the Blind meets the federally funded Medicaid requirement for HCBS waivers. ME code 02 Blind Pension does not, as it is a state-funded only code.');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Have an appropriate Medicaid Eligibility (ME) Code',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-11'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Have an appropriate Medicaid Eligibility (ME) Code');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Meet nursing facility level of care (LOC)',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-12'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Meet nursing facility level of care (LOC)');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Have not been previously involved in Medicaid fraud',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-13'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Have not been previously involved in Medicaid fraud');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 17, ch.id, 'missouri-dhss-home-and-community-based-services-', 'Authorization of CDS does not meet the requirements for an individual to be eligible for Home and Community Based (HCB) Medicaid.',
       'DHSS HCBS Manual 3.25, Section 3, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 17 and ch.ordinal = 3
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-14'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 17 and e.quote = 'Authorization of CDS does not meet the requirements for an individual to be eligible for Home and Community Based (HCB) Medicaid.');

insert into kb_claim_evidence (claim_id, document_id, chunk_id, publication_id, quote, section_ref,
                               source_authority, source_sensitivity, publication_public, verified_verbatim, last_checked)
select cl.id, 21, ch.id, 'missouri-dhss-home-and-community-based-services-', 'To qualify for the ILW, a participant must: Be 18-64 years old when they first enroll Participants who turn sixty-five (65) while enrolled may stay in the program if they can still self-direct their care.',
       'DHSS HCBS Manual 3.55, Independent Living Waiver, Eligibility', 'primary', 'public', 'published_public', true, current_date
  from kb_claims cl
  join kb_source_chunks ch on ch.document_id = 21 and ch.ordinal = 2
 where cl.concept_id = 'C-CDS-ELIGIBILITY' and cl.ref = 'CL-15'
   and not exists (select 1 from kb_claim_evidence e
                    where e.claim_id = cl.id and e.document_id = 21 and e.quote = 'To qualify for the ILW, a participant must: Be 18-64 years old when they first enroll Participants who turn sixty-five (65) while enrolled may stay in the program if they can still self-direct their care.');


-- ── Merge proposals: proposed, never applied ────────────────────────────────

insert into kb_merge_proposals (concept_id, claim_refs, kind, rationale, proposed_action)
select 'C-CDS-ELIGIBILITY', array['CL-01'], 'AGREES',
       'Identical minimum age stated in two authoritative manuals.', 'Merge into one claim carrying both citations.'
 where not exists (select 1 from kb_merge_proposals p
                    where p.concept_id = 'C-CDS-ELIGIBILITY' and p.rationale = 'Identical minimum age stated in two authoritative manuals.');

insert into kb_merge_proposals (concept_id, claim_refs, kind, rationale, proposed_action)
select 'C-CDS-ELIGIBILITY', array['CL-02'], 'AGREES',
       'Same definition of physical disability, one with the regulatory citation.', 'Merge, keeping A as the citing source and B as corroboration.'
 where not exists (select 1 from kb_merge_proposals p
                    where p.concept_id = 'C-CDS-ELIGIBILITY' and p.rationale = 'Same definition of physical disability, one with the regulatory citation.');

insert into kb_merge_proposals (concept_id, claim_refs, kind, rationale, proposed_action)
select 'C-CDS-ELIGIBILITY', array['CL-03'], 'AGREES',
       'Three sources state the self-direction requirement, C with the statute.', 'Merge into one claim with three citations.'
 where not exists (select 1 from kb_merge_proposals p
                    where p.concept_id = 'C-CDS-ELIGIBILITY' and p.rationale = 'Three sources state the self-direction requirement, C with the statute.');


-- ── Question universe ───────────────────────────────────────────────────────
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does my mom qualify for CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'How do I know if we are eligible for consumer directed services?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What do you have to have to get CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Can my husband get CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'How old do you have to be to get CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Can a 17 year old get CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Do you have to be on Medicaid to get CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Can we get CDS without Medicaid?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does Mom have to qualify for a nursing home to get CDS at home?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Do I have to be able to manage the caregiver myself?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Can someone with dementia be on CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'I have power of attorney for my mother, can she still get CDS?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does having a POA disqualify us?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does my condition count as a physical disability?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'If we get CDS approved does that get us on the waiver?', 'family') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What are the CDS eligibility criteria?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What do I check before accepting a CDS referral?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does this referral meet CDS eligibility?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Minimum age CDS participant', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Is nursing facility level of care required for CDS?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'How is the self-direction determination documented?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What are the participant''s self-direction responsibilities under 208.909.1?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does a POA affect CDS eligibility?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What ME code is required for CDS?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Do we have to check Medicaid fraud history before CDS?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Does CDS authorization satisfy HCB Medicaid eligibility?', 'staff') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What is our exposure if we serve someone who does not meet CDS eligibility?', 'leadership') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Which CDS eligibility criteria are hard requirements?', 'leadership') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'What is our exposure if staff tell a family CDS makes them HCB eligible?', 'leadership') on conflict (concept_id, text) do nothing;
insert into kb_questions (concept_id, text, register) values ('C-CDS-ELIGIBILITY', 'Do the two state manuals agree on CDS eligibility?', 'leadership') on conflict (concept_id, text) do nothing;


-- ── Knowledge gaps, each with why it is still open ──────────────────────────

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'Which Medicaid Eligibility (ME) codes are appropriate for CDS specifically?', 'A requires an ''appropriate'' code without listing them. E lists 02 and 03 for waiver services, which is related but not the CDS list.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'partially_informed'
 where not exists (select 1 from kb_gaps x where x.question = 'Which Medicaid Eligibility (ME) codes are appropriate for CDS specifically?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'Is ''capable of living independently with CDS in place'' a current CDS eligibility requirement?', 'Stated in the MO HealthNet manual and absent from the DHSS manual section. Raised by the cross-source comparison itself.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'sources_diverge'
 where not exists (select 1 from kb_gaps x where x.question = 'Is ''capable of living independently with CDS in place'' a current CDS eligibility requirement?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'How is nursing facility level of care determined for a CDS applicant?', 'Required by A with no method or assessor. Section 4.10 is indexed and may answer it.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'source_does_not_answer'
 where not exists (select 1 from kb_gaps x where x.question = 'How is nursing facility level of care determined for a CDS applicant?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'What happens to an existing CDS authorization if the participant loses active Medicaid status?', 'Active status is required to qualify; nothing indexed says what happens to services already authorized.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'source_does_not_answer'
 where not exists (select 1 from kb_gaps x where x.question = 'What happens to an existing CDS authorization if the participant loses active Medicaid status?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'Must the private arrangement during an unmet spenddown month be in writing, and at what rate?', 'A permits it and assigns cost to the participant, but is silent on documentation, rate and notice.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'source_does_not_answer'
 where not exists (select 1 from kb_gaps x where x.question = 'Must the private arrangement during an unmet spenddown month be in writing, and at what rate?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'How is prior involvement in Medicaid fraud checked, and what counts as involvement?', 'A hard exclusion in A with no verification method. Likely MMAC rather than this manual.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'source_does_not_answer'
 where not exists (select 1 from kb_gaps x where x.question = 'How is prior involvement in Medicaid fraud checked, and what counts as involvement?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'What documentation proves the physical disability for CDS eligibility?', 'The definition is given in both manuals; the evidence required is in neither.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'source_does_not_answer'
 where not exists (select 1 from kb_gaps x where x.question = 'What documentation proves the physical disability for CDS eligibility?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state)
select 'What are the general participant eligibility requirements in Section 2.1 of the MO HealthNet Personal Care Manual?', 'B explicitly builds on them and that section is not currently indexed.', 'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'source_not_yet_indexed'
 where not exists (select 1 from kb_gaps x where x.question = 'What are the general participant eligibility requirements in Section 2.1 of the MO HealthNet Personal Care Manual?');


-- ── Gaps closed by cross-source evidence, recorded as closed ────────────────

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state, closure_note)
select 'How is a participant''s ability to self-direct assessed, and who decides?', 'Raised by the single-source run and closed by another source in the same cluster.',
       'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'closed', 'Closed by source C. Section 4 sets out the statutory responsibilities, the Self Direction Assessment questions, and the requirement to document in the electronic case record when someone cannot direct their care.'
 where not exists (select 1 from kb_gaps x where x.question = 'How is a participant''s ability to self-direct assessed, and who decides?');

insert into kb_gaps (question, why, origin, programs, concept_id, gap_state, closure_note)
select 'Can a representative direct CDS for someone unable to self-direct?', 'Raised by the single-source run and closed by another source in the same cluster.',
       'extraction', array['CDS'], 'C-CDS-ELIGIBILITY', 'closed', 'Closed by source D. A Power of Attorney does not make someone ineligible, but it does not substitute for the participant''s own ability to self-direct.'
 where not exists (select 1 from kb_gaps x where x.question = 'Can a representative direct CDS for someone unable to self-direct?');


-- ── Answers: presentations of approved claims, never the truth layer ────────
-- Inserted as 'proposed'. The public answer names only claims fit for public
-- use; the staff answer may additionally draw on internal claims. Both are
-- checked by kb_answer_audience_guard on insert.
insert into kb_answers (concept_id, audience, text, built_from, excluded, exclusion_reason, status)
select 'C-CDS-ELIGIBILITY', 'public', 'To use Consumer Directed Services in Missouri a person must be at least eighteen, have a physical disability that means they need another person''s help with routine tasks, be able to direct their own care, and be in active Medicaid status with an appropriate Medicaid eligibility code. They must also meet nursing facility level of care and have no prior involvement in Medicaid fraud. Directing your own care means being able to hire, train, supervise and direct your attendant, including verifying their wages and keeping the state informed of changes. Having a Power of Attorney does not disqualify someone, but the participant themselves must still be able to direct the care. Being approved for CDS does not by itself make someone eligible for Home and Community Based Medicaid, which is a separate determination.',
       (select coalesce(array_agg(id order by ref), '{}') from kb_claims
         where concept_id = 'C-CDS-ELIGIBILITY' and ref = any(array['CL-01','CL-02','CL-03','CL-04','CL-05','CL-07','CL-11','CL-12','CL-13','CL-14'])),
       (select coalesce(array_agg(id order by ref), '{}') from kb_claims
         where concept_id = 'C-CDS-ELIGIBILITY' and ref = any(array['CL-06','CL-08','CL-09','CL-10','CL-15'])),
       'The spenddown and Blind Pension rules and the one-sided independent-living criterion are not settled enough to state in a family-facing answer while the conflict is open.', 'proposed'
 where not exists (select 1 from kb_answers x where x.concept_id = 'C-CDS-ELIGIBILITY' and x.audience = 'public');

insert into kb_answers (concept_id, audience, text, built_from, exclusion_reason, status)
select 'C-CDS-ELIGIBILITY', 'staff',
  'Check all of these before accepting a CDS referral: the participant is at least eighteen, has a physical disability as defined in 19 CSR 15-8.100, can self-direct their own care, is in active Medicaid status with an appropriate ME code, meets nursing facility level of care, and has no prior involvement in Medicaid fraud. Self-direction is assessed against the responsibilities in 208.909.1 RSMo, and where a participant cannot direct their care it must be documented in the electronic case record. A Power of Attorney does not disqualify anyone. Spenddown participants can be authorized in the months they meet their liability, and in months they do not the family may agree privately to continue at their own cost. Do not tell a family that CDS approval makes them eligible for HCB Medicaid.',
  (select coalesce(array_agg(id order by ref), '{}') from kb_claims
    where concept_id = 'C-CDS-ELIGIBILITY'
      and ref = any(array['CL-01','CL-02','CL-03','CL-04','CL-05','CL-07','CL-08','CL-11','CL-12','CL-13','CL-14'])),
  'Built from the eleven settled claims. The Blind Pension question, the one-sided independent-living requirement and the Independent Living Waiver age rule are all left out while they are unresolved: the answer guard would refuse them, and the concept can still be answered without them.', 'proposed'
 where not exists (select 1 from kb_answers x where x.concept_id = 'C-CDS-ELIGIBILITY' and x.audience = 'staff');

-- Check after running:
--   select * from kb_concept_review;
--   select ref, relationship, status, proposed_audience from kb_claims order by ref;
