"use client";
import { useEffect } from "react";
import type Lenis from "lenis";
import { usePathname } from "next/navigation";

type W = Window & { __lenis?: Lenis };

/**
 * Lenis smooth scrolling. Exposes the instance on window so the 3D homepage can pause it.
 * Lenis is loaded lazily (off the critical path), and its animation loop only runs while a
 * scroll is in progress instead of every frame forever.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: Lenis | null = null;
    let raf = 0;
    let idleFrames = 0;
    let cancelled = false;
    let resumed = true;
    const loop = (t: number) => {
      if (!lenis) return;
      // After sleeping, Lenis's clock is stale: without this the first frame would see a huge
      // time step and finish the whole smooth scroll at once.
      if (resumed) { lenis.time = t - 16; resumed = false; }
      lenis.raf(t);
      idleFrames = lenis.isScrolling ? 0 : idleFrames + 1;
      raf = idleFrames > 10 ? 0 : requestAnimationFrame(loop);
    };
    const wake = () => {
      idleFrames = 0;
      if (!raf && lenis) { resumed = true; raf = requestAnimationFrame(loop); }
    };
    const events = ["wheel", "touchstart", "touchmove", "keydown", "pointerdown"] as const;
    import("lenis").then(({ default: L }) => {
      if (cancelled) return;
      lenis = new L({ duration: 1.1, smoothWheel: true });
      const scrollTo = lenis.scrollTo.bind(lenis);
      lenis.scrollTo = (...a: Parameters<Lenis["scrollTo"]>) => { scrollTo(...a); wake(); };
      (window as W).__lenis = lenis;
      events.forEach((e) => window.addEventListener(e, wake, { passive: true, capture: true }));
      wake();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      events.forEach((e) => window.removeEventListener(e, wake, { capture: true }));
      lenis?.destroy();
      delete (window as W).__lenis;
    };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
