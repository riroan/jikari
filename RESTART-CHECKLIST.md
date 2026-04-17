# jikari · RESTART CHECKLIST

> 이 문서는 jikari를 리스타트할 때 **Day 1부터 펼쳐 놓고 따라갈 실행 체크리스트**다.
> 2026-04-17 plan-eng-review 대체용으로 작성. 리스타트 시점이 오면 이걸 열고 체크박스를 채우면 된다.
>
> 참고 문서:
> - `./DESIGN.md` — 디자인 시스템 (CSS 변수, 폰트, 컴포넌트 어휘)
> - `~/.gstack/projects/jikari/riroan-main-design-20260417-200542.md` — 베이스 디자인 문서
> - `~/.gstack/projects/jikari/ceo-plans/2026-04-17-jikari-v1-selective-expansion.md` — CEO 플랜 (4개 확장 포함)
> - `~/.gstack/projects/jikari/designs/home-dashboard-20260417/` — 시각 목업 2장 (A: Quiet Paper, B: Dark Study)

---

## 0. 리스타트 트리거 체크 (시작 전 필수)

- [ ] Anki + JLPT Tango N5 덱으로 **2주 이상 매일** 학습했는가?
- [ ] 일본어 공부 자체에서 오는 즐거움/효과가 있는가? (툴 만들기 아님)
- [ ] Anki가 **무엇이 부족해서** jikari를 만들려는지 1문장으로 말할 수 있는가?
  - 예시: "한국어 hanja 매핑이 Anki에선 필드 추가해도 잘 안 보이고, 내 손에 맞는 UI가 아니다"
  - 1문장이 안 나오면 → 아직 jikari 리스타트할 때 아님. 계속 Anki.

위 3개 다 YES여야 시작. NO 하나라도 있으면 이 문서 닫고 Anki 계속.

---

## 1. Week 1 — 뼈대와 데이터

### Day 1: 프로젝트 셋업 (2-3시간)

```bash
cd ~/jikari
# 기존 파일은 DESIGN.md, RESTART-CHECKLIST.md 외에 없는 상태
bunx create-next-app@latest . --typescript --tailwind --app --turbopack \
  --import-alias "@/*" --no-eslint --use-bun
# 설치 중 디렉토리 비우기 물으면 yes (DESIGN.md는 재작성 예정이므로 백업 후)
cp DESIGN.md /tmp/jikari-DESIGN.md.bak
cp RESTART-CHECKLIST.md /tmp/jikari-RESTART.md.bak
# create-next-app 실행 후 복원
git init
git add -A && git commit -m "chore: initial next.js scaffold"
```

- [ ] Next.js 15 프로젝트 셋업 완료
- [ ] `bun install zustand framer-motion serwist @serwist/next zod`
- [ ] `bun install --dev vitest @vitest/ui @testing-library/react @playwright/test`
- [ ] `app/globals.css`에 DESIGN.md의 `:root` + `[data-theme="dark"]` CSS 변수 복사
- [ ] `app/layout.tsx`에 Noto Serif JP + Noto Sans JP + Pretendard 로드 (next/font/google)
- [ ] 첫 페이지 `app/page.tsx`에 `<h1>jikari</h1>` 한 줄만 — `bun dev`로 브라우저 확인
- [ ] 첫 커밋

### Day 2: 한국어 hanja 검증 (반나절)

**이게 Week 1의 가장 위험한 작업.** Outside voice가 지적한 `kHangul`은 *음*만 줌, *뜻* 아님. `hanja.dict`는 npm에 없을 수 있음. 검증부터.

```bash
mkdir -p scripts
```

- [ ] `scripts/validate-hanja.ts` 작성:
  - Unihan 데이터셋 다운로드 (unicode.org/Public/UCD/latest/ucd/Unihan.zip, ~50MB)
  - N5-N4 280자 리스트 하드코드 (JLPT 공식 kanji 리스트 써서 미리 생성)
  - 각 한자에 대해 `kHangul` 값 추출
  - 커버리지 출력: "280/280" 이상적, 실패 시 누락 자 목록
- [ ] 실행: `bun run scripts/validate-hanja.ts`
- [ ] 결과 확인:
  - 모두 커버 → OK, `kHangul` 단독으로 진행
  - 누락 있음 → `bun install hanja-dict` 또는 유사 npm 패키지 시도, 여전히 누락이면 `scripts/manual-hanja.json` 수기입
- [ ] 한국어 **뜻** (훈) 소스 결정: 한자 옥편 API 또는 네이버 한자 사전 스크래핑. N5-N4 280자는 수기입이 최현명 (1-2시간)

**출력:** `public/data/kanji-korean-mapping.json` — `{ "日": { "sound": ["일"], "meaning": "날/해" }, ... }`

### Day 3: 한자·단어·Joyo 데이터 생성 (반나절)

```bash
bun install jmdict-simplified kanjidic2-json jlpt-vocab joyo-kanji
```

- [ ] `scripts/generate-kanji-data.ts`:
  - `kanjidic2-json`에서 N5-N4 280자 추출
  - 각 자에 `onReadings`, `kunReadings`, `meanings` 추가
  - Day 2의 `kanji-korean-mapping.json` merge
  - `public/data/kanji-n5-n4.json` 생성
- [ ] `scripts/generate-vocab-data.ts`:
  - `jmdict-simplified` + `jlpt-vocab`에서 N5-N4 단어 1500-2000개
  - `public/data/vocab-n5-n4.json` 생성
- [ ] `scripts/generate-joyo-data.ts`:
  - `joyo-kanji` 패키지에서 2136자 순서 리스트
  - N5-N4 280자를 `level: 5 | 4 | "locked"` 마킹
  - `public/data/joyo-2136.json` 생성
- [ ] 세 JSON 파일 커밋

### Day 4: LLM 문장 배치 생성 (2-3시간, 1회성 $3-5)

- [ ] `scripts/generate-sentences.ts`:
  - Claude API 또는 OpenAI API 키 설정
  - N5-N4 단어 + 문법으로 500-800문장 배치 생성
  - 프롬프트: "JLPT N5-N4 수준 일본어 문장. 빈칸은 동사 또는 명사 한 개. **Distractor 3개는 문법적으로 맞아도 의미상 명백히 틀린 것만**. JSON schema: `{sentence, blank, distractors[3], translation_ko, jlptLevel}`"
  - Zod로 즉시 validate, schema 어긋나면 재시도
  - 중복 제거
- [ ] `public/data/sentences.json` 생성
- [ ] **품질 체크:** 무작위 20개 꺼내서 수동 검증. 이상한 문장 3개 이상이면 프롬프트 튜닝 후 재생성

### Day 5-7: 핵심 상태 + 최소 라우트

**병렬 가능:** Claude Code 두 개 띄워서 lane 나누기
- **Lane A:** `lib/` 상태 로직
- **Lane B:** `app/(quiz)/` 라우트 뼈대

**Lane A — `lib/`:**
- [ ] `lib/types.ts` — `KanjiCard`, `VocabCard`, `SentenceCard`, `LearningState` (DESIGN.md와 베이스 디자인 문서 참조)
- [ ] `lib/srs.ts` — Leitner box 5단계
  - **Outside voice catch 반영:** 일일 신규 카드 상한 (20개), 일일 복습 상한 (50개). 14일째 리뷰 쓰나미 방지
  - 타입: `getTodayQueue(state: LearningState[]): { due: Card[], new: Card[] }`
  - 타입: `advance(card: LearningState, correct: boolean): LearningState`
- [ ] `lib/store.ts` — Zustand + `persist` 미들웨어
  - **핵심:** storage 인터페이스 추상화 (v2에서 DB로 교체 대비). `storage: createJSONStorage(() => localStorage)` 형태
  - `schemaVersion: 1` 필드 포함 (마이그레이션 대비)
- [ ] `lib/heatmap.ts` — `{ "YYYY-MM-DD": count }` 맵 관리. 브라우저 로컬 타임존 기준, DST 무시
- [ ] `lib/import.ts` — Zod 스키마로 JSON import validate
- [ ] **단위 테스트** (Vitest): `srs.test.ts`, `heatmap.test.ts`, `import.test.ts` — Day 5-7에 같이 작성

**Lane B — `app/`:**
- [ ] `app/kanji/page.tsx` — 한자 4지선다 최소 동작 (디자인 없이 `<button>` 4개)
- [ ] `app/vocab/page.tsx` — 단어 4지선다 최소 동작
- [ ] `app/sentence/page.tsx` — 빈칸 4지선다 최소 동작
- [ ] 정답 맞으면 다음 카드로 넘어감, localStorage 진행도 저장
- [ ] **스모크 E2E** (Playwright): 한 카드 맞춰서 다음 카드 나오는지

---

## 2. Week 2 — UI / 모션 / 데이터 안전성

### Day 1-2: 공통 컴포넌트 (variant-A.html에서 스타일 복사)

- [ ] `components/QuizCard.tsx` — Framer Motion `rotateY` 플립, 답 제출 후 0.5s disabled
- [ ] `components/Furigana.tsx` — `<ruby>` 래퍼, 힌트 모드 옵션
- [ ] `components/AnswerFeedback.tsx` — 정답 Framer 스케일, 오답 CSS `@keyframes shake` (구형 iOS 대비)
- [ ] `components/Streak.tsx` — `連続 N日` 뱃지
- [ ] DESIGN.md 금기 목록 재확인하면서 작성 (3-column 피처 그리드 금지 등)

### Day 3-4: 홈 대시보드 + 히트맵

- [ ] `components/Heatmap.tsx` — 7주 × 7일 격자, 4단계 강도
  - SVG 또는 CSS grid. `react-calendar-heatmap` 라이브러리는 오버. 자체 구현 100줄 이내
  - 접근성: `<time datetime="YYYY-MM-DD" aria-label="N cards, date">` 래퍼
- [ ] `app/page.tsx` — variant-A.html 그대로 옮기기:
  - 히어로 한자 (오늘의 한자 랜덤 또는 학습 중 첫 번째)
  - 韓 한국어 hanja 라인
  - TODAY N cards due
  - 세 엔트리 (한자/단어/문장 + 카운트)
  - 히트맵
- [ ] 다크 모드 토글 (`next-themes` 또는 수동 `[data-theme]` + CSS 변수 스왑)

### Day 5-7: 데이터 안전성 (필수, 미루지 말 것)

**왜 필수:** Outside voice가 지적한 iOS Safari 7일 idle 퍼지. 사용자가 한 달 쉬었다가 돌아오면 모든 게 날아갈 수 있음.

- [ ] `app/settings/page.tsx`:
  - JSON 내보내기 버튼 — `store.exportState()` → blob → 다운로드
  - JSON 가져오기 버튼 — 파일 선택 → Zod validate → `store.importState(parsed)`
  - 데이터 초기화 버튼 (확인 다이얼로그)
- [ ] `lib/store.ts`에 `QuotaExceededError` 핸들링:
  - catch 시 가장 오래된 히트맵 엔트리 삭제 후 재시도
  - 여전히 실패 시 alert: "저장 공간 부족, /settings에서 내보내기 후 초기화 필요"
- [ ] `lib/autobackup.ts` — 주 1회 자동 JSON download (5개 롤링, 날짜별 이름)
- [ ] **단위 테스트:** import.test.ts — 정상 / 손상 / 스키마 불일치 / 이전 schemaVersion 마이그레이션

---

## 3. Week 3 — PWA / 진행도 맵 / 배포

### Day 1-2: PWA 설정 (iOS 제약 감안)

**주의:** iOS Safari PWA는 storage ~50MB + 7일 idle 퍼지. 이걸 안내 UI로 대응.

- [ ] `next.config.mjs`에 `serwist` 플러그인 설정
- [ ] `public/manifest.json` — name, short_name, theme_color (palette 기본값), display: standalone
- [ ] `public/icons/`에 icon-192.png, icon-512.png, maskable-icon-512.png 생성
  - 아이콘 디자인: "じ" 모노그램 또는 단순 한자 1개. 배경은 paper cream 또는 deep navy (테마별)
  - SVG로 먼저 만들고 `svgexport`로 PNG 변환
- [ ] `app/layout.tsx`에 `<link rel="manifest">`, iOS 메타 태그 추가
- [ ] /settings에 "iOS 사용 시 7일 이상 안 쓰면 데이터 날아갈 수 있음, 주기적 JSON 백업 권장" 안내 배너

### Day 3-4: 진행도 맵

- [ ] `app/progress/page.tsx`:
  - 2136자 CSS grid (대략 45×48 또는 모바일에선 세로 스크롤되는 20열)
  - 각 셀: 마스터함(진한 색) / 학습 중(중간색) / 미학습(회색)
  - 셀 탭 → 팝오버에 읽기·상태·JLPT 레벨
- [ ] **모바일 viewport 테스트:** 390px에서 2136자 격자가 어떻게 보이는지 실제 확인. 셀 너무 작으면 탭 타겟 44px 이하 → zoom/pan 캔버스 고려 (outside voice 지적)

### Day 5-6: Vercel 배포 + 스모크

- [ ] `git push origin main` → Vercel 자동 연결
- [ ] `https://jikari.vercel.app`에서 실제 사용:
  - 카드 3개 맞추고 히트맵 오늘 칸 채워지는지
  - 새로고침해도 진행도 유지되는지
  - 모바일에서 홈화면에 "앱 추가"되는지 (iPhone 실기기)
- [ ] 첫 번째 버그 발견하면 바로 이슈 트래킹 (GitHub Issues 또는 `TODOS.md`)

### Day 7: 문서 + 본인 사용 시작

- [ ] `README.md` 작성 (본인 기준 — 나중에 공개할 수도 있으니 영어/한국어 섞어)
- [ ] `TODOS.md` 생성 — 발견한 버그, v1.1 아이디어 모으기
- [ ] **당신 자신이 매일 쓰기 시작** — 5일 연속 스스로 열면 성공 기준 달성

---

## 4. 병렬화 전략 (Claude Code 다중 에이전트 쓸 경우)

워크트리 기반 병렬 실행 가능한 지점:

| Lane | 터치 모듈 | 의존성 | 기간 |
|------|----------|-------|------|
| **A: Data pipeline** | `scripts/`, `public/data/` | 독립 | Day 2-4 |
| **B: Core logic** | `lib/` | 데이터 JSON 스키마만 필요 (A와 계약 먼저 고정) | Day 5-7 |
| **C: UI components** | `components/` | DESIGN.md | Day 5-7 |
| **D: Routes** | `app/` | B + C | Day 5 이후 |

**실행 순서:**
```
Day 2-4:   [Lane A] 독립 실행
Day 5-7:   [Lane B] + [Lane C] 병렬 (타입 계약만 공유)
Day 5 이후: [Lane D] B+C 병합 후
```

**충돌 가능 지점:**
- `package.json` — 모든 Lane이 건드리므로 설치는 순차적으로
- `app/layout.tsx` — Lane A가 아닌 C에 속하지만 D도 임포트 경로 변경 가능
- CSS 변수 — DESIGN.md에 고정돼 있으니 충돌 없음

솔로면 순차 + Claude Code 1개로 충분. 병렬은 "여러 과제 동시 진행에 자신 있을 때만".

---

## 5. 실패 모드 & 완화책 (outside voice 반영)

| 실패 모드 | 트리거 | 완화책 | 테스트? |
|-----------|--------|--------|--------|
| Korean hanja 데이터 불완전 | Week 1 Day 2 검증에서 누락 발견 | hanja.dict npm → 수기입 폴백 | Day 2 스크립트 |
| LLM 문장 품질 나쁨 | Day 4 생성 결과 검토 시 오류 많음 | 프롬프트 재튜닝 후 재생성. 최악의 경우 Tatoeba 필터 혼용 | Day 4 수동 20개 검증 |
| iOS Safari 데이터 퍼지 | 사용자가 7일+ idle | /settings 자동 백업 + UI 안내 | import.test.ts |
| localStorage 쿼터 초과 | 히트맵 365일+ | 오래된 엔트리 삭제 + 재시도 | store.test.ts |
| 2136 격자 모바일에서 못 읽음 | 390px viewport | 실기기 테스트 후 필요시 zoom/pan 전환 | Week 3 Day 3 수동 |
| Leitner 14일째 리뷰 쓰나미 | 280 카드 풀 고정 간격 | 일일 복습 상한 50개, 신규 상한 20개 | srs.test.ts |

---

## 6. 완료 기준

- [ ] Vercel에 배포, 본인 휴대폰 홈화면에 설치됨
- [ ] 5일 연속 본인이 열어서 10분 이상 사용
- [ ] 한국어 hanja 정보가 모든 한자 카드에 노출됨
- [ ] JSON export/import 동작 검증
- [ ] 6개 실패 모드 중 5개 이상 테스트 커버

v1 완성. 이후 v1.1 계획은 CEO 플랜 문서의 "NOT in scope" 섹션과 v1.1 후보 참조.

---

## 7. 이 문서 수정 로그

- **2026-04-17** — plan-eng-review 대체용 실용 체크리스트로 작성. jikari SHELVED 상태에서.
