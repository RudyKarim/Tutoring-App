import { NextRequest } from "next/server";
import { profileSchema } from "@/lib/validation";
import { handle, requireUser } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => ({ profile: await requireUser() }));
}

export function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const patch = profileSchema.parse(await req.json().catch(() => ({})));
    return { profile: await repo.updateProfile(user.id, patch) };
  });
}
