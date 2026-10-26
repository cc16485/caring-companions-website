-- Cara's CDS answer pointed people to "a short call", and the call button on the chat dials
-- Cara's own number. Her rule 2026-10-26: anything Medicaid goes to the sister company,
-- Caring Companions Consumer Directed Services (caringcds.com, 417-218-2888).
-- Only changes N001 if it still has the old ending. Safe to run twice.
update public.kb_items
   set answer = 'Sometimes. Missouri Consumer Directed Services can pay a family member as the attendant when the consumer is eligible for the program and directs their own care. A spouse cannot be paid as the attendant. Whether a particular daughter qualifies depends on the consumer''s eligibility, so it is worth a short call to our sister company, Caring Companions Consumer Directed Services: (417) 218-2888 or caringcds.com.'
 where id = 'N001'
   and answer like '%so it is worth a short call to check.';
