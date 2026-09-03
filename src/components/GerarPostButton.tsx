import React from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
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
        className={`p-2 rounded-xl bg-gradient-to-r from-[#F10F4D] to-[#99002B] hover:from-[#d40d43] hover:to-[#7a0022] text-white shadow-sm hover:shadow transition transform active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <ImageIcon className="w-4 h-4 text-white" />
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
        className={`px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#F10F4D] to-[#99002B] hover:from-[#d40d43] hover:to-[#7a0022] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition transform active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            <span>Gerando...</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-3.5 h-3.5 text-white" />
            <span>{label}</span>
          </>
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
        className={`px-4 py-2.5 rounded-xl border border-[#F10F4D]/40 hover:border-[#F10F4D] bg-white hover:bg-rose-50 text-[#F10F4D] font-bold text-xs flex items-center justify-center space-x-1.5 transition transform active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#F10F4D]" />
            <span>Gerando Post...</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4 text-[#F10F4D]" />
            <span>{label}</span>
          </>
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
      className={`px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F10F4D] via-[#cc0c40] to-[#99002B] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-900/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Gerando Post...</span>
        </>
      ) : (
        <>
          <ImageIcon className="w-4 h-4 text-white" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export default GerarPostButton;
