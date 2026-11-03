import { getProgressSnapshot, putProgress } from "@/lib/db/progress";
import { jsonResponse } from "@/lib/gzip-response";
import { persistedStateSchema } from "@/lib/import";
import { progressTag } from "@/lib/progress-tag";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const state = await getProgressSnapshot();
  const res = jsonResponse(req, JSON.stringify(state));
  res.headers.set("ETag", progressTag(state)); // version tag: the client echoes it as If-Match on PUT
  return res;
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

  const result = await putProgress(parsed.data, request.headers.get("if-match"));
  if (!result.ok) {
    // Someone else saved since this client's GET: hand back the current state so it can merge and retry.
    return Response.json(result.current, { status: 409, headers: { ETag: result.tag } });
  }
  return Response.json({ ok: true }, { headers: { ETag: result.tag } });
}
