---
description: "안전하게 git push를 수행합니다"
allowed-tools:
  [
    "Bash(git status:*)",
    "Bash(git log:*)",
    "Bash(git branch:*)",
    "Bash(git push:*)",
    "Bash(git remote:*)",
  ]
---

# Claude 명령어: Push

현재 브랜치 상태를 확인하고 안전하게 원격 저장소에 push합니다.

## 프로세스

1. `git status`로 미커밋 변경사항 확인
   - 변경사항이 있으면 `/commit` 먼저 실행할 것을 권고하고 중단
2. `git log origin/<branch>..HEAD`로 push할 커밋 목록 요약 출력
   - push할 커밋이 없으면 "이미 최신 상태입니다"로 안내하고 중단
3. 브랜치 유형에 따라 분기 처리

## 브랜치별 동작

| 브랜치 유형 | 동작 |
|------------|------|
| `main` / `master` | `git push` 실행 (force push 시도 시 차단 + 경고) |
| 신규 브랜치 (upstream 없음) | `git push -u origin <branch>` 실행 |
| 일반 feature 브랜치 | `git push` 실행 |

## 완료 후 출력

```
✅ Push 완료
브랜치: feature/my-branch → origin/feature/my-branch
커밋 수: 2개
```

## 안전 규칙

- `--force` / `--force-with-lease` 플래그 사용 금지
- `--no-verify` 플래그 사용 금지
- main/master 브랜치 force push 절대 금지

## 실행

```bash
git status
git branch --show-current
git log origin/<branch>..HEAD --oneline  # push할 커밋 확인
git push  # 또는 git push -u origin <branch> (신규 브랜치)
```
