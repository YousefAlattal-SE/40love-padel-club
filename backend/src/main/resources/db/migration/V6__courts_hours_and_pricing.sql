-- Keep three live Padel courts while retaining any surplus court rows and their history.
WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY id) AS court_number
    FROM courts
    WHERE sport = 'padel' AND legacy_sport IS NULL
)
UPDATE matches m
SET legacy_sport = 'padel',
    status = CASE
        WHEN m.status IN ('draft', 'published') THEN 'cancelled'::match_status
        ELSE m.status
    END,
    updated_at = now()
FROM ranked r
WHERE r.id = m.court_id AND r.court_number > 3 AND m.legacy_sport IS NULL;

WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY id) AS court_number
    FROM courts
    WHERE sport = 'padel' AND legacy_sport IS NULL
)
UPDATE recurring_bookings rb
SET is_active = false
FROM ranked r
WHERE r.id = rb.court_id AND r.court_number > 3 AND rb.is_active;

UPDATE match_reservations r
SET status = 'cancelled'::match_reservation_status,
    updated_at = now()
FROM matches m
JOIN courts c ON c.id = m.court_id
WHERE r.match_id = m.id
  AND c.sport = 'padel'
  AND c.legacy_sport IS NULL
  AND c.id IN (
      SELECT id FROM (
          SELECT id, row_number() OVER (ORDER BY id) AS court_number
          FROM courts
          WHERE sport = 'padel' AND legacy_sport IS NULL
      ) ranked_courts
      WHERE court_number > 3
  )
  AND r.status = 'confirmed';

UPDATE match_waitlist w
SET status = 'removed'::waitlist_status
FROM matches m
JOIN courts c ON c.id = m.court_id
WHERE w.match_id = m.id
  AND c.sport = 'padel'
  AND c.legacy_sport IS NULL
  AND c.id IN (
      SELECT id FROM (
          SELECT id, row_number() OVER (ORDER BY id) AS court_number
          FROM courts
          WHERE sport = 'padel' AND legacy_sport IS NULL
      ) ranked_courts
      WHERE court_number > 3
  )
  AND w.status IN ('waiting', 'offered');

-- Temporarily rename live courts to avoid collisions with their canonical names.
WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY id) AS court_number
    FROM courts
    WHERE sport = 'padel' AND legacy_sport IS NULL
)
UPDATE courts c
SET name = '40Love court migration ' || c.id
FROM ranked r
WHERE r.id = c.id;

WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY id) AS court_number
    FROM courts
    WHERE sport = 'padel' AND legacy_sport IS NULL
)
UPDATE courts c
SET name = 'Padel Court ' || r.court_number
FROM ranked r
WHERE r.id = c.id AND r.court_number <= 3;

WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY id) AS court_number
    FROM courts
    WHERE sport = 'padel' AND legacy_sport IS NULL
)
UPDATE courts c
SET legacy_sport = 'padel', is_available = false
FROM ranked r
WHERE r.id = c.id AND r.court_number > 3;

-- Two-hour bundles are stored alongside their one-hour rates (JOD).
ALTER TABLE pricing
    ADD COLUMN daytime_two_hour_price NUMERIC(8,3),
    ADD COLUMN evening_two_hour_price NUMERIC(8,3);

UPDATE pricing
SET off_peak_price = 25.000,
    peak_price = 35.000,
    daytime_two_hour_price = 45.000,
    evening_two_hour_price = 60.000,
    updated_at = now()
WHERE sport = 'padel';

ALTER TABLE pricing
    ALTER COLUMN daytime_two_hour_price SET NOT NULL,
    ALTER COLUMN evening_two_hour_price SET NOT NULL;

-- Daytime rates apply from 07:00 inclusive to 18:00 exclusive. Evening applies otherwise.
DELETE FROM off_peak_windows;
INSERT INTO off_peak_windows (start_hour, end_hour) VALUES (7, 18);
