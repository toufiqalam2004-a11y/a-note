import React from 'react';
import { HardDrive, Zap } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-white border-b border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-subtle text-brand-purple text-xs font-semibold uppercase tracking-wider">
              About A Note
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-navy tracking-tight leading-snug">
              Why Freelance Video Editors Rely on A Note
            </h2>

            <p className="text-base sm:text-lg text-brand-slate leading-relaxed">
              Most project management tools are designed for software engineers or large marketing agencies. They force you into kanban boards, complex subtasks, and monthly recurring subscriptions.
            </p>

            <p className="text-sm sm:text-base text-brand-slate leading-relaxed">
              Video editors operate differently: you have clients who order 10 reels, 4 YouTube vlogs, or 2 podcast cuts with fixed per-video rates. A Note was built specifically around this real-world rhythm—giving you immediate clarity on deliverables and revenue.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-brand-bg border border-brand-border">
                <div className="font-bold text-brand-navy text-sm mb-1 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-brand-purple" />
                  <span>100% On-Device SQLite</span>
                </div>
                <p className="text-xs text-brand-slate">
                  Your client data, financial figures, and project milestones remain strictly on your Android device. Zero cloud dependency.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-brand-bg border border-brand-border">
                <div className="font-bold text-brand-navy text-sm mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-mintDark" />
                  <span>Instant Interaction</span>
                </div>
                <p className="text-xs text-brand-slate">
                  Check off finished reels in one tap. No slow page reloads, no internet lag, and no distracting notifications.
                </p>
              </div>
            </div>

          </div>

          {/* Right Visual Comparison Card */}
          <div className="lg:col-span-6">
            <div className="bg-brand-bg rounded-3xl p-8 border border-brand-border shadow-soft text-left space-y-6">
              <h3 className="text-xl font-bold text-brand-navy">
                How A Note Compares
              </h3>

              <div className="space-y-4">
                
                {/* Traditional Spreadsheets */}
                <div className="p-4 rounded-2xl bg-white border border-brand-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-brand-navy">Generic Spreadsheets</span>
                    <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Clunky on mobile</span>
                  </div>
                  <p className="text-xs text-brand-slate">
                    Formulas break easily, tiny mobile cells are hard to tap while editing, and currency conversions require manual math.
                  </p>
                </div>

                {/* Heavy Cloud CRMs */}
                <div className="p-4 rounded-2xl bg-white border border-brand-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-brand-navy">Bloated Cloud CRMs</span>
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Monthly fee & slow</span>
                  </div>
                  <p className="text-xs text-brand-slate">
                    Expensive recurring fees, slow web apps, requires constant online connectivity, and overloaded with features you never use.
                  </p>
                </div>

                {/* A Note */}
                <div className="p-4 rounded-2xl bg-brand-purpleLight/40 border-2 border-brand-purple space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-brand-purple">A Note for Android</span>
                    <span className="text-xs font-bold text-brand-mintDark bg-brand-mintLight px-2 py-0.5 rounded">Purpose-built</span>
                  </div>
                  <p className="text-xs text-brand-navy font-medium">
                    Native Android performance, multi-currency pricing, per-video checklist, and local privacy. Designed exclusively for video editors.
                  </p>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
