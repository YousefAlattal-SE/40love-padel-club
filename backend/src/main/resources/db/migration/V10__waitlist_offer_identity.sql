ALTER TABLE match_waitlist ADD COLUMN offer_id uuid;
UPDATE match_waitlist SET offer_id = gen_random_uuid() WHERE status = 'offered';
ALTER TABLE match_waitlist ADD CONSTRAINT offered_requires_identity
    CHECK (status <> 'offered' OR offer_id IS NOT NULL);
CREATE UNIQUE INDEX match_waitlist_offer_id_unique ON match_waitlist(offer_id) WHERE offer_id IS NOT NULL;
