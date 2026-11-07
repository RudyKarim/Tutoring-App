import { handle } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export function POST() {
  return handle(async () => {
    await repo.signOut();
    return { ok: true };
  });
}
