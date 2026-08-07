import React from 'react';

interface LopesLogoProps {
  variant?: 'default' | 'white' | 'dark' | 'color';
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

export const LopesLogo: React.FC<LopesLogoProps> = ({
  variant = 'default',
  showBadge = false,
  badgeText = 'CAPTAÇÃO',
  className = '',
  size = 'md',
  onClick
}) => {
  const heartSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  const textColor = variant === 'white' 
    ? 'text-white' 
    : variant === 'dark' 
      ? 'text-slate-900' 
      : 'text-[#F10F4D]';

  return (
    <div 
      className={`inline-flex items-center space-x-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Official Lopes Heart Emblem SVG */}
      <svg 
        className={`${heartSizes[size]} shrink-0`} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="75" cy="28" r="18" fill={variant === 'white' ? '#FFFFFF' : '#F10F4D'} />
        <path 
          d="M 46 92 C 25 74 2 52 2 30 C 2 12 16 0 34 0 C 44 0 52 5 57 14 C 52 23 50 33 53 43 C 57 55 67 62 76 62 C 68 76 57 86 46 92 Z" 
          fill={variant === 'white' ? '#FFFFFF' : '#F10F4D'} 
        />
      </svg>

      {/* Lopes Captação Text & Badge */}
      <div className="flex items-center space-x-2">
        <span className={`${textSizes[size]} font-black tracking-tight ${textColor} leading-none`}>
          Lopes
        </span>
        {showBadge && (
          <span className="text-[#F10F4D] font-extrabold text-[10px] sm:text-xs uppercase px-2 py-0.5 bg-rose-50 rounded border border-rose-200/80 tracking-wider">
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
