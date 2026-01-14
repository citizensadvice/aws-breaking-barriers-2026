export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  autoDismiss?: boolean;
  duration?: number; // in milliseconds
  timestamp?: number;
}

export interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxNotifications?: number;
}

// Utility function to create notifications
export const createNotification = (
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    autoDismiss?: boolean;
    duration?: number;
  }
): Notification => {
  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    autoDismiss: options?.autoDismiss ?? (type === 'success'),
    duration: options?.duration ?? (type === 'success' ? 5000 : undefined),
    timestamp: Date.now()
  };
};
