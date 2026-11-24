import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { AppPreview } from './components/AppPreview';
import { AboutSection } from './components/AboutSection';
import { Waitlist } from './components/Waitlist';
import { FinalDownload } from './components/FinalDownload';
import { Footer } from './components/Footer';
import { PrivacyModal } from './components/PrivacyModal';

export default function App() {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-navy selection:bg-brand-purpleLight selection:text-brand-purple">
      {/* Sticky Navbar */}
      <Navbar />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Key Features Section */}
        <Features />

        {/* 3. App Preview with Authentic Mobile Screenshots */}
        <AppPreview />

        {/* 4. Why A Note (About Section) */}
        <AboutSection />

        {/* 5. Waitlist Section */}
        <Waitlist />

        {/* 6. Final Download CTA Section */}
        <FinalDownload />
      </main>

      {/* 7. Footer */}
      <Footer onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)} />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
