import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'default';
}

export function Badge({ 
  children, 
  variant = 'default', 
  className = '', 
  ...props 
}: BadgeProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return 'var(--primary-dark)';
      case 'secondary': return 'var(--secondary)';
      case 'accent': return 'var(--accent)';
      case 'success': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return '#d1d9e6';
    }
  };

  const getTextColor = () => {
    return variant === 'default' ? 'var(--text-muted)' : 'white';
  };

  return (
    <span 
      className={`inline-block ${className}`}
      style={{
        fontSize: '0.65rem',
        fontWeight: 900,
        padding: '2px 8px',
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...props.style
      }}
      {...props}
    >
      {children}
    </span>
  );
}
