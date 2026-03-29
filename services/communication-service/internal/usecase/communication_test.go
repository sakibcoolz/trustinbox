package usecase

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"go.uber.org/zap"
)

// Mock implementations

type mockCallbackRepo struct {
	callback *entity.CallbackRequest
	err      error
}

func (m *mockCallbackRepo) Create(_ context.Context, req *entity.CallbackRequest) error {
	if m.err != nil {
		return m.err
	}
	if m.callback == nil {
		m.callback = req
	}
	return nil
}

func (m *mockCallbackRepo) GetByID(_ context.Context, _ string) (*entity.CallbackRequest, error) {
	if m.callback == nil {
		return nil, fmt.Errorf("not found")
	}
	return m.callback, m.err
}

func (m *mockCallbackRepo) ListByUser(_ context.Context, _, _ string, _, _ int) ([]entity.CallbackRequest, int, error) {
	if m.callback != nil {
		return []entity.CallbackRequest{*m.callback}, 1, m.err
	}
	return nil, 0, m.err
}

func (m *mockCallbackRepo) ListByOrg(_ context.Context, _, _ string, _, _ int) ([]entity.CallbackRequest, int, error) {
	return nil, 0, m.err
}

func (m *mockCallbackRepo) Approve(_ context.Context, _ string, _, _ time.Time) error {
	return m.err
}

func (m *mockCallbackRepo) Reject(_ context.Context, _, _ string) error {
	return m.err
}

func (m *mockCallbackRepo) UpdateStatus(_ context.Context, _, _ string) error {
	return m.err
}

type mockConvRepo struct{}

func (m *mockConvRepo) Create(_ context.Context, _ *entity.Conversation) error     { return nil }
func (m *mockConvRepo) GetByID(_ context.Context, _ string) (*entity.Conversation, error) {
	return nil, fmt.Errorf("not found")
}
func (m *mockConvRepo) ListByUser(_ context.Context, _ string, _, _ int) ([]entity.Conversation, int, error) {
	return nil, 0, nil
}
func (m *mockConvRepo) Close(_ context.Context, _ string) error { return nil }

type mockMsgRepo struct{}

func (m *mockMsgRepo) Create(_ context.Context, _ *entity.Message) error { return nil }
func (m *mockMsgRepo) ListByConversation(_ context.Context, _ string, _, _ int) ([]entity.Message, int, error) {
	return nil, 0, nil
}

type mockSpamRepo struct{}

func (m *mockSpamRepo) Create(_ context.Context, _ *entity.SpamReport) error { return nil }
func (m *mockSpamRepo) ListByOrg(_ context.Context, _ string, _, _ int) ([]entity.SpamReport, int, error) {
	return nil, 0, nil
}
func (m *mockSpamRepo) UpdateStatus(_ context.Context, _, _ string) error { return nil }

type mockDocRepo struct{}

func (m *mockDocRepo) Create(_ context.Context, _ *entity.Document) error         { return nil }
func (m *mockDocRepo) GetByID(_ context.Context, _ string) (*entity.Document, error) {
	return nil, fmt.Errorf("not found")
}

type mockDocShareRepo struct{}

func (m *mockDocShareRepo) Create(_ context.Context, _ *entity.DocumentShare) error { return nil }
func (m *mockDocShareRepo) ListByUser(_ context.Context, _ string, _, _ int) ([]entity.DocumentShare, int, error) {
	return nil, 0, nil
}
func (m *mockDocShareRepo) MarkOpened(_ context.Context, _ string) error { return nil }

type mockCommPolicyChecker struct {
	allowed bool
	reason  string
	err     error
}

func (m *mockCommPolicyChecker) EvaluateCallbackPermission(_ context.Context, _, _ string) (bool, string, error) {
	return m.allowed, m.reason, m.err
}

// Helper

func newTestCommunicationUseCase(
	callbackRepo *mockCallbackRepo,
	policy *mockCommPolicyChecker,
) *CommunicationUseCase {
	return NewCommunicationUseCase(
		callbackRepo,
		&mockConvRepo{},
		&mockMsgRepo{},
		&mockSpamRepo{},
		&mockDocRepo{},
		&mockDocShareRepo{},
		policy,
		zap.NewNop(),
	)
}

// Tests

func TestCreateCallbackRequest_PolicyDenied(t *testing.T) {
	uc := newTestCommunicationUseCase(
		&mockCallbackRepo{},
		&mockCommPolicyChecker{allowed: false, reason: "user blocked org"},
	)

	req := &entity.CallbackRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Reason:         "Need support",
	}
	_, err := uc.CreateCallbackRequest(context.Background(), req)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !bzerr.IsCode(err, bzerr.CodePolicyDenied) {
		t.Errorf("expected CodePolicyDenied, got error: %v", err)
	}
}

func TestCreateCallbackRequest_PolicyAllowed(t *testing.T) {
	uc := newTestCommunicationUseCase(
		&mockCallbackRepo{},
		&mockCommPolicyChecker{allowed: true},
	)

	req := &entity.CallbackRequest{
		UserID:         "user-1",
		OrganizationID: "org-1",
		Reason:         "Need support",
	}
	result, err := uc.CreateCallbackRequest(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Status != "PENDING" {
		t.Errorf("expected status PENDING, got %s", result.Status)
	}
	if result.ID == "" {
		t.Error("expected ID to be populated, got empty string")
	}
}

func TestApproveCallbackRequest_NotOwner(t *testing.T) {
	existing := &entity.CallbackRequest{
		ID:     "cb-1",
		UserID: "user-1",
		Status: "PENDING",
	}
	uc := newTestCommunicationUseCase(
		&mockCallbackRepo{callback: existing},
		&mockCommPolicyChecker{allowed: true},
	)

	err := uc.ApproveCallbackRequest(context.Background(), "cb-1", "other-user", time.Now(), time.Now().Add(time.Hour))
	if err == nil {
		t.Fatal("expected error for wrong owner, got nil")
	}
	if !bzerr.IsCode(err, bzerr.CodeForbidden) {
		t.Errorf("expected CodeForbidden, got error: %v", err)
	}
}

func TestApproveCallbackRequest_NotPending(t *testing.T) {
	existing := &entity.CallbackRequest{
		ID:     "cb-1",
		UserID: "user-1",
		Status: "APPROVED",
	}
	uc := newTestCommunicationUseCase(
		&mockCallbackRepo{callback: existing},
		&mockCommPolicyChecker{allowed: true},
	)

	err := uc.ApproveCallbackRequest(context.Background(), "cb-1", "user-1", time.Now(), time.Now().Add(time.Hour))
	if err == nil {
		t.Fatal("expected error for non-PENDING status, got nil")
	}
	if !bzerr.IsCode(err, bzerr.CodeInvalidInput) {
		t.Errorf("expected CodeInvalidInput, got error: %v", err)
	}
}

func TestApproveCallbackRequest_Success(t *testing.T) {
	existing := &entity.CallbackRequest{
		ID:     "cb-1",
		UserID: "user-1",
		Status: "PENDING",
	}
	uc := newTestCommunicationUseCase(
		&mockCallbackRepo{callback: existing},
		&mockCommPolicyChecker{allowed: true},
	)

	slotStart := time.Now().Add(time.Hour)
	slotEnd := slotStart.Add(30 * time.Minute)
	if err := uc.ApproveCallbackRequest(context.Background(), "cb-1", "user-1", slotStart, slotEnd); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRejectCallbackRequest_Success(t *testing.T) {
	existing := &entity.CallbackRequest{
		ID:     "cb-1",
		UserID: "user-1",
		Status: "PENDING",
	}
	uc := newTestCommunicationUseCase(
		&mockCallbackRepo{callback: existing},
		&mockCommPolicyChecker{allowed: true},
	)

	if err := uc.RejectCallbackRequest(context.Background(), "cb-1", "user-1", "not interested"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
