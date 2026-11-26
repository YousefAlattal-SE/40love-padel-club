"""PostgreSQL 16 migration and independent-transaction scheduling tests.

Run with Python 3 and Docker. Always creates its own network-isolated tmpfs database.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import os
import secrets
import subprocess
import time
import uuid


MIGRATIONS = Path(__file__).resolve().parents[2] / "main/resources/db/migration"
NAME = "schedule-test-" + uuid.uuid4().hex
PSQL = ["docker", "exec", "-i", NAME, "psql", "-XAtq", "-d", "postgres",
        "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"]


APP = "fortylove_app"
MIGRATOR = "fortylove_migrator"
BOOTSTRAP = MIGRATIONS.parents[4] / "db/bootstrap_roles.sql"


def sql(statement, expected_error=None, role=APP):
    result = subprocess.run(PSQL + ["-U", role], input=statement, capture_output=True, encoding="utf-8", timeout=35)
    if expected_error:
        assert result.returncode and expected_error in result.stderr, result.stderr
    elif result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()


def booking(start, end):
    return f"""INSERT INTO bookings(user_id,court_id,starts_at,ends_at,total_price)
               VALUES (900,900,'{start}','{end}',25)"""


def match(match_id, start, end, state):
    return f"""INSERT INTO matches(id,created_by,court_id,starts_at,ends_at,sport,
               max_players,price_per_player,status) VALUES
               ({match_id},900,900,'{start}','{end}','padel',4,8,'{state}')"""


def publish(match_id):
    return f"UPDATE matches SET status='published' WHERE id={match_id}"


def contend(first, second, commit=True, expected_error="23P01"):
    # The contender must actually be waiting on a database lock before releasing the winner.
    with subprocess.Popen(PSQL + ["-U", APP], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                          stderr=subprocess.STDOUT, text=True) as holder:
        try:
            holder.stdin.write(f"BEGIN; {first}; SELECT 'ready';\n")
            holder.stdin.flush()
            assert holder.stdout.readline().strip() == "ready"
            with ThreadPoolExecutor(max_workers=1) as worker:
                contender = worker.submit(sql, "SET application_name='fixture_contender'; "
                                          "SET statement_timeout='15s'; " + second,
                                          expected_error if commit else None)
                deadline = time.monotonic() + 10
                while sql("SELECT count(*) FROM pg_stat_activity WHERE "
                          "application_name='fixture_contender' AND wait_event_type='Lock'") != "1":
                    if time.monotonic() > deadline:
                        raise AssertionError("Contender did not reach a lock wait")
                    time.sleep(0.05)
                holder.stdin.write("COMMIT;\n" if commit else "ROLLBACK;\n")
                holder.stdin.flush()
                contender.result(timeout=20)
        finally:
            holder.stdin.close()
            holder.wait(timeout=10)


def history(role):
    return sql("""SELECT row_to_json(b)::text FROM bookings b ORDER BY id;
                  SELECT row_to_json(m)::text FROM matches m ORDER BY id;
                  SELECT row_to_json(r)::text FROM match_reservations r ORDER BY id;
                  SELECT row_to_json(w)::text FROM match_waitlist w ORDER BY id;""", role=role)


def permissions():
    assert sql("SELECT current_user = session_user AND current_user = 'fortylove_app'") == "t"
    assert sql("""SELECT proowner = 'fortylove_claim_writer'::regrole AND prosecdef
                  FROM pg_proc WHERE oid = 'public.sync_court_claim()'::regprocedure""") == "t"
    assert sql("""SELECT relowner = 'fortylove_migrator'::regrole FROM pg_class
                  WHERE oid = 'public.court_occupancy'::regclass""") == "t"
    for operation in (
        "INSERT INTO court_occupancy DEFAULT VALUES",
        "UPDATE court_occupancy SET starts_at=starts_at WHERE false",
        "DELETE FROM court_occupancy WHERE false",
        "TRUNCATE court_occupancy",
        "ALTER TABLE bookings DISABLE TRIGGER booking_claim_sync",
        "ALTER TABLE matches DISABLE TRIGGER match_claim_lock",
        "SET ROLE fortylove_migrator",
        "SET ROLE fortylove_claim_writer",
        "ALTER TABLE court_occupancy OWNER TO fortylove_app",
        "CREATE TABLE public.privilege_test(id integer)",
        "SET session_replication_role = replica",
    ):
        sql(operation, "42501")
    assert sql("""SELECT NOT has_table_privilege(current_user,'court_occupancy',
               'SELECT WITH GRANT OPTION') AND NOT has_function_privilege(
               current_user,'public.sync_court_claim()', 'EXECUTE')""") == "t"
    # PostgreSQL may warn and grant nothing when the grantor has SELECT only.
    grant = subprocess.run(PSQL + ["-U", APP], input="GRANT UPDATE ON court_occupancy TO PUBLIC;",
                           capture_output=True, encoding="utf-8", timeout=10)
    assert grant.returncode != 0 or "WARNING" in grant.stderr
    assert sql("SELECT has_table_privilege(current_user,'court_occupancy','UPDATE')") == "f"
    print("PASS separate login, ledger SELECT, denied DML/DDL, grant, trigger and role boundaries")


def exercise():
    sql(BOOTSTRAP.read_text(encoding="utf-8"), role="postgres")
    def migrate(statement, expected_error=None):
        return sql(statement, expected_error, role=MIGRATOR)

    for version in range(1, 9):
        script, = MIGRATIONS.glob(f"V{version}__*.sql")
        migrate("BEGIN;\n" + script.read_text(encoding="utf-8") + "\nCOMMIT;")

    migrate("""INSERT INTO users(id,email,full_name) VALUES (900,'court@example.test','Test');
           INSERT INTO courts(id,name,sport) VALUES (900,'Scheduling fixture','padel')""")
    start, middle, end, later = ["2035-01-05 " + h + ":00+00" for h in ("10", "11", "12", "13")]
    migrate(match(901, start, end, "completed"))
    migrate(booking(middle, later))
    migrate("""INSERT INTO match_reservations(match_id,user_id,price_snapshot,payment_status)
           VALUES (901,900,8,'paid');
           INSERT INTO match_waitlist(match_id,user_id) VALUES (901,900)""")
    v9 = "BEGIN;\n" + next(MIGRATIONS.glob("V9__*.sql")).read_text(encoding="utf-8") + "\nCOMMIT;"
    snapshot = history(MIGRATOR)
    migrate(v9, "Existing booking and occupying match overlap")
    assert migrate("SELECT to_regclass('public.court_occupancy') IS NULL") == "t"
    assert snapshot == history(MIGRATOR)
    # Deliberately correct the disposable fixture, then compare all original source columns.
    migrate("UPDATE bookings SET status='cancelled'")
    snapshot = history(MIGRATOR)
    migrate(v9)
    assert snapshot == history(MIGRATOR)
    # A V9 database may contain an outstanding offer when the application is stopped.
    migrate("UPDATE match_waitlist SET status='offered' WHERE match_id=901")
    before = migrate("SELECT to_jsonb(w) FROM match_waitlist w WHERE match_id=901")
    paid = migrate("SELECT to_jsonb(r) FROM match_reservations r WHERE match_id=901")
    migrate("BEGIN;\n" + next(MIGRATIONS.glob("V10__*.sql")).read_text(encoding="utf-8") + "\nCOMMIT;")
    assert sql("SELECT offer_id IS NOT NULL FROM match_waitlist WHERE match_id=901") == "t"
    assert sql("SELECT to_jsonb(w)-'offer_id' FROM match_waitlist w WHERE match_id=901") == before
    assert sql("SELECT to_jsonb(r) FROM match_reservations r WHERE match_id=901") == paid
    sql("UPDATE match_waitlist SET offer_id=NULL WHERE match_id=901", "23514")
    print("PASS V10 backfills existing offer and preserves queue and payment records")
    queue_before = sql("SELECT to_jsonb(w) FROM match_waitlist w WHERE match_id=901")
    migrate("BEGIN;\n" + next(MIGRATIONS.glob("V11__*.sql")).read_text(encoding="utf-8") + "\nCOMMIT;")
    assert sql("SELECT to_jsonb(w)-'lifecycle_id' FROM match_waitlist w WHERE match_id=901") == queue_before
    assert sql("SELECT to_jsonb(r)-'lifecycle_id' FROM match_reservations r WHERE match_id=901") == paid
    for table in ("match_waitlist", "match_reservations"):
        assert sql(f"SELECT lifecycle_id IS NOT NULL FROM {table} WHERE match_id=901") == "t"
    print("PASS V11 assigns identities and preserves existing offer and paid participation")
    permissions()
    assert sql("SELECT count(*) FROM court_occupancy WHERE match_id=901") == "1"
    sql(booking(middle, later), "court_occupancy_no_overlap")
    sql(booking(end, later))
    sql("UPDATE bookings SET status='cancelled'")
    sql("UPDATE matches SET status='cancelled' WHERE id=901")
    assert sql("SELECT count(*) FROM court_occupancy") == "0"
    print("PASS migration conflict abort, exact history preservation, partial and adjacent intervals")

    sql(match(902, start, end, "draft"))
    sql(match(903, start, end, "draft"))
    contend(booking(start, end), booking(start, end))
    assert sql("SELECT count(*) FROM bookings WHERE status='confirmed'") == "1"
    sql("UPDATE bookings SET status='cancelled'")
    contend(booking(start, end), publish(902))
    assert sql("SELECT status FROM matches WHERE id=902") == "draft"
    sql("UPDATE bookings SET status='cancelled'")
    contend(publish(902), publish(903))
    assert sql("SELECT count(*) FROM court_occupancy") == "1"
    sql("UPDATE matches SET status='cancelled' WHERE id=902")
    contend(publish(903), booking(start, end), commit=False)
    assert sql("SELECT status FROM matches WHERE id=903") == "draft"
    assert sql("SELECT count(*) FROM court_occupancy WHERE booking_id IS NOT NULL") == "1"
    print("PASS booking/booking, booking/publication, publication/publication and rollback handoff")

    contend("UPDATE courts SET is_available=false WHERE id=900", publish(903),
            expected_error="court_unavailable")
    assert sql("SELECT count(*) FROM court_occupancy") == "1"
    sql(booking(end, later), "court_unavailable")
    sql(publish(903), "court_unavailable")
    sql(f"UPDATE bookings SET starts_at='{end}',ends_at='{later}' WHERE status='confirmed'", "court_unavailable")
    sql("UPDATE bookings SET status='cancelled'")
    sql("UPDATE courts SET is_available=true WHERE id=900")
    sql(publish(903))
    sql(f"UPDATE matches SET starts_at='{middle}',ends_at='{later}' WHERE id=903")
    assert sql(f"SELECT starts_at='{middle}' FROM court_occupancy WHERE match_id=903") == "t"
    sql(f"UPDATE matches SET starts_at='{start}',ends_at='{end}' WHERE id=903")
    sql(f"UPDATE matches SET ends_at='{middle}',status='completed' WHERE id=903", "completed_match_interval")
    sql("UPDATE matches SET status='completed' WHERE id=903")
    sql(booking(middle, end), "court_occupancy_no_overlap")
    sql(booking(end, later))
    assert sql(f"SELECT ends_at='{end}' FROM court_occupancy WHERE match_id=903") == "t"
    print("PASS closure, release, original completion interval and end-time reuse")

    original = "2035-01-06 10:00+00"
    original_end = "2035-01-06 11:00+00"
    target = "2035-01-06 12:00+00"
    target_end = "2035-01-06 13:00+00"
    sql(match(904, original, original_end, "published"))
    sql("""INSERT INTO match_reservations(match_id,user_id,price_snapshot,payment_status)
           VALUES (904,900,8,'paid');
           INSERT INTO match_waitlist(match_id,user_id) VALUES (904,900)""")
    participants = """SELECT to_jsonb(r) FROM match_reservations r WHERE match_id=904;
                      SELECT to_jsonb(w) FROM match_waitlist w WHERE match_id=904"""
    participation_before = sql(participants)
    match_before = sql("SELECT to_jsonb(m) FROM matches m WHERE id=904")
    claim_before = sql("SELECT to_jsonb(c) FROM court_occupancy c WHERE match_id=904")
    move = f"UPDATE matches SET starts_at='{target}', ends_at='{target_end}' WHERE id=904"
    competing_booking = booking(target, target_end)

    contend(competing_booking, "BEGIN; UPDATE matches SET description='rollback marker' WHERE id=904; " + move + "; COMMIT;")
    assert sql("SELECT to_jsonb(m) FROM matches m WHERE id=904") == match_before
    assert sql("SELECT to_jsonb(c) FROM court_occupancy c WHERE match_id=904") == claim_before
    active_target_bookings = f"""FROM bookings WHERE court_id=900
                                    AND starts_at='{target}' AND status='confirmed'"""
    assert sql("SELECT count(*) " + active_target_bookings) == "1"
    sql("UPDATE bookings SET status='cancelled' WHERE id IN (SELECT id " + active_target_bookings + ")")
    bookings_before = sql("SELECT to_jsonb(b) FROM bookings b ORDER BY id")

    contend(move, competing_booking)
    assert sql("SELECT to_jsonb(b) FROM bookings b ORDER BY id") == bookings_before
    assert sql(f"""SELECT count(*) FROM court_occupancy WHERE court_id=900
                   AND tstzrange(starts_at,ends_at,'[)') && tstzrange('{target}','{target_end}','[)')""") == "1"
    assert sql(f"""SELECT c.starts_at=m.starts_at AND c.ends_at=m.ends_at
                   AND m.starts_at='{target}' AND m.ends_at='{target_end}'
                   FROM court_occupancy c JOIN matches m ON m.id=c.match_id WHERE m.id=904""") == "t"
    assert sql(participants) == participation_before
    print("PASS booking versus published match edit in both commit orders, SQLSTATE 23P01 and consistent rollback")


if __name__ == "__main__":
    env = dict(os.environ, POSTGRES_PASSWORD=secrets.token_urlsafe(36))
    subprocess.run(["docker", "run", "-d", "--rm", "--network", "none", "--name", NAME,
                    "--tmpfs", "/var/lib/postgresql/data", "-e", "POSTGRES_PASSWORD",
                    "postgres:16-alpine"], env=env, check=True, stdout=subprocess.DEVNULL)
    try:
        for _ in range(80):
            if subprocess.run(["docker", "exec", NAME, "pg_isready", "-h", "127.0.0.1"],
                              stdout=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(0.25)
        exercise()
    finally:
        subprocess.run(["docker", "stop", NAME], check=True, stdout=subprocess.DEVNULL)
