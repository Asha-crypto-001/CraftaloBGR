import React from 'react';
import type { ImageItem } from '../types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface BatchQueueProps {
  items: ImageItem[];
  activeId: string | null;
  onSelectItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({ items, activeId, onSelectItem, onRemoveItem }) => {
  if (items.length <= 1) return null;

  return (
    <div className="glass-bright rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-white/80">Queue</span>
        <span className="text-[11px] text-white/30">{items.length} images</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map(item => {
          const isActive = item.id === activeId;
          const isDone = item.status === 'done';
          const isErr = item.status === 'error';
          const isProc = item.status === 'processing';

          const itemStatus = isDone
            ? 'processed'
            : isErr
              ? 'failed'
              : isProc
                ? `processing ${item.progress}%`
                : 'queued';

          return (
            <div key={item.id} className="group relative shrink-0 w-[72px]">
              <button
                type="button"
                aria-label={`Select ${item.name}, ${itemStatus}`}
                aria-pressed={isActive}
                onClick={() => onSelectItem(item.id)}
                className={`relative block w-full overflow-hidden rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${
                isActive
                  ? 'border-brand shadow-[0_0_16px_rgba(232,255,88,0.2)]'
                  : 'border-transparent hover:border-white/20'
              }`}
              >
                <div className="aspect-square bg-[#111] checker">
                <img
                  src={item.cutoutUrl || item.originalUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                </div>

                {/* Status badge */}
                <div className="absolute top-1 left-1" aria-hidden="true">
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-brand drop-shadow" />}
                  {isErr && <AlertCircle className="w-3.5 h-3.5 text-red-400 drop-shadow" />}
                  {isProc && (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  )}
                </div>

                {/* Progress */}
                {isProc && (
                  <div
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-white/10"
                    role="progressbar"
                    aria-label={`Processing ${item.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                  >
                    <div
                      className="h-full bg-brand transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                aria-label={`Remove ${item.name} from queue`}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-red-500/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
