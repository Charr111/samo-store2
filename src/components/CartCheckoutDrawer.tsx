import React, { useRef, useState } from 'react';
import { X, Trash2, Plus, Minus, CheckCircle2, ArrowRight, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import {
  CartItem,
  DeliveryMethod,
  OrderItem,
  PaymentMethod,
  ProductItem,
  PromoCodeItem,
} from '../types/samo';
import {
  calculateOrderTotals,
  formatGarmentCodeRef,
  getComplementaryUpsellProducts,
  getEffectiveProductPrice,
  getSizeQuantity,
  hasEmailReachedPromoLimit,
  resolveProductGarmentCode,
} from '../utils/catalogLogic';
import { ProductImage } from './ProductImage';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  initialStep?: 'cart' | 'checkout';
  cartItems: CartItem[];
  products: ProductItem[];
  promoCodes: PromoCodeItem[];
  orders?: OrderItem[];
  onClose: () => void;
  onSwipeBack?: () => void;
  onUpdateQuantity: (
    productId: string,
    size: string,
    delta: number,
    color?: string
  ) => void;
  onRemoveItem: (productId: string, size: string, color?: string) => void;
  onAddToCart: (
    product: ProductItem,
    selectedSize: string,
    selectedColor?: string,
    selectedColorImage?: string
  ) => void;
  onSelectProduct?: (product: ProductItem) => void;
  onSubmitOrder: (orderPayload: Omit<OrderItem, 'id' | 'createdAt' | 'status'>) => Promise<OrderItem>;
  codEnabled?: boolean;
  /** Live configurable Standard Delivery shipping fee & free threshold */
  shippingFeeEnabled?: boolean;
  standardDeliveryFee?: number;
  freeShippingThreshold?: number;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  initialStep = 'cart',
  cartItems,
  products,
  promoCodes,
  orders = [],
  onClose,
  onSwipeBack,
  onUpdateQuantity,
  onRemoveItem,
  onAddToCart,
  onSelectProduct,
  onSubmitOrder,
  codEnabled = false,
  shippingFeeEnabled = true,
  standardDeliveryFee = 6,
  freeShippingThreshold = 80,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmed'>(initialStep);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('Standard Delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Whish/OMT Payment');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeItem | null>(null);
  const [promoFeedback, setPromoFeedback] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderItem | null>(null);
  const [whishInfoOpen, setWhishInfoOpen] = useState(true);
  const [srpInfoOpen, setSrpInfoOpen] = useState(true);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchCurrentXRef = useRef<number | null>(null);
  const touchCurrentYRef = useRef<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setDeliveryMethod('Standard Delivery');
      setPaymentMethod('Whish/OMT Payment');
      setWhishInfoOpen(true);
      setSrpInfoOpen(true);
      setFormError('');
      setPromoFeedback('');
    }
  }, [isOpen, initialStep]);

  React.useEffect(() => {
    if (!codEnabled && paymentMethod === 'COD') {
      setPaymentMethod('Whish/OMT Payment');
      setWhishInfoOpen(true);
    }
  }, [codEnabled, paymentMethod]);

  React.useEffect(() => {
    const win = window as unknown as {
      __samoBagOpen?: boolean;
      __samoBagStep?: 'cart' | 'checkout' | 'confirmed';
    };
    win.__samoBagOpen = isOpen;
    win.__samoBagStep = isOpen ? step : undefined;
    return () => {
      if (!isOpen) {
        win.__samoBagOpen = false;
        win.__samoBagStep = undefined;
      }
    };
  }, [isOpen, step]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleCheckoutPopState = (event: PopStateEvent) => {
      const st = (event.state || {}) as {
        samoBagOpen?: boolean;
        samoCheckoutStep?: boolean;
      };
      if (step === 'checkout' || (st.samoBagOpen && !st.samoCheckoutStep)) {
        const win = window as unknown as {
          __samoCheckoutStepBackAt?: number;
          __samoBagStep?: 'cart' | 'checkout' | 'confirmed';
        };
        win.__samoCheckoutStepBackAt = Date.now();
        win.__samoBagStep = 'cart';
        setStep('cart');
      }
    };
    window.addEventListener('popstate', handleCheckoutPopState);
    return () => window.removeEventListener('popstate', handleCheckoutPopState);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const stepBackToCart = () => {
    const win = window as unknown as {
      __samoCheckoutStepBackAt?: number;
      __samoBagStep?: 'cart' | 'checkout' | 'confirmed';
    };
    win.__samoCheckoutStepBackAt = Date.now();
    win.__samoBagStep = 'cart';
    setStep('cart');
    try {
      const st = (window.history.state || {}) as {
        samoBagOpen?: boolean;
        samoCheckoutStep?: boolean;
        previousProductId?: string | null;
      };
      if (st.samoCheckoutStep) {
        window.history.replaceState(
          {
            ...st,
            samoBagOpen: true,
            samoCheckoutStep: false,
          },
          '',
          window.location.pathname + window.location.search
        );
      }
    } catch {}
  };

  const handleDrawerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const startX = e.touches[0].clientX;
    // Only initiate swipe-back when the gesture begins strictly at the left screen edge (<= 28px)
    if (startX > 28) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      touchCurrentXRef.current = null;
      touchCurrentYRef.current = null;
      return;
    }
    touchStartXRef.current = startX;
    touchStartYRef.current = e.touches[0].clientY;
    touchCurrentXRef.current = startX;
    touchCurrentYRef.current = e.touches[0].clientY;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || touchStartXRef.current === null) return;
    touchCurrentXRef.current = e.touches[0].clientX;
    touchCurrentYRef.current = e.touches[0].clientY;
    if (touchStartYRef.current !== null && touchStartXRef.current <= 28) {
      const deltaX = touchCurrentXRef.current - touchStartXRef.current;
      const deltaY = Math.abs(
        touchCurrentYRef.current - touchStartYRef.current
      );
      if (deltaX > 12 && deltaX > deltaY * 1.5 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleDrawerTouchEnd = () => {
    if (
      touchStartXRef.current !== null &&
      touchStartXRef.current <= 28 &&
      touchStartYRef.current !== null &&
      touchCurrentXRef.current !== null &&
      touchCurrentYRef.current !== null
    ) {
      const deltaX = touchCurrentXRef.current - touchStartXRef.current;
      const deltaY = Math.abs(touchCurrentYRef.current - touchStartYRef.current);
      if (deltaX > 75 && deltaY < 40 && deltaX > deltaY * 1.5) {
        const win = window as unknown as {
          __samoCheckoutStepBackAt?: number;
          __samoBagClosedAt?: number;
        };
        const recentlySteppedBackFromCheckout =
          typeof win.__samoCheckoutStepBackAt === 'number' &&
          Date.now() - win.__samoCheckoutStepBackAt < 450;
        const recentlyClosedBag =
          typeof win.__samoBagClosedAt === 'number' &&
          Date.now() - win.__samoBagClosedAt < 450;
        if (step === 'checkout' || recentlySteppedBackFromCheckout) {
          stepBackToCart();
        } else if (!recentlyClosedBag) {
          if (onSwipeBack) {
            onSwipeBack();
          } else {
            onClose();
          }
        }
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchCurrentXRef.current = null;
    touchCurrentYRef.current = null;
  };

  const activeDeliveryFee =
    typeof standardDeliveryFee === 'number' &&
    Number.isFinite(standardDeliveryFee) &&
    standardDeliveryFee >= 0
      ? Math.round(standardDeliveryFee * 100) / 100
      : 6;
  const activeFreeThreshold =
    typeof freeShippingThreshold === 'number' &&
    Number.isFinite(freeShippingThreshold) &&
    freeShippingThreshold >= 0
      ? Math.round(freeShippingThreshold * 100) / 100
      : 80;
  const isShippingFeeActive =
    shippingFeeEnabled !== false && activeDeliveryFee > 0;

  const standardDeliveryOptionLabel = !isShippingFeeActive
    ? 'Standard Delivery (Complimentary Free Delivery)'
    : activeFreeThreshold > 0
    ? `Standard Delivery (Complimentary over $${activeFreeThreshold}, otherwise $${activeDeliveryFee})`
    : `Standard Delivery ($${activeDeliveryFee} flat rate)`;

  const totals = calculateOrderTotals(
    cartItems.map((ci) => ({
      price: getEffectiveProductPrice(ci.product).effectivePrice,
      quantity: ci.quantity,
    })),
    deliveryMethod,
    appliedPromo,
    {
      shippingFeeEnabled,
      standardDeliveryFee: activeDeliveryFee,
      freeShippingThreshold: activeFreeThreshold,
    }
  );

  const bagTotalWithoutDelivery = Math.max(0, totals.subtotal - totals.discountAmount);
  const upsellProducts = getComplementaryUpsellProducts(cartItems, products, 1);

  const handleQuickAddUpsell = (prod: ProductItem) => {
    if (prod.hasColors && Array.isArray(prod.colorVariants) && prod.colorVariants.length > 0) {
      const firstVariantWithStock =
        prod.colorVariants.find((v) =>
          v.sizes.some((sz) => (v.sizeQuantities?.[sz] ?? 5) > 0)
        ) || prod.colorVariants[0];
      const firstAvailableSize =
        firstVariantWithStock.sizes.find(
          (sz) => (firstVariantWithStock.sizeQuantities?.[sz] ?? 5) > 0
        ) || firstVariantWithStock.sizes[0];
      if (firstAvailableSize) {
        onAddToCart(
          prod,
          firstAvailableSize,
          firstVariantWithStock.colorName,
          firstVariantWithStock.imageUrl
        );
      }
      return;
    }

    const firstAvailableSize =
      prod.sizes.find((sz) => getSizeQuantity(prod, sz) > 0) || prod.sizes[0];
    if (firstAvailableSize) {
      onAddToCart(prod, firstAvailableSize);
    }
  };

  const handleApplyPromoCode = () => {
    setPromoFeedback('');
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = promoCodes.find(
      (p) => p.active && p.code.trim().toUpperCase() === code
    );
    if (!found) {
      setAppliedPromo(null);
      setPromoFeedback(`Promo code "${code}" is invalid or inactive.`);
      return;
    }
    const maxPerEmail = Math.floor(Number(found.maxUsesPerEmail) || 0);
    if (maxPerEmail > 0) {
      const cleanEmail = customerEmail.trim();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setAppliedPromo(null);
        setPromoFeedback('Please enter your Email Address above to apply this promo code.');
        return;
      }
      if (hasEmailReachedPromoLimit(found, cleanEmail, orders)) {
        setAppliedPromo(null);
        setPromoFeedback(
          'This promo code has already been used the maximum number of times for this email.'
        );
        return;
      }
    }
    setAppliedPromo(found);
    setPromoFeedback(
      `Applied ${found.code} (${
        found.discountType === 'percentage'
          ? `${found.discountValue}% OFF`
          : `$${found.discountValue} OFF`
      })`
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (cartItems.length === 0) {
      setFormError('Your shopping bag is empty.');
      return;
    }
    if (
      !customerName.trim() ||
      !customerEmail.trim() ||
      !customerPhone.trim() ||
      !streetAddress.trim() ||
      !cityCountry.trim()
    ) {
      setFormError('Please complete all customer contact and shipping location fields.');
      return;
    }
    if (!customerEmail.trim().includes('@') || !customerEmail.trim().includes('.')) {
      setFormError('Please enter a valid email address to receive your order confirmation.');
      return;
    }
    if (
      appliedPromo &&
      hasEmailReachedPromoLimit(appliedPromo, customerEmail.trim(), orders)
    ) {
      setAppliedPromo(null);
      const limitMsg =
        'This promo code has already been used the maximum number of times for this email.';
      setPromoFeedback(limitMsg);
      setFormError(limitMsg);
      return;
    }

    setSubmitting(true);
    try {
      const orderNum = `SAMO-${Math.floor(1000 + Math.random() * 9000)}`;
      const fullLocation = `${streetAddress.trim()}, ${cityCountry.trim()}`.slice(0, 340);
      const summary = cartItems
        .map((ci) => {
          const unitPrice = getEffectiveProductPrice(ci.product).effectivePrice;
          const resolvedCode =
            ci.garmentCode ||
            resolveProductGarmentCode(ci.product, {
              selectedColor: ci.selectedColor,
              selectedSetSizes: ci.selectedSetSizes,
              allProducts: products,
            });
          const refLabel = formatGarmentCodeRef(resolvedCode);
          const refPart = refLabel ? `${refLabel} | ` : '';
          const colorPart = ci.selectedColor ? `Color: ${ci.selectedColor} | ` : '';
          const setPiecesPart =
            Array.isArray(ci.selectedSetSizes) && ci.selectedSetSizes.length > 0
              ? `Set Pieces: ${ci.selectedSetSizes
                  .map(
                    (p) =>
                      `${p.productName}${
                        p.garmentCode ? ` [${formatGarmentCodeRef(p.garmentCode)}]` : ''
                      } (${p.selectedColor ? `${p.selectedColor} · ` : ''}${p.selectedSize})`
                  )
                  .join(' + ')} | `
              : '';
          const materialsPart =
            Array.isArray(ci.product.materials) && ci.product.materials.length > 0
              ? ` | Materials: ${ci.product.materials.join(', ')}`
              : '';
          return `${ci.quantity}x ${ci.product.name} (${refPart}${colorPart}${setPiecesPart}Size: ${
            ci.selectedSize
          }${materialsPart}) — $${(
            unitPrice * ci.quantity
          ).toLocaleString()}`;
        })
        .join('; ')
        .slice(0, 1900);

      const summaryWithPayment = `${summary} [Payment: ${paymentMethod}]`.slice(0, 1950);
      const lead = cartItems[0];

      const created = await onSubmitOrder({
        orderNumber: orderNum,
        customerName: customerName.trim().slice(0, 120),
        customerEmail: customerEmail.trim().slice(0, 160),
        customerPhone: customerPhone.trim().slice(0, 40),
        shippingLocation: fullLocation,
        deliveryMethod,
        paymentMethod,
        deliveryFee: totals.deliveryFee,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        promoCode: appliedPromo ? appliedPromo.code : '',
        totalPrice: totals.totalPrice,
        itemsSummary: summaryWithPayment,
        itemsCount: totals.itemsCount,
        primaryProductName: lead.product.name.slice(0, 140),
        primaryProductSize: (lead.selectedColor
          ? `${lead.selectedColor} / ${lead.selectedSize}`
          : lead.selectedSize
        ).slice(0, 40),
        primaryProductImage: (lead.selectedColorImage || lead.product.imageUrl).slice(0, 600),
        orderedItems: cartItems.map((ci) => {
          const resolvedCode =
            ci.garmentCode ||
            resolveProductGarmentCode(ci.product, {
              selectedColor: ci.selectedColor,
              selectedSetSizes: ci.selectedSetSizes,
              allProducts: products,
            });
          const matchedVariantImage =
            ci.selectedColor && Array.isArray(ci.product.colorVariants)
              ? ci.product.colorVariants.find(
                  (v) =>
                    v.colorName.trim().toLowerCase() ===
                    ci.selectedColor!.trim().toLowerCase()
                )?.imageUrl
              : undefined;
          const resolvedImageUrl = (
            ci.selectedColorImage ||
            matchedVariantImage ||
            ci.product.imageUrl ||
            ''
          ).trim();
          return {
            productId: ci.product.id,
            productName: ci.product.name,
            ...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
            selectedColor: ci.selectedColor,
            selectedSize: ci.selectedSize,
            selectedSetSizes: ci.selectedSetSizes,
            garmentCode: resolvedCode,
            quantity: ci.quantity,
            unitPrice: getEffectiveProductPrice(ci.product).effectivePrice,
          };
        }),
      });

      setConfirmedOrder(created);
      setAppliedPromo(null);
      setPromoInput('');
      setStep('confirmed');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to submit order. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SAMO Shopping Bag and Checkout"
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        className="w-full max-w-lg bg-white h-full border-l border-zinc-950 flex flex-col justify-between overflow-hidden"
      >
        {/* Top Drawer Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-sm font-extrabold tracking-[0.16em] uppercase text-zinc-950">
              {step === 'cart'
                ? `Shopping Bag (${totals.itemsCount})`
                : step === 'checkout'
                ? 'Client Order & Delivery'
                : 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bag drawer"
            className="p-1.5 text-zinc-950 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'cart' && (
            <>
              {cartItems.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Your SAMO Shopping Bag is Empty
                  </p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Explore Women and Kids collections to select pieces in Fine Leather, Suede, Fur, or Cashmere.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Added Products List */}
                  <div className="divide-y divide-zinc-200">
                    {cartItems.map((item) => {
                      const pricing = getEffectiveProductPrice(item.product);
                      const rawGarmentCode =
                        item.garmentCode ||
                        resolveProductGarmentCode(item.product, {
                          selectedColor: item.selectedColor,
                          selectedSetSizes: item.selectedSetSizes,
                          allProducts: products,
                        });
                      const itemGarmentRef = formatGarmentCodeRef(rawGarmentCode);
                      return (
                        <div
                          key={`${item.product.id}-${item.selectedColor || 'default'}-${item.selectedSize}`}
                          className="py-3.5 first:pt-1 flex gap-4"
                        >
                          <div className="w-20 h-24 shrink-0 border border-zinc-200">
                            <ProductImage
                              src={item.selectedColorImage || item.product.imageUrl}
                              alt={item.product.name}
                              category={item.product.category}
                              styleType={item.product.style}
                              compact={true}
                              className="h-full w-full"
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                                    {item.product.name}
                                  </h3>
                                  {itemGarmentRef && (
                                    <p
                                      data-testid="cart-item-garment-code"
                                      className="mt-0.5 font-mono-tabular text-[10px] font-medium tracking-[0.06em] text-zinc-500"
                                    >
                                      {itemGarmentRef}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRemoveItem(
                                      item.product.id,
                                      item.selectedSize,
                                      item.selectedColor
                                    )
                                  }
                                  aria-label={`Remove ${item.product.name}`}
                                  className="text-zinc-400 hover:text-zinc-950 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="mt-1 text-[11px] text-zinc-600 uppercase tracking-wider">
                                {item.selectedColor && (
                                  <>
                                    Color: <strong className="text-zinc-950">{item.selectedColor}</strong> ·{' '}
                                  </>
                                )}
                                Size: <strong className="text-zinc-950">{item.selectedSize}</strong>
                                {Array.isArray(item.product.materials) &&
                                  item.product.materials.length > 0 && (
                                    <> · {item.product.materials.slice(0, 2).join(', ')}</>
                                  )}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center border border-zinc-300">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuantity(
                                      item.product.id,
                                      item.selectedSize,
                                      -1,
                                      item.selectedColor
                                    )
                                  }
                                  aria-label="Decrease quantity"
                                  className="p-1.5 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 text-xs font-mono-tabular font-bold">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQuantity(
                                      item.product.id,
                                      item.selectedSize,
                                      1,
                                      item.selectedColor
                                    )
                                  }
                                  aria-label="Increase quantity"
                                  className="p-1.5 text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-right font-mono-tabular">
                                <span className="text-xs font-bold text-zinc-950">
                                  ${(pricing.effectivePrice * item.quantity).toLocaleString()}
                                </span>
                                {pricing.hasDiscount && (
                                  <span className="ml-1.5 text-[11px] text-zinc-400 line-through">
                                    ${(pricing.originalPrice * item.quantity).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Similar Item Section (Single Parallel Recommendation) */}
                  {upsellProducts.length > 0 && (
                    <div className="pt-4 border-t border-zinc-950 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-950">
                          Similar Item
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {upsellProducts.slice(0, 1).map((upsell) => {
                          const upsellPricing = getEffectiveProductPrice(upsell);
                          return (
                            <div
                              key={upsell.id}
                              className="p-3 border border-zinc-200 hover:border-zinc-950 bg-zinc-50/60 flex items-center gap-3.5 transition-colors"
                            >
                              <div
                                onClick={() => {
                                  if (onSelectProduct) {
                                    onClose();
                                    onSelectProduct(upsell);
                                  }
                                }}
                                className="w-16 h-20 shrink-0 border border-zinc-200 bg-white cursor-pointer"
                              >
                                <ProductImage
                                  src={upsell.imageUrl}
                                  alt={upsell.name}
                                  category={upsell.category}
                                  styleType={upsell.style}
                                  compact={true}
                                  className="h-full w-full"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                  {upsell.department} · {upsell.category}
                                  {Array.isArray(upsell.materials) && upsell.materials[0]
                                    ? ` · ${upsell.materials[0]}`
                                    : ''}
                                </div>
                                <h4
                                  onClick={() => {
                                    if (onSelectProduct) {
                                      onClose();
                                      onSelectProduct(upsell);
                                    }
                                  }}
                                  className="text-xs font-bold uppercase tracking-wider text-zinc-950 truncate hover:underline cursor-pointer mt-0.5"
                                >
                                  {upsell.name}
                                </h4>
                                <div className="mt-1 flex items-center gap-1.5 font-mono-tabular">
                                  <span className="text-xs font-bold text-zinc-950">
                                    ${upsellPricing.effectivePrice.toLocaleString()}
                                  </span>
                                  {upsellPricing.hasDiscount && (
                                    <span className="text-[10px] text-zinc-400 line-through">
                                      ${upsellPricing.originalPrice.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickAddUpsell(upsell)}
                                className="px-3 py-2 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                              >
                                + Add to Bag
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="samo-checkout-form" onSubmit={handlePlaceOrder} className="space-y-3.5">
              <div className="p-2.5 bg-zinc-50 border border-zinc-200 text-xs flex items-center justify-between">
                <span className="uppercase tracking-wider font-semibold text-zinc-600">
                  Order Summary ({totals.itemsCount} {totals.itemsCount === 1 ? 'Piece' : 'Pieces'})
                </span>
                <button
                  type="button"
                  onClick={stepBackToCart}
                  className="underline text-[11px] uppercase font-bold text-zinc-950 cursor-pointer"
                >
                  Edit Bag
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-300 text-xs text-red-800 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="E.g. Céline Moreau"
                  className="w-full px-3 py-2 text-[16px] sm:text-xs placeholder:text-xs border border-zinc-300 focus:border-zinc-950 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@domain.com"
                    className="w-full px-3 py-2 text-[16px] sm:text-xs placeholder:text-xs border border-zinc-300 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 70 123 456"
                    className="w-full px-3 py-2 text-[16px] sm:text-xs placeholder:text-xs border border-zinc-300 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1">
                    Delivery Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Street, building, floor"
                    className="w-full px-3 py-2 text-[16px] sm:text-xs placeholder:text-xs border border-zinc-300 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1">
                    City &amp; Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={cityCountry}
                    onChange={(e) => setCityCountry(e.target.value)}
                    placeholder="Beirut, Lebanon"
                    className="w-full px-3 py-2 text-[16px] sm:text-xs placeholder:text-xs border border-zinc-300 focus:border-zinc-950 focus:outline-none"
                  />
                </div>
              </div>

              {/* Compact Minimal Promo Code Row (Right Above Delivery Service) */}
              <div className="space-y-1 pt-0.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="PROMO CODE"
                      aria-label="Enter promo code"
                      className="w-full pl-8 pr-2.5 py-2 text-[16px] sm:text-[11px] placeholder:text-[11px] font-mono-tabular uppercase bg-white border border-zinc-300 focus:border-zinc-950 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    className="px-3.5 py-2 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-800 cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </div>
                {promoFeedback && (
                  <p
                    className={`text-[11px] font-medium ${
                      appliedPromo ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {promoFeedback}
                  </p>
                )}
              </div>

              {/* Delivery Service (2 Options) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1.5">
                  Delivery Service
                </label>
                <div className="space-y-2">
                  {(
                    [
                      {
                        method: 'Standard Delivery' as DeliveryMethod,
                        label: standardDeliveryOptionLabel,
                      },
                      {
                        method: 'SAMO Showroom Pickup' as DeliveryMethod,
                        label: 'SAMO Showroom Pickup (Free/ Reserved for 1 Day)',
                      },
                    ]
                  ).map((opt) => (
                    <label
                      key={opt.method}
                      className={`flex items-center justify-between p-2.5 border text-xs cursor-pointer ${
                        deliveryMethod === opt.method
                          ? 'border-zinc-950 bg-zinc-50 font-semibold'
                          : 'border-zinc-200'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          checked={deliveryMethod === opt.method}
                          onChange={() => {
                            setDeliveryMethod(opt.method);
                      if (opt.method === 'Standard Delivery') {
                        if (
                          paymentMethod === 'SRP' ||
                          (!codEnabled && paymentMethod === 'COD')
                        ) {
                          setPaymentMethod('Whish/OMT Payment');
                          setWhishInfoOpen(true);
                        }
                      }
                    }}
                    className="accent-zinc-950"
                  />
                  <span>{opt.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Method (Whish/OMT Payment preselected; SRP shown when Showroom Pickup is selected; COD shown when codEnabled is ON) */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-900 mb-1.5">
            Payment Method
          </label>
          <div className="space-y-2">
            {(
              [
                {
                  method: 'Whish/OMT Payment' as PaymentMethod,
                  label: 'Whish/OMT Payment',
                },
                ...(deliveryMethod === 'SAMO Showroom Pickup'
                  ? [
                      {
                        method: 'SRP' as PaymentMethod,
                        label: 'SRP (Showroom Payment)',
                      },
                    ]
                  : []),
                ...(codEnabled
                  ? [
                      {
                        method: 'COD' as PaymentMethod,
                        label: 'COD (Cash on Delivery)',
                      },
                    ]
                  : []),
              ]
            ).map((opt) => {
              const isWhishOption = opt.method === 'Whish/OMT Payment';
              const isSrpOption = opt.method === 'SRP';
              const isSelected = paymentMethod === opt.method;
              return (
                <div key={opt.method} className="flex flex-col">
                  <label
                    className={`flex items-center justify-between p-2.5 border text-xs cursor-pointer ${
                      isSelected
                        ? 'border-zinc-950 bg-zinc-50 font-semibold'
                        : 'border-zinc-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={isSelected}
                        onChange={() => {
                          setPaymentMethod(opt.method);
                          if (opt.method === 'Whish/OMT Payment') {
                            setWhishInfoOpen(true);
                          } else if (opt.method === 'SRP') {
                            setSrpInfoOpen(true);
                          }
                        }}
                        className="accent-zinc-950"
                      />
                      <span>{opt.label}</span>
                    </span>
                    {isWhishOption && (
                      <span className="flex items-center gap-1.5 shrink-0">
                        <img
                          src="https://images.samoweave.com/logo/samo-whish-.png"
                          alt="Whish"
                          className="h-3.5 sm:h-4 w-auto object-contain shrink-0"
                        />
                        <img
                          src="https://images.samoweave.com/logo/samo-omt.png"
                          alt="OMT"
                          className="h-3.5 sm:h-4 w-auto object-contain shrink-0"
                        />
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setWhishInfoOpen((prev) => !prev);
                            }}
                            aria-label={
                              whishInfoOpen
                                ? 'Collapse Whish/OMT payment number'
                                : 'Expand Whish/OMT payment number'
                            }
                            className="ml-0.5 p-0.5 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center"
                          >
                            {whishInfoOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </span>
                    )}
                    {isSrpOption && isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSrpInfoOpen((prev) => !prev);
                        }}
                        aria-label={
                          srpInfoOpen
                            ? 'Collapse SRP showroom payment note'
                            : 'Expand SRP showroom payment note'
                        }
                        className="ml-0.5 p-0.5 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                      >
                        {srpInfoOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </label>

                  {isWhishOption && isSelected && whishInfoOpen && (
                    <div className="px-3 py-1.5 bg-zinc-950 text-white border border-t-0 border-zinc-950 flex items-center justify-between gap-2 whitespace-nowrap overflow-hidden">
                      <span className="text-[10px] text-zinc-200 tracking-wide truncate">
                        Processed once payment is received on:{' '}
                        <strong className="text-xs font-mono-tabular font-bold text-white underline tracking-wider">
                          705056450
                        </strong>
                      </span>
                    </div>
                  )}

                  {isSrpOption && isSelected && srpInfoOpen && (
                    <div className="px-3 py-1.5 bg-zinc-950 text-white border border-t-0 border-zinc-950 flex items-center justify-between gap-2 whitespace-nowrap overflow-hidden">
                      <span className="text-[10px] text-zinc-200 tracking-wide truncate">
                        Payment is settled in-store upon order pickup.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
            </form>
          )}

          {step === 'confirmed' && confirmedOrder && (
            <div className="py-6 space-y-5">
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em]">
                    Order Sent to SAMO
                  </p>
                  <h3 className="font-display text-lg font-extrabold tracking-wider uppercase text-zinc-950">
                    {confirmedOrder.orderNumber}
                  </h3>
                </div>
              </div>

              {/* Ordered Garments & Reference Codes Breakdown */}
              {Array.isArray(confirmedOrder.orderedItems) &&
                confirmedOrder.orderedItems.length > 0 && (
                  <div className="border border-zinc-200 bg-white divide-y divide-zinc-200">
                    <div className="px-3.5 py-2 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-[0.14em] flex items-center justify-between">
                      <span>Ordered Garments</span>
                      <span>Garment Reference</span>
                    </div>
                    {confirmedOrder.orderedItems.map((lineItem, idx) => {
                      const matchedProd = products.find(
                        (p) => p.id === lineItem.productId
                      );
                      const resolvedCode =
                        lineItem.garmentCode ||
                        (matchedProd
                          ? resolveProductGarmentCode(matchedProd, {
                              selectedColor: lineItem.selectedColor,
                              selectedSetSizes: lineItem.selectedSetSizes,
                              allProducts: products,
                            })
                          : undefined);
                      const formattedRef = formatGarmentCodeRef(resolvedCode);
                      return (
                        <div
                          key={`${lineItem.productId}-${idx}`}
                          className="p-3.5 space-y-1 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold uppercase tracking-wider text-zinc-950">
                              {lineItem.quantity}x {lineItem.productName}
                            </span>
                            {formattedRef && (
                              <span
                                data-testid="confirmed-order-garment-code"
                                className="px-2 py-0.5 bg-zinc-100 border border-zinc-300 font-mono-tabular text-[11px] font-semibold text-zinc-800 shrink-0"
                              >
                                {formattedRef}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-600 uppercase tracking-wider">
                            {lineItem.selectedColor && (
                              <>
                                Color: <strong className="text-zinc-900">{lineItem.selectedColor}</strong> ·{' '}
                              </>
                            )}
                            Size: <strong className="text-zinc-900">{lineItem.selectedSize}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Client</span>
                  <span className="font-semibold text-zinc-950">{confirmedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Location</span>
                  <span className="font-semibold text-zinc-950 text-right">
                    {confirmedOrder.shippingLocation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Primary Piece &amp; Size</span>
                  <span className="font-semibold text-zinc-950 text-right">
                    {confirmedOrder.primaryProductName} ({confirmedOrder.primaryProductSize})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Delivery Method</span>
                  <span className="font-mono-tabular font-semibold text-zinc-950">
                    {confirmedOrder.deliveryMethod} (${confirmedOrder.deliveryFee})
                  </span>
                </div>
                {confirmedOrder.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase">Payment Method</span>
                    <span className="font-semibold text-zinc-950">
                      {confirmedOrder.paymentMethod}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-200 flex justify-between text-sm font-bold">
                  <span className="uppercase">Total Charged</span>
                  <span className="font-mono-tabular">
                    ${confirmedOrder.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compact Bottom Drawer Summary & CTA Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-950 bg-zinc-50 space-y-2.5 shrink-0">
          {step === 'cart' && cartItems.length > 0 && (
            <>
              {/* Bag Totals (Without Delivery — Delivery & Promo Code are in Checkout) */}
              <div className="space-y-1 text-xs">
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span className="uppercase tracking-wider">
                      Promo Discount ({appliedPromo?.code})
                    </span>
                    <span className="font-mono-tabular">
                      -${totals.discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-zinc-950 pt-1">
                  <span className="uppercase tracking-wider">Total</span>
                  <span className="font-mono-tabular">
                    ${bagTotalWithoutDelivery.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('Standard Delivery');
                  setPaymentMethod('Whish/OMT Payment');
                  setWhishInfoOpen(true);
                  setStep('checkout');
                  try {
                    const win = window as unknown as {
                      dataLayer?: Array<Record<string, unknown>>;
                      gtag?: (...args: unknown[]) => void;
                      fbq?: (...args: unknown[]) => void;
                    };
                    const checkoutPayload = {
                      currency: 'USD',
                      value: bagTotalWithoutDelivery,
                      items: cartItems.map((ci) => ({
                        item_id:
                          ci.garmentCode ||
                          ci.product.garmentCode ||
                          ci.product.id,
                        item_name: ci.product.name,
                        item_category: ci.product.category,
                        item_variant: [ci.selectedColor, ci.selectedSize]
                          .filter(Boolean)
                          .join(' / '),
                        price: getEffectiveProductPrice(ci.product).effectivePrice,
                        quantity: ci.quantity,
                      })),
                    };
                    win.dataLayer = win.dataLayer || [];
                    if (typeof win.gtag === 'function') {
                      win.gtag('event', 'begin_checkout', checkoutPayload);
                    }
                    win.dataLayer.push({ ecommerce: null });
                    win.dataLayer.push({
                      event: 'begin_checkout',
                      ecommerce: checkoutPayload,
                    });
                    if (typeof win.fbq === 'function') {
                      win.fbq('track', 'InitiateCheckout', {
                        content_ids: cartItems.map(
                          (ci) =>
                            ci.garmentCode ||
                            ci.product.garmentCode ||
                            ci.product.id
                        ),
                        num_items: cartItems.reduce(
                          (sum, ci) => sum + ci.quantity,
                          0
                        ),
                        value: bagTotalWithoutDelivery,
                        currency: 'USD',
                      });
                    }
                  } catch {}
                  try {
                    const currentHistState = (window.history.state || {}) as {
                      samoBagOpen?: boolean;
                      samoCheckoutStep?: boolean;
                      previousProductId?: string | null;
                    };
                    if (!currentHistState.samoCheckoutStep) {
                      window.history.pushState(
                        {
                          ...currentHistState,
                          samoBagOpen: true,
                          samoCheckoutStep: true,
                        },
                        '',
                        window.location.pathname + window.location.search
                      );
                    }
                  } catch {}
                }}
                className="w-full py-3 px-5 bg-zinc-950 text-white text-xs font-bold tracking-[0.16em] uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Order Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'checkout' && cartItems.length > 0 && (
            <>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span className="uppercase tracking-wider">Bag Subtotal</span>
                  <span className="font-mono-tabular">${totals.subtotal.toLocaleString()}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span className="uppercase tracking-wider">
                      Promo ({appliedPromo?.code})
                    </span>
                    <span className="font-mono-tabular">
                      -${totals.discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span className="uppercase tracking-wider">Delivery ({deliveryMethod})</span>
                  <span className="font-mono-tabular">
                    {totals.deliveryFee === 0 ? 'FREE ($0)' : `$${totals.deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-zinc-950 pt-1 border-t border-zinc-200">
                  <span className="uppercase tracking-wider">Total ({paymentMethod})</span>
                  <span className="font-mono-tabular">${totals.totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                form="samo-checkout-form"
                disabled={submitting}
                className="w-full py-2.5 px-5 bg-zinc-950 text-white text-xs font-bold tracking-[0.16em] uppercase hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting
                  ? 'Transmitting Order...'
                  : `Confirm Order — $${totals.totalPrice.toLocaleString()}`}
              </button>
            </>
          )}

          {step === 'confirmed' && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-5 bg-zinc-950 text-white text-xs font-bold tracking-[0.16em] uppercase hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Continue Exploring SAMO
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
