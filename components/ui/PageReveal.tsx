"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Fades in from black — continues the homepage fly-through into the faculty page. */
export function PageReveal({ accent }: { accent: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.fromTo(el, { opacity: 1 }, { opacity: 0, duration: reduced ? 0.2 : 1.1, ease: "power2.out", delay: 0.05, onComplete: () => { el.style.display = "none"; } });
  }, []);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[55]" style={{ background: `radial-gradient(circle at 50% 45%, ${accent}22, #07070a 60%)` }} />
  );
}
