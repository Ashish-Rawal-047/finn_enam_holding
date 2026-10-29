/**
 * FINN Two-Leaf Institutional Brand Emblem (Web SVG)
 * Refined, minimalist vector emblem representing compounding, flourishing financial intelligence.
 */

import React from 'react';

interface FinnLogoProps {
  size?: number;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export const FinnLogo: React.FC<FinnLogoProps> = ({
  size = 28,
  primaryColor = '#164E3B',
  secondaryColor = '#187653',
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base Stem */}
      <path
        d="M8.2 28 C9.2 26.2 10.1 24.8 11.2 23.5"
        stroke={primaryColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Secondary Left Leaf */}
      <path
        d="M10.2 23.2 C7 19.2 6.2 14.5 7.2 10.2 C11 12.5 12.8 17.5 10.2 23.2 Z"
        fill={secondaryColor}
      />

      {/* Primary Right Leaf (Taller, dominant) */}
      <path
        d="M11 25.5 C11 17 15.8 9.2 24.8 5.2 C24.5 14.5 18.8 22.2 11 25.5 Z"
        fill={primaryColor}
      />
    </svg>
  );
};

export default FinnLogo;
