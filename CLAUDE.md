# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)에게 제공되는 가이드입니다.

## 명령어

```bash
npm run dev          # 개발 모드로 Electron 앱 실행 (핫 리로드)
npm run build        # 전체 프로세스 빌드 (main, preload, renderer)
npm run preview      # 프로덕션 빌드 미리보기

npm run build:mac    # macOS .dmg 패키징
npm run build:win    # Windows .exe 패키징 (NSIS)
npm run build:linux  # Linux .AppImage 패키징
```

## 아키텍처

**electron-vite**를 빌드 도구로 사용하는 Electron 앱입니다. Electron의 표준 3-프로세스 모델을 따릅니다:

- **`src/main/index.ts`** — Electron 메인 프로세스. `BrowserWindow`를 생성하고 관리합니다. 외부 링크는 앱 내부가 아닌 OS 기본 브라우저로 열립니다.
- **`src/preload/index.ts`** — 컨텍스트 격리가 적용된 프리로드 스크립트. `@electron-toolkit/preload`의 `electronAPI`를 `contextBridge`를 통해 렌더러에 노출합니다. API 타입은 `src/preload/index.d.ts`에 선언되어 있습니다.
- **`src/renderer/`** — 렌더러 프로세스: Vite로 빌드된 표준 React 19 SPA. 진입점은 `src/renderer/src/main.tsx`입니다.

### 렌더러 스택

- **React 19** — UI
- **Tailwind CSS v4** — `@tailwindcss/vite` 플러그인 사용 (`tailwind.config.js` 불필요)
- **Zustand v5** — 상태 관리, 스토어는 `src/renderer/src/store/`에 위치
- 경로 별칭 `@renderer`는 `src/renderer/src/`를 가리킵니다

### TypeScript 설정

프로젝트는 두 개의 TypeScript 프로젝트 참조를 사용합니다:
- `tsconfig.node.json` — `src/main/`과 `src/preload/` 담당 (CommonJS, ES2022 타겟)
- `tsconfig.web.json` — `src/renderer/src/` 담당 (ESNext 모듈, DOM 라이브러리, 번들러 해석)

### 빌드 결과물

- 개발: Vite 개발 서버(렌더러) + `ELECTRON_RENDERER_URL`에서 로드하는 Electron
- 프로덕션: `out/`에 컴파일(Electron 프로세스), electron-builder로 `dist/`에 패키징

## 에이전트 실행 규칙

- Agent 도구 호출 시 `isolation: "worktree"` 옵션을 사용하지 마세요.
