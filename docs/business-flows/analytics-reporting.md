# Business Flow: Analytics and Reporting

## Overview

TrustInbox provides comprehensive analytics for service providers, covering notification delivery, callback performance, campaign effectiveness, bot interactions, and compliance metrics. Analytics are event-driven: metrics are aggregated in real-time as platform events flow through the system.

## Actors

- **SP Admin / Analyst**: Views analytics dashboards and exports reports
- **Analytics Service**: Aggregates metrics from platform events
- **Worker Service**: Processes event streams for aggregation
- **All Platform Services**: Publish events that feed analytics

## Analytics Domains

### 1. Dashboard Summary

The main provider dashboard displays real-time KPIs:

| Metric | Description | Source |
|--------|-------------|--------|
| Total Notifications Sent | Count of notifications sent today/week/month | notification events |
| Delivery Rate | Percentage of sent that were delivered | delivery events |
| Open Rate | Percentage of delivered that were read | read events |
| Active Callbacks | Count of pending/approved callbacks | callback events |
| Campaign Performance | Active campaigns and completion rate | campaign events |
| Bot Conversations | Active bot conversations and escalation rate | bot events |
| Policy Denial Rate | Percentage of communications denied | policy events |

### 2. Notification Analytics

- **Volume**: Sent, delivered, read, failed counts (daily, weekly, monthly)
- **Category breakdown**: Personal vs. Service Provider vs. Advertisement
- **Channel breakdown**: In-app, SMS, email, push
- **Delivery latency**: Average time from send to delivery
- **Read rate by category**: Which categories get the most engagement
- **Top denial reasons**: Why notifications are being blocked
- **Time-of-day heatmap**: When notifications have highest engagement

### 3. Callback Analytics

- **Volume**: Requested, approved, rejected, completed, expired counts
- **Approval rate**: Percentage of requests that get approved
- **Average response time**: Time from request to approval/rejection
- **Completion rate**: Percentage of approved callbacks that complete
- **Expiry rate**: Percentage that expire without customer action
- **Peak request times**: When callbacks are most requested
- **Denial reasons**: Why callback requests are denied by policy

### 4. Campaign Analytics

- **Campaign list**: All campaigns with status, dates, and summary metrics
- **Per-campaign**: Sent, delivered, read, failed, skipped counts
- **Target eligibility**: How many targets passed policy vs. were denied
- **Delivery rate by campaign**: Comparing campaign effectiveness
- **A/B comparison**: Side-by-side campaign metric comparison

### 5. Bot Analytics

- **Conversations handled**: Total and by bot
- **Resolution rate**: Percentage resolved without human escalation
- **Escalation rate**: Percentage handed off to human agents
- **Average conversation duration**: Time from start to close
- **Tool usage**: Which tools are most used and their success rates
- **Knowledge gap analysis**: Queries the bot could not answer

### 6. Compliance Analytics

- **Policy evaluations**: Total allow vs. deny decisions
- **Denial reason breakdown**: Pie chart of denial reasons
- **DND violations**: Attempted contacts during DND (caught by policy)
- **Spam score trends**: SP spam score over time
- **Audit log volume**: Actions per day/week
- **Data access audit**: Who accessed what data and when
- **Document access log**: Document views and downloads

## Data Flow

```
Platform Events
    |
    v
Redis Streams
    |
    v
Analytics Consumer (analytics-service)
    |
    +---> analytics_daily table (PostgreSQL) -- persistent aggregation
    |
    +---> In-memory counters -- real-time dashboard updates
```

### Aggregation Strategy

1. **Real-time counters**: In-memory counters for live dashboard updates (reset daily)
2. **Daily rollup**: `analytics_daily` table stores per-SP, per-date, per-domain metrics
3. **Historical queries**: SQL aggregation over `analytics_daily` for week/month/year views
4. **Event replay**: Redis Streams retain events for re-aggregation if needed

### analytics_daily Table

```sql
analytics_daily
  id (UUID)
  service_provider_id (FK)
  date (DATE)
  domain (VARCHAR)           -- notification, callback, campaign, bot, policy
  metric_name (VARCHAR)      -- sent_count, delivered_count, etc.
  metric_value (BIGINT)
  metadata (JSONB)           -- additional context (category, channel, etc.)
  created_at (TIMESTAMPTZ)
  updated_at (TIMESTAMPTZ)
```

## Dashboard Pages

### Provider Dashboard (/)

- KPI cards: notifications sent, delivery rate, active callbacks, bot conversations
- Trend chart: 7-day notification volume
- Activity feed: recent events

### Analytics Page (/analytics)

- Date range selector (today, 7d, 30d, 90d, custom)
- Tab navigation: Notifications, Callbacks, Campaigns, Bots, Compliance
- Each tab shows relevant charts and tables
- Export to CSV functionality

### Bot Analytics (/bots/[id]/analytics)

- Per-bot performance dashboard
- Conversation volume chart
- Escalation rate trend
- Tool usage breakdown
- Knowledge gap report

## Business Rules

- **SP-scoped**: Analytics are strictly scoped to the requesting SP
- **Role-based access**: ANALYST role can view all analytics; AGENT sees limited scope
- **Data retention**: Raw events retained for 90 days; daily aggregates retained indefinitely
- **Real-time refresh**: Dashboard KPIs update every 30 seconds via SSE
- **Export limits**: CSV export limited to 10,000 rows per request
- **Timezone handling**: All analytics displayed in SP's configured timezone
- **Comparison periods**: Support for period-over-period comparison (this week vs. last week)

## Events Consumed

| Event | Analytics Domain |
|-------|-----------------|
| `notification.created` | Notification volume |
| `notification.delivered` | Delivery metrics |
| `notification.read` | Engagement metrics |
| `notification.failed` | Failure tracking |
| `callback.requested` | Callback volume |
| `callback.approved` | Approval metrics |
| `callback.rejected` | Rejection tracking |
| `callback.completed` | Completion metrics |
| `campaign.launched` | Campaign tracking |
| `campaign.completed` | Campaign results |
| `bot.action.executed` | Bot performance |
| `bot.escalated` | Escalation tracking |
| `policy.evaluated` | Policy metrics |
| `policy.denied` | Denial tracking |
| `document.shared` | Document metrics |
| `document.downloaded` | Access tracking |
| `webhook.delivery.completed` | Webhook metrics |
| `webhook.delivery.failed` | Webhook failures |
