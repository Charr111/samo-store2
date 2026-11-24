import type {
  GoogleSheetIncomingUpdateRow,
  GoogleSheetsSyncConfig,
  ProductItem,
} from '../../src/types/samo.ts';
import {
  applyGoogleSheetUpdatesToCatalog,
  buildGoogleSheetInventoryRows,
  isValidGoogleAppsScriptWebhookUrl,
} from '../../src/utils/catalogLogic.ts';
import {
  applyCatalogPatch,
  readCatalogSnapshot,
  type Env,
} from './catalog.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Samo-Sheet-Secret',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const WEBHOOK_TIMEOUT_MS = 8_000;

export interface GoogleSheetsSyncRequestPayload {
  action?: 'inbound_sheet_edit' | 'push_to_sheet' | 'pull_from_sheet';
  syncSecret?: string;
  webhookUrl?: string;
  manual?: boolean;
  products?: ProductItem[];
  rows?: GoogleSheetIncomingUpdateRow[];
}

export interface GoogleSheetsSyncStateAdapter {
  readState: () => Promise<Record<string, unknown>>;
  writeState: (
    patch: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  envWebhookUrl?: string;
  envSyncSecret?: string;
}

export function resolveGoogleSheetsConfig(
  state: Record<string, unknown>,
  envOverrides?: { webhookUrl?: string; syncSecret?: string }
): GoogleSheetsSyncConfig {
  const siteBanners =
    state.siteBanners && typeof state.siteBanners === 'object'
      ? (state.siteBanners as Record<string, unknown>)
      : {};
  const raw =
    siteBanners.googleSheetsSync &&
    typeof siteBanners.googleSheetsSync === 'object'
      ? (siteBanners.googleSheetsSync as Partial<GoogleSheetsSyncConfig>)
      : {};

  const envUrl =
    typeof envOverrides?.webhookUrl === 'string'
      ? envOverrides.webhookUrl.trim()
      : '';
  const resolvedWebhookUrl = isValidGoogleAppsScriptWebhookUrl(envUrl)
    ? envUrl
    : '';

  const envSecret =
    typeof envOverrides?.syncSecret === 'string'
      ? envOverrides.syncSecret.trim()
      : '';

  return {
    enabled: Boolean(resolvedWebhookUrl && envSecret),
    webhookUrl: resolvedWebhookUrl,
    syncSecret: envSecret,
    lastSyncedAt:
      typeof raw.lastSyncedAt === 'string' ? raw.lastSyncedAt : undefined,
    lastSyncStatus: raw.lastSyncStatus,
    lastSyncMessage:
      typeof raw.lastSyncMessage === 'string' ? raw.lastSyncMessage : undefined,
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function executeGoogleSheetsSyncRequest(
  payload: GoogleSheetsSyncRequestPayload,
  headerSecret: string | undefined,
  adapter: GoogleSheetsSyncStateAdapter
): Promise<{ status: number; body: Record<string, unknown> }> {
  const action = payload?.action || 'push_to_sheet';
  const currentState = await adapter.readState();
  const currentProducts: ProductItem[] = Array.isArray(currentState.products)
    ? (currentState.products as ProductItem[])
    : [];
  const currentSiteBanners: Record<string, unknown> =
    currentState.siteBanners && typeof currentState.siteBanners === 'object'
      ? { ...(currentState.siteBanners as Record<string, unknown>) }
      : {};
  const sheetsConfig = resolveGoogleSheetsConfig(currentState, {
    webhookUrl: adapter.envWebhookUrl,
    syncSecret: adapter.envSyncSecret,
  });

  // 1. INBOUND EDIT FROM GOOGLE SHEETS (Google Sheet -> Website)
  if (action === 'inbound_sheet_edit') {
    const incomingSecret = (
      headerSecret ||
      payload.syncSecret ||
      ''
    ).trim();
    const expectedSecret = sheetsConfig.syncSecret.trim();

    if (!expectedSecret || !incomingSecret || incomingSecret !== expectedSecret) {
      return {
        status: 401,
        body: {
          ok: false,
          error: 'Unauthorized Google Sheets sync secret.',
        },
      };
    }

    const incomingRows = Array.isArray(payload.rows) ? payload.rows : [];
    if (incomingRows.length === 0) {
      return {
        status: 200,
        body: {
          ok: true,
          action: 'inbound_sheet_edit',
          updatedCount: 0,
          matchedProductIds: [],
          message: 'No edited rows provided.',
        },
      };
    }

    if (currentProducts.length === 0) {
      return {
        status: 200,
        body: {
          ok: false,
          action: 'inbound_sheet_edit',
          updatedCount: 0,
          matchedProductIds: [],
          message: 'Catalog is empty on server; skipped inbound edit.',
        },
      };
    }

    const { products: updatedProducts, updatedCount, matchedProductIds } =
      applyGoogleSheetUpdatesToCatalog(currentProducts, incomingRows);

    const nowIso = new Date().toISOString();
    const persistedSheetsConfig: GoogleSheetsSyncConfig = {
      enabled: true,
      webhookUrl: '',
      syncSecret: '',
      lastSyncedAt: nowIso,
      lastSyncStatus: 'ok',
      lastSyncMessage:
        updatedCount > 0
          ? `Google Sheet updated ${updatedCount} product${
              updatedCount === 1 ? '' : 's'
            } automatically.`
          : 'Google Sheet edit received (values already matched live catalog).',
    };

    if (updatedCount > 0) {
      await adapter.writeState({
        products: updatedProducts,
        siteBanners: {
          ...currentSiteBanners,
          googleSheetsSync: persistedSheetsConfig,
        },
      });
    }

    return {
      status: 200,
      body: {
        ok: true,
        action: 'inbound_sheet_edit',
        updatedCount,
        matchedProductIds,
        lastSyncedAt: nowIso,
        message: persistedSheetsConfig.lastSyncMessage,
      },
    };
  }

  // 2. OUTBOUND PUSH TO GOOGLE SHEETS (Website -> Google Sheet)
  // Strictly 0 Cloudflare D1 rows_written on push_to_sheet!
  if (action === 'push_to_sheet') {
    const isManual = Boolean(payload.manual);
    if (!isManual && !sheetsConfig.enabled) {
      return {
        status: 200,
        body: {
          ok: false,
          skipped: true,
          action: 'push_to_sheet',
          message: 'Google Sheets live sync is not configured in server environment variables.',
        },
      };
    }

    const targetWebhookUrl = sheetsConfig.webhookUrl.trim();

    if (!isValidGoogleAppsScriptWebhookUrl(targetWebhookUrl)) {
      return {
        status: 400,
        body: {
          ok: false,
          action: 'push_to_sheet',
          error:
            'GOOGLE_SHEETS_WEBHOOK_URL is not configured in server environment variables.',
        },
      };
    }

    const activeSecret = sheetsConfig.syncSecret.trim();

    const productsToPush: ProductItem[] =
      Array.isArray(payload.products) && payload.products.length > 0
        ? payload.products
        : currentProducts;

    const sheetRows = buildGoogleSheetInventoryRows(productsToPush);

    try {
      const resp = await fetchWithTimeout(
        targetWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'push_catalog_rows',
            syncSecret: activeSecret,
            rows: sheetRows,
          }),
        },
        WEBHOOK_TIMEOUT_MS
      );

      const rawText = await resp.text();
      let parsedResp: Record<string, unknown> = {};
      try {
        parsedResp = JSON.parse(rawText);
      } catch {
        parsedResp = { ok: resp.ok, raw: rawText.slice(0, 200) };
      }

      if (!resp.ok || parsedResp.ok === false) {
        const errMsg =
          typeof parsedResp.error === 'string'
            ? parsedResp.error
            : `Google Sheet webhook returned HTTP ${resp.status}.`;
        return {
          status: 502,
          body: {
            ok: false,
            action: 'push_to_sheet',
            error: errMsg,
          },
        };
      }

      const updatedRows = Number(parsedResp.updatedRows) || 0;
      const appendedRows = Number(parsedResp.appendedRows) || 0;
      const nowIso = new Date().toISOString();
      const statusMsg = `Synced ${sheetRows.length} rows to Google Sheet (${updatedRows} quantity row${
        updatedRows === 1 ? '' : 's'
      } updated).`;

      return {
        status: 200,
        body: {
          ok: true,
          action: 'push_to_sheet',
          totalRows: sheetRows.length,
          updatedRows,
          appendedRows,
          lastSyncedAt: nowIso,
          message: statusMsg,
        },
      };
    } catch (err) {
      const errMsg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Google Sheet webhook timed out after 8 seconds.'
          : err instanceof Error
          ? err.message
          : 'Failed to reach Google Sheet webhook.';
      return {
        status: 502,
        body: {
          ok: false,
          action: 'push_to_sheet',
          error: errMsg,
        },
      };
    }
  }

  // 3. MANUAL / ON-DEMAND PULL FROM GOOGLE SHEETS (Google Sheet -> Website)
  if (action === 'pull_from_sheet') {
    const targetWebhookUrl = sheetsConfig.webhookUrl.trim();

    if (!isValidGoogleAppsScriptWebhookUrl(targetWebhookUrl)) {
      return {
        status: 400,
        body: {
          ok: false,
          action: 'pull_from_sheet',
          error:
            'GOOGLE_SHEETS_WEBHOOK_URL is not configured in server environment variables.',
        },
      };
    }

    const activeSecret = sheetsConfig.syncSecret.trim();

    const baseProducts: ProductItem[] =
      Array.isArray(payload.products) && payload.products.length > 0
        ? payload.products
        : currentProducts;

    try {
      const resp = await fetchWithTimeout(
        targetWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'read_sheet_rows',
            syncSecret: activeSecret,
          }),
        },
        WEBHOOK_TIMEOUT_MS
      );

      const rawText = await resp.text();
      let parsedResp: Record<string, unknown> = {};
      try {
        parsedResp = JSON.parse(rawText);
      } catch {
        parsedResp = {
          ok: false,
          error: 'Invalid JSON returned from Google Apps Script.',
        };
      }

      if (!resp.ok || parsedResp.ok === false) {
        const errMsg =
          typeof parsedResp.error === 'string'
            ? parsedResp.error
            : `Google Sheet returned HTTP ${resp.status}.`;
        return {
          status: 502,
          body: {
            ok: false,
            action: 'pull_from_sheet',
            error: errMsg,
          },
        };
      }

      const sheetRows: GoogleSheetIncomingUpdateRow[] = Array.isArray(
        parsedResp.rows
      )
        ? (parsedResp.rows as GoogleSheetIncomingUpdateRow[])
        : [];

      const { products: updatedProducts, updatedCount, matchedProductIds } =
        applyGoogleSheetUpdatesToCatalog(baseProducts, sheetRows);

      const nowIso = new Date().toISOString();
      const statusMsg =
        updatedCount > 0
          ? `Pulled ${sheetRows.length} rows from Google Sheet (${updatedCount} product${
              updatedCount === 1 ? '' : 's'
            } updated).`
          : `Checked ${sheetRows.length} rows from Google Sheet (all quantities already up to date).`;

      if (updatedCount > 0) {
        const persistedConfig: GoogleSheetsSyncConfig = {
          enabled: true,
          webhookUrl: '',
          syncSecret: '',
          lastSyncedAt: nowIso,
          lastSyncStatus: 'ok',
          lastSyncMessage: statusMsg,
        };

        await adapter.writeState({
          products: updatedProducts,
          siteBanners: {
            ...currentSiteBanners,
            googleSheetsSync: persistedConfig,
          },
        });
      }

      return {
        status: 200,
        body: {
          ok: true,
          action: 'pull_from_sheet',
          totalSheetRows: sheetRows.length,
          updatedCount,
          matchedProductIds,
          products: updatedProducts,
          lastSyncedAt: nowIso,
          message: statusMsg,
        },
      };
    } catch (err) {
      const errMsg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Google Sheet pull timed out after 8 seconds.'
          : err instanceof Error
          ? err.message
          : 'Failed to reach Google Sheet webhook.';
      return {
        status: 502,
        body: {
          ok: false,
          action: 'pull_from_sheet',
          error: errMsg,
        },
      };
    }
  }

  return {
    status: 400,
    body: {
      ok: false,
      error: `Unsupported Google Sheets sync action: ${String(action)}`,
    },
  };
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    const payload =
      (await context.request.json()) as GoogleSheetsSyncRequestPayload;
    const headerSecret =
      context.request.headers.get('X-Samo-Sheet-Secret') || undefined;

    const result = await executeGoogleSheetsSyncRequest(
      payload,
      headerSecret,
      {
        readState: () => readCatalogSnapshot(context.env),
        writeState: (patch) => applyCatalogPatch(context.env, patch),
        envWebhookUrl: context.env.GOOGLE_SHEETS_WEBHOOK_URL,
        envSyncSecret: context.env.GOOGLE_SHEETS_SYNC_SECRET,
      }
    );

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process Google Sheets sync request.',
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
};
