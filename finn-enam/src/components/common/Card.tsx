import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  bordered?: boolean;
  highlighted?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  bordered = true,
  highlighted = false,
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl bg-dark-surface p-4 transition-all duration-150 ${
        bordered ? 'border border-dark-border' : ''
      } ${
        highlighted ? 'border-teal-500/40 bg-teal-950/10' : ''
      } ${
        isClickable ? 'cursor-pointer hover:border-slate-700 hover:bg-dark-surfaceElevated active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

