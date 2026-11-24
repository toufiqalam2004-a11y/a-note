import http from 'http';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Automated QA Audit Script for A Note Landing Page & Production APK
 */
async function runAudit() {
  console.log('====================================================');
  console.log('🧪 Starting Comprehensive QA Audit for A Note Landing Page & Production APK');
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

  // 1. APK Verification in public/downloads/
  console.log('\n--- 1. Production APK Binary & SHA-256 Integrity ---');
  const apkPath = 'public/downloads/ANote.apk';
  assert(fs.existsSync(apkPath), `APK exists at ${apkPath}`);

  const stat = fs.statSync(apkPath);
  assert(stat.size === 84640809, `APK size is exact 84,640,809 bytes (84.64 MB) (found: ${stat.size})`);

  const fileBuffer = fs.readFileSync(apkPath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const sha256 = hashSum.digest('hex').toUpperCase();
  const EXPECTED_SHA256 = 'B1D0FD4B2DB797010E361CC4E177B52BA56C48E73C541EB8CACE2B105A0222C5';
  assert(sha256 === EXPECTED_SHA256, `SHA-256 matches: ${sha256}`);

  // 2. Centralized Download Configuration
  console.log('\n--- 2. Centralized Download Configuration ---');
  const downloadConfigSrc = fs.readFileSync('src/config/download.ts', 'utf-8');
  assert(downloadConfigSrc.includes("apkUrl: '/downloads/ANote.apk'"), "apkUrl points to '/downloads/ANote.apk'");
  assert(downloadConfigSrc.includes("appName: 'A Note'"), "appName is 'A Note'");
  assert(downloadConfigSrc.includes("packageId: 'com.editflow.app'"), "packageId is 'com.editflow.app'");
  assert(downloadConfigSrc.includes("anchor.setAttribute('download', 'ANote.apk')"), "anchor download filename is set to 'ANote.apk'");

  // 3. CTA Buttons Connectivity
  console.log('\n--- 3. CTA Buttons Connectivity ---');
  const navbarSrc = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');
  const heroSrc = fs.readFileSync('src/components/Hero.tsx', 'utf-8');
  const finalDownloadSrc = fs.readFileSync('src/components/FinalDownload.tsx', 'utf-8');

  assert(navbarSrc.includes('initiateApkDownload(onOpenDownloadModal)'), 'Navbar download button uses initiateApkDownload');
  assert(heroSrc.includes('initiateApkDownload(onOpenDownloadModal)'), 'Hero download button uses initiateApkDownload');
  assert(finalDownloadSrc.includes('initiateApkDownload(onOpenDownloadModal)'), 'Final CTA download button uses initiateApkDownload');

  // 4. Check HTML and SEO Metadata in index.html
  console.log('\n--- 4. SEO Metadata, Branding & Favicon Audit ---');
  const indexHtml = fs.readFileSync('index.html', 'utf-8');
  assert(indexHtml.includes('<title>A Note – Video Editing & Earnings Tracker</title>'), 'Title is exact: A Note – Video Editing & Earnings Tracker');
  assert(indexHtml.includes('href="/icon.png"'), 'Favicon correctly references /icon.png');
  assert(!indexHtml.includes('EditFlow'), 'Zero instances of EditFlow in index.html');

  // 5. Asset Integrity Check
  console.log('\n--- 5. Screenshot Display & Aspect Ratio ---');
  assert(heroSrc.includes('aspect-[9/20]'), 'Hero smartphone mockup uses exact native 9/20 aspect ratio');
  const previewSrc = fs.readFileSync('src/components/AppPreview.tsx', 'utf-8');
  assert(previewSrc.includes('aspect-[9/20]'), 'App Preview smartphone mockup uses exact native 9/20 aspect ratio');

  // 6. Production dist Check (if built)
  if (fs.existsSync('dist/downloads/ANote.apk')) {
    console.log('\n--- 6. Production dist Output Check ---');
    const distStat = fs.statSync('dist/downloads/ANote.apk');
    assert(distStat.size === 84640809, `dist/downloads/ANote.apk exists with exact 84,640,809 bytes`);
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
