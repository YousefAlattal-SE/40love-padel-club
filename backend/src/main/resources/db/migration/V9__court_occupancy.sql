SET LOCAL lock_timeout = '5s';
LOCK TABLE public.bookings, public.matches, public.courts
    IN SHARE ROW EXCLUSIVE MODE;

DO $gate$
BEGIN
    IF session_user <> 'fortylove_migrator' OR current_user <> 'fortylove_migrator' THEN
        RAISE EXCEPTION 'Use the dedicated migration login for V9';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname IN ('fortylove_app','fortylove_claim_writer')
          AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls)
    ) OR EXISTS (
        SELECT 1 FROM pg_auth_members
        WHERE member IN ('fortylove_app'::regrole, 'fortylove_claim_writer'::regrole)
    ) OR has_schema_privilege('fortylove_app','public','CREATE')
      OR has_database_privilege('fortylove_app',current_database(),'CREATE')
      OR has_database_privilege('fortylove_app',current_database(),'TEMP')
      OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname='fortylove_claim_writer' AND rolcanlogin)
      OR EXISTS (SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace
                 AND relowner='fortylove_app'::regrole)
    THEN
        RAISE EXCEPTION 'Unsafe scheduling role configuration; review bootstrap and ownership';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.matches m ON m.court_id = b.court_id
          AND b.starts_at < m.ends_at AND m.starts_at < b.ends_at
        WHERE b.status <> 'cancelled' AND m.status IN ('published','completed')
    ) THEN
        RAISE EXCEPTION 'Existing booking and occupying match overlap; review required';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.matches a
        JOIN public.matches b ON a.court_id = b.court_id AND a.id < b.id
          AND a.starts_at < b.ends_at AND b.starts_at < a.ends_at
        WHERE a.status IN ('published', 'completed')
          AND b.status IN ('published', 'completed')
    ) THEN
        RAISE EXCEPTION 'Existing published or completed matches overlap; review required';
    END IF;
END
$gate$;

CREATE TABLE public.court_occupancy (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id bigint UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    match_id bigint UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
    court_id bigint NOT NULL REFERENCES public.courts(id),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    CHECK (num_nonnulls(booking_id, match_id) = 1),
    CHECK (starts_at < ends_at),
    CONSTRAINT court_occupancy_no_overlap EXCLUDE USING gist (
        court_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&
    )
);

CREATE TEMP VIEW expected_court_claims AS
    SELECT id AS booking_id, NULL::bigint AS match_id, court_id, starts_at, ends_at
    FROM public.bookings WHERE status <> 'cancelled'
    UNION ALL
    SELECT NULL::bigint, id, court_id, starts_at, ends_at
    FROM public.matches WHERE status IN ('published','completed');

INSERT INTO public.court_occupancy
    (booking_id, match_id, court_id, starts_at, ends_at)
SELECT booking_id, match_id, court_id, starts_at, ends_at
FROM pg_temp.expected_court_claims;

CREATE FUNCTION public.sync_court_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
DECLARE
    is_booking boolean := TG_RELID = 'public.bookings'::regclass;
    had_claim boolean := false;
    needs_claim boolean;
    previous_court bigint;
    owner_booking bigint;
    owner_match bigint;
BEGIN
    IF TG_RELID NOT IN ('public.bookings'::regclass, 'public.matches'::regclass) THEN
        RAISE EXCEPTION 'Unexpected scheduling trigger source';
    END IF;
    needs_claim := CASE WHEN is_booking THEN NEW.status::text <> 'cancelled'
                        ELSE NEW.status::text IN ('published','completed') END;
    IF TG_OP = 'UPDATE' THEN
        had_claim := CASE WHEN is_booking THEN OLD.status::text <> 'cancelled'
                          ELSE OLD.status::text IN ('published','completed') END;
        -- Completion retains the interval that was booked before the transition.
        IF NOT is_booking AND NEW.status::text = 'completed' AND
           (OLD.court_id, OLD.starts_at, OLD.ends_at) IS DISTINCT FROM
           (NEW.court_id, NEW.starts_at, NEW.ends_at) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'completed_match_interval',
                MESSAGE = 'Complete the match without changing its scheduled court or time';
        END IF;
        IF had_claim THEN previous_court := OLD.court_id; END IF;
        IF had_claim = needs_claim AND
           (OLD.court_id, OLD.starts_at, OLD.ends_at) IS NOT DISTINCT FROM
           (NEW.court_id, NEW.starts_at, NEW.ends_at) THEN
            RETURN NEW;
        END IF;
    END IF;
    IF NOT (had_claim OR needs_claim) THEN RETURN NEW; END IF;

    IF TG_WHEN = 'BEFORE' THEN
        PERFORM id FROM public.courts
        WHERE id = previous_court OR (needs_claim AND id = NEW.court_id)
        ORDER BY id FOR UPDATE;
        IF needs_claim AND EXISTS (
            SELECT 1 FROM public.courts WHERE id = NEW.court_id
              AND (NOT is_available OR legacy_sport IS NOT NULL OR sport <> 'padel')
        ) THEN
            RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'court_unavailable',
                MESSAGE = 'This court is currently unavailable';
        END IF;
        RETURN NEW;
    END IF;

    IF is_booking THEN owner_booking := NEW.id; ELSE owner_match := NEW.id; END IF;
    IF NOT had_claim THEN
        INSERT INTO public.court_occupancy
            (booking_id, match_id, court_id, starts_at, ends_at)
        VALUES (owner_booking, owner_match, NEW.court_id, NEW.starts_at, NEW.ends_at);
    ELSIF needs_claim THEN
        UPDATE public.court_occupancy
        SET court_id = NEW.court_id, starts_at = NEW.starts_at, ends_at = NEW.ends_at
        WHERE booking_id = owner_booking OR match_id = owner_match;
        IF NOT FOUND THEN RAISE EXCEPTION 'Missing active court claim'; END IF;
    ELSE
        DELETE FROM public.court_occupancy
        WHERE booking_id = owner_booking OR match_id = owner_match;
        IF NOT FOUND THEN RAISE EXCEPTION 'Missing court claim on release'; END IF;
    END IF;
    RETURN NEW;
END
$fn$;

CREATE TRIGGER booking_claim_lock BEFORE INSERT OR UPDATE OF
    court_id, starts_at, ends_at, status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.sync_court_claim();
CREATE TRIGGER booking_claim_sync AFTER INSERT OR UPDATE OF
    court_id, starts_at, ends_at, status ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.sync_court_claim();
CREATE TRIGGER match_claim_lock BEFORE INSERT OR UPDATE OF
    court_id, starts_at, ends_at, status ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.sync_court_claim();
CREATE TRIGGER match_claim_sync AFTER INSERT OR UPDATE OF
    court_id, starts_at, ends_at, status ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.sync_court_claim();

REVOKE ALL ON FUNCTION public.sync_court_claim() FROM PUBLIC, fortylove_app;
REVOKE ALL ON TABLE public.court_occupancy FROM PUBLIC;
REVOKE ALL ON TABLE public.court_occupancy FROM fortylove_app;
GRANT SELECT ON public.court_occupancy TO fortylove_app;

-- The application writes source rows; the trigger alone maintains their projection.
GRANT SELECT, INSERT, UPDATE ON public.users, public.bookings, public.matches,
    public.match_reservations, public.match_waitlist TO fortylove_app;
GRANT SELECT ON public.courts, public.pricing, public.off_peak_windows TO fortylove_app;
GRANT UPDATE (is_available) ON public.courts TO fortylove_app;
GRANT UPDATE (off_peak_price, daytime_two_hour_price, peak_price, evening_two_hour_price, updated_at)
    ON public.pricing TO fortylove_app;
GRANT SELECT, INSERT, UPDATE (status) ON public.contact_messages TO fortylove_app;
GRANT USAGE ON SEQUENCE public.users_id_seq, public.bookings_id_seq, public.matches_id_seq,
    public.match_reservations_id_seq, public.match_waitlist_id_seq, public.contact_messages_id_seq
    TO fortylove_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.court_occupancy TO fortylove_claim_writer;
GRANT SELECT (id, sport, legacy_sport, is_available), UPDATE (is_available)
    ON public.courts TO fortylove_claim_writer;
-- PostgreSQL checks CREATE on the destination schema for an ownership transfer.
GRANT CREATE ON SCHEMA public TO fortylove_claim_writer;
ALTER FUNCTION public.sync_court_claim() OWNER TO fortylove_claim_writer;
REVOKE CREATE ON SCHEMA public FROM fortylove_claim_writer;

DO $verify$
BEGIN
    -- Fail closed if installation-specific ACLs defeat the explicit grants.
    IF has_table_privilege('fortylove_app','public.court_occupancy',
                           'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES,SELECT WITH GRANT OPTION')
       OR has_any_column_privilege('fortylove_app','public.court_occupancy','INSERT,UPDATE,REFERENCES')
       OR has_function_privilege('fortylove_app','public.sync_court_claim()','EXECUTE')
       OR has_parameter_privilege('fortylove_app','session_replication_role','SET')
       OR EXISTS (
           SELECT 1 FROM pg_namespace WHERE has_schema_privilege('fortylove_app',oid,'CREATE')
       )
       OR EXISTS (
           SELECT 1 FROM pg_class WHERE oid IN ('public.bookings'::regclass,'public.matches'::regclass)
           AND has_table_privilege('fortylove_app',oid,'TRIGGER,TRUNCATE')
       )
    THEN
        RAISE EXCEPTION 'Runtime has excess schema, trigger or occupancy privileges';
    END IF;

    IF EXISTS (
        WITH actual AS (
            SELECT booking_id, match_id, court_id, starts_at, ends_at
            FROM public.court_occupancy
        ), missing AS (
            SELECT * FROM pg_temp.expected_court_claims EXCEPT ALL SELECT * FROM actual
        ), extra AS (
            SELECT * FROM actual EXCEPT ALL SELECT * FROM pg_temp.expected_court_claims
        )
        SELECT 1 FROM missing UNION ALL SELECT 1 FROM extra
    ) THEN
        RAISE EXCEPTION 'Court claim reconciliation failed';
    END IF;
END
$verify$;
DROP VIEW pg_temp.expected_court_claims;
