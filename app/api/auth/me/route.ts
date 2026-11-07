import { handle } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => ({ user: await repo.currentUser(), mode: repo.mode() }));
}
