"use client";
import { useEffect, useRef } from "react";

/**
 * A panel that tilts in 3D toward the pointer, with a moving specular highlight.
 * Pointer moves are batched to one style write per animation frame, and the panel's
 * rectangle is measured once on enter rather than on every move (no layout thrashing).
 */
export function TiltPanel({ children, className = "", accent = "#ffffff", max = 7 }: { children: React.ReactNode; className?: string; accent?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const apply = () => {
    raf.current = 0;
    const el = ref.current;
    const r = rect.current;
    if (!el || !r) return;
    const x = (pos.current.x - r.left) / r.width;
    const y = (pos.current.y - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || !ref.current) return;
    // Measure without the current tilt so the mapping stays stable.
    rect.current = ref.current.getBoundingClientRect();
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (!rect.current) onEnter(e);
    pos.current.x = e.clientX;
    pos.current.y = e.clientY;
    if (!raf.current) raf.current = requestAnimationFrame(apply);
  };
  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    rect.current = null;
    if (ref.current) ref.current.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
  };
  return (
    <div
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`panel group relative overflow-hidden transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(500px circle at var(--mx,50%) var(--my,50%), ${accent}22, transparent 45%)` }}
      />
      {children}
    </div>
  );
}
