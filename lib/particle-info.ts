/**
 * Korean-facing reference for Japanese particles used in /particle study mode.
 * Kept separate from the sentence data so the same 15-entry map serves every
 * particle card without per-card duplication.
 */

export interface ParticleInfo {
  /** Short category label (주제, 주격, 목적격, …) */
  label: string;
  /** Closest Korean equivalent, e.g. "~은/는" */
  gloss: string;
  /** One-sentence usage note in Korean. */
  note: string;
}

export const PARTICLE_INFO: Record<string, ParticleInfo> = {
  は: {
    label: "주제",
    gloss: "~은/는",
    note: "문장의 주제를 표시. 이미 알려진 대상을 다시 언급할 때 자연스러움.",
  },
  が: {
    label: "주격·강조",
    gloss: "~이/가",
    note: "새로 소개하는 주어, 의문사 주어, 好き·ある·いる의 대상에 쓰임.",
  },
  を: {
    label: "목적격",
    gloss: "~을/를",
    note: "타동사의 직접 목적어. 이동 동사에서는 경로(公園を歩く)도 표시.",
  },
  に: {
    label: "도달점·시점·존재",
    gloss: "~에",
    note: "도착지, 시각, 존재 장소(ある·いる), 간접 목적어에 두루 쓰임.",
  },
  で: {
    label: "장소·수단",
    gloss: "~에서, ~(으)로",
    note: "동작이 일어나는 장소 또는 수단·도구·재료를 표시.",
  },
  へ: {
    label: "방향",
    gloss: "~(으)로",
    note: "이동의 방향을 나타냄. 현대 일본어에선 に와 많이 겹침.",
  },
  と: {
    label: "동반·인용·나열",
    gloss: "~와/과",
    note: "함께하는 상대, 인용, 완전 나열(전부 열거)에 쓰임.",
  },
  から: {
    label: "기점",
    gloss: "~에서, ~부터",
    note: "시간·장소의 출발점. 원인(~때문에)으로도 확장됨.",
  },
  まで: {
    label: "종점",
    gloss: "~까지",
    note: "시간·장소의 도착점 또는 범위의 끝.",
  },
  の: {
    label: "수식·소유",
    gloss: "~의",
    note: "명사와 명사를 연결(소유, 소속, 동격, 재료 등).",
  },
  も: {
    label: "첨가",
    gloss: "~도",
    note: "다른 것에 더해지는 요소. '역시'의 뉘앙스.",
  },
  や: {
    label: "예시 나열",
    gloss: "~(이)나",
    note: "비완전 나열. '~や~など' 형태로 자주 쓰이며 다른 것도 있음을 암시.",
  },
  か: {
    label: "의문",
    gloss: "~까?",
    note: "문장 끝에 붙어 의문문을 만듦. 문중에선 '~인지'의 뜻.",
  },
  ね: {
    label: "확인·공감",
    gloss: "~죠, ~네요",
    note: "상대와 감정·인식을 공유하거나 가볍게 확인할 때.",
  },
  よ: {
    label: "고지·강조",
    gloss: "~요, ~거든",
    note: "상대가 모르는 정보를 알려주거나 주장을 강조할 때.",
  },
};
