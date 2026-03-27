export type NotificationCategory = 'Personal' | 'Organizational' | 'Advertisement';
export type CallbackStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type OrgVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  organizationName: string;
  read: boolean;
  createdAt: string;
}

export interface CallbackRequest {
  id: string;
  organizationName: string;
  reason: string;
  scheduledAt: string;
  status: CallbackStatus;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  verificationStatus: OrgVerificationStatus;
  domain: string;
}
