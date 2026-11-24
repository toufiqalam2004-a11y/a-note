import React, { useState, useEffect } from 'react';
import { Download, Menu, X } from 'lucide-react';
import { initiateApkDownload } from '../config/download';

interface NavbarProps {
  onOpenDownloadModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDownloadModal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDownloadClick = () => {
    initiateApkDownload(onOpenDownloadModal);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-brand-border/70 shadow-sm py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-brand-border/60 bg-white p-0.5 shrink-0 group-hover:shadow transition-smooth">
              <img
                src="/icon.png"
                alt="A Note App Logo"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-brand-navy leading-none">
                A Note
              </span>
              <span className="text-[11px] font-medium text-brand-muted mt-0.5">
                Video Editing & Earnings
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-semibold text-brand-slate hover:text-brand-purple transition-smooth"
            >
              Features
            </a>
            <a
              href="#preview"
              className="text-sm font-semibold text-brand-slate hover:text-brand-purple transition-smooth"
            >
              App Preview
            </a>
            <a
              href="#about"
              className="text-sm font-semibold text-brand-slate hover:text-brand-purple transition-smooth"
            >
              About
            </a>
            <a
              href="#waitlist"
              className="text-sm font-semibold text-brand-slate hover:text-brand-purple transition-smooth"
            >
              Waitlist
            </a>
          </nav>

          {/* Download CTA Button */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-sm font-semibold shadow-button hover:shadow-lg transition-smooth active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Download App</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-brand-slate hover:text-brand-navy rounded-lg hover:bg-brand-subtle transition-smooth"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-brand-border px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fadeIn">
          <div className="flex flex-col space-y-1">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-brand-navy rounded-lg hover:bg-brand-subtle transition-smooth"
            >
              Features
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-brand-navy rounded-lg hover:bg-brand-subtle transition-smooth"
            >
              App Preview
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-brand-navy rounded-lg hover:bg-brand-subtle transition-smooth"
            >
              About
            </a>
            <a
              href="#waitlist"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-base font-semibold text-brand-navy rounded-lg hover:bg-brand-subtle transition-smooth"
            >
              Waitlist
            </a>
          </div>
          <div className="pt-2 border-t border-brand-border/60">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleDownloadClick();
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-purple text-white text-sm font-semibold shadow-button"
            >
              <Download className="w-4 h-4" />
              <span>Download for Android</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
