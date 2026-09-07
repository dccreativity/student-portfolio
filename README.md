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

**None of this is applied to your Supabase project yet.** These are files
in the repo; Vercel deploys the app code automatically, but nothing can
reach your database except you, pasting SQL into the SQL Editor.

Not sure what you have already run? Paste `supabase/check-setup.sql` and
hit Run. It changes nothing and returns a checklist of what is in place
and which file to run for anything that is not.

Two files, in this order, after the migrations you have already run
(`migration-grade.sql`, `migration-admin-allowlist.sql`). Both are safe
to re-run:

1. `supabase/migration-readonly-admin.sql`
2. `supabase/migration-private-files.sql`

`supabase/media.sql` is now also safe to re-run, if you ever need to.

### Nothing is reachable by URL without an account

Two separate locks:

- **Pages.** The middleware now denies by default. Only the landing page,
  the chooser and the login / sign-up / verify screens are public;
  *every* other URL — including any page added later — redirects to the
  right login screen. Typing a URL straight into the address bar gets you
  nowhere without a session, and you are returned to the page you wanted
  after logging in.
- **Files.** The storage bucket was public, which meant an uploaded
  photo, PDF or certificate could be opened by anyone holding its link,
  with no account at all. `migration-private-files.sql` makes the bucket
  private and limits reads to the student who owns the file and to staff.
  The app now serves files as short-lived signed links, minted per view.
  Files uploaded before this keep working — the migration recovers their
  storage paths, and the app recovers section attachments' paths from
  their old URLs.

### Tailwind now comes from the CDN

As you asked. `lib/tailwindCdn.js` holds the CDN URL, the theme (colours,
fonts, animations) and a small block of critical CSS; `app/layout.js`
loads them as plain head tags, in the order the Play CDN needs — the CDN
script first, then the config that depends on it. `tailwind.config.js`,
the PostCSS Tailwind step and the `tailwindcss` dependency are gone.

Two things to know, since this is now how your site gets its styling:

- The CDN generates styles in the browser, so there is a brief moment on
  first load before they appear. The critical CSS keeps that moment
  looking like your site rather than a blank white page.
- If `cdn.tailwindcss.com` is ever unreachable — a school network
  blocking it, for instance — the site loses its styling. It degrades
  quietly rather than erroring, but it will look plain. Tell me if you
  ever see that and I will move it back to a compiled stylesheet.

### The photographs you chose

All five are wired in, from `PHOTOS` in `lib/constants.js`:

| Photo | Where it appears |
| --- | --- |
| Graduates tossing caps | Login and sign-up panels; Header, Objective, Academic Awards, Picture Gallery banners |
| Library shelves | Education, External Exams, Research banners |
| Designer at work | Projects, Video Gallery, Skills banners |
| People at computers | Internships, Administrative Work, Media Coverage banners |
| Group on the stairs | Dashboard header; Leadership, Social Service, Non-Academic Awards, Summer Schools banners |

Each sits over a palette gradient, so a slow or blocked image shows
colour rather than a broken box.

**If a photo doesn't appear on the live site:** I built these links from
the photo IDs in the share URLs you sent, because this environment can't
reach Unsplash to confirm them. Open the photo on unsplash.com,
right-click the image, copy its address (it starts with
`https://images.unsplash.com/photo-...`) and paste it into `PHOTOS` in
`lib/constants.js` in place of the `unsplashPhoto(...)` call. Every photo
on the site is chosen from that one block, so nothing else changes.

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

### Forgotten passwords

There is a **Forgot password?** link on both login screens now. It sends
a 6-digit code to the school address and takes a new password on the same
screen — a code rather than a reset link, for the same reason the rest of
the app verifies by code: a link has to return to an exact redirect URL,
and a mismatch there fails silently. A code also works when the email
opens on a phone and the student signed up on a laptop.

Whether an address has an account is never revealed, so nobody can use
the screen to discover who is registered.

**This needs one setting**: Authentication → Email Templates → **Reset
Password** must include `{{ .Token }}`, exactly as you did for Confirm
signup. Otherwise the email arrives with a link and no code.

**And it needs your own SMTP if students will use it.** Supabase's
built-in mail service allows only a couple of messages an hour across the
whole project. With a class of students forgetting passwords, that
ceiling is reached almost immediately and resets simply stop arriving.
Project Settings → Authentication → SMTP Settings.

As a fallback you can always reset someone yourself: Supabase →
Authentication → Users → find them → the **…** menu offers "Send password
recovery" and "Reset password".

### Education, galleries and the resume

**Education** is no longer a flat list of subject rows. It is one record
per academic year: the year, the programme sat that year, and that year's
results. The programme decides the table:

| Programme | Columns | Grades |
| --- | --- | --- |
| IGCSE, AS Level, A Level | Subject, Grade | A*, A, B, C, D, E, F, G, U |
| IBDP 1, IBDP 2 | Subject, SL/HL, Grade achieved | 1–7 |

Subject is free text everywhere — no dropdown covers the combinations
students actually take. Each year can carry its own attachments, so a
result slip sits with the year it belongs to.

The section also offers the years a student of that grade would be
expected to hold, as one-click additions: a Grade 12 student is shown
A Level and IBDP 2 for this year plus AS Level, IBDP 1 and IGCSE behind
them, and adds whichever track they actually took. Nothing is added for
them, because a student is on one track, not both.

Anything already entered under the old shape is folded into the new one
the first time the page opens, grouped by the year it was recorded
against — nothing is lost.

**Video Gallery** now holds links rather than uploads: a title and a URL
per row, each becoming its own clickable bullet in the resume.

**Picture Gallery** now appears in the resume itself — in the preview and
in the downloaded PDF — as a grid of at most three columns, each photo
with its caption beneath it, rather than the "6 items" summary line it
used to print. The PDF embeds the actual photographs, which is why
generating it now takes a moment longer.

### Resume

The resume is now laid out from the sample consulting resume you sent, on
US Letter with half-inch margins:

- **Centred letterhead** — name in 18pt bold, then your email (as a
  clickable link) and phone, then **Address:** and **LinkedIn / Website:**
  in bold with their values beside them, all pulled from Header / Contact.
- **Section headers** in bold capitals over a double rule spanning the
  page, in template order, every one always shown — the space beneath
  reads "To be added." until you fill it in.
- **Entry lines** in the reference's exact shape: **bold organisation**,
  *italic role*, plain location on the left, with the date range
  right-aligned on the same line.
- **Bullets** with a hanging indent, so wrapped lines align under the
  text rather than under the dot, and italic labels where the reference
  uses them (*GPA:*, *SAT:*, *Outcomes:*).
- **Skills** grouped by category into bold-labelled lines
  (**Language:** …, **Computer Skills:** …), exactly like the reference's
  closing block.
- Set in Times throughout, with attached files as clickable links, page
  numbers when it runs past one page, and no entry heading ever stranded
  at the foot of a page away from its bullets.

The on-screen Resume tab renders from the same layout description at 1:1
page scale, so what you see there is what the PDF gives you — including
where the lines break.

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
- Every section has its own banner: an icon, a palette gradient and one
  of your five photographs over it (see the table above).

### Already answered before, still true

- Grade is asked at student sign-up, students can set or change it from
  their dashboard, and the admin list groups every student by grade.
- Signing up with an email that already has an account says so
  immediately, rather than sending you to an OTP screen where no code
  ever arrives.
- Nothing links `/login` to `/admin/login`, in either direction.

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
  attachments (image / PDF / document / video) on every other section,
  in a private Supabase Storage bucket served through signed links.
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
3. New query → paste `supabase/media.sql` → Run (adds the private Storage
   bucket and the table the galleries and file attachments need).
   Then run `supabase/migration-readonly-admin.sql` and
   `supabase/migration-private-files.sql` in that order.
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
7. **Authentication → Email Templates → Reset Password** → edit it the
   same way, so the 6-digit `{{ .Token }}` is shown:
   ```
   Your folio. password reset code is: {{ .Token }}
   ```
   Without this the reset email arrives with a link and no code, and the
   Forgot password screen has nothing to accept. Leave
   `{{ .ConfirmationURL }}` out.
8. **Project Settings → API** → copy your **Project URL** and **anon
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

1. Open `supabase/add-staff.sql`. Put your staff addresses in the STEP 2
   list near the top — that is the only part you edit.
2. Paste the whole file into Supabase → **SQL Editor** → Run.
3. It prints one line per person:
   - **Signed up - can log in now** — they can use `/admin/login` today.
   - **Not signed up yet** — they become an admin automatically the
     moment they create their account at `/admin/signup` with that exact
     address.

Re-run the same file whenever staff change; it is safe to run repeatedly.
Removing someone is two lines, documented at the bottom of the file.

**A staff email that won't register at all?** Run
`supabase/diagnose-signup.sql` with that address at the top. It reports
each stage of sign-up separately — domain, allowlist, whether an account
was created, whether the code was entered, and whether the profile is an
approved admin — so you can see which one failed.

The most common cause is not this app: Supabase's built-in mail service
allows only a couple of messages an hour across the whole project, so the
second or third sign-up you test in a session cannot send its code and
fails. Authentication → Logs records it. Connecting your school's own SMTP
under Project Settings → Authentication → SMTP Settings removes the limit,
and is worth doing before students start signing up anyway.

**"This staff account hasn't been activated yet" at login?** Run
`supabase/who-is-staff.sql` — it lists every account that is staff, is
trying to be, or is on the staff list, and says what is blocking each
one. The usual cause is an account created before access moved to the
email allowlist: it was left with `status = 'pending'`, waiting for a
manual approval step that no longer exists. Putting that address in
`add-staff.sql` and running it clears it.

Note that fixing this by hand with `update public.profiles set status =
'approved'` does *not* work on its own — the role guard reverts it, and
reports success while doing so. `add-staff.sql` repairs that guard first,
which is why it is the file to use.

Two things that file also handles, which are easy to get wrong by hand:

- **Promoting someone who already has an account.** The rule that reads
  the allowlist only runs when an account is *created*, so a staff member
  who already signed up as a student would otherwise stay a student for
  ever. STEP 3 promotes them.
- **Repairing the role guard.** An earlier version of
  `migration-readonly-admin.sql` shipped a guard that reverted *every*
  role change, including ones made in the SQL Editor — the UPDATE said
  "success" and silently did nothing. STEP 1 replaces it with a guard
  that blocks the app's own database roles (so no student can promote
  themselves) while letting you appoint staff from the SQL Editor. If you
  ran that migration before this fix, running `add-staff.sql` repairs it.

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
- Moving Tailwind back to a compiled stylesheet if the CDN ever proves
  unreliable on the school network.
