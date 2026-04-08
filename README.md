# MGSI BMS Superadmin

Admin and superadmin dashboard for the GreatWork Booking Management System.

Built with Next.js App Router, Better Auth, Prisma + PostgreSQL, Tailwind CSS, and optional Upstash Redis caching.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Prisma ORM + PostgreSQL
- Better Auth
- Upstash Redis (server-side cache)
- Supabase Storage (building/room/profile images)
- Nodemailer (transactional emails)

## Key Features

- Role-aware admin UI (`ADMIN`, `SUPERADMIN`)
- Route-based dashboard pages:
  - `/dashboard`
  - `/bookings`
  - `/branches`
  - `/rooms`
  - `/calendar`
  - `/reports`
  - `/users` (superadmin only)
  - `/profile`
  - `/settings`
- Booking approval and walk-in booking flows
- Email-based OTP password reset flow
- CSV/PDF export for bookings/reports
- Shared auth shell layout (sidebar + header)
- Redis caching for selected server actions (safe fallback when Redis env is missing)

## Prerequisites

- Node.js 20+
- PostgreSQL database
- npm (or yarn/pnpm/bun)

## Environment Variables

Create a `.env` file in project root.

Required core variables:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Redis (optional but recommended for caching):

```env
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."
```

Email + password reset:

```env
GMAIL_USER="your@gmail.com"
GMAIL_APP_PASSWORD="app-password"
FROM_EMAIL="no-reply@your-domain.com"
```

Supabase storage:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
```

Optional SMTP overrides (if not using Gmail defaults):

```env
HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
MAIL_PORT="587"
PORT="587"
SECURE="false"
```

Optional auth helpers:

```env
TRUSTED_ORIGINS="http://localhost:3000"
```

## Local Development

1. Install dependencies:

```bash
npm install
```

1. Generate Prisma client:

```bash
npx prisma generate
```

1. Run database migrations:

```bash
npx prisma migrate deploy
```

For local schema iteration, you can use:

```bash
npx prisma migrate dev
```

1. Start dev server:

```bash
npm run dev
```

1. Open:

`http://localhost:3000`

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build (runs `prisma generate` first)
- `npm run start` — start production server
- `npm run lint` — run ESLint

## Project Structure (high level)

- `src/app/(auth)` — authenticated pages + shared shell layout
- `src/app/(public)` — public pages (signin/landing)
- `src/app/_actions` — server actions (auth, bookings, rooms, branches, etc.)
- `src/lib` — auth/prisma/redis utilities
- `prisma` — schema + migrations

## Caching Notes

- Redis usage is defensive: app continues working if Redis env vars are not configured.
- Booking list caching uses key versioning + TTL.
- Profile page data is user-scoped and invalidated on profile updates.

## Access Control Notes

- Authenticated routes are protected in the `(auth)` layout.
- `/users` route is restricted to `SUPERADMIN` and redirects non-superadmins.

## Troubleshooting

- If App Router shows stale build/module errors after refactors, restart `npm run dev`.
- If Prisma types are outdated after schema changes, run `npx prisma generate` again.
- If email sending fails, verify `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
