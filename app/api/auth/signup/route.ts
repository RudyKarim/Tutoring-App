import { NextRequest } from "next/server";
import { signUpSchema } from "@/lib/validation";
import { handle } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export function POST(req: NextRequest) {
  return handle(async () => {
    const { email, password, fullName } = signUpSchema.parse(await req.json().catch(() => ({})));
    return await repo.signUp(email, password, fullName);
  });
}
