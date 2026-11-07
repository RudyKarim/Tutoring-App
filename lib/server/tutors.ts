import "server-only";
import { TUTORS, type Tutor } from "@/lib/data";
import { nextAvailable } from "@/lib/availability";
import { repo } from "./repo";

export interface TutorWithNext extends Tutor {
  next: { date: string; start: string } | null;
}

export async function withNextAvailable(tutors: Tutor[] = TUTORS): Promise<TutorWithNext[]> {
  return Promise.all(tutors.map(async (t) => ({ ...t, next: nextAvailable(t, await repo.bookingsForTutor(t.id)) })));
}

export async function favoritesForCurrentUser() {
  const user = await repo.currentUser();
  return { user, favorites: user ? await repo.favorites(user.id) : [] };
}
