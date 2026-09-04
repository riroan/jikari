-- 0012_ratings: adaptive-difficulty rating per CardMode (see lib/rating.ts)
CREATE TABLE ratings (
  mode   VARCHAR(32) PRIMARY KEY,
  rating DOUBLE NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
