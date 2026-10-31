import React, { useRef } from 'react';
import type { BackdropSetting } from '../types';
import { Check } from 'lucide-react';
import { GRADIENT_PRESETS } from '../utils/backdrops';

interface BackdropControlsProps {
  backdrop: BackdropSetting;
  onChange: (b: BackdropSetting) => void;
}

const SOLID_PRESETS = [
  { label: 'White',       color: '#ffffff' },
  { label: 'Black',       color: '#000000' },
  { label: 'Studio',      color: '#4b5563' },
  { label: 'Sky',         color: '#0ea5e9' },
  { label: 'Green screen',color: '#00b140' },
  { label: 'Crimson',     color: '#dc2626' },
  { label: 'Navy',        color: '#1e3a5f' },
  { label: 'Sand',        color: '#d4a96a' },
];

const MODES = [
  { id: 'transparent', label: 'None' },
  { id: 'solid',       label: 'Color' },
  { id: 'gradient',    label: 'Gradient' },
  { id: 'image',       label: 'Photo' },
] as const;

export const BackdropControls: React.FC<BackdropControlsProps> = ({ backdrop, onChange }) => {
  const imgRef = useRef<HTMLInputElement>(null);

  const handleCustomImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onChange({ type: 'image', imageUrl: URL.createObjectURL(f) });
  };

  return (
    <div className="glass-bright rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Section header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[13px] font-semibold text-white/80 tracking-[-0.01em]">Backdrop</span>
        <span className="text-[11px] text-white/30">Applied live to canvas &amp; export</span>
      </div>

      {/* Mode tabs */}
      <div className="grid w-full grid-cols-4 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] sm:flex sm:w-fit">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            aria-pressed={backdrop.type === m.id}
            aria-label={m.id === 'image' ? 'Choose photo backdrop' : `Use ${m.label} backdrop`}
            onClick={() => {
              if (m.id === 'image') { imgRef.current?.click(); return; }
            onChange({ type: m.id, color: backdrop.color, gradient: backdrop.gradient });
            }}
            className={`px-2 sm:px-4 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-medium transition-all duration-150 ${
              backdrop.type === m.id
                ? 'bg-white text-black shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleCustomImg} />

      {/* Solid swatches */}
      {backdrop.type === 'solid' && (
        <div className="flex flex-wrap gap-2">
          {SOLID_PRESETS.map(p => (
            <button
              key={p.color}
              type="button"
              aria-label={`Use ${p.label} background`}
              aria-pressed={backdrop.color === p.color}
              onClick={() => onChange({ type: 'solid', color: p.color })}
              className="relative w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 flex items-center justify-center"
              style={{
                backgroundColor: p.color,
                borderColor: backdrop.color === p.color ? '#e8ff58' : 'rgba(255,255,255,0.1)'
              }}
              title={p.label}
            >
              {backdrop.color === p.color && (
                <Check className={`w-3.5 h-3.5 ${p.color === '#ffffff' ? 'text-black' : 'text-white'}`} />
              )}
            </button>
          ))}
          {/* Custom color picker swatch */}
          <label
            className="w-8 h-8 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative"
            title="Custom color"
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
            />
            <input
              type="color"
              aria-label="Choose custom backdrop color"
              value={backdrop.color || '#ffffff'}
              onChange={e => onChange({ type: 'solid', color: e.target.value })}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>
        </div>
      )}

      {/* Gradient swatches */}
      {backdrop.type === 'gradient' && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GRADIENT_PRESETS.map(g => (
            <button
              key={g.id}
              type="button"
              aria-label={`Use ${g.label} gradient`}
              aria-pressed={backdrop.gradient === g.css}
              onClick={() => onChange({ type: 'gradient', gradient: g.css })}
              className={`relative h-10 rounded-xl border-2 transition-all hover:scale-105 flex items-end p-1.5 ${
                backdrop.gradient === g.css ? 'border-brand scale-[1.04]' : 'border-transparent'
              }`}
              style={{ background: g.css }}
              title={g.label}
            >
              <span className="text-[9px] font-semibold text-white drop-shadow uppercase tracking-wide">
                {g.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Photo backdrop info */}
      {backdrop.type === 'image' && backdrop.imageUrl && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <img src={backdrop.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-white/70">Custom photo backdrop active</p>
          </div>
          <button
            type="button"
            aria-label="Change custom backdrop photo"
            onClick={() => imgRef.current?.click()}
            className="text-[12px] text-brand hover:text-brand-dim transition-colors"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
};
