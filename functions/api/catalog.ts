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
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ results: T[]; success: boolean }>>;
}

export interface Env {
  SAMO_R2_BUCKET?: R2BucketBinding;
  DB?: D1DatabaseBinding;
  SAMO_D1?: D1DatabaseBinding;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const STATE_OBJECT_KEY = 'state/catalog.json';

function safeJsonParse<T = unknown>(str: unknown, fallback: T): T {
  if (typeof str !== 'string' || !str.trim()) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

async function readFromD1(db: D1DatabaseBinding): Promise<Record<string, unknown> | null> {
  try {
    const [catsRes, prodsRes, colorsRes, ordersRes, preordersRes, promosRes, adminsRes, settingsRes] =
      await Promise.all([
        db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all<any>(),
        db.prepare('SELECT * FROM products ORDER BY name ASC').all<any>(),
        db.prepare('SELECT * FROM color_variants').all<any>(),
        db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all<any>(),
        db.prepare('SELECT * FROM preorders ORDER BY created_at DESC').all<any>(),
        db.prepare('SELECT * FROM promo_codes').all<any>(),
        db.prepare('SELECT * FROM admins').all<any>(),
        db.prepare('SELECT * FROM settings').all<any>(),
      ]);

    const categories = (catsRes.results || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      department: c.department,
      hidden: Boolean(c.hidden),
      sortOrder: c.sort_order,
      bannerMediaType: c.banner_media_type,
      bannerMediaUrl: c.banner_media_url,
      bannerSplitIndex: c.banner_split_index,
      bannerHeadline: c.banner_headline,
      bannerSubline: c.banner_subline,
      bannerLinkUrl: c.banner_link_url,
      bannerLinkText: c.banner_link_text,
    }));

    const colorVariantsMap = new Map<string, any[]>();
    for (const v of colorsRes.results || []) {
      const list = colorVariantsMap.get(v.product_id) || [];
      list.push({
        id: v.id,
        colorName: v.color_name,
        colorHex: v.color_hex,
        images: safeJsonParse(v.images_json, []),
        sizes: safeJsonParse(v.sizes_json, []),
        sizeQuantities: safeJsonParse(v.size_quantities_json, {}),
        inStock: Boolean(v.in_stock),
        price: v.price != null ? Number(v.price) : undefined,
      });
      colorVariantsMap.set(v.product_id, list);
    }

    const products = (prodsRes.results || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      department: p.department,
      category: p.category,
      price: Number(p.price) || 0,
      oldPrice: p.old_price != null ? Number(p.old_price) : undefined,
      description: p.description || '',
      images: safeJsonParse(p.images_json, []),
      sizes: safeJsonParse(p.sizes_json, []),
      sizeQuantities: safeJsonParse(p.size_quantities_json, {}),
      materials: safeJsonParse(p.materials_json, []),
      style: p.style || '',
      inStock: Boolean(p.in_stock),
      isNewArrival: Boolean(p.is_new_arrival),
      colorVariants: colorVariantsMap.get(p.id) || [],
      fullSetPieces: safeJsonParse(p.full_set_pieces_json, undefined),
      sizeGuide: safeJsonParse(p.size_guide_json, undefined),
      sizeType: p.size_type || undefined,
      badge: p.badge || undefined,
    }));

    const orders = (ordersRes.results || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      customerPhone: o.customer_phone,
      address: o.address,
      city: o.city,
      country: o.country,
      items: safeJsonParse(o.items_json, []),
      subtotal: Number(o.subtotal) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      discount: Number(o.discount) || 0,
      total: Number(o.total) || 0,
      promoCode: o.promo_code || undefined,
      status: o.status,
      createdAt: Number(o.created_at) || Date.now(),
      notes: o.notes || undefined,
    }));

    const preorders = (preordersRes.results || []).map((po: any) => ({
      id: po.id,
      customerName: po.customer_name,
      customerEmail: po.customer_email,
      customerPhone: po.customer_phone,
      productId: po.product_id,
      productName: po.product_name,
      color: po.color || undefined,
      size: po.size,
      status: po.status,
      createdAt: Number(po.created_at) || Date.now(),
      notes: po.notes || undefined,
    }));

    const promoCodes = (promosRes.results || []).map((pr: any) => ({
      id: pr.id,
      code: pr.code,
      discountPercent: Number(pr.discount_percent) || 0,
      active: Boolean(pr.active),
      createdAt: Number(pr.created_at) || Date.now(),
    }));

    const admins = (adminsRes.results || []).map((a: any) => ({
      email: a.email,
      role: a.role,
      addedAt: Number(a.added_at) || Date.now(),
      addedBy: a.added_by || undefined,
    }));

    const settingsMap = new Map<string, string>();
    for (const s of settingsRes.results || []) {
      settingsMap.set(s.key, s.value);
    }

    const customMaterials = safeJsonParse(settingsMap.get('customMaterials'), []);
    const customColors = safeJsonParse(settingsMap.get('customColors'), []);
    const siteBanners = safeJsonParse(settingsMap.get('siteBanners'), undefined);
    const sizeGuideConfig = safeJsonParse(settingsMap.get('sizeGuideConfig'), undefined);
    const seoConfig = safeJsonParse(settingsMap.get('seoConfig'), undefined);
    const autoAcceptOrders = settingsMap.get('autoAcceptOrders') === 'true';
    const showLowStockCount = settingsMap.get('showLowStockCount') === 'true';
    const updatedAt = Number(settingsMap.get('updatedAt')) || Date.now();

    return {
      updatedAt,
      categories,
      products,
      orders,
      preorders,
      promoCodes,
      admins,
      customMaterials,
      customColors,
      siteBanners,
      sizeGuideConfig,
      seoConfig,
      autoAcceptOrders,
      showLowStockCount,
    };
  } catch (err) {
    console.error('Error querying Cloudflare D1 in Pages:', err);
    return null;
  }
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  try {
    const d1Binding = context.env.DB || context.env.SAMO_D1;
    if (d1Binding) {
      const d1State = await readFromD1(d1Binding);
      if (d1State && Array.isArray(d1State.products) && d1State.products.length > 0) {
        return new Response(JSON.stringify(d1State), {
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

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  try {
    const patch = (await context.request.json()) as Record<string, unknown>;
    let current: Record<string, unknown> = { updatedAt: 0 };

    // Read current state from D1 or R2
    const d1Binding = context.env.DB || context.env.SAMO_D1;
    if (d1Binding) {
      const fromD1 = await readFromD1(d1Binding);
      if (fromD1) current = fromD1;
    } else if (context.env.SAMO_R2_BUCKET) {
      try {
        const existing = await context.env.SAMO_R2_BUCKET.get(STATE_OBJECT_KEY);
        if (existing) {
          const parsed = await existing.json<Record<string, unknown>>();
          if (parsed && typeof parsed === 'object') current = parsed;
        }
      } catch {}
    }

    const mergedDeletedProducts = Array.from(
      new Set([
        ...((current.deletedProductIds as string[]) || []),
        ...(Array.isArray(patch.deletedProductIds) ? (patch.deletedProductIds as string[]) : []),
      ])
    );

    const mergedDeletedCategories = Array.from(
      new Set([
        ...((current.deletedCategoryIds as string[]) || []),
        ...(Array.isArray(patch.deletedCategoryIds) ? (patch.deletedCategoryIds as string[]) : []),
      ])
    );

    const nextState = {
      ...current,
      ...(Array.isArray(patch.products) ? { products: patch.products } : {}),
      ...(Array.isArray(patch.categories) ? { categories: patch.categories } : {}),
      ...(Array.isArray(patch.promoCodes) ? { promoCodes: patch.promoCodes } : {}),
      ...(Array.isArray(patch.customMaterials) ? { customMaterials: patch.customMaterials } : {}),
      ...(Array.isArray(patch.customColors) ? { customColors: patch.customColors } : {}),
      ...(Array.isArray(patch.orders) ? { orders: patch.orders } : {}),
      ...(Array.isArray(patch.preorders) ? { preorders: patch.preorders } : {}),
      ...(Array.isArray(patch.admins) ? { admins: patch.admins } : {}),
      ...(patch.siteBanners && typeof patch.siteBanners === 'object'
        ? { siteBanners: patch.siteBanners }
        : {}),
      ...(patch.sizeGuideConfig && typeof patch.sizeGuideConfig === 'object'
        ? { sizeGuideConfig: patch.sizeGuideConfig }
        : {}),
      ...(patch.seoConfig && typeof patch.seoConfig === 'object'
        ? { seoConfig: patch.seoConfig }
        : {}),
      ...(typeof patch.autoAcceptOrders === 'boolean'
        ? { autoAcceptOrders: patch.autoAcceptOrders }
        : {}),
      ...(typeof patch.showLowStockCount === 'boolean'
        ? { showLowStockCount: patch.showLowStockCount }
        : {}),
      deletedProductIds: mergedDeletedProducts,
      deletedCategoryIds: mergedDeletedCategories,
      updatedAt: Date.now(),
    };

    // Dual-write: write to R2 backup if R2 bucket is bound
    if (context.env.SAMO_R2_BUCKET) {
      await context.env.SAMO_R2_BUCKET.put(
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

    return new Response(JSON.stringify(nextState), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Failed to update catalog state',
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
};
