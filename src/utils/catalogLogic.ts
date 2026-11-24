import {
  AdminRecord,
  CategoryBannerConfig,
  CategoryItem,
  DeliveryMethod,
  Department,
  DiscountType,
  FullSetSubItem,
  GoogleSheetIncomingUpdateRow,
  GoogleSheetInventoryRow,
  GoogleSheetsSyncConfig,
  NewsletterPopupConfig,
  OrderItem,
  ProductColorVariant,
  ProductItem,
  PromoCodeItem,
  RoutePath,
  SelectedSetPieceSize,
  SiteBannersConfig,
  SizeType,
} from '../types/samo';

export const PREBUILT_MATERIALS: readonly string[] = [
  'Cow Leather',
  'Suede',
  'Cotton',
  'Wool',
  'Cashmere',
  'Silk',
  'Linen',
  'Denim',
  'Satin',
  'Lace',
];

export const PREBUILT_COLORS: readonly string[] = [
  'Black',
  'Brown',
  'Burgundy',
  'Ivory',
  'Camel',
];

export const LETTER_SIZES: readonly string[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'OS',
];
export const DUAL_LETTER_SIZES: readonly string[] = ['S/M', 'M/L', 'L/XL'];
export const NUMERIC_SIZES: readonly string[] = [
  '34',
  '36',
  '38',
  '40',
  '42',
  '44',
  '46',
  '48',
  '38/39',
  '39/40',
  '40/41',
];
export const MONTHS_SIZES: readonly string[] = [
  '3-6 Months',
  '6-9 Months',
  '6-12 Months',
  '9-12 Months',
  '12-18 Months',
  '18-24 Months',
  '6-9M',
  '9-12M',
  '12-18M',
  '18-24M',
];
export const YEARS_SIZES: readonly string[] = [
  '2-3 Years',
  '4-5 Years',
  '6-7 Years',
  '8-9 Years',
  '2y',
  '3y',
  '4y',
  '5y',
  '6y',
  '7y',
  '8y',
  '9y',
  '10y',
  '11y',
  '12y',
  '13y',
  '14y',
];
export const CM_SIZES: readonly string[] = [
  '80 cm',
  '90 cm',
  '100 cm',
  '110 cm',
  '120 cm',
  '130 cm',
  '140 cm',
  '150 cm',
];

const decodeAdminSig = (sig: string): string => {
  try {
    if (typeof atob !== 'undefined') return atob(sig);
    if (typeof Buffer !== 'undefined') return Buffer.from(sig, 'base64').toString('utf-8');
    return '';
  } catch {
    return '';
  }
};

export const SECURE_PROTECTED_ADMIN_SIGS: readonly string[] = [
  'YXBvbG9rb3JAZ21haWwuY29t',
  'am9leWtvcmFiODhAZ21haWwuY29t',
  'c2Ftb2JvdWdoYXJpb3NAZ21haWwuY29t',
];

export const SUPER_ADMIN_EMAILS: readonly string[] =
  SECURE_PROTECTED_ADMIN_SIGS.map(decodeAdminSig);

/**
 * Maps any color name (prebuilt or custom) to a clean hex swatch code for UI display.
 */
export function getColorSwatchHex(colorName: string): string {
  const c = (colorName || '').trim().toLowerCase();
  const map: Record<string, string> = {
    black: '#111113',
    brown: '#4A2C1D',
    espresso: '#3B2317',
    burgundy: '#5E131D',
    oxblood: '#58111A',
    ivory: '#F4F1EA',
    white: '#FAFAFA',
    camel: '#B88B58',
    beige: '#D6C7B2',
    graige: '#B8B0A4',
    sand: '#CBB89D',
    'light grey': '#A1A1AA',
    'light gray': '#A1A1AA',
    grey: '#71717A',
    gray: '#71717A',
    charcoal: '#27272A',
    navy: '#172554',
    blue: '#1E3A8A',
    matcha: '#748B6F',
    mint: '#8DA390',
    olive: '#3F4D34',
    green: '#14532D',
    red: '#991B1B',
    gold: '#C5A059',
    silver: '#A1A1AA',
    pink: '#D8B4BB',
    taupe: '#8B7D70',
    cognac: '#7C3F23',
  };
  if (map[c]) return map[c];
  for (const [key, hex] of Object.entries(map)) {
    if (c.includes(key)) return hex;
  }
  return '#52525B';
}

/**
 * Merges 5 prebuilt colors with custom admin-added colors without duplicates.
 */
export function mergeColorsList(customColors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const col of [...PREBUILT_COLORS, ...customColors]) {
    const clean = col.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}

/**
 * Maps any browser pathname to one of the canonical routes:
 * /home, /women, /kids, /new-arrivals, /gifts, /showroom, or /admin.
 * Ensures /admin is strictly isolated to the /admin path.
 */
export function parsePathnameToRoute(pathname: string): RoutePath {
  const clean = (pathname || '').trim().toLowerCase().replace(/\/+$/, '');
  if (clean === '/admin' || clean.startsWith('/admin/')) {
    return '/admin';
  }
  if (clean === '/women' || clean.startsWith('/women/')) {
    return '/women';
  }
  if (clean === '/kids' || clean.startsWith('/kids/')) {
    return '/kids';
  }
  if (clean === '/new-arrivals' || clean.startsWith('/new-arrivals/')) {
    return '/new-arrivals';
  }
  if (clean === '/gifts' || clean.startsWith('/gifts/')) {
    return '/gifts';
  }
  if (clean === '/showroom' || clean.startsWith('/showroom/')) {
    return '/showroom';
  }
  if (clean === '/refund-policy' || clean.startsWith('/refund-policy/')) {
    return '/refund-policy';
  }
  if (
    clean === '/exchange-policy' ||
    clean.startsWith('/exchange-policy/') ||
    clean === '/return-policy' ||
    clean.startsWith('/return-policy/')
  ) {
    return '/exchange-policy';
  }
  if (clean === '/shipping-policy' || clean.startsWith('/shipping-policy/')) {
    return '/shipping-policy';
  }
  return '/home';
}

/**
 * Generates a URL-safe slug matching ^[a-z0-9\-]+$ for Firestore rules compliance.
 */
export function createSafeSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return slug || 'item';
}

/**
 * Returns a URL-friendly slug for a product based on its name (e.g. 'avenue-heavy-cow-leather-biker-jacket').
 */
export function getProductSlug(product: Pick<ProductItem, 'name' | 'id'>): string {
  return createSafeSlug(product.name || product.id);
}

/**
 * Builds a clean category URL path, e.g.:
 * - /women/jacket
 * - /women/full-set
 * - /kids/minis-1-to-5
 * - /women (when categoryName is 'all' or empty)
 * - /new-arrivals
 * - /gifts
 * - /home
 */
export function buildCategoryUrl(
  routeOrDept: RoutePath | Department | string,
  categoryName?: string
): string {
  const rawClean = (routeOrDept || '').trim().toLowerCase();
  const withLeadingSlash = rawClean.startsWith('/') ? rawClean : `/${rawClean}`;
  const cleanRoute = parsePathnameToRoute(withLeadingSlash);
  if (
    cleanRoute === '/admin' ||
    cleanRoute === '/showroom' ||
    cleanRoute === '/refund-policy' ||
    cleanRoute === '/exchange-policy' ||
    cleanRoute === '/shipping-policy'
  ) {
    return cleanRoute;
  }
  if (cleanRoute === '/new-arrivals') {
    const cat = (categoryName || '').trim().toLowerCase();
    if (cat === 'women' || cat === 'kids') {
      return `/new-arrivals/${cat}`;
    }
    return '/new-arrivals';
  }
  if (cleanRoute === '/gifts') {
    return cleanRoute;
  }
  if (cleanRoute === '/women' || cleanRoute === '/kids') {
    const dept = cleanRoute === '/kids' ? 'kids' : 'women';
    const cat = (categoryName || 'all').trim();
    if (!cat || cat.toLowerCase() === 'all') {
      return `/${dept}`;
    }
    const normalized =
      dept === 'kids' ? normalizeKidsCategoryName(cat) : cat;
    return `/${dept}/${createSafeSlug(normalized)}`;
  }
  return '/home';
}

/**
 * Builds a clean, shareable product URL path, e.g.:
 * - /women/jacket/avenue-heavy-cow-leather-biker-jacket
 * - /kids/minis-1-to-5/baby-cashmere-knit-set
 */
export function buildProductUrl(
  product: ProductItem,
  _fallbackRoute?: RoutePath,
  fallbackCategory?: string
): string {
  const dept = product.department === 'kids' ? 'kids' : 'women';
  const rawCat = product.category || fallbackCategory || 'all';
  const normalizedCat =
    dept === 'kids' ? normalizeKidsCategoryName(rawCat) : rawCat.trim();
  const catSlug =
    normalizedCat.toLowerCase() === 'all'
      ? 'item'
      : createSafeSlug(normalizedCat);
  const prodSlug = getProductSlug(product);

  return `/${dept}/${catSlug}/${prodSlug}`;
}

/**
 * Finds a matching CategoryItem by slug or normalized name in a given department.
 */
export function findCategoryBySlug(
  categories: CategoryItem[],
  slugOrName: string,
  department?: Department
): CategoryItem | undefined {
  const rawClean = (slugOrName || '').trim();
  if (!rawClean) return undefined;
  const targetSlug = createSafeSlug(rawClean);

  return categories.find((c) => {
    if (department && c.department !== department) return false;
    const catSlug = c.slug ? c.slug.toLowerCase() : createSafeSlug(c.name);
    if (catSlug === targetSlug) return true;
    if (createSafeSlug(c.name) === targetSlug) return true;
    if (c.name.trim().toLowerCase() === rawClean.toLowerCase()) return true;
    if (
      (targetSlug === 'jacket' || targetSlug === 'jackets') &&
      (catSlug === 'jacket' || catSlug === 'jackets')
    ) {
      return true;
    }

    if (department === 'kids' || c.department === 'kids') {
      const norm = normalizeKidsCategoryName(c.name);
      if (createSafeSlug(norm) === targetSlug) return true;
      const targetNorm = normalizeKidsCategoryName(rawClean);
      if (norm.toLowerCase() === targetNorm.toLowerCase()) return true;
    }
    return false;
  });
}

function hasNonEmptyProductMedia(p: ProductItem | null | undefined): boolean {
  if (!p) return false;
  if (typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0) return true;
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
          v.galleryUrls.some((u) => typeof u === 'string' && u.trim().length > 0))
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Finds a matching ProductItem by slug, name, or ID, preferring items with populated images.
 */
export function findProductBySlug(
  products: ProductItem[],
  slugOrId: string,
  department?: Department
): ProductItem | undefined {
  const rawClean = (slugOrId || '').trim();
  if (!rawClean) return undefined;
  const targetSlug = createSafeSlug(rawClean);

  // 1. Exact ID match (case-sensitive then insensitive)
  const idMatches = products.filter(
    (p) => p.id === rawClean || p.id.toLowerCase() === rawClean.toLowerCase()
  );
  if (idMatches.length > 0) {
    return idMatches.find(hasNonEmptyProductMedia) || idMatches[0];
  }

  // 2. Slug match within department (if provided)
  if (department) {
    const deptMatches = products.filter(
      (p) =>
        p.department === department &&
        (getProductSlug(p) === targetSlug || createSafeSlug(p.name) === targetSlug)
    );
    if (deptMatches.length > 0) {
      return deptMatches.find(hasNonEmptyProductMedia) || deptMatches[0];
    }
  }

  // 3. Slug match across all products
  const allMatches = products.filter(
    (p) => getProductSlug(p) === targetSlug || createSafeSlug(p.name) === targetSlug
  );
  if (allMatches.length > 0) {
    return allMatches.find(hasNonEmptyProductMedia) || allMatches[0];
  }
  return undefined;
}

export interface ParsedCatalogUrlState {
  route: RoutePath;
  selectedCategory: string;
  matchedProduct: ProductItem | null;
  productSlugCandidate?: string;
}

/**
 * Parses any incoming URL path (e.g. /women/jacket, /women/jacket/biker-jacket, /kids/minis-1-to-5)
 * and resolves the matching route, category, and direct product pop-up state.
 */
export function parseCatalogUrlState(
  pathname: string,
  categories: CategoryItem[],
  products: ProductItem[],
  searchParams?: URLSearchParams
): ParsedCatalogUrlState {
  const cleanPath = (pathname || '').trim().replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      route: '/home',
      selectedCategory: 'all',
      matchedProduct: null,
    };
  }

  const firstSeg = segments[0].toLowerCase();

  if (firstSeg === 'admin') {
    return { route: '/admin', selectedCategory: 'all', matchedProduct: null };
  }
  if (firstSeg === 'showroom') {
    return { route: '/showroom', selectedCategory: 'all', matchedProduct: null };
  }
  if (firstSeg === 'refund-policy') {
    return {
      route: '/refund-policy',
      selectedCategory: 'all',
      matchedProduct: null,
    };
  }
  if (firstSeg === 'exchange-policy' || firstSeg === 'return-policy') {
    return {
      route: '/exchange-policy',
      selectedCategory: 'all',
      matchedProduct: null,
    };
  }
  if (firstSeg === 'shipping-policy') {
    return {
      route: '/shipping-policy',
      selectedCategory: 'all',
      matchedProduct: null,
    };
  }
  if (firstSeg === 'home') {
    const prodSlug = segments[1];
    const matched = prodSlug ? findProductBySlug(products, prodSlug) : null;
    return {
      route: '/home',
      selectedCategory: 'all',
      matchedProduct: matched || null,
      productSlugCandidate: prodSlug,
    };
  }
  if (firstSeg === 'new-arrivals') {
    const secondSeg = (segments[1] || '').toLowerCase();
    if (secondSeg === 'women' || secondSeg === 'kids') {
      const dept = secondSeg as Department;
      const prodSlug = segments[2];
      const matched = prodSlug
        ? findProductBySlug(products, prodSlug, dept) ||
          findProductBySlug(products, prodSlug)
        : null;
      return {
        route: '/new-arrivals',
        selectedCategory: dept,
        matchedProduct: matched || null,
        productSlugCandidate: prodSlug,
      };
    }
    const prodSlug = segments[1];
    const matched = prodSlug ? findProductBySlug(products, prodSlug) : null;
    return {
      route: '/new-arrivals',
      selectedCategory: matched?.department === 'kids' ? 'kids' : 'women',
      matchedProduct: matched || null,
      productSlugCandidate: prodSlug,
    };
  }
  if (firstSeg === 'gifts') {
    const prodSlug = segments[1];
    const matched = prodSlug ? findProductBySlug(products, prodSlug) : null;
    return {
      route: '/gifts',
      selectedCategory: 'all',
      matchedProduct: matched || null,
      productSlugCandidate: prodSlug,
    };
  }

  if (firstSeg === 'women' || firstSeg === 'kids') {
    const dept: Department = firstSeg as Department;
    const route: RoutePath = `/${dept}` as RoutePath;

    // Check query params fallback (e.g. ?category=... or ?product=...)
    const queryCat = searchParams?.get('category');
    const queryProd = searchParams?.get('product');

    if (segments.length === 1) {
      let matchedProd: ProductItem | null = null;
      let matchedCategory = 'all';

      if (queryCat) {
        const foundCat = findCategoryBySlug(categories, queryCat, dept);
        if (foundCat) matchedCategory = foundCat.name;
      }
      if (queryProd) {
        matchedProd = findProductBySlug(products, queryProd, dept) || null;
        if (matchedProd && matchedCategory === 'all') {
          matchedCategory = matchedProd.category;
        }
      }

      return {
        route,
        selectedCategory: matchedCategory,
        matchedProduct: matchedProd,
      };
    }

    if (segments.length === 2) {
      // Could be /women/jacket (category) OR /women/biker-jacket (product)
      const secondSeg = segments[1];
      const matchedCat = findCategoryBySlug(categories, secondSeg, dept);

      if (matchedCat) {
        let matchedProd: ProductItem | null = null;
        if (queryProd) {
          matchedProd = findProductBySlug(products, queryProd, dept) || null;
        }
        return {
          route,
          selectedCategory: matchedCat.name,
          matchedProduct: matchedProd,
        };
      }

      // Check if second segment is a direct product slug
      const directProd = findProductBySlug(products, secondSeg, dept);
      if (directProd) {
        return {
          route,
          selectedCategory: directProd.category,
          matchedProduct: directProd,
          productSlugCandidate: secondSeg,
        };
      }

      // Fallback: treat as category name
      return {
        route,
        selectedCategory: secondSeg,
        matchedProduct: null,
      };
    }

    // segments.length >= 3: /women/jacket/avenue-heavy-cow-leather-biker-jacket
    const categorySeg = segments[1];
    const productSeg = segments[2];

    const matchedCat = findCategoryBySlug(categories, categorySeg, dept);
    const matchedProd = findProductBySlug(products, productSeg, dept);

    return {
      route,
      selectedCategory: matchedCat?.name || matchedProd?.category || categorySeg,
      matchedProduct: matchedProd || null,
      productSlugCandidate: productSeg,
    };
  }

  // Fallback for any unknown root
  return {
    route: parsePathnameToRoute(pathname),
    selectedCategory: 'all',
    matchedProduct: null,
  };
}

/**
 * Normalizes a size string according to the selected SizeType ('letter' | 'numeric' | 'months' | 'years' | 'cm').
 */
export function normalizeSizeEntry(raw: string, sizeType: SizeType): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (sizeType === 'letter') {
    const upper = trimmed.toUpperCase();
    const aliases: Record<string, string> = {
      XSMALL: 'XS',
      'X-SMALL': 'XS',
      SMALL: 'S',
      MEDIUM: 'M',
      LARGE: 'L',
      XLARGE: 'XL',
      'X-LARGE': 'XL',
    };
    return (aliases[upper] || upper).slice(0, 40);
  }

  if (sizeType === 'dual_letter') {
    return trimmed
      .toUpperCase()
      .replace(/\s*[-/]\s*/g, '/')
      .slice(0, 40);
  }

  if (sizeType === 'numeric') {
    const dualNumMatch = trimmed.match(/^(\d+\s*[-/]\s*\d+)$/);
    if (dualNumMatch) {
      return dualNumMatch[1].replace(/\s*[-/]\s*/g, '/');
    }
    const numMatch = trimmed.match(/\d+/);
    return numMatch ? numMatch[0].slice(0, 10) : trimmed.slice(0, 40);
  }

  if (sizeType === 'months') {
    const mMatch = trimmed.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s*(?:m|mo|mos|months?)?$/i);
    if (mMatch) {
      return `${mMatch[1].replace(/\s+/g, '')} Months`;
    }
    if (!/months?$/i.test(trimmed)) {
      return `${trimmed} Months`.slice(0, 40);
    }
    return trimmed.replace(/months?$/i, 'Months').slice(0, 40);
  }

  if (sizeType === 'years') {
    const yMatch = trimmed.match(/^(\d+(?:\s*[-–]\s*\d+)?)\s*(?:y|yr|yrs|years?)?$/i);
    if (yMatch) {
      return `${yMatch[1].replace(/\s+/g, '')} Years`;
    }
    if (!/years?$/i.test(trimmed)) {
      return `${trimmed} Years`.slice(0, 40);
    }
    return trimmed.replace(/years?$/i, 'Years').slice(0, 40);
  }

  // sizeType === 'cm'
  const cmNumberMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)?$/i);
  if (cmNumberMatch) {
    return `${cmNumberMatch[1]} cm`;
  }
  if (!trimmed.toLowerCase().endsWith('cm')) {
    return `${trimmed} cm`.slice(0, 40);
  }
  return trimmed.slice(0, 40);
}

/**
 * Returns default preset sizes for a given SizeType.
 */
export function getDefaultSizesForType(sizeType: SizeType): string[] {
  if (sizeType === 'letter') return ['XS', 'S', 'M', 'L', 'XL'];
  if (sizeType === 'dual_letter') return [...DUAL_LETTER_SIZES];
  if (sizeType === 'numeric') return ['36', '38', '40', '42'];
  if (sizeType === 'months')
    return ['3-6 Months', '6-12 Months', '12-18 Months', '18-24 Months'];
  if (sizeType === 'years')
    return ['2-3 Years', '4-5 Years', '6-7 Years', '8-9 Years'];
  return ['90 cm', '100 cm', '110 cm', '120 cm', '130 cm'];
}

/**
 * Resolves a single quantity value: if admin did not enter a valid quantity, defaults to 5.
 */
export function resolveProductQuantity(rawInput: string | number | undefined | null): number {
  if (rawInput === undefined || rawInput === null) return 5;
  const str = String(rawInput).trim();
  if (str === '') return 5;
  const parsed = Math.floor(Number(str));
  if (Number.isNaN(parsed) || parsed < 0) return 5;
  return parsed;
}

/**
 * Builds a per-size quantity map where each size defaults to 5 whenever left blank.
 */
export function buildSizeQuantitiesMap(
  sizes: string[],
  rawPerSizeInputs?: Record<string, string | number | undefined | null>
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const size of sizes) {
    const raw = rawPerSizeInputs ? rawPerSizeInputs[size] : undefined;
    map[size] = resolveProductQuantity(raw);
  }
  return map;
}

/**
 * Sums total quantity across all sizes of a product.
 */
export function sumSizeQuantities(
  sizes: string[],
  sizeQuantities?: Record<string, number>
): number {
  if (!sizeQuantities || typeof sizeQuantities !== 'object') {
    return sizes.length * 5;
  }
  return sizes.reduce((sum, sz) => {
    const val = sizeQuantities[sz];
    const resolved =
      typeof val === 'number' && !Number.isNaN(val) ? Math.max(0, Math.floor(val)) : 5;
    return sum + resolved;
  }, 0);
}

/**
 * Synchronizes aggregate product fields (sizes, sizeQuantities, quantity, inStock, sizeType)
 * from its colorVariants when hasColors is true.
 */
export function syncProductFromColorVariants(
  colorVariants: ProductColorVariant[],
  fallbackSizeType: SizeType = 'letter'
): {
  sizeType: SizeType;
  sizes: string[];
  sizeQuantities: Record<string, number>;
  quantity: number;
  inStock: boolean;
} {
  const safeVariants = Array.isArray(colorVariants) ? colorVariants : [];
  const combinedSizes: string[] = [];
  const combinedQuantities: Record<string, number> = {};
  let totalQuantity = 0;

  for (const variant of safeVariants) {
    const vSizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const vMap = buildSizeQuantitiesMap(vSizes, variant.sizeQuantities);
    for (const sz of vSizes) {
      if (!combinedSizes.includes(sz)) {
        combinedSizes.push(sz);
      }
      const q = vMap[sz] ?? 0;
      combinedQuantities[sz] = (combinedQuantities[sz] || 0) + q;
      totalQuantity += q;
    }
  }

  return {
    sizeType: safeVariants[0]?.sizeType || fallbackSizeType,
    sizes: combinedSizes.length > 0 ? combinedSizes : ['M'],
    sizeQuantities: combinedQuantities,
    quantity: totalQuantity,
    inStock: totalQuantity > 0,
  };
}

/**
 * Returns the available stock for a specific size of a product (or for a specific color + size).
 */
export function getSizeQuantity(
  product: Pick<ProductItem, 'sizes' | 'sizeQuantities' | 'hasColors' | 'colorVariants'>,
  size: string,
  colorName?: string
): number {
  if (
    product.hasColors &&
    Array.isArray(product.colorVariants) &&
    product.colorVariants.length > 0
  ) {
    if (colorName) {
      const matchedVariant = product.colorVariants.find(
        (v) => v.colorName.trim().toLowerCase() === colorName.trim().toLowerCase()
      );
      if (matchedVariant) {
        if (!matchedVariant.sizes.includes(size)) return 0;
        const q = matchedVariant.sizeQuantities?.[size];
        return typeof q === 'number' && !Number.isNaN(q) ? Math.max(0, Math.floor(q)) : 5;
      }
    }
    // If no colorName passed on a multi-color product, sum across variants for that size
    return product.colorVariants.reduce((sum, v) => {
      if (!v.sizes.includes(size)) return sum;
      const q = v.sizeQuantities?.[size];
      const val = typeof q === 'number' && !Number.isNaN(q) ? Math.max(0, Math.floor(q)) : 5;
      return sum + val;
    }, 0);
  }

  if (product.sizeQuantities && typeof product.sizeQuantities[size] === 'number') {
    return Math.max(0, Math.floor(product.sizeQuantities[size]));
  }
  return 5;
}

/**
 * Computes the effective unit price of a product after applying its discount ($ or %).
 */
export function getEffectiveProductPrice(
  product: Pick<ProductItem, 'price' | 'discountType' | 'discountValue'>
): {
  originalPrice: number;
  effectivePrice: number;
  hasDiscount: boolean;
  discountBadge: string;
} {
  const originalPrice = Math.max(0, Number(product.price) || 0);
  const discountType: DiscountType = product.discountType || 'none';
  const discountValue = Math.max(0, Number(product.discountValue) || 0);

  if (discountType === 'none' || discountValue <= 0) {
    return {
      originalPrice,
      effectivePrice: originalPrice,
      hasDiscount: false,
      discountBadge: '',
    };
  }

  if (discountType === 'percentage') {
    const pct = Math.min(99, discountValue);
    const effectivePrice = Math.max(1, Math.round(originalPrice * (1 - pct / 100)));
    return {
      originalPrice,
      effectivePrice,
      hasDiscount: effectivePrice < originalPrice,
      discountBadge: `Save ${pct}%`,
    };
  }

  // fixed dollar discount
  const effectivePrice = Math.max(1, Math.round(originalPrice - discountValue));
  return {
    originalPrice,
    effectivePrice,
    hasDiscount: effectivePrice < originalPrice,
    discountBadge: `Save $${discountValue.toLocaleString()}`,
  };
}

/**
 * Filters orders in AdminDashboard by customer name or order number.
 */
export function filterOrdersByQuery(orders: OrderItem[], searchQuery: string): OrderItem[] {
  const q = (searchQuery || '').trim().toLowerCase();
  if (!q) return orders;
  return orders.filter(
    (order) =>
      order.customerName.toLowerCase().includes(q) ||
      order.orderNumber.toLowerCase().includes(q)
  );
}

/**
 * Synchronizes all Full Set products in the catalog with their linked standalone products.
 * Whenever a standalone product's per-size (or per-color + per-size) stock changes,
 * any Full Set referencing that standalone product automatically reflects the updated stock.
 */
export function syncFullSetsWithCatalog(products: ProductItem[]): ProductItem[] {
  const byId = new Map<string, ProductItem>();
  const byName = new Map<string, ProductItem>();
  for (const p of products) {
    byId.set(p.id, p);
    byName.set(p.name.trim().toLowerCase(), p);
  }

  return products.map((prod) => {
    if (!prod.isFullSet || !Array.isArray(prod.setItems) || prod.setItems.length === 0) {
      return prod;
    }

    const syncedSetItems = prod.setItems.map((subItem) => {
      const linked =
        (subItem.productId ? byId.get(subItem.productId) : undefined) ||
        (subItem.productName ? byName.get(subItem.productName.trim().toLowerCase()) : undefined);

      if (linked && linked.id !== prod.id) {
        // If linked standalone product has multiple color variants, sync the allowed colors (defaulting to first color)
        if (
          linked.hasColors &&
          Array.isArray(linked.colorVariants) &&
          linked.colorVariants.length > 0
        ) {
          const requestedColors = Array.isArray(subItem.selectedColors)
            ? subItem.selectedColors.map((c) => c.trim()).filter(Boolean)
            : [];
          const matchedVariants =
            requestedColors.length > 0
              ? linked.colorVariants.filter((v) =>
                  requestedColors.some(
                    (rc) => rc.toLowerCase() === v.colorName.trim().toLowerCase()
                  )
                )
              : [linked.colorVariants[0]];
          const finalVariants =
            matchedVariants.length > 0 ? matchedVariants : [linked.colorVariants[0]];

          const syncedVariants: ProductColorVariant[] = finalVariants.map((v) => ({
            ...v,
            sizes: [...v.sizes],
            sizeQuantities: buildSizeQuantitiesMap(v.sizes, v.sizeQuantities),
          }));

          const primaryVar = syncedVariants[0];
          const syncedPieceCode =
            cleanGarmentCode(primaryVar.garmentCode) ||
            cleanGarmentCode(linked.garmentCode) ||
            cleanGarmentCode(subItem.garmentCode) ||
            undefined;
          return {
            ...subItem,
            productId: linked.id,
            productName: subItem.productName || linked.name,
            garmentCode: syncedPieceCode,
            sizeType: primaryVar.sizeType,
            sizes: [...primaryVar.sizes],
            sizeQuantities: buildSizeQuantitiesMap(
              primaryVar.sizes,
              primaryVar.sizeQuantities
            ),
            selectedColors: syncedVariants.map((v) => v.colorName),
            colorVariants: syncedVariants,
          };
        }

        const sizes =
          Array.isArray(subItem.sizes) && subItem.sizes.length > 0
            ? subItem.sizes
            : linked.sizes && linked.sizes.length > 0
            ? [...linked.sizes]
            : getDefaultSizesForType(subItem.sizeType || 'letter');

        const baseQuantities = buildSizeQuantitiesMap(sizes, subItem.sizeQuantities);
        const syncedQuantities: Record<string, number> = {};
        for (const sz of sizes) {
          if (linked.sizes.includes(sz)) {
            syncedQuantities[sz] = getSizeQuantity(linked, sz);
          } else {
            syncedQuantities[sz] = baseQuantities[sz] ?? 5;
          }
        }
        const syncedPieceCode =
          cleanGarmentCode(linked.garmentCode) ||
          cleanGarmentCode(subItem.garmentCode) ||
          undefined;
        return {
          ...subItem,
          productId: linked.id,
          productName: subItem.productName || linked.name,
          garmentCode: syncedPieceCode,
          sizeType: linked.sizeType || subItem.sizeType,
          sizes,
          sizeQuantities: syncedQuantities,
          selectedColors: [],
          colorVariants: [],
        };
      }

      const sizes =
        Array.isArray(subItem.sizes) && subItem.sizes.length > 0
          ? subItem.sizes
          : getDefaultSizesForType(subItem.sizeType || 'letter');
      const baseQuantities = buildSizeQuantitiesMap(sizes, subItem.sizeQuantities);

      return {
        ...subItem,
        sizes,
        sizeQuantities: baseQuantities,
      };
    });

    const primaryPiece = syncedSetItems[0];
    const pieceTotals = syncedSetItems.map((si) => {
      if (Array.isArray(si.colorVariants) && si.colorVariants.length > 0) {
        return syncProductFromColorVariants(si.colorVariants, si.sizeType).quantity;
      }
      return sumSizeQuantities(si.sizes, si.sizeQuantities);
    });
    const minPieceTotal =
      pieceTotals.length > 0 ? Math.min(...pieceTotals) : 0;
    const allPiecesHaveStock = pieceTotals.every((t) => t > 0);

    const combinedSetGarmentCodes = syncedSetItems
      .map((si) => cleanGarmentCode(si.garmentCode))
      .filter(Boolean);
    const resolvedFullSetGarmentCode =
      combinedSetGarmentCodes.length > 0
        ? combinedSetGarmentCodes.join('+')
        : cleanGarmentCode(prod.garmentCode) || undefined;

    return {
      ...prod,
      isFullSet: true,
      garmentCode: resolvedFullSetGarmentCode,
      setItems: syncedSetItems,
      sizeType: primaryPiece?.sizeType || prod.sizeType,
      sizes: primaryPiece?.sizes || prod.sizes,
      sizeQuantities: primaryPiece?.sizeQuantities || prod.sizeQuantities,
      quantity: minPieceTotal,
      inStock: allPiecesHaveStock,
    };
  });
}

/**
 * Strips any duplicate leading "Ref." or "Ref:" prefix and trims whitespace from a garment code.
 */
export function cleanGarmentCode(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/^(?:ref\.?\s*:?\s*)+/i, '')
    .trim()
    .toUpperCase();
}

/**
 * Formats a garment code (single like "W-2278" or combined Full Set like "F-2364+W-5637")
 * into the canonical display reference string: "Ref. W-2278" or "Ref. F-2364+W-5637".
 * Returns empty string if no garment code is present.
 */
export function formatGarmentCodeRef(raw?: string | null): string {
  const cleaned = cleanGarmentCode(raw);
  if (!cleaned) return '';
  return `Ref. ${cleaned}`;
}

/**
 * Resolves the garment code for a single Full Set piece, checking the active color variant first,
 * then the piece's own garmentCode, then the linked standalone product's garmentCode.
 */
export function resolvePieceGarmentCode(
  subItem: FullSetSubItem,
  selectedColor?: string,
  allProducts?: ProductItem[]
): string | undefined {
  const linkedProd =
    allProducts && subItem.productId
      ? allProducts.find((p) => p.id === subItem.productId)
      : undefined;

  const targetColor = (
    selectedColor ||
    subItem.selectedColors?.[0] ||
    subItem.colorVariants?.[0]?.colorName ||
    ''
  )
    .trim()
    .toLowerCase();

  if (targetColor) {
    const matchedSubVar = subItem.colorVariants?.find(
      (v) => v.colorName.trim().toLowerCase() === targetColor
    );
    if (matchedSubVar && cleanGarmentCode(matchedSubVar.garmentCode)) {
      return cleanGarmentCode(matchedSubVar.garmentCode);
    }
    const matchedLinkedVar = linkedProd?.colorVariants?.find(
      (v) => v.colorName.trim().toLowerCase() === targetColor
    );
    if (matchedLinkedVar && cleanGarmentCode(matchedLinkedVar.garmentCode)) {
      return cleanGarmentCode(matchedLinkedVar.garmentCode);
    }
  }

  const fromSub = cleanGarmentCode(subItem.garmentCode);
  if (fromSub) return fromSub;

  const fromLinked = cleanGarmentCode(linkedProd?.garmentCode);
  if (fromLinked) return fromLinked;

  return undefined;
}

/**
 * Resolves the effective garment code for a product (single product, color variant override,
 * or Full Set combined reference like "2034+6534" or "F-2364+W-5637").
 */
export function resolveProductGarmentCode(
  product: Pick<
    ProductItem,
    'garmentCode' | 'hasColors' | 'colorVariants' | 'isFullSet' | 'setItems'
  >,
  options?: {
    selectedColor?: string;
    selectedSetColors?: Record<number, string>;
    selectedSetSizes?: SelectedSetPieceSize[];
    allProducts?: ProductItem[];
  }
): string | undefined {
  if (
    product.isFullSet &&
    Array.isArray(product.setItems) &&
    product.setItems.length > 0
  ) {
    const pieceCodes: string[] = [];
    product.setItems.forEach((subItem, idx) => {
      const explicitPieceSelection = options?.selectedSetSizes?.[idx];
      if (
        explicitPieceSelection &&
        cleanGarmentCode(explicitPieceSelection.garmentCode)
      ) {
        pieceCodes.push(cleanGarmentCode(explicitPieceSelection.garmentCode));
        return;
      }
      const chosenColor =
        explicitPieceSelection?.selectedColor ||
        options?.selectedSetColors?.[idx] ||
        subItem.selectedColors?.[0] ||
        subItem.colorVariants?.[0]?.colorName;
      const resolvedPiece = resolvePieceGarmentCode(
        subItem,
        chosenColor,
        options?.allProducts
      );
      if (resolvedPiece) {
        pieceCodes.push(resolvedPiece);
      }
    });

    if (pieceCodes.length > 0) {
      return pieceCodes.join('+');
    }
    const fallbackSetCode = cleanGarmentCode(product.garmentCode);
    return fallbackSetCode || undefined;
  }

  if (
    product.hasColors &&
    Array.isArray(product.colorVariants) &&
    product.colorVariants.length > 0
  ) {
    const targetColor = (
      options?.selectedColor ||
      product.colorVariants[0]?.colorName ||
      ''
    )
      .trim()
      .toLowerCase();
    const matchedVariant = product.colorVariants.find(
      (v) => v.colorName.trim().toLowerCase() === targetColor
    );
    if (matchedVariant && cleanGarmentCode(matchedVariant.garmentCode)) {
      return cleanGarmentCode(matchedVariant.garmentCode);
    }
  }

  const baseCode = cleanGarmentCode(product.garmentCode);
  return baseCode || undefined;
}

/**
 * Decrements per-size (and per-color when hasColors is true, or both linked pieces when isFullSet is true)
 * product stock quantities when an order transitions to 'accepted'.
 * Simultaneously decreases stock in standalone products and any Full Set referencing them.
 */
export function decrementStockForAcceptedOrder(
  products: ProductItem[],
  order: OrderItem
): ProductItem[] {
  const rawLines =
    Array.isArray(order.orderedItems) && order.orderedItems.length > 0
      ? order.orderedItems
      : [
          {
            productId: '',
            productName: order.primaryProductName,
            selectedSize: order.primaryProductSize,
            quantity: Math.max(1, order.itemsCount || 1),
          },
        ];

  // Expand Full Set orders into component piece deductions so standalone products are simultaneously decremented
  interface ExpandedDeduction {
    productId: string;
    productName: string;
    selectedColor?: string;
    selectedSize?: string;
    quantity: number;
    parentFullSetId?: string;
    setPieceIndex?: number;
  }

  const deductions: ExpandedDeduction[] = [];

  for (const line of rawLines) {
    const qtyBought = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const matchedProd = products.find(
      (p) =>
        (line.productId && p.id === line.productId) ||
        (line.productName &&
          p.name.trim().toLowerCase() === line.productName.trim().toLowerCase())
    );

    if (Array.isArray(line.selectedSetSizes) && line.selectedSetSizes.length > 0) {
      for (let i = 0; i < line.selectedSetSizes.length; i++) {
        const piece = line.selectedSetSizes[i];
        const fallbackSub = matchedProd?.setItems?.[i];
        const resolvedColor =
          piece.selectedColor ||
          fallbackSub?.selectedColors?.[0] ||
          fallbackSub?.colorVariants?.[0]?.colorName;
        deductions.push({
          productId: piece.productId,
          productName: piece.productName,
          selectedColor: resolvedColor,
          selectedSize: piece.selectedSize,
          quantity: qtyBought,
          parentFullSetId: matchedProd?.id || line.productId,
          setPieceIndex: i,
        });
      }
    } else if (
      matchedProd?.isFullSet &&
      Array.isArray(matchedProd.setItems) &&
      matchedProd.setItems.length > 0
    ) {
      // Parse "Size1 / Size2" fallback if selectedSetSizes wasn't explicitly populated
      const parts = (line.selectedSize || order.primaryProductSize || '')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      matchedProd.setItems.forEach((sub, idx) => {
        const chosenSz = parts[idx] || sub.sizes[0] || '';
        const defaultColor =
          sub.selectedColors?.[0] || sub.colorVariants?.[0]?.colorName;
        deductions.push({
          productId: sub.productId,
          productName: sub.productName,
          selectedColor: defaultColor,
          selectedSize: chosenSz,
          quantity: qtyBought,
          parentFullSetId: matchedProd.id,
          setPieceIndex: idx,
        });
      });
    } else {
      deductions.push({
        productId: line.productId,
        productName: line.productName,
        selectedColor: line.selectedColor,
        selectedSize: line.selectedSize,
        quantity: qtyBought,
      });
    }
  }

  const afterDirectDeductions = products.map((prod) => {
    // Handle Full Set internal setItems deduction first (for unlinked or direct set pieces)
    let updatedSetItems = prod.setItems;
    if (prod.isFullSet && Array.isArray(prod.setItems) && prod.setItems.length > 0) {
      updatedSetItems = prod.setItems.map((subItem, idx) => {
        const pieceDeductions = deductions.filter(
          (d) =>
            (d.parentFullSetId === prod.id && d.setPieceIndex === idx) ||
            (d.productId && d.productId === subItem.productId) ||
            (d.productName &&
              subItem.productName &&
              d.productName.trim().toLowerCase() ===
                subItem.productName.trim().toLowerCase())
        );
        if (pieceDeductions.length === 0) return subItem;

        const nextMap = buildSizeQuantitiesMap(subItem.sizes, subItem.sizeQuantities);
        for (const pd of pieceDeductions) {
          const targetSz =
            pd.selectedSize && subItem.sizes.includes(pd.selectedSize)
              ? pd.selectedSize
              : subItem.sizes[0];
          if (targetSz && targetSz in nextMap) {
            nextMap[targetSz] = Math.max(0, nextMap[targetSz] - pd.quantity);
          }
        }
        return {
          ...subItem,
          sizeQuantities: nextMap,
        };
      });
    }

    const matchingLines = deductions.filter((d) => {
      const idMatches = d.productId && d.productId === prod.id;
      const nameMatches =
        !idMatches &&
        d.productName &&
        d.productName.trim().toLowerCase() === prod.name.trim().toLowerCase();
      return Boolean(idMatches || nameMatches);
    });

    if (matchingLines.length === 0) {
      return updatedSetItems !== prod.setItems
        ? { ...prod, setItems: updatedSetItems }
        : prod;
    }

    // Multi-color product stock deduction
    if (prod.hasColors && Array.isArray(prod.colorVariants) && prod.colorVariants.length > 0) {
      const nextVariants: ProductColorVariant[] = prod.colorVariants.map((v) => ({
        ...v,
        sizes: [...v.sizes],
        sizeQuantities: buildSizeQuantitiesMap(v.sizes, v.sizeQuantities),
      }));

      for (const line of matchingLines) {
        const qtyBought = Math.max(1, Math.floor(Number(line.quantity) || 1));
        const targetVariant =
          (line.selectedColor
            ? nextVariants.find(
                (v) =>
                  v.colorName.trim().toLowerCase() ===
                  line.selectedColor!.trim().toLowerCase()
              )
            : undefined) || nextVariants[0];

        if (targetVariant) {
          const matchedVariantSize = line.selectedSize
            ? targetVariant.sizes.find(
                (s) =>
                  s.trim().toLowerCase() ===
                  line.selectedSize!.trim().toLowerCase()
              )
            : undefined;
          const matchedPrimarySize = order.primaryProductSize
            ? targetVariant.sizes.find(
                (s) =>
                  s.trim().toLowerCase() ===
                  order.primaryProductSize!.trim().toLowerCase()
              )
            : undefined;
          const targetSize =
            (matchedVariantSize ||
              matchedPrimarySize ||
              targetVariant.sizes.find(
                (s) => (targetVariant.sizeQuantities[s] ?? 5) > 0
              ) ||
              targetVariant.sizes[0]) ||
            '';

          if (targetSize && targetSize in targetVariant.sizeQuantities) {
            targetVariant.sizeQuantities[targetSize] = Math.max(
              0,
              targetVariant.sizeQuantities[targetSize] - qtyBought
            );
          }
        }
      }

      const synced = syncProductFromColorVariants(nextVariants, prod.sizeType);
      return {
        ...prod,
        setItems: updatedSetItems,
        colorVariants: nextVariants,
        sizes: synced.sizes,
        sizeQuantities: synced.sizeQuantities,
        quantity: synced.quantity,
        inStock: synced.inStock,
      };
    }

    // Standard single-color product stock deduction
    const currentSizeMap = buildSizeQuantitiesMap(prod.sizes, prod.sizeQuantities);
    for (const line of matchingLines) {
      const qtyBought = Math.max(1, Math.floor(Number(line.quantity) || 1));
      const matchedLineSize = line.selectedSize
        ? prod.sizes.find(
            (s) =>
              s.trim().toLowerCase() ===
              line.selectedSize!.trim().toLowerCase()
          )
        : undefined;
      const matchedOrderSize = order.primaryProductSize
        ? prod.sizes.find(
            (s) =>
              s.trim().toLowerCase() ===
              order.primaryProductSize!.trim().toLowerCase()
          )
        : undefined;
      const targetSize =
        (matchedLineSize ||
          matchedOrderSize ||
          prod.sizes.find((s) => (currentSizeMap[s] ?? 5) > 0) ||
          prod.sizes[0]) ||
        '';

      if (targetSize && targetSize in currentSizeMap) {
        currentSizeMap[targetSize] = Math.max(0, currentSizeMap[targetSize] - qtyBought);
      }
    }

    const nextTotalQty = sumSizeQuantities(prod.sizes, currentSizeMap);
    return {
      ...prod,
      setItems: updatedSetItems,
      sizeQuantities: currentSizeMap,
      quantity: nextTotalQty,
      inStock: nextTotalQty > 0,
    };
  });

  return syncFullSetsWithCatalog(afterDirectDeductions);
}

/**
 * Restores per-size (and per-color when hasColors is true, or all linked pieces when isFullSet is true)
 * product stock quantities when an already-'accepted' order is canceled ('rejected' / 'pending') or deleted.
 * Simultaneously restores stock in standalone products and any Full Set referencing them.
 */
export function restoreStockForCanceledOrder(
  products: ProductItem[],
  order: OrderItem
): ProductItem[] {
  const rawLines =
    Array.isArray(order.orderedItems) && order.orderedItems.length > 0
      ? order.orderedItems
      : [
          {
            productId: '',
            productName: order.primaryProductName,
            selectedSize: order.primaryProductSize,
            quantity: Math.max(1, order.itemsCount || 1),
          },
        ];

  interface ExpandedRestoration {
    productId: string;
    productName: string;
    selectedColor?: string;
    selectedSize?: string;
    quantity: number;
    parentFullSetId?: string;
    setPieceIndex?: number;
  }

  const restorations: ExpandedRestoration[] = [];

  for (const line of rawLines) {
    const qtyRestored = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const matchedProd = products.find(
      (p) =>
        (line.productId && p.id === line.productId) ||
        (line.productName &&
          p.name.trim().toLowerCase() === line.productName.trim().toLowerCase())
    );

    if (Array.isArray(line.selectedSetSizes) && line.selectedSetSizes.length > 0) {
      for (let i = 0; i < line.selectedSetSizes.length; i++) {
        const piece = line.selectedSetSizes[i];
        const fallbackSub = matchedProd?.setItems?.[i];
        const resolvedColor =
          piece.selectedColor ||
          fallbackSub?.selectedColors?.[0] ||
          fallbackSub?.colorVariants?.[0]?.colorName;
        restorations.push({
          productId: piece.productId,
          productName: piece.productName,
          selectedColor: resolvedColor,
          selectedSize: piece.selectedSize,
          quantity: qtyRestored,
          parentFullSetId: matchedProd?.id || line.productId,
          setPieceIndex: i,
        });
      }
    } else if (
      matchedProd?.isFullSet &&
      Array.isArray(matchedProd.setItems) &&
      matchedProd.setItems.length > 0
    ) {
      const parts = (line.selectedSize || order.primaryProductSize || '')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      matchedProd.setItems.forEach((sub, idx) => {
        const chosenSz = parts[idx] || sub.sizes[0] || '';
        const defaultColor =
          sub.selectedColors?.[0] || sub.colorVariants?.[0]?.colorName;
        restorations.push({
          productId: sub.productId,
          productName: sub.productName,
          selectedColor: defaultColor,
          selectedSize: chosenSz,
          quantity: qtyRestored,
          parentFullSetId: matchedProd.id,
          setPieceIndex: idx,
        });
      });
    } else {
      restorations.push({
        productId: line.productId,
        productName: line.productName,
        selectedColor: line.selectedColor,
        selectedSize: line.selectedSize,
        quantity: qtyRestored,
      });
    }
  }

  const afterDirectRestorations = products.map((prod) => {
    let updatedSetItems = prod.setItems;
    if (prod.isFullSet && Array.isArray(prod.setItems) && prod.setItems.length > 0) {
      updatedSetItems = prod.setItems.map((subItem, idx) => {
        const pieceRestorations = restorations.filter(
          (r) =>
            (r.parentFullSetId === prod.id && r.setPieceIndex === idx) ||
            (r.productId && r.productId === subItem.productId) ||
            (r.productName &&
              subItem.productName &&
              r.productName.trim().toLowerCase() ===
                subItem.productName.trim().toLowerCase())
        );
        if (pieceRestorations.length === 0) return subItem;

        const nextMap = buildSizeQuantitiesMap(subItem.sizes, subItem.sizeQuantities);
        for (const pr of pieceRestorations) {
          const targetSz =
            pr.selectedSize && subItem.sizes.includes(pr.selectedSize)
              ? pr.selectedSize
              : subItem.sizes[0];
          if (targetSz && targetSz in nextMap) {
            nextMap[targetSz] = Math.max(0, nextMap[targetSz] + pr.quantity);
          }
        }
        return {
          ...subItem,
          sizeQuantities: nextMap,
        };
      });
    }

    const matchingLines = restorations.filter((r) => {
      const idMatches = r.productId && r.productId === prod.id;
      const nameMatches =
        !idMatches &&
        r.productName &&
        r.productName.trim().toLowerCase() === prod.name.trim().toLowerCase();
      return Boolean(idMatches || nameMatches);
    });

    if (matchingLines.length === 0) {
      return updatedSetItems !== prod.setItems
        ? { ...prod, setItems: updatedSetItems }
        : prod;
    }

    // Multi-color product stock restoration
    if (prod.hasColors && Array.isArray(prod.colorVariants) && prod.colorVariants.length > 0) {
      const nextVariants: ProductColorVariant[] = prod.colorVariants.map((v) => ({
        ...v,
        sizes: [...v.sizes],
        sizeQuantities: buildSizeQuantitiesMap(v.sizes, v.sizeQuantities),
      }));

      for (const line of matchingLines) {
        const qtyRestored = Math.max(1, Math.floor(Number(line.quantity) || 1));
        const targetVariant =
          (line.selectedColor
            ? nextVariants.find(
                (v) =>
                  v.colorName.trim().toLowerCase() ===
                  line.selectedColor!.trim().toLowerCase()
              )
            : undefined) || nextVariants[0];

        if (targetVariant) {
          const matchedVariantSize = line.selectedSize
            ? targetVariant.sizes.find(
                (s) =>
                  s.trim().toLowerCase() ===
                  line.selectedSize!.trim().toLowerCase()
              )
            : undefined;
          const matchedPrimarySize = order.primaryProductSize
            ? targetVariant.sizes.find(
                (s) =>
                  s.trim().toLowerCase() ===
                  order.primaryProductSize!.trim().toLowerCase()
              )
            : undefined;
          const targetSize =
            (matchedVariantSize ||
              matchedPrimarySize ||
              targetVariant.sizes[0]) ||
            '';

          if (targetSize && targetSize in targetVariant.sizeQuantities) {
            targetVariant.sizeQuantities[targetSize] = Math.max(
              0,
              targetVariant.sizeQuantities[targetSize] + qtyRestored
            );
          }
        }
      }

      const synced = syncProductFromColorVariants(nextVariants, prod.sizeType);
      return {
        ...prod,
        setItems: updatedSetItems,
        colorVariants: nextVariants,
        sizes: synced.sizes,
        sizeQuantities: synced.sizeQuantities,
        quantity: synced.quantity,
        inStock: synced.inStock,
      };
    }

    // Standard single-color product stock restoration
    const currentSizeMap = buildSizeQuantitiesMap(prod.sizes, prod.sizeQuantities);
    for (const line of matchingLines) {
      const qtyRestored = Math.max(1, Math.floor(Number(line.quantity) || 1));
      const matchedLineSize = line.selectedSize
        ? prod.sizes.find(
            (s) =>
              s.trim().toLowerCase() ===
              line.selectedSize!.trim().toLowerCase()
          )
        : undefined;
      const matchedOrderSize = order.primaryProductSize
        ? prod.sizes.find(
            (s) =>
              s.trim().toLowerCase() ===
              order.primaryProductSize!.trim().toLowerCase()
          )
        : undefined;
      const targetSize =
        (matchedLineSize || matchedOrderSize || prod.sizes[0]) || '';

      if (targetSize && targetSize in currentSizeMap) {
        currentSizeMap[targetSize] = Math.max(0, currentSizeMap[targetSize] + qtyRestored);
      }
    }

    const nextTotalQty = sumSizeQuantities(prod.sizes, currentSizeMap);
    return {
      ...prod,
      setItems: updatedSetItems,
      sizeQuantities: currentSizeMap,
      quantity: nextTotalQty,
      inStock: nextTotalQty > 0,
    };
  });

  return syncFullSetsWithCatalog(afterDirectRestorations);
}

/**
 * Merges prebuilt materials with custom admin-added materials without duplicates.
 */
export function mergeMaterialsList(customMaterials: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const mat of [...PREBUILT_MATERIALS, ...customMaterials]) {
    const clean = mat.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}

/**
 * Checks whether an email address is authorized for Admin Mode.
 */
export function isAuthorizedAdminEmail(
  email: string | null | undefined,
  extraAdmins: Pick<AdminRecord, 'email'>[] = []
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(normalized)) {
    return true;
  }
  return extraAdmins.some((admin) => admin.email.trim().toLowerCase() === normalized);
}

/**
 * Calculates delivery fee (using live shippingConfig or defaults), promo code discount, and total order price.
 */
export function calculateOrderTotals(
  items: { price: number; quantity: number }[],
  deliveryMethod: DeliveryMethod,
  appliedPromo?: Pick<PromoCodeItem, 'discountType' | 'discountValue' | 'active'> | null,
  shippingConfig?: {
    shippingFeeEnabled?: boolean;
    standardDeliveryFee?: number;
    freeShippingThreshold?: number;
  } | null
): {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalPrice: number;
  itemsCount: number;
} {
  const subtotal = items.reduce((acc, item) => {
    const price = Math.max(0, Number(item.price) || 0);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    return acc + price * qty;
  }, 0);

  const itemsCount = items.reduce(
    (acc, item) => acc + Math.max(1, Math.floor(Number(item.quantity) || 1)),
    0
  );

  let discountAmount = 0;
  if (appliedPromo && appliedPromo.active && subtotal > 0) {
    const val = Math.max(0, Number(appliedPromo.discountValue) || 0);
    if (appliedPromo.discountType === 'percentage') {
      const pct = Math.min(100, val);
      discountAmount = Math.round(subtotal * (pct / 100));
    } else if (appliedPromo.discountType === 'fixed') {
      discountAmount = Math.min(subtotal, Math.round(val));
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const isShippingFeeEnabled =
    typeof shippingConfig?.shippingFeeEnabled === 'boolean'
      ? shippingConfig.shippingFeeEnabled
      : true;
  const activeDeliveryFee =
    typeof shippingConfig?.standardDeliveryFee === 'number' &&
    Number.isFinite(shippingConfig.standardDeliveryFee) &&
    shippingConfig.standardDeliveryFee >= 0
      ? Math.round(shippingConfig.standardDeliveryFee * 100) / 100
      : 6;
  const activeFreeThreshold =
    typeof shippingConfig?.freeShippingThreshold === 'number' &&
    Number.isFinite(shippingConfig.freeShippingThreshold) &&
    shippingConfig.freeShippingThreshold >= 0
      ? Math.round(shippingConfig.freeShippingThreshold * 100) / 100
      : 80;

  let deliveryFee = 0;
  if (deliveryMethod === 'Standard Delivery') {
    if (!isShippingFeeEnabled || subtotal === 0) {
      deliveryFee = 0;
    } else if (
      activeFreeThreshold > 0 &&
      discountedSubtotal >= activeFreeThreshold
    ) {
      deliveryFee = 0;
    } else {
      deliveryFee = activeDeliveryFee;
    }
  } else {
    deliveryFee = 0; // SAMO Showroom Pickup (Free / Reserved for 1 Day)
  }

  return {
    subtotal,
    discountAmount,
    deliveryFee,
    totalPrice: discountedSubtotal + deliveryFee,
    itemsCount,
  };
}

/**
 * Checks whether a customer email has already used a promo code >= maxUsesPerEmail times
 * across existing non-rejected orders.
 */
export function hasEmailReachedPromoLimit(
  promo: Pick<PromoCodeItem, 'code' | 'maxUsesPerEmail'>,
  customerEmail: string | null | undefined,
  orders: Pick<OrderItem, 'customerEmail' | 'promoCode' | 'status'>[] = []
): boolean {
  const maxUses = Math.floor(Number(promo.maxUsesPerEmail) || 0);
  if (maxUses <= 0) return false;
  const cleanEmail = (customerEmail || '').trim().toLowerCase();
  const cleanCode = (promo.code || '').trim().toUpperCase();
  if (!cleanEmail || !cleanCode) return false;

  const usedCount = orders.filter((order) => {
    if (!order || order.status === 'rejected') return false;
    const orderEmail = (order.customerEmail || '').trim().toLowerCase();
    const orderPromo = (order.promoCode || '').trim().toUpperCase();
    return orderEmail === cleanEmail && orderPromo === cleanCode;
  }).length;

  return usedCount >= maxUses;
}

/**
 * Selects parallel similar products for the Shopping Bag drawer from the same
 * department and category as the items in the customer's bag, excluding items already in the cart.
 */
export function getComplementaryUpsellProducts(
  cartItems: { product: ProductItem }[],
  allProducts: ProductItem[],
  limit = 1
): ProductItem[] {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return [];
  const inCartIds = new Set(cartItems.map((ci) => ci.product.id));
  const anchor = cartItems[cartItems.length - 1].product;
  const anchorCatLower = anchor.category.trim().toLowerCase();
  const inCartCategories = new Set(
    cartItems.map((ci) => ci.product.category.trim().toLowerCase())
  );
  const anchorMaterials = new Set(
    (anchor.materials || []).map((m) => m.trim().toLowerCase())
  );

  const availablePool = allProducts.filter((p) => {
    if (inCartIds.has(p.id)) return false;
    const totalStock = sumSizeQuantities(p.sizes, p.sizeQuantities);
    return p.inStock && totalStock > 0 && p.department === anchor.department;
  });

  const scored = availablePool.map((candidate) => {
    let score = 0;
    const candidateCatLower = candidate.category.trim().toLowerCase();
    const sameCategory = candidateCatLower === anchorCatLower;
    const matchesAnyCartCategory = inCartCategories.has(candidateCatLower);
    const sameStyle =
      candidate.style.trim().toLowerCase() === anchor.style.trim().toLowerCase();
    const sharesMaterial = (candidate.materials || []).some((m) =>
      anchorMaterials.has(m.trim().toLowerCase())
    );

    // Parallel recommendation: prioritize the exact same category as the item being purchased
    if (sameCategory) {
      score += 12;
    } else if (matchesAnyCartCategory) {
      score += 8;
    }
    if (sameStyle) score += 5;
    if (sharesMaterial) score += 3;

    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.candidate);
}

/**
 * Normalizes legacy Kids category names ('Baby', 'Junior', 'Teen', 'Full Set')
 * to the canonical SAMO Kids categories:
 * - 'MINIS 1 To 5'
 * - 'CHILDREN 6+'
 * - 'Teen 13+'
 */
export function normalizeKidsCategoryName(rawCategory: string): string {
  const clean = (rawCategory || '').trim();
  const lower = clean.toLowerCase();
  if (lower === 'baby' || lower === 'minis' || lower === 'minis 1 to 5') {
    return 'MINIS 1 To 5';
  }
  if (
    lower === 'junior' ||
    lower === 'children' ||
    lower === 'children 6+' ||
    lower === 'full set'
  ) {
    return 'CHILDREN 6+';
  }
  if (lower === 'teen' || lower === 'teen 13+') {
    return 'Teen 13+';
  }
  return clean;
}

/**
 * Filters products by department, category, and search query.
 */
export function filterCatalogProducts(
  products: ProductItem[],
  options: {
    department?: Department | 'all';
    category?: string | 'all';
    searchQuery?: string;
    style?: string | 'all';
  }
): ProductItem[] {
  const dept = options.department || 'all';
  const rawCat = (options.category || 'all').trim();
  const cat =
    dept === 'kids' && rawCat.toLowerCase() !== 'all'
      ? normalizeKidsCategoryName(rawCat).toLowerCase()
      : rawCat.toLowerCase();
  const style = (options.style || 'all').trim().toLowerCase();
  const q = (options.searchQuery || '').trim().toLowerCase();

  return products.filter((item) => {
    // Exclude any legacy Kids Full Set items since Full Set is removed from Kids
    if (
      item.department === 'kids' &&
      (item.isFullSet || item.category.trim().toLowerCase() === 'full set')
    ) {
      return false;
    }
    if (dept !== 'all' && item.department !== dept) {
      return false;
    }
    const itemCatNormalized =
      item.department === 'kids'
        ? normalizeKidsCategoryName(item.category).toLowerCase()
        : item.category.trim().toLowerCase();
    const matchesCategory =
      cat === 'all' ||
      itemCatNormalized === cat ||
      ((cat === 'jacket' || cat === 'jackets') &&
        (itemCatNormalized === 'jacket' || itemCatNormalized === 'jackets')) ||
      (cat === 'full set' && item.department === 'women' && Boolean(item.isFullSet));
    if (!matchesCategory) {
      return false;
    }
    if (style !== 'all' && item.style.trim().toLowerCase() !== style) {
      return false;
    }
    if (q) {
      const colorNames = (item.colorVariants || []).map((v) => v.colorName);
      const colorGarmentCodes = (item.colorVariants || [])
        .map((v) => v.garmentCode || '')
        .filter(Boolean);
      const haystack = [
        item.name,
        item.garmentCode || '',
        item.category,
        itemCatNormalized,
        item.department,
        item.style,
        item.description,
        ...(item.materials || []),
        ...item.sizes,
        ...colorNames,
        ...colorGarmentCodes,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Returns products marked for the dedicated New Arrivals page.
 */
export function filterNewArrivalProducts(products: ProductItem[]): ProductItem[] {
  return products.filter(
    (p) =>
      (p.isNewArrival !== undefined
        ? Boolean(p.isNewArrival)
        : Boolean(p.featured)) &&
      !(
        p.department === 'kids' &&
        (p.isFullSet || p.category.trim().toLowerCase() === 'full set')
      )
  );
}

/**
 * Returns all Belts and Bags items for the dedicated Gifts page.
 */
export function filterGiftsProducts(products: ProductItem[]): ProductItem[] {
  return products.filter((p) => {
    const cat = p.category.trim().toLowerCase();
    return cat === 'bags' || cat === 'bag' || cat === 'belts' || cat === 'belt';
  });
}

/**
 * Validates and sorts categories for a given department by sortOrder (supporting integers and decimals like 1.5, 2.5).
 * For 'kids', normalizes legacy names to 'MINIS 1 To 5', 'CHILDREN 6+', 'Teen 13+'
 * and strictly removes 'Full Set' from the Kids department only.
 */
export function getCategoriesByDepartment(
  categories: CategoryItem[],
  department: Department
): CategoryItem[] {
  const seen = new Set<string>();
  const rawDeptList: { item: CategoryItem; initialOrder: number }[] = [];

  for (const c of categories) {
    if (c.department !== department) continue;
    if (
      department === 'kids' &&
      c.name.trim().toLowerCase() === 'full set'
    ) {
      continue;
    }
    const normalizedName =
      department === 'kids' ? normalizeKidsCategoryName(c.name) : c.name.trim();
    const key = normalizedName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      const fallbackOrder = rawDeptList.length + 1;
      const numericOrder =
        typeof c.sortOrder === 'number' && Number.isFinite(c.sortOrder)
          ? c.sortOrder
          : fallbackOrder;
      rawDeptList.push({
        item: {
          ...c,
          name: normalizedName,
          slug: createSafeSlug(normalizedName),
          sortOrder: numericOrder,
          active: c.active !== false,
        },
        initialOrder: fallbackOrder,
      });
    }
  }

  rawDeptList.sort((a, b) => {
    const orderA = a.item.sortOrder ?? a.initialOrder;
    const orderB = b.item.sortOrder ?? b.initialOrder;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.initialOrder - b.initialOrder;
  });

  return rawDeptList.map((entry) => entry.item);
}

/**
 * Toggles a product's inStock state from the Admin Dashboard toggle switch.
 * When toggled OFF (false), marks inStock: false so the product appears Out of Stock on the storefront.
 * When toggled ON (true), marks inStock: true and restores default 5 per size if all sizes were at 0.
 */
export function toggleProductInStockState(
  product: ProductItem,
  nextInStock: boolean
): ProductItem {
  if (!nextInStock) {
    return {
      ...product,
      inStock: false,
    };
  }

  // Toggling ON: ensure at least some stock exists if all sizes were zeroed out
  if (
    product.hasColors &&
    Array.isArray(product.colorVariants) &&
    product.colorVariants.length > 0
  ) {
    const currentSynced = syncProductFromColorVariants(
      product.colorVariants,
      product.sizeType
    );
    if (currentSynced.quantity > 0) {
      return {
        ...product,
        inStock: true,
      };
    }
    const refilledVariants: ProductColorVariant[] = product.colorVariants.map(
      (v) => {
        const sizes = v.sizes.length > 0 ? v.sizes : ['M'];
        const sizeQuantities: Record<string, number> = {};
        for (const sz of sizes) {
          sizeQuantities[sz] = 5;
        }
        return {
          ...v,
          sizes,
          sizeQuantities,
        };
      }
    );
    const synced = syncProductFromColorVariants(
      refilledVariants,
      product.sizeType
    );
    return {
      ...product,
      colorVariants: refilledVariants,
      ...synced,
      inStock: true,
    };
  }

  const sizes = product.sizes.length > 0 ? product.sizes : ['M'];
  const currentTotal = sumSizeQuantities(sizes, product.sizeQuantities);
  if (currentTotal > 0) {
    return {
      ...product,
      inStock: true,
    };
  }

  const refilledMap: Record<string, number> = {};
  for (const sz of sizes) {
    refilledMap[sz] = 5;
  }
  const nextTotal = sumSizeQuantities(sizes, refilledMap);
  return {
    ...product,
    sizes,
    sizeQuantities: refilledMap,
    quantity: nextTotal,
    inStock: true,
  };
}

/**
 * Computes the canonical key for a category in-feed banner based on route/department and category name.
 */
export function getCategoryBannerKey(
  routeOrDept: RoutePath | Department,
  selectedCategory: string
): string {
  const cleanCat = (selectedCategory || 'all').trim();
  const lowerCat = cleanCat.toLowerCase();

  if (routeOrDept === '/new-arrivals') {
    return lowerCat === 'kids'
      ? 'collection:new-arrivals-kids'
      : 'collection:new-arrivals';
  }
  if (routeOrDept === '/gifts') {
    return 'collection:gifts';
  }

  const dept: Department =
    routeOrDept === '/kids' || routeOrDept === 'kids' ? 'kids' : 'women';

  if (lowerCat === 'all' || !cleanCat) {
    return `${dept}:all`;
  }

  const normalizedName =
    dept === 'kids' ? normalizeKidsCategoryName(cleanCat) : cleanCat;
  const slug = createSafeSlug(normalizedName);
  if (dept === 'women' && slug === 'jackets') {
    return 'women:jacket';
  }
  return `${dept}:${slug}`;
}

const DEFAULT_CATEGORY_STUDIO_IMAGES: Record<string, string> = {
  'women:all': 'studio://women-jacket-black-leather-biker',
  'women:jacket': 'studio://women-jacket-burgundy-leather-biker',
  'women:trousers': 'studio://women-trousers-wide-leather',
  'women:pants': 'studio://women-pants-suede-flare',
  'women:skirts': 'studio://women-skirts-pleated-leather',
  'women:denim': 'studio://women-denim-raw-indigo',
  'women:tops': 'studio://women-tops-silk-drape',
  'women:full-set': 'studio://women-fullset-monolith',
  'women:trench-coat': 'studio://women-trench-suede-coat',
  'women:fur': 'studio://women-fur-opera-coat',
  'women:bags': 'studio://women-bags-hourglass-burgundy',
  'women:belts': 'studio://women-belts-double-buckle',
  'kids:all': 'studio://kids-junior-leather-bomber',
  'kids:minis-1-to-5': 'studio://kids-baby-cashmere-knit-set',
  'kids:children-6': 'studio://kids-junior-leather-bomber',
  'kids:children-6-plus': 'studio://kids-junior-leather-bomber',
  'kids:teen-13': 'studio://kids-teen-suede-varsity',
  'kids:teen-13-plus': 'studio://kids-teen-suede-varsity',
  'collection:new-arrivals': 'studio://women-fur-opera-coat',
  'collection:new-arrivals-kids': 'studio://kids-junior-leather-bomber',
  'collection:gifts': 'studio://women-bags-hourglass-burgundy',
};

export function buildDefaultCategoryBannerForCategory(
  department: Department | 'collection',
  categoryName: string,
  explicitKey?: string
): CategoryBannerConfig {
  const key =
    explicitKey ||
    (department === 'collection'
      ? `collection:${createSafeSlug(categoryName)}`
      : getCategoryBannerKey(department, categoryName));

  const imageUrl =
    DEFAULT_CATEGORY_STUDIO_IMAGES[key] ||
    (department === 'kids'
      ? 'studio://kids-junior-leather-bomber'
      : 'studio://women-jacket-black-leather-biker');

  const displayCat =
    categoryName.toLowerCase() === 'all'
      ? department === 'kids'
        ? 'Kids Collection'
        : 'Women Collection'
      : categoryName;

  return {
    categoryKey: key,
    department,
    categoryName,
    imageUrl,
    desktopImageUrl: '',
    kicker: `SAMO · ${displayCat.toUpperCase()}`,
    title: `${displayCat.toUpperCase()} EDITORIAL ARCHIVE`,
    enabled: true,
    insertAfterCount: 4,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resolves a banner's Mobile/Primary and Desktop media URLs using Automatic Mutual Fallback:
 * - If only one version (either Mobile/Primary OR Desktop) is uploaded, BOTH mobile and desktop
 *   automatically fall back to displaying that single banner.
 * - If BOTH Mobile/Primary AND Desktop versions are uploaded, Mobile & Tablet (< 1024px) display
 *   the Mobile/Primary version while Desktop (>= 1024px) displays the Desktop version.
 */
export function resolveBannerMediaPair(
  mobileOrPrimaryUrl?: string | null,
  desktopOverrideUrl?: string | null,
  fallbackDefaultUrl = ''
): {
  mobileUrl: string;
  desktopUrl: string;
  hasSeparateDesktop: boolean;
  hasAnyMedia: boolean;
} {
  const cleanMobile =
    typeof mobileOrPrimaryUrl === 'string' ? mobileOrPrimaryUrl.trim() : '';
  const cleanDesktop =
    typeof desktopOverrideUrl === 'string' ? desktopOverrideUrl.trim() : '';
  const cleanFallback =
    typeof fallbackDefaultUrl === 'string' ? fallbackDefaultUrl.trim() : '';

  const resolvedMobile = cleanMobile || cleanDesktop || cleanFallback;
  const resolvedDesktop = cleanDesktop || cleanMobile || cleanFallback;

  return {
    mobileUrl: resolvedMobile,
    desktopUrl: resolvedDesktop,
    hasSeparateDesktop: Boolean(
      cleanMobile && cleanDesktop && cleanMobile !== cleanDesktop
    ),
    hasAnyMedia: Boolean(cleanMobile || cleanDesktop),
  };
}

export function buildDefaultSiteBanners(
  categories: CategoryItem[]
): SiteBannersConfig {
  const categoryBanners: Record<string, CategoryBannerConfig> = {};

  // Department-wide "All" views & collection views
  categoryBanners['women:all'] = buildDefaultCategoryBannerForCategory(
    'women',
    'All Women',
    'women:all'
  );
  categoryBanners['kids:all'] = buildDefaultCategoryBannerForCategory(
    'kids',
    'All Kids',
    'kids:all'
  );
  categoryBanners['collection:new-arrivals'] =
    buildDefaultCategoryBannerForCategory(
      'collection',
      'New Arrivals (Women)',
      'collection:new-arrivals'
    );
  categoryBanners['collection:new-arrivals-kids'] =
    buildDefaultCategoryBannerForCategory(
      'collection',
      'New Arrival (Kids)',
      'collection:new-arrivals-kids'
    );
  categoryBanners['collection:gifts'] = buildDefaultCategoryBannerForCategory(
    'collection',
    'Gifts (Bags & Belts)',
    'collection:gifts'
  );

  // Every Women & Kids Category
  for (const cat of categories) {
    if (
      cat.department === 'kids' &&
      cat.name.trim().toLowerCase() === 'full set'
    ) {
      continue;
    }
    const cleanName =
      cat.department === 'kids'
        ? normalizeKidsCategoryName(cat.name)
        : cat.name.trim();
    const key = getCategoryBannerKey(cat.department, cleanName);
    categoryBanners[key] = buildDefaultCategoryBannerForCategory(
      cat.department,
      cleanName,
      key
    );
  }

  return {
    homeHeroMediaType: 'video',
    homeHeroVideoUrl: 'https://images.samoweave.com/banners/1793837590618-copy-0698c90b-a323-4c4f-a4f4-b4cc32d2d791.mp4',
    homeHeroDesktopVideoUrl: '',
    homeHeroImageUrl: 'studio://women-jacket-black-leather-biker',
    homeHeroDesktopImageUrl: '',
    homeHeroKicker: '',
    homeHeroTitle: 'WINTER EDITION',
    heroHeadlineText: 'WINTER EDITION',
    heroHeadlineSize: 'md',
    homeMiddleBannerUrl: 'studio://kids-junior-leather-bomber',
    homeMiddleDesktopBannerUrl: '',
    homeMiddleKicker:
      'SAMO KIDS · MINIS 1 TO 5 (80–100 CM) · CHILDREN 6+ (100–130 CM) · TEEN 13+ (130–160 CM)',
    homeMiddleTitle: 'KIDS COLLECTION',
    homeMiddleSubtitle:
      'Architectural silhouettes in supple cow leather, brushed suede, and combed cashmere graded in precision centimeter sizing.',
    homeBottomNewArrivalsUrl: 'studio://women-fur-opera-coat',
    homeBottomGiftsUrl: 'studio://women-bags-hourglass-burgundy',
    homeBottomShowroomUrl: 'studio://women-trench-suede-coat',
    showroomHeroBannerUrl: 'studio://women-trench-suede-coat',
    showroomHeroDesktopBannerUrl: '',
    orderEmailBannerUrl: '',
    orderEmailBannerLinkUrl: 'https://samoweave.com/new-arrivals/women',
    orderEmailSenderAddress: 'orders@samoweave.com',
    orderEmailBccAddress: 'orders@samoweave.com',
    orderEmailReplyToAddress: 'info@samoweave.com',
    orderEmailPromoEnabled: false,
    orderEmailPromoCode: 'SAMO10',
    orderEmailPromoDescription: 'Enjoy 10% off your next order',
    orderEmailPromoBannerUrl: '',
    shippingFeeEnabled: true,
    standardDeliveryFee: 6,
    freeShippingThreshold: 100,
    standardDeliveryCheckoutLabel: '',
    googleSheetsSync: {
      enabled: true,
      webhookUrl: '',
      syncSecret: '',
      lastSyncedAt: '',
      lastSyncStatus: '',
    },
    categoryBanners,
  };
}

export function mergeSiteBannersConfig(
  stored: Partial<SiteBannersConfig> | null | undefined,
  categories: CategoryItem[]
): SiteBannersConfig {
  const defaults = buildDefaultSiteBanners(categories);
  if (!stored || typeof stored !== 'object') {
    return defaults;
  }

  const mergedCategoryBanners: Record<string, CategoryBannerConfig> = {
    ...defaults.categoryBanners,
  };

  if (stored.categoryBanners && typeof stored.categoryBanners === 'object') {
    for (const [key, val] of Object.entries(stored.categoryBanners)) {
      if (val && typeof val === 'object') {
        const fallback = mergedCategoryBanners[key];
        const rawKicker =
          typeof val.kicker === 'string'
            ? val.kicker
                .replace(/SAMO ATELIER/gi, 'SAMO')
                .replace(/SAMO WEAVE/gi, 'SAMO')
                .replace(/\bATELIER\b/gi, 'SAMO')
            : fallback?.kicker || 'SAMO';
        const storedImage =
          typeof val.imageUrl === 'string'
            ? val.imageUrl.trim()
            : fallback?.imageUrl || '';
        const storedDesktopImage =
          typeof val.desktopImageUrl === 'string'
            ? val.desktopImageUrl.trim()
            : fallback?.desktopImageUrl || '';
        mergedCategoryBanners[key] = {
          categoryKey: key,
          department: val.department || fallback?.department || 'women',
          categoryName: val.categoryName || fallback?.categoryName || key,
          imageUrl: storedImage,
          desktopImageUrl: storedDesktopImage,
          kicker: rawKicker,
          title:
            typeof val.title === 'string'
              ? val.title
              : fallback?.title || 'COLLECTION ARCHIVE',
          enabled:
            typeof val.enabled === 'boolean'
              ? val.enabled
              : fallback?.enabled ?? true,
          insertAfterCount:
            typeof val.insertAfterCount === 'number' && val.insertAfterCount >= 2
              ? val.insertAfterCount
              : fallback?.insertAfterCount ?? 4,
          updatedAt:
            typeof val.updatedAt === 'string' && val.updatedAt
              ? val.updatedAt
              : fallback?.updatedAt || new Date().toISOString(),
        };
      }
    }
  }

  const resolvedHeadlineText =
    typeof stored.heroHeadlineText === 'string'
      ? stored.heroHeadlineText
      : typeof stored.homeHeroTitle === 'string'
      ? stored.homeHeroTitle.trim().toUpperCase() === 'NEW ARRIVALS'
        ? 'WINTER EDITION'
        : stored.homeHeroTitle
      : 'WINTER EDITION';

  const validHeroSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
  const resolvedHeadlineSize =
    typeof stored.heroHeadlineSize === 'string' &&
    (validHeroSizes as readonly string[]).includes(stored.heroHeadlineSize)
      ? (stored.heroHeadlineSize as SiteBannersConfig['heroHeadlineSize'])
      : 'md';

  return {
    homeHeroMediaType:
      stored.homeHeroMediaType === 'image' ? 'image' : 'video',
    homeHeroVideoUrl:
      typeof stored.homeHeroVideoUrl === 'string' &&
      stored.homeHeroVideoUrl.trim()
        ? stored.homeHeroVideoUrl.trim()
        : defaults.homeHeroVideoUrl,
    homeHeroDesktopVideoUrl:
      typeof stored.homeHeroDesktopVideoUrl === 'string'
        ? stored.homeHeroDesktopVideoUrl.trim()
        : defaults.homeHeroDesktopVideoUrl || '',
    homeHeroImageUrl:
      typeof stored.homeHeroImageUrl === 'string' &&
      stored.homeHeroImageUrl.trim()
        ? stored.homeHeroImageUrl.trim()
        : defaults.homeHeroImageUrl,
    homeHeroDesktopImageUrl:
      typeof stored.homeHeroDesktopImageUrl === 'string'
        ? stored.homeHeroDesktopImageUrl.trim()
        : defaults.homeHeroDesktopImageUrl || '',
    homeHeroKicker:
      typeof stored.homeHeroKicker === 'string'
        ? stored.homeHeroKicker
            .replace(/SAMO ATELIER/gi, 'SAMO')
            .replace(/SAMO WEAVE/gi, 'SAMO')
            .replace(/\bATELIER\b/gi, 'SAMO')
        : defaults.homeHeroKicker,
    homeHeroTitle: resolvedHeadlineText,
    heroHeadlineText: resolvedHeadlineText,
    heroHeadlineSize: resolvedHeadlineSize,
    homeMiddleBannerUrl:
      typeof stored.homeMiddleBannerUrl === 'string' &&
      stored.homeMiddleBannerUrl.trim()
        ? stored.homeMiddleBannerUrl.trim()
        : defaults.homeMiddleBannerUrl,
    homeMiddleDesktopBannerUrl:
      typeof stored.homeMiddleDesktopBannerUrl === 'string'
        ? stored.homeMiddleDesktopBannerUrl.trim()
        : defaults.homeMiddleDesktopBannerUrl || '',
    homeMiddleKicker:
      typeof stored.homeMiddleKicker === 'string' &&
      stored.homeMiddleKicker.trim()
        ? stored.homeMiddleKicker
            .replace(/SAMO KIDS ATELIER/gi, 'SAMO KIDS')
            .replace(/SAMO ATELIER/gi, 'SAMO')
            .replace(/SAMO WEAVE/gi, 'SAMO')
            .replace(/\bATELIER\b/gi, 'SAMO')
        : defaults.homeMiddleKicker,
    homeMiddleTitle:
      typeof stored.homeMiddleTitle === 'string' &&
      stored.homeMiddleTitle.trim()
        ? stored.homeMiddleTitle.trim().toUpperCase() === 'SAMO KIDS COLLECTION'
          ? 'KIDS COLLECTION'
          : stored.homeMiddleTitle
        : defaults.homeMiddleTitle,
    homeMiddleSubtitle:
      typeof stored.homeMiddleSubtitle === 'string' &&
      stored.homeMiddleSubtitle.trim()
        ? stored.homeMiddleSubtitle
        : defaults.homeMiddleSubtitle,
    homeBottomNewArrivalsUrl:
      typeof stored.homeBottomNewArrivalsUrl === 'string' &&
      stored.homeBottomNewArrivalsUrl.trim()
        ? stored.homeBottomNewArrivalsUrl.trim()
        : defaults.homeBottomNewArrivalsUrl,
    homeBottomGiftsUrl:
      typeof stored.homeBottomGiftsUrl === 'string' &&
      stored.homeBottomGiftsUrl.trim()
        ? stored.homeBottomGiftsUrl.trim()
        : defaults.homeBottomGiftsUrl,
    homeBottomShowroomUrl:
      typeof stored.homeBottomShowroomUrl === 'string' &&
      stored.homeBottomShowroomUrl.trim()
        ? stored.homeBottomShowroomUrl.trim()
        : defaults.homeBottomShowroomUrl,
    showroomHeroBannerUrl:
      typeof stored.showroomHeroBannerUrl === 'string' &&
      stored.showroomHeroBannerUrl.trim()
        ? stored.showroomHeroBannerUrl.trim()
        : defaults.showroomHeroBannerUrl,
    showroomHeroDesktopBannerUrl:
      typeof stored.showroomHeroDesktopBannerUrl === 'string'
        ? stored.showroomHeroDesktopBannerUrl.trim()
        : defaults.showroomHeroDesktopBannerUrl || '',
    orderEmailBannerUrl:
      typeof stored.orderEmailBannerUrl === 'string'
        ? stored.orderEmailBannerUrl.trim()
        : defaults.orderEmailBannerUrl,
    orderEmailBannerLinkUrl:
      typeof stored.orderEmailBannerLinkUrl === 'string' &&
      stored.orderEmailBannerLinkUrl.trim()
        ? stored.orderEmailBannerLinkUrl.trim()
        : defaults.orderEmailBannerLinkUrl,
    orderEmailSenderAddress:
      typeof stored.orderEmailSenderAddress === 'string' &&
      stored.orderEmailSenderAddress.trim()
        ? stored.orderEmailSenderAddress
            .trim()
            .replace(/^order@samoweave\.com$/i, 'orders@samoweave.com')
        : defaults.orderEmailSenderAddress,
    orderEmailBccAddress:
      typeof stored.orderEmailBccAddress === 'string'
        ? stored.orderEmailBccAddress
            .trim()
            .replace(/^order@samoweave\.com$/i, 'orders@samoweave.com')
        : defaults.orderEmailBccAddress,
    orderEmailReplyToAddress:
      typeof stored.orderEmailReplyToAddress === 'string' &&
      stored.orderEmailReplyToAddress.trim()
        ? stored.orderEmailReplyToAddress.trim()
        : defaults.orderEmailReplyToAddress,
    orderEmailPromoEnabled:
      typeof stored.orderEmailPromoEnabled === 'boolean'
        ? stored.orderEmailPromoEnabled
        : defaults.orderEmailPromoEnabled,
    orderEmailPromoCode:
      typeof stored.orderEmailPromoCode === 'string' &&
      stored.orderEmailPromoCode.trim()
        ? stored.orderEmailPromoCode.trim().toUpperCase()
        : defaults.orderEmailPromoCode,
    orderEmailPromoDescription:
      typeof stored.orderEmailPromoDescription === 'string'
        ? stored.orderEmailPromoDescription
            .trim()
            .replace(/\s+at\s+samoweave\.com\.?$/i, '')
            .trim()
        : defaults.orderEmailPromoDescription,
    orderEmailPromoBannerUrl:
      typeof stored.orderEmailPromoBannerUrl === 'string'
        ? stored.orderEmailPromoBannerUrl.trim()
        : defaults.orderEmailPromoBannerUrl,
    shippingFeeEnabled:
      typeof stored.shippingFeeEnabled === 'boolean'
        ? stored.shippingFeeEnabled
        : defaults.shippingFeeEnabled ?? true,
    standardDeliveryFee:
      typeof stored.standardDeliveryFee === 'number' &&
      Number.isFinite(stored.standardDeliveryFee) &&
      stored.standardDeliveryFee >= 0
        ? Math.round(stored.standardDeliveryFee * 100) / 100
        : defaults.standardDeliveryFee ?? 6,
    freeShippingThreshold:
      typeof stored.freeShippingThreshold === 'number' &&
      Number.isFinite(stored.freeShippingThreshold) &&
      stored.freeShippingThreshold >= 0
        ? Math.round(stored.freeShippingThreshold * 100) / 100
        : defaults.freeShippingThreshold ?? 100,
    standardDeliveryCheckoutLabel:
      typeof stored.standardDeliveryCheckoutLabel === 'string'
        ? stored.standardDeliveryCheckoutLabel.trim()
        : defaults.standardDeliveryCheckoutLabel || '',
    googleSheetsSync: {
      enabled: true,
      webhookUrl:
        typeof stored.googleSheetsSync?.webhookUrl === 'string'
          ? stored.googleSheetsSync.webhookUrl.trim()
          : '',
      syncSecret:
        typeof stored.googleSheetsSync?.syncSecret === 'string'
          ? stored.googleSheetsSync.syncSecret.trim()
          : '',
      lastSyncedAt:
        typeof stored.googleSheetsSync?.lastSyncedAt === 'string'
          ? stored.googleSheetsSync.lastSyncedAt
          : defaults.googleSheetsSync?.lastSyncedAt || '',
      lastSyncStatus:
        typeof stored.googleSheetsSync?.lastSyncStatus === 'string'
          ? stored.googleSheetsSync.lastSyncStatus
          : defaults.googleSheetsSync?.lastSyncStatus || '',
    },
    categoryBanners: mergedCategoryBanners,
  };
}

/**
 * Determines the product index at which to insert the in-feed Category Editorial Banner
 * so that products appear before the banner and remaining products appear after it.
 */
export function getCategoryBannerSplitIndex(
  totalProducts: number,
  insertAfterCount = 4
): number {
  if (totalProducts <= 0) return 0;
  const preferred = Math.max(2, Math.floor(Number(insertAfterCount) || 4));
  if (totalProducts > preferred) {
    return preferred;
  }
  if (totalProducts > 2) {
    return 2;
  }
  if (totalProducts === 2) {
    return 1;
  }
  return 1;
}

/**
 * Generates a tailored luxury editorial product description from product attributes
 * so "Auto-Draft Editorial Notes" works instantaneously both with AI and offline/on live static hosting.
 */
export function buildEditorialProductDescription(
  params: {
    name?: string;
    department?: Department;
    category?: string;
    style?: string;
    materials?: string[];
    colors?: string[];
  },
  variationIndex = 0
): string {
  const cleanName = (params.name || '').trim();
  const deptLabel = params.department === 'kids' ? 'SAMO Kids' : 'SAMO Women';
  const categoryLabel = (params.category || 'Signature Piece').trim();
  const styleLabel = (params.style || 'Classic').trim();
  const materialsList = Array.isArray(params.materials)
    ? params.materials.map((m) => m.trim()).filter(Boolean)
    : [];
  const colorsList = Array.isArray(params.colors)
    ? params.colors.map((c) => c.trim()).filter(Boolean)
    : [];

  const subjectPhrase = cleanName
    ? `${cleanName} — ${deptLabel.toLowerCase()} ${categoryLabel.toLowerCase()}`
    : `Architectural ${deptLabel.toLowerCase()} ${categoryLabel.toLowerCase()} silhouette`;

  const materialPhrase =
    materialsList.length > 0
      ? ` crafted in supple ${materialsList.join(', ')}`
      : '';

  const colorPhrase =
    colorsList.length > 0
      ? ` Available in ${colorsList.join(', ')} colorway${colorsList.length > 1 ? 's' : ''}.`
      : '';

  const templates = [
    `${subjectPhrase}${materialPhrase}. Tailored in the house's signature ${styleLabel.toLowerCase()} proportions with clean architectural lines and precision finishing.${colorPhrase}`,
    `Designed for the ${deptLabel} collection, this ${categoryLabel.toLowerCase()}${materialPhrase} balances structured ${styleLabel.toLowerCase()} construction with effortless movement and refined hardware details.${colorPhrase}`,
    `SAMO ${styleLabel.toLowerCase()} ${categoryLabel.toLowerCase()}${materialPhrase}, cut with a sharp silhouette, tonal seam work, and enduring house craftsmanship.${colorPhrase}`,
  ];

  const idx = Math.abs(variationIndex) % templates.length;
  return templates[idx].slice(0, 950);
}

/**
 * Updates a category's sortOrder number (supporting integers like 1, 2, 3 and decimals like 1.5, 2.5).
 */
export function updateCategorySortOrder(
  categories: CategoryItem[],
  categoryId: string,
  newSortOrder: number
): CategoryItem[] {
  const safeOrder = Number.isFinite(newSortOrder)
    ? Math.max(0.01, Math.round(newSortOrder * 100) / 100)
    : 1;
  return categories.map((cat) =>
    cat.id === categoryId
      ? {
          ...cat,
          sortOrder: safeOrder,
        }
      : cat
  );
}

/**
 * Swaps a category one position up or down within its department (Women or Kids)
 * and re-assigns clean sequential numbers (1, 2, 3...) to that department.
 */
export function moveCategoryInDepartment(
  categories: CategoryItem[],
  department: Department,
  categoryId: string,
  direction: 'up' | 'down'
): CategoryItem[] {
  const deptCategories = getCategoriesByDepartment(categories, department);
  const currentIndex = deptCategories.findIndex((c) => c.id === categoryId);
  if (currentIndex === -1) return categories;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= deptCategories.length) {
    return categories;
  }

  const reordered = [...deptCategories];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  const orderById = new Map<string, number>();
  reordered.forEach((cat, idx) => {
    orderById.set(cat.id, idx + 1);
  });

  const updated = categories.map((cat) => {
    if (cat.department === department && orderById.has(cat.id)) {
      return {
        ...cat,
        sortOrder: orderById.get(cat.id)!,
      };
    }
    return cat;
  });

  // Also sort the underlying array by department + sortOrder so any direct iteration stays in sync
  return [...updated].sort((a, b) => {
    if (a.department !== b.department) {
      return a.department === 'women' ? -1 : 1;
    }
    return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
  });
}

/**
 * Cleanly re-numbers all categories in a department as 1, 2, 3, 4... in their current sorted order.
 */
export function renumberDepartmentCategoriesSequentially(
  categories: CategoryItem[],
  department: Department
): CategoryItem[] {
  const deptCategories = getCategoriesByDepartment(categories, department);
  const orderById = new Map<string, number>();
  deptCategories.forEach((cat, idx) => {
    orderById.set(cat.id, idx + 1);
  });

  return categories.map((cat) =>
    cat.department === department && orderById.has(cat.id)
      ? {
          ...cat,
          sortOrder: orderById.get(cat.id)!,
        }
      : cat
  );
}

export const DEFAULT_NEWSLETTER_POPUP_CONFIG: NewsletterPopupConfig = {
  enabled: true,
  delaySeconds: 10,
  maxTimesPerDay: 2,
  kicker: '',
  title: 'Subscribe to Samo',
  subtitle:
    'Enter your email or phone number to receive early access to new arrivals, latest offers, and seasonal sales.',
  buttonText: 'Unlock your code',
  promoCode: 'SAMO10',
  discountText: '10% OFF',
};

const LEGACY_POPUP_TITLES = new Set([
  'UNLOCK 10% OFF YOUR FIRST ACQUISITION',
]);
const LEGACY_POPUP_SUBTITLES = new Set([
  'Enter your email and phone number to join the SAMO Atelier private list and immediately unlock your 10% privilege promo code (SAMO10).',
  'Enter your email and phone number to join the SAMO Atelier private list and immediately unlock your 10% privilege promo code.',
]);
const LEGACY_POPUP_BUTTONS = new Set([
  'UNLOCK 10% PRIVILEGE CODE',
]);
const LEGACY_POPUP_KICKERS = new Set([
  'SAMO ATELIER · PRIVATE CLIENT INVITATION',
]);

export function mergeNewsletterPopupConfig(
  stored?: Partial<NewsletterPopupConfig> | null
): NewsletterPopupConfig {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_NEWSLETTER_POPUP_CONFIG };
  }

  const rawTitle =
    typeof stored.title === 'string'
      ? LEGACY_POPUP_TITLES.has(stored.title.trim())
        ? DEFAULT_NEWSLETTER_POPUP_CONFIG.title
        : stored.title.replace(/Samo Weave/gi, 'Samo')
      : DEFAULT_NEWSLETTER_POPUP_CONFIG.title;

  const rawSubtitle =
    typeof stored.subtitle === 'string'
      ? LEGACY_POPUP_SUBTITLES.has(stored.subtitle.trim())
        ? DEFAULT_NEWSLETTER_POPUP_CONFIG.subtitle
        : stored.subtitle
            .replace(/SAMO Atelier/gi, 'SAMO')
            .replace(/SAMO Weave/gi, 'SAMO')
            .replace(/\bAtelier\b/gi, 'Samo')
      : DEFAULT_NEWSLETTER_POPUP_CONFIG.subtitle;

  const rawButton =
    typeof stored.buttonText === 'string'
      ? LEGACY_POPUP_BUTTONS.has(stored.buttonText.trim())
        ? DEFAULT_NEWSLETTER_POPUP_CONFIG.buttonText
        : stored.buttonText
      : DEFAULT_NEWSLETTER_POPUP_CONFIG.buttonText;

  const rawKicker =
    typeof stored.kicker === 'string'
      ? LEGACY_POPUP_KICKERS.has(stored.kicker.trim())
        ? ''
        : stored.kicker
            .replace(/SAMO ATELIER/gi, 'SAMO')
            .replace(/SAMO WEAVE/gi, 'SAMO')
            .replace(/\bATELIER\b/gi, 'SAMO')
      : DEFAULT_NEWSLETTER_POPUP_CONFIG.kicker;

  return {
    enabled:
      typeof stored.enabled === 'boolean'
        ? stored.enabled
        : DEFAULT_NEWSLETTER_POPUP_CONFIG.enabled,
    delaySeconds:
      typeof stored.delaySeconds === 'number' &&
      Number.isFinite(stored.delaySeconds) &&
      stored.delaySeconds >= 0
        ? Math.min(300, Math.max(0, Math.round(stored.delaySeconds)))
        : DEFAULT_NEWSLETTER_POPUP_CONFIG.delaySeconds,
    maxTimesPerDay:
      typeof stored.maxTimesPerDay === 'number' &&
      Number.isFinite(stored.maxTimesPerDay) &&
      stored.maxTimesPerDay >= 1
        ? Math.min(50, Math.max(1, Math.round(stored.maxTimesPerDay)))
        : DEFAULT_NEWSLETTER_POPUP_CONFIG.maxTimesPerDay,
    kicker: rawKicker,
    title: rawTitle,
    subtitle: rawSubtitle,
    buttonText: rawButton,
    promoCode:
      typeof stored.promoCode === 'string'
        ? stored.promoCode.toUpperCase()
        : DEFAULT_NEWSLETTER_POPUP_CONFIG.promoCode,
    discountText:
      typeof stored.discountText === 'string' && stored.discountText.trim()
        ? stored.discountText
        : DEFAULT_NEWSLETTER_POPUP_CONFIG.discountText,
    updatedAt:
      typeof stored.updatedAt === 'string' ? stored.updatedAt : undefined,
  };
}

/**
 * Validates the Homepage Newsletter Pop-Up submission:
 * Supports both:
 * 1) Single-box input ("Enter your Email Or Number", e.g. "johndoe@gmail.com", "70 123 456", or "johndoe@gmail.com, 70 123 456")
 * 2) Two-argument (rawEmail, rawPhone) calls.
 */
export function validateNewsletterPopupInputs(
  rawEmailOrCombined: string,
  rawPhone?: string
): {
  valid: boolean;
  emailValid: boolean;
  phoneValid: boolean;
  cleanEmail: string;
  cleanPhone: string;
  errorMessage?: string;
} {
  // Mode A: Explicit 2-argument call (when rawPhone is passed as a string)
  if (typeof rawPhone === 'string') {
    const cleanEmail = (rawEmailOrCombined || '').trim().toLowerCase();
    const cleanPhone = rawPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    const hasAtAndDotCom =
      cleanEmail.includes('@') &&
      cleanEmail.includes('.com') &&
      /^[^\s@]+@[^\s@]+\.com(?:\.[a-z]{2,})?$/i.test(cleanEmail);

    const hasMinEightDigits = phoneDigits.length >= 8;

    if (!hasAtAndDotCom && !hasMinEightDigits) {
      return {
        valid: false,
        emailValid: false,
        phoneValid: false,
        cleanEmail,
        cleanPhone,
        errorMessage:
          'Please enter a valid email address or phone number (at least 8 digits).',
      };
    }

    if (!hasAtAndDotCom) {
      return {
        valid: false,
        emailValid: false,
        phoneValid: true,
        cleanEmail,
        cleanPhone,
        errorMessage:
          'Please enter a valid email address containing "@" and ".com".',
      };
    }

    if (!hasMinEightDigits) {
      return {
        valid: false,
        emailValid: true,
        phoneValid: false,
        cleanEmail,
        cleanPhone,
        errorMessage:
          'Please enter a valid phone number containing at least 8 digits.',
      };
    }

    return {
      valid: true,
      emailValid: true,
      phoneValid: true,
      cleanEmail,
      cleanPhone,
    };
  }

  // Mode B: Single-box input ("Enter your Email Or Number")
  const combined = (rawEmailOrCombined || '').trim();
  if (!combined) {
    return {
      valid: false,
      emailValid: false,
      phoneValid: false,
      cleanEmail: '',
      cleanPhone: '',
      errorMessage:
        'Please enter your email address or phone number (e.g., samoweave@gmail.com, 70 123 456).',
    };
  }

  // Extract email candidate if '@' is present
  const emailMatch = combined.match(/[^\s,;]+@[^\s,;]+/i);
  const candidateEmail = emailMatch ? emailMatch[0].trim().toLowerCase() : '';
  const emailValid =
    Boolean(candidateEmail) &&
    candidateEmail.includes('@') &&
    candidateEmail.includes('.') &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(candidateEmail);

  // Extract phone part by removing any email token and checking digits
  const remainderWithoutEmail = candidateEmail
    ? combined.replace(emailMatch![0], '').replace(/^[\s,;|/]+|[\s,;|/]+$/g, '')
    : combined;
  const phoneDigits = remainderWithoutEmail.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 8;

  // If the user typed '@' but the email is incomplete and no valid phone is provided
  if (combined.includes('@') && !emailValid && !phoneValid) {
    return {
      valid: false,
      emailValid: false,
      phoneValid: false,
      cleanEmail: candidateEmail,
      cleanPhone: '',
      errorMessage:
        'Please enter a valid email address (e.g., samoweave@gmail.com) or an 8-digit phone number (e.g., 70 123 456).',
    };
  }

  if (!emailValid && !phoneValid) {
    return {
      valid: false,
      emailValid: false,
      phoneValid: false,
      cleanEmail: '',
      cleanPhone: remainderWithoutEmail,
      errorMessage:
        'Please enter a valid email address or a phone number with at least 8 digits (e.g., samoweave@gmail.com, 70 123 456).',
    };
  }

  return {
    valid: true,
    emailValid,
    phoneValid,
    cleanEmail: emailValid ? candidateEmail : '',
    cleanPhone: phoneValid ? remainderWithoutEmail : '',
  };
}

function escapeHtmlEmailText(input: unknown): string {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface OrderConfirmationEmailConfig {
  order: Partial<OrderItem> & {
    orderNumber?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingLocation?: string;
    deliveryMethod?: string;
    paymentMethod?: string;
    deliveryFee?: number;
    subtotal?: number;
    discountAmount?: number;
    promoCode?: string;
    totalPrice?: number;
    itemsSummary?: string;
    primaryProductImage?: string;
    orderedItems?: Array<{
      productId?: string;
      productName?: string;
      selectedColor?: string;
      selectedSize?: string;
      selectedSetSizes?: Array<{
        productName?: string;
        pieceLabel?: string;
        selectedSize?: string;
        selectedColor?: string;
        garmentCode?: string;
      }>;
      garmentCode?: string;
      quantity?: number;
      unitPrice?: number;
      imageUrl?: string;
    }>;
    createdAt?: string;
  };
  bannerUrl?: string;
  bannerLinkUrl?: string;
  senderAddress?: string;
  bccAddress?: string;
  replyToAddress?: string;
  promoGiftEnabled?: boolean;
  promoGiftCode?: string;
  promoGiftDescription?: string;
  promoGiftBannerUrl?: string;
  adminAlertOnly?: boolean;
}

/**
 * Builds the Resend REST API payload (from, to, bcc, reply_to, subject, html, text)
 * for a SAMO luxury order confirmation receipt using 100% email-safe inline CSS and HTML <table> layout.
 */
export function buildOrderConfirmationEmailPayload(
  config: OrderConfirmationEmailConfig
): {
  from: string;
  to: string[];
  bcc?: string[];
  reply_to?: string;
  subject: string;
  html: string;
  text: string;
} {
  const { order } = config;
  const orderRef = (order.orderNumber || order.id || 'SAMO-ORDER').trim();
  const customerName = (order.customerName || 'Valued Client').trim();
  const customerEmail = (order.customerEmail || '').trim();
  const customerPhone = (order.customerPhone || '—').trim();
  const shippingLocation = (order.shippingLocation || '—').trim();
  const deliveryMethod = (order.deliveryMethod || 'Standard Delivery').trim();
  const paymentMethod = (order.paymentMethod || 'COD').trim();
  const subtotal = Number(order.subtotal) || 0;
  const discountAmount = Number(order.discountAmount) || 0;
  const promoCode = (order.promoCode || '').trim().toUpperCase();
  const deliveryFee = Number(order.deliveryFee) || 0;
  const totalPrice =
    Number(order.totalPrice) || Math.max(0, subtotal - discountAmount + deliveryFee);

  const rawSender = (config.senderAddress || 'orders@samoweave.com')
    .trim()
    .replace(/^order@samoweave\.com$/i, 'orders@samoweave.com');
  const fromField = rawSender.includes('<') ? rawSender : `SAMO <${rawSender}>`;

  const rawBcc = (
    config.bccAddress !== undefined ? config.bccAddress : 'orders@samoweave.com'
  )
    .trim()
    .replace(/^order@samoweave\.com$/i, 'orders@samoweave.com');
  const bccList = rawBcc
    ? rawBcc
        .split(/[,;]+/)
        .map((e) => e.trim().replace(/^order@samoweave\.com$/i, 'orders@samoweave.com'))
        .filter((e) => e.includes('@'))
    : [];

  const replyTo = (config.replyToAddress || 'info@samoweave.com').trim();
  const bannerUrl = (config.bannerUrl || '').trim();
  const hasPublicBanner =
    bannerUrl.startsWith('https://') || bannerUrl.startsWith('http://');
  const rawBannerLink = (
    config.bannerLinkUrl || 'https://samoweave.com/new-arrivals/women'
  ).trim();
  const bannerTargetLink = rawBannerLink.includes('utm_source=')
    ? rawBannerLink
    : `${rawBannerLink}${rawBannerLink.includes('?') ? '&' : '?'}utm_source=order_email&utm_medium=email`;

  const promoGiftEnabled = Boolean(config.promoGiftEnabled);
  const promoGiftCode = (config.promoGiftCode ?? 'SAMO10').trim().toUpperCase();
  const promoGiftDescription = (
    config.promoGiftDescription !== undefined
      ? config.promoGiftDescription
      : 'Enjoy 10% off your next order'
  )
    .trim()
    .replace(/\s+at\s+samoweave\.com\.?$/i, '')
    .trim();
  const promoGiftBannerUrl = (config.promoGiftBannerUrl || '').trim();
  const hasPublicPromoBanner =
    promoGiftBannerUrl.startsWith('https://') ||
    promoGiftBannerUrl.startsWith('http://');
  const showPromoGiftSection = promoGiftEnabled && Boolean(promoGiftCode);

  const formattedDate = (() => {
    try {
      const d = order.createdAt ? new Date(order.createdAt) : new Date();
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const isShowroomPickup = deliveryMethod
    .toLowerCase()
    .includes('showroom pickup');

  const orderedItems = Array.isArray(order.orderedItems)
    ? order.orderedItems
    : [];

  // Build HTML rows and plain-text lines for ordered items
  let itemsHtmlRows = '';
  const itemsTextLines: string[] = [];

  if (orderedItems.length > 0) {
    orderedItems.forEach((item, index) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const name = (item.productName || `SAMO Garment #${index + 1}`).trim();
      const refCode = item.garmentCode
        ? formatGarmentCodeRef(item.garmentCode)
        : '';
      const color = (item.selectedColor || '').trim();
      const size = (item.selectedSize || 'OS').trim();
      const setPieces = Array.isArray(item.selectedSetSizes)
        ? item.selectedSetSizes
        : [];
      const unitPrice =
        typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
          ? item.unitPrice
          : orderedItems.length === 1
          ? Math.round(subtotal / qty)
          : undefined;
      const lineTotal =
        unitPrice !== undefined ? `$${(unitPrice * qty).toLocaleString()}` : '';

      const rawItemImg = (
        item.imageUrl ||
        (orderedItems.length === 1 ? order.primaryProductImage : '') ||
        ''
      ).trim();
      const hasPublicItemImage =
        rawItemImg.startsWith('https://') || rawItemImg.startsWith('http://');

      const metaParts: string[] = [];
      if (refCode) metaParts.push(refCode);
      if (color) metaParts.push(`Color: ${color}`);
      if (setPieces.length > 0) {
        const pieceDesc = setPieces
          .map((sp) => {
            const pName = sp.pieceLabel || sp.productName || 'Piece';
            const pColor = sp.selectedColor ? `${sp.selectedColor} · ` : '';
            const pSize = sp.selectedSize || 'OS';
            return `${pName}: ${pColor}Size ${pSize}`;
          })
          .join(' | ');
        metaParts.push(pieceDesc);
      } else if (size) {
        metaParts.push(`Size: ${size === 'OS' ? 'One Size' : size}`);
      }

      const metaLine = metaParts.join(' · ');

      itemsHtmlRows += `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #E5E5E5;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                ${
                  hasPublicItemImage
                    ? `<td width="56" style="width:56px;padding-right:12px;vertical-align:top;">
                        <img
                          src="${escapeHtmlEmailText(rawItemImg)}"
                          alt="${escapeHtmlEmailText(name)}"
                          width="56"
                          height="70"
                          style="display:block;width:56px;height:70px;object-fit:cover;border:1px solid #E4E4E7;background-color:#F4F4F5;"
                        />
                      </td>`
                    : ''
                }
                <td style="vertical-align:top;">
                  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#09090B;line-height:1.4;">
                    ${escapeHtmlEmailText(name)}
                  </div>
                  ${
                    metaLine
                      ? `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#52525B;letter-spacing:0.04em;margin-top:4px;line-height:1.5;">
                          ${escapeHtmlEmailText(metaLine)}
                        </div>`
                      : ''
                  }
                </td>
              </tr>
            </table>
          </td>
          <td align="center" style="padding:14px 8px;border-bottom:1px solid #E5E5E5;vertical-align:top;font-family:'Courier New',Courier,monospace;font-size:12px;color:#27272A;white-space:nowrap;">
            Qty: ${qty}
          </td>
          <td align="right" style="padding:14px 0;border-bottom:1px solid #E5E5E5;vertical-align:top;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#09090B;white-space:nowrap;">
            ${lineTotal ? escapeHtmlEmailText(lineTotal) : 'Included'}
          </td>
        </tr>`;

      itemsTextLines.push(
        `- ${qty}x ${name}${metaLine ? ` (${metaLine})` : ''}${
          lineTotal ? ` — ${lineTotal}` : ''
        }`
      );
    });
  } else {
    const fallbackSummary = (
      order.itemsSummary ||
      `${order.primaryProductName || 'SAMO Order'} (${order.primaryProductSize || 'Standard'})`
    )
      .replace(/\s*\[Payment:[^\]]+\]\s*$/i, '')
      .trim();

    itemsHtmlRows = `
      <tr>
        <td colspan="3" style="padding:14px 0;border-bottom:1px solid #E5E5E5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#09090B;line-height:1.6;">
          ${escapeHtmlEmailText(fallbackSummary)}
        </td>
      </tr>`;
    itemsTextLines.push(`- ${fallbackSummary}`);
  }

  const deliveryFeeText =
    isShowroomPickup
      ? 'Showroom Pickup — Complimentary'
      : deliveryFee <= 0
      ? 'Complimentary'
      : `$${deliveryFee.toLocaleString()}`;

  const preheaderText = `Your SAMO order #${orderRef} is confirmed. View your itemized receipt and delivery details.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Order Confirmed — SAMO (#${escapeHtmlEmailText(orderRef)})</title>
</head>
<body style="margin:0;padding:0;background-color:#EFEFEF;color:#09090B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Hidden Inbox Preheader -->
  <div style="display:none;font-size:1px;color:#EFEFEF;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtmlEmailText(preheaderText)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EFEFEF;width:100%;margin:0;padding:20px 0;">
    <tr>
      <td align="center" style="padding:0 10px;">
        <!-- Main 600px Architectural Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #09090B;border-collapse:collapse;">
          
          <!-- Top Header: Dark-Mode-Safe #FFFFFF Studio Plate with Centered SAMO Logo -->
          <tr>
            <td align="center" style="background-color:#FFFFFF;padding:26px 24px 22px 24px;border-bottom:1px solid #09090B;text-align:center;">
              <a href="https://samoweave.com/home?utm_source=order_email&utm_medium=email" target="_blank" style="text-decoration:none;display:inline-block;">
                <img
                  src="https://images.samoweave.com/logo/samo-weave-logo.png"
                  alt="SAMO"
                  width="150"
                  style="display:block;margin:0 auto;width:150px;max-width:170px;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </a>
            </td>
          </tr>

          <!-- Order Confirmation Status & Reference Strip -->
          <tr>
            <td style="padding:28px 24px 20px 24px;background-color:#FFFFFF;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#71717A;margin-bottom:8px;">
                ORDER CONFIRMATION
              </div>
              <h1 style="margin:0 0 12px 0;font-size:20.7px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#09090B;line-height:1.25;">
                THANK YOU FOR YOUR ORDER, ${escapeHtmlEmailText(customerName)}
              </h1>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#3F3F46;">
                We have received your SAMO order <strong style="color:#09090B;">#${escapeHtmlEmailText(orderRef)}</strong>. Our studio is preparing your garments for ${
    isShowroomPickup ? 'pickup at the SAMO Flagship Showroom' : 'dispatch to your delivery address'
  }.
              </p>
            </td>
          </tr>

          <!-- Order Meta Table (Order ID, Date, Fulfillment, Payment) -->
          <tr>
            <td style="padding:0 24px 22px 24px;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#F4F4F5;border:1px solid #E4E4E7;border-collapse:collapse;">
                <tr>
                  <td width="50%" style="padding:12px 14px;border-bottom:1px solid #E4E4E7;border-right:1px solid #E4E4E7;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">ORDER NUMBER</div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#09090B;margin-top:4px;">#${escapeHtmlEmailText(orderRef)}</div>
                  </td>
                  <td width="50%" style="padding:12px 14px;border-bottom:1px solid #E4E4E7;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">ORDER DATE</div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#09090B;margin-top:4px;">${escapeHtmlEmailText(formattedDate)}</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:12px 14px;border-right:1px solid #E4E4E7;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">FULFILLMENT</div>
                    <div style="font-size:12px;font-weight:700;color:#09090B;margin-top:4px;">${escapeHtmlEmailText(deliveryMethod)}</div>
                  </td>
                  <td width="50%" style="padding:12px 14px;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">PAYMENT METHOD</div>
                    <div style="font-size:12px;font-weight:700;color:#09090B;margin-top:4px;">${escapeHtmlEmailText(paymentMethod)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized Garment Receipt Table -->
          <tr>
            <td style="padding:0 24px 20px 24px;background-color:#FFFFFF;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#09090B;padding-bottom:8px;border-bottom:2px solid #09090B;">
                ITEMIZED RECEIPT
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                ${itemsHtmlRows}
              </table>

              <!-- Financial Totals Breakdown -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:14px;border-collapse:collapse;">
                <tr>
                  <td style="padding:5px 0;font-size:12px;color:#52525B;">Subtotal</td>
                  <td align="right" style="padding:5px 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#09090B;">$${subtotal.toLocaleString()}</td>
                </tr>
                ${
                  discountAmount > 0
                    ? `<tr>
                        <td style="padding:5px 0;font-size:12px;color:#4A080C;font-weight:700;">Privilege Discount${
                          promoCode ? ` (${escapeHtmlEmailText(promoCode)})` : ''
                        }</td>
                        <td align="right" style="padding:5px 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#4A080C;font-weight:700;">-$${discountAmount.toLocaleString()}</td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:5px 0;font-size:12px;color:#52525B;">Delivery</td>
                  <td align="right" style="padding:5px 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#09090B;">${escapeHtmlEmailText(deliveryFeeText)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 4px 0;border-top:1px solid #09090B;font-size:13px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#09090B;">TOTAL (USD)</td>
                  <td align="right" style="padding:12px 0 4px 0;border-top:1px solid #09090B;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:800;color:#09090B;">$${totalPrice.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Details Block -->
          <tr>
            <td style="padding:0 24px 28px 24px;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#FAFAFA;border:1px solid #E5E5E5;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#09090B;margin-bottom:8px;">
                      DELIVERY DETAILS
                    </div>
                    <div style="font-size:12px;line-height:1.6;color:#27272A;">
                      <strong>Name:</strong> ${escapeHtmlEmailText(customerName)}<br />
                      <strong>Phone:</strong> ${escapeHtmlEmailText(customerPhone)}<br />
                      ${
                        customerEmail
                          ? `<strong>Email:</strong> ${escapeHtmlEmailText(customerEmail)}<br />`
                          : ''
                      }
                      <strong>${isShowroomPickup ? 'Showroom Pickup' : 'Delivery Address'}:</strong> ${escapeHtmlEmailText(shippingLocation)}
                    </div>
                    ${
                      isShowroomPickup
                        ? `<div style="margin-top:10px;font-size:11px;line-height:1.5;color:#3F3F46;">
                            Your order will be reserved at the <strong>SAMO Flagship Showroom</strong>. <a href="https://samoweave.com/showroom?utm_source=order_email&utm_medium=email" target="_blank" style="color:#09090B;font-weight:700;text-decoration:underline;">View Showroom Hours &amp; Map</a>
                          </div>`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            showPromoGiftSection
              ? hasPublicPromoBanner
                ? `<!-- Next-Order VIP Promo Gift Card Section (Full-Bleed With Background Banner) -->
          <tr>
            <td style="padding:0;background-color:#FFFFFF;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-top:1px solid #09090B;border-bottom:1px solid #09090B;border-left:0;border-right:0;border-collapse:collapse;">
                <tr>
                  <td
                    width="600"
                    align="center"
                    background="${escapeHtmlEmailText(promoGiftBannerUrl)}"
                    bgcolor="#18181B"
                    style="width:100%;max-width:600px;background-image:url('${escapeHtmlEmailText(promoGiftBannerUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#18181B;padding:0;text-align:center;"
                  >
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:rgba(9,9,11,0.46);">
                      <tr>
                        <td align="center" style="padding:26px 20px;text-align:center;">
                          <div style="font-size:15px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#FFFFFF;margin-bottom:${
                            promoGiftDescription ? '8px' : '16px'
                          };">
                            YOU GOT 10% OFF
                          </div>
                          ${
                            promoGiftDescription
                              ? `<div style="font-size:12px;line-height:1.5;color:#F4F4F5;margin-bottom:16px;">
                                  ${escapeHtmlEmailText(promoGiftDescription)}
                                </div>`
                              : ''
                          }
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
                            <tr>
                              <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px dashed #FFFFFF;padding:10px 24px;">
                                <span style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:800;letter-spacing:0.22em;color:#09090B;">
                                  ${escapeHtmlEmailText(promoGiftCode)}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
                : `<!-- Next-Order VIP Promo Gift Card Section -->
          <tr>
            <td style="padding:0;background-color:#FFFFFF;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FAF9F7;border-top:1px solid #09090B;border-bottom:1px solid #09090B;border-left:0;border-right:0;border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:22px 18px;text-align:center;">
                    <div style="font-size:15px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#09090B;margin-bottom:${
                      promoGiftDescription ? '6px' : '14px'
                    };">
                      YOU GOT 10% OFF
                    </div>
                    ${
                      promoGiftDescription
                        ? `<div style="font-size:12px;line-height:1.5;color:#3F3F46;margin-bottom:14px;">
                            ${escapeHtmlEmailText(promoGiftDescription)}
                          </div>`
                        : ''
                    }
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px dashed #09090B;padding:10px 22px;">
                          <span style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:800;letter-spacing:0.22em;color:#09090B;">
                            ${escapeHtmlEmailText(promoGiftCode)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }

          <!-- Dual Table CTA Buttons Placed Between the Two Full-Bleed Banners -->
          <tr>
            <td align="center" style="padding:20px 24px;background-color:#FFFFFF;border-top:1px solid #09090B;border-bottom:1px solid #09090B;">
              <!-- Primary Solid Black Button: EXPLORE NEW ARRIVALS -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-bottom:10px;">
                <tr>
                  <td align="center" bgcolor="#09090B" style="background-color:#09090B;border:1px solid #09090B;">
                    <a
                      href="${escapeHtmlEmailText(bannerTargetLink)}"
                      target="_blank"
                      style="display:block;padding:14px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;text-align:center;"
                    >
                      EXPLORE NEW ARRIVALS
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary Outlined Black-on-White Button: CONTACT US (WhatsApp) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #09090B;">
                    <a
                      href="https://api.whatsapp.com/send/?phone=96170224767&amp;text&amp;type=phone_number&amp;app_absent=0"
                      target="_blank"
                      style="display:block;padding:13px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#09090B;text-decoration:none;text-align:center;"
                    >
                      CONTACT US
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            hasPublicBanner
              ? `<!-- Bottom Full-Bleed Editorial Campaign Banner -->
          <tr>
            <td style="padding:0;background-color:#FFFFFF;">
              <a href="${escapeHtmlEmailText(bannerTargetLink)}" target="_blank" style="display:block;text-decoration:none;border:0;">
                <img
                  src="${escapeHtmlEmailText(bannerUrl)}"
                  alt="SAMO Editorial Campaign"
                  width="600"
                  style="width:100%;max-width:600px;height:auto;display:block;border:0;outline:none;text-decoration:none;"
                />
              </a>
            </td>
          </tr>`
              : ''
          }

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#D4D4D4;padding:20px 24px;border-top:1px solid #09090B;text-align:center;">
              <div style="font-size:11px;line-height:1.6;color:#27272A;margin-bottom:8px;">
                Questions about your order? Contact our Client Concierge:
                <a href="mailto:support@samoweave.com" style="color:#09090B;font-weight:700;text-decoration:underline;">support@samoweave.com</a>
              </div>
              <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#09090B;">
                &copy; 2026 SAMO (EST. 1999) &mdash; ALL RIGHTS RESERVED
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `SAMO — ORDER CONFIRMED (#${orderRef})`,
    `==================================================`,
    `Thank you for your order, ${customerName}.`,
    ``,
    `Order Number: #${orderRef}`,
    `Order Date: ${formattedDate}`,
    `Fulfillment: ${deliveryMethod}`,
    `Payment Method: ${paymentMethod}`,
    ``,
    `ITEMIZED RECEIPT`,
    `--------------------------------------------------`,
    ...itemsTextLines,
    `--------------------------------------------------`,
    `Subtotal: $${subtotal.toLocaleString()}`,
    ...(discountAmount > 0
      ? [
          `Privilege Discount${promoCode ? ` (${promoCode})` : ''}: -$${discountAmount.toLocaleString()}`,
        ]
      : []),
    `Delivery: ${deliveryFeeText}`,
    `TOTAL (USD): $${totalPrice.toLocaleString()}`,
    ``,
    `DELIVERY DETAILS`,
    `--------------------------------------------------`,
    `Name: ${customerName}`,
    `Phone: ${customerPhone}`,
    ...(customerEmail ? [`Email: ${customerEmail}`] : []),
    `${isShowroomPickup ? 'Showroom Pickup' : 'Delivery Address'}: ${shippingLocation}`,
    ...(showPromoGiftSection
      ? [
          ``,
          `YOU GOT 10% OFF`,
          `--------------------------------------------------`,
          ...(promoGiftDescription ? [`${promoGiftDescription}`] : []),
          `Promo Code: ${promoGiftCode}`,
        ]
      : []),
    ``,
    `Explore New Arrivals: ${bannerTargetLink}`,
    `Contact Us: https://api.whatsapp.com/send/?phone=96170224767&text&type=phone_number&app_absent=0`,
    ``,
    `Questions about your order? Contact our Client Concierge: support@samoweave.com`,
    `© 2026 SAMO (EST. 1999) — ALL RIGHTS RESERVED`,
  ].join('\n');

  const isAdminAlertOnly = Boolean(config.adminAlertOnly);
  const fallbackStoreRecipients =
    bccList.length > 0 ? bccList : ['orders@samoweave.com'];

  const hasValidCustomerEmail = customerEmail.includes('@');
  const toList = isAdminAlertOnly
    ? fallbackStoreRecipients
    : hasValidCustomerEmail
    ? [customerEmail]
    : fallbackStoreRecipients;
  const effectiveBccList =
    !isAdminAlertOnly && hasValidCustomerEmail
      ? bccList.filter(
          (addr) => addr.toLowerCase() !== customerEmail.toLowerCase()
        )
      : [];

  const subjectLine = isAdminAlertOnly
    ? `Action Required: Verify ${paymentMethod} Payment — SAMO (#${orderRef})`
    : `Order Confirmed — SAMO (#${orderRef})`;

  const payload: {
    from: string;
    to: string[];
    bcc?: string[];
    reply_to?: string;
    subject: string;
    html: string;
    text: string;
  } = {
    from: fromField,
    to: toList,
    subject: subjectLine,
    html,
    text,
  };

  if (effectiveBccList.length > 0) {
    payload.bcc = effectiveBccList;
  }
  if (replyTo) {
    payload.reply_to = replyTo;
  }

  return payload;
}

/**
 * Orders the Homepage "New Arrivals" row for the selected department ('women' | 'kids').
 * For 'women', places "SAHARA CROC CRESCENT" 1st, keeps the previous 2nd item in 2nd position,
 * moves the previous 1st item to 3rd position, and moves the previous 3rd item to 4th position.
 */
export function orderHomeNewArrivalsProducts(
  products: ProductItem[],
  department: Department
): ProductItem[] {
  const rawNewArrivals = filterNewArrivalProducts(products).filter(
    (p) => p.department === department
  );

  if (department === 'women') {
    const saharaProduct = products.find(
      (p) =>
        p.department === 'women' &&
        p.name.trim().toLowerCase().includes('sahara croc crescent')
    );

    const listWithoutSahara = saharaProduct
      ? rawNewArrivals.filter((p) => p.id !== saharaProduct.id)
      : rawNewArrivals;

    const prevReordered =
      listWithoutSahara.length >= 3
        ? [
            listWithoutSahara[1],
            listWithoutSahara[2],
            listWithoutSahara[0],
            ...listWithoutSahara.slice(3),
          ]
        : listWithoutSahara;

    if (saharaProduct) {
      if (prevReordered.length >= 3) {
        return [
          saharaProduct,
          prevReordered[1],
          prevReordered[0],
          prevReordered[2],
          ...prevReordered.slice(3),
        ];
      }
      if (prevReordered.length === 2) {
        return [saharaProduct, prevReordered[1], prevReordered[0]];
      }
      return [saharaProduct, ...prevReordered];
    }

    return prevReordered;
  }

  if (rawNewArrivals.length >= 3) {
    return [
      rawNewArrivals[1],
      rawNewArrivals[2],
      rawNewArrivals[0],
      ...rawNewArrivals.slice(3),
    ];
  }
  return rawNewArrivals;
}

/**
 * Validates that a Google Apps Script Web App URL is a legitimate HTTPS Google Apps Script endpoint
 * to prevent SSRF or accidental malformed webhook destinations.
 */
export function isValidGoogleAppsScriptWebhookUrl(url?: string | null): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host !== 'script.google.com' &&
      host !== 'script.googleusercontent.com'
    ) {
      return false;
    }
    return parsed.pathname.startsWith('/macros/');
  } catch {
    return false;
  }
}

function formatGoogleSheetSizeSystem(
  sizeType: SizeType,
  sizes: string[]
): string {
  const firstSize = (sizes[0] || '').trim().toUpperCase();
  if (
    firstSize === 'OS' ||
    firstSize === 'ONE SIZE' ||
    (sizes.length === 1 && (firstSize === 'OS' || firstSize === 'ONE SIZE'))
  ) {
    return 'One Size';
  }
  if (sizeType === 'numeric') return 'EU Numeric';
  if (sizeType === 'years' || sizeType === 'cm') return 'Age-Years';
  if (sizeType === 'months') return 'Age-Months';
  return 'Alpha';
}

function normalizeSheetToken(val?: string | null): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeSheetColorOption(val?: string | null): string {
  const token = normalizeSheetToken(val);
  if (!token || token === 'NONE' || token === 'DEFAULT' || token === 'N/A' || token === '-') {
    return 'NONE';
  }
  return token;
}

function normalizeSheetSizeToken(val?: string | null): string {
  const token = normalizeSheetToken(val);
  if (token === 'ONE SIZE') return 'OS';
  return token;
}

export function parseGoogleSheetQuantity(
  rawQty: number | string | undefined | null
): number | null {
  if (rawQty === undefined || rawQty === null) return null;
  if (typeof rawQty === 'number') {
    if (!Number.isFinite(rawQty) || rawQty < 0) return null;
    return Math.floor(rawQty);
  }
  const str = String(rawQty).trim();
  if (!str) return null;
  if (!/^\d+(\.0+)?$/.test(str)) return null;
  const parsed = Number(str);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

export function parseGoogleSheetSellingPrice(
  rawPrice: number | string | undefined | null
): number | null {
  if (rawPrice === undefined || rawPrice === null) return null;
  if (typeof rawPrice === 'number') {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;
    return Math.round(rawPrice * 100) / 100;
  }
  const cleaned = String(rawPrice)
    .trim()
    .replace(/^\$/, '')
    .replace(/,/g, '')
    .replace(/\s*USD$/i, '')
    .trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

/**
 * Flattens the catalog into the exact 14-column SAMO_INVENTORY Google Sheet structure:
 * Col A: Product ID / SKU
 * Col B: Garment Code
 * Col C: Section (Women | KIDS)
 * Col D: Category
 * Col E: New Arrivals (YES | NO)
 * Col F: SAMO Product Name
 * Col G: Color Option (NONE or uppercase color name)
 * Col H: Size System (Alpha | EU Numeric | One Size | Age-Years | Age-Months)
 * Col I: Size
 * Col J: Quantity
 * Col K: Selling Price (USD) (e.g. $95.00)
 * Col L: Website Status (Live | Sold Out)
 */
export function buildGoogleSheetInventoryRows(
  products: ProductItem[]
): GoogleSheetInventoryRow[] {
  const rows: GoogleSheetInventoryRow[] = [];

  for (const prod of products) {
    if (!prod || !prod.id) continue;
    // Linked Full Sets derive their stock from their standalone pieces; keep standalone & unlinked items in sheet
    const hasLinkedSetPieces =
      Boolean(prod.isFullSet) &&
      Array.isArray(prod.setItems) &&
      prod.setItems.length > 0 &&
      prod.setItems.some((si) =>
        products.some((p) => p.id === si.productId && p.id !== prod.id)
      );
    if (hasLinkedSetPieces) continue;

    const section = prod.department === 'kids' ? 'KIDS' : 'Women';
    const newArrivals: 'YES' | 'NO' = prod.isNewArrival ? 'YES' : 'NO';
    const baseSku = prod.id.toUpperCase();
    const priceNum = Math.max(0, Number(prod.price) || 0);
    const sellingPriceFormatted = `$${priceNum.toFixed(2)}`;

    const hasColorVariants =
      Boolean(prod.hasColors) &&
      Array.isArray(prod.colorVariants) &&
      prod.colorVariants.length > 0;

    if (hasColorVariants) {
      for (const variant of prod.colorVariants || []) {
        const variantCode =
          cleanGarmentCode(variant.garmentCode) ||
          cleanGarmentCode(prod.garmentCode) ||
          '';
        const colorOption =
          normalizeSheetColorOption(variant.colorName) || 'NONE';
        const variantSizes =
          Array.isArray(variant.sizes) && variant.sizes.length > 0
            ? variant.sizes
            : Array.isArray(prod.sizes) && prod.sizes.length > 0
            ? prod.sizes
            : ['OS'];
        const sizeSystem = formatGoogleSheetSizeSystem(
          variant.sizeType || prod.sizeType || 'letter',
          variantSizes
        );

        for (const sz of variantSizes) {
          const rawQty =
            variant.sizeQuantities &&
            typeof variant.sizeQuantities[sz] === 'number'
              ? variant.sizeQuantities[sz]
              : 0;
          const qty = prod.inStock === false ? 0 : Math.max(0, Math.floor(rawQty));
          const websiteStatus: 'Live' | 'Sold Out' =
            qty > 0 ? 'Live' : 'Sold Out';

          rows.push({
            sku: baseSku,
            garmentCode: variantCode,
            section,
            category: prod.category || '',
            newArrivals,
            productName: prod.name,
            colorOption,
            sizeSystem,
            size: sz,
            quantity: qty,
            sellingPriceFormatted,
            sellingPrice: priceNum,
            websiteStatus,
            productId: prod.id,
          });
        }
      }
    } else {
      const prodCode = cleanGarmentCode(prod.garmentCode) || '';
      const prodSizes =
        Array.isArray(prod.sizes) && prod.sizes.length > 0
          ? prod.sizes
          : ['OS'];
      const sizeSystem = formatGoogleSheetSizeSystem(
        prod.sizeType || 'letter',
        prodSizes
      );

      for (const sz of prodSizes) {
        const rawQty =
          prod.sizeQuantities && typeof prod.sizeQuantities[sz] === 'number'
            ? prod.sizeQuantities[sz]
            : prodSizes.length === 1
            ? prod.quantity
            : 0;
        const qty = prod.inStock === false ? 0 : Math.max(0, Math.floor(rawQty));
        const websiteStatus: 'Live' | 'Sold Out' =
          qty > 0 ? 'Live' : 'Sold Out';

        rows.push({
          sku: baseSku,
          garmentCode: prodCode,
          section,
          category: prod.category || '',
          newArrivals,
          productName: prod.name,
          colorOption: 'NONE',
          sizeSystem,
          size: sz,
          quantity: qty,
          sellingPriceFormatted,
          sellingPrice: priceNum,
          websiteStatus,
          productId: prod.id,
        });
      }
    }
  }

  return rows;
}

/**
 * Applies single-row or multi-row updates from the 14-column SAMO_INVENTORY Google Sheet
 * back into the website catalog using a 3-tier smart matcher:
 *   Tier 1: (cleanGarmentCode + normalized Product Name + normalized Color Option + normalized Size)
 *   Tier 2: (normalized Product Name + normalized Color Option + normalized Size)
 *   Tier 3: (normalized Product ID / SKU + normalized Color Option + normalized Size)
 *
 * Includes strict anti-corruption safeguards:
 * - Never deletes any product, photo, description, discount, or category.
 * - Ignores blank, NaN, or negative numbers for Quantity or Price.
 * - Recomputes product.quantity, product.inStock, and runs synchronizeFullSetsWithLinkedProducts.
 */
export function applyGoogleSheetUpdatesToCatalog(
  products: ProductItem[],
  incomingRows: GoogleSheetIncomingUpdateRow[]
): {
  products: ProductItem[];
  updatedCount: number;
  matchedProductIds: string[];
} {
  if (!Array.isArray(products) || products.length === 0) {
    return { products: [], updatedCount: 0, matchedProductIds: [] };
  }
  if (!Array.isArray(incomingRows) || incomingRows.length === 0) {
    return { products, updatedCount: 0, matchedProductIds: [] };
  }

  // Deep clone products so mutations are pure
  const workingProducts: ProductItem[] = products.map((p) => ({
    ...p,
    sizes: Array.isArray(p.sizes) ? [...p.sizes] : [],
    sizeQuantities: { ...(p.sizeQuantities || {}) },
    colorVariants: Array.isArray(p.colorVariants)
      ? p.colorVariants.map((cv) => ({
          ...cv,
          sizes: Array.isArray(cv.sizes) ? [...cv.sizes] : [],
          sizeQuantities: { ...(cv.sizeQuantities || {}) },
        }))
      : [],
  }));

  let updatedCount = 0;
  const matchedProductIdsSet = new Set<string>();

  const doesProductHaveSizeAndColor = (
    prod: ProductItem,
    targetColorNorm: string,
    targetSizeNorm: string
  ): {
    matches: boolean;
    variantIndex: number;
    matchedSizeKey: string;
  } => {
    const hasVariants =
      Boolean(prod.hasColors) &&
      Array.isArray(prod.colorVariants) &&
      prod.colorVariants.length > 0;

    if (hasVariants && targetColorNorm !== 'NONE') {
      const vIdx = (prod.colorVariants || []).findIndex(
        (cv) => normalizeSheetColorOption(cv.colorName) === targetColorNorm
      );
      if (vIdx === -1) {
        return { matches: false, variantIndex: -1, matchedSizeKey: '' };
      }
      const variant = prod.colorVariants![vIdx];
      const vSizes =
        Array.isArray(variant.sizes) && variant.sizes.length > 0
          ? variant.sizes
          : prod.sizes;
      const foundSize = vSizes.find(
        (s) => normalizeSheetSizeToken(s) === targetSizeNorm
      );
      if (!foundSize && targetSizeNorm) {
        return { matches: false, variantIndex: -1, matchedSizeKey: '' };
      }
      return {
        matches: true,
        variantIndex: vIdx,
        matchedSizeKey: foundSize || vSizes[0] || 'OS',
      };
    }

    if (hasVariants && targetColorNorm === 'NONE') {
      return { matches: false, variantIndex: -1, matchedSizeKey: '' };
    }

    // Non-color product
    if (targetColorNorm !== 'NONE') {
      return { matches: false, variantIndex: -1, matchedSizeKey: '' };
    }
    const pSizes =
      Array.isArray(prod.sizes) && prod.sizes.length > 0 ? prod.sizes : ['OS'];
    const foundSize = pSizes.find(
      (s) => normalizeSheetSizeToken(s) === targetSizeNorm
    );
    if (!foundSize && targetSizeNorm) {
      return { matches: false, variantIndex: -1, matchedSizeKey: '' };
    }
    return {
      matches: true,
      variantIndex: -1,
      matchedSizeKey: foundSize || pSizes[0] || 'OS',
    };
  };

  for (const row of incomingRows) {
    if (!row || typeof row !== 'object') continue;

    const parsedQty = parseGoogleSheetQuantity(row.quantity);
    const parsedPrice = parseGoogleSheetSellingPrice(row.sellingPrice);

    // If neither a valid quantity nor a valid price is present, skip safely
    if (parsedQty === null && parsedPrice === null) {
      continue;
    }

    const rowCode = cleanGarmentCode(row.garmentCode);
    const rowNameNorm = normalizeSheetToken(row.productName);
    const rowColorNorm = normalizeSheetColorOption(row.colorOption);
    const rowSizeNorm = normalizeSheetSizeToken(row.size);
    const rowSkuNorm = normalizeSheetToken(row.productId || row.sku);

    let matchedProdIndex = -1;
    let matchedVariantIndex = -1;
    let matchedSizeKey = '';

    // Tier 1: (cleanGarmentCode + normalized Product Name + normalized Color Option + normalized Size)
    if (rowCode && rowNameNorm) {
      for (let i = 0; i < workingProducts.length; i++) {
        const prod = workingProducts[i];
        const prodNameNorm = normalizeSheetToken(prod.name);
        if (prodNameNorm !== rowNameNorm) continue;

        const prodBaseCode = cleanGarmentCode(prod.garmentCode);
        const variantHasCode = (prod.colorVariants || []).some(
          (cv) => cleanGarmentCode(cv.garmentCode) === rowCode
        );
        if (prodBaseCode !== rowCode && !variantHasCode) continue;

        const check = doesProductHaveSizeAndColor(
          prod,
          rowColorNorm,
          rowSizeNorm
        );
        if (check.matches) {
          matchedProdIndex = i;
          matchedVariantIndex = check.variantIndex;
          matchedSizeKey = check.matchedSizeKey;
          break;
        }
      }
    }

    // Tier 2: (normalized Product Name + normalized Color Option + normalized Size)
    if (matchedProdIndex === -1 && rowNameNorm) {
      for (let i = 0; i < workingProducts.length; i++) {
        const prod = workingProducts[i];
        if (normalizeSheetToken(prod.name) !== rowNameNorm) continue;
        const check = doesProductHaveSizeAndColor(
          prod,
          rowColorNorm,
          rowSizeNorm
        );
        if (check.matches) {
          matchedProdIndex = i;
          matchedVariantIndex = check.variantIndex;
          matchedSizeKey = check.matchedSizeKey;
          break;
        }
      }
    }

    // Tier 3: (normalized Product ID / SKU + normalized Color Option + normalized Size)
    if (matchedProdIndex === -1 && rowSkuNorm) {
      for (let i = 0; i < workingProducts.length; i++) {
        const prod = workingProducts[i];
        if (normalizeSheetToken(prod.id) !== rowSkuNorm) continue;
        const check = doesProductHaveSizeAndColor(
          prod,
          rowColorNorm,
          rowSizeNorm
        );
        if (check.matches) {
          matchedProdIndex = i;
          matchedVariantIndex = check.variantIndex;
          matchedSizeKey = check.matchedSizeKey;
          break;
        }
      }
    }

    // Fallback Tier 3B: If row only specified garmentCode + color + size (without product name)
    if (matchedProdIndex === -1 && rowCode && !rowNameNorm) {
      for (let i = 0; i < workingProducts.length; i++) {
        const prod = workingProducts[i];
        const prodBaseCode = cleanGarmentCode(prod.garmentCode);
        const variantHasCode = (prod.colorVariants || []).some(
          (cv) => cleanGarmentCode(cv.garmentCode) === rowCode
        );
        if (prodBaseCode !== rowCode && !variantHasCode) continue;
        const check = doesProductHaveSizeAndColor(
          prod,
          rowColorNorm,
          rowSizeNorm
        );
        if (check.matches) {
          matchedProdIndex = i;
          matchedVariantIndex = check.variantIndex;
          matchedSizeKey = check.matchedSizeKey;
          break;
        }
      }
    }

    if (matchedProdIndex === -1) continue;

    const targetProd = workingProducts[matchedProdIndex];
    let prodChanged = false;

    if (parsedPrice !== null && targetProd.price !== parsedPrice) {
      targetProd.price = parsedPrice;
      prodChanged = true;
    }

    if (parsedQty !== null && matchedSizeKey) {
      if (
        matchedVariantIndex >= 0 &&
        Array.isArray(targetProd.colorVariants) &&
        targetProd.colorVariants[matchedVariantIndex]
      ) {
        const variant = targetProd.colorVariants[matchedVariantIndex];
        const currentQty = variant.sizeQuantities?.[matchedSizeKey] ?? 0;
        if (currentQty !== parsedQty || (parsedQty > 0 && !targetProd.inStock)) {
          variant.sizeQuantities = {
            ...(variant.sizeQuantities || {}),
            [matchedSizeKey]: parsedQty,
          };
          prodChanged = true;
        }

        // Recompute aggregate sizeQuantities & total quantity across all colorVariants
        const aggSizeMap: Record<string, number> = {};
        let totalVariantQty = 0;
        for (const cv of targetProd.colorVariants) {
          for (const sz of cv.sizes || targetProd.sizes || []) {
            const q = Math.max(0, Math.floor(Number(cv.sizeQuantities?.[sz]) || 0));
            aggSizeMap[sz] = (aggSizeMap[sz] || 0) + q;
            totalVariantQty += q;
          }
        }
        targetProd.sizeQuantities = aggSizeMap;
        targetProd.quantity = totalVariantQty;
        targetProd.inStock = totalVariantQty > 0;
      } else {
        const currentQty = targetProd.sizeQuantities?.[matchedSizeKey] ?? 0;
        if (currentQty !== parsedQty || (parsedQty > 0 && !targetProd.inStock)) {
          targetProd.sizeQuantities = {
            ...(targetProd.sizeQuantities || {}),
            [matchedSizeKey]: parsedQty,
          };
          prodChanged = true;
        }
        let totalQty = 0;
        for (const sz of targetProd.sizes || [matchedSizeKey]) {
          totalQty += Math.max(
            0,
            Math.floor(Number(targetProd.sizeQuantities?.[sz]) || 0)
          );
        }
        targetProd.quantity = totalQty;
        targetProd.inStock = totalQty > 0;
      }
    }

    if (prodChanged) {
      targetProd.updatedAt = new Date().toISOString();
      updatedCount += 1;
      matchedProductIdsSet.add(targetProd.id);
    }
  }

  const syncedProducts =
    updatedCount > 0
      ? syncFullSetsWithCatalog(workingProducts)
      : workingProducts;

  return {
    products: syncedProducts,
    updatedCount,
    matchedProductIds: Array.from(matchedProductIdsSet),
  };
}

/**
 * Generates the ready-to-paste, security-hardened Google Apps Script for the 14-column
 * SAMO_INVENTORY Google Sheet.
 */
export function buildGoogleAppsScriptForSamoSheet(options: {
  siteOrigin: string;
  syncSecret: string;
}): string {
  const cleanOrigin = (options.siteOrigin || 'https://samoweave.com')
    .trim()
    .replace(/\/+$/, '');
  const cleanSecret = (options.syncSecret || 'samo_sheet_sync_v1_secret')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");

  return `/**
 * ============================================================================
 * SAMO — AUTOMATIC TWO-WAY GOOGLE SHEETS LIVE INVENTORY & PRICE SYNC
 * Tailored 100% to your 14-column SAMO_INVENTORY Google Sheet (Private Sheet)
 * ============================================================================
 *
 * HOW TO ACTIVATE (1-TIME SETUP — TAKES 60 SECONDS):
 * 1. In your private SAMO_INVENTORY Google Sheet, click Extensions -> Apps Script.
 * 2. Delete any placeholder code, paste this entire script, and click the Save icon.
 * 3. In the top toolbar dropdown (next to "Run"), select "setupAutomaticSyncTrigger"
 *    and click "Run" once (grant permission so edits in Quantity Col J or Price Col K
 *    automatically push to your website).
 * 4. Click "Deploy" (top right) -> "New deployment" -> Select type: "Web app":
 *    - Execute as: "Me" (keeps your Google Sheet 100% PRIVATE / RESTRICTED to you)
 *    - Who has access: "Anyone" (protected by your cryptographic SYNC_SECRET below)
 * 5. Copy the Web App URL (https://script.google.com/macros/s/.../exec) and paste it
 *    into your SAMO Admin Dashboard -> Google Sheets Live Sync card.
 */

const WEBSITE_SYNC_ENDPOINT = '${cleanOrigin}/api/sheets-sync';
const SYNC_SECRET = '${cleanSecret}';

function normToken_(val) {
  return String(val == null ? '' : val).trim().replace(/\\s+/g, ' ').toUpperCase();
}

function normColor_(val) {
  const t = normToken_(val);
  if (!t || t === 'NONE' || t === 'DEFAULT' || t === 'N/A' || t === '-') return 'NONE';
  return t;
}

function normSize_(val) {
  const t = normToken_(val);
  return t === 'ONE SIZE' ? 'OS' : t;
}

function normCode_(val) {
  return normToken_(val).replace(/^REF\\.?\\s*:?\\s*/i, '');
}

/**
 * 1-TIME TRIGGER INSTALLER: Run this function ONCE in Apps Script so that editing
 * Quantity (Col J) or Selling Price (Col K) in your sheet automatically updates your website.
 */
function setupAutomaticSyncTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onSamoSheetEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onSamoSheetEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
}

/**
 * AUTOMATIC SHEET -> WEBSITE SYNC:
 * Fires automatically whenever you edit Quantity (Col J / Col 10) or Selling Price (Col K / Col 11).
 */
function onSamoSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();
  const startCol = e.range.getColumn();
  const numCols = e.range.getNumColumns();

  // Watch Column J (10 = Quantity) and Column K (11 = Selling Price USD)
  const touchesQtyOrPrice =
    (startCol <= 11 && startCol + numCols - 1 >= 10);
  if (!touchesQtyOrPrice) return;

  const updates = [];
  for (let r = startRow; r < startRow + numRows; r++) {
    if (r <= 1) continue; // Skip header row 1
    const rowVals = sheet.getRange(r, 1, 1, 12).getValues()[0];
    const sku = String(rowVals[0] || '').trim();
    const garmentCode = String(rowVals[1] || '').trim();
    const productName = String(rowVals[5] || '').trim();
    const colorOption = String(rowVals[6] || 'NONE').trim() || 'NONE';
    const size = String(rowVals[8] || '').trim();
    const rawQty = rowVals[9];
    const rawPrice = rowVals[10];

    if (!productName && !garmentCode && !sku) continue;

    const qtyNum = Number(rawQty);
    if (Number.isFinite(qtyNum) && qtyNum >= 0) {
      const nextStatus = Math.floor(qtyNum) > 0 ? 'Live' : 'Sold Out';
      if (String(rowVals[11] || '').trim() !== nextStatus) {
        sheet.getRange(r, 12).setValue(nextStatus);
      }
    }

    updates.push({
      sku: sku,
      garmentCode: garmentCode,
      productName: productName,
      colorOption: colorOption,
      size: size,
      quantity: rawQty,
      sellingPrice: rawPrice
    });
  }

  if (updates.length === 0) return;

  UrlFetchApp.fetch(WEBSITE_SYNC_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Samo-Sheet-Secret': SYNC_SECRET },
    payload: JSON.stringify({
      action: 'inbound_sheet_edit',
      syncSecret: SYNC_SECRET,
      rows: updates
    }),
    muteHttpExceptions: true
  });
}

/**
 * AUTOMATIC WEBSITE -> SHEET SYNC (doPost):
 * Receives real-time stock deductions when a customer buys an item or when Admin edits
 * Quantity or Price, and supports pulling all rows from the sheet on demand.
 */
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.syncSecret !== SYNC_SECRET) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: 'Unauthorized sync secret' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    const lastRow = sheet.getLastRow();

    // Action 1: Website requests all current rows from Google Sheet
    if (body.action === 'read_sheet_rows') {
      const rows = [];
      if (lastRow >= 2) {
        const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
        for (let i = 0; i < data.length; i++) {
          const r = data[i];
          if (!r[0] && !r[1] && !r[5]) continue;
          rows.push({
            sku: String(r[0] || '').trim(),
            garmentCode: String(r[1] || '').trim(),
            productName: String(r[5] || '').trim(),
            colorOption: String(r[6] || 'NONE').trim() || 'NONE',
            size: String(r[8] || '').trim(),
            quantity: r[9],
            sellingPrice: r[10],
            websiteStatus: String(r[11] || '').trim()
          });
        }
      }
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, rows: rows })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Action 2: Website pushes updated catalog quantities & prices to Google Sheet
    const incomingRows = Array.isArray(body.rows) ? body.rows : [];
    if (incomingRows.length === 0) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, updatedRows: 0 })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (lastRow === 0) {
      sheet.appendRow([
        'Product ID / SKU',
        'Garment Code',
        'Section',
        'Category',
        'New Arrivals',
        'SAMO Product Name',
        'Color Option',
        'Size System',
        'Size',
        'Quantity',
        'Selling Price (USD)',
        'Website Status',
        'Editorial Model Reference',
        'Notes / Description'
      ]);
    }

    const currentLastRow = sheet.getLastRow();
    const existingData =
      currentLastRow >= 2
        ? sheet.getRange(2, 1, currentLastRow - 1, 12).getValues()
        : [];

    let updatedCount = 0;
    let appendedCount = 0;

    for (let i = 0; i < incomingRows.length; i++) {
      const item = incomingRows[i];
      const itemCode = normCode_(item.garmentCode);
      const itemName = normToken_(item.productName);
      const itemColor = normColor_(item.colorOption);
      const itemSize = normSize_(item.size);
      const itemSku = normToken_(item.sku || item.productId);

      let matchedRowIdx = -1;

      // Tier 1: Garment Code + Product Name + Color Option + Size
      for (let r = 0; r < existingData.length; r++) {
        const row = existingData[r];
        if (
          itemCode &&
          normCode_(row[1]) === itemCode &&
          normToken_(row[5]) === itemName &&
          normColor_(row[6]) === itemColor &&
          normSize_(row[8]) === itemSize
        ) {
          matchedRowIdx = r;
          break;
        }
      }

      // Tier 2: Product Name + Color Option + Size
      if (matchedRowIdx === -1) {
        for (let r = 0; r < existingData.length; r++) {
          const row = existingData[r];
          if (
            normToken_(row[5]) === itemName &&
            normColor_(row[6]) === itemColor &&
            normSize_(row[8]) === itemSize
          ) {
            matchedRowIdx = r;
            break;
          }
        }
      }

      // Tier 3: SKU + Color Option + Size
      if (matchedRowIdx === -1 && itemSku) {
        for (let r = 0; r < existingData.length; r++) {
          const row = existingData[r];
          if (
            normToken_(row[0]) === itemSku &&
            normColor_(row[6]) === itemColor &&
            normSize_(row[8]) === itemSize
          ) {
            matchedRowIdx = r;
            break;
          }
        }
      }

      const nextQty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const nextPriceFormatted =
        item.sellingPriceFormatted ||
        ('$' + Number(item.sellingPrice || 0).toFixed(2));
      const nextStatus = nextQty > 0 ? 'Live' : 'Sold Out';

      if (matchedRowIdx !== -1) {
        const sheetRowNumber = matchedRowIdx + 2;
        const currQty = Number(existingData[matchedRowIdx][9]);
        const currPriceStr = String(existingData[matchedRowIdx][10] || '').trim();
        const currStatusStr = String(existingData[matchedRowIdx][11] || '').trim();
        const currPriceNum = Number(currPriceStr.replace(/^\\$/, '').replace(/,/g, ''));

        if (
          currQty !== nextQty ||
          currPriceNum !== Number(item.sellingPrice) ||
          currStatusStr !== nextStatus
        ) {
          // Only update Col J (10), Col K (11), Col L (12) — preserves Col A SKU and Col M/N notes!
          sheet
            .getRange(sheetRowNumber, 10, 1, 3)
            .setValues([[nextQty, nextPriceFormatted, nextStatus]]);
          existingData[matchedRowIdx][9] = nextQty;
          existingData[matchedRowIdx][10] = nextPriceFormatted;
          existingData[matchedRowIdx][11] = nextStatus;
          updatedCount++;
        }
      } else {
        // Brand-new product/size added in Admin Dashboard -> append cleanly at bottom
        const newRow = [
          item.sku || item.productId || '',
          item.garmentCode || '',
          item.section || 'Women',
          item.category || '',
          item.newArrivals || 'NO',
          item.productName || '',
          item.colorOption || 'NONE',
          item.sizeSystem || 'Alpha',
          item.size || 'OS',
          nextQty,
          nextPriceFormatted,
          nextStatus,
          '',
          ''
        ];
        sheet.appendRow(newRow);
        existingData.push(newRow.slice(0, 12));
        appendedCount++;
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        updatedRows: updatedCount,
        appendedRows: appendedCount
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}

