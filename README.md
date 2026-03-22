# Agent App

로컬 프로젝트나 새로 클론한 Git 저장소를 대상으로, 계획 수립부터 구현, QA, 리뷰까지 여러 역할의 에이전트가 반복적으로 작업하는 로컬 멀티 에이전트 코딩 오케스트레이터입니다.

권장 진행 순서는 다음과 같습니다.

1. VS Code 통합 터미널에서 CLI 흐름을 먼저 안정화합니다.
2. 그다음 CLI 위에 얇은 로컬 UI를 붙입니다.
3. 마지막으로 VS Code custom agent 또는 chat participant로 연결합니다.

현재 기준 진짜 실행 엔진은 CLI입니다. UI나 VS Code 연동은 모두 이 CLI를 감싸는 형태로 가는 것이 가장 안전합니다.

## 무엇을 하나요?

- 로컬 워크스페이스를 준비하거나 Git 저장소를 클론합니다.
- 매니저 에이전트가 백엔드, 프론트엔드, 디자인 시스템, UX 역할로 작업을 나눕니다.
- 코딩 에이전트가 돌려준 파일 쓰기 작업을 실제 워크스페이스에 반영합니다.
- 대상 프로젝트에 `lint`, `test`, `build` 스크립트가 있으면 QA를 실행합니다.
- 리뷰 단계를 거쳐 수락하거나 다음 iteration으로 재작업을 요청합니다.
- 실행 로그와 산출물을 `runs/<timestamp>/` 아래에 저장합니다.

## 준비물

- Node.js 22 이상 권장
- `PATH`에서 실행 가능한 Git
- `.env`에 설정된 API 키 최소 1개

## 빠른 시작

### Windows CMD / VS Code 통합 터미널

```bat
cd /d C:\Users\gusdn\OneDrive\Desktop\agent-app
copy .env.example .env
npm install
npm run dev -- --help
```

VS Code 통합 터미널이 PowerShell인 경우:

- `Copy-Item .env.example .env`
- `npm.cmd install`
- `npm.cmd run dev -- --help`

### macOS / Linux

```bash
cp .env.example .env
npm install
npm run dev -- --help
```

## `.env` 설정

실행 전에 아래 키 중 하나 이상은 반드시 채워야 합니다.

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

`.env.example`에 들어 있는 기본 모델값은 다음과 같습니다.

- OpenAI 일반 모델: `gpt-5.4`
- OpenAI 코딩 모델: `gpt-5.3-codex`
- Anthropic 모델: `claude-sonnet-4-6`
- Gemini 모델: `gemini-3.1-pro-preview`

처음부터 모든 provider를 다 켤 필요는 없습니다. 역할별로 설정된 모델 중 사용 가능한 것만 라우터가 선택합니다.

## API 키는 어디서 발급하나요?

- OpenAI: `platform.openai.com`의 API keys 페이지에서 발급합니다.
- Anthropic: `platform.claude.com` 콘솔의 Account Settings에서 API 키를 생성합니다.
- Gemini: `Google AI Studio`의 API Keys 페이지에서 생성합니다.

공식 문서와 콘솔 링크는 아래에 정리했습니다.

- OpenAI Help: https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key?no_head=1
- OpenAI API keys: https://platform.openai.com/api-keys
- Anthropic Docs: https://platform.claude.com/docs/en/api/overview
- Anthropic Console: https://console.anthropic.com/
- Gemini API keys 가이드: https://ai.google.dev/gemini-api/docs/api-key
- Google AI Studio: https://aistudio.google.com/

## 로컬 프로젝트를 대상으로 실행

```bat
npm run dev -- --workspace "C:\path\to\your-project" --task "로그인 기능을 추가하고 README도 함께 업데이트"
```

처음 돌릴 때는 아래처럼 작게 시작하는 것을 추천합니다.

```bat
npm run dev -- --workspace "C:\path\to\your-project" --task "작은 기능 하나만 추가하고 변경은 최소화" --max-iterations 1
```

## Git 저장소를 클론해서 실행

```bat
npm run dev -- --git https://github.com/your-org/your-repo.git --branch feature/agent-run --task "회원가입 플로우 구현"
```

이 경우 저장소는 `workspaces/cloned-repos/` 아래로 클론되고, 실행 산출물은 `runs/` 아래에 쌓입니다.

## CLI 옵션

- `--workspace <path>`: 기존 로컬 디렉터리를 대상으로 실행
- `--git <url>`: 먼저 저장소를 클론한 뒤 실행
- `--branch <name>`: 클론 후 새 브랜치를 만들고 체크아웃
- `--task <text>`: 에이전트 시스템에 줄 작업 지시문
- `--max-iterations <n>`: 이번 실행에서만 `MAX_ITERATIONS`를 덮어씀
- `--help`: 도움말 출력

규칙:

- `--workspace`와 `--git`은 동시에 쓰지 않습니다.
- `--branch`는 `--git`과 함께 사용할 때만 유효합니다.
- 공백이 있는 작업 문장은 반드시 따옴표로 감쌉니다.

## 결과 파일

한 번 실행할 때마다 `runs/<timestamp>/` 아래에 아래와 같은 파일이 생깁니다.

- `run.log`
- `summary.json`
- `final-report.md`
- `01-manager-plan.json`
- `02-...` 형태의 단계별 JSON 결과물
- `<round>-diff.patch`

## 권장 확장 순서

- Stage 1: VS Code 터미널에서 CLI를 안정화
- Stage 2: CLI를 child process로 실행하는 작은 로컬 UI 추가
- Stage 3: VS Code custom agent와 연결
- Stage 4: 필요하면 나중에 chat participant extension 추가

관련 문서:

- [처음 실행 가이드](./docs/FIRST_RUN.md)
- [확장 단계 문서](./docs/EXPANSION_STAGES.md)
- [VS Code Agent 예시](./examples/vscode/orchestrator.agent.md)

## 문제 해결

- `No provider API keys are configured`: 먼저 `.env`를 채워야 합니다.
- PowerShell에서 `npm`이 막히면 `npm.cmd`를 사용하면 됩니다.
- CMD를 쓴다면 기본적으로 `npm install`, `npm run dev`를 그대로 쓰면 됩니다.
- Git 클론이 실패하면 같은 터미널에서 `git --version`이 되는지 먼저 확인하세요.
- 작업 문장이 잘려 들어가면 따옴표로 감싸세요.
- 첫 실행을 더 안전하게 하고 싶으면 별도 브랜치에서 `--max-iterations 1`로 시작하세요.
