import { NextRequest } from "next/server";
import { signInSchema } from "@/lib/validation";
import { handle } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export function POST(req: NextRequest) {
  return handle(async () => {
    const { email, password } = signInSchema.parse(await req.json().catch(() => ({})));
    await repo.signIn(email, password);
    return { ok: true };
  });
}
