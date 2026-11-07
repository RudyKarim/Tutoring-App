"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type Lenis from "lenis";
import { FACULTIES } from "@/lib/data";
import type { Rig } from "@/components/three/HomeCanvas";

const HomeCanvas = dynamic(() => import("@/components/three/HomeCanvas"), { ssr: false });

const STORAGE_KEY = "praxis-home-index";
const LAST = FACULTIES.length - 1;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lenis = () => (window as unknown as { __lenis?: Lenis }).__lenis;

export function HomeExperience() {
  const router = useRouter();
  const section = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig>({ progress: 0, enter: 0, pointer: { x: 0, y: 0 }, dragging: false });
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const tween = useRef<gsap.core.Tween | null>(null);
  const entering = useRef(false);

  // Restore the last faculty when coming back (browser back button).
  useLayoutEffect(() => {
    let saved = 0;
    try { saved = clamp(Number(sessionStorage.getItem(STORAGE_KEY) ?? 0) || 0, 0, LAST); } catch { /* storage blocked */ }
    rig.current.progress = saved;
    rig.current.enter = 0;
    indexRef.current = saved;
    setIndex(saved);
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      entering.current = false;
      rig.current.enter = 0;
      if (veil.current) veil.current.style.opacity = "0";
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const goTo = useCallback((target: number, fast = false) => {
    if (entering.current) return;
    const i = clamp(target, 0, LAST);
    indexRef.current = i;
    setIndex(i);
    try { sessionStorage.setItem(STORAGE_KEY, String(i)); } catch { /* ignore */ }
    tween.current?.kill(); // never run two camera animations at once — retarget instead
    const distance = Math.abs(rig.current.progress - i);
    tween.current = gsap.to(rig.current, {
      progress: i,
      duration: fast ? 0.45 + distance * 0.4 : 0.9 + distance * 0.35,
      ease: fast ? "power3.out" : "power3.inOut",
    });
  }, []);

  const enter = useCallback(
    (i: number) => {
      if (entering.current) return;
      if (i !== indexRef.current) return goTo(i);
      const slug = FACULTIES[i].slug;
      entering.current = true;
      router.prefetch(`/faculty/${slug}`);
      tween.current?.kill();
      gsap.to(rig.current, { progress: i, duration: 0.3 });
      gsap.to(rig.current, { enter: 1, duration: 1.15, ease: "power2.in" });
      gsap.to(veil.current, { opacity: 1, duration: 0.5, delay: 0.75, ease: "power1.in", onComplete: () => router.push(`/faculty/${slug}`) });
    },
    [goTo, router],
  );

  // ---------- wheel / trackpad ----------
  useEffect(() => {
    const el = section.current!;
    let acc = 0;
    let locked = false;
    let lastTime = 0;
    let lastMag = 0;
    let stepTime = 0;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom
      if (window.scrollY > 4) return; // page already scrolled: behave normally
      if (entering.current) return e.preventDefault();

      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const d = horizontal ? dx : dy;
      const mag = Math.abs(d);
      const now = performance.now();

      // A new gesture starts after a quiet gap, or when the delta jumps back up mid-inertia.
      if (locked && (now - lastTime > 180 || (now - stepTime > 300 && mag > lastMag * 1.6 && mag > 12))) locked = false;
      lastTime = now;
      lastMag = mag;

      // Edge handoff: scrolling down past Law continues into the page.
      if (!horizontal && d > 0 && indexRef.current === LAST && !locked) {
        if (Math.abs(rig.current.progress - LAST) < 0.05) {
          e.preventDefault();
          locked = true;
          stepTime = now;
          const target = document.getElementById("home-content");
          if (target) lenis() ? lenis()!.scrollTo(target, { duration: 1.2 }) : target.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      // Scrolling up at Engineering: nothing above the hero, let the browser handle it.
      if (!horizontal && d < 0 && indexRef.current === 0 && !locked) return;

      e.preventDefault(); // stops the page and the browser's back-swipe while in the carousel
      if (locked) return;
      acc += d;
      if (Math.abs(acc) > 30) {
        const dir = Math.sign(acc);
        acc = 0;
        locked = true;
        stepTime = now;
        const next = indexRef.current + dir;
        if (next >= 0 && next <= LAST) goTo(next);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goTo]);

  // ---------- drag / touch swipe ----------
  useEffect(() => {
    const el = section.current!;
    let id: number | null = null;
    let startX = 0, startY = 0, startP = 0, lastX = 0, lastT = 0, vx = 0;
    let moved = false;

    const down = (e: PointerEvent) => {
      if (entering.current || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button, a")) return;
      id = e.pointerId;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startP = rig.current.progress;
      lastT = performance.now();
      vx = 0;
      moved = false;
    };
    const move = (e: PointerEvent) => {
      const w = el.clientWidth;
      rig.current.pointer.x = (e.clientX / w) * 2 - 1;
      rig.current.pointer.y = -((e.clientY / el.clientHeight) * 2 - 1);
      if (id !== e.pointerId) return;
      const dx = e.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - startY)) return;
        moved = true;
        rig.current.dragging = true;
        tween.current?.kill();
        el.setPointerCapture(e.pointerId);
      }
      const now = performance.now();
      vx = (e.clientX - lastX) / Math.max(1, now - lastT); // px per ms
      lastX = e.clientX;
      lastT = now;
      let p = startP - dx / (w * 0.55);
      if (p < 0) p = p * 0.3; // rubber band at the edges
      if (p > LAST) p = LAST + (p - LAST) * 0.3;
      rig.current.progress = p;
    };
    const up = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      id = null;
      if (!moved) return;
      const projected = rig.current.progress - vx * 0.35; // flick inertia
      const base = Math.round(startP);
      goTo(clamp(Math.round(projected), base - 1, base + 1), true);
      // Let the 3D click handler see `dragging` on this pointerup, then clear it.
      setTimeout(() => { rig.current.dragging = false; }, 0);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [goTo]);

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(indexRef.current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(indexRef.current - 1); }
      if (e.key === "Enter" && t === document.body) enter(indexRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, enter]);

  // Animate the copy in whenever the faculty changes.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-anim]", { opacity: 0, y: 18, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "expo.out", stagger: 0.06 });
    }, el);
    return () => ctx.revert();
  }, [index]);

  const f = FACULTIES[index];

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      aria-label="Choose a faculty"
      className="relative h-[100svh] min-h-[560px] w-full select-none overflow-hidden"
      style={{ touchAction: "pan-y" }}
      data-lenis-prevent-wheel
    >
      <div className="absolute inset-0">
        <HomeCanvas rig={rig} onSelect={enter} />
      </div>

      {/* Gradient vignette for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(7,7,10,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/60 to-transparent" />

      {/* Copy */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-20 md:flex-row md:items-end md:justify-between md:px-10 md:pb-16">
        <div ref={textRef} key={index} className="max-w-xl" aria-live="polite">
          <div data-anim className="eyebrow mb-4 flex items-center gap-3">
            <span style={{ color: f.accent }}>{f.index}</span>
            <span className="h-px w-8 bg-white/20" />
            <span>{String(FACULTIES.length).padStart(2, "0")}</span>
            <span className="ml-2">Faculty of</span>
          </div>
          <h1 data-anim className="h-display text-[clamp(3.5rem,11vw,9rem)]">{f.name}</h1>
          <p data-anim className="mt-4 font-display text-xl italic text-bone-dim md:text-2xl">{f.tagline}</p>
          <p data-anim className="mt-3 max-w-md text-sm leading-relaxed text-bone-mute">{f.description}</p>
          <button
            data-anim
            onClick={() => enter(index)}
            className="btn-primary pointer-events-auto mt-7"
            style={{ boxShadow: `0 0 40px -8px ${f.accent}` }}
          >
            Explore {f.name} <span aria-hidden>→</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-5">
          <div className="hidden gap-2 md:flex">
            {FACULTIES.map((x, i) => (
              <button
                key={x.slug}
                onClick={() => goTo(i)}
                aria-label={`Show ${x.name}`}
                aria-current={i === index}
                className="h-1 rounded-full transition-all duration-500"
                style={{ width: i === index ? 40 : 14, background: i === index ? x.accent : "rgba(255,255,255,0.2)" }}
              />
            ))}
          </div>
          <button onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous faculty" className="btn-ghost h-12 w-12 !p-0">←</button>
          <button onClick={() => goTo(index + 1)} disabled={index === LAST} aria-label="Next faculty" className="btn-ghost h-12 w-12 !p-0">→</button>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-24 z-10 hidden -translate-x-1/2 text-[11px] uppercase tracking-widest2 text-bone-mute md:block">
        Scroll · drag · ← →
      </div>

      <div ref={veil} className="pointer-events-none absolute inset-0 z-30 bg-ink opacity-0" />
    </section>
  );
}
