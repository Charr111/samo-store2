import { INITIAL_PRODUCTS } from '../../src/data/seedCatalog';
import type {
  DeliveryMethod,
  OrderedLineItem,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  ProductItem,
  SelectedSetPieceSize,
} from '../../src/types/samo';
import {
  calculateOrderTotals,
  decrementStockForAcceptedOrder,
  formatGarmentCodeRef,
  getEffectiveProductPrice,
  getSizeQuantity,
  resolveProductGarmentCode,
} from '../../src/utils/catalogLogic';
import { getCorsHeaders } from './_auth';
import { applyCatalogPatch, readCatalogSnapshot, type Env } from './catalog';
import { sendOrderConfirmationEmailInternal } from './order-confirmation-email';
import { executePromoValidation } from './promo/validate';
import { executeGoogleSheetsSyncRequest } from './sheets-sync';

export interface CreateOrderAdapter {
  readState: () => Promise<Record<string, unknown>>;
  writeState: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onAfterOrderCreated?: (args: {
    order: OrderItem;
    updatedProducts: ProductItem[];
    isWhishOrOmt: boolean;
    siteBanners: Record<string, any>;
  }) => Promise<void> | void;
}

function checkFullSetPieceStock(
  parentProduct: ProductItem,
  pieceSelection: {
    productId?: string;
    productName?: string;
    selectedSize?: string;
    selectedColor?: string;
  },
  pieceIndex: number,
  allProducts: ProductItem[]
): { available: number; label: string } {
  const subItem = parentProduct.setItems?.[pieceIndex];
  const linkedId = pieceSelection.productId || subItem?.productId || '';
  const linkedName =
    pieceSelection.productName || subItem?.productName || `Piece #${pieceIndex + 1}`;
  const linkedProd = allProducts.find(
    (p) =>
      (linkedId && p.id === linkedId) ||
      (linkedName &&
        p.name.trim().toLowerCase() === linkedName.trim().toLowerCase())
  );

  const chosenSize = (
    pieceSelection.selectedSize ||
    subItem?.sizes?.[0] ||
    'OS'
  ).trim();
  const chosenColor = (
    pieceSelection.selectedColor ||
    subItem?.selectedColors?.[0] ||
    subItem?.colorVariants?.[0]?.colorName ||
    ''
  ).trim();

  if (linkedProd && linkedProd.id !== parentProduct.id) {
    return {
      available: getSizeQuantity(
        linkedProd,
        chosenSize,
        chosenColor || undefined
      ),
      label: `${linkedProd.name} (${chosenColor ? `${chosenColor} / ` : ''}${chosenSize})`,
    };
  }

  if (subItem) {
    if (
      Array.isArray(subItem.colorVariants) &&
      subItem.colorVariants.length > 0 &&
      chosenColor
    ) {
      const matchedVar = subItem.colorVariants.find(
        (v) => v.colorName.trim().toLowerCase() === chosenColor.toLowerCase()
      );
      if (matchedVar) {
        if (!matchedVar.sizes.includes(chosenSize)) {
          return {
            available: 0,
            label: `${linkedName} (${chosenColor} / ${chosenSize})`,
          };
        }
        const q = matchedVar.sizeQuantities?.[chosenSize];
        return {
          available:
            typeof q === 'number' && !Number.isNaN(q)
              ? Math.max(0, Math.floor(q))
              : 5,
          label: `${linkedName} (${chosenColor} / ${chosenSize})`,
        };
      }
    }
    const q = subItem.sizeQuantities?.[chosenSize];
    return {
      available:
        typeof q === 'number' && !Number.isNaN(q)
          ? Math.max(0, Math.floor(q))
          : 5,
      label: `${linkedName} (${chosenSize})`,
    };
  }

  return {
    available: getSizeQuantity(
      parentProduct,
      chosenSize,
      chosenColor || undefined
    ),
    label: `${parentProduct.name} (${chosenSize})`,
  };
}

export async function executeCreateOrder(
  payload: Record<string, any>,
  adapter: CreateOrderAdapter
): Promise<{ status: number; body: Record<string, unknown> }> {
  const customerName =
    typeof payload?.customerName === 'string'
      ? payload.customerName.trim().slice(0, 120)
      : '';
  const customerEmail =
    typeof payload?.customerEmail === 'string'
      ? payload.customerEmail.trim().slice(0, 160)
      : '';
  const customerPhone =
    typeof payload?.customerPhone === 'string'
      ? payload.customerPhone.trim().slice(0, 40)
      : '';
  const shippingLocation =
    typeof payload?.shippingLocation === 'string'
      ? payload.shippingLocation.trim().slice(0, 340)
      : '';

  if (
    !customerName ||
    !customerEmail ||
    !customerPhone ||
    !shippingLocation ||
    !customerEmail.includes('@') ||
    !customerEmail.includes('.')
  ) {
    return {
      status: 400,
      body: {
        ok: false,
        error:
          'Please complete all customer contact, valid email, and shipping location fields.',
      },
    };
  }

  const rawItems = Array.isArray(payload?.orderedItems)
    ? (payload.orderedItems as any[])
    : [];
  if (rawItems.length === 0) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Your shopping bag is empty.',
      },
    };
  }

  const currentState = await adapter.readState();
  const currentProducts: ProductItem[] =
    Array.isArray(currentState.products) && currentState.products.length > 0
      ? (currentState.products as ProductItem[])
      : INITIAL_PRODUCTS;
  const currentOrders: OrderItem[] = Array.isArray(currentState.orders)
    ? (currentState.orders as OrderItem[])
    : [];
  const siteBanners: Record<string, any> =
    currentState.siteBanners && typeof currentState.siteBanners === 'object'
      ? (currentState.siteBanners as Record<string, any>)
      : {};

  // 1. Validate promo code server-side if provided
  const rawPromoCode =
    typeof payload?.promoCode === 'string'
      ? payload.promoCode.trim().toUpperCase()
      : '';
  let validatedPromo: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    active: boolean;
  } | null = null;

  if (rawPromoCode) {
    const promoResult = executePromoValidation(
      { code: rawPromoCode, email: customerEmail },
      currentState
    );
    if (!promoResult.valid || !promoResult.promo) {
      return {
        status: 400,
        body: {
          ok: false,
          error:
            promoResult.error ||
            `Promo code "${rawPromoCode}" is invalid or inactive.`,
        },
      };
    }
    validatedPromo = promoResult.promo;
  }

  // 2. Validate every ordered item against server catalog (price, discount, and stock)
  const validatedOrderedItems: OrderedLineItem[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      return {
        status: 400,
        body: { ok: false, error: 'Invalid order line item.' },
      };
    }
    const productId =
      typeof rawItem.productId === 'string' ? rawItem.productId.trim() : '';
    const productName =
      typeof rawItem.productName === 'string' ? rawItem.productName.trim() : '';
    const quantity = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));
    const selectedSize =
      typeof rawItem.selectedSize === 'string' && rawItem.selectedSize.trim()
        ? rawItem.selectedSize.trim().slice(0, 60)
        : 'OS';
    const selectedColor =
      typeof rawItem.selectedColor === 'string' && rawItem.selectedColor.trim()
        ? rawItem.selectedColor.trim().slice(0, 80)
        : undefined;

    const matchedProd = currentProducts.find(
      (p) =>
        (productId && p.id === productId) ||
        (productName &&
          p.name.trim().toLowerCase() === productName.trim().toLowerCase())
    );

    if (!matchedProd) {
      return {
        status: 400,
        body: {
          ok: false,
          error: `Product "${productName || productId || 'Unknown'}" is no longer available.`,
        },
      };
    }

    const rawSetSizes: SelectedSetPieceSize[] | undefined = Array.isArray(
      rawItem.selectedSetSizes
    )
      ? rawItem.selectedSetSizes
          .filter((s: any) => s && typeof s === 'object')
          .map((s: any) => ({
            productId: typeof s.productId === 'string' ? s.productId : '',
            productName:
              typeof s.productName === 'string' ? s.productName : '',
            ...(typeof s.garmentCode === 'string' && s.garmentCode.trim()
              ? { garmentCode: s.garmentCode.trim() }
              : {}),
            ...(typeof s.selectedColor === 'string' && s.selectedColor.trim()
              ? { selectedColor: s.selectedColor.trim() }
              : {}),
            selectedSize:
              typeof s.selectedSize === 'string' && s.selectedSize.trim()
                ? s.selectedSize.trim()
                : 'OS',
          }))
      : undefined;

    // Validate stock server-side
    if (rawSetSizes && rawSetSizes.length > 0) {
      for (let i = 0; i < rawSetSizes.length; i++) {
        const check = checkFullSetPieceStock(
          matchedProd,
          rawSetSizes[i],
          i,
          currentProducts
        );
        if (check.available < quantity) {
          return {
            status: 400,
            body: {
              ok: false,
              error: `Insufficient stock for ${check.label}. Only ${check.available} remaining.`,
            },
          };
        }
      }
    } else if (
      matchedProd.isFullSet &&
      Array.isArray(matchedProd.setItems) &&
      matchedProd.setItems.length > 0
    ) {
      const sizeParts = selectedSize
        .split('/')
        .map((s: string) => s.trim())
        .filter(Boolean);
      for (let i = 0; i < matchedProd.setItems.length; i++) {
        const sub = matchedProd.setItems[i];
        const check = checkFullSetPieceStock(
          matchedProd,
          {
            productId: sub.productId,
            productName: sub.productName,
            selectedSize: sizeParts[i] || sub.sizes?.[0] || 'OS',
            selectedColor:
              sub.selectedColors?.[0] || sub.colorVariants?.[0]?.colorName,
          },
          i,
          currentProducts
        );
        if (check.available < quantity) {
          return {
            status: 400,
            body: {
              ok: false,
              error: `Insufficient stock for ${check.label}. Only ${check.available} remaining.`,
            },
          };
        }
      }
    } else {
      const available = getSizeQuantity(
        matchedProd,
        selectedSize,
        selectedColor
      );
      if (available < quantity) {
        return {
          status: 400,
          body: {
            ok: false,
            error: `Insufficient stock for ${matchedProd.name} (${
              selectedColor ? `${selectedColor} / ` : ''
            }${selectedSize}). Only ${available} remaining.`,
          },
        };
      }
    }

    const effectiveUnitPrice = getEffectiveProductPrice(matchedProd).effectivePrice;
    const resolvedGarmentCode =
      (typeof rawItem.garmentCode === 'string' && rawItem.garmentCode.trim()) ||
      resolveProductGarmentCode(matchedProd, {
        selectedColor,
        selectedSetSizes: rawSetSizes,
        allProducts: currentProducts,
      });

    const variantImg =
      selectedColor && Array.isArray(matchedProd.colorVariants)
        ? matchedProd.colorVariants.find(
            (v) =>
              v.colorName.trim().toLowerCase() === selectedColor.toLowerCase()
          )?.imageUrl
        : undefined;
    const resolvedImageUrl = (
      (typeof rawItem.imageUrl === 'string' ? rawItem.imageUrl.trim() : '') ||
      variantImg ||
      matchedProd.imageUrl ||
      ''
    ).trim();

    validatedOrderedItems.push({
      productId: matchedProd.id,
      productName: matchedProd.name,
      ...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
      ...(resolvedGarmentCode ? { garmentCode: resolvedGarmentCode } : {}),
      ...(selectedColor ? { selectedColor } : {}),
      selectedSize,
      ...(rawSetSizes && rawSetSizes.length > 0
        ? { selectedSetSizes: rawSetSizes }
        : {}),
      quantity,
      unitPrice: effectiveUnitPrice,
    });
  }

  // 3. Calculate canonical order totals server-side
  const deliveryMethod: DeliveryMethod =
    payload?.deliveryMethod === 'SAMO Showroom Pickup'
      ? 'SAMO Showroom Pickup'
      : 'Standard Delivery';

  const codEnabled =
    typeof currentState.codEnabled === 'boolean'
      ? currentState.codEnabled
      : false;
  const paymentMethod: PaymentMethod =
    payload?.paymentMethod === 'COD' && codEnabled
      ? 'COD'
      : 'Whish/OMT Payment';

  const totals = calculateOrderTotals(
    validatedOrderedItems.map((item) => ({
      price: item.unitPrice ?? 0,
      quantity: item.quantity,
    })),
    deliveryMethod,
    validatedPromo,
    {
      shippingFeeEnabled:
        typeof siteBanners.shippingFeeEnabled === 'boolean'
          ? siteBanners.shippingFeeEnabled
          : true,
      standardDeliveryFee:
        typeof siteBanners.standardDeliveryFee === 'number'
          ? siteBanners.standardDeliveryFee
          : 6,
      freeShippingThreshold:
        typeof siteBanners.freeShippingThreshold === 'number'
          ? siteBanners.freeShippingThreshold
          : 100,
    }
  );

  const summary = validatedOrderedItems
    .map((item) => {
      const refLabel = formatGarmentCodeRef(item.garmentCode);
      const refPart = refLabel ? `${refLabel} | ` : '';
      const colorPart = item.selectedColor
        ? `Color: ${item.selectedColor} | `
        : '';
      const setPiecesPart =
        Array.isArray(item.selectedSetSizes) && item.selectedSetSizes.length > 0
          ? `Set Pieces: ${item.selectedSetSizes
              .map(
                (p) =>
                  `${p.productName}${
                    p.garmentCode
                      ? ` [${formatGarmentCodeRef(p.garmentCode)}]`
                      : ''
                  } (${p.selectedColor ? `${p.selectedColor} · ` : ''}${
                    p.selectedSize
                  })`
              )
              .join(' + ')} | `
          : '';
      return `${item.quantity}x ${item.productName} (${refPart}${colorPart}${setPiecesPart}Size: ${
        item.selectedSize
      }) — $${((item.unitPrice ?? 0) * item.quantity).toLocaleString()}`;
    })
    .join('; ')
    .slice(0, 1900);

  const itemsSummary =
    typeof payload?.itemsSummary === 'string' && payload.itemsSummary.trim()
      ? payload.itemsSummary.trim().slice(0, 1950)
      : `${summary} [Payment: ${paymentMethod}]`.slice(0, 1950);

  const leadItem = validatedOrderedItems[0];
  const orderNumber =
    typeof payload?.orderNumber === 'string' &&
    /^SAMO-\d{3,8}$/i.test(payload.orderNumber.trim())
      ? payload.orderNumber.trim().toUpperCase()
      : `SAMO-${Math.floor(1000 + Math.random() * 9000)}`;

  const autoAcceptOrders =
    typeof currentState.autoAcceptOrders === 'boolean'
      ? currentState.autoAcceptOrders
      : true;
  const initialStatus: OrderStatus = autoAcceptOrders ? 'accepted' : 'pending';

  const isWhishOrOmt =
    paymentMethod === 'Whish/OMT Payment' ||
    String(paymentMethod).toLowerCase().includes('whish') ||
    String(paymentMethod).toLowerCase().includes('omt');

  const newOrder: OrderItem = {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    shippingLocation,
    deliveryMethod,
    paymentMethod,
    paymentVerified: !isWhishOrOmt,
    deliveryFee: totals.deliveryFee,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    promoCode: validatedPromo ? validatedPromo.code : '',
    totalPrice: totals.totalPrice,
    itemsSummary,
    itemsCount: totals.itemsCount,
    primaryProductName: leadItem.productName.slice(0, 140),
    primaryProductSize: (leadItem.selectedColor
      ? `${leadItem.selectedColor} / ${leadItem.selectedSize || 'OS'}`
      : leadItem.selectedSize || 'OS'
    ).slice(0, 40),
    primaryProductImage: (leadItem.imageUrl || '').slice(0, 600),
    orderedItems: validatedOrderedItems,
    status: initialStatus,
    createdAt: new Date().toISOString(),
  };

  const updatedProducts =
    initialStatus === 'accepted'
      ? decrementStockForAcceptedOrder(currentProducts, newOrder)
      : currentProducts;

  const nextOrders = [newOrder, ...currentOrders];

  await adapter.writeState({
    orders: nextOrders,
    ...(initialStatus === 'accepted' ? { products: updatedProducts } : {}),
  });

  if (adapter.onAfterOrderCreated) {
    try {
      await adapter.onAfterOrderCreated({
        order: newOrder,
        updatedProducts,
        isWhishOrOmt,
        siteBanners,
      });
    } catch (postErr) {
      console.warn('[SAMO] Post-order side-effect notice:', postErr);
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      order: newOrder,
      products: updatedProducts,
    },
  };
}

export const onRequestOptions = async (context: {
  request?: Request;
}): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context?.request),
  });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}): Promise<Response> => {
  const corsHeaders = getCorsHeaders(context.request);
  try {
    const payload = (await context.request
      .json()
      .catch(() => ({}))) as Record<string, any>;

    const result = await executeCreateOrder(payload, {
      readState: () => readCatalogSnapshot(context.env),
      writeState: (patch) => applyCatalogPatch(context.env, patch),
      onAfterOrderCreated: async ({
        order,
        updatedProducts,
        isWhishOrOmt,
        siteBanners,
      }) => {
        const backgroundTask = Promise.allSettled([
          sendOrderConfirmationEmailInternal(context.env, {
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
              readState: () => readCatalogSnapshot(context.env),
              writeState: (patch) => applyCatalogPatch(context.env, patch),
              envWebhookUrl: context.env.GOOGLE_SHEETS_WEBHOOK_URL,
              envSyncSecret: context.env.GOOGLE_SHEETS_SYNC_SECRET,
            }
          ),
        ]);

        if (typeof context.waitUntil === 'function') {
          context.waitUntil(backgroundTask);
        } else {
          await backgroundTask;
        }
      },
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to process order right now.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
