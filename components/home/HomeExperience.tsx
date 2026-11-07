"use client";
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import type Lenis from "lenis";
import { FACULTIES } from "@/lib/data";
import type { Rig } from "@/components/three/HomeCanvas";

const HomeCanvas = dynamic(() => import("@/components/three/HomeCanvas"), { ssr: false });

const STORAGE_KEY = "praxis-home-index";
const LAST = FACULTIES.length - 1;
/** Pixels of wheel/trackpad travel that equal one faculty. */
const PX_PER_FACULTY = 600;
/** How far past the resting point a gesture must go to commit to the neighbour. */
const COMMIT = 0.1;
const GLOW = ["rgba(90,169,255,0.17)", "rgba(216,179,90,0.15)", "rgba(176,56,74,0.2)"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lenis = () => (window as unknown as { __lenis?: Lenis }).__lenis;

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/** If the 3D scene throws (lost context, driver bug), fall back instead of breaking the homepage. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Non-WebGL fallback: a layered, CSS-only emblem per faculty. */
function FallbackVisual({ index }: { index: number }) {
  const f = FACULTIES[index];
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden>
      <div className="relative h-[46vmin] w-[46vmin] transition-all duration-700">
        {[0, 1, 2].map((r) => (
          <div
            key={r}
            className="absolute rounded-full border"
            style={{ inset: `${r * 12}%`, borderColor: `${f.accent}${r === 0 ? "66" : "33"}`, boxShadow: r === 0 ? `0 0 80px -20px ${f.accent}` : undefined }}
          />
        ))}
        <div className="absolute inset-0 grid place-items-center font-display text-[18vmin] font-light" style={{ color: f.accent }}>
          {f.index}
        </div>
      </div>
    </div>
  );
}

export function HomeExperience() {
  const router = useRouter();
  const section = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const atmo = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig>({ progress: 0, enter: 0, pointer: { x: 0, y: 0 }, dragging: false, reduced: false });
  const indexRef = useRef(0); // committed destination
  const [shown, setShown] = useState(0); // faculty nearest the camera right now
  const shownRef = useRef(0);
  const dirRef = useRef(1);
  const tween = useRef<gsap.core.Tween | null>(null);
  const entering = useRef(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);

  // Restore state when returning (back button) and read motion preference.
  useLayoutEffect(() => {
    rig.current.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let saved = 0;
    try { saved = clamp(Number(sessionStorage.getItem(STORAGE_KEY) ?? 0) || 0, 0, LAST); } catch { /* storage blocked */ }
    rig.current.progress = saved;
    rig.current.enter = 0;
    indexRef.current = shownRef.current = saved;
    setShown(saved);
    if (atmo.current) atmo.current.style.setProperty("--glow", GLOW[saved]);
    setWebgl(hasWebGL());
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      entering.current = false;
      rig.current.enter = 0;
      gsap.set([veil.current], { opacity: 0 });
      gsap.set([titleRef.current, ui.current], { opacity: 1, scale: 1 });
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Stop rendering the 3D scene while the hero is scrolled out of view.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(section.current!);
    return () => io.disconnect();
  }, []);

  // Keep labels, title, button and atmosphere in sync with whatever is nearest the camera (live during drags).
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const n = clamp(Math.round(rig.current.progress), 0, LAST);
      if (n !== shownRef.current) {
        dirRef.current = n > shownRef.current ? 1 : -1;
        shownRef.current = n;
        setShown(n);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const goTo = useCallback((target: number, fast = false) => {
    if (entering.current) return;
    const i = clamp(target, 0, LAST);
    indexRef.current = i;
    try { sessionStorage.setItem(STORAGE_KEY, String(i)); } catch { /* ignore */ }
    tween.current?.kill(); // never run two camera animations at once — retarget instead
    const distance = Math.abs(rig.current.progress - i);
    const reduced = rig.current.reduced;
    tween.current = gsap.to(rig.current, {
      progress: i,
      duration: reduced ? 0.25 : fast ? 0.7 + distance * 0.3 : 1.25 + distance * 0.35,
      ease: reduced ? "power1.out" : fast ? "power3.out" : "expo.inOut",
    });
  }, []);

  const enter = useCallback(
    (i: number) => {
      if (entering.current) return;
      if (i !== indexRef.current || Math.abs(rig.current.progress - i) > 0.1) return goTo(i);
      const slug = FACULTIES[i].slug;
      const href = `/faculty/${slug}`;
      entering.current = true;
      router.prefetch(href);
      tween.current?.kill();
      const reduced = rig.current.reduced;
      const tl = gsap.timeline({ onComplete: () => router.push(href) });
      tl.to(rig.current, { progress: i, duration: 0.3 }, 0);
      tl.to([titleRef.current, ui.current], { opacity: 0, scale: 1.04, duration: 0.5, ease: "power2.in" }, 0);
      if (!reduced) tl.to(rig.current, { enter: 1, duration: 1.2, ease: "power3.in" }, 0);
      tl.to(veil.current, { opacity: 1, duration: reduced ? 0.3 : 0.45, ease: "power1.in" }, reduced ? 0.1 : 0.85);
    },
    [goTo, router],
  );

  // ---------- wheel / trackpad: continuous follow, then settle ----------
  useEffect(() => {
    const el = section.current!;
    let gesture: { start: number; mode: "carousel" | "page" | "pass"; target: number; fired: boolean } | null = null;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      if (!gesture) return;
      const g = gesture;
      gesture = null;
      if (g.mode !== "carousel") return;
      const delta = g.target - g.start;
      goTo(Math.abs(delta) > COMMIT ? g.start + Math.sign(delta) : g.start, true);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom
      if (window.scrollY > 4) return; // page already scrolled: behave normally
      if (entering.current) return e.preventDefault();

      const scale = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;
      const vertical = Math.abs(dy) >= Math.abs(dx);
      const d = vertical ? dy : dx;
      if (!d) return;

      if (!gesture) {
        const settled = Math.abs(rig.current.progress - indexRef.current) < 0.05;
        let mode: "carousel" | "page" | "pass" = "carousel";
        // Edge handoff — never trap the user: down past Law continues the page; up at Engineering is left alone.
        if (vertical && settled && d > 0 && indexRef.current === LAST) mode = "page";
        if (vertical && settled && d < 0 && indexRef.current === 0) mode = "pass";
        gesture = { start: indexRef.current, mode, target: rig.current.progress, fired: false };
      }
      clearTimeout(idle);
      idle = setTimeout(settle, 180); // trackpad inertia keeps the gesture alive until it really stops

      if (gesture.mode === "pass") return;
      e.preventDefault();
      if (gesture.mode === "page") {
        if (!gesture.fired) {
          gesture.fired = true;
          const target = document.getElementById("home-content");
          if (target) lenis() ? lenis()!.scrollTo(target, { duration: 1.2 }) : target.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }
      // Follow the gesture, limited to one faculty either way, with rubber-banding at the ends.
      const lo = Math.max(-0.12, gesture.start - 1);
      const hi = Math.min(LAST + 0.12, gesture.start + 1);
      gesture.target = clamp(gesture.target + d / PX_PER_FACULTY, lo, hi);
      tween.current?.kill();
      tween.current = gsap.to(rig.current, { progress: gesture.target, duration: rig.current.reduced ? 0.1 : 0.55, ease: "power2.out" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(idle);
      el.removeEventListener("wheel", onWheel);
    };
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
      if (e.pointerType !== "touch") {
        rig.current.pointer.x = (e.clientX / w) * 2 - 1;
        rig.current.pointer.y = -((e.clientY / el.clientHeight) * 2 - 1);
      }
      if (id !== e.pointerId) return;
      const dx = e.clientX - startX;
      if (!moved) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - startY)) return;
        moved = true;
        rig.current.dragging = true;
        tween.current?.kill();
        try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      }
      const now = performance.now();
      vx = (e.clientX - lastX) / Math.max(1, now - lastT); // px per ms
      lastX = e.clientX;
      lastT = now;
      let p = startP - dx / (w * 0.6);
      if (p < 0) p *= 0.3; // rubber band at the edges
      if (p > LAST) p = LAST + (p - LAST) * 0.3;
      rig.current.progress = p;
    };
    const up = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      id = null;
      if (!moved) return;
      const projected = rig.current.progress - vx * 0.35; // flick inertia
      const base = Math.round(startP);
      const delta = projected - base;
      goTo(Math.abs(delta) > COMMIT * 1.5 ? base + Math.sign(delta) : base, true);
      setTimeout(() => { rig.current.dragging = false; }, 0); // let the 3D click handler see the drag first
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  // Title + atmosphere transition whenever the nearest faculty changes.
  useEffect(() => {
    const reduced = rig.current.reduced;
    if (atmo.current) gsap.to(atmo.current, { "--glow": GLOW[shown], duration: reduced ? 0.2 : 1.4, ease: "power2.out" });
    const chars = titleRef.current?.querySelectorAll("[data-char]");
    if (chars?.length) {
      gsap.fromTo(
        chars,
        reduced ? { opacity: 0 } : { opacity: 0, xPercent: 60 * dirRef.current, filter: "blur(10px)" },
        { opacity: 1, xPercent: 0, filter: "blur(0px)", duration: reduced ? 0.3 : 1.1, ease: "expo.out", stagger: reduced ? 0 : { each: 0.035, from: dirRef.current > 0 ? "start" : "end" } },
      );
    }
    const copy = ui.current?.querySelectorAll("[data-copy]");
    if (copy?.length) gsap.fromTo(copy, { opacity: 0, y: reduced ? 0 : 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 });
  }, [shown]);

  const f = FACULTIES[shown];
  const prev = FACULTIES[shown - 1];
  const next = FACULTIES[shown + 1];

  return (
    <section
      ref={section}
      aria-roledescription="carousel"
      aria-label="Choose a faculty"
      className="relative h-[100svh] min-h-[600px] w-full select-none overflow-hidden"
      style={{ touchAction: "pan-y" }}
      data-lenis-prevent-wheel
    >
      {/* Atmosphere: matte black with a faculty-tinted glow that shifts between worlds */}
      <div
        ref={atmo}
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 55% at 50% 42%, var(--glow, rgba(90,169,255,0.17)), transparent 70%), #07070a" } as React.CSSProperties}
      />

      {/* Monumental title, behind the sculpture */}
      <h1
        ref={titleRef}
        key={shown}
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-[17%] whitespace-nowrap text-center font-display font-light uppercase leading-none tracking-[0.04em] text-transparent md:top-[10.5%]"
        // Size the word to the viewport so long names (ENGINEERING) never clip or wrap.
        style={{ fontSize: `clamp(2.6rem, min(15.5vw, ${(90 / (f.name.length * 0.8)).toFixed(2)}vw), 16rem)` }}
      >
        <span className="sr-only">{`Faculty ${shown + 1} of ${FACULTIES.length}: ${f.name}`}</span>
        {f.name.split("").map((c, i) => (
          <span
            key={i}
            data-char
            aria-hidden
            className="inline-block"
            style={{
              backgroundImage: "linear-gradient(180deg, rgba(236,232,225,0.95) 10%, rgba(236,232,225,0.12) 95%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            {c}
          </span>
        ))}
      </h1>

      {/* The 3D world */}
      <div className="absolute inset-0">
        {webgl === false ? (
          <FallbackVisual index={shown} />
        ) : webgl ? (
          <SceneBoundary fallback={<FallbackVisual index={shown} />}>
            <HomeCanvas rig={rig} onSelect={enter} active={visible} />
          </SceneBoundary>
        ) : null}
      </div>

      {/* Vignette for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(7,7,10,0.8)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink via-ink/50 to-transparent" />

      <div ref={ui} className="pointer-events-none absolute inset-0 z-10">
        {/* LEFT / RIGHT: previous and next faculty */}
        <button
          onClick={() => goTo(indexRef.current - 1)}
          disabled={!prev}
          aria-label={prev ? `Previous faculty: ${prev.name}` : "No previous faculty"}
          className="group pointer-events-auto absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-3 p-2 transition-opacity disabled:opacity-0 md:left-8"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-ink/40 backdrop-blur transition group-hover:border-white/40">←</span>
          {prev && (
            <span className="hidden text-left lg:block">
              <span className="block text-[10px] tracking-widest2 text-bone-mute">{prev.index}</span>
              <span className="block text-[11px] uppercase tracking-widest2 text-bone-dim transition group-hover:text-bone">{prev.name}</span>
            </span>
          )}
        </button>
        <button
          onClick={() => goTo(indexRef.current + 1)}
          disabled={!next}
          aria-label={next ? `Next faculty: ${next.name}` : "No next faculty"}
          className="group pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3 p-2 transition-opacity disabled:opacity-0 md:right-8"
        >
          {next && (
            <span className="hidden text-right lg:block">
              <span className="block text-[10px] tracking-widest2 text-bone-mute">{next.index}</span>
              <span className="block text-[11px] uppercase tracking-widest2 text-bone-dim transition group-hover:text-bone">{next.name}</span>
            </span>
          )}
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-ink/40 backdrop-blur transition group-hover:border-white/40">→</span>
        </button>

        {/* BOTTOM: description · indicator · action */}
        <div className="absolute inset-x-0 bottom-0 mx-auto grid max-w-7xl items-end gap-6 px-5 pb-14 md:grid-cols-3 md:px-10 md:pb-12">
          <div className="hidden md:block">
            <p data-copy className="font-display text-xl italic text-bone">{f.tagline}</p>
            <p data-copy className="mt-2 max-w-xs text-[13px] leading-relaxed text-bone-mute">{f.description}</p>
          </div>

          <nav aria-label="Faculties" className="pointer-events-auto flex flex-col items-center gap-3">
            <div className="text-[11px] tracking-widest2 text-bone-dim">
              <span style={{ color: f.accent }}>{f.index}</span> <span className="text-bone-mute">/ {String(FACULTIES.length).padStart(2, "0")}</span>
            </div>
            <div className="flex items-center gap-3">
              {FACULTIES.map((x, i) => (
                <span key={x.slug} className="flex items-center gap-3">
                  {i > 0 && <span className="h-px w-5 bg-white/15 md:w-8" aria-hidden />}
                  <button
                    onClick={() => goTo(i)}
                    aria-current={i === shown ? "true" : undefined}
                    className={`text-[10px] uppercase tracking-[0.28em] transition-colors md:text-[11px] ${i === shown ? "text-bone" : "text-bone-mute hover:text-bone-dim"}`}
                    style={i === shown ? { textShadow: `0 0 18px ${x.accent}` } : undefined}
                  >
                    {x.name}
                  </button>
                </span>
              ))}
            </div>
          </nav>

          <div className="pointer-events-auto flex justify-center md:justify-end">
            <button
              onClick={() => enter(clamp(Math.round(rig.current.progress), 0, LAST))}
              className="group relative overflow-hidden rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 text-[12px] uppercase tracking-[0.24em] text-bone backdrop-blur-md transition hover:border-white/40"
              style={{ boxShadow: `0 0 50px -14px ${f.accent}, inset 0 1px 0 rgba(255,255,255,0.08)` }}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" aria-hidden />
              Explore {f.name} <span aria-hidden className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </div>

      <div ref={veil} className="pointer-events-none absolute inset-0 z-30 bg-ink opacity-0" />
    </section>
  );
}
