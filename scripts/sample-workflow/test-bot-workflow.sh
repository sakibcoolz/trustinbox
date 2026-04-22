#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# test-bot-workflow.sh
#
# Invokes the bot's `execute_workflow` tool which dispatches to the n8n
# sample webhook and prints the synchronous response.
#
# Usage:
#   ./scripts/sample-workflow/test-bot-workflow.sh <BOT_ID> [intent] [name]
#
# Example:
#   ./scripts/sample-workflow/test-bot-workflow.sh 123e4567-... order_status Alice
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BOT_ID="${1:-}"
INTENT="${2:-hello}"
NAME="${3:-Alice}"

if [ -z "$BOT_ID" ]; then
  echo "Usage: $0 <BOT_ID> [intent] [name]" >&2
  exit 1
fi

GATEWAY="${GATEWAY_URL:-http://localhost:4000}"
EMAIL="${PROVIDER_EMAIL:-demo@trustinbox.dev}"
PASSWORD="${PROVIDER_PASSWORD:-Demo1234!}"
SP_ID="${SP_ID:-dd000000-0000-0000-0000-000000000010}"
USER_ID="${USER_ID:-dd000000-0000-0000-0000-000000000001}"
WORKFLOW_ID="${WORKFLOW_ID:-trustinbox-greet}"

# Login
TOKEN=$(curl -fsS -X POST "$GATEWAY/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg e "$EMAIL" --arg p "$PASSWORD" '{email:$e,password:$p}')" \
  | jq -r '.accessToken')

# Stable v4-ish UUID for the conversation (random per run)
CONVO_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || \
           python3 -c 'import uuid;print(uuid.uuid4())')

INPUT_JSON=$(jq -n --arg wf "$WORKFLOW_ID" --arg n "$NAME" --arg i "$INTENT" \
  '{workflow_id:$wf, input_data:{name:$n, intent:$i}, async:false}')

echo "▶ Invoking bot $BOT_ID  →  workflow $WORKFLOW_ID  (intent=$INTENT)"
curl -sS -X POST "$GATEWAY/api/v1/bots/$BOT_ID/actions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Service-Provider-Id: $SP_ID" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg c "$CONVO_ID" --arg u "$USER_ID" --arg in "$INPUT_JSON" \
              '{conversationId:$c, userId:$u,
                actionType:"TOOL_CALL", toolName:"execute_workflow",
                inputJson:$in}')" \
  | jq .
