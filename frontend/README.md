# 40 Love Padel Club & Cafe Frontend

React + Vite frontend for the 40 Love Padel Club & Cafe website and booking system.

## Stack

- React 19
- Vite
- Tailwind CSS 4 via `@tailwindcss/vite`
- Framer Motion
- React Router
- Axios
- date-fns
- Clerk React SDK for email/password and Google sign-in

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Main routes

`/` — public 40 Love Padel Club & Cafe homepage.

`/book` — authenticated court availability and booking flow.

`/bookings` — authenticated member booking history.

`/login` and `/register` — Clerk sign-in and sign-up for members. The optional phone field is stored as profile metadata in Clerk and copied to the app profile by the backend.

Set `VITE_CLERK_PUBLISHABLE_KEY` in the frontend environment before starting Vite. This is the Clerk publishable key; never put a Clerk Secret Key in frontend configuration. See [`backend/CLERK_AUTH_SETUP.md`](../backend/CLERK_AUTH_SETUP.md) for the Clerk Dashboard and backend environment configuration.

## Content config

Edit `src/content.js` to change brand copy, EN/AR content, opening hours, contact information, pricing, FAQs, testimonials and gallery assets.
