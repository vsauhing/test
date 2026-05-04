/***********************
 * File: config.gs
 * FCT Spare Part Pricing Generator configuration
 ***********************/

/**
 * Only users from this email domain should use the app.
 */
const ALLOWED_DOMAIN = '@firecurtaintech.com';

/**
 * Main spreadsheet used by this Spare Part Pricing app.
 *
 * Spreadsheet URL:
 * https://docs.google.com/spreadsheets/d/1BHEj0JXrLNjYMIrIU4LYNvFRPKn3x5dmZvQJyWkUOJU/edit
 */
const SPARE_PART_SPREADSHEET_ID = '1BHEj0JXrLNjYMlrlU4LYNvfRPKn3x5dmZvQJyWkU0JU';

/**
 * Main spreadsheet URL used by sidebar shortcut links.
 */
const SPARE_PART_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/' + SPARE_PART_SPREADSHEET_ID + '/edit?gid=0#gid=0';

/**
 * Sheet names.
 */
const PDFS_LOG_SHEET_NAME = 'PDFs_Log';
const MATERIALS_LIST_SHEET_NAME = 'Materials_List';

/**
 * PDFs_Log structure.
 */
const PDFS_LOG_HEADER_ROW = 3;
const PDFS_LOG_INSERT_ROW = 4;

/**
 * Materials_List structure.
 *
 * Current structure:
 * - headers are in row 3
 * - data starts in row 4
 * - columns: QTY, ITEM, PRICE, COMMENTS
 */
const MATERIALS_LIST_HEADER_ROW = 3;
const MATERIALS_LIST_DATA_START_ROW = 4;

/***********************
 * PDF Output Folder
 ***********************/

/**
 * Folder name:
 * FCT Spare Part Pricing Generator
 *
 * Folder URL:
 * https://drive.google.com/drive/folders/1GsEE6edyph2-ErlrBdyWjdzMjbJlj7Yd
 */
const SPARE_PART_PDF_FOLDER_ID = '1GsEE6edyph2-ErlrBdyWjdzMjbJlj7Yd';

const SPARE_PART_PDF_FOLDER_NAME = 'FCT Spare Part Pricing Generator';

/**
 * Route registry for this Web App.
 */
const ROUTES = {
  pricing: {
    page: 'pricing',
    file: 'Pricing',
    title: 'FCT Spare Part Pricing Generator',
    navLabel: 'Pricing',
    icon: 'fas fa-file-invoice-dollar'
  }
};

/**
 * Sidebar bottom shortcut registry.
 */
const SIDEBAR_BOTTOM_LINKS = [
  {
    label: 'Pricing Sheet',
    title: 'Open FCT Spare Part Pricing Generator Spreadsheet',
    url: SPARE_PART_SPREADSHEET_URL,
    icon: 'fas fa-table',
    target: '_blank'
  }
];

/**
 * Shared internal relative URLs.
 */
const PRICING_URL = '?page=pricing';