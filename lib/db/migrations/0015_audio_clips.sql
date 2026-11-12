-- 0015_audio_clips: 미리 만든 음성 (GCP TTS, scripts/gen-audio.ts). 키 = lib/audio-key audioKey(평문).
CREATE TABLE audio_clips (
  k          VARCHAR(16)  PRIMARY KEY,
  text       VARCHAR(500) NOT NULL,
  voice      VARCHAR(40)  NOT NULL,
  mp3        MEDIUMBLOB   NOT NULL,
  created_at BIGINT       NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 앱에서 재생했는데 클립이 없던 문장 — 다음 스크립트 실행 때 만든다.
CREATE TABLE audio_missing (
  k          VARCHAR(16)  PRIMARY KEY,
  text       VARCHAR(500) NOT NULL,
  created_at BIGINT       NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
