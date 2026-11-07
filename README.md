# Praxis — premium 3D tutoring platform

Private tutoring in **Engineering, Finance and Law**, with a cinematic 3D homepage.
Built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Three.js / React Three Fiber, GSAP and Lenis.

## Run it on any laptop

You need **Node.js 18.17 or newer** (Node 20 LTS recommended — download from <https://nodejs.org>) and **Git**.

```bash
git clone https://github.com/RudyKarim/Tutoring-App.git
cd Tutoring-App
npm install
npm run dev
```

Open <http://localhost:3000>.

That's it — with no configuration the app runs in **demo mode**:

- Sign in with **`demo@praxis.study`** / **`praxis-demo`**, or create a new account.
- Bookings, favourites and accounts are kept in server memory and reset when the server restarts.
- A small banner at the bottom of the screen reminds you you're in demo mode.

For a production build: `npm run build && npm start`.

## What's inside

| Area | Where |
| --- | --- |
| 3D homepage carousel (gear train / finance columns / law portico) | `components/home/HomeExperience.tsx`, `components/three/HomeCanvas.tsx`, `components/three/FacultyCenterpieces.tsx` |
| Faculty pages with specialization panels | `app/faculty/[slug]/page.tsx` |
| Tutor gallery (filter + sort) and profiles | `components/tutors/*`, `app/tutors/*` |
| 7-step booking flow | `components/booking/BookingFlow.tsx`, `app/book/[tutorId]/page.tsx` |
| Student dashboard (upcoming/past, reschedule, cancel, favourites) | `components/dashboard/*`, `app/dashboard/page.tsx` |
| Sign up / sign in / profile | `components/ui/AuthForm.tsx`, `app/profile/page.tsx` |
| API routes (all validation is server-side) | `app/api/**` |
| Booking rules (schedule, notice period, overlap checks) | `lib/server/bookings.ts`, `lib/availability.ts` |
| Tutor and faculty sample data | `lib/data.ts` |
| Database schema for live mode | `supabase/migrations/0001_init.sql` |

### Homepage controls

Horizontal trackpad swipe, mouse wheel, click-and-drag, touch swipe, the arrow buttons, or the **← →** keys move between faculties.
Scrolling down on Law continues into the page. Click the centrepiece or **Explore →** to fly into a faculty; the browser back button returns you to the faculty you left.

### Booking rules

- Times are in Eastern Time (`lib/time.ts`), in 30-minute steps within each tutor's weekly hours.
- Sessions need at least 2 hours' notice and can be booked up to 8 weeks ahead.
- A tutor can't be double-booked, and neither can a student. This is checked on the server; in live mode the database enforces it too.
- Free cancellation up to 24 hours before a session; rescheduling is allowed until the session starts.

## Live mode (Supabase)

1. Create a free project at <https://supabase.com>.
2. In the project's **SQL Editor**, paste and run `supabase/migrations/0001_init.sql`.
3. In **Project Settings → API**, copy the Project URL, the `anon` public key and the `service_role` key.
4. Copy `.env.example` to `.env.local` and fill in all three values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
5. (Optional) In **Authentication → Providers → Email**, turn off "Confirm email" to sign in straight after sign-up.
6. Restart `npm run dev`. The demo banner disappears and accounts, bookings and favourites are stored in Postgres.

Never commit `.env.local` — it's already in `.gitignore`. The service-role key is only used on the server.

## Not built yet

- Card payments (the confirm step says payment is due after the session).
- Confirmation emails.
- Deployment config. The app deploys to Vercel as-is: import the repo and add the three environment variables.
