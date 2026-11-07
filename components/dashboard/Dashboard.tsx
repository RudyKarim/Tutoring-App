"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFaculty, getTutor, specializationName } from "@/lib/data";
import type { Booking, Profile } from "@/lib/types";
import type { TutorWithNext } from "@/lib/server/tutors";
import { CANCEL_NOTICE_MINUTES, formatDate, formatTime, minutesUntil, PLATFORM_TZ_LABEL } from "@/lib/time";
import { DatePicker } from "@/components/booking/DatePicker";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { TutorCard } from "@/components/tutors/TutorCard";

export function Dashboard({ user, bookings, favoriteTutors }: { user: Profile; bookings: Booking[]; favoriteTutors: TutorWithNext[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const isUpcoming = (b: Booking) => b.status === "confirmed" && minutesUntil(b.date, b.start) > 0;
  const sorted = [...bookings].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const upcoming = sorted.filter(isUpcoming);
  const past = sorted.filter((b) => !isUpcoming(b)).reverse();
  const list = tab === "upcoming" ? upcoming : past;
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  return (
    <div>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1 className="h-display mt-2 text-5xl md:text-6xl">Hello, {user.fullName.split(" ")[0] || "there"}.</h1>
          <p className="mt-3 text-bone-dim">
            {upcoming.length ? `You have ${upcoming.length} upcoming ${upcoming.length === 1 ? "session" : "sessions"}.` : "No sessions booked yet."}
          </p>
        </div>
        <Link href="/tutors" className="btn-primary">Book a session</Link>
      </div>

      <div className="mt-12 flex gap-6 border-b border-white/[0.08]">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b pb-3 text-sm capitalize tracking-wide transition ${tab === t ? "border-bone text-bone" : "border-transparent text-bone-mute hover:text-bone-dim"}`}>
            {t} <span className="text-bone-mute">({t === "upcoming" ? upcoming.length : past.length})</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {list.length === 0 && (
          <div className="panel p-10 text-center text-bone-dim">
            {tab === "upcoming" ? <>Nothing scheduled. <Link href="/tutors" className="text-bone underline-offset-4 hover:underline">Find a tutor →</Link></> : "No past sessions yet."}
          </div>
        )}
        {list.map((b) => (
          <BookingRow key={b.id} booking={b} editing={editing === b.id} onEdit={() => setEditing(editing === b.id ? null : b.id)}
            onChanged={(m) => { setEditing(null); flash(m); router.refresh(); }} />
        ))}
      </div>

      <section className="mt-20">
        <div className="eyebrow">Favourites</div>
        <h2 className="h-display mt-2 text-4xl">Saved tutors</h2>
        {favoriteTutors.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteTutors.map((t) => <TutorCard key={t.id} tutor={t} favorite signedIn />)}
          </div>
        ) : (
          <p className="mt-4 text-bone-dim">Tap ♡ on any tutor to save them here.</p>
        )}
      </section>

      {toast && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-bone px-5 py-2 text-sm text-ink">{toast}</div>}
    </div>
  );
}

function BookingRow({ booking: b, editing, onEdit, onChanged }: { booking: Booking; editing: boolean; onEdit: () => void; onChanged: (msg: string) => void }) {
  const tutor = getTutor(b.tutorId);
  const faculty = tutor ? getFaculty(tutor.faculty) : undefined;
  const accent = faculty?.accent ?? "#ece8e1";
  const [date, setDate] = useState(b.date);
  const [start, setStart] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const mins = minutesUntil(b.date, b.start);
  const upcoming = b.status === "confirmed" && mins > 0;
  const canCancel = upcoming && mins >= CANCEL_NOTICE_MINUTES;

  const call = async (method: "PATCH" | "DELETE", body?: object) => {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/bookings/${b.id}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong."), false;
    return true;
  };

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
        <div className="w-20 shrink-0 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-bone-mute">{formatDate(b.date, { month: "short" })}</div>
          <div className="font-display text-4xl" style={{ color: b.status === "cancelled" ? undefined : accent }}>{Number(b.date.slice(8))}</div>
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl">{tutor?.name ?? b.tutorId}</span>
            {b.status === "cancelled" && <span className="chip !border-law/40 !text-law">Cancelled</span>}
            {b.status === "confirmed" && !upcoming && <span className="chip">Completed</span>}
          </div>
          <div className="mt-1 text-sm text-bone-dim">
            {tutor ? specializationName(tutor.faculty, b.specialization) : b.specialization} — {b.topic}
          </div>
          <div className="mt-1 text-xs text-bone-mute">
            {formatDate(b.date)} · {formatTime(b.start)} ({PLATFORM_TZ_LABEL}) · {b.duration} min · {b.format === "online" ? "Online" : "In person"} · ${b.price}
          </div>
        </div>
        <div className="flex gap-2">
          {upcoming && <button onClick={onEdit} className="btn-ghost !px-4 !py-2">{editing ? "Close" : "Reschedule"}</button>}
          {upcoming && (
            confirmCancel ? (
              <>
                <button disabled={busy} onClick={async () => (await call("DELETE")) && onChanged("Session cancelled.")} className="btn !bg-law !px-4 !py-2 text-bone">Confirm cancel</button>
                <button onClick={() => setConfirmCancel(false)} className="btn-ghost !px-4 !py-2">Keep</button>
              </>
            ) : (
              <button
                onClick={() => (canCancel ? setConfirmCancel(true) : setError("Sessions can only be cancelled at least 24 hours in advance."))}
                className="btn-ghost !px-4 !py-2 text-bone-dim"
              >
                Cancel
              </button>
            )
          )}
          {!upcoming && tutor && <Link href={`/book/${tutor.id}`} className="btn-ghost !px-4 !py-2">Book again</Link>}
        </div>
      </div>
      {error && <p role="alert" className="px-6 pb-4 text-sm text-law">{error}</p>}
      {editing && tutor && (
        <div className="grid gap-8 border-t border-white/[0.06] bg-white/[0.015] p-6 md:grid-cols-2">
          <DatePicker value={date} onChange={(d) => { setDate(d); setStart(""); }} workingDays={Object.keys(tutor.schedule).map(Number)} accent={accent} />
          <div>
            <div className="label">New time · {formatDate(date, { weekday: "short", month: "short", day: "numeric" })}</div>
            <SlotPicker tutorId={tutor.id} date={date} duration={b.duration} value={start} onChange={setStart} accent={accent} ignoreId={b.id} />
            <button disabled={!start || busy} onClick={async () => (await call("PATCH", { date, start })) && onChanged("Session rescheduled.")} className="btn-primary mt-6 w-full">
              {busy ? "Saving…" : start ? `Move to ${formatTime(start)}` : "Choose a time"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
