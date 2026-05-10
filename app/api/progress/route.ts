import { getProgress, putProgress } from "@/lib/db/progress";
import { persistedStateSchema } from "@/lib/import";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getProgress();
  return Response.json(state);
}

export async function PUT(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const parsed = persistedStateSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "schema validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  await putProgress(parsed.data);
  return Response.json({ ok: true });
}
