import React from 'react';
import { X, AlertCircle, Copy, Check } from 'lucide-react';
import { DOWNLOAD_CONFIG } from '../config/download';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyPath = () => {
    navigator.clipboard.writeText('src/config/download.ts');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-brand-navy/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-brand-border relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-brand-muted hover:text-brand-navy hover:bg-brand-subtle rounded-full transition-smooth"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-navy leading-snug">
              APK Download URL Pending Setup
            </h3>
            <p className="text-sm text-brand-slate mt-1">
              Direct download link will be available once configured by the developer.
            </p>
          </div>
        </div>

        {/* Informative Content */}
        <div className="bg-brand-bg rounded-xl p-4 border border-brand-border mb-5 text-sm space-y-2.5">
          <p className="text-brand-slate">
            In accordance with the landing page design guidelines, no fake download links or dummy files are used.
          </p>
          <div className="pt-2 border-t border-brand-border/60">
            <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1">
              Configuration Target
            </span>
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-brand-border text-xs font-mono text-brand-navy">
              <span>src/config/download.ts</span>
              <button 
                onClick={handleCopyPath} 
                className="flex items-center gap-1 text-brand-purple hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-brand-mint" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy path'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* App Release Details */}
        <div className="rounded-xl border border-brand-border p-4 mb-6 space-y-2 text-xs text-brand-slate">
          <div className="flex justify-between py-1 border-b border-brand-border/40">
            <span className="text-brand-muted">Target Package:</span>
            <span className="font-semibold text-brand-navy font-mono">{DOWNLOAD_CONFIG.packageId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-brand-border/40">
            <span className="text-brand-muted">App Version:</span>
            <span className="font-semibold text-brand-navy">{DOWNLOAD_CONFIG.version} (Build #{DOWNLOAD_CONFIG.buildNumber})</span>
          </div>
          <div className="flex justify-between py-1 border-b border-brand-border/40">
            <span className="text-brand-muted">Requirement:</span>
            <span className="font-semibold text-brand-navy">{DOWNLOAD_CONFIG.minAndroidVersion}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-brand-muted">Storage & Privacy:</span>
            <span className="font-semibold text-brand-navy">{DOWNLOAD_CONFIG.database}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-2.5 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-brand-slate transition-smooth text-center"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
