import { NextRequest } from "next/server";
import { getTutor } from "@/lib/data";
import { slotsForDate } from "@/lib/availability";
import { isValidDate } from "@/lib/time";
import { ApiError } from "@/lib/server/errors";
import { handle } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

// GET /api/availability?tutorId=...&date=YYYY-MM-DD&duration=60[&ignore=bookingId]
export function GET(req: NextRequest) {
  return handle(async () => {
    const p = req.nextUrl.searchParams;
    const tutor = getTutor(p.get("tutorId") ?? "");
    if (!tutor) throw new ApiError(404, "Tutor not found.");
    const date = p.get("date") ?? "";
    if (!isValidDate(date)) throw new ApiError(400, "Invalid date.");
    const duration = Number(p.get("duration") ?? tutor.sessionLengths[0]);
    if (!tutor.sessionLengths.includes(duration)) throw new ApiError(400, "Invalid session length.");
    const bookings = await repo.bookingsForTutor(tutor.id);
    return { date, duration, slots: slotsForDate(tutor, date, duration, bookings, p.get("ignore") ?? undefined) };
  });
}
