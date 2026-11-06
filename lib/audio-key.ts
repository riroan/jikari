/**
 * 미리 만든 음성(GCP TTS) 클립의 키. 브라우저·서버·생성 스크립트가 같은 함수를 쓴다.
 * 동기 해시(cyrb53)라 탭 핸들러 안에서 바로 계산된다 — 비동기(crypto.subtle)를 기다리면
 * iOS가 재생을 사용자 제스처 밖으로 보고 막는다.
 * 입력은 lib/tts의 toSpeakable() 결과(루비·강조 마크업을 벗긴 평문).
 */
export function audioKey(plain: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < plain.length; i++) {
    const ch = plain.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** 생성 스크립트가 쓰는 목소리 (여성, Neural2). */
export const AUDIO_VOICE = "ja-JP-Neural2-B";

/** 키 문자열 형태 — API 경로 검증용. */
export const AUDIO_KEY_RE = /^[0-9a-z]{1,12}$/;

/**
 * "음성 없음" 신고 대상: 한자가 들어간 일본어 문장만. 가나만 있는 숫자 듣기 읽기(무한 생성)는
 * 빼서 신고 테이블이 쓰레기로 차지 않게 한다 (단어 읽기·최소쌍은 스크립트가 직접 모은다).
 */
export function isReportable(plain: string): boolean {
  return plain.length > 0 && plain.length <= 200 && /[一-鿿]/.test(plain) && !/[<>{}[\]]/.test(plain);
}
