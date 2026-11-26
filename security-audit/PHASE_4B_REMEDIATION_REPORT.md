# Phase 4B matchmaking and waiting-list integrity

Branch `fix/matchmaking-waitlist-integrity` starts at Phase 4A commit `5cebfacc814c8c290e2041e16a0998c4281c5846`. V10 adds an issuance identifier to the waiting list and backfills currently offered rows.

## Findings and implementation

**F04.** The dedicated cancel route cleaned up participant rows, while a status PATCH could cancel the same match without cleanup. Acceptance read a potentially stale offer before locking the match. Member withdrawals, queue mutations, scheduled expiry and payment updates could also race. All match mutations now serialize on the existing PostgreSQL pessimistic match-row lock before reading mutable child state. Reservation-ID routes first look up only the scalar parent ID. Cancellation through either route cancels confirmed reservations and closes active queue entries in the same transaction. Completion closes the queue and retains attendance, payment evidence and the original V9 occupancy interval. Completed matches are terminal, including through the dedicated cancel route.

**F05.** The previous expiry and full-seat branches flushed an update and threw a runtime exception before commit. Spring rolled the update back. They now return a rejected result, commit the expiry and any promotion together, and let the controller raise the existing HTTP 400 after the service transaction returns. Unexpected database failures still roll back the transaction.

## Queue behavior

- Waiting members are ordered by original joining time then entry ID. One outstanding offer per match is issued when the match is published, has a future start and has space.
- Acceptance checks the authenticated member's entry, expiry, match state, time and remaining capacity under lock. Success marks the entry accepted. Direct join also retires that member's active queue entry. An accepted member who later cancels can rejoin the queue.
- Direct joins retain the existing first-available-seat policy. An offer does not guarantee a seat. Accepting after the last seat is taken persists expiry without issuing a replacement offer.
- Decline persists declined. Withdrawal persists removed. Expiry persists expired. Each eligible handoff, successful acceptance with remaining space, and published capacity increase can promote the next waiting member. Repeating a processed request cannot confirm another seat or advance the queue twice.
- The expiry job selects scalar candidate match IDs, locks in ascending order, and rechecks current entries before updating them. Payment marking uses the same parent lock and retains the existing payment rules.

## Files changed

Production files under `backend/src/main/kotlin/com/serva/booking/matchmaking/` are `MatchService.kt`, `MatchController.kt` `MatchEntities.kt` and `MatchModels.kt`. Tests under the corresponding test package are `MatchServiceTest.kt` and `MatchLifecycleTest.kt`. This report is `security-audit/PHASE_4B_REMEDIATION_REPORT.md`.

## Verification and rollout

The lifecycle suite uses synthetic members and independently committed service transactions on disposable PostgreSQL 16. It checks concurrent claims on the last seat, simultaneous member cancellations, duplicate acceptance, admin cancellation versus acceptance, scheduler versus acceptance, deterministic single promotion, persisted expiry/full rejection after HTTP 400, repeated decline, completion, access boundaries, capacity edits, the start-time cutoff and unexpected database failure rollback.

Before staging rollout, drain old service instances and scheduled workers so every writer follows the same lock order. Inventory historical terminal matches with active entries and duplicate active offers using read-only aggregates. Existing anomalies require separate review. Direct SQL and integrations that bypass the service must follow the same locking protocol. Monitor lock waits and expiry-job duration, especially with a large expiry backlog. Verify member and staff workflows through the actual staging ingress with synthetic identities.

| Final local verification | Result |
| --- | --- |
| Complete backend suite, including 18 new lifecycle tests | 86 passed, 0 failed, 0 skipped |
| Executable Spring Boot JAR | Built successfully |
| Frontend tests and ESLint | 8 tests passed and ESLint exited 0 |
| Vite production build | Passed with the existing bundle-size warning |
| Independent PostgreSQL scheduling and privilege harness | Passed migration conflict rollback, history, concurrency, court closure, early completion, and restricted-role checks |

## Offer identity and stale retries

A member can rejoin using the same waiting-list row. The old endpoints addressed that row by member and match, so a delayed action could consume its next offer. Each promotion now stores a new random UUID. A UUID can be carried unchanged by browsers and identifies an issuance independently of other members' queue versions. The member response includes offerId only for active offers. Both POST actions require a JSON body with offerId. The backend checks the signed-in member, match, active state and expected UUID under the parent match lock before mutation. Replayed or superseded actions receive 409. Missing or malformed IDs receive 400. Existing expiry and capacity rules still run after the identity check.

V10__waitlist_offer_identity.sql adds a nullable UUID, assigns a distinct UUID to each pre-existing offered row, requires identity on offered rows, and adds a partial unique index. Other rows retain their history. The separate PostgreSQL harness migrated a V9 fixture with an outstanding offer and a paid reservation and compared all pre-existing column values afterward.

The member UI sends the identifier from the rendered card and gives English or Arabic refresh guidance on conflict. The replay regression concurrently submits the first issuance's accept and decline after the same member receives a second offer. Both return 409. Independent reads verify identical queue rows, reservation and payment fields, and capacity. Acceptance of the second issuance then succeeds. Local verification covered HTTP and the production build; bilingual browser verification remains a staging check.

Additional files are `backend/src/main/resources/db/migration/V10__waitlist_offer_identity.sql`, `backend/src/test/postgresql/court_scheduling.py`, and `frontend/src/pages/MyMatchmaking.jsx`.

Coordinate migration and client cutover. Drain all older API instances and schedulers before migrating, including during rollback. An older handler can ignore the expected ID and an older worker cannot reliably assign fresh IDs. Run V10 with the migrator role during the agreed maintenance window, allow time for the backfill and index build, and release the matched backend and UI together. Old open tabs and external clients must reload or update before submitting offer actions. Verify stale tabs, a pre-existing active offer, concurrent retries, and both languages in staging. Keep offer request bodies out of access logs. No persistent migration was performed in local verification.

## Delayed withdrawal after promotion

The previous DELETE handler accepted both waiting and offered entries and promoted the next member on removal of an offer. It could therefore apply an old withdrawal decision to a newer offer. The handler now reads the signed-in member's entry after acquiring the match lock. Waiting returns 200 and removes the entry. Offered returns 409 before any write, and declining requires the existing UUID-bound POST. An absent or already inactive entry retains the existing 400 response. The UI uses localized refresh guidance on 409.

This correction touched MatchService.kt, MatchLifecycleTest.kt, frontend/src/pages/MyMatchmaking.jsx and this report. It adds no migration. Three regression tests cover a prepared DELETE delivered after promotion, a concurrent seat cancellation and withdrawal, and valid, repeated and post-cancellation withdrawals. Independent database reads compare ordered queue rows including UUIDs, complete reservation rows including payment fields, and capacity across the 409. The current UUID can still decline the offer. At the withdrawal milestone, disposable verification passed all 83 backend tests including Clerk and admin regressions, all eight frontend tests, lint, both builds and the independent PostgreSQL V9/V10 scheduling and privileges harness.

### Findings from the withdrawal review (subsequently addressed below)

The status guard distinguishes waiting from offered. It cannot distinguish two waiting periods on the same reused entry: an old DELETE arriving after withdrawal and re-enrollment can remove the new waiting entry. The same lifecycle reuse occurs for reservations. If a reservation is cancelled and later reconfirmed with the same ID, a delayed member cancellation within the cutoff or an authorized staff payment update can affect the reconfirmed reservation. Direct join also acts on current availability and may consume a seat after an earlier join intent has become stale. Match locks serialize these operations, but their APIs carry no expected enrollment or reservation generation. The lifecycle correction below addresses the waiting-period, cancellation and payment cases. Direct join remains an operation on current availability.

In staging, use two tabs: leave one showing a waiting entry, promote it from another session, then withdraw from the stale tab and confirm the localized conflict guidance. Refresh and decline the current offer, checking exactly one handoff. Exercise both languages with the matched backend and frontend.


## Waiting membership and reservation lifecycle correction

Waiting rows and reservation rows are reused for a given member and match. Row IDs alone could therefore target a later enrollment. V11 adds a non-null UUID lifecycle_id and unique constraint on each table. Existing rows each receive one identifier, including terminal rows. The service issues a new identifier on every re-enrollment and on either route to reconfirming a cancelled seat. A promotion only rotates its separate V10 offer UUID. No booking, identity, price, status or existing payment value is rewritten by the migration. Reconfirmation now retains payment status, timestamp, staff attribution and price snapshot; explicit authorized payment changes remain available.

Member waiting-list and reservation responses, and staff reservation lists and payment responses, carry lifecycleId. The member sends it in the JSON body of waiting-list DELETE and reservation cancel POST. The staff payment PATCH sends it alongside paid. Spring rejects missing or malformed UUIDs with 400. After authentication and ownership/role checks, a generation mismatch under the parent lock returns 409 before mutation. A caller must fetch the current state before acting again. Offer accept and decline still use offerId.

### Regression evidence

The separate PostgreSQL 16 harness ran V11 as migrator on seeded V10 rows and read them as the runtime role. Comparing the pre-existing columns verified preservation of the issued offer and paid reservation. Existing privilege, occupancy, migration rollback and independent scheduling checks passed. Fresh full-suite databases exercised normal inserts and updates under the restricted role.

New HTTP/service regressions cover withdrawal after rejoining, concurrent stale withdrawals with independent queue/attendance/payment snapshots, stale member cancellation racing a stale staff payment after reconfirmation, rejection of malformed/missing IDs, wrong-owner and member/admin boundaries, and successful actions using the current IDs. Both direct join and offer-based reconfirmation have payment-preservation and identity-rotation coverage.

### Remaining scope and rollout

Direct join and join-waitlist express fresh intent against current match availability. A delayed create/join retry after a subsequent cancellation can still create a fresh enrollment. Those routes do not take a previous enrollment identity. If the club requires exactly-once creation across intervening actions, review client-generated idempotency keys separately. Staff edits, including two payment commands within the same lifecycle, serialize on the match lock but do not detect stale edits within that lifecycle. Match IDs are stable, terminal matches cannot be reopened through the reviewed status transitions, and the worker rechecks offered state under lock.

Drain old API instances, background jobs and in-flight mutations before migration. Old writers do not rotate V11 identities. The volatile defaults and unique constraints can rewrite tables and build indexes under lock; measure time, disk space and lock duration on a representative disposable clone. Release the frontend, backend and external clients together. Verify the ingress forwards JSON bodies on DELETE. In staging exercise stale and current tabs for a member and staff user, both reconfirmation paths, both languages and the payment display. Review carried-forward paid records with club staff. Rollback requires coordinated writer shutdown; avoid mixed versions.

### Files for this correction

- Backend matchmaking package: MatchEntities.kt, MatchModels.kt, MatchService.kt and MatchController.kt.
- Flyway: backend/src/main/resources/db/migration/V11__match_participation_lifecycles.sql.
- Tests: MatchLifecycleTest.kt, MatchServiceTest.kt and backend/src/test/postgresql/court_scheduling.py.
- UI: frontend/src/pages/MyMatchmaking.jsx and frontend/src/admin/AdminMatchmakingPage.jsx.
- Documentation: security-audit/PHASE_4B_REMEDIATION_REPORT.md.


### Final review and recovery

Member cancellation and staff payment conflicts include refresh guidance in English and Arabic. Browser verification through the deployed ingress remains outstanding. Before migration verify a restorable backup on an isolated clone and record baseline counts and payment aggregates. If a migration fails, keep writers drained, inspect Flyway history and schema on the failed environment, and verify the last committed migration before retrying. V10 and V11 are separate transactional migrations. If V11 fails after V10 commits, retain V10 and fix forward. After new writers have served traffic, keep the new identifiers and payment evidence during recovery; validate any restore on a clone and reconcile later writes before reopening traffic.
