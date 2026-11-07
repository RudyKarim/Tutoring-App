import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFaculty, getTutor, specializationName } from "@/lib/data";
import { priceFor, slotsForDate } from "@/lib/availability";
import { addDays, formatDate, formatTime, nowInPlatform, PLATFORM_TZ_LABEL } from "@/lib/time";
import { favoritesForCurrentUser, withNextAvailable } from "@/lib/server/tutors";
import { repo } from "@/lib/server/repo";
import { FavoriteButton } from "@/components/tutors/FavoriteButton";
import { Stars } from "@/components/ui/Stars";
import { Reveal } from "@/components/ui/Reveal";
import { Footer } from "@/components/ui/Footer";

export const dynamic = "force-dynamic";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return { title: getTutor(params.id)?.name ?? "Tutor" };
}

export default async function TutorPage({ params }: { params: { id: string } }) {
  const base = getTutor(params.id);
  if (!base) notFound();
  const [[tutor], { user, favorites }, bookings] = await Promise.all([withNextAvailable([base]), favoritesForCurrentUser(), repo.bookingsForTutor(base.id)]);
  const faculty = getFaculty(tutor.faculty)!;

  // Upcoming open slots over the next 2 weeks (first few per day).
  const today = nowInPlatform().date;
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(today, i))
    .map((date) => ({ date, slots: slotsForDate(tutor, date, tutor.sessionLengths[0], bookings).filter((s) => s.available) }))
    .filter((d) => d.slots.length)
    .slice(0, 5);

  return (
    <>
      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px]" style={{ background: `radial-gradient(ellipse 50% 60% at 20% 0%, ${faculty.accent}22, transparent 70%)` }} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-24 pt-32 md:px-10 lg:grid-cols-[1fr_380px]">
          <Reveal>
            <Link href={`/faculty/${faculty.slug}`} className="eyebrow hover:text-bone">← {faculty.name}</Link>
            <div className="mt-8 flex items-center gap-6">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full font-display text-4xl" style={{ background: `radial-gradient(circle at 30% 30%, ${faculty.accent}66, #111117 70%)`, border: `1px solid ${faculty.accent}55` }}>
                {tutor.initials}
              </div>
              <div>
                <h1 className="h-display text-5xl md:text-6xl">{tutor.name}</h1>
                <p className="mt-2 text-bone-dim">{tutor.title}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm">
              <Stars rating={tutor.rating} reviews={tutor.reviews} className="!text-sm" />
              <span className="text-bone-dim">{tutor.yearsExperience} yrs experience</span>
              <span className="text-bone-dim">{tutor.sessionsTaught.toLocaleString()} sessions</span>
              <span className="text-bone-dim">{tutor.languages.join(" · ")}</span>
            </div>

            <section className="mt-12">
              <div className="eyebrow mb-3">About</div>
              <p className="max-w-2xl font-display text-2xl leading-snug text-bone/90">“{tutor.bio}”</p>
            </section>

            <section className="mt-12 grid gap-5 md:grid-cols-2">
              <div className="panel p-6">
                <div className="eyebrow mb-4">Credentials</div>
                <ul className="space-y-3 text-sm">
                  {tutor.credentials.map((c) => (
                    <li key={c} className="flex gap-3"><span style={{ color: faculty.accent }}>◆</span>{c}</li>
                  ))}
                </ul>
              </div>
              <div className="panel p-6">
                <div className="eyebrow mb-4">Teaches</div>
                <div className="flex flex-wrap gap-2">
                  {tutor.specializations.map((s) => <span key={s} className="chip !text-sm">{specializationName(tutor.faculty, s)}</span>)}
                </div>
                <div className="eyebrow mb-3 mt-6">Formats</div>
                <p className="text-sm text-bone-dim">{tutor.formats.map((f) => (f === "online" ? "Online" : "In person")).join(" · ")}</p>
              </div>
            </section>

            <section className="mt-12">
              <div className="eyebrow mb-4">Weekly hours <span className="normal-case tracking-normal text-bone-mute">({PLATFORM_TZ_LABEL})</span></div>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((d, i) => {
                  const h = tutor.schedule[i];
                  return (
                    <div key={d} className={`rounded-xl border p-3 text-center text-xs ${h ? "border-white/10 bg-white/[0.03]" : "border-white/[0.04] text-bone-mute"}`}>
                      <div className="mb-1 uppercase tracking-[0.2em]">{d}</div>
                      {h ? <div className="text-bone-dim">{h[0]}–{h[1]}h</div> : <div>—</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          </Reveal>

          <aside className="lg:pt-24">
            <div className="panel sticky top-28 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-4xl">${tutor.rate}<span className="text-base text-bone-mute"> / hr</span></div>
                  <div className="mt-1 text-xs text-bone-mute">
                    {tutor.sessionLengths.map((l) => `${l} min · $${priceFor(tutor, l)}`).join("  ·  ")}
                  </div>
                </div>
                <FavoriteButton tutorId={tutor.id} initial={favorites.includes(tutor.id)} signedIn={!!user} />
              </div>
              <div className="my-6 h-px bg-white/10" />
              <div className="eyebrow mb-3">Next available</div>
              {upcoming.length ? (
                <div className="space-y-3">
                  {upcoming.map((d) => (
                    <div key={d.date}>
                      <div className="mb-1.5 text-xs text-bone-dim">{formatDate(d.date, { weekday: "short", month: "short", day: "numeric" })}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {d.slots.slice(0, 4).map((s) => (
                          <Link key={s.start} href={`/book/${tutor.id}?date=${d.date}&start=${s.start}`} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs transition hover:border-white/40">
                            {formatTime(s.start)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-bone-mute">No open slots in the next two weeks.</p>
              )}
              <Link href={`/book/${tutor.id}`} className="btn-primary mt-6 w-full" style={{ boxShadow: `0 0 40px -10px ${faculty.accent}` }}>
                Book a session
              </Link>
              <p className="mt-3 text-center text-[11px] text-bone-mute">Free cancellation up to 24 hours before.</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
