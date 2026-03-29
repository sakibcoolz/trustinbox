export type NotificationCategory = 'Personal' | 'ServiceProvider' | 'Advertisement';
export type CallbackStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SPVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

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
  serviceProviderName: string;
  read: boolean;
  createdAt: string;
}

export interface CallbackRequest {
  id: string;
  serviceProviderName: string;
  reason: string;
  scheduledAt: string;
  status: CallbackStatus;
  createdAt: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  verificationStatus: SPVerificationStatus;
  domain: string;
}
