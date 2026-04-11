---
description: "컨벤션에 맞는 git 브랜치를 생성하고 전환합니다"
allowed-tools:
  [
    "Bash(git branch:*)",
    "Bash(git checkout:*)",
    "Bash(git switch:*)",
    "Bash(git status:*)",
    "Bash(git log:*)",
  ]
---

# Claude 명령어: Branch

브랜치 네이밍 컨벤션에 맞춰 새 브랜치를 생성하고 전환합니다.

## 프로세스

1. `git status`로 미커밋 변경사항 확인
   - 변경사항이 있으면 `/commit` 먼저 실행할 것을 권고 (계속 진행 여부 확인)
2. 사용자가 제공한 브랜치 목적/이름을 분석하여 컨벤션에 맞는 브랜치명 제안
   - 한글 포함 시 영문으로 변환하여 제안
   - 공백/특수문자는 하이픈으로 변환
3. `git switch -c <branch>` 로 생성 및 전환
4. 완료 후 다음 단계 안내

## 브랜치 네이밍 컨벤션

`<타입>/<설명>` 형식 사용

| 타입 | 용도 | 예시 |
|------|------|------|
| `feature/` | 새 기능 개발 | `feature/tray-icon` |
| `fix/` | 버그 수정 | `fix/parser-crash` |
| `docs/` | 문서 작업 | `docs/prd-update` |
| `refactor/` | 코드 리팩토링 | `refactor/zustand-store` |
| `release/` | 배포 준비 | `release/v0.1.0` |
| `hotfix/` | 프로덕션 긴급 수정 | `hotfix/memory-leak` |
| `chore/` | 빌드/설정 변경 | `chore/update-deps` |

**네이밍 규칙:**
- 소문자 + 하이픈(`-`)만 사용
- 공백, 언더스코어(`_`), 특수문자 금지
- 72자 미만

## 완료 후 출력

```
✅ 브랜치 생성 완료
브랜치: feature/tray-icon
기준: main

다음 단계:
  작업 후 /commit → /push → /pr 순서로 진행하세요
```

## 실행

```bash
git status
git switch -c <branch>
git branch --show-current  # 전환 확인
```
