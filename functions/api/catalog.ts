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
        preorderEnabled: Boolean(p.preorder_enabled),
        description: p.description || '',
        details: safeJsonParse(p.details, []),
        featured: Boolean(p.featured),
        sizeType: p.size_type || 'letter',
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
      };
    });

    const categories = (catsRes.results || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      department: c.department,
      displayOrder: c.display_order ?? 0,
      hiddenFromNav: Boolean(c.hidden_from_nav),
      sizeGuides: c.size_guides ? safeJsonParse(c.size_guides, undefined) : undefined,
      createdAt: c.created_at || new Date().toISOString(),
    }));

    const orders = (ordersRes.results || []).map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      customerEmail: o.customer_email || '',
      customerPhone: o.customer_phone || '',
      customerAddress: o.customer_address || '',
      customerCity: o.customer_city || '',
      deliveryMethod: o.delivery_method || 'delivery',
      totalPrice: Number(o.total_price) || 0,
      subtotal: Number(o.subtotal) || 0,
      discountAmount: Number(o.discount_amount) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      status: o.status,
      promoCode: o.promo_code || undefined,
      orderNotes: o.order_notes || undefined,
      items: safeJsonParse(o.items, []),
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));

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

    return {
      updatedAt: maxUpdatedAt || Date.now(),
      products,
      categories,
      orders,
      preorders,
      newsletterSubscribers,
      promoCodes,
      admins,
      siteBanners: settingsMap.siteBanners || undefined,
      autoAcceptOrders:
        typeof settingsMap.autoAcceptOrders === 'boolean'
          ? settingsMap.autoAcceptOrders
          : false,
      showLowStockCount:
        typeof settingsMap.showLowStockCount === 'boolean'
          ? settingsMap.showLowStockCount
          : false,
      shrinkUploadsEnabled:
        typeof settingsMap.shrinkUploadsEnabled === 'boolean'
          ? settingsMap.shrinkUploadsEnabled
          : true,
      newsletterPopupConfig: settingsMap.newsletterPopupConfig || undefined,
      seoConfig: settingsMap.seoConfig || undefined,
      sizeGuideConfig: settingsMap.sizeGuideConfig || undefined,
      customMaterials: settingsMap.customMaterials || undefined,
      customColors: settingsMap.customColors || undefined,
      deletedProductIds: settingsMap.deletedProductIds || [],
      deletedCategoryIds: settingsMap.deletedCategoryIds || [],
      newsletterPopupImpressions:
        settingsMap.newsletterPopupImpressions || undefined,
    };
  } catch (err) {
    console.error('Error querying Cloudflare D1 in Pages:', err);
    return null;
  }
}

async function writeToD1(
  db: D1DatabaseBinding,
  patch: Record<string, unknown>,
  mergedDeletedProducts: string[],
  mergedDeletedCategories: string[]
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  if (Array.isArray(patch.products)) {
    try {
      await db
        .prepare('ALTER TABLE products ADD COLUMN garment_code TEXT;')
        .run();
    } catch {
      // Column already exists
    }
    for (const p of patch.products as any[]) {
      if (!p || !p.id) continue;
      const setPiecesPayload = Array.isArray(p.setItems)
        ? p.setItems
        : Array.isArray(p.fullSetPieces)
        ? p.fullSetPieces
        : [];
      statements.push(
        db
          .prepare(
            `INSERT INTO products (
              id, name, garment_code, department, category, price, original_price, discount_percent, discount_badge,
              style, custom_style, materials, sizes, size_quantities, image_url, gallery_urls,
              has_colors, color_variants, is_full_set, full_set_pieces, in_stock, preorder_enabled,
              description, details, featured, size_type, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
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
            p.discountPercent ?? null,
            p.discountBadge ?? null,
            p.style || 'Classic Luxury',
            p.customStyle ?? null,
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
            p.preorderEnabled ? 1 : 0,
            p.description || '',
            JSON.stringify(Array.isArray(p.details) ? p.details : []),
            p.featured ? 1 : 0,
            p.sizeType || 'letter',
            p.createdAt || new Date().toISOString(),
            p.updatedAt || new Date().toISOString()
          )
      );
    }
  }

  for (const delId of mergedDeletedProducts) {
    if (delId) {
      statements.push(
        db.prepare('DELETE FROM products WHERE id = ?;').bind(delId)
      );
    }
  }

  if (Array.isArray(patch.categories)) {
    for (const c of patch.categories as any[]) {
      if (!c || !c.id) continue;
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
            c.displayOrder ?? 0,
            c.hiddenFromNav ? 1 : 0,
            c.sizeGuides ? JSON.stringify(c.sizeGuides) : null,
            c.createdAt || new Date().toISOString()
          )
      );
    }
  }

  for (const delCatId of mergedDeletedCategories) {
    if (delCatId) {
      statements.push(
        db.prepare('DELETE FROM categories WHERE id = ?;').bind(delCatId)
      );
    }
  }

  if (Array.isArray(patch.orders)) {
    for (const o of patch.orders as any[]) {
      if (!o || !o.id) continue;
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
              updated_at=excluded.updated_at;`
          )
          .bind(
            o.id,
            o.customerName || '',
            o.customerEmail || '',
            o.customerPhone || '',
            o.customerAddress || '',
            o.customerCity || '',
            o.deliveryMethod || 'delivery',
            o.totalPrice ?? 0,
            o.subtotal ?? 0,
            o.discountAmount ?? 0,
            o.deliveryFee ?? 0,
            o.status || 'pending',
            o.promoCode ?? null,
            o.orderNotes ?? null,
            JSON.stringify(Array.isArray(o.items) ? o.items : []),
            o.createdAt || new Date().toISOString(),
            o.updatedAt || new Date().toISOString()
          )
      );
    }
  }

  if (Array.isArray(patch.preorders)) {
    for (const pr of patch.preorders as any[]) {
      if (!pr || !pr.id) continue;
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
    for (const pc of patch.promoCodes as any[]) {
      if (!pc || !pc.code) continue;
      const isAct = pc.active !== undefined ? pc.active : pc.isActive;
      statements.push(
        db
          .prepare(
            `INSERT INTO promo_codes (id, code, discount_type, discount_value, min_order_amount, is_active, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(code) DO UPDATE SET
               discount_type=excluded.discount_type,
               discount_value=excluded.discount_value,
               min_order_amount=excluded.min_order_amount,
               is_active=excluded.is_active;`
          )
          .bind(
            pc.id || `promo_${Date.now()}`,
            pc.code,
            pc.discountType || 'percent',
            pc.discountValue ?? 0,
            pc.minOrderAmount ?? 0,
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
    'newsletterPopupConfig',
    'seoConfig',
    'sizeGuideConfig',
    'customMaterials',
    'customColors',
    'newsletterPopupImpressions',
  ];

  for (const key of settingsKeys) {
    if (patch[key] !== undefined) {
      const payload =
        typeof patch[key] === 'string'
          ? (patch[key] as string)
          : JSON.stringify(patch[key]);
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

  if (mergedDeletedProducts.length > 0) {
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

  if (mergedDeletedCategories.length > 0) {
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

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  try {
    const d1Binding = context.env.DB || context.env.SAMO_D1;
    if (d1Binding) {
      const d1State = await readFromD1(d1Binding);
      if (
        d1State &&
        Array.isArray(d1State.products) &&
        d1State.products.length > 0
      ) {
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
        ...(Array.isArray(patch.deletedProductIds)
          ? (patch.deletedProductIds as string[])
          : []),
      ])
    );

    const mergedDeletedCategories = Array.from(
      new Set([
        ...((current.deletedCategoryIds as string[]) || []),
        ...(Array.isArray(patch.deletedCategoryIds)
          ? (patch.deletedCategoryIds as string[])
          : []),
      ])
    );

    // 1. Write to Cloudflare D1 SQL if D1 binding is configured
    if (d1Binding) {
      try {
        await writeToD1(
          d1Binding,
          patch,
          mergedDeletedProducts,
          mergedDeletedCategories
        );
      } catch (d1Err) {
        console.error('Failed to write patch to D1 in Pages:', d1Err);
      }
    }

    const nextState = {
      ...current,
      ...(Array.isArray(patch.products) ? { products: patch.products } : {}),
      ...(Array.isArray(patch.categories)
        ? { categories: patch.categories }
        : {}),
      ...(Array.isArray(patch.promoCodes)
        ? { promoCodes: patch.promoCodes }
        : {}),
      ...(Array.isArray(patch.customMaterials)
        ? { customMaterials: patch.customMaterials }
        : {}),
      ...(Array.isArray(patch.customColors)
        ? { customColors: patch.customColors }
        : {}),
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
      ...(patch.newsletterPopupConfig &&
      typeof patch.newsletterPopupConfig === 'object'
        ? { newsletterPopupConfig: patch.newsletterPopupConfig }
        : {}),
      ...(typeof patch.autoAcceptOrders === 'boolean'
        ? { autoAcceptOrders: patch.autoAcceptOrders }
        : {}),
      ...(typeof patch.showLowStockCount === 'boolean'
        ? { showLowStockCount: patch.showLowStockCount }
        : {}),
      ...(typeof patch.shrinkUploadsEnabled === 'boolean'
        ? { shrinkUploadsEnabled: patch.shrinkUploadsEnabled }
        : {}),
      deletedProductIds: mergedDeletedProducts,
      deletedCategoryIds: mergedDeletedCategories,
      updatedAt: Date.now(),
    };

    // 2. Dual-write backup to Cloudflare R2 if bound
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
