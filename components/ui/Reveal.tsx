"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Fades/lifts children in with GSAP when they enter the viewport. */
export function Reveal({ children, className = "", delay = 0, stagger = 0.08 }: { children: React.ReactNode; className?: string; delay?: number; stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.children.length ? Array.from(el.children) : [el];
    gsap.set(items, { opacity: 0, y: 28 });
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        gsap.to(items, { opacity: 1, y: 0, duration: 1, ease: "expo.out", delay, stagger });
        io.disconnect();
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, stagger]);
  return <div ref={ref} className={className}>{children}</div>;
}
