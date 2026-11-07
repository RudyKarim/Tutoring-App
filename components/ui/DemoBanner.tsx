export function DemoBanner() {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/90 px-4 py-1.5 text-[11px] tracking-wide text-bone-dim backdrop-blur">
      Demo mode · bookings are kept in memory · sign in with <span className="text-bone">demo@praxis.study</span> / <span className="text-bone">praxis-demo</span>
    </div>
  );
}
