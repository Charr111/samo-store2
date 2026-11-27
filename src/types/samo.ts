export type Department = 'women' | 'kids';

export type SizeType =
  | 'letter'
  | 'dual_letter'
  | 'numeric'
  | 'months'
  | 'years'
  | 'cm';

export type StyleType =
  | 'Classic'
  | 'Sport Chic'
  | 'Fine Leather'
  | 'Suede'
  | 'Fur'
  | 'Accessories';

export type OrderStatus = 'pending' | 'accepted' | 'rejected';

export type DiscountType = 'none' | 'percentage' | 'fixed';

export type RoutePath =
  | '/home'
  | '/women'
  | '/kids'
  | '/new-arrivals'
  | '/gifts'
  | '/showroom'
  | '/refund-policy'
  | '/exchange-policy'
  | '/shipping-policy'
  | '/admin';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  department: Department;
  description: string;
  sortOrder?: number;
  active?: boolean;
  sizeGuides?: ('tops_guide' | 'trousers_guide')[];
  createdAt?: string;
}

export type SizeGuideId = 'tops_guide' | 'trousers_guide';

export interface SizeGuideTable {
  id: SizeGuideId;
  title: string;
  columns: string[];
  rows: string[][];
}

export interface SizeGuideConfig {
  masterEnabled: boolean;
  topsGuideEnabled: boolean;
  trousersGuideEnabled: boolean;
  fitNoteEnabled: boolean;
  fitNoteTitle: string;
  fitNoteText: string;
  tables: Record<SizeGuideId, SizeGuideTable>;
  updatedAt?: string;
}

export interface ProductColorVariant {
  colorName: string;
  colorHex?: string;
  garmentCode?: string;
  imageUrl: string;
  galleryUrls?: string[];
  sizeType: SizeType;
  sizes: string[];
  sizeQuantities: Record<string, number>;
}

export interface FullSetSubItem {
  productId: string;
  productName: string;
  pieceLabel?: string;
  garmentCode?: string;
  sizeType: SizeType;
  sizes: string[];
  sizeQuantities: Record<string, number>;
  selectedColors?: string[];
  colorVariants?: ProductColorVariant[];
}

export interface SelectedSetPieceSize {
  productId: string;
  productName: string;
  pieceLabel?: string;
  selectedSize: string;
  selectedColor?: string;
  garmentCode?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  garmentCode?: string;
  department: Department;
  category: string;
  style: StyleType;
  price: number;
  quantity: number;
  sizeQuantities: Record<string, number>;
  hasColors?: boolean;
  colorVariants?: ProductColorVariant[];
  isFullSet?: boolean;
  setItems?: FullSetSubItem[];
  isNewArrival: boolean;
  discountType?: DiscountType;
  discountValue?: number;
  imageUrl: string;
  galleryUrls: string[];
  sizeType: SizeType;
  sizes: string[];
  materials: string[];
  description: string;
  inStock: boolean;
  hiddenFromStore?: boolean;
  featured: boolean;
  showInHomeNewArrivals?: boolean;
  homeNewArrivalsOrder?: number;
  isHomeCategoryCover?: boolean;
  showInHomeBags?: boolean;
  homeBagsOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromoCodeItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUsesPerEmail?: number;
  active: boolean;
  createdAt?: string;
}

export interface MaterialOption {
  id: string;
  name: string;
  isPrebuilt?: boolean;
}

export interface CartItem {
  product: ProductItem;
  selectedColor?: string;
  selectedSize: string;
  selectedColorImage?: string;
  selectedSetSizes?: SelectedSetPieceSize[];
  garmentCode?: string;
  quantity: number;
}

export type DeliveryMethod = 'Standard Delivery' | 'SAMO Showroom Pickup';

export type PaymentMethod =
  | 'COD'
  | 'Whish/OMT Payment'
  | 'Whish'
  | 'OMT'
  | 'SRP';

export interface OrderedLineItem {
  productId: string;
  productName: string;
  imageUrl?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedSetSizes?: SelectedSetPieceSize[];
  garmentCode?: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingLocation: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod?: PaymentMethod;
  paymentVerified?: boolean;
  deliveryFee: number;
  subtotal: number;
  discountAmount?: number;
  promoCode?: string;
  totalPrice: number;
  itemsSummary: string;
  itemsCount: number;
  primaryProductName: string;
  primaryProductSize: string;
  primaryProductImage: string;
  orderedItems?: OrderedLineItem[];
  status: OrderStatus;
  createdAt: string;
}

export type PreorderStatus = 'pending' | 'notified';

export interface PreorderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  department: Department;
  category: string;
  selectedSize: string;
  selectedColor?: string;
  customerContact: string;
  status: PreorderStatus;
  createdAt: string;
}

export interface AdminRecord {
  id: string;
  email: string;
  addedBy: string;
  createdAt: string;
}

export interface CategoryBannerConfig {
  categoryKey: string;
  department: Department | 'collection';
  categoryName: string;
  imageUrl: string;
  desktopImageUrl?: string;
  kicker?: string;
  title?: string;
  enabled: boolean;
  insertAfterCount: number;
  updatedAt?: string;
}

export type CategoryBannerItem = CategoryBannerConfig;

export type HeroHeadlineSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SiteBannersConfig {
  homeHeroMediaType: 'video' | 'image';
  homeHeroVideoUrl: string;
  homeHeroDesktopVideoUrl?: string;
  homeHeroImageUrl: string;
  homeHeroDesktopImageUrl?: string;
  homeHeroKicker: string;
  homeHeroTitle: string;
  heroHeadlineText?: string;
  heroHeadlineSize?: HeroHeadlineSize;
  homeMiddleBannerUrl: string;
  homeMiddleDesktopBannerUrl?: string;
  homeMiddleKicker: string;
  homeMiddleTitle: string;
  homeMiddleSubtitle: string;
  homeBottomNewArrivalsUrl: string;
  homeBottomGiftsUrl: string;
  homeBottomShowroomUrl: string;
  showroomHeroBannerUrl: string;
  showroomHeroDesktopBannerUrl?: string;
  orderEmailBannerUrl?: string;
  orderEmailBannerLinkUrl?: string;
  orderEmailSenderAddress?: string;
  orderEmailBccAddress?: string;
  orderEmailReplyToAddress?: string;
  orderEmailPromoEnabled?: boolean;
  orderEmailPromoCode?: string;
  orderEmailPromoDescription?: string;
  orderEmailPromoBannerUrl?: string;
  /** Live Standard Delivery Shipping Fee & Free-Shipping Threshold controls */
  shippingFeeEnabled?: boolean;
  standardDeliveryFee?: number;
  freeShippingThreshold?: number;
  standardDeliveryCheckoutLabel?: string;
  googleSheetsSync?: GoogleSheetsSyncConfig;
  categoryBanners: Record<string, CategoryBannerConfig>;
}

export interface GoogleSheetsSyncConfig {
  enabled: boolean;
  webhookUrl: string;
  syncSecret: string;
  lastSyncedAt?: string;
  lastSyncStatus?: string;
  lastSyncMessage?: string;
}

export interface GoogleSheetInventoryRow {
  sku: string;
  garmentCode: string;
  section: string;
  category: string;
  newArrivals: 'YES' | 'NO';
  productName: string;
  colorOption: string;
  sizeSystem: string;
  size: string;
  quantity: number;
  sellingPriceFormatted: string;
  sellingPrice: number;
  websiteStatus: 'Live' | 'Sold Out';
  productId: string;
}

export interface GoogleSheetIncomingUpdateRow {
  sku?: string;
  productId?: string;
  garmentCode?: string;
  productName?: string;
  colorOption?: string;
  size?: string;
  quantity?: number | string;
  sellingPrice?: number | string;
  websiteStatus?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  phone?: string;
  source?: 'footer' | 'popup';
  subscribedAt: string;
}

export interface NewsletterPopupConfig {
  enabled: boolean;
  delaySeconds: number;
  maxTimesPerDay: number;
  kicker: string;
  title: string;
  subtitle: string;
  buttonText: string;
  promoCode: string;
  discountText: string;
  updatedAt?: string;
}

export interface SeoConfigState {
  lastUpdatedAt: string;
  siteTitleSuffix: string;
  defaultDescription: string;
  defaultKeywords: string[];
  customKeywords?: string[];
  indexedProductsCount: number;
  indexedCategoriesCount: number;
  indexedImagesCount: number;
  productSeoMap: Record<
    string,
    {
      title: string;
      description: string;
      keywords: string[];
      imageAlt: string;
      canonicalPath: string;
    }
  >;
  categorySeoMap: Record<
    string,
    {
      title: string;
      description: string;
      keywords: string[];
      canonicalPath: string;
    }
  >;
}

export interface AdminNotificationSyncState {
  readIds: string[];
  dismissedIds: string[];
  markedAllReadAt?: string;
  clearedAllAt?: string;
  updatedAt?: string;
}




