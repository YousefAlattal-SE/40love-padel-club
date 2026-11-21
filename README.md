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
