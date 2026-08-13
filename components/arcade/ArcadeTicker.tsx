import React from 'react'

interface ArcadeTickerProps {
  text: string
  /** Scroll duration in seconds. */
  speed?: number
  variant?: 'primary' | 'secondary' | 'accent' | 'default'
}

export const ArcadeTicker: React.FC<ArcadeTickerProps> = ({
  text,
  speed = 20,
  variant = 'accent',
}) => {
  return (
    <div className={`arcade-ticker-container arcade-ticker-${variant}`}>
      <div className="arcade-ticker-text" style={{ animationDuration: `${speed}s` }}>
        {text} --- {text} --- {text} ---
      </div>
    </div>
  )
}
