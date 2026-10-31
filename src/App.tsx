import { useState, useEffect, useRef } from 'react';
import type { ImageItem, BackdropSetting } from './types';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { StudioWorkspace } from './components/StudioWorkspace';
import { BackdropControls } from './components/BackdropControls';
import { BatchQueue } from './components/BatchQueue';
import { ExportBar } from './components/ExportBar';
import { getImageDimensions } from './utils/imageUtils';
import { processBackgroundRemoval } from './utils/remover';
import { ArrowRight, Cpu, Shield, Layers, LayoutGrid, Check, Sparkles, ChevronRight, X } from 'lucide-react';

const COPYRIGHT_YEAR = new Date().getFullYear();

const PILLS = ['WebGPU / WASM', '7680px Export', 'Batch Processing', 'Zero Image Uploads', 'ZIP Export'];

const STATS = [
  { value: '7680',  sup: 'px', label: 'Max output long edge' },
  { value: 'On-device', sup: '', label: 'AI processing' },
  { value: '0',     sup: ' bytes', label: 'Uploaded to any server' },
  { value: 'Batch', sup: '', label: 'Processing — device-limited' },
];

const FEATURES = [
  {
    icon: <Cpu className="w-5 h-5" />,
    title: 'On-Device WebGPU AI',
    body: 'The neural network runs entirely inside your browser using WebGPU or WASM. No API keys, no server queues — instant feedback.',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Private by Architecture',
    body: 'Your images never leave your device. No tracking, no cloud storage, no GDPR concerns. Privacy is enforced at the hardware level.',
  },
  {
    icon: <LayoutGrid className="w-5 h-5" />,
    title: 'Batch & One-Click ZIP',
    body: 'Drop an entire album, choose your backdrop, and export every cutout as individual files or a single compressed ZIP.',
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'High-resolution export',
    body: 'Scale the longest edge to 7680 pixels with browser canvas resampling. Upscaling does not restore image detail.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Drop or paste your image', desc: 'Drag images, browse files, or paste directly from your clipboard with Ctrl+V.' },
  { step: '02', title: 'AI removes the background', desc: 'The ONNX model runs locally using WebGPU or WASM. Model assets download on first use; offline use depends on browser caching.' },
  { step: '03', title: 'Choose your backdrop', desc: 'Preview on transparent, any solid colour, gradient, or your own custom photo background.' },
  { step: '04', title: 'Export your result', desc: 'Download PNG, WebP, or JPEG at the original size, or scale the long edge to 7680 pixels.' },
];

export function App() {
  const [items, setItems]       = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<BackdropSetting>({ type: 'transparent' });
  const [checkerMode, setCheckerMode] = useState<'dark' | 'light'>('dark');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const processingRef = useRef(false);
  const processingItemIdRef = useRef<string | null>(null);
  const canceledProcessingIdsRef = useRef(new Set<string>());
  const isMountedRef = useRef(false);
  const ownedObjectUrlsRef = useRef(new Set<string>());

  const createOwnedObjectUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    ownedObjectUrlsRef.current.add(url);
    return url;
  };

  const revokeOwnedObjectUrl = (url?: string) => {
    if (url && ownedObjectUrlsRef.current.delete(url)) URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const ownedObjectUrls = ownedObjectUrlsRef.current;
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      ownedObjectUrls.forEach(url => URL.revokeObjectURL(url));
      ownedObjectUrls.clear();
    };
  }, []);

  const activeItem = items.find(i => i.id === activeId) ?? items[0] ?? null;

  const handleFilesSelected = async (files: File[]) => {
    const newItems: ImageItem[] = [];
    const failures: string[] = [];
    setInputError(null);

    for (const file of files) {
      try {
        const { width, height } = await getImageDimensions(file);
        if (width <= 0 || height <= 0) throw new Error('The image has invalid dimensions.');
        if (!isMountedRef.current) return;

        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        newItems.push({
          id,
          name: file.name,
          originalFile: file,
          originalUrl: createOwnedObjectUrl(file),
          originalWidth: width,
          originalHeight: height,
          status: 'idle',
          progress: 0,
        });
      } catch (err) {
        console.error('Failed to load image metadata:', err);
        failures.push(
          `${file.name}: ${err instanceof Error ? err.message : 'Could not read image'}`
        );
      }
    }

    if (newItems.length > 0 && isMountedRef.current) {
      setItems(prev => [...prev, ...newItems]);
      if (!activeId) setActiveId(newItems[0].id);
    }
    if (failures.length > 0 && isMountedRef.current) setInputError(failures.join(' '));
  };

  useEffect(() => {
    const run = async () => {
      if (processingRef.current || !isMountedRef.current) return;
      const next = items.find(i => i.status === 'idle');
      if (!next) {
        if (isProcessingQueue) setIsProcessingQueue(false);
        return;
      }

      processingRef.current = true;
      processingItemIdRef.current = next.id;
      setIsProcessingQueue(true);
      setItems(prev => prev.map(i => i.id === next.id ? { ...i, status: 'processing', progress: 5 } : i));
      const t0 = performance.now();

      try {
        const blob = await processBackgroundRemoval(next.originalFile, (_, progress) => {
          if (!isMountedRef.current || canceledProcessingIdsRef.current.has(next.id)) return;
          setItems(prev => prev.map(i => i.id === next.id ? { ...i, progress } : i));
        });
        if (!isMountedRef.current || canceledProcessingIdsRef.current.has(next.id)) return;

        const cutoutUrl = createOwnedObjectUrl(blob);
        setItems(prev => prev.map(i =>
          i.id === next.id
            ? { ...i, status: 'done', progress: 100, cutoutBlob: blob, cutoutUrl, timeSeconds: (performance.now() - t0) / 1000 }
            : i
        ));
      } catch (err) {
        if (!isMountedRef.current || canceledProcessingIdsRef.current.has(next.id)) return;
        console.error('Queue item error:', err);
        const processingError = err instanceof Error ? err.message : 'Processing failed';
        const errorMessage = /failed to fetch|quota/i.test(processingError)
          ? `${processingError} Model assets could not be downloaded or saved. Check your connection and available browser storage, then retry.`
          : processingError;
        setItems(prev => prev.map(i =>
          i.id === next.id
            ? {
                ...i,
                status: 'error',
                progress: 0,
                error: errorMessage,
              }
            : i
        ));
      } finally {
        processingRef.current = false;
        processingItemIdRef.current = null;
        canceledProcessingIdsRef.current.delete(next.id);
        if (isMountedRef.current) setIsProcessingQueue(false);
      }
    };
    void run();
  }, [items, isProcessingQueue]);

  const removeItem = (id: string) => {
    const target = items.find(i => i.id === id);
    if (processingItemIdRef.current === id) canceledProcessingIdsRef.current.add(id);
    revokeOwnedObjectUrl(target?.originalUrl);
    revokeOwnedObjectUrl(target?.cutoutUrl);
    const rest = items.filter(i => i.id !== id);
    if (activeId === id) setActiveId(rest[0]?.id ?? null);
    setItems(rest);
  };

  const clearAll = () => {
    if (processingItemIdRef.current) canceledProcessingIdsRef.current.add(processingItemIdRef.current);
    items.forEach(i => {
      revokeOwnedObjectUrl(i.originalUrl);
      revokeOwnedObjectUrl(i.cutoutUrl);
    });
    if (backdrop.imageUrl) revokeOwnedObjectUrl(backdrop.imageUrl);
    setBackdrop({ type: 'transparent' });
    setInputError(null);
    setItems([]);
    setActiveId(null);
  };

  const handleBackdropChange = (nextBackdrop: BackdropSetting) => {
    if (nextBackdrop.imageUrl) ownedObjectUrlsRef.current.add(nextBackdrop.imageUrl);
    if (backdrop.imageUrl && backdrop.imageUrl !== nextBackdrop.imageUrl) {
      revokeOwnedObjectUrl(backdrop.imageUrl);
    }
    setBackdrop(nextBackdrop);
  };

  const retryItem = (id: string) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, status: 'idle', progress: 0, error: undefined } : i
    ));
    setActiveId(id);
  };

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#f0f0f0]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <Header hasImages={items.length > 0} onClearAll={clearAll} />
      {inputError && (
        <div
          role="alert"
          className="fixed top-[76px] left-1/2 z-40 flex w-[min(90%,720px)] -translate-x-1/2 items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-[#1a1111] px-4 py-3 text-[13px] text-red-200 shadow-xl"
        >
          <p>{inputError}</p>
          <button
            type="button"
            onClick={() => setInputError(null)}
            aria-label="Dismiss error"
            className="rounded p-1 text-red-200 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        /* ══════════  LANDING  ══════════ */
        <>
          {/* ── HERO ── */}
          <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-24 sm:pt-28 pb-16 sm:pb-20 text-center">

            {/* Radial gold glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.12) 0%, transparent 68%)' }} />
              <div className="absolute inset-0 grid-bg opacity-100" />
            </div>

            {/* Eyebrow */}
            <div className="relative flex max-w-full flex-wrap items-center justify-center gap-2 text-center mb-6 sm:mb-10">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#c9a227'}} />
              <span className="max-w-full text-[10px] sm:text-[11px] font-semibold tracking-[0.12em] sm:tracking-[0.14em] uppercase" style={{color:'rgba(201,162,39,0.75)'}}>
                Craftalo Studio · AI Background Removal
              </span>
            </div>

            {/* Logo — large hero treatment */}
            <div className="relative mb-7 sm:mb-10">
              <div className="relative inline-block">
                <img
                  src={`${import.meta.env.BASE_URL}craftalo-logo.png`}
                  alt="Craftalo"
                  className="relative z-10 h-20 sm:h-36 w-auto max-w-[min(70vw,280px)] object-contain"
                />
              </div>
            </div>

            {/* Product tag */}
            <div className="relative inline-flex max-w-full flex-wrap justify-center items-center gap-x-2 gap-y-1 px-4 py-1.5 rounded-full glass mb-6 sm:mb-8" style={{border:'1px solid rgba(201,162,39,0.25)'}}>
              <Sparkles className="w-3.5 h-3.5" style={{color:'#c9a227'}} />
              <span className="text-[13px] font-semibold tracking-[-0.01em]" style={{color:'#e8c44a'}}>CraftaloBGR</span>
              <span className="text-[12px] text-white/30">— 8K AI Background Studio</span>
            </div>

            {/* Headline */}
            <h1 className="relative display-xl w-full text-white mb-6 max-w-[900px] mx-auto">
              <span className="hidden sm:inline">Remove backgrounds.</span>
              <span className="block sm:hidden">Remove<br />backgrounds.</span>
              <br className="hidden sm:block" />
              <span className="block text-gradient-gold">Keep every detail.</span>
            </h1>

            {/* Sub */}
            <p className="relative text-[15px] sm:text-[18px] max-w-[520px] mx-auto mb-8 sm:mb-10 leading-relaxed" style={{color:'rgba(240,240,240,0.55)'}}>
              Professional-grade AI that runs entirely on your device.
              No image uploads. No subscriptions. Scale exports to 7680 pixels on the long edge.
            </p>

            {/* CTAs */}
            <div className="relative flex w-full max-w-[420px] flex-col sm:w-auto sm:flex-row items-stretch sm:items-center gap-3 mb-10 sm:mb-12">
              <label className="btn-gold flex items-center justify-center gap-2.5 px-5 sm:px-7 py-3.5 rounded-2xl text-[14px] sm:text-[15px] font-semibold cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" aria-label="Upload images"
                  onChange={e => {
                    const f = Array.from(e.target.files||[]).filter(x=>x.type.startsWith('image/'));
                    if(f.length) handleFilesSelected(f);
                    e.target.value='';
                  }} />
                Start Removing Backgrounds
                <ArrowRight className="w-4 h-4" />
              </label>
              <a href="#how-it-works" className="btn-ghost flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-2xl text-[14px] sm:text-[15px] font-medium">
                See how it works
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Feature pills */}
            <div className="relative flex max-w-[620px] flex-wrap items-center justify-center gap-2">
              {PILLS.map(p => (
                <span key={p} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium glass"
                  style={{color:'rgba(240,240,240,0.5)', border:'1px solid rgba(255,255,255,0.07)'}}>
                  <Check className="w-3 h-3" style={{color:'#c9a227'}} />
                  {p}
                </span>
              ))}
            </div>

            {/* Scroll cue */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-25">
              <div className="w-px h-10" style={{background:'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5))'}} />
            </div>
          </section>

          {/* ── DROP ZONE ── */}
          <section id="studio" className="w-full max-w-[1120px] mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
            <Dropzone
              onFilesSelected={handleFilesSelected}
              onError={setInputError}
            />
          </section>

          {/* ── STATS ── */}
          <section className="border-y" style={{borderColor:'rgba(255,255,255,0.06)'}}>
            <div className="max-w-[1360px] mx-auto grid grid-cols-2 sm:grid-cols-4" style={{gap:'1px', background:'rgba(255,255,255,0.06)'}}>
              {STATS.map(s => (
                <div key={s.label} className="flex flex-col items-center py-14 px-4 text-center" style={{background:'#0c0c0c'}}>
                  <div className="display-lg mb-2 text-gradient-gold">
                    {s.value}<span className="text-2xl">{s.sup}</span>
                  </div>
                  <span className="text-[13px]" style={{color:'rgba(240,240,240,0.35)'}}>{s.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section id="how-it-works" className="max-w-[1200px] mx-auto px-6 py-28">
            <div className="mb-16">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4 block" style={{color:'#c9a227'}}>
                How It Works
              </span>
              <h2 className="display-md text-white max-w-lg">
                From image to cutout<br />in four simple steps.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="relative group">
                  {/* Step number */}
                  <div className="text-[11px] font-mono font-semibold tracking-[0.1em] mb-4" style={{color:'rgba(201,162,39,0.6)'}}>
                    {step.step}
                  </div>
                  {/* Line connector */}
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-[11px] left-[calc(100%+8px)] w-[calc(100%-16px)] h-px"
                      style={{background:'linear-gradient(90deg,rgba(201,162,39,0.3),transparent)'}} />
                  )}
                  <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-white mb-2">{step.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{color:'rgba(240,240,240,0.38)'}}>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section id="features" className="border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
            <div className="max-w-[1360px] mx-auto">
              <div className="px-6 py-24">
                <span className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4 block" style={{color:'#c9a227'}}>
                  Built Different
                </span>
                <h2 className="display-md text-white max-w-xl mb-16">
                  Professional tools.<br />Zero infrastructure cost.
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{gap:'1px', background:'rgba(255,255,255,0.06)', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                {FEATURES.map(f => (
                  <div key={f.title} className="p-8 space-y-5 group hover:bg-white/[0.02] transition-colors" style={{background:'#0c0c0c'}}>
                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center" style={{color:'#c9a227'}}>
                      {f.icon}
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white">{f.title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{color:'rgba(240,240,240,0.38)'}}>{f.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CTA BAND ── */}
          <section className="relative overflow-hidden py-28 px-6" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="absolute inset-0 pointer-events-none"
              style={{background:'radial-gradient(ellipse at 50% 100%, rgba(201,162,39,0.1) 0%, transparent 65%)'}} />
            <div className="max-w-[680px] mx-auto text-center relative">
              <img src={`${import.meta.env.BASE_URL}craftalo-logo.png`} alt="Craftalo" className="h-16 mx-auto mb-8 object-contain opacity-90" />
              <h2 className="display-md text-white mb-5">
                Start crafting clean cutouts<br />right now — for free.
              </h2>
              <p className="text-[15px] mb-10 leading-relaxed" style={{color:'rgba(240,240,240,0.4)'}}>
                No account or credit card. Images stay on your device; practical batch size depends on available memory.
              </p>
              <label className="btn-gold inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-[16px] font-semibold cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" aria-label="Upload images"
                  onChange={e => {
                    const f = Array.from(e.target.files||[]).filter(x=>x.type.startsWith('image/'));
                    if(f.length) handleFilesSelected(f);
                    e.target.value='';
                  }} />
                Upload Your First Image
                <ArrowRight className="w-4 h-4" />
              </label>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="border-t py-10 px-6" style={{borderColor:'rgba(255,255,255,0.06)'}}>
            <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
              <img src={`${import.meta.env.BASE_URL}craftalo-logo.png`} alt="Craftalo" className="h-6 object-contain opacity-80" />
              <p className="text-[12px]" style={{color:'rgba(240,240,240,0.22)'}}>
                © {COPYRIGHT_YEAR} Craftalo · CraftaloBGR Studio · Open-source · Runs on WebGPU / WASM
              </p>
              <div className="flex gap-6">
                {['GitHub', 'Privacy', 'Docs', 'Support'].map(l => (
                  <a key={l} href="#" className="text-[12px] transition-colors" style={{color:'rgba(240,240,240,0.28)'}}
                    onMouseOver={e => (e.currentTarget.style.color='rgba(201,162,39,0.8)')}
                    onMouseOut={e => (e.currentTarget.style.color='rgba(240,240,240,0.28)')}>
                    {l}
                  </a>
                ))}
              </div>
            </div>
          </footer>
        </>
      ) : (
        /* ══════════  STUDIO MODE  ══════════ */
        <main id="studio" className="w-full max-w-none mx-auto px-3 sm:px-5 lg:px-8 2xl:px-12 pt-20 sm:pt-24 pb-8 sm:pb-12 space-y-4 sm:space-y-5">
          {activeItem && (
            <StudioWorkspace
              item={activeItem}
              backdrop={backdrop}
              checkerMode={checkerMode}
              onRetryItem={retryItem}
              onToggleChecker={() => setCheckerMode(m => m === 'dark' ? 'light' : 'dark')}
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
            <BackdropControls backdrop={backdrop} onChange={handleBackdropChange} />
            <ExportBar activeItem={activeItem} allItems={items} backdrop={backdrop} />
          </div>
          <BatchQueue items={items} activeId={activeId} onSelectItem={setActiveId} onRemoveItem={removeItem} />
          <Dropzone
            onFilesSelected={handleFilesSelected}
            onError={setInputError}
            compact
          />
        </main>
      )}
    </div>
  );
}

export default App;
