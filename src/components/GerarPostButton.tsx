import React from 'react';
import { Loader2 } from 'lucide-react';
import { Property } from '../types';

interface GerarPostButtonProps {
  property: Property;
  onGenerate: (property: Property) => void;
  isLoading?: boolean;
  variant?: 'primary' | 'card' | 'icon' | 'outline';
  className?: string;
  label?: string;
}

export const GerarPostButton: React.FC<GerarPostButtonProps> = ({
  property,
  onGenerate,
  isLoading = false,
  variant = 'primary',
  className = '',
  label = 'Gerar Post'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoading) {
      onGenerate(property);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        id={`btn-gerar-post-${property.id || property.code || 'item'}`}
        onClick={handleClick}
        disabled={isLoading}
        title="Gerar Post para Redes Sociais"
        className={`px-3 py-1.5 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white text-xs font-bold whitespace-nowrap shadow-xs hover:shadow transition transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
        ) : (
          <span>{label}</span>
        )}
      </button>
    );
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        id={`btn-gerar-post-card-${property.id || property.code || 'item'}`}
        onClick={handleClick}
        disabled={isLoading}
        className={`px-3 py-1.5 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white text-xs font-bold whitespace-nowrap shadow-xs transition transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white mr-1.5" />
            <span>Gerando...</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    );
  }

  if (variant === 'outline') {
    return (
      <button
        type="button"
        id={`btn-gerar-post-outline-${property.id || property.code || 'item'}`}
        onClick={handleClick}
        disabled={isLoading}
        className={`px-3.5 py-2 rounded-xl border border-[#F10F4D] bg-white hover:bg-rose-50 text-[#F10F4D] font-bold text-xs whitespace-nowrap flex items-center justify-center transition transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F10F4D] mr-1.5" />
            <span>Gerando Post...</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      id={`btn-gerar-post-main-${property.id || property.code || 'item'}`}
      onClick={handleClick}
      disabled={isLoading}
      className={`px-3.5 py-2 rounded-xl bg-[#F10F4D] hover:bg-[#d40d43] text-white font-bold text-xs whitespace-nowrap flex items-center justify-center shadow-xs transition transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white mr-1.5" />
          <span>Gerando Post...</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

export default GerarPostButton;
