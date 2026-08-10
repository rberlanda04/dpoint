/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  iconSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function Logo({ className = '', iconSize = 'md' }: LogoProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  };

  const currentSize = sizeClasses[iconSize];

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${currentSize} ${className}`} id="custom-brand-logo">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none"
      >
        <defs>
          <linearGradient id="dp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="dp-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>

        {/* Base Rounded Hexagon/Square */}
        <rect x="10" y="10" width="80" height="80" rx="24" fill="url(#dp-gradient)" />
        <rect x="12" y="12" width="76" height="76" rx="22" fill="#ffffff" fillOpacity="0.1" />

        {/* The 'D' Shape */}
        <path
          d="M28 32H44C54.4934 32 63 40.5066 63 51C63 61.4934 54.4934 70 44 70H28V32Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* The 'P' Shape (overlaid and slightly shifted) */}
        <path
          d="M50 32H64C71.1797 32 77 37.8203 77 45C77 52.1797 71.1797 58 64 58H50V76"
          fill="none"
          stroke="url(#dp-gradient-light)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-lg"
        />
        
        {/* Connection Dot (the "Point") */}
        <circle cx="50" cy="51" r="5" fill="#10B981" />
        
      </svg>
    </div>
  );
}
