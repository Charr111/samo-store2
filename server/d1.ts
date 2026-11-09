/**
 * Cloudflare D1 SQL Client & Repository for SAMO Weave Atelier
 * Runs strictly on the server backend (Node.js/Express)
 * Never imported into client bundles.
 */

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export function getD1Config(): D1Config {
  return {
    accountId: (
      process.env.CLOUDFLARE_ACCOUNT_ID || ''
    ).trim(),
    databaseId: (
      process.env.CLOUDFLARE_D1_DATABASE_ID || ''
    ).trim(),
    apiToken: (
      process.env.CLOUDFLARE_D1_API_TOKEN || ''
    ).trim(),
  };
}

interface D1ApiResponse<T = any> {
  result: Array<{
    results: T[];
    success: boolean;
    meta: {
      changes: number;
      last_row_id: number;
      duration: number;
      rows_read: number;
      rows_written: number;
    };
  }>;
  errors: Array<{ message: string; code: number }>;
  messages: string[];
  success: boolean;
}

/**
 * Execute a SQL query against Cloudflare D1 via the REST API.
 */
export async function d1Query<T = any>(
  sql: string,
  params: unknown[] = []
): Promise<{ results: T[]; changes: number; success: boolean }> {
  const config = getD1Config();
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`D1 query HTTP ${resp.status}: ${errorText}`);
  }

  const data = (await resp.json()) as D1ApiResponse<T>;
  if (!data.success || (data.errors && data.errors.length > 0)) {
    const errMsg =
      data.errors?.map((e) => e.message).join(', ') || 'Unknown D1 error';
    throw new Error(`D1 query error: ${errMsg}`);
  }

  const firstResult = data.result?.[0];
  return {
    results: firstResult?.results || [],
    changes: firstResult?.meta?.changes || 0,
    success: firstResult?.success ?? true,
  };
}

/**
 * Initialize all relational tables in Cloudflare D1 SQL.
 */
export async function initD1Schema(): Promise<void> {
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      display_order REAL NOT NULL DEFAULT 0,
      hidden_from_nav INTEGER NOT NULL DEFAULT 0,
      size_guides TEXT,
      created_at TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_categories_dept ON categories(department);`,

    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      discount_percent REAL,
      discount_badge TEXT,
      style TEXT NOT NULL DEFAULT 'Classic Luxury',
      custom_style TEXT,
      materials TEXT,
      sizes TEXT,
      size_quantities TEXT,
      image_url TEXT,
      gallery_urls TEXT,
      has_colors INTEGER NOT NULL DEFAULT 0,
      color_variants TEXT,
      is_full_set INTEGER NOT NULL DEFAULT 0,
      full_set_pieces TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1,
      preorder_enabled INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      details TEXT,
      featured INTEGER NOT NULL DEFAULT 0,
      size_type TEXT,
      created_at TEXT,
      updated_at TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_products_dept ON products(department);`,
    `CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category);`,
    `CREATE INDEX IF NOT EXISTS idx_products_instock ON products(in_stock);`,

    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      customer_city TEXT,
      delivery_method TEXT,
      total_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      delivery_fee REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      promo_code TEXT,
      order_notes TEXT,
      items TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);`,

    `CREATE TABLE IF NOT EXISTS preorders (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT NOT NULL,
      size TEXT,
      color_name TEXT,
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_preorders_status ON preorders(status);`,

    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      source TEXT DEFAULT 'footer',
      subscribed_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);`,

    `CREATE TABLE IF NOT EXISTS promo_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value REAL NOT NULL,
      min_order_amount REAL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);`,

    `CREATE TABLE IF NOT EXISTS admins (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'admin',
      added_at TEXT,
      added_by TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  ];

  for (const stmt of schemaStatements) {
    await d1Query(stmt);
  }
}

/**
 * Persisted catalog shape matching server.ts & frontend
 */
export interface PersistedCatalogState {
  updatedAt: number;
  products?: unknown[];
  deletedProductIds?: string[];
  categories?: unknown[];
  deletedCategoryIds?: string[];
  promoCodes?: unknown[];
  customMaterials?: string[];
  customColors?: string[];
  orders?: unknown[];
  preorders?: unknown[];
  admins?: unknown[];
  siteBanners?: Record<string, unknown>;
  autoAcceptOrders?: boolean;
  showLowStockCount?: boolean;
  shrinkUploadsEnabled?: boolean;
  newsletterSubscribers?: unknown[];
  newsletterPopupConfig?: Record<string, unknown>;
  seoConfig?: Record<string, unknown>;
  sizeGuideConfig?: Record<string, unknown>;
  newsletterPopupImpressions?: Record<string, { date: string; count: number }>;
}

export interface NewsletterSubscriberRecord {
  id: string;
  email: string;
  phone?: string;
  source?: 'footer' | 'popup';
  subscribedAt: string;
}

/**
 * Reads the complete catalog state from Cloudflare D1 SQL.
 */
export async function readD1CatalogState(): Promise<PersistedCatalogState | null> {
  try {
    const [
      productsRes,
      categoriesRes,
      ordersRes,
      preordersRes,
      newsletterRes,
      promoRes,
      adminsRes,
      settingsRes,
    ] = await Promise.all([
      d1Query<any>('SELECT * FROM products ORDER BY name ASC;'),
      d1Query<any>('SELECT * FROM categories ORDER BY display_order ASC;'),
      d1Query<any>('SELECT * FROM orders ORDER BY created_at DESC;'),
      d1Query<any>('SELECT * FROM preorders ORDER BY created_at DESC;'),
      d1Query<any>(
        'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC;'
      ),
      d1Query<any>('SELECT * FROM promo_codes ORDER BY created_at DESC;'),
      d1Query<any>('SELECT * FROM admins;'),
      d1Query<any>('SELECT key, value, updated_at FROM settings;'),
    ]);

    // Parse products
    const products = productsRes.results.map((p) => ({
      id: p.id,
      name: p.name,
      department: p.department,
      category: p.category,
      price: p.price,
      originalPrice: p.original_price ?? undefined,
      discountPercent: p.discount_percent ?? undefined,
      discountBadge: p.discount_badge ?? undefined,
      style: p.style || 'Classic Luxury',
      customStyle: p.custom_style ?? undefined,
      materials: p.materials ? JSON.parse(p.materials) : [],
      sizes: p.sizes ? JSON.parse(p.sizes) : [],
      sizeQuantities: p.size_quantities ? JSON.parse(p.size_quantities) : {},
      imageUrl: p.image_url || '',
      galleryUrls: p.gallery_urls ? JSON.parse(p.gallery_urls) : [],
      hasColors: Boolean(p.has_colors),
      colorVariants: p.color_variants ? JSON.parse(p.color_variants) : [],
      isFullSet: Boolean(p.is_full_set),
      fullSetPieces: p.full_set_pieces ? JSON.parse(p.full_set_pieces) : [],
      inStock: Boolean(p.in_stock),
      preorderEnabled: Boolean(p.preorder_enabled),
      description: p.description || '',
      details: p.details ? JSON.parse(p.details) : [],
      featured: Boolean(p.featured),
      sizeType: p.size_type || 'letter',
      createdAt: p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || new Date().toISOString(),
    }));

    // Parse categories
    const categories = categoriesRes.results.map((c) => ({
      id: c.id,
      name: c.name,
      department: c.department,
      displayOrder: c.display_order ?? 0,
      hiddenFromNav: Boolean(c.hidden_from_nav),
      sizeGuides: c.size_guides ? JSON.parse(c.size_guides) : undefined,
      createdAt: c.created_at || new Date().toISOString(),
    }));

    // Parse orders
    const orders = ordersRes.results.map((o) => ({
      id: o.id,
      customerName: o.customer_name,
      customerEmail: o.customer_email || '',
      customerPhone: o.customer_phone || '',
      customerAddress: o.customer_address || '',
      customerCity: o.customer_city || '',
      deliveryMethod: o.delivery_method || 'delivery',
      totalPrice: o.total_price,
      subtotal: o.subtotal,
      discountAmount: o.discount_amount || 0,
      deliveryFee: o.delivery_fee || 0,
      status: o.status,
      promoCode: o.promo_code || undefined,
      orderNotes: o.order_notes || undefined,
      items: o.items ? JSON.parse(o.items) : [],
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));

    // Parse preorders
    const preorders = preordersRes.results.map((pr) => ({
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

    // Parse newsletter subscribers
    const newsletterSubscribers = newsletterRes.results.map((n) => ({
      id: n.id,
      email: n.email,
      phone: n.phone || undefined,
      source: n.source || 'footer',
      subscribedAt: n.subscribed_at,
    }));

    // Parse promo codes
    const promoCodes = promoRes.results.map((pc) => ({
      id: pc.id,
      code: pc.code,
      discountType: pc.discount_type,
      discountValue: pc.discount_value,
      minOrderAmount: pc.min_order_amount ?? 0,
      isActive: Boolean(pc.is_active),
      createdAt: pc.created_at,
    }));

    // Parse admins
    const admins = adminsRes.results.map((a) => ({
      email: a.email,
      role: a.role,
      addedAt: a.added_at,
      addedBy: a.added_by,
    }));

    // Parse settings
    const settingsMap: Record<string, any> = {};
    let maxUpdatedAt = 0;
    for (const row of settingsRes.results) {
      try {
        settingsMap[row.key] = JSON.parse(row.value);
      } catch {
        settingsMap[row.key] = row.value;
      }
      if (row.updated_at > maxUpdatedAt) {
        maxUpdatedAt = row.updated_at;
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
    console.warn('[SAMO D1] Failed to read catalog from D1:', err);
    return null;
  }
}

/**
 * Atomically upsert a single product in D1 SQL.
 */
export async function upsertD1Product(p: any): Promise<void> {
  const sql = `INSERT INTO products (
    id, name, department, category, price, original_price, discount_percent, discount_badge,
    style, custom_style, materials, sizes, size_quantities, image_url, gallery_urls,
    has_colors, color_variants, is_full_set, full_set_pieces, in_stock, preorder_enabled,
    description, details, featured, size_type, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?
  ) ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
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
    updated_at=excluded.updated_at;`;

  const params = [
    p.id,
    p.name || '',
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
    JSON.stringify(Array.isArray(p.fullSetPieces) ? p.fullSetPieces : []),
    p.inStock !== false ? 1 : 0,
    p.preorderEnabled ? 1 : 0,
    p.description || '',
    JSON.stringify(Array.isArray(p.details) ? p.details : []),
    p.featured ? 1 : 0,
    p.sizeType || 'letter',
    p.createdAt || new Date().toISOString(),
    p.updatedAt || new Date().toISOString(),
  ];

  await d1Query(sql, params);
}

/**
 * Atomically upsert a single category in D1 SQL.
 */
export async function upsertD1Category(c: any): Promise<void> {
  const sql = `INSERT INTO categories (
    id, name, department, display_order, hidden_from_nav, size_guides, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,
    department=excluded.department,
    display_order=excluded.display_order,
    hidden_from_nav=excluded.hidden_from_nav,
    size_guides=excluded.size_guides;`;

  const params = [
    c.id,
    c.name || '',
    c.department || 'women',
    c.displayOrder ?? 0,
    c.hiddenFromNav ? 1 : 0,
    c.sizeGuides ? JSON.stringify(c.sizeGuides) : null,
    c.createdAt || new Date().toISOString(),
  ];

  await d1Query(sql, params);
}

/**
 * Atomically upsert an order in D1 SQL.
 */
export async function upsertD1Order(o: any): Promise<void> {
  const sql = `INSERT INTO orders (
    id, customer_name, customer_email, customer_phone, customer_address, customer_city,
    delivery_method, total_price, subtotal, discount_amount, delivery_fee, status,
    promo_code, order_notes, items, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
  ) ON CONFLICT(id) DO UPDATE SET
    status=excluded.status,
    updated_at=excluded.updated_at;`;

  const params = [
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
    o.updatedAt || new Date().toISOString(),
  ];

  await d1Query(sql, params);
}

/**
 * Atomically upsert a preorder in D1 SQL.
 */
export async function upsertD1Preorder(pr: any): Promise<void> {
  const sql = `INSERT INTO preorders (
    id, product_id, product_name, size, color_name, client_name, client_email, client_phone, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    status=excluded.status;`;

  const params = [
    pr.id,
    pr.productId || null,
    pr.productName || '',
    pr.size || '',
    pr.colorName || null,
    pr.clientName || '',
    pr.clientEmail || '',
    pr.clientPhone || '',
    pr.status || 'pending',
    pr.createdAt || new Date().toISOString(),
  ];

  await d1Query(sql, params);
}

/**
 * Upsert a newsletter subscriber in D1 SQL.
 */
export async function upsertD1NewsletterSubscriber(
  sub: NewsletterSubscriberRecord
): Promise<void> {
  const sql = `INSERT INTO newsletter_subscribers (
    id, email, phone, source, subscribed_at
  ) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    phone=excluded.phone,
    source=excluded.source;`;

  const params = [
    sub.id || `sub_${Date.now()}`,
    sub.email.toLowerCase().trim(),
    sub.phone || null,
    sub.source || 'footer',
    sub.subscribedAt || new Date().toISOString(),
  ];

  await d1Query(sql, params);
}

/**
 * Delete a newsletter subscriber from D1 SQL.
 */
export async function deleteD1NewsletterSubscriber(email: string): Promise<void> {
  await d1Query('DELETE FROM newsletter_subscribers WHERE LOWER(email) = ?;', [
    email.toLowerCase().trim(),
  ]);
}

/**
 * Read all newsletter subscribers from D1 SQL.
 */
export async function readD1NewsletterSubscribers(): Promise<
  NewsletterSubscriberRecord[]
> {
  const res = await d1Query<any>(
    'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC;'
  );
  return res.results.map((r) => ({
    id: r.id,
    email: r.email,
    phone: r.phone || undefined,
    source: r.source || 'footer',
    subscribedAt: r.subscribed_at,
  }));
}

/**
 * Atomically upsert a setting key-value pair in D1 SQL.
 */
export async function upsertD1Setting(key: string, value: unknown): Promise<void> {
  const sql = `INSERT INTO settings (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    value=excluded.value,
    updated_at=excluded.updated_at;`;

  const payload = typeof value === 'string' ? value : JSON.stringify(value);
  await d1Query(sql, [key, payload, Date.now()]);
}

/**
 * Applies a full or partial catalog patch into Cloudflare D1 SQL.
 */
export async function writeD1CatalogPatch(
  patch: Partial<PersistedCatalogState>
): Promise<void> {
  // 1. Products
  if (Array.isArray(patch.products)) {
    for (const prod of patch.products as any[]) {
      if (prod && prod.id) {
        await upsertD1Product(prod);
      }
    }
  }

  // 2. Deleted Products
  if (Array.isArray(patch.deletedProductIds) && patch.deletedProductIds.length > 0) {
    for (const id of patch.deletedProductIds) {
      await d1Query('DELETE FROM products WHERE id = ?;', [id]);
    }
    await upsertD1Setting('deletedProductIds', patch.deletedProductIds);
  }

  // 3. Categories
  if (Array.isArray(patch.categories)) {
    for (const cat of patch.categories as any[]) {
      if (cat && cat.id) {
        await upsertD1Category(cat);
      }
    }
  }

  // 4. Deleted Categories
  if (Array.isArray(patch.deletedCategoryIds) && patch.deletedCategoryIds.length > 0) {
    for (const id of patch.deletedCategoryIds) {
      await d1Query('DELETE FROM categories WHERE id = ?;', [id]);
    }
    await upsertD1Setting('deletedCategoryIds', patch.deletedCategoryIds);
  }

  // 5. Orders
  if (Array.isArray(patch.orders)) {
    for (const ord of patch.orders as any[]) {
      if (ord && ord.id) {
        await upsertD1Order(ord);
      }
    }
  }

  // 6. Preorders
  if (Array.isArray(patch.preorders)) {
    for (const pre of patch.preorders as any[]) {
      if (pre && pre.id) {
        await upsertD1Preorder(pre);
      }
    }
  }

  // 7. Promo Codes
  if (Array.isArray(patch.promoCodes)) {
    for (const pc of patch.promoCodes as any[]) {
      if (pc && pc.code) {
        await d1Query(
          `INSERT INTO promo_codes (id, code, discount_type, discount_value, min_order_amount, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(code) DO UPDATE SET
             discount_type=excluded.discount_type,
             discount_value=excluded.discount_value,
             min_order_amount=excluded.min_order_amount,
             is_active=excluded.is_active;`,
          [
            pc.id || `promo_${Date.now()}`,
            pc.code,
            pc.discountType || 'percent',
            pc.discountValue ?? 0,
            pc.minOrderAmount ?? 0,
            pc.isActive !== false ? 1 : 0,
            pc.createdAt || new Date().toISOString(),
          ]
        );
      }
    }
  }

  // 8. Settings
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
  ] as const;

  for (const key of settingsKeys) {
    if (patch[key] !== undefined) {
      await upsertD1Setting(key, patch[key]);
    }
  }
}
