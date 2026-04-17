import { getProgress, putProgress } from "@/lib/db/progress";
import type { PersistedState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getProgress();
  return Response.json(state);
}

export async function PUT(request: Request) {
  const state = (await request.json()) as PersistedState;
  await putProgress(state);
  return Response.json({ ok: true });
}
