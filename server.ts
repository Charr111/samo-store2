import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  hasD1Config,
  initD1Schema,
  readD1CatalogState,
  writeD1CatalogPatch,
  readD1NewsletterSubscribers,
  upsertD1NewsletterSubscriber,
  deleteD1NewsletterSubscriber,
  type NewsletterSubscriberRecord,
} from './server/d1.ts';
import {
  getCorsHeaders,
  validateAndBuildR2UploadObjectKey,
  verifyFirebaseAdminRequest,
} from './functions/api/_auth.ts';
import { buildResendEmailPayload } from './functions/api/order-confirmation-email.ts';
import {
  sanitizeCatalogStateForClient,
  serializePublicCatalogState,
} from './functions/api/catalog.ts';
import { executePromoValidation } from './functions/api/promo/validate.ts';
import { executeCreateOrder } from './functions/api/orders.ts';
import { executeCreatePreorder } from './functions/api/preorders.ts';
import {
  executeGoogleSheetsSyncRequest,
  type GoogleSheetsSyncRequestPayload,
} from './functions/api/sheets-sync.ts';
import { buildSitemapXml } from './functions/sitemap.xml.ts';
import { buildGoogleMerchantFeedXml } from './functions/merchant-feed.xml.ts';
import {
  INITIAL_ADMINS,
  INITIAL_CATEGORIES,
  INITIAL_ORDERS,
  INITIAL_PREORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PROMO_CODES,
} from './src/data/seedCatalog.ts';
import type { CategoryItem, ProductItem } from './src/types/samo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_STATE_FILE = path.join(__dirname, '.samo-catalog-state.json');

interface PersistedCatalogState {
  updatedAt: number;
  products?: unknown[];
  deletedProductIds?: string[];
  categories?: unknown[];
  deletedCategoryIds?: string[];
  promoCodes?: unknown[];
  customMaterials?: string[];
  customColors?: string[];
  orders?: unknown[];
  deletedOrderIds?: string[];
  preorders?: unknown[];
  admins?: unknown[];
  siteBanners?: Record<string, unknown>;
  autoAcceptOrders?: boolean;
  showLowStockCount?: boolean;
  shrinkUploadsEnabled?: boolean;
  codEnabled?: boolean;
  newsletterSubscribers?: unknown[];
  newsletterPopupConfig?: Record<string, unknown>;
  seoConfig?: Record<string, unknown>;
  sizeGuideConfig?: Record<string, unknown>;
  adminNotificationState?: Record<string, unknown>;
  newsletterPopupImpressions?: Record<string, { date: string; count: number }>;
}

function getR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || 'samo-images').trim();
  const publicBaseUrl = (
    process.env.R2_PUBLIC_BASE_URL || 'https://images.samoweave.com'
  )
    .trim()
    .replace(/\/+$/, '');

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
  };
}

function createR2Client(): {
  s3: S3Client;
  bucketName: string;
  publicBaseUrl: string;
} | null {
  const {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicBaseUrl,
  } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return { s3, bucketName, publicBaseUrl };
}

function buildDefaultSeedState(): PersistedCatalogState {
  return {
    updatedAt: Date.now(),
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    promoCodes: INITIAL_PROMO_CODES,
    orders: INITIAL_ORDERS,
    preorders: INITIAL_PREORDERS,
    admins: INITIAL_ADMINS,
    newsletterSubscribers: [],
    deletedProductIds: [],
    deletedCategoryIds: [],
    deletedOrderIds: [],
    autoAcceptOrders: true,
    showLowStockCount: false,
    shrinkUploadsEnabled: true,
    codEnabled: false,
  };
}

function readLocalCatalogState(): PersistedCatalogState {
  try {
    if (fs.existsSync(CATALOG_STATE_FILE)) {
      const raw = fs.readFileSync(CATALOG_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedCatalogState;
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.products) &&
        parsed.products.length > 0
      ) {
        return {
          ...buildDefaultSeedState(),
          ...parsed,
        };
      }
    }
  } catch {}
  return buildDefaultSeedState();
}

let cachedD1Catalog: PersistedCatalogState | null = null;
let lastD1FetchMs = 0;
const D1_CACHE_TTL_MS = 30_000;

async function readCatalogState(): Promise<PersistedCatalogState> {
  const now = Date.now();
  if (cachedD1Catalog && now - lastD1FetchMs < D1_CACHE_TTL_MS) {
    return cachedD1Catalog;
  }
  try {
    const d1State = await readD1CatalogState();
    if (
      d1State &&
      Array.isArray(d1State.products) &&
      d1State.products.length > 0
    ) {
      cachedD1Catalog = d1State;
      lastD1FetchMs = now;
      try {
        fs.writeFileSync(
          CATALOG_STATE_FILE,
          JSON.stringify(d1State, null, 2),
          'utf-8'
        );
      } catch {}
      return d1State;
    }
  } catch (err) {
    console.warn('[SAMO Weave] D1 read notice, using local cache:', err);
  }
  const localState = readLocalCatalogState();
  cachedD1Catalog = localState;
  lastD1FetchMs = now;
  return localState;
}

async function writeCatalogState(
  patch: Partial<PersistedCatalogState>
): Promise<PersistedCatalogState> {
  const current = await readCatalogState();
  const mergedDeletedOrders = Array.from(
    new Set([
      ...(Array.isArray(current.deletedOrderIds)
        ? current.deletedOrderIds
        : []),
      ...(Array.isArray(patch.deletedOrderIds) ? patch.deletedOrderIds : []),
    ])
  );
  const deletedOrderSet = new Set(mergedDeletedOrders);

  let effectivePatch: Partial<PersistedCatalogState> = patch;
  if (Array.isArray(patch.orders)) {
    const incomingOrders = patch.orders as Array<{
      id?: string;
      createdAt?: string;
    }>;
    const existingOrders = Array.isArray(current.orders)
      ? (current.orders as Array<{ id?: string; createdAt?: string }>)
      : [];
    const mergedMap = new Map<string, { id?: string; createdAt?: string }>();
    const orderedIds: string[] = [];

    for (const ord of incomingOrders) {
      if (!ord || !ord.id || deletedOrderSet.has(ord.id)) continue;
      if (!mergedMap.has(ord.id)) orderedIds.push(ord.id);
      mergedMap.set(ord.id, ord);
    }
    for (const ord of existingOrders) {
      if (!ord || !ord.id || deletedOrderSet.has(ord.id)) continue;
      if (!mergedMap.has(ord.id)) {
        orderedIds.push(ord.id);
        mergedMap.set(ord.id, ord);
      }
    }

    const mergedOrders = orderedIds
      .map((id) => mergedMap.get(id))
      .filter((o): o is { id?: string; createdAt?: string } => Boolean(o));

    mergedOrders.sort((a, b) => {
      const aMs = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bMs = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (Number.isFinite(aMs) && Number.isFinite(bMs) && aMs !== bMs) {
        return bMs - aMs;
      }
      return 0;
    });

    effectivePatch = {
      ...patch,
      orders: mergedOrders,
      ...(mergedDeletedOrders.length > 0
        ? { deletedOrderIds: mergedDeletedOrders }
        : {}),
    };
  }

  try {
    await writeD1CatalogPatch(effectivePatch);
    const refreshed = await readD1CatalogState();
    if (refreshed) {
      cachedD1Catalog = refreshed;
      lastD1FetchMs = Date.now();
      try {
        fs.writeFileSync(
          CATALOG_STATE_FILE,
          JSON.stringify(refreshed, null, 2),
          'utf-8'
        );
      } catch {}
      return refreshed;
    }
  } catch (err) {
    console.warn(
      '[SAMO Weave] D1 write notice, falling back to local state:',
      err
    );
  }
  const next: PersistedCatalogState = {
    ...current,
    ...effectivePatch,
    updatedAt: Date.now(),
  };
  cachedD1Catalog = next;
  lastD1FetchMs = Date.now();
  try {
    fs.writeFileSync(
      CATALOG_STATE_FILE,
      JSON.stringify(next, null, 2),
      'utf-8'
    );
  } catch {}
  return next;
}

async function verifyExpressAdminRequest(req: express.Request) {
  const current = await readCatalogState();
  const extraAdmins = Array.isArray(current.admins)
    ? (current.admins as Array<{ email?: string }>)
    : [];
  const authHeader =
    typeof req.headers.authorization === 'string'
      ? req.headers.authorization
      : null;
  return verifyFirebaseAdminRequest({
    authorizationHeader: authHeader,
    extraAdminEmails: extraAdmins,
  });
}

async function sendOrderConfirmationEmailExpress(body: Record<string, any>): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return {
      status: 200,
      body: {
        ok: false,
        skipped: true,
        error: 'RESEND_API_KEY is not configured in server environment.',
      },
    };
  }

  const order = body?.order;
  if (!order || typeof order !== 'object') {
    return {
      status: 400,
      body: { ok: false, error: 'Missing order payload.' },
    };
  }

  const currentCatalog = await readCatalogState();
  const storedBanners =
    (currentCatalog.siteBanners as Record<string, any> | undefined) || {};
  const catalogProducts = Array.isArray(currentCatalog.products)
    ? (currentCatalog.products as Array<{
        id?: string;
        imageUrl?: string;
        colorVariants?: Array<{ colorName?: string; imageUrl?: string }>;
      }>)
    : [];

  if (Array.isArray(order.orderedItems)) {
    for (const item of order.orderedItems) {
      if (item.imageUrl || !item.productId) continue;
      const matchedProd = catalogProducts.find((p) => p.id === item.productId);
      if (matchedProd) {
        let resolvedImg = matchedProd.imageUrl || '';
        if (
          item.selectedColor &&
          Array.isArray(matchedProd.colorVariants)
        ) {
          const matchedVar = matchedProd.colorVariants.find(
            (v) =>
              (v.colorName || '').trim().toLowerCase() ===
              String(item.selectedColor).trim().toLowerCase()
          );
          if (matchedVar?.imageUrl) {
            resolvedImg = matchedVar.imageUrl;
          }
        }
        if (resolvedImg) {
          item.imageUrl = resolvedImg;
        }
      }
    }
  }

  const emailPayload = buildResendEmailPayload({
    order,
    bannerUrl:
      body.bannerUrl && String(body.bannerUrl).trim()
        ? String(body.bannerUrl).trim()
        : storedBanners.orderEmailBannerUrl || '',
    bannerLinkUrl:
      body.bannerLinkUrl ||
      storedBanners.orderEmailBannerLinkUrl ||
      'https://samoweave.com/new-arrivals/women',
    senderAddress:
      body.senderAddress ||
      storedBanners.orderEmailSenderAddress ||
      'orders@samoweave.com',
    bccAddress:
      body.bccAddress !== undefined
        ? body.bccAddress
        : storedBanners.orderEmailBccAddress !== undefined
        ? storedBanners.orderEmailBccAddress
        : 'orders@samoweave.com',
    replyToAddress:
      body.replyToAddress ||
      storedBanners.orderEmailReplyToAddress ||
      'info@samoweave.com',
    promoGiftEnabled:
      typeof body.promoGiftEnabled === 'boolean'
        ? body.promoGiftEnabled
        : Boolean(storedBanners.orderEmailPromoEnabled),
    promoGiftCode:
      body.promoGiftCode !== undefined
        ? String(body.promoGiftCode)
        : storedBanners.orderEmailPromoCode || 'SAMO10',
    promoGiftDescription:
      body.promoGiftDescription !== undefined
        ? String(body.promoGiftDescription)
        : storedBanners.orderEmailPromoDescription !== undefined
        ? String(storedBanners.orderEmailPromoDescription)
        : 'Enjoy 10% off your next order',
    promoGiftBannerUrl:
      body.promoGiftBannerUrl !== undefined
        ? String(body.promoGiftBannerUrl).trim()
        : storedBanners.orderEmailPromoBannerUrl || '',
    adminAlertOnly: Boolean(body.adminAlertOnly),
  });

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  const resendData = (await resendResponse.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!resendResponse.ok) {
    const errMsg =
      resendData?.message ||
      `Resend API returned HTTP ${resendResponse.status}`;
    console.warn('[SAMO] Resend API error:', errMsg);
    return {
      status: 200,
      body: {
        ok: false,
        error: errMsg,
        status: resendResponse.status,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      id: resendData.id || null,
      to: emailPayload.to,
      bcc: emailPayload.bcc || [],
    },
  };
}

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize Cloudflare D1 SQL schema and warm catalog cache on boot
  initD1Schema()
    .then(() => {
      console.log(
        '[SAMO Weave] Cloudflare D1 SQL connected & schema verified.'
      );
      readCatalogState().catch(() => {});
    })
    .catch((err) => {
      console.warn('[SAMO Weave] D1 boot warning:', err);
    });

  // Public Storefront Catalog Endpoint (Strictly public storefront data only)
  app.options('/api/catalog', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.get('/api/catalog', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    const state = await readCatalogState();
    res.json(
      serializePublicCatalogState(
        state as unknown as Record<string, unknown>
      )
    );
  });

  // Authenticated Admin Full State Endpoint
  app.options('/api/admin/state', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.get('/api/admin/state', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    const authCheck = await verifyExpressAdminRequest(req);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({
        error: authCheck.error || 'Unauthorized admin access.',
      });
      return;
    }
    const state = await readCatalogState();
    res.json(
      sanitizeCatalogStateForClient(
        state as unknown as Record<string, unknown>
      )
    );
  });

  // Dynamic XML Sitemap Endpoint for Google Search Console
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const state = await readCatalogState();
      const categories =
        Array.isArray(state.categories) && state.categories.length > 0
          ? (state.categories as CategoryItem[])
          : INITIAL_CATEGORIES;
      const products =
        Array.isArray(state.products) && state.products.length > 0
          ? (state.products as ProductItem[])
          : INITIAL_PRODUCTS;
      const xml = buildSitemapXml(categories, products);
      res
        .status(200)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300')
        .send(xml);
    } catch {
      const xml = buildSitemapXml(INITIAL_CATEGORIES, INITIAL_PRODUCTS);
      res
        .status(200)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .send(xml);
    }
  });

  // Dynamic Google Merchant Center XML Product Feed Endpoint (Merchant ID: 5917302248)
  app.get('/merchant-feed.xml', async (_req, res) => {
    try {
      const state = await readCatalogState();
      const products =
        Array.isArray(state.products) && state.products.length > 0
          ? (state.products as ProductItem[])
          : INITIAL_PRODUCTS;
      const banners =
        state.siteBanners && typeof state.siteBanners === 'object'
          ? (state.siteBanners as Record<string, unknown>)
          : {};
      const xml = buildGoogleMerchantFeedXml(products, {
        shippingFeeEnabled:
          typeof banners.shippingFeeEnabled === 'boolean'
            ? banners.shippingFeeEnabled
            : true,
        standardDeliveryFee:
          typeof banners.standardDeliveryFee === 'number' &&
          Number.isFinite(banners.standardDeliveryFee) &&
          banners.standardDeliveryFee >= 0
            ? banners.standardDeliveryFee
            : 6,
        freeShippingThreshold:
          typeof banners.freeShippingThreshold === 'number' &&
          Number.isFinite(banners.freeShippingThreshold) &&
          banners.freeShippingThreshold >= 0
            ? banners.freeShippingThreshold
            : 80,
      });
      res
        .status(200)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300')
        .send(xml);
    } catch {
      const xml = buildGoogleMerchantFeedXml(INITIAL_PRODUCTS);
      res
        .status(200)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .send(xml);
    }
  });

  // Authenticated Admin Catalog Mutation Endpoint
  app.post('/api/catalog', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    const authCheck = await verifyExpressAdminRequest(req);
    if (!authCheck.authorized) {
      res.status(authCheck.status).json({
        error: authCheck.error || 'Unauthorized admin access.',
      });
      return;
    }

    const body = req.body || {};
    const current = await readCatalogState();
    const mergedDeletedProducts = Array.from(
      new Set([
        ...(current.deletedProductIds || []),
        ...(Array.isArray(body.deletedProductIds)
          ? body.deletedProductIds
          : []),
      ])
    );
    const mergedDeletedCategories = Array.from(
      new Set([
        ...(current.deletedCategoryIds || []),
        ...(Array.isArray(body.deletedCategoryIds)
          ? body.deletedCategoryIds
          : []),
      ])
    );
    const mergedDeletedOrders = Array.from(
      new Set([
        ...(current.deletedOrderIds || []),
        ...(Array.isArray(body.deletedOrderIds) ? body.deletedOrderIds : []),
      ])
    );
    const deletedOrdSet = new Set(mergedDeletedOrders);
    const nextOrders = Array.isArray(body.orders)
      ? body.orders.filter((o: any) => o && o.id && !deletedOrdSet.has(o.id))
      : Array.isArray(current.orders)
      ? (current.orders as any[]).filter(
          (o: any) => o && o.id && !deletedOrdSet.has(o.id)
        )
      : undefined;

    let mergedSiteBanners: Record<string, unknown> | undefined;
    if (body.siteBanners && typeof body.siteBanners === 'object') {
      const incomingBanners = body.siteBanners as Record<string, unknown>;
      const existingBanners =
        current.siteBanners && typeof current.siteBanners === 'object'
          ? (current.siteBanners as Record<string, unknown>)
          : {};
      const incomingSheets =
        incomingBanners.googleSheetsSync &&
        typeof incomingBanners.googleSheetsSync === 'object'
          ? (incomingBanners.googleSheetsSync as Record<string, unknown>)
          : {};
      const existingSheets =
        existingBanners.googleSheetsSync &&
        typeof existingBanners.googleSheetsSync === 'object'
          ? (existingBanners.googleSheetsSync as Record<string, unknown>)
          : {};
      mergedSiteBanners = {
        ...incomingBanners,
        googleSheetsSync: {
          ...existingSheets,
          ...incomingSheets,
          enabled: true,
          webhookUrl: '',
          syncSecret: '',
        },
      };
    }

    const updated = await writeCatalogState({
      ...(Array.isArray(body.products) ? { products: body.products } : {}),
      ...(Array.isArray(body.categories)
        ? { categories: body.categories }
        : {}),
      ...(Array.isArray(body.promoCodes)
        ? { promoCodes: body.promoCodes }
        : {}),
      ...(Array.isArray(body.customMaterials)
        ? { customMaterials: body.customMaterials }
        : {}),
      ...(Array.isArray(body.customColors)
        ? { customColors: body.customColors }
        : {}),
      ...(nextOrders !== undefined ? { orders: nextOrders } : {}),
      ...(Array.isArray(body.preorders) ? { preorders: body.preorders } : {}),
      ...(Array.isArray(body.admins) ? { admins: body.admins } : {}),
      ...(mergedSiteBanners ? { siteBanners: mergedSiteBanners } : {}),
      ...(typeof body.autoAcceptOrders === 'boolean'
        ? { autoAcceptOrders: body.autoAcceptOrders }
        : {}),
      ...(typeof body.showLowStockCount === 'boolean'
        ? { showLowStockCount: body.showLowStockCount }
        : {}),
      ...(typeof body.shrinkUploadsEnabled === 'boolean'
        ? { shrinkUploadsEnabled: body.shrinkUploadsEnabled }
        : {}),
      ...(typeof body.codEnabled === 'boolean'
        ? { codEnabled: body.codEnabled }
        : {}),
      ...(Array.isArray(body.newsletterSubscribers)
        ? { newsletterSubscribers: body.newsletterSubscribers }
        : {}),
      ...(body.newsletterPopupConfig &&
      typeof body.newsletterPopupConfig === 'object'
        ? {
            newsletterPopupConfig: body.newsletterPopupConfig as Record<
              string,
              unknown
            >,
          }
        : {}),
      ...(body.seoConfig && typeof body.seoConfig === 'object'
        ? { seoConfig: body.seoConfig as Record<string, unknown> }
        : {}),
      ...(body.sizeGuideConfig && typeof body.sizeGuideConfig === 'object'
        ? { sizeGuideConfig: body.sizeGuideConfig as Record<string, unknown> }
        : {}),
      ...(body.adminNotificationState &&
      typeof body.adminNotificationState === 'object'
        ? {
            adminNotificationState: body.adminNotificationState as Record<
              string,
              unknown
            >,
          }
        : {}),
      deletedProductIds: mergedDeletedProducts,
      deletedCategoryIds: mergedDeletedCategories,
      deletedOrderIds: mergedDeletedOrders,
    });
    res.json(
      sanitizeCatalogStateForClient(
        updated as unknown as Record<string, unknown>
      )
    );
  });

  // Public Promo Validation Endpoint
  app.options('/api/promo/validate', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/promo/validate', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const state = await readCatalogState();
      const result = executePromoValidation(
        req.body || {},
        state as unknown as Record<string, unknown>
      );
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({
        valid: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to validate promo code right now.',
      });
    }
  });

  // Public Customer Order Checkout Endpoint
  app.options('/api/orders', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/orders', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const result = await executeCreateOrder(req.body || {}, {
        readState: async () =>
          (await readCatalogState()) as unknown as Record<string, unknown>,
        writeState: async (patch) =>
          (await writeCatalogState(
            patch as Partial<PersistedCatalogState>
          )) as unknown as Record<string, unknown>,
        onAfterOrderCreated: async ({
          order,
          updatedProducts,
          isWhishOrOmt,
          siteBanners,
        }) => {
          Promise.allSettled([
            sendOrderConfirmationEmailExpress({
              order,
              bannerUrl: siteBanners.orderEmailBannerUrl || '',
              bannerLinkUrl:
                siteBanners.orderEmailBannerLinkUrl ||
                'https://samoweave.com/new-arrivals/women',
              senderAddress:
                siteBanners.orderEmailSenderAddress || 'orders@samoweave.com',
              bccAddress:
                siteBanners.orderEmailBccAddress !== undefined
                  ? siteBanners.orderEmailBccAddress
                  : 'orders@samoweave.com',
              replyToAddress:
                siteBanners.orderEmailReplyToAddress || 'info@samoweave.com',
              promoGiftEnabled: Boolean(siteBanners.orderEmailPromoEnabled),
              promoGiftCode: siteBanners.orderEmailPromoCode || 'SAMO10',
              promoGiftDescription:
                siteBanners.orderEmailPromoDescription !== undefined
                  ? siteBanners.orderEmailPromoDescription
                  : 'Enjoy 10% off your next order',
              promoGiftBannerUrl: siteBanners.orderEmailPromoBannerUrl || '',
              adminAlertOnly: isWhishOrOmt,
            }),
            executeGoogleSheetsSyncRequest(
              {
                action: 'push_to_sheet',
                products: updatedProducts,
              },
              undefined,
              {
                readState: async () =>
                  (await readCatalogState()) as unknown as Record<
                    string,
                    unknown
                  >,
                writeState: async (patch) =>
                  (await writeCatalogState(
                    patch as Partial<PersistedCatalogState>
                  )) as unknown as Record<string, unknown>,
                envWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
                envSyncSecret: process.env.GOOGLE_SHEETS_SYNC_SECRET,
              }
            ),
          ]).catch(() => {});
        },
      });
      res.status(result.status).json(result.body);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to process order right now.',
      });
    }
  });

  // Public Customer Preorder / Notify-Me Endpoint
  app.options('/api/preorders', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/preorders', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const result = await executeCreatePreorder(req.body || {}, {
        readState: async () =>
          (await readCatalogState()) as unknown as Record<string, unknown>,
        writeState: async (patch) =>
          (await writeCatalogState(
            patch as Partial<PersistedCatalogState>
          )) as unknown as Record<string, unknown>,
      });
      res.status(result.status).json(result.body);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to submit preorder request.',
      });
    }
  });

  // Two-Way Google Sheets Live Inventory & Price Sync Endpoint
  app.options('/api/sheets-sync', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/sheets-sync', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const payload = (req.body || {}) as GoogleSheetsSyncRequestPayload;
      const action = payload?.action || 'push_to_sheet';

      if (action === 'push_to_sheet' || action === 'pull_from_sheet') {
        const authCheck = await verifyExpressAdminRequest(req);
        if (!authCheck.authorized) {
          res.status(authCheck.status).json({
            ok: false,
            error: authCheck.error || 'Unauthorized admin access.',
          });
          return;
        }
      }

      const headerSecret =
        (req.headers['x-samo-sheet-secret'] as string | undefined) || undefined;

      const result = await executeGoogleSheetsSyncRequest(
        payload,
        headerSecret,
        {
          readState: async () =>
            (await readCatalogState()) as unknown as Record<string, unknown>,
          writeState: async (patch) =>
            (await writeCatalogState(
              patch as Partial<PersistedCatalogState>
            )) as unknown as Record<string, unknown>,
          envWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL,
          envSyncSecret: process.env.GOOGLE_SHEETS_SYNC_SECRET,
        }
      );

      res.status(result.status).json(result.body);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to process Google Sheets sync request.',
      });
    }
  });

  // 0. Cloudflare R2 Image Upload Endpoint (Authenticated Admin Only)
  app.options('/api/r2-upload', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/r2-upload', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const authCheck = await verifyExpressAdminRequest(req);
      if (!authCheck.authorized) {
        res.status(authCheck.status).json({
          error: authCheck.error || 'Unauthorized admin access.',
        });
        return;
      }

      const { fileName, contentType, base64Data, folder } = req.body || {};
      if (!base64Data || typeof base64Data !== 'string') {
        res.status(400).json({ error: 'Missing base64Data payload.' });
        return;
      }

      const validatedKey = validateAndBuildR2UploadObjectKey({
        fileName,
        contentType,
        folder,
      });

      if (!validatedKey.ok) {
        res.status(400).json({ error: validatedKey.error });
        return;
      }

      const r2 = createR2Client();
      if (!r2) {
        res.status(500).json({
          error:
            'Cloudflare R2 credentials are not configured on the server.',
        });
        return;
      }

      const rawBase64 = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;
      const buffer = Buffer.from(rawBase64, 'base64');

      if (buffer.byteLength === 0) {
        res.status(400).json({ error: 'Decoded image buffer is empty.' });
        return;
      }

      const { isVideo, mimeType, objectKey } = validatedKey;
      const maxAllowedBytes = isVideo ? 35 * 1024 * 1024 : 25 * 1024 * 1024;

      if (buffer.byteLength > maxAllowedBytes) {
        res.status(413).json({
          error: isVideo
            ? 'Video exceeds the 35 MB maximum upload size.'
            : 'Image exceeds the 25 MB maximum upload size.',
        });
        return;
      }

      await r2.s3.send(
        new PutObjectCommand({
          Bucket: r2.bucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      const publicUrl = `${r2.publicBaseUrl}/${objectKey}`;
      res.status(200).json({
        url: publicUrl,
        key: objectKey,
        sizeBytes: buffer.byteLength,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload image to Cloudflare R2.';
      res.status(500).json({ error: message });
    }
  });

  // 0B. Cloudflare R2 Media Delete Endpoint (Authenticated Admin Only)
  app.options('/api/r2-delete', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/r2-delete', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const authCheck = await verifyExpressAdminRequest(req);
      if (!authCheck.authorized) {
        res.status(authCheck.status).json({
          error: authCheck.error || 'Unauthorized admin access.',
        });
        return;
      }

      const rawKeys = Array.isArray(req.body?.keys) ? req.body.keys : [];
      const safeKeys = rawKeys
        .map((k: unknown) =>
          typeof k === 'string' ? k.trim().replace(/^\/+/, '') : ''
        )
        .filter(
          (k: string) =>
            Boolean(k) &&
            (k.startsWith('products/') || k.startsWith('banners/'))
        );

      if (safeKeys.length === 0) {
        res.status(200).json({ deletedKeys: [] });
        return;
      }

      const r2 = createR2Client();
      if (r2) {
        await Promise.all(
          safeKeys.map((key: string) =>
            r2.s3
              .send(
                new DeleteObjectCommand({
                  Bucket: r2.bucketName,
                  Key: key,
                })
              )
              .catch((err) => {
                console.warn(`[SAMO R2] Failed to delete object ${key}:`, err);
              })
          )
        );
      }

      res.status(200).json({ deletedKeys: safeKeys });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete media from Cloudflare R2.';
      res.status(500).json({ error: message });
    }
  });

  // 0C. Newsletter Subscription Endpoints
  app.options('/api/newsletter/subscribe', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });
  app.options('/api/newsletter/subscribers', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });
  app.options('/api/newsletter/subscribers/:id', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.get('/api/newsletter/subscribers', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const authCheck = await verifyExpressAdminRequest(req);
      if (!authCheck.authorized) {
        res.status(authCheck.status).json({
          error: authCheck.error || 'Unauthorized admin access.',
        });
        return;
      }

      if (hasD1Config()) {
        const subs = await readD1NewsletterSubscribers();
        res.json({ subscribers: subs });
        return;
      }
      const state = await readCatalogState();
      const subs = Array.isArray(state.newsletterSubscribers)
        ? state.newsletterSubscribers
        : [];
      res.json({ subscribers: subs });
    } catch {
      res
        .status(500)
        .json({ error: 'Failed to fetch newsletter subscribers from D1 SQL.' });
    }
  });

  // Per-IP Daily Homepage Newsletter Pop-Up Frequency Cap & Permanent Subscriber IP Suppression
  const popupImpressionsMemory: Record<string, { date: string; count: number }> =
    {};
  const subscribedNewsletterIpsMemory = new Set<string>();

  const resolveClientIp = (req: express.Request): string => {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
      return cfIp.trim();
    }
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) {
      return xff.split(',')[0].trim();
    }
    if (Array.isArray(xff) && xff.length > 0) {
      return xff[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
  };

  const hasSubscribedCookieHeader = (req: express.Request): boolean => {
    const rawCookie = req.headers.cookie;
    if (typeof rawCookie !== 'string' || !rawCookie.trim()) return false;
    return rawCookie
      .split(';')
      .some((part) => part.trim() === 'samo_nl_subscribed=1');
  };

  app.post('/api/newsletter/subscribe', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const rawEmail =
        typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const rawPhone =
        typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
      const source: 'footer' | 'popup' =
        req.body?.source === 'popup' ? 'popup' : 'footer';

      const hasValidEmail = rawEmail.includes('@') && rawEmail.includes('.');
      const phoneDigits = (
        rawPhone || (!hasValidEmail ? rawEmail : '')
      ).replace(/[^\d]/g, '');
      const hasValidPhone = phoneDigits.length >= 8;

      if (!hasValidEmail && !hasValidPhone) {
        res.status(400).json({
          error: 'Please provide a valid email address or phone number.',
        });
        return;
      }

      const normalizedEmail = hasValidEmail ? rawEmail.toLowerCase() : '';
      const cleanPhone = rawPhone || (!hasValidEmail ? rawEmail : '');

      const newSub: NewsletterSubscriberRecord = {
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email: normalizedEmail || cleanPhone,
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        source,
        subscribedAt: new Date().toISOString(),
      };

      const clientIp = resolveClientIp(req);
      if (clientIp) {
        subscribedNewsletterIpsMemory.add(clientIp);
      }

      if (hasD1Config()) {
        await upsertD1NewsletterSubscriber(newSub);
        lastD1FetchMs = 0;
      } else {
        const current = await readCatalogState();
        const existingSubs = Array.isArray(current.newsletterSubscribers)
          ? (current.newsletterSubscribers as NewsletterSubscriberRecord[])
          : [];
        const deduped = [
          newSub,
          ...existingSubs.filter(
            (s) =>
              s &&
              String(s.email).toLowerCase() !== newSub.email.toLowerCase()
          ),
        ];
        await writeCatalogState({ newsletterSubscribers: deduped });
      }

      res.set(
        'Set-Cookie',
        'samo_nl_subscribed=1; Path=/; Max-Age=31536000; SameSite=Lax'
      );
      res.status(200).json({ success: true, subscriber: newSub });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to persist newsletter subscription to D1 SQL.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/newsletter/popup-eligibility', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const clientIp = resolveClientIp(req);
      const today = new Date().toISOString().slice(0, 10);
      const maxPerDay = Math.max(
        1,
        Math.floor(Number(req.query.maxPerDay) || 2)
      );
      const entry = popupImpressionsMemory[clientIp];
      const countToday = entry && entry.date === today ? entry.count : 0;
      const isAlreadySubscribed =
        subscribedNewsletterIpsMemory.has(clientIp) ||
        hasSubscribedCookieHeader(req);

      res.json({
        ip: clientIp,
        date: today,
        countToday,
        maxPerDay,
        subscribed: isAlreadySubscribed,
        eligible: !isAlreadySubscribed && countToday < maxPerDay,
      });
    } catch {
      res.json({ eligible: true, countToday: 0, subscribed: false });
    }
  });

  app.post('/api/newsletter/popup-impression', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const clientIp = resolveClientIp(req);
      const today = new Date().toISOString().slice(0, 10);

      for (const [ipKey, rec] of Object.entries(popupImpressionsMemory)) {
        if (!rec || rec.date !== today) {
          delete popupImpressionsMemory[ipKey];
        }
      }

      const prev = popupImpressionsMemory[clientIp];
      const nextCount = prev && prev.date === today ? prev.count + 1 : 1;
      popupImpressionsMemory[clientIp] = { date: today, count: nextCount };

      res.json({ ip: clientIp, date: today, countToday: nextCount });
    } catch {
      res.status(200).json({ ok: true });
    }
  });

  app.delete('/api/newsletter/subscribers/:id', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const authCheck = await verifyExpressAdminRequest(req);
      if (!authCheck.authorized) {
        res.status(authCheck.status).json({
          error: authCheck.error || 'Unauthorized admin access.',
        });
        return;
      }

      const targetId = req.params.id;
      if (hasD1Config()) {
        const all = await readD1NewsletterSubscribers();
        const target = all.find(
          (s) =>
            s.id === targetId ||
            s.email.toLowerCase() === targetId.toLowerCase()
        );
        if (target) {
          await deleteD1NewsletterSubscriber(target.email);
          lastD1FetchMs = 0;
        }
        const filtered = await readD1NewsletterSubscribers();
        res.status(200).json({ success: true, subscribers: filtered });
        return;
      }

      const current = await readCatalogState();
      const existingSubs = Array.isArray(current.newsletterSubscribers)
        ? (current.newsletterSubscribers as NewsletterSubscriberRecord[])
        : [];
      const filtered = existingSubs.filter(
        (s) =>
          s &&
          s.id !== targetId &&
          String(s.email).toLowerCase() !== targetId.toLowerCase()
      );
      await writeCatalogState({ newsletterSubscribers: filtered });
      res.status(200).json({ success: true, subscribers: filtered });
    } catch {
      res
        .status(500)
        .json({ error: 'Failed to delete subscriber from D1 SQL.' });
    }
  });

  // 1. Admin Product Editorial Copy & Material Generator (gemini-3.8-flash)
  app.post(['/api/ai/product-copy', '/api/ai/admin-copy'], async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const authCheck = await verifyExpressAdminRequest(req);
      if (!authCheck.authorized) {
        res.status(authCheck.status).json({
          error: authCheck.error || 'Unauthorized admin access.',
        });
        return;
      }

      const { name, department, category, style, materials } = req.body || {};
      if (!name) {
        res.status(400).json({ error: 'Product name is required.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Generate luxury architectural fashion product metadata for SAMO:
Product Name: ${name}
Department: ${department || 'women'}
Category: ${category || 'Jacket'}
Style: ${style || 'Fine Leather'}
Selected Materials: ${Array.isArray(materials) ? materials.join(', ') : 'Cow Leather'}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description:
                  '2-3 sentence brutalist-luxury editorial product description focusing on silhouette and construction.',
              },
              suggestedMaterials: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Up to 3 recommended materials from Cow Leather, Suede, Cotton, Wool, Cashmere, Silk, Linen, Denim, Satin, Lace.',
              },
              recommendedSizeType: {
                type: Type.STRING,
                description: 'Recommended sizeType: letter, numeric, or cm.',
              },
            },
            required: [
              'description',
              'suggestedMaterials',
              'recommendedSizeType',
            ],
          },
        },
      });

      const rawText = response.text?.trim() || '{}';
      res.json(JSON.parse(rawText));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate product copy';
      res.status(500).json({ error: message });
    }
  });

  // 2. Transactional Order Confirmation Email via Resend REST API (Authenticated Admin Only)
  app.options('/api/order-confirmation-email', (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string)).status(204).end();
  });

  app.post('/api/order-confirmation-email', async (req, res) => {
    res.set(getCorsHeaders(req.headers.origin as string));
    try {
      const authCheck = await verifyExpressAdminRequest(req);
      if (!authCheck.authorized) {
        res.status(authCheck.status).json({
          ok: false,
          error: authCheck.error || 'Unauthorized admin access.',
        });
        return;
      }

      const result = await sendOrderConfirmationEmailExpress(req.body || {});
      res.status(result.status).json(result.body);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected error sending order confirmation email.';
      console.warn('[SAMO] Order email handler error:', message);
      res.status(200).json({
        ok: false,
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SAMO Server listening on http://localhost:${PORT}`);
  });
}

startServer();
