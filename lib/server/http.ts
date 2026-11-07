import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";
import { repo } from "./repo";

export function handle(fn: () => Promise<unknown>) {
  return fn()
    .then((data) => NextResponse.json(data ?? { ok: true }))
    .catch((e: unknown) => {
      if (e instanceof ZodError) {
        const issue = e.issues[0];
        return NextResponse.json({ error: issue.message, field: issue.path.join(".") }, { status: 400 });
      }
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, field: e.field }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    });
}

export async function requireUser() {
  const user = await repo.currentUser();
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  return user;
}
