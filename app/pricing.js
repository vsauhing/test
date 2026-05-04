/***********************
 * File: Pricing.gs
 * Backend for FCT Spare Part Pricing Generator
 *
 * Responsibilities:
 * - Reads Materials_List by headers
 * - Saves generated pricing records into PDFs_Log
 * - Generates Best and Final Pricing PDF
 * - Stores PDFs in configured Drive folder
 ***********************/

const PRICING_HEADERS = {
  MATERIAL_QTY: 'QTY',
  MATERIAL_ITEM: 'ITEM',
  MATERIAL_PRICE: 'PRICE',
  MATERIAL_COMMENTS: 'COMMENTS',

  PDF_TIMESTAMP: 'Timestamp',
  PDF_PROPOSAL_NUMBER: 'Proposal #',
  PDF_PROJECT_NAME: 'Project Name',
  PDF_PRICING_DATE: 'Pricing Date',
  PDF_CUSTOMER_NAME: 'Customer Name',
  PDF_CUSTOMER_ROLE: 'Customer Role',
  PDF_COMPANY_NAME: 'Company Name',
  PDF_ADDRESS_LINE_1: 'Address Line 1',
  PDF_ADDRESS_LINE_2: 'Address Line 2',
  PDF_CUSTOMER_EMAIL: 'Customer Email',
  PDF_CUSTOMER_PHONE: 'Customer Phone',
  PDF_DELIVERY_LOCATION: 'Delivery Location',
  PDF_MATERIALS: 'Materials',
  PDF_MATERIALS_TOTAL: 'Materials Total',
  PDF_COMMENTS: 'Comments',
  PDF_URL: 'PDF URL',
  PDF_CREATED_BY: 'Created By'
};

/***********************
 * Force authorization helper
 * Run manually once from Apps Script if needed.
 ***********************/
function forceAuthorizePricingGenerator() {
  const ss = getSparePartSpreadsheet_();
  const materialsSheet = mustGetSheetByName_(ss, MATERIALS_LIST_SHEET_NAME);
  const pdfsLogSheet = mustGetSheetByName_(ss, PDFS_LOG_SHEET_NAME);
  const folder = getSparePartPdfFolder_();

  return {
    success: true,
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    materialsSheetName: materialsSheet.getName(),
    pdfsLogSheetName: pdfsLogSheet.getName(),
    pdfFolderName: folder.getName(),
    pdfFolderUrl: folder.getUrl()
  };
}

/***********************
 * Materials List
 ***********************/
function getPricingMaterialsList() {
  const ss = getSparePartSpreadsheet_();
  const sh = mustGetSheetByName_(ss, MATERIALS_LIST_SHEET_NAME);

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow < MATERIALS_LIST_DATA_START_ROW || lastCol < 1) {
    return [];
  }

  const headers = sh
    .getRange(MATERIALS_LIST_HEADER_ROW, 1, 1, lastCol)
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());

  const qtyCol = findFirstHeaderIndex_(headers, [
    PRICING_HEADERS.MATERIAL_QTY,
    'Quantity'
  ]);

  const itemCol = findFirstHeaderIndex_(headers, [
    PRICING_HEADERS.MATERIAL_ITEM,
    'Product',
    'Material',
    'Material Item'
  ]);

  const priceCol = findFirstHeaderIndex_(headers, [
    PRICING_HEADERS.MATERIAL_PRICE,
    'Value',
    'Unit Price'
  ]);

  const commentsCol = findFirstHeaderIndex_(headers, [
    PRICING_HEADERS.MATERIAL_COMMENTS,
    'Notes',
    'Default Comments'
  ]);

  if (itemCol === -1) {
    throw new Error(`Materials_List is missing "${PRICING_HEADERS.MATERIAL_ITEM}" header.`);
  }

  if (priceCol === -1) {
    throw new Error(`Materials_List is missing "${PRICING_HEADERS.MATERIAL_PRICE}" header.`);
  }

  const numRows = lastRow - MATERIALS_LIST_DATA_START_ROW + 1;

  const values = sh
    .getRange(MATERIALS_LIST_DATA_START_ROW, 1, numRows, lastCol)
    .getDisplayValues();

  const materials = [];
  const seen = {};

  values.forEach(row => {
    const item = String(row[itemCol] || '').trim();

    if (!item) {
      return;
    }

    const defaultQty = qtyCol !== -1
      ? safeNumber_(row[qtyCol])
      : 1;

    const price = priceCol !== -1
      ? safeNumber_(row[priceCol])
      : 0;

    const comments = commentsCol !== -1
      ? String(row[commentsCol] || '').trim()
      : '';

    const key = item.toLowerCase();

    if (seen[key]) {
      return;
    }

    seen[key] = true;

    materials.push({
      value: item,
      label: item,
      name: item,
      defaultQty: defaultQty || 1,
      price: price,
      comments: comments
    });
  });

  return materials;
}

/***********************
 * Save + PDF generation
 ***********************/
function createPricingPdfFromHtml(data) {
  try {
    if (!data) {
      return {
        success: false,
        error: 'Empty request.'
      };
    }

    const clean = normalizePricingRequest_(data);
    const materials = normalizeSubmittedMaterials_(clean.materials);

    clean.materials = materials;
    clean.materialsTotal = calculateMaterialsTotal_(materials);
    clean.materialsText = buildMaterialsText_(materials);

    const pdfFile = createPricingPdf_(clean);

    savePricingRecordToLog_(clean, pdfFile);

    return {
      success: true,
      message: 'Pricing PDF created successfully.',
      pdfUrl: pdfFile.getUrl(),
      pdfName: pdfFile.getName(),
      pdfsLogUrl: SPARE_PART_SPREADSHEET_URL,
      materialsTotal: clean.materialsTotal
    };
  } catch (err) {
    return {
      success: false,
      error: String(err && err.message ? err.message : err)
    };
  }
}

function normalizePricingRequest_(data) {
  const proposalNumber = String(data.proposalNumber || '').trim();
  const pricingDate = String(data.pricingDate || '').trim();
  const projectName = String(data.projectName || '').trim();
  const customerName = String(data.customerName || '').trim();

  if (!proposalNumber) {
    throw new Error('Proposal # is required.');
  }

  if (!pricingDate) {
    throw new Error('Pricing Date is required.');
  }

  if (!projectName) {
    throw new Error('Project Name is required.');
  }

  if (!customerName) {
    throw new Error('Customer Name is required.');
  }

  return {
    proposalNumber: proposalNumber,
    pricingDate: pricingDate,
    projectName: projectName,

    customerName: customerName,
    customerRole: String(data.customerRole || '').trim(),
    companyName: String(data.companyName || '').trim(),
    addressLine1: String(data.addressLine1 || '').trim(),
    addressLine2: String(data.addressLine2 || '').trim(),
    customerEmail: String(data.customerEmail || '').trim(),
    customerPhone: String(data.customerPhone || '').trim(),

    deliveryLocation: String(data.deliveryLocation || '').trim(),
    estimatorName: String(data.estimatorName || '').trim() || 'Jesus Orona',
    estimatorTitle: String(data.estimatorTitle || '').trim() || 'Project Manager/Estimator',
    estimatorPhone: String(data.estimatorPhone || '').trim() || '585 412 2179',

    comments: String(data.comments || '').trim(),
    materials: Array.isArray(data.materials) ? data.materials : []
  };
}

/***********************
 * PDF creator
 ***********************/
function createPricingPdf_(data) {
  const template = HtmlService.createTemplateFromFile('pdf_template');

  template.proposalNumber = data.proposalNumber || '';
  template.projectName = data.projectName || '';
  template.pricingDate = formatDisplayDate_(data.pricingDate);

  template.customerName = data.customerName || '';
  template.customerRole = data.customerRole || '';
  template.companyName = data.companyName || '';
  template.addressLine1 = data.addressLine1 || '';
  template.addressLine2 = data.addressLine2 || '';
  template.customerEmail = data.customerEmail || '';
  template.customerPhone = data.customerPhone || '';

  template.deliveryLocation = data.deliveryLocation || '';
  template.estimatorName = data.estimatorName || 'Jesus Orona';
  template.estimatorTitle = data.estimatorTitle || 'Project Manager/Estimator';
  template.estimatorPhone = data.estimatorPhone || '585 412 2179';

  template.comments = data.comments || '';
  template.materials = data.materials || [];
  template.materialsTotalFormatted = formatMoney_(data.materialsTotal || 0);
  template.firstName = getFirstName_(data.customerName || '');

  const html = template.evaluate().getContent();

  const pdfBlob = Utilities
    .newBlob(html, 'text/html', 'best-and-final-pricing.html')
    .getAs('application/pdf');

  const safeProposal = sanitizeFileName_(data.proposalNumber || 'Proposal');
  const safeProjectName = sanitizeFileName_(data.projectName || 'Project');

  const fileName =
    'Best and Final Pricing - ' +
    safeProposal +
    ' - ' +
    safeProjectName +
    ' - ' +
    formatDateForFile_(new Date()) +
    '.pdf';

  pdfBlob.setName(fileName);

  const folder = getSparePartPdfFolder_();

  return folder.createFile(pdfBlob);
}

/***********************
 * Save into PDFs_Log
 ***********************/
function savePricingRecordToLog_(data, pdfFile) {
  const ss = getSparePartSpreadsheet_();
  const sh = mustGetSheetByName_(ss, PDFS_LOG_SHEET_NAME);

  const lastCol = Math.max(sh.getLastColumn(), 17);

  ensurePdfsLogHeaders_(sh, lastCol);

  const headers = sh
    .getRange(PDFS_LOG_HEADER_ROW, 1, 1, lastCol)
    .getDisplayValues()[0]
    .map(h => String(h || '').trim());

  sh.insertRowBefore(PDFS_LOG_INSERT_ROW);

  const rowNumber = PDFS_LOG_INSERT_ROW;
  const row = new Array(lastCol).fill('');

  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_TIMESTAMP, new Date());
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_PROPOSAL_NUMBER, data.proposalNumber);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_PROJECT_NAME, data.projectName);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_PRICING_DATE, data.pricingDate);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_CUSTOMER_NAME, data.customerName);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_CUSTOMER_ROLE, data.customerRole);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_COMPANY_NAME, data.companyName);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_ADDRESS_LINE_1, data.addressLine1);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_ADDRESS_LINE_2, data.addressLine2);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_CUSTOMER_EMAIL, data.customerEmail);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_CUSTOMER_PHONE, data.customerPhone);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_DELIVERY_LOCATION, data.deliveryLocation);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_MATERIALS, data.materialsText);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_MATERIALS_TOTAL, data.materialsTotal);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_COMMENTS, data.comments);
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_URL, pdfFile.getUrl());
  setCellByHeader_(headers, row, PRICING_HEADERS.PDF_CREATED_BY, getCurrentUserEmailForPricing_());

  sh.getRange(rowNumber, 1, 1, lastCol).setValues([row]);

  const timestampCol = findHeaderIndexExact_(headers, PRICING_HEADERS.PDF_TIMESTAMP);
  const totalCol = findHeaderIndexExact_(headers, PRICING_HEADERS.PDF_MATERIALS_TOTAL);
  const materialsCol = findHeaderIndexExact_(headers, PRICING_HEADERS.PDF_MATERIALS);
  const commentsCol = findHeaderIndexExact_(headers, PRICING_HEADERS.PDF_COMMENTS);

  if (timestampCol !== -1) {
    sh.getRange(rowNumber, timestampCol + 1).setNumberFormat('m/d/yyyy h:mm:ss AM/PM');
  }

  if (totalCol !== -1) {
    sh.getRange(rowNumber, totalCol + 1).setNumberFormat('$#,##0.00');
  }

  if (materialsCol !== -1) {
    sh.getRange(rowNumber, materialsCol + 1).setWrap(true);
  }

  if (commentsCol !== -1) {
    sh.getRange(rowNumber, commentsCol + 1).setWrap(true);
  }
}

function ensurePdfsLogHeaders_(sh, lastCol) {
  const headers = [
    'Timestamp',
    'Proposal #',
    'Project Name',
    'Pricing Date',
    'Customer Name',
    'Customer Role',
    'Company Name',
    'Address Line 1',
    'Address Line 2',
    'Customer Email',
    'Customer Phone',
    'Delivery Location',
    'Materials',
    'Materials Total',
    'Comments',
    'PDF URL',
    'Created By'
  ];

  const width = Math.max(lastCol || 0, headers.length);

  const currentHeaders = sh
    .getRange(PDFS_LOG_HEADER_ROW, 1, 1, width)
    .getDisplayValues()[0];

  const hasAnyHeader = currentHeaders.some(value => {
    return String(value || '').trim() !== '';
  });

  if (!hasAnyHeader) {
    sh
      .getRange(PDFS_LOG_HEADER_ROW, 1, 1, headers.length)
      .setValues([headers]);

    sh
      .getRange(PDFS_LOG_HEADER_ROW, 1, 1, headers.length)
      .setFontWeight('bold');

    sh.setFrozenRows(PDFS_LOG_HEADER_ROW);
  }
}

/***********************
 * Materials helpers
 ***********************/
function normalizeSubmittedMaterials_(materials) {
  if (!Array.isArray(materials)) {
    return [];
  }

  return materials
    .map(item => {
      const product = String(item.product || '').trim();
      const quantity = safeNumber_(item.quantity);
      const value = safeNumber_(item.value);
      const comments = String(item.comments || '').trim();
      const total = quantity * value;

      return {
        product: product,
        quantity: quantity,
        value: value,
        comments: comments,
        total: total
      };
    })
    .filter(item => item.product);
}

function buildMaterialsText_(materials) {
  if (!materials || !materials.length) {
    return '';
  }

  return materials.map(item => {
    let line =
      item.quantity +
      ' x ' +
      item.product +
      ' @ $' +
      Number(item.value || 0).toFixed(2) +
      ' = $' +
      Number(item.total || 0).toFixed(2);

    if (item.comments) {
      line += ' | ' + item.comments;
    }

    return line;
  }).join('\n');
}

function calculateMaterialsTotal_(materials) {
  if (!materials || !materials.length) {
    return 0;
  }

  return materials.reduce((sum, item) => {
    return sum + safeNumber_(item.total);
  }, 0);
}

/***********************
 * PDF folder helper
 *
 * Priority:
 * 1) Use SPARE_PART_PDF_FOLDER_ID when configured.
 * 2) Fallback to folder name only if no ID exists.
 ***********************/
function getSparePartPdfFolder_() {
  const folderId =
    typeof SPARE_PART_PDF_FOLDER_ID !== 'undefined'
      ? String(SPARE_PART_PDF_FOLDER_ID || '').trim()
      : '';

  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  const folderName =
    typeof SPARE_PART_PDF_FOLDER_NAME !== 'undefined' &&
    String(SPARE_PART_PDF_FOLDER_NAME || '').trim()
      ? SPARE_PART_PDF_FOLDER_NAME
      : 'FCT Spare Part Pricing Generator';

  const folders = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(folderName);
}

function forceAuthorizeSparePartPdfFolder() {
  const folder = getSparePartPdfFolder_();

  return {
    success: true,
    folderName: folder.getName(),
    folderUrl: folder.getUrl()
  };
}

/***********************
 * Manual test:
 * Creates a small TXT file inside the configured PDF folder.
 *
 * Run this from Apps Script to confirm the folder is correct.
 ***********************/
function testCreateFileInSparePartPdfFolder() {
  const folder = getSparePartPdfFolder_();

  const fileName =
    'TEST - Spare Part PDF Folder - ' +
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH-mm-ss'
    ) +
    '.txt';

  const blob = Utilities.newBlob(
    'This is a test file created by Apps Script inside the configured PDF folder.',
    'text/plain',
    fileName
  );

  const file = folder.createFile(blob);

  return {
    success: true,
    expectedFolderId: SPARE_PART_PDF_FOLDER_ID,
    actualFolderName: folder.getName(),
    actualFolderUrl: folder.getUrl(),
    testFileName: file.getName(),
    testFileUrl: file.getUrl()
  };
}

/***********************
 * User helper
 ***********************/
function getCurrentUserEmailForPricing_() {
  return String(
    Session.getActiveUser().getEmail() ||
    Session.getEffectiveUser().getEmail() ||
    ''
  ).trim();
}