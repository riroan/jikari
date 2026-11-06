import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "./client";
import { audioKey, isReportable } from "../audio-key";

/** 0015 미적용(테이블 없음)이면 음성 없이 동작 — 브라우저 TTS로 떨어진다. */
const missingTable = (e: unknown) => (e as { errno?: number })?.errno === 1146;

/** "음성 없음" 신고는 이만큼까지만 쌓는다 (인증 없는 API라 상한으로 막는다). */
const MISSING_CAP = 500;

export async function listAudioKeys(): Promise<string[]> {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>("SELECT k FROM audio_clips");
    return rows.map((r) => r.k as string);
  } catch (e) {
    if (missingTable(e)) return [];
    throw e;
  }
}

export async function getAudio(k: string): Promise<Buffer | null> {
  try {
    const [rows] = await getPool().query<RowDataPacket[]>("SELECT mp3 FROM audio_clips WHERE k = ?", [k]);
    return (rows[0]?.mp3 as Buffer | undefined) ?? null;
  } catch (e) {
    if (missingTable(e)) return null;
    throw e;
  }
}

/** 신고를 받는다. 형식이 맞지 않거나 상한을 넘으면 조용히 무시 (false). */
export async function reportMissingAudio(text: string): Promise<boolean> {
  if (!isReportable(text)) return false;
  try {
    const pool = getPool();
    const [[{ n }]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM audio_missing");
    if (Number(n) >= MISSING_CAP) return false;
    await pool.query("INSERT IGNORE INTO audio_missing (k, text, created_at) VALUES (?, ?, ?)", [
      audioKey(text),
      text,
      Date.now(),
    ]);
    return true;
  } catch (e) {
    if (missingTable(e)) return false;
    throw e;
  }
}
