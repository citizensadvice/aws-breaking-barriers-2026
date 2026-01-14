import React, { useEffect, useCallback } from 'react';
import { NotificationSystemProps, Notification } from '../../types/notification';
import './NotificationSystem.css';

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onDismiss,
  position = 'top-center',
  maxNotifications = 5
}) => {
  // Auto-dismiss notifications
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach(notification => {
      if (notification.autoDismiss && notification.duration) {
        const timer = setTimeout(() => {
          onDismiss(notification.id);
        }, notification.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onDismiss]);

  const handleDismiss = useCallback((id: string) => {
    onDismiss(id);
  }, [onDismiss]);

  // Limit the number of visible notifications
  const visibleNotifications = notifications.slice(0, maxNotifications);

  if (visibleNotifications.length === 0) {
    return null;
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="notification__icon" width="20" height="20" viewBox="0 0 24 24" 
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        );
      case 'error':
        return (
          <svg className="notification__icon" width="20" height="20" viewBox="0 0 24 24" 
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="notification__icon" width="20" height="20" viewBox="0 0 24 24" 
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg className="notification__icon" width="20" height="20" viewBox="0 0 24 24" 
               fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className={`notification-system notification-system--${position}`} role="region" aria-label="Notifications">
      {visibleNotifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification--${notification.type}`}
          role="alert"
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="notification__content">
            <div className="notification__icon-wrapper">
              {getIcon(notification.type)}
            </div>
            <div className="notification__text">
              <div className="notification__title">{notification.title}</div>
              <div className="notification__message">{notification.message}</div>
            </div>
            <button
              className="notification__close"
              onClick={() => handleDismiss(notification.id)}
              aria-label={`Dismiss ${notification.title} notification`}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {notification.autoDismiss && notification.duration && (
            <div 
              className="notification__progress"
              style={{
                animation: `notification-progress ${notification.duration}ms linear`
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
