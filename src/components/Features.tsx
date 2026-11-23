import React from 'react';
import { 
  TrendingUp, 
  SlidersHorizontal, 
  Layers, 
  Globe2, 
  Receipt, 
  LayoutDashboard,
  Check
} from 'lucide-react';

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  details: string[];
}

const FEATURES: FeatureItem[] = [
  {
    icon: TrendingUp,
    title: 'Track Your Earnings',
    subtitle: 'Manage income from every project',
    description: 'Track earnings per video and client. View completed revenue versus remaining pending balances in real time.',
    tag: 'Income Tracking',
    details: ['Per-client payment status', 'Real-time revenue summaries', 'Zero spreadsheet errors'],
  },
  {
    icon: SlidersHorizontal,
    title: 'Custom Video Pricing',
    subtitle: 'Set and edit individual rates',
    description: 'Assign distinct prices to different formats—from fast social reels to complex podcast edits and YouTube long-forms.',
    tag: 'Pricing Control',
    details: ['Flexible per-video rates', 'Easy retroactive price updates', 'Custom batch rates'],
  },
  {
    icon: Layers,
    title: 'Manage Video Types',
    subtitle: 'Create & rename custom categories',
    description: 'Customize video categories like Standard Reel, Podcast Reel, YouTube Video, or create your own custom workflow types.',
    tag: 'Workflow Customization',
    details: ['Rename & sort categories', 'Deterministic video cycling', 'Tailored to your editing niche'],
  },
  {
    icon: Globe2,
    title: 'Multi-Currency Support',
    subtitle: 'INR, USD, AED, and PHP',
    description: 'Manage international remote clients effortlessly. Switch currencies per client with built-in benchmark exchange rates.',
    tag: 'Global Freelancing',
    details: ['Supports INR (₹), USD ($), AED, PHP (₱)', 'European & UK currencies included', 'Consistent financial reporting'],
  },
  {
    icon: Receipt,
    title: 'Simple Expense & Income',
    subtitle: 'Clean financial clarity',
    description: 'Track incoming payments and outgoing production expenses without confusing double-entry bookkeeping jargon.',
    tag: 'Balance Clarity',
    details: ['Completed vs pending cashflow', 'Client milestone progress', 'Clean summary cards'],
  },
  {
    icon: LayoutDashboard,
    title: 'Clean Dashboard',
    subtitle: 'Your work at a single glance',
    description: 'See total clients, videos delivered, remaining queue, and total business value in one distraction-free overview.',
    tag: 'Minimal Overview',
    details: ['Fast quick-actions', 'Recent client timeline', 'High-contrast, legible typography'],
  },
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-white border-y border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-subtle text-brand-purple text-xs font-semibold uppercase tracking-wider">
            Key Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-navy tracking-tight">
            Everything You Need to Run Your Editing Studio
          </h2>
          <p className="text-base sm:text-lg text-brand-slate">
            Built purposefully around the daily workflow of freelance video creators. Simple, fast, and completely focused on what matters.
          </p>
        </div>

        {/* Minimal Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-brand-bg rounded-2xl p-7 border border-brand-border/80 hover:border-brand-purple/40 hover:bg-white hover:shadow-card transition-smooth group flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Icon & Tag */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-white border border-brand-border flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-white group-hover:border-transparent transition-smooth shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-brand-muted tracking-wide uppercase px-2.5 py-1 rounded-md bg-white border border-brand-border/60">
                      {feature.tag}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-xl font-bold text-brand-navy mb-1.5 group-hover:text-brand-purple transition-smooth">
                    {feature.title}
                  </h3>
                  <div className="text-xs font-semibold text-brand-muted mb-3">
                    {feature.subtitle}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-brand-slate leading-relaxed mb-5">
                    {feature.description}
                  </p>
                </div>

                {/* Bullet Highlights */}
                <div className="pt-4 border-t border-brand-border/50 space-y-2">
                  {feature.details.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-brand-slate">
                      <div className="w-4 h-4 rounded-full bg-brand-mintLight text-brand-mintDark flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
