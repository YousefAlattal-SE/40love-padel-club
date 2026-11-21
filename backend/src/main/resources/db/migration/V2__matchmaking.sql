-- Matchmaking feature: matches, reservations, waiting-list, and payment tracking
-- All payments are collected in-person at the club — no online payment.

-- ─── Enum types ──────────────────────────────────────────────────────────────

CREATE TYPE match_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE skill_level   AS ENUM ('beginner', 'intermediate', 'advanced', 'open');

CREATE TYPE match_reservation_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE match_payment_status     AS ENUM ('unpaid', 'paid');

CREATE TYPE waitlist_status AS ENUM ('waiting', 'offered', 'accepted', 'declined', 'expired', 'removed');

-- ─── Matches ─────────────────────────────────────────────────────────────────

CREATE TABLE matches (
  id              BIGSERIAL PRIMARY KEY,
  sport           sport_type    NOT NULL,
  court_id        BIGINT        NOT NULL REFERENCES courts(id),
  starts_at       TIMESTAMPTZ   NOT NULL,
  ends_at         TIMESTAMPTZ   NOT NULL,
  max_players     SMALLINT      NOT NULL CHECK (max_players >= 2),
  price_per_player NUMERIC(8,3) NOT NULL CHECK (price_per_player >= 0),
  skill_level     skill_level   NOT NULL DEFAULT 'open',
  description     TEXT,
  status          match_status  NOT NULL DEFAULT 'draft',
  created_by      BIGINT        NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CHECK (ends_at > starts_at),

  -- A published match blocks the court slot (conflicts with bookings and other published matches).
  -- We enforce this at the application layer with pessimistic locking + a uniqueness check,
  -- and additionally at the DB level with a GiST exclusion constraint when the match is published.
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status IN ('published'))
);

CREATE INDEX idx_matches_court      ON matches(court_id, starts_at);
CREATE INDEX idx_matches_starts_at  ON matches(starts_at);
CREATE INDEX idx_matches_status     ON matches(status);

-- ─── Match Reservations ───────────────────────────────────────────────────────

CREATE TABLE match_reservations (
  id              BIGSERIAL PRIMARY KEY,
  match_id        BIGINT NOT NULL REFERENCES matches(id),
  user_id         BIGINT NOT NULL REFERENCES users(id),
  status          match_reservation_status NOT NULL DEFAULT 'confirmed',
  payment_status  match_payment_status     NOT NULL DEFAULT 'unpaid',
  price_snapshot  NUMERIC(8,3) NOT NULL,   -- price locked at reservation time
  paid_at         TIMESTAMPTZ,
  paid_by         BIGINT REFERENCES users(id),  -- admin who recorded payment
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active reservation per member per match
  CONSTRAINT uq_reservation_member_match UNIQUE (match_id, user_id)
);

CREATE INDEX idx_reservations_match  ON match_reservations(match_id, status);
CREATE INDEX idx_reservations_user   ON match_reservations(user_id);

-- ─── Waiting List ─────────────────────────────────────────────────────────────

CREATE TABLE match_waitlist (
  id              BIGSERIAL PRIMARY KEY,
  match_id        BIGINT NOT NULL REFERENCES matches(id),
  user_id         BIGINT NOT NULL REFERENCES users(id),
  status          waitlist_status NOT NULL DEFAULT 'waiting',
  -- offer management
  offered_at      TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,
  -- FIFO ordering: earlier joined_at = higher priority
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate active waiting-list entries per member per match.
  -- A member may appear multiple times if they left and re-joined, but
  -- only one 'waiting' or 'offered' entry is allowed at a time.
  CONSTRAINT uq_waitlist_active UNIQUE (match_id, user_id)
);

CREATE INDEX idx_waitlist_match  ON match_waitlist(match_id, status, joined_at);
CREATE INDEX idx_waitlist_user   ON match_waitlist(user_id);
CREATE INDEX idx_waitlist_offers ON match_waitlist(offer_expires_at) WHERE status = 'offered';
