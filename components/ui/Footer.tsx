import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-5 py-14 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <div className="font-display text-3xl tracking-[0.08em]">PRAXIS</div>
          <p className="mt-2 max-w-sm text-sm text-bone-mute">Tutoring by people who practise what they teach.</p>
        </div>
        <div className="flex gap-8 text-sm text-bone-dim">
          <Link href="/faculty/engineering" className="hover:text-bone">Engineering</Link>
          <Link href="/faculty/finance" className="hover:text-bone">Finance</Link>
          <Link href="/faculty/law" className="hover:text-bone">Law</Link>
          <Link href="/tutors" className="hover:text-bone">All tutors</Link>
        </div>
        <p className="text-xs text-bone-mute">© {new Date().getFullYear()} Praxis</p>
      </div>
    </footer>
  );
}
