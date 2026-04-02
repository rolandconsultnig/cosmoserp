/**
 * @typedef {Object} SubFeatureGroup
 * @property {string} title
 * @property {string[]} items
 */

/**
 * @typedef {Object} AccountingSubfeatureCatalog
 * @property {SubFeatureGroup[]} ap
 * @property {SubFeatureGroup[]} ar
 * @property {SubFeatureGroup[]} budgets
 */

/** @type {AccountingSubfeatureCatalog} */
export const ACCOUNTING_SUBFEATURES = {
  ap: [
    {
      title: 'Vendor Management',
      items: [
        'Vendor onboarding and profile setup',
        'Vendor categorization (supplier, contractor, utility, etc.)',
        'Vendor bank account and payment details',
        'Vendor credit terms and payment agreements',
        'Vendor performance history and ratings',
        'Blacklist / inactive vendor management',
      ],
    },
    {
      title: 'Invoice Management',
      items: [
        'Manual invoice entry and bulk upload',
        'Invoice scanning and OCR (auto-capture from documents)',
        'Recurring invoice setup',
        'Invoice numbering and reference tracking',
        'Multi-currency invoice handling',
        'Invoice approval routing and workflows',
        'Duplicate invoice detection',
      ],
    },
    {
      title: 'Purchase Order (PO) Matching',
      items: [
        'Two-way matching (PO vs. Invoice)',
        'Three-way matching (PO vs. Receipt vs. Invoice)',
        'Partial delivery and partial invoice matching',
        'PO amendment and revision tracking',
        'Goods received note (GRN) linkage',
      ],
    },
    {
      title: 'Payment Processing',
      items: [
        'Single and batch payment runs',
        'Scheduled and automatic payment execution',
        'Multiple payment methods (bank transfer, cheque, mobile money)',
        'Partial payments and installment tracking',
        'Early payment discounts (prompt payment incentives)',
        'Payment approval and authorization levels',
        'Payment status tracking (pending, processed, failed)',
      ],
    },
    {
      title: 'Debit Notes & Credit Notes',
      items: [
        'Raise debit notes for overcharges or returns',
        'Apply vendor credit notes to future invoices',
        'Credit note aging and expiry tracking',
      ],
    },
    {
      title: 'Prepayments & Advances',
      items: [
        'Advance payment to vendors',
        'Prepayment reconciliation against future invoices',
        'Staff imprest and petty cash advances',
      ],
    },
    {
      title: 'Aging & Reporting',
      items: [
        'AP aging report (current, 30, 60, 90+ days)',
        'Outstanding payables summary',
        'Payment due calendar and alerts',
        'Vendor statement reconciliation',
        "Cash requirement forecast (what's due and when)",
      ],
    },
    {
      title: 'Withholding Tax (WHT)',
      items: [
        'Automatic WHT deduction on vendor payments',
        'WHT credit note generation',
        'WHT remittance schedule and reports',
        'Compliance with local tax authority rules (e.g., FIRS in Nigeria)',
      ],
    },
  ],
  ar: [
    {
      title: 'Customer Management',
      items: [
        'Customer onboarding and profile setup',
        'Credit limit assignment and monitoring',
        'Customer categorization (retail, corporate, government, etc.)',
        'Customer payment history and risk scoring',
        'Customer statement generation',
      ],
    },
    {
      title: 'Invoice & Billing',
      items: [
        'Sales invoice creation and customization',
        'Proforma invoice and quotation conversion',
        'Recurring and subscription billing',
        'Invoice templates with branding (logo, color, terms)',
        'Multi-currency invoicing',
        'Bulk invoice generation',
        'Invoice delivery via email, WhatsApp, or portal',
        'E-invoicing and digital signature support',
      ],
    },
    {
      title: 'Payment Collection',
      items: [
        'Record payments against invoices (full or partial)',
        'Multiple payment channel support (bank, card, mobile money, USSD)',
        'Payment link generation for customers',
        'Auto-allocation of payments to oldest invoices',
        'Overpayment and underpayment handling',
        'Receipt generation and sharing',
      ],
    },
    {
      title: 'Credit Notes & Refunds',
      items: [
        'Issue credit notes for returns or adjustments',
        'Apply credit notes to open invoices',
        'Process customer refunds',
        'Track refund status and approvals',
      ],
    },
    {
      title: 'Dunning & Collections',
      items: [
        'Automated payment reminders (before and after due date)',
        'Escalation workflows for overdue accounts',
        'Collections team assignment and tracking',
        'Customer dispute management',
        'Payment promise tracking (customer promised to pay on X date)',
      ],
    },
    {
      title: 'Aging & Reporting',
      items: [
        'AR aging report (current, 30, 60, 90+ days)',
        'Outstanding receivables by customer or region',
        'Collection efficiency ratio',
        'Days Sales Outstanding (DSO) tracking',
        'Bad debt provisioning and write-off management',
      ],
    },
    {
      title: 'Revenue Recognition',
      items: [
        'Recognize revenue at point of sale, delivery, or milestone',
        'Deferred revenue tracking',
        'Revenue schedule management (for long-term contracts)',
      ],
    },
    {
      title: 'Customer Portal',
      items: [
        'Self-service invoice viewing and download',
        'Online payment by customers',
        'Dispute submission by customers',
        'Statement of account access',
      ],
    },
  ],
  budgets: [
    {
      title: 'Budget Setup & Structure',
      items: [
        'Annual, quarterly, or monthly budget periods',
        'Budget by department, cost center, project, or branch',
        'Top-down vs. bottom-up budget creation',
        'Budget templates and rollover from prior year',
        'Multi-level budget hierarchy (company → division → team)',
      ],
    },
    {
      title: 'Budget Entry & Approval',
      items: [
        'Line-item budget entry per account or category',
        'Budget submission by department heads',
        'Multi-level budget review and approval workflow',
        'Budget revision and amendment requests',
        'Version control (original budget vs. revised budget)',
      ],
    },
    {
      title: 'Budget Allocation',
      items: [
        'Allocate budget across months (even spread or seasonal)',
        'Re-allocate budget between departments or line items',
        'Capital vs. operational budget separation (CAPEX/OPEX)',
        'Headcount and salary budgeting',
        'Project-specific budget allocation',
      ],
    },
    {
      title: 'Budget Monitoring & Control',
      items: [
        'Real-time budget vs. actual comparison',
        'Expenditure alerts when nearing or exceeding budget',
        'Budget utilization percentage per category',
        'Committed costs tracking (POs raised but not yet invoiced)',
        'Budget freeze or lock after approval',
      ],
    },
    {
      title: 'Variance Analysis',
      items: [
        'Favorable vs. unfavorable variance identification',
        'Drill-down from variance to underlying transactions',
        'Variance commentary and narrative fields',
        'Period-over-period comparison (this month vs. last month)',
        'Year-to-date (YTD) variance tracking',
      ],
    },
    {
      title: 'Forecasting & Projections',
      items: [
        'Rolling forecasts (update forecast as year progresses)',
        'Full-year projection based on actuals to date',
        'Scenario planning (optimistic, base, pessimistic)',
        'AI-assisted trend-based forecasting',
        'What-if analysis tools',
      ],
    },
    {
      title: 'Reporting & Dashboards',
      items: [
        'Budget utilization dashboard per department',
        'Consolidated budget report (company-wide)',
        'Flash reports and management summary',
        'Export to Excel or PDF for presentations',
        'Graphical budget vs. actual charts',
      ],
    },
    {
      title: 'Cash Flow Budgeting',
      items: [
        'Weekly and monthly cash flow forecast',
        'Link AR and AP schedules to cash budget',
        'Expected inflows vs. outflows visualization',
        'Cash gap identification and early warning alerts',
      ],
    },
  ],
};
