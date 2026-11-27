/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  ArrowUpRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  AdminNotificationSyncState,
  AdminRecord,
  CartItem,
  CategoryItem,
  Department,
  DiscountType,
  FullSetSubItem,
  OrderItem,
  OrderStatus,
  PreorderItem,
  PreorderStatus,
  NewsletterPopupConfig,
  NewsletterSubscriber,
  ProductColorVariant,
  ProductItem,
  PromoCodeItem,
  RoutePath,
  SelectedSetPieceSize,
  SeoConfigState,
  SiteBannersConfig,
  SizeGuideConfig,
  StyleType,
} from './types/samo';
import {
  INITIAL_ADMINS,
  INITIAL_CATEGORIES,
  INITIAL_ORDERS,
  INITIAL_PREORDERS,
  INITIAL_PRODUCTS,
  INITIAL_PROMO_CODES,
  LEGACY_REMOVED_PRODUCT_IDS,
} from './data/seedCatalog';
import {
  applyExclusiveHomeCategoryCover,
  buildCategoryUrl,
  buildDefaultCategoryBannerForCategory,
  buildNewsletterSubscribedCookieString,
  buildProductUrl,
  buildSizeQuantitiesMap,
  createSafeSlug,
  decrementStockForAcceptedOrder,
  DEFAULT_NEWSLETTER_POPUP_CONFIG,
  ensureHomepageMerchandisingDefaults,
  evaluateNewsletterPopupSessionEligibility,
  filterCatalogProducts,
  filterGiftsProducts,
  filterNewArrivalProducts,
  getCategoriesByDepartment,
  getCategoryBannerKey,
  getCategoryBannerSplitIndex,
  getEffectiveProductPrice,
  getHomeWomenCategoryTiles,
  getSizeQuantity,
  hasNewsletterSubscribedCookie,
  isAuthorizedAdminEmail,
  mergeNewsletterPopupConfig,
  mergeSiteBannersConfig,
  moveCategoryInDepartment,
  NEWSLETTER_SESSION_SHOWN_KEY,
  NEWSLETTER_SUBSCRIBED_STORAGE_KEY,
  normalizeHomeWomenCategoryTile,
  normalizeKidsCategoryName,
  orderHomeBagsProducts,
  orderHomeNewArrivalsProducts,
  parseCatalogUrlState,
  parsePathnameToRoute,
  renumberDepartmentCategoriesSequentially,
  resolveProductGarmentCode,
  restoreStockForCanceledOrder,
  sumSizeQuantities,
  syncFullSetsWithCatalog,
  syncProductFromColorVariants,
  toggleProductInStockState,
  toggleProductVisibilityState,
  updateCategorySortOrder,
} from './utils/catalogLogic';
import {
  applyDocumentSeoTags,
  buildDynamicPageSeo,
  generateCatalogSeoSnapshot,
} from './utils/seoLogic';
import { mergeSizeGuideConfig } from './utils/sizeGuideLogic';
import {
  auth,
  db,
  doc,
  firebaseSignOut,
  googleProvider,
  onAuthStateChanged,
  onSnapshot,
  setDoc,
  signInWithPopup,
  User,
} from './lib/firebase';
import {
  deleteMediaFromR2,
  getShrinkUploadsEnabled,
  setShrinkUploadsEnabled,
} from './utils/imageCompression';
import { Navbar } from './components/Navbar';
import { HeroVideoSection } from './components/HeroVideoSection';
import { ProductImage } from './components/ProductImage';
import { CatalogProductCard } from './components/CatalogProductCard';
import { ProductModal } from './components/ProductModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { NewsletterPopupModal } from './components/NewsletterPopupModal';
import { FaqSection } from './components/FaqSection';

const AdminDashboard = React.lazy(() =>
  import('./components/AdminDashboard').then((mod) => ({
    default: mod.AdminDashboard,
  }))
);

const STORAGE_KEYS = {
  categories: 'samo_categories_v3',
  deletedCategories: 'samo_deleted_categories_v1',
  products: 'samo_products_v6',
  deletedProducts: 'samo_deleted_products_v2',
  promos: 'samo_promo_codes_v1',
  materials: 'samo_custom_materials_v1',
  colors: 'samo_custom_colors_v2',
  orders: 'samo_orders_v2',
  deletedOrders: 'samo_deleted_orders_v1',
  preorders: 'samo_preorders_v2',
  admins: 'samo_admins_v2',
  cart: 'samo_cart_v1',
  siteBanners: 'samo_site_banners_v2',
  autoAcceptOrders: 'samo_auto_accept_orders_v2',
  showLowStockCount: 'samo_show_low_stock_v1',
  codEnabled: 'samo_cod_enabled_v1',
  newsletterPopupConfig: 'samo_newsletter_popup_cfg_v1',
  seoConfig: 'samo_seo_config_v2',
  sizeGuideConfig: 'samo_size_guide_cfg_v1',
  adminNotificationState: 'samo_admin_notif_state_v1',
};

function pushGtmEcommerceEvent(
  eventName: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase',
  ecommerce: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  try {
    const win = window as unknown as {
      dataLayer?: Array<Record<string, unknown>>;
      gtag?: (...args: unknown[]) => void;
      fbq?: (...args: unknown[]) => void;
    };
    win.dataLayer = win.dataLayer || [];
    if (typeof win.gtag === 'function') {
      win.gtag('event', eventName, ecommerce);
    }
    win.dataLayer.push({ ecommerce: null });
    win.dataLayer.push({
      event: eventName,
      ecommerce,
    });

    if (typeof win.fbq === 'function') {
      const items = Array.isArray(ecommerce.items)
        ? (ecommerce.items as Array<Record<string, unknown>>)
        : [];
      const contentIds = items
        .map((it) => String(it.item_id || ''))
        .filter(Boolean);
      const firstItem = items[0] || {};
      const numItems = items.reduce(
        (sum, it) => sum + (Number(it.quantity) || 1),
        0
      );
      const val = Number(ecommerce.value) || 0;

      if (eventName === 'view_item') {
        win.fbq('track', 'ViewContent', {
          content_ids: contentIds,
          content_name: String(firstItem.item_name || ''),
          content_category: String(firstItem.item_category || ''),
          content_type: 'product',
          value: val,
          currency: 'USD',
        });
      } else if (eventName === 'add_to_cart') {
        win.fbq('track', 'AddToCart', {
          content_ids: contentIds,
          content_name: String(firstItem.item_name || ''),
          content_type: 'product',
          value: val,
          currency: 'USD',
        });
      } else if (eventName === 'begin_checkout') {
        win.fbq('track', 'InitiateCheckout', {
          content_ids: contentIds,
          num_items: numItems || 1,
          value: val,
          currency: 'USD',
        });
      } else if (eventName === 'purchase') {
        win.fbq('track', 'Purchase', {
          content_ids: contentIds,
          content_type: 'product',
          num_items: numItems || 1,
          value: val,
          currency: 'USD',
        });
      }
    }
  } catch {}
}

function sanitizeAuthorizedAdmins(list: AdminRecord[]): AdminRecord[] {
  const byEmail = new Map<string, AdminRecord>();
  for (const adm of [
    ...INITIAL_ADMINS,
    ...(Array.isArray(list) ? list : []),
  ]) {
    if (!adm || typeof adm.email !== 'string') continue;
    const clean = adm.email.trim().toLowerCase();
    if (!clean || clean === 'charbelkorab11123@gmail.com') continue;
    byEmail.set(clean, {
      ...adm,
      id: clean,
      email: clean,
    });
  }
  return Array.from(byEmail.values());
}

export function deepCleanFirestorePayload<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => deepCleanFirestorePayload(item)) as unknown as T;
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      res[k] = deepCleanFirestorePayload(v);
    }
    return res as T;
  }
  return value;
}

let pendingLocalMutations = 0;
let lastLocalMutationMs = 0;
let localMutationSequence = 0;
let lastPushedSheetsQuantitySignature = '';

function buildProductsQuantitySignature(prods: ProductItem[]): string {
  if (!Array.isArray(prods) || prods.length === 0) return '';
  return prods
    .map((p) => {
      if (!p || !p.id) return '';
      const hasVars =
        Boolean(p.hasColors) &&
        Array.isArray(p.colorVariants) &&
        p.colorVariants.length > 0;
      const varSig = hasVars
        ? (p.colorVariants || [])
            .map(
              (cv) =>
                `${cv.colorName}:${JSON.stringify(cv.sizeQuantities || {})}`
            )
            .join('|')
        : JSON.stringify(p.sizeQuantities || {});
      return `${p.id}:${p.inStock !== false ? 1 : 0}:${p.quantity ?? 0}:${varSig}`;
    })
    .join(';');
}

async function pushServerCatalogPatch(
  patch: Record<string, unknown>,
  options?: { skipSheetsPush?: boolean; forceSheetsPush?: boolean }
): Promise<void> {
  pendingLocalMutations += 1;
  localMutationSequence += 1;
  lastLocalMutationMs = Date.now();
  try {
    await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (
      !options?.skipSheetsPush &&
      Array.isArray(patch.products) &&
      patch.products.length > 0
    ) {
      const nextQtySig = buildProductsQuantitySignature(
        patch.products as ProductItem[]
      );
      const quantityActuallyChanged =
        options?.forceSheetsPush ||
        (lastPushedSheetsQuantitySignature !== '' &&
          nextQtySig !== lastPushedSheetsQuantitySignature);
      lastPushedSheetsQuantitySignature = nextQtySig;

      if (quantityActuallyChanged) {
        fetch('/api/sheets-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'push_to_sheet',
            products: patch.products,
          }),
        }).catch(() => {});
      }
    }
  } catch {
  } finally {
    pendingLocalMutations = Math.max(0, pendingLocalMutations - 1);
    lastLocalMutationMs = Date.now();
  }
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mergeStoredCategories(
  stored: CategoryItem[],
  deletedCategoryIds: string[] = []
): CategoryItem[] {
  const deletedSet = new Set(deletedCategoryIds);
  const map = new Map<string, CategoryItem>();

  for (const c of INITIAL_CATEGORIES) {
    if (!deletedSet.has(c.id)) {
      map.set(c.id, { ...c, active: c.active !== false });
    }
  }

  for (const c of stored) {
    if (!c || !c.id || deletedSet.has(c.id)) continue;
    if (
      c.department === 'kids' &&
      (c.name.trim().toLowerCase() === 'full set' || c.id === 'kids-full-set')
    ) {
      continue;
    }
    const seedFallback = INITIAL_CATEGORIES.find((ic) => ic.id === c.id);
    const cleanName = c.name.trim();
    const cleanSlug = createSafeSlug(cleanName);
    const rawAny = c as CategoryItem & {
      displayOrder?: number;
      hiddenFromNav?: boolean;
    };
    const resolvedSortOrder =
      typeof c.sortOrder === 'number' && Number.isFinite(c.sortOrder) && c.sortOrder > 0
        ? c.sortOrder
        : typeof rawAny.displayOrder === 'number' &&
          Number.isFinite(rawAny.displayOrder) &&
          rawAny.displayOrder > 0
        ? rawAny.displayOrder
        : seedFallback?.sortOrder;
    const resolvedActive =
      typeof c.active === 'boolean'
        ? c.active
        : typeof rawAny.hiddenFromNav === 'boolean'
        ? !rawAny.hiddenFromNav
        : true;
    map.set(c.id, {
      ...c,
      name: cleanName,
      slug: cleanSlug,
      sortOrder: resolvedSortOrder,
      active: resolvedActive,
    });
  }
  return Array.from(map.values());
}

function normalizeStoredProducts(
  items: ProductItem[],
  deletedIds: string[] = []
): ProductItem[] {
  const deletedSet = new Set([
    ...LEGACY_REMOVED_PRODUCT_IDS,
    ...deletedIds,
  ]);
  const map = new Map<string, ProductItem>();

  // 1. Insert stored / newly added admin products FIRST so newest items stay at the top
  for (const item of items) {
    if (!item || !item.id || deletedSet.has(item.id)) continue;
    const normalizedCat = item.category.trim();
    if (
      item.department === 'kids' &&
      (normalizedCat.toLowerCase() === 'full set' || item.id === 'samo-k-fullset-01')
    ) {
      continue;
    }
    const seedFallback = INITIAL_PRODUCTS.find((sp) => sp.id === item.id);
    map.set(item.id, {
      ...item,
      garmentCode:
        item.garmentCode !== undefined
          ? item.garmentCode
          : seedFallback?.garmentCode,
      category: normalizedCat,
      galleryUrls: Array.isArray(item.galleryUrls)
        ? item.galleryUrls
        : seedFallback?.galleryUrls || [],
      isFullSet:
        item.department === 'kids'
          ? false
          : item.isFullSet ??
            (normalizedCat.trim().toLowerCase() === 'full set'
              ? true
              : seedFallback?.isFullSet),
      setItems:
        item.department === 'kids'
          ? undefined
          : item.setItems ?? seedFallback?.setItems,
    });
  }

  // 2. Append any seed products not already in the map
  for (const seed of INITIAL_PRODUCTS) {
    if (!deletedSet.has(seed.id) && !map.has(seed.id)) {
      map.set(seed.id, seed);
    }
  }

  const normalized = Array.from(map.values()).map((item) => {
    const explicitOutOfStock = item.inStock === false;
    const sizes = Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : ['M'];
    const sizeQuantities = buildSizeQuantitiesMap(sizes, item.sizeQuantities);
    const totalQty = sumSizeQuantities(sizes, sizeQuantities);
    const isNew =
      item.isNewArrival !== undefined
        ? Boolean(item.isNewArrival)
        : Boolean(item.featured ?? true);
    const baseNormalized: ProductItem = {
      ...item,
      materials: Array.isArray(item.materials) ? item.materials : [],
      sizes,
      sizeQuantities,
      quantity: totalQty,
      isNewArrival: isNew,
      featured: isNew,
      discountType: item.discountType || 'none',
      discountValue: Number(item.discountValue) || 0,
      inStock: explicitOutOfStock ? false : totalQty > 0,
      hiddenFromStore: Boolean(item.hiddenFromStore),
    };

    if (
      item.hasColors &&
      Array.isArray(item.colorVariants) &&
      item.colorVariants.length > 0
    ) {
      const synced = syncProductFromColorVariants(
        item.colorVariants,
        baseNormalized.sizeType
      );
      return {
        ...baseNormalized,
        hasColors: true,
        colorVariants: item.colorVariants,
        imageUrl: baseNormalized.imageUrl || item.colorVariants[0]?.imageUrl || '',
        ...synced,
        inStock: explicitOutOfStock ? false : synced.inStock,
      };
    }

    return {
      ...baseNormalized,
      hasColors: false,
      colorVariants: [],
    };
  });

  return ensureHomepageMerchandisingDefaults(syncFullSetsWithCatalog(normalized));
}

export default function App() {
  // Resolve initial route, category, and direct product from URL (e.g. /women/jacket or /women/jacket/avenue-heavy-cow-leather-biker-jacket)
  const initialParsedUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return { route: '/home' as RoutePath, selectedCategory: 'all', matchedProduct: null };
    }
    const search = new URLSearchParams(window.location.search);
    return parseCatalogUrlState(
      window.location.pathname,
      INITIAL_CATEGORIES,
      INITIAL_PRODUCTS,
      search
    );
  }, []);

  // Route state (/home, /women, /kids, /new-arrivals, /gifts, /showroom, /admin)
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => initialParsedUrl.route);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => initialParsedUrl.selectedCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() =>
    Array.from(
      new Set([
        ...LEGACY_REMOVED_PRODUCT_IDS,
        ...loadStored(STORAGE_KEYS.deletedProducts, []),
      ])
    )
  );
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>(() =>
    loadStored(STORAGE_KEYS.deletedCategories, [])
  );
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    mergeStoredCategories(
      loadStored(STORAGE_KEYS.categories, INITIAL_CATEGORIES),
      loadStored(STORAGE_KEYS.deletedCategories, [])
    )
  );
  const [siteBanners, setSiteBanners] = useState<SiteBannersConfig>(() => {
    try {
      localStorage.removeItem('samo_site_banners_v1');
    } catch {}
    return mergeSiteBannersConfig(
      loadStored<Partial<SiteBannersConfig> | null>(STORAGE_KEYS.siteBanners, null),
      mergeStoredCategories(
        loadStored(STORAGE_KEYS.categories, INITIAL_CATEGORIES),
        loadStored(STORAGE_KEYS.deletedCategories, [])
      )
    );
  });
  const [products, setProducts] = useState<ProductItem[]>(() => {
    const initialNormalized = normalizeStoredProducts(
      loadStored(STORAGE_KEYS.products, INITIAL_PRODUCTS),
      loadStored(STORAGE_KEYS.deletedProducts, [...LEGACY_REMOVED_PRODUCT_IDS])
    );
    if (!lastPushedSheetsQuantitySignature) {
      lastPushedSheetsQuantitySignature =
        buildProductsQuantitySignature(initialNormalized);
    }
    return initialNormalized;
  });
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>(() =>
    loadStored(STORAGE_KEYS.promos, INITIAL_PROMO_CODES)
  );
  const [customMaterials, setCustomMaterials] = useState<string[]>(() =>
    loadStored(STORAGE_KEYS.materials, ['Shearling', 'Lambskin'])
  );
  const [customColors, setCustomColors] = useState<string[]>(() =>
    loadStored(STORAGE_KEYS.colors, [
      'Olive',
      'Navy',
      'Grey',
      'Light Grey',
      'Graige',
      'Matcha',
      'Beige',
      'White',
    ])
  );
  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(() =>
    loadStored<string[]>(STORAGE_KEYS.deletedOrders, [])
  );
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const initialDeleted = new Set(
      loadStored<string[]>(STORAGE_KEYS.deletedOrders, [])
    );
    return loadStored(STORAGE_KEYS.orders, INITIAL_ORDERS).filter(
      (o) => o && o.id && !initialDeleted.has(o.id)
    );
  });
  const [preorders, setPreorders] = useState<PreorderItem[]>(() =>
    loadStored(STORAGE_KEYS.preorders, INITIAL_PREORDERS)
  );
  const [admins, setAdmins] = useState<AdminRecord[]>(() => {
    try {
      localStorage.removeItem('samo_admins_v1');
    } catch {}
    const stored = loadStored(STORAGE_KEYS.admins, INITIAL_ADMINS);
    return sanitizeAuthorizedAdmins(stored);
  });
  const [autoAcceptOrders, setAutoAcceptOrders] = useState<boolean>(() =>
    loadStored<boolean>(STORAGE_KEYS.autoAcceptOrders, true)
  );
  const [showLowStockCount, setShowLowStockCount] = useState<boolean>(() =>
    loadStored<boolean>(STORAGE_KEYS.showLowStockCount, false)
  );
  const [codEnabled, setCodEnabled] = useState<boolean>(() =>
    loadStored<boolean>(STORAGE_KEYS.codEnabled, false)
  );
  const [shrinkUploadsEnabled, setShrinkUploadsState] = useState<boolean>(() =>
    getShrinkUploadsEnabled()
  );
  const [adminNotificationState, setAdminNotificationState] =
    useState<AdminNotificationSyncState>(() =>
      loadStored<AdminNotificationSyncState>(
        STORAGE_KEYS.adminNotificationState,
        {
          readIds: [],
          dismissedIds: [],
        }
      )
    );

  // Shopping Bag & Active Sole Product Modal State
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    loadStored(STORAGE_KEYS.cart, [])
  );
  const [activeProductModal, setActiveProductModal] =
    useState<ProductItem | null>(() => initialParsedUrl.matchedProduct);
  const activeProductModalRef = useRef<ProductItem | null>(activeProductModal);
  activeProductModalRef.current = activeProductModal;
  const productsRef = useRef<ProductItem[]>(products);
  productsRef.current = products;
  const directUrlInitializedRef = useRef<boolean>(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [cartDrawerInitialStep, setCartDrawerInitialStep] = useState<
    'cart' | 'checkout'
  >('cart');
  const cartReturnProductRef = useRef<ProductItem | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(
    () => {
      try {
        if (
          typeof window !== 'undefined' &&
          localStorage.getItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY) === '1'
        ) {
          return true;
        }
      } catch {}
      try {
        if (
          typeof document !== 'undefined' &&
          hasNewsletterSubscribedCookie(document.cookie)
        ) {
          return true;
        }
      } catch {}
      return false;
    }
  );
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<
    NewsletterSubscriber[]
  >([]);
  const [newsletterPopupConfig, setNewsletterPopupConfig] =
    useState<NewsletterPopupConfig>(() =>
      mergeNewsletterPopupConfig(
        loadStored<Partial<NewsletterPopupConfig> | null>(
          STORAGE_KEYS.newsletterPopupConfig,
          DEFAULT_NEWSLETTER_POPUP_CONFIG
        )
      )
    );
  const [isNewsletterPopupOpen, setIsNewsletterPopupOpen] =
    useState<boolean>(false);
  const popupShownInCurrentVisitRef = useRef<boolean>(false);
  const [seoConfig, setSeoConfig] = useState<SeoConfigState>(() => {
    const stored = loadStored<SeoConfigState | null>(STORAGE_KEYS.seoConfig, null);
    if (stored && stored.siteTitleSuffix) return stored;
    return generateCatalogSeoSnapshot(products, categories, siteBanners);
  });
  const [sizeGuideConfig, setSizeGuideConfig] = useState<SizeGuideConfig>(() => {
    const stored = loadStored<Partial<SizeGuideConfig> | null>(
      STORAGE_KEYS.sizeGuideConfig,
      null
    );
    return mergeSizeGuideConfig(stored);
  });

  // Home Page Section 2 (Categories Switcher: Women | Kids), New Arrivals Carousel & Bags Collection Carousel State
  const [homeCategoryDept, setHomeCategoryDept] = useState<Department>('women');
  const [homeNewArrivalsDept, setHomeNewArrivalsDept] =
    useState<Department>('women');
  const [newArrivalsScrollProgress, setNewArrivalsScrollProgress] =
    useState<number>(28);
  const newArrivalsScrollRef = useRef<HTMLDivElement | null>(null);
  const [bagsScrollProgress, setBagsScrollProgress] = useState<number>(28);
  const bagsScrollRef = useRef<HTMLDivElement | null>(null);

  // Catalog Listing Sort State
  const [catalogSortBy, setCatalogSortBy] = useState<
    'suggested' | 'price-asc' | 'price-desc'
  >('suggested');

  // Firebase Auth State (Used strictly for Google Admin Sign-in; Catalog data lives in Cloudflare R2)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sync localStorage whenever state updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
    } catch {}
    setSiteBanners((prev) => mergeSiteBannersConfig(prev, categories));
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.deletedCategories,
        JSON.stringify(deletedCategoryIds)
      );
    } catch {}
  }, [deletedCategoryIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.siteBanners, JSON.stringify(siteBanners));
    } catch {}
  }, [siteBanners]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.deletedProducts,
        JSON.stringify(deletedProductIds)
      );
    } catch {}
  }, [deletedProductIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.promos, JSON.stringify(promoCodes));
    } catch {}
  }, [promoCodes]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.materials,
        JSON.stringify(customMaterials)
      );
    } catch {}
  }, [customMaterials]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.colors,
        JSON.stringify(customColors)
      );
    } catch {}
  }, [customColors]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.deletedOrders,
        JSON.stringify(deletedOrderIds)
      );
    } catch {}
  }, [deletedOrderIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.preorders, JSON.stringify(preorders));
    } catch {}
  }, [preorders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.admins, JSON.stringify(admins));
    } catch {}
  }, [admins]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.autoAcceptOrders,
        JSON.stringify(autoAcceptOrders)
      );
    } catch {}
  }, [autoAcceptOrders]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.showLowStockCount,
        JSON.stringify(showLowStockCount)
      );
    } catch {}
  }, [showLowStockCount]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.codEnabled,
        JSON.stringify(codEnabled)
      );
    } catch {}
  }, [codEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.adminNotificationState,
        JSON.stringify(adminNotificationState)
      );
    } catch {}
  }, [adminNotificationState]);

  useEffect(() => {
    setShrinkUploadsEnabled(shrinkUploadsEnabled);
  }, [shrinkUploadsEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.newsletterPopupConfig,
        JSON.stringify(newsletterPopupConfig)
      );
    } catch {}
  }, [newsletterPopupConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.seoConfig, JSON.stringify(seoConfig));
    } catch {}
  }, [seoConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.sizeGuideConfig,
        JSON.stringify(sizeGuideConfig)
      );
    } catch {}
  }, [sizeGuideConfig]);

  // Dynamic Route, Category & Product SEO + Schema.org JSON-LD Updater
  useEffect(() => {
    const seoPayload = buildDynamicPageSeo({
      route: currentRoute,
      selectedCategory,
      activeProduct: activeProductModal,
      categories,
      products,
      seoConfig,
    });
    applyDocumentSeoTags(seoPayload);
  }, [
    currentRoute,
    selectedCategory,
    activeProductModal,
    categories,
    products,
    seoConfig,
  ]);

  const markUserPermanentlySubscribedToNewsletter = () => {
    popupShownInCurrentVisitRef.current = true;
    try {
      localStorage.setItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY, '1');
    } catch {}
    try {
      sessionStorage.setItem(NEWSLETTER_SESSION_SHOWN_KEY, '1');
    } catch {}
    try {
      if (typeof document !== 'undefined') {
        document.cookie = buildNewsletterSubscribedCookieString();
      }
    } catch {}
  };

  // Homepage 10% OFF Newsletter Pop-Up Timer, 1-Per-Session Browsing Guard & IP Daily Frequency Cap
  useEffect(() => {
    if (currentRoute !== '/home' || !newsletterPopupConfig.enabled) {
      return;
    }

    const delayMs =
      Math.max(1, Math.min(300, Number(newsletterPopupConfig.delaySeconds) || 10)) *
      1000;
    const maxPerDay = Math.max(
      1,
      Math.min(50, Number(newsletterPopupConfig.maxTimesPerDay) || 1)
    );

    const readClientNewsletterEligibilityState = (todayStr: string) => {
      let isSubscribedLocalStorage = false;
      try {
        isSubscribedLocalStorage =
          localStorage.getItem(NEWSLETTER_SUBSCRIBED_STORAGE_KEY) === '1';
      } catch {}

      let shownInSessionStorage = false;
      try {
        shownInSessionStorage =
          sessionStorage.getItem(NEWSLETTER_SESSION_SHOWN_KEY) === '1';
      } catch {}

      const localCountKey = `samo_popup_imp_${todayStr}`;
      let localShownToday = 0;
      try {
        localShownToday = Number(localStorage.getItem(localCountKey) || '0') || 0;
      } catch {}

      const cookieString =
        typeof document !== 'undefined' ? document.cookie : '';

      return {
        isSubscribedLocalStorage,
        shownInSessionStorage,
        localCountKey,
        localShownToday,
        cookieString,
      };
    };

    const initialTodayStr = new Date().toISOString().slice(0, 10);
    const initialClientState = readClientNewsletterEligibilityState(initialTodayStr);
    if (
      !evaluateNewsletterPopupSessionEligibility({
        isSubscribedLocalStorage: initialClientState.isSubscribedLocalStorage,
        cookieString: initialClientState.cookieString,
        shownInCurrentRef: popupShownInCurrentVisitRef.current,
        shownInSessionStorage: initialClientState.shownInSessionStorage,
        localShownToday: initialClientState.localShownToday,
        maxPerDay,
      })
    ) {
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      if (cancelled) return;

      const todayStr = new Date().toISOString().slice(0, 10);
      const clientState = readClientNewsletterEligibilityState(todayStr);

      if (
        !evaluateNewsletterPopupSessionEligibility({
          isSubscribedLocalStorage: clientState.isSubscribedLocalStorage,
          cookieString: clientState.cookieString,
          shownInCurrentRef: popupShownInCurrentVisitRef.current,
          shownInSessionStorage: clientState.shownInSessionStorage,
          localShownToday: clientState.localShownToday,
          maxPerDay,
        })
      ) {
        return;
      }

      let serverEligible = true;
      let serverSubscribed = false;
      try {
        const res = await fetch(
          `/api/newsletter/popup-eligibility?maxPerDay=${maxPerDay}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.subscribed === true) {
            serverSubscribed = true;
            serverEligible = false;
            markUserPermanentlySubscribedToNewsletter();
          } else if (data && data.eligible === false) {
            serverEligible = false;
          }
        }
      } catch {}

      if (
        cancelled ||
        !evaluateNewsletterPopupSessionEligibility({
          isSubscribedLocalStorage: clientState.isSubscribedLocalStorage,
          cookieString: clientState.cookieString,
          shownInCurrentRef: popupShownInCurrentVisitRef.current,
          shownInSessionStorage: clientState.shownInSessionStorage,
          localShownToday: clientState.localShownToday,
          maxPerDay,
          serverEligible,
          serverSubscribed,
        })
      ) {
        return;
      }

      // Mark shown for this active browsing session so navigating away from /home
      // and back to /home during the same visit never triggers a 2nd pop-up.
      popupShownInCurrentVisitRef.current = true;
      try {
        sessionStorage.setItem(NEWSLETTER_SESSION_SHOWN_KEY, '1');
      } catch {}
      setIsNewsletterPopupOpen(true);

      try {
        localStorage.setItem(
          clientState.localCountKey,
          String(clientState.localShownToday + 1)
        );
      } catch {}
      try {
        await fetch('/api/newsletter/popup-impression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxPerDay }),
        });
      } catch {}
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    currentRoute,
    newsletterPopupConfig.enabled,
    newsletterPopupConfig.delaySeconds,
    newsletterPopupConfig.maxTimesPerDay,
  ]);

  const hasPopulatedProductImages = (
    p: ProductItem | null | undefined
  ): boolean => {
    if (!p) return false;
    if (typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0) {
      return true;
    }
    if (
      Array.isArray(p.galleryUrls) &&
      p.galleryUrls.some((u) => typeof u === 'string' && u.trim().length > 0)
    ) {
      return true;
    }
    if (
      Array.isArray(p.colorVariants) &&
      p.colorVariants.some(
        (v) =>
          (typeof v.imageUrl === 'string' && v.imageUrl.trim().length > 0) ||
          (Array.isArray(v.galleryUrls) &&
            v.galleryUrls.some(
              (u) => typeof u === 'string' && u.trim().length > 0
            ))
      )
    ) {
      return true;
    }
    return false;
  };

  const pickRichestProduct = (
    candidates: Array<ProductItem | null | undefined>
  ): ProductItem | null => {
    const valid = candidates.filter((c): c is ProductItem => Boolean(c));
    if (valid.length === 0) return null;
    return valid.find(hasPopulatedProductImages) || valid[0];
  };

  useEffect(() => {
    const win = window as unknown as {
      __samoBagOpen?: boolean;
    };
    win.__samoBagOpen = cartDrawerOpen;
  }, [cartDrawerOpen]);

  // Normalize initial root path '/' to '/home' and listen for browser back/forward
  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({}, '', '/home');
    }
    const onPopState = (event: PopStateEvent) => {
      const stateObj = (event.state || {}) as {
        modalOpen?: boolean;
        productId?: string;
        samoBagOpen?: boolean;
        samoCheckoutStep?: boolean;
        previousProductId?: string | null;
      };
      const win = window as unknown as {
        __samoBagOpen?: boolean;
        __samoBagClosedAt?: number;
        __samoCheckoutStepBackAt?: number;
        __samoBagStep?: 'cart' | 'checkout' | 'confirmed';
      };
      const withinCheckoutStepBackGuard =
        typeof win.__samoCheckoutStepBackAt === 'number' &&
        Date.now() - win.__samoCheckoutStepBackAt < 450;
      const withinBagCloseGuard =
        typeof win.__samoBagClosedAt === 'number' &&
        Date.now() - win.__samoBagClosedAt < 450;

      // 1. Stepping back from Checkout ('checkout') to Shopping Bag ('cart')
      if (
        !withinBagCloseGuard &&
        (withinCheckoutStepBackGuard ||
          win.__samoBagStep === 'checkout' ||
          (stateObj.samoBagOpen && !win.__samoBagOpen))
      ) {
        win.__samoCheckoutStepBackAt = Date.now();
        win.__samoBagStep = 'cart';
        win.__samoBagOpen = true;
        setCartDrawerOpen(true);
        if (!stateObj.samoCheckoutStep) {
          setCartDrawerInitialStep('cart');
        }
        if (!stateObj.samoBagOpen) {
          try {
            window.history.replaceState(
              {
                ...stateObj,
                samoBagOpen: true,
                samoCheckoutStep: false,
              },
              '',
              window.location.pathname + window.location.search
            );
          } catch {}
        }
        return;
      }

      // 2. Stepping back from Shopping Bag ('cart') to the underlying Item Pop-Up (or page)
      if (win.__samoBagOpen || withinBagCloseGuard) {
        win.__samoBagOpen = false;
        win.__samoBagClosedAt = Date.now();
        win.__samoBagStep = undefined;
        setCartDrawerOpen(false);

        const targetProdId =
          activeProductModalRef.current?.id ||
          cartReturnProductRef.current?.id ||
          stateObj.previousProductId ||
          stateObj.productId ||
          null;
        const catalogMatchById = targetProdId
          ? productsRef.current.find((p) => p.id === targetProdId) || null
          : null;
        const search = new URLSearchParams(window.location.search);
        const parsedOnBagClose = parseCatalogUrlState(
          window.location.pathname,
          categories,
          productsRef.current,
          search
        );
        const restoredModalProd = pickRichestProduct([
          activeProductModalRef.current,
          cartReturnProductRef.current,
          catalogMatchById,
          parsedOnBagClose.matchedProduct,
        ]);

        if (restoredModalProd) {
          setActiveProductModal(restoredModalProd);
          try {
            const prodUrl = buildProductUrl(
              restoredModalProd,
              currentRoute,
              selectedCategory
            );
            window.history.replaceState(
              {
                modalOpen: true,
                productId: restoredModalProd.id,
                samoBagOpen: false,
                samoCheckoutStep: false,
              },
              '',
              prodUrl
            );
          } catch {}
        }
        return;
      }

      // 3. Standard browser back/forward navigation (e.g. swiping back from Item Pop-Up to Category Page)
      setCartDrawerOpen(false);
      setSearchQuery('');
      const search = new URLSearchParams(window.location.search);
      const parsed = parseCatalogUrlState(
        window.location.pathname,
        categories,
        productsRef.current,
        search
      );
      setCurrentRoute(parsed.route);
      setSelectedCategory(parsed.selectedCategory);

      // If the user is currently viewing an open Item Pop-Up and swipes back, close the Item Pop-Up
      // even if an unpopped duplicate history entry for the same product URL remained on the stack.
      if (
        activeProductModalRef.current &&
        parsed.matchedProduct &&
        parsed.matchedProduct.id === activeProductModalRef.current.id
      ) {
        cartReturnProductRef.current = null;
        setActiveProductModal(null);
        const categoryUrl = buildCategoryUrl(
          parsed.route,
          parsed.selectedCategory
        );
        if (window.location.pathname !== categoryUrl) {
          try {
            window.history.replaceState({ modalOpen: false }, '', categoryUrl);
          } catch {}
        }
        return;
      }

      if (parsed.matchedProduct) {
        const richMatch = pickRichestProduct([
          parsed.matchedProduct,
          productsRef.current.find((p) => p.id === parsed.matchedProduct?.id),
          activeProductModalRef.current?.id === parsed.matchedProduct.id
            ? activeProductModalRef.current
            : null,
          cartReturnProductRef.current?.id === parsed.matchedProduct.id
            ? cartReturnProductRef.current
            : null,
        ]);
        setActiveProductModal(richMatch);
      } else if (stateObj.modalOpen && stateObj.productId) {
        const matchedFromState = pickRichestProduct([
          productsRef.current.find((p) => p.id === stateObj.productId),
          activeProductModalRef.current?.id === stateObj.productId
            ? activeProductModalRef.current
            : null,
          cartReturnProductRef.current?.id === stateObj.productId
            ? cartReturnProductRef.current
            : null,
        ]);
        setActiveProductModal(matchedFromState);
      } else {
        cartReturnProductRef.current = null;
        setActiveProductModal(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [categories, products, currentRoute, selectedCategory]);

  // Direct product or category link resolution and live image enrichment when catalog products finish loading
  useEffect(() => {
    if (products.length > 0 || categories.length > 0) {
      const search = new URLSearchParams(window.location.search);
      const parsed = parseCatalogUrlState(
        window.location.pathname,
        categories,
        products,
        search
      );
      if (!directUrlInitializedRef.current) {
        if (parsed.matchedProduct && !activeProductModal) {
          setActiveProductModal(parsed.matchedProduct);
        }
        if (parsed.route && parsed.route !== currentRoute) {
          setCurrentRoute(parsed.route);
        }
        if (
          parsed.selectedCategory &&
          parsed.selectedCategory !== selectedCategory
        ) {
          setSelectedCategory(parsed.selectedCategory);
        }
        directUrlInitializedRef.current = true;
      } else if (activeProductModal) {
        const richerFromCatalog = pickRichestProduct([
          products.find((p) => p.id === activeProductModal.id),
          parsed.matchedProduct?.id === activeProductModal.id
            ? parsed.matchedProduct
            : null,
          activeProductModal,
        ]);
        if (
          richerFromCatalog &&
          !hasPopulatedProductImages(activeProductModal) &&
          hasPopulatedProductImages(richerFromCatalog)
        ) {
          setActiveProductModal(richerFromCatalog);
        }
      }
      if (cartReturnProductRef.current) {
        const richerReturn = pickRichestProduct([
          products.find((p) => p.id === cartReturnProductRef.current?.id),
          cartReturnProductRef.current,
        ]);
        if (richerReturn) {
          cartReturnProductRef.current = richerReturn;
        }
      }
    }
  }, [products, categories]);

  // Track Google Auth state for Admin login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Sync shrinkUploadsEnabled and store settings with live Firebase Firestore (settings/store_config)
  useEffect(() => {
    const storeConfigRef = doc(db, 'settings', 'store_config');
    const unsub = onSnapshot(
      storeConfigRef,
      (snap) => {
        if (!snap.exists()) return;
        const cfg = snap.data();
        if (cfg && typeof cfg.shrinkUploadsEnabled === 'boolean') {
          setShrinkUploadsState(cfg.shrinkUploadsEnabled);
          setShrinkUploadsEnabled(cfg.shrinkUploadsEnabled);
        }
        if (cfg && typeof cfg.autoAcceptOrders === 'boolean') {
          setAutoAcceptOrders(cfg.autoAcceptOrders);
        }
        if (cfg && typeof cfg.showLowStockCount === 'boolean') {
          setShowLowStockCount(cfg.showLowStockCount);
        }
        if (cfg && typeof cfg.codEnabled === 'boolean') {
          setCodEnabled(cfg.codEnabled);
        }
        if (cfg && cfg.newsletterPopupConfig && typeof cfg.newsletterPopupConfig === 'object') {
          setNewsletterPopupConfig(
            mergeNewsletterPopupConfig(
              cfg.newsletterPopupConfig as Partial<NewsletterPopupConfig>
            )
          );
        }
        if (cfg && cfg.seoConfig && typeof cfg.seoConfig === 'object') {
          setSeoConfig(cfg.seoConfig as SeoConfigState);
        }
        if (
          cfg &&
          cfg.adminNotificationState &&
          typeof cfg.adminNotificationState === 'object'
        ) {
          const remoteNotif =
            cfg.adminNotificationState as Partial<AdminNotificationSyncState>;
          setAdminNotificationState((prev) => ({
            readIds: Array.isArray(remoteNotif.readIds)
              ? remoteNotif.readIds.slice(-35)
              : prev.readIds,
            dismissedIds: Array.isArray(remoteNotif.dismissedIds)
              ? remoteNotif.dismissedIds.slice(-35)
              : prev.dismissedIds,
            markedAllReadAt:
              typeof remoteNotif.markedAllReadAt === 'string'
                ? remoteNotif.markedAllReadAt
                : prev.markedAllReadAt,
            clearedAllAt:
              typeof remoteNotif.clearedAllAt === 'string'
                ? remoteNotif.clearedAllAt
                : prev.clearedAllAt,
            updatedAt:
              typeof remoteNotif.updatedAt === 'string'
                ? remoteNotif.updatedAt
                : prev.updatedAt,
          }));
        }
      },
      () => {
        // Ignore snapshot errors when offline
      }
    );
    return () => unsub();
  }, []);

  // Cloudflare D1 / R2 Catalog Sync (/api/catalog)
  useEffect(() => {
    let active = true;
    let lastServerUpdatedAt = 0;

    const pullServerCatalog = async () => {
      const pullStartMutationSeq = localMutationSequence;
      if (
        pendingLocalMutations > 0 ||
        Date.now() - lastLocalMutationMs < 6000 ||
        (typeof window !== 'undefined' && window.scrollY < 0)
      ) {
        return;
      }
      try {
        const res = await fetch('/api/catalog', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (
          !active ||
          !data ||
          typeof data !== 'object' ||
          localMutationSequence !== pullStartMutationSeq ||
          pendingLocalMutations > 0 ||
          Date.now() - lastLocalMutationMs < 6000 ||
          (typeof window !== 'undefined' && window.scrollY < 0)
        ) {
          return;
        }

        // If catalog state has not been seeded yet, push current catalog state
        if (!data.updatedAt && (!Array.isArray(data.products) || data.products.length === 0)) {
          pushServerCatalogPatch(
            {
              products,
              categories,
              deletedProductIds,
              deletedCategoryIds,
              siteBanners,
              promoCodes,
              customMaterials,
              customColors,
              orders,
              preorders,
              admins,
              autoAcceptOrders,
              showLowStockCount,
              codEnabled,
              shrinkUploadsEnabled,
              newsletterPopupConfig,
              seoConfig,
            },
            { skipSheetsPush: true }
          );
          return;
        }

        // Skip redundant full-tree re-renders if server state has not changed
        if (
          typeof data.updatedAt === 'number' &&
          data.updatedAt > 0 &&
          data.updatedAt === lastServerUpdatedAt
        ) {
          return;
        }
        if (typeof data.updatedAt === 'number' && data.updatedAt > 0) {
          lastServerUpdatedAt = data.updatedAt;
        }

        const remoteDeletedIds: string[] = Array.isArray(data.deletedProductIds)
          ? data.deletedProductIds
          : [];
        if (remoteDeletedIds.length > 0) {
          setDeletedProductIds((prev) =>
            Array.from(new Set([...prev, ...remoteDeletedIds]))
          );
        }

        const remoteDeletedCatIds: string[] = Array.isArray(data.deletedCategoryIds)
          ? data.deletedCategoryIds
          : [];
        if (remoteDeletedCatIds.length > 0) {
          setDeletedCategoryIds((prev) =>
            Array.from(new Set([...prev, ...remoteDeletedCatIds]))
          );
        }

        if (Array.isArray(data.products) && data.products.length > 0) {
          const normalizedRemoteProducts = normalizeStoredProducts(
            data.products as ProductItem[],
            remoteDeletedIds
          );
          lastPushedSheetsQuantitySignature =
            buildProductsQuantitySignature(normalizedRemoteProducts);
          setProducts(normalizedRemoteProducts);
        }

        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(
            mergeStoredCategories(
              data.categories as CategoryItem[],
              remoteDeletedCatIds
            )
          );
        }
        if (data.siteBanners && typeof data.siteBanners === 'object') {
          const remoteBanners = data.siteBanners as Partial<SiteBannersConfig>;
          setSiteBanners((prev) =>
            mergeSiteBannersConfig(
              {
                ...prev,
                ...remoteBanners,
                ...(typeof remoteBanners.shippingFeeEnabled === 'boolean'
                  ? { shippingFeeEnabled: remoteBanners.shippingFeeEnabled }
                  : {}),
                ...(typeof remoteBanners.standardDeliveryFee === 'number' &&
                Number.isFinite(remoteBanners.standardDeliveryFee)
                  ? { standardDeliveryFee: remoteBanners.standardDeliveryFee }
                  : {}),
                ...(typeof remoteBanners.freeShippingThreshold === 'number' &&
                Number.isFinite(remoteBanners.freeShippingThreshold)
                  ? { freeShippingThreshold: remoteBanners.freeShippingThreshold }
                  : {}),
                ...(typeof remoteBanners.standardDeliveryCheckoutLabel === 'string'
                  ? {
                      standardDeliveryCheckoutLabel:
                        remoteBanners.standardDeliveryCheckoutLabel,
                    }
                  : {}),
              },
              Array.isArray(data.categories) && data.categories.length > 0
                ? mergeStoredCategories(
                    data.categories as CategoryItem[],
                    remoteDeletedCatIds
                  )
                : INITIAL_CATEGORIES
            )
          );
        }
        if (Array.isArray(data.promoCodes)) {
          setPromoCodes(data.promoCodes as PromoCodeItem[]);
        }
        if (Array.isArray(data.customMaterials) && data.customMaterials.length > 0) {
          setCustomMaterials(data.customMaterials as string[]);
        }
        if (Array.isArray(data.customColors) && data.customColors.length > 0) {
          setCustomColors(data.customColors as string[]);
        }
        const remoteDeletedOrderIds: string[] = Array.isArray(
          data.deletedOrderIds
        )
          ? data.deletedOrderIds
          : [];
        if (remoteDeletedOrderIds.length > 0) {
          setDeletedOrderIds((prev) =>
            Array.from(new Set([...prev, ...remoteDeletedOrderIds]))
          );
        }
        if (Array.isArray(data.orders)) {
          const localDeletedOrders = loadStored<string[]>(
            STORAGE_KEYS.deletedOrders,
            []
          );
          const allDeletedOrderSet = new Set([
            ...localDeletedOrders,
            ...remoteDeletedOrderIds,
          ]);
          setOrders(
            (data.orders as OrderItem[]).filter(
              (o) => o && o.id && !allDeletedOrderSet.has(o.id)
            )
          );
        }
        if (Array.isArray(data.preorders)) {
          setPreorders(data.preorders as PreorderItem[]);
        }
        if (Array.isArray(data.admins) && data.admins.length > 0) {
          setAdmins(sanitizeAuthorizedAdmins(data.admins as AdminRecord[]));
        }
        if (typeof data.autoAcceptOrders === 'boolean') {
          setAutoAcceptOrders(data.autoAcceptOrders);
        }
        if (typeof data.showLowStockCount === 'boolean') {
          setShowLowStockCount(data.showLowStockCount);
        }
        if (typeof data.codEnabled === 'boolean') {
          setCodEnabled(data.codEnabled);
        }
        if (typeof data.shrinkUploadsEnabled === 'boolean') {
          setShrinkUploadsState(data.shrinkUploadsEnabled);
          setShrinkUploadsEnabled(data.shrinkUploadsEnabled);
        }
        if (Array.isArray(data.newsletterSubscribers)) {
          setNewsletterSubscribers(
            data.newsletterSubscribers as NewsletterSubscriber[]
          );
        }
        if (
          data.newsletterPopupConfig &&
          typeof data.newsletterPopupConfig === 'object'
        ) {
          setNewsletterPopupConfig(
            mergeNewsletterPopupConfig(
              data.newsletterPopupConfig as Partial<NewsletterPopupConfig>
            )
          );
        }
        if (data.seoConfig && typeof data.seoConfig === 'object') {
          setSeoConfig(data.seoConfig as SeoConfigState);
        }
        if (data.sizeGuideConfig && typeof data.sizeGuideConfig === 'object') {
          setSizeGuideConfig(
            mergeSizeGuideConfig(data.sizeGuideConfig as Partial<SizeGuideConfig>)
          );
        }
        if (
          data.adminNotificationState &&
          typeof data.adminNotificationState === 'object'
        ) {
          const remoteNotif =
            data.adminNotificationState as Partial<AdminNotificationSyncState>;
          setAdminNotificationState((prev) => ({
            readIds: Array.isArray(remoteNotif.readIds)
              ? remoteNotif.readIds.slice(-35)
              : prev.readIds,
            dismissedIds: Array.isArray(remoteNotif.dismissedIds)
              ? remoteNotif.dismissedIds.slice(-35)
              : prev.dismissedIds,
            markedAllReadAt:
              typeof remoteNotif.markedAllReadAt === 'string'
                ? remoteNotif.markedAllReadAt
                : prev.markedAllReadAt,
            clearedAllAt:
              typeof remoteNotif.clearedAllAt === 'string'
                ? remoteNotif.clearedAllAt
                : prev.clearedAllAt,
            updatedAt:
              typeof remoteNotif.updatedAt === 'string'
                ? remoteNotif.updatedAt
                : prev.updatedAt,
          }));
        }
      } catch {}
    };

    pullServerCatalog();
    const intervalId = window.setInterval(() => {
      if (
        typeof document === 'undefined' ||
        document.visibilityState === 'visible'
      ) {
        pullServerCatalog();
      }
    }, 20000);
    const onFocus = () => pullServerCatalog();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullServerCatalog();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Scroll to top whenever route or selected category changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentRoute, selectedCategory]);

  // Navigation handler updating browser URL (supporting /<department>/<category-slug>)
  const handleNavigate = (route: RoutePath, categoryName?: string) => {
    setSearchQuery('');
    if (activeProductModal) {
      setActiveProductModal(null);
    }
    const targetCategory =
      route === '/new-arrivals'
        ? (categoryName || '').trim().toLowerCase() === 'kids'
          ? 'kids'
          : 'women'
        : categoryName || 'all';
    const targetUrl = buildCategoryUrl(route, targetCategory);
    window.history.pushState({}, '', targetUrl);
    setCurrentRoute(route);
    setSelectedCategory(targetCategory);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Category tab selection handler updating URL to /<department>/<category-slug>
  const handleSelectCategory = (categoryName: string) => {
    setSearchQuery('');
    if (activeProductModal) {
      setActiveProductModal(null);
    }
    const cleanCat = categoryName || 'all';
    setSelectedCategory(cleanCat);
    const targetUrl = buildCategoryUrl(currentRoute, cleanCat);
    window.history.pushState({}, '', targetUrl);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Product Pop-Up Modal open handler updating URL to /<department>/<category-slug>/<product-slug>
  const handleOpenProductModal = (product: ProductItem) => {
    const richProd =
      pickRichestProduct([
        product,
        productsRef.current.find((p) => p.id === product.id),
      ]) || product;
    const productUrl = buildProductUrl(richProd, currentRoute, selectedCategory);
    window.history.pushState(
      { modalOpen: true, productId: richProd.id },
      '',
      productUrl
    );
    setActiveProductModal(richProd);
    const effectivePrice = getEffectiveProductPrice(richProd).effectivePrice;
    pushGtmEcommerceEvent('view_item', {
      currency: 'USD',
      value: effectivePrice,
      items: [
        {
          item_id: richProd.garmentCode || richProd.id,
          item_name: richProd.name,
          item_category: richProd.category,
          item_category2: richProd.department,
          price: effectivePrice,
          quantity: 1,
        },
      ],
    });
  };

  // Product Pop-Up Modal close handler returning cleanly to the category URL
  const handleCloseProductModal = () => {
    cartReturnProductRef.current = null;
    setActiveProductModal(null);
    const categoryUrl = buildCategoryUrl(currentRoute, selectedCategory);
    if (window.location.pathname !== categoryUrl) {
      window.history.pushState({ modalOpen: false }, '', categoryUrl);
    }
  };

  // Shopping Bag Drawer open/close handlers with browser history & mobile edge back-swipe support
  const handleOpenCartDrawer = (
    step: 'cart' | 'checkout' = 'cart',
    fromProduct?: ProductItem | null
  ) => {
    const returnProduct = pickRichestProduct([
      fromProduct !== undefined ? fromProduct : activeProductModalRef.current,
      activeProductModalRef.current,
      fromProduct
        ? productsRef.current.find((p) => p.id === fromProduct.id)
        : null,
    ]);
    cartReturnProductRef.current = returnProduct || null;
    if (returnProduct) {
      setActiveProductModal(returnProduct);
    }
    const win = window as unknown as {
      __samoBagOpen?: boolean;
      __samoBagStep?: 'cart' | 'checkout' | 'confirmed';
    };
    win.__samoBagOpen = true;
    win.__samoBagStep = step;
    setCartDrawerInitialStep(step);
    setCartDrawerOpen(true);
    if (step === 'checkout' && cartItems.length > 0) {
      const subtotalValue = cartItems.reduce(
        (sum, ci) =>
          sum + getEffectiveProductPrice(ci.product).effectivePrice * ci.quantity,
        0
      );
      pushGtmEcommerceEvent('begin_checkout', {
        currency: 'USD',
        value: subtotalValue,
        items: cartItems.map((ci) => ({
          item_id: ci.garmentCode || ci.product.garmentCode || ci.product.id,
          item_name: ci.product.name,
          item_category: ci.product.category,
          item_variant: [ci.selectedColor, ci.selectedSize]
            .filter(Boolean)
            .join(' / '),
          price: getEffectiveProductPrice(ci.product).effectivePrice,
          quantity: ci.quantity,
        })),
      });
    }
    const currentHistState = (window.history.state || {}) as {
      samoBagOpen?: boolean;
    };
    const targetUrl = returnProduct
      ? buildProductUrl(returnProduct, currentRoute, selectedCategory)
      : window.location.pathname + window.location.search;
    if (!currentHistState.samoBagOpen) {
      window.history.pushState(
        {
          samoBagOpen: true,
          samoCheckoutStep: step === 'checkout',
          previousProductId: returnProduct ? returnProduct.id : null,
          modalOpen: Boolean(returnProduct),
          productId: returnProduct ? returnProduct.id : undefined,
        },
        '',
        targetUrl
      );
    }
  };

  const handleCloseCartDrawer = (_restorePreviousIfSwipe = false) => {
    const win = window as unknown as {
      __samoBagOpen?: boolean;
      __samoBagClosedAt?: number;
      __samoBagStep?: 'cart' | 'checkout' | 'confirmed';
    };
    win.__samoBagOpen = false;
    win.__samoBagClosedAt = Date.now();
    win.__samoBagStep = undefined;
    setCartDrawerOpen(false);

    const openProd = pickRichestProduct([
      activeProductModalRef.current,
      cartReturnProductRef.current,
      activeProductModalRef.current || cartReturnProductRef.current
        ? productsRef.current.find(
            (p) =>
              p.id ===
              (activeProductModalRef.current?.id ||
                cartReturnProductRef.current?.id)
          )
        : null,
    ]);

    if (openProd) {
      setActiveProductModal(openProd);
      try {
        const prodUrl = buildProductUrl(openProd, currentRoute, selectedCategory);
        window.history.replaceState(
          {
            modalOpen: true,
            productId: openProd.id,
            samoBagOpen: false,
            samoCheckoutStep: false,
          },
          '',
          prodUrl
        );
      } catch {}
      return;
    }

    cartReturnProductRef.current = null;
    const currentHistState = (window.history.state || {}) as {
      samoBagOpen?: boolean;
    };
    if (currentHistState.samoBagOpen) {
      try {
        window.history.replaceState(
          {
            modalOpen: false,
            samoBagOpen: false,
            samoCheckoutStep: false,
          },
          '',
          window.location.pathname + window.location.search
        );
      } catch {}
    }
  };

  // Cart & Buy Now Handlers (validating per-size, per-color, and 2-piece Full Set stock)
  const getMaxAvailableForCartSelection = (
    product: ProductItem,
    selectedSize: string,
    selectedColor?: string,
    selectedSetSizes?: SelectedSetPieceSize[]
  ): number => {
    if (
      product.isFullSet &&
      Array.isArray(product.setItems) &&
      product.setItems.length > 0 &&
      Array.isArray(selectedSetSizes) &&
      selectedSetSizes.length > 0
    ) {
      const pieceCapacities = product.setItems.map((piece, idx) => {
        const chosen =
          selectedSetSizes.find((s) => s.productId === piece.productId) ||
          selectedSetSizes[idx];
        const sz = chosen?.selectedSize || piece.sizes[0];
        if (Array.isArray(piece.colorVariants) && piece.colorVariants.length > 0) {
          const targetColor = chosen?.selectedColor || piece.colorVariants[0].colorName;
          const matchedVar =
            piece.colorVariants.find(
              (v) => v.colorName.trim().toLowerCase() === targetColor.trim().toLowerCase()
            ) || piece.colorVariants[0];
          return matchedVar.sizeQuantities?.[sz] ?? 0;
        }
        return piece.sizeQuantities?.[sz] ?? 0;
      });
      return Math.min(...pieceCapacities);
    }
    return getSizeQuantity(product, selectedSize, selectedColor);
  };

  const handleAddToCart = (
    product: ProductItem,
    selectedSize: string,
    selectedColor?: string,
    selectedColorImage?: string,
    selectedSetSizes?: SelectedSetPieceSize[]
  ) => {
    const availableForSize = getMaxAvailableForCartSelection(
      product,
      selectedSize,
      selectedColor,
      selectedSetSizes
    );
    if (availableForSize <= 0 || !product.inStock) return;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (ci) =>
          ci.product.id === product.id &&
          ci.selectedSize === selectedSize &&
          (ci.selectedColor || '') === (selectedColor || '')
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(
            availableForSize,
            updated[existingIndex].quantity + 1
          ),
        };
        return updated;
      }
      const resolvedGarmentCode = resolveProductGarmentCode(product, {
        selectedColor,
        selectedSetSizes,
        allProducts: products,
      });
      return [
        ...prev,
        {
          product,
          selectedSize,
          selectedSetSizes,
          selectedColor,
          selectedColorImage,
          garmentCode: resolvedGarmentCode || undefined,
          quantity: 1,
        },
      ];
    });

    const effectivePrice = getEffectiveProductPrice(product).effectivePrice;
    pushGtmEcommerceEvent('add_to_cart', {
      currency: 'USD',
      value: effectivePrice,
      items: [
        {
          item_id: product.garmentCode || product.id,
          item_name: product.name,
          item_category: product.category,
          item_category2: product.department,
          item_variant: [selectedColor, selectedSize].filter(Boolean).join(' / '),
          price: effectivePrice,
          quantity: 1,
        },
      ],
    });
  };

  const handleBuyNow = (
    product: ProductItem,
    selectedSize: string,
    selectedColor?: string,
    selectedColorImage?: string,
    selectedSetSizes?: SelectedSetPieceSize[]
  ) => {
    const availableForSize = getMaxAvailableForCartSelection(
      product,
      selectedSize,
      selectedColor,
      selectedSetSizes
    );
    if (availableForSize <= 0 || !product.inStock) return;

    handleAddToCart(
      product,
      selectedSize,
      selectedColor,
      selectedColorImage,
      selectedSetSizes
    );
    handleOpenCartDrawer('cart', product);
  };

  const handleUpdateCartQuantity = (
    productId: string,
    size: string,
    delta: number,
    selectedColor?: string
  ) => {
    setCartItems((prev) =>
      prev
        .map((ci) => {
          if (
            ci.product.id === productId &&
            ci.selectedSize === size &&
            (ci.selectedColor || '') === (selectedColor || '')
          ) {
            const maxForSize = getSizeQuantity(ci.product, size, selectedColor);
            const nextQty = Math.min(maxForSize, ci.quantity + delta);
            return nextQty > 0 ? { ...ci, quantity: nextQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (
    productId: string,
    size: string,
    selectedColor?: string
  ) => {
    setCartItems((prev) =>
      prev.filter(
        (ci) =>
          !(
            ci.product.id === productId &&
            ci.selectedSize === size &&
            (ci.selectedColor || '') === (selectedColor || '')
          )
      )
    );
  };

  const handleSubmitOrder = async (
    orderPayload: Omit<OrderItem, 'id' | 'createdAt' | 'status'>
  ): Promise<OrderItem> => {
    const newId = `ord-${Date.now()}`;
    const nowIso = new Date().toISOString();
    // Customer checkout orders are always auto-accepted so item stock (1 -> 0 out-of-stock / pre-order)
    // is deducted immediately and only restored if an admin clicks Reject.
    const initialStatus: OrderStatus = 'accepted';

    const enrichedOrderedItems = Array.isArray(orderPayload.orderedItems)
      ? orderPayload.orderedItems.map((item) => {
          if (item.imageUrl && item.imageUrl.trim()) {
            return item;
          }
          const matchedProd = products.find((p) => p.id === item.productId);
          if (!matchedProd) return item;
          const variantImg =
            item.selectedColor && Array.isArray(matchedProd.colorVariants)
              ? matchedProd.colorVariants.find(
                  (v) =>
                    v.colorName.trim().toLowerCase() ===
                    item.selectedColor!.trim().toLowerCase()
                )?.imageUrl
              : undefined;
          const resolvedImg = (variantImg || matchedProd.imageUrl || '').trim();
          return resolvedImg ? { ...item, imageUrl: resolvedImg } : item;
        })
      : undefined;

    const isWhishOrOmt =
      orderPayload.paymentMethod === 'Whish/OMT Payment' ||
      orderPayload.paymentMethod === 'Whish' ||
      orderPayload.paymentMethod === 'OMT' ||
      String(orderPayload.paymentMethod || '')
        .toLowerCase()
        .includes('whish') ||
      String(orderPayload.paymentMethod || '')
        .toLowerCase()
        .includes('omt');

    const newOrder: OrderItem = {
      ...orderPayload,
      ...(enrichedOrderedItems ? { orderedItems: enrichedOrderedItems } : {}),
      id: newId,
      status: initialStatus,
      paymentVerified: !isWhishOrOmt,
      createdAt: nowIso,
    };

    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    setCartItems([]);

    pushGtmEcommerceEvent('purchase', {
      transaction_id: newOrder.orderNumber || newOrder.id,
      value: newOrder.totalPrice,
      shipping: newOrder.deliveryFee ?? 0,
      currency: 'USD',
      ...(newOrder.promoCode ? { coupon: newOrder.promoCode } : {}),
      items: (newOrder.orderedItems || []).map((item) => ({
        item_id: item.garmentCode || item.productId,
        item_name: item.productName,
        item_variant: [item.selectedColor, item.selectedSize]
          .filter(Boolean)
          .join(' / '),
        price: item.unitPrice,
        quantity: item.quantity,
      })),
    });

    const updatedCatalog = decrementStockForAcceptedOrder(products, newOrder);
    setProducts(updatedCatalog);
    setActiveProductModal((prev) => {
      if (!prev) return null;
      return updatedCatalog.find((p) => p.id === prev.id) || prev;
    });

    const catalogSyncPromise = pushServerCatalogPatch({
      orders: nextOrders,
      products: updatedCatalog,
      autoAcceptOrders: true,
    });

    const emailDispatchPromise = (async () => {
      try {
        await fetch('/api/order-confirmation-email', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: newOrder,
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
        });
      } catch (emailErr) {
        console.warn('[SAMO] Non-blocking order email trigger notice:', emailErr);
      }
    })();

    await Promise.allSettled([catalogSyncPromise, emailDispatchPromise]);

    return newOrder;
  };

  // Preorder / Back-in-Stock Request Handler (Persisted to Cloudflare R2 Catalog)
  const handleSubmitPreorder = async (payload: {
    product: ProductItem;
    selectedSize: string;
    selectedColor?: string;
    customerContact: string;
  }): Promise<void> => {
    const newId = `pre-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newPreorder: PreorderItem = {
      id: newId,
      productId: payload.product.id,
      productName: payload.product.name,
      productImage: payload.product.imageUrl,
      department: payload.product.department,
      category: payload.product.category,
      selectedSize: payload.selectedSize,
      selectedColor: payload.selectedColor,
      customerContact: payload.customerContact,
      status: 'pending',
      createdAt: nowIso,
    };

    setPreorders((prev) => {
      const next = [newPreorder, ...prev.filter((p) => Boolean(p.productName))];
      pushServerCatalogPatch({ preorders: next });
      return next;
    });
  };

  const handleUpdatePreorderStatus = async (
    preorderId: string,
    status: PreorderStatus
  ) => {
    setPreorders((prev) => {
      const next = prev.map((p) => (p.id === preorderId ? { ...p, status } : p));
      pushServerCatalogPatch({ preorders: next });
      return next;
    });
  };

  const handleDeletePreorder = async (preorderId: string) => {
    setPreorders((prev) => {
      const next = prev.filter((p) => p.id !== preorderId);
      pushServerCatalogPatch({ preorders: next });
      return next;
    });
  };

  // Admin Mutations (All persisted directly to Cloudflare R2 Bucket via /api/catalog)
  const handleAddCategory = async (cat: Omit<CategoryItem, 'id'>) => {
    const id = `${cat.department}-${createSafeSlug(cat.name)}-${Date.now()
      .toString()
      .slice(-4)}`;
    const deptCategories = getCategoriesByDepartment(categories, cat.department);
    const defaultSortOrder = deptCategories.length + 1;
    const newCat: CategoryItem = {
      ...cat,
      id,
      sortOrder:
        typeof cat.sortOrder === 'number' && Number.isFinite(cat.sortOrder)
          ? cat.sortOrder
          : defaultSortOrder,
    };

    const nextCategories = [...categories, newCat];
    const bannerKey = getCategoryBannerKey(newCat.department, newCat.name);
    const nextBanners: SiteBannersConfig = {
      ...siteBanners,
      categoryBanners: {
        ...siteBanners.categoryBanners,
        [bannerKey]:
          siteBanners.categoryBanners?.[bannerKey] ||
          buildDefaultCategoryBannerForCategory(newCat.department, newCat.name),
      },
    };

    setCategories(nextCategories);
    setSiteBanners(nextBanners);
    await pushServerCatalogPatch({
      categories: nextCategories,
      siteBanners: nextBanners,
    });
  };

  const handleUpdateCategory = async (
    categoryId: string,
    newName: string,
    newDescription?: string,
    newSortOrder?: number,
    sizeGuides?: ('tops_guide' | 'trousers_guide')[]
  ) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName) return;

    const existingCat = categories.find((c) => c.id === categoryId);
    if (!existingCat) return;

    const oldName = existingCat.name;
    const oldBannerKey = getCategoryBannerKey(existingCat.department, oldName);
    const newBannerKey = getCategoryBannerKey(existingCat.department, cleanNewName);

    const nextCategories = categories.map((c) =>
      c.id === categoryId
        ? {
            ...c,
            name: cleanNewName,
            slug: createSafeSlug(cleanNewName),
            description:
              newDescription !== undefined ? newDescription : c.description,
            sortOrder:
              typeof newSortOrder === 'number' && Number.isFinite(newSortOrder)
                ? newSortOrder
                : c.sortOrder,
            sizeGuides:
              sizeGuides !== undefined ? sizeGuides : c.sizeGuides,
          }
        : c
    );

    const nextProducts = products.map((p) =>
      p.department === existingCat.department &&
      p.category.trim().toLowerCase() === oldName.trim().toLowerCase()
        ? { ...p, category: cleanNewName }
        : p
    );

    const nextBanners: SiteBannersConfig = {
      ...siteBanners,
      categoryBanners: {
        ...siteBanners.categoryBanners,
        ...(siteBanners.categoryBanners?.[oldBannerKey]
          ? {
              [newBannerKey]: {
                ...siteBanners.categoryBanners[oldBannerKey],
                categoryKey: newBannerKey,
                categoryName: cleanNewName,
                updatedAt: new Date().toISOString(),
              },
            }
          : {}),
      },
    };

    setCategories(nextCategories);
    setProducts(nextProducts);
    setSiteBanners(nextBanners);
    if (
      selectedCategory !== 'all' &&
      selectedCategory.trim().toLowerCase() === oldName.trim().toLowerCase()
    ) {
      setSelectedCategory(cleanNewName);
    }

    await pushServerCatalogPatch({
      categories: nextCategories,
      products: nextProducts,
      siteBanners: nextBanners,
    });
  };

  const handleUpdateCategorySortOrder = async (
    categoryId: string,
    newSortOrder: number
  ) => {
    const nextCategories = updateCategorySortOrder(
      categories,
      categoryId,
      newSortOrder
    );
    setCategories(nextCategories);
    await pushServerCatalogPatch({ categories: nextCategories });
  };

  const handleMoveCategoryOrder = async (
    department: Department,
    categoryId: string,
    direction: 'up' | 'down'
  ) => {
    const nextCategories = moveCategoryInDepartment(
      categories,
      department,
      categoryId,
      direction
    );
    setCategories(nextCategories);
    await pushServerCatalogPatch({ categories: nextCategories });
  };

  const handleRenumberDepartmentCategories = async (department: Department) => {
    const nextCategories = renumberDepartmentCategoriesSequentially(
      categories,
      department
    );
    setCategories(nextCategories);
    await pushServerCatalogPatch({ categories: nextCategories });
  };

  const handleToggleCategoryActive = async (
    categoryId: string,
    nextActive: boolean
  ) => {
    const targetCat = categories.find((c) => c.id === categoryId);
    const nextCategories = categories.map((c) =>
      c.id === categoryId ? { ...c, active: nextActive } : c
    );
    setCategories(nextCategories);
    if (
      !nextActive &&
      targetCat &&
      selectedCategory !== 'all' &&
      selectedCategory.trim().toLowerCase() ===
        targetCat.name.trim().toLowerCase()
    ) {
      setSelectedCategory('all');
    }
    await pushServerCatalogPatch({ categories: nextCategories });
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletedCategoryIds((prevDel) => {
      const nextDel = Array.from(new Set([...prevDel, id]));
      setCategories((prevCats) => {
        const nextCats = prevCats.filter((c) => c.id !== id);
        pushServerCatalogPatch({
          categories: nextCats,
          deletedCategoryIds: nextDel,
        });
        return nextCats;
      });
      return nextDel;
    });
  };

  const handleAddProduct = async (prod: Omit<ProductItem, 'id'>) => {
    const id = `samo-${prod.department}-${createSafeSlug(prod.name).slice(
      0,
      20
    )}-${Date.now().toString().slice(-4)}`;
    const sizeQuantities = buildSizeQuantitiesMap(prod.sizes, prod.sizeQuantities);
    const totalQty = sumSizeQuantities(prod.sizes, sizeQuantities);
    const baseProd: ProductItem = {
      ...prod,
      id,
      materials: Array.isArray(prod.materials) ? prod.materials : [],
      sizeQuantities,
      quantity: totalQty,
      inStock: totalQty > 0,
      hasColors: false,
      colorVariants: [],
    };
    const newProd: ProductItem =
      prod.hasColors &&
      Array.isArray(prod.colorVariants) &&
      prod.colorVariants.length > 0
        ? {
            ...baseProd,
            hasColors: true,
            colorVariants: prod.colorVariants,
            imageUrl: baseProd.imageUrl || prod.colorVariants[0]?.imageUrl || '',
            ...syncProductFromColorVariants(
              prod.colorVariants,
              baseProd.sizeType
            ),
          }
        : baseProd;

    let nextCatalog = [newProd, ...productsRef.current];
    if (
      newProd.department === 'women' &&
      newProd.isHomeCategoryCover &&
      normalizeHomeWomenCategoryTile(newProd.category)
    ) {
      nextCatalog = applyExclusiveHomeCategoryCover(
        nextCatalog,
        newProd.id,
        true,
        newProd.category
      );
    }
    const finalCatalog = ensureHomepageMerchandisingDefaults(nextCatalog);
    productsRef.current = finalCatalog;
    setProducts(finalCatalog);
    await pushServerCatalogPatch({ products: finalCatalog });
  };

  const handleUpdateProductSizeQuantity = async (
    productId: string,
    size: string,
    nextQuantity: number
  ) => {
    const safeQty = Math.max(0, Math.floor(Number(nextQuantity) || 0));
    let updatedRef: ProductItem | null = null;

    const nextCatalog = productsRef.current.map((p) => {
      if (p.id !== productId) return p;
      const nextMap = {
        ...buildSizeQuantitiesMap(p.sizes, p.sizeQuantities),
        [size]: safeQty,
      };
      const nextTotal = sumSizeQuantities(p.sizes, nextMap);
      const updated = {
        ...p,
        sizeQuantities: nextMap,
        quantity: nextTotal,
        inStock: nextTotal > 0,
      };
      updatedRef = updated;
      return updated;
    });
    const withSyncedSets = syncFullSetsWithCatalog(nextCatalog);
    const syncedFullSets = withSyncedSets.filter((p) => p.isFullSet);
    productsRef.current = withSyncedSets;
    setProducts(withSyncedSets);

    // Keep open modal in sync if viewing the same product or a linked Full Set
    setActiveProductModal((prev) => {
      if (!prev) return prev;
      if (prev.id === productId && updatedRef) return updatedRef;
      const syncedSet = syncedFullSets.find((s) => s.id === prev.id);
      return syncedSet || prev;
    });

    await pushServerCatalogPatch({ products: withSyncedSets });
  };

  const handleUpdateProductColorVariants = async (
    productId: string,
    hasColors: boolean,
    colorVariants: ProductColorVariant[]
  ) => {
    let updatedRef: ProductItem | null = null;

    const next = productsRef.current.map((p) => {
      if (p.id !== productId) return p;
      if (hasColors && colorVariants.length > 0) {
        const synced = syncProductFromColorVariants(
          colorVariants,
          p.sizeType
        );
        const updated: ProductItem = {
          ...p,
          hasColors: true,
          colorVariants,
          imageUrl: p.imageUrl || colorVariants[0]?.imageUrl || '',
          ...synced,
        };
        updatedRef = updated;
        return updated;
      }
      const fallbackTotal = sumSizeQuantities(p.sizes, p.sizeQuantities);
      const updated: ProductItem = {
        ...p,
        hasColors: false,
        colorVariants: [],
        quantity: fallbackTotal,
        inStock: fallbackTotal > 0,
      };
      updatedRef = updated;
      return updated;
    });
    productsRef.current = next;
    setProducts(next);

    setActiveProductModal((prev) => {
      if (!prev || prev.id !== productId || !updatedRef) return prev;
      return updatedRef;
    });

    await pushServerCatalogPatch({ products: next });
  };

  const handleUpdateProductMeta = async (
    productId: string,
    updates: Partial<ProductItem>
  ) => {
    let updatedRef: ProductItem | null = null;

    let nextCatalog = productsRef.current.map((p) => {
      if (p.id !== productId) return p;
      const nextIsNew =
        updates.isNewArrival !== undefined
          ? updates.isNewArrival
          : p.isNewArrival;
      const nextShowInHomeNa = !nextIsNew
        ? false
        : updates.showInHomeNewArrivals !== undefined
        ? updates.showInHomeNewArrivals
        : p.showInHomeNewArrivals ?? true;

      const merged: ProductItem = {
        ...p,
        ...updates,
        isNewArrival: nextIsNew,
        featured: nextIsNew,
        showInHomeNewArrivals: nextShowInHomeNa,
      };

      if (
        updates.colorVariants &&
        Array.isArray(merged.colorVariants) &&
        merged.colorVariants.length > 0
      ) {
        const synced = syncProductFromColorVariants(
          merged.colorVariants,
          merged.sizeType
        );
        merged.hasColors = true;
        merged.sizes = synced.sizes;
        merged.sizeQuantities = synced.sizeQuantities;
        merged.quantity = synced.quantity;
        merged.inStock =
          updates.inStock !== undefined ? updates.inStock : synced.inStock;
      } else if (updates.sizes || updates.sizeQuantities) {
        const nextSizes =
          Array.isArray(merged.sizes) && merged.sizes.length > 0
            ? merged.sizes
            : ['M'];
        const nextMap = buildSizeQuantitiesMap(
          nextSizes,
          merged.sizeQuantities
        );
        const nextTotal = sumSizeQuantities(nextSizes, nextMap);
        merged.sizes = nextSizes;
        merged.sizeQuantities = nextMap;
        merged.quantity = nextTotal;
        merged.inStock =
          updates.inStock !== undefined ? updates.inStock : nextTotal > 0;
      }

      updatedRef = merged;
      return merged;
    });

    if (typeof updates.isHomeCategoryCover === 'boolean') {
      const targetProd = nextCatalog.find((p) => p.id === productId);
      nextCatalog = applyExclusiveHomeCategoryCover(
        nextCatalog,
        productId,
        updates.isHomeCategoryCover,
        targetProd?.category
      );
      updatedRef =
        nextCatalog.find((p) => p.id === productId) || updatedRef;
    }

    const withSyncedSets = ensureHomepageMerchandisingDefaults(
      syncFullSetsWithCatalog(nextCatalog)
    );
    productsRef.current = withSyncedSets;
    setProducts(withSyncedSets);

    setActiveProductModal((prev) => {
      if (!prev || prev.id !== productId || !updatedRef) return prev;
      return updatedRef;
    });

    await pushServerCatalogPatch({ products: withSyncedSets });
  };

  const handleToggleProductStock = async (
    productId: string,
    nextInStock: boolean
  ) => {
    let updatedRef: ProductItem | null = null;

    const nextCatalog = productsRef.current.map((p) => {
      if (p.id !== productId) return p;
      const toggled = toggleProductInStockState(p, nextInStock);
      updatedRef = toggled;
      return toggled;
    });
    const withSyncedSets = syncFullSetsWithCatalog(nextCatalog);
    const syncedFullSets = withSyncedSets.filter((p) => p.isFullSet);
    productsRef.current = withSyncedSets;
    setProducts(withSyncedSets);

    setActiveProductModal((prev) => {
      if (!prev) return prev;
      if (prev.id === productId && updatedRef) return updatedRef;
      const syncedSet = syncedFullSets.find((s) => s.id === prev.id);
      return syncedSet || prev;
    });

    await pushServerCatalogPatch({ products: withSyncedSets });
  };

  const handleToggleProductVisibility = async (
    productId: string,
    nextVisible: boolean
  ) => {
    const nextCatalog = productsRef.current.map((p) =>
      p.id === productId ? toggleProductVisibilityState(p, nextVisible) : p
    );
    productsRef.current = nextCatalog;
    setProducts(nextCatalog);

    if (!nextVisible) {
      setActiveProductModal((prev) =>
        prev && prev.id === productId ? null : prev
      );
    }

    await pushServerCatalogPatch(
      { products: nextCatalog },
      { skipSheetsPush: true }
    );
  };

  const handleUpdateSiteBanners = async (nextBanners: SiteBannersConfig) => {
    const merged = mergeSiteBannersConfig(nextBanners, categories);
    setSiteBanners(merged);
    try {
      localStorage.setItem(STORAGE_KEYS.siteBanners, JSON.stringify(merged));
    } catch {}
    await pushServerCatalogPatch({ siteBanners: merged });
  };

  const handleDeleteProduct = async (id: string) => {
    const targetProduct = products.find((p) => p.id === id);
    if (targetProduct) {
      const r2UrlsToDelete: string[] = [
        targetProduct.imageUrl,
        ...(targetProduct.galleryUrls || []),
        ...(targetProduct.colorVariants || []).flatMap((v) => [
          v.imageUrl,
          ...(v.galleryUrls || []),
        ]),
      ].filter(Boolean);
      if (r2UrlsToDelete.length > 0) {
        deleteMediaFromR2(r2UrlsToDelete).catch(() => {});
      }
    }

    setDeletedProductIds((prev) => {
      const nextDeleted = Array.from(new Set([...prev, id]));
      setProducts((currProds) => {
        const nextProds = currProds.filter((p) => p.id !== id);
        pushServerCatalogPatch({
          products: nextProds,
          deletedProductIds: nextDeleted,
        });
        return nextProds;
      });
      return nextDeleted;
    });
  };

  const handleAddPromoCode = async (promo: Omit<PromoCodeItem, 'id'>) => {
    const id = `promo-${createSafeSlug(promo.code)}`;
    const newPromo: PromoCodeItem = {
      ...promo,
      id,
      createdAt: new Date().toISOString(),
    };
    setPromoCodes((prev) => {
      const next = [
        newPromo,
        ...prev.filter((p) => p.code.toUpperCase() !== promo.code.toUpperCase()),
      ];
      pushServerCatalogPatch({ promoCodes: next });
      return next;
    });
  };

  const handleDeletePromoCode = async (id: string) => {
    setPromoCodes((prev) => {
      const next = prev.filter((p) => p.id !== id);
      pushServerCatalogPatch({ promoCodes: next });
      return next;
    });
  };

  const handleAddCustomMaterial = async (materialName: string) => {
    const clean = materialName.trim().slice(0, 60);
    if (!clean) return;
    setCustomMaterials((prev) => {
      const next = prev.includes(clean) ? prev : [...prev, clean];
      pushServerCatalogPatch({ customMaterials: next });
      return next;
    });
  };

  const handleAddCustomColor = async (colorName: string) => {
    const clean = colorName.trim().slice(0, 40);
    if (!clean) return;
    setCustomColors((prev) => {
      const next = prev.some((c) => c.toLowerCase() === clean.toLowerCase())
        ? prev
        : [...prev, clean];
      pushServerCatalogPatch({ customColors: next });
      return next;
    });
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const wasAlreadyAccepted = targetOrder?.status === 'accepted';

    const nextOrders = orders.map((o) =>
      o.id === orderId ? { ...o, status } : o
    );
    setOrders(nextOrders);

    // When admin accepts an order, reduce the stock quantity of the bought size(s) / color(s)
    if (targetOrder && status === 'accepted' && !wasAlreadyAccepted) {
      const updatedCatalog = decrementStockForAcceptedOrder(
        products,
        targetOrder
      );
      setProducts(updatedCatalog);
      setActiveProductModal((prev) => {
        if (!prev) return null;
        return updatedCatalog.find((p) => p.id === prev.id) || prev;
      });
      await pushServerCatalogPatch({
        orders: nextOrders,
        products: updatedCatalog,
      });
    } else if (targetOrder && wasAlreadyAccepted && status === 'rejected') {
      // Stock is restored ONLY when admin explicitly clicks Reject on an accepted order
      const updatedCatalog = restoreStockForCanceledOrder(
        products,
        targetOrder
      );
      setProducts(updatedCatalog);
      setActiveProductModal((prev) => {
        if (!prev) return null;
        return updatedCatalog.find((p) => p.id === prev.id) || prev;
      });
      await pushServerCatalogPatch({
        orders: nextOrders,
        products: updatedCatalog,
      });
    } else {
      await pushServerCatalogPatch({ orders: nextOrders });
    }
  };

  const handleConfirmOrderPayment = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;
    const wasAlreadyAccepted = targetOrder.status === 'accepted';
    const verifiedOrder: OrderItem = {
      ...targetOrder,
      status: 'accepted',
      paymentVerified: true,
    };

    const nextOrders = orders.map((o) =>
      o.id === orderId ? verifiedOrder : o
    );
    setOrders(nextOrders);
    try {
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    } catch {}

    let catalogPatchPromise: Promise<unknown>;
    if (!wasAlreadyAccepted) {
      const updatedCatalog = decrementStockForAcceptedOrder(
        products,
        verifiedOrder
      );
      setProducts(updatedCatalog);
      setActiveProductModal((prev) => {
        if (!prev) return null;
        return updatedCatalog.find((p) => p.id === prev.id) || prev;
      });
      catalogPatchPromise = pushServerCatalogPatch({
        orders: nextOrders,
        products: updatedCatalog,
      });
    } else {
      catalogPatchPromise = pushServerCatalogPatch({ orders: nextOrders });
    }

    const emailDispatchPromise = (async () => {
      try {
        await fetch('/api/order-confirmation-email', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order: verifiedOrder,
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
            adminAlertOnly: false,
          }),
        });
      } catch (emailErr) {
        console.warn(
          '[SAMO] Payment confirmed client email dispatch notice:',
          emailErr
        );
      }
    })();

    await Promise.allSettled([catalogPatchPromise, emailDispatchPromise]);
  };

  const handleDeleteOrder = async (orderId: string) => {
    // Clicking Delete permanently removes the order from React state, localStorage, and Cloudflare D1
    // WITHOUT restoring stock (stock is restored ONLY when admin clicks Reject).
    const nextOrders = orders.filter((o) => o.id !== orderId);
    const nextDeletedOrders = Array.from(
      new Set([...deletedOrderIds, orderId])
    );
    setOrders(nextOrders);
    setDeletedOrderIds(nextDeletedOrders);

    try {
      localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
      localStorage.setItem(
        STORAGE_KEYS.deletedOrders,
        JSON.stringify(nextDeletedOrders)
      );
    } catch {}

    await pushServerCatalogPatch({
      orders: nextOrders,
      deletedOrderIds: nextDeletedOrders,
    });
  };

  const handleToggleAutoAcceptOrders = async (nextEnabled: boolean) => {
    setAutoAcceptOrders(nextEnabled);
    try {
      localStorage.setItem(
        STORAGE_KEYS.autoAcceptOrders,
        JSON.stringify(nextEnabled)
      );
    } catch {}

    if (nextEnabled) {
      const pendingList = orders.filter((o) => o.status === 'pending');
      if (pendingList.length > 0) {
        const nextOrders: OrderItem[] = orders.map((o) =>
          o.status === 'pending' ? { ...o, status: 'accepted' } : o
        );
        let nextCatalog = products;
        for (const pendingOrd of pendingList) {
          nextCatalog = decrementStockForAcceptedOrder(nextCatalog, pendingOrd);
        }
        setOrders(nextOrders);
        setProducts(nextCatalog);
        await pushServerCatalogPatch({
          autoAcceptOrders: true,
          orders: nextOrders,
          products: nextCatalog,
        });
        try {
          await setDoc(
            doc(db, 'settings', 'store_config'),
            { autoAcceptOrders: true, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        } catch {}
        return;
      }
    }

    await pushServerCatalogPatch({ autoAcceptOrders: nextEnabled });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        { autoAcceptOrders: nextEnabled, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}
  };

  const handleToggleShowLowStockCount = async (nextEnabled: boolean) => {
    setShowLowStockCount(nextEnabled);
    await pushServerCatalogPatch({ showLowStockCount: nextEnabled });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        { showLowStockCount: nextEnabled, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch {}
  };

  const handleToggleShrinkUploads = async (nextEnabled: boolean) => {
    setShrinkUploadsState(nextEnabled);
    setShrinkUploadsEnabled(nextEnabled);
    await pushServerCatalogPatch({ shrinkUploadsEnabled: nextEnabled });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        {
          shrinkUploadsEnabled: nextEnabled,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
  };

  const handleToggleCodEnabled = async (nextEnabled: boolean) => {
    setCodEnabled(nextEnabled);
    await pushServerCatalogPatch({ codEnabled: nextEnabled });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        {
          codEnabled: nextEnabled,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
  };

  const handleUpdateAdminNotificationState = async (
    nextNotifState: AdminNotificationSyncState
  ) => {
    const sanitized: AdminNotificationSyncState = {
      readIds: Array.isArray(nextNotifState.readIds)
        ? Array.from(new Set(nextNotifState.readIds)).slice(-35)
        : [],
      dismissedIds: Array.isArray(nextNotifState.dismissedIds)
        ? Array.from(new Set(nextNotifState.dismissedIds)).slice(-35)
        : [],
      ...(nextNotifState.markedAllReadAt
        ? { markedAllReadAt: nextNotifState.markedAllReadAt }
        : {}),
      ...(nextNotifState.clearedAllAt
        ? { clearedAllAt: nextNotifState.clearedAllAt }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    setAdminNotificationState(sanitized);
    await pushServerCatalogPatch({ adminNotificationState: sanitized });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        {
          adminNotificationState: sanitized,
          updatedAt: sanitized.updatedAt,
        },
        { merge: true }
      );
    } catch {}
  };

  const handleAddAdminByEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const record: AdminRecord = {
      id: cleanEmail,
      email: cleanEmail,
      addedBy: currentUser?.email || 'Super Admin',
      createdAt: new Date().toISOString(),
    };
    setAdmins((prev) => {
      const next = prev.some((a) => a.email.toLowerCase() === cleanEmail)
        ? prev
        : [...prev, record];
      pushServerCatalogPatch({ admins: next });
      return next;
    });
  };

  const handleRemoveAdminByEmail = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setAdmins((prev) => {
      const next = prev.filter((a) => a.email.toLowerCase() !== cleanEmail);
      pushServerCatalogPatch({ admins: next });
      return next;
    });
  };

  const handleSubscribeNewsletter = async (email: string) => {
    const clean = email.trim();
    if (!clean || !clean.includes('@') || !clean.includes('.')) return;
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, source: 'footer' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.subscribers)) {
          setNewsletterSubscribers(data.subscribers as NewsletterSubscriber[]);
        }
      }
    } catch (err) {
      console.warn(
        '[SAMO Newsletter] Failed to persist subscription to R2:',
        err
      );
    }
    markUserPermanentlySubscribedToNewsletter();
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
  };

  const handleSubscribePopupNewsletter = async (
    email: string,
    phone: string
  ) => {
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          phone: cleanPhone,
          source: 'popup',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.subscribers)) {
          setNewsletterSubscribers(data.subscribers as NewsletterSubscriber[]);
        }
      }
    } catch (err) {
      console.warn(
        '[SAMO Newsletter Pop-Up] Failed to persist subscription to R2:',
        err
      );
    }

    // Ensure the configured 10% OFF promo code (e.g., SAMO10) is active in promoCodes
    const codeUpper = (newsletterPopupConfig.promoCode || 'SAMO10')
      .trim()
      .toUpperCase();
    setPromoCodes((prev) => {
      const existing = prev.find(
        (p) => p.code.trim().toUpperCase() === codeUpper
      );
      if (existing && existing.active) return prev;
      const nextPromo: PromoCodeItem = {
        id: existing?.id || `promo-${createSafeSlug(codeUpper)}`,
        code: codeUpper,
        discountType: 'percentage',
        discountValue: 10,
        active: true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      const next = [
        nextPromo,
        ...prev.filter((p) => p.code.trim().toUpperCase() !== codeUpper),
      ];
      pushServerCatalogPatch({ promoCodes: next });
      return next;
    });

    markUserPermanentlySubscribedToNewsletter();
    setNewsletterSubscribed(true);
  };

  const handleUpdateNewsletterPopupConfig = async (
    nextConfig: NewsletterPopupConfig
  ) => {
    const merged = mergeNewsletterPopupConfig(nextConfig);
    setNewsletterPopupConfig(merged);
    try {
      localStorage.setItem(
        STORAGE_KEYS.newsletterPopupConfig,
        JSON.stringify(merged)
      );
    } catch {}
    await pushServerCatalogPatch({ newsletterPopupConfig: merged });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        {
          newsletterPopupConfig: merged,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
  };

  const handleRefreshSeoMetadata = async (customKeywords?: string[]) => {
    const activeKeywords =
      customKeywords ??
      seoConfig?.customKeywords ??
      seoConfig?.defaultKeywords;
    const nextSeo = generateCatalogSeoSnapshot(
      products,
      categories,
      siteBanners,
      activeKeywords
    );
    setSeoConfig(nextSeo);
    try {
      localStorage.setItem(STORAGE_KEYS.seoConfig, JSON.stringify(nextSeo));
    } catch {}
    const seoPayload = buildDynamicPageSeo({
      route: currentRoute,
      selectedCategory,
      activeProduct: activeProductModal,
      categories,
      products,
      seoConfig: nextSeo,
    });
    applyDocumentSeoTags(seoPayload);
    await pushServerCatalogPatch({ seoConfig: nextSeo });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        {
          seoConfig: nextSeo,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
  };

  const handleDeleteNewsletterSubscriber = async (id: string) => {
    setNewsletterSubscribers((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/newsletter/subscribers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn(
        '[SAMO Newsletter] Failed to delete subscriber from R2:',
        err
      );
    }
  };

  const handleUpdateSizeGuideConfig = async (nextConfig: SizeGuideConfig) => {
    const merged = mergeSizeGuideConfig({
      ...nextConfig,
      updatedAt: new Date().toISOString(),
    });
    setSizeGuideConfig(merged);
    try {
      localStorage.setItem(
        STORAGE_KEYS.sizeGuideConfig,
        JSON.stringify(merged)
      );
    } catch {}
    await pushServerCatalogPatch({
      sizeGuideConfig: merged as unknown as Record<string, unknown>,
    });
    try {
      await setDoc(
        doc(db, 'settings', 'store_config'),
        {
          sizeGuideConfig: merged,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
  };

  const womenCategories = useMemo(
    () =>
      getCategoriesByDepartment(categories, 'women').filter(
        (c) => c.active !== false
      ),
    [categories]
  );
  const kidsCategories = useMemo(
    () =>
      getCategoriesByDepartment(categories, 'kids').filter(
        (c) => c.active !== false
      ),
    [categories]
  );

  // Filter out products that are hidden individually (hiddenFromStore === true) or belong to any category
  // that the admin has toggled OFF (active === false), while keeping the full products list intact for the Admin Dashboard.
  const publicProducts = useMemo(() => {
    const visibleItems = products.filter((p) => !p.hiddenFromStore);
    const disabledWomenCats = new Set(
      getCategoriesByDepartment(categories, 'women')
        .filter((c) => c.active === false)
        .map((c) => c.name.trim().toLowerCase())
    );
    const disabledKidsCats = new Set(
      getCategoriesByDepartment(categories, 'kids')
        .filter((c) => c.active === false)
        .map((c) => normalizeKidsCategoryName(c.name).trim().toLowerCase())
    );
    if (disabledWomenCats.size === 0 && disabledKidsCats.size === 0) {
      return visibleItems;
    }
    return visibleItems.filter((p) => {
      if (p.department === 'women') {
        const catLower = (p.category || '').trim().toLowerCase();
        const canonicalWomenCat =
          catLower === 'jackets'
            ? 'jacket'
            : catLower === 'bag'
            ? 'bags'
            : catLower === 'belt'
            ? 'belts'
            : catLower;
        if (
          disabledWomenCats.has(catLower) ||
          disabledWomenCats.has(canonicalWomenCat)
        ) {
          return false;
        }
        if (Boolean(p.isFullSet) && disabledWomenCats.has('full set')) {
          return false;
        }
        return true;
      }
      const kidsCatNorm = normalizeKidsCategoryName(p.category || '')
        .trim()
        .toLowerCase();
      return !disabledKidsCats.has(kidsCatNorm);
    });
  }, [products, categories]);

  const activeDepartment: Department | 'all' =
    currentRoute === '/women'
      ? 'women'
      : currentRoute === '/kids'
      ? 'kids'
      : 'all';

  // Compute displayed products based on current route (/new-arrivals, /gifts, /women, /kids)
  const displayedProducts = useMemo(() => {
    let baseList: ProductItem[];
    if (searchQuery.trim()) {
      baseList = filterCatalogProducts(publicProducts, {
        department: activeDepartment,
        category: selectedCategory,
        searchQuery,
      });
    } else if (currentRoute === '/new-arrivals') {
      const targetNaDept: Department =
        selectedCategory.toLowerCase() === 'kids' ? 'kids' : 'women';
      baseList = filterNewArrivalProducts(publicProducts).filter(
        (p) => p.department === targetNaDept
      );
    } else if (currentRoute === '/gifts') {
      baseList = filterGiftsProducts(publicProducts);
    } else if (currentRoute === '/home') {
      baseList = filterNewArrivalProducts(publicProducts);
    } else {
      baseList = filterCatalogProducts(publicProducts, {
        department: activeDepartment,
        category: selectedCategory,
        searchQuery,
      });
    }

    if (catalogSortBy === 'price-asc') {
      return [...baseList].sort((a, b) => a.price - b.price);
    }
    if (catalogSortBy === 'price-desc') {
      return [...baseList].sort((a, b) => b.price - a.price);
    }
    return baseList;
  }, [
    publicProducts,
    currentRoute,
    activeDepartment,
    selectedCategory,
    searchQuery,
    catalogSortBy,
  ]);

  // Resolve active category in-feed banner to appear between products on category pages
  const activeCategoryBanner = useMemo(() => {
    if (currentRoute === '/new-arrivals') {
      const isKidsNa = selectedCategory.toLowerCase() === 'kids';
      const naDept: Department = isKidsNa ? 'kids' : 'women';
      const naCatName = isKidsNa
        ? 'New Arrival (Kids)'
        : 'New Arrivals (Women)';
      const key = getCategoryBannerKey('/new-arrivals', naDept);
      const configured =
        siteBanners.categoryBanners?.[key] ||
        buildDefaultCategoryBannerForCategory('collection', naCatName, key);

      return {
        ...configured,
        department: naDept,
        categoryName: 'New Arrivals',
      };
    }

    if (currentRoute === '/gifts') {
      const giftsKey = getCategoryBannerKey('/gifts', 'all');
      const configuredGifts =
        siteBanners.categoryBanners?.[giftsKey] ||
        siteBanners.categoryBanners?.[getCategoryBannerKey('women', 'Bags')] ||
        buildDefaultCategoryBannerForCategory(
          'collection',
          'Gifts (Bags & Belts)',
          giftsKey
        );
      return {
        ...configuredGifts,
        department: 'women' as Department,
        categoryName: 'Gifts',
      };
    }

    let targetDept: Department = 'women';
    let targetCatName = 'Jacket';

    if (currentRoute === '/kids') {
      targetDept = 'kids';
      targetCatName =
        selectedCategory && selectedCategory !== 'all'
          ? selectedCategory
          : kidsCategories[0]?.name || 'MINIS 1 To 5';
    } else if (currentRoute === '/women') {
      targetDept = 'women';
      targetCatName =
        selectedCategory && selectedCategory !== 'all'
          ? selectedCategory
          : womenCategories[0]?.name || 'Jacket';
    }

    const key = getCategoryBannerKey(targetDept, targetCatName);
    const configured =
      siteBanners.categoryBanners?.[key] ||
      buildDefaultCategoryBannerForCategory(targetDept, targetCatName);

    return {
      ...configured,
      department: targetDept,
      categoryName: targetCatName,
    };
  }, [
    currentRoute,
    selectedCategory,
    siteBanners.categoryBanners,
    womenCategories,
    kidsCategories,
  ]);

  const categoryBannerSplitIndex = useMemo(() => {
    const hasBannerImage = Boolean(
      (activeCategoryBanner?.imageUrl && activeCategoryBanner.imageUrl.trim()) ||
        (activeCategoryBanner?.desktopImageUrl &&
          activeCategoryBanner.desktopImageUrl.trim())
    );
    if (
      !activeCategoryBanner ||
      !activeCategoryBanner.enabled ||
      !hasBannerImage ||
      displayedProducts.length === 0
    ) {
      return -1;
    }
    return getCategoryBannerSplitIndex(
      displayedProducts.length,
      activeCategoryBanner.insertAfterCount
    );
  }, [activeCategoryBanner, displayedProducts.length]);

  // Home Section 2: Women's 4 Signature Categories (Jackets, Trousers, Skirts, Denim) with Exclusive 1-Per-Category Cover Photo
  const homeCategoryTiles = useMemo(
    () => getHomeWomenCategoryTiles(publicProducts, womenCategories),
    [publicProducts, womenCategories]
  );

  // Home New Arrivals Carousel Products filtered by Women | Kids switcher (Ordered by homeNewArrivalsOrder 1, 2, 3...)
  const homeNewArrivalsProducts = useMemo(
    () => orderHomeNewArrivalsProducts(publicProducts, homeNewArrivalsDept),
    [publicProducts, homeNewArrivalsDept]
  );

  const handleNewArrivalsScroll = () => {
    const el = newArrivalsScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setNewArrivalsScrollProgress(100);
      return;
    }
    const ratio = Math.min(1, Math.max(0, el.scrollLeft / maxScroll));
    setNewArrivalsScrollProgress(Math.round(25 + ratio * 75));
  };

  const scrollNewArrivalsCarousel = (direction: -1 | 1) => {
    const el = newArrivalsScrollRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  // Home Bags Collection Carousel Products (Women's Bags only, ordered by homeBagsOrder 1, 2, 3...)
  const homeBagsProducts = useMemo(
    () => orderHomeBagsProducts(publicProducts),
    [publicProducts]
  );

  const handleBagsScroll = () => {
    const el = bagsScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setBagsScrollProgress(100);
      return;
    }
    const ratio = Math.min(1, Math.max(0, el.scrollLeft / maxScroll));
    setBagsScrollProgress(Math.round(25 + ratio * 75));
  };

  const scrollBagsCarousel = (direction: -1 | 1) => {
    const el = bagsScrollRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  // ROUTE: /admin — Strictly isolated Admin Mode (Lazy-loaded so storefront shoppers never download the Admin bundle)
  if (currentRoute === '/admin') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#0E0E10]" />}>
        <AdminDashboard
          currentUser={currentUser}
          onGoogleSignIn={async () => {
            await signInWithPopup(auth, googleProvider);
          }}
          onSignOut={async () => {
            await firebaseSignOut(auth);
          }}
          onNavigateHome={(route) => handleNavigate(route)}
          categories={categories}
          products={products}
          promoCodes={promoCodes}
          customMaterials={customMaterials}
          customColors={customColors}
          orders={orders}
          preorders={preorders}
          admins={admins}
          siteBanners={siteBanners}
          onUpdateSiteBanners={handleUpdateSiteBanners}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onUpdateCategorySortOrder={handleUpdateCategorySortOrder}
          onMoveCategoryOrder={handleMoveCategoryOrder}
          onRenumberDepartmentCategories={handleRenumberDepartmentCategories}
          onToggleCategoryActive={handleToggleCategoryActive}
          onDeleteCategory={handleDeleteCategory}
          onAddProduct={handleAddProduct}
          onUpdateProductSizeQuantity={handleUpdateProductSizeQuantity}
          onUpdateProductColorVariants={handleUpdateProductColorVariants}
          onUpdateProductMeta={handleUpdateProductMeta}
          onToggleProductStock={handleToggleProductStock}
          onToggleProductVisibility={handleToggleProductVisibility}
          onDeleteProduct={handleDeleteProduct}
          onAddPromoCode={handleAddPromoCode}
          onDeletePromoCode={handleDeletePromoCode}
          onAddCustomMaterial={handleAddCustomMaterial}
          onAddCustomColor={handleAddCustomColor}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onConfirmOrderPayment={handleConfirmOrderPayment}
          onDeleteOrder={handleDeleteOrder}
          autoAcceptOrders={autoAcceptOrders}
          onToggleAutoAcceptOrders={handleToggleAutoAcceptOrders}
          showLowStockCount={showLowStockCount}
          onToggleShowLowStockCount={handleToggleShowLowStockCount}
          codEnabled={codEnabled}
          onToggleCodEnabled={handleToggleCodEnabled}
          shrinkUploadsEnabled={shrinkUploadsEnabled}
          onToggleShrinkUploads={handleToggleShrinkUploads}
          onUpdatePreorderStatus={handleUpdatePreorderStatus}
          onDeletePreorder={handleDeletePreorder}
          onAddAdminByEmail={handleAddAdminByEmail}
          onRemoveAdminByEmail={handleRemoveAdminByEmail}
          newsletterSubscribers={newsletterSubscribers}
          onDeleteNewsletterSubscriber={handleDeleteNewsletterSubscriber}
          newsletterPopupConfig={newsletterPopupConfig}
          onUpdateNewsletterPopupConfig={handleUpdateNewsletterPopupConfig}
          seoConfig={seoConfig}
          onRefreshSeoMetadata={handleRefreshSeoMetadata}
          sizeGuideConfig={sizeGuideConfig}
          onUpdateSizeGuideConfig={handleUpdateSizeGuideConfig}
          adminNotificationState={adminNotificationState}
          onUpdateAdminNotificationState={handleUpdateAdminNotificationState}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-950">
      {/* Top Bar (Centered SAMO Logo, Left Links) & Search Bar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        womenCategories={womenCategories}
        kidsCategories={kidsCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={totalCartCount}
        onOpenCart={() => {
          handleOpenCartDrawer('cart', activeProductModal);
        }}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1">
        {/* ROUTE: /showroom — Dedicated SAMO Heritage (Since 1999) & Showroom Map Page */}
        {currentRoute === '/showroom' && !searchQuery ? (
          <section className="max-w-[1440px] mx-auto px-4 md:px-8 py-10 md:py-12 space-y-12">
            {/* Showroom Hero & Heritage Story Since 1999 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border border-zinc-950 bg-white overflow-hidden">
              <div className="lg:col-span-6 h-[317px] sm:h-[380px] md:h-[450px] lg:h-[385px] border-b lg:border-b-0 lg:border-r border-zinc-950 bg-[#EFEFEF] overflow-hidden">
                <ProductImage
                  src={
                    siteBanners.showroomHeroBannerUrl ||
                    siteBanners.showroomHeroDesktopBannerUrl ||
                    'studio://women-trench-suede-coat'
                  }
                  desktopSrc={siteBanners.showroomHeroDesktopBannerUrl}
                  alt="SAMO Flagship Showroom & Weave — Established 1999"
                  category="Trench Coat"
                  styleType="Suede"
                  eager={true}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="lg:col-span-6 p-7 md:p-10 lg:py-8 lg:px-10 flex flex-col justify-center">
                <div className="space-y-4 lg:space-y-3.5">
                  <div className="text-[11px] lg:text-[9.5px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                    SAMO HOUSE HERITAGE · ESTABLISHED 1999
                  </div>
                  <h1 className="font-display text-2xl md:text-4xl lg:text-[31px] font-extrabold tracking-[0.1em] uppercase text-zinc-950 leading-tight">
                    THE HOUSE OF SAMO
                  </h1>
                  <p className="text-xs md:text-sm lg:text-[12.2px] text-zinc-700 leading-relaxed lg:leading-[1.65]">
                    Rooted in architectural permanence since 1999, SAMO defines modern luxury through tactile mastery and sculptural precision. Every silhouette is conceived from noble raw materials including supple full grain cow leather, velvety calf suede, shearling fur, combed cashmere, and liquid silk, tailored with clean geometric lines and enduring proportions.
                  </p>
                  <p className="text-xs md:text-sm lg:text-[12.2px] text-zinc-700 leading-relaxed lg:leading-[1.65]">
                    Inside the SAMO Showroom, our Women’s ready to wear and leather goods curation converges with our centimeter graded Kids collection for Minis, Children, and Teens, uniting artisanal heritage with an unmistakable contemporary attitude.
                  </p>
                </div>
              </div>
            </div>

            {/* Visit Our Showroom & Architectural Live Black-and-White Map Section */}
            <div className="border border-zinc-950 bg-zinc-950 text-white grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              <div className="lg:col-span-5 p-7 md:p-11 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    <MapPin className="w-4 h-4 text-white" />
                    <span>SHOWROOM DESTINATION</span>
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-[0.12em] uppercase text-white">
                    VISIT OUR SHOWROOM
                  </h2>
                  <div className="pt-2 space-y-1.5 text-xs font-mono-tabular text-zinc-300">
                    <div>HOURS: MONDAY – SATURDAY · 10:00 AM – 7:00 PM</div>
                  </div>
                </div>
              </div>

              {/* Monochrome Live Google Map Styled in Architectural Black & White */}
              <div className="lg:col-span-7 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col justify-between p-5 sm:p-7">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular uppercase tracking-widest text-zinc-400 mb-3">
                  <span>SAMO SHOWROOM MAP</span>
                </div>

                <div className="relative w-full h-[250px] sm:h-[300px] border border-zinc-700 bg-zinc-950 overflow-hidden">
                  <iframe
                    title="SAMO Showroom Live Map"
                    src="https://maps.google.com/maps?q=34.068764,35.643423&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    className="w-full h-full border-0 grayscale contrast-125"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>

                <div className="mt-4 flex items-center justify-start">
                  <a
                    href="https://maps.app.goo.gl/3i4C59ucrmTFBvmx5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-white text-[11px] font-display font-bold uppercase tracking-[0.2em] border-b border-white pb-1 hover:opacity-75 transition-opacity cursor-pointer"
                  >
                    <span>Open on Maps</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : (currentRoute === '/refund-policy' ||
            currentRoute === '/exchange-policy' ||
            currentRoute === '/shipping-policy') &&
          !searchQuery ? (
          <section
            data-testid={`policy-page-${currentRoute.replace('/', '')}`}
            className="max-w-[1040px] mx-auto px-3.5 sm:px-6 md:px-8 py-7 sm:py-11 md:py-14 space-y-6 sm:space-y-9"
          >
            {/* Top Architectural Policy Header & 3-Policy Switcher Bar */}
            <div className="border border-zinc-950 bg-white overflow-hidden">
              <div className="p-5 sm:p-8 md:p-10 border-b border-zinc-950 space-y-2.5">
                <h1 className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-[0.08em] uppercase text-zinc-950 leading-tight">
                  {currentRoute === '/refund-policy'
                    ? 'REFUND POLICY'
                    : currentRoute === '/exchange-policy'
                    ? 'EXCHANGE POLICY'
                    : 'SHIPPING POLICY'}
                </h1>
                <p className="text-[12.5px] sm:text-sm text-zinc-700 max-w-2xl leading-relaxed">
                  {currentRoute === '/refund-policy'
                    ? 'Official House of SAMO quality inspection standards, lost-in-transit shipment refund eligibility, and 14-day settlement protocol.'
                    : currentRoute === '/exchange-policy'
                    ? 'Official House of SAMO 7-day garment exchange terms, attached original price tag requirements, showroom or courier exchange options, and single-exchange limit.'
                    : 'Official House of SAMO order processing timeframes, Standard Delivery rates across Lebanon, and 24-hour complimentary Showroom Pickup reservations.'}
                </p>
              </div>

              {/* 3-Tab Policy Switcher — Mobile & Desktop Fitted */}
              <div
                role="tablist"
                aria-label="SAMO House Policies"
                className="grid grid-cols-3 divide-x divide-zinc-950 bg-zinc-50"
              >
                {(
                  [
                    { route: '/refund-policy' as RoutePath, label: 'Refund Policy' },
                    { route: '/exchange-policy' as RoutePath, label: 'Exchange Policy' },
                    { route: '/shipping-policy' as RoutePath, label: 'Shipping Policy' },
                  ]
                ).map((tab) => {
                  const isActive = currentRoute === tab.route;
                  return (
                    <button
                      key={tab.route}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleNavigate(tab.route)}
                      className={`py-3 sm:py-3.5 px-1.5 sm:px-3 text-[10px] sm:text-xs font-display font-bold uppercase tracking-[0.06em] sm:tracking-[0.14em] leading-tight transition-colors cursor-pointer text-center ${
                        isActive
                          ? 'bg-zinc-950 text-white'
                          : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Policy Sections Grid (Single Concise Bold Black Headings Optimized for iOS & Android Mobile) */}
            {currentRoute === '/refund-policy' && (
              <div className="border border-zinc-950 bg-white divide-y divide-zinc-200">
                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    01. Quality &amp; Delivered Orders
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    Every SAMO garment, leather piece, and accessory undergoes strict individual quality inspection prior to dispatch from our studio. Because our collections are produced in limited architectural editions, SAMO operates an exchange-first policy on delivered orders and does not issue monetary refunds for change of mind, size selection, or style preference once an order has been delivered.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2 bg-[#F8F8F8]">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    02. Lost-Shipment Refund Eligibility
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-800 leading-relaxed font-medium">
                    A refund is issued only if the package was lost during shipment and/or was never received (claimed) within 3 days past the shipping time policy (3 to 5 days), in which case the refund will be settled after 14 days from the time of purchase.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    03. 14-Day Refund Settlement
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    When an order qualifies for a lost-shipment refund under Section 02, our logistics team completes a formal carrier trace with the courier partner. Once non-delivery is confirmed 3 days past the 3 to 5 day delivery window, the full order amount is settled after 14 calendar days from the original date of purchase via the client’s original payment method (Whish / OMT transfer or cash settlement).
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    04. Arrival Inspection
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    Clients are advised to inspect their parcel upon arrival. In the rare event that an item arrives with verified transit damage or a dispatch discrepancy, please contact us on WhatsApp or via email at info@samoweave.com within 24 hours of receipt with your Order Number and photos so our team can arrange an immediate replacement.
                  </p>
                </div>
              </div>
            )}

            {currentRoute === '/exchange-policy' && (
              <div className="border border-zinc-950 bg-white divide-y divide-zinc-200">
                <div className="p-5 sm:p-8 space-y-2 bg-[#F8F8F8]">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    01. 7-Day Exchange Window
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-800 leading-relaxed font-medium">
                    Items can be exchanged within 7 days after receiving your order. The original price tag must stay attached on the item throughout these 7 days.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    02. Original Price Tag &amp; Condition
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    To qualify for an exchange, the garment must be returned in its original, unworn, unwashed, and unaltered showroom condition, free of perfumes, cosmetics, or leather creasing. The original SAMO price tag and cord must remain intact and continuously attached to the garment. Any item with a removed, cut, or re-attached price tag cannot be exchanged.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    03. Showroom vs. Delivery Exchange
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    When you request an exchange for another size or another item (of equal or higher value, with any price difference settled upon exchange), completing the exchange by courier delivery requires paying the delivery fee, whereas exchanging in person at the SAMO Showroom is completely free ($0). We always recommend visiting the SAMO Showroom to complete your exchange in person so you can try on the pieces directly and find your perfect size or ideal item.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    04. One Exchange Per Purchase
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    Each purchase is eligible for one (1) exchange only. Once an item from your order has been exchanged for a replacement size or item, that exchanged piece is final and cannot be exchanged a second time.
                  </p>
                </div>
              </div>
            )}

            {currentRoute === '/shipping-policy' && (
              <div className="border border-zinc-950 bg-white divide-y divide-zinc-200">
                <div className="p-5 sm:p-8 space-y-2 bg-[#F8F8F8]">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    01. 3 to 5 Days Delivery
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-800 leading-relaxed font-medium">
                    All orders are processed and delivered within 3 to 5 days after ordering.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    02. Standard Delivery Rates
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    {siteBanners.shippingFeeEnabled === false ||
                    (siteBanners.standardDeliveryFee ?? 6) <= 0
                      ? 'Standard Delivery across Lebanon is currently Complimentary ($0.00 USD Free Shipping) on all online orders.'
                      : (siteBanners.freeShippingThreshold ?? 100) > 0
                      ? `Standard Courier Delivery across Lebanon is $${
                          siteBanners.standardDeliveryFee ?? 6
                        } USD, and Complimentary ($0 USD Free Shipping) on all orders of $${
                          siteBanners.freeShippingThreshold ?? 100
                        } USD and above.${
                          siteBanners.standardDeliveryCheckoutLabel?.trim()
                            ? ` (${siteBanners.standardDeliveryCheckoutLabel.trim()})`
                            : ''
                        }`
                      : `Standard Courier Delivery across Lebanon is a flat rate of $${
                          siteBanners.standardDeliveryFee ?? 6
                        } USD.`}
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    03. Showroom Pickup (24-Hour Hold)
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    When you reserve an item on the website using SAMO Showroom Pickup ($0 — Free), your garment is held exclusively for 24 hours (1 day) after reserving online. Within this 24-hour window, you may visit our flagship showroom (Monday – Saturday, 10:00 AM – 7:00 PM), try the item in store, and complete your checkout. Unclaimed reservations automatically return to live availability after 24 hours.
                  </p>
                </div>

                <div className="p-5 sm:p-8 space-y-2">
                  <h2 className="font-display text-[13px] sm:text-base font-extrabold uppercase tracking-[0.05em] sm:tracking-[0.08em] text-zinc-950 leading-snug">
                    04. Payment &amp; Courier Coordination
                  </h2>
                  <p className="text-[12.5px] sm:text-sm text-zinc-700 leading-relaxed">
                    Orders placed with Whish / OMT Payment are scheduled for dispatch as soon as the transfer is received and verified. Prior to doorstep arrival, our courier partner contacts the client directly on the telephone number provided at checkout to ensure seamless delivery.
                  </p>
                </div>
              </div>
            )}

            {/* Direct Client Care & Showroom Assistance Bar */}
            <div className="border border-zinc-950 bg-zinc-950 text-white p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="font-display text-[13px] sm:text-base font-bold uppercase tracking-[0.06em] sm:tracking-[0.08em] text-white leading-snug">
                Need Assistance With an Order or Exchange?
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                <a
                  href="https://wa.me/96170224767"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial text-center px-4 py-2.5 bg-white text-zinc-950 text-[11px] font-display font-bold uppercase tracking-[0.14em] hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  WhatsApp
                </a>
                <a
                  href="mailto:info@samoweave.com"
                  className="flex-1 sm:flex-initial text-center px-4 py-2.5 border border-white/40 text-white text-[11px] font-display font-bold uppercase tracking-[0.12em] hover:border-white transition-colors cursor-pointer"
                >
                  info@samoweave.com
                </a>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ROUTE: /home (Campaign Hero + Editorial 2-Col + Full-Bleed Kids Hero Image + 4-Item New Arrivals + Discover the House) */}
            {currentRoute === '/home' && !searchQuery && (
              <>
                {/* Section 1: Full-Bleed Campaign Video / Image Hero (Configurable in /admin) */}
                <div id="samo-home-hero-wrapper">
                  <HeroVideoSection
                    onNavigate={handleNavigate}
                    onSelectCategory={handleSelectCategory}
                    mediaType={siteBanners.homeHeroMediaType}
                    videoUrl={siteBanners.homeHeroVideoUrl}
                    desktopVideoUrl={siteBanners.homeHeroDesktopVideoUrl}
                    imageUrl={siteBanners.homeHeroImageUrl}
                    desktopImageUrl={siteBanners.homeHeroDesktopImageUrl}
                    title={
                      typeof siteBanners.heroHeadlineText === 'string'
                        ? siteBanners.heroHeadlineText
                        : siteBanners.homeHeroTitle
                    }
                    headlineSize={siteBanners.heroHeadlineSize || 'md'}
                  />
                </div>

                {/* Section 2: Prada-Inspired Women Categories Section under Hero Video (Jackets, Trousers, Skirts, Denim — 2-Col Mobile / 4-Col Desktop 4:5 Studio Grid) */}
                <section className="w-full bg-white pt-10 pb-8">
                  <div className="max-w-xl mx-auto px-6 text-center space-y-5 mb-7">
                    <p className="text-xs sm:text-[13px] text-zinc-800 leading-relaxed font-normal">
                      Rooted in memory and shaped by transformation, evolving forms
                      and refined details reveal new expressions of individuality.
                    </p>

                    {/* Women Department Header Tab (Kids tab removed from Section 2 per request) */}
                    <div
                      className="flex items-center justify-center gap-7"
                      role="tablist"
                      aria-label="Women Categories"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={true}
                        onClick={() => setHomeCategoryDept('women')}
                        className="pb-1.5 text-xs sm:text-[13px] tracking-[0.02em] transition-colors cursor-pointer font-semibold text-zinc-950 border-b-2 border-zinc-950"
                      >
                        Women
                      </button>
                    </div>
                  </div>

                  {/* Edge-to-Edge 2-Column Mobile / 4-Column Desktop 4:5 Women Category Tiles (Jackets, Trousers, Skirts, Denim) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-[2px] gap-y-2 bg-white">
                    {homeCategoryTiles.map(
                      ({
                        tileName,
                        displayLabel,
                        targetCategoryName,
                        category,
                        imageUrl,
                        styleType,
                      }) => (
                        <div
                          key={category.id || tileName}
                          onClick={() =>
                            handleNavigate('/women', targetCategoryName)
                          }
                          className="group cursor-pointer bg-white flex flex-col"
                        >
                          <div className="aspect-[4/5] w-full bg-[#EFEFEF] overflow-hidden">
                            <ProductImage
                              src={imageUrl}
                              alt={displayLabel}
                              category={targetCategoryName}
                              styleType={styleType}
                              className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="py-4 px-2 text-center bg-white">
                            <h2 className="text-xs sm:text-[13px] font-semibold tracking-[0.01em] text-zinc-950 group-hover:underline">
                              {displayLabel}
                            </h2>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>

                {/* Section 3: Full-Bleed Middle Campaign Image Box (Configurable in /admin — Scaled +6% proportionally on desktop lg:) */}
                <section className="relative w-full h-[74vh] min-h-[520px] max-h-[820px] lg:h-[78.5vh] lg:min-h-[551px] lg:max-h-[869px] bg-zinc-950 overflow-hidden border-y border-zinc-950">
                  <div className="h-full w-full opacity-95">
                    <ProductImage
                      src={
                        siteBanners.homeMiddleBannerUrl ||
                        siteBanners.homeMiddleDesktopBannerUrl ||
                        'studio://kids-junior-leather-bomber'
                      }
                      desktopSrc={siteBanners.homeMiddleDesktopBannerUrl}
                      alt={
                        siteBanners.homeMiddleTitle ||
                        'SAMO Kids Campaign — MINIS 1 To 5, CHILDREN 6+ & Teen 13+'
                      }
                      category="CHILDREN 6+"
                      styleType="Sport Chic"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Measured contrast scrim (7% lighter overlay) */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/78 via-black/28 to-black/18" />

                  {/* Bottom-Center Campaign Title & Underlined White CTA Link (Matching Shop Women / Shop Kids, scaled +6% on desktop) */}
                  <div className="absolute inset-x-0 bottom-10 lg:bottom-[42px] z-20 flex flex-col items-center px-4 text-center lg:scale-[1.06] lg:origin-bottom">
                    <h2
                      className="font-display text-white font-extrabold tracking-[0.14em] uppercase mb-4"
                      style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', textWrap: 'balance' }}
                    >
                      {!siteBanners.homeMiddleTitle ||
                      siteBanners.homeMiddleTitle.trim().toUpperCase() ===
                        'SAMO KIDS COLLECTION'
                        ? 'KIDS COLLECTION'
                        : siteBanners.homeMiddleTitle}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-7 sm:gap-9">
                      <button
                        type="button"
                        onClick={() => {
                          handleNavigate('/kids');
                          setSelectedCategory('all');
                        }}
                        className="px-2 py-1 text-white text-xs sm:text-[13px] font-bold tracking-[0.18em] uppercase underline underline-offset-[7px] decoration-white/80 hover:decoration-white hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        EXPLORE CATALOG
                      </button>
                    </div>
                  </div>
                </section>

                {/* Section 4: Prada-Inspired "New Arrivals" Horizontal 4:5 Carousel with Women | Kids Switcher & Progress Bar (Compact Height) */}
                <section className="w-full bg-white py-7 sm:py-8">
                  <div className="max-w-xl mx-auto px-6 text-center space-y-2 mb-4">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950">
                      New Arrivals
                    </h2>
                    <p className="text-xs sm:text-[13px] text-zinc-800 leading-relaxed font-normal">
                      Rooted in memory and shaped by transformation, evolving forms
                      and refined details reveal new expressions of individuality.
                    </p>

                    <div
                      className="pt-0.5 flex items-center justify-center gap-7"
                      role="tablist"
                      aria-label="New Arrivals Department Switcher"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={homeNewArrivalsDept === 'women'}
                        onClick={() => {
                          setHomeNewArrivalsDept('women');
                          setNewArrivalsScrollProgress(28);
                          if (newArrivalsScrollRef.current) {
                            newArrivalsScrollRef.current.scrollTo({
                              left: 0,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        className={`pb-1 text-xs sm:text-[13px] tracking-[0.02em] transition-colors cursor-pointer ${
                          homeNewArrivalsDept === 'women'
                            ? 'font-semibold text-zinc-950 border-b-2 border-zinc-950'
                            : 'font-normal text-zinc-500 hover:text-zinc-950 border-b-2 border-transparent'
                        }`}
                      >
                        Women
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={homeNewArrivalsDept === 'kids'}
                        onClick={() => {
                          setHomeNewArrivalsDept('kids');
                          setNewArrivalsScrollProgress(28);
                          if (newArrivalsScrollRef.current) {
                            newArrivalsScrollRef.current.scrollTo({
                              left: 0,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        className={`pb-1 text-xs sm:text-[13px] tracking-[0.02em] transition-colors cursor-pointer ${
                          homeNewArrivalsDept === 'kids'
                            ? 'font-semibold text-zinc-950 border-b-2 border-zinc-950'
                            : 'font-normal text-zinc-500 hover:text-zinc-950 border-b-2 border-transparent'
                        }`}
                      >
                        Kids
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Swipeable / Scrollable 4:5 Carousel (Slightly smaller height) */}
                  <div className="relative w-full group/carousel">
                    <div
                      ref={newArrivalsScrollRef}
                      onScroll={handleNewArrivalsScroll}
                      className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-[2px] bg-white"
                    >
                      {homeNewArrivalsProducts.map((product) => (
                        <article
                          key={product.id}
                          onClick={() => handleOpenProductModal(product)}
                          className="w-[62vw] sm:w-[40vw] lg:w-[calc(25%-1.5px)] shrink-0 snap-start cursor-pointer group bg-white flex flex-col"
                        >
                          <div className="aspect-[4/5] max-h-[310px] sm:max-h-[340px] lg:max-h-[360px] w-full bg-[#EFEFEF] overflow-hidden relative">
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              category={product.category}
                              styleType={product.style}
                              className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="py-2.5 px-3 text-center bg-white">
                            <h3 className="text-xs sm:text-[13px] font-semibold tracking-[0.01em] text-zinc-950 group-hover:underline truncate">
                              {product.name}
                            </h3>
                          </div>
                        </article>
                      ))}
                    </div>

                    {/* Desktop Left / Right Navigation Chevrons */}
                    <button
                      type="button"
                      onClick={() => scrollNewArrivalsCarousel(-1)}
                      aria-label="Scroll New Arrivals Left"
                      className="hidden lg:flex items-center justify-center w-8 h-8 absolute left-3 top-[42%] -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-zinc-950 transition-opacity cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollNewArrivalsCarousel(1)}
                      aria-label="Scroll New Arrivals Right"
                      className="hidden lg:flex items-center justify-center w-8 h-8 absolute right-3 top-[42%] -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-zinc-950 transition-opacity cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Centered Horizontal Scroll Progress Bar (matching Video 1) */}
                  <div className="mt-2.5 flex justify-center px-6">
                    <div className="w-44 sm:w-56 h-[2px] bg-zinc-200 relative overflow-hidden">
                      <div
                        className="h-full bg-zinc-950 transition-all duration-150"
                        style={{
                          width: `${Math.max(20, Math.min(100, newArrivalsScrollProgress))}%`,
                        }}
                      />
                    </div>
                  </div>
                </section>

                {/* Section 4B: "Bags Collection" Horizontal 4:5 Carousel (Women Only) Identical in Layout to "New Arrivals" */}
                <section className="w-full bg-white py-7 sm:py-8 border-t border-zinc-100">
                  <div className="max-w-xl mx-auto px-6 text-center space-y-2 mb-4">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950">
                      Bags Collection
                    </h2>
                    <p className="text-xs sm:text-[13px] text-zinc-800 leading-relaxed font-normal">
                      From signature silhouettes to the newest forms, architectural
                      structure and refined details unite in modern elegance.
                    </p>

                    <div
                      className="pt-0.5 flex items-center justify-center gap-7"
                      role="tablist"
                      aria-label="Bags Collection Department"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={true}
                        onClick={() => {
                          setBagsScrollProgress(28);
                          if (bagsScrollRef.current) {
                            bagsScrollRef.current.scrollTo({
                              left: 0,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        className="pb-1 text-xs sm:text-[13px] tracking-[0.02em] transition-colors cursor-pointer font-semibold text-zinc-950 border-b-2 border-zinc-950"
                      >
                        Women
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Swipeable / Scrollable 4:5 Carousel (Identical to New Arrivals) */}
                  <div className="relative w-full group/carousel">
                    <div
                      ref={bagsScrollRef}
                      onScroll={handleBagsScroll}
                      className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-[2px] bg-white"
                    >
                      {homeBagsProducts.map((product) => (
                        <article
                          key={product.id}
                          onClick={() => handleOpenProductModal(product)}
                          className="w-[62vw] sm:w-[40vw] lg:w-[calc(25%-1.5px)] shrink-0 snap-start cursor-pointer group bg-white flex flex-col"
                        >
                          <div className="aspect-[4/5] max-h-[310px] sm:max-h-[340px] lg:max-h-[360px] w-full bg-[#EFEFEF] overflow-hidden relative">
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              category={product.category}
                              styleType={product.style}
                              className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="py-2.5 px-3 text-center bg-white">
                            <h3 className="text-xs sm:text-[13px] font-semibold tracking-[0.01em] text-zinc-950 group-hover:underline truncate">
                              {product.name}
                            </h3>
                          </div>
                        </article>
                      ))}
                    </div>

                    {/* Desktop Left / Right Navigation Chevrons */}
                    <button
                      type="button"
                      onClick={() => scrollBagsCarousel(-1)}
                      aria-label="Scroll Bags Collection Left"
                      className="hidden lg:flex items-center justify-center w-8 h-8 absolute left-3 top-[42%] -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-zinc-950 transition-opacity cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollBagsCarousel(1)}
                      aria-label="Scroll Bags Collection Right"
                      className="hidden lg:flex items-center justify-center w-8 h-8 absolute right-3 top-[42%] -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-zinc-950 transition-opacity cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Centered Horizontal Scroll Progress Bar (matching New Arrivals) */}
                  <div className="mt-2.5 flex justify-center px-6">
                    <div className="w-44 sm:w-56 h-[2px] bg-zinc-200 relative overflow-hidden">
                      <div
                        className="h-full bg-zinc-950 transition-all duration-150"
                        style={{
                          width: `${Math.max(20, Math.min(100, bagsScrollProgress))}%`,
                        }}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* CATEGORY & PRODUCT LISTING VIEW (/women, /kids, /new-arrivals, /gifts, OR SEARCH) — Matching Video 2 & Screenshot 4 + Mid-Category Editorial Banner */}
            {(currentRoute !== '/home' || Boolean(searchQuery)) && (
              <section className="w-full bg-white pb-16">
                {/* Optional Header Strip for /new-arrivals, /gifts, or active search (since /women & /kids already have the Navbar subcategory bar) */}
                {(currentRoute === '/new-arrivals' ||
                  currentRoute === '/gifts' ||
                  Boolean(searchQuery)) && (
                  <div className="border-b border-zinc-200 px-4 md:px-8 py-4 bg-white">
                    <h1 className="text-sm sm:text-base font-bold tracking-[0.02em] text-zinc-950">
                      {searchQuery
                        ? `Search Results: "${searchQuery}"`
                        : currentRoute === '/new-arrivals'
                        ? selectedCategory.toLowerCase() === 'kids'
                          ? 'New Arrivals — Kids'
                          : 'New Arrivals — Women'
                        : 'Gifts — Bags & Belts'}
                    </h1>
                  </div>
                )}

                {/* Prada-Style Toolbar Row: "{N} PRODUCTS" on Left · "FILTERS · SORT BY" on Right */}
                <div className="px-4 md:px-8 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-2 bg-white">
                  <div className="text-[11px] sm:text-xs font-normal uppercase tracking-[0.06em] text-zinc-500 whitespace-nowrap shrink-0">
                    {displayedProducts.length}{' '}
                    {displayedProducts.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.04em] text-zinc-950 whitespace-nowrap">
                    <span>FILTERS</span>
                    <span aria-hidden="true" className="text-zinc-400">
                      ·
                    </span>
                    <label htmlFor="samo-catalog-sort" className="text-zinc-950">
                      SORT BY:
                    </label>
                    <select
                      id="samo-catalog-sort"
                      value={catalogSortBy}
                      onChange={(e) =>
                        setCatalogSortBy(
                          e.target.value as 'suggested' | 'price-asc' | 'price-desc'
                        )
                      }
                      aria-label="Sort products by"
                      className="bg-transparent font-bold uppercase tracking-[0.04em] text-zinc-950 focus:outline-none cursor-pointer"
                    >
                      <option value="suggested">SUGGESTED</option>
                      <option value="price-asc">PRICE: LOW TO HIGH</option>
                      <option value="price-desc">PRICE: HIGH TO LOW</option>
                    </select>
                  </div>
                </div>

                {displayedProducts.length === 0 ? (
                  <div className="max-w-lg mx-auto my-16 text-center border border-zinc-200 bg-zinc-50 p-8 space-y-4">
                    <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-zinc-700">
                      No pieces match your current selection
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="px-5 py-2.5 bg-zinc-950 text-white text-xs font-bold uppercase tracking-[0.14em] cursor-pointer"
                    >
                      Reset Catalog View
                    </button>
                  </div>
                ) : (
                  /* Edge-to-Edge 2-Column Mobile / 4-Column Desktop 4:5 Product Grid with Thin White Separating Line + Mid-Category Editorial Banner */
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-[2px] gap-y-6 lg:gap-y-8 bg-white">
                    {categoryBannerSplitIndex > 0 ? (
                      <>
                        {/* First Batch of Products before Category Editorial Banner */}
                        {displayedProducts
                          .slice(0, categoryBannerSplitIndex)
                          .map((product) => (
                            <CatalogProductCard
                              key={product.id}
                              product={product}
                              onSelectProduct={handleOpenProductModal}
                            />
                          ))}

                        {/* Full-Width Mid-Category Editorial Image Banner (Managed in /admin) */}
                        <div
                          data-testid="category-infeed-banner"
                          className="col-span-2 lg:col-span-4 my-2 relative w-full h-[38vh] sm:h-[46vh] min-h-[260px] max-h-[480px] bg-zinc-950 overflow-hidden border-y border-zinc-950"
                        >
                          <div className="h-full w-full opacity-90">
                            <ProductImage
                              src={activeCategoryBanner.imageUrl}
                              desktopSrc={activeCategoryBanner.desktopImageUrl}
                              alt={
                                activeCategoryBanner.title ||
                                `${activeCategoryBanner.categoryName} Editorial`
                              }
                              category={activeCategoryBanner.categoryName}
                              styleType="Fine Leather"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                          <div className="absolute inset-x-0 bottom-5 sm:bottom-7 z-10 px-5 sm:px-8 flex items-end justify-start">
                            <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-zinc-200 border border-white/35 bg-black/50 px-3 py-1.5">
                              {activeCategoryBanner.department.toUpperCase()} ·{' '}
                              {activeCategoryBanner.categoryName.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Remaining Products after Category Editorial Banner */}
                        {displayedProducts
                          .slice(categoryBannerSplitIndex)
                          .map((product) => (
                            <CatalogProductCard
                              key={product.id}
                              product={product}
                              onSelectProduct={handleOpenProductModal}
                            />
                          ))}
                      </>
                    ) : (
                      displayedProducts.map((product) => (
                        <CatalogProductCard
                          key={product.id}
                          product={product}
                          onSelectProduct={handleOpenProductModal}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Section 5 (Requirement #7): DISCOVER THE HOUSE (New Arrivals, Gifts [Belts & Bags], Showroom [Since 1999 + Map]) */}
            {currentRoute === '/home' && !searchQuery && (
              <section className="max-w-[1220px] mx-auto px-5 md:px-10 pb-14 pt-3">
                <div className="border-t border-zinc-200 pt-8 mb-6 flex items-center justify-between">
                  <h2 className="font-display text-base md:text-lg font-extrabold tracking-[0.14em] uppercase text-zinc-950">
                    DISCOVER THE HOUSE
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[315px] sm:max-w-[348px] md:max-w-none mx-auto">
                  {/* Box 1: New Arrivals */}
                  <div
                    onClick={() => handleNavigate('/new-arrivals', 'women')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate('/new-arrivals', 'women');
                      }
                    }}
                    className="group cursor-pointer border border-zinc-200 hover:border-zinc-950 bg-white flex flex-col justify-between transition-all"
                  >
                    <div className="aspect-[4/4.35] w-full overflow-hidden border-b border-zinc-100">
                      <ProductImage
                        src={
                          siteBanners.homeBottomNewArrivalsUrl ||
                          'studio://women-fur-opera-coat'
                        }
                        alt="Discover New Arrivals"
                        category="Fur"
                        styleType="Fur"
                        className="h-full w-full"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          LATEST RUNWAY RELEASES
                        </div>
                        <h3 className="font-display text-xs md:text-sm font-extrabold tracking-[0.14em] uppercase text-zinc-950 group-hover:underline mt-0.5">
                          NEW ARRIVALS
                        </h3>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-950" />
                    </div>
                  </div>

                  {/* Box 2: Gifts (All Belts & Bags) */}
                  <div
                    onClick={() => handleNavigate('/gifts')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate('/gifts');
                      }
                    }}
                    className="group cursor-pointer border border-zinc-200 hover:border-zinc-950 bg-white flex flex-col justify-between transition-all"
                  >
                    <div className="aspect-[4/4.35] w-full overflow-hidden border-b border-zinc-100">
                      <ProductImage
                        src={
                          siteBanners.homeBottomGiftsUrl ||
                          'studio://women-bags-hourglass-burgundy'
                        }
                        alt="Discover Gifts — Bags & Belts"
                        category="Bags"
                        styleType="Accessories"
                        className="h-full w-full"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          LEATHER BAGS &amp; BELTS CURATION
                        </div>
                        <h3 className="font-display text-xs md:text-sm font-extrabold tracking-[0.14em] uppercase text-zinc-950 group-hover:underline mt-0.5">
                          GIFTS
                        </h3>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-950" />
                    </div>
                  </div>

                  {/* Box 3: Showroom (Since 1999 & Map) */}
                  <div
                    onClick={() => handleNavigate('/showroom')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate('/showroom');
                      }
                    }}
                    className="group cursor-pointer border border-zinc-200 hover:border-zinc-950 bg-white flex flex-col justify-between transition-all"
                  >
                    <div className="aspect-[4/4.35] w-full overflow-hidden border-b border-zinc-100">
                      <ProductImage
                        src={
                          siteBanners.homeBottomShowroomUrl ||
                          'studio://women-trench-suede-coat'
                        }
                        alt="Discover SAMO Showroom"
                        category="Trench Coat"
                        styleType="Suede"
                        className="h-full w-full"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          HOUSE HERITAGE
                        </div>
                        <h3 className="font-display text-xs md:text-sm font-extrabold tracking-[0.14em] uppercase text-zinc-950 group-hover:underline mt-0.5">
                          SHOWROOM
                        </h3>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-950" />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* SOLE ITEM POP-UP MODAL */}
      <ProductModal
        product={activeProductModal}
        allProducts={publicProducts}
        categories={categories}
        sizeGuideConfig={sizeGuideConfig}
        onClose={handleCloseProductModal}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onSubmitPreorder={handleSubmitPreorder}
        showLowStockCount={showLowStockCount}
        onOpenCart={(fromProd) => {
          handleOpenCartDrawer('cart', fromProd || activeProductModal);
        }}
      />

      {/* SHOPPING BAG & FULL LOCATION CHECKOUT DRAWER */}
      <CartCheckoutDrawer
        isOpen={cartDrawerOpen}
        initialStep={cartDrawerInitialStep}
        cartItems={cartItems}
        products={publicProducts}
        promoCodes={promoCodes}
        orders={orders}
        onClose={() => handleCloseCartDrawer(false)}
        onSwipeBack={() => handleCloseCartDrawer(true)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onAddToCart={handleAddToCart}
        onSelectProduct={(prod) => {
          handleCloseCartDrawer(false);
          handleOpenProductModal(prod);
        }}
        onSubmitOrder={handleSubmitOrder}
        codEnabled={codEnabled}
        shippingFeeEnabled={siteBanners.shippingFeeEnabled !== false}
        standardDeliveryFee={siteBanners.standardDeliveryFee ?? 6}
        freeShippingThreshold={siteBanners.freeShippingThreshold ?? 100}
        standardDeliveryCheckoutLabel={
          siteBanners.standardDeliveryCheckoutLabel || ''
        }
      />

      {/* HOMEPAGE 10% OFF NEWSLETTER POP-UP MODAL */}
      <NewsletterPopupModal
        isOpen={isNewsletterPopupOpen}
        config={newsletterPopupConfig}
        onClose={() => setIsNewsletterPopupOpen(false)}
        onSubscribe={handleSubscribePopupNewsletter}
      />

      {/* MINIMAL ARCHITECTURAL FAQ SECTION RIGHT ABOVE THE FOOTER */}
      <FaqSection sizeGuideConfig={sizeGuideConfig} />

      {/* BALENCIAGA-INSPIRED ARCHITECTURAL MULTI-COLUMN FOOTER */}
      <footer className="bg-[#D4D4D4] text-zinc-950 border-t border-zinc-950 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-400 border-b border-zinc-400">
          {/* Col 1: Newsletter */}
          <div className="p-6 space-y-3">
            <div className="font-display font-bold uppercase tracking-[0.14em]">
              SAMO Newsletter
            </div>
            {newsletterSubscribed ? (
              <p className="text-[11px] font-medium text-emerald-900">
                Subscribed to SAMO
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail.trim()) {
                    handleSubscribeNewsletter(newsletterEmail);
                  }
                }}
                className="space-y-2"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter client email..."
                  className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="underline text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Subscribe to our newsletter
                </button>
              </form>
            )}
          </div>

          {/* Col 2: Women Categories */}
          <div className="p-6 space-y-2">
            <div className="font-display font-bold uppercase tracking-[0.14em] mb-2">
              Women Categories
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {womenCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleNavigate('/women', c.name)}
                  className="text-left hover:underline truncate cursor-pointer"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Col 3: Kids Categories */}
          <div className="p-6 space-y-2">
            <div className="font-display font-bold uppercase tracking-[0.14em] mb-2">
              Kids
            </div>
            <ul className="space-y-1.5 text-[11px]">
              {kidsCategories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/kids', c.name)}
                    className="hover:underline cursor-pointer"
                  >
                    {c.name} Collection
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Discover the House & Dedicated Our Policies Section */}
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <div className="font-display font-bold uppercase tracking-[0.14em] mb-2">
                Discover the House
              </div>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/new-arrivals', 'women')}
                    className="hover:underline cursor-pointer"
                  >
                    New Arrivals
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/gifts')}
                    className="hover:underline cursor-pointer"
                  >
                    Gifts (Bags &amp; Belts)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/showroom')}
                    className="hover:underline cursor-pointer"
                  >
                    Showroom
                  </button>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-zinc-400/80 space-y-2">
              <div className="font-display font-bold uppercase tracking-[0.14em] mb-2">
                Our Policies
              </div>
              <ul className="space-y-1.5 text-[11px]">
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/refund-policy')}
                    className="hover:underline cursor-pointer"
                  >
                    Refund Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/exchange-policy')}
                    className="hover:underline cursor-pointer"
                  >
                    Exchange Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleNavigate('/shipping-policy')}
                    className="hover:underline cursor-pointer"
                  >
                    Shipping Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-wider text-zinc-800">
          <span>© 2026 SAMO (EST. 1999) — ALL RIGHTS RESERVED</span>
        </div>
      </footer>
    </div>
  );
}
