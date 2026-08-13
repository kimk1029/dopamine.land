import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'neu' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  variant = 'neu', 
  size = 'md', 
  fullWidth = false, 
  className = '', 
  ...props 
}: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'neu' ? 'btn-neu' : '';
  const sizeClass = size === 'sm' ? 'text-sm py-2 px-4' : size === 'lg' ? 'text-lg py-4 px-8' : '';
  const widthClass = fullWidth ? 'w-full' : '';

  const combinedClassName = [
    baseClass,
    variantClass,
    sizeClass,
    widthClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={combinedClassName} {...props} style={{ ...props.style, width: fullWidth ? '100%' : undefined }}>
      {children}
    </button>
  );
}
