import React from 'react';

/**
 * Sarvam AI geometric mandala / spirograph emblem icon
 */
export default function SarvamLogo({size = 28, className = ''}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Sarvam AI Logo"
    >
      <circle cx="50" cy="50" r="48" fill="#111111" />
      <g stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.95">
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(0 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(22.5 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(45 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(67.5 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(90 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(112.5 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(135 50 50)" />
        <ellipse cx="50" cy="50" rx="30" ry="12" transform="rotate(157.5 50 50)" />
        <circle cx="50" cy="50" r="7" fill="#ffffff" />
      </g>
    </svg>
  );
}
