import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 64,
  height = 22,
  positive = true,
  className = '',
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor = positive ? '#059669' : '#E11D48';

  return (
    <svg
      width={width}
      height={height}
      className={`overflow-visible ${className}`}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};
