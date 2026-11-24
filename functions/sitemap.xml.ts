import type { CategoryItem, ProductItem } from '../src/types/samo.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
} from '../src/data/seedCatalog.ts';
import {
  buildCategoryUrl,
  buildProductUrl,
} from '../src/utils/catalogLogic.ts';
import { readCatalogSnapshot, type Env } from './api/catalog.ts';

const SITE_ORIGIN = 'https://samoweave.com';

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(raw?: string): string {
  if (raw && typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function buildSitemapXml(
  categories: CategoryItem[],
  products: ProductItem[]
): string {
  const today = new Date().toISOString().slice(0, 10);
  const seenUrls = new Set<string>();
  const entries: Array<{
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: string;
  }> = [];

  const pushEntry = (
    path: string,
    priority: string,
    changefreq: string,
    lastmod = today
  ) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl =
      cleanPath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${cleanPath}`;
    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);
    entries.push({
      loc: fullUrl,
      lastmod,
      changefreq,
      priority,
    });
  };

  // 1. Core Storefront Pages
  pushEntry('/home', '1.0', 'daily');
  pushEntry('/women', '0.9', 'daily');
  pushEntry('/kids', '0.9', 'daily');
  pushEntry('/new-arrivals/women', '0.9', 'daily');
  pushEntry('/new-arrivals/kids', '0.9', 'daily');
  pushEntry('/gifts', '0.8', 'weekly');
  pushEntry('/showroom', '0.8', 'monthly');
  pushEntry('/refund-policy', '0.7', 'monthly');
  pushEntry('/exchange-policy', '0.7', 'monthly');
  pushEntry('/shipping-policy', '0.7', 'monthly');
  pushEntry('/faq', '0.7', 'monthly');

  // 2. Active Women & Kids Category Pages
  const activeCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : INITIAL_CATEGORIES;

  for (const cat of activeCategories) {
    if (!cat || !cat.name || cat.active === false) continue;
    const dept = cat.department === 'kids' ? 'kids' : 'women';
    const catPath = buildCategoryUrl(`/${dept}`, cat.name);
    pushEntry(catPath, '0.8', 'daily', toIsoDate(cat.createdAt));
  }

  // 3. Individual Product Pages
  const activeProducts = Array.isArray(products) && products.length > 0
    ? products
    : INITIAL_PRODUCTS;

  for (const prod of activeProducts) {
    if (!prod || !prod.id || !prod.name) continue;
    const prodPath = buildProductUrl(prod);
    pushEntry(
      prodPath,
      '0.7',
      'weekly',
      toIsoDate(prod.updatedAt || prod.createdAt)
    );
  }

  const urlNodes = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${escapeXml(e.lastmod)}</lastmod>
    <changefreq>${escapeXml(e.changefreq)}</changefreq>
    <priority>${escapeXml(e.priority)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;
}

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  try {
    const snapshot = await readCatalogSnapshot(context.env);
    const categories =
      Array.isArray(snapshot.categories) && snapshot.categories.length > 0
        ? (snapshot.categories as CategoryItem[])
        : INITIAL_CATEGORIES;
    const products =
      Array.isArray(snapshot.products) && snapshot.products.length > 0
        ? (snapshot.products as ProductItem[])
        : INITIAL_PRODUCTS;

    const xml = buildSitemapXml(categories, products);
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    const xml = buildSitemapXml(INITIAL_CATEGORIES, INITIAL_PRODUCTS);
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};
