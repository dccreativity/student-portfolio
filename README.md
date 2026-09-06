# folio. — Student Portfolio Platform

Full 17-section student portfolio (matching your school's template),
with school-email-only sign-up, OTP verification, live real-time updates,
photo/video galleries, and an admin panel. Built to be deployed with
**zero local installs** — everything below happens in a browser.

## Latest update — read this first if your site is already live

Two things were genuinely broken and are now fixed, plus a set of
changes you asked for. **One new SQL file has to be run**, everything
else is code.

### Run this SQL (Supabase → SQL Editor → New query → paste → Run)

`supabase/migration-readonly-admin.sql`

Run it once, after the migrations you have already run
(`migration-grade.sql`, `migration-admin-allowlist.sql`). It is safe to
re-run. `supabase/media.sql` is now also safe to re-run, if you ever
need to.

### Bugs that were stopping you

- **Uploads did nothing.** Attaching a file to an entry saved the file's
  *name* but silently threw away its *URL* — two state updates in a row
  both read the same stale copy of the list, so the second overwrote the
  first. Attachments now save correctly, upload errors are shown on the
  page instead of vanishing, and file names with spaces or accents no
  longer break the storage key.
- **`/admin/signup` was unreachable.** The middleware treated every
  `/admin/*` page except `/admin/login` as staff-only, so a logged-out
  staff member was redirected away from the very page where they create
  their account. Both `/admin/login` and `/admin/signup` are now public.
- **Login could bounce back to the login page.** After a successful
  sign-in the app did a client-side transition, which can reach the
  middleware before the auth cookie is readable — the Supabase login
  loop you hit before. Sign-in, staff sign-in and OTP verification now do
  a full navigation instead.

### Files, everywhere

Every entry in every section takes **several** files now — images, PDFs,
Word/Excel/PowerPoint documents, or video — for certificates and proof.
The Header/Contact, Objective and Education sections previously had no
upload control at all; they now have a **Supporting documents** area.
Removing a gallery item deletes the underlying file too, instead of
leaving it behind against your storage quota.

### Admins really are read-only now

"View but never edit" was only enforced in the buttons the UI drew — the
database still allowed an admin to write. `migration-readonly-admin.sql`
removes every admin write path: on `portfolio_data`, `portfolio_media`,
Storage objects and `profiles`, admins appear in the SELECT policy and
nowhere else. An admin cannot edit, delete, or upload anything belonging
to a student, and cannot change another person's profile, even with a
hand-crafted request.

Staff promotion happens only in `public.admin_allowlist` (SQL you run),
so the old "pending approval" panel is gone — it could never fire once
the allowlist existed.

### Save, and not losing work

Each section's **Save** button is now pinned to the bottom of the page
and tells you plainly when you have unsaved changes. Editing in one tab
is no longer wiped by a real-time update arriving from another, and
closing the tab with unsaved work warns you first.

### Resume

The resume now reads like a real resume: your name, address, email,
phone and LinkedIn from Header/Contact form the letterhead, the
Objective sits directly beneath it, and every remaining section follows
in template order — each header always shown, with a line telling you
the space fills in as you add entries. Attached files appear as clickable
links in the PDF. Pages are numbered, and it flows to as many pages as
the content needs.

### Look and feel

- The **breathing background is actually visible now**. It was on a
  negative z-index behind an opaque `body` background, so it never
  painted. It is now a fixed layer under the content, with three drifting
  blobs and a slow hue rotation.
- **Fonts now load.** The Google Fonts `@import` sat *after* the
  `@tailwind` directives, which CSS ignores — so the site was rendering
  in the browser's default face. Typography is now Bricolage Grotesque
  (display) + Instrument Sans (body), self-hosted by Next at build time,
  so there is no CDN request and no flash of fallback text.
- **The logo is clean.** Your Ahsing wordmark was a Canva export on a
  white ground with a grey dot grid; blend modes only half-hid it. The
  PNG now has a real alpha channel and is trimmed to the letters.
- The homepage carries the logo, the living background and **both doors —
  Student Login and Admin Login — as cards**, plus the Log in / Sign up
  link top right.
- Every section has its own banner (icon + palette gradient). To use a
  photograph instead, paste an Unsplash URL as the third entry for that
  section in `SECTION_BANNERS` in `lib/constants.js` — there are
  instructions in the file.

### Already answered before, still true

- Grade is asked at student sign-up, students can set or change it from
  their dashboard, and the admin list groups every student by grade.
- Signing up with an email that already has an account says so
  immediately, rather than sending you to an OTP screen where no code
  ever arrives.
- Nothing links `/login` to `/admin/login`, in either direction.

**Note on Tailwind:** you asked for the Tailwind CDN. This project uses
the same Tailwind, compiled at build time instead — identical classes and
output, but it ships only the CSS actually used and needs no extra
network request, so pages paint faster and cannot break if a CDN is
blocked on the school network. If you specifically want the CDN version,
say so and it is a small change.

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
- Real photo/video uploads for the two galleries, plus multi-file
  attachments (image / PDF / document / video) on every other section
  (Supabase Storage).
- A Resume tab that compiles everything into a formatted, multi-page,
  downloadable PDF — for the student, and view-only for staff.
- Profile-first dashboard with a live "Portfolio Completion" ring.
- Real time: edits sync instantly anywhere that data is open, for
  students and admins alike (Supabase Realtime).
- Separate `/admin/login` + `/admin/signup`, never linked from the
  student side. Staff addresses are pre-authorised in
  `public.admin_allowlist`; anyone else who uses the staff form simply
  gets an ordinary student account. Staff can browse any student's full
  profile grouped by grade, and are read-only in the database itself.
- Ambient "breathing" background on the auth screens, plus real
  photography behind the auth panels and dashboard header.

---

## Step 1 — Supabase (10 minutes, browser only)

1. Open your Supabase project → **SQL Editor** → New query → paste the
   contents of `supabase/schema.sql` → Run.
2. New query → paste `supabase/auth-hook.sql` → Run.
3. New query → paste `supabase/media.sql` → Run (adds the Storage bucket
   and table the galleries and file attachments need).
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

## Step 4 — Authorise your school staff

Admin access is granted by **email address, in advance** — there is no
"request and approve" step, and no way for a student to talk their way in.

1. Supabase → **SQL Editor** → New query → run this with your real staff
   addresses:
   ```sql
   insert into public.admin_allowlist (email) values
     ('you@adaniinternational.edu.in'),
     ('counselor@adaniinternational.edu.in')
   on conflict (email) do nothing;
   ```
2. Each of those people goes to `/admin/signup` on your live site, signs
   up with **that exact address**, and verifies with the OTP code.
3. They log in at `/admin/login`. They can now open every student profile,
   grouped by grade, and download any student's resume — and nothing else.

To revoke someone later:
```sql
delete from public.admin_allowlist where email = 'someone@adaniinternational.edu.in';
update public.profiles set role = 'student' where email = 'someone@adaniinternational.edu.in';
```

---

## About your earlier Supabase login issue

Three things commonly cause it, and all three are handled here:

1. **Magic-link redirects that don't match the Site URL.** Not applicable —
   login uses 6-digit OTP codes, so no redirect URL is involved.
2. **RLS blocking a user from reading their own just-created profile row.**
   The `handle_new_user` trigger creates the row, and `profiles_select_own`
   always lets a student read it. Admin checks go through a single
   `is_admin()` security-definer helper rather than policies that recurse.
3. **The auth cookie not being readable yet when the middleware runs.**
   This is the one that was still present: after a successful sign-in the
   app did a client-side transition, the middleware saw no session, and
   sent the user straight back to the login page. Sign-in, staff sign-in
   and OTP verification now do a full page navigation, so the cookie is
   always sent with the request that follows.

If a login ever fails now, the page says why in plain words rather than
silently returning you to the form.

## What's next (whenever you're ready)

- A public, read-only "share my portfolio" link for college applications.
- A "recent updates" activity feed on the dashboard.
- Email notifications to staff when a student updates their profile.
- Private file storage with signed URLs. Today the storage bucket is
  public, which means an uploaded file is reachable by anyone who has its
  exact (long, random) URL, even though the database rows behind it are
  locked down. Nobody can list or discover those URLs, but if you want
  files sealed off completely as well, that is a contained follow-up.
