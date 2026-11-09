# Smile Score App

A web application where users register, upload a photo, and receive a smile score.

**[Live demo →](https://smile-score-app-beta.vercel.app/)**

---

## Overview

Users create an account, upload an image of themselves, and the app detects their smile using on-device face detection — no external API, no per-request cost. Each result is stored against the user's account, with a history of past scores on the dashboard.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components for data fetching, Client Components for browser APIs |
| Language | TypeScript | Type safety across DB schema, component props, and utility functions |
| Styling | Tailwind CSS | Utility-first; fast to build, easy to maintain |
| Auth + DB + Storage | Supabase | Integrated auth, Postgres with RLS, and file storage in one platform |
| Face detection | `@vladmandic/face-api` | Runs entirely in the browser — no API key, no cost, no image leaving the device before upload |
| Hosting | Vercel | Zero-config Next.js deployment |
| Testing | Jest + React Testing Library | Industry standard for unit and component tests in Next.js projects |

---

## Architecture decisions

### Client-side face detection
The image is already in the browser when the user selects it. Running face detection client-side means no server round-trip is needed before the score is known, there is no external API dependency, and no API key is required. The face-api models are loaded once per browser session via a module-level flag (`modelsLoaded`) rather than on every render, keeping repeat uploads fast.

### Private Supabase storage bucket
Facial images are biometric PII. The `smile-images` bucket is private — files are scoped to `{user_id}/{filename}`, and access is enforced by Row Level Security policies on `storage.objects`. Images are never served via a public URL. When an image needs to be displayed, a signed URL is generated at render time via `createSignedUrl` with a 1-hour expiry.

### `image_path` stored, not `image_url`
Because the bucket is private, a stored URL would expire and become useless. Storing the path instead means a fresh signed URL can always be generated on demand.

### Row Level Security at the database layer
RLS policies ensure users can only read and insert their own rows in `smile_results`. This is enforced at the Postgres level, not just in application code — a misconfigured server action cannot accidentally expose another user's data.

### Server Components for the dashboard
The dashboard page is a Next.js Server Component with `export const dynamic = 'force-dynamic'`. Results are fetched server-side at request time, so the page is always fresh and user-specific data is never cached across sessions.

### Supabase middleware for session refresh
Middleware calls Supabase's cookie-based session refresh on every request. Without this, JWTs would expire mid-session and silently break authenticated routes.

---

## Local setup

### Prerequisites
- Node.js 18+
- A Supabase project (free tier is sufficient)

### 1. Clone and install

```bash
git clone https://github.com/koshjaeger/smile-score-app.git
cd smile-score-app
npm install
```

### 2. Configure environment variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

> **Note:** Supabase has migrated from `anon`/`service_role` keys to `publishable`/`secret` keys. Use the new format from your project's API settings.

### 3. Set up the database

Run the following SQL in your Supabase SQL editor:

```sql
create table smile_results (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users not null,
  image_path  text        not null,
  smile_score decimal(4,3) not null,
  created_at  timestamptz default now()
);

alter table smile_results enable row level security;

create policy "Users see own results"
  on smile_results for select
  using (auth.uid() = user_id);

create policy "Users insert own results"
  on smile_results for insert
  with check (auth.uid() = user_id);
```

### 4. Set up storage

In the Supabase dashboard, create a **private** bucket called `smile-images`, then run:

```sql
create policy "Users upload own files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'smile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'smile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 5. Disable email confirmation (for demo)

In your Supabase project: **Authentication → Providers → Email** → disable "Confirm email".

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Run tests

```bash
npm test
```

---

## Assumptions

- **One face per upload.** The app uses `detectSingleFace` — multi-person images will only score the most prominent face. This matches the brief's intent (a selfie-style upload).
- **Demo auth flow.** Email confirmation is disabled to allow immediate sign-up during the demo. A production deployment would re-enable it.
- **Smile threshold at 40%.** Scores of 40% and above are classified as a detected smile, based on the expression confidence returned by face-api's `faceExpressionNet`.
- **No rate limiting.** Uploads are not rate-limited per user. This is acceptable for a demo but would be addressed before a production release.

---

## Smile score labels

| Score | Label |
|---|---|
| 80 – 100% | Beaming |
| 60 – 79% | Smiling |
| 40 – 59% | Slight smile |
| 20 – 39% | Neutral |
| 0 – 19% | Not smiling |

---