import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ 
  label, 
  error, 
  className = '', 
  id,
  ...props 
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className="input-neu"
        {...props}
      />
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 700 }}>
          {error}
        </span>
      )}
    </div>
  );
}
