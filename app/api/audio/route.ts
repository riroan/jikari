import { listAudioKeys, reportMissingAudio } from "@/lib/db/audio";

export const dynamic = "force-dynamic";

/** 미리 만든 음성 클립 키 목록 — 브라우저가 한 번 받아 두고 재생 때 동기로 조회한다. */
export async function GET() {
  const keys = await listAudioKeys();
  return Response.json({ keys }, { headers: { "Cache-Control": "private, max-age=300" } });
}

/** 클립이 없던 문장 신고 — 다음 scripts/gen-audio.ts 실행 때 만든다. */
export async function POST(request: Request) {
  let text: unknown;
  try {
    text = (await request.json())?.text;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (typeof text !== "string") return Response.json({ ok: false }, { status: 400 });
  return Response.json({ ok: await reportMissingAudio(text) });
}
