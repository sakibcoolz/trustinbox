# Business Flow: Spam Detection and Moderation

## Overview

TrustInbox incorporates multi-layered spam protection to maintain platform trust. Service providers accumulate spam scores based on user reports, policy denials, and AI-driven content analysis. High-spam providers are automatically restricted and may be suspended.

## Actors

- **Customer**: Reports spam/unwanted communications
- **AI Service**: Classifies message content for spam indicators
- **Policy Service**: Enforces spam score thresholds
- **Organization Service**: Manages SP reputation and status
- **Platform Admin**: Reviews flagged SPs, makes moderation decisions

## Flow Steps

### Phase 1: Spam Reporting

1. Customer receives a notification or message from an SP
2. Customer clicks **Report Spam** on the notification/message
3. System records the spam report:
   - Reporter (user ID)
   - Reported SP (service_provider_id)
   - Content reference (notification_id or message_id)
   - Report reason (optional: unwanted, misleading, offensive, other)
4. Event published: `spam.reported`

### Phase 2: Spam Score Calculation

5. Spam scoring factors:
   - **User reports**: Each unique user report adds to score
   - **Report frequency**: Rapid accumulation of reports weighs more
   - **Policy denials**: High denial rate indicates poor targeting
   - **AI content analysis**: Flagged content contributes to score
   - **Ad cap violations**: Attempting to exceed ad caps
6. Score is maintained as a rolling metric (0.0 to 10.0)
7. Score recalculated on each new signal

### Phase 3: Automated Enforcement

8. Score thresholds and actions:

| Score Range | Status | Effect |
|-------------|--------|--------|
| 0.0 - 3.0 | Good | No restrictions |
| 3.0 - 5.0 | Warning | SP notified of rising score |
| 5.0 - 8.0 | Restricted | Ad sending limited, increased policy scrutiny |
| 8.0 - 10.0 | Blocked | All communications auto-denied by policy engine |

9. When score reaches 8.0:
   - Policy engine auto-denies all communications with `spam_score_exceeded`
   - SP admin notified via email and in-app alert
   - Platform admin flagged for review
   - Event published: `spam.threshold.exceeded`

### Phase 4: Platform Admin Review

10. Admin views flagged SPs in admin dashboard
11. Reviews:
    - Spam score history and contributing factors
    - Sample reported content
    - User report volume and reasons
    - SP's communication patterns
12. Admin actions:
    - **Dismiss**: Score is warranted, no further action
    - **Warn**: Send formal warning to SP
    - **Restrict**: Limit communication volume
    - **Suspend**: Temporarily suspend SP account
    - **Ban**: Permanently remove SP from platform

### Phase 5: Score Recovery

13. SP can reduce spam score by:
    - Reducing communication volume
    - Improving content quality (fewer reports)
    - Time decay (score naturally decreases without new reports)
    - Completing a compliance review with platform team
14. Recovery rate: approximately 0.5 points per week with no new reports

## Business Rules

- **Rolling window**: Spam score calculated over a 90-day rolling window
- **Unique reporters**: Multiple reports from the same user count as one
- **Category weight**: Advertisement spam weighs 2x more than service notifications
- **Minimum volume**: SP must have sent at least 10 communications before score is calculated
- **Score threshold**: 8.0 triggers automatic blocking (configurable per industry)
- **Appeal process**: Suspended SPs can appeal through platform support
- **Transparency**: SPs can see their own spam score and contributing factors
- **Industry adjustment**: Healthcare and banking have slightly higher thresholds (8.5)

## AI Content Analysis

The AI service analyzes outgoing content for spam indicators:

- **Clickbait patterns**: Excessive urgency, misleading claims
- **Frequency abuse**: Same content sent to many users rapidly
- **Template manipulation**: Bypassing ad detection by disguising ads as service notifications
- **Link analysis**: Suspicious or shortened URLs
- **Language patterns**: Known spam language patterns

Classification output:
- `CLEAN`: No spam indicators detected
- `SUSPICIOUS`: Minor indicators, contributes slightly to score
- `SPAM`: Strong spam indicators, significant score contribution
- `MALICIOUS`: Phishing or harmful content, immediate flagging

## Moderation Dashboard (Admin)

The platform admin dashboard includes:

- **Flagged SPs list**: SPs with score above 5.0, sorted by severity
- **Report volume chart**: Daily/weekly spam reports across platform
- **Top reported SPs**: Most-reported SPs with report counts
- **Moderation queue**: SPs awaiting admin review
- **Action history**: Past moderation decisions and outcomes
- **Score trend**: Platform-wide average spam score over time

## Events Published

| Event | Trigger |
|-------|---------|
| `spam.reported` | Customer reports spam |
| `spam.score.updated` | SP spam score recalculated |
| `spam.threshold.exceeded` | Score crosses 8.0 threshold |
| `spam.warning.sent` | SP receives spam warning |
| `sp.suspended` | SP suspended due to spam |
| `sp.restored` | SP restored after review |
