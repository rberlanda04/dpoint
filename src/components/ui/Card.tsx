import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  key?: React.Key;
}

const paddings = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({ children, className = '', padding = 'md', hover = false }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${paddings[padding]} ${hover ? 'hover:shadow-md hover:border-slate-300 transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  );
}
