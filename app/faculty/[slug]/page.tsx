import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FACULTIES, getFaculty, tutorsForFaculty } from "@/lib/data";
import { favoritesForCurrentUser, withNextAvailable } from "@/lib/server/tutors";
import { TutorCard } from "@/components/tutors/TutorCard";
import { TiltPanel } from "@/components/ui/TiltPanel";
import { Reveal } from "@/components/ui/Reveal";
import { Footer } from "@/components/ui/Footer";
import { PageReveal } from "@/components/ui/PageReveal";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: getFaculty(params.slug)?.name ?? "Faculty" };
}

export default async function FacultyPage({ params }: { params: { slug: string } }) {
  const faculty = getFaculty(params.slug);
  if (!faculty) notFound();
  const [tutors, { user, favorites }] = await Promise.all([withNextAvailable(tutorsForFaculty(faculty.slug)), favoritesForCurrentUser()]);
  const idx = FACULTIES.indexOf(faculty);
  const nextFaculty = FACULTIES[(idx + 1) % FACULTIES.length];

  return (
    <>
      <PageReveal accent={faculty.accent} />
      <main>
        <section className="relative overflow-hidden px-5 pb-20 pt-40 md:px-10">
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 70% 20%, ${faculty.accent}26, transparent 70%)` }} />
          <div className="relative mx-auto max-w-7xl">
            <Reveal>
              <Link href="/" className="eyebrow hover:text-bone">← All faculties</Link>
              <div className="eyebrow mt-10" style={{ color: faculty.accent }}>Faculty {faculty.index}</div>
              <h1 className="h-display mt-3 text-[clamp(4rem,13vw,11rem)]">{faculty.name}</h1>
              <p className="mt-4 font-display text-2xl italic text-bone-dim md:text-3xl">{faculty.tagline}</p>
              <p className="mt-4 max-w-xl text-bone-mute">{faculty.description}</p>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
          <div className="eyebrow mb-6">Specializations</div>
          <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {faculty.specializations.map((s, i) => {
              const count = tutors.filter((t) => t.specializations.includes(s.slug)).length;
              return (
                <TiltPanel key={s.slug} accent={faculty.accent} max={10} className="min-h-[300px]">
                  <Link href={`/tutors?faculty=${faculty.slug}&spec=${s.slug}`} className="flex h-full min-h-[300px] flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-5xl text-white/10">{String(i + 1).padStart(2, "0")}</span>
                      <span className="h-2 w-2 rounded-full" style={{ background: faculty.accent, boxShadow: `0 0 16px ${faculty.accent}` }} />
                    </div>
                    <h3 className="mt-8 font-display text-3xl">{s.name}</h3>
                    <p className="mt-2 text-sm text-bone-dim">{s.blurb}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {s.topics.map((t) => <span key={t} className="chip">{t}</span>)}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-6 text-sm">
                      <span className="text-bone-mute">{count} {count === 1 ? "tutor" : "tutors"}</span>
                      <span className="transition-transform group-hover:translate-x-1" style={{ color: faculty.accent }}>Browse →</span>
                    </div>
                  </Link>
                </TiltPanel>
              );
            })}
          </Reveal>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="eyebrow">Tutors</div>
              <h2 className="h-display mt-2 text-4xl md:text-5xl">Learn from practitioners</h2>
            </div>
            <Link href={`/tutors?faculty=${faculty.slug}`} className="btn-ghost hidden md:inline-flex">View all</Link>
          </div>
          <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tutors.sort((a, b) => b.rating - a.rating).map((t) => (
              <TutorCard key={t.id} tutor={t} favorite={favorites.includes(t.id)} signedIn={!!user} />
            ))}
          </Reveal>
        </section>

        <section className="border-t border-white/[0.06] px-5 py-20 md:px-10">
          <Link href={`/faculty/${nextFaculty.slug}`} className="group mx-auto flex max-w-7xl items-end justify-between">
            <div>
              <div className="eyebrow">Next faculty</div>
              <div className="h-display mt-2 text-5xl transition-colors md:text-7xl" style={{ color: nextFaculty.accent }}>{nextFaculty.name}</div>
            </div>
            <span className="text-3xl transition-transform group-hover:translate-x-2">→</span>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
