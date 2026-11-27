export interface R2BucketBinding {
  get(key: string): Promise<{
    text(): Promise<string>;
    json<T>(): Promise<T>;
  } | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta: unknown }>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(
    statements: D1PreparedStatement[]
  ): Promise<Array<{ results: T[]; success: boolean }>>;
}

export interface Env {
  SAMO_R2_BUCKET?: R2BucketBinding;
  DB?: D1DatabaseBinding;
  SAMO_D1?: D1DatabaseBinding;
  RESEND_API_KEY?: string;
  GOOGLE_SHEETS_WEBHOOK_URL?: string;
  GOOGLE_SHEETS_SYNC_SECRET?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const STATE_OBJECT_KEY = 'state/catalog.json';

// Isolate-level in-memory cache (30s TTL) to cut D1 SQL row reads & R2 Class B reads by ~90%-95%
// Instantly refreshed/invalidated whenever POST /api/catalog writes new data.
const ISOLATE_CACHE_TTL_MS = 30_000;
let isolateCatalogCache: Record<string, unknown> | null = null;
let isolateCatalogJson: string | null = null;
let isolateCacheTimestamp = 0;
let garmentCodeColumnMigrated = false;
let hiddenFromStoreColumnMigrated = false;
let promoMaxUsesColumnMigrated = false;
let unusedSecondaryIndexesDropped = false;

function safeJsonParse<T = unknown>(str: unknown, fallback: T): T {
  if (typeof str !== 'string' || !str.trim()) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function serializeProductD1Meta(p: Record<string, any>): {
  discountBadgeColumn: string | null;
  discountPercentColumn: number | null;
  featuredColumn: number;
  customStyleColumn: string;
} {
  const rawType = p?.discountType;
  const discountType: 'none' | 'percentage' | 'fixed' =
    rawType === 'percentage' || rawType === 'fixed' ? rawType : 'none';
  const rawVal = Number(p?.discountValue ?? p?.discountPercent) || 0;
  const discountValue =
    discountType !== 'none' && rawVal > 0
      ? Math.round(rawVal * 100) / 100
      : 0;
  const effectiveDiscountType: 'none' | 'percentage' | 'fixed' =
    discountValue > 0 ? discountType : 'none';

  const isNewArrival =
    typeof p?.isNewArrival === 'boolean'
      ? p.isNewArrival
      : Boolean(p?.featured);

  const showInHomeNewArrivals = isNewArrival
    ? typeof p?.showInHomeNewArrivals === 'boolean'
      ? p.showInHomeNewArrivals
      : true
    : false;

  const homeNewArrivalsOrder =
    typeof p?.homeNewArrivalsOrder === 'number' &&
    Number.isFinite(p.homeNewArrivalsOrder) &&
    p.homeNewArrivalsOrder > 0
      ? Math.floor(p.homeNewArrivalsOrder)
      : undefined;

  const isHomeCategoryCover =
    typeof p?.isHomeCategoryCover === 'boolean'
      ? p.isHomeCategoryCover
      : undefined;

  const showInHomeBags =
    typeof p?.showInHomeBags === 'boolean' ? p.showInHomeBags : undefined;

  const homeBagsOrder =
    typeof p?.homeBagsOrder === 'number' &&
    Number.isFinite(p.homeBagsOrder) &&
    p.homeBagsOrder > 0
      ? Math.floor(p.homeBagsOrder)
      : undefined;

  const envelope = {
    _samoMeta: 1,
    discountType: effectiveDiscountType,
    discountValue,
    isNewArrival,
    showInHomeNewArrivals,
    ...(homeNewArrivalsOrder !== undefined ? { homeNewArrivalsOrder } : {}),
    ...(isHomeCategoryCover !== undefined ? { isHomeCategoryCover } : {}),
    ...(showInHomeBags !== undefined ? { showInHomeBags } : {}),
    ...(homeBagsOrder !== undefined ? { homeBagsOrder } : {}),
  };

  return {
    discountBadgeColumn:
      effectiveDiscountType !== 'none' ? effectiveDiscountType : null,
    discountPercentColumn: discountValue > 0 ? discountValue : null,
    featuredColumn: isNewArrival ? 1 : 0,
    customStyleColumn: JSON.stringify(envelope),
  };
}

function deserializeProductD1Meta(row: Record<string, any>) {
  let parsedEnvelope: Record<string, any> | null = null;
  if (
    typeof row?.custom_style === 'string' &&
    row.custom_style.trim().startsWith('{')
  ) {
    try {
      const obj = JSON.parse(row.custom_style);
      if (obj && typeof obj === 'object') {
        parsedEnvelope = obj;
      }
    } catch {
      parsedEnvelope = null;
    }
  }

  const rawBadge =
    typeof parsedEnvelope?.discountType === 'string'
      ? parsedEnvelope.discountType
      : typeof row?.discount_badge === 'string'
      ? row.discount_badge.trim().toLowerCase()
      : '';

  const rawVal =
    typeof parsedEnvelope?.discountValue === 'number'
      ? parsedEnvelope.discountValue
      : Number(row?.discount_percent) || 0;

  let discountType: 'none' | 'percentage' | 'fixed' = 'none';
  if (rawBadge === 'percentage' || rawBadge === 'fixed') {
    discountType = rawBadge;
  } else if (rawVal > 0) {
    discountType = 'percentage';
  }

  const discountValue =
    discountType !== 'none' && rawVal > 0
      ? Math.round(rawVal * 100) / 100
      : 0;
  if (discountValue <= 0) {
    discountType = 'none';
  }

  const isNewArrival =
    typeof parsedEnvelope?.isNewArrival === 'boolean'
      ? parsedEnvelope.isNewArrival
      : Boolean(row?.featured);

  const showInHomeNewArrivals = !isNewArrival
    ? false
    : typeof parsedEnvelope?.showInHomeNewArrivals === 'boolean'
    ? parsedEnvelope.showInHomeNewArrivals
    : undefined;

  const homeNewArrivalsOrder =
    typeof parsedEnvelope?.homeNewArrivalsOrder === 'number' &&
    Number.isFinite(parsedEnvelope.homeNewArrivalsOrder) &&
    parsedEnvelope.homeNewArrivalsOrder > 0
      ? Math.floor(parsedEnvelope.homeNewArrivalsOrder)
      : undefined;

  const isHomeCategoryCover =
    typeof parsedEnvelope?.isHomeCategoryCover === 'boolean'
      ? parsedEnvelope.isHomeCategoryCover
      : undefined;

  const showInHomeBags =
    typeof parsedEnvelope?.showInHomeBags === 'boolean'
      ? parsedEnvelope.showInHomeBags
      : undefined;

  const homeBagsOrder =
    typeof parsedEnvelope?.homeBagsOrder === 'number' &&
    Number.isFinite(parsedEnvelope.homeBagsOrder) &&
    parsedEnvelope.homeBagsOrder > 0
      ? Math.floor(parsedEnvelope.homeBagsOrder)
      : undefined;

  return {
    discountType,
    discountValue,
    isNewArrival,
    featured: isNewArrival,
    ...(showInHomeNewArrivals !== undefined ? { showInHomeNewArrivals } : {}),
    ...(homeNewArrivalsOrder !== undefined ? { homeNewArrivalsOrder } : {}),
    ...(isHomeCategoryCover !== undefined ? { isHomeCategoryCover } : {}),
    ...(showInHomeBags !== undefined ? { showInHomeBags } : {}),
    ...(homeBagsOrder !== undefined ? { homeBagsOrder } : {}),
  };
}

async function readFromD1(
  db: D1DatabaseBinding
): Promise<Record<string, unknown> | null> {
  try {
    const [
      prodsRes,
      catsRes,
      ordersRes,
      preordersRes,
      newsletterRes,
      promosRes,
      adminsRes,
      settingsRes,
    ] = await Promise.all([
      db.prepare('SELECT * FROM products ORDER BY name ASC;').all<any>(),
      db
        .prepare('SELECT * FROM categories ORDER BY display_order ASC;')
        .all<any>(),
      db.prepare('SELECT * FROM orders ORDER BY created_at DESC;').all<any>(),
      db
        .prepare('SELECT * FROM preorders ORDER BY created_at DESC;')
        .all<any>(),
      db
        .prepare(
          'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC;'
        )
        .all<any>(),
      db
        .prepare('SELECT * FROM promo_codes ORDER BY created_at DESC;')
        .all<any>(),
      db.prepare('SELECT * FROM admins;').all<any>(),
      db.prepare('SELECT key, value, updated_at FROM settings;').all<any>(),
    ]);

    const products = (prodsRes.results || []).map((p: any) => {
      const parsedSetPieces = safeJsonParse(p.full_set_pieces, []);
      const unpackedMeta = deserializeProductD1Meta(p);
      return {
        id: p.id,
        name: p.name,
        garmentCode: p.garment_code ?? undefined,
        department: p.department,
        category: p.category,
        price: Number(p.price) || 0,
        originalPrice: p.original_price ?? undefined,
        discountPercent: p.discount_percent ?? undefined,
        discountBadge: p.discount_badge ?? undefined,
        discountType: unpackedMeta.discountType,
        discountValue: unpackedMeta.discountValue,
        style: p.style || 'Classic Luxury',
        customStyle: p.custom_style ?? undefined,
        materials: safeJsonParse(p.materials, []),
        sizes: safeJsonParse(p.sizes, []),
        sizeQuantities: safeJsonParse(p.size_quantities, {}),
        imageUrl: p.image_url || '',
        galleryUrls: safeJsonParse(p.gallery_urls, []),
        hasColors: Boolean(p.has_colors),
        colorVariants: safeJsonParse(p.color_variants, []),
        isFullSet: Boolean(p.is_full_set),
        setItems: parsedSetPieces,
        fullSetPieces: parsedSetPieces,
        inStock: Boolean(p.in_stock),
        hiddenFromStore: Boolean(p.hidden_from_store),
        preorderEnabled: Boolean(p.preorder_enabled),
        description: p.description || '',
        details: safeJsonParse(p.details, []),
        isNewArrival: unpackedMeta.isNewArrival,
        featured: unpackedMeta.featured,
        ...(unpackedMeta.showInHomeNewArrivals !== undefined
          ? { showInHomeNewArrivals: unpackedMeta.showInHomeNewArrivals }
          : {}),
        ...(unpackedMeta.homeNewArrivalsOrder !== undefined
          ? { homeNewArrivalsOrder: unpackedMeta.homeNewArrivalsOrder }
          : {}),
        ...(unpackedMeta.isHomeCategoryCover !== undefined
          ? { isHomeCategoryCover: unpackedMeta.isHomeCategoryCover }
          : {}),
        ...(unpackedMeta.showInHomeBags !== undefined
          ? { showInHomeBags: unpackedMeta.showInHomeBags }
          : {}),
        ...(unpackedMeta.homeBagsOrder !== undefined
          ? { homeBagsOrder: unpackedMeta.homeBagsOrder }
          : {}),
        sizeType: p.size_type || 'letter',
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
      };
    });

    const categories = (catsRes.results || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      department: c.department,
      sortOrder:
        typeof c.display_order === 'number' && c.display_order > 0
          ? c.display_order
          : undefined,
      displayOrder: c.display_order ?? 0,
      active: !Boolean(c.hidden_from_nav),
      hiddenFromNav: Boolean(c.hidden_from_nav),
      sizeGuides: c.size_guides ? safeJsonParse(c.size_guides, undefined) : undefined,
      createdAt: c.created_at || new Date().toISOString(),
    }));

    const orders = (ordersRes.results || []).map((o: any) => {
      const parsedItems = safeJsonParse<any[]>(o.items, []);
      const parsedMeta = safeJsonParse<Record<string, any> | null>(
        o.order_notes,
        null
      );
      const shippingLoc =
        parsedMeta?.shippingLocation ||
        o.customer_address ||
        o.customer_city ||
        '';
      return {
        id: o.id,
        orderNumber: parsedMeta?.orderNumber || o.id,
        customerName: o.customer_name,
        customerEmail: o.customer_email || '',
        customerPhone: o.customer_phone || '',
        shippingLocation: shippingLoc,
        customerAddress: o.customer_address || shippingLoc,
        customerCity: o.customer_city || '',
        deliveryMethod: o.delivery_method || 'Standard Delivery',
        paymentMethod: parsedMeta?.paymentMethod || 'COD',
        paymentVerified: Boolean(parsedMeta?.paymentVerified),
        totalPrice: Number(o.total_price) || 0,
        subtotal: Number(o.subtotal) || 0,
        discountAmount: Number(o.discount_amount) || 0,
        deliveryFee: Number(o.delivery_fee) || 0,
        status: o.status,
        promoCode: o.promo_code || undefined,
        itemsSummary: parsedMeta?.itemsSummary || '',
        itemsCount:
          Number(parsedMeta?.itemsCount) ||
          parsedItems.reduce(
            (sum, it) => sum + (Number(it?.quantity) || 1),
            0
          ) ||
          1,
        primaryProductName:
          parsedMeta?.primaryProductName ||
          parsedItems[0]?.productName ||
          'SAMO Order',
        primaryProductSize:
          parsedMeta?.primaryProductSize ||
          parsedItems[0]?.selectedSize ||
          'OS',
        primaryProductImage:
          parsedMeta?.primaryProductImage ||
          parsedItems[0]?.imageUrl ||
          '',
        orderedItems: parsedItems,
        items: parsedItems,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      };
    });

    const preorders = (preordersRes.results || []).map((pr: any) => ({
      id: pr.id,
      productId: pr.product_id,
      productName: pr.product_name,
      size: pr.size || '',
      colorName: pr.color_name || undefined,
      clientName: pr.client_name,
      clientEmail: pr.client_email || '',
      clientPhone: pr.client_phone || '',
      status: pr.status,
      createdAt: pr.created_at,
    }));

    const newsletterSubscribers = (newsletterRes.results || []).map(
      (n: any) => ({
        id: n.id,
        email: n.email,
        phone: n.phone || undefined,
        source: n.source || 'footer',
        subscribedAt: n.subscribed_at,
      })
    );

    const promoCodes = (promosRes.results || []).map((pc: any) => ({
      id: pc.id,
      code: pc.code,
      discountType: pc.discount_type,
      discountValue: Number(pc.discount_value) || 0,
      minOrderAmount: Number(pc.min_order_amount) || 0,
      maxUsesPerEmail:
        Number(pc.max_uses_per_email) > 0
          ? Number(pc.max_uses_per_email)
          : undefined,
      isActive: Boolean(pc.is_active),
      active: Boolean(pc.is_active),
      createdAt: pc.created_at,
    }));

    const admins = (adminsRes.results || []).map((a: any) => ({
      email: a.email,
      role: a.role,
      addedAt: a.added_at,
      addedBy: a.added_by,
    }));

    const settingsMap: Record<string, any> = {};
    let maxUpdatedAt = 0;
    for (const row of settingsRes.results || []) {
      try {
        settingsMap[row.key] = JSON.parse(row.value);
      } catch {
        settingsMap[row.key] = row.value;
      }
      if (Number(row.updated_at) > maxUpdatedAt) {
        maxUpdatedAt = Number(row.updated_at);
      }
    }

    const deletedOrderIdsList: string[] = Array.isArray(
      settingsMap.deletedOrderIds
    )
      ? settingsMap.deletedOrderIds
      : [];
    const deletedOrderSet = new Set(deletedOrderIdsList);
    const filteredOrders = orders.filter((o) => !deletedOrderSet.has(o.id));

    return {
      updatedAt: maxUpdatedAt || Date.now(),
      products,
      categories,
      orders: filteredOrders,
      preorders,
      newsletterSubscribers,
      promoCodes,
      admins,
      siteBanners: settingsMap.siteBanners || undefined,
      autoAcceptOrders:
        typeof settingsMap.autoAcceptOrders === 'boolean'
          ? settingsMap.autoAcceptOrders
          : true,
      showLowStockCount:
        typeof settingsMap.showLowStockCount === 'boolean'
          ? settingsMap.showLowStockCount
          : false,
      shrinkUploadsEnabled:
        typeof settingsMap.shrinkUploadsEnabled === 'boolean'
          ? settingsMap.shrinkUploadsEnabled
          : true,
      codEnabled:
        typeof settingsMap.codEnabled === 'boolean'
          ? settingsMap.codEnabled
          : false,
      newsletterPopupConfig: settingsMap.newsletterPopupConfig || undefined,
      seoConfig: settingsMap.seoConfig || undefined,
      sizeGuideConfig: settingsMap.sizeGuideConfig || undefined,
      customMaterials: settingsMap.customMaterials || undefined,
      customColors: settingsMap.customColors || undefined,
      deletedProductIds: settingsMap.deletedProductIds || [],
      deletedCategoryIds: settingsMap.deletedCategoryIds || [],
      deletedOrderIds: deletedOrderIdsList,
      newsletterPopupImpressions:
        settingsMap.newsletterPopupImpressions || undefined,
      adminNotificationState:
        settingsMap.adminNotificationState || undefined,
    };
  } catch (err) {
    console.error('Error querying Cloudflare D1 in Pages:', err);
    return null;
  }
}

function buildProductPersistSignature(p: any): string {
  const setPiecesPayload = Array.isArray(p?.setItems)
    ? p.setItems
    : Array.isArray(p?.fullSetPieces)
    ? p.fullSetPieces
    : [];
  const serializedMeta = serializeProductD1Meta(p || {});
  return JSON.stringify([
    p?.id || '',
    p?.name || '',
    p?.garmentCode ?? null,
    p?.department || 'women',
    p?.category || 'Tops',
    p?.price ?? 0,
    p?.originalPrice ?? null,
    serializedMeta.discountPercentColumn,
    serializedMeta.discountBadgeColumn,
    p?.style || 'Classic Luxury',
    serializedMeta.customStyleColumn,
    Array.isArray(p?.materials) ? p.materials : [],
    Array.isArray(p?.sizes) ? p.sizes : [],
    p?.sizeQuantities || {},
    p?.imageUrl || '',
    Array.isArray(p?.galleryUrls) ? p.galleryUrls : [],
    p?.hasColors ? 1 : 0,
    Array.isArray(p?.colorVariants) ? p.colorVariants : [],
    p?.isFullSet ? 1 : 0,
    setPiecesPayload,
    p?.inStock !== false ? 1 : 0,
    p?.hiddenFromStore ? 1 : 0,
    p?.preorderEnabled ? 1 : 0,
    p?.description || '',
    Array.isArray(p?.details) ? p.details : [],
    serializedMeta.featuredColumn,
    p?.sizeType || 'letter',
  ]);
}

function buildCategoryPersistSignature(c: any): string {
  const isHidden = c?.active === false || Boolean(c?.hiddenFromNav);
  const dispOrder =
    typeof c?.sortOrder === 'number' && Number.isFinite(c.sortOrder)
      ? c.sortOrder
      : c?.displayOrder ?? 0;
  return JSON.stringify([
    c?.id || '',
    c?.name || '',
    c?.department || 'women',
    dispOrder,
    isHidden ? 1 : 0,
    c?.sizeGuides ? c.sizeGuides : null,
  ]);
}

function buildOrderPersistSignature(o: any): string {
  const lineItems = Array.isArray(o?.orderedItems)
    ? o.orderedItems
    : Array.isArray(o?.items)
    ? o.items
    : [];
  return JSON.stringify([
    o?.id || '',
    o?.customerName || '',
    o?.customerEmail || '',
    o?.customerPhone || '',
    o?.shippingLocation || o?.customerAddress || '',
    o?.customerCity || '',
    o?.deliveryMethod || 'Standard Delivery',
    o?.totalPrice ?? 0,
    o?.subtotal ?? 0,
    o?.discountAmount ?? 0,
    o?.deliveryFee ?? 0,
    o?.status || 'accepted',
    o?.promoCode ?? null,
    Boolean(o?.paymentVerified),
    o?.paymentMethod || 'COD',
    lineItems,
  ]);
}

async function writeToD1(
  db: D1DatabaseBinding,
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
  mergedDeletedProducts: string[],
  mergedDeletedCategories: string[],
  mergedDeletedOrders: string[]
): Promise<void> {
  if (!unusedSecondaryIndexesDropped) {
    unusedSecondaryIndexesDropped = true;
    try {
      await db.batch([
        db.prepare('DROP INDEX IF EXISTS idx_categories_dept;'),
        db.prepare('DROP INDEX IF EXISTS idx_products_dept;'),
        db.prepare('DROP INDEX IF EXISTS idx_products_cat;'),
        db.prepare('DROP INDEX IF EXISTS idx_products_instock;'),
        db.prepare('DROP INDEX IF EXISTS idx_orders_status;'),
        db.prepare('DROP INDEX IF EXISTS idx_orders_created;'),
        db.prepare('DROP INDEX IF EXISTS idx_preorders_status;'),
        db.prepare('DROP INDEX IF EXISTS idx_newsletter_email;'),
        db.prepare('DROP INDEX IF EXISTS idx_promo_code;'),
      ]);
    } catch {
      // Ignore if indexes were already dropped
    }
  }

  const statements: D1PreparedStatement[] = [];
  const currentProductsList = Array.isArray(current.products)
    ? (current.products as any[])
    : [];
  const currentCategoriesList = Array.isArray(current.categories)
    ? (current.categories as any[])
    : [];
  const currentOrdersList = Array.isArray(current.orders)
    ? (current.orders as any[])
    : [];
  const currentPreordersList = Array.isArray(current.preorders)
    ? (current.preorders as any[])
    : [];
  const currentPromoCodesList = Array.isArray(current.promoCodes)
    ? (current.promoCodes as any[])
    : [];

  if (Array.isArray(patch.products)) {
    if (!garmentCodeColumnMigrated) {
      try {
        await db
          .prepare('ALTER TABLE products ADD COLUMN garment_code TEXT;')
          .run();
      } catch {
        // Column already exists
      } finally {
        garmentCodeColumnMigrated = true;
      }
    }

    if (!hiddenFromStoreColumnMigrated) {
      try {
        await db
          .prepare(
            'ALTER TABLE products ADD COLUMN hidden_from_store INTEGER NOT NULL DEFAULT 0;'
          )
          .run();
      } catch {
        // Column already exists
      } finally {
        hiddenFromStoreColumnMigrated = true;
      }
    }

    const existingProdSigById = new Map<string, string>();
    for (const ep of currentProductsList) {
      if (ep && ep.id) {
        existingProdSigById.set(ep.id, buildProductPersistSignature(ep));
      }
    }

    for (const p of patch.products as any[]) {
      if (!p || !p.id) continue;
      const nextSig = buildProductPersistSignature(p);
      if (existingProdSigById.get(p.id) === nextSig) {
        // Unchanged product — skip SQL write completely!
        continue;
      }

      const setPiecesPayload = Array.isArray(p.setItems)
        ? p.setItems
        : Array.isArray(p.fullSetPieces)
        ? p.fullSetPieces
        : [];
      const serializedMeta = serializeProductD1Meta(p || {});
      statements.push(
        db
          .prepare(
            `INSERT INTO products (
              id, name, garment_code, department, category, price, original_price, discount_percent, discount_badge,
              style, custom_style, materials, sizes, size_quantities, image_url, gallery_urls,
              has_colors, color_variants, is_full_set, full_set_pieces, in_stock, hidden_from_store, preorder_enabled,
              description, details, featured, size_type, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?
            ) ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              garment_code=excluded.garment_code,
              department=excluded.department,
              category=excluded.category,
              price=excluded.price,
              original_price=excluded.original_price,
              discount_percent=excluded.discount_percent,
              discount_badge=excluded.discount_badge,
              style=excluded.style,
              custom_style=excluded.custom_style,
              materials=excluded.materials,
              sizes=excluded.sizes,
              size_quantities=excluded.size_quantities,
              image_url=excluded.image_url,
              gallery_urls=excluded.gallery_urls,
              has_colors=excluded.has_colors,
              color_variants=excluded.color_variants,
              is_full_set=excluded.is_full_set,
              full_set_pieces=excluded.full_set_pieces,
              in_stock=excluded.in_stock,
              hidden_from_store=excluded.hidden_from_store,
              preorder_enabled=excluded.preorder_enabled,
              description=excluded.description,
              details=excluded.details,
              featured=excluded.featured,
              size_type=excluded.size_type,
              updated_at=excluded.updated_at;`
          )
          .bind(
            p.id,
            p.name || '',
            p.garmentCode ?? null,
            p.department || 'women',
            p.category || 'Tops',
            p.price ?? 0,
            p.originalPrice ?? null,
            serializedMeta.discountPercentColumn,
            serializedMeta.discountBadgeColumn,
            p.style || 'Classic Luxury',
            serializedMeta.customStyleColumn,
            JSON.stringify(Array.isArray(p.materials) ? p.materials : []),
            JSON.stringify(Array.isArray(p.sizes) ? p.sizes : []),
            JSON.stringify(p.sizeQuantities || {}),
            p.imageUrl || '',
            JSON.stringify(Array.isArray(p.galleryUrls) ? p.galleryUrls : []),
            p.hasColors ? 1 : 0,
            JSON.stringify(Array.isArray(p.colorVariants) ? p.colorVariants : []),
            p.isFullSet ? 1 : 0,
            JSON.stringify(setPiecesPayload),
            p.inStock !== false ? 1 : 0,
            p.hiddenFromStore ? 1 : 0,
            p.preorderEnabled ? 1 : 0,
            p.description || '',
            JSON.stringify(Array.isArray(p.details) ? p.details : []),
            serializedMeta.featuredColumn,
            p.sizeType || 'letter',
            p.createdAt || new Date().toISOString(),
            p.updatedAt || new Date().toISOString()
          )
      );
    }
  }

  const prevDeletedProductsSet = new Set(
    Array.isArray(current.deletedProductIds)
      ? (current.deletedProductIds as string[])
      : []
  );
  const newlyDeletedProducts = mergedDeletedProducts.filter(
    (id) => id && !prevDeletedProductsSet.has(id)
  );
  for (const delId of newlyDeletedProducts) {
    statements.push(
      db.prepare('DELETE FROM products WHERE id = ?;').bind(delId)
    );
  }

  if (Array.isArray(patch.categories)) {
    const existingCatSigById = new Map<string, string>();
    for (const ec of currentCategoriesList) {
      if (ec && ec.id) {
        existingCatSigById.set(ec.id, buildCategoryPersistSignature(ec));
      }
    }

    for (const c of patch.categories as any[]) {
      if (!c || !c.id) continue;
      if (existingCatSigById.get(c.id) === buildCategoryPersistSignature(c)) {
        continue;
      }
      const isHidden = c.active === false || Boolean(c.hiddenFromNav);
      const dispOrder =
        typeof c.sortOrder === 'number' && Number.isFinite(c.sortOrder)
          ? c.sortOrder
          : c.displayOrder ?? 0;
      statements.push(
        db
          .prepare(
            `INSERT INTO categories (
              id, name, department, display_order, hidden_from_nav, size_guides, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              department=excluded.department,
              display_order=excluded.display_order,
              hidden_from_nav=excluded.hidden_from_nav,
              size_guides=excluded.size_guides;`
          )
          .bind(
            c.id,
            c.name || '',
            c.department || 'women',
            dispOrder,
            isHidden ? 1 : 0,
            c.sizeGuides ? JSON.stringify(c.sizeGuides) : null,
            c.createdAt || new Date().toISOString()
          )
      );
    }
  }

  const prevDeletedCategoriesSet = new Set(
    Array.isArray(current.deletedCategoryIds)
      ? (current.deletedCategoryIds as string[])
      : []
  );
  const newlyDeletedCategories = mergedDeletedCategories.filter(
    (id) => id && !prevDeletedCategoriesSet.has(id)
  );
  for (const delCatId of newlyDeletedCategories) {
    statements.push(
      db.prepare('DELETE FROM categories WHERE id = ?;').bind(delCatId)
    );
  }

  const prevDeletedOrdersSet = new Set(
    Array.isArray(current.deletedOrderIds)
      ? (current.deletedOrderIds as string[])
      : []
  );
  const newlyDeletedOrders = mergedDeletedOrders.filter(
    (id) => id && !prevDeletedOrdersSet.has(id)
  );

  if (Array.isArray(patch.orders)) {
    const deletedOrderSet = new Set(mergedDeletedOrders);
    const existingOrderSigById = new Map<string, string>();
    for (const eo of currentOrdersList) {
      if (eo && eo.id) {
        existingOrderSigById.set(eo.id, buildOrderPersistSignature(eo));
      }
    }

    const incomingOrderIds = new Set<string>();
    for (const o of patch.orders as any[]) {
      if (!o || !o.id || deletedOrderSet.has(o.id)) continue;
      incomingOrderIds.add(o.id);
      if (existingOrderSigById.get(o.id) === buildOrderPersistSignature(o)) {
        continue;
      }
      const lineItems = Array.isArray(o.orderedItems)
        ? o.orderedItems
        : Array.isArray(o.items)
        ? o.items
        : [];
      const orderMetaJson = JSON.stringify({
        orderNumber: o.orderNumber || o.id,
        shippingLocation: o.shippingLocation || o.customerAddress || '',
        paymentMethod: o.paymentMethod || 'COD',
        paymentVerified: Boolean(o.paymentVerified),
        itemsSummary: o.itemsSummary || '',
        itemsCount: o.itemsCount ?? lineItems.length,
        primaryProductName: o.primaryProductName || '',
        primaryProductSize: o.primaryProductSize || '',
        primaryProductImage: o.primaryProductImage || '',
      });
      statements.push(
        db
          .prepare(
            `INSERT INTO orders (
              id, customer_name, customer_email, customer_phone, customer_address, customer_city,
              delivery_method, total_price, subtotal, discount_amount, delivery_fee, status,
              promo_code, order_notes, items, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?
            ) ON CONFLICT(id) DO UPDATE SET
              status=excluded.status,
              order_notes=excluded.order_notes,
              items=excluded.items,
              updated_at=excluded.updated_at;`
          )
          .bind(
            o.id,
            o.customerName || '',
            o.customerEmail || '',
            o.customerPhone || '',
            o.shippingLocation || o.customerAddress || '',
            o.customerCity || '',
            o.deliveryMethod || 'Standard Delivery',
            o.totalPrice ?? 0,
            o.subtotal ?? 0,
            o.discountAmount ?? 0,
            o.deliveryFee ?? 0,
            o.status || 'accepted',
            o.promoCode ?? null,
            orderMetaJson,
            JSON.stringify(lineItems),
            o.createdAt || new Date().toISOString(),
            o.updatedAt || new Date().toISOString()
          )
      );
    }

    // Delete only orders that were removed from patch.orders or newly added to deletedOrderIds
    const ordersToDelete = new Set<string>(newlyDeletedOrders);
    for (const eo of currentOrdersList) {
      if (eo && eo.id && !incomingOrderIds.has(eo.id)) {
        ordersToDelete.add(eo.id);
      }
    }
    for (const delOrdId of ordersToDelete) {
      statements.push(
        db.prepare('DELETE FROM orders WHERE id = ?;').bind(delOrdId)
      );
    }
  } else if (newlyDeletedOrders.length > 0) {
    for (const delOrdId of newlyDeletedOrders) {
      statements.push(
        db.prepare('DELETE FROM orders WHERE id = ?;').bind(delOrdId)
      );
    }
  }

  if (Array.isArray(patch.preorders)) {
    const existingPreorderSigById = new Map<string, string>();
    for (const ep of currentPreordersList) {
      if (ep && ep.id) {
        existingPreorderSigById.set(
          ep.id,
          JSON.stringify([ep.id, ep.status || 'pending'])
        );
      }
    }
    for (const pr of patch.preorders as any[]) {
      if (!pr || !pr.id) continue;
      const sig = JSON.stringify([pr.id, pr.status || 'pending']);
      if (existingPreorderSigById.get(pr.id) === sig) continue;
      statements.push(
        db
          .prepare(
            `INSERT INTO preorders (
              id, product_id, product_name, size, color_name, client_name, client_email, client_phone, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              status=excluded.status;`
          )
          .bind(
            pr.id,
            pr.productId || null,
            pr.productName || '',
            pr.size || '',
            pr.colorName || null,
            pr.clientName || '',
            pr.clientEmail || '',
            pr.clientPhone || '',
            pr.status || 'pending',
            pr.createdAt || new Date().toISOString()
          )
      );
    }
  }

  if (Array.isArray(patch.promoCodes)) {
    if (!promoMaxUsesColumnMigrated) {
      try {
        await db
          .prepare(
            'ALTER TABLE promo_codes ADD COLUMN max_uses_per_email INTEGER DEFAULT 0;'
          )
          .run();
      } catch {
        // Column already exists
      } finally {
        promoMaxUsesColumnMigrated = true;
      }
    }
    const existingPromoSigByCode = new Map<string, string>();
    for (const epc of currentPromoCodesList) {
      if (epc && epc.code) {
        const isAct = epc.active !== undefined ? epc.active : epc.isActive;
        const maxUses = Math.max(
          0,
          Math.floor(Number(epc.maxUsesPerEmail) || 0)
        );
        existingPromoSigByCode.set(
          epc.code,
          JSON.stringify([
            epc.code,
            epc.discountType || 'percent',
            epc.discountValue ?? 0,
            epc.minOrderAmount ?? 0,
            maxUses,
            isAct !== false ? 1 : 0,
          ])
        );
      }
    }
    for (const pc of patch.promoCodes as any[]) {
      if (!pc || !pc.code) continue;
      const isAct = pc.active !== undefined ? pc.active : pc.isActive;
      const maxUses = Math.max(0, Math.floor(Number(pc.maxUsesPerEmail) || 0));
      const sig = JSON.stringify([
        pc.code,
        pc.discountType || 'percent',
        pc.discountValue ?? 0,
        pc.minOrderAmount ?? 0,
        maxUses,
        isAct !== false ? 1 : 0,
      ]);
      if (existingPromoSigByCode.get(pc.code) === sig) continue;
      statements.push(
        db
          .prepare(
            `INSERT INTO promo_codes (id, code, discount_type, discount_value, min_order_amount, max_uses_per_email, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(code) DO UPDATE SET
               discount_type=excluded.discount_type,
               discount_value=excluded.discount_value,
               min_order_amount=excluded.min_order_amount,
               max_uses_per_email=excluded.max_uses_per_email,
               is_active=excluded.is_active;`
          )
          .bind(
            pc.id || `promo_${Date.now()}`,
            pc.code,
            pc.discountType || 'percent',
            pc.discountValue ?? 0,
            pc.minOrderAmount ?? 0,
            maxUses,
            isAct !== false ? 1 : 0,
            pc.createdAt || new Date().toISOString()
          )
      );
    }
  }

  const nowMs = Date.now();
  const settingsKeys = [
    'siteBanners',
    'autoAcceptOrders',
    'showLowStockCount',
    'shrinkUploadsEnabled',
    'codEnabled',
    'newsletterPopupConfig',
    'seoConfig',
    'sizeGuideConfig',
    'customMaterials',
    'customColors',
    'newsletterPopupImpressions',
    'adminNotificationState',
  ];

  for (const key of settingsKeys) {
    if (patch[key] !== undefined) {
      const payload =
        typeof patch[key] === 'string'
          ? (patch[key] as string)
          : JSON.stringify(patch[key]);
      const currentPayload =
        current[key] !== undefined
          ? typeof current[key] === 'string'
            ? (current[key] as string)
            : JSON.stringify(current[key])
          : undefined;
      if (payload === currentPayload) continue;
      statements.push(
        db
          .prepare(
            `INSERT INTO settings (key, value, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET
               value=excluded.value,
               updated_at=excluded.updated_at;`
          )
          .bind(key, payload, nowMs)
      );
    }
  }

  if (newlyDeletedProducts.length > 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             value=excluded.value,
             updated_at=excluded.updated_at;`
        )
        .bind('deletedProductIds', JSON.stringify(mergedDeletedProducts), nowMs)
    );
  }

  if (newlyDeletedCategories.length > 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             value=excluded.value,
             updated_at=excluded.updated_at;`
        )
        .bind(
          'deletedCategoryIds',
          JSON.stringify(mergedDeletedCategories),
          nowMs
        )
    );
  }

  if (newlyDeletedOrders.length > 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             value=excluded.value,
             updated_at=excluded.updated_at;`
        )
        .bind('deletedOrderIds', JSON.stringify(mergedDeletedOrders), nowMs)
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export function sanitizeCatalogStateForClient(
  state: Record<string, unknown>
): Record<string, unknown> {
  if (!state || typeof state !== 'object') return state;
  const rawBanners = state.siteBanners;
  if (!rawBanners || typeof rawBanners !== 'object') return state;
  const bannersObj = rawBanners as Record<string, unknown>;
  const rawSheets = bannersObj.googleSheetsSync;
  if (!rawSheets || typeof rawSheets !== 'object') return state;
  const sheetsObj = rawSheets as Record<string, unknown>;
  return {
    ...state,
    siteBanners: {
      ...bannersObj,
      googleSheetsSync: {
        enabled: true,
        webhookUrl: '',
        syncSecret: '',
        ...(typeof sheetsObj.lastSyncedAt === 'string'
          ? { lastSyncedAt: sheetsObj.lastSyncedAt }
          : {}),
        ...(typeof sheetsObj.lastSyncStatus === 'string'
          ? { lastSyncStatus: sheetsObj.lastSyncStatus }
          : {}),
        ...(typeof sheetsObj.lastSyncMessage === 'string'
          ? { lastSyncMessage: sheetsObj.lastSyncMessage }
          : {}),
      },
    },
  };
}

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  try {
    const now = Date.now();
    if (
      isolateCatalogJson &&
      now - isolateCacheTimestamp < ISOLATE_CACHE_TTL_MS
    ) {
      return new Response(isolateCatalogJson, {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const d1Binding = context.env.DB || context.env.SAMO_D1;
    if (d1Binding) {
      const d1State = await readFromD1(d1Binding);
      if (
        d1State &&
        Array.isArray(d1State.products) &&
        d1State.products.length > 0
      ) {
        isolateCatalogCache = d1State;
        const sanitizedJson = JSON.stringify(
          sanitizeCatalogStateForClient(d1State)
        );
        isolateCatalogJson = sanitizedJson;
        isolateCacheTimestamp = Date.now();
        return new Response(sanitizedJson, {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: Cloudflare R2 bucket state/catalog.json
    if (context.env.SAMO_R2_BUCKET) {
      const obj = await context.env.SAMO_R2_BUCKET.get(STATE_OBJECT_KEY);
      if (obj) {
        const text = await obj.text();
        const parsed = safeJsonParse<Record<string, unknown> | null>(
          text,
          null
        );
        if (parsed && typeof parsed === 'object') {
          isolateCatalogCache = parsed;
          const sanitizedJson = JSON.stringify(
            sanitizeCatalogStateForClient(parsed)
          );
          isolateCatalogJson = sanitizedJson;
          isolateCacheTimestamp = Date.now();
          return new Response(sanitizedJson, {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        return new Response(text, {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ updatedAt: 0 }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        updatedAt: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
};

export async function readCatalogSnapshot(
  env: Env
): Promise<Record<string, unknown>> {
  const d1Binding = env.DB || env.SAMO_D1;
  if (
    isolateCatalogCache &&
    Array.isArray(isolateCatalogCache.products) &&
    isolateCatalogCache.products.length > 0
  ) {
    return isolateCatalogCache;
  }
  if (d1Binding) {
    const fromD1 = await readFromD1(d1Binding);
    if (
      fromD1 &&
      Array.isArray(fromD1.products) &&
      fromD1.products.length > 0
    ) {
      isolateCatalogCache = fromD1;
      isolateCatalogJson = JSON.stringify(
        sanitizeCatalogStateForClient(fromD1)
      );
      isolateCacheTimestamp = Date.now();
      return fromD1;
    }
  }
  if (env.SAMO_R2_BUCKET) {
    try {
      const existing = await env.SAMO_R2_BUCKET.get(STATE_OBJECT_KEY);
      if (existing) {
        const parsed = await existing.json<Record<string, unknown>>();
        if (parsed && typeof parsed === 'object') {
          isolateCatalogCache = parsed;
          isolateCatalogJson = JSON.stringify(
            sanitizeCatalogStateForClient(parsed)
          );
          isolateCacheTimestamp = Date.now();
          return parsed;
        }
      }
    } catch {}
  }
  return { updatedAt: 0 };
}

export async function applyCatalogPatch(
  env: Env,
  patch: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const current = await readCatalogSnapshot(env);
  const d1Binding = env.DB || env.SAMO_D1;

  // Scrub any previously saved webhookUrl/syncSecret out of D1/R2 siteBanners.googleSheetsSync so secrets live strictly in Cloudflare Environment Variables
  let effectivePatch = patch;
  if (patch.siteBanners && typeof patch.siteBanners === 'object') {
    const incomingBanners = patch.siteBanners as Record<string, unknown>;
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

    effectivePatch = {
      ...patch,
      siteBanners: {
        ...incomingBanners,
        googleSheetsSync: {
          ...existingSheets,
          ...incomingSheets,
          enabled: true,
          webhookUrl: '',
          syncSecret: '',
        },
      },
    };
  }

  const mergedDeletedProducts = Array.from(
    new Set([
      ...((current.deletedProductIds as string[]) || []),
      ...(Array.isArray(effectivePatch.deletedProductIds)
        ? (effectivePatch.deletedProductIds as string[])
        : []),
    ])
  );

  const mergedDeletedCategories = Array.from(
    new Set([
      ...((current.deletedCategoryIds as string[]) || []),
      ...(Array.isArray(effectivePatch.deletedCategoryIds)
        ? (effectivePatch.deletedCategoryIds as string[])
        : []),
    ])
  );

  const mergedDeletedOrders = Array.from(
    new Set([
      ...((current.deletedOrderIds as string[]) || []),
      ...(Array.isArray(effectivePatch.deletedOrderIds)
        ? (effectivePatch.deletedOrderIds as string[])
        : []),
    ])
  );
  const deletedOrderSet = new Set(mergedDeletedOrders);

  // Merge incoming orders with existing orders by id so concurrent customer checkouts never drop each other's orders
  let nextOrdersList: Array<{ id?: string; createdAt?: string }> | undefined;
  if (Array.isArray(effectivePatch.orders)) {
    const incomingOrders = effectivePatch.orders as Array<{
      id?: string;
      createdAt?: string;
    }>;
    const existingOrders = Array.isArray(current.orders)
      ? (current.orders as Array<{ id?: string; createdAt?: string }>)
      : [];
    const mergedOrderMap = new Map<string, { id?: string; createdAt?: string }>();
    const orderedIds: string[] = [];

    for (const ord of incomingOrders) {
      if (!ord || !ord.id || deletedOrderSet.has(ord.id)) continue;
      if (!mergedOrderMap.has(ord.id)) {
        orderedIds.push(ord.id);
      }
      mergedOrderMap.set(ord.id, ord);
    }
    for (const ord of existingOrders) {
      if (!ord || !ord.id || deletedOrderSet.has(ord.id)) continue;
      if (!mergedOrderMap.has(ord.id)) {
        orderedIds.push(ord.id);
        mergedOrderMap.set(ord.id, ord);
      }
    }

    nextOrdersList = orderedIds
      .map((id) => mergedOrderMap.get(id))
      .filter((o): o is { id?: string; createdAt?: string } => Boolean(o));

    nextOrdersList.sort((a, b) => {
      const aMs = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bMs = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (Number.isFinite(aMs) && Number.isFinite(bMs) && aMs !== bMs) {
        return bMs - aMs;
      }
      return 0;
    });

    effectivePatch = {
      ...effectivePatch,
      orders: nextOrdersList,
    };
  } else if (Array.isArray(current.orders)) {
    nextOrdersList = (current.orders as Array<{ id?: string; createdAt?: string }>).filter(
      (o) => o && o.id && !deletedOrderSet.has(o.id)
    );
  }

  // 1. Write to Cloudflare D1 SQL if D1 binding is configured (Strict Delta-Only)
  if (d1Binding) {
    try {
      await writeToD1(
        d1Binding,
        current,
        effectivePatch,
        mergedDeletedProducts,
        mergedDeletedCategories,
        mergedDeletedOrders
      );
    } catch (d1Err) {
      console.error('Failed to write patch to D1 in Pages:', d1Err);
    }
  }

  const nextState: Record<string, unknown> = {
    ...current,
    ...(Array.isArray(effectivePatch.products)
      ? { products: effectivePatch.products }
      : {}),
    ...(Array.isArray(effectivePatch.categories)
      ? { categories: effectivePatch.categories }
      : {}),
    ...(Array.isArray(effectivePatch.promoCodes)
      ? { promoCodes: effectivePatch.promoCodes }
      : {}),
    ...(Array.isArray(effectivePatch.customMaterials)
      ? { customMaterials: effectivePatch.customMaterials }
      : {}),
    ...(Array.isArray(effectivePatch.customColors)
      ? { customColors: effectivePatch.customColors }
      : {}),
    ...(nextOrdersList !== undefined ? { orders: nextOrdersList } : {}),
    ...(Array.isArray(effectivePatch.preorders)
      ? { preorders: effectivePatch.preorders }
      : {}),
    ...(Array.isArray(effectivePatch.admins)
      ? { admins: effectivePatch.admins }
      : {}),
    ...(effectivePatch.siteBanners &&
    typeof effectivePatch.siteBanners === 'object'
      ? { siteBanners: effectivePatch.siteBanners }
      : {}),
    ...(effectivePatch.sizeGuideConfig &&
    typeof effectivePatch.sizeGuideConfig === 'object'
      ? { sizeGuideConfig: effectivePatch.sizeGuideConfig }
      : {}),
    ...(effectivePatch.seoConfig && typeof effectivePatch.seoConfig === 'object'
      ? { seoConfig: effectivePatch.seoConfig }
      : {}),
    ...(effectivePatch.newsletterPopupConfig &&
    typeof effectivePatch.newsletterPopupConfig === 'object'
      ? { newsletterPopupConfig: effectivePatch.newsletterPopupConfig }
      : {}),
    ...(typeof effectivePatch.autoAcceptOrders === 'boolean'
      ? { autoAcceptOrders: effectivePatch.autoAcceptOrders }
      : {}),
    ...(typeof effectivePatch.showLowStockCount === 'boolean'
      ? { showLowStockCount: effectivePatch.showLowStockCount }
      : {}),
    ...(typeof effectivePatch.shrinkUploadsEnabled === 'boolean'
      ? { shrinkUploadsEnabled: effectivePatch.shrinkUploadsEnabled }
      : {}),
    ...(typeof effectivePatch.codEnabled === 'boolean'
      ? { codEnabled: effectivePatch.codEnabled }
      : {}),
    ...(effectivePatch.adminNotificationState &&
    typeof effectivePatch.adminNotificationState === 'object'
      ? { adminNotificationState: effectivePatch.adminNotificationState }
      : {}),
    deletedProductIds: mergedDeletedProducts,
    deletedCategoryIds: mergedDeletedCategories,
    deletedOrderIds: mergedDeletedOrders,
    updatedAt: Date.now(),
  };

  // 2. Dual-write backup to Cloudflare R2 if bound
  if (env.SAMO_R2_BUCKET) {
    await env.SAMO_R2_BUCKET.put(
      STATE_OBJECT_KEY,
      JSON.stringify(nextState, null, 2),
      {
        httpMetadata: {
          contentType: 'application/json',
          cacheControl: 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  isolateCatalogCache = nextState;
  isolateCatalogJson = JSON.stringify(sanitizeCatalogStateForClient(nextState));
  isolateCacheTimestamp = Date.now();

  return nextState;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    const patch = (await context.request.json()) as Record<string, unknown>;
    const nextState = await applyCatalogPatch(context.env, patch);
    return new Response(
      JSON.stringify(sanitizeCatalogStateForClient(nextState)),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : 'Failed to update catalog state',
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
};
