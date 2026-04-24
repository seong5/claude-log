# Claude Log

[Claude Code](https://claude.ai/code) 토큰 사용량을 실시간으로 추적하고 GitHub 잔디 형태로 시각화하는 macOS 메뉴바 앱입니다.

![Claude Log](build/main-logo.png)

---

## 주요 기능

### 📊 플랜 사용 한도
- **현재 세션 사용률** — 5시간 롤링 윈도우 기준 사용률(%) 및 초기화까지 남은 시간 표시
- **주간 전체 모델 한도** — 모든 모델 합산 주간 사용률 및 리셋 일정 표시
- **플랜 배지** — Pro / Max 등 현재 플랜명 표시
- **3단계 색상 경고** — 사용률에 따라 초록(안전) → 노랑(주의) → 빨강(위험) 진행 바

### 🗓 활동 히트맵
- GitHub 잔디 스타일로 일별 토큰 사용량을 시각화 (흰색 → 주황 → 진한 주황 그라데이션)
- 셀 호버 시 툴팁으로 총 토큰 / 입력 토큰 / 출력 토큰 / 세션 수 상세 표시
- 미래 날짜는 "예정" 표시로 구분
- 월 레이블 및 요일 레이블 포함

### 📈 요약 통계 (4개 카드)
- **연속 사용일** — 현재 스트릭 및 역대 최고 스트릭
- **올해 누적** — 총 토큰 수, 활성일 수, 전주 대비 증감률(%)
- **오늘 세션** — 오늘 세션 횟수 및 오늘 사용 토큰
- **주력 모델** — 가장 많이 사용한 모델명 (Opus / Sonnet / Haiku)

### 🤖 모델별 사용량
- 각 모델의 토큰 사용 비중을 진행 바로 표시
- 역대 최고 사용일 및 해당 날짜 토큰 수 표시

### 📅 최근 7일 활동
- 최근 7일의 날짜별 바 차트
- 날짜, 토큰 수, 세션 횟수 함께 표시

### 헤더 요약 카드
- **이번 달 토큰** / **최근 7일 토큰** 즉시 확인
- OAuth 연결 상태 실시간 표시 (연결됨 / 연결 안됨)
- 현재 세션 사용률 % 상시 표시

---

## 동작 방식

`~/.claude/projects/**/*.jsonl` 파일을 로컬에서 직접 파싱하며, 서버나 클라우드 동기화 없이 완전히 로컬에서 동작합니다.  
OAuth API에 연동하면 Anthropic의 실시간 사용량 데이터를 추가로 불러옵니다.

---

## 요구 사항

- macOS 11 (Big Sur) 이상
- [Claude Code](https://claude.ai/code) 설치 및 세션 로깅 활성화 상태

---

## 설치

1. [Releases](../../releases) 페이지에서 최신 `Claude.Log-*.dmg` 다운로드
2. DMG를 열고 **Claude Log**를 Applications 폴더로 드래그
3. 앱 실행 — 메뉴바에 아이콘이 표시됩니다
4. *(선택)* 플랜 사용 한도 패널을 활성화하려면 `ANTHROPIC_OAUTH_ACCESS_TOKEN` 설정

> **참고:** Apple Developer ID 서명이 없어 첫 실행 시 Gatekeeper가 차단합니다.  
> **시스템 설정 → 개인 정보 보호 및 보안 → 그래도 열기** 를 클릭해 허용하세요.

---

## 환경 설정

기본 JSONL 파싱 기능은 별도 설정 없이 바로 사용 가능합니다.  
OAuth 실시간 통계를 활성화하려면 프로젝트 루트에 `.env` 파일을 생성하거나 환경 변수를 설정하세요.

```env
ANTHROPIC_OAUTH_ACCESS_TOKEN=your_token_here
```

Claude Code에 로그인된 상태라면 `~/.claude/.credentials.json`에서 자격 증명을 자동으로 불러옵니다.

| 변수 | 필수 여부 | 설명 |
|------|----------|------|
| `ANTHROPIC_OAUTH_ACCESS_TOKEN` | 선택 | 세션/주간 한도 실시간 사용률 표시 활성화 |
| `ANTHROPIC_ADMIN_API_KEY` | 선택 | Admin API 주간 사용량 데이터 활성화 |

---

## 소스 빌드

```bash
# 사전 요구사항: Node 20+, pnpm 9+
pnpm install

# 개발 모드
pnpm run dev

# 프로덕션 빌드
pnpm run build:mac    # macOS DMG
pnpm run build:win    # Windows NSIS 설치 파일
pnpm run build:linux  # Linux AppImage

# 테스트
pnpm run test
```

---

## 알려진 제한사항

- macOS 전용 (Windows / Linux 빌드는 실험적)
- 히트맵 날짜 범위: 2026년 1월 ~ 6월 고정
- 캐시 토큰 분리 통계 미구현 (입력 토큰에 합산 표시)
- 비용 추정 기능 미구현
- 프로젝트별 필터링 미구현
- 한국어 UI 전용

---

## 라이선스

MIT © [seong5](https://github.com/seong5)
