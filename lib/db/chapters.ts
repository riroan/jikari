import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./client";
import type { CardMode, Chapter, ChapterMember } from "../types";

export async function getAllChapters(): Promise<Chapter[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, name, intro, sort_order FROM chapters ORDER BY sort_order ASC, id ASC",
  );
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    intro: (r.intro as string | null) ?? null,
    sortOrder: r.sort_order as number,
  }));
}

export async function getAllChapterMembers(): Promise<ChapterMember[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT chapter_id, mode, card_id FROM chapter_members",
  );
  return rows.map((r) => ({
    chapterId: r.chapter_id as string,
    mode: r.mode as CardMode,
    cardId: r.card_id as string,
  }));
}
