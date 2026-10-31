import React, { useState, useRef } from 'react';
import type { ImageItem, BackdropSetting } from '../types';
import { SplitSquareVertical, Layers } from 'lucide-react';

interface StudioWorkspaceProps {
  item: ImageItem;
  backdrop: BackdropSetting;
  checkerMode: 'dark' | 'light';
  onRetryItem: (id: string) => void;
  onToggleChecker: () => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  item,
  backdrop,
  checkerMode,
  onRetryItem,
  onToggleChecker,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSlider = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleSliderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      setSliderPos(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSliderPos(100);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setSliderPos(position => Math.max(0, position - 5));
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setSliderPos(position => Math.min(100, position + 5));
    }
  };

  const getBackdropStyle = (): React.CSSProperties => {
    switch (backdrop.type) {
      case 'solid': return { backgroundColor: backdrop.color };
      case 'gradient': return { background: backdrop.gradient };
      case 'image': return backdrop.imageUrl
        ? { backgroundImage: `url(${backdrop.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {};
      default: return {};
    }
  };

  const isCutoutReady = Boolean(item.cutoutUrl);
  const checkerClass = checkerMode === 'dark' ? 'checker' : 'checker-light';

  return (
    <div className="space-y-3">
      {/* Metadata row */}
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 max-w-full flex-1 truncate text-[13px] font-medium text-white/80 sm:max-w-[min(32vw,420px)]">
            {item.name}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/40 font-mono tabular-nums">
            {item.originalWidth} × {item.originalHeight}
          </span>
          {item.timeSeconds && (
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-brand/10 border border-brand/20 text-brand font-mono tabular-nums">
              {item.timeSeconds.toFixed(1)}s
            </span>
          )}
        </div>

        <button
          onClick={onToggleChecker}
          className="btn-ghost flex shrink-0 items-center justify-center gap-1.5 self-end px-3 py-2 rounded-lg text-[12px] sm:self-auto"
        >
          <Layers className="w-3 h-3" />
          {checkerMode === 'dark' ? 'Dark grid' : 'Light grid'}
        </button>
      </div>

      {/* Main Canvas */}
      <div
        ref={containerRef}
        onPointerDown={(e) => { setIsDragging(true); updateSlider(e.clientX); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (isDragging) updateSlider(e.clientX); }}
        onPointerUp={() => setIsDragging(false)}
        className={`relative w-full rounded-2xl overflow-hidden border border-white/[0.08] select-none ${
          backdrop.type === 'transparent' ? checkerClass : ''
        }`}
        style={{
          width: '100%',
          maxWidth: `${Math.min(1200, 600 * item.originalWidth / item.originalHeight)}px`,
          aspectRatio: `${item.originalWidth} / ${item.originalHeight}`,
          maxHeight: '600px',
          marginInline: 'auto',
          cursor: isDragging ? 'ew-resize' : 'default',
          ...getBackdropStyle()
        }}
      >
        {/* Cutout layer (bottom) */}
        {isCutoutReady ? (
          <img
            src={item.cutoutUrl}
            alt="Background removed result"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        ) : (
          /* Processing overlay */
          <div className="absolute inset-0 flex flex-col items-center justify-center glass z-10 gap-4">
            {item.status === 'error' ? (
              <div className="max-w-md space-y-3 px-5 text-center">
                <p role="alert" className="text-[14px] font-medium text-red-300">
                  {item.error || 'Background removal failed.'}
                </p>
                <button
                  type="button"
                  onClick={() => onRetryItem(item.id)}
                  className="btn-ghost rounded-lg px-4 py-2 text-[12px] text-red-200"
                >
                  Retry processing
                </button>
              </div>
            ) : (
              <>
                {item.status === 'processing' && (
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-brand/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin" />
                  </div>
                )}
                <div className="text-center" role="status" aria-live="polite">
                  <p className="text-[14px] font-medium text-white/80">
                    {item.status === 'processing' ? 'Removing background…' : 'Queued'}
                  </p>
                  {item.status === 'processing' && item.progress > 0 && (
                    <p className="text-[12px] text-white/40 mt-1">{item.progress}%</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Original layer (clipped by slider) */}
        {isCutoutReady && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <div className="absolute inset-0 bg-[#0a0a0a]">
              <img
                src={item.originalUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
            {/* Original label */}
            <div className="absolute top-4 left-4">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-white/50 px-2.5 py-1 rounded-md glass">
                Before
              </span>
            </div>
          </div>
        )}

        {/* After label */}
        {isCutoutReady && (
          <div className="absolute top-4 right-4 pointer-events-none">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-brand/80 px-2.5 py-1 rounded-md glass">
              After
            </span>
          </div>
        )}

        {/* Split handle */}
        {isCutoutReady && (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Before and after comparison"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPos)}
            className="absolute top-0 bottom-0 z-20 flex items-center justify-center split-handle"
            style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)', cursor: 'ew-resize', pointerEvents: 'all' }}
            onKeyDown={handleSliderKeyDown}
          >
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
              <SplitSquareVertical className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {isCutoutReady && (
        <p className="text-center text-[12px] text-white/25">
          Drag the handle to compare before &amp; after
        </p>
      )}
    </div>
  );
};
