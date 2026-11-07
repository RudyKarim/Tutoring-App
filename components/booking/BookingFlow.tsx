"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { Faculty, Tutor } from "@/lib/data";
import type { Booking, Profile, SessionFormat } from "@/lib/types";
import { priceFor } from "@/lib/availability";
import { formatDate, formatTime, PLATFORM_TZ_LABEL } from "@/lib/time";
import { DatePicker } from "./DatePicker";
import { SlotPicker } from "./SlotPicker";

const STEPS = ["Subject", "Session", "Date", "Time", "Goals", "Details", "Confirm"] as const;

interface Form {
  specialization: string;
  topic: string;
  duration: number;
  format: SessionFormat | "";
  date: string;
  start: string;
  notes: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  acceptPolicy: boolean;
}

/** Which step owns each field — used to jump back when the server rejects something. */
const FIELD_STEP: Record<string, number> = {
  specialization: 0, topic: 0, duration: 1, format: 1, date: 2, start: 3, notes: 4,
  contactName: 5, contactEmail: 5, contactPhone: 5, acceptPolicy: 6,
};

export function BookingFlow({ tutor, faculty, user, initialDate, initialStart }: {
  tutor: Tutor; faculty: Faculty; user: Profile; initialDate?: string; initialStart?: string;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    specialization: tutor.specializations.length === 1 ? tutor.specializations[0] : "",
    topic: "",
    duration: tutor.sessionLengths.includes(60) ? 60 : tutor.sessionLengths[0],
    format: tutor.formats.length === 1 ? tutor.formats[0] : "",
    date: initialDate ?? "",
    start: initialStart ?? "",
    notes: user.goals ?? "",
    contactName: user.fullName,
    contactEmail: user.email,
    contactPhone: user.phone,
    acceptPolicy: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const [slotRefresh, setSlotRefresh] = useState(0);
  const body = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  useEffect(() => {
    if (body.current) gsap.fromTo(body.current, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" });
  }, [step]);

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.specialization) e.specialization = "Choose a subject.";
      if (form.topic.trim().length < 3) e.topic = "Describe the topic in a few words.";
      if (form.topic.length > 140) e.topic = "Keep the topic under 140 characters.";
    }
    if (s === 1) {
      if (!tutor.sessionLengths.includes(form.duration)) e.duration = "Choose a session length.";
      if (!form.format) e.format = "Choose a session format.";
    }
    if (s === 2 && !form.date) e.date = "Choose a date.";
    if (s === 3 && !form.start) e.start = "Choose a time.";
    if (s === 4 && form.notes.length > 1000) e.notes = "Keep notes under 1000 characters.";
    if (s === 5) {
      if (form.contactName.trim().length < 2) e.contactName = "Enter your name.";
      if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) e.contactEmail = "Enter a valid email address.";
      if (!/^[+\d\s().-]*$/.test(form.contactPhone)) e.contactPhone = "Enter a valid phone number.";
    }
    if (s === 6 && !form.acceptPolicy) e.acceptPolicy = "Please accept the cancellation policy.";
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const jump = (i: number) => {
    // Only allow jumping back, or forward through steps that already validate.
    for (let s = 0; s < i; s++) if (Object.values(validate(s)).some(Boolean)) return setStep(s);
    setStep(i);
  };

  const submit = async () => {
    const e = validate(6);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setBusy(true);
    setServerError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tutorId: tutor.id }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      const field = data.field as string | undefined;
      setServerError(data.error ?? "Booking failed.");
      if (field && field in FIELD_STEP) {
        setErrors({ [field]: data.error });
        if (field === "start") { set("start", ""); setSlotRefresh((n) => n + 1); }
        setStep(FIELD_STEP[field]);
      }
      return;
    }
    setDone(data.booking);
  };

  const price = priceFor(tutor, form.duration);
  const specName = (slug: string) => faculty.specializations.find((s) => s.slug === slug)?.name ?? slug;
  const err = (k: string) => errors[k] && <p role="alert" className="mt-2 text-sm text-law">{errors[k]}</p>;

  if (done) {
    return (
      <div className="panel mx-auto max-w-xl p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl text-ink" style={{ background: faculty.accent }}>✓</div>
        <h2 className="h-display mt-6 text-5xl">You&apos;re booked.</h2>
        <p className="mt-4 text-bone-dim">
          {specName(done.specialization)} with {tutor.name}<br />
          {formatDate(done.date)} at {formatTime(done.start)} ({PLATFORM_TZ_LABEL}) · {done.duration} min
        </p>
        <p className="mt-2 text-sm text-bone-mute">A confirmation has been sent to {done.contactEmail}.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
          <Link href="/tutors" className="btn-ghost">Browse tutors</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="panel p-6 md:p-10">
        {/* Stepper */}
        <ol className="mb-10 flex gap-1.5" aria-label="Booking steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button type="button" onClick={() => i < step && jump(i)} disabled={i > step} className="w-full text-left" aria-current={i === step ? "step" : undefined}>
                <div className="h-0.5 rounded-full transition-colors duration-500" style={{ background: i <= step ? faculty.accent : "rgba(255,255,255,0.1)" }} />
                <div className={`mt-2 hidden text-[10px] uppercase tracking-[0.2em] md:block ${i === step ? "text-bone" : "text-bone-mute"}`}>{s}</div>
              </button>
            </li>
          ))}
        </ol>
        <div className="eyebrow">Step {step + 1} of {STEPS.length}</div>

        <div ref={body} className="mt-3 min-h-[340px]">
          {step === 0 && (
            <>
              <h2 className="h-display text-4xl">What would you like to work on?</h2>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {tutor.specializations.map((s) => (
                  <button type="button" key={s} onClick={() => set("specialization", s)} aria-pressed={form.specialization === s}
                    className={`rounded-xl border p-4 text-left transition ${form.specialization === s ? "border-white/50 bg-white/[0.06]" : "border-white/10 hover:border-white/30"}`}>
                    <div className="font-display text-xl">{specName(s)}</div>
                    <div className="mt-1 text-xs text-bone-mute">{faculty.specializations.find((x) => x.slug === s)?.blurb}</div>
                  </button>
                ))}
              </div>
              {err("specialization")}
              <label className="label mt-8" htmlFor="topic">Topic</label>
              <input id="topic" className={`input ${errors.topic ? "input-error" : ""}`} maxLength={140} placeholder="e.g. Beam deflection problems for Thursday's exam" value={form.topic} onChange={(e) => set("topic", e.target.value)} />
              {err("topic")}
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="h-display text-4xl">Shape the session.</h2>
              <div className="label mt-8">Length</div>
              <div className="grid grid-cols-3 gap-3">
                {tutor.sessionLengths.map((l) => (
                  <button type="button" key={l} onClick={() => { set("duration", l); set("start", ""); }} aria-pressed={form.duration === l}
                    className={`rounded-xl border p-4 transition ${form.duration === l ? "border-white/50 bg-white/[0.06]" : "border-white/10 hover:border-white/30"}`}>
                    <div className="font-display text-2xl">{l} min</div>
                    <div className="text-xs text-bone-mute">${priceFor(tutor, l)}</div>
                  </button>
                ))}
              </div>
              {err("duration")}
              <div className="label mt-8">Format</div>
              <div className="grid grid-cols-2 gap-3">
                {(["online", "in-person"] as const).map((f) => {
                  const offered = tutor.formats.includes(f);
                  return (
                    <button type="button" key={f} disabled={!offered} onClick={() => set("format", f)} aria-pressed={form.format === f}
                      className={`rounded-xl border p-4 text-left transition disabled:opacity-30 ${form.format === f ? "border-white/50 bg-white/[0.06]" : "border-white/10 hover:border-white/30"}`}>
                      <div className="font-display text-xl">{f === "online" ? "Online" : "In person"}</div>
                      <div className="text-xs text-bone-mute">{!offered ? "Not offered" : f === "online" ? "Video call link sent on confirmation" : "Location agreed with your tutor"}</div>
                    </button>
                  );
                })}
              </div>
              {err("format")}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="h-display text-4xl">Pick a day.</h2>
              <div className="mt-8 max-w-md">
                <DatePicker value={form.date} onChange={(d) => { set("date", d); set("start", ""); }} workingDays={Object.keys(tutor.schedule).map(Number)} accent={faculty.accent} />
              </div>
              {err("date")}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="h-display text-4xl">Choose a time.</h2>
              <p className="mt-2 text-sm text-bone-mute">{formatDate(form.date)} · {form.duration} min · times in {PLATFORM_TZ_LABEL}</p>
              <div className="mt-8">
                <SlotPicker tutorId={tutor.id} date={form.date} duration={form.duration} value={form.start} onChange={(s) => set("start", s)} accent={faculty.accent} refreshKey={slotRefresh} />
              </div>
              {err("start")}
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="h-display text-4xl">What are your goals?</h2>
              <p className="mt-2 text-sm text-bone-mute">Optional — helps {tutor.name.split(" ")[0]} prepare. Share deadlines, materials or where you&apos;re stuck.</p>
              <textarea className={`input mt-8 min-h-[180px] ${errors.notes ? "input-error" : ""}`} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="I have a midterm on…" />
              <div className="mt-1 text-right text-xs text-bone-mute">{form.notes.length}/1000</div>
              {err("notes")}
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="h-display text-4xl">Your details.</h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="cn">Name</label>
                  <input id="cn" className={`input ${errors.contactName ? "input-error" : ""}`} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} autoComplete="name" />
                  {err("contactName")}
                </div>
                <div>
                  <label className="label" htmlFor="ce">Email</label>
                  <input id="ce" type="email" className={`input ${errors.contactEmail ? "input-error" : ""}`} value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} autoComplete="email" />
                  {err("contactEmail")}
                </div>
                <div>
                  <label className="label" htmlFor="cp">Phone (optional)</label>
                  <input id="cp" type="tel" className={`input ${errors.contactPhone ? "input-error" : ""}`} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} autoComplete="tel" />
                  {err("contactPhone")}
                </div>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="h-display text-4xl">Review &amp; confirm.</h2>
              <dl className="mt-8 divide-y divide-white/[0.06] text-sm">
                {[
                  ["Tutor", tutor.name, 1],
                  ["Subject", `${specName(form.specialization)} — ${form.topic}`, 0],
                  ["When", `${formatDate(form.date)}, ${formatTime(form.start)} (${PLATFORM_TZ_LABEL})`, 2],
                  ["Session", `${form.duration} min · ${form.format === "online" ? "Online" : "In person"}`, 1],
                  ["Contact", `${form.contactName} · ${form.contactEmail}`, 5],
                ].map(([k, v, s]) => (
                  <div key={k as string} className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-bone-mute">{k}</dt>
                    <dd className="flex-1 text-right">{v}</dd>
                    <button type="button" onClick={() => setStep(s as number)} className="text-xs text-bone-mute hover:text-bone">Edit</button>
                  </div>
                ))}
              </dl>
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-bone-dim">
                <span className="text-bone">Payment:</span> ${price} is due after your session. Card payments will be added when the payment provider is connected.
              </div>
              <label className="mt-6 flex items-start gap-3 text-sm text-bone-dim">
                <input type="checkbox" checked={form.acceptPolicy} onChange={(e) => set("acceptPolicy", e.target.checked)} className="mt-1 accent-bone" />
                I understand sessions can be rescheduled or cancelled free of charge up to 24 hours before the start time.
              </label>
              {err("acceptPolicy")}
            </>
          )}
        </div>

        {serverError && <p role="alert" className="mt-6 rounded-xl border border-law/40 bg-law/10 p-3 text-sm text-law">{serverError}</p>}

        <div className="mt-10 flex items-center justify-between">
          <button type="button" onClick={back} disabled={step === 0} className="btn-ghost">← Back</button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary">Continue →</button>
          ) : (
            <button type="button" onClick={submit} disabled={busy} className="btn-primary" style={{ boxShadow: `0 0 40px -10px ${faculty.accent}` }}>
              {busy ? "Confirming…" : `Confirm booking · $${price}`}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <aside className="panel h-fit p-6 lg:sticky lg:top-28">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full font-display text-lg" style={{ background: `radial-gradient(circle at 30% 30%, ${faculty.accent}66, #111117 70%)` }}>{tutor.initials}</div>
          <div>
            <div className="font-display text-xl">{tutor.name}</div>
            <div className="text-xs text-bone-mute">{tutor.title}</div>
          </div>
        </div>
        <div className="my-5 h-px bg-white/10" />
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-bone-mute">Subject</dt><dd>{form.specialization ? specName(form.specialization) : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-bone-mute">Length</dt><dd>{form.duration} min</dd></div>
          <div className="flex justify-between"><dt className="text-bone-mute">Format</dt><dd>{form.format ? (form.format === "online" ? "Online" : "In person") : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-bone-mute">Date</dt><dd>{form.date ? formatDate(form.date, { weekday: "short", month: "short", day: "numeric" }) : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-bone-mute">Time</dt><dd>{form.start ? formatTime(form.start) : "—"}</dd></div>
        </dl>
        <div className="my-5 h-px bg-white/10" />
        <div className="flex items-end justify-between">
          <span className="text-bone-mute">Total</span>
          <span className="font-display text-3xl">${price}</span>
        </div>
      </aside>
    </div>
  );
}
