import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFaculty, getTutor } from "@/lib/data";
import { isValidDate } from "@/lib/time";
import { repo } from "@/lib/server/repo";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book a session" };

export default async function BookPage({ params, searchParams }: { params: { tutorId: string }; searchParams: { date?: string; start?: string } }) {
  const tutor = getTutor(params.tutorId);
  if (!tutor) notFound();
  const user = await repo.currentUser();
  if (!user) {
    const q = new URLSearchParams(searchParams as Record<string, string>).toString();
    redirect(`/login?next=${encodeURIComponent(`/book/${tutor.id}${q ? `?${q}` : ""}`)}`);
  }
  const date = searchParams.date && isValidDate(searchParams.date) ? searchParams.date : undefined;
  const start = date && /^\d{2}:\d{2}$/.test(searchParams.start ?? "") ? searchParams.start : undefined;
  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 md:px-10">
      <Link href={`/tutors/${tutor.id}`} className="eyebrow hover:text-bone">← {tutor.name}</Link>
      <h1 className="h-display mb-10 mt-4 text-5xl md:text-6xl">Book a session</h1>
      <BookingFlow tutor={tutor} faculty={getFaculty(tutor.faculty)!} user={user} initialDate={date} initialStart={start} />
    </main>
  );
}
