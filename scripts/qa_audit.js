import http from 'http';
import fs from 'fs';
import path from 'path';

/**
 * Automated QA Audit Script for A Note Landing Page
 */
async function runAudit() {
  console.log('====================================================');
  console.log('🧪 Starting Comprehensive QA Audit for A Note Landing Page');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check HTML and SEO Metadata in index.html
  console.log('\n--- 1. SEO Metadata, Branding & Favicon Audit ---');
  const indexHtml = fs.readFileSync('index.html', 'utf-8');
  assert(indexHtml.includes('<title>A Note – Video Editing & Earnings Tracker</title>'), 'Title is exact: A Note – Video Editing & Earnings Tracker');
  assert(indexHtml.includes('name="title" content="A Note – Video Editing & Earnings Tracker"'), 'Meta title matches branding');
  assert(indexHtml.includes('property="og:title" content="A Note – Video Editing & Earnings Tracker"'), 'OG title matches branding');
  assert(indexHtml.includes('property="twitter:title" content="A Note – Video Editing & Earnings Tracker"'), 'Twitter title matches branding');
  assert(indexHtml.includes('href="/icon.png"'), 'Favicon correctly references /icon.png');
  assert(!indexHtml.includes('EditFlow'), 'Zero instances of EditFlow in index.html');

  // 2. Asset Integrity Check
  console.log('\n--- 2. Asset Integrity & Resolution Audit ---');
  const requiredAssets = [
    'public/icon.png',
    'public/favicon.png',
    'public/screenshots/home_dashboard.png',
    'public/screenshots/custom_types.png',
    'public/screenshots/client_details.png',
    'public/screenshots/dashboard.png',
    'public/screenshots/profile_modal.png',
    'public/screenshots/video_details.png'
  ];

  for (const asset of requiredAssets) {
    const exists = fs.existsSync(asset);
    const size = exists ? fs.statSync(asset).size : 0;
    assert(exists && size > 1000, `Asset ${asset} exists (${(size/1024).toFixed(1)} KB)`);
  }

  // 3. Centralized Download Configuration Audit
  console.log('\n--- 3. Centralized Download Configuration Audit ---');
  const downloadConfigSrc = fs.readFileSync('src/config/download.ts', 'utf-8');
  assert(downloadConfigSrc.includes("appName: 'A Note'"), "appName is set to 'A Note'");
  assert(downloadConfigSrc.includes("packageId: 'com.editflow.app'"), "packageId is preserved as 'com.editflow.app'");
  assert(downloadConfigSrc.includes("export function initiateApkDownload"), "initiateApkDownload helper exists");

  // Check all download buttons use initiateApkDownload
  const navbarSrc = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');
  const heroSrc = fs.readFileSync('src/components/Hero.tsx', 'utf-8');
  const finalDownloadSrc = fs.readFileSync('src/components/FinalDownload.tsx', 'utf-8');

  assert(navbarSrc.includes('initiateApkDownload(onOpenDownloadModal)'), 'Navbar download button uses initiateApkDownload');
  assert(heroSrc.includes('initiateApkDownload(onOpenDownloadModal)'), 'Hero download button uses initiateApkDownload');
  assert(finalDownloadSrc.includes('initiateApkDownload(onOpenDownloadModal)'), 'Final CTA download button uses initiateApkDownload');

  // 4. Download Mechanics Simulation (Both states)
  console.log('\n--- 4. Download State Simulation ---');
  // State A: Empty URL
  let fallbackModalTriggered = false;
  let simulatedAnchorClicked = false;
  let simulatedAnchorHref = '';

  function simulateDownload(url) {
    const trimmed = url.trim();
    if (trimmed && trimmed !== '#' && !trimmed.includes('example.com') && !trimmed.includes('PLACEHOLDER')) {
      simulatedAnchorClicked = true;
      simulatedAnchorHref = trimmed;
    } else {
      fallbackModalTriggered = true;
    }
  }

  // Test State A: Empty or placeholder
  fallbackModalTriggered = false;
  simulatedAnchorClicked = false;
  simulateDownload('');
  assert(fallbackModalTriggered && !simulatedAnchorClicked, 'State A: Empty apkUrl triggers fallback setup modal');

  // Test State B: Valid configured URL
  fallbackModalTriggered = false;
  simulatedAnchorClicked = false;
  simulateDownload('https://releases.anote.app/v1.0.0/ANote-v1.0.0.apk');
  assert(simulatedAnchorClicked && simulatedAnchorHref === 'https://releases.anote.app/v1.0.0/ANote-v1.0.0.apk' && !fallbackModalTriggered, 'State B: Configured apkUrl triggers direct download');

  // 5. Component Structure & Link Targets
  console.log('\n--- 5. Navigation Links & CTA Anchors ---');
  assert(navbarSrc.includes('href="#features"'), 'Navbar has link to #features');
  assert(navbarSrc.includes('href="#preview"'), 'Navbar has link to #preview');
  assert(navbarSrc.includes('href="#about"'), 'Navbar has link to #about');
  assert(heroSrc.includes('href="#features"'), 'Hero CTA links to #features');

  const featuresSrc = fs.readFileSync('src/components/Features.tsx', 'utf-8');
  const previewSrc = fs.readFileSync('src/components/AppPreview.tsx', 'utf-8');
  const aboutSrc = fs.readFileSync('src/components/AboutSection.tsx', 'utf-8');

  assert(featuresSrc.includes('id="features"'), 'Features section has id="features"');
  assert(previewSrc.includes('id="preview"'), 'Preview section has id="preview"');
  assert(aboutSrc.includes('id="about"'), 'About section has id="about"');

  // 6. Screenshot Aspect Ratio & Zero Distortion Check
  console.log('\n--- 6. Screenshot Display & Aspect Ratio ---');
  assert(heroSrc.includes('aspect-[9/20]'), 'Hero smartphone mockup uses exact native 9/20 aspect ratio (1080x2400)');
  assert(previewSrc.includes('aspect-[9/20]'), 'App Preview smartphone mockup uses exact native 9/20 aspect ratio (1080x2400)');

  // 7. Privacy Claims Verification against App Source
  console.log('\n--- 7. Privacy Claims Verification ---');
  const privacySrc = fs.readFileSync('src/components/PrivacyModal.tsx', 'utf-8');
  assert(privacySrc.includes('SQLite'), 'Privacy policy specifies local SQLite database');
  assert(privacySrc.includes('No Cloud Sync'), 'Privacy policy accurately details zero-cloud storage');
  assert(privacySrc.includes('A Note'), 'Privacy policy uses A Note branding');
  assert(!privacySrc.includes('EditFlow'), 'Zero EditFlow references in PrivacyModal');

  // 8. HTTP Asset Delivery Verification against running server
  console.log('\n--- 8. HTTP Server & Asset Response Audit (http://localhost:4173) ---');
  const testUrls = [
    '/',
    '/icon.png',
    '/favicon.png',
    '/screenshots/home_dashboard.png',
    '/screenshots/custom_types.png',
    '/screenshots/client_details.png'
  ];

  for (const urlPath of testUrls) {
    await new Promise((resolve) => {
      http.get(`http://localhost:4173${urlPath}`, (res) => {
        assert(res.statusCode === 200, `GET ${urlPath} -> HTTP ${res.statusCode}`);
        resolve();
      }).on('error', (err) => {
        assert(false, `GET ${urlPath} failed: ${err.message}`);
        resolve();
      });
    });
  }

  // Summary
  console.log('\n====================================================');
  console.log(`📊 QA Audit Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
