import React, { useState, useEffect } from 'react';
import { Download, Menu, X } from 'lucide-react';

interface HeaderProps {
  hasImages: boolean;
  onClearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hasImages, onClearAll }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const NAV = ['Studio', 'Features', 'How it Works'];
  const goToStudio = () => {
    document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/[0.07]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-[64px] flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <a href={import.meta.env.BASE_URL} className="flex items-center gap-3 shrink-0 group">
          <img
            src={`${import.meta.env.BASE_URL}craftalo-logo.png`}
            alt="Craftalo"
            className="h-8 w-auto object-contain"
          />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gold-light" style={{color:'#e8c44a'}}>BGR</span>
          </div>
        </a>

        {/* ── Desktop Nav ── */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-white/45 hover:text-white/85 hover:bg-white/[0.05] transition-all duration-150"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2">
          {hasImages && (
            <button
              type="button"
              aria-label="Clear current workspace"
              onClick={onClearAll}
              className="btn-ghost hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium"
            >
              New Session
            </button>
          )}
          {deferredPrompt && (
            <button onClick={handleInstall} className="btn-ghost flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}
          <button type="button" onClick={goToStudio} className="btn-gold px-4 sm:px-5 py-2 rounded-xl text-[12px] sm:text-[13px]">
            Get Started
          </button>
          {/* Mobile menu toggle */}
          <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} className="md:hidden btn-ghost w-10 h-10 rounded-xl flex items-center justify-center" onClick={() => setMenuOpen(m => !m)}>
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/[0.07] px-6 py-4 flex flex-col gap-1">
          {NAV.map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-[14px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              {item}
            </a>
          ))}
        </div>
      )}
    </header>
  );
};
