import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { AppPreview } from './components/AppPreview';
import { AboutSection } from './components/AboutSection';
import { FinalDownload } from './components/FinalDownload';
import { Footer } from './components/Footer';
import { DownloadModal } from './components/DownloadModal';
import { PrivacyModal } from './components/PrivacyModal';

export default function App() {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-navy selection:bg-brand-purpleLight selection:text-brand-purple">
      {/* Sticky Navbar */}
      <Navbar onOpenDownloadModal={() => setIsDownloadModalOpen(true)} />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* 1. Hero Section */}
        <Hero onOpenDownloadModal={() => setIsDownloadModalOpen(true)} />

        {/* 2. Key Features Section */}
        <Features />

        {/* 3. App Preview with Authentic Mobile Screenshots */}
        <AppPreview />

        {/* 4. Why A Note (About Section) */}
        <AboutSection />

        {/* 5. Final Download CTA Section */}
        <FinalDownload onOpenDownloadModal={() => setIsDownloadModalOpen(true)} />
      </main>

      {/* 6. Footer */}
      <Footer onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)} />

      {/* Modals */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
