# 40 Love Padel Club & Cafe — Booking System

40 Love Padel Club & Cafe is a Padel club website and booking system for Amman, Jordan, with three courts.

## Frontend

The frontend now has two layers:

- A public, single-page 40 Love Padel Club & Cafe homepage at `/`.
- The existing authenticated booking experience at `/book` plus `/bookings`.

### Homepage features

- 40 Love green-and-teal visual system with coordinated light and dark themes.
- Responsive sticky glass navbar and mobile drawer.
- EN / AR language toggle with RTL layout switching.
- Dark / light theme toggle.
- Live Amman opening-status badge using `Asia/Amman` timezone logic.
- Hero section, booking CTAs and animated statistics.
- Three Padel court cards, live hourly and two-hour pricing, and a bento feature grid.
- Gallery lightbox, rotating testimonials, events/community section and FAQ accordion.
- Location/contact area with Google Maps directions link, WhatsApp action and contact form placeholder.
- Floating mobile Book Now CTA after scrolling.
- SEO title, description, Open Graph metadata and favicon.
- Framer Motion animations throughout the marketing page.

## Editable content

Homepage copy, pricing, opening hours, contact details, FAQ content and gallery assets are centralized in:

`frontend/src/content.js`

This is the main file to edit before launch.

## Booking connection

Booking CTAs route to `/book`, the authenticated court availability and booking flow.

Bookings are available every day from 7:00 AM to 3:00 AM the following day. Daytime prices are 25 JOD per hour or 45 JOD per two hours; evening prices are 35 JOD per hour or 60 JOD per two hours. The rate band follows the booking start time.

## Install and run

From `frontend/`:

```bash
npm install
npm run dev
```

The project uses Tailwind CSS v4 through the official Vite plugin and Framer Motion for React animations.

## Notes

The homepage and courts pages use local 40 Love Padel Club & Cafe images in `frontend/src/assets`.

The contact form saves messages through the backend; the location page links to Google Maps.


## Admin dashboard

The admin dashboard is part of the existing React + Spring Boot application. New member sessions use Clerk, while the backend maps each verified Clerk subject to the existing PostgreSQL `users` row. PostgreSQL supplies the role on every API request; the legacy JWT path remains available during the Clerk transition.

### Admin pages

- `/admin/login` — dedicated administrator sign-in
- `/admin` — operational summary, bookings today, upcoming bookings, customer count, court availability and recorded revenue
- `/admin/bookings` — search bookings, update status and record / undo front-desk payments
- `/admin/courts` — turn a court's availability on or off
- `/admin/pricing` — update daytime/evening hourly and two-hour rates
- `/admin/customers` — customer list and booking activity

The `/api/admin/**` backend routes are protected with `ROLE_ADMIN` in Spring Security. Public site pricing reads from `GET /api/pricing`; only admin users can change the database rates. The booking calculator already reads the same `pricing` table, so future booking quotes use the saved rates. The homepage and public pricing/courts pages load those rates from the backend, with config defaults used only if the API is unavailable.

### Set up your first administrator

1. Start PostgreSQL and the Spring Boot backend as you normally do.
2. Set up Clerk as described in [`backend/CLERK_AUTH_SETUP.md`](backend/CLERK_AUTH_SETUP.md), then register a new account on the website using the email you want for the administrator. Public registration intentionally creates `member` accounts, not admins. Existing PostgreSQL test users are not linked automatically.
3. In the dedicated `fortylove` PostgreSQL database, promote only your own account. Replace the example email with your actual account email:

   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE email = lower('admin@example.com');
   ```

4. Open `/admin` or refresh the admin page. Spring Security reads the current role from PostgreSQL on each API request; the frontend profile refreshes when the Clerk session is bootstrapped.

Do not add a public admin registration endpoint or share the admin credentials. Keep database credentials, `JWT_SECRET`, and `CLERK_SECRET_KEY` private. Use environment variables or a secret manager; only the Clerk publishable key belongs in frontend configuration.

### Run locally

Terminal 1 (backend), from `backend/`:

```powershell
.\gradlew.bat bootRun
```

Terminal 2 (frontend), from `frontend/`:

```powershell
npm install
npm run dev
```

The frontend Vite proxy forwards `/api` requests to `http://localhost:8080`.

### Build the deployable JAR

Use Java 21 and a Node/npm version supported by the locked Vite version. From a clean checkout, run `npm ci` in `frontend` and supply the target environment’s `VITE_CLERK_PUBLISHABLE_KEY` before building. This public value is compiled into the website. Configure backend credentials separately at runtime.

Run `./gradlew bootJar` in `backend` (on Windows, `.\gradlew.bat bootJar`). Gradle runs the frontend production build into a dedicated generated directory and packages its contents under `BOOT-INF/classes/static/` in the executable JAR in `backend/build/libs/`. The historical static snapshot is excluded from Gradle resources. When adding a React route, update `FrontendRoutes.kt` and the deployment regression test so that direct links work.

### Clerk widget localization

The member login, registration and staff login share the Arabic Clerk localization. Clerk renders the “Secured by” attribution and “Development mode” notice directly in its own footer. The currently installed localization schema exposes no keys for either footer string. Both remain visible in Arabic mode. Recheck these two strings when upgrading Clerk. [Clerk branding component](https://github.com/clerk/javascript/blob/main/packages/ui/src/elements/Card/CardClerkAndPagesTag.tsx) · [Development notice](https://github.com/clerk/javascript/blob/main/packages/ui/src/elements/DevModeNotice.tsx)


## Database identities for local development and staging

The backend runs Flyway at startup by default. Configure two independent logins for the
same PostgreSQL 16 database. Use a dedicated cluster or review cluster-wide role names
and database access with the DBA first. The repository does not provision a Docker
Compose deployment. The PostgreSQL container bootstrap user is for administration only.

1. On a **new disposable** database called `fortylove`, connect with an authorized DBA
   and run `psql -X -v ON_ERROR_STOP=1 -d fortylove -f backend/db/bootstrap_roles.sql`.
   The script creates three roles and installs the extension in one transaction. It
   intentionally stops if any role name already exists. It restricts database CONNECT
   and temporary-object privileges previously granted to PUBLIC. Review other clients
   before considering this change on an existing installation.
2. Set independent credentials through your secret manager or use interactive psql
   commands `\password fortylove_app` and `\password fortylove_migrator`. Keep the
   trigger owner `fortylove_claim_writer` as NOLOGIN with no memberships.
3. Supply `DB_URL`, `DB_USERNAME=fortylove_app`, and `DB_PASSWORD` for the application
   pool. For startup migration, also supply `FLYWAY_USERNAME=fortylove_migrator` and
   `FLYWAY_PASSWORD`. The JDBC URL is shared. Spring validates the runtime session
   identity on each new connection. Keep the existing Clerk and JWT configuration.
   From `backend`, use `gradlew.bat bootRun` on Windows.
4. For staging with separated secrets, prefer a release job running a compatible
   Flyway version against `backend/src/main/resources/db/migration` as the migrator.
   Only after it succeeds, start the web service with `SPRING_FLYWAY_ENABLED=false`
   and the runtime credentials alone. Startup migration otherwise places both secrets
   in the backend process. Keep either login out of frontend/Vite variables and logs.
5. For an existing V8 database, inventory ownership, ACLs, role memberships, schema
   privileges, and Flyway history before rollout. The migrator must control application
   objects and Flyway history. Rehearse any necessary object-specific ownership changes
   on a disposable clone first. Preserve IDs and history. Avoid blanket reassignment
   of a Docker bootstrap or shared database owner's objects. Check for existing booking,
   published-match and completed-match conflicts, and measure V9's write-lock window.
   Obtain separate approval before any migration on a persistent database.

**Privilege model.** The runtime can read court occupancy. Its source-table grants
cover users, bookings, matches, reservations, waiting lists, contact messages, court
availability and pricing. V9 lists the exact tables, writable columns and sequences.
It grants no source deletes or Flyway history access. Flyway owns the ledger. The
NOLOGIN function owner has ledger DML and the court permissions needed for a row lock
and eligibility check. Its temporary schema creation grant is revoked within V9.
Only the migrator can switch to the function owner under the supplied bootstrap.

**Verification.** Run `python backend/src/test/postgresql/court_scheduling.py` with Docker
available. It launches and removes a network-isolated PostgreSQL 16 database. For the
backend suite, configure a **fresh disposable** PostgreSQL database with the above roles
and secrets, then run `gradlew.bat test --rerun-tasks` from `backend`. Verify the role
boundary again after changes to default privileges or database ownership. In staging
check member booking, staff publication, court closure, early completion and slot
availability with approved test accounts.
