import { NextRequest } from "next/server";
import { cancelBooking, rescheduleBooking } from "@/lib/server/bookings";
import { handle, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

// PATCH = reschedule { date, start }
export function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    return { booking: await rescheduleBooking(user, params.id, await req.json().catch(() => ({}))) };
  });
}

// DELETE = cancel
export function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    return { booking: await cancelBooking(user, params.id) };
  });
}
