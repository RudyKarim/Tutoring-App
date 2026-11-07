import { Suspense } from "react";
import type { Metadata } from "next";
import { TutorGallery } from "@/components/tutors/TutorGallery";
import { Footer } from "@/components/ui/Footer";
import { favoritesForCurrentUser, withNextAvailable } from "@/lib/server/tutors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tutors" };

export default async function TutorsPage() {
  const [tutors, { user, favorites }] = await Promise.all([withNextAvailable(), favoritesForCurrentUser()]);
  return (
    <>
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-32 md:px-10">
        <div className="eyebrow">The Faculty</div>
        <h1 className="h-display mt-3 text-6xl md:text-7xl">Find your tutor</h1>
        <p className="mt-4 max-w-xl text-bone-dim">Every tutor is a practitioner, vetted for expertise and teaching. Filter by subject, format and price.</p>
        <div className="mt-12">
          <Suspense>
            <TutorGallery tutors={tutors} favorites={favorites} signedIn={!!user} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
