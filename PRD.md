# PRD: Claude Log — Claude Code 토큰 사용량 트래커

> **버전**: 0.1.0  
> **작성일**: 2026-04-11  
> **상태**: Draft  
> **작성자**: seong5 (PO/PM)

---

## 1. 제품 개요

**Claude Log**는 개발자가 Claude Code를 사용하면서 소비하는 토큰을 실시간으로 추적하고, GitHub 잔디(contribution graph) 형태로 시각화하는 **macOS 메뉴바 앱**입니다.

RunCat처럼 맥북 상단 메뉴바에 상주하며, 클릭 한 번으로 오늘의 사용량과 연간 사용 패턴을 확인할 수 있습니다.

---

## 2. 문제 정의

### 2.1 사용자 Pain Points

| # | 문제 | 현재 상황 |
|---|------|-----------|
| P1 | 토큰을 얼마나 쓰고 있는지 알 수 없다 | Claude Code에 실시간 누적 통계 UI 없음 |
| P2 | 비용 예측이 어렵다 | 청구서를 보기 전까지 사용량 파악 불가 |
| P3 | 어떤 프로젝트에 얼마나 썼는지 모른다 | 프로젝트별 분리 통계 없음 |
| P4 | 사용 습관 파악이 안 된다 | 요일별/시간별 패턴 확인 불가 |

### 2.2 기회

- Claude Code 세션 데이터는 `~/.claude/projects/**/*.jsonl`에 로컬 저장됨
- 각 assistant 메시지에 `usage.input_tokens`, `usage.output_tokens`, `usage.cache_*` 필드 포함
- 별도 API 키나 서버 없이 **완전 로컬** 분석 가능

---

## 3. 목표 (Goals)

### 3.1 제품 목표

- **G1**: 메뉴바에서 오늘 사용한 토큰 수를 즉시 확인
- **G2**: 지난 1년간 사용 패턴을 GitHub 잔디 형태로 시각화
- **G3**: 입력/출력/캐시 토큰을 분리하여 비용 추정 제공
- **G4**: 프로젝트별 사용량 비교

### 3.2 비즈니스 목표

- macOS 개발자 커뮤니티에서 입소문으로 확산
- Claude Code 헤비 유저의 필수 도구 포지셔닝

### 3.3 비목표 (Non-Goals)

- ❌ 클라우드 동기화 또는 서버 저장 (v1 범위 외)
- ❌ Windows / Linux 지원 (v1은 macOS만)
- ❌ 다른 AI 툴(Copilot, Cursor 등) 지원
- ❌ 팀/조직 단위 집계
- ❌ Anthropic API 직접 호출

---

## 4. 타겟 사용자

### Primary: Claude Code 헤비 유저

- **직군**: 개인 개발자, 프리랜서, 스타트업 개발자
- **사용 빈도**: 하루 1시간 이상 Claude Code 사용
- **니즈**: 비용 관리, 사용 습관 파악, 생산성 가시화
- **환경**: macOS

### Secondary: 팀 리드 / 테크 리드

- Claude Code 도입 비용을 검토하는 의사결정자
- 팀원 개인 사용량 자기 모니터링 독려

---

## 5. 핵심 기능

### Phase 1 — MVP (v0.1)

#### F1. 메뉴바 아이콘 상주
- **설명**: 맥북 상단 메뉴바에 Claude Log 아이콘 표시
- **동작**:
  - 오늘의 총 토큰 수 숫자 또는 약식(16.3K) 표시
  - Claude Code 사용 중일 때 아이콘 활성화(색상 변경)
  - 클릭 시 팝업 패널 오픈
- **우선순위**: P0

#### F2. 메인 팝업 — 히트맵 대시보드
- **설명**: 클릭 시 나타나는 오버레이 패널
- **포함 정보**:
  - 연간/6개월/3개월 GitHub 잔디형 히트맵
  - 오늘 / 이번 주 / 이번 달 토큰 요약 카드
  - 입력 토큰 vs 출력 토큰 vs 캐시 토큰 비율
  - 현재 연속 사용 스트릭(streak)
- **우선순위**: P0

#### F3. 로컬 데이터 파싱
- **설명**: `~/.claude/projects/**/*.jsonl` 파일을 백그라운드에서 파싱
- **파싱 대상 필드**:
  ```
  message.usage.input_tokens
  message.usage.output_tokens
  message.usage.cache_creation_input_tokens
  message.usage.cache_read_input_tokens
  message.model
  timestamp
  sessionId
  cwd (프로젝트 경로)
  ```
- **갱신 주기**: 파일 변경 감지 (fs.watch) + 앱 포커스 시
- **우선순위**: P0

#### F4. 예상 비용 계산
- **설명**: 토큰 수 × 모델별 단가로 비용 추정
- **지원 모델 단가**:
  | 모델 | Input | Output | Cache Write | Cache Read |
  |------|-------|--------|-------------|------------|
  | claude-opus-4-6 | $15/1M | $75/1M | $18.75/1M | $1.5/1M |
  | claude-sonnet-4-6 | $3/1M | $15/1M | $3.75/1M | $0.3/1M |
  | claude-haiku-4-5 | $0.8/1M | $4/1M | $1/1M | $0.08/1M |
- **우선순위**: P1

### Phase 2 — v0.2

#### F5. 프로젝트별 사용량
- 프로젝트 경로별 토큰 분류
- 상위 N개 프로젝트 사용량 랭킹
- **우선순위**: P1

#### F6. 사용 알림
- 일별 토큰 임계값 초과 시 알림
- 주간 리포트 요약 알림
- **우선순위**: P2

#### F7. 데이터 내보내기
- CSV / JSON 내보내기
- **우선순위**: P2

### Phase 3 — v0.3 (추후 검토)

- 시간대별 히트맵 (hour of day × day of week)
- 모델별 사용량 추이 차트
- 로그인 시 자동 실행(Launch at Login)

---

## 6. 사용자 스토리

```
As a developer,
I want to see today's token count in the menu bar at a glance,
So that I know my usage without opening another app.

As a developer,
I want to view a GitHub-style heatmap of the past year,
So that I can understand my Claude Code usage habits over time.

As a developer,
I want to see estimated costs broken down by model,
So that I can budget my AI tool spending.

As a developer,
I want to see which projects consume the most tokens,
So that I can prioritize where to optimize my prompting.
```

---

## 7. 기술 요구사항

### 7.1 플랫폼

| 항목 | 스펙 |
|------|------|
| 플랫폼 | macOS 13 Ventura 이상 |
| 프레임워크 | Electron (electron-vite) |
| 렌더러 | React 19 + Tailwind CSS v4 |
| 상태관리 | Zustand v5 |
| 데이터 저장 | 로컬 파일 파싱 (추후 SQLite 캐시 고려) |

### 7.2 데이터 소스

```
~/.claude/projects/<project-path>/<session-id>.jsonl
~/.claude/history.jsonl  (세션 메타데이터)
```

- **파싱 전략**: 앱 시작 시 전체 스캔 → 이후 `fs.watch`로 증분 업데이트
- **성능**: 1년치 데이터 기준 파싱 < 2초

### 7.3 메뉴바 구현

- Electron `Tray` API 사용
- 팝업: `BrowserWindow` (frameless, alwaysOnTop)
- 아이콘: 사용량 수치 또는 상태 표시

### 7.4 보안/프라이버시

- 데이터 외부 전송 없음 (완전 로컬)
- `~/.claude/` 읽기 전용 접근
- 프라이버시 정책 화면 제공

---

## 8. UI/UX 요구사항

### 8.1 메뉴바 아이콘

```
[C 1.2K]   ← 오늘 사용량 (1,200 토큰)
[C ●]      ← Claude Code 활성 상태
[C]        ← 비활성 (오늘 사용 없음)
```

### 8.2 팝업 패널

- **크기**: 480×600px (고정)
- **위치**: 메뉴바 아이콘 바로 아래
- **테마**: 다크 모드 전용
- **섹션**:
  1. 헤더 (오늘 날짜 + 이번 달 누적)
  2. 히트맵 (기간 토글: 3개월/6개월/1년)
  3. 요약 통계 카드 4개
  4. 입출력 비율 바
  5. 최근 7일 바 차트

### 8.3 인터랙션

- 팝업 외부 클릭 시 닫힘
- 셀 호버 시 날짜 + 토큰 상세 툴팁
- 기간 토글 즉시 반응 (애니메이션)

---

## 9. 성공 지표 (Success Metrics)

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 일간 활성 사용 | 앱 팝업 1회 이상 오픈 | 로컬 이벤트 로그 |
| 데이터 파싱 정확도 | 실제 토큰 수 ±5% 이내 | Claude API 청구서 대조 |
| 앱 시작 시간 | < 1.5초 | 퍼포먼스 측정 |
| 메모리 사용량 | 상주 중 < 80MB | Activity Monitor |
| 크래시 없는 사용 | 7일 연속 무크래시 | Electron 에러 로그 |

---

## 10. 출시 마일스톤

### v0.1 — MVP (목표: 2주)
- [ ] Tray 아이콘 + 오늘 사용량 표시
- [ ] `~/.claude/` 파일 파싱 엔진
- [ ] 히트맵 UI (목업 → 실데이터 연결)
- [ ] 기본 통계 카드 (총 토큰, 비용 추정)
- [ ] macOS .dmg 패키징

### v0.2 — 프로젝트 분석 (목표: +2주)
- [ ] 프로젝트별 사용량 분리
- [ ] 일별 사용 알림 설정
- [ ] 데이터 CSV 내보내기

### v0.3 — 폴리시 & 배포 (목표: +1주)
- [ ] 로그인 시 자동 실행
- [ ] 온보딩 화면
- [ ] 앱스토어 또는 GitHub Releases 배포

---

## 11. 위험 요소 및 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| Claude Code JSONL 포맷 변경 | 중 | 높음 | 파싱 레이어 추상화, 버전 감지 |
| 대용량 JSONL 파싱 성능 | 중 | 중 | 파싱 결과 로컬 캐시(SQLite) |
| macOS 권한 이슈 (파일 접근) | 낮 | 높음 | 앱 첫 실행 시 권한 요청 가이드 |
| Electron 메모리 누수 | 중 | 중 | 정기 메모리 프로파일링 |

---

## 12. 미결 사항 (Open Questions)

- [ ] **OQ1**: 캐시 토큰(cache_read, cache_creation)을 비용 계산에 포함할 것인가? 별도 표시?
- [ ] **OQ2**: 앱 아이콘에 숫자 표시 vs 그래픽 인디케이터 어느 쪽이 더 유용한가?
- [ ] **OQ3**: 토큰 임계값 알림 기본값은 얼마로 설정할 것인가?
- [ ] **OQ4**: 오픈소스로 공개할 것인가? (GitHub 배포 전략)

---

*이 문서는 살아있는 문서입니다. 구현 진행에 따라 지속 업데이트됩니다.*
