import React from 'react';
import { X, ShieldCheck, Lock, Database, WifiOff } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-brand-navy/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-brand-border relative text-left max-h-[90vh] overflow-y-auto"
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
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-purpleLight flex items-center justify-center text-brand-purple shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-navy">Privacy Policy</h3>
            <p className="text-xs text-brand-muted">Last updated: November 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-brand-slate leading-relaxed">
          <p>
            At <strong>A Note</strong>, we strongly believe that your creative business and financial numbers belong solely to you. The app was built with a privacy-first, zero-cloud dependency model.
          </p>

          <div className="grid gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-brand-bg border border-brand-border flex items-start gap-3">
              <Database className="w-5 h-5 text-brand-purple shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-navy text-xs uppercase tracking-wider mb-0.5">100% Local SQLite Storage</h4>
                <p className="text-xs text-brand-slate">All client records, custom video pricing, completed project counts, and revenue calculations are stored locally on your device in an encrypted SQLite database.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-bg border border-brand-border flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-brand-mintDark shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-navy text-xs uppercase tracking-wider mb-0.5">No Cloud Sync or External Servers</h4>
                <p className="text-xs text-brand-slate">We operate no external telemetry servers or third-party database brokers. You have complete autonomy over your data backups and JSON exports.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-bg border border-brand-border flex items-start gap-3">
              <Lock className="w-5 h-5 text-brand-purple shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-brand-navy text-xs uppercase tracking-wider mb-0.5">No Ad Trackers or Data Brokering</h4>
                <p className="text-xs text-brand-slate">A Note contains zero advertising networks, third-party analytics trackers, or user profiling SDKs.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-brand-muted pt-2">
            For inquiries regarding A Note data storage or local exports, inspect the local application storage on your Android device.
          </p>
        </div>

        {/* Footer button */}
        <div className="mt-6 pt-4 border-t border-brand-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-brand-navy text-white text-sm font-semibold rounded-xl hover:bg-brand-slate transition-smooth"
          >
            Close Policy
          </button>
        </div>
      </div>
    </div>
  );
};
