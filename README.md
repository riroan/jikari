# jikari

한국어 화자를 위한 조용한 일본어 학습 웹앱 (개인 사용). 일상/회화 일본어를 한자·단어·문장·조사·활용·형용사·문법·일상표현 8개 과목으로 공부하고, Leitner 방식 간격 반복(SRS)과 실력 기반 난이도 조절로 출제합니다.

디자인 규칙은 [`DESIGN.md`](./DESIGN.md), 프로젝트 컨벤션은 [`CLAUDE.md`](./CLAUDE.md), 남은 할 일은 [`TODOS.md`](./TODOS.md)에 있습니다.

## 라우트

- `/` 홈 (오늘의 한마디, 일일 목표 진행선, 복습 CTA → `/review`)
- `/review` 복습 — 기한 도래한 한자·단어·문장·문법 카드를 섞어서 한 세션으로 (한 번에 일일 목표 수까지)
- `/mix` 종합 퀴즈 — 8개 과목을 섞은 한 판 (약한 카드 우선)
- `/build` 문장 만들기 — 단어 블록을 골라 문장을 조립
- `/listening` 듣기 — 탭: 단어(발음 듣고 뜻 고르기, SRS 영향 없음) · 문장(천천히 재생) · 받아쓰기(가나로 적기) · 말하기(소리 내어 말하기)
- `/search` 검색 — 한자·단어·문장·표현·문법 통합 조회 (히라가나 입력 포함)
- `/progress` 진행, `/settings` 설정 (일일 목표, 백업/복원, 초기화)
- 과목: `/kanji` `/vocab` `/sentence` `/expressions` `/grammar` `/particle` `/conjugation` `/adjective` `/chapters`

## 주요 기능

- **발음(TTS):** 정답을 공개한 뒤와 학습 카드에서 ja-JP 발음 버튼. Web Speech API라 기기에 일본어 음성이 있어야 합니다.
- **세션 요약:** 퀴즈 한 판이 끝나면 정답률·최장 연속·틀린 항목을 보여주고, 틀린 것만 다시 풀 수 있습니다.
- **약한 카드 복습:** `/progress`에서 과목별 약한 카드 목록을 보고 `?weak=1` 덱으로 바로 풉니다.
- **일일 목표:** 설정에서 10/20/30/50/100장 중 고릅니다. 타이핑 시작 박스를 0으로 두면 타이핑 없이 항상 4지선다로 풉니다.
- **밀린 복습 정리:** 기한이 많이 밀리면 홈에 링크가 뜨고, 설정에서 밀린 카드를 7/14/30일에 나눠 다시 배치합니다. 한 번 되돌리기가 가능합니다.
- **백업/복원:** 설정의 백업/복원 다이얼로그. 복원 전에 마지막 백업 시점과 덮어쓸 내용을 보여주고 확인을 받습니다. 독립 실행(standalone) PWA에서는 공유 시트로 내보냅니다.
- **오프라인 지원:** 홈 화면에 설치하면 서비스 워커가 앱 셸과 진행 기록을 캐시해 연결이 없어도 열립니다. 오프라인 풀이는 기기에 대기시켰다가 연결되면 서버와 병합해 저장합니다. 자세한 내용은 [`docs/offline.md`](./docs/offline.md).
- **PWA 설치:** 웹 매니페스트와 아이콘이 있어 홈 화면에 추가할 수 있습니다.
- **저장 상태:** 진행 기록 저장이 실패하면 백오프로 자동 재시도하고, 화면 하단에 `저장 대기 중 / 오프라인 / 저장 실패`를 한 줄로 표시합니다.

## 실행

MySQL이 필요합니다. 학습 기록과 카드는 모두 DB에 저장됩니다.

```bash
bun install
cp .env.example .env.local      # DB 접속 정보 수정
bun run db:migrate              # 마이그레이션 적용 (DDL 먼저, 데이터 수정 A_* 나중)
bun dev                         # http://localhost:3000
```

`bun run build`는 프로덕션 빌드, `bun run verify`는 typecheck + lint + 테스트입니다.
스크립트가 쓰는 DB를 바꾸려면 `JIKARI_DB=remote`와 `.env.remote.local`을 씁니다(어느 DB를 쓰는지 실행 때 출력됩니다).

## 콘텐츠 넣기

시드는 `data/seeds/`(문법은 `data/`)에 JSON으로 있고, 아래 스크립트로 DB에 넣습니다. **이미 있는 id는 건너뛰므로** 여러 번 실행해도 안전하지만, 이미 들어간 카드의 내용은 바뀌지 않습니다. 기존 카드를 고치려면 `lib/db/migrations/A_*.sql`에 데이터 수정을 추가합니다.

```bash
bun scripts/add-kanji.ts      data/seeds/kanji-n4-batch3.json
bun scripts/add-vocab.ts      data/seeds/vocab-daily-batch1.json
bun scripts/add-sentence.ts   data/seeds/sentences-daily-batch1.json
bun scripts/add-expression.ts data/seeds/expressions-batch2.json
bun scripts/add-grammar.ts    data/grammar-daily-batch1.json [--dry-run]
bun scripts/import-chapters.ts   # 챕터 ↔ 카드 매핑 (data/chapters.config.ts)
```

콘텐츠 규칙:

- **상용한자(常用漢字) 안에서만** 씁니다. 범위 밖 글자는 가나로 적습니다.
- 한자가 있는 항목은 후리가나 마크업 `{漢字|かんじ}`을 함께 씁니다. 테스트가 마크업을 벗기면 원문과 같은지, 후리가나가 가나뿐인지 확인합니다.
- 문장 빈칸의 오답은 그 문맥에서 **성립하지 않는** 같은 품사 단어로 고르고, 몇 단어에 쏠리지 않게 합니다.
- 같은 id를 두 시드 파일에 넣지 않습니다. `data/seeds/`의 vocab 파일끼리도 id가 겹치면 안 됩니다(테스트가 막습니다). 먼저 import한 쪽만 남기 때문입니다.

## 테스트

```bash
bun run test        # vitest 단위 테스트 (시드 데이터 검증 포함)
bun run e2e         # playwright 스모크 (개발 서버를 3333 포트로 띄움)
```

`bun test`는 bun 내장 러너라서 쓰지 마세요.

## 배포

`vX.Y.Z` 태그를 push하면 GitHub Actions(`.github/workflows/release-image.yml`)가 arm64 Docker 이미지를 빌드해 `registry.gitlab.com/riroan/riroan/jikari:<태그>`로 올립니다. 저장소 시크릿 `GITLAB_REGISTRY_USERNAME`, `GITLAB_REGISTRY_TOKEN`이 필요합니다. 컨테이너는 `DB_*` 환경 변수를 받습니다.

- 이미지 이름은 워크플로 `IMAGE`(`registry.gitlab.com/riroan/riroan/jikari`)와 배포 매니페스트의 `image`가 같아야 합니다. 매니페스트는 이 저장소 밖에 있으니 직접 확인합니다.
- `git pull` 후에는 `bun run db:migrate`를 실행합니다. 최근 마이그레이션: `0013_daily_goal`(`app_settings.daily_goal`), `A_0004_kanji_dup_levels`, `A_0005_content_fixes`, `A_0006_content_fixes_2`, `A_0007_sentence_distractor_spread`.
- 새 이미지를 롤아웃한 뒤에는 클러스터에서 마이그레이션을 한 번 실행합니다.

  ```bash
  kubectl exec -n jikari deploy/jikari-web -- bun scripts/migrate.ts
  ```

- 콘텐츠 import는 시드가 이미지에 없으므로 노트북에서 원격 DB로 실행합니다. 순서는 add-vocab → add-sentence → add-expression → import-chapters입니다.

  ```bash
  JIKARI_DB=remote bun scripts/add-vocab.ts      data/seeds/<파일>.json
  JIKARI_DB=remote bun scripts/add-sentence.ts   data/seeds/<파일>.json
  JIKARI_DB=remote bun scripts/add-expression.ts data/seeds/<파일>.json
  JIKARI_DB=remote bun scripts/import-chapters.ts
  ```

서비스 워커는 프로덕션 빌드에서만 등록됩니다. 캐시가 꼬였으면 아무 URL에 `?nosw=1`을 붙여 여세요. 서비스 워커를 해제하고 캐시를 지운 뒤 꺼진 상태를 기억합니다. `?nosw=0`으로 다시 켭니다.
