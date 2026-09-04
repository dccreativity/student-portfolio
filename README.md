# folio. — Student Portfolio Platform

Full 17-section student portfolio (matching your school's template),
with school-email-only sign-up, OTP verification, live real-time updates,
photo/video galleries, and an admin panel. Built to be deployed with
**zero local installs** — everything below happens in a browser.

## Latest update: homepage, admin allowlist, file attachments, resume builder

**New SQL to run** (in order, in Supabase SQL Editor, if not already run):
1. `supabase/migration-grade.sql` (if you haven't already)
2. `supabase/migration-admin-allowlist.sql` — **read the bottom of that
   file**: this is where you add your list of approved staff emails via
   `insert into public.admin_allowlist (email) values (...)`. Staff
   sign-up at `/admin/signup` still requires this exact email to be on
   that list, or they simply become a normal student account instead —
   there's no manual "approve" step anymore, and no way for a student to
   talk their way into admin.

**What's new:**
- **New homepage at `/`**: your logo, a living/breathing color-shifting
  background in your palette, and a single "Log in / Sign up" link (top
  right) that goes to `/choose` — a page with two clearly separate
  options, Student Login and Admin Login. Already-logged-in users skip
  straight to their dashboard as before.
- **Duplicate sign-up detection**: signing up with an email that already
  has a confirmed account now shows "An account with this email already
  exists — try logging in instead" immediately, instead of silently
  getting stuck on the OTP screen with no email arriving.
- **File attachments everywhere, not just galleries**: every entry in
  every repeatable section (Awards, Projects, Internships, Leadership,
  etc., and the Education sub-tables) now has an "Attach file" option —
  image, PDF, or video — for evidence/proof documents, using the same
  Storage bucket the galleries already use.
- **Resume Builder**: a new "📄 Resume" link, pinned above Log out in the
  student sidebar. It auto-compiles everything a student has added into
  a formatted resume (every section header always shown, filled in as
  data exists) with a one-click **Download PDF** button — a real,
  multi-page vector PDF, not a screenshot. Admins see the identical
  resume view under a "Resume" tab in their per-student page, with the
  same download button, and nothing else editable there.

## Updating an already-live site

If you already deployed this once, here's the short version:

1. Run `supabase/migration-grade.sql` in Supabase SQL Editor (adds the new
   Grade field — your existing `schema.sql` won't add it on its own since
   the table already exists).
2. Upload/commit these changed and new files to your GitHub repo,
   overwriting the old ones: everything under `app/`, `components/`,
   `lib/`, plus the new `public/logo.png`, `next.config.mjs`, and
   `tailwind.config.js`.
3. Vercel redeploys automatically. No downtime, no data loss — this only
   changes code, your Supabase data is untouched.

## What's new in this update

- **Student grade** captured at sign-up (Grade 9–12), shown on the
  student's own dashboard, and used to group/filter the admin student
  list by grade.
- **Admin access is now fully separate from student access**: there's no
  link between `/login` and `/admin/login` in either direction anymore.
  Staff request access at a dedicated `/admin/signup` page, never the
  student sign-up form.
- **Admins are view-only.** Per your requirement, an approved admin can
  open any student's full profile and every section, but every field is
  read-only — no save button, no upload button, no edit capability at
  all. This is enforced in the UI; the database RLS policies already
  allowed admin writes for flexibility, so if you ever want to *also*
  allow limited admin edits later, that's a small follow-up, not a
  rebuild.
- Your uploaded wordmark is now the actual logo (`public/logo.png`),
  used on every screen — sidebar, both login pages, both sign-up pages,
  and the verify screen.
- Real photography (free, Unsplash-licensed, no attribution required)
  now sits behind the login/sign-up screens and the dashboard header.
- Typography switched to Bricolage Grotesque (display) + Inter (body) —
  both loaded the same way as before, no separate setup needed.

**Note on Tailwind:** this project already uses Tailwind CSS, compiled
at build time rather than loaded from a CDN. That's intentional — it's
faster for visitors and only ships the CSS actually used, which is why
we didn't switch to the CDN version.

## What's included

- Sign up with any email provider, restricted to `@adaniinternational.edu.in`
  (enforced in the UI *and* in the database via a Supabase Auth Hook, so
  it can't be bypassed).
- 6-digit email OTP verification (no magic links, no phone numbers).
- The full 17-section profile template (`lib/sectionSchema.js`):
  Header/Contact, Objective, Education (grade-wise performance + IB HL/SL
  courses), External Exams, Academic Awards, Non-Academic Awards,
  Projects, Research, Leadership, Administrative Work, Social Service,
  Internships, Summer Schools/Camps, Media Coverage, Picture Gallery,
  Video Gallery, and Skills — each with real structured fields, not
  generic label/value boxes.
- Real photo/video uploads for the two galleries (Supabase Storage).
- Profile-first dashboard with a live "Portfolio Completion" ring.
- Real time: edits sync instantly anywhere that data is open, for
  students and admins alike (Supabase Realtime).
- Separate `/admin/login` + `/admin/signup`. Staff request access at
  sign-up; a super admin approves them; approved admins can browse (but
  not edit) any student's full profile, including galleries.
- Ambient "breathing" background on the auth screens, plus real
  photography behind the auth panels and dashboard header.

---

## Step 1 — Supabase (10 minutes, browser only)

1. Open your Supabase project → **SQL Editor** → New query → paste the
   contents of `supabase/schema.sql` → Run.
2. New query → paste `supabase/auth-hook.sql` → Run.
3. New query → paste `supabase/media.sql` → Run (adds the Storage bucket
   and table the two galleries need).
4. **Authentication → Hooks** → enable **"Before User Created"** → select
   the function `restrict_signup_domain`.
5. **Authentication → Providers → Email** → leave "Confirm email"
   **required** (this is what makes the OTP step mandatory) and make sure
   phone sign-in stays off.
6. **Authentication → Email Templates → Confirm signup** → edit the
   template so the 6-digit `{{ .Token }}` shows clearly, e.g.:
   ```
   Your folio. verification code is: {{ .Token }}
   ```
   (Leave `{{ .ConfirmationURL }}` out — no magic links needed.)
7. **Project Settings → API** → copy your **Project URL** and **anon
   public key**. Keep this tab open.

## Step 2 — Get this code into GitHub (no git, no terminal)

1. Unzip the project folder on your computer (built into Windows/Mac,
   not a software install).
2. On github.com → **New repository** → name it `student-portfolio` →
   create it **empty**.
3. On the new repo's page, click **"uploading an existing file"** (or
   **Add file → Upload files**).
4. Drag the *entire unzipped folder* onto that page — modern GitHub
   preserves the folder structure. If it only accepts individual files in
   your browser, drag the contents of the folder in (not the outer folder
   itself) so `app/`, `components/`, `lib/`, etc. land at the repo root.
5. Scroll down → **Commit changes**.

Your code is now in GitHub, entirely from the browser.

## Step 3 — Deploy on Vercel (free, builds the app for you)

Vercel installs dependencies and runs the build on its own servers — you
never run `npm install` yourself.

1. Go to [vercel.com](https://vercel.com) → sign up free (GitHub login is
   easiest) → **New Project** → import `student-portfolio`.
2. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Project URL from Step 1.7
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key from Step 1.7
3. Click **Deploy**. You get a permanent free URL, e.g.
   `https://student-portfolio-yourname.vercel.app`.
4. Back in Supabase → **Authentication → URL Configuration** → update
   **Site URL** to that real Vercel URL.
5. From now on: edit a file in GitHub's web editor (press **`.`** on your
   repo to open a full code editor in the browser) → commit → Vercel
   redeploys automatically. No installs, ever, at any step.

## Step 4 — Become the first super admin

1. Visit your live site → sign up with **your own** school email, with
   "I'm school staff requesting administrator access" checked.
2. Verify with the OTP code (you'll land on the student dashboard —
   expected, you're not approved yet).
3. Supabase → **SQL Editor** → New query → run (with your real email):
   ```sql
   update public.profiles
      set role = 'admin', status = 'approved'
    where email = 'you@adaniinternational.edu.in';
   ```
4. Go to `/admin/login` on your live site and log in. You're now the
   super admin — approve every future staff sign-up from the admin
   dashboard instead of using SQL again.

---

## About your earlier Supabase login issue

The most common causes are (a) magic-link redirects that don't match the
**Site URL** configured in Supabase, and (b) RLS policies that block a
user from reading their own just-created profile row. This build avoids
both: login uses OTP codes (no redirect URL involved), and RLS plus the
`handle_new_user` trigger are written so a student can always read/write
their own row, with admins going through a single `is_admin()` helper
instead of policies that can recurse.

## What's next (whenever you're ready)

- A public, read-only "share my portfolio" link for college applications.
- A "recent updates" activity feed on the dashboard.
- Email notifications to admins when a student updates their profile.
