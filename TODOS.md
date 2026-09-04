# TODOS

## 챕터 v1.1 (chapters 2주 검증 후 재평가, 2026-04-19)

### 공부 모드 버튼 + 동작
- **What:** /chapters/[id]?mode=study — 카드를 답 없이 한 장씩 넘겨보는 *읽기* 모드. 기존 mode 페이지(/grammar 등)의 "공부" 패턴 그대로.
- **Why:** Design doc Approach B 명시 스펙 ("'챕터 퀴즈 시작' 버튼 + '공부 모드' 버튼"). 퀴즈 풀기 전에 *외워서* 머리에 넣는 단계가 필요할 때 — 신규 카드 0박스 상태에서 한 번 보고 시작하는 흐름.
- **Pros:** 챕터 진입 시점의 "처음 보는 카드 충격" 완화. SRS box 안 건드리고 둘러볼 수 있는 안전 모드.
- **Cons:** 2주 실사용에서 "공부 모드 없어서 답답"이 안 나오면 영영 안 만들어도 됨. 퀴즈 자체가 학습 효과 더 큼.
- **Trigger:** 본인이 "챕터 들어가서 바로 퀴즈 누르기 부담스러움", "전체 카드 한 번 훑고 싶음"이 한 번 이상 발생하면 추가.

### 챕터 카드 미리보기 (개별 카드 표시)
- **What:** /chapters/[id] 상세 페이지의 CARDS 섹션이 현재는 "단어 12장" 숫자만. 첫 3~5장 카드를 실제로 미리보기로 표시.
- **Why:** Design doc B "챕터 카드 미리보기" 명시. 챕터에 어떤 카드들이 있는지 진입 전 감을 잡는 용도.
- **Pros:** 챕터 선택 결정 도움.
- **Cons:** 모드별 카드 미리보기 컴포넌트 통일 필요 (kanji 한자만 / vocab 단어+의미 / sentence 문장+빈칸 / grammar 패턴+한국어구조).
- **Trigger:** 본인이 "이 챕터에 뭐 있는지 보고 싶음"이 발생하면.

### ~~intro 14개 마저 작성~~ ✓ DONE (2026-05-10)
- **상태:** 일괄 작성 완료 (커밋 8ab840c). 모든 20개 챕터 ABOUT 섹션 톤·길이 일관 — a5/a7/a8 (어휘), b2/b3/b4 (조사), c2/c3 (문법), e1-e6 (한자) 14개. 한국어 화자 관점에서 어렵거나 쉬운 점·매핑 포인트 위주로 2-3줄. 사용 중 자연스러운 문구 떠오르면 그때그때 다듬기.

### Dark mode 시각 검증 (트리거 발생: 토글 UI 추가됨 2026-05-10)
- **What:** /chapters, /chapters/[id], /chapters/[id]?mode=quiz 다크 모드 스크린샷 + DESIGN.md `--gold` 토큰 적용 확인.
- **Why:** 토글 UI 추가됨 (커밋 6fbefd1). `intensity.ts` case 0과 `progress` KanjiCell 비활성 색은 `var(--fg)` 기반으로 보정됨 (커밋 cc576ee). 그러나 `mark.jp-highlight`, `RegisterPill`, mastery bar 다크 시각 미검증.
- **Pros:** 5분 체크.
- **Trigger:** **활성** — 다크 모드로 한 번 둘러보기.

### ~~약한 챕터 자동 sort~~ ✓ DONE (2026-05-10)
- **상태:** /chapters에 3-way 정렬 토글 추가 (기본 / 약한 순 / 복습 순). localStorage 저장 (DB 컬럼 없음, UI 환경설정 성격). 커밋 992c984.
- **추가로:** 홈 SubjectRow + ChapterMastery 행 + /chapters/[id] CARDS 섹션 모두에 due-count chip이 surface됨. "어디부터 풀까" 결정 도구 강화.

### 콘텐츠 시드 batch 추가 (137 unmatched refs 줄이기)
- **What:** N4 한자 batch 3-7이 DB에 안 들어 있어서 e4-n4-body-action(34장 매칭, 14 missing) / e5(7장 매칭, 35 missing) / e6(19장 매칭, 30 missing) 챕터가 부분만 채워짐. `bun scripts/add-kanji.ts data/seeds/kanji-n4-batchN.json` 4회 + `bun scripts/import-chapters.ts` 1회로 자동 채워짐.
- **Why:** 챕터 마스터리 분모가 작아서 "전체 챕터 마스터" 도달이 비현실적으로 빠름. 한자 챕터 마스터의 의미 약함.
- **Pros:** 5분 작업. 즉시 의미 있는 마스터리 신호.
- **Trigger:** 챕터 사용 시작 후 "한자 챕터가 너무 빨리 채워짐" 감지 시 또는 그냥 시간 날 때.

## Tailwind v4 / 디자인 시스템 인프라 (design-review 2026-04-19)

### ~~`text-{title,h1,display,hero}` 등 @theme inline 유틸이 CSS 룰로 안 만들어짐~~ ✓ DONE (2026-05-10)
- **상태:** Tailwind 4.2.2에서 `@theme inline { --text-*: var(--type-*) }` 패턴이 정상 컴파일됨을 빌드 산출물(.next/dev) 직접 확인. arbitrary 값 45개 (`text-[13px]`, `text-[22px]`)를 의미 토큰으로 일괄 마이그레이션 (커밋 4fb1e4c).

### ~~9개 페이지에 ← HOME 블록 중복 (DRY)~~ ✓ DONE (이전 세션)
- **상태:** `components/ModePageShell.tsx`로 추출 완료. 9개 페이지 모두 ModePageShell 사용 중 (검증 2026-05-10). 챕터 상세 페이지만 별도 헤더 (의도된 차이).

### F4 검증 (dev 재시작 후)
- **What:** `app/globals.css`에 `html, body { font-family: Pretendard }` 추가 (5299e4d). dev server HMR이 globals.css를 안 픽업해서 audit 시점엔 미검증.
- **Why:** DESIGN.md § 2 system-ui 금지. 적용 시 `<html>` 컴퓨티드 폰트가 Pretendard 시작으로 깨끗.
- **Action:** `bun dev` 재시작 → `getComputedStyle(document.documentElement).fontFamily`이 `Pretendard Variable, ...`로 시작하는지 확인.

## Design Debt — 활용형 퀴즈 모드 (linked to `riroan-main-design-20260418-235301.md`)

### 대비비 실측 (구현 시)
- **What:** `--ink-faint #8A8275 on --paper #F5EFE4` 4.6:1 수치가 실제 OLED 폰에서 가독 충분한지 DevTools/WebAIM으로 실측.
- **Why:** AA 기준 4.5:1 간신히 통과. 실제 렌더링에서 sub-pixel antialiasing으로 더 얇아 보일 수 있음.
- **Pros:** 접근성 확신 + DESIGN.md 대비비 기준 방어 가능.
- **Cons:** 5분 체크인 셈. 실패 시 `#7A7367` 정도로 조정 필요.
- **Context:** 활용 퀴즈의 그룹 태그·Korean label·faded 사용자 답변 모두 이 색 계열.
- **Depends on:** /conjugation 구현 완료.

### 형용사 확장 (い·な형 활용)
- **What:** v2 스코프로 미룬 형용사 활용 — い형용사(ない·かった·くて·くない) 및 な형용사(じゃない·だった·で·じゃなかった) 퀴즈화.
- **Why:** 동사만 활용하면 일상 표현 절반이 비어 있음 (일본어 형용사 활용은 실생활 빈도 높음).
- **Pros:** 활용 모드 완결도 ↑. verb_group 필드를 pos_group으로 개명하거나 별도 adjective_group 추가.
- **Cons:** 규칙 엔진 확장 + exception 리스트 별도 + 백필 재실행 + 퀴즈 라우트 공유 여부 결정 필요.
- **Context:** 2026-04-19 plan-eng-review에서 Open Question #4로 deferred. 동사 활용 실사용 2주+ 후 적용 체감 평가.
- **Depends on:** 활용형 퀴즈 (동사) v1 착륙 + 2주 실사용 평가.

### 구현 후 /design-review 실행
- **What:** 실제 브라우저 스크린샷 기반으로 `/design-review`(live 시각 audit) 돌림.
- **Why:** 오늘은 gstack designer(OpenAI 키 없음)로 mockup 생성 실패. 실구현이 DESIGN.md 스펙대로 나왔는지 visual QA 필요.
- **Pros:** 플랜에 텍스트로 적은 모든 스펙이 실제 픽셀로 구현됐는지 확신.
- **Cons:** 3-5분 소요 + 수정 사이클.
- **Context:** 특히 오답 피드백 블록(피드백 블록 시각 스펙 섹션)이 AI 슬롭 패턴으로 안 빠졌는지 검증.
- **Depends on:** /conjugation 라우트 + 오답 피드백 동작 구현 완료.

## Deferred — 문법 모드 (linked to `riroan-main-design-20260418-235448.md`)

### 한·일 병렬 구조 시각화 (Approach C)
- **What:** 한국어 문장 ↔ 일본어 문장 병렬 렌더, 같은 역할(주어·술어·조사·어미)의 조각을 색으로 매칭.
- **Why:** Bunpro·Tae Kim이 못 하는 UX. 한국어-일본어 구조 평행성을 UI 자체로 전달.
- **Pros:** 문법 모드 차별화 심화. 한국어 화자에게만 가능한 레버리지.
- **Cons:** UX 검증 불확실, 색 매칭 정확도에 콘텐츠 품질 전의존.
- **Context:** 2026-04-18 office-hours에서 C안으로 검토됨, MVP 스코프에서 명시적으로 제외. 문법 모드 v1.1 후보로 미룸.
- **Depends on:** 문법 모드 v1.0 배포 완료 + **1달 실사용** 평가.

### 서버-사이드 level filter (`?level=N4` 쿼리 파라미터)
- **What:** `/grammar?level=N4` 등으로 특정 JLPT 레벨만 로드. 한자·단어·문장 모드에도 동일 패턴 적용.
- **Why:** 220 카드 규모에선 불필요. 1000+장 되면 초기 로드가 느려짐.
- **Pros:** 모바일 첫 페이지 로드 개선, 네트워크 절약.
- **Cons:** 지금 미리 넣으면 복잡도만 증가, YAGNI 위반.
- **Context:** 2026-04-19 plan-eng-review의 Performance 섹션에서 "현재 규모 불필요, 확장 시점에 고려"로 합의.
- **Depends on:** 전체 카드 수(모든 모드 합산) 1500장 돌파 또는 모바일 로드 체감 저하.

## Deferred — 일상표현 subject (linked to `riroan-main-design-20260419-220004.md`)

### 홈 화면 8행 visual 실측 + register 뱃지 dark mode 대비비
- **What:** `/expressions` v1 착륙 후 `/design-review`로 (1) 홈 화면 subject row 8행 시각 동작 실측, (2) register 뱃지 3색(`--accent-korean`/`--fg-soft`/`--accent-progress`)이 light/dark 양 모드에서 판별 가능한지 대비비 체크.
- **Why:** (1) 390px 폭에 7행 딱 맞는 레이아웃. 8행 = 576px 높이 추정. (2) 뱃지 10px 초소형 텍스트 + dark mode 배경 전환 시 색 차이가 수렴할 가능성. 색+텍스트 조합이라 최악이라도 영문 라벨은 읽히지만 시각 분류 기능이 약해짐.
- **Pros:** 한 번의 /design-review로 두 가지 visual 회귀 포인트를 모두 커버.
- **Cons:** /design-review 돌리는 3~5분.
- **Context:** 2026-04-19 plan-eng-review Architecture + plan-design-review Pass 7에서 deferred. Design doc Open Question #4와 동일 사안.
- **Depends on:** /expressions 라우트 + 홈 SUBJECTS 배열 edit + 뒷면 register 뱃지 렌더 구현 완료.

## 적응형 난이도 (2026-09-04, 커밋 0a51449 후속)

### ~~활용·형용사 퀴즈에 적응형 난이도 적용~~ ✓ DONE (2026-09-04)
- **상태:** `lib/rating.ts`에 `conjugationFormDifficulty` / `adjectiveFormDifficulty` 추가, `lib/deck.ts`에 `pickByDifficulty`(덱과 같은 Cauchy 가중치, 하드 게이트 아님). `/conjugation`·`/adjective`가 형을 θ 근처에서 뽑고 `review()`에 형 난이도를 넘긴다 — 이제 두 모드의 θ가 실제로 움직인다. `/progress` LEVEL에 두 행 추가.
- **실측 분포:** θ=1000 → 기본형 73% / 使役·受身 4%. θ=1700 → 기본형 11% / 使役·受身 47%. 어느 쪽도 완전히 막히지 않는다.
- **계획에서 바꾼 것:** `weightedShuffleIds`(SRS 박스 가중치)는 **일부러 안 켰다.** 두 모드의 SRS 키가 `동사:basic` / `동사:형`이라 덱(동사 id)에 `getBox`를 걸면 전부 미스가 나서 균등 추첨과 같아진다 — 기능처럼 보이는 no-op. 박스 가중치를 원하면 덱을 (동사, 형) 쌍으로 바꾸는 게 선행 조건. 난이도 축은 형이고 그건 이번에 들어갔으니, 실사용에서 "이미 외운 동사가 계속 나온다"가 느껴질 때 그때 하면 된다.

### 상용한자 N2/N1 시드 추가 (θ 천장 문제)
- **What:** 현재 한자 풀 584자가 教育漢字(1~4학년) 범위라 **N5/N4/N3뿐이고 N2·N1이 0자다.**
- **Why:** θ가 ~1500을 넘으면 내놓을 게 없어서 덱이 293 → 144 → 64장으로 쪼그라든다 (빈 덱 fallback이 있어 안 깨지지만 같은 카드만 돌게 됨). 로직 문제가 아니라 재고 문제.
- **Pros:** 시드 추가만으로 해결. 적응형 코드는 손 안 댐.
- **Cons:** 상용한자 2136자 범위 안에서 선별 필요 (CLAUDE.md 콘텐츠 규칙).
- **Trigger:** `/progress` LEVEL에서 한자 θ가 1500을 넘으면.

### 튜닝 노브 실데이터 조정
- **What:** `lib/rating.ts`의 `K=24`·`SCALE=400`, `lib/deck.ts`의 `TARGET_OFFSET=50`·`BAND_WIDTH=250`. 전부 체스 기본값이거나 눈대중이고 실제 응답 데이터로 맞춘 적 없음 (`ponytail:` 주석으로 표시해둠).
- **Why:** 정답률이 너무 높게 유지되면 지루하고, 낮으면 좌절. 목표는 대략 75~80% 정답률.
- **Action:** 2주 실사용 후 `/progress` LEVEL의 θ 추이와 `quizStats` 정답률을 같이 본다. θ가 너무 느리게 오르면 `K`↑, 몇 문제로 난이도가 출렁이면 `K`↓, 너무 어려우면 `TARGET_OFFSET`↓.
- **Trigger:** 2주 실사용 후.

### 표외(表外) 독음 46건 개별 판별
- **What:** 나무위키가 괄호로 비상용 표시한 음독 40건 + 훈독 6건. 목록은 크롤 결과에 있음 (`主 す` `事 ず` `兄 きょう` `児 に` `出 すい` `切 さい` `功 く` `博 ばく` `夏 げ` 등).
- **Why:** 지금은 안 지웠다. **표외 독음이 퀴즈 정답으로 뽑히는 경우가 652자 중 1건(`天 あま`)뿐**이라 일괄 삭제해도 퀴즈 문제는 그대로고, 오탐만 떠안는다 — `何 なん`(何人 なんにん), `声 こわ`(声色), `側 かわ`는 나무위키가 표외로 찍었지만 실제로 흔하다.
- **Trigger:** 카드 뒷면에서 특정 표외 독음이 거슬리면 그 글자만 개별 제거. 일괄 작업으로 만들지 말 것.

### 한국 훈 58건 표기 차이 (대부분 수정 불필요)
- **What:** DB와 나무위키 훈이 다른 58건. 대부분 오류가 아니라 표기 선택 차이다: `女 여자`(DB) vs `계집`(나무위키), `母 어머니` vs `어미`, `父 아버지` vs `아비`, `山 뫼` vs `메`.
- **Why:** DB 쪽이 현대적이라 오히려 낫다. 다만 진짜 검토감이 섞여 있다 — `欠`은 훈이 `이지러질`(=缺)인데 정자가 `欠`(하품 흠)이라 둘이 안 맞는다.
- **Trigger:** `欠` 하나만 먼저 정리. 나머지는 건드릴 이유 없음.

### 나무위키 대조로 확인된 것 / 못 하는 것 (재작업 방지 메모)
- **되는 것:** 送り仮名 조각 검출(11건 수정 완료), 표외 독음 표시(괄호), 정자↔신자체 매핑.
- **안 되는 것:** ① **읽기 순서는 빈도순이 아니다** — 常用漢字表/자전 순이라 `食 くう`, `魚 うお`, `四 よ`가 먼저 온다. DB의 `たべる/さかな/よん`이 맞다. 정렬에 쓰면 퀴즈가 나빠진다. ② `나무위키에 없음`은 오답 근거가 못 됨 — 목록이 망라적이지 않아 `位 ぐらい`, `共 ともに`도 걸린다. ③ 한국 음 대조 불가 — 인포박스가 대표 훈음만 실어서 두음법칙 이형(육/륙)과 정당한 부차음(殺到 쇄, 遊說 세)이 전부 오탐.
- **크롤러:** 652자 캐시 + 파서는 세션 스크래치패드에 있었음. 재실행하려면 다시 작성 필요 (조회 키는 `kanji`가 아니라 `korean_hanja`).
