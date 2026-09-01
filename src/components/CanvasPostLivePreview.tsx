import React, { useEffect, useRef, useState } from 'react';
import { Property, CompanySettings } from '../types';
import { PostTemplateId } from './postTemplates';
import { renderPostToCanvas, CanvasPostData } from '../lib/canvasPostEngine';
import { Loader2 } from 'lucide-react';

interface CanvasPostLivePreviewProps {
  property: Property;
  companySettings: CompanySettings;
  templateId: PostTemplateId;
  photoUrl: string;
  width: number;
  height: number;
  scale?: number;
  aiData?: CanvasPostData;
  className?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export const CanvasPostLivePreview: React.FC<CanvasPostLivePreviewProps> = ({
  property,
  companySettings,
  templateId,
  photoUrl,
  width,
  height,
  scale = 1,
  aiData,
  className = '',
  onCanvasReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    async function draw() {
      if (!canvasRef.current) return;
      setIsRendering(true);
      try {
        await renderPostToCanvas(canvasRef.current, {
          property,
          companySettings,
          templateId,
          photoUrl,
          width,
          height,
          aiData
        });
        if (!isCancelled && onCanvasReady && canvasRef.current) {
          onCanvasReady(canvasRef.current);
        }
      } catch (err) {
        console.error('Error rendering canvas live preview:', err);
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    draw();

    return () => {
      isCancelled = true;
    };
  }, [property, companySettings, templateId, photoUrl, width, height, aiData, onCanvasReady]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {isRendering && (
        <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin text-[#F10F4D]" />
            <span>Processando arte em alta resolução...</span>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: `${width * scale}px`,
          height: `${height * scale}px`,
          imageRendering: 'auto'
        }}
        className="rounded-xl shadow-2xl block bg-slate-900"
      />
    </div>
  );
};

export default CanvasPostLivePreview;

