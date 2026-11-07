import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <div className="eyebrow">404</div>
        <h1 className="h-display mt-3 text-6xl">Page not found</h1>
        <Link href="/" className="btn-ghost mt-8">Back to Praxis</Link>
      </div>
    </main>
  );
}
