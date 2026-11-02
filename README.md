# jikari

한국어 화자를 위한 조용한 일본어 학습 웹앱 (개인 사용). 일상/회화 일본어를 한자·단어·문장·조사·활용·형용사·문법·일상표현 8개 과목으로 공부하고, Leitner 방식 간격 반복(SRS)과 실력 기반 난이도 조절로 출제합니다.

디자인 규칙은 [`DESIGN.md`](./DESIGN.md), 프로젝트 컨벤션은 [`CLAUDE.md`](./CLAUDE.md), 남은 할 일은 [`TODOS.md`](./TODOS.md)에 있습니다.

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
- 같은 id를 두 시드 파일에 넣지 않습니다(테스트가 막습니다). 먼저 import한 쪽만 남기 때문입니다.

## 테스트

```bash
bun run test        # vitest 단위 테스트 (시드 데이터 검증 포함)
bun run e2e         # playwright 스모크 (개발 서버를 3333 포트로 띄움)
```

`bun test`는 bun 내장 러너라서 쓰지 마세요.

## 배포

`vX.Y.Z` 태그를 push하면 GitHub Actions(`.github/workflows/release-image.yml`)가 arm64 Docker 이미지를 빌드해 `registry.gitlab.com/riroan/riroan/jikari:<태그>`로 올립니다. 저장소 시크릿 `GITLAB_REGISTRY_USERNAME`, `GITLAB_REGISTRY_TOKEN`이 필요합니다. 컨테이너는 `DB_*` 환경 변수를 받고, 새 버전을 올린 뒤에는 `bun run db:migrate`를 한 번 실행합니다.
