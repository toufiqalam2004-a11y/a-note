import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface PreviewScreen {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  caption: string;
  highlights: string[];
}

const SCREENS: PreviewScreen[] = [
  {
    id: 'dashboard',
    title: 'Clean Dashboard Overview',
    subtitle: 'Monitor all client projects at a glance',
    badge: 'Home Screen',
    image: '/screenshots/home_dashboard.png',
    caption: 'Real dashboard showing active clients, video delivery progress, remaining count, and aggregated business value.',
    highlights: [
      'Overview of total clients and completion rates',
      'Remaining video counters to keep delivery on schedule',
      'Instant access to client logs and quick video actions',
    ],
  },
  {
    id: 'custom-types',
    title: 'Custom Video Types & Pricing',
    subtitle: 'Tailor categories and rates to your services',
    badge: 'Pricing & Categories',
    image: '/screenshots/custom_types.png',
    caption: 'Custom Video Type manager modal where editors configure categories and pricing per format.',
    highlights: [
      'Set individual prices for reels, shorts, podcasts & long videos',
      'Create and rename custom production categories',
      'Deterministic video type rotation for recurring clients',
    ],
  },
  {
    id: 'client-details',
    title: 'Client Tracking & Video Pipeline',
    subtitle: 'Individual checklists and delivery history',
    badge: 'Project Workflow',
    image: '/screenshots/client_details.png',
    caption: 'Client details view with interactive video checklist, completion toggles, notes, and export features.',
    highlights: [
      'Interactive checklist for each video project',
      'Export formal PDF and Excel completion summaries',
      'Notes and currency settings per client',
    ],
  },
];

export const AppPreview: React.FC = () => {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const activeScreen = SCREENS[activeScreenIndex];

  return (
    <section id="preview" className="py-24 bg-brand-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purpleLight text-brand-purple text-xs font-semibold uppercase tracking-wider">
            Authentic App Interface
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-navy tracking-tight">
            Designed for Speed and Focus
          </h2>
          <p className="text-base sm:text-lg text-brand-slate">
            Explore actual screenshots from A Note. High-contrast cards, smooth navigation, and zero unnecessary visual clutter.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {SCREENS.map((screen, idx) => (
            <button
              key={screen.id}
              onClick={() => setActiveScreenIndex(idx)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-smooth flex items-center gap-2 border ${
                activeScreenIndex === idx
                  ? 'bg-brand-purple text-white border-brand-purple shadow-sm'
                  : 'bg-white text-brand-slate border-brand-border hover:bg-brand-subtle hover:text-brand-navy'
              }`}
            >
              <span>{screen.title}</span>
            </button>
          ))}
        </div>

        {/* Showcase Content */}
        <div className="grid lg:grid-cols-12 gap-12 items-center bg-white rounded-3xl p-6 sm:p-10 border border-brand-border shadow-card">
          
          {/* Left Column: Screen Details & Highlights */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-subtle text-brand-purple text-xs font-semibold uppercase tracking-wider">
              {activeScreen.badge}
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-navy leading-snug">
              {activeScreen.title}
            </h3>

            <p className="text-base text-brand-slate leading-relaxed">
              {activeScreen.caption}
            </p>

            <div className="space-y-3 pt-2">
              {activeScreen.highlights.map((highlight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-mintLight text-brand-mintDark flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-brand-slate">{highlight}</span>
                </div>
              ))}
            </div>

            {/* Quick Switcher Dots */}
            <div className="flex items-center gap-2 pt-4">
              {SCREENS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreenIndex(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    activeScreenIndex === i ? 'w-8 bg-brand-purple' : 'w-2.5 bg-brand-border hover:bg-brand-muted'
                  }`}
                  aria-label={`Switch to screen ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Column: Realistic Smartphone Frame with the Selected Actual Screenshot */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[280px] sm:max-w-[310px]">
              
              {/* Smartphone Chassis */}
              <div className="relative rounded-[44px] p-2.5 bg-[#1C1A29] shadow-mockup border border-[#2E2B40]">
                
                {/* Hardware buttons */}
                <div className="absolute -left-[4px] top-24 w-[2.5px] h-8 bg-[#353149] rounded-l" />
                <div className="absolute -left-[4px] top-36 w-[2.5px] h-8 bg-[#353149] rounded-l" />
                <div className="absolute -right-[4px] top-28 w-[2.5px] h-12 bg-[#353149] rounded-r" />

                {/* Screen Display with exact native 9/20 screenshot aspect ratio */}
                <div className="relative rounded-[34px] overflow-hidden bg-black aspect-[9/20]">
                  
                  {/* Punch Hole */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-30 border border-[#222] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0a1020]" />
                  </div>

                  {/* Actual Screenshot */}
                  <img
                    key={activeScreen.image}
                    src={activeScreen.image}
                    alt={activeScreen.title}
                    className="w-full h-full object-cover object-top select-none animate-fadeIn"
                    loading="lazy"
                  />

                  {/* Glare effect */}
                  <div className="absolute inset-0 pointer-events-none device-glare" />
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
