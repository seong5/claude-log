---
description: "GitHub PR을 생성합니다"
allowed-tools:
  [
    "Bash(git log:*)",
    "Bash(git diff:*)",
    "Bash(git branch:*)",
    "Bash(git status:*)",
    "Bash(gh pr create:*)",
    "Bash(gh pr list:*)",
    "Bash(gh auth status:*)",
  ]
---

# Claude 명령어: PR

현재 브랜치의 변경사항을 분석하여 프로젝트 PR 템플릿으로 GitHub Pull Request를 생성합니다.

## 프로세스

1. `git branch --show-current`로 현재 브랜치 확인
   - `main` / `master`이면 경고 후 중단 ("feature 브랜치에서 실행하세요")
2. `gh pr list`로 현재 브랜치에 열린 PR이 이미 있는지 확인
   - 있으면 해당 PR URL 안내 후 중단
3. `git log main..HEAD --oneline`으로 포함될 커밋 목록 파악
   - 커밋이 없으면 "push할 변경사항이 없습니다"로 안내 후 중단
4. `git diff main...HEAD --stat`으로 변경 파일 분류 (feat / fix / docs / chore)
5. 아래 PR 템플릿 구조에 맞춰 제목과 본문 작성

## PR 템플릿 구조

`.github/PULL_REQUEST_TEMPLATE.md`를 기반으로 작성합니다:

```
## 📌 변경 사항 개요
<!-- 1-3줄 요약 -->

## 📝 상세 내용
<!-- 구현 핵심 내용 -->

## 🔗 관련 이슈
<!-- Resolves: #번호 (해당하는 경우) -->

## 🖼️ 스크린샷 (선택사항)
<!-- UI 변경이 있는 경우 -->

## 💡 참고 사항
<!-- 리뷰어가 알아야 할 추가 정보 -->
```

## PR 제목 규칙

커밋 메시지와 동일한 이모지 + 컨벤셔널 커밋 포맷 사용:

`<이모지> <타입>: <설명>` (72자 미만)

## 완료 후 출력

```
✅ PR 생성 완료
URL: https://github.com/<owner>/<repo>/pull/<number>
```

## 안전 규칙

- `gh auth status`로 인증 상태 먼저 확인
- `main`/`master` 브랜치에서는 실행하지 않음
- 이미 열린 PR이 있으면 새로 생성하지 않음

## 실행

```bash
git branch --show-current
gh auth status
gh pr list --head <branch>
git log main..HEAD --oneline
git diff main...HEAD --stat
gh pr create --title "<제목>" --body "$(cat <<'EOF'
<본문>
EOF
)"
```
