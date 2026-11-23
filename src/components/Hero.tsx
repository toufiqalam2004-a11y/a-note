import React from 'react';
import { ArrowRight, Film, CheckCircle2 } from 'lucide-react';
import { initiateApkDownload } from '../config/download';

interface HeroProps {
  onOpenDownloadModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenDownloadModal }) => {
  const handleDownload = () => {
    initiateApkDownload(onOpenDownloadModal);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Subtle Elements */}
      <div className="absolute inset-0 pointer-events-none -z-10 flex justify-center">
        <div className="w-[800px] h-[400px] bg-brand-purpleLight/40 rounded-full blur-3xl opacity-70 -top-20" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Content Column */}
          <div className="lg:col-span-7 text-left space-y-6">
            
            {/* Minimal Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purpleLight border border-brand-purple/20 text-brand-purple text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-brand-mint animate-pulse" />
              <span>Built for Video Editors & Creators</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand-navy tracking-tight leading-[1.12]">
              Manage Your Video Editing Business,{' '}
              <span className="text-brand-purple">Effortlessly.</span>
            </h1>

            {/* Short Description */}
            <p className="text-lg sm:text-xl text-brand-slate max-w-2xl font-normal leading-relaxed">
              A Note helps video editors manage their projects, track earnings, organize video types, and manage pricing in one place. No complicated spreadsheets or bloated cloud suites.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-brand-purple hover:bg-brand-purpleDark text-white text-base font-semibold shadow-button hover:shadow-xl transition-smooth active:scale-[0.98] group"
              >
                {/* Clean Android Icon SVG */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4126 13.8533 8.09 12 8.09s-3.5902.3226-5.1367.8604L4.841 5.4474a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                </svg>
                <span>Download for Android</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-smooth" />
              </button>

              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white hover:bg-brand-subtle text-brand-navy border border-brand-border text-base font-semibold shadow-sm transition-smooth"
              >
                <span>Explore Features</span>
              </a>
            </div>

            {/* Reassurance Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-brand-slate border-t border-brand-border/60">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                <span>100% Offline & Private SQLite</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                <span>Multi-Currency (INR, USD, AED, PHP)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-brand-mint" />
                <span>No Ads or Subscriptions</span>
              </div>
            </div>

          </div>

          {/* Right Column: Realistic Smartphone Mockup with Real App UI */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
            
            {/* Ambient Shadow Layer */}
            <div className="relative mx-auto max-w-[320px] sm:max-w-[340px]">
              
              {/* Floating Pill Highlights */}
              <div className="absolute -left-6 sm:-left-12 top-24 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-card border border-brand-border hidden sm:flex items-center gap-3 animate-float">
                <div className="w-9 h-9 rounded-xl bg-brand-mintLight text-brand-mintDark flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Earnings Tracked</div>
                  <div className="text-sm font-extrabold text-brand-navy">₹45,000+ Completed</div>
                </div>
              </div>

              <div className="absolute -right-4 sm:-right-8 bottom-28 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-card border border-brand-border hidden sm:flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-purpleLight text-brand-purple flex items-center justify-center font-bold text-sm">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Video Pipeline</div>
                  <div className="text-sm font-extrabold text-brand-navy">10/10 Videos Delivered</div>
                </div>
              </div>

              {/* Realistic Android Smartphone Body */}
              <div className="relative rounded-[46px] p-3 bg-[#1C1A29] shadow-mockup border border-[#2E2B40]">
                
                {/* Volume & Power buttons */}
                <div className="absolute -left-[5px] top-28 w-[3px] h-10 bg-[#353149] rounded-l" />
                <div className="absolute -left-[5px] top-42 w-[3px] h-10 bg-[#353149] rounded-l" />
                <div className="absolute -right-[5px] top-32 w-[3px] h-14 bg-[#353149] rounded-r" />

                {/* Inner Screen Bezel with exact native 9/20 screenshot aspect ratio */}
                <div className="relative rounded-[36px] overflow-hidden bg-black aspect-[9/20]">
                  
                  {/* Punch Hole Camera */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-30 border border-[#222] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0a1020]" />
                  </div>

                  {/* Real App UI Screenshot */}
                  <img
                    src="/screenshots/home_dashboard.png"
                    alt="A Note Real App UI - Dashboard"
                    className="w-full h-full object-cover object-top select-none"
                    loading="eager"
                  />

                  {/* Screen Glare Overlay */}
                  <div className="absolute inset-0 pointer-events-none device-glare" />
                </div>
              </div>

              {/* Subtle Base Reflection */}
              <div className="w-3/4 h-5 mx-auto bg-brand-purple/10 blur-xl rounded-full mt-4" />
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
