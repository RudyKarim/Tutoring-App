import "server-only";
import { getTutor } from "@/lib/data";
import { conflicts, inBookingWindow, priceFor, withinSchedule } from "@/lib/availability";
import { CANCEL_NOTICE_MINUTES, minutesUntil } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { bookingSchema, rescheduleSchema } from "@/lib/validation";
import { ApiError } from "./errors";
import { repo } from "./repo";

/** Serialises writes per tutor inside this server process (the DB constraint guards across processes). */
const locks = new Map<string, Promise<unknown>>();
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(key, next.catch(() => undefined));
  return next;
}

async function assertSlotFree(tutorId: string, userId: string, date: string, start: string, duration: number, ignoreId?: string) {
  const tutor = getTutor(tutorId)!;
  if (!withinSchedule(tutor, date, start, duration)) throw new ApiError(400, `${tutor.name} isn't available at that time.`, "start");
  if (!inBookingWindow(date, start)) throw new ApiError(400, "That time is too soon or too far ahead to book.", "start");
  if (conflicts(await repo.bookingsForTutor(tutorId), date, start, duration, ignoreId))
    throw new ApiError(409, "That time was just taken. Please choose another slot.", "start");
  const mine = (await repo.bookingsForUser(userId)).filter((b) => b.status === "confirmed");
  if (conflicts(mine, date, start, duration, ignoreId)) throw new ApiError(409, "You already have a session at that time.", "start");
}

export async function createBooking(user: Profile, raw: unknown) {
  const input = bookingSchema.parse(raw);
  const tutor = getTutor(input.tutorId);
  if (!tutor) throw new ApiError(404, "Tutor not found.", "tutorId");
  if (!tutor.specializations.includes(input.specialization)) throw new ApiError(400, `${tutor.name} doesn't teach that subject.`, "specialization");
  if (!tutor.sessionLengths.includes(input.duration)) throw new ApiError(400, "That session length isn't offered.", "duration");
  if (!tutor.formats.includes(input.format)) throw new ApiError(400, "That session format isn't offered.", "format");

  return withLock(tutor.id, async () => {
    await assertSlotFree(tutor.id, user.id, input.date, input.start, input.duration);
    const { acceptPolicy: _a, ...rest } = input; // eslint-disable-line @typescript-eslint/no-unused-vars
    return repo.insertBooking({ ...rest, userId: user.id, price: priceFor(tutor, input.duration), status: "confirmed" });
  });
}

async function ownBooking(user: Profile, id: string) {
  const b = await repo.getBooking(id);
  if (!b || b.userId !== user.id) throw new ApiError(404, "Booking not found.");
  if (b.status !== "confirmed") throw new ApiError(400, "This session has been cancelled.");
  if (minutesUntil(b.date, b.start) <= 0) throw new ApiError(400, "This session has already taken place.");
  return b;
}

export async function rescheduleBooking(user: Profile, id: string, raw: unknown) {
  const { date, start } = rescheduleSchema.parse(raw);
  const b = await ownBooking(user, id);
  if (b.date === date && b.start === start) throw new ApiError(400, "Choose a different time.", "start");
  return withLock(b.tutorId, async () => {
    await assertSlotFree(b.tutorId, user.id, date, start, b.duration, b.id);
    return repo.updateBooking(b.id, { date, start });
  });
}

export async function cancelBooking(user: Profile, id: string) {
  const b = await ownBooking(user, id);
  if (minutesUntil(b.date, b.start) < CANCEL_NOTICE_MINUTES)
    throw new ApiError(400, "Sessions can only be cancelled at least 24 hours in advance.");
  return repo.updateBooking(b.id, { status: "cancelled" });
}
