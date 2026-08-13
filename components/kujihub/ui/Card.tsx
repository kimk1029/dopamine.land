import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ 
  children, 
  title, 
  noPadding = false, 
  className = '', 
  ...props 
}: CardProps) {
  const paddingStyle = noPadding ? { padding: 0 } : {};

  return (
    <div className={`card ${className}`} style={{ ...paddingStyle, ...props.style }} {...props}>
      {title && (
        <h3 className="card-title">{title}</h3>
      )}
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
