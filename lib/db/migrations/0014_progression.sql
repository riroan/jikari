-- 0014_progression: 포인트·급단·보상 (lib/progression.ts). 한 행(id=1)에 JSON 통째로.
CREATE TABLE progression (
  id   TINYINT PRIMARY KEY,
  data JSON NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
