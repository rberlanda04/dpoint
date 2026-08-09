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
        {/* Background Board Shadow / Base (Slate-850) */}
        <path
          d="M25 22C25 18.6863 27.6863 16 31 16H69C72.3137 16 75 18.6863 75 22V82C75 85.3137 72.3137 88 69 88H31C27.6863 88 25 85.3137 25 82V22Z"
          fill="#1E293B"
          stroke="#334155"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        
        {/* Paper Sheet on the Clipboard */}
        <path
          d="M31 29C31 27.8954 31.8954 27 33 27H67C68.1046 27 69 27.8954 69 29V81C69 82.1046 68.1046 83 67 83H33C31.8954 83 31 82.1046 31 81V29Z"
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth="1.2"
        />

        {/* Paper Lines / Form Template Design */}
        <line x1="37" y1="37" x2="63" y2="37" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="37" y1="45" x2="53" y2="45" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="53" x2="63" y2="53" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="61" x2="57" y2="61" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="69" x2="49" y2="69" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="77" x2="61" y2="77" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" />

        {/* Metallic Clip on Top */}
        <path
          d="M41 11C41 9.89543 41.8954 9 43 9H57C58.1046 9 59 9.89543 59 11V17H41V11Z"
          fill="#475569"
          stroke="#334155"
          strokeWidth="1"
        />
        <rect x="44" y="12" width="12" height="3" rx="1.2" fill="#94A3B8" />

        {/* Beautiful high-contrast location pin overlapping the paper */}
        <g className="filter drop-shadow-[0_4px_6px_rgba(16,185,129,0.4)]">
          {/* Subtle Outer Radar Geofence Ring */}
          <circle cx="61" cy="50" r="13" fill="#10B981" fillOpacity="0.12" />
          <circle cx="61" cy="50" r="18" stroke="#10B981" strokeWidth="0.8" strokeDasharray="3 3" fillOpacity="0" />
          
          {/* The Georeferencing Pin itself pointing to the sheet line */}
          <path
            d="M61 31C53.82 31 48 36.82 48 44C48 53.5 61 70 61 70C61 70 74 53.5 74 44C74 36.82 68.18 31 61 31ZM61 50C57.686 50 55 47.314 55 44C55 40.686 57.686 38 61 38C64.314 38 67 40.686 67 44C67 47.314 64.314 50 61 50Z"
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Precise GPS Center Core Dot */}
          <circle cx="61" cy="44" r="3.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
