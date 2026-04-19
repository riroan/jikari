# TODOS

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

### 홈 화면 8행 visual 실측
- **What:** `/expressions` v1 착륙 후 `/design-review`로 홈 화면 subject row 8행에서 시각적 동작 실측 — 스크롤/행간/폰트 축소 필요 여부 판단.
- **Why:** 현재 390px 폭에 7행 딱 맞는 레이아웃. 8행 = 576px 높이 추정. `app/page.tsx:58~62` 섹션 여백 포함 뷰포트 처리 실제로 봐야 알 수 있음.
- **Pros:** 실측 기반 조정. 억측으로 미리 건드리지 않음.
- **Cons:** /design-review 돌리는 3~5분.
- **Context:** 2026-04-19 plan-eng-review Architecture 섹션에서 "실제 렌더링 안 보고는 못 정함"으로 deferred. Design doc Open Question #4와 동일 사안.
- **Depends on:** /expressions 라우트 + 홈 SUBJECTS 배열 edit 구현 완료.
