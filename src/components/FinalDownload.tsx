import React from 'react';
import { Download, ArrowRight, CheckCircle } from 'lucide-react';
import { initiateApkDownload, DOWNLOAD_CONFIG } from '../config/download';

interface FinalDownloadProps {
  onOpenDownloadModal?: () => void;
}

export const FinalDownload: React.FC<FinalDownloadProps> = ({ onOpenDownloadModal }) => {
  const handleDownload = () => {
    initiateApkDownload(onOpenDownloadModal);
  };

  return (
    <section className="py-20 md:py-28 bg-brand-bg relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-brand-border shadow-elevated relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-brand-purpleLight/50 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-brand-mintLight/40 rounded-full blur-3xl pointer-events-none -z-0" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            
            {/* App Icon Mark */}
            <div className="w-16 h-16 rounded-2xl bg-white shadow-card border border-brand-border p-1 mx-auto overflow-hidden">
              <img
                src="/icon.png"
                alt="A Note App Icon"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            {/* Headline matching user prompt requirement */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand-navy tracking-tight leading-tight">
              Your Editing Business. Better Organized.
            </h2>

            {/* Description matching user prompt requirement */}
            <p className="text-base sm:text-lg text-brand-slate leading-relaxed">
              Keep your video editing workflow and earnings organized with A Note.
            </p>

            {/* Main Action Button matching user prompt requirement */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-base font-semibold shadow-button hover:shadow-xl transition-smooth active:scale-[0.98] group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-smooth" />
                <span>Download A Note</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-smooth" />
              </button>
            </div>

            {/* Technical details badge */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-brand-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-brand-mint" />
                <span>Universal Android APK</span>
              </span>
              <span>•</span>
              <span>{DOWNLOAD_CONFIG.minAndroidVersion}</span>
              <span>•</span>
              <span>Size: {DOWNLOAD_CONFIG.estimatedSize}</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
