#!/bin/bash
# Claude Code Notification 훅 - 권한 요청 및 사용자 입력 대기 알림
#
# 이 스크립트는 Claude Code가 Notification 이벤트를 발생시킬 때 실행됩니다.
# 주로 권한 요청이나 사용자 입력 대기 상황에서 Slack 알림을 보냅니다.

# stdin에서 JSON 입력 읽기
INPUT=$(cat)

# .env 파일에서 Slack 웹훅 URL 로드
if [ -f "$CLAUDE_PROJECT_DIR/.env" ]; then
    set -a
    source "$CLAUDE_PROJECT_DIR/.env"
    set +a
else
    echo "오류: .env 파일을 찾을 수 없습니다: $CLAUDE_PROJECT_DIR/.env" >&2
    exit 1
fi

# Slack 웹훅 URL 확인
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "오류: SLACK_WEBHOOK_URL이 설정되지 않았습니다." >&2
    exit 1
fi

# JSON 입력에서 메시지 추출
MESSAGE=$(echo "$INPUT" | jq -r '.message // "알림"')

# 프로젝트명 추출
PROJECT_NAME=$(basename "$CLAUDE_PROJECT_DIR")

# 현재 시간
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# JSON payload 생성
PAYLOAD=$(printf '{"text": "🔔 *[%s]* Claude Code 알림\n>%s\n_%s_"}' "$PROJECT_NAME" "$MESSAGE" "$TIMESTAMP")

# Slack으로 알림 전송
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  --data "$PAYLOAD" \
  "$SLACK_WEBHOOK_URL")

if [ "$RESPONSE" = "200" ]; then
    echo "Slack 알림 전송 성공 (HTTP $RESPONSE)" >&2
else
    echo "Slack 알림 전송 실패 (HTTP $RESPONSE)" >&2
    exit 1
fi
