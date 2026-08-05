import React from 'react';

interface LopesLogoProps {
  variant?: 'default' | 'white' | 'dark';
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
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-11',
    xl: 'h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  const heartSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16'
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
      {/* Official Lopes Heart Icon SVG */}
      <svg 
        className={`${heartSizes[size]} shrink-0`} 
        viewBox="0 0 70 60" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Crescent */}
        <path 
          d="M14 29C10 20 11 9 19 4.5C26 0.5 33 4 36.5 11C34 4 24 0 16 4C6.5 8.8 5.5 21.5 10.5 31.5C13.5 37 18 42.5 24 47.5C19 41.5 15 35 14 29Z" 
          fill="#F10F4D"
        />
        {/* Main Right Heart */}
        <path 
          d="M33 11C28 4.5 19 5.5 15 12.5C11 19.5 13 28 20 36C26 43 36 52.5 39 55C42 52.5 52 43 58 36C65 28 67 19.5 63 12.5C59 5.5 50 4.5 45 11C42.5 14.5 40.5 17 39 18C37.5 17 35.5 14.5 33 11Z" 
          fill="#F10F4D"
        />
      </svg>

      {/* Lopes Text & Optional Badge */}
      <div className="flex items-center space-x-2">
        <span className={`${textSizes[size]} font-black tracking-tight ${textColor} leading-none`}>
          Lopes
        </span>
        {showBadge && (
          <span className="text-[#F10F4D] font-extrabold text-[10px] sm:text-xs uppercase px-2 py-0.5 bg-rose-950/80 rounded border border-rose-800/60 tracking-wider">
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
