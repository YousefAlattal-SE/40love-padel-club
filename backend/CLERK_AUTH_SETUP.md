# Clerk authentication setup

The backend Clerk verifier accepts Clerk **session tokens** from the configured Clerk instance.

## Clerk Dashboard

1. Enable email/password sign-up and sign-in, and require email verification at sign-up.
2. Enable Google as a social connection. Apple is not used by this application.
3. In **User & authentication → User model → First and last name**, enable first and last name for sign-up (required is recommended). Clerk's `<SignUp />` form follows these instance settings, and the backend reads the resulting canonical values from Clerk's Backend API.
4. Under **Sessions → Customize session token → Claims**, add this custom claim and save:

   ```json
   {
     "aud": "fortylove-api"
   }
   ```

   Clerk's default session token does not include `aud`; the application rejects the token unless this custom session claim is present and exactly matches `CLERK_API_AUDIENCE`.
5. `azp` is a default session claim containing the frontend origin. Clerk may omit it when the originating request has no `Origin`; this application rejects a missing value. Browser-originated Clerk requests must retain their origin.
6. In **Domains**, copy the exact Frontend API URL as `CLERK_ISSUER`. It must be the HTTPS origin only, with no trailing slash or path. The backend derives the JWKS URL by appending `/.well-known/jwks.json`. Clerk's session JWT algorithm is restricted to RS256 by the backend.
7. Use separate development and production instances/origins. Do not include wildcard origins in `CLERK_AUTHORIZED_PARTIES`.

## Backend environment

Set these values in the backend process environment or secret manager. Do not put secret values in this file, frontend variables, or source control.

```text
CLERK_AUTH_ENABLED=true
CLERK_ISSUER=https://<exact-clerk-frontend-api-url>
CLERK_API_AUDIENCE=fortylove-api
CLERK_AUTHORIZED_PARTIES=http://localhost:5173,https://<exact-production-origin>
CLERK_SECRET_KEY=<backend-only-secret-manager-value>
JWT_SECRET=<existing-legacy-jwt-secret-during-transition>
```

For local development, `JWT_SECRET` may be omitted: the backend creates and reuses a random
local-only signing key at `%USERPROFILE%\\.fortylove\\local-jwt-secret` on Windows (or
`~/.fortylove/local-jwt-secret` elsewhere). This keeps legacy JWTs stable across local
restarts without putting a secret in source control. With the `prod` or `production`
Spring profile active, the backend refuses to start unless `JWT_SECRET` is explicitly set.

Set only the Clerk **Publishable Key** in the frontend as `VITE_CLERK_PUBLISHABLE_KEY`. The migration file `V7__clerk_auth.sql` exists in source. Its applied status must be checked in the target database's `flyway_schema_history`; this source tree does not establish whether the database has run it. Spring Boot's configured Flyway startup can apply pending migrations automatically, so do not start the backend against the target database until V7's history is verified and any required migration has approval.

The Clerk Secret Key is used only by the backend to retrieve the authenticated user's canonical profile for first-time provisioning. User ID, email, and name are never accepted from a bootstrap request body. The optional registration phone value is read from Clerk's Backend API `unsafe_metadata` and is never used for identity or authorization. Database role always comes from PostgreSQL.

`CLERK_AUTH_ENABLED=false` keeps the existing legacy filter active. When enabled, the backend temporarily accepts both the legacy JJWT and verified Clerk session JWT flows. The legacy flow is retained until the Clerk integration has passed its end-to-end checks.

## Database environment

The backend reads its PostgreSQL connection settings from the process environment:

- `DB_URL` is optional and defaults to `jdbc:postgresql://localhost:5433/fortylove` for local development.
- `DB_USERNAME` and `DB_PASSWORD` are required. Set them to the credentials for the local or deployed database through the process environment or a secret manager; do not commit or log their values.

The default URL preserves the existing local development endpoint. No database credentials are included in source configuration.

## Enrollment after retiring legacy registration

The member website registers new identities through Clerk. After sign-in it calls
`POST /api/auth/bootstrap`. For a new subject, the backend obtains the primary
email and its verification status from Clerk. It creates a member record only
after verifying ownership. Returning users are identified by their stored Clerk
subject. A different subject presenting an existing email receives a conflict.

The former `POST /api/auth/register` password enrollment handler has been
removed. New integrations must use Clerk signup. Existing password-backed
members and administrators may still use `POST /api/auth/login`; the server
loads the active account and its privileges from PostgreSQL. A deployment with
Clerk disabled can continue authenticating existing legacy users but cannot
enroll new users through the retired route.

This change requires no database migration. Historical email collisions need
individual review: verify ownership and account history before approving any
separate migration. Never link users or transfer an administrator role solely
because email addresses match.

Before rollout, inventory external callers of the retired registration endpoint.
With staging test identities, exercise Clerk signup and repeat sign-in, an
existing-email conflict, and legacy member and staff sign-in. Verify one local
row per Clerk subject and the expected authorization on admin endpoints.
