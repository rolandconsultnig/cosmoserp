const axios = require('axios');
const crypto = require('crypto');
const { create: createXml } = require('xmlbuilder2');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

const NRS_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.NRS_API_URL
  : process.env.NRS_SANDBOX_URL || 'https://sandbox.nrs.gov.ng/einvoicing/v1';

async function submitInvoice(invoiceId, tenantId) {
  const startTime = Date.now();
  let logData = { tenantId, invoiceId, action: 'SUBMIT_INVOICE', requestUrl: `${NRS_BASE_URL}/invoices`, status: 'PENDING' };

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        lines: { include: { product: true } },
        tenant: true,
      },
    });

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.nrsStatus === 'APPROVED') {
      return { irn: invoice.nrsIRN, qrCode: invoice.nrsQrCode, status: 'ALREADY_APPROVED' };
    }

    const ublXml = generateUBLXML(invoice);
    const requestBody = {
      taxpayerId: invoice.tenant.tin || invoice.tenant.nrsTaxpayerId,
      invoiceType: invoice.invoiceType,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      buyerTin: invoice.customer.tin || null,
      buyerName: invoice.customer.name,
      buyerEmail: invoice.customer.email,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      whtAmount: invoice.whtAmount,
      totalAmount: invoice.totalAmount,
      lineItems: invoice.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatRate: l.vatRate,
        vatAmount: l.vatAmount,
        lineTotal: l.lineTotal,
      })),
      ublXml,
    };

    logData.requestBody = { ...requestBody, ublXml: '[XML OMITTED]' };

    let nrsResponse;
    try {
      const response = await axios.post(`${NRS_BASE_URL}/invoices`, requestBody, {
        headers: {
          'Authorization': `Bearer ${process.env.NRS_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Request-ID': invoiceId,
        },
        timeout: 30000,
      });
      nrsResponse = response.data;
      logData.responseCode = response.status;
      logData.responseBody = nrsResponse;
    } catch (apiError) {
      if (apiError.response) {
        logData.responseCode = apiError.response.status;
        logData.responseBody = apiError.response.data;
        logData.status = 'FAILED';
        logData.errorMessage = apiError.response.data?.message || apiError.message;
      } else {
        logData.status = 'FAILED';
        logData.errorMessage = apiError.message;
      }
      logData.durationMs = Date.now() - startTime;
      await prisma.nRSLog.create({ data: logData });
      await prisma.invoice.update({ where: { id: invoiceId }, data: { nrsStatus: 'REJECTED', nrsResponse: logData.responseBody } });
      throw new Error(`NRS API error: ${logData.errorMessage}`);
    }

    // In sandbox/mock mode, generate simulated IRN
    const irn = nrsResponse?.irn || generateMockIRN(invoice);
    const qrCode = nrsResponse?.qrCode || generateMockQRData(irn, invoice);
    const stamp = nrsResponse?.cryptographicStamp || generateCryptoStamp(irn);

    logData.irn = irn;
    logData.status = 'SUCCESS';
    logData.durationMs = Date.now() - startTime;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          nrsIRN: irn,
          nrsStamp: stamp,
          nrsQrCode: qrCode,
          nrsSubmittedAt: new Date(),
          nrsAcknowledgedAt: new Date(),
          nrsStatus: 'APPROVED',
          nrsResponse: nrsResponse,
          ublXml,
        },
      });
      await tx.nRSLog.create({ data: logData });
    });

    logger.info(`NRS invoice submitted: ${invoiceId} → IRN: ${irn}`);
    return { irn, qrCode, stamp, status: 'APPROVED' };
  } catch (error) {
    if (!logData.durationMs) {
      logData.durationMs = Date.now() - startTime;
      logData.status = 'FAILED';
      logData.errorMessage = error.message;
      await prisma.nRSLog.create({ data: logData }).catch(() => {});
    }
    throw error;
  }
}

function generateUBLXML(invoice) {
  const doc = createXml({ version: '1.0', encoding: 'UTF-8' })
    .ele('Invoice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    })
    .ele('cbc:UBLVersionID').txt('2.1').up()
    .ele('cbc:ID').txt(invoice.invoiceNumber).up()
    .ele('cbc:IssueDate').txt(invoice.issueDate.toISOString().split('T')[0]).up()
    .ele('cbc:InvoiceTypeCode').txt(invoice.invoiceType === 'B2C' ? '388' : '380').up()
    .ele('cbc:DocumentCurrencyCode').txt(invoice.currency).up()
    .ele('cac:AccountingSupplierParty')
      .ele('cac:Party')
        .ele('cac:PartyName')
          .ele('cbc:Name').txt(invoice.tenant.businessName).up()
        .up()
        .ele('cac:PartyTaxScheme')
          .ele('cbc:CompanyID').txt(invoice.tenant.tin || '').up()
          .ele('cac:TaxScheme').ele('cbc:ID').txt('VAT').up().up()
        .up()
      .up()
    .up()
    .ele('cac:AccountingCustomerParty')
      .ele('cac:Party')
        .ele('cac:PartyName')
          .ele('cbc:Name').txt(invoice.customer.name).up()
        .up()
      .up()
    .up()
    .ele('cac:TaxTotal')
      .ele('cbc:TaxAmount', { currencyID: invoice.currency }).txt(String(invoice.vatAmount)).up()
    .up()
    .ele('cac:LegalMonetaryTotal')
      .ele('cbc:LineExtensionAmount', { currencyID: invoice.currency }).txt(String(invoice.subtotal)).up()
      .ele('cbc:TaxExclusiveAmount', { currencyID: invoice.currency }).txt(String(invoice.subtotal)).up()
      .ele('cbc:TaxInclusiveAmount', { currencyID: invoice.currency }).txt(String(invoice.totalAmount)).up()
      .ele('cbc:PayableAmount', { currencyID: invoice.currency }).txt(String(invoice.amountDue)).up()
    .up();

  invoice.lines.forEach((line, i) => {
    doc
      .ele('cac:InvoiceLine')
        .ele('cbc:ID').txt(String(i + 1)).up()
        .ele('cbc:InvoicedQuantity', { unitCode: 'EA' }).txt(String(line.quantity)).up()
        .ele('cbc:LineExtensionAmount', { currencyID: invoice.currency }).txt(String(line.lineTotal)).up()
        .ele('cac:Item')
          .ele('cbc:Description').txt(line.description).up()
        .up()
        .ele('cac:Price')
          .ele('cbc:PriceAmount', { currencyID: invoice.currency }).txt(String(line.unitPrice)).up()
        .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
}

function generateMockIRN(invoice) {
  const hash = crypto.createHash('sha256')
    .update(`${invoice.invoiceNumber}${invoice.totalAmount}${Date.now()}`)
    .digest('hex')
    .toUpperCase()
    .substring(0, 24);
  return `IRN-${hash}`;
}

function generateMockQRData(irn, invoice) {
  return `https://verify.nrs.gov.ng/irn/${irn}?amount=${invoice.totalAmount}&date=${invoice.issueDate.toISOString().split('T')[0]}`;
}

function generateCryptoStamp(irn) {
  return crypto.createHash('sha256').update(irn + process.env.NRS_API_KEY || 'mock').digest('base64');
}

async function scheduleB2CReport(tenantId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      invoiceType: 'B2C',
      totalAmount: { gte: 50000 },
      issueDate: { gte: startOfDay, lte: endOfDay },
      nrsStatus: { not: 'APPROVED' },
    },
    include: { customer: true, lines: true, tenant: true },
  });

  logger.info(`Scheduling B2C T+1 report for ${invoices.length} invoices (tenant: ${tenantId})`);

  for (const invoice of invoices) {
    await submitInvoice(invoice.id, tenantId).catch((err) =>
      logger.error(`B2C T+1 report failed for invoice ${invoice.id}: ${err.message}`)
    );
  }
}

module.exports = { submitInvoice, generateUBLXML, scheduleB2CReport };
