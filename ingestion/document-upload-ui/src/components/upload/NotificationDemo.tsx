import React from 'react';
import NotificationSystem from './NotificationSystem';
import { useNotifications } from '../../hooks/useNotifications';
import './NotificationDemo.css';

/**
 * Demo component showing how to use the NotificationSystem
 * This is for demonstration purposes only
 */
const NotificationDemo: React.FC = () => {
  const { notifications, removeNotification, success, error, warning, info } = useNotifications();

  return (
    <div className="notification-demo">
      <div className="notification-demo__header">
        <h2>Notification System Demo</h2>
        <p>Click the buttons below to see different notification types</p>
      </div>

      <div className="notification-demo__controls">
        <button
          onClick={() => success('Success!', 'Your operation completed successfully.')}
          className="notification-demo__button notification-demo__button--success"
        >
          Show Success
        </button>

        <button
          onClick={() => error('Error Occurred', 'Something went wrong. Please try again.')}
          className="notification-demo__button notification-demo__button--error"
        >
          Show Error
        </button>

        <button
          onClick={() => warning('Warning', 'Please review your input before proceeding.')}
          className="notification-demo__button notification-demo__button--warning"
        >
          Show Warning
        </button>

        <button
          onClick={() => info('Information', 'Here is some helpful information for you.')}
          className="notification-demo__button notification-demo__button--info"
        >
          Show Info
        </button>
      </div>

      <NotificationSystem
        notifications={notifications}
        onDismiss={removeNotification}
        position="top-center"
        maxNotifications={5}
      />
    </div>
  );
};

export default NotificationDemo;
