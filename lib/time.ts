/** All session times are wall-clock times in the platform time zone. */
export const PLATFORM_TZ = "America/New_York";
export const PLATFORM_TZ_LABEL = "Eastern Time";

export const pad = (n: number) => String(n).padStart(2, "0");

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const fromMinutes = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

/** Current date and minute-of-day in the platform time zone. */
export function nowInPlatform(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const dayOfWeek = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00Z`).getTime()) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function formatTime(hhmm: string) {
  const mins = toMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

/** Bookable window: tomorrow-ish onward, up to 8 weeks ahead. */
export const BOOKING_HORIZON_DAYS = 56;
/** Minimum notice before a session can be booked or rescheduled. */
export const MIN_NOTICE_MINUTES = 120;
/** Sessions cannot be cancelled with less notice than this. */
export const CANCEL_NOTICE_MINUTES = 24 * 60;

/** Minutes from now (platform tz) until the given date+time; negative if past. */
export function minutesUntil(date: string, start: string, now = new Date()) {
  const n = nowInPlatform(now);
  const dayDiff = Math.round((new Date(`${date}T12:00:00Z`).getTime() - new Date(`${n.date}T12:00:00Z`).getTime()) / 86400000);
  return dayDiff * 1440 + toMinutes(start) - n.minutes;
}
