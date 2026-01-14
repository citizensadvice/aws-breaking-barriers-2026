import React from 'react';
import Tooltip from './Tooltip';
import './HelpIcon.css';

export interface HelpIconProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const HelpIcon: React.FC<HelpIconProps> = ({ content, position = 'top', className = '' }) => {
  return (
    <Tooltip content={content} position={position} className={className}>
      <button
        type="button"
        className="help-icon"
        aria-label="Help information"
        tabIndex={0}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    </Tooltip>
  );
};

export default HelpIcon;
