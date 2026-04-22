#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# bootstrap-sample-bot.sh
#
# End-to-end setup of a TrustInbox bot wired to the n8n sample workflow.
#
# Pre-requisites:
#   1. Stack running:           ./scripts/dev.sh
#   2. Migrations applied:      make migrate
#   3. n8n running on :5678 with the sample workflow IMPORTED + ACTIVATED:
#         a. Open  http://localhost:5678
#         b. "Import from File" → scripts/sample-workflow/n8n-greeting-workflow.json
#         c. Toggle the workflow to ACTIVE (top-right switch)
#         d. The webhook becomes live at  http://localhost:5678/webhook/trustinbox-greet
#
# What this script does:
#   1. Logs in as the seeded demo provider  (demo@trustinbox.dev / Demo1234!)
#   2. Creates a bot named "Sample Greeter" under Demo Corp
#   3. Activates the bot (status = ACTIVE)
#   4. Grants the bot the `execute_workflow` permission
#   5. Registers the n8n workflow at   /api/v1/bots/{botId}/workflows
#   6. Prints a curl snippet to invoke the bot's execute_workflow tool
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GATEWAY="${GATEWAY_URL:-http://localhost:4000}"
EMAIL="${PROVIDER_EMAIL:-demo@trustinbox.dev}"
PASSWORD="${PROVIDER_PASSWORD:-Demo1234!}"
SP_ID="${SP_ID:-dd000000-0000-0000-0000-000000000010}"     # Demo Corp seed
BOT_NAME="${BOT_NAME:-Sample Greeter}"
WORKFLOW_ID="${WORKFLOW_ID:-trustinbox-greet}"
WORKFLOW_NAME="${WORKFLOW_NAME:-TrustInbox Sample Greeting}"
WEBHOOK_PATH="${WEBHOOK_PATH:-/webhook/trustinbox-greet}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: $1 is required" >&2; exit 1; }; }
need curl
need jq

say()  { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }

# ── 1. Login ──────────────────────────────────────────────────────────────────
say "Logging in as $EMAIL"
LOGIN_RESP=$(curl -fsS -X POST "$GATEWAY/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg e "$EMAIL" --arg p "$PASSWORD" '{email:$e, password:$p}')") \
  || fail "login failed — is the gateway running on $GATEWAY ?"

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken')
[ "$TOKEN" != "null" ] && [ -n "$TOKEN" ] || fail "no accessToken in response: $LOGIN_RESP"
ok "got access token (len=${#TOKEN})"

AUTH_HDRS=(-H "Authorization: Bearer $TOKEN" -H "X-Service-Provider-Id: $SP_ID" -H 'Content-Type: application/json')

# ── 2. Create bot ─────────────────────────────────────────────────────────────
say "Creating bot \"$BOT_NAME\""
CREATE_RESP=$(curl -fsS -X POST "$GATEWAY/api/v1/bots" "${AUTH_HDRS[@]}" \
  -d "$(jq -n --arg n "$BOT_NAME" \
                '{name:$n,
                  purpose:"Sample bot demonstrating n8n workflow integration",
                  department:"Customer Support"}')") \
  || fail "create bot failed"

BOT_ID=$(echo "$CREATE_RESP" | jq -r '.id // empty')
[ -n "$BOT_ID" ] || fail "could not parse bot id: $CREATE_RESP"
ok "bot id = $BOT_ID"

# ── 3. Activate bot ───────────────────────────────────────────────────────────
say "Activating bot"
curl -fsS -X PUT "$GATEWAY/api/v1/bots/$BOT_ID" "${AUTH_HDRS[@]}" \
  -d "$(jq -n --arg n "$BOT_NAME" \
              '{name:$n, purpose:"Sample bot demonstrating n8n workflow integration",
                department:"Customer Support", status:"ACTIVE"}')" >/dev/null
ok "bot status → ACTIVE"

# ── 4. Grant execute_workflow permission ──────────────────────────────────────
say "Granting bot the execute_workflow tool permission"
curl -fsS -X POST "$GATEWAY/api/v1/bots/$BOT_ID/permissions" "${AUTH_HDRS[@]}" \
  -d '{"toolName":"execute_workflow","enabled":true}' >/dev/null
ok "permission granted"

# ── 5. Register n8n workflow ──────────────────────────────────────────────────
say "Registering n8n workflow on bot"
WF_RESP=$(curl -fsS -X POST "$GATEWAY/api/v1/bots/$BOT_ID/workflows" "${AUTH_HDRS[@]}" \
  -d "$(jq -n --arg id "$WORKFLOW_ID" --arg name "$WORKFLOW_NAME" --arg path "$WEBHOOK_PATH" \
              '{workflowId:$id, workflowName:$name, webhookPath:$path,
                description:"Sample greeting workflow", isActive:true}')") \
  || fail "register workflow failed (already registered? config conflict?)"

WF_CONFIG_ID=$(echo "$WF_RESP" | jq -r '.id // empty')
ok "workflow config id = ${WF_CONFIG_ID:-?}"

# ── 6. Done — show invocation snippet ────────────────────────────────────────
cat <<EOF

\033[1;32m✔ Bootstrap complete.\033[0m

Bot ID                 : $BOT_ID
Workflow registered    : $WORKFLOW_ID  → $WEBHOOK_PATH
n8n editor             : http://localhost:5678
Make sure the workflow is \033[1mACTIVE\033[0m in n8n, then test it via the bot:

  curl -X POST "$GATEWAY/api/v1/bots/$BOT_ID/actions" \\
    -H "Authorization: Bearer \$TOKEN" \\
    -H "X-Service-Provider-Id: $SP_ID" \\
    -H 'Content-Type: application/json' \\
    -d '{
      "conversationId": "00000000-0000-0000-0000-000000000000",
      "userId":         "dd000000-0000-0000-0000-000000000001",
      "actionType":     "TOOL_CALL",
      "toolName":       "execute_workflow",
      "inputJson":      "{\"workflow_id\":\"$WORKFLOW_ID\",\"input_data\":{\"name\":\"Alice\",\"intent\":\"hello\"},\"async\":false}"
    }'

(The script ./scripts/sample-workflow/test-bot-workflow.sh does exactly this.)
EOF
