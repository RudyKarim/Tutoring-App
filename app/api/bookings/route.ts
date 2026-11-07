import { NextRequest } from "next/server";
import { createBooking } from "@/lib/server/bookings";
import { handle, requireUser } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    return { bookings: await repo.bookingsForUser(user.id) };
  });
}

export function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    return { booking: await createBooking(user, body) };
  });
}
