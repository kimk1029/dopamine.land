import React from 'react'

interface ArcadeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const ArcadeButton: React.FC<ArcadeButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`arcade-btn-v2 arcade-btn-${variant} arcade-btn-${size} ${className}`}
      {...props}
    >
      <span className="btn-content">{children}</span>
    </button>
  )
}
