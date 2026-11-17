import Link from "next/link";
import { HomeExperience } from "@/components/home/HomeExperience";
import { TutorCard } from "@/components/tutors/TutorCard";
import { Reveal } from "@/components/ui/Reveal";
import { Footer } from "@/components/ui/Footer";
import { FACULTIES, TUTORS } from "@/lib/data";
import { favoritesForCurrentUser, withNextAvailable } from "@/lib/server/tutors";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "01", title: "Choose a faculty", text: "Engineering, Finance or Law, then the specialization you need help with." },
  { n: "02", title: "Pick a tutor", text: "Compare backgrounds, ratings and real availability. Save favourites for later." },
  { n: "03", title: "Book a session", text: "Choose a time, share your goals, and you're confirmed straight away." },
];

const WHY = [
  { title: "Tutors who work in the field", text: "Engineers, financiers and lawyers who use what they teach every day." },
  { title: "Online or in person", text: "Sessions of 45 to 90 minutes, online or in person with many tutors, at times that fit around your classes." },
  { title: "Simple booking, fair policy", text: "Book up to 8 weeks ahead. Cancel free of charge up to 24 hours before." },
];

export default async function Home() {
  const featured = FACULTIES.map((f) => TUTORS.filter((t) => t.faculty === f.slug).sort((a, b) => b.rating - a.rating)[0]);
  const [tutors, { user, favorites }] = await Promise.all([withNextAvailable(featured), favoritesForCurrentUser()]);
  return (
    <>
      <main>
        <HomeExperience />
        {/* Introduction: what Praxis is, how it works, why it's different */}
        <section id="home-content" aria-labelledby="intro-title" className="mx-auto max-w-7xl scroll-mt-0 px-5 py-24 md:px-10 md:py-28">
          <Reveal className="grid gap-8 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-7">
              <div className="eyebrow">What is Praxis</div>
              <h2 id="intro-title" className="h-display mt-4 text-4xl md:text-6xl">Tutoring from people who practise.</h2>
            </div>
            <div className="self-end md:col-span-5">
              <p className="text-[15px] leading-relaxed text-bone-dim md:text-base">
                Praxis connects <span className="text-bone">university students</span> with professionals who work in their field.
                Book one-to-one sessions to get through a difficult course, prepare for exams, or see how your subject is used in practice.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {FACULTIES.map((f) => (
                  <Link key={f.slug} href={`/faculty/${f.slug}`} className="chip transition hover:border-white/30 hover:text-bone">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: f.accent }} aria-hidden />
                    {f.name} students
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="mt-16 md:mt-20">
            <div className="eyebrow">How it works</div>
          </Reveal>
          <Reveal className="mt-6 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="panel p-7 md:p-8">
                <div className="font-display text-3xl font-light text-white/25">{s.n}</div>
                <h3 className="mt-5 font-display text-xl md:text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">{s.text}</p>
              </div>
            ))}
          </Reveal>

          <Reveal className="mt-16 md:mt-20">
            <div className="eyebrow">Why Praxis</div>
          </Reveal>
          <Reveal className="mt-6 grid gap-x-10 gap-y-8 border-t border-white/[0.07] pt-8 md:grid-cols-3">
            {WHY.map((w) => (
              <div key={w.title}>
                <h3 className="font-display text-lg md:text-xl">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">{w.text}</p>
              </div>
            ))}
          </Reveal>

          <Reveal className="mt-16 md:mt-20">
            <div className="panel flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-10">
              <div>
                <h3 className="h-display text-3xl md:text-4xl">Ready to start?</h3>
                <p className="mt-2 text-sm text-bone-dim">Browse tutors now. You only need an account when you book.</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/tutors" className="btn-primary">Find a tutor</Link>
                {user ? (
                  <Link href="/dashboard" className="btn-ghost">Go to your dashboard</Link>
                ) : (
                  <Link href="/signup" className="btn-ghost">Create an account</Link>
                )}
              </div>
            </div>
          </Reveal>
        </section>
        <section className="mx-auto max-w-7xl px-5 pb-28 md:px-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="eyebrow">Featured</div>
              <h2 className="h-display mt-2 text-4xl md:text-5xl">One from each faculty</h2>
            </div>
            <Link href="/tutors" className="btn-ghost hidden md:inline-flex">All tutors</Link>
          </div>
          <Reveal className="grid gap-5 md:grid-cols-3">
            {tutors.map((t) => <TutorCard key={t.id} tutor={t} favorite={favorites.includes(t.id)} signedIn={!!user} />)}
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
