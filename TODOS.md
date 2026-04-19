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

### intro 14개 마저 작성
- **What:** chapters.config.ts의 `intro: null`인 14개 챕터에 2~3줄 한국어 설명 추가. (현재 6/20 작성: a2/a3/a4/a6/b1/c1)
- **Why:** 모든 챕터가 같은 톤·길이의 ABOUT 섹션 가지면 챕터 선택 UX 일관됨.
- **Pros:** 30분 손작업으로 끝남. LLM 도움 받아도 검토만 하면 됨.
- **Cons:** 본인이 매일 쓰면서 자연스러운 문구가 떠오를 때마다 채우는 게 더 fresh. 일괄 작성하면 형식적이 될 위험.
- **Trigger:** 한 챕터씩 자연스럽게 채워나가기 — 2주 후 몇 개 채워졌는지 보고 일괄 작업 여부 결정.

### Dark mode 시각 검증
- **What:** /chapters, /chapters/[id], /chapters/[id]?mode=quiz 다크 모드 스크린샷 + DESIGN.md `--gold` 토큰 적용 확인.
- **Why:** DESIGN.md에 다크 토큰 정의 있는데 챕터 페이지 다크 안 봄. accent-progress가 light=sage(#7A8F6E) → dark=gold(#D4B76A)로 바뀌는데 mastery bar/intensity가 다크에서 적절한지 미검증.
- **Pros:** 5분 체크.
- **Trigger:** 다크 모드 토글 UI 도입 시점 (현재 light only). 또는 본인이 밤에 쓰면서 거슬리면.

### 약한 챕터 자동 sort
- **What:** /chapters 목록을 mastery 낮은 순서대로 정렬 옵션. 또는 "약한 챕터 N개" 강조 표시.
- **Why:** 사용자가 "어디부터 더 풀어야 할까" 결정을 도구가 도와줌. 현재는 sortOrder(고정 학습 순서) 그대로.
- **Pros:** "다음에 뭘 할지 자명해진다"는 design doc의 "What Makes This Cool" 핵심 가치 강화.
- **Cons:** sortOrder 고정 = 습관 형성 ("내 다섯 번째 챕터" 일관성)과 충돌. 토글 옵션이 적절.
- **Trigger:** 본인이 "어디 풀까 매번 고민됨" 또는 "약한 챕터 잊고 강한 챕터만 계속 풀게 됨" 패턴 발생 시.

### 콘텐츠 시드 batch 추가 (137 unmatched refs 줄이기)
- **What:** N4 한자 batch 3-7이 DB에 안 들어 있어서 e4-n4-body-action(34장 매칭, 14 missing) / e5(7장 매칭, 35 missing) / e6(19장 매칭, 30 missing) 챕터가 부분만 채워짐. `bun scripts/add-kanji.ts data/seeds/kanji-n4-batchN.json` 4회 + `bun scripts/import-chapters.ts` 1회로 자동 채워짐.
- **Why:** 챕터 마스터리 분모가 작아서 "전체 챕터 마스터" 도달이 비현실적으로 빠름. 한자 챕터 마스터의 의미 약함.
- **Pros:** 5분 작업. 즉시 의미 있는 마스터리 신호.
- **Trigger:** 챕터 사용 시작 후 "한자 챕터가 너무 빨리 채워짐" 감지 시 또는 그냥 시간 날 때.

## Tailwind v4 / 디자인 시스템 인프라 (design-review 2026-04-19)

### `text-{title,h1,display,hero}` 등 @theme inline 유틸이 CSS 룰로 안 만들어짐
- **What:** `app/globals.css`의 `@theme inline { --text-title: var(--type-title) }` 정의가 Tailwind v4에서 `.text-title { font-size: 22px }` 룰을 *생성하지 않음*. 서빙 CSS에 0건.
- **Why:** DESIGN.md 타입 스케일이 정의됐지만 *적용 안 됨*. 모든 `text-title` 사용처가 silently 16px 기본값으로 렌더링 중이었음. design-review가 `text-[22px]` arbitrary 값으로 우회 (5f7d924, 9a244fc).
- **Pros:** 해결 시 9개 모드 페이지 H1 + 홈 브랜드의 magic number 22px이 디자인 토큰으로 회귀. type scale 일관성 회복.
- **Cons:** Tailwind v4 `@theme inline` 의미 학습 필요. `--text-*: var(--type-*)` 패턴이 build-time 디리퍼런스 안 되는 게 원인일 가능성. 후보:
  - (a) `@theme inline`에서 var() 안 쓰고 픽셀 값 직접 입력 (`--text-title: 22px`)
  - (b) `@utility` 디렉티브로 타입 스케일 재정의
  - (c) `@theme inline` 떼고 `@theme { ... }` 일반 블록으로
- **Context:** font-size + tracking 영향. font-family는 inline `style={{ fontFamily: ... }}`로 우회되어 정상.
- **Depends on:** Tailwind v4 docs 확인 + 작은 reproducer로 검증.

### 9개 페이지에 ← HOME 블록 중복 (DRY)
- **What:** `app/{grammar,vocab,kanji,sentence,conjugation,adjective,particle,progress,settings}/page.tsx` 9곳에 동일 `← HOME` 링크 (44px touch target 포함) 중복.
- **Why:** 차후 헤더 변경 시 9곳 손대야 함. design-review 2026-04-19에서 9개 동일 인라인 수정 — 적기 신호.
- **Pros:** `<BackToHome />` 또는 `<ModePageHeader />` 추출 시 헤더 변경 1곳.
- **Cons:** props 설계 (statKey 다름, h1 라벨 다름) — 너무 많이 받으면 추상화 비용 > DRY 이득.
- **Context:** 다음 헤더 변경 발생 시 자연스럽게 추출 권장.
- **Depends on:** 헤더에 새 요소 추가 작업 발생.

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
