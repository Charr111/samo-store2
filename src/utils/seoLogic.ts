import {
  CategoryItem,
  Department,
  ProductItem,
  RoutePath,
  SeoConfigState,
  SiteBannersConfig,
} from '../types/samo';
import {
  buildCategoryUrl,
  buildProductUrl,
  createSafeSlug,
  getCategoriesByDepartment,
  getEffectiveProductPrice,
  normalizeKidsCategoryName,
} from './catalogLogic';

export const SAMO_CANONICAL_DOMAIN = 'https://samoweave.com';

export const LUXURY_FASHION_CORE_KEYWORDS: readonly string[] = [
  'SAMO',
  'luxury fashion house',
  'architectural ready-to-wear',
  'Italian cow leather jacket',
  'calf suede trench coat',
  'luxury women outerwear',
  'couture tailoring',
  'designer leather bags',
  'luxury kids wear',
  'precision centimeter sizing',
  'fine leather Samo',
  'sport chic luxury',
  'Beirut Paris Milan luxury fashion',
];

/**
 * Formats a category name strictly for browser tab titles (<title>):
 * - Strips age suffixes ("1 To 5", "6+", "13+") from Kids subcategories while keeping on-page category names unchanged
 * - Converts Kids subcategory names ("MINIS", "CHILDREN", "Teen") to clean Title Case ("Minis", "Children", "Teen")
 */
export function formatCategoryNameForTabTitle(
  department: Department | string,
  categoryName: string
): string {
  const raw = (categoryName || '').trim();
  if (!raw) return '';
  if (department === 'kids') {
    const normalized = normalizeKidsCategoryName(raw);
    const stripped = normalized
      .replace(/\b1\s*to\s*5\b/gi, '')
      .replace(/\b6\s*\+/g, '')
      .replace(/\b13\s*\+/g, '')
      .replace(/\(\s*\)/g, '')
      .trim();
    const baseWord = stripped || normalized;
    return baseWord
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return raw;
}

/**
 * Generates an industry-standard fashion SEO alt attribute for any product or editorial image
 * (without "Est. 1999" or "Luxury").
 */
export function buildProductImageSeoAlt(params: {
  name?: string;
  alt?: string;
  department?: Department | string;
  category?: string;
  style?: string;
  materials?: string[];
  colorName?: string;
}): string {
  const rawName = (params.name || params.alt || '').trim();
  if (!rawName) {
    return 'SAMO — Architectural Ready-to-Wear, Fine Leather, Suede & Fur';
  }

  // If the alt text already includes the full SAMO SEO signature, return as-is (stripped of Est. 1999 / Luxury)
  if (rawName.includes('SAMO') && rawName.includes('Ready-to-Wear')) {
    return rawName
      .replace(/\s*\(Est\.\s*1999\)/gi, '')
      .replace(/\bLuxury\s+/gi, '')
      .trim();
  }

  const deptLabel =
    params.department === 'kids'
      ? 'SAMO Kids'
      : params.department === 'women'
      ? 'SAMO Women'
      : 'SAMO';

  const catLabel = (params.category || '').trim();
  const styleLabel = (params.style || '').trim();
  const colorLabel = (params.colorName || '').trim();
  const materialsList = Array.isArray(params.materials)
    ? params.materials.map((m) => m.trim()).filter(Boolean)
    : [];

  const parts: string[] = [`${deptLabel}${catLabel ? ` ${catLabel}` : ''}`];
  parts.push(colorLabel ? `${rawName} (${colorLabel})` : rawName);

  if (materialsList.length > 0) {
    parts.push(`Crafted in ${materialsList.slice(0, 3).join(', ')}`);
  }
  if (styleLabel) {
    parts.push(`${styleLabel} Ready-to-Wear`);
  } else {
    parts.push('Architectural Ready-to-Wear');
  }
  parts.push('SAMO');

  return parts.join(' — ');
}

/**
 * Scans all products, categories, and banners to build a complete, up-to-date SEO & Image Metadata state.
 * Triggered automatically or via the Admin Dashboard's one-click "Update Website SEO & Image Metadata" button.
 */
export function generateCatalogSeoSnapshot(
  products: ProductItem[],
  categories: CategoryItem[],
  siteBanners?: SiteBannersConfig,
  customKeywords?: string[]
): SeoConfigState {
  const activeCoreKeywords =
    Array.isArray(customKeywords)
      ? Array.from(
          new Set(customKeywords.map((k) => k.trim()).filter(Boolean))
        )
      : [...LUXURY_FASHION_CORE_KEYWORDS];

  const productSeoMap: SeoConfigState['productSeoMap'] = {};
  const categorySeoMap: SeoConfigState['categorySeoMap'] = {};
  let totalImagesIndexed = 0;

  // 1. Index all categories (Women & Kids)
  const womenCats = getCategoriesByDepartment(categories, 'women');
  const kidsCats = getCategoriesByDepartment(categories, 'kids');
  const allValidCategories = [...womenCats, ...kidsCats];

  for (const cat of allValidCategories) {
    const deptTitle = cat.department === 'kids' ? 'SAMO Kids' : 'SAMO Women';
    const deptTabPrefix = cat.department === 'kids' ? 'Kids' : 'Women';
    const cleanName =
      cat.department === 'kids'
        ? normalizeKidsCategoryName(cat.name)
        : cat.name.trim();
    const cleanTabCategory = formatCategoryNameForTabTitle(
      cat.department,
      cleanName
    );
    const slug = createSafeSlug(cleanName);
    const key = `${cat.department}:${slug}`;
    const canonicalPath = buildCategoryUrl(cat.department, cleanName);

    const matchingProducts = products.filter(
      (p) =>
        p.department === cat.department &&
        (cat.department === 'kids'
          ? normalizeKidsCategoryName(p.category).toLowerCase() ===
            cleanName.toLowerCase()
          : p.category.trim().toLowerCase() === cleanName.toLowerCase())
    );

    const materialSet = new Set<string>();
    for (const mp of matchingProducts) {
      for (const m of mp.materials || []) {
        if (m.trim()) materialSet.add(m.trim());
      }
    }
    const topMaterials = Array.from(materialSet).slice(0, 4);

    const title = `${deptTabPrefix}, ${cleanTabCategory} — Official Website | SAMO`;
    const description =
      cat.description && cat.description.trim().length > 20
        ? `${cat.description.trim()} Explore ${matchingProducts.length || 'exclusive'} pieces in ${
            topMaterials.length > 0
              ? topMaterials.join(', ')
              : 'Italian cow leather, suede, cashmere, and silk'
          } at SAMO.`
        : `Discover ${deptTitle} ${cleanName}. Architectural silhouettes tailored in ${
            topMaterials.length > 0
              ? topMaterials.join(', ')
              : 'fine leather, brushed suede, and couture fabrics'
          }.`;

    const keywords = Array.from(
      new Set([
        `SAMO ${cleanName}`,
        `${deptTitle} ${cleanName}`,
        `${cleanName.toLowerCase()}`,
        ...topMaterials.map((m) => `${m.toLowerCase()} ${cleanName.toLowerCase()}`),
        'SAMO',
        'architectural fashion',
        ...activeCoreKeywords.slice(0, 6),
      ])
    );

    categorySeoMap[key] = {
      title,
      description: description.slice(0, 160),
      keywords,
      canonicalPath,
    };
  }

  // 2. Index all products and count all product + variant + gallery images
  for (const prod of products) {
    const deptTitle = prod.department === 'kids' ? 'SAMO Kids' : 'SAMO Women';
    const { effectivePrice, hasDiscount, discountBadge } =
      getEffectiveProductPrice(prod);
    const materialsText =
      Array.isArray(prod.materials) && prod.materials.length > 0
        ? prod.materials.join(', ')
        : 'SAMO Weave Fabrics';
    const colorNames = Array.isArray(prod.colorVariants)
      ? prod.colorVariants.map((v) => v.colorName).filter(Boolean)
      : [];

    const imageAlt = buildProductImageSeoAlt({
      name: prod.name,
      department: prod.department,
      category: prod.category,
      style: prod.style,
      materials: prod.materials,
      colorName: colorNames[0],
    });

    const title = `${prod.name} — Official Website | SAMO`;
    const priceSnippet = hasDiscount
      ? `$${effectivePrice.toLocaleString()} (${discountBadge})`
      : `$${effectivePrice.toLocaleString()}`;
    const rawDesc =
      prod.description && prod.description.trim()
        ? prod.description.trim()
        : `${prod.name} by ${deptTitle}. Crafted in ${materialsText}.`;

    const description = `${rawDesc} ${priceSnippet} · ${materialsText}. Shop authentic SAMO ready-to-wear.`.slice(
      0,
      160
    );

    const keywords = Array.from(
      new Set([
        prod.name,
        `SAMO ${prod.category}`,
        `${deptTitle} ${prod.category}`,
        `${prod.style} ${prod.category}`,
        ...(prod.materials || []).map((m) => `${m} ${prod.category}`),
        ...colorNames.map((c) => `${c} ${prod.name}`),
        'SAMO',
        ...activeCoreKeywords.slice(0, 5),
      ])
    );

    productSeoMap[prod.id] = {
      title,
      description,
      keywords,
      imageAlt,
      canonicalPath: buildProductUrl(prod),
    };

    if (prod.imageUrl) totalImagesIndexed += 1;
    if (Array.isArray(prod.galleryUrls)) {
      totalImagesIndexed += prod.galleryUrls.filter(Boolean).length;
    }
    if (Array.isArray(prod.colorVariants)) {
      for (const cv of prod.colorVariants) {
        if (cv.imageUrl) totalImagesIndexed += 1;
        if (Array.isArray(cv.galleryUrls)) {
          totalImagesIndexed += cv.galleryUrls.filter(Boolean).length;
        }
      }
    }
  }

  if (siteBanners) {
    totalImagesIndexed += 5; // Hero, middle, and bottom editorial banners
    if (siteBanners.categoryBanners) {
      totalImagesIndexed += Object.values(siteBanners.categoryBanners).filter(
        (b) => b && b.enabled && b.imageUrl
      ).length;
    }
  }

  return {
    lastUpdatedAt: new Date().toISOString(),
    siteTitleSuffix: 'Official Website | SAMO',
    defaultDescription:
      'SAMO — Architectural ready-to-wear for Women and Kids. Discover Classic, Sport Chic, Fine Leather, Suede, Fur, Bags, and Belts.',
    defaultKeywords: activeCoreKeywords,
    customKeywords: activeCoreKeywords,
    indexedProductsCount: products.length,
    indexedCategoriesCount: allValidCategories.length,
    indexedImagesCount: totalImagesIndexed,
    productSeoMap,
    categorySeoMap,
  };
}

export interface DynamicPageSeoResult {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  ogType: 'website' | 'product';
  jsonLd: Record<string, unknown>;
}

/**
 * Computes dynamic route, category, and product SEO metadata + Schema.org JSON-LD.
 */
export function buildDynamicPageSeo(params: {
  route: RoutePath;
  selectedCategory: string;
  activeProduct?: ProductItem | null;
  categories: CategoryItem[];
  products: ProductItem[];
  seoConfig?: SeoConfigState | null;
}): DynamicPageSeoResult {
  const {
    route,
    selectedCategory,
    activeProduct,
    categories,
    products,
    seoConfig,
  } = params;

  const baseImage = `${SAMO_CANONICAL_DOMAIN}/assets/aistudio/women_jacket_black_leather_biker_ebca0f57.png`;

  // 1. If a Product Pop-Up Modal is open, prioritize Product-level SEO & Schema.org Product JSON-LD
  if (activeProduct) {
    const { effectivePrice, originalPrice, hasDiscount } =
      getEffectiveProductPrice(activeProduct);
    const snap = seoConfig?.productSeoMap?.[activeProduct.id];
    const deptLabel =
      activeProduct.department === 'kids' ? 'SAMO Kids' : 'SAMO Women';
    const title = `${activeProduct.name} — Official Website | SAMO`;
    const description =
      snap?.description ||
      `${activeProduct.description || activeProduct.name} — Crafted in ${(
        activeProduct.materials || []
      ).join(', ')}. $${effectivePrice.toLocaleString()} at SAMO.`.slice(
        0,
        160
      );
    const keywordsList = snap?.keywords || [
      activeProduct.name,
      `SAMO ${activeProduct.category}`,
      ...(activeProduct.materials || []),
      ...LUXURY_FASHION_CORE_KEYWORDS.slice(0, 6),
    ];
    const canonicalUrl = `${SAMO_CANONICAL_DOMAIN}${buildProductUrl(
      activeProduct
    )}`;
    const productImg =
      activeProduct.imageUrl && activeProduct.imageUrl.startsWith('http')
        ? activeProduct.imageUrl
        : baseImage;

    return {
      title,
      description,
      keywords: keywordsList.join(', '),
      canonicalUrl,
      ogTitle: title,
      ogDescription: description,
      ogUrl: canonicalUrl,
      ogImage: productImg,
      ogType: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${SAMO_CANONICAL_DOMAIN}/#organization`,
            name: 'SAMO',
            alternateName: 'SAMO House',
            foundingDate: '1999',
            url: SAMO_CANONICAL_DOMAIN,
          },
          {
            '@type': 'Product',
            '@id': canonicalUrl,
            name: activeProduct.name,
            description: activeProduct.description || description,
            sku: activeProduct.id,
            category: `${deptLabel} > ${activeProduct.category}`,
            material: (activeProduct.materials || []).join(', '),
            image: [productImg],
            brand: {
              '@type': 'Brand',
              name: 'SAMO',
            },
            offers: {
              '@type': 'Offer',
              url: canonicalUrl,
              priceCurrency: 'USD',
              price: effectivePrice,
              ...(hasDiscount
                ? {
                    priceSpecification: {
                      '@type': 'UnitPriceSpecification',
                      price: effectivePrice,
                      priceCurrency: 'USD',
                      referenceQuantity: {
                        '@type': 'QuantitativeValue',
                        value: originalPrice,
                      },
                    },
                  }
                : {}),
              availability: activeProduct.inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              itemCondition: 'https://schema.org/NewCondition',
            },
          },
        ],
      },
    };
  }

  // 2. Category-specific SEO on /women or /kids
  if (
    (route === '/women' || route === '/kids') &&
    selectedCategory &&
    selectedCategory.toLowerCase() !== 'all'
  ) {
    const dept: Department = route === '/kids' ? 'kids' : 'women';
    const cleanCat =
      dept === 'kids'
        ? normalizeKidsCategoryName(selectedCategory)
        : selectedCategory.trim();
    const cleanTabCategory = formatCategoryNameForTabTitle(dept, cleanCat);
    const slug = createSafeSlug(cleanCat);
    const key = `${dept}:${slug}`;
    const snap = seoConfig?.categorySeoMap?.[key];
    const matchedCat = getCategoriesByDepartment(categories, dept).find(
      (c) => c.name.toLowerCase() === cleanCat.toLowerCase()
    );

    const deptTitle = dept === 'kids' ? 'SAMO Kids' : 'SAMO Women';
    const deptTabPrefix = dept === 'kids' ? 'Kids' : 'Women';
    const title = `${deptTabPrefix}, ${cleanTabCategory} — Official Website | SAMO`;
    const description =
      snap?.description ||
      matchedCat?.description ||
      `Explore ${deptTitle} ${cleanCat} at SAMO. Architectural ready-to-wear in Italian cow leather, calf suede, cashmere, and silk.`;
    const keywords = (
      snap?.keywords || [
        `SAMO ${cleanCat}`,
        `${deptTitle} ${cleanCat}`,
        ...LUXURY_FASHION_CORE_KEYWORDS.slice(0, 8),
      ]
    ).join(', ');
    const canonicalUrl = `${SAMO_CANONICAL_DOMAIN}${buildCategoryUrl(
      dept,
      cleanCat
    )}`;

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogTitle: title,
      ogDescription: description,
      ogUrl: canonicalUrl,
      ogImage: baseImage,
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: canonicalUrl,
        isPartOf: {
          '@type': 'WebSite',
          name: 'SAMO',
          url: SAMO_CANONICAL_DOMAIN,
        },
      },
    };
  }

  // 3. Route-level SEO (/home, /women, /kids, /new-arrivals, /gifts, /showroom, /admin)
  const newArrivalsSubdept =
    route === '/new-arrivals' &&
    selectedCategory &&
    selectedCategory.toLowerCase() === 'kids'
      ? 'Kids, New Arrivals — Official Website | SAMO'
      : route === '/new-arrivals' &&
        selectedCategory &&
        selectedCategory.toLowerCase() === 'women'
      ? 'Women, New Arrivals — Official Website | SAMO'
      : 'New Arrivals — Official Website | SAMO';

  const routeMetaMap: Record<
    RoutePath,
    { title: string; description: string; path: string }
  > = {
    '/home': {
      title: 'Official Website | SAMO',
      description: (
        seoConfig?.defaultDescription ||
        'SAMO — Architectural ready-to-wear for Women and Kids. Discover Classic, Sport Chic, Fine Leather, Suede, Fur, Bags, and Belts.'
      ).replace(/\s*\(Est\.\s*1999\)/gi, ''),
      path: '/home',
    },
    '/women': {
      title: 'Women — Official Website | SAMO',
      description:
        'Shop SAMO Women ready-to-wear: architectural Italian cow leather biker jackets, oversized calf suede trench coats, full sets, silk tops, fur coats, and signature bags.',
      path: '/women',
    },
    '/kids': {
      title: 'Kids — Official Website | SAMO',
      description:
        'Explore SAMO Kids architectural outerwear, cashmere knit sets, leather bombers, and tailored denim graded in precision centimeter sizing (80 cm – 160 cm).',
      path: '/kids',
    },
    '/new-arrivals': {
      title: newArrivalsSubdept,
      description:
        'Discover the latest SAMO arrivals for Women and Kids in vegetable-tanned leather, cognac calf suede, shearling fur, and heavy silk.',
      path: '/new-arrivals',
    },
    '/gifts': {
      title: 'Gifts — Official Website | SAMO',
      description:
        'Curated gifts from SAMO: concave top-handle leather bags, Rodeo totes, and Italian cow leather belts with brushed palladium hardware.',
      path: '/gifts',
    },
    '/showroom': {
      title: 'Showroom — Official Website | SAMO',
      description:
        'Visit the SAMO flagship showroom for private fittings, bespoke leather and fur consultations, and same-day showroom pickup reservations.',
      path: '/showroom',
    },
    '/admin': {
      title: 'SAMO Admin Portal | Catalog, Inventory & SEO Management',
      description: 'SAMO internal management portal.',
      path: '/admin',
    },
  };

  const chosen = routeMetaMap[route] || routeMetaMap['/home'];
  const canonicalUrl = `${SAMO_CANONICAL_DOMAIN}${chosen.path}`;

  return {
    title: chosen.title,
    description: chosen.description,
    keywords: (seoConfig?.defaultKeywords || LUXURY_FASHION_CORE_KEYWORDS).join(
      ', '
    ),
    canonicalUrl,
    ogTitle: chosen.title,
    ogDescription: chosen.description,
    ogUrl: canonicalUrl,
    ogImage: baseImage,
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${SAMO_CANONICAL_DOMAIN}/#organization`,
          name: 'SAMO',
          alternateName: 'SAMO — Architectural Luxury Fashion House',
          foundingDate: '1999',
          url: SAMO_CANONICAL_DOMAIN,
        },
        {
          '@type': 'WebSite',
          '@id': `${SAMO_CANONICAL_DOMAIN}/#website`,
          url: SAMO_CANONICAL_DOMAIN,
          name: 'SAMO',
          description: chosen.description,
          publisher: {
            '@id': `${SAMO_CANONICAL_DOMAIN}/#organization`,
          },
        },
        {
          '@type': 'CollectionPage',
          '@id': canonicalUrl,
          name: chosen.title,
          description: chosen.description,
          url: canonicalUrl,
          numberOfItems: products.length,
        },
      ],
    },
  };
}

/**
 * Applies the computed SEO tags and Schema.org JSON-LD directly to document.head in real time.
 */
export function applyDocumentSeoTags(seo: DynamicPageSeoResult): void {
  if (typeof document === 'undefined') return;

  document.title = seo.title;

  const setMetaTag = (
    attrName: 'name' | 'property',
    attrValue: string,
    content: string
  ) => {
    let el = document.head.querySelector(
      `meta[${attrName}="${attrValue}"]`
    ) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaTag('name', 'description', seo.description);
  setMetaTag('name', 'keywords', seo.keywords);
  setMetaTag('property', 'og:title', seo.ogTitle);
  setMetaTag('property', 'og:description', seo.ogDescription);
  setMetaTag('property', 'og:url', seo.ogUrl);
  setMetaTag('property', 'og:image', seo.ogImage);
  setMetaTag('property', 'og:type', seo.ogType);
  setMetaTag('name', 'twitter:title', seo.ogTitle);
  setMetaTag('name', 'twitter:description', seo.ogDescription);
  setMetaTag('name', 'twitter:image', seo.ogImage);

  let canonicalEl = document.head.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', seo.canonicalUrl);

  let scriptEl = document.getElementById(
    'samo-dynamic-jsonld'
  ) as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'samo-dynamic-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(seo.jsonLd);
}
