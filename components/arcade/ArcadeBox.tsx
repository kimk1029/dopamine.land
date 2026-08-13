import React from 'react'

interface ArcadeBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'default'
  children: React.ReactNode
  label?: string
  isChunky?: boolean
}

export const ArcadeBox: React.FC<ArcadeBoxProps> = ({
  variant = 'default',
  children,
  label,
  isChunky = true,
  className = '',
  ...props
}) => {
  const borderClass = isChunky ? 'pixel-border-chunky-v2' : 'pixel-border-v2'
  return (
    <div className={`arcade-box-v2 arcade-box-${variant} ${borderClass} ${className}`} {...props}>
      {label && <div className="arcade-box-label">{label}</div>}
      <div className="arcade-box-content">{children}</div>
    </div>
  )
}
