# jikari · DESIGN.md

> 이 문서는 jikari의 디자인 시스템 정의서다. 구현 시 모든 디자인 결정은 이 문서와 대조한다. 벗어나야 하는 이유가 있으면 여기에 추가한다. 이 문서가 애매하면 디자인 결정이 애매하다는 뜻 → 고쳐야 한다.
>
> **현 상태:** 프로젝트 SHELVED (2026-04-17). Anki 학습 습관 2주+ 증명 후 리스타트 시점에 이 문서를 활성화.
> **시각 참고자료:** `~/.gstack/projects/jikari/designs/home-dashboard-20260417/` (variant-A-quiet-paper.html · variant-B-dark-study.html)

---

## 1. 디자인 철학

### 정체성 한 줄
> **한국어 화자를 위한, 매일 10분 열고 싶은 조용한 일본어 학습 도구.**

### 핵심 원칙

1. **Quiet over loud.** 매일 쓰는 앱은 소리지르면 안 된다. Duolingo의 만화적 푸시, 대부분 SaaS의 보라색 그라데이션, 현대 웹의 3-column 피처 그리드 — 모두 금기. 잘 쓴 노트 vibe.

2. **Japanese-first typography.** 일본어 학습 앱에서 타이포그래피가 빈약하면 모든 게 빈약해 보인다. 한자는 앵커다 — 화면에서 가장 먼저 존재감으로 말하는 요소.

3. **Korean hanja as thesis, not gimmick.** 한국어 화자의 한자(漢字) 지식을 레버리지하는 게 jikari의 존재 이유. `韓: 일 — 날·해` 표기는 장식이 아니라 **학습 경로의 구조적 차별점**. 모든 한자 카드에 일관되게 등장.

4. **Subtraction default.** 화면에 요소를 추가하기 전에 "이거 없어도 되나?" 먼저 묻는다. 장식적 블롭, 플로팅 동그라미, 웨이브 SVG, 컬러 원 안 아이콘 — 삭제.

5. **Hierarchy over symmetry.** 모든 게 가운데 정렬되면 아무것도 강조되지 않는다. 왼쪽 정렬 기본, 중앙 정렬은 의도적일 때만.

### AI 슬롭 금기 목록 (절대 금지)
- ❌ 보라색/인디고 그라데이션 배경
- ❌ 3-column 피처 그리드 (아이콘 + 제목 + 2줄 설명, 3번 반복)
- ❌ 컬러 원 안에 아이콘 (SaaS 스타터 템플릿 느낌)
- ❌ 모든 요소를 중앙 정렬
- ❌ 모든 요소에 동일한 큰 border-radius
- ❌ 장식용 블롭·플로팅 동그라미·웨이브 디바이더
- ❌ 이모지 디자인 요소 (헤딩의 🚀, 불릿의 ✨)
- ❌ 컬러 좌측 보더 카드 (`border-left: 3px solid accent`)
- ❌ "Welcome to jikari! Unlock the power of..." 같은 제네릭 히어로 카피
- ❌ 모든 섹션 같은 높이의 쿠키커터 리듬

---

## 2. 타이포그래피

### 폰트 스택

| 역할 | 폰트 | 언제 |
|------|------|------|
| 일본어 (큰 한자, 숫자 강조) | **Noto Serif JP** | 히어로 한자, 큰 숫자, 브랜드 로고 |
| 일본어 (가나 읽기, 부속) | **Noto Sans JP** | 음독·훈독 값, 서브스크립트, 스트릭 |
| 한국어 | **Pretendard Variable** | 모든 한국어 본문·버튼·라벨 |

**규칙:**
- ❌ 시스템 폰트 금지 (`system-ui`, `-apple-system`, Arial, Helvetica)
- ❌ Inter, Roboto 금지 (AI 슬롭의 시작)
- ✅ Google Fonts 무료 (`Noto Serif JP`, `Noto Sans JP`), Pretendard는 jsDelivr CDN
- ✅ 서브셋팅은 v1.1로 미룸. v1은 full weight set 로드.

### 타입 스케일

```
hero-kanji    156px   Noto Serif JP 600   letter-spacing: -0.02em
display       48px    Noto Serif JP 600   tabular-nums (숫자)
title         22px    Noto Serif JP 600   브랜드 / 섹션 타이틀
body          17px    Pretendard 500      일반 텍스트
reading       17px    Noto Sans JP 400    가나 읽기
label         13px    Pretendard 500      letter-spacing: 0.18em (올캡 라벨)
caption       13px    Pretendard 500      letter-spacing: 0.25em (네비 힌트·보조 텍스트)
```

### 텍스트 규칙

- **Body 최소 16px** (접근성, 모바일 가독성)
- **Line-height 생성 여유롭게** — 1.5-1.7 기본
- **올캡 라벨에는 letter-spacing 0.15em+** — 밀도 낮추기
- **숫자는 tabular-nums** — 줄 맞춤
- **`font-feature-settings: 'ss01'`** Pretendard에 사용 — 대체 글리프

---

## 3. 컬러 시스템

두 팔레트를 CSS 변수로 정의하고 `prefers-color-scheme` 또는 `[data-theme]`로 스왑한다.

### Light: "Quiet Paper" (기본, 낮)

```css
:root {
  --paper:       #F5EFE4;  /* 배경 — 따뜻한 크림 */
  --paper-deep:  #EDE5D4;  /* hover/active */
  --ink:         #1A1915;  /* 본문 먹색 */
  --ink-soft:    #3A3631;  /* 이차 텍스트 */
  --ink-faint:   #8A8275;  /* 라벨/힌트 */
  --accent-clay: #B85840;  /* 한국어 악센트 */
  --accent-sage: #7A8F6E;  /* heatmap 활성 */
  --line:        rgba(26, 25, 21, 0.08);  /* 구분선 */
}
```

배경에 은은한 방사형 그라데이션 허용: `radial-gradient(ellipse at top, #F9F4E8 0%, var(--paper) 60%)`

### Dark: "Dark Study" (밤)

```css
[data-theme="dark"] {
  --bg-deep:  #0E141E;  /* 배경 — 깊은 네이비 */
  --bg:       #121A26;  /* 카드/폰 배경 */
  --bg-soft:  #1A2332;  /* hover */
  --bone:     #E8E2D2;  /* 본문 (순백 아님 — 눈 편함) */
  --bone-soft:#B8B0A0;  /* 이차 */
  --bone-faint:#6A6358; /* 라벨 */
  --gold:     #D4B76A;  /* 한자 메인 — 일본 전통 금색 */
  --gold-deep:#B89550;
  --crimson:  #C47A6E;  /* 한국어 악센트 */
  --line:     rgba(232, 226, 210, 0.08);
}
```

다크 모드는 히어로 뒤 램프 빛 글로우 허용:
`radial-gradient(circle, rgba(212,183,106,0.08) 0%, transparent 70%)`

### 컬러 사용 규칙

- **악센트는 한 번에 하나.** 한 화면에서 clay/crimson 둘 다 안 씀.
- **Heatmap은 악센트의 4단계 알파** 스케일. 빨강-초록 채도 높은 쌍 금지.
- **빨강·초록 피하기** — 일본 학습 앱에서 "X/O" 피드백 빨강/초록은 너무 뻔함. 정답은 부드러운 스케일 + 체크, 오답은 부드러운 흔들림 + 표시.
- **순백 `#FFFFFF` 본문 금지** — 다크 모드에서도 `--bone` (#E8E2D2) 사용.

---

## 4. 스페이싱 스케일

```
xs   4px    아이콘-텍스트 갭
sm   8px    폼 요소 내부
md   12-14px  연관 요소 사이
lg   18-24px  섹션 내부 그룹
xl   40-48px  섹션 사이
xxl  56-80px  메이저 구분
```

컨테이너 패딩 (ModePageShell): `pt-8 px-6 pb-10` (32 / 24 / 40px) 데스크톱 기준. 모바일(<md)에서는 `pt-4` (16px)로 축소 — Chrome iOS chrome이 상하 100pt 잡아먹어 세로 공간 확보 필요. 헤더 아래 여백도 동일 규칙: 데스크톱 32px, 모바일 16px.

---

## 5. 레이아웃 원칙

### 모바일 퍼스트 (375px 기준)

- 데스크톱은 center `390px`에 scale. 데스크톱 넓이 대응은 v1.1.
- **세로 플로우.** 가로 3-column 피처 그리드 절대 금지.
- **하나의 섹션 = 하나의 역할.** 히어로는 "오늘의 한자", 엔트리는 "어디로 갈지", 히트맵은 "얼마나 왔는지". 섞지 않는다.

### 정보 아키텍처 (홈 화면)

```
┌─────────────────────────┐
│ brand         streak    │  ← top status (얇게)
├─────────────────────────┤
│                         │
│    日                   │  ← HERO: 큰 한자 (시각 앵커)
│    音  にち・じつ       │
│    訓  ひ・び・か       │
│    韓  일 — 날·해       │  ← Korean hanja thesis
│                         │
├─────────────────────────┤
│ TODAY                   │
│ 17 cards due            │  ← 오늘 목표 (숫자 앵커)
├─────────────────────────┤
│ 한자  漢字         8   │
│ 단어  単語         6   │  ← 엔트리 3개
│ 문장  文章         3   │
├─────────────────────────┤
│ 7 WEEKS                 │
│ ▫▫▫▪▫▪▫ ... (격자)      │  ← 히트맵 (진행 증명)
└─────────────────────────┘
    HOME · PROGRESS · SETTINGS
```

**첫 3초 체크:** 화면을 보고 3초 안에 "오늘 할 일이 뭔지"와 "얼마나 했는지"가 보여야 한다. 이 두 가지가 흐려지면 레이아웃 실패.

---

## 6. 컴포넌트 어휘

### QuizCard (세 모드 공통)

- **앞면:** 문제 (대형 한자 / 단어 / 빈칸 문장)
- **뒷면:** 정답 + 읽기 + 한국어 힌트 (한자 모드) / 번역 (단어·문장)
- **Framer Motion 플립:** `rotateY: 0 → 180`, 0.6s ease-out
- **답 제출 후 0.5s disabled** — 더블탭 방지
- **정답:** 초록(sage) 체크 + 부드러운 스케일 펄스 (Framer Motion)
- **오답:** 빨강(clay) X + 흔들림 (CSS `@keyframes shake`, 모바일 iOS 프레임 드랍 회피)

### Furigana (후리가나 루비)

```html
<ruby>漢字<rt>かんじ</rt></ruby>
```

- CSS: `ruby-position: over; font-size: 1em; rt { font-size: 0.5em; letter-spacing: 0.05em; }`
- 한자 위에 작은 히라가나 — 힌트 모드에서만 표시 (디폴트 OFF).

### Heatmap (7주 × 7일 격자)

- `display: grid; grid-template-columns: repeat(14, 1fr); gap: 3px`
- 셀은 `aspect-ratio: 1` + `border-radius: 2px`
- 4단계 강도 + 빈 칸(`rgba(ink, 0.05)` 또는 `rgba(bone, 0.04)`)
- 호버 시 날짜 + 카드 수 툴팁 (v1.1)

### EntryRow (한자/단어/문장 진입)

- 얇은 리스트, 카드 아님. 구분선만 있음.
- 좌측: 한국어 (`17px 500`) + 일본어 서브 (`13px 400 faint`)
- 우측: 오늘 큐 카운트 (tabular nums)
- 호버 배경: `--paper-deep` 또는 `--bg-soft`

### 금지 컴포넌트

- ❌ 카드 패턴 (box-shadow + border-radius + 패딩)을 그냥 쓰지 않는다. **카드는 "카드 자체가 인터랙션일 때만"** (뒤집히는 퀴즈카드 같은 거).
- ❌ 버튼에 박스-섀도우 쌓지 않기. 얇은 보더 또는 배경 대비만.
- ❌ 토스트/알림에 이모지 넣지 않기.

---

## 7. 애니메이션 / 모션

### 원칙

- **모션은 위계(hierarchy)에 봉사한다.** 장식적 모션 금지.
- **Duration: 200-400ms** (마이크로인터랙션), **600ms** (카드 플립).
- **Easing: ease-out 기본**, `cubic-bezier(0.4, 0, 0.2, 1)` 허용. 튀는 이징(overshoot/bounce) 금지.
- **Respect `prefers-reduced-motion`.** 사용자가 꺼두면 트랜지션 전부 `0ms`.

### 허용 모션 목록

1. 카드 플립 (Framer Motion)
2. 정답 스케일 펄스 (Framer)
3. 오답 shake (CSS)
4. 후리가나 페이드인 힌트
5. 히트맵 오늘 칸 채워지는 순간 (서브틀 스케일)
6. 페이지 전환 (App Router 기본 크로스 페이드)

**그 외 모션은 기본 금지.** 추가하려면 "이게 없으면 의미가 안 통하나?"를 먼저 묻는다.

---

## 8. 접근성 (a11y)

- **대비비 4.5:1 이상** body 텍스트, 3:1 이상 large 텍스트 (18px+ 또는 14px bold+).
- **최소 탭 타겟 44×44px** (Apple HIG / WCAG 2.2).
- **키보드 네비:** 모든 인터랙티브 요소 Tab 순환, Enter/Space로 활성화. 엔트리 리스트도 포커스 링 있음.
- **스크린 리더:** 일본어 한자는 `<ruby>`로 읽기 힌트 제공. 히트맵은 `<time datetime="YYYY-MM-DD" aria-label="N cards, date">` 래퍼.
- **ARIA 랜드마크:** `<header>`, `<main>`, `<nav>` 명시적으로.
- **색에만 의존 금지.** 정답/오답은 색 + 아이콘(체크/X) + 텍스트 조합.

---

## 9. 반응형

| viewport | 대응 |
|----------|------|
| ≤390px (표준 모바일) | 기본 설계 대상 |
| 391-640px (큰 폰·작은 태블릿) | 390px 고정 너비 중앙 정렬, 배경은 viewport 채움 |
| 641-1024px (태블릿) | v1.1. 양쪽에 gutter, 콘텐츠 최대 너비 480px |
| ≥1024px (데스크톱) | v1.1. 가운데 phone frame 또는 전용 태블릿+ 레이아웃 |

v1에서는 **모바일 고정 설계** 충실히. 데스크톱은 중앙에 phone 나오는 게 촌스럽지만 실용적.

---

## 10. 구현 레퍼런스

### 시작 지점 HTML (v1 개발 시)

```
~/.gstack/projects/jikari/designs/home-dashboard-20260417/
├── variant-A-quiet-paper.html   ← 라이트 모드 레퍼런스
├── variant-B-dark-study.html    ← 다크 모드 레퍼런스
└── approved.json                 ← 결정 메타
```

두 HTML은 **이미 CSS 변수·Google Fonts 로드·레이아웃이 실제 구현에 근접**. Next.js 프로젝트 셋업 후:

1. 루트 CSS에 위 두 `:root` / `[data-theme="dark"]` 블록을 그대로 복사
2. `next/font` 대신 Google Fonts `<link>`을 `app/layout.tsx`에 (또는 `next/font/google`로 최적화)
3. 컴포넌트 만들 때마다 variant-A.html에서 해당 부분 스타일 복사 후 JSX로 래핑

### 브랜드 와이드 톤

- 브랜드명 로고 표기: `jikari` (소문자, Noto Serif JP 600)
- 서브라벨: `じかり` (11-12px, letter-spacing 0.15em, faint color)
- 절대 `Jikari` 대문자 쓰지 않기. 브랜드는 조용하다.

---

## 11. 변경 로그

- **2026-04-17** — 초안 작성. jikari SHELVED 상태에서 `/plan-design-review`로 생성.
- 리스타트 시점에 이 문서를 다시 검토하고 그때의 취향 변화를 반영.
