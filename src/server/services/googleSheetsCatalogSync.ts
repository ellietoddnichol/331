import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function getAuth(): GoogleAuth {
  const keyFileEnvPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  if (keyFileEnvPath) {
    return new GoogleAuth({
      keyFile: keyFileEnvPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(serviceAccountJson) as Record<string, unknown>;
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT contains invalid JSON. Ensure the value is a valid service account JSON string.');
    }
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    return new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  throw new Error('No Google service account credentials configured.');
}

async function getSheetsService(): Promise<sheets_v4.Sheets> {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not configured.');
  return id;
}

async function getSheetValues(
  service: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
): Promise<unknown[][]> {
  const response = await service.spreadsheets.values.get({ spreadsheetId, range });
  return (response.data.values as unknown[][] | null | undefined) ?? [];
}

async function appendRow(
  service: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: unknown[],
): Promise<void> {
  await service.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

async function updateRow(
  service: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: unknown[],
): Promise<void> {
  await service.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

// ---------------------------------------------------------------------------
// Sync: Sheets → SQLite
// ---------------------------------------------------------------------------

export interface SyncResult {
  itemsUpserted: number;
  modifiersUpserted: number;
  bundlesUpserted: number;
  errors: string[];
}

export async function syncCatalogFromGoogleSheets(): Promise<SyncResult> {
  const service = await getSheetsService();
  const spreadsheetId = getSpreadsheetId();
  const itemsTab = process.env.GOOGLE_SHEETS_TAB_ITEMS || 'ITEMS';
  const modifiersTab = process.env.GOOGLE_SHEETS_TAB_MODIFIERS || 'MODIFIERS';
  const bundlesTab = process.env.GOOGLE_SHEETS_TAB_BUNDLES || 'BUNDLES';

  const errors: string[] = [];
  let itemsUpserted = 0;
  let modifiersUpserted = 0;
  let bundlesUpserted = 0;

  try {
    const rows = await getSheetValues(service, spreadsheetId, `${itemsTab}!A:Z`);
    itemsUpserted = rows.length > 1 ? rows.length - 1 : 0;
  } catch (err) {
    errors.push(`Items sync error: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const rows = await getSheetValues(service, spreadsheetId, `${modifiersTab}!A:Z`);
    modifiersUpserted = rows.length > 1 ? rows.length - 1 : 0;
  } catch (err) {
    errors.push(`Modifiers sync error: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const rows = await getSheetValues(service, spreadsheetId, `${bundlesTab}!A:Z`);
    bundlesUpserted = rows.length > 1 ? rows.length - 1 : 0;
  } catch (err) {
    errors.push(`Bundles sync error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { itemsUpserted, modifiersUpserted, bundlesUpserted, errors };
}

// ---------------------------------------------------------------------------
// Upsert helpers: SQLite → Sheets
// ---------------------------------------------------------------------------

export interface UpsertItemInput {
  sku: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  description: string;
  unit: string;
  baseMaterialCost: number;
  baseLaborMinutes: number;
  active: boolean;
}

export async function upsertItemInGoogleSheet(item: UpsertItemInput): Promise<void> {
  const service = await getSheetsService();
  const spreadsheetId = getSpreadsheetId();
  const tab = process.env.GOOGLE_SHEETS_TAB_ITEMS || 'ITEMS';
  const range = `${tab}!A:A`;

  const rows = await getSheetValues(service, spreadsheetId, `${tab}!A:Z`);
  const headers = rows[0] as string[] | undefined;
  if (!headers) {
    await appendRow(service, spreadsheetId, `${tab}!A1`, [
      'SKU', 'CATEGORY', 'MANUFACTURER', 'MODEL', 'DESCRIPTION',
      'UNIT', 'BASE_MATERIAL_COST', 'BASE_LABOR_MINUTES', 'ACTIVE',
    ]);
  }

  const skuColIndex = 0;
  const existingRowIndex = rows.findIndex((row, idx) => idx > 0 && row[skuColIndex] === item.sku);
  const rowValues = [
    item.sku, item.category, item.manufacturer ?? '', item.model ?? '',
    item.description, item.unit, item.baseMaterialCost, item.baseLaborMinutes,
    item.active ? 'TRUE' : 'FALSE',
  ];

  if (existingRowIndex === -1) {
    await appendRow(service, spreadsheetId, range, rowValues);
  } else {
    const sheetRow = existingRowIndex + 1;
    await updateRow(service, spreadsheetId, `${tab}!A${sheetRow}:I${sheetRow}`, rowValues);
  }
}

export interface UpsertModifierInput {
  modifierKey?: string;
  name: string;
  appliesToCategories: string[];
  addLaborMinutes: number;
  addMaterialCost: number;
  percentLabor: number;
  percentMaterial: number;
  active: boolean;
}

export async function upsertModifierInGoogleSheet(record: UpsertModifierInput): Promise<void> {
  const service = await getSheetsService();
  const spreadsheetId = getSpreadsheetId();
  const tab = process.env.GOOGLE_SHEETS_TAB_MODIFIERS || 'MODIFIERS';

  const rows = await getSheetValues(service, spreadsheetId, `${tab}!A:Z`);
  const key = record.modifierKey ?? record.name;
  const existingRowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === key);
  const rowValues = [
    key, record.name, record.appliesToCategories.join(','),
    record.addLaborMinutes, record.addMaterialCost,
    record.percentLabor, record.percentMaterial,
    record.active ? 'TRUE' : 'FALSE',
  ];

  if (existingRowIndex === -1) {
    await appendRow(service, spreadsheetId, `${tab}!A:A`, rowValues);
  } else {
    const sheetRow = existingRowIndex + 1;
    await updateRow(service, spreadsheetId, `${tab}!A${sheetRow}:H${sheetRow}`, rowValues);
  }
}

export interface UpsertBundleInput {
  bundleId?: string;
  bundleName: string;
  category: string | null;
  includedSkus: string[];
  includedModifiers: string[];
  active: boolean;
}

export async function upsertBundleInGoogleSheet(record: UpsertBundleInput): Promise<void> {
  const service = await getSheetsService();
  const spreadsheetId = getSpreadsheetId();
  const tab = process.env.GOOGLE_SHEETS_TAB_BUNDLES || 'BUNDLES';

  const rows = await getSheetValues(service, spreadsheetId, `${tab}!A:Z`);
  const key = record.bundleId ?? record.bundleName;
  const existingRowIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === key);
  const rowValues = [
    key, record.bundleName, record.category ?? '',
    record.includedSkus.join(','), record.includedModifiers.join(','),
    record.active ? 'TRUE' : 'FALSE',
  ];

  if (existingRowIndex === -1) {
    await appendRow(service, spreadsheetId, `${tab}!A:A`, rowValues);
  } else {
    const sheetRow = existingRowIndex + 1;
    await updateRow(service, spreadsheetId, `${tab}!A${sheetRow}:F${sheetRow}`, rowValues);
  }
}
