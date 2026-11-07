import "server-only";
import type { Booking, Profile } from "@/lib/types";
import { isLiveMode } from "./mode";
import * as demo from "./demo";
import * as live from "./live";

/** Single entry point for data access. Chooses Supabase (live) or in-memory (demo). */
const L = () => isLiveMode();

export const repo = {
  mode: () => (L() ? "live" : "demo") as "live" | "demo",
  currentUser: (): Promise<Profile | null> => (L() ? live.liveCurrentUser() : demo.demoCurrentUser()),
  signUp: async (email: string, password: string, fullName: string) =>
    L() ? live.liveSignUp(email, password, fullName) : (await demo.demoSignUp(email, password, fullName), { needsConfirmation: false }),
  signIn: (email: string, password: string) => (L() ? live.liveSignIn(email, password) : demo.demoSignIn(email, password)),
  signOut: () => (L() ? live.liveSignOut() : demo.demoSignOut()),
  updateProfile: (uid: string, p: Partial<Profile>) => (L() ? live.liveUpdateProfile(uid, p) : demo.demoUpdateProfile(uid, p)),
  bookingsForTutor: (tutorId: string): Promise<Booking[]> => (L() ? live.liveBookingsForTutor(tutorId) : demo.demoBookingsForTutor(tutorId)),
  bookingsForUser: (uid: string): Promise<Booking[]> => (L() ? live.liveBookingsForUser(uid) : demo.demoBookingsForUser(uid)),
  getBooking: (id: string) => (L() ? live.liveGetBooking(id) : demo.demoGetBooking(id)),
  insertBooking: (b: Omit<Booking, "id" | "createdAt">) => (L() ? live.liveInsertBooking(b) : demo.demoInsertBooking(b)),
  updateBooking: (id: string, p: Partial<Booking>) => (L() ? live.liveUpdateBooking(id, p) : demo.demoUpdateBooking(id, p)),
  favorites: (uid: string) => (L() ? live.liveFavorites(uid) : demo.demoFavorites(uid)),
  setFavorite: (uid: string, tutorId: string, on: boolean) => (L() ? live.liveSetFavorite(uid, tutorId, on) : demo.demoSetFavorite(uid, tutorId, on)),
};
