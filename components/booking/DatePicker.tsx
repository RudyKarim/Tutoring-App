"use client";
import { useMemo, useState } from "react";
import { BOOKING_HORIZON_DAYS, addDays, nowInPlatform } from "@/lib/time";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** Month calendar limited to the booking window; days the tutor doesn't work are disabled. */
export function DatePicker({ value, onChange, workingDays, accent }: { value: string; onChange: (d: string) => void; workingDays: number[]; accent: string }) {
  const today = nowInPlatform().date;
  const last = addDays(today, BOOKING_HORIZON_DAYS);
  const [month, setMonth] = useState((value || today).slice(0, 7));

  const days = useMemo(() => {
    const first = `${month}-01`;
    const lead = new Date(`${first}T12:00:00Z`).getUTCDay();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = first; d.startsWith(month); d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  const shift = (n: number) => {
    const d = new Date(`${month}-15T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const label = new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={month <= today.slice(0, 7)} className="btn-ghost h-9 w-9 !p-0" aria-label="Previous month">←</button>
        <div className="font-display text-2xl">{label}</div>
        <button type="button" onClick={() => shift(1)} disabled={month >= last.slice(0, 7)} className="btn-ghost h-9 w-9 !p-0" aria-label="Next month">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DOW.map((d, i) => <div key={i} className="pb-2 text-[11px] uppercase tracking-[0.2em] text-bone-mute">{d}</div>)}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const works = workingDays.includes(new Date(`${d}T12:00:00Z`).getUTCDay());
          const disabled = d < today || d > last || !works;
          const selected = d === value;
          return (
            <button
              type="button"
              key={d}
              disabled={disabled}
              onClick={() => onChange(d)}
              aria-pressed={selected}
              aria-label={d}
              className={`aspect-square rounded-xl text-sm transition ${selected ? "text-ink" : disabled ? "text-bone-mute/40" : "border border-white/10 hover:border-white/40"}`}
              style={selected ? { background: accent } : undefined}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
