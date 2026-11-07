import { redirect } from "next/navigation";
import { repo } from "@/lib/server/repo";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await repo.currentUser();
  if (!user) redirect("/login?next=/profile");
  return (
    <main className="mx-auto max-w-2xl px-5 pb-24 pt-32">
      <div className="eyebrow">Account</div>
      <h1 className="h-display mb-10 mt-2 text-5xl">Your profile</h1>
      <ProfileForm profile={user} />
    </main>
  );
}
