"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function SiteNav({ user }: { user: { name: string; email: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/faculty/engineering", label: "Engineering" },
    { href: "/faculty/finance", label: "Finance" },
    { href: "/faculty/law", label: "Law" },
    { href: "/tutors", label: "Tutors" },
  ];
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  };
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Link href="/" className="font-display text-2xl tracking-[0.08em]" onClick={() => setOpen(false)}>
          PRAXIS
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`text-[13px] tracking-wide transition hover:text-bone ${pathname.startsWith(l.href) ? "text-bone" : "text-bone-dim"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link href="/dashboard" className="btn-ghost !px-4 !py-2">Dashboard</Link>
              <Link href="/profile" title={user.email} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-xs">
                {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("") || "·"}
              </Link>
              <button onClick={signOut} className="text-[13px] text-bone-dim hover:text-bone">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[13px] text-bone-dim hover:text-bone">Sign in</Link>
              <Link href="/signup" className="btn-primary !px-5 !py-2">Join Praxis</Link>
            </>
          )}
        </div>
        <button className="md:hidden text-sm tracking-widest2 uppercase" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="mx-4 rounded-2xl border border-white/10 bg-ink-900/95 p-6 backdrop-blur md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="font-display text-2xl">{l.label}</Link>
            ))}
            <div className="my-2 h-px bg-white/10" />
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                <Link href="/profile" onClick={() => setOpen(false)}>Profile</Link>
                <button onClick={signOut} className="text-left text-bone-dim">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn-primary">Join Praxis</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
