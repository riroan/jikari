@AGENTS.md

# jikari

한국어 화자를 위한 조용한 일본어 학습 웹앱 (개인 사용).

## 컨셉

- **학습 주제: 일상/회화 일본어.** 비즈니스/문어체/고전이 아닌 실제 쓰이는 생활 표현 중심.
- **한자 범위: 상용한자 (常用漢字, 2,136자).** 단어/예문/빈칸 콘텐츠 생성 시 상용한자 밖 글자는 피하거나 가나로 대체. 콘텐츠 추가 시 이 범위 내에서 선별.

## 필수 읽기 (순서 중요)

1. **`DESIGN.md`** — 디자인 시스템. CSS 변수, 폰트 스택, 컴포넌트 어휘, AI 슬롭 금기 10개. 모든 UI 결정은 이 문서와 대조.
2. **`RESTART-CHECKLIST.md`** — Week 1-3 Day-by-day 실행 계획. 다음 단계가 궁금하면 여기.

## 스택

- Next.js 16.2.4 (App Router, Turbopack, React 19)
- Tailwind 4 (`@theme inline` 토큰 패턴 사용 — globals.css 참조)
- TypeScript, Zustand, Framer Motion, Zod
- Vitest + Testing Library + Playwright

## 프로젝트 컨벤션

- **CSS 변수는 globals.css의 `:root` + `[data-theme="dark"]`가 단일 진실원.** 컴포넌트에서 하드코드 금지.
- **폰트 변수 사용:** `var(--font-jp-serif)` / `var(--font-jp-sans)` / Pretendard (기본). `font-family` 인라인 스타일 허용 (Tailwind arbitrary보다 읽기 좋음).
- **시스템 폰트 / Inter / Roboto 금지.**
- **카드 패턴 남발 금지** — DESIGN.md § 6 "금지 컴포넌트" 확인.
- **한자는 Noto Serif JP, 가나는 Noto Sans JP, 한국어는 Pretendard.** 섞지 말 것.

## 테스트

```bash
bun test         # vitest (단위 테스트)
bun e2e          # playwright (스모크 E2E)
```

## 개발

```bash
bun dev          # http://localhost:3000
bun run build    # production 빌드
```

## 일본어 / 한국어 디자인 노트

- 한자 카드 앞면: 한자만 크게
- 뒷면: 음독/훈독 읽기 + `韓` 섹션에 한국어 hanja/음/뜻
- **앞면에 한국어 힌트 노출 금지** — 답 유추 방지
