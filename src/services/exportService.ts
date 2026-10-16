import { Platform, Share } from 'react-native';
import { ClientWithVideos, HistoryDateFilter } from '../types';
import { formatCurrency, formatDate, formatTime } from '../utils/calculations';
import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

function getDateRangeLabel(range: HistoryDateFilter): string {
  switch (range) {
    case 'today':
      return 'Today';
    case 'last7':
      return 'Last 7 Days';
    case 'last30':
      return 'Last 30 Days';
    case 'all':
    default:
      return 'Complete Project History';
  }
}

/**
 * Safely shares a generated file using expo-sharing if available,
 * or falls back to React Native's Share dialog.
 */
async function shareGeneratedFile(
  fileBase64: string,
  fileName: string,
  mimeType: string,
  fallbackText: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Dynamic optional import to ensure zero crash if native module isn't compiled
    let FileSystem: any = null;
    let Sharing: any = null;

    try {
      FileSystem = require('expo-file-system');
      Sharing = require('expo-sharing');
    } catch {
      // Native modules not bundled
    }

    if (
      FileSystem &&
      FileSystem.cacheDirectory &&
      Sharing &&
      typeof Sharing.shareAsync === 'function'
    ) {
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, fileBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Export: ${fileName}`,
          UTI: mimeType,
        });
        return {
          success: true,
          message: `Saved & shared ${fileName} successfully via Android system sheet!`,
        };
      }
    }

    // Fallback if expo-sharing is not available in current binary
    await Share.share({
      title: fileName,
      message: fallbackText,
    });

    return {
      success: true,
      message: `Report summary generated and shared for ${fileName}. (Rebuild standalone APK to enable direct file attachments via expo-sharing).`,
    };
  } catch (err: any) {
    console.warn('[EditFlow Export] Sharing error:', err);
    try {
      await Share.share({
        title: fileName,
        message: fallbackText,
      });
      return {
        success: true,
        message: `Report shared via system dialog.`,
      };
    } catch (shareErr: any) {
      return {
        success: false,
        message: shareErr.message || 'Could not export file.',
      };
    }
  }
}

/**
 * Generates a valid Microsoft Excel (.xlsx) workbook for the specified client.
 */
export async function exportClientExcel(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter = 'all'
): Promise<{ success: boolean; message: string }> {
  const rangeLabel = getDateRangeLabel(dateRange);
  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const calc = client.calculations;
  const filteredVideos = filterClientVideosByRange(client, dateRange);

  // 1. Build Summary Table
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
    ['NOTE:', 'Payments received are advances. Money is officially earned as videos are completed.'],
  ];

  // 2. Build Video Checklist & Completion History Table
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

  // Set column widths
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 30 }];
  wsVideos['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Financial Overview');
  XLSX.utils.book_append_sheet(wb, wsVideos, 'Delivery Checklist');

  const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = `EditFlow_${client.name.replace(/\s+/g, '_')}_Report.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const textSummary = `EditFlow Client Report: ${client.name}\nRange: ${rangeLabel}\nPayments Received: ${formatCurrency(calc.totalBudget)}\nRate: ${formatCurrency(calc.ratePerVideo)}/video\nCapacity: ${calc.totalVideos} videos (Completed: ${calc.completedVideos}, Remaining: ${calc.remainingVideos})\nEarned Value: ${formatCurrency(calc.completedValue)}\nUnused Balance: ${formatCurrency(calc.unusedBudget)}`;

  return await shareGeneratedFile(base64Data, fileName, mimeType, textSummary);
}


/**
 * Generates a valid PDF document with clean tables, styling, and metrics for the specified client.
 */
export async function exportClientPDF(
  client: ClientWithVideos,
  dateRange: HistoryDateFilter = 'all'
): Promise<{ success: boolean; message: string }> {
  const rangeLabel = getDateRangeLabel(dateRange);
  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const calc = client.calculations;
  const filteredVideos = filterClientVideosByRange(client, dateRange);

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Helper to ensure text is purely WinAnsi compatible (replaces non-breaking space 0x202f, bullets, etc.)
  const sanitize = (text: string): string => {
    return (text || '')
      .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '-')
      .replace(/[\u202f\u00a0]/g, ' ')
      .replace(/₹/g, 'INR ')
      .replace(/[^\x20-\x7E]/g, '');
  };

  const drawSafeText = (targetPage: any, txt: string, opts: any) => {
    targetPage.drawText(sanitize(txt), opts);
  };

  // Palette matching EditFlow Dark Theme
  const bgCharcoal = rgb(0.05, 0.06, 0.07);
  const cardBg = rgb(0.1, 0.12, 0.14);
  const mintGreen = rgb(0.0, 0.9, 0.6);
  const textWhite = rgb(0.95, 0.96, 0.98);
  const textMuted = rgb(0.55, 0.6, 0.65);
  const borderLine = rgb(0.18, 0.22, 0.25);
  const pendingColor = rgb(0.85, 0.65, 0.2);

  // Page background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: bgCharcoal,
  });

  let curY = height - 40;

  // Header Title
  drawSafeText(page, 'EditFlow', {
    x: 40,
    y: curY,
    size: 22,
    font: fontBold,
    color: mintGreen,
  });

  drawSafeText(page, 'CLIENT DELIVERY & REVENUE REPORT', {
    x: 140,
    y: curY + 3,
    size: 11,
    font: fontBold,
    color: textWhite,
  });

  curY -= 20;
  drawSafeText(page, `Client: ${client.name}   |   Date: ${reportDateStr}   |   Scope: ${rangeLabel}`, {
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
    color: borderLine,
  });

  curY -= 25;

  // 4 Financial Summary Metric Cards (2 rows of 2)
  const cardW = (width - 80 - 15) / 2;
  const cardH = 50;

  const drawMetricCard = (
    label: string,
    val: string,
    sub: string,
    x: number,
    y: number,
    valColor = textWhite
  ) => {
    page.drawRectangle({
      x,
      y,
      width: cardW,
      height: cardH,
      color: cardBg,
      borderColor: borderLine,
      borderWidth: 1,
    });
    drawSafeText(page, label, { x: x + 10, y: y + 34, size: 8, font: fontBold, color: textMuted });
    drawSafeText(page, val, { x: x + 10, y: y + 16, size: 14, font: fontBold, color: valColor });
    drawSafeText(page, sub, { x: x + 10, y: y + 4, size: 7, font: fontRegular, color: textMuted });
  };

  // Row 1
  drawMetricCard(
    'PAYMENTS RECEIVED',
    `INR ${calc.totalBudget.toLocaleString('en-IN')}`,
    `Rate: INR ${calc.ratePerVideo}/video`,
    40,
    curY - cardH,
    textWhite
  );
  drawMetricCard(
    'VIDEO CAPACITY',
    `${calc.totalVideos} Videos`,
    `Unused Balance: INR ${calc.unusedBudget}`,
    40 + cardW + 15,
    curY - cardH,
    mintGreen
  );

  curY -= cardH + 10;

  // Row 2
  drawMetricCard(
    'MONEY EARNED (DELIVERED)',
    `INR ${calc.completedValue.toLocaleString('en-IN')}`,
    `${calc.completedVideos} videos completed`,
    40,
    curY - cardH,
    mintGreen
  );
  drawMetricCard(
    'PENDING WORK (REMAINING)',
    `INR ${calc.remainingValue.toLocaleString('en-IN')}`,
    `${calc.remainingVideos} videos remaining`,
    40 + cardW + 15,
    curY - cardH,
    pendingColor
  );

  curY -= cardH + 25;

  // Table Title
  drawSafeText(page, 'DATE-WISE VIDEO DELIVERY CHECKLIST', {
    x: 40,
    y: curY,
    size: 11,
    font: fontBold,
    color: mintGreen,
  });

  curY -= 15;

  // Table Column Headers
  const colX = [40, 95, 230, 330, 420, 500];

  page.drawRectangle({
    x: 40,
    y: curY - 18,
    width: width - 80,
    height: 20,
    color: cardBg,
    borderColor: borderLine,
    borderWidth: 1,
  });

  const headers = ['Video #', 'Title', 'Status', 'Completed Date', 'Time', 'Value'];
  headers.forEach((h, idx) => {
    drawSafeText(page, h, {
      x: colX[idx] + 5,
      y: curY - 13,
      size: 8,
      font: fontBold,
      color: textMuted,
    });
  });

  curY -= 20;

  // Video Table Rows
  for (let i = 0; i < filteredVideos.length; i++) {
    const v = filteredVideos[i];

    // Page overflow check
    if (curY < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      page.drawRectangle({ x: 0, y: 0, width, height, color: bgCharcoal });
      curY = height - 40;
    }

    const rowBg = i % 2 === 0 ? bgCharcoal : cardBg;
    page.drawRectangle({
      x: 40,
      y: curY - 16,
      width: width - 80,
      height: 18,
      color: rowBg,
      borderColor: borderLine,
      borderWidth: 0.5,
    });

    const isDone = v.isCompleted;
    const statusText = isDone ? 'COMPLETED' : 'PENDING';
    const statusColor = isDone ? mintGreen : pendingColor;
    const dateStr = v.completedAt ? formatDate(v.completedAt) : '-';
    const timeStr = v.completedAt ? formatTime(v.completedAt) : '-';
    const valStr = isDone ? `INR ${calc.ratePerVideo}` : 'INR 0';

    drawSafeText(page, `${v.videoNumber}`, {
      x: colX[0] + 5,
      y: curY - 12,
      size: 8,
      font: fontRegular,
      color: textWhite,
    });
    drawSafeText(page, v.title || `Video ${v.videoNumber}`, {
      x: colX[1] + 5,
      y: curY - 12,
      size: 8,
      font: fontRegular,
      color: textWhite,
    });
    drawSafeText(page, statusText, {
      x: colX[2] + 5,
      y: curY - 12,
      size: 8,
      font: fontBold,
      color: statusColor,
    });
    drawSafeText(page, dateStr, {
      x: colX[3] + 5,
      y: curY - 12,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
    drawSafeText(page, timeStr, {
      x: colX[4] + 5,
      y: curY - 12,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
    drawSafeText(page, valStr, {
      x: colX[5] + 5,
      y: curY - 12,
      size: 8,
      font: fontBold,
      color: isDone ? mintGreen : textMuted,
    });

    curY -= 18;
  }

  // Footer Disclaimer
  curY -= 20;
  if (curY > 40) {
    drawSafeText(
      page,
      'Generated by EditFlow - Minimal Video-Editing Client & Revenue Tracker - Real-time SQLite records',
      {
        x: 40,
        y: curY,
        size: 7,
        font: fontRegular,
        color: textMuted,
      }
    );
  }

  const base64Data = await pdfDoc.saveAsBase64();
  const fileName = `EditFlow_${client.name.replace(/\s+/g, '_')}_Report.pdf`;
  const mimeType = 'application/pdf';

  const textSummary = `EditFlow Client Report: ${client.name}\nRange: ${rangeLabel}\nPayments Received: ${formatCurrency(calc.totalBudget)}\nRate: ${formatCurrency(calc.ratePerVideo)}/video\nCapacity: ${calc.totalVideos} videos (Completed: ${calc.completedVideos}, Remaining: ${calc.remainingVideos})\nEarned Value: ${formatCurrency(calc.completedValue)}\nUnused Balance: ${formatCurrency(calc.unusedBudget)}`;

  return await shareGeneratedFile(base64Data, fileName, mimeType, textSummary);
}
