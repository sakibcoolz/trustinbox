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
	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/infra/postgres"
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

// seedSP creates a minimal service provider row required by FK constraints.
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

// cleanBot removes test bot rows (cascades to child tables).
func cleanBot(t *testing.T, db *sql.DB, botID string) {
	t.Helper()
	db.Exec(`DELETE FROM bots WHERE id = $1`, botID)
}

func TestBotRepo_CRUD(t *testing.T) {
	db := testDB(t)
	spID := "10000000-0000-0000-0000-000000000001"
	seedSP(t, db, spID)

	repo := postgres.NewBotRepository(db)
	ctx := context.Background()

	botID := fmt.Sprintf("b-integ-%d", time.Now().UnixNano())
	t.Cleanup(func() { cleanBot(t, db, botID) })

	bot := &entity.Bot{
		ID:                botID,
		ServiceProviderID: spID,
		Name:              "Integration Bot",
		AvatarURL:         "https://example.com/avatar.png",
		Purpose:           "Integration testing",
		Department:        "QA",
		Status:            entity.BotStatusDraft,
		CreatedAt:         time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:         time.Now().UTC().Truncate(time.Microsecond),
	}

	// Create
	if err := repo.Create(ctx, bot); err != nil {
		t.Fatalf("Create: %v", err)
	}

	// GetByID
	got, err := repo.GetByID(ctx, botID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Name != "Integration Bot" {
		t.Errorf("Name = %q, want %q", got.Name, "Integration Bot")
	}
	if got.Status != entity.BotStatusDraft {
		t.Errorf("Status = %q, want DRAFT", got.Status)
	}
	if got.ServiceProviderID != spID {
		t.Errorf("SPID = %q, want %q", got.ServiceProviderID, spID)
	}

	// Update
	bot.Name = "Updated Bot"
	bot.Status = entity.BotStatusActive
	bot.UpdatedAt = time.Now().UTC().Truncate(time.Microsecond)
	if err := repo.Update(ctx, bot); err != nil {
		t.Fatalf("Update: %v", err)
	}
	got, err = repo.GetByID(ctx, botID)
	if err != nil {
		t.Fatalf("GetByID after update: %v", err)
	}
	if got.Name != "Updated Bot" {
		t.Errorf("Name after update = %q, want %q", got.Name, "Updated Bot")
	}
	if got.Status != entity.BotStatusActive {
		t.Errorf("Status after update = %q, want ACTIVE", got.Status)
	}

	// ListBySP
	bots, total, err := repo.ListBySP(ctx, spID, "", "", 10, 0)
	if err != nil {
		t.Fatalf("ListBySP: %v", err)
	}
	if total < 1 {
		t.Errorf("ListBySP total = %d, want >= 1", total)
	}
	found := false
	for _, b := range bots {
		if b.ID == botID {
			found = true
		}
	}
	if !found {
		t.Error("ListBySP did not return created bot")
	}

	// ListBySP with status filter
	bots, total, err = repo.ListBySP(ctx, spID, "ACTIVE", "", 10, 0)
	if err != nil {
		t.Fatalf("ListBySP filtered: %v", err)
	}
	for _, b := range bots {
		if b.Status != entity.BotStatusActive {
			t.Errorf("ListBySP filter returned %q; want ACTIVE", b.Status)
		}
	}
	_ = total

	// Delete
	if err := repo.Delete(ctx, botID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	_, err = repo.GetByID(ctx, botID)
	if err == nil {
		t.Error("GetByID after Delete should return error")
	}
}

func TestBotAnalyticsRepo_IncrementAndGet(t *testing.T) {
	db := testDB(t)
	spID := "10000000-0000-0000-0000-000000000001"
	seedSP(t, db, spID)

	botRepo := postgres.NewBotRepository(db)
	statsRepo := postgres.NewBotAnalyticsRepository(db)
	ctx := context.Background()

	botID := fmt.Sprintf("ba-integ-%d", time.Now().UnixNano())
	bot := &entity.Bot{
		ID:                botID,
		ServiceProviderID: spID,
		Name:              "Analytics Test Bot",
		Purpose:           "Test analytics",
		Status:            entity.BotStatusActive,
		CreatedAt:         time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:         time.Now().UTC().Truncate(time.Microsecond),
	}
	if err := botRepo.Create(ctx, bot); err != nil {
		t.Fatalf("create bot: %v", err)
	}
	t.Cleanup(func() { cleanBot(t, db, botID) })

	// Increment operations
	if err := statsRepo.IncrementConversations(ctx, botID); err != nil {
		t.Fatalf("IncrementConversations: %v", err)
	}
	if err := statsRepo.IncrementConversations(ctx, botID); err != nil {
		t.Fatalf("IncrementConversations 2: %v", err)
	}
	if err := statsRepo.IncrementMessages(ctx, botID, 5, 3); err != nil {
		t.Fatalf("IncrementMessages: %v", err)
	}
	if err := statsRepo.IncrementActions(ctx, botID); err != nil {
		t.Fatalf("IncrementActions: %v", err)
	}
	if err := statsRepo.IncrementEscalations(ctx, botID); err != nil {
		t.Fatalf("IncrementEscalations: %v", err)
	}

	// Get
	stats, err := statsRepo.Get(ctx, botID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if stats.TotalConversations != 2 {
		t.Errorf("TotalConversations = %d, want 2", stats.TotalConversations)
	}
	if stats.TotalMessagesSent != 5 {
		t.Errorf("TotalMessagesSent = %d, want 5", stats.TotalMessagesSent)
	}
	if stats.TotalMessagesReceived != 3 {
		t.Errorf("TotalMessagesReceived = %d, want 3", stats.TotalMessagesReceived)
	}
	if stats.TotalActionsExecuted != 1 {
		t.Errorf("TotalActionsExecuted = %d, want 1", stats.TotalActionsExecuted)
	}
	if stats.TotalEscalations != 1 {
		t.Errorf("TotalEscalations = %d, want 1", stats.TotalEscalations)
	}
}

func TestBotActionLogRepo_CreateAndList(t *testing.T) {
	db := testDB(t)
	spID := "10000000-0000-0000-0000-000000000001"
	seedSP(t, db, spID)

	botRepo := postgres.NewBotRepository(db)
	logRepo := postgres.NewBotActionLogRepository(db)
	ctx := context.Background()

	botID := fmt.Sprintf("bl-integ-%d", time.Now().UnixNano())
	bot := &entity.Bot{
		ID:                botID,
		ServiceProviderID: spID,
		Name:              "Log Test Bot",
		Purpose:           "Test action logs",
		Status:            entity.BotStatusActive,
		CreatedAt:         time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:         time.Now().UTC().Truncate(time.Microsecond),
	}
	if err := botRepo.Create(ctx, bot); err != nil {
		t.Fatalf("create bot: %v", err)
	}
	t.Cleanup(func() { cleanBot(t, db, botID) })

	convID := "c0000000-0000-0000-0000-000000000001"
	for i := 0; i < 3; i++ {
		logEntry := &entity.BotActionLog{
			ID:             fmt.Sprintf("log-%d-%d", time.Now().UnixNano(), i),
			BotID:          botID,
			ConversationID: convID,
			UserID:         "u0000000-0000-0000-0000-000000000001",
			ActionType:     "TOOL_CALL",
			ToolUsed:       "send_notification",
			InputSummary:   fmt.Sprintf("input %d", i),
			OutputSummary:  fmt.Sprintf("output %d", i),
			PolicyDecision: "ALLOW",
			Success:        true,
			DurationMS:     100 + i*50,
			CreatedAt:      time.Now().UTC().Truncate(time.Microsecond),
		}
		if err := logRepo.Create(ctx, logEntry); err != nil {
			t.Fatalf("Create log %d: %v", i, err)
		}
	}

	// ListByBot
	logs, total, err := logRepo.ListByBot(ctx, botID, 10, 0)
	if err != nil {
		t.Fatalf("ListByBot: %v", err)
	}
	if total != 3 {
		t.Errorf("ListByBot total = %d, want 3", total)
	}
	if len(logs) != 3 {
		t.Errorf("ListByBot len = %d, want 3", len(logs))
	}

	// ListByConversation
	logs, total, err = logRepo.ListByConversation(ctx, convID, 10, 0)
	if err != nil {
		t.Fatalf("ListByConversation: %v", err)
	}
	if total != 3 {
		t.Errorf("ListByConversation total = %d, want 3", total)
	}
}

func TestBotConfigRepo_UpsertAndGet(t *testing.T) {
	db := testDB(t)
	spID := "10000000-0000-0000-0000-000000000001"
	seedSP(t, db, spID)

	botRepo := postgres.NewBotRepository(db)
	configRepo := postgres.NewBotConfigurationRepository(db)
	ctx := context.Background()

	botID := fmt.Sprintf("bc-integ-%d", time.Now().UnixNano())
	bot := &entity.Bot{
		ID:                botID,
		ServiceProviderID: spID,
		Name:              "Config Test Bot",
		Purpose:           "Test config",
		Status:            entity.BotStatusDraft,
		CreatedAt:         time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:         time.Now().UTC().Truncate(time.Microsecond),
	}
	if err := botRepo.Create(ctx, bot); err != nil {
		t.Fatalf("create bot: %v", err)
	}
	t.Cleanup(func() { cleanBot(t, db, botID) })

	config := &entity.BotConfiguration{
		BotID:                    botID,
		Tone:                     "friendly",
		WritingStyle:             "concise",
		SupportedLanguages:       []string{"en", "es"},
		WorkingHoursStart:        "09:00",
		WorkingHoursEnd:          "17:00",
		WorkingDays:              []int{1, 2, 3, 4, 5},
		MaxTurnsBeforeEscalation: 8,
		EscalationRules:          "[]",
		HumanHandoffPolicy:       "{}",
		ApprovalPolicy:           "{}",
		FallbackActions:          "[]",
		ComplianceRestrictions:   "{}",
		CustomSystemPrompt:       "You are a helpful assistant.",
		Temperature:              0.7,
	}

	// Upsert (insert)
	if err := configRepo.Upsert(ctx, config); err != nil {
		t.Fatalf("Upsert: %v", err)
	}

	// Get
	got, err := configRepo.Get(ctx, botID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.Tone != "friendly" {
		t.Errorf("Tone = %q, want %q", got.Tone, "friendly")
	}
	if len(got.SupportedLanguages) != 2 {
		t.Errorf("SupportedLanguages len = %d, want 2", len(got.SupportedLanguages))
	}
	if got.MaxTurnsBeforeEscalation != 8 {
		t.Errorf("MaxTurns = %d, want 8", got.MaxTurnsBeforeEscalation)
	}

	// Upsert (update)
	config.Tone = "professional"
	config.Temperature = 0.5
	if err := configRepo.Upsert(ctx, config); err != nil {
		t.Fatalf("Upsert update: %v", err)
	}
	got, err = configRepo.Get(ctx, botID)
	if err != nil {
		t.Fatalf("Get after update: %v", err)
	}
	if got.Tone != "professional" {
		t.Errorf("Tone after update = %q, want %q", got.Tone, "professional")
	}
}

func TestBotPermissionRepo_SetAndList(t *testing.T) {
	db := testDB(t)
	spID := "10000000-0000-0000-0000-000000000001"
	seedSP(t, db, spID)

	botRepo := postgres.NewBotRepository(db)
	permRepo := postgres.NewBotPermissionRepository(db)
	ctx := context.Background()

	botID := fmt.Sprintf("bp-integ-%d", time.Now().UnixNano())
	bot := &entity.Bot{
		ID:                botID,
		ServiceProviderID: spID,
		Name:              "Perm Test Bot",
		Purpose:           "Test permissions",
		Status:            entity.BotStatusActive,
		CreatedAt:         time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:         time.Now().UTC().Truncate(time.Microsecond),
	}
	if err := botRepo.Create(ctx, bot); err != nil {
		t.Fatalf("create bot: %v", err)
	}
	t.Cleanup(func() { cleanBot(t, db, botID) })

	// Set permissions
	perms := []*entity.BotPermission{
		{ID: fmt.Sprintf("p1-%d", time.Now().UnixNano()), BotID: botID, ToolName: "send_notification", IsAllowed: true},
		{ID: fmt.Sprintf("p2-%d", time.Now().UnixNano()), BotID: botID, ToolName: "share_document", IsAllowed: false},
	}
	for _, p := range perms {
		if err := permRepo.Set(ctx, p); err != nil {
			t.Fatalf("Set %s: %v", p.ToolName, err)
		}
	}

	// ListByBot
	list, err := permRepo.ListByBot(ctx, botID)
	if err != nil {
		t.Fatalf("ListByBot: %v", err)
	}
	if len(list) < 2 {
		t.Fatalf("ListByBot len = %d, want >= 2", len(list))
	}

	// IsToolAllowed
	allowed, err := permRepo.IsToolAllowed(ctx, botID, "send_notification")
	if err != nil {
		t.Fatalf("IsToolAllowed: %v", err)
	}
	if !allowed {
		t.Error("send_notification should be allowed")
	}

	allowed, err = permRepo.IsToolAllowed(ctx, botID, "share_document")
	if err != nil {
		t.Fatalf("IsToolAllowed: %v", err)
	}
	if allowed {
		t.Error("share_document should be denied")
	}
}

func TestKnowledgeSourceRepo_CRUD(t *testing.T) {
	db := testDB(t)
	spID := "10000000-0000-0000-0000-000000000001"
	seedSP(t, db, spID)

	botRepo := postgres.NewBotRepository(db)
	ksRepo := postgres.NewKnowledgeSourceRepository(db)
	ctx := context.Background()

	botID := fmt.Sprintf("bk-integ-%d", time.Now().UnixNano())
	bot := &entity.Bot{
		ID:                botID,
		ServiceProviderID: spID,
		Name:              "KS Test Bot",
		Purpose:           "Test knowledge",
		Status:            entity.BotStatusActive,
		CreatedAt:         time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:         time.Now().UTC().Truncate(time.Microsecond),
	}
	if err := botRepo.Create(ctx, bot); err != nil {
		t.Fatalf("create bot: %v", err)
	}
	t.Cleanup(func() { cleanBot(t, db, botID) })

	ksID := fmt.Sprintf("ks-%d", time.Now().UnixNano())
	ks := &entity.KnowledgeSource{
		ID:          ksID,
		BotID:       botID,
		SourceType:  entity.KnowledgeSourceText,
		Name:        "FAQ Source",
		Description: "Frequently asked questions",
		Content:     "Q: What is TrustInbox? A: A communication platform.",
		Status:      entity.KnowledgeSourcePending,
		CreatedAt:   time.Now().UTC().Truncate(time.Microsecond),
		UpdatedAt:   time.Now().UTC().Truncate(time.Microsecond),
	}

	// Create
	if err := ksRepo.Create(ctx, ks); err != nil {
		t.Fatalf("Create: %v", err)
	}

	// GetByID
	got, err := ksRepo.GetByID(ctx, ksID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Name != "FAQ Source" {
		t.Errorf("Name = %q, want %q", got.Name, "FAQ Source")
	}
	if got.Status != entity.KnowledgeSourcePending {
		t.Errorf("Status = %q, want PENDING", got.Status)
	}

	// UpdateStatus
	if err := ksRepo.UpdateStatus(ctx, ksID, entity.KnowledgeSourceActive); err != nil {
		t.Fatalf("UpdateStatus: %v", err)
	}
	got, err = ksRepo.GetByID(ctx, ksID)
	if err != nil {
		t.Fatalf("GetByID after status update: %v", err)
	}
	if got.Status != entity.KnowledgeSourceActive {
		t.Errorf("Status after update = %q, want ACTIVE", got.Status)
	}

	// ListByBot
	list, err := ksRepo.ListByBot(ctx, botID)
	if err != nil {
		t.Fatalf("ListByBot: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("ListByBot len = %d, want 1", len(list))
	}

	// Delete
	if err := ksRepo.Delete(ctx, ksID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	_, err = ksRepo.GetByID(ctx, ksID)
	if err == nil {
		t.Error("GetByID after Delete should return error")
	}
}
