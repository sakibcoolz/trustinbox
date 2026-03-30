package testfixtures

import (
	"time"

	botentity "github.com/trustinbox/bot-service/internal/domain/entity"
)

// BotBuilder provides a fluent API for constructing test Bot entities.
type BotBuilder struct {
	bot *botentity.Bot
}

// NewBotBuilder returns a builder pre-filled with sensible defaults.
func NewBotBuilder() *BotBuilder {
	now := time.Now().UTC()
	return &BotBuilder{
		bot: &botentity.Bot{
			ID:                "bot-test-001",
			ServiceProviderID: "sp-test-001",
			Name:              "Test Bot",
			AvatarURL:         "https://example.com/avatar.png",
			Purpose:           "Customer support",
			Department:        "support",
			IndustryProfileID: "industry-001",
			Status:            botentity.BotStatusActive,
			CreatedBySPUserID: "user-sp-001",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
	}
}

func (b *BotBuilder) WithID(id string) *BotBuilder                 { b.bot.ID = id; return b }
func (b *BotBuilder) WithSPID(spID string) *BotBuilder             { b.bot.ServiceProviderID = spID; return b }
func (b *BotBuilder) WithName(name string) *BotBuilder             { b.bot.Name = name; return b }
func (b *BotBuilder) WithPurpose(purpose string) *BotBuilder       { b.bot.Purpose = purpose; return b }
func (b *BotBuilder) WithStatus(s botentity.BotStatus) *BotBuilder { b.bot.Status = s; return b }
func (b *BotBuilder) WithCreatedBy(uid string) *BotBuilder         { b.bot.CreatedBySPUserID = uid; return b }
func (b *BotBuilder) Build() *botentity.Bot                        { return b.bot }

// BotConfigBuilder provides a fluent API for constructing BotConfiguration.
type BotConfigBuilder struct {
	cfg *botentity.BotConfiguration
}

func NewBotConfigBuilder() *BotConfigBuilder {
	return &BotConfigBuilder{
		cfg: &botentity.BotConfiguration{
			BotID:                    "bot-test-001",
			Tone:                     "professional",
			WritingStyle:             "concise",
			SupportedLanguages:       []string{"en"},
			WorkingDays:              []int{1, 2, 3, 4, 5},
			MaxTurnsBeforeEscalation: 10,
			Temperature:              0.7,
		},
	}
}

func (b *BotConfigBuilder) WithBotID(id string) *BotConfigBuilder { b.cfg.BotID = id; return b }
func (b *BotConfigBuilder) WithTone(t string) *BotConfigBuilder   { b.cfg.Tone = t; return b }
func (b *BotConfigBuilder) Build() *botentity.BotConfiguration    { return b.cfg }

// BotPermissionBuilder provides a fluent API for constructing BotPermission.
type BotPermissionBuilder struct {
	perm *botentity.BotPermission
}

func NewBotPermissionBuilder() *BotPermissionBuilder {
	return &BotPermissionBuilder{
		perm: &botentity.BotPermission{
			ID:        "perm-test-001",
			BotID:     "bot-test-001",
			ToolName:  "send_notification",
			IsAllowed: true,
		},
	}
}

func (b *BotPermissionBuilder) WithBotID(id string) *BotPermissionBuilder {
	b.perm.BotID = id
	return b
}
func (b *BotPermissionBuilder) WithTool(t string) *BotPermissionBuilder {
	b.perm.ToolName = t
	return b
}
func (b *BotPermissionBuilder) WithAllowed(a bool) *BotPermissionBuilder {
	b.perm.IsAllowed = a
	return b
}
func (b *BotPermissionBuilder) Build() *botentity.BotPermission { return b.perm }

// KnowledgeSourceBuilder provides a fluent API for constructing KnowledgeSource.
type KnowledgeSourceBuilder struct {
	src *botentity.KnowledgeSource
}

func NewKnowledgeSourceBuilder() *KnowledgeSourceBuilder {
	now := time.Now().UTC()
	return &KnowledgeSourceBuilder{
		src: &botentity.KnowledgeSource{
			ID:         "ks-test-001",
			BotID:      "bot-test-001",
			SourceType: botentity.KnowledgeSourceDocument,
			Name:       "FAQ Document",
			Content:    "Frequently asked questions.",
			Status:     botentity.KnowledgeSourceActive,
			CreatedAt:  now,
			UpdatedAt:  now,
		},
	}
}

func (b *KnowledgeSourceBuilder) WithBotID(id string) *KnowledgeSourceBuilder {
	b.src.BotID = id
	return b
}
func (b *KnowledgeSourceBuilder) WithName(n string) *KnowledgeSourceBuilder { b.src.Name = n; return b }
func (b *KnowledgeSourceBuilder) Build() *botentity.KnowledgeSource         { return b.src }

// BotActionLogBuilder provides a fluent API for constructing BotActionLog.
type BotActionLogBuilder struct {
	log *botentity.BotActionLog
}

func NewBotActionLogBuilder() *BotActionLogBuilder {
	return &BotActionLogBuilder{
		log: &botentity.BotActionLog{
			ID:             "log-test-001",
			BotID:          "bot-test-001",
			ConversationID: "conv-test-001",
			UserID:         "user-test-001",
			ActionType:     "tool_call",
			ToolUsed:       "send_notification",
			InputSummary:   `{"target":"user-1"}`,
			OutputSummary:  `{"status":"ok"}`,
			PolicyDecision: "ALLOW",
			PolicyReason:   "all checks passed",
			DurationMS:     42,
			Success:        true,
			CreatedAt:      time.Now().UTC(),
		},
	}
}

func (b *BotActionLogBuilder) WithBotID(id string) *BotActionLogBuilder { b.log.BotID = id; return b }
func (b *BotActionLogBuilder) WithTool(t string) *BotActionLogBuilder   { b.log.ToolUsed = t; return b }
func (b *BotActionLogBuilder) WithSuccess(s bool) *BotActionLogBuilder  { b.log.Success = s; return b }
func (b *BotActionLogBuilder) Build() *botentity.BotActionLog           { return b.log }

// BotAnalyticsBuilder provides a fluent API for constructing BotAnalytics.
type BotAnalyticsBuilder struct {
	stats *botentity.BotAnalytics
}

func NewBotAnalyticsBuilder() *BotAnalyticsBuilder {
	return &BotAnalyticsBuilder{
		stats: &botentity.BotAnalytics{
			BotID:                   "bot-test-001",
			TotalConversations:      100,
			TotalMessagesSent:       500,
			TotalMessagesReceived:   450,
			TotalActionsExecuted:    200,
			TotalEscalations:        10,
			AvgResponseTimeMS:       150,
			AvgTurnsPerConversation: 5.0,
			EscalationRate:          0.05,
			ResolutionRate:          0.85,
			SatisfactionScore:       4.2,
		},
	}
}

func (b *BotAnalyticsBuilder) WithBotID(id string) *BotAnalyticsBuilder { b.stats.BotID = id; return b }
func (b *BotAnalyticsBuilder) Build() *botentity.BotAnalytics           { return b.stats }
