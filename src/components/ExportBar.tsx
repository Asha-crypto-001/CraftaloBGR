import React, { useState } from 'react';
import type { ExportFormat, ResolutionMode, ImageItem, BackdropSetting } from '../types';
import { Download, Archive, Loader2, X } from 'lucide-react';
import { downloadBlob } from '../utils/imageUtils';
import { createImageExportBlob } from '../utils/exportUtils';
import { getExportBasename, getUniqueFilename } from '../utils/backdrops';
import JSZip from 'jszip';

interface ExportBarProps {
  activeItem: ImageItem | null;
  allItems: ImageItem[];
  backdrop: BackdropSetting;
}

export const ExportBar: React.FC<ExportBarProps> = ({ activeItem, allItems, backdrop }) => {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [resolution, setResolution] = useState<ResolutionMode>('original');
  const [exportingSingle, setExportingSingle] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const doneItems = allItems.filter(i => i.status === 'done' && i.cutoutUrl);
  const canExport = !!(activeItem?.status === 'done' && activeItem.cutoutUrl);

  const exportSingle = async () => {
    if (!activeItem?.cutoutUrl) return;
    setExportingSingle(true);
    setExportError(null);
    try {
      const blob = await createImageExportBlob(activeItem, backdrop, format, resolution);
      const ext = format === 'jpeg' ? 'jpg' : format;
      const resolutionSuffix = resolution === '8k' ? '_7680px' : '';
      const backdropSuffix = backdrop.type === 'transparent' ? '_cutout' : '_composite';
      downloadBlob(
        blob,
        `${getExportBasename(activeItem.name)}${resolutionSuffix}${backdropSuffix}.${ext}`
      );
    } catch (e) {
      console.error('Failed to export image:', e);
      setExportError(e instanceof Error ? e.message : 'Image export failed.');
    } finally {
      setExportingSingle(false);
    }
  };

  const exportZip = async () => {
    setExportingZip(true);
    setExportError(null);
    try {
      const zip = new JSZip();
      const ext = format === 'jpeg' ? 'jpg' : format;
      const usedNames = new Set<string>();

      for (const item of doneItems) {
        if (!item.cutoutUrl) continue;
        const blob = await createImageExportBlob(item, backdrop, format, resolution);
        const resolutionSuffix = resolution === '8k' ? '_7680px' : '';
        const backdropSuffix = backdrop.type === 'transparent' ? '_cutout' : '_composite';
        const base = `${getExportBasename(item.name)}${resolutionSuffix}${backdropSuffix}.${ext}`;
        zip.file(getUniqueFilename(base, usedNames), blob);
      }

      const z = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      downloadBlob(z, `CraftaloBGR_batch_${Date.now()}.zip`);
    } catch (e) {
      console.error('Failed to create ZIP export:', e);
      setExportError(e instanceof Error ? e.message : 'Batch ZIP export failed.');
    } finally {
      setExportingZip(false);
    }
  };

  return (
    <div className="glass-bright rounded-2xl p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: format + resolution */}
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          {/* Format */}
          <div role="group" aria-label="Export format" className="flex gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            {(['png', 'webp', 'jpeg'] as ExportFormat[]).map(f => (
              <button
                key={f}
                type="button"
                aria-pressed={format === f}
                aria-label={`Export as ${f.toUpperCase()}`}
                onClick={() => setFormat(f)}
                className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all ${
                  format === f
                    ? 'bg-white text-black shadow'
                    : 'text-white/35 hover:text-white/65'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Resolution toggle */}
          <button
            type="button"
            aria-pressed={resolution === '8k'}
            aria-label={resolution === '8k' ? 'Use original resolution' : 'Scale long edge to 7680 pixels'}
            onClick={() => setResolution(r => r === '8k' ? 'original' : '8k')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
              resolution === '8k'
                ? 'bg-brand/10 border-brand/40 text-brand'
                : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/[0.14]'
            }`}
          >
            <span>8K</span>
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${resolution === '8k' ? 'bg-brand' : 'bg-white/20'}`} />
          </button>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {doneItems.length > 1 && (
            <button
              type="button"
              onClick={exportZip}
              disabled={exportingZip}
              className="btn-ghost flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium"
            >
              {exportingZip
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Archive className="w-4 h-4" />}
              <span>Download all ({doneItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportSingle}
            disabled={!canExport || exportingSingle}
            className={`flex min-h-11 items-center justify-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              canExport && !exportingSingle
                ? 'btn-primary'
                : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
            }`}
          >
            {exportingSingle
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            <span>
              {resolution === '8k'
                ? `Download 7680px ${format.toUpperCase()}`
                : `Download ${format.toUpperCase()}`}
            </span>
          </button>
        </div>
      </div>
      {exportError && (
        <div
          role="alert"
          className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-200"
        >
          <p>{exportError}</p>
          <button
            type="button"
            onClick={() => setExportError(null)}
            aria-label="Dismiss export error"
            className="rounded p-0.5 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
