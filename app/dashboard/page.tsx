import { redirect } from "next/navigation";
import { TUTORS } from "@/lib/data";
import { repo } from "@/lib/server/repo";
import { withNextAvailable } from "@/lib/server/tutors";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await repo.currentUser();
  if (!user) redirect("/login?next=/dashboard");
  const [bookings, favs] = await Promise.all([repo.bookingsForUser(user.id), repo.favorites(user.id)]);
  const favoriteTutors = await withNextAvailable(TUTORS.filter((t) => favs.includes(t.id)));
  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 md:px-10">
      <Dashboard user={user} bookings={bookings} favoriteTutors={favoriteTutors} />
    </main>
  );
}
