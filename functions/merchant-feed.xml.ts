import type { ProductItem, SiteBannersConfig } from '../src/types/samo.ts';
import { INITIAL_PRODUCTS } from '../src/data/seedCatalog.ts';
import {
  buildProductUrl,
  getEffectiveProductPrice,
  sumSizeQuantities,
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

function resolveAbsoluteMediaUrl(url: string | undefined): string {
  const clean = (url || '').trim();
  if (!clean || clean.startsWith('studio://') || clean.startsWith('data:')) {
    return 'https://images.samoweave.com/logo/samo-favicon-S.png';
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return clean.startsWith('/')
    ? `${SITE_ORIGIN}${clean}`
    : `${SITE_ORIGIN}/${clean}`;
}

export interface MerchantFeedShippingSettings {
  shippingFeeEnabled?: boolean;
  standardDeliveryFee?: number;
  freeShippingThreshold?: number;
}

export function buildGoogleMerchantFeedXml(
  products: ProductItem[],
  shippingSettings?: MerchantFeedShippingSettings | null
): string {
  const activeProducts =
    Array.isArray(products) && products.length > 0
      ? products
      : INITIAL_PRODUCTS;

  const isShippingFeeEnabled =
    typeof shippingSettings?.shippingFeeEnabled === 'boolean'
      ? shippingSettings.shippingFeeEnabled
      : true;
  const standardDeliveryFee =
    typeof shippingSettings?.standardDeliveryFee === 'number' &&
    Number.isFinite(shippingSettings.standardDeliveryFee) &&
    shippingSettings.standardDeliveryFee >= 0
      ? Math.round(shippingSettings.standardDeliveryFee * 100) / 100
      : 6;
  const freeShippingThreshold =
    typeof shippingSettings?.freeShippingThreshold === 'number' &&
    Number.isFinite(shippingSettings.freeShippingThreshold) &&
    shippingSettings.freeShippingThreshold >= 0
      ? Math.round(shippingSettings.freeShippingThreshold * 100) / 100
      : 80;

  const computeShippingFeeForPrice = (effectivePrice: number): string => {
    if (!isShippingFeeEnabled || standardDeliveryFee <= 0) {
      return '0.00 USD';
    }
    if (freeShippingThreshold > 0 && effectivePrice >= freeShippingThreshold) {
      return '0.00 USD';
    }
    return `${standardDeliveryFee.toFixed(2)} USD`;
  };

  const itemBlocks: string[] = [];
  const seenItemIds = new Set<string>();

  const allocateUniqueItemId = (rawCandidate: string): string => {
    const base =
      rawCandidate
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'samo-item';
    let candidate = base.slice(0, 50);
    let counter = 2;
    while (seenItemIds.has(candidate.toLowerCase())) {
      const suffix = `-${counter}`;
      candidate = `${base.slice(0, 50 - suffix.length)}${suffix}`;
      counter += 1;
    }
    seenItemIds.add(candidate.toLowerCase());
    return candidate;
  };

  for (const prod of activeProducts) {
    if (!prod || !prod.id || !prod.name || prod.hiddenFromStore) continue;

    const prodPath = buildProductUrl(prod);
    const prodLink = `${SITE_ORIGIN}${prodPath}`;
    const priceInfo = getEffectiveProductPrice(prod);
    const originalPriceUsd = `${Math.max(0, Number(prod.price) || 0).toFixed(2)} USD`;
    const effectivePriceUsd = `${Math.max(0, priceInfo.effectivePrice).toFixed(2)} USD`;
    const hasSaleDiscount =
      priceInfo.hasDiscount && priceInfo.effectivePrice < prod.price;

    const shippingPriceUsd = computeShippingFeeForPrice(
      priceInfo.effectivePrice
    );

    const isKids = prod.department === 'kids';
    const catLower = (prod.category || '').toLowerCase();
    const ageGroup = isKids
      ? catLower.includes('minis') || catLower.includes('baby')
        ? 'toddler'
        : 'kids'
      : 'adult';
    const gender = isKids ? 'unisex' : 'female';
    const deptLabel = isKids ? 'Kids' : 'Women';
    const productType = `${deptLabel} > ${prod.category || 'Apparel'}`;
    const materialStr =
      Array.isArray(prod.materials) && prod.materials.length > 0
        ? prod.materials.join(' / ')
        : '';
    const cleanDescription =
      (prod.description || '').trim() ||
      `SAMO ${prod.name} — architectural ${deptLabel.toLowerCase()} ${
        prod.category || 'collection'
      } crafted with enduring proportions.`;

    const baseGroupId = prod.id.trim();

    if (
      prod.hasColors &&
      Array.isArray(prod.colorVariants) &&
      prod.colorVariants.length > 0
    ) {
      for (const variant of prod.colorVariants) {
        if (!variant || !variant.colorName) continue;
        const colorClean = variant.colorName.trim();
        const colorSlug = colorClean
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const itemId = allocateUniqueItemId(
          `${prod.id}-${colorSlug || 'variant'}`
        );
        const mpn = (variant.garmentCode || prod.garmentCode || prod.id).trim();
        const variantSizes =
          Array.isArray(variant.sizes) && variant.sizes.length > 0
            ? variant.sizes
            : prod.sizes || ['OS'];
        const variantQty = sumSizeQuantities(
          variantSizes,
          variant.sizeQuantities
        );
        const availability =
          prod.inStock !== false && variantQty > 0
            ? 'in_stock'
            : 'out_of_stock';
        const mainImg = resolveAbsoluteMediaUrl(
          variant.imageUrl ||
            variant.galleryUrls?.[0] ||
            prod.imageUrl ||
            prod.galleryUrls?.[0]
        );
        const extraImgs = (
          Array.isArray(variant.galleryUrls) && variant.galleryUrls.length > 0
            ? variant.galleryUrls
            : prod.galleryUrls || []
        )
          .map((u) => resolveAbsoluteMediaUrl(u))
          .filter((u) => u && u !== mainImg)
          .slice(0, 8);

        const sizeStr = variantSizes.join(', ');

        itemBlocks.push(`    <item>
      <g:id>${escapeXml(itemId)}</g:id>
      <g:item_group_id>${escapeXml(baseGroupId)}</g:item_group_id>
      <g:mpn>${escapeXml(mpn)}</g:mpn>
      <g:title>${escapeXml(`${prod.name} - ${colorClean}`)}</g:title>
      <g:description>${escapeXml(cleanDescription)}</g:description>
      <g:link>${escapeXml(prodLink)}</g:link>
      <g:image_link>${escapeXml(mainImg)}</g:image_link>${
        extraImgs.length > 0
          ? '\n' +
            extraImgs
              .map(
                (img) =>
                  `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`
              )
              .join('\n')
          : ''
      }
      <g:availability>${availability}</g:availability>
      <g:price>${escapeXml(originalPriceUsd)}</g:price>${
        hasSaleDiscount
          ? `\n      <g:sale_price>${escapeXml(effectivePriceUsd)}</g:sale_price>`
          : ''
      }
      <g:brand>SAMO</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:age_group>${ageGroup}</g:age_group>
      <g:gender>${gender}</g:gender>
      <g:product_type>${escapeXml(productType)}</g:product_type>
      <g:color>${escapeXml(colorClean)}</g:color>
      <g:size>${escapeXml(sizeStr)}</g:size>${
        materialStr
          ? `\n      <g:material>${escapeXml(materialStr)}</g:material>`
          : ''
      }
      <g:shipping>
        <g:country>LB</g:country>
        <g:service>Standard Delivery</g:service>
        <g:price>${escapeXml(shippingPriceUsd)}</g:price>
      </g:shipping>
    </item>`);
      }
    } else {
      const itemId = allocateUniqueItemId(prod.id);
      const mpn = (prod.garmentCode || prod.id).trim();
      const prodSizes =
        Array.isArray(prod.sizes) && prod.sizes.length > 0
          ? prod.sizes
          : ['OS'];
      const totalQty =
        typeof prod.quantity === 'number'
          ? prod.quantity
          : sumSizeQuantities(prodSizes, prod.sizeQuantities);
      const availability =
        prod.inStock !== false && totalQty > 0 ? 'in_stock' : 'out_of_stock';
      const mainImg = resolveAbsoluteMediaUrl(
        prod.imageUrl ||
          prod.galleryUrls?.[0] ||
          prod.colorVariants?.[0]?.imageUrl
      );
      const extraImgs = (prod.galleryUrls || [])
        .map((u) => resolveAbsoluteMediaUrl(u))
        .filter((u) => u && u !== mainImg)
        .slice(0, 8);
      const sizeStr = prodSizes.join(', ');

      itemBlocks.push(`    <item>
      <g:id>${escapeXml(itemId)}</g:id>
      <g:item_group_id>${escapeXml(baseGroupId)}</g:item_group_id>
      <g:mpn>${escapeXml(mpn)}</g:mpn>
      <g:title>${escapeXml(prod.name)}</g:title>
      <g:description>${escapeXml(cleanDescription)}</g:description>
      <g:link>${escapeXml(prodLink)}</g:link>
      <g:image_link>${escapeXml(mainImg)}</g:image_link>${
        extraImgs.length > 0
          ? '\n' +
            extraImgs
              .map(
                (img) =>
                  `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`
              )
              .join('\n')
          : ''
      }
      <g:availability>${availability}</g:availability>
      <g:price>${escapeXml(originalPriceUsd)}</g:price>${
        hasSaleDiscount
          ? `\n      <g:sale_price>${escapeXml(effectivePriceUsd)}</g:sale_price>`
          : ''
      }
      <g:brand>SAMO</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:age_group>${ageGroup}</g:age_group>
      <g:gender>${gender}</g:gender>
      <g:product_type>${escapeXml(productType)}</g:product_type>
      <g:size>${escapeXml(sizeStr)}</g:size>${
        materialStr
          ? `\n      <g:material>${escapeXml(materialStr)}</g:material>`
          : ''
      }
      <g:shipping>
        <g:country>LB</g:country>
        <g:service>Standard Delivery</g:service>
        <g:price>${escapeXml(shippingPriceUsd)}</g:price>
      </g:shipping>
    </item>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SAMO Official Product Catalog Feed</title>
    <link>${SITE_ORIGIN}</link>
    <description>Official SAMO Women &amp; Kids Luxury Collection Feed for Google Merchant Center (5917302248)</description>
${itemBlocks.join('\n')}
  </channel>
</rss>
`;
}

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  try {
    const snapshot = await readCatalogSnapshot(context.env);
    const products =
      Array.isArray(snapshot.products) && snapshot.products.length > 0
        ? (snapshot.products as ProductItem[])
        : INITIAL_PRODUCTS;
    const siteBanners =
      snapshot.siteBanners && typeof snapshot.siteBanners === 'object'
        ? (snapshot.siteBanners as Partial<SiteBannersConfig>)
        : undefined;

    const xml = buildGoogleMerchantFeedXml(products, {
      shippingFeeEnabled: siteBanners?.shippingFeeEnabled,
      standardDeliveryFee: siteBanners?.standardDeliveryFee,
      freeShippingThreshold: siteBanners?.freeShippingThreshold,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    const xml = buildGoogleMerchantFeedXml(INITIAL_PRODUCTS);
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};
