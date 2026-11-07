"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FavoriteButton({ tutorId, initial, signedIn, className = "" }: { tutorId: string; initial: boolean; signedIn: boolean; className?: string }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) return router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    setBusy(true);
    setOn(!on); // optimistic
    const res = await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId, favorite: !on }) });
    if (!res.ok) setOn(on);
    setBusy(false);
    router.refresh();
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? "Remove from favourites" : "Save to favourites"}
      className={`grid h-9 w-9 place-items-center rounded-full border transition ${on ? "border-law/60 bg-law/15 text-law" : "border-white/15 text-bone-dim hover:text-bone"} ${className}`}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
