const User = require('../models/User');
const ServiceSale = require('../models/ServiceSale');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const StudentFee = require('../models/StudentFee');
const Registration = require('../models/Registration');
const MFSTransaction = require('../models/MFSTransaction');
const Batch = require('../models/Batch');
const Service = require('../models/Service');
const Notice = require('../models/Notice');
const Team = require('../models/Team');
const Blog = require('../models/Blog');
const Review = require('../models/Review');

const APP_NAME_EN = 'Katbowla Digital Post Office Management System';
const APP_NAME_BN = 'কাটবওলা ডিজিটাল পোস্ট অফিস ম্যানেজমেন্ট সিস্টেম';

const monthLabels = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const humanize = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCell = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return escapeHtml(String(value)).replace(/\n/g, '<br />');
};

const stripHtml = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'N/A';
};

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

const formatHours = (value) => `${Number(value || 0).toFixed(2)} hrs`;

const sumBy = (items, getter) => items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);

const parseDate = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const applyDateRange = (query, field, startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);

  if (!start && !end) {
    return;
  }

  query[field] = {};

  if (start) {
    query[field].$gte = start;
  }

  if (end) {
    query[field].$lte = end;
  }
};

const buildUserSearch = (search) => {
  if (!search) {
    return {};
  }

  return {
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { nameEnglish: { $regex: search, $options: 'i' } },
      { nameBangla: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { studentId: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { businessName: { $regex: search, $options: 'i' } }
    ]
  };
};

const buildFilterList = (items) =>
  items.filter((item) => item.value !== null && item.value !== undefined && item.value !== '');

const renderHeader = (titleEn, titleBn) => `
  <div class="header">
    <div class="brand-block">
      <div class="brand-en">${escapeHtml(APP_NAME_EN)}</div>
      <div class="brand-bn">${escapeHtml(APP_NAME_BN)}</div>
    </div>
    <div class="report-block">
      <h1>${escapeHtml(titleEn)}</h1>
      <p>${escapeHtml(titleBn)}</p>
    </div>
  </div>
`;

const renderSummaryCards = (summaryCards) => {
  if (!summaryCards.length) {
    return '';
  }

  return `
    <div class="summary-grid">
      ${summaryCards
      .map(
        (card) => `
            <div class="summary-card">
              <div class="summary-value">${escapeHtml(String(card.value))}</div>
              <div class="summary-label-en">${escapeHtml(card.labelEn)}</div>
              <div class="summary-label-bn">${escapeHtml(card.labelBn)}</div>
            </div>
          `
      )
      .join('')}
    </div>
  `;
};

const renderFilters = (filters) => {
  if (!filters.length) {
    return '';
  }

  return `
    <div class="filters">
      ${filters
      .map(
        (filter) => `
            <div class="filter-pill">
              <span class="filter-title">${escapeHtml(filter.labelEn)} / ${escapeHtml(filter.labelBn)}:</span>
              <span>${escapeHtml(String(filter.value))}</span>
            </div>
          `
      )
      .join('')}
    </div>
  `;
};

const renderTable = (columns, records) => {
  if (!records.length) {
    return `
      <div class="empty-state">
        <div class="empty-title">No data found</div>
        <div class="empty-subtitle">কোনো তথ্য পাওয়া যায়নি</div>
      </div>
    `;
  }

  return `
    <table>
      <thead>
        <tr>
          <th class="index-col">
            <span class="th-en">SL</span>
            <span class="th-bn">ক্রম</span>
          </th>
          ${columns
      .map(
        (column) => `
                <th>
                  <span class="th-en">${escapeHtml(column.labelEn)}</span>
                  <span class="th-bn">${escapeHtml(column.labelBn)}</span>
                </th>
              `
      )
      .join('')}
        </tr>
      </thead>
      <tbody>
        ${records
      .map(
        (record, index) => `
              <tr>
                <td class="index-col">${index + 1}</td>
                ${columns.map((column) => `<td>${formatCell(column.value(record, index))}</td>`).join('')}
              </tr>
            `
      )
      .join('')}
      </tbody>
    </table>
  `;
};

const renderHtml = ({ titleEn, titleBn, summaryCards, filters, columns, records }) => `
  <!DOCTYPE html>
  <html lang="bn">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(titleEn)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          color: #1f2937;
          background: #f3f4f6;
          font-family: "Nirmala UI", "SolaimanLipi", "Nikosh", "Vrinda", "Arial Unicode MS", Arial, sans-serif;
          font-size: 11px;
          line-height: 1.45;
        }
        .page {
          background: #ffffff;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
          border-bottom: 2px solid #dbeafe;
          padding-bottom: 18px;
          margin-bottom: 18px;
        }
        .brand-en {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .brand-bn {
          margin-top: 4px;
          font-size: 13px;
          color: #2563eb;
          font-weight: 600;
        }
        .report-block { text-align: right; }
        .report-block h1 {
          margin: 0;
          font-size: 24px;
          color: #111827;
        }
        .report-block p {
          margin: 6px 0 0;
          font-size: 14px;
          color: #2563eb;
          font-weight: 600;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .summary-card {
          background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
          border: 1px solid #dbeafe;
          border-radius: 14px;
          padding: 14px;
        }
        .summary-value {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .summary-label-en {
          font-size: 11px;
          color: #374151;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .summary-label-bn {
          font-size: 11px;
          color: #2563eb;
          margin-top: 2px;
        }
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .filter-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 8px 12px;
        }
        .filter-title {
          font-weight: 700;
          color: #334155;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px 9px;
          vertical-align: top;
          word-break: break-word;
        }
        th {
          background: #eff6ff;
          color: #0f172a;
          text-align: left;
        }
        tbody tr:nth-child(even) {
          background: #fafafa;
        }
        .index-col {
          width: 42px;
          text-align: center;
          font-weight: 700;
        }
        .th-en, .th-bn { display: block; }
        .th-en {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .th-bn {
          font-size: 10px;
          color: #2563eb;
          margin-top: 2px;
        }
        .empty-state {
          margin-top: 24px;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 32px;
          text-align: center;
          background: #f8fafc;
        }
        .empty-title {
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
        }
        .empty-subtitle {
          font-size: 13px;
          color: #2563eb;
          margin-top: 4px;
        }
        .footer {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #64748b;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${renderHeader(titleEn, titleBn)}
        ${renderSummaryCards(summaryCards)}
        ${renderFilters(filters)}
        ${renderTable(columns, records)}
        <div class="footer">
          <div>Generated from admin export center</div>
          <div>Generated on ${escapeHtml(formatDateTime(new Date()))}</div>
        </div>
      </div>
    </body>
  </html>
`;

const datasetDefinitions = {
  students: {
    titleEn: 'Students Report',
    titleBn: 'শিক্ষার্থী রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {
        role: 'student',
        ...buildUserSearch(query.search)
      };

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await User.find(mongoQuery)
        .select('-password')
        .populate('batch', 'name course')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Student ID', labelBn: 'শিক্ষার্থী আইডি', value: (row) => row.studentId || 'N/A' },
          { labelEn: 'Name (English)', labelBn: 'নাম (ইংরেজি)', value: (row) => row.nameEnglish || row.name || 'N/A' },
          { labelEn: 'Name (Bangla)', labelBn: 'নাম (বাংলা)', value: (row) => row.nameBangla || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.mobile || row.phone || 'N/A' },
          { labelEn: 'Email', labelBn: 'ইমেইল', value: (row) => row.email || 'N/A' },
          { labelEn: 'Batch', labelBn: 'ব্যাচ', value: (row) => row.batch?.name || 'Not Assigned' },
          { labelEn: 'Course', labelBn: 'কোর্স', value: (row) => row.batch?.course || 'N/A' },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Students', labelBn: 'মোট শিক্ষার্থী', value: records.length },
          { labelEn: 'Active', labelBn: 'সক্রিয়', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Inactive', labelBn: 'নিষ্ক্রিয়', value: records.filter((row) => !row.isActive).length }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  customers: {
    titleEn: 'Customers Report',
    titleBn: 'গ্রাহক রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {
        role: 'customer',
        ...buildUserSearch(query.search)
      };

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await User.find(mongoQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Name', labelBn: 'নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.phone || 'N/A' },
          { labelEn: 'Email', labelBn: 'ইমেইল', value: (row) => row.email || 'N/A' },
          { labelEn: 'Business', labelBn: 'ব্যবসা', value: (row) => row.businessName || 'N/A' },
          { labelEn: 'NID', labelBn: 'এনআইডি', value: (row) => row.nid || 'N/A' },
          { labelEn: 'Due Amount', labelBn: 'বকেয়া', value: (row) => formatCurrency(row.dueAmount) },
          { labelEn: 'Customer Status', labelBn: 'গ্রাহক অবস্থা', value: (row) => humanize(row.customerStatus) },
          { labelEn: 'Active', labelBn: 'সক্রিয়', value: (row) => (row.isActive ? 'Yes' : 'No') }
        ],
        summaryCards: [
          { labelEn: 'Total Customers', labelBn: 'মোট গ্রাহক', value: records.length },
          { labelEn: 'Total Due', labelBn: 'মোট বকেয়া', value: formatCurrency(sumBy(records, (row) => row.dueAmount)) },
          { labelEn: 'Customers With Due', labelBn: 'বকেয়াসহ গ্রাহক', value: records.filter((row) => Number(row.dueAmount) > 0).length }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  'customer-ledger': {
    titleEn: 'Customer Ledger Report',
    titleBn: 'গ্রাহক খাতা রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      if (!query.customerId) {
        const error = new Error('customerId is required for customer ledger export');
        error.statusCode = 400;
        throw error;
      }

      const customer = await User.findOne({ _id: query.customerId, role: 'customer' }).lean();

      if (!customer) {
        const error = new Error('Customer not found');
        error.statusCode = 404;
        throw error;
      }

      const [customerTransactions, serviceSales] = await Promise.all([
        Transaction.find({
          customerRef: customer._id,
          type: { $in: ['due_amount_add', 'due_amount_collect'] }
        })
          .populate('handledBy', 'name')
          .sort({ createdAt: -1 })
          .lean(),
        ServiceSale.find({ customer: customer._id })
          .populate('handledBy', 'name')
          .sort({ createdAt: -1 })
          .lean()
      ]);

      const records = [
        ...customerTransactions.map((row) => ({
          createdAt: row.createdAt,
          source: 'transaction',
          type: row.type,
          description: row.description || row.title || 'N/A',
          amount: row.amount,
          paymentMethod: row.paymentMethod || 'N/A',
          status: row.status || 'completed',
          handledBy: row.handledBy?.name || 'N/A'
        })),
        ...serviceSales.map((row) => ({
          createdAt: row.createdAt,
          source: 'service_sale',
          type: 'service_sale',
          description: row.serviceName || 'N/A',
          amount: row.totalAmount,
          paymentMethod: 'N/A',
          status: row.dueAmount > 0 ? 'due' : 'paid',
          handledBy: row.handledBy?.name || 'N/A'
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        titleEn: `Customer Ledger - ${customer.name || 'Customer'}`,
        titleBn: `গ্রাহক খাতা - ${customer.name || 'গ্রাহক'}`,
        records,
        columns: [
          { labelEn: 'Date', labelBn: 'তারিখ', value: (row) => formatDateTime(row.createdAt) },
          { labelEn: 'Source', labelBn: 'উৎস', value: (row) => humanize(row.source) },
          { labelEn: 'Type', labelBn: 'ধরন', value: (row) => humanize(row.type) },
          { labelEn: 'Description', labelBn: 'বিবরণ', value: (row) => row.description || 'N/A' },
          { labelEn: 'Amount', labelBn: 'পরিমাণ', value: (row) => formatCurrency(row.amount) },
          { labelEn: 'Payment Method', labelBn: 'পেমেন্ট মাধ্যম', value: (row) => humanize(row.paymentMethod) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) },
          { labelEn: 'Handled By', labelBn: 'পরিচালক', value: (row) => row.handledBy || 'N/A' }
        ],
        summaryCards: [
          { labelEn: 'Customer Name', labelBn: 'গ্রাহকের নাম', value: customer.name || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: customer.phone || 'N/A' },
          { labelEn: 'Current Due', labelBn: 'বর্তমান বকেয়া', value: formatCurrency(customer.dueAmount) },
          { labelEn: 'Ledger Entries', labelBn: 'খাতা এন্ট্রি', value: records.length }
        ],
        filters: buildFilterList([
          { labelEn: 'Business', labelBn: 'ব্যবসা', value: customer.businessName },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: humanize(customer.customerStatus) }
        ])
      };
    }
  },
  staff: {
    titleEn: 'Staff Report',
    titleBn: 'স্টাফ রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {
        role: 'staff',
        ...buildUserSearch(query.search)
      };

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await User.find(mongoQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Employee ID', labelBn: 'কর্মী আইডি', value: (row) => row.employeeId || 'N/A' },
          { labelEn: 'Name', labelBn: 'নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.phone || 'N/A' },
          { labelEn: 'Email', labelBn: 'ইমেইল', value: (row) => row.email || 'N/A' },
          { labelEn: 'Salary', labelBn: 'বেতন', value: (row) => formatCurrency(row.salary) },
          { labelEn: 'Joining Date', labelBn: 'যোগদানের তারিখ', value: (row) => formatDate(row.joiningDate) },
          { labelEn: 'Address', labelBn: 'ঠিকানা', value: (row) => row.address || 'N/A' },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Staff', labelBn: 'মোট স্টাফ', value: records.length },
          { labelEn: 'Active Staff', labelBn: 'সক্রিয় স্টাফ', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Monthly Salary Base', labelBn: 'মোট মূল বেতন', value: formatCurrency(sumBy(records, (row) => row.salary)) }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  teachers: {
    titleEn: 'Teachers Report',
    titleBn: 'শিক্ষক রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {
        role: 'teacher',
        ...buildUserSearch(query.search)
      };

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await User.find(mongoQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Employee ID', labelBn: 'শিক্ষক আইডি', value: (row) => row.employeeId || 'N/A' },
          { labelEn: 'Name', labelBn: 'নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Email', labelBn: 'ইমেইল', value: (row) => row.email || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.phone || 'N/A' },
          { labelEn: 'Qualification', labelBn: 'যোগ্যতা', value: (row) => row.qualification || 'N/A' },
          { labelEn: 'Specialization', labelBn: 'বিশেষায়ন', value: (row) => row.specialization || 'N/A' },
          { labelEn: 'Salary', labelBn: 'বেতন', value: (row) => formatCurrency(row.salary) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Teachers', labelBn: 'মোট শিক্ষক', value: records.length },
          { labelEn: 'Active Teachers', labelBn: 'সক্রিয় শিক্ষক', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Salary Base', labelBn: 'মোট মূল বেতন', value: formatCurrency(sumBy(records, (row) => row.salary)) }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  'service-sales': {
    titleEn: 'Service Sales Report',
    titleBn: 'সার্ভিস বিক্রয় রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.paymentStatus) {
        mongoQuery.paymentStatus = query.paymentStatus;
      }

      if (query.customerId) {
        mongoQuery.customer = query.customerId;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await ServiceSale.find(mongoQuery)
        .populate('handledBy', 'name')
        .populate('customer', 'name phone')
        .populate('service', 'name category')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Date', labelBn: 'তারিখ', value: (row) => formatDate(row.createdAt) },
          { labelEn: 'Service', labelBn: 'সেবা', value: (row) => row.serviceName || row.service?.name || 'N/A' },
          { labelEn: 'Customer', labelBn: 'গ্রাহক', value: (row) => row.customerName || row.customer?.name || 'Walk-in' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.customerPhone || row.customer?.phone || 'N/A' },
          { labelEn: 'Quantity', labelBn: 'পরিমাণ', value: (row) => row.quantity || 0 },
          { labelEn: 'Total', labelBn: 'মোট', value: (row) => formatCurrency(row.totalAmount) },
          { labelEn: 'Paid', labelBn: 'পরিশোধ', value: (row) => formatCurrency(row.paidAmount) },
          { labelEn: 'Due', labelBn: 'বকেয়া', value: (row) => formatCurrency(row.dueAmount) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.paymentStatus) },
          { labelEn: 'Handled By', labelBn: 'পরিচালক', value: (row) => row.handledBy?.name || 'N/A' }
        ],
        summaryCards: [
          { labelEn: 'Total Orders', labelBn: 'মোট অর্ডার', value: records.length },
          { labelEn: 'Sales Amount', labelBn: 'মোট বিক্রয়', value: formatCurrency(sumBy(records, (row) => row.totalAmount)) },
          { labelEn: 'Collected', labelBn: 'আদায়', value: formatCurrency(sumBy(records, (row) => row.paidAmount)) },
          { labelEn: 'Outstanding Due', labelBn: 'বাকি বকেয়া', value: formatCurrency(sumBy(records, (row) => row.dueAmount)) }
        ],
        filters: buildFilterList([
          { labelEn: 'Payment Status', labelBn: 'পেমেন্ট অবস্থা', value: humanize(query.paymentStatus) },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  transactions: {
    titleEn: 'Transactions Report',
    titleBn: 'লেনদেন রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.type) {
        mongoQuery.type = query.type;
      }

      if (query.category) {
        mongoQuery.category = new RegExp(query.category, 'i');
      }

      if (query.paymentMethod) {
        mongoQuery.paymentMethod = query.paymentMethod;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Transaction.find(mongoQuery)
        .populate('handledBy', 'name')
        .populate('customerRef', 'name phone')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Date', labelBn: 'তারিখ', value: (row) => formatDateTime(row.createdAt) },
          { labelEn: 'Type', labelBn: 'ধরন', value: (row) => humanize(row.type) },
          { labelEn: 'Title', labelBn: 'শিরোনাম', value: (row) => row.title || row.description || 'N/A' },
          { labelEn: 'Category', labelBn: 'ক্যাটাগরি', value: (row) => row.category || 'N/A' },
          { labelEn: 'Customer', labelBn: 'গ্রাহক', value: (row) => row.customerRef?.name || 'N/A' },
          { labelEn: 'Amount', labelBn: 'পরিমাণ', value: (row) => formatCurrency(row.amount) },
          { labelEn: 'Payment Method', labelBn: 'পেমেন্ট মাধ্যম', value: (row) => humanize(row.paymentMethod) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) },
          { labelEn: 'Handled By', labelBn: 'পরিচালক', value: (row) => row.handledBy?.name || 'N/A' }
        ],
        summaryCards: [
          { labelEn: 'Total Transactions', labelBn: 'মোট লেনদেন', value: records.length },
          { labelEn: 'Total Amount', labelBn: 'মোট পরিমাণ', value: formatCurrency(sumBy(records, (row) => row.amount)) },
          { labelEn: 'Revenue Entries', labelBn: 'আয় এন্ট্রি', value: records.filter((row) => row.type === 'revenue').length },
          { labelEn: 'Expense Entries', labelBn: 'খরচ এন্ট্রি', value: records.filter((row) => row.type === 'expense').length }
        ],
        filters: buildFilterList([
          { labelEn: 'Type', labelBn: 'ধরন', value: humanize(query.type) },
          { labelEn: 'Category', labelBn: 'ক্যাটাগরি', value: query.category },
          { labelEn: 'Payment Method', labelBn: 'পেমেন্ট মাধ্যম', value: humanize(query.paymentMethod) },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  attendance: {
    titleEn: 'Attendance Report',
    titleBn: 'উপস্থিতি রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.employeeId) {
        mongoQuery.employee = query.employeeId;
      } else if (query.role) {
        const employees = await User.find({ role: query.role }).select('_id').lean();
        mongoQuery.employee = { $in: employees.map((employee) => employee._id) };
      }

      applyDateRange(mongoQuery, 'date', query.startDate, query.endDate);

      const records = await Attendance.find(mongoQuery)
        .populate('employee', 'name employeeId')
        .sort({ date: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Date', labelBn: 'তারিখ', value: (row) => formatDate(row.date) },
          { labelEn: 'Employee ID', labelBn: 'কর্মী আইডি', value: (row) => row.employee?.employeeId || 'N/A' },
          { labelEn: 'Employee Name', labelBn: 'কর্মীর নাম', value: (row) => row.employee?.name || 'N/A' },
          { labelEn: 'Check In', labelBn: 'চেক ইন', value: (row) => row.checkIn ? formatDateTime(row.checkIn) : 'N/A' },
          { labelEn: 'Check Out', labelBn: 'চেক আউট', value: (row) => row.checkOut ? formatDateTime(row.checkOut) : 'N/A' },
          { labelEn: 'Working Hours', labelBn: 'কাজের সময়', value: (row) => formatHours(row.netWorkingHours) },
          { labelEn: 'Break Time', labelBn: 'বিরতির সময়', value: (row) => formatHours(row.totalBreakTime) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) }
        ],
        summaryCards: [
          { labelEn: 'Total Records', labelBn: 'মোট রেকর্ড', value: records.length },
          { labelEn: 'Present', labelBn: 'উপস্থিত', value: records.filter((row) => ['present', 'checked_out', 'on_break'].includes(row.status)).length },
          { labelEn: 'Checked Out', labelBn: 'চেক আউট', value: records.filter((row) => row.status === 'checked_out').length },
          { labelEn: 'Total Net Hours', labelBn: 'মোট কাজের সময়', value: formatHours(sumBy(records, (row) => row.netWorkingHours)) }
        ],
        filters: buildFilterList([
          { labelEn: 'Role', labelBn: 'ভূমিকা', value: humanize(query.role) },
          { labelEn: 'Employee ID', labelBn: 'কর্মী', value: query.employeeId },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  salaries: {
    titleEn: 'Salary Report',
    titleBn: 'বেতন রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.employeeId) {
        mongoQuery.employee = query.employeeId;
      }

      if (query.month) {
        mongoQuery.month = Number(query.month);
      }

      if (query.year) {
        mongoQuery.year = Number(query.year);
      }

      if (query.status) {
        mongoQuery.status = query.status;
      }

      if (query.role) {
        const employees = await User.find({ role: query.role }).select('_id').lean();
        mongoQuery.employee = mongoQuery.employee || { $in: employees.map((employee) => employee._id) };
      }

      const records = await Salary.find(mongoQuery)
        .populate('employee', 'name employeeId')
        .sort({ year: -1, month: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Employee ID', labelBn: 'কর্মী আইডি', value: (row) => row.employee?.employeeId || 'N/A' },
          { labelEn: 'Employee Name', labelBn: 'কর্মীর নাম', value: (row) => row.employee?.name || 'N/A' },
          { labelEn: 'Period', labelBn: 'সময়সীমা', value: (row) => `${monthLabels[row.month] || row.month} ${row.year}` },
          { labelEn: 'Base Salary', labelBn: 'মূল বেতন', value: (row) => formatCurrency(row.baseSalary) },
          { labelEn: 'Bonus', labelBn: 'বোনাস', value: (row) => formatCurrency(row.bonus) },
          { labelEn: 'Deduction', labelBn: 'কর্তন', value: (row) => formatCurrency(row.deductions) },
          { labelEn: 'Total', labelBn: 'মোট', value: (row) => formatCurrency(row.totalAmount) },
          { labelEn: 'Paid', labelBn: 'পরিশোধ', value: (row) => formatCurrency(row.paidAmount) },
          { labelEn: 'Due', labelBn: 'বকেয়া', value: (row) => formatCurrency(row.dueAmount) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) }
        ],
        summaryCards: [
          { labelEn: 'Salary Records', labelBn: 'বেতন রেকর্ড', value: records.length },
          { labelEn: 'Total Salary', labelBn: 'মোট বেতন', value: formatCurrency(sumBy(records, (row) => row.totalAmount)) },
          { labelEn: 'Total Paid', labelBn: 'মোট পরিশোধ', value: formatCurrency(sumBy(records, (row) => row.paidAmount)) },
          { labelEn: 'Total Due', labelBn: 'মোট বকেয়া', value: formatCurrency(sumBy(records, (row) => row.dueAmount)) }
        ],
        filters: buildFilterList([
          { labelEn: 'Role', labelBn: 'ভূমিকা', value: humanize(query.role) },
          { labelEn: 'Employee ID', labelBn: 'কর্মী', value: query.employeeId },
          { labelEn: 'Month', labelBn: 'মাস', value: query.month ? monthLabels[Number(query.month)] || query.month : '' },
          { labelEn: 'Year', labelBn: 'বছর', value: query.year },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: humanize(query.status) }
        ])
      };
    }
  },
  'student-fees': {
    titleEn: 'Student Fees Report',
    titleBn: 'শিক্ষার্থী ফি রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.status) {
        mongoQuery.status = query.status;
      }

      if (query.batchId) {
        mongoQuery.batch = query.batchId;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await StudentFee.find(mongoQuery)
        .populate('student', 'name nameEnglish studentId phone mobile')
        .populate('batch', 'name course')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Student ID', labelBn: 'শিক্ষার্থী আইডি', value: (row) => row.student?.studentId || 'N/A' },
          { labelEn: 'Student Name', labelBn: 'শিক্ষার্থীর নাম', value: (row) => row.student?.nameEnglish || row.student?.name || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.student?.mobile || row.student?.phone || 'N/A' },
          { labelEn: 'Batch', labelBn: 'ব্যাচ', value: (row) => row.batch?.name || 'N/A' },
          { labelEn: 'Course', labelBn: 'কোর্স', value: (row) => row.course || row.batch?.course || 'N/A' },
          { labelEn: 'Total Fee', labelBn: 'মোট ফি', value: (row) => formatCurrency(row.totalFee) },
          { labelEn: 'Paid', labelBn: 'পরিশোধ', value: (row) => formatCurrency(row.paidAmount) },
          { labelEn: 'Due', labelBn: 'বকেয়া', value: (row) => formatCurrency(row.dueAmount) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) }
        ],
        summaryCards: [
          { labelEn: 'Fee Records', labelBn: 'ফি রেকর্ড', value: records.length },
          { labelEn: 'Total Fees', labelBn: 'মোট ফি', value: formatCurrency(sumBy(records, (row) => row.totalFee)) },
          { labelEn: 'Collected', labelBn: 'আদায়', value: formatCurrency(sumBy(records, (row) => row.paidAmount)) },
          { labelEn: 'Outstanding', labelBn: 'অপরিশোধিত', value: formatCurrency(sumBy(records, (row) => row.dueAmount)) }
        ],
        filters: buildFilterList([
          { labelEn: 'Status', labelBn: 'অবস্থা', value: humanize(query.status) },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  registrations: {
    titleEn: 'Applications Report',
    titleBn: 'আবেদন রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.status) {
        mongoQuery.status = query.status;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Registration.find(mongoQuery)
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Name (English)', labelBn: 'নাম (ইংরেজি)', value: (row) => row.nameEnglish || 'N/A' },
          { labelEn: 'Name (Bangla)', labelBn: 'নাম (বাংলা)', value: (row) => row.nameBangla || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.mobile || 'N/A' },
          { labelEn: 'Guardian Phone', labelBn: 'অভিভাবকের ফোন', value: (row) => row.guardianMobile || 'N/A' },
          { labelEn: 'Gender', labelBn: 'লিঙ্গ', value: (row) => humanize(row.gender) },
          { labelEn: 'NID/Birth', labelBn: 'এনআইডি/জন্ম', value: (row) => row.nidOrBirth || 'N/A' },
          { labelEn: 'Applied On', labelBn: 'আবেদনের তারিখ', value: (row) => formatDate(row.createdAt) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) }
        ],
        summaryCards: [
          { labelEn: 'Total Applications', labelBn: 'মোট আবেদন', value: records.length },
          { labelEn: 'Pending', labelBn: 'অপেক্ষমাণ', value: records.filter((row) => row.status === 'pending').length },
          { labelEn: 'Approved', labelBn: 'অনুমোদিত', value: records.filter((row) => row.status === 'approved').length },
          { labelEn: 'Rejected', labelBn: 'বাতিল', value: records.filter((row) => row.status === 'rejected').length }
        ],
        filters: buildFilterList([
          { labelEn: 'Status', labelBn: 'অবস্থা', value: humanize(query.status) },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  'mfs-transactions': {
    titleEn: 'MFS Transactions Report',
    titleBn: 'এমএফএস লেনদেন রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.status) {
        mongoQuery.status = query.status;
      }

      if (query.transactionType) {
        mongoQuery.transactionType = query.transactionType;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      let records = await MFSTransaction.find(mongoQuery)
        .populate('mfsAccount', 'accountName accountNumber type')
        .populate('handledBy', 'name')
        .sort({ createdAt: -1 })
        .lean();

      if (query.provider) {
        records = records.filter((row) => row.mfsAccount?.provider === query.provider);
      }

      return {
        records,
        columns: [
          { labelEn: 'Date', labelBn: 'তারিখ', value: (row) => formatDateTime(row.createdAt) },
          { labelEn: 'Type', labelBn: 'ধরন', value: (row) => humanize(row.transactionType) },
          { labelEn: 'Account', labelBn: 'অ্যাকাউন্ট', value: (row) => row.mfsAccount?.accountName || 'N/A' },
          { labelEn: 'Account Number', labelBn: 'অ্যাকাউন্ট নম্বর', value: (row) => row.mfsAccount?.accountNumber || 'N/A' },
          { labelEn: 'Customer Name', labelBn: 'গ্রাহকের নাম', value: (row) => row.customerName || 'N/A' },
          { labelEn: 'Customer Phone', labelBn: 'গ্রাহকের ফোন', value: (row) => row.customerPhone || 'N/A' },
          { labelEn: 'Amount', labelBn: 'পরিমাণ', value: (row) => formatCurrency(row.amount) },
          { labelEn: 'Commission', labelBn: 'কমিশন', value: (row) => formatCurrency(row.commission) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => humanize(row.status) },
          { labelEn: 'Handled By', labelBn: 'পরিচালক', value: (row) => row.handledBy?.name || 'N/A' }
        ],
        summaryCards: [
          { labelEn: 'Total Transactions', labelBn: 'মোট লেনদেন', value: records.length },
          { labelEn: 'Transaction Volume', labelBn: 'মোট ভলিউম', value: formatCurrency(sumBy(records, (row) => row.amount)) },
          { labelEn: 'Commission', labelBn: 'মোট কমিশন', value: formatCurrency(sumBy(records, (row) => row.commission)) },
          { labelEn: 'Completed', labelBn: 'সম্পন্ন', value: records.filter((row) => row.status === 'completed').length }
        ],
        filters: buildFilterList([
          { labelEn: 'Transaction Type', labelBn: 'লেনদেন ধরন', value: humanize(query.transactionType) },
          { labelEn: 'Provider', labelBn: 'প্রোভাইডার', value: humanize(query.provider) },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: humanize(query.status) },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  'mfs-accounts': {
    titleEn: 'MFS Accounts Report',
    titleBn: 'এমএফএস অ্যাকাউন্ট রিপোর্ট',
    landscape: true,
    fetcher: async () => {
      const records = await require('../models/MFSAccount').find()
        .sort({ provider: 1, accountType: 1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Provider', labelBn: 'প্রোভাইডার', value: (row) => humanize(row.provider) },
          { labelEn: 'Account Type', labelBn: 'অ্যাকাউন্ট ধরন', value: (row) => humanize(row.accountType) },
          { labelEn: 'Account Number', labelBn: 'অ্যাকাউন্ট নম্বর', value: (row) => row.accountNumber || 'N/A' },
          { labelEn: 'Account Name', labelBn: 'অ্যাকাউন্টের নাম', value: (row) => row.accountName || 'N/A' },
          { labelEn: 'Balance', labelBn: 'ব্যালেন্স', value: (row) => formatCurrency(row.balance) },
          { labelEn: 'Active', labelBn: 'সক্রিয়', value: (row) => (row.isActive ? 'Yes' : 'No') }
        ],
        summaryCards: [
          { labelEn: 'Total Accounts', labelBn: 'মোট অ্যাকাউন্ট', value: records.length },
          { labelEn: 'Active Accounts', labelBn: 'সক্রিয় অ্যাকাউন্ট', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Total Balance', labelBn: 'মোট ব্যালেন্স', value: formatCurrency(sumBy(records, (row) => row.balance)) }
        ],
        filters: []
      };
    }
  },
  batches: {
    titleEn: 'Batches Report',
    titleBn: 'ব্যাচ রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.isActive === 'true') {
        mongoQuery.isActive = true;
      } else if (query.isActive === 'false') {
        mongoQuery.isActive = false;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Batch.find(mongoQuery)
        .populate('teacher', 'name employeeId')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Batch Name', labelBn: 'ব্যাচের নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Course', labelBn: 'কোর্স', value: (row) => row.course || 'N/A' },
          { labelEn: 'Teacher', labelBn: 'শিক্ষক', value: (row) => row.teacher?.name || 'N/A' },
          { labelEn: 'Start Date', labelBn: 'শুরুর তারিখ', value: (row) => formatDate(row.startDate) },
          { labelEn: 'End Date', labelBn: 'শেষ তারিখ', value: (row) => formatDate(row.endDate) },
          { labelEn: 'Students', labelBn: 'শিক্ষার্থী', value: (row) => Array.isArray(row.students) ? row.students.length : 0 },
          { labelEn: 'Max Students', labelBn: 'সর্বোচ্চ শিক্ষার্থী', value: (row) => row.maxStudents || 0 },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Batches', labelBn: 'মোট ব্যাচ', value: records.length },
          { labelEn: 'Active Batches', labelBn: 'সক্রিয় ব্যাচ', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Total Students In Batches', labelBn: 'ব্যাচে মোট শিক্ষার্থী', value: sumBy(records, (row) => Array.isArray(row.students) ? row.students.length : 0) }
        ],
        filters: buildFilterList([
          { labelEn: 'Active Status', labelBn: 'সক্রিয় অবস্থা', value: query.isActive === 'true' ? 'Active' : query.isActive === 'false' ? 'Inactive' : '' },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  services: {
    titleEn: 'Services Report',
    titleBn: 'সার্ভিস রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.search) {
        mongoQuery.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { category: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } },
          { notes: { $regex: query.search, $options: 'i' } }
        ];
      }

      if (query.isActive === 'true') {
        mongoQuery.isActive = true;
      } else if (query.isActive === 'false') {
        mongoQuery.isActive = false;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Service.find(mongoQuery)
        .sort({ category: 1, name: 1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Service Name', labelBn: 'সার্ভিসের নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Category', labelBn: 'ক্যাটাগরি', value: (row) => humanize(row.category) },
          { labelEn: 'Price', labelBn: 'মূল্য', value: (row) => formatCurrency(row.price) },
          { labelEn: 'Max Price', labelBn: 'সর্বোচ্চ মূল্য', value: (row) => row.maxPrice ? formatCurrency(row.maxPrice) : 'N/A' },
          { labelEn: 'Unit', labelBn: 'একক', value: (row) => humanize(row.unit) },
          { labelEn: 'Description', labelBn: 'বিবরণ', value: (row) => row.description || 'N/A' },
          { labelEn: 'Notes', labelBn: 'নোট', value: (row) => row.notes || 'N/A' },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Services', labelBn: 'মোট সার্ভিস', value: records.length },
          { labelEn: 'Active Services', labelBn: 'সক্রিয় সার্ভিস', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Inactive Services', labelBn: 'নিষ্ক্রিয় সার্ভিস', value: records.filter((row) => !row.isActive).length },
          { labelEn: 'Categories', labelBn: 'ক্যাটাগরি', value: new Set(records.map((row) => row.category).filter(Boolean)).size }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'Active Status', labelBn: 'সক্রিয় অবস্থা', value: query.isActive === 'true' ? 'Active' : query.isActive === 'false' ? 'Inactive' : '' },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  notices: {
    titleEn: 'Notices Report',
    titleBn: 'নোটিশ রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.priority) {
        mongoQuery.priority = query.priority;
      }

      if (query.category) {
        mongoQuery.category = query.category;
      }

      if (query.recipients) {
        mongoQuery.recipients = query.recipients;
      }

      if (query.isPublic === 'true') {
        mongoQuery.isPublic = true;
      } else if (query.isPublic === 'false') {
        mongoQuery.isPublic = false;
      }

      if (query.search) {
        mongoQuery.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { message: { $regex: query.search, $options: 'i' } }
        ];
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Notice.find(mongoQuery)
        .populate('sentBy', 'name')
        .populate('targetBatch', 'name')
        .populate('targetStudent', 'name studentId')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Date', labelBn: 'তারিখ', value: (row) => formatDateTime(row.createdAt) },
          { labelEn: 'Title', labelBn: 'শিরোনাম', value: (row) => row.title || 'N/A' },
          { labelEn: 'Priority', labelBn: 'অগ্রাধিকার', value: (row) => humanize(row.priority) },
          { labelEn: 'Category', labelBn: 'ক্যাটাগরি', value: (row) => humanize(row.category) },
          { labelEn: 'Recipients', labelBn: 'প্রাপক', value: (row) => humanize(row.recipients) },
          {
            labelEn: 'Target',
            labelBn: 'লক্ষ্য',
            value: (row) => row.targetBatch?.name || row.targetStudent?.name || (row.isPublic ? 'Public' : 'All Students')
          },
          { labelEn: 'Message', labelBn: 'বার্তা', value: (row) => stripHtml(row.message) },
          { labelEn: 'Sent By', labelBn: 'প্রেরক', value: (row) => row.sentBy?.name || 'N/A' },
          { labelEn: 'Public', labelBn: 'সর্বজনীন', value: (row) => (row.isPublic ? 'Yes' : 'No') },
          { labelEn: 'Read Count', labelBn: 'পঠিত সংখ্যা', value: (row) => Array.isArray(row.readBy) ? row.readBy.length : 0 }
        ],
        summaryCards: [
          { labelEn: 'Total Notices', labelBn: 'মোট নোটিশ', value: records.length },
          { labelEn: 'Urgent', labelBn: 'জরুরি', value: records.filter((row) => row.priority === 'urgent').length },
          { labelEn: 'Public Notices', labelBn: 'পাবলিক নোটিশ', value: records.filter((row) => row.isPublic).length },
          { labelEn: 'Read Marks', labelBn: 'পঠিত চিহ্ন', value: sumBy(records, (row) => Array.isArray(row.readBy) ? row.readBy.length : 0) }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'Priority', labelBn: 'অগ্রাধিকার', value: humanize(query.priority) },
          { labelEn: 'Category', labelBn: 'ক্যাটাগরি', value: humanize(query.category) },
          { labelEn: 'Recipients', labelBn: 'প্রাপক', value: humanize(query.recipients) },
          { labelEn: 'Public Status', labelBn: 'পাবলিক অবস্থা', value: query.isPublic === 'true' ? 'Public' : query.isPublic === 'false' ? 'Private' : '' },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  team: {
    titleEn: 'Team Report',
    titleBn: 'টিম রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.search) {
        mongoQuery.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { position: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } },
          { phone: { $regex: query.search, $options: 'i' } }
        ];
      }

      if (query.isActive === 'true') {
        mongoQuery.isActive = true;
      } else if (query.isActive === 'false') {
        mongoQuery.isActive = false;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Team.find(mongoQuery)
        .sort({ order: 1, createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Name', labelBn: 'নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Position', labelBn: 'পদবি', value: (row) => row.position || 'N/A' },
          { labelEn: 'Experience', labelBn: 'অভিজ্ঞতা', value: (row) => row.experience || 'N/A' },
          { labelEn: 'Phone', labelBn: 'ফোন', value: (row) => row.phone || 'N/A' },
          { labelEn: 'Email', labelBn: 'ইমেইল', value: (row) => row.email || 'N/A' },
          { labelEn: 'Education', labelBn: 'শিক্ষা', value: (row) => Array.isArray(row.education) && row.education.length ? row.education.join(', ') : 'N/A' },
          { labelEn: 'Skills', labelBn: 'দক্ষতা', value: (row) => Array.isArray(row.skills) && row.skills.length ? row.skills.join(', ') : 'N/A' },
          { labelEn: 'Order', labelBn: 'ক্রম', value: (row) => row.order ?? 0 },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Members', labelBn: 'মোট সদস্য', value: records.length },
          { labelEn: 'Active Members', labelBn: 'সক্রিয় সদস্য', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Inactive Members', labelBn: 'নিষ্ক্রিয় সদস্য', value: records.filter((row) => !row.isActive).length },
          { labelEn: 'Unique Positions', labelBn: 'ভিন্ন পদবি', value: new Set(records.map((row) => row.position).filter(Boolean)).size }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'Active Status', labelBn: 'সক্রিয় অবস্থা', value: query.isActive === 'true' ? 'Active' : query.isActive === 'false' ? 'Inactive' : '' },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  blogs: {
    titleEn: 'Blogs Report',
    titleBn: 'ব্লগ রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.published === 'true') {
        mongoQuery.published = true;
      } else if (query.published === 'false') {
        mongoQuery.published = false;
      }

      if (query.search) {
        mongoQuery.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { content: { $regex: query.search, $options: 'i' } },
          { tags: { $elemMatch: { $regex: query.search, $options: 'i' } } }
        ];
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Blog.find(mongoQuery)
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Title', labelBn: 'শিরোনাম', value: (row) => row.title || 'N/A' },
          { labelEn: 'Author', labelBn: 'লেখক', value: (row) => row.author?.name || 'N/A' },
          { labelEn: 'Tags', labelBn: 'ট্যাগ', value: (row) => Array.isArray(row.tags) && row.tags.length ? row.tags.join(', ') : 'N/A' },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.published ? 'Published' : 'Draft') },
          { labelEn: 'Created On', labelBn: 'তৈরির তারিখ', value: (row) => formatDate(row.createdAt) },
          { labelEn: 'Published On', labelBn: 'প্রকাশের তারিখ', value: (row) => formatDate(row.publishedAt) },
          { labelEn: 'Content Preview', labelBn: 'কনটেন্ট সারাংশ', value: (row) => stripHtml(row.content) }
        ],
        summaryCards: [
          { labelEn: 'Total Blogs', labelBn: 'মোট ব্লগ', value: records.length },
          { labelEn: 'Published', labelBn: 'প্রকাশিত', value: records.filter((row) => row.published).length },
          { labelEn: 'Drafts', labelBn: 'খসড়া', value: records.filter((row) => !row.published).length },
          { labelEn: 'Tagged Blogs', labelBn: 'ট্যাগসহ ব্লগ', value: records.filter((row) => Array.isArray(row.tags) && row.tags.length).length }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'Published Status', labelBn: 'প্রকাশ অবস্থা', value: query.published === 'true' ? 'Published' : query.published === 'false' ? 'Draft' : '' },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  },
  reviews: {
    titleEn: 'Reviews Report',
    titleBn: 'রিভিউ রিপোর্ট',
    landscape: true,
    fetcher: async (query) => {
      const mongoQuery = {};

      if (query.search) {
        mongoQuery.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { position: { $regex: query.search, $options: 'i' } },
          { comment: { $regex: query.search, $options: 'i' } }
        ];
      }

      if (query.rating) {
        mongoQuery.rating = Number(query.rating);
      }

      if (query.isActive === 'true') {
        mongoQuery.isActive = true;
      } else if (query.isActive === 'false') {
        mongoQuery.isActive = false;
      }

      applyDateRange(mongoQuery, 'createdAt', query.startDate, query.endDate);

      const records = await Review.find(mongoQuery)
        .sort({ order: 1, createdAt: -1 })
        .lean();

      return {
        records,
        columns: [
          { labelEn: 'Name', labelBn: 'নাম', value: (row) => row.name || 'N/A' },
          { labelEn: 'Position', labelBn: 'পদবি', value: (row) => row.position || 'N/A' },
          { labelEn: 'Rating', labelBn: 'রেটিং', value: (row) => `${row.rating || 0}/5` },
          { labelEn: 'Comment', labelBn: 'মন্তব্য', value: (row) => row.comment || 'N/A' },
          { labelEn: 'Order', labelBn: 'ক্রম', value: (row) => row.order ?? 0 },
          { labelEn: 'Status', labelBn: 'অবস্থা', value: (row) => (row.isActive ? 'Active' : 'Inactive') }
        ],
        summaryCards: [
          { labelEn: 'Total Reviews', labelBn: 'মোট রিভিউ', value: records.length },
          { labelEn: 'Active Reviews', labelBn: 'সক্রিয় রিভিউ', value: records.filter((row) => row.isActive).length },
          { labelEn: 'Average Rating', labelBn: 'গড় রেটিং', value: records.length ? (sumBy(records, (row) => row.rating) / records.length).toFixed(1) : '0.0' },
          { labelEn: 'Five Star', labelBn: 'পাঁচ তারকা', value: records.filter((row) => Number(row.rating) === 5).length }
        ],
        filters: buildFilterList([
          { labelEn: 'Search', labelBn: 'অনুসন্ধান', value: query.search },
          { labelEn: 'Rating', labelBn: 'রেটিং', value: query.rating },
          { labelEn: 'Active Status', labelBn: 'সক্রিয় অবস্থা', value: query.isActive === 'true' ? 'Active' : query.isActive === 'false' ? 'Inactive' : '' },
          { labelEn: 'From Date', labelBn: 'শুরুর তারিখ', value: query.startDate },
          { labelEn: 'To Date', labelBn: 'শেষ তারিখ', value: query.endDate }
        ])
      };
    }
  }
};

const getDatasetExport = async (dataset, query = {}) => {
  const definition = datasetDefinitions[dataset];

  if (!definition) {
    const supportedDatasets = Object.keys(datasetDefinitions).join(', ');
    const error = new Error(`Unsupported export dataset. Supported datasets: ${supportedDatasets}`);
    error.statusCode = 400;
    throw error;
  }

  const data = await definition.fetcher(query);
  const titleEn = data.titleEn || definition.titleEn;
  const titleBn = data.titleBn || definition.titleBn;

  return {
    titleEn,
    titleBn,
    landscape: Boolean(definition.landscape),
    html: renderHtml({
      titleEn,
      titleBn,
      summaryCards: data.summaryCards || [],
      filters: data.filters || [],
      columns: data.columns || [],
      records: data.records || []
    })
  };
};

const getExportFilename = (dataset) => {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${dataset}-${stamp}.pdf`;
};

module.exports = {
  APP_NAME_EN,
  APP_NAME_BN,
  monthLabels,
  humanize,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatHours,
  sumBy,
  applyDateRange,
  buildUserSearch,
  buildFilterList,
  renderHtml,
  getDatasetExport,
  getExportFilename
};
