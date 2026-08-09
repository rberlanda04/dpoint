import React from 'react';

interface GridLineCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
  glow?: boolean;
  border?: 'default' | 'subtle' | 'accent' | 'none';
  onClick?: () => void;
  key?: React.Key;
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const borders = {
  default: 'border border-slate-200/80',
  subtle: 'border border-slate-100',
  accent: 'border border-indigo-200/50',
  none: '',
};

export default function GridLineCard({
  children,
  className = '',
  padding = 'md',
  hover = false,
  glow = false,
  border = 'default',
  onClick,
}: GridLineCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white/80 backdrop-blur-sm rounded-2xl
        ${borders[border]}
        ${paddings[padding]}
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
        transition-all duration-300 ease-out
        ${hover ? 'hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer' : ''}
        ${glow ? 'hover:shadow-lg hover:shadow-indigo-500/10' : ''}
        ${className}
      `}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 rounded-2xl opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
