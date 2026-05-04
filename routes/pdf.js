const express = require('express');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const StudentFee = require('../models/StudentFee');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const { auth, authorize } = require('../middleware/auth');
const { getDatasetExport, getExportFilename, APP_NAME_EN, APP_NAME_BN, formatDate, formatCurrency, formatDateTime, humanize } = require('../utils/pdfExport');

const router = express.Router();

// ─── Color Palette ─────────────────────────────────────────────────
const COLORS = {
  primary: '#2563eb',
  primaryDark: '#0f172a',
  headerBg: '#eff6ff',
  cardBg: '#f8fafc',
  border: '#e5e7eb',
  borderLight: '#dbeafe',
  textDark: '#1f2937',
  textMuted: '#64748b',
  white: '#ffffff',
  rowEven: '#fafafa'
};

// ─── PDFKit-based PDF generation (no Chromium needed) ──────────────
function generateAdminPdf(exportData, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const landscape = options.landscape || false;
      const doc = new PDFDocument({
        size: 'A4',
        layout: landscape ? 'landscape' : 'portrait',
        margins: { top: 30, bottom: 30, left: 25, right: 25 },
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ── Header ──────────────────────────────────────────────────
      drawHeader(doc, exportData.titleEn, exportData.titleBn, pageWidth);

      // ── Summary Cards ───────────────────────────────────────────
      if (exportData.summaryCards && exportData.summaryCards.length > 0) {
        drawSummaryCards(doc, exportData.summaryCards, pageWidth);
      }

      // ── Filters ─────────────────────────────────────────────────
      if (exportData.filters && exportData.filters.length > 0) {
        drawFilters(doc, exportData.filters, pageWidth);
      }

      // ── Data Table ──────────────────────────────────────────────
      if (exportData.columns && exportData.records) {
        drawTable(doc, exportData.columns, exportData.records, pageWidth, landscape);
      }

      // ── Footer ──────────────────────────────────────────────────
      drawFooter(doc, pageWidth);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawHeader(doc, titleEn, titleBn, pageWidth) {
  const startX = doc.x;

  // App name
  doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primaryDark)
    .text(APP_NAME_EN, startX, doc.y, { width: pageWidth * 0.6 });

  // Title on the right
  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.primaryDark)
    .text(titleEn || '', startX, doc.y - 16, { width: pageWidth, align: 'right' });

  doc.moveDown(0.3);

  // Divider line
  const lineY = doc.y;
  doc.moveTo(startX, lineY).lineTo(startX + pageWidth, lineY)
    .strokeColor(COLORS.borderLight).lineWidth(2).stroke();

  doc.moveDown(0.8);
}

function drawSummaryCards(doc, summaryCards, pageWidth) {
  const cardCount = summaryCards.length;
  const gap = 8;
  const cardWidth = (pageWidth - gap * (cardCount - 1)) / cardCount;
  const cardHeight = 50;
  const startX = doc.x;
  const startY = doc.y;

  summaryCards.forEach((card, i) => {
    const x = startX + i * (cardWidth + gap);

    // Card background
    doc.roundedRect(x, startY, cardWidth, cardHeight, 6)
      .fillAndStroke(COLORS.headerBg, COLORS.borderLight);

    // Value
    doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.primaryDark)
      .text(String(card.value), x + 8, startY + 8, { width: cardWidth - 16 });

    // Label
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.textDark)
      .text((card.labelEn || '').toUpperCase(), x + 8, startY + 28, { width: cardWidth - 16 });
  });

  doc.y = startY + cardHeight + 12;
}

function drawFilters(doc, filters, pageWidth) {
  const startX = doc.x;
  let xPos = startX;
  const y = doc.y;

  doc.fontSize(7).font('Helvetica');

  filters.forEach((filter) => {
    const label = `${filter.labelEn}: ${filter.value}`;
    const textWidth = doc.widthOfString(label) + 16;

    if (xPos + textWidth > startX + pageWidth) {
      xPos = startX;
      doc.y += 18;
    }

    doc.roundedRect(xPos, doc.y, textWidth, 14, 7)
      .fillAndStroke(COLORS.cardBg, COLORS.border);

    doc.fillColor(COLORS.textDark)
      .text(label, xPos + 8, doc.y + 3, { width: textWidth - 16 });

    xPos += textWidth + 6;
  });

  doc.y += 20;
}

function drawTable(doc, columns, records, pageWidth, landscape) {
  if (!records.length) {
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.textDark)
      .text('No data found', { align: 'center' });
    return;
  }

  // Calculate column widths
  const slColWidth = 28;
  const availableWidth = pageWidth - slColWidth;
  const colWidth = availableWidth / columns.length;
  const startX = doc.x;
  const fontSize = landscape ? 7 : 7.5;
  const headerFontSize = landscape ? 7 : 7.5;
  const rowHeight = 18;
  const headerHeight = 22;

  // ── Table Header ──────────────────────────────────────────────
  function drawTableHeader(yPos) {
    // Header background
    doc.rect(startX, yPos, pageWidth, headerHeight)
      .fill(COLORS.headerBg);

    // Header borders
    doc.rect(startX, yPos, pageWidth, headerHeight)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    // SL column
    doc.fontSize(headerFontSize).font('Helvetica-Bold').fillColor(COLORS.primaryDark)
      .text('SL', startX + 2, yPos + 6, { width: slColWidth, align: 'center' });

    // Column headers
    columns.forEach((col, i) => {
      const x = startX + slColWidth + i * colWidth;
      doc.fontSize(headerFontSize).font('Helvetica-Bold').fillColor(COLORS.primaryDark)
        .text(col.labelEn || '', x + 3, yPos + 6, { width: colWidth - 6, lineBreak: false });
    });

    return yPos + headerHeight;
  }

  let currentY = drawTableHeader(doc.y);

  // ── Table Rows ────────────────────────────────────────────────
  records.forEach((record, rowIdx) => {
    // Check if we need a new page
    if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
      drawFooter(doc, pageWidth);
      doc.addPage();
      currentY = doc.y;
      currentY = drawTableHeader(currentY);
    }

    // Row background (alternating)
    if (rowIdx % 2 === 0) {
      doc.rect(startX, currentY, pageWidth, rowHeight)
        .fill(COLORS.white);
    } else {
      doc.rect(startX, currentY, pageWidth, rowHeight)
        .fill(COLORS.rowEven);
    }

    // Row border
    doc.rect(startX, currentY, pageWidth, rowHeight)
      .strokeColor(COLORS.border).lineWidth(0.3).stroke();

    // SL number
    doc.fontSize(fontSize).font('Helvetica').fillColor(COLORS.textDark)
      .text(String(rowIdx + 1), startX + 2, currentY + 5, { width: slColWidth, align: 'center' });

    // Cell values
    columns.forEach((col, colIdx) => {
      const x = startX + slColWidth + colIdx * colWidth;
      let value = '';
      try {
        value = col.value(record, rowIdx);
      } catch (e) {
        value = 'N/A';
      }
      value = value === null || value === undefined ? 'N/A' : String(value);

      // Truncate long values
      const maxChars = Math.floor(colWidth / (fontSize * 0.45));
      if (value.length > maxChars) {
        value = value.substring(0, maxChars - 2) + '..';
      }

      doc.fontSize(fontSize).font('Helvetica').fillColor(COLORS.textDark)
        .text(value, x + 3, currentY + 5, { width: colWidth - 6, lineBreak: false });
    });

    currentY += rowHeight;
  });

  doc.y = currentY + 8;
}

function drawFooter(doc, pageWidth) {
  const startX = doc.page.margins.left;
  const footerY = doc.page.height - doc.page.margins.bottom - 15;

  doc.moveTo(startX, footerY)
    .lineTo(startX + pageWidth, footerY)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();

  const now = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  doc.fontSize(7).font('Helvetica').fillColor(COLORS.textMuted)
    .text('Generated from admin export center', startX, footerY + 4, { width: pageWidth * 0.5 })
    .text(`Generated on ${now}`, startX, footerY + 4, { width: pageWidth, align: 'right' });
}

// ─── User Profile PDF Generator ────────────────────────────────────
function generateUserProfilePdf(user, studentFees, attendanceRecords, transactions) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.x;

      // ── Header ────────────────────────────────────────────────
      doc.rect(startX, doc.y, pageWidth, 45).fill(COLORS.primary);
      doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.white)
        .text(APP_NAME_EN, startX + 10, doc.y - 35, { width: pageWidth - 20, align: 'center' });
      doc.fontSize(10).fillColor(COLORS.white)
        .text('Student Profile Report', startX + 10, doc.y - 2, { width: pageWidth - 20, align: 'center' });
      doc.y += 15;

      // ── Personal Information ──────────────────────────────────
      drawSectionTitle(doc, 'Personal Information', pageWidth);

      const personalInfo = [
        ['Student ID', user.studentId || 'N/A'],
        ['Name (English)', user.nameEnglish || user.name || 'N/A'],
        ['Name (Bangla)', user.nameBangla || 'N/A'],
        ['Father\'s Name', user.fatherName || 'N/A'],
        ['Mother\'s Name', user.motherName || 'N/A'],
        ['Date of Birth', user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'],
        ['Gender', user.gender || 'N/A'],
        ['Phone', user.phone || user.mobile || 'N/A'],
        ['Email', user.email || 'N/A'],
        ['NID/Birth Certificate', user.nidOrBirth || 'N/A'],
        ['Present Address', user.presentAddress || user.address || 'N/A'],
        ['Permanent Address', user.permanentAddress || user.address || 'N/A']
      ];

      drawInfoGrid(doc, personalInfo, pageWidth, 3);

      // ── Academic Information ───────────────────────────────────
      drawSectionTitle(doc, 'Academic Information', pageWidth);

      const academicInfo = [
        ['Batch', user.batch?.name || 'Not Assigned'],
        ['Course Type', user.batch?.course || 'N/A'],
        ['Join Date', user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-GB') : 'N/A'],
        ['Status', user.isActive ? 'Active' : 'Inactive']
      ];

      drawInfoGrid(doc, academicInfo, pageWidth, 4);

      // ── Fee Information ────────────────────────────────────────
      if (studentFees && studentFees.length > 0) {
        drawSectionTitle(doc, 'Fee Information', pageWidth);
        drawSimpleTable(doc, ['Course', 'Total Fee', 'Paid', 'Due', 'Status'], studentFees.map(fee => [
          fee.course || 'N/A',
          `${fee.totalFee?.toLocaleString() || '0'}`,
          `${fee.paidAmount?.toLocaleString() || '0'}`,
          `${fee.dueAmount?.toLocaleString() || '0'}`,
          fee.status || 'N/A'
        ]), pageWidth);
      }

      // ── Attendance ─────────────────────────────────────────────
      if (attendanceRecords && attendanceRecords.length > 0) {
        drawSectionTitle(doc, 'Recent Attendance (Last 30 Days)', pageWidth);
        drawSimpleTable(doc, ['Date', 'Check In', 'Check Out', 'Hours', 'Status'], attendanceRecords.slice(0, 10).map(r => [
          r.date ? new Date(r.date).toLocaleDateString('en-GB') : 'N/A',
          r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : 'N/A',
          r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : 'N/A',
          `${r.netWorkingHours || 0} hrs`,
          r.status || 'N/A'
        ]), pageWidth);
      }

      // ── Transactions ───────────────────────────────────────────
      if (transactions && transactions.length > 0) {
        drawSectionTitle(doc, 'Recent Transactions', pageWidth);
        drawSimpleTable(doc, ['Date', 'Type', 'Amount', 'Description', 'Status'], transactions.slice(0, 5).map(t => [
          t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : 'N/A',
          (t.type || '').replace(/_/g, ' ').toUpperCase(),
          `${t.amount?.toLocaleString() || '0'}`,
          t.description || t.title || 'N/A',
          t.status || 'N/A'
        ]), pageWidth);
      }

      // ── Footer ─────────────────────────────────────────────────
      doc.moveDown(1);
      const footerY = doc.y;
      doc.moveTo(startX, footerY).lineTo(startX + pageWidth, footerY)
        .strokeColor(COLORS.border).lineWidth(0.5).stroke();
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.textMuted)
        .text(`Generated on ${new Date().toLocaleDateString('en-GB')} | ${APP_NAME_EN}`, startX, footerY + 5, { width: pageWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawSectionTitle(doc, title, pageWidth) {
  const startX = doc.x;
  doc.moveDown(0.5);
  const y = doc.y;

  // Left accent bar
  doc.rect(startX, y, 3, 16).fill(COLORS.primary);

  // Background
  doc.rect(startX + 3, y, pageWidth - 3, 16).fill(COLORS.cardBg);

  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text(title, startX + 10, y + 3, { width: pageWidth - 20 });

  doc.y = y + 22;
}

function drawInfoGrid(doc, items, pageWidth, cols) {
  const startX = doc.x;
  const colWidth = pageWidth / cols;
  const itemHeight = 28;

  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * colWidth;
    const y = doc.y + row * itemHeight;

    // Background
    doc.rect(x + 1, y, colWidth - 2, itemHeight - 2).fill(COLORS.white);
    doc.rect(x + 1, y, colWidth - 2, itemHeight - 2)
      .strokeColor(COLORS.border).lineWidth(0.3).stroke();

    // Label
    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.textMuted)
      .text(items[i][0].toUpperCase(), x + 5, y + 3, { width: colWidth - 10 });

    // Value
    doc.fontSize(8.5).font('Helvetica').fillColor(COLORS.textDark)
      .text(items[i][1], x + 5, y + 14, { width: colWidth - 10, lineBreak: false });
  }

  doc.y += Math.ceil(items.length / cols) * itemHeight + 5;
}

function drawSimpleTable(doc, headers, rows, pageWidth) {
  const startX = doc.x;
  const colWidth = pageWidth / headers.length;
  const headerHeight = 18;
  const rowHeight = 16;

  // Check for page break
  const tableHeight = headerHeight + rows.length * rowHeight;
  if (doc.y + tableHeight > doc.page.height - doc.page.margins.bottom - 30) {
    doc.addPage();
  }

  // Header
  const headerY = doc.y;
  doc.rect(startX, headerY, pageWidth, headerHeight).fill(COLORS.primary);

  headers.forEach((header, i) => {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.white)
      .text(header, startX + i * colWidth + 4, headerY + 5, { width: colWidth - 8, lineBreak: false });
  });

  let currentY = headerY + headerHeight;

  // Rows
  rows.forEach((row, rowIdx) => {
    if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage();
      currentY = doc.y;
    }

    const bgColor = rowIdx % 2 === 0 ? COLORS.white : COLORS.rowEven;
    doc.rect(startX, currentY, pageWidth, rowHeight).fill(bgColor);
    doc.rect(startX, currentY, pageWidth, rowHeight)
      .strokeColor(COLORS.border).lineWidth(0.3).stroke();

    row.forEach((cell, i) => {
      const value = cell === null || cell === undefined ? 'N/A' : String(cell);
      doc.fontSize(7).font('Helvetica').fillColor(COLORS.textDark)
        .text(value, startX + i * colWidth + 4, currentY + 4, { width: colWidth - 8, lineBreak: false });
    });

    currentY += rowHeight;
  });

  doc.y = currentY + 5;
}

// ─── Routes ────────────────────────────────────────────────────────

// @route   GET /api/pdf/admin/:dataset
// @desc    Generate admin PDF export for supported datasets
// @access  Private (Admin only)
router.get('/admin/:dataset', auth, authorize('admin'), async (req, res) => {
  try {
    const exportData = await getDatasetExport(req.params.dataset, req.query);
    const filename = getExportFilename(req.params.dataset);

    const pdfBuffer = await generateAdminPdf(exportData, {
      landscape: exportData.landscape
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Admin PDF export error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error generating export PDF' });
  }
});

// @route   GET /api/pdf/user/:studentId
// @desc    Generate and download user PDF by student ID
// @access  Public (for now, can be secured later)
router.get('/user/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find user by student ID
    const user = await User.findOne({ studentId })
      .populate('batch', 'name course startDate endDate schedule')
      .populate('courses', 'name description duration fee');

    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get student fees
    const studentFees = await StudentFee.find({ student: user._id })
      .populate('batch', 'name course');

    // Get attendance records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const attendanceRecords = await Attendance.find({
      employee: user._id,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    // Get transactions related to this user
    const transactions = await Transaction.find({
      $or: [
        { customerRef: user._id },
        { handledBy: user._id }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    // Generate PDF using PDFKit
    const pdfBuffer = await generateUserProfilePdf(user, studentFees, attendanceRecords, transactions);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student_${studentId}_profile.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

module.exports = router;
