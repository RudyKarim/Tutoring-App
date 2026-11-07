import "server-only";
import { createHash, randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { Booking, Profile } from "@/lib/types";
import { addDays, nowInPlatform } from "@/lib/time";
import { ApiError } from "./errors";

/**
 * DEMO MODE store. Everything lives in server memory and is reset when the
 * server restarts. A demo account is always available:
 *   demo@praxis.study / praxis-demo
 */
interface DemoUser { profile: Profile; passwordHash: string }
interface DemoDB {
  users: Map<string, DemoUser>;
  sessions: Map<string, string>; // token -> user id
  bookings: Booking[];
  favorites: Map<string, Set<string>>;
}

const hash = (pw: string) => createHash("sha256").update(`praxis:${pw}`).digest("hex");
export const SESSION_COOKIE = "praxis_demo_session";

function seed(): DemoDB {
  const db: DemoDB = { users: new Map(), sessions: new Map(), bookings: [], favorites: new Map() };
  const id = "demo-user";
  db.users.set(id, {
    passwordHash: hash("praxis-demo"),
    profile: { id, email: "demo@praxis.study", fullName: "Alex Morgan", phone: "", faculty: "finance", goals: "Prepare for CFA Level I and investment banking interviews." },
  });
  db.favorites.set(id, new Set(["sophia-marchetti", "catherine-wells"]));
  // A couple of sessions so the dashboard isn't empty, plus one that blocks a tutor slot.
  const today = nowInPlatform().date;
  const base = { notes: "", format: "online" as const, status: "confirmed" as const, contactName: "Alex Morgan", contactEmail: "demo@praxis.study", contactPhone: "", createdAt: new Date().toISOString() };
  db.bookings.push(
    { ...base, id: randomUUID(), userId: id, tutorId: "daniel-park", specialization: "accounting", topic: "CFA Level I — Ethics & FRA review", date: nextDow(today, 6), start: "10:00", duration: 60, price: 110 },
    { ...base, id: randomUUID(), userId: id, tutorId: "sophia-marchetti", specialization: "valuation", topic: "DCF walkthrough", date: addDays(today, -9), start: "18:00", duration: 90, price: 210 },
    { ...base, id: randomUUID(), userId: "someone-else", tutorId: "elena-voss", specialization: "mechanical", topic: "Statics", contactName: "Sam", contactEmail: "sam@example.com", date: nextDow(today, 2), start: "10:00", duration: 60, price: 95 },
  );
  return db;
}

function nextDow(from: string, dow: number) {
  for (let i = 2; i < 10; i++) {
    const d = addDays(from, i);
    if (new Date(`${d}T12:00:00Z`).getUTCDay() === dow) return d;
  }
  return addDays(from, 7);
}

const g = globalThis as unknown as { __praxisDemo?: DemoDB };
const db = () => (g.__praxisDemo ??= seed());

// ---------- auth ----------
export async function demoCurrentUser(): Promise<Profile | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const uid = token ? db().sessions.get(token) : undefined;
  return uid ? db().users.get(uid)?.profile ?? null : null;
}

function startSession(uid: string) {
  const token = randomUUID();
  db().sessions.set(token, uid);
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14 });
}

export async function demoSignUp(email: string, password: string, fullName: string) {
  const exists = [...db().users.values()].some((u) => u.profile.email === email);
  if (exists) throw new ApiError(409, "An account with this email already exists.", "email");
  const id = randomUUID();
  db().users.set(id, { passwordHash: hash(password), profile: { id, email, fullName, phone: "", faculty: "", goals: "" } });
  startSession(id);
}

export async function demoSignIn(email: string, password: string) {
  const user = [...db().users.values()].find((u) => u.profile.email === email);
  if (!user || user.passwordHash !== hash(password)) throw new ApiError(401, "Incorrect email or password.");
  startSession(user.profile.id);
}

export async function demoSignOut() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) db().sessions.delete(token);
  cookies().delete(SESSION_COOKIE);
}

// ---------- profile ----------
export async function demoUpdateProfile(uid: string, patch: Partial<Profile>) {
  const u = db().users.get(uid);
  if (!u) throw new ApiError(404, "Profile not found.");
  u.profile = { ...u.profile, ...patch, id: uid, email: u.profile.email };
  return u.profile;
}

// ---------- bookings ----------
export const demoBookingsForTutor = async (tutorId: string) => db().bookings.filter((b) => b.tutorId === tutorId && b.status === "confirmed");
export const demoBookingsForUser = async (uid: string) => db().bookings.filter((b) => b.userId === uid);
export const demoGetBooking = async (id: string) => db().bookings.find((b) => b.id === id) ?? null;

export async function demoInsertBooking(b: Omit<Booking, "id" | "createdAt">) {
  const booking: Booking = { ...b, id: randomUUID(), createdAt: new Date().toISOString() };
  db().bookings.push(booking);
  return booking;
}

export async function demoUpdateBooking(id: string, patch: Partial<Booking>) {
  const b = db().bookings.find((x) => x.id === id);
  if (!b) throw new ApiError(404, "Booking not found.");
  Object.assign(b, patch);
  return b;
}

// ---------- favorites ----------
export const demoFavorites = async (uid: string) => [...(db().favorites.get(uid) ?? [])];
export async function demoSetFavorite(uid: string, tutorId: string, on: boolean) {
  const set = db().favorites.get(uid) ?? new Set<string>();
  if (on) set.add(tutorId); else set.delete(tutorId);
  db().favorites.set(uid, set);
  return [...set];
}
