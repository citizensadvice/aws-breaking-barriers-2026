import { useState, useCallback } from 'react';
import { Notification, NotificationType, createNotification } from '../types/notification';

export interface UseNotificationsReturn {
  notifications: Notification[];
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: { autoDismiss?: boolean; duration?: number }
  ) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message: string, options?: { duration?: number }) => string;
  error: (title: string, message: string) => string;
  warning: (title: string, message: string, options?: { autoDismiss?: boolean; duration?: number }) => string;
  info: (title: string, message: string, options?: { autoDismiss?: boolean; duration?: number }) => string;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      options?: { autoDismiss?: boolean; duration?: number }
    ): string => {
      const notification = createNotification(type, title, message, options);
      setNotifications(prev => [...prev, notification]);
      return notification.id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message: string, options?: { duration?: number }): string => {
      return addNotification('success', title, message, {
        autoDismiss: true,
        duration: options?.duration ?? 5000
      });
    },
    [addNotification]
  );

  const error = useCallback(
    (title: string, message: string): string => {
      return addNotification('error', title, message, {
        autoDismiss: false
      });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message: string, options?: { autoDismiss?: boolean; duration?: number }): string => {
      return addNotification('warning', title, message, {
        autoDismiss: options?.autoDismiss ?? true,
        duration: options?.duration ?? 7000
      });
    },
    [addNotification]
  );

  const info = useCallback(
    (title: string, message: string, options?: { autoDismiss?: boolean; duration?: number }): string => {
      return addNotification('info', title, message, {
        autoDismiss: options?.autoDismiss ?? true,
        duration: options?.duration ?? 5000
      });
    },
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };
};
