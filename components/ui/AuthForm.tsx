"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false); // block native submits before hydration
  useEffect(() => setReady(true), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError({ message: data.error ?? "Something went wrong.", field: data.field });
    if (data.needsConfirmation) return setNotice("Check your inbox to confirm your email, then sign in.");
    router.push(safeNext);
    router.refresh();
  };

  const field = (name: "fullName" | "email" | "password", label: string, type = "text", auto?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        autoComplete={auto}
        className={`input ${error?.field === name ? "input-error" : ""}`}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required
      />
    </div>
  );

  return (
    <main className="grid min-h-screen place-items-center px-5 py-32">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_30%,rgba(90,169,255,0.08),transparent_70%)]" />
      <form onSubmit={submit} method="post" className="panel relative w-full max-w-md space-y-5 p-8" noValidate>
        <div>
          <div className="eyebrow">{mode === "login" ? "Welcome back" : "Join Praxis"}</div>
          <h1 className="h-display mt-2 text-5xl">{mode === "login" ? "Sign in" : "Create account"}</h1>
        </div>
        {mode === "signup" && field("fullName", "Full name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", mode === "login" ? "current-password" : "new-password")}
        {mode === "signup" && <p className="-mt-2 text-xs text-bone-mute">At least 8 characters.</p>}
        {error && <p role="alert" className="text-sm text-law">{error.message}</p>}
        {notice && <p role="status" className="text-sm text-eng">{notice}</p>}
        <button type="submit" disabled={busy || !ready} className="btn-primary w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        <p className="text-center text-sm text-bone-dim">
          {mode === "login" ? (
            <>New here? <Link className="text-bone underline-offset-4 hover:underline" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></>
          ) : (
            <>Already a member? <Link className="text-bone underline-offset-4 hover:underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in</Link></>
          )}
        </p>
      </form>
    </main>
  );
}
