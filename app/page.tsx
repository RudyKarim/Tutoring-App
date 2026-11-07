import Link from "next/link";
import { HomeExperience } from "@/components/home/HomeExperience";
import { TutorCard } from "@/components/tutors/TutorCard";
import { Reveal } from "@/components/ui/Reveal";
import { Footer } from "@/components/ui/Footer";
import { FACULTIES, TUTORS } from "@/lib/data";
import { favoritesForCurrentUser, withNextAvailable } from "@/lib/server/tutors";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "I", title: "Choose a faculty", text: "Engineering, Finance or Law — then narrow to the specialization you need." },
  { n: "II", title: "Meet your tutor", text: "Compare credentials, ratings and real availability. Save favourites for later." },
  { n: "III", title: "Book in a minute", text: "Pick a time that works, tell us your goals, and you're confirmed instantly." },
];

export default async function Home() {
  const featured = FACULTIES.map((f) => TUTORS.filter((t) => t.faculty === f.slug).sort((a, b) => b.rating - a.rating)[0]);
  const [tutors, { user, favorites }] = await Promise.all([withNextAvailable(featured), favoritesForCurrentUser()]);
  return (
    <>
      <main>
        <HomeExperience />
        <section id="home-content" className="mx-auto max-w-7xl scroll-mt-0 px-5 py-28 md:px-10">
          <Reveal>
            <div className="eyebrow">The method</div>
            <h2 className="h-display mt-3 max-w-3xl text-5xl md:text-7xl">Taught by people who practise.</h2>
          </Reveal>
          <Reveal className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="panel p-8">
                <div className="font-display text-4xl text-white/20">{s.n}</div>
                <h3 className="mt-6 font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone-dim">{s.text}</p>
              </div>
            ))}
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
