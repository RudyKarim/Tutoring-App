export function DemoBanner() {
  return (
    <div className="fixed bottom-3 left-1/2 z-50 max-w-[calc(100vw-24px)] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-ink-800/90 px-4 py-1.5 text-[10px] tracking-wide text-bone-dim backdrop-blur md:bottom-4 md:text-[11px]">
      <span className="hidden md:inline">Demo mode · bookings are kept in memory · sign in with </span>
      <span className="md:hidden">Demo · </span>
      <span className="text-bone">demo@praxis.study</span> / <span className="text-bone">praxis-demo</span>
    </div>
  );
}
