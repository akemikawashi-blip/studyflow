# StudyFlow

StudyFlow is a responsive, installable student productivity application built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase.

A deployed StudyFlow link works on phones, tablets, and computers. Every user creates a separate account, and Row Level Security isolates that user's records.

## Included modules

- Secure email registration, verification, login, logout, and password recovery
- Dashboard calculated from live user data
- Tasks with create, edit, completion, filtering, and deletion
- Planner with courses, assignments, and calendar events
- Study timer, saved sessions, goals, and weekly charts
- Finance transactions, budgets, balances, and spending summaries
- Skills and learning goals
- Notes with search, tags, pinning, favorites, and course links
- Persistent notifications and due-date alerts
- Cross-module search
- Profile, goals, currency, time zone, reminders, and theme settings
- Installable Progressive Web App with app icons, an install page, and a safe offline screen
- GitHub Actions checks for linting, TypeScript, and production builds

## Public deployment

Use the included guides and launcher:

```text
PUBLISH-STUDYFLOW-TO-GITHUB.bat
DEPLOYMENT-GUIDE.md
OPEN-PRODUCTION-SETUP.bat
```

GitHub stores the code. Vercel hosts the public application. Users visit the Vercel URL and open `/install` to add StudyFlow to their device.

## Local requirements

- Node.js 20.9 or newer
- npm
- A Supabase project
- Internet access

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

In Supabase SQL Editor, run:

```text
supabase/phase2-complete.sql
```

The script creates the tables, constraints, triggers, indexes, views, grants, and Row Level Security policies used by StudyFlow.

### 3. Configure local environment variables

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use only the Supabase publishable key. Never use a service-role or `sb_secret_...` key in browser-facing variables.

### 4. Configure local authentication URLs

In Supabase Authentication → URL Configuration:

```text
Site URL:
http://localhost:3000

Redirect URLs:
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
```

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production environment variables

In Vercel, add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

`NEXT_PUBLIC_SITE_URL` is optional because StudyFlow detects the current deployment host. After deployment, add the final Vercel domain to Supabase Auth URL Configuration as described in `DEPLOYMENT-GUIDE.md`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Run everything together:

```bash
npm run check
```

## Security design

- Every Server Action authenticates the current user.
- Every mutation filters records by both record ID and authenticated user ID.
- Supabase Row Level Security enforces account separation in the database.
- Local and production secret files are excluded from Git.
- The service worker does not cache authenticated HTML or private API responses.
- Authentication redirects are restricted to internal application paths.

## Recommended release test

1. Register and verify a production account.
2. Create records in every module and refresh the browser.
3. Test email verification and password reset.
4. Create a second account and confirm it cannot access the first account's data.
5. Install the app from `/install` on Android or desktop.
6. On iPhone or iPad, use Safari → Share → Add to Home Screen.
