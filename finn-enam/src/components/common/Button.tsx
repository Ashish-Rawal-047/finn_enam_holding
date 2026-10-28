import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all rounded-lg select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-teal-500/50';

  const variantStyles = {
    primary: 'bg-teal-600 hover:bg-teal-500 text-white border border-teal-500/30 shadow-sm shadow-teal-950',
    secondary: 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60',
    outline: 'bg-transparent hover:bg-slate-900 text-slate-300 border border-slate-700/80',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200',
    danger: 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40',
  };

  const sizeStyles = {
    sm: 'text-xs h-9 px-3 gap-1.5 min-w-[36px]',
    md: 'text-sm h-11 px-4 gap-2 min-w-[44px]', // Mobile-first >= 44px tap target
    lg: 'text-base h-12 px-5 gap-2.5 min-w-[48px]',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
