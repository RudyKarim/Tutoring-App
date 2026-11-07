import { NextRequest } from "next/server";
import { z } from "zod";
import { getTutor } from "@/lib/data";
import { ApiError } from "@/lib/server/errors";
import { handle, requireUser } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => ({ favorites: await repo.favorites((await requireUser()).id) }));
}

export function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const { tutorId, favorite } = z.object({ tutorId: z.string(), favorite: z.boolean() }).parse(await req.json().catch(() => ({})));
    if (!getTutor(tutorId)) throw new ApiError(404, "Tutor not found.");
    return { favorites: await repo.setFavorite(user.id, tutorId, favorite) };
  });
}
