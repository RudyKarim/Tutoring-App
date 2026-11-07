"use client";
import { useEffect, useState } from "react";
import type { Slot } from "@/lib/types";
import { formatTime } from "@/lib/time";

/** Loads live availability for a tutor/date/duration and lets the user pick a start time. */
export function SlotPicker({ tutorId, date, duration, value, onChange, accent, ignoreId, refreshKey = 0 }: {
  tutorId: string; date: string; duration: number; value: string; onChange: (s: string) => void; accent: string; ignoreId?: string; refreshKey?: number;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlots(null);
    setError("");
    const q = new URLSearchParams({ tutorId, date, duration: String(duration) });
    if (ignoreId) q.set("ignore", ignoreId);
    fetch(`/api/availability?${q}`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) return setError(d.error ?? "Couldn't load availability.");
        setSlots(d.slots);
      })
      .catch(() => !cancelled && setError("Couldn't load availability."));
    return () => { cancelled = true; };
  }, [tutorId, date, duration, ignoreId, refreshKey]);

  if (!date) return <p className="text-sm text-bone-mute">Choose a date first.</p>;
  if (error) return <p className="text-sm text-law">{error}</p>;
  if (!slots) return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>;
  if (!slots.some((s) => s.available)) return <p className="text-sm text-bone-mute">No open times on this day. Try another date.</p>;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const selected = s.start === value;
        return (
          <button
            type="button"
            key={s.start}
            disabled={!s.available}
            onClick={() => onChange(s.start)}
            aria-pressed={selected}
            className={`h-11 rounded-xl text-sm transition ${selected ? "text-ink" : s.available ? "border border-white/10 hover:border-white/40" : "border border-white/[0.04] text-bone-mute/40 line-through"}`}
            style={selected ? { background: accent } : undefined}
          >
            {formatTime(s.start)}
          </button>
        );
      })}
    </div>
  );
}
