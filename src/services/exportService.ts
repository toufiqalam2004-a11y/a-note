import { ClientWithVideos, HistoryDateFilter } from '../types';
import { formatCurrency, formatDate, formatTime } from '../utils/calculations';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ExportResult {
  success: boolean;
  message: string;
  fileUri?: string;
  fileSize?: number;
}

/**
 * Filter videos based on the selected date range
 */
export function filterClientVideosByRange(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter = 'all'
) {
  if (dateRange === 'all') return client.videos;

  const now = new Date();
  let minDateStr = '';

  if (dateRange === 'today') {
    minDateStr = now.toISOString().split('T')[0];
  } else if (dateRange === 'last7') {
    minDateStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  } else if (dateRange === 'last30') {
    minDateStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return client.videos.filter((v) => {
    // If pending, include it to show remaining work in project history
    if (!v.isCompleted || !v.completedAt) return true;
    const itemDate = v.completedAt.split('T')[0];
    return itemDate >= minDateStr;
  });
}

export function getDateRangeLabel(range: HistoryDateFilter): string {
  switch (range) {
    case 'today':
      return 'Today';
    case 'last7':
      return 'Last 7 Days';
    case 'last30':
      return 'Last 30 Days';
    case 'all':
    default:
      return 'All History';
  }
}

/**
 * Escapes client-provided strings for safe insertion into HTML.
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolves a reliable directory on the device's local filesystem.
 */
function getStorageDirectory(): string {
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('Local file system storage is not available on this device.');
  }
  return dir.endsWith('/') ? dir : `${dir}/`;
}

/**
 * Resolves the appropriate Apple Uniform Type Identifier (UTI) for iOS sharing.
 */
export function resolveAppleUTI(mimeType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
    return 'com.adobe.pdf';
  }
  if (
    lower.endsWith('.xlsx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'org.openxmlformats.spreadsheetml.sheet';
  }
  if (lower.endsWith('.json') || mimeType === 'application/json') {
    return 'public.json';
  }
  return 'public.data';
}

/**
 * Verifies that a generated file exists on disk and is non-empty,
 * then opens the system share sheet with appropriate MIME and Apple UTI.
 */
async function verifyAndShareFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<ExportResult> {
  // 1. Verify file exists and has non-zero size
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || !info.size || info.size === 0) {
    throw new Error(`File generation failed: ${fileName} does not exist or is empty.`);
  }

  // 2. Check if sharing is supported on this platform
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    const uti = resolveAppleUTI(mimeType, fileName);
    // 3. Open the system share sheet with local file URI, Android MIME type, and iOS UTI
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: `Export: ${fileName}`,
      UTI: uti,
    });
  }

  const sizeKb = Math.max(1, Math.round(info.size / 1024));
  return {
    success: true,
    message: isAvailable
      ? `Generated and shared ${fileName} (${sizeKb} KB) successfully!`
      : `Generated ${fileName} (${sizeKb} KB) successfully and saved to device storage!`,
    fileUri,
    fileSize: info.size,
  };
}

/**
 * Builds professional, clean HTML for EditFlow Client Reports.
 */
function buildClientReportHtml(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter
): string {
  const calc = client.calculations;
  const filteredVideos = filterClientVideosByRange(client, dateRange);
  const rangeLabel = getDateRangeLabel(dateRange);
  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const progressPercent = Math.round((calc.completedVideos / (calc.totalVideos || 1)) * 100);

  const tableRowsHtml = filteredVideos
    .map((v) => {
      const isDone = v.isCompleted;
      const statusClass = isDone ? 'badge-completed' : 'badge-pending';
      const statusText = isDone ? 'COMPLETED' : 'PENDING';
      const dateText = v.completedAt ? formatDate(v.completedAt) : '-';
      const timeText = v.completedAt ? formatTime(v.completedAt) : '-';
      const valueText = isDone ? formatCurrency(calc.ratePerVideo) : '₹0';

      return `
        <tr>
          <td style="text-align: center; font-weight: 700; color: #7C5CFC;">#${v.videoNumber}</td>
          <td style="font-weight: 600; color: #1E1B38;">${escapeHtml(v.title || `Video ${v.videoNumber}`)}</td>
          <td><span class="${statusClass}">${statusText}</span></td>
          <td style="color: #4A4568;">${dateText}</td>
          <td style="color: #8E8AAB;">${timeText}</td>
          <td style="text-align: right; font-weight: 700; color: ${isDone ? '#00D287' : '#8E8AAB'};">${valueText}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>EditFlow - ${escapeHtml(client.name)} Report</title>
      <style>
        @page {
          size: A4;
          margin: 14mm 12mm 14mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #FFFFFF;
          color: #1E1B38;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 14px;
          border-bottom: 2px solid #F0EBF8;
          margin-bottom: 16px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 800;
          color: #00D287;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .brand-subtitle {
          font-size: 10px;
          color: #8E8AAB;
          font-weight: 600;
          margin: 2px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-meta {
          text-align: right;
        }
        .client-name {
          font-size: 16px;
          font-weight: 800;
          color: #1E1B38;
          margin: 0;
        }
        .meta-text {
          font-size: 10px;
          color: #8E8AAB;
          margin: 3px 0 0 0;
        }
        .scope-badge {
          display: inline-block;
          background: #EDE8FD;
          color: #7C5CFC;
          font-weight: 800;
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 999px;
          margin-top: 4px;
        }
        .cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }
        .metric-card {
          background: #F9F6FE;
          border: 1px solid #EAE4F5;
          border-radius: 12px;
          padding: 10px 12px;
        }
        .card-label {
          font-size: 9px;
          font-weight: 700;
          color: #8E8AAB;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .card-value {
          font-size: 15px;
          font-weight: 800;
          color: #1E1B38;
          margin-bottom: 2px;
        }
        .card-sub {
          font-size: 9px;
          color: #8E8AAB;
        }
        .progress-box {
          background: #FFFFFF;
          border: 1px solid #E8E1F3;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 18px;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .progress-bar-bg {
          width: 100%;
          height: 8px;
          background: #F0EBF8;
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: #00D287;
          width: ${progressPercent}%;
          border-radius: 999px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          color: #1E1B38;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        thead {
          display: table-header-group;
        }
        tr {
          page-break-inside: avoid;
        }
        th {
          background: #F4EFFB;
          color: #4A4568;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 10px;
          text-align: left;
          border-top: 1px solid #E8E1F3;
          border-bottom: 1px solid #E8E1F3;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #F0EBF8;
          font-size: 10px;
        }
        tr:nth-child(even) td {
          background-color: #FAFAFD;
        }
        .badge-completed {
          background: #E6FBF2;
          color: #00B775;
          font-weight: 800;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 999px;
          display: inline-block;
        }
        .badge-pending {
          background: #EDE8FD;
          color: #7C5CFC;
          font-weight: 700;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 999px;
          display: inline-block;
        }
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #F0EBF8;
          display: flex;
          justify-content: space-between;
          color: #8E8AAB;
          font-size: 8px;
        }
        .notice-box {
          background: #F9F6FE;
          border-left: 3px solid #7C5CFC;
          padding: 8px 12px;
          margin-bottom: 18px;
          font-size: 9px;
          color: #4A4568;
          border-radius: 0 8px 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="brand-title">EditFlow</h1>
          <p class="brand-subtitle">Client Video Delivery & Revenue Tracker</p>
        </div>
        <div class="header-meta">
          <h2 class="client-name">${escapeHtml(client.name)}</h2>
          <p class="meta-text">Report Date: ${reportDateStr}</p>
          <span class="scope-badge">${escapeHtml(rangeLabel)}</span>
        </div>
      </div>

      <div class="notice-box">
        <strong>Payment Model Note:</strong> Client payments are received as advances. Revenue is officially earned as videos are completed and delivered.
      </div>

      <div class="cards-grid">
        <div class="metric-card">
          <div class="card-label">Payments Received</div>
          <div class="card-value">${formatCurrency(calc.totalBudget)}</div>
          <div class="card-sub">${formatCurrency(calc.ratePerVideo)}/video agreed rate</div>
        </div>
        <div class="metric-card">
          <div class="card-label">Video Capacity</div>
          <div class="card-value" style="color: #7C5CFC;">${calc.totalVideos} Videos</div>
          <div class="card-sub">Unused Balance: ${formatCurrency(calc.unusedBudget)}</div>
        </div>
        <div class="metric-card">
          <div class="card-label">Completed Work</div>
          <div class="card-value" style="color: #00D287;">${formatCurrency(calc.completedValue)}</div>
          <div class="card-sub">${calc.completedVideos} of ${calc.totalVideos} videos done</div>
        </div>
        <div class="metric-card">
          <div class="card-label">Pending Work</div>
          <div class="card-value" style="color: #F59E0B;">${formatCurrency(calc.remainingValue)}</div>
          <div class="card-sub">${calc.remainingVideos} videos remaining</div>
        </div>
      </div>

      <div class="progress-box">
        <div class="progress-header">
          <span>Overall Project Delivery Progress</span>
          <span style="color: #00D287;">${progressPercent}% (${calc.completedVideos}/${calc.totalVideos} videos)</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill"></div>
        </div>
      </div>

      <h3 class="section-title">Date-wise Video Delivery Checklist (${filteredVideos.length} items)</h3>

      <table>
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">Video #</th>
            <th>Title</th>
            <th style="width: 100px;">Status</th>
            <th style="width: 90px;">Completed Date</th>
            <th style="width: 80px;">Time</th>
            <th style="width: 85px; text-align: right;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <span>EditFlow v1.0.0 &bull; Offline SQLite Verified Records</span>
        <span>Generated on ${reportDateStr} &bull; Confidential Client Statement</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * Fallback PDF generator using pdf-lib (pure JavaScript),
 * used if expo-print native module is unavailable in the environment.
 */
async function generatePdfWithPdfLib(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter,
  targetFilePath: string
): Promise<void> {
  const calc = client.calculations;
  const filteredVideos = filterClientVideosByRange(client, dateRange);
  const rangeLabel = getDateRangeLabel(dateRange);
  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const sanitize = (text: string): string => {
    return (text || '')
      .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
      .replace(/[\u202f\u00a0]/g, ' ')
      .replace(/₹/g, 'INR ')
      .replace(/[^\x20-\x7E]/g, '');
  };

  const drawText = (txt: string, opts: any) => {
    page.drawText(sanitize(txt), opts);
  };

  const bgPage = rgb(0.98, 0.97, 1.0);
  const cardBg = rgb(1.0, 1.0, 1.0);
  const mintGreen = rgb(0.0, 0.75, 0.45);
  const textNavy = rgb(0.12, 0.11, 0.22);
  const textMuted = rgb(0.55, 0.54, 0.65);
  const borderCol = rgb(0.9, 0.88, 0.95);
  const pendingCol = rgb(0.48, 0.36, 0.98);

  page.drawRectangle({ x: 0, y: 0, width, height, color: bgPage });

  let curY = height - 45;

  // Header
  drawText('EditFlow', { x: 40, y: curY, size: 22, font: fontBold, color: mintGreen });
  drawText('CLIENT DELIVERY & REVENUE REPORT', { x: 145, y: curY + 3, size: 10, font: fontBold, color: textNavy });

  curY -= 20;
  drawText(`Client: ${client.name}   |   Date: ${reportDateStr}   |   Scope: ${rangeLabel}`, {
    x: 40,
    y: curY,
    size: 9,
    font: fontRegular,
    color: textMuted,
  });

  curY -= 15;
  page.drawLine({
    start: { x: 40, y: curY },
    end: { x: width - 40, y: curY },
    thickness: 1,
    color: borderCol,
  });

  curY -= 25;

  // Metric Cards
  const cardW = (width - 80 - 15) / 2;
  const cardH = 46;

  const drawCard = (label: string, val: string, sub: string, x: number, y: number, color = textNavy) => {
    page.drawRectangle({
      x,
      y,
      width: cardW,
      height: cardH,
      color: cardBg,
      borderColor: borderCol,
      borderWidth: 1,
    });
    drawText(label, { x: x + 10, y: y + 32, size: 8, font: fontBold, color: textMuted });
    drawText(val, { x: x + 10, y: y + 16, size: 13, font: fontBold, color });
    drawText(sub, { x: x + 10, y: y + 5, size: 7, font: fontRegular, color: textMuted });
  };

  drawCard('PAYMENTS RECEIVED', `INR ${calc.totalBudget.toLocaleString('en-IN')}`, `Rate: INR ${calc.ratePerVideo}/video`, 40, curY - cardH);
  drawCard('VIDEO CAPACITY', `${calc.totalVideos} Videos`, `Unused: INR ${calc.unusedBudget}`, 40 + cardW + 15, curY - cardH, pendingCol);

  curY -= cardH + 10;
  drawCard('DELIVERED WORK', `INR ${calc.completedValue.toLocaleString('en-IN')}`, `${calc.completedVideos} videos completed`, 40, curY - cardH, mintGreen);
  drawCard('PENDING WORK', `INR ${calc.remainingValue.toLocaleString('en-IN')}`, `${calc.remainingVideos} videos remaining`, 40 + cardW + 15, curY - cardH, textMuted);

  curY -= cardH + 25;

  // Table
  drawText('DATE-WISE VIDEO DELIVERY CHECKLIST', { x: 40, y: curY, size: 10, font: fontBold, color: textNavy });
  curY -= 16;

  const colX = [40, 95, 230, 330, 420, 500];
  page.drawRectangle({ x: 40, y: curY - 16, width: width - 80, height: 18, color: cardBg, borderColor: borderCol, borderWidth: 1 });

  ['#', 'Title', 'Status', 'Date', 'Time', 'Value'].forEach((h, idx) => {
    drawText(h, { x: colX[idx] + 5, y: curY - 12, size: 8, font: fontBold, color: textMuted });
  });

  curY -= 18;

  for (let i = 0; i < filteredVideos.length; i++) {
    const v = filteredVideos[i];
    if (curY < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      page.drawRectangle({ x: 0, y: 0, width, height, color: bgPage });
      curY = height - 45;
    }

    const rowBg = i % 2 === 0 ? bgPage : cardBg;
    page.drawRectangle({ x: 40, y: curY - 14, width: width - 80, height: 16, color: rowBg, borderColor: borderCol, borderWidth: 0.5 });

    const isDone = v.isCompleted;
    drawText(`${v.videoNumber}`, { x: colX[0] + 5, y: curY - 10, size: 8, font: fontRegular, color: textNavy });
    drawText(v.title || `Video ${v.videoNumber}`, { x: colX[1] + 5, y: curY - 10, size: 8, font: fontRegular, color: textNavy });
    drawText(isDone ? 'COMPLETED' : 'PENDING', { x: colX[2] + 5, y: curY - 10, size: 8, font: fontBold, color: isDone ? mintGreen : pendingCol });
    drawText(v.completedAt ? formatDate(v.completedAt) : '-', { x: colX[3] + 5, y: curY - 10, size: 8, font: fontRegular, color: textMuted });
    drawText(v.completedAt ? formatTime(v.completedAt) : '-', { x: colX[4] + 5, y: curY - 10, size: 8, font: fontRegular, color: textMuted });
    drawText(isDone ? `INR ${calc.ratePerVideo}` : 'INR 0', { x: colX[5] + 5, y: curY - 10, size: 8, font: fontBold, color: isDone ? mintGreen : textMuted });

    curY -= 16;
  }

  const base64Data = await pdfDoc.saveAsBase64();
  await FileSystem.writeAsStringAsync(targetFilePath, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Generates a genuine, readable PDF report and triggers Android system sharing.
 */
export async function exportClientPDF(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter = 'all'
): Promise<ExportResult> {
  const targetDir = getStorageDirectory();
  const safeClientName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `EditFlow_${safeClientName}_Report.pdf`;
  const fileUri = `${targetDir}${fileName}`;
  const mimeType = 'application/pdf';

  let pdfGenerated = false;

  // 1. Primary method: expo-print HTML-to-PDF (rich vector formatting)
  try {
    if (Print && typeof Print.printToFileAsync === 'function') {
      const html = buildClientReportHtml(client, dateRange);
      const printResult = await Print.printToFileAsync({ html });

      if (printResult && printResult.uri) {
        // Copy the generated PDF to our designated target URI
        await FileSystem.copyAsync({
          from: printResult.uri,
          to: fileUri,
        });
        pdfGenerated = true;
      }
    }
  } catch (printErr) {
    console.warn('[EditFlow Export] expo-print unavailable or failed, switching to pdf-lib engine:', printErr);
  }

  // 2. Secondary fallback: pdf-lib engine (pure JS binary generator)
  if (!pdfGenerated) {
    await generatePdfWithPdfLib(client, dateRange, fileUri);
  }

  // 3. Verify file on disk and share via Android system sheet
  return await verifyAndShareFile(fileUri, fileName, mimeType);
}

/**
 * Generates a real Microsoft Excel (.xlsx) workbook with two distinct worksheets
 * and triggers Android system sharing for the actual binary file.
 */
export async function exportClientExcel(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter = 'all'
): Promise<ExportResult> {
  const targetDir = getStorageDirectory();
  const rangeLabel = getDateRangeLabel(dateRange);
  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const calc = client.calculations;
  const filteredVideos = filterClientVideosByRange(client, dateRange);

  // 1. Worksheet 1: Client Summary
  const summaryData = [
    ['EDITFLOW CLIENT DELIVERY & FINANCIAL REPORT', ''],
    ['Generated On', reportDateStr],
    ['Report Date Range', rangeLabel],
    ['', ''],
    ['CLIENT DETAILS & TERMS', ''],
    ['Client Name', client.name],
    ['Agreed Rate Per Video', `INR ${calc.ratePerVideo}`],
    ['Payments Received (Advance / Total)', `INR ${calc.totalBudget}`],
    ['Total Video Capacity (Calculated)', `${calc.totalVideos} videos`],
    ['Unused Payment Balance', `INR ${calc.unusedBudget}`],
    ['', ''],
    ['WORK PROGRESS & REVENUE RECONCILIATION', ''],
    ['Completed Videos', calc.completedVideos],
    ['Remaining Videos', calc.remainingVideos],
    ['Money Earned (Completed Work)', `INR ${calc.completedValue}`],
    ['Pending Work Value (Remaining)', `INR ${calc.remainingValue}`],
    ['Delivery Progress', `${Math.round((calc.completedVideos / (calc.totalVideos || 1)) * 100)}%`],
    ['', ''],
    ['PAYMENT MODEL NOTE:', 'Payments received are advances. Money is officially earned as videos are completed.'],
  ];

  // 2. Worksheet 2: Video History
  const videoHeaders = [
    'Video #',
    'Video Title',
    'Delivery Status',
    'Completion Date',
    'Completion Time',
    'Earned Value (INR)',
  ];

  const videoRows = filteredVideos.map((v) => [
    v.videoNumber,
    v.title || `Video ${v.videoNumber}`,
    v.isCompleted ? 'COMPLETED' : 'PENDING',
    v.completedAt ? formatDate(v.completedAt) : '-',
    v.completedAt ? formatTime(v.completedAt) : '-',
    v.isCompleted ? calc.ratePerVideo : 0,
  ]);

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsVideos = XLSX.utils.aoa_to_sheet([videoHeaders, ...videoRows]);

  // Set explicit, readable column widths
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 32 }];
  wsVideos['!cols'] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Client Summary');
  XLSX.utils.book_append_sheet(wb, wsVideos, 'Video History');

  // Generate real ZIP-based Office Open XML XLSX workbook in base64
  const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const safeClientName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `EditFlow_${safeClientName}_Report.xlsx`;
  const fileUri = `${targetDir}${fileName}`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Write base64 binary to storage
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Verify file on disk and share via Android system sheet
  return await verifyAndShareFile(fileUri, fileName, mimeType);
}
