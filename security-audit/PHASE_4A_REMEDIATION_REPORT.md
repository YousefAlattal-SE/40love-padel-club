# Phase 4A authentication, API limits and infrastructure

Reviewed on 23 November 2026 on `fix/auth-api-infrastructure`, based on Phase 3 commit `66949798219a11eee2547acdfe2040f5386eab46`. Application regressions passed on disposable PostgreSQL 16. Production acceptance is pending the environment checks below.

| Finding | Cause | Change and remaining exposure |
| --- | --- | --- |
| F06 API resource limits | Login, contact submission and list queries had no application traffic budget. Match list enrichment scaled with result count. | A filter caps mutation bodies at 32 KiB, including streams without a declared length. Per direct peer and fixed minute, login, contact submission and bootstrap each allow 20 POST requests. Other API traffic shares a budget of 240. Over-limit responses use 413 or 429 with Retry-After for rate limits. Counters are bounded per process. The ingress still needs shared quotas and timeouts. |
| F07 PostgreSQL exposure | A localhost JDBC URL places no restriction on Docker host publication. | Fresh development Compose installations publish only on IPv4 loopback. The existing ordinary development container was observed on IPv4 and IPv6 wildcard interfaces at port 5433. Its exposure remains open pending an approved cutover. |
| F08 JWT trust | Legacy validation lacked required token purpose and a bounded lifetime. Omitting Clerk audience configuration could admit tokens intended for another consumer. | Legacy tokens require the application issuer, intended audience, issue time and expiry. Default validity is 30 minutes with a configurable maximum of 60. Only the explicit standalone local profile permits file-backed key fallback. Clerk retains RS256, issuer, time and exact authorized-party validation. A configured audience must match. Without one, only tokens lacking an audience are accepted, for a Clerk development issuer or a custom issuer explicitly approved for that mode. |
| F09 browser and transport security | The deployed ingress and browser policy were unspecified. | APIs default to same-origin. An exact HTTPS public origin can be configured for the deployed frontend. The application ignores forwarded headers, sets same-origin referrer policy, restricts objects, base URLs and ancestor framing, and retains Spring Security HTTPS HSTS handling. TLS termination, shared caching and the full Clerk-compatible script policy require staging verification. |

## API and rollout compatibility

Public and admin match lists, admin bookings, customers and contact messages use stable server-side pagination. The default size is 25, maximum 100, and page indexes run from 0 to 10000. List responses remain arrays. Clients previously expecting every row must request additional pages. Match list counts are retrieved in the list query. Overview totals cover the full dataset while the recent-bookings query retrieves six rows. Staff search text travels in POST bodies so contact details entered into the search UI stay out of URLs. Access to these routes requires ADMIN. Existing GET list routes remain available. Member-specific histories and authorized per-match participant detail still need volume monitoring.

Legacy users with pre-change tokens must sign in again. Coordinate this with existing member, staff and external clients. Set a dedicated JWT_SECRET through the deployment secret store. Configure the Clerk issuer, exact authorized parties and API audience against the actual staging instance. Use CLERK_ALLOW_AUDIENCELESS only after confirming the issuer is dedicated to this trust boundary. No enrollment, identity linking, account migration or schema change is part of Phase 4A.

## Files changed

| Area | Repository paths |
| --- | --- |
| Deployment and setup | `README.md`, `compose.dev.yaml`, `backend/CLERK_AUTH_SETUP.md`, `backend/src/main/resources/application.properties` |
| Authentication under `backend/src/main/kotlin/com/serva/booking/auth/` | `ClerkJwtConfiguration.kt`, `JwtService.kt`, `JwtSecretResolver.kt` |
| API configuration under the same Kotlin package root | `config/ApiLimitsFilter.kt`, `config/ApiPage.kt`, `config/SecurityConfig.kt` |
| Controllers and queries under the same package root | `admin/AdminController.kt`, `contact/ContactMessageController.kt`, `matchmaking/MatchController.kt`, `matchmaking/MatchEntities.kt`, `matchmaking/MatchService.kt` |
| Backend tests under `backend/src/test/kotlin/com/serva/booking/` | `auth/ClerkJwtConfigurationTest.kt`, `auth/LegacyTrustTest.kt`, `config/ApiBoundsTest.kt` |
| UI under `frontend/src/` | `components/PageControls.jsx`, `admin/AdminMatchmakingPage.jsx`, `admin/AdminPages.jsx`, `pages/Matchmaking.jsx` |
| Development proxy and regression test | `frontend/vite.config.js`, `frontend/tests/viteProxy.test.js` |
| Audit | `security-audit/PHASE_4A_REMEDIATION_REPORT.md` |

## Verification

| Check | Result |
| --- | --- |
| Gradle offline clean task execution with `--rerun-tasks test bootJar` | PASS. 68 of 68 backend tests passed and the executable JAR built against disposable PostgreSQL with separate runtime and migrator credentials. |
| Synthetic authentication and API regressions | PASS within the backend suite. Coverage includes invalid token trust and signatures, member/admin authorization, bounded staff paging, invalid sizes, declared and streaming oversize bodies, quota exhaustion, Retry-After, ignored client-supplied forwarding information, CORS and HTTPS response headers. |
| Independent PostgreSQL scheduling harness | PASS. Migration conflict abort, history preservation, interval boundaries, three concurrency pairings, rollback handoff, closure, cancellation/release and early completion all passed. Direct occupancy writes and privilege escalation were denied. |
| Disposable development Compose instance | PASS. Docker published the database on IPv4 loopback and initialization created all three Phase 2 roles. The check used a separate project, volume and port. |
| Frontend Node regression suite | PASS, 8 of 8. Seven cover booking phone handling and one checks the configured Vite proxy over HTTP. |
| ESLint and independent Vite production build | PASS. Vite emitted a bundle-size warning for the main JavaScript chunk. |
| Real Clerk browser flows, production network and edge behavior | NOT VERIFIED during Phase 4A. |

## Development proxy correction and HTTP verification

Vite's string-form proxy rewrote Host to the upstream address while forwarding the browser's original Origin. Spring saw different origins and returned 403 before authentication. The development proxy now uses the same upstream target with explicit `changeOrigin: false`. Spring CORS configuration, the production HTTPS origin allowlist and JWT validation were unchanged by this correction.

The automated frontend regression starts Vite with the repository configuration, routes it to an ephemeral loopback listener and checks the method, Host and Origin it receives. A separate HTTP run used the packaged Spring JAR, a fresh PostgreSQL 16 container, synthetic members and a local HTTPS signing-key endpoint. The application verified the returning Clerk test subject's RS256 signature and claims. The live run used ephemeral ports and changed only the proxy destination for isolation.

| HTTP check | Direct Spring | Through Vite |
| --- | --- | --- |
| Valid legacy credentials | 200, issued token | 200, issued token |
| Signed Clerk-format bootstrap for an existing linked member | 200, expected fixture member | 200, expected fixture member |
| Anonymous booking POST | 401 | 401 |
| Authenticated booking POST with invalid booking data | 400 | 400 |
| Foreign HTTPS origin POST | 403, no allow-origin header | 403, no allow-origin header |

Spring allowed both preflight and authenticated POST from the exact configured HTTPS origin (200 with the matching allow-origin header). It rejected preflight from a foreign origin and the HTTP version of the configured origin (403, no allow-origin). Vite answered a local-origin OPTIONS request with 204 and the matching origin. Its own middleware answered the foreign-origin OPTIONS with 204 and omitted allow-origin, so a browser cannot proceed on that preflight. The actual foreign POST was independently denied. These fixture tests cover the local proxy and application trust policy; hosted Clerk signup, the browser callback and production ingress remain staging checks.

## Required staging and production checks

1. Use disposable staging member and admin identities to exercise Clerk signup, verification, repeat sign-in, bootstrap, admin access and sign-out through the external hostname. Check legacy reauthentication after rollout and expiry. Verify the exact issuer, audience and allowed parties without retaining tokens.
2. Configure APP_PUBLIC_ORIGIN when the browser origin differs from the origin seen by Spring. Verify canonical HTTPS redirects, HSTS on external HTTPS responses, framing and MIME headers, allowed and denied CORS requests and private API cache behavior through the actual proxy/CDN. Ensure direct access cannot bypass the proxy. Observe a fuller CSP in report-only mode through all Clerk flows before enforcing script and frame source restrictions.
3. Configure ingress request deadlines, header and body limits, concurrency limits and shared route/principal quotas. Tune API_GENERAL_PER_MINUTE and API_SENSITIVE_PER_MINUTE under representative signup, booking and staff traffic. A proxy or shared network can aggregate many clients into one backend peer. Multiple replicas each have their own counters, and a fixed-minute boundary permits bursts.
4. Exercise bilingual paging and staff filters with multiple pages of synthetic data. Check external API clients for one-page assumptions and measure query latency on representative large datasets.
5. Inventory clients and volumes for the existing wildcard-bound PostgreSQL container, verify a backup restore and schedule its binding change. Verify IPv4 and IPv6 firewall rules, private routing, remote database TLS identity verification, backup access and separate serving/migration credentials in the intended environment. Repeat the scheduling harness on a disposable clone.
