export function Stars({ rating, reviews, className = "" }: { rating: number; reviews?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-bone-dim ${className}`}>
      <span className="text-fin">★</span>
      <span className="text-bone">{rating.toFixed(2)}</span>
      {reviews !== undefined && <span>({reviews})</span>}
    </span>
  );
}
