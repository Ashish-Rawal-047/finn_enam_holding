import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

/** 30-session trend line in the palette's movement colours, with a soft baseline at the first close. */
export const Sparkline: React.FC<SparklineProps> = ({ data, width = 64, height = 22, positive = true, className = '' }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const y = (v: number) => height - ((v - min) / range) * (height - 6) - 3;
  const points = data.map((v, i) => `${((i / (data.length - 1)) * (width - 4) + 2).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const stroke = positive ? '#25835D' : '#C85B57';
  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`} aria-hidden="true">
      <line x1="2" x2={width - 2} y1={y(data[0])} y2={y(data[0])} stroke="currentColor" strokeOpacity="0.14" strokeDasharray="2 2" />
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};
