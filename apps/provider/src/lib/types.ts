// ─── Notification Types ─────────────────────────────────

export type NotificationStatus = 'DELIVERED' | 'PENDING' | 'FAILED' | 'BLOCKED' | 'RATE_LIMITED';
export type NotificationCategory = 'PERSONAL' | 'SERVICE_PROVIDER' | 'ADVERTISEMENT';
export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';

export interface Notification {
  id: string;
  recipientId: string;
  subject: string;
  body?: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export function getNotificationStatusVariant(status: NotificationStatus) {
  switch (status) {
    case 'DELIVERED': return { label: 'Delivered', className: 'bg-status-success/10 text-status-success' };
    case 'PENDING': return { label: 'Pending', className: 'bg-status-warning/10 text-status-warning' };
    case 'FAILED': return { label: 'Failed', className: 'bg-status-error/10 text-status-error' };
    case 'BLOCKED': return { label: 'Blocked', className: 'bg-status-error/10 text-status-error' };
    case 'RATE_LIMITED': return { label: 'Rate Limited', className: 'bg-status-warning/10 text-status-warning' };
    default: return { label: status, className: 'bg-text-muted/10 text-text-muted' };
  }
}

export function getCategoryVariant(category: NotificationCategory) {
  switch (category) {
    case 'PERSONAL': return { label: 'Personal', className: 'bg-accent-blue/10 text-accent-blue' };
    case 'SERVICE_PROVIDER': return { label: 'Service', className: 'bg-accent-purple/10 text-accent-purple' };
    case 'ADVERTISEMENT': return { label: 'Ad', className: 'bg-status-warning/10 text-status-warning' };
    default: return { label: category, className: 'bg-text-muted/10 text-text-muted' };
  }
}

// ─── Callback Types ─────────────────────────────────────

export type CallbackStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESCHEDULED' | 'EXPIRED' | 'COMPLETED';
export type CallbackPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CallbackRequest {
  id: string;
  customerId: string;
  reason: string;
  details?: string;
  priority: CallbackPriority;
  status: CallbackStatus;
  requestedDate?: string;
  scheduledDate?: string;
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export function getPriorityConfig(priority: CallbackPriority) {
  switch (priority) {
    case 'URGENT': return { label: 'Urgent', className: 'bg-status-error/10 text-status-error' };
    case 'HIGH': return { label: 'High', className: 'bg-status-warning/10 text-status-warning' };
    case 'NORMAL': return { label: 'Normal', className: 'bg-accent-blue/10 text-accent-blue' };
    case 'LOW': return { label: 'Low', className: 'bg-text-muted/10 text-text-muted' };
    default: return { label: priority, className: 'bg-text-muted/10 text-text-muted' };
  }
}

// ─── Campaign Types ─────────────────────────────────────

export type CampaignStatus = 'DRAFT_CAMPAIGN' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  status: CampaignStatus;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt?: string;
  launchedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export function getCampaignStatusConfig(status: CampaignStatus) {
  switch (status) {
    case 'DRAFT_CAMPAIGN': return { label: 'Draft', className: 'bg-text-muted/10 text-text-muted' };
    case 'SCHEDULED': return { label: 'Scheduled', className: 'bg-accent-blue/10 text-accent-blue' };
    case 'RUNNING': return { label: 'Running', className: 'bg-status-success/10 text-status-success' };
    case 'COMPLETED': return { label: 'Completed', className: 'bg-accent-purple/10 text-accent-purple' };
    case 'CANCELLED': return { label: 'Cancelled', className: 'bg-status-error/10 text-status-error' };
    default: return { label: status, className: 'bg-text-muted/10 text-text-muted' };
  }
}

// ─── Conversation Types ─────────────────────────────────

export type ConversationStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface Conversation {
  id: string;
  customerId: string;
  customerName?: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  assignedAgent?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'BOT' | 'AGENT' | 'SYSTEM';
  senderName?: string;
  content: string;
  attachments?: { url: string; type: string; name: string }[];
  readAt?: string;
  createdAt: string;
}

export function getConversationStatusVariant(status: ConversationStatus) {
  switch (status) {
    case 'OPEN': return { label: 'Open', className: 'bg-status-success/10 text-status-success' };
    case 'CLOSED': return { label: 'Closed', className: 'bg-text-muted/10 text-text-muted' };
    case 'ARCHIVED': return { label: 'Archived', className: 'bg-text-secondary/10 text-text-secondary' };
    default: return { label: status, className: 'bg-text-muted/10 text-text-muted' };
  }
}

export function getSenderStyle(type: string) {
  switch (type) {
    case 'CUSTOMER': return { bg: 'bg-accent-blue/10', text: 'text-accent-blue', label: 'Customer' };
    case 'AGENT': return { bg: 'bg-status-success/10', text: 'text-status-success', label: 'Agent' };
    case 'SYSTEM': return { bg: 'bg-text-muted/10', text: 'text-text-muted', label: 'System' };
    default: return { bg: 'bg-text-muted/10', text: 'text-text-muted', label: type };
  }
}

// ─── Webhook Types ──────────────────────────────────────

export interface WebhookSubscription {
  id: string;
  url: string;
  description?: string;
  events: string[];
  status: string;
  signingSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  eventId: string;
  statusCode: number;
  attempts: number;
  duration: number;
  status: string;
  responseBody?: string;
  createdAt: string;
}

export function getSubscriptionStatusConfig(status: string) {
  switch (status) {
    case 'ACTIVE': return { label: 'Active', className: 'bg-status-success/10 text-status-success', dotColor: 'bg-status-success' };
    case 'PAUSED': return { label: 'Paused', className: 'bg-status-warning/10 text-status-warning', dotColor: 'bg-status-warning' };
    case 'DISABLED': return { label: 'Disabled', className: 'bg-text-muted/10 text-text-muted', dotColor: 'bg-text-muted' };
    default: return { label: status, className: 'bg-text-muted/10 text-text-muted', dotColor: 'bg-text-muted' };
  }
}

export function getDeliveryStatusConfig(status: string) {
  switch (status) {
    case 'SUCCESS': return { label: 'Success', className: 'bg-status-success/10 text-status-success' };
    case 'FAILED': return { label: 'Failed', className: 'bg-status-error/10 text-status-error' };
    case 'PENDING': return { label: 'Pending', className: 'bg-status-warning/10 text-status-warning' };
    default: return { label: status, className: 'bg-text-muted/10 text-text-muted' };
  }
}

// ─── Team Types ─────────────────────────────────────────

export type TeamRole = 'SP_ADMIN' | 'AGENT' | 'ANALYST';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: string;
  joinedAt: string;
  avatarUrl?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: TeamRole;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  SP_ADMIN: 'Admin',
  AGENT: 'Agent',
  ANALYST: 'Analyst',
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  SP_ADMIN: 'text-status-error',
  AGENT: 'text-accent-blue',
  ANALYST: 'text-accent-purple',
};

