/***********************
 * File: utils.gs
 * Shared reusable helpers for FCT Spare Part Pricing Generator
 ***********************/

function mustGetSheetByName_(ss, name) {
  const sh = ss.getSheetByName(name);

  if (!sh) {
    throw new Error(`Sheet "${name}" not found.`);
  }

  return sh;
}

function getSparePartSpreadsheet_() {
  if (
    typeof SPARE_PART_SPREADSHEET_ID !== 'undefined' &&
    SPARE_PART_SPREADSHEET_ID
  ) {
    return SpreadsheetApp.openById(SPARE_PART_SPREADSHEET_ID);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('No active spreadsheet was found.');
  }

  return ss;
}

function safeNumber_(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value || '')
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .trim();

  const n = Number(cleaned);

  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

function findHeaderIndexExact_(headers, target) {
  const cleanTarget = normalizeHeader_(target);

  for (let i = 0; i < headers.length; i++) {
    if (normalizeHeader_(headers[i]) === cleanTarget) {
      return i;
    }
  }

  return -1;
}

function findFirstHeaderIndex_(headers, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const idx = findHeaderIndexExact_(headers, candidates[i]);

    if (idx !== -1) {
      return idx;
    }
  }

  return -1;
}

function setCellByHeader_(headers, row, headerName, value) {
  const idx = findHeaderIndexExact_(headers, headerName);

  if (idx !== -1) {
    row[idx] = value;
  }
}

function getSheetUrl_(spreadsheetId, gid) {
  return (
    'https://docs.google.com/spreadsheets/d/' +
    spreadsheetId +
    '/edit#gid=' +
    gid
  );
}

function formatMoney_(value) {
  const n = safeNumber_(value);

  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function sanitizeFileName_(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFirstName_(fullName) {
  const cleanName = String(fullName || '').trim();

  if (!cleanName) {
    return '';
  }

  return cleanName.split(/\s+/)[0];
}

function formatDateForFile_(date) {
  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function formatDisplayDate_(dateValue) {
  if (!dateValue) {
    return Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'MMMM dd, yyyy'
    );
  }

  const date = new Date(dateValue + 'T00:00:00');

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'MMMM dd, yyyy'
  );
}