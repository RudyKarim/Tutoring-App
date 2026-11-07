"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FACULTIES } from "@/lib/data";
import type { TutorWithNext } from "@/lib/server/tutors";
import { TutorCard } from "./TutorCard";

type Sort = "rating" | "price-asc" | "price-desc" | "experience" | "soonest";

export function TutorGallery({ tutors, favorites, signedIn }: { tutors: TutorWithNext[]; favorites: string[]; signedIn: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const [faculty, setFaculty] = useState(params.get("faculty") ?? "");
  const [spec, setSpec] = useState(params.get("spec") ?? "");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("");
  const [maxRate, setMaxRate] = useState(200);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [sort, setSort] = useState<Sort>("rating");

  const specs = FACULTIES.find((f) => f.slug === faculty)?.specializations ?? [];

  const syncUrl = (f: string, s: string) => {
    const q = new URLSearchParams();
    if (f) q.set("faculty", f);
    if (s) q.set("spec", s);
    router.replace(`/tutors${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const r = tutors.filter(
      (t) =>
        (!faculty || t.faculty === faculty) &&
        (!spec || t.specializations.includes(spec)) &&
        (!format || t.formats.includes(format as "online")) &&
        t.rate <= maxRate &&
        (!onlyFavs || favorites.includes(t.id)) &&
        (!q || `${t.name} ${t.title} ${t.bio} ${t.credentials.join(" ")}`.toLowerCase().includes(q)),
    );
    const soon = (t: TutorWithNext) => (t.next ? `${t.next.date} ${t.next.start}` : "9999");
    const sorters: Record<Sort, (a: TutorWithNext, b: TutorWithNext) => number> = {
      rating: (a, b) => b.rating - a.rating,
      "price-asc": (a, b) => a.rate - b.rate,
      "price-desc": (a, b) => b.rate - a.rate,
      experience: (a, b) => b.yearsExperience - a.yearsExperience,
      soonest: (a, b) => soon(a).localeCompare(soon(b)),
    };
    return r.sort(sorters[sort]);
  }, [tutors, faculty, spec, format, maxRate, onlyFavs, query, sort, favorites]);

  const reset = () => { setFaculty(""); setSpec(""); setQuery(""); setFormat(""); setMaxRate(200); setOnlyFavs(false); syncUrl("", ""); };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="panel h-fit space-y-6 p-6 lg:sticky lg:top-28">
        <div>
          <label className="label" htmlFor="q">Search</label>
          <input id="q" className="input" placeholder="Name, topic, credential…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="fac">Faculty</label>
          <select id="fac" className="input" value={faculty} onChange={(e) => { setFaculty(e.target.value); setSpec(""); syncUrl(e.target.value, ""); }}>
            <option value="">All faculties</option>
            {FACULTIES.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>
        {faculty && (
          <div>
            <label className="label" htmlFor="spec">Specialization</label>
            <select id="spec" className="input" value={spec} onChange={(e) => { setSpec(e.target.value); syncUrl(faculty, e.target.value); }}>
              <option value="">All</option>
              {specs.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="fmt">Format</label>
          <select id="fmt" className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">Any</option>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rate">Max rate · ${maxRate}/hr</label>
          <input id="rate" type="range" min={60} max={200} step={5} value={maxRate} onChange={(e) => setMaxRate(Number(e.target.value))} className="w-full accent-bone" />
        </div>
        {signedIn && (
          <label className="flex items-center gap-3 text-sm text-bone-dim">
            <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} className="accent-bone" /> Favourites only
          </label>
        )}
        <button onClick={reset} className="text-xs uppercase tracking-[0.2em] text-bone-mute hover:text-bone">Reset filters</button>
      </aside>

      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-bone-dim">{list.length} {list.length === 1 ? "tutor" : "tutors"}</p>
          <select aria-label="Sort tutors" className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="rating">Highest rated</option>
            <option value="soonest">Soonest available</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="experience">Most experienced</option>
          </select>
        </div>
        {list.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((t) => <TutorCard key={t.id} tutor={t} favorite={favorites.includes(t.id)} signedIn={signedIn} />)}
          </div>
        ) : (
          <div className="panel p-12 text-center">
            <p className="font-display text-2xl">No tutors match these filters.</p>
            <button onClick={reset} className="btn-ghost mt-6">Clear filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
