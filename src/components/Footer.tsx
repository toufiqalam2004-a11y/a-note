import React from 'react';

interface FooterProps {
  onOpenPrivacyModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacyModal }) => {
  return (
    <footer className="bg-white border-t border-brand-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-brand-border/60 bg-white p-0.5 shrink-0">
              <img
                src="/icon.png"
                alt="A Note Logo"
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-bold text-brand-navy leading-none">
                A Note
              </span>
              <span className="text-xs text-brand-muted mt-0.5">
                Video Editing & Earnings Tracker
              </span>
            </div>
          </div>

          {/* Navigation Links & Privacy */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-brand-slate">
            <a href="#features" className="hover:text-brand-purple transition-smooth">
              Features
            </a>
            <a href="#preview" className="hover:text-brand-purple transition-smooth">
              Screenshots
            </a>
            <a href="#about" className="hover:text-brand-purple transition-smooth">
              About
            </a>
            <button
              onClick={onOpenPrivacyModal}
              className="text-brand-slate hover:text-brand-purple transition-smooth underline-offset-4 hover:underline"
            >
              Privacy Policy
            </button>
          </div>

          {/* Simple Copyright text */}
          <div className="text-xs text-brand-muted">
            © {new Date().getFullYear()} A Note. All rights reserved.
          </div>

        </div>
      </div>
    </footer>
  );
};
