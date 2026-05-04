const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

// Remote Chromium binary — downloaded once per cold start by chromium-min.
const CHROMIUM_REMOTE_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar';

async function getBrowser() {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    console.log('[PDF] Serverless detected — using remote Chromium');
    const executablePath = await chromium.executablePath(CHROMIUM_REMOTE_URL);
    console.log('[PDF] Executable path:', executablePath);

    return puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
      defaultViewport: null
    });
  }

  // Local development — use installed Chrome.
  const fs = require('fs');
  const localPaths = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  const localPath = localPaths.find((p) => fs.existsSync(p));
  console.log('[PDF] Local Chrome:', localPath || 'not found');

  return puppeteer.launch({
    executablePath: localPath,
    headless: true,
    defaultViewport: null
  });
}

async function generatePdfFromHtml(htmlContent, pdfOptions = {}) {
  const browser = await getBrowser();
  console.log('[PDF] Browser launched');

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('[PDF] Content loaded, generating PDF...');

    const buffer = await page.pdf({
      format: pdfOptions.format || 'A4',
      landscape: pdfOptions.landscape || false,
      printBackground: pdfOptions.printBackground !== false,
      margin: pdfOptions.margin || { top: '0.4in', right: '0.3in', bottom: '0.4in', left: '0.3in' }
    });

    console.log('[PDF] Done, buffer size:', buffer.length, 'bytes');
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}
const User = require('../models/User');
const StudentFee = require('../models/StudentFee');
const Attendance = require('../models/Attendance');
const Transaction = require('../models/Transaction');
const { auth, authorize } = require('../middleware/auth');
const { getDatasetExport, getExportFilename } = require('../utils/pdfExport');

const router = express.Router();

// @route   GET /api/pdf/admin/:dataset
// @desc    Generate admin PDF export for supported datasets
// @access  Private (Admin only)
router.get('/admin/:dataset', auth, authorize('admin'), async (req, res) => {
    try {
        const exportData = await getDatasetExport(req.params.dataset, req.query);
        const filename = getExportFilename(req.params.dataset);

        const pdfBuffer = await generatePdfFromHtml(exportData.html, {
            format: 'A4',
            landscape: exportData.landscape,
            printBackground: true,
            margin: {
                top: '0.4in',
                right: '0.3in',
                bottom: '0.4in',
                left: '0.3in'
            }
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

        // Generate HTML content for PDF
        const htmlContent = generateUserPDFHTML(user, studentFees, attendanceRecords, transactions);

        // PDF options
        const options = {
            format: 'A4',
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        };

        // Generate PDF
        const pdfBuffer = await generatePdfFromHtml(htmlContent, options);

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

// Function to generate HTML content for PDF
function generateUserPDFHTML(user, studentFees, attendanceRecords, transactions) {
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount) => {
        return `৳${amount?.toLocaleString() || '0'}`;
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <title>Student Profile - ${user.studentId}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Noto Sans Bengali', 'Arial', sans-serif; 
                line-height: 1.4; 
                color: #333;
                font-size: 12px;
            }
            .container { 
                max-width: 100%; 
                margin: 0;
                background: white;
            }
            .header { 
                background: #667eea;
                color: white; 
                padding: 15px;
                text-align: center;
            }
            .header h1 { 
                font-size: 18px; 
                margin-bottom: 5px;
            }
            .header p { 
                font-size: 12px; 
            }
            .content { padding: 15px; }
            .section { 
                margin-bottom: 15px;
                background: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                border-left: 3px solid #667eea;
            }
            .section h2 { 
                color: #667eea; 
                margin-bottom: 10px;
                font-size: 14px;
            }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr 1fr; 
                gap: 8px;
                margin-bottom: 10px;
            }
            .info-item { 
                background: white;
                padding: 8px;
                border-radius: 4px;
            }
            .info-label { 
                font-weight: bold; 
                color: #555;
                margin-bottom: 2px;
                font-size: 10px;
                text-transform: uppercase;
            }
            .info-value { 
                color: #333;
                font-size: 11px;
            }
            .table { 
                width: 100%; 
                border-collapse: collapse;
                background: white;
                font-size: 10px;
            }
            .table th, .table td { 
                padding: 6px; 
                text-align: left; 
                border-bottom: 1px solid #eee;
            }
            .table th { 
                background: #667eea; 
                color: white;
                font-size: 9px;
            }
            .status-badge {
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 8px;
                font-weight: bold;
            }
            .status-paid { background: #d4edda; color: #155724; }
            .status-partial { background: #fff3cd; color: #856404; }
            .status-pending { background: #f8d7da; color: #721c24; }
            .footer { 
                background: #f8f9fa; 
                padding: 10px; 
                text-align: center; 
                color: #666;
                font-size: 10px;
            }
            .no-data {
                text-align: center;
                color: #666;
                font-style: italic;
                padding: 10px;
                font-size: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>কাটবওলা ডিজিটাল পোস্ট অফিস</h1>
                <p>Student Profile Report</p>
            </div>
            
            <div class="content">
                <!-- Personal Information -->
                <div class="section">
                    <h2>📋 Personal Information</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Student ID</div>
                            <div class="info-value">${user.studentId || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Name (English)</div>
                            <div class="info-value">${user.nameEnglish || user.name || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Name (Bangla)</div>
                            <div class="info-value">${user.nameBangla || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Father's Name</div>
                            <div class="info-value">${user.fatherName || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Mother's Name</div>
                            <div class="info-value">${user.motherName || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date of Birth</div>
                            <div class="info-value">${formatDate(user.dateOfBirth)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Gender</div>
                            <div class="info-value">${user.gender || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Phone</div>
                            <div class="info-value">${user.phone || user.mobile || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Email</div>
                            <div class="info-value">${user.email || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">NID/Birth Certificate</div>
                            <div class="info-value">${user.nidOrBirth || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Present Address</div>
                            <div class="info-value">${user.presentAddress || user.address || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Permanent Address</div>
                            <div class="info-value">${user.permanentAddress || user.address || 'N/A'}</div>
                        </div>
                    </div>
                </div>

               <!-- Educational Background -->
                    
                    ${user.education && user.education.length > 0 ? `
                    <h3 style="margin: 20px 0 10px 0; color: #667eea;">Educational Background</h3>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Exam</th>
                                <th>Year</th>
                                <th>Board</th>
                                <th>Roll</th>
                                <th>Registration</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${user.education.map(edu => `
                                <tr>
                                    <td>${edu.examName || 'N/A'}</td>
                                    <td>${edu.passingYear || 'N/A'}</td>
                                    <td>${edu.board || 'N/A'}</td>
                                    <td>${edu.rollNumber || 'N/A'}</td>
                                    <td>${edu.registrationNumber || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : '<div class="no-data">No educational background recorded</div>'}
                </div>
                <!-- Academic Information -->
                <div class="section">
                    <h2>🎓 Academic Information</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Batch</div>
                            <div class="info-value">${user.batch?.name || 'Not Assigned'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Course Type</div>
                            <div class="info-value">${user.batch?.course || 'N/A'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Join Date</div>
                            <div class="info-value">${formatDate(user.joinDate)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">${user.isActive ? 'Active' : 'Inactive'}</div>
                        </div>
                    </div>

                <!-- Fee Information -->
                <div class="section">
                    <h2>💰 Fee Information</h2>
                    ${studentFees && studentFees.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Course</th>
                                <th>Total Fee</th>
                                <th>Paid Amount</th>
                                <th>Due Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${studentFees.map(fee => `
                                <tr>
                                    <td>${fee.course}</td>
                                    <td>${formatCurrency(fee.totalFee)}</td>
                                    <td>${formatCurrency(fee.paidAmount)}</td>
                                    <td>${formatCurrency(fee.dueAmount)}</td>
                                    <td><span class="status-badge status-${fee.status}">${fee.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : '<div class="no-data">No fee records found</div>'}
                </div>

                <!-- Recent Attendance -->
                <div class="section">
                    <h2>📅 Recent Attendance (Last 30 Days)</h2>
                    ${attendanceRecords && attendanceRecords.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Working Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${attendanceRecords.slice(0, 10).map(record => `
                                <tr>
                                    <td>${formatDate(record.date)}</td>
                                    <td>${record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A'}</td>
                                    <td>${record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A'}</td>
                                    <td>${record.netWorkingHours || 0} hrs</td>
                                    <td><span class="status-badge status-${record.status === 'present' ? 'paid' : 'pending'}">${record.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : '<div class="no-data">No attendance records found</div>'}
                </div>

                <!-- Recent Transactions -->
                <div class="section">
                    <h2>💳 Recent Transactions</h2>
                    ${transactions && transactions.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.slice(0, 5).map(transaction => `
                                <tr>
                                    <td>${formatDate(transaction.createdAt)}</td>
                                    <td>${transaction.type.replace(/_/g, ' ').toUpperCase()}</td>
                                    <td>${formatCurrency(transaction.amount)}</td>
                                    <td>${transaction.description || transaction.title || 'N/A'}</td>
                                    <td><span class="status-badge status-${transaction.status === 'completed' ? 'paid' : 'pending'}">${transaction.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : '<div class="no-data">No transaction records found</div>'}
                </div>
            </div>
            
            <div class="footer">
                <p>Generated on ${new Date().toLocaleDateString('en-GB')} | Katbowla Digital Post Office Management System</p>
                <p>This is an official document generated by the system</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

module.exports = router;
