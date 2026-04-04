package resolver

import (
	"time"

	"github.com/trustinbox/graphql-bff/graph/model"
	commpb "github.com/trustinbox/proto/gen/communication/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	orgpb "github.com/trustinbox/proto/gen/organization/v1"
	userpb "github.com/trustinbox/proto/gen/user/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ─── Helper Functions ──────────────────────────────────────

func intOrDefault(p *int, def int32) int32 {
	if p != nil {
		return int32(*p)
	}
	return def
}

func strOrEmpty(p *string) string {
	if p != nil {
		return *p
	}
	return ""
}

func timeFromTimestamp(ts *timestamppb.Timestamp) time.Time {
	if ts == nil {
		return time.Time{}
	}
	return ts.AsTime()
}

func ptrString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func ptrTime(t time.Time) *time.Time {
	if t.IsZero() {
		return nil
	}
	return &t
}

// ─── User Mappers ──────────────────────────────────────────

func mapUserProfileFromProto(resp *userpb.GetUserProfileResponse) *model.UserProfile {
	return &model.UserProfile{
		ID:        resp.UserId,
		Username:  resp.Username,
		FullName:  resp.FullName,
		Email:     ptrString(resp.Email),
		AvatarURL: ptrString(resp.AvatarUrl),
		Timezone:  resp.Timezone,
		Language:  resp.Language,
	}
}

func mapUserFromProto(resp *userpb.GetUserProfileResponse) *model.User {
	return &model.User{
		ID:              resp.UserId,
		Username:        resp.Username,
		FullName:        resp.FullName,
		Email:           ptrString(resp.Email),
		VirtualPublicID: resp.VirtualPublicId,
		AvatarURL:       ptrString(resp.AvatarUrl),
		Timezone:        resp.Timezone,
		Language:        resp.Language,
	}
}

func mapPrivacyPreferenceFromProto(pp *userpb.PrivacyPreference) *model.PrivacyPreference {
	return &model.PrivacyPreference{
		AllowPersonalNotifications: pp.AllowPersonalNotifications,
		AllowSPNotifications:       pp.AllowSpNotifications,
		AllowAdvertisements:        pp.AllowAdvertisements,
		AllowCallbackRequests:      pp.AllowCallbackRequests,
		AllowChat:                  pp.AllowChat,
		AllowDocumentShares:        pp.AllowDocumentShares,
		RequireCallApproval:        pp.RequireCallApproval,
		NotificationSoundEnabled:   pp.NotificationSoundEnabled,
	}
}

func mapDNDRuleFromProto(r *userpb.DNDRule) *model.DNDRule {
	daysOfWeek := make([]int, len(r.DaysOfWeek))
	for i, d := range r.DaysOfWeek {
		daysOfWeek[i] = int(d)
	}
	return &model.DNDRule{
		ID:         r.Id,
		ScopeType:  r.ScopeType,
		ScopeRefID: ptrString(r.ScopeRefId),
		StartTime:  r.StartTime,
		EndTime:    r.EndTime,
		DaysOfWeek: daysOfWeek,
		IsActive:   r.IsActive,
	}
}

func mapAvailabilitySlotFromProto(s *userpb.AvailabilitySlot) *model.AvailabilitySlot {
	return &model.AvailabilitySlot{
		ID:        s.Id,
		DayOfWeek: int(s.DayOfWeek),
		StartTime: s.StartTime,
		EndTime:   s.EndTime,
		SlotType:  s.SlotType,
		IsActive:  s.IsActive,
	}
}

// ─── Notification Mappers ──────────────────────────────────

func mapNotificationFromProto(n *notifpb.Notification) *model.Notification {
	cat := model.NotificationCategory(n.Category)
	createdAt := timeFromTimestamp(n.CreatedAt)
	return &model.Notification{
		ID:        n.Id,
		Category:  cat,
		Title:     n.Title,
		Body:      n.Body,
		Priority:  n.Priority,
		Status:    n.Status,
		CreatedAt: createdAt,
	}
}

func mapNotificationConnectionFromProto(resp *notifpb.ListNotificationsResponse) *model.NotificationConnection {
	nodes := make([]*model.Notification, len(resp.Notifications))
	for i, n := range resp.Notifications {
		nodes[i] = mapNotificationFromProto(n)
	}
	return &model.NotificationConnection{
		Nodes:      nodes,
		TotalCount: int(resp.Total),
	}
}

// ─── Callback Mappers ──────────────────────────────────────

func mapCallbackRequestFromProto(cb *commpb.CallbackRequest) *model.CallbackRequest {
	st := model.CallbackRequestStatus(cb.Status)
	requestedAt := timeFromTimestamp(cb.RequestedAt)
	return &model.CallbackRequest{
		ID:                cb.Id,
		Reason:            cb.Reason,
		Details:           ptrString(cb.Details),
		Status:            st,
		RequestedAt:       requestedAt,
		RespondedAt:       ptrTime(timeFromTimestamp(cb.RespondedAt)),
		ApprovedSlotStart: ptrTime(timeFromTimestamp(cb.ApprovedSlotStart)),
		ApprovedSlotEnd:   ptrTime(timeFromTimestamp(cb.ApprovedSlotEnd)),
		ServiceProvider: &model.ServiceProvider{
			ID: cb.ServiceProviderId,
		},
	}
}

func mapCallbackRequestConnectionFromProto(resp *commpb.ListCallbackRequestsResponse) *model.CallbackRequestConnection {
	nodes := make([]*model.CallbackRequest, len(resp.Requests))
	for i, cb := range resp.Requests {
		nodes[i] = mapCallbackRequestFromProto(cb)
	}
	return &model.CallbackRequestConnection{
		Nodes:      nodes,
		TotalCount: int(resp.Total),
	}
}

// ─── Conversation Mappers ──────────────────────────────────

func mapConversationFromProto(c *commpb.Conversation) *model.Conversation {
	st := model.ConversationStatus(c.Status)
	createdAt := timeFromTimestamp(c.CreatedAt)
	updatedAt := timeFromTimestamp(c.UpdatedAt)
	return &model.Conversation{
		ID:     c.Id,
		Status: st,
		ServiceProvider: &model.ServiceProvider{
			ID: c.ServiceProviderId,
		},
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}
}

func mapConversationConnectionFromProto(resp *commpb.ListConversationsResponse) *model.ConversationConnection {
	nodes := make([]*model.Conversation, len(resp.Conversations))
	for i, c := range resp.Conversations {
		nodes[i] = mapConversationFromProto(c)
	}
	return &model.ConversationConnection{
		Nodes:      nodes,
		TotalCount: int(resp.Total),
	}
}

// ─── Document Mappers ──────────────────────────────────────

func mapDocumentShareFromProto(d *commpb.DocumentShare) *model.DocumentShare {
	createdAt := timeFromTimestamp(d.CreatedAt)
	return &model.DocumentShare{
		ID:           d.Id,
		DocumentID:   d.DocumentId,
		FileName:     d.FileName,
		FileType:     d.FileType,
		ShareContext: d.ShareContext,
		ServiceProvider: &model.ServiceProvider{
			ID: d.ServiceProviderId,
		},
		CreatedAt: createdAt,
		OpenedAt:  ptrTime(timeFromTimestamp(d.OpenedAt)),
	}
}

func mapDocumentConnectionFromProto(resp *commpb.ListDocumentSharesResponse) *model.DocumentConnection {
	nodes := make([]*model.DocumentShare, len(resp.Shares))
	for i, d := range resp.Shares {
		nodes[i] = mapDocumentShareFromProto(d)
	}
	return &model.DocumentConnection{
		Nodes:      nodes,
		TotalCount: int(resp.Total),
	}
}

// ─── Message Mappers ───────────────────────────────────────

func mapMessageFromProto(m *commpb.Message) *model.Message {
	createdAt := timeFromTimestamp(m.CreatedAt)
	return &model.Message{
		ID:          m.Id,
		SenderType:  m.SenderType,
		SenderRefID: ptrString(m.SenderRefId),
		MessageType: m.MessageType,
		Content:     m.Content,
		CreatedAt:   createdAt,
	}
}

// ─── Service Provider Mappers ──────────────────────────────

func mapServiceProviderFromProto(sp *orgpb.ServiceProvider) *model.ServiceProvider {
	return &model.ServiceProvider{
		ID:                 sp.Id,
		Name:               sp.Name,
		LegalName:          ptrString(sp.LegalName),
		Industry:           sp.Industry,
		Description:        ptrString(sp.Description),
		VerificationStatus: sp.VerificationStatus,
		Status:             sp.Status,
		Website:            ptrString(sp.Website),
	}
}

func mapServiceProviderConnectionFromProto(resp *orgpb.ListServiceProvidersResponse) *model.ServiceProviderConnection {
	nodes := make([]*model.ServiceProvider, len(resp.ServiceProviders))
	for i, sp := range resp.ServiceProviders {
		nodes[i] = mapServiceProviderFromProto(sp)
	}
	return &model.ServiceProviderConnection{
		Nodes:      nodes,
		TotalCount: int(resp.Total),
	}
}
