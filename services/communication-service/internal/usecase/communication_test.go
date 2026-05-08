package usecase_test

import (
	"context"
	"testing"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
)

// ─── Mocks ─────────────────────────────────────────────────

type mockCallbackRepo struct {
	requests map[string]*entity.CallbackRequest
}

func newMockCallbackRepo() *mockCallbackRepo {
	return &mockCallbackRepo{requests: make(map[string]*entity.CallbackRequest)}
}

func (m *mockCallbackRepo) Create(_ context.Context, req *entity.CallbackRequest) error {
	m.requests[req.ID] = req
	return nil
}

func (m *mockCallbackRepo) GetByID(_ context.Context, id string) (*entity.CallbackRequest, error) {
	req, ok := m.requests[id]
	if !ok {
		return nil, bizerr.NotFound("callback_request", id)
	}
	return req, nil
}

func (m *mockCallbackRepo) ListByUser(_ context.Context, userID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	var out []entity.CallbackRequest
	for _, r := range m.requests {
		if r.UserID == userID {
			out = append(out, *r)
		}
	}
	return out, len(out), nil
}

func (m *mockCallbackRepo) ListBySP(_ context.Context, spID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	var out []entity.CallbackRequest
	for _, r := range m.requests {
		if r.ServiceProviderID == spID {
			out = append(out, *r)
		}
	}
	return out, len(out), nil
}

func (m *mockCallbackRepo) Approve(_ context.Context, id string, slotStart, slotEnd time.Time) error {
	req, ok := m.requests[id]
	if !ok {
		return bizerr.NotFound("callback_request", id)
	}
	req.Status = "APPROVED"
	req.ApprovedSlotStart = &slotStart
	req.ApprovedSlotEnd = &slotEnd
	now := time.Now()
	req.RespondedAt = &now
	return nil
}

func (m *mockCallbackRepo) Reject(_ context.Context, id, reason string) error {
	req, ok := m.requests[id]
	if !ok {
		return bizerr.NotFound("callback_request", id)
	}
	req.Status = "REJECTED"
	now := time.Now()
	req.RespondedAt = &now
	return nil
}

func (m *mockCallbackRepo) UpdateStatus(_ context.Context, id, status string) error {
	req, ok := m.requests[id]
	if !ok {
		return bizerr.NotFound("callback_request", id)
	}
	req.Status = status
	return nil
}

type mockConvRepo struct{}

func (m *mockConvRepo) Create(_ context.Context, _ *entity.Conversation) error { return nil }
func (m *mockConvRepo) GetByID(_ context.Context, _ string) (*entity.Conversation, error) {
	return nil, nil
}
func (m *mockConvRepo) ListByUser(_ context.Context, _ string, _, _ int) ([]entity.Conversation, int, error) {
	return nil, 0, nil
}
func (m *mockConvRepo) Close(_ context.Context, _ string) error { return nil }

type mockMsgRepo struct {
	messages []*entity.Message
}

func (m *mockMsgRepo) Create(_ context.Context, msg *entity.Message) error {
	m.messages = append(m.messages, msg)
	return nil
}
func (m *mockMsgRepo) ListByConversation(_ context.Context, _ string, _, _ int) ([]entity.Message, int, error) {
	return nil, 0, nil
}

type mockSpamRepo struct {
	reports []*entity.SpamReport
}

func (m *mockSpamRepo) Create(_ context.Context, r *entity.SpamReport) error {
	m.reports = append(m.reports, r)
	return nil
}
func (m *mockSpamRepo) ListBySP(_ context.Context, _ string, _, _ int) ([]entity.SpamReport, int, error) {
	return nil, 0, nil
}
func (m *mockSpamRepo) UpdateStatus(_ context.Context, _, _ string) error { return nil }

type mockDocShareRepo struct{}

func (m *mockDocShareRepo) Create(_ context.Context, _ *entity.DocumentShare) error {
	return nil
}
func (m *mockDocShareRepo) ListByUser(_ context.Context, _ string, _, _ int) ([]entity.DocumentShare, int, error) {
	return nil, 0, nil
}
func (m *mockDocShareRepo) MarkOpened(_ context.Context, _ string) error { return nil }

type mockPolicyChecker struct {
	allowed bool
	reason  string
}

func (m *mockPolicyChecker) EvaluateCallbackPermission(_ context.Context, _, _ string) (bool, string, error) {
	return m.allowed, m.reason, nil
}

type mockPublisher struct {
	events []*events.Event
}

func (m *mockPublisher) Publish(_ context.Context, event *events.Event) error {
	m.events = append(m.events, event)
	return nil
}

func (m *mockPublisher) PublishBatch(_ context.Context, evts []*events.Event) error {
	m.events = append(m.events, evts...)
	return nil
}

func (m *mockPublisher) Close() error { return nil }

func newUC(callbackRepo *mockCallbackRepo, policy *mockPolicyChecker, pub *mockPublisher) *usecase.CommunicationUseCase {
	return usecase.NewCommunicationUseCase(
		callbackRepo, &mockConvRepo{}, &mockMsgRepo{}, &mockSpamRepo{}, &mockDocShareRepo{},
		policy, pub, zap.NewNop(),
	)
}

// ─── E2E: Callback Approval Flow ──────────────────────────

func TestE2E_CallbackApproval_FullFlow(t *testing.T) {
	callbackRepo := newMockCallbackRepo()
	policy := &mockPolicyChecker{allowed: true}
	pub := &mockPublisher{}
	uc := newUC(callbackRepo, policy, pub)
	ctx := context.Background()

	// 1. Create callback request
	req := &entity.CallbackRequest{
		UserID:            "user-001",
		ServiceProviderID: "sp-001",
		RequestedBySPUser: "agent-001",
		Reason:            "Account review",
		Details:           "Need to discuss account changes",
	}
	created, err := uc.CreateCallbackRequest(ctx, req)
	if err != nil {
		t.Fatalf("CreateCallbackRequest: %v", err)
	}
	if created.Status != "PENDING" {
		t.Errorf("Status = %q, want PENDING", created.Status)
	}
	if created.ID == "" {
		t.Error("ID should not be empty")
	}

	// Verify callback.requested event
	foundReqEvent := false
	for _, e := range pub.events {
		if e.Type == events.CallbackRequested {
			foundReqEvent = true
		}
	}
	if !foundReqEvent {
		t.Error("callback.requested event not published")
	}

	// 2. Approve with slot
	slotStart := time.Now().Add(24 * time.Hour).Truncate(time.Hour)
	slotEnd := slotStart.Add(30 * time.Minute)

	if err := uc.ApproveCallbackRequest(ctx, created.ID, "user-001", slotStart, slotEnd); err != nil {
		t.Fatalf("ApproveCallbackRequest: %v", err)
	}

	got, _ := callbackRepo.GetByID(ctx, created.ID)
	if got.Status != "APPROVED" {
		t.Errorf("Status after approval = %q, want APPROVED", got.Status)
	}
	if got.ApprovedSlotStart == nil {
		t.Error("ApprovedSlotStart should be set")
	}
	if got.RespondedAt == nil {
		t.Error("RespondedAt should be set")
	}

	// Verify callback.approved event
	foundApprovedEvent := false
	for _, e := range pub.events {
		if e.Type == events.CallbackApproved {
			foundApprovedEvent = true
		}
	}
	if !foundApprovedEvent {
		t.Error("callback.approved event not published")
	}
}

func TestE2E_CallbackRejection(t *testing.T) {
	callbackRepo := newMockCallbackRepo()
	policy := &mockPolicyChecker{allowed: true}
	pub := &mockPublisher{}
	uc := newUC(callbackRepo, policy, pub)
	ctx := context.Background()

	req := &entity.CallbackRequest{
		UserID:            "user-002",
		ServiceProviderID: "sp-002",
		Reason:            "Sales follow-up",
	}
	created, err := uc.CreateCallbackRequest(ctx, req)
	if err != nil {
		t.Fatalf("CreateCallbackRequest: %v", err)
	}

	if err := uc.RejectCallbackRequest(ctx, created.ID, "user-002", "Not interested"); err != nil {
		t.Fatalf("RejectCallbackRequest: %v", err)
	}

	got, _ := callbackRepo.GetByID(ctx, created.ID)
	if got.Status != "REJECTED" {
		t.Errorf("Status = %q, want REJECTED", got.Status)
	}
}

func TestE2E_CallbackRequest_PolicyDenied(t *testing.T) {
	callbackRepo := newMockCallbackRepo()
	policy := &mockPolicyChecker{allowed: false, reason: "Organization blocked"}
	pub := &mockPublisher{}
	uc := newUC(callbackRepo, policy, pub)
	ctx := context.Background()

	req := &entity.CallbackRequest{
		UserID:            "user-003",
		ServiceProviderID: "sp-003",
		Reason:            "Follow-up",
	}
	_, err := uc.CreateCallbackRequest(ctx, req)
	if err == nil {
		t.Fatal("expected policy denial error")
	}
	if !bizerr.IsPolicyDenied(err) {
		t.Errorf("expected POLICY_DENIED error, got: %v", err)
	}
}

func TestApproveCallbackRequest_WrongUser(t *testing.T) {
	callbackRepo := newMockCallbackRepo()
	policy := &mockPolicyChecker{allowed: true}
	pub := &mockPublisher{}
	uc := newUC(callbackRepo, policy, pub)
	ctx := context.Background()

	req := &entity.CallbackRequest{
		UserID:            "user-001",
		ServiceProviderID: "sp-001",
		Reason:            "Test",
	}
	created, _ := uc.CreateCallbackRequest(ctx, req)

	// Try to approve with wrong user
	err := uc.ApproveCallbackRequest(ctx, created.ID, "wrong-user",
		time.Now().Add(time.Hour), time.Now().Add(2*time.Hour))
	if err == nil {
		t.Fatal("expected forbidden error")
	}
}

func TestApproveCallbackRequest_AlreadyApproved(t *testing.T) {
	callbackRepo := newMockCallbackRepo()
	policy := &mockPolicyChecker{allowed: true}
	pub := &mockPublisher{}
	uc := newUC(callbackRepo, policy, pub)
	ctx := context.Background()

	req := &entity.CallbackRequest{
		UserID:            "user-001",
		ServiceProviderID: "sp-001",
		Reason:            "Test",
	}
	created, _ := uc.CreateCallbackRequest(ctx, req)

	slotStart := time.Now().Add(time.Hour)
	slotEnd := slotStart.Add(30 * time.Minute)
	_ = uc.ApproveCallbackRequest(ctx, created.ID, "user-001", slotStart, slotEnd)

	// Try to approve again
	err := uc.ApproveCallbackRequest(ctx, created.ID, "user-001", slotStart, slotEnd)
	if err == nil {
		t.Fatal("expected error on double approval")
	}
}

func TestSendMessage(t *testing.T) {
	callbackRepo := newMockCallbackRepo()
	policy := &mockPolicyChecker{allowed: true}
	pub := &mockPublisher{}
	msgRepo := &mockMsgRepo{}

	uc := usecase.NewCommunicationUseCase(
		callbackRepo, &mockConvRepo{}, msgRepo, &mockSpamRepo{}, &mockDocShareRepo{},
		policy, pub, zap.NewNop(),
	)
	ctx := context.Background()

	msg := &entity.Message{
		ConversationID: "conv-001",
		SenderType:     "USER",
		SenderRefID:    "user-001",
		MessageType:    "TEXT",
		Content:        "Hello, I have a question.",
	}
	sent, err := uc.SendMessage(ctx, msg)
	if err != nil {
		t.Fatalf("SendMessage: %v", err)
	}
	if sent.ID == "" {
		t.Error("ID should not be empty")
	}
	if len(msgRepo.messages) != 1 {
		t.Errorf("messages len = %d, want 1", len(msgRepo.messages))
	}

	// Verify message.sent event
	foundMsgEvent := false
	for _, e := range pub.events {
		if e.Type == events.MessageSent {
			foundMsgEvent = true
		}
	}
	if !foundMsgEvent {
		t.Error("message.sent event not published")
	}
}

func TestReportSpam(t *testing.T) {
	spamRepo := &mockSpamRepo{}
	pub := &mockPublisher{}

	uc := usecase.NewCommunicationUseCase(
		newMockCallbackRepo(), &mockConvRepo{}, &mockMsgRepo{}, spamRepo, &mockDocShareRepo{},
		&mockPolicyChecker{allowed: true}, pub, zap.NewNop(),
	)
	ctx := context.Background()

	report := &entity.SpamReport{
		UserID:            "user-001",
		ServiceProviderID: "sp-spam",
		Reason:            "Unsolicited advertisement",
		Details:           "Received promotional notification without consent",
	}
	if err := uc.ReportSpam(ctx, report); err != nil {
		t.Fatalf("ReportSpam: %v", err)
	}
	if report.ID == "" {
		t.Error("ID should not be empty")
	}
	if report.Status != "OPEN" {
		t.Errorf("Status = %q, want OPEN", report.Status)
	}
	if len(spamRepo.reports) != 1 {
		t.Errorf("reports len = %d, want 1", len(spamRepo.reports))
	}

	// Verify spam.reported event
	foundSpamEvent := false
	for _, e := range pub.events {
		if e.Type == events.SpamReported {
			foundSpamEvent = true
		}
	}
	if !foundSpamEvent {
		t.Error("spam.reported event not published")
	}
}
