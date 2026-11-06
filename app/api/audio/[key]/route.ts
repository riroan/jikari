import { getAudio } from "@/lib/db/audio";
import { AUDIO_KEY_RE } from "@/lib/audio-key";

export const dynamic = "force-dynamic";

/** 음성 클립 mp3. 키가 내용 해시라 바뀌지 않는다 → 1년 캐시. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!AUDIO_KEY_RE.test(key)) return new Response(null, { status: 404 });
  const mp3 = await getAudio(key);
  if (!mp3) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(mp3), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
