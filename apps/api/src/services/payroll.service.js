const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { roundDecimal } = require('../utils/helpers');

// Nigerian PAYE Tax Bands (annual) - Finance Act 2020
const PAYE_BANDS = [
  { limit: 300000, rate: 0.07 },
  { limit: 300000, rate: 0.11 },
  { limit: 500000, rate: 0.15 },
  { limit: 500000, rate: 0.19 },
  { limit: 1600000, rate: 0.21 },
  { limit: Infinity, rate: 0.24 },
];

const PENSION_EMPLOYEE_RATE = 0.08;
const PENSION_EMPLOYER_RATE = 0.10;
const NHF_RATE = 0.025;
const ITF_RATE = 0.01;
const CRA_RATE = 0.20;
const CRA_FLAT = 200000;

function calculatePAYE(annualGross) {
  const pension = annualGross * PENSION_EMPLOYEE_RATE;
  const nhf = annualGross * NHF_RATE;
  const cra = Math.max(CRA_FLAT, annualGross * CRA_RATE) + pension + nhf;
  const taxableIncome = Math.max(0, annualGross - cra);

  let tax = 0;
  let remaining = taxableIncome;

  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, band.limit);
    tax += taxable * band.rate;
    remaining -= taxable;
  }

  return roundDecimal(tax);
}

function calculateMonthlyPayroll(employee) {
  const grossSalary = parseFloat(employee.grossSalary);
  const annualGross = grossSalary * 12;

  const basicSalary = roundDecimal(grossSalary * 0.50);
  const housing = roundDecimal(grossSalary * 0.25);
  const transport = roundDecimal(grossSalary * 0.15);
  const otherAllowances = roundDecimal(grossSalary - basicSalary - housing - transport);

  const annualPAYE = calculatePAYE(annualGross);
  const monthlyPAYE = roundDecimal(annualPAYE / 12);

  const employeePension = roundDecimal(grossSalary * PENSION_EMPLOYEE_RATE);
  const employerPension = roundDecimal(grossSalary * PENSION_EMPLOYER_RATE);
  const nhf = roundDecimal(grossSalary * NHF_RATE);
  const itf = roundDecimal(grossSalary * ITF_RATE);

  const totalDeductions = monthlyPAYE + employeePension + nhf;
  const netPay = roundDecimal(grossSalary - totalDeductions);

  return {
    grossSalary: roundDecimal(grossSalary),
    basicSalary,
    housing,
    transport,
    otherAllowances,
    payeeTax: monthlyPAYE,
    employeePension,
    employerPension,
    nhf,
    itf,
    otherDeductions: 0,
    netPay,
  };
}

async function processPayrollRun(tenantId, month, year, createdById) {
  const existing = await prisma.payrollRun.findUnique({
    where: { tenantId_month_year: { tenantId, month, year } },
  });
  if (existing && existing.status !== 'DRAFT') {
    throw new Error(`Payroll for ${month}/${year} already processed with status: ${existing.status}`);
  }

  const employees = await prisma.employee.findMany({
    where: { tenantId, isActive: true, employmentType: { in: ['FULL_TIME', 'PART_TIME'] } },
  });

  if (!employees.length) throw new Error('No active employees found');

  let totalGross = 0, totalPaye = 0, totalPension = 0, totalNhf = 0, totalItf = 0, totalNet = 0;
  const payslipsData = [];

  for (const emp of employees) {
    const calc = calculateMonthlyPayroll(emp);
    totalGross += calc.grossSalary;
    totalPaye += calc.payeeTax;
    totalPension += calc.employeePension;
    totalNhf += calc.nhf;
    totalItf += calc.itf;
    totalNet += calc.netPay;
    payslipsData.push({ employeeId: emp.id, ...calc });
  }

  const payrollRun = await prisma.$transaction(async (tx) => {
    const run = existing
      ? await tx.payrollRun.update({
          where: { id: existing.id },
          data: {
            status: 'PROCESSING',
            totalGross: roundDecimal(totalGross),
            totalPaye: roundDecimal(totalPaye),
            totalPension: roundDecimal(totalPension),
            totalNhf: roundDecimal(totalNhf),
            totalItf: roundDecimal(totalItf),
            totalNet: roundDecimal(totalNet),
          },
        })
      : await tx.payrollRun.create({
          data: {
            tenantId,
            period: `${year}-${String(month).padStart(2, '0')}`,
            month,
            year,
            status: 'PROCESSING',
            totalGross: roundDecimal(totalGross),
            totalPaye: roundDecimal(totalPaye),
            totalPension: roundDecimal(totalPension),
            totalNhf: roundDecimal(totalNhf),
            totalItf: roundDecimal(totalItf),
            totalNet: roundDecimal(totalNet),
            createdById,
          },
        });

    if (existing) {
      await tx.payslip.deleteMany({ where: { payrollRunId: run.id } });
    }

    await tx.payslip.createMany({
      data: payslipsData.map((p) => ({ ...p, payrollRunId: run.id })),
    });

    return run;
  });

  logger.info(`Payroll run ${payrollRun.id} processed for ${employees.length} employees`);
  return payrollRun;
}

function generateNIBSSFile(payrollRun, payslips, employees) {
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));
  const lines = ['ACCOUNT_NUMBER|ACCOUNT_NAME|BANK_CODE|AMOUNT|NARRATION'];

  for (const payslip of payslips) {
    const emp = employeeMap[payslip.employeeId];
    if (emp?.bankAccountNumber && emp?.bankSortCode) {
      lines.push(
        `${emp.bankAccountNumber}|${emp.bankAccountName || emp.firstName + ' ' + emp.lastName}|${emp.bankSortCode}|${payslip.netPay}|SALARY ${payrollRun.period}`
      );
    }
  }

  return lines.join('\n');
}

module.exports = { calculatePAYE, calculateMonthlyPayroll, processPayrollRun, generateNIBSSFile };
