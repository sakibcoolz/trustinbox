//go:build integration

package postgres_test

import (
"context"
"database/sql"
"fmt"
"os"
"testing"
"time"

_ "github.com/lib/pq"
"github.com/trustinbox/analytics-service/internal/domain/entity"
"github.com/trustinbox/analytics-service/internal/infra/postgres"
)

func testDB(t *testing.T) *sql.DB {
t.Helper()
dsn := os.Getenv("TEST_DATABASE_URL")
if dsn == "" {
dsn = "postgres://trustinbox:trustinbox@localhost:5432/trustinbox_test?sslmode=disable"
}
db, err := sql.Open("postgres", dsn)
if err != nil {
t.Fatalf("open db: %v", err)
}
if err := db.Ping(); err != nil {
t.Skipf("database not available: %v", err)
}
t.Cleanup(func() { db.Close() })
return db
}

func seedSP(t *testing.T, db *sql.DB, spID string) {
t.Helper()
_, err := db.Exec(
`INSERT INTO service_providers (id, name, status, created_at, updated_at)
 VALUES ($1, 'Test SP', 'ACTIVE', NOW(), NOW())
 ON CONFLICT (id) DO NOTHING`, spID,
)
if err != nil {
t.Fatalf("seed sp: %v", err)
}
}

func cleanAnalytics(t *testing.T, db *sql.DB, spID string) {
t.Helper()
db.Exec(`DELETE FROM analytics_daily WHERE service_provider_id = $1`, spID)
}

func TestAnalyticsRepo_UpsertAndGetDashboard(t *testing.T) {
db := testDB(t)
spID := "20000000-0000-0000-0000-000000000001"
seedSP(t, db, spID)
t.Cleanup(func() { cleanAnalytics(t, db, spID) })

repo := postgres.NewAnalyticsRepository(db)
ctx := context.Background()
today := time.Now().UTC().Truncate(24 * time.Hour)

daily := &entity.DailyAnalytics{
ID:                     fmt.Sprintf("ad-%d", time.Now().UnixNano()),
ServiceProviderID:      spID,
Date:                   today,
NotificationsSent:      100,
NotificationsDelivered: 90,
NotificationsFailed:    10,
CallbacksRequested:     20,
CallbacksApproved:      15,
CallbacksDenied:        5,
PolicyDenials:          3,
PolicyApprovals:        50,
CampaignsSent:          2,
CampaignsDelivered:     200,
BotActions:             30,
BotEscalations:         5,
WebhooksSent:           40,
WebhooksFailed:         2,
NewCustomers:           10,
ChurnedCustomers:       1,
AvgResponseTimeMS:      0,
}

// Upsert
if err := repo.UpsertDailyMetrics(ctx, daily); err != nil {
t.Fatalf("UpsertDailyMetrics: %v", err)
}

// GetDashboardStats
stats, err := repo.GetDashboardStats(ctx, spID)
if err != nil {
t.Fatalf("GetDashboardStats: %v", err)
}
if stats.TotalNotificationsSent < 100 {
t.Errorf("TotalNotificationsSent = %d, want >= 100", stats.TotalNotificationsSent)
}
if stats.NotificationsDelivered < 90 {
t.Errorf("NotificationsDelivered = %d, want >= 90", stats.NotificationsDelivered)
}

// Upsert again (should add to existing row)
daily2 := *daily
daily2.ID = fmt.Sprintf("ad2-%d", time.Now().UnixNano())
daily2.NotificationsSent = 50
daily2.NotificationsDelivered = 45
if err := repo.UpsertDailyMetrics(ctx, &daily2); err != nil {
t.Fatalf("UpsertDailyMetrics 2: %v", err)
}

stats, err = repo.GetDashboardStats(ctx, spID)
if err != nil {
t.Fatalf("GetDashboardStats 2: %v", err)
}
if stats.TotalNotificationsSent < 150 {
t.Errorf("TotalNotificationsSent after upsert = %d, want >= 150", stats.TotalNotificationsSent)
}
}

func TestAnalyticsRepo_GetDailyAnalytics(t *testing.T) {
db := testDB(t)
spID := "20000000-0000-0000-0000-000000000002"
seedSP(t, db, spID)
t.Cleanup(func() { cleanAnalytics(t, db, spID) })

repo := postgres.NewAnalyticsRepository(db)
ctx := context.Background()
today := time.Now().UTC().Truncate(24 * time.Hour)
yesterday := today.AddDate(0, 0, -1)

for i, date := range []time.Time{yesterday, today} {
daily := &entity.DailyAnalytics{
ID:                     fmt.Sprintf("dd-%d-%d", time.Now().UnixNano(), i),
ServiceProviderID:      spID,
Date:                   date,
NotificationsSent:      (i + 1) * 10,
NotificationsDelivered: (i + 1) * 8,
NotificationsFailed:    (i + 1) * 2,
}
if err := repo.UpsertDailyMetrics(ctx, daily); err != nil {
t.Fatalf("UpsertDailyMetrics %d: %v", i, err)
}
}

dateRange := entity.DateRange{Start: yesterday, End: today}
results, err := repo.GetDailyAnalytics(ctx, spID, dateRange)
if err != nil {
t.Fatalf("GetDailyAnalytics: %v", err)
}
if len(results) != 2 {
t.Fatalf("GetDailyAnalytics len = %d, want 2", len(results))
}
}

func TestAnalyticsRepo_GetNotificationAnalytics(t *testing.T) {
db := testDB(t)
spID := "20000000-0000-0000-0000-000000000003"
seedSP(t, db, spID)
t.Cleanup(func() { cleanAnalytics(t, db, spID) })

repo := postgres.NewAnalyticsRepository(db)
ctx := context.Background()
today := time.Now().UTC().Truncate(24 * time.Hour)

daily := &entity.DailyAnalytics{
ID:                     fmt.Sprintf("dn-%d", time.Now().UnixNano()),
ServiceProviderID:      spID,
Date:                   today,
NotificationsSent:      200,
NotificationsDelivered: 180,
NotificationsFailed:    20,
}
if err := repo.UpsertDailyMetrics(ctx, daily); err != nil {
t.Fatalf("UpsertDailyMetrics: %v", err)
}

dateRange := entity.DateRange{Start: today, End: today}
notif, err := repo.GetNotificationAnalytics(ctx, spID, dateRange)
if err != nil {
t.Fatalf("GetNotificationAnalytics: %v", err)
}
if notif.TotalSent != 200 {
t.Errorf("TotalSent = %d, want 200", notif.TotalSent)
}
if notif.TotalDelivered != 180 {
t.Errorf("TotalDelivered = %d, want 180", notif.TotalDelivered)
}
if notif.DeliveryRate < 0.89 || notif.DeliveryRate > 0.91 {
t.Errorf("DeliveryRate = %f, want ~0.9", notif.DeliveryRate)
}
}

func TestAnalyticsRepo_GetCallbackAnalytics(t *testing.T) {
db := testDB(t)
spID := "20000000-0000-0000-0000-000000000004"
seedSP(t, db, spID)
t.Cleanup(func() { cleanAnalytics(t, db, spID) })

repo := postgres.NewAnalyticsRepository(db)
ctx := context.Background()
today := time.Now().UTC().Truncate(24 * time.Hour)

daily := &entity.DailyAnalytics{
ID:                fmt.Sprintf("dc-%d", time.Now().UnixNano()),
ServiceProviderID: spID,
Date:              today,
CallbacksRequested: 50,
CallbacksApproved:  40,
CallbacksDenied:    10,
}
if err := repo.UpsertDailyMetrics(ctx, daily); err != nil {
t.Fatalf("UpsertDailyMetrics: %v", err)
}

dateRange := entity.DateRange{Start: today, End: today}
cb, err := repo.GetCallbackAnalytics(ctx, spID, dateRange)
if err != nil {
t.Fatalf("GetCallbackAnalytics: %v", err)
}
if cb.TotalRequested != 50 {
t.Errorf("TotalRequested = %d, want 50", cb.TotalRequested)
}
if cb.TotalApproved != 40 {
t.Errorf("TotalApproved = %d, want 40", cb.TotalApproved)
}
if cb.ApprovalRate < 0.79 || cb.ApprovalRate > 0.81 {
t.Errorf("ApprovalRate = %f, want ~0.8", cb.ApprovalRate)
}
}

func TestAnalyticsRepo_EmptyResults(t *testing.T) {
db := testDB(t)
spID := "20000000-0000-0000-0000-000000000099"
seedSP(t, db, spID)
t.Cleanup(func() { cleanAnalytics(t, db, spID) })

repo := postgres.NewAnalyticsRepository(db)
ctx := context.Background()
today := time.Now().UTC().Truncate(24 * time.Hour)
dateRange := entity.DateRange{Start: today, End: today}

// Dashboard stats for SP with no data
stats, err := repo.GetDashboardStats(ctx, spID)
if err != nil {
t.Fatalf("GetDashboardStats: %v", err)
}
if stats.TotalNotificationsSent != 0 {
t.Errorf("expected 0 notifications for empty SP")
}

// Daily analytics with no rows
daily, err := repo.GetDailyAnalytics(ctx, spID, dateRange)
if err != nil {
t.Fatalf("GetDailyAnalytics: %v", err)
}
if len(daily) != 0 {
t.Errorf("expected empty daily analytics, got %d", len(daily))
}
}
