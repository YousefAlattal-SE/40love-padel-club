-- Padel-only rollout. Preserve historical sport classifications and all linked
-- records while removing non-Padel courts and matches from live operations.

ALTER TABLE courts ALTER COLUMN sport TYPE VARCHAR(24) USING sport::text;
ALTER TABLE pricing ALTER COLUMN sport TYPE VARCHAR(24) USING sport::text;
ALTER TABLE matches ALTER COLUMN sport TYPE VARCHAR(24) USING sport::text;

ALTER TABLE courts ADD COLUMN legacy_sport VARCHAR(24);
UPDATE courts
SET legacy_sport = sport,
    sport = 'padel',
    is_available = false
WHERE sport <> 'padel';

ALTER TABLE matches ADD COLUMN legacy_sport VARCHAR(24);
UPDATE matches m
SET legacy_sport = CASE WHEN m.sport <> 'padel' THEN m.sport ELSE c.legacy_sport END,
    sport = 'padel',
    status = CASE
        WHEN m.status IN ('draft', 'published') THEN 'cancelled'::match_status
        ELSE m.status
    END,
    updated_at = now()
FROM courts c
WHERE c.id = m.court_id
  AND (m.sport <> 'padel' OR c.legacy_sport IS NOT NULL);

-- Retire linked activity but retain bookings, reservations, waitlist rows, and users.
UPDATE recurring_bookings r
SET is_active = false
FROM courts c
WHERE c.id = r.court_id AND c.legacy_sport IS NOT NULL AND r.is_active;

UPDATE match_reservations r
SET status = 'cancelled'::match_reservation_status,
    updated_at = now()
FROM matches m
WHERE m.id = r.match_id AND m.legacy_sport IS NOT NULL AND r.status = 'confirmed';

UPDATE match_waitlist w
SET status = 'removed'::waitlist_status,
    updated_at = now()
FROM matches m
WHERE m.id = w.match_id
  AND m.legacy_sport IS NOT NULL
  AND w.status IN ('waiting', 'offered');

-- Prices are configuration, not booking history; retain only the live Padel rate.
DELETE FROM pricing WHERE sport <> 'padel';

-- Keep old contact requests, preserving their original sport in a separate field.
ALTER TABLE contact_messages ADD COLUMN legacy_sport VARCHAR(24);
ALTER TABLE contact_messages DROP CONSTRAINT IF EXISTS contact_messages_sport_check;
UPDATE contact_messages
SET legacy_sport = sport,
    sport = 'padel'
WHERE sport <> 'padel';

ALTER TABLE courts ADD CONSTRAINT courts_padel_only CHECK (sport = 'padel');
ALTER TABLE matches ADD CONSTRAINT matches_padel_only CHECK (sport = 'padel');
ALTER TABLE pricing ADD CONSTRAINT pricing_padel_only CHECK (sport = 'padel');
ALTER TABLE contact_messages ADD CONSTRAINT contact_messages_padel_only CHECK (sport = 'padel');

DROP TYPE sport_type;
