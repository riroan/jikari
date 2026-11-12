/**
 * 프로필 꾸미기 아이템 — 포인트로 사서 슬롯마다 하나씩 장착한다.
 * id는 `<slot>:<name>`; name 부분이 CSS 훅이 된다 (globals.css `.frame-<name>`,
 * `[data-skin="<name>"]`). 색 테마는 기존 PALETTES(lib/progression)를 그대로 쓴다.
 */
/** 장착하는 슬롯 — 하나씩만 낀다. */
export type EquipSlot = "frame" | "skin" | "stamp";
/** pack(한마디 팩)은 장착 없이 사면 바로 켜진다 (lib/phrase-packs). */
export type Slot = EquipSlot | "pack";

export const SLOT_KO: Record<Slot, string> = {
  frame: "테두리",
  skin: "선지 스킨",
  stamp: "정답 도장",
  pack: "한마디 팩",
};

export interface Cosmetic {
  id: string;
  slot: Slot;
  jp: string;
  ko: string;
  cost: number;
}

export const COSMETICS: readonly Cosmetic[] = [
  { id: "frame:double", slot: "frame", jp: "二重線", ko: "이중선", cost: 1500 },
  { id: "frame:sumi", slot: "frame", jp: "墨", ko: "먹선", cost: 1500 },
  { id: "frame:shu", slot: "frame", jp: "朱印", ko: "주홍 인장", cost: 2000 },
  { id: "frame:kin", slot: "frame", jp: "金縁", ko: "금테", cost: 3000 },
  { id: "skin:washi", slot: "skin", jp: "和紙", ko: "종이", cost: 1500 },
  { id: "skin:sen", slot: "skin", jp: "下線", ko: "밑줄", cost: 1500 },
  { id: "skin:fuda", slot: "skin", jp: "札", ko: "나무패", cost: 2000 },
  { id: "skin:sumi", slot: "skin", jp: "墨", ko: "먹", cost: 2000 },
  { id: "stamp:ryou", slot: "stamp", jp: "良", ko: "좋음", cost: 1000 },
  { id: "stamp:shuu", slot: "stamp", jp: "秀", ko: "빼어남", cost: 1500 },
  { id: "stamp:hanamaru", slot: "stamp", jp: "花丸", ko: "참 잘했어요", cost: 2000 },
  { id: "pack:kotowaza", slot: "pack", jp: "ことわざ", ko: "속담", cost: 3000 },
  { id: "pack:yoji", slot: "pack", jp: "四字熟語", ko: "사자성어", cost: 3000 },
  { id: "pack:kisetsu", slot: "pack", jp: "季節の言葉", ko: "계절 인사", cost: 3000 },
];

export const cosmeticById = new Map(COSMETICS.map((c) => [c.id, c]));

/** `frame:kin` → `kin` (CSS 훅). 빈 문자열은 기본. */
export const hookOf = (id: string) => id.slice(id.indexOf(":") + 1);
