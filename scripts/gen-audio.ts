/**
 * 미리 만든 음성 생성 — GCP Text-to-Speech(ja-JP-Neural2-B)로 앱이 읽는 문장을 mp3로 만들어
 * audio_clips에 넣는다. 이미 있는 키는 건너뛴다 (콘텐츠 추가 후 다시 돌리면 새 것만 만든다).
 *
 *   bun scripts/gen-audio.ts --dry-run          # 만들 개수·글자 수만
 *   bun scripts/gen-audio.ts                    # 로컬 DB
 *   JIKARI_DB=remote bun scripts/gen-audio.ts   # 운영 DB
 *   --limit=50                                  # 이번에 만들 최대 개수
 *
 * 키는 환경 변수 GOOGLE_TTS_API_KEY (요청 헤더로만 보낸다 — 출력·URL에 남기지 않는다).
 * 모으는 문장: 단어(표기·읽기)·문장·일상표현·문법 예문/퀴즈·소리 구별 쌍·한마디 팩 + 앱이 신고한
 * "음성 없음" 문장(audio_missing). 숫자 듣기는 무한 생성이라 대상이 아니다 (브라우저 TTS).
 */
import mysql, { type RowDataPacket } from "mysql2/promise";
import { loadJikariEnv } from "./_env";
import { toSpeakable } from "../lib/tts";
import { AUDIO_VOICE, audioKey } from "../lib/audio-key";
import { MINIMAL_PAIRS } from "../lib/minimal-pairs";
import { PHRASE_PACKS } from "../lib/phrase-packs";

loadJikariEnv();

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice(8)) : Infinity;
const apiKey = process.env.GOOGLE_TTS_API_KEY;
const CONCURRENCY = 4;

const json = <T>(v: unknown, fallback: T): T => {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
};

async function collect(conn: mysql.Connection): Promise<string[]> {
  const out: string[] = [];
  const add = (s: string | null | undefined) => {
    const p = s ? toSpeakable(s) : "";
    if (p) out.push(p);
  };

  const [vocab] = await conn.query<RowDataPacket[]>("SELECT word, reading, ruby FROM vocab_cards");
  for (const v of vocab) {
    add(v.word);
    add(v.reading);
    add(v.ruby);
  }
  const [sentences] = await conn.query<RowDataPacket[]>(
    "SELECT sentence, sentence_ruby, blank, blank_ruby FROM sentence_cards",
  );
  for (const s of sentences) {
    add(String(s.sentence).replace("＿＿＿", s.blank));
    if (s.sentence_ruby) add(String(s.sentence_ruby).replace("＿＿＿", s.blank_ruby ?? s.blank));
  }
  const [expressions] = await conn.query<RowDataPacket[]>("SELECT expression_jp, ruby FROM expression_cards");
  for (const e of expressions) add(e.ruby ?? e.expression_jp);
  const [grammar] = await conn.query<RowDataPacket[]>("SELECT payload FROM grammar_cards");
  for (const g of grammar) {
    const p = json<{ examples?: { jp: string }[]; quizzes?: { sentence: string; sentenceRuby?: string; correct: string }[] }>(
      g.payload,
      {},
    );
    for (const ex of p.examples ?? []) add(ex.jp);
    for (const q of p.quizzes ?? []) add((q.sentenceRuby ?? q.sentence).replace("＿＿＿", `[[${q.correct}]]`));
  }
  for (const pair of MINIMAL_PAIRS) {
    add(pair.a.kana);
    add(pair.b.kana);
  }
  for (const pack of Object.values(PHRASE_PACKS)) for (const ph of pack.phrases) add(ph.jp);
  add("ありがとう"); // 설정 › 말하기 속도 미리 듣기
  try {
    const [missing] = await conn.query<RowDataPacket[]>("SELECT text FROM audio_missing");
    for (const m of missing) add(m.text);
  } catch {
    // 0015 미적용 — 아래 audio_clips 조회에서 안내한다.
  }
  return out;
}

async function synthesize(text: string): Promise<Buffer> {
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey! },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "ja-JP", name: AUDIO_VOICE },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
    }),
  });
  const body = (await res.json()) as { audioContent?: string; error?: { status: string; message: string } };
  if (!res.ok || !body.audioContent) throw new Error(`TTS ${res.status} ${body.error?.status ?? ""} ${body.error?.message ?? ""}`);
  return Buffer.from(body.audioContent, "base64");
}

async function main() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });

  const texts = new Map<string, string>();
  for (const t of await collect(conn)) texts.set(audioKey(t), t);

  let existing: Set<string>;
  try {
    const [rows] = await conn.query<RowDataPacket[]>("SELECT k FROM audio_clips");
    existing = new Set(rows.map((r) => r.k as string));
  } catch {
    console.error("audio_clips 테이블이 없어요 — 먼저 bun scripts/migrate.ts (0015)를 돌리세요.");
    await conn.end();
    process.exit(1);
  }

  const pending = [...texts].filter(([k]) => !existing.has(k));
  const todo = pending.slice(0, limit);
  const chars = todo.reduce((n, [, t]) => n + t.length, 0);
  console.log(`문장 ${texts.size}개 · 이미 있음 ${texts.size - pending.length} · 이번에 만들 것 ${todo.length}개 (${chars}자)`);
  if (dryRun || todo.length === 0) {
    await conn.end();
    return;
  }
  if (!apiKey) {
    console.error("GOOGLE_TTS_API_KEY 환경 변수가 없어요.");
    await conn.end();
    process.exit(1);
  }

  let done = 0;
  let failed = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [k, text] = item;
      try {
        const mp3 = await synthesize(text);
        await conn.query(
          "INSERT INTO audio_clips (k, text, voice, mp3, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE k = k",
          [k, text, AUDIO_VOICE, mp3, Date.now()],
        );
        await conn.query("DELETE FROM audio_missing WHERE k = ?", [k]).catch(() => {});
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${todo.length}`);
      } catch (e) {
        failed++;
        console.warn(`  실패: ${text.slice(0, 30)} — ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`✓ 만듦 ${done}, 실패 ${failed}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
