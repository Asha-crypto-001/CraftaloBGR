import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, ImagePlus } from 'lucide-react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onError?: (message: string) => void;
  compact?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelected,
  onError,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleUploadClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== fileInputRef.current) {
      fileInputRef.current?.click();
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.items || [])
      .filter(i => i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter(Boolean) as File[];
    if (files.length) onFilesSelected(files);
  }, [onFilesSelected]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const files = droppedFiles.filter(f => f.type.startsWith('image/'));
    if (files.length !== droppedFiles.length) {
      onError?.('Some dropped files are not supported image files and were skipped.');
    }
    if (files.length) onFilesSelected(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const files = selectedFiles.filter(f => f.type.startsWith('image/'));
    if (files.length !== selectedFiles.length) {
      onError?.('Some selected files are not supported images and were skipped.');
    }
    if (files.length) onFilesSelected(files);
    e.target.value = '';
  };

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Add more images"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={handleUploadClick}
        onKeyDown={handleUploadKeyDown}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-brand/60 bg-brand/[0.06]'
            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
        }`}
      >
        <ImagePlus className="w-4 h-4 text-white/40 shrink-0" />
        <span className="text-[13px] text-white/40">Add more images or drop here</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Add more images"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Choose image files"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={handleUploadClick}
      onKeyDown={handleUploadKeyDown}
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${
        isDragOver
          ? 'border-brand/70 bg-brand/[0.05] scale-[1.005]'
          : 'border-white/[0.1] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex flex-col items-center justify-center py-16 px-8 select-none text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Choose images"
          tabIndex={-1}
          className="hidden"
          onChange={handleChange}
        />
        {/* Upload Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
          isDragOver ? 'bg-brand/20 scale-110' : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
        }`}>
          <UploadCloud className={`w-8 h-8 transition-colors duration-200 ${isDragOver ? 'text-brand' : 'text-white/30 group-hover:text-white/50'}`} />
        </div>

        <h3 className="text-[22px] font-semibold text-white tracking-[-0.02em] mb-2">
          Drop images here
        </h3>
        <p className="text-[14px] text-white/40 mb-6 leading-relaxed max-w-xs">
          PNG, JPG, WEBP, BMP supported. Or paste directly with{' '}
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-white/[0.08] border border-white/[0.1] text-white/60">
            Ctrl+V
          </kbd>
        </p>

        {/* CTA row */}
        <div className="flex items-center gap-3">
          <span className="btn-primary px-5 py-2.5 rounded-xl text-[14px]">
            Browse Files
          </span>
          <span className="text-[13px] text-white/30">or drag &amp; drop</span>
        </div>

        {/* Supported formats badge row */}
        <div className="flex items-center gap-2 mt-8 flex-wrap justify-center">
          {['Up to 8K resolution', 'Batch processing', 'Instant download'].map(f => (
            <span
              key={f}
              className="px-3 py-1 rounded-full text-[11px] text-white/40 border border-white/[0.07] bg-white/[0.02]"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
