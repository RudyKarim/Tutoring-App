import type { Tutor } from "./data";
import type { Booking, Slot } from "./types";
import { BOOKING_HORIZON_DAYS, MIN_NOTICE_MINUTES, addDays, dayOfWeek, fromMinutes, minutesUntil, nowInPlatform, toMinutes } from "./time";

export const SLOT_STEP = 30;

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

/** Does the tutor work at this date/time for the full duration? */
export function withinSchedule(tutor: Tutor, date: string, start: string, duration: number) {
  const hours = tutor.schedule[dayOfWeek(date)];
  if (!hours) return false;
  const s = toMinutes(start);
  return s % SLOT_STEP === 0 && s >= hours[0] * 60 && s + duration <= hours[1] * 60;
}

export function inBookingWindow(date: string, start: string, now = new Date()) {
  const today = nowInPlatform(now).date;
  if (date > addDays(today, BOOKING_HORIZON_DAYS)) return false;
  return minutesUntil(date, start, now) >= MIN_NOTICE_MINUTES;
}

export function conflicts(bookings: Booking[], date: string, start: string, duration: number, ignoreId?: string) {
  const s = toMinutes(start);
  return bookings.some(
    (b) => b.id !== ignoreId && b.status === "confirmed" && b.date === date && overlaps(s, s + duration, toMinutes(b.start), toMinutes(b.start) + b.duration),
  );
}

/** All slot start times for a date, flagged available or not. */
export function slotsForDate(tutor: Tutor, date: string, duration: number, tutorBookings: Booking[], ignoreId?: string): Slot[] {
  const hours = tutor.schedule[dayOfWeek(date)];
  if (!hours) return [];
  const slots: Slot[] = [];
  for (let m = hours[0] * 60; m + duration <= hours[1] * 60; m += SLOT_STEP) {
    const start = fromMinutes(m);
    slots.push({ start, available: inBookingWindow(date, start) && !conflicts(tutorBookings, date, start, duration, ignoreId) });
  }
  return slots;
}

export function nextAvailable(tutor: Tutor, tutorBookings: Booking[], duration = tutor.sessionLengths[0]) {
  const today = nowInPlatform().date;
  for (let i = 0; i <= BOOKING_HORIZON_DAYS; i++) {
    const date = addDays(today, i);
    const slot = slotsForDate(tutor, date, duration, tutorBookings).find((s) => s.available);
    if (slot) return { date, start: slot.start };
  }
  return null;
}

export const priceFor = (tutor: Tutor, duration: number) => Math.round((tutor.rate * duration) / 60);
