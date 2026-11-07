import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Booking, Profile } from "@/lib/types";
import { ApiError } from "./errors";

/** LIVE MODE: Supabase auth + Postgres (see supabase/migrations/0001_init.sql). */

export function userClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component — middleware refreshes the session instead */
        }
      },
    },
  });
}

/** Service-role client: bypasses RLS. Used only server-side for cross-user availability checks. */
const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toBooking = (r: Row): Booking => ({
  id: r.id, userId: r.user_id, tutorId: r.tutor_id, specialization: r.specialization, topic: r.topic, notes: r.notes ?? "",
  date: r.date, start: String(r.start_time).slice(0, 5), duration: r.duration_minutes, format: r.format, price: r.price,
  status: r.status, contactName: r.contact_name, contactEmail: r.contact_email, contactPhone: r.contact_phone ?? "", createdAt: r.created_at,
});

const toProfile = (r: Row, email: string): Profile => ({
  id: r.id, email, fullName: r.full_name ?? "", phone: r.phone ?? "", faculty: r.faculty ?? "", goals: r.goals ?? "",
});

const fail = (e: { message: string; code?: string } | null) => {
  if (!e) return;
  if (e.code === "23P01") throw new ApiError(409, "That time was just taken. Please choose another slot.", "start");
  throw new ApiError(500, e.message);
};

export async function liveCurrentUser(): Promise<Profile | null> {
  const sb = userClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: row } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return toProfile(row ?? { id: data.user.id, full_name: data.user.user_metadata?.full_name }, data.user.email ?? "");
}

export async function liveSignUp(email: string, password: string, fullName: string) {
  const { data, error } = await userClient().auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) throw new ApiError(error.status === 422 ? 409 : 400, error.message);
  return { needsConfirmation: !data.session };
}

export async function liveSignIn(email: string, password: string) {
  const { error } = await userClient().auth.signInWithPassword({ email, password });
  if (error) throw new ApiError(401, error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
}

export async function liveSignOut() {
  await userClient().auth.signOut();
}

export async function liveUpdateProfile(uid: string, patch: Partial<Profile>) {
  const sb = userClient();
  const { data, error } = await sb
    .from("profiles")
    .update({ full_name: patch.fullName, phone: patch.phone, faculty: patch.faculty || null, goals: patch.goals })
    .eq("id", uid)
    .select("*")
    .single();
  fail(error);
  const { data: u } = await sb.auth.getUser();
  return toProfile(data!, u.user?.email ?? "");
}

export async function liveBookingsForTutor(tutorId: string) {
  const { data, error } = await admin().from("bookings").select("*").eq("tutor_id", tutorId).eq("status", "confirmed");
  fail(error);
  return (data ?? []).map(toBooking);
}

export async function liveBookingsForUser(uid: string) {
  const { data, error } = await userClient().from("bookings").select("*").eq("user_id", uid).order("date");
  fail(error);
  return (data ?? []).map(toBooking);
}

export async function liveGetBooking(id: string) {
  const { data } = await userClient().from("bookings").select("*").eq("id", id).maybeSingle();
  return data ? toBooking(data) : null;
}

export async function liveInsertBooking(b: Omit<Booking, "id" | "createdAt">) {
  const { data, error } = await userClient()
    .from("bookings")
    .insert({
      user_id: b.userId, tutor_id: b.tutorId, specialization: b.specialization, topic: b.topic, notes: b.notes, date: b.date,
      start_time: b.start, duration_minutes: b.duration, format: b.format, price: b.price, status: b.status,
      contact_name: b.contactName, contact_email: b.contactEmail, contact_phone: b.contactPhone,
    })
    .select("*")
    .single();
  fail(error);
  return toBooking(data!);
}

export async function liveUpdateBooking(id: string, patch: Partial<Booking>) {
  const row: Row = {};
  if (patch.date) row.date = patch.date;
  if (patch.start) row.start_time = patch.start;
  if (patch.status) row.status = patch.status;
  const { data, error } = await userClient().from("bookings").update(row).eq("id", id).select("*").single();
  fail(error);
  return toBooking(data!);
}

export async function liveFavorites(uid: string) {
  const { data, error } = await userClient().from("favorites").select("tutor_id").eq("user_id", uid);
  fail(error);
  return (data ?? []).map((r) => r.tutor_id as string);
}

export async function liveSetFavorite(uid: string, tutorId: string, on: boolean) {
  const sb = userClient();
  const { error } = on
    ? await sb.from("favorites").upsert({ user_id: uid, tutor_id: tutorId })
    : await sb.from("favorites").delete().eq("user_id", uid).eq("tutor_id", tutorId);
  fail(error);
  return liveFavorites(uid);
}
