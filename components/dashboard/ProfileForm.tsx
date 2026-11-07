"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FACULTIES } from "@/lib/data";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: profile.fullName, phone: profile.phone, faculty: profile.faculty, goals: profile.goals });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError({ message: data.error, field: data.field });
    setSaved(true);
    router.refresh();
  };
  const cls = (f: string) => `input ${error?.field === f ? "input-error" : ""}`;

  return (
    <form onSubmit={save} className="panel space-y-6 p-8" noValidate>
      <div>
        <label className="label">Email</label>
        <input className="input opacity-60" value={profile.email} disabled />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fn">Full name</label>
          <input id="fn" className={cls("fullName")} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ph">Phone</label>
          <input id="ph" type="tel" className={cls("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="fa">Main faculty</label>
        <select id="fa" className={cls("faculty")} value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value as Profile["faculty"] })}>
          <option value="">Not set</option>
          {FACULTIES.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="go">Learning goals</label>
        <textarea id="go" maxLength={500} className={`${cls("goals")} min-h-[120px]`} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Shared with tutors when you book." />
      </div>
      {error && <p role="alert" className="text-sm text-law">{error.message}</p>}
      {saved && <p role="status" className="text-sm text-eng">Profile saved.</p>}
      <button disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
