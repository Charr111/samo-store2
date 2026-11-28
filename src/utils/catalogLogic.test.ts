import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSizeQuantitiesMap,
  calculateOrderTotals,
  createSafeSlug,
  decrementStockForAcceptedOrder,
  filterGiftsProducts,
  filterNewArrivalProducts,
  filterOrdersByQuery,
  getComplementaryUpsellProducts,
  getEffectiveProductPrice,
  getSizeQuantity,
  hasEmailReachedPromoLimit,
  isAuthorizedAdminEmail,
  mergeColorsList,
  mergeMaterialsList,
  normalizeSizeEntry,
  parsePathnameToRoute,
  PREBUILT_COLORS,
  resolveProductQuantity,
  sumSizeQuantities,
  SUPER_ADMIN_EMAILS,
  syncFullSetsWithCatalog,
  syncProductFromColorVariants,
} from './catalogLogic';
import { OrderItem, ProductItem } from '../types/samo';

test('parsePathnameToRoute resolves /home, /women, /kids, /new-arrivals, /gifts, /showroom, and isolates /admin', () => {
  assert.equal(parsePathnameToRoute('/'), '/home');
  assert.equal(parsePathnameToRoute('/home'), '/home');
  assert.equal(parsePathnameToRoute('/women'), '/women');
  assert.equal(parsePathnameToRoute('/kids'), '/kids');
  assert.equal(parsePathnameToRoute('/new-arrivals'), '/new-arrivals');
  assert.equal(parsePathnameToRoute('/gifts'), '/gifts');
  assert.equal(parsePathnameToRoute('/showroom'), '/showroom');
  assert.equal(parsePathnameToRoute('/admin'), '/admin');
  assert.equal(parsePathnameToRoute('/admin/orders'), '/admin');
});

test('normalizeSizeEntry handles letter, numeric, and cm size systems', () => {
  assert.equal(normalizeSizeEntry('small', 'letter'), 'S');
  assert.equal(normalizeSizeEntry('xsmall', 'letter'), 'XS');
  assert.equal(normalizeSizeEntry('38', 'numeric'), '38');
  assert.equal(normalizeSizeEntry('100', 'cm'), '100 cm');
  assert.equal(normalizeSizeEntry('120 cm', 'cm'), '120 cm');
});

test('mergeMaterialsList and mergeColorsList combine 5 prebuilt colors and custom colors without duplicates', () => {
  assert.equal(PREBUILT_COLORS.length, 5);
  const mergedColors = mergeColorsList(['Olive', 'black', 'Navy']);
  assert.equal(mergedColors.includes('Black'), true);
  assert.equal(mergedColors.includes('Olive'), true);
  assert.equal(mergedColors.includes('Navy'), true);
  assert.equal(mergedColors.filter((c) => c.toLowerCase() === 'black').length, 1);

  const merged = mergeMaterialsList(['Shearling', 'cow leather', 'Merino Wool']);
  assert.equal(merged.includes('Cow Leather'), true);
  assert.equal(merged.includes('Shearling'), true);
});

test('isAuthorizedAdminEmail grants access to super admins and dynamically added admins', () => {
  assert.equal(isAuthorizedAdminEmail(SUPER_ADMIN_EMAILS[0], []), true);
  assert.equal(isAuthorizedAdminEmail(SUPER_ADMIN_EMAILS[0].toUpperCase(), []), true);
  assert.equal(isAuthorizedAdminEmail(SUPER_ADMIN_EMAILS[1], []), true);
  assert.equal(isAuthorizedAdminEmail(SUPER_ADMIN_EMAILS[1].toUpperCase(), []), true);
  assert.equal(isAuthorizedAdminEmail(SUPER_ADMIN_EMAILS[2], []), true);
  assert.equal(isAuthorizedAdminEmail(SUPER_ADMIN_EMAILS[2].toUpperCase(), []), true);
  assert.equal(isAuthorizedAdminEmail('stranger@gmail.com', []), false);
  assert.equal(
    isAuthorizedAdminEmail('partner@gmail.com', [{ email: 'partner@gmail.com' }]),
    true
  );
});

test('calculateOrderTotals computes subtotal, promo code discount, delivery fee ($80 threshold / $6 fee or SAMO Showroom Pickup), and total price accurately', () => {
  const standardUnder80 = calculateOrderTotals(
    [{ price: 50, quantity: 1 }],
    'Standard Delivery'
  );
  assert.equal(standardUnder80.subtotal, 50);
  assert.equal(standardUnder80.deliveryFee, 6);
  assert.equal(standardUnder80.totalPrice, 56);

  const pickupUnder80 = calculateOrderTotals(
    [{ price: 50, quantity: 1 }],
    'SAMO Showroom Pickup'
  );
  assert.equal(pickupUnder80.deliveryFee, 0);
  assert.equal(pickupUnder80.totalPrice, 50);

  const withPctPromo = calculateOrderTotals(
    [{ price: 1000, quantity: 1 }],
    'Standard Delivery',
    { discountType: 'percentage', discountValue: 20, active: true }
  );
  assert.equal(withPctPromo.subtotal, 1000);
  assert.equal(withPctPromo.discountAmount, 200);
  assert.equal(withPctPromo.deliveryFee, 0);
  assert.equal(withPctPromo.totalPrice, 800);
});

test('getComplementaryUpsellProducts recommends complementary outfit slots across the whole bag and prioritizes accessible add-on prices', () => {
  const makeProd = (
    id: string,
    department: 'women' | 'kids',
    category: string,
    price = 120,
    hiddenFromStore = false
  ): ProductItem => ({
    id,
    name: id.toUpperCase(),
    department,
    category,
    style: 'Classic',
    price,
    quantity: 5,
    sizeQuantities: { M: 5 },
    isNewArrival: true,
    imageUrl: 'studio://img',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['M'],
    materials: ['Cow Leather'],
    description: 'desc',
    inStock: true,
    hiddenFromStore,
    featured: true,
  });

  const pTrouser1 = makeProd('w-trouser-1', 'women', 'Trousers', 110);
  const pTrouser2 = makeProd('w-trouser-2', 'women', 'Trousers', 110);
  const pDenim1 = makeProd('w-denim-1', 'women', 'Denim', 120);
  const pDenim2 = makeProd('w-denim-2', 'women', 'Denim', 115);
  const pTopAccessible = makeProd('w-top-accessible', 'women', 'Tops', 85);
  const pTopExpensive = makeProd('w-top-expensive', 'women', 'Tops', 320);
  const pTopHidden = makeProd('w-top-hidden', 'women', 'Tops', 80, true);
  const pFur1 = makeProd('w-fur-1', 'women', 'Fur', 180);
  const pFur2 = makeProd('w-fur-2', 'women', 'Fur', 175);
  const pBag = makeProd('w-bag-1', 'women', 'Bags', 95);
  const pKidsBaby1 = makeProd('k-baby-1', 'kids', 'Baby', 75);
  const pKidsBaby2 = makeProd('k-baby-2', 'kids', 'Baby', 65);
  const pKidsJunior = makeProd('k-junior', 'kids', 'Junior', 65);

  const all = [
    pTrouser1,
    pTrouser2,
    pDenim1,
    pDenim2,
    pTopAccessible,
    pTopExpensive,
    pTopHidden,
    pFur1,
    pFur2,
    pBag,
    pKidsBaby1,
    pKidsBaby2,
    pKidsJunior,
  ];

  // 1. Adding Trousers recommends an accessible complementary Top (NOT another Trouser or Denim, and never a hidden item)
  const trouserUpsell = getComplementaryUpsellProducts(
    [{ product: pTrouser1, quantity: 1 }],
    all
  );
  assert.equal(trouserUpsell.length, 1);
  assert.equal(trouserUpsell[0].id, 'w-top-accessible');

  // 2. Adding Denim AND Fur together in the bag evaluates the whole bag (Bottoms + Outerwear already in bag)
  // and recommends the missing complementary Top (NOT another Fur and NOT another Denim)
  const multiItemDenimAndFurUpsell = getComplementaryUpsellProducts(
    [
      { product: pDenim1, quantity: 1 },
      { product: pFur1, quantity: 1 },
    ],
    all
  );
  assert.equal(multiItemDenimAndFurUpsell.length, 1);
  assert.equal(multiItemDenimAndFurUpsell[0].id, 'w-top-accessible');

  // 3. When Denim + Fur + Top are all in the bag, the remaining missing outfit slot is Finishing (Bags)
  const fullOutfitUpsell = getComplementaryUpsellProducts(
    [
      { product: pDenim1, quantity: 1 },
      { product: pFur1, quantity: 1 },
      { product: pTopAccessible, quantity: 1 },
    ],
    all
  );
  assert.equal(fullOutfitUpsell.length, 1);
  assert.equal(fullOutfitUpsell[0].id, 'w-bag-1');

  // 4. Kids age group stays within the matching Kids age group (Baby / MINIS 1 To 5)
  const kidsBabyUpsell = getComplementaryUpsellProducts(
    [{ product: pKidsBaby1, quantity: 1 }],
    all
  );
  assert.equal(kidsBabyUpsell.length, 1);
  assert.equal(kidsBabyUpsell[0].id, 'k-baby-2');

  // 5. Color Harmony & Universal Luxury Neutral Priority:
  // Even when BLUE KNIT ($33) is listed before WHITE KNIT ($33) alphabetically,
  // adding BOMBER JACKET ($35) prioritizes WHITE KNIT (universal luxury neutral) over BLUE KNIT
  const pBomberJacket = {
    ...makeProd('w-bomber', 'women', 'Jackets', 35),
    name: 'BOMBER JACKET',
  };
  const pBlueKnit = {
    ...makeProd('w-blue-knit', 'women', 'Tops', 33),
    name: 'BLUE KNIT',
  };
  const pWhiteKnit = {
    ...makeProd('w-white-knit', 'women', 'Tops', 33),
    name: 'WHITE KNIT',
  };
  const bomberUpsell = getComplementaryUpsellProducts(
    [{ product: pBomberJacket, quantity: 1 }],
    [pBomberJacket, pBlueKnit, pWhiteKnit]
  );
  assert.equal(bomberUpsell.length, 1);
  assert.equal(bomberUpsell[0].id, 'w-white-knit');

  // 6. Dual-Slot "Complete the Look" (limit = 2):
  // Card #1 is the best complementary apparel piece (WHITE KNIT), and Card #2 is the best color-matched One-Size Hat
  const pCrimsonCoat = {
    ...makeProd('w-crimson-coat', 'women', 'Trench Coat', 150),
    name: 'CRIMSON CASHMERE COAT',
  };
  const pEspressoHat = {
    ...makeProd('w-hat-espresso', 'women', 'Hat', 110),
    name: 'ESPRESSO MINK COSSACK',
    style: 'Accessories' as const,
    sizes: ['OS'],
    sizeQuantities: { OS: 1 },
  };
  const pBurgundyHat = {
    ...makeProd('w-hat-burgundy', 'women', 'Hat', 110),
    name: 'BURGUNDY MINK COSSACK',
    style: 'Accessories' as const,
    sizes: ['OS'],
    sizeQuantities: { OS: 2 },
  };
  const dualSlotUpsell = getComplementaryUpsellProducts(
    [{ product: pCrimsonCoat, quantity: 1 }],
    [pCrimsonCoat, pBlueKnit, pWhiteKnit, pEspressoHat, pBurgundyHat],
    2
  );
  assert.equal(dualSlotUpsell.length, 2);
  assert.equal(dualSlotUpsell[0].id, 'w-white-knit');
  assert.equal(dualSlotUpsell[1].id, 'w-hat-burgundy');
});

test('buildSizeQuantitiesMap defaults blank sizes to 5 and sumSizeQuantities totals per-size stock', () => {
  const sizes = ['S', 'M', 'L'];
  const map = buildSizeQuantitiesMap(sizes, { S: '', M: 0, L: '3' });
  assert.deepEqual(map, { S: 5, M: 0, L: 3 });
  assert.equal(sumSizeQuantities(sizes, map), 8);
  assert.equal(resolveProductQuantity(''), 5);
});

test('syncProductFromColorVariants and decrementStockForAcceptedOrder handle per-color per-size quantities', () => {
  const variants = [
    {
      colorName: 'Black',
      imageUrl: 'studio://black-jacket',
      sizeType: 'letter' as const,
      sizes: ['S', 'M'],
      sizeQuantities: { S: 5, M: 2 },
    },
    {
      colorName: 'Burgundy',
      imageUrl: 'studio://burgundy-jacket',
      sizeType: 'letter' as const,
      sizes: ['S', 'M'],
      sizeQuantities: { S: 0, M: 4 },
    },
  ];

  const synced = syncProductFromColorVariants(variants, 'letter');
  assert.equal(synced.quantity, 11);
  assert.deepEqual(synced.sizeQuantities, { S: 5, M: 6 });

  const prod: ProductItem = {
    id: 'p-color',
    name: 'MULTI COLOR JACKET',
    department: 'women',
    category: 'Jacket',
    style: 'Fine Leather',
    price: 3000,
    quantity: synced.quantity,
    sizeQuantities: synced.sizeQuantities,
    hasColors: true,
    colorVariants: variants,
    isNewArrival: true,
    imageUrl: 'studio://black-jacket',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: synced.sizes,
    materials: ['Cow Leather'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  assert.equal(getSizeQuantity(prod, 'S', 'Black'), 5);
  assert.equal(getSizeQuantity(prod, 'S', 'Burgundy'), 0);
  assert.equal(getSizeQuantity(prod, 'M', 'Burgundy'), 4);

  const order: OrderItem = {
    id: 'o-col',
    orderNumber: 'SAMO-7914',
    customerName: 'Buyer',
    customerEmail: 'b@test.com',
    customerPhone: '111',
    shippingLocation: 'Loc',
    deliveryMethod: 'Standard Delivery',
    deliveryFee: 0,
    subtotal: 3000,
    totalPrice: 3000,
    itemsSummary: '1x MULTI COLOR JACKET',
    itemsCount: 1,
    primaryProductName: 'MULTI COLOR JACKET',
    primaryProductSize: 'M',
    primaryProductImage: 'studio://burgundy-jacket',
    orderedItems: [
      {
        productId: 'p-color',
        productName: 'MULTI COLOR JACKET',
        selectedColor: 'Burgundy',
        selectedSize: 'M',
        quantity: 2,
      },
    ],
    status: 'accepted',
    createdAt: '2026-10-20T00:00:00Z',
  };

  const afterOrder = decrementStockForAcceptedOrder([prod], order);
  assert.equal(getSizeQuantity(afterOrder[0], 'M', 'Burgundy'), 2);
  assert.equal(getSizeQuantity(afterOrder[0], 'M', 'Black'), 2);
  assert.equal(afterOrder[0].quantity, 9);
});

test('Full Set products simultaneously decrement standalone component products and sync back', () => {
  const standaloneTop: ProductItem = {
    id: 'top-1',
    name: 'SATIN TOP',
    department: 'women',
    category: 'Tops',
    style: 'Classic',
    price: 900,
    quantity: 10,
    sizeQuantities: { S: 5, M: 5 },
    isNewArrival: true,
    imageUrl: 'studio://top',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Silk'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const standaloneTrouser: ProductItem = {
    id: 'trouser-1',
    name: 'WOOL TROUSERS',
    department: 'women',
    category: 'Trousers',
    style: 'Classic',
    price: 1200,
    quantity: 10,
    sizeQuantities: { '36': 5, '38': 5 },
    isNewArrival: true,
    imageUrl: 'studio://trouser',
    galleryUrls: [],
    sizeType: 'numeric',
    sizes: ['36', '38'],
    materials: ['Wool'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const fullSetProd: ProductItem = {
    id: 'set-1',
    name: 'RUNWAY FULL SET',
    department: 'women',
    category: 'Full Set',
    style: 'Classic',
    price: 1950,
    quantity: 10,
    sizeQuantities: { S: 5, M: 5 },
    isFullSet: true,
    setItems: [
      {
        productId: 'top-1',
        productName: 'SATIN TOP',
        pieceLabel: 'Top / Shirt',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 5, M: 5 },
      },
      {
        productId: 'trouser-1',
        productName: 'WOOL TROUSERS',
        pieceLabel: 'Trousers / Bottom',
        sizeType: 'numeric',
        sizes: ['36', '38'],
        sizeQuantities: { '36': 5, '38': 5 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'studio://set',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Silk', 'Wool'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const orderFullSet: OrderItem = {
    id: 'ord-set-1',
    orderNumber: 'SAMO-9001',
    customerName: 'Buyer',
    customerEmail: 'b@test.com',
    customerPhone: '123',
    shippingLocation: 'Beirut',
    deliveryMethod: 'Standard Delivery',
    deliveryFee: 0,
    subtotal: 1950,
    totalPrice: 1950,
    itemsSummary: '1x RUNWAY FULL SET',
    itemsCount: 1,
    primaryProductName: 'RUNWAY FULL SET',
    primaryProductSize: 'M / 36',
    primaryProductImage: 'studio://set',
    orderedItems: [
      {
        productId: 'set-1',
        productName: 'RUNWAY FULL SET',
        selectedSize: 'M / 36',
        selectedSetSizes: [
          { productId: 'top-1', productName: 'SATIN TOP', selectedSize: 'M' },
          { productId: 'trouser-1', productName: 'WOOL TROUSERS', selectedSize: '36' },
        ],
        quantity: 2,
      },
    ],
    status: 'accepted',
    createdAt: '2026-10-20T00:00:00Z',
  };

  const updated = decrementStockForAcceptedOrder(
    [standaloneTop, standaloneTrouser, fullSetProd],
    orderFullSet
  );
  const nextTop = updated.find((p) => p.id === 'top-1')!;
  const nextTrouser = updated.find((p) => p.id === 'trouser-1')!;
  const nextSet = updated.find((p) => p.id === 'set-1')!;

  // Standalone top size M decreased from 5 -> 3
  assert.equal(nextTop.sizeQuantities['M'], 3);
  // Standalone trouser size 36 decreased from 5 -> 3
  assert.equal(nextTrouser.sizeQuantities['36'], 3);
  // Full Set's setItems also reflect the decreased quantities (3 and 3)
  assert.equal(nextSet.setItems![0].sizeQuantities['M'], 3);
  assert.equal(nextSet.setItems![1].sizeQuantities['36'], 3);

  // Now test ordering the standalone top alone and verify the Full Set also decreases simultaneously
  const orderStandaloneTop: OrderItem = {
    ...orderFullSet,
    id: 'ord-top-only',
    orderedItems: [
      {
        productId: 'top-1',
        productName: 'SATIN TOP',
        selectedSize: 'M',
        quantity: 1,
      },
    ],
  };
  const updated2 = decrementStockForAcceptedOrder(updated, orderStandaloneTop);
  const nextTop2 = updated2.find((p) => p.id === 'top-1')!;
  const nextSet2 = updated2.find((p) => p.id === 'set-1')!;
  assert.equal(nextTop2.sizeQuantities['M'], 2);
  assert.equal(nextSet2.setItems![0].sizeQuantities['M'], 2);
});

test('getEffectiveProductPrice and filterOrdersByQuery work as expected', () => {
  const pctDisc = getEffectiveProductPrice({
    price: 1000,
    discountType: 'percentage',
    discountValue: 15,
  });
  assert.equal(pctDisc.hasDiscount, true);
  assert.equal(pctDisc.effectivePrice, 850);
  assert.equal(pctDisc.discountBadge, 'Save 15%');

  const fixedDisc = getEffectiveProductPrice({
    price: 1000,
    discountType: 'fixed',
    discountValue: 10,
  });
  assert.equal(fixedDisc.hasDiscount, true);
  assert.equal(fixedDisc.effectivePrice, 990);
  assert.equal(fixedDisc.discountBadge, 'Save $10');

  const sampleOrders: OrderItem[] = [
    {
      id: '1',
      orderNumber: 'SAMO-8491',
      customerName: 'Céline Moreau',
      customerEmail: 'celine@paris.fr',
      customerPhone: '123',
      shippingLocation: 'Paris',
      deliveryMethod: 'Standard Delivery',
      deliveryFee: 0,
      subtotal: 3250,
      totalPrice: 3250,
      itemsSummary: '1x Jacket',
      itemsCount: 1,
      primaryProductName: 'Jacket',
      primaryProductSize: 'M',
      primaryProductImage: 'img',
      status: 'pending',
      createdAt: '2026-10-20T00:00:00Z',
    },
  ];
  assert.equal(filterOrdersByQuery(sampleOrders, '8491').length, 1);
  assert.equal(filterNewArrivalProducts([]).length, 0);
  assert.equal(filterGiftsProducts([]).length, 0);
  assert.equal(syncFullSetsWithCatalog([]).length, 0);
});

import {
  calculateCLimitDimensions,
  sanitizeUploadFileName,
} from './imageCompression';

test('calculateCLimitDimensions downscales large images proportionally (c_limit 720x960) and never upscales smaller images', () => {
  // Already smaller than 720x960 -> never upscaled
  assert.deepEqual(calculateCLimitDimensions(500, 600, 720, 960), {
    width: 500,
    height: 600,
  });

  // Portrait camera photo 3000x4000 -> 720x960
  assert.deepEqual(calculateCLimitDimensions(3000, 4000, 720, 960), {
    width: 720,
    height: 960,
  });

  // Landscape photo 4000x2000 -> constrained by maxWidth 720 -> 720x360
  assert.deepEqual(calculateCLimitDimensions(4000, 2000, 720, 960), {
    width: 720,
    height: 360,
  });

  // Tall vertical image 1000x3000 -> constrained by maxHeight 960 -> 320x960
  assert.deepEqual(calculateCLimitDimensions(1000, 3000, 720, 960), {
    width: 320,
    height: 960,
  });
});

test('sanitizeUploadFileName creates clean timestamped .webp filenames', () => {
  const sanitized = sanitizeUploadFileName(
    'SAMO Leather Jacket (Front View) #1.JPG',
    1760000000000
  );
  assert.equal(
    sanitized,
    '1760000000000-samo-leather-jacket-front-view-1.webp'
  );

  const fallback = sanitizeUploadFileName('   .png', 1760000000001);
  assert.equal(fallback, '1760000000001-samo-item.webp');
});

import {
  getCategoriesByDepartment,
  normalizeKidsCategoryName,
} from './catalogLogic';

test('normalizeKidsCategoryName maps Baby to MINIS 1 To 5, Junior to CHILDREN 6+, Teen to Teen 13+, and getCategoriesByDepartment removes Full Set from Kids only', () => {
  assert.equal(normalizeKidsCategoryName('Baby'), 'MINIS 1 To 5');
  assert.equal(normalizeKidsCategoryName('Junior'), 'CHILDREN 6+');
  assert.equal(normalizeKidsCategoryName('Teen'), 'Teen 13+');

  const rawCategories = [
    {
      id: 'w-fs',
      name: 'Full Set',
      slug: 'full-set',
      department: 'women' as const,
      description: 'Women full set',
    },
    {
      id: 'k-baby',
      name: 'Baby',
      slug: 'baby',
      department: 'kids' as const,
      description: 'Kids minis',
    },
    {
      id: 'k-junior',
      name: 'Junior',
      slug: 'junior',
      department: 'kids' as const,
      description: 'Kids children',
    },
    {
      id: 'k-teen',
      name: 'Teen',
      slug: 'teen',
      department: 'kids' as const,
      description: 'Kids teen',
    },
    {
      id: 'k-fs',
      name: 'Full Set',
      slug: 'full-set',
      department: 'kids' as const,
      description: 'Legacy kids full set',
    },
  ];

  const womenCats = getCategoriesByDepartment(rawCategories, 'women');
  const kidsCats = getCategoriesByDepartment(rawCategories, 'kids');

  assert.equal(womenCats.some((c) => c.name === 'Full Set'), true);
  assert.deepEqual(
    kidsCats.map((c) => c.name),
    ['MINIS 1 To 5', 'CHILDREN 6+', 'Teen 13+']
  );
  assert.equal(kidsCats.some((c) => c.name === 'Full Set'), false);
});

import { filterCatalogProducts } from './catalogLogic';

test('Women product added to both Full Set and New Arrivals appears in both Full Set category and New Arrivals', () => {
  const dualProd: ProductItem = {
    id: 'samo-women-test-set',
    name: 'ATELIER SUEDE MONOLITH SET',
    department: 'women',
    category: 'Full Set',
    style: 'Suede',
    price: 1850,
    quantity: 15,
    sizeQuantities: { S: 5, M: 5, L: 5 },
    isFullSet: true,
    isNewArrival: true,
    imageUrl: 'https://images.samoweave.com/products/test-set.webp',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M', 'L'],
    materials: ['Suede'],
    description: 'Two-piece suede full set.',
    inStock: true,
    featured: true,
  };

  const fullSetMatches = filterCatalogProducts([dualProd], {
    department: 'women',
    category: 'Full Set',
  });
  const newArrivalMatches = filterNewArrivalProducts([dualProd]);

  assert.equal(fullSetMatches.length, 1);
  assert.equal(fullSetMatches[0].id, 'samo-women-test-set');
  assert.equal(newArrivalMatches.length, 1);
  assert.equal(newArrivalMatches[0].id, 'samo-women-test-set');
  assert.equal(
    sanitizeUploadFileName('photo.HEIC', 1760000000002, 'image/jpeg'),
    '1760000000002-photo.jpg'
  );
});

import {
  buildDefaultSiteBanners,
  getCategoryBannerKey,
  getCategoryBannerSplitIndex,
  mergeSiteBannersConfig,
  resolveBannerMediaPair,
  toggleProductInStockState,
} from './catalogLogic';
import { INITIAL_CATEGORIES } from '../data/seedCatalog';

test('toggleProductInStockState sets inStock=false when toggled off and restores inStock=true when toggled on', () => {
  const sample: ProductItem = {
    id: 'samo-w-toggle-1',
    name: 'NOIR LEATHER TRENCH',
    department: 'women',
    category: 'Trench Coat',
    style: 'Fine Leather',
    price: 3800,
    quantity: 10,
    sizeQuantities: { S: 5, M: 5 },
    isNewArrival: true,
    imageUrl: 'studio://women-trench-suede-coat',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Cow Leather'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const toggledOff = toggleProductInStockState(sample, false);
  assert.equal(toggledOff.inStock, false);

  const toggledBackOn = toggleProductInStockState(toggledOff, true);
  assert.equal(toggledBackOn.inStock, true);
  assert.equal(toggledBackOn.quantity, 10);

  // Also test when all sizes had 0 stock and admin toggles ON -> refills default 5 per size
  const zeroStock: ProductItem = {
    ...sample,
    quantity: 0,
    sizeQuantities: { S: 0, M: 0 },
    inStock: false,
  };
  const refilled = toggleProductInStockState(zeroStock, true);
  assert.equal(refilled.inStock, true);
  assert.equal(refilled.quantity, 10);
  assert.deepEqual(refilled.sizeQuantities, { S: 5, M: 5 });
});

test('getCategoryBannerKey, getCategoryBannerSplitIndex, and mergeSiteBannersConfig manage site & category in-feed banners', () => {
  assert.equal(getCategoryBannerKey('women', 'Jacket'), 'women:jacket');
  assert.equal(getCategoryBannerKey('kids', 'Baby'), 'kids:minis-1-to-5');

  // When 6 products exist and insertAfterCount is 4 -> split at 4
  assert.equal(getCategoryBannerSplitIndex(6, 4), 4);
  // When 2 products exist and insertAfterCount is 4 -> split at 1 (so banner appears between the 2 products)
  assert.equal(getCategoryBannerSplitIndex(2, 4), 1);
  // When 1 product exists -> split at 1 (banner appears right after the first product)
  assert.equal(getCategoryBannerSplitIndex(1, 4), 1);
  assert.equal(getCategoryBannerSplitIndex(0, 4), 0);

  const defaults = buildDefaultSiteBanners(INITIAL_CATEGORIES);
  assert.equal(defaults.homeHeroMediaType, 'video');
  assert.equal(defaults.heroHeadlineText, 'WINTER EDITION');
  assert.equal(defaults.heroHeadlineSize, 'md');
  assert.equal(Boolean(defaults.categoryBanners['women:jacket']?.enabled), true);
  assert.equal(Boolean(defaults.categoryBanners['kids:minis-1-to-5']?.enabled), true);

  const merged = mergeSiteBannersConfig(
    {
      homeHeroMediaType: 'image',
      homeHeroImageUrl: 'https://images.samoweave.com/products/custom-hero.webp',
      homeHeroDesktopImageUrl: 'https://images.samoweave.com/banners/custom-hero-desktop.webp',
      homeMiddleDesktopBannerUrl: 'https://images.samoweave.com/banners/kids-middle-desktop.webp',
      showroomHeroDesktopBannerUrl: 'https://images.samoweave.com/banners/showroom-desktop.webp',
      heroHeadlineText: '',
      heroHeadlineSize: 'xl',
      categoryBanners: {
        'women:jacket': {
          categoryKey: 'women:jacket',
          department: 'women',
          categoryName: 'Jacket',
          enabled: true,
          imageUrl: 'https://images.samoweave.com/products/jacket-banner.webp',
          desktopImageUrl: 'https://images.samoweave.com/banners/jacket-banner-desktop.webp',
          title: 'CUSTOM JACKET ARCHIVE',
          kicker: 'LIMITED EDITION',
          insertAfterCount: 6,
        },
      },
    },
    INITIAL_CATEGORIES
  );
  assert.equal(merged.homeHeroMediaType, 'image');
  assert.equal(merged.heroHeadlineText, '');
  assert.equal(merged.heroHeadlineSize, 'xl');
  assert.equal(
    merged.homeHeroDesktopImageUrl,
    'https://images.samoweave.com/banners/custom-hero-desktop.webp'
  );
  assert.equal(
    merged.homeMiddleDesktopBannerUrl,
    'https://images.samoweave.com/banners/kids-middle-desktop.webp'
  );
  assert.equal(
    merged.showroomHeroDesktopBannerUrl,
    'https://images.samoweave.com/banners/showroom-desktop.webp'
  );
  assert.equal(
    merged.categoryBanners['women:jacket'].imageUrl,
    'https://images.samoweave.com/products/jacket-banner.webp'
  );
  assert.equal(
    merged.categoryBanners['women:jacket'].desktopImageUrl,
    'https://images.samoweave.com/banners/jacket-banner-desktop.webp'
  );
  assert.equal(merged.categoryBanners['women:jacket'].insertAfterCount, 6);
  // Other categories retain their defaults
  assert.equal(Boolean(merged.categoryBanners['women:bags']?.imageUrl), true);

  // Mutual Fallback verification via resolveBannerMediaPair:
  // 1. Only Mobile/Primary uploaded -> displays on both Mobile and Desktop
  const mobileOnly = resolveBannerMediaPair('https://images.samoweave.com/banners/m.webp', '');
  assert.equal(mobileOnly.mobileUrl, 'https://images.samoweave.com/banners/m.webp');
  assert.equal(mobileOnly.desktopUrl, 'https://images.samoweave.com/banners/m.webp');
  assert.equal(mobileOnly.hasSeparateDesktop, false);

  // 2. Only Desktop uploaded -> displays on both Desktop and Mobile
  const desktopOnly = resolveBannerMediaPair('', 'https://images.samoweave.com/banners/d.webp');
  assert.equal(desktopOnly.mobileUrl, 'https://images.samoweave.com/banners/d.webp');
  assert.equal(desktopOnly.desktopUrl, 'https://images.samoweave.com/banners/d.webp');
  assert.equal(desktopOnly.hasSeparateDesktop, false);

  // 3. Both Mobile and Desktop uploaded -> Mobile uses m.webp, Desktop uses d.webp
  const bothPair = resolveBannerMediaPair(
    'https://images.samoweave.com/banners/m.webp',
    'https://images.samoweave.com/banners/d.webp'
  );
  assert.equal(bothPair.mobileUrl, 'https://images.samoweave.com/banners/m.webp');
  assert.equal(bothPair.desktopUrl, 'https://images.samoweave.com/banners/d.webp');
  assert.equal(bothPair.hasSeparateDesktop, true);
});

import {
  DUAL_LETTER_SIZES,
  getDefaultSizesForType,
  MONTHS_SIZES,
  YEARS_SIZES,
} from './catalogLogic';

test('Dual-Letter (S/M, M/L, L/XL), Months, and Years size types provide prebuilt sizes and normalize custom sizes', () => {
  assert.deepEqual(DUAL_LETTER_SIZES, ['S/M', 'M/L', 'L/XL']);
  assert.deepEqual(getDefaultSizesForType('dual_letter'), [
    'S/M',
    'M/L',
    'L/XL',
  ]);
  assert.equal(normalizeSizeEntry('xs / s', 'dual_letter'), 'XS/S');
  assert.equal(normalizeSizeEntry('xl-xxl', 'dual_letter'), 'XL/XXL');

  assert.equal(MONTHS_SIZES.includes('9-12 Months'), true);
  assert.equal(MONTHS_SIZES.includes('6-9M'), true);
  assert.deepEqual(getDefaultSizesForType('months'), [
    '3-6 Months',
    '6-12 Months',
    '12-18 Months',
    '18-24 Months',
  ]);
  assert.equal(YEARS_SIZES.includes('11y'), true);
  assert.deepEqual(getDefaultSizesForType('years').slice(0, 4), [
    '2-3 Years',
    '4-5 Years',
    '6-7 Years',
    '8-9 Years',
  ]);

  assert.equal(normalizeSizeEntry('0-3', 'months'), '0-3 Months');
  assert.equal(normalizeSizeEntry('24-36 Months', 'months'), '24-36 Months');
  assert.equal(normalizeSizeEntry('10-11', 'years'), '10-11 Years');
  assert.equal(normalizeSizeEntry('12-13 Years', 'years'), '12-13 Years');
  assert.equal(normalizeSizeEntry('38/39', 'numeric'), '38/39');
});

test('Full Set with multi-color linked pieces defaults to first color if none selected, syncs color variants, and deducts exact color+size stock from original products when bought', () => {
  const multiColorShirt: ProductItem = {
    id: 'shirt-multi-1',
    name: 'SILK ATELIER SHIRT',
    department: 'women',
    category: 'Tops',
    style: 'Classic',
    price: 900,
    quantity: 20,
    sizeQuantities: { S: 5, M: 5 },
    hasColors: true,
    colorVariants: [
      {
        colorName: 'Ivory',
        colorHex: '#FFFFF0',
        imageUrl: 'ivory.jpg',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 5, M: 5 },
      },
      {
        colorName: 'Noir',
        colorHex: '#09090B',
        imageUrl: 'noir.jpg',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 4, M: 6 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'ivory.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Silk'],
    description: 'Shirt',
    inStock: true,
    featured: true,
  };

  const trousers: ProductItem = {
    id: 'trousers-1',
    name: 'TAILORED WOOL TROUSERS',
    department: 'women',
    category: 'Pants',
    style: 'Classic',
    price: 1100,
    quantity: 10,
    sizeQuantities: { '36': 5, '38': 5 },
    hasColors: false,
    colorVariants: [],
    isNewArrival: true,
    imageUrl: 'trousers.jpg',
    galleryUrls: [],
    sizeType: 'numeric',
    sizes: ['36', '38'],
    materials: ['Wool'],
    description: 'Trousers',
    inStock: true,
    featured: true,
  };

  const fullSetDefaultColor: ProductItem = {
    id: 'fullset-default-col',
    name: 'SILK & WOOL MONOLITH SET',
    department: 'women',
    category: 'Full Set',
    style: 'Classic',
    price: 1850,
    quantity: 10,
    sizeQuantities: { S: 5, M: 5 },
    isFullSet: true,
    setItems: [
      {
        productId: 'shirt-multi-1',
        productName: 'SILK ATELIER SHIRT',
        pieceLabel: 'Shirt',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 5, M: 5 },
        // selectedColors omitted -> should default to first color ('Ivory')
      },
      {
        productId: 'trousers-1',
        productName: 'TAILORED WOOL TROUSERS',
        pieceLabel: 'Trousers',
        sizeType: 'numeric',
        sizes: ['36', '38'],
        sizeQuantities: { '36': 5, '38': 5 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'set.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: [],
    description: 'Set',
    inStock: true,
    featured: true,
  };

  const syncedDefault = syncFullSetsWithCatalog([
    multiColorShirt,
    trousers,
    fullSetDefaultColor,
  ]);
  const syncedSet1 = syncedDefault.find((p) => p.id === 'fullset-default-col')!;
  assert.deepEqual(syncedSet1.setItems![0].selectedColors, ['Ivory']);
  assert.equal(syncedSet1.setItems![0].colorVariants?.length, 1);

  // Now test when admin selects BOTH colors ('Ivory' and 'Noir') and user buys 'Noir' size 'M' + Trousers size '38'
  const fullSetAllColors: ProductItem = {
    ...fullSetDefaultColor,
    setItems: [
      {
        ...fullSetDefaultColor.setItems![0],
        selectedColors: ['Ivory', 'Noir'],
      },
      fullSetDefaultColor.setItems![1],
    ],
  };

  const catalogBeforeOrder = syncFullSetsWithCatalog([
    multiColorShirt,
    trousers,
    fullSetAllColors,
  ]);

  const order: OrderItem = {
    id: 'ord-fs-1',
    orderNumber: 'SAMO-9001',
    customerName: 'Aria',
    customerEmail: 'aria@samo.com',
    customerPhone: '123456',
    shippingLocation: 'Paris',
    deliveryMethod: 'Standard Delivery',
    deliveryFee: 0,
    subtotal: 3700,
    totalPrice: 3700,
    itemsSummary: '2x SILK & WOOL MONOLITH SET',
    itemsCount: 2,
    primaryProductName: 'SILK & WOOL MONOLITH SET',
    primaryProductSize: 'Shirt: Noir · M / Trousers: 38',
    primaryProductImage: 'set.jpg',
    orderedItems: [
      {
        productId: 'fullset-default-col',
        productName: 'SILK & WOOL MONOLITH SET',
        selectedSize: 'Shirt: Noir · M / Trousers: 38',
        selectedSetSizes: [
          {
            productId: 'shirt-multi-1',
            productName: 'SILK ATELIER SHIRT',
            selectedSize: 'M',
            selectedColor: 'Noir',
          },
          {
            productId: 'trousers-1',
            productName: 'TAILORED WOOL TROUSERS',
            selectedSize: '38',
          },
        ],
        quantity: 2,
      },
    ],
    status: 'accepted',
    createdAt: '2026-11-08T10:00:00Z',
  };

  const afterOrder = decrementStockForAcceptedOrder(catalogBeforeOrder, order);
  const updatedShirt = afterOrder.find((p) => p.id === 'shirt-multi-1')!;
  const updatedTrousers = afterOrder.find((p) => p.id === 'trousers-1')!;
  const updatedFullSet = afterOrder.find((p) => p.id === 'fullset-default-col')!;

  // Noir M was 6 -> now 4; Ivory M stays 5
  const noirVar = updatedShirt.colorVariants!.find((v) => v.colorName === 'Noir')!;
  const ivoryVar = updatedShirt.colorVariants!.find((v) => v.colorName === 'Ivory')!;
  assert.equal(noirVar.sizeQuantities.M, 4);
  assert.equal(ivoryVar.sizeQuantities.M, 5);

  // Trousers '38' was 5 -> now 3
  assert.equal(updatedTrousers.sizeQuantities!['38'], 3);

  // Full Set synced piece colorVariants also reflect Noir M = 4 and Trousers 38 = 3
  const fsShirtNoir = updatedFullSet.setItems![0].colorVariants!.find(
    (v) => v.colorName === 'Noir'
  )!;
  assert.equal(fsShirtNoir.sizeQuantities.M, 4);
  assert.equal(updatedFullSet.setItems![1].sizeQuantities['38'], 3);
});

import {
  moveCategoryInDepartment,
  renumberDepartmentCategoriesSequentially,
  updateCategorySortOrder,
  validateNewsletterPopupInputs,
} from './catalogLogic';
import {
  buildDynamicPageSeo,
  buildProductImageSeoAlt,
  generateCatalogSeoSnapshot,
} from './seoLogic';
import { INITIAL_PRODUCTS } from '../data/seedCatalog';

test('Category ordering supports 1,2,3... numbering, decimal insertion (e.g. 1.5, 2.5), Move Up/Down, and Clean Numbering', () => {
  const womenDefault = getCategoriesByDepartment(INITIAL_CATEGORIES, 'women');
  assert.equal(womenDefault[0].name, 'Jackets');
  assert.equal(womenDefault[0].sortOrder, 1);
  assert.equal(womenDefault[1].name, 'Trousers');
  assert.equal(womenDefault[1].sortOrder, 2);

  // Insert 'Fur' (currently #9) between #1 (Jackets) and #2 (Trousers) by setting sortOrder = 1.5
  const withDecimal = updateCategorySortOrder(
    INITIAL_CATEGORIES,
    'women-fur',
    1.5
  );
  const sortedAfterDecimal = getCategoriesByDepartment(withDecimal, 'women');
  assert.equal(sortedAfterDecimal[0].name, 'Jackets');
  assert.equal(sortedAfterDecimal[1].name, 'Fur');
  assert.equal(sortedAfterDecimal[1].sortOrder, 1.5);
  assert.equal(sortedAfterDecimal[2].name, 'Trousers');

  // Move 'Trousers' up one slot (swaps with 'Fur')
  const afterMoveUp = moveCategoryInDepartment(
    withDecimal,
    'women',
    'women-trousers',
    'up'
  );
  const sortedAfterMove = getCategoriesByDepartment(afterMoveUp, 'women');
  assert.equal(sortedAfterMove[1].name, 'Trousers');
  assert.equal(sortedAfterMove[2].name, 'Fur');

  // Clean Numbering re-normalizes 1, 2, 3, 4...
  const cleaned = renumberDepartmentCategoriesSequentially(afterMoveUp, 'women');
  const sortedCleaned = getCategoriesByDepartment(cleaned, 'women');
  assert.deepEqual(
    sortedCleaned.slice(0, 3).map((c) => c.sortOrder),
    [1, 2, 3]
  );
});

test('validateNewsletterPopupInputs supports single-box Email Or Number (e.g. johndoe@gmail.com, 70 123 456) and 2-argument calls', () => {
  // 2-argument legacy call
  const invalidEmail = validateNewsletterPopupInputs(
    'client@domain.org',
    '+961 70 123 456'
  );
  assert.equal(invalidEmail.valid, false);
  assert.equal(invalidEmail.emailValid, false);
  assert.equal(invalidEmail.phoneValid, true);

  const validBoth = validateNewsletterPopupInputs(
    'client@samoweave.com',
    '+961 71 234 567'
  );
  assert.equal(validBoth.valid, true);
  assert.equal(validBoth.emailValid, true);
  assert.equal(validBoth.phoneValid, true);

  // Single-box input: email only
  const singleEmail = validateNewsletterPopupInputs('johndoe@gmail.com');
  assert.equal(singleEmail.valid, true);
  assert.equal(singleEmail.emailValid, true);
  assert.equal(singleEmail.cleanEmail, 'johndoe@gmail.com');

  // Single-box input: Lebanese phone number without +961
  const singlePhone = validateNewsletterPopupInputs('70 123 456');
  assert.equal(singlePhone.valid, true);
  assert.equal(singlePhone.phoneValid, true);
  assert.equal(singlePhone.cleanPhone, '70 123 456');

  // Single-box input: combined email and phone separated by comma
  const combinedBoth = validateNewsletterPopupInputs(
    'johndoe@gmail.com, 70 123 456'
  );
  assert.equal(combinedBoth.valid, true);
  assert.equal(combinedBoth.emailValid, true);
  assert.equal(combinedBoth.phoneValid, true);
  assert.equal(combinedBoth.cleanEmail, 'johndoe@gmail.com');
  assert.equal(combinedBoth.cleanPhone, '70 123 456');

  // Single-box input: too short phone and no email
  const invalidSingle = validateNewsletterPopupInputs('1234');
  assert.equal(invalidSingle.valid, false);
});

test('buildProductImageSeoAlt, generateCatalogSeoSnapshot (with customKeywords), and buildDynamicPageSeo generate clean fashion SEO metadata', () => {
  const altText = buildProductImageSeoAlt({
    alt: 'Biker Jacket',
    category: 'Jacket',
    style: 'Fine Leather',
    department: 'women',
  });
  assert.equal(altText.includes('SAMO'), true);
  assert.equal(altText.includes('Jacket'), true);
  assert.equal(altText.includes('SAMO Atelier'), false);
  assert.equal(altText.includes('1999'), false);
  assert.equal(altText.toLowerCase().includes('luxury'), false);

  const customKeywords = ['SAMO Weave', 'bespoke leather coat', 'Beirut fashion house'];
  const snapshot = generateCatalogSeoSnapshot(
    INITIAL_PRODUCTS,
    INITIAL_CATEGORIES,
    undefined,
    customKeywords
  );
  assert.equal(snapshot.indexedProductsCount, INITIAL_PRODUCTS.length);
  assert.equal(snapshot.indexedImagesCount >= 0, true);
  assert.deepEqual(snapshot.defaultKeywords, customKeywords);
  assert.deepEqual(snapshot.customKeywords, customKeywords);

  const homeSeo = buildDynamicPageSeo({
    route: '/home',
    selectedCategory: 'all',
    activeProduct: null,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    seoConfig: snapshot,
  });
  assert.equal(homeSeo.title, 'Official Website | SAMO');
  assert.equal(homeSeo.canonicalUrl, 'https://samoweave.com/home');
  assert.equal(homeSeo.keywords.includes('bespoke leather coat'), true);

  const womenCatSeo = buildDynamicPageSeo({
    route: '/women',
    selectedCategory: 'Jacket',
    activeProduct: null,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    seoConfig: snapshot,
  });
  assert.equal(womenCatSeo.title, 'Women, Jacket — Official Website | SAMO');

  const kidsMinisSeo = buildDynamicPageSeo({
    route: '/kids',
    selectedCategory: 'MINIS 1 To 5',
    activeProduct: null,
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    seoConfig: snapshot,
  });
  assert.equal(kidsMinisSeo.title, 'Kids, Minis — Official Website | SAMO');

  const productSeo = buildDynamicPageSeo({
    route: '/women',
    selectedCategory: 'Jacket',
    activeProduct: INITIAL_PRODUCTS[0],
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    seoConfig: snapshot,
  });
  assert.equal(
    productSeo.title,
    `${INITIAL_PRODUCTS[0].name} — Official Website | SAMO`
  );
  assert.equal(
    Array.isArray((productSeo.jsonLd as Record<string, unknown>)['@graph']),
    true
  );
});

import { restoreStockForCanceledOrder } from './catalogLogic';

test('restoreStockForCanceledOrder restores exact stock quantities for standard products, color variants, and Full Sets (including re-enabling inStock)', () => {
  // 1. Standard product that reaches 0 stock when accepted, then returns to original stock & inStock=true when canceled
  const standardJacket: ProductItem = {
    id: 'std-jkt-1',
    name: 'ATELIER BIKER JACKET',
    department: 'women',
    category: 'Jacket',
    style: 'Fine Leather',
    price: 2500,
    quantity: 2,
    sizeQuantities: { S: 0, M: 2 },
    isNewArrival: true,
    imageUrl: 'studio://women-jacket-black-leather-biker',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Cow Leather'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const stdOrder: OrderItem = {
    id: 'ord-std-cancel',
    orderNumber: 'SAMO-5501',
    customerName: 'Nadia',
    customerEmail: 'nadia@test.com',
    customerPhone: '70123456',
    shippingLocation: 'Beirut',
    deliveryMethod: 'Standard Delivery',
    deliveryFee: 0,
    subtotal: 5000,
    totalPrice: 5000,
    itemsSummary: '2x ATELIER BIKER JACKET',
    itemsCount: 2,
    primaryProductName: 'ATELIER BIKER JACKET',
    primaryProductSize: 'M',
    primaryProductImage: 'studio://women-jacket-black-leather-biker',
    orderedItems: [
      {
        productId: 'std-jkt-1',
        productName: 'ATELIER BIKER JACKET',
        selectedSize: 'M',
        quantity: 2,
      },
    ],
    status: 'accepted',
    createdAt: '2026-11-09T00:00:00Z',
  };

  const afterAcceptStd = decrementStockForAcceptedOrder([standardJacket], stdOrder);
  assert.equal(afterAcceptStd[0].sizeQuantities.M, 0);
  assert.equal(afterAcceptStd[0].quantity, 0);
  assert.equal(afterAcceptStd[0].inStock, false);

  const afterCancelStd = restoreStockForCanceledOrder(afterAcceptStd, stdOrder);
  assert.equal(afterCancelStd[0].sizeQuantities.M, 2);
  assert.equal(afterCancelStd[0].quantity, 2);
  assert.equal(afterCancelStd[0].inStock, true);

  // 2. Multi-color product + 3-piece Full Set stock deduction and restoration
  const multiColorTop: ProductItem = {
    id: 'top-3p',
    name: 'SILK DRAPE TOP',
    department: 'women',
    category: 'Tops',
    style: 'Classic',
    price: 850,
    quantity: 6,
    sizeQuantities: { S: 3, M: 3 },
    hasColors: true,
    colorVariants: [
      {
        colorName: 'Ivory',
        imageUrl: 'ivory.jpg',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 1, M: 2 },
      },
      {
        colorName: 'Black',
        imageUrl: 'black.jpg',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 2, M: 1 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'ivory.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Silk'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const pantsPiece: ProductItem = {
    id: 'pants-3p',
    name: 'WIDE LEATHER PANTS',
    department: 'women',
    category: 'Pants',
    style: 'Fine Leather',
    price: 1400,
    quantity: 4,
    sizeQuantities: { '36': 2, '38': 2 },
    isNewArrival: true,
    imageUrl: 'pants.jpg',
    galleryUrls: [],
    sizeType: 'numeric',
    sizes: ['36', '38'],
    materials: ['Cow Leather'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const beltPiece: ProductItem = {
    id: 'belt-3p',
    name: 'DOUBLE BUCKLE BELT',
    department: 'women',
    category: 'Belts',
    style: 'Fine Leather',
    price: 450,
    quantity: 3,
    sizeQuantities: { S: 1, M: 2 },
    isNewArrival: true,
    imageUrl: 'belt.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Cow Leather'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const threePieceSet: ProductItem = {
    id: 'set-3p',
    name: 'THREE PIECE ATELIER SET',
    department: 'women',
    category: 'Full Set',
    style: 'Fine Leather',
    price: 2400,
    quantity: 3,
    sizeQuantities: { S: 1, M: 2 },
    isFullSet: true,
    setItems: [
      {
        productId: 'top-3p',
        productName: 'SILK DRAPE TOP',
        pieceLabel: 'Top',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 1, M: 2 },
        selectedColors: ['Ivory', 'Black'],
      },
      {
        productId: 'pants-3p',
        productName: 'WIDE LEATHER PANTS',
        pieceLabel: 'Pants',
        sizeType: 'numeric',
        sizes: ['36', '38'],
        sizeQuantities: { '36': 2, '38': 2 },
      },
      {
        productId: 'belt-3p',
        productName: 'DOUBLE BUCKLE BELT',
        pieceLabel: 'Belt',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 1, M: 2 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'set3p.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Cow Leather', 'Silk'],
    description: 'desc',
    inStock: true,
    featured: true,
  };

  const initialCatalog = syncFullSetsWithCatalog([
    multiColorTop,
    pantsPiece,
    beltPiece,
    threePieceSet,
  ]);

  const setOrder: OrderItem = {
    id: 'ord-3p-set',
    orderNumber: 'SAMO-5502',
    customerName: 'Lara',
    customerEmail: 'lara@test.com',
    customerPhone: '03111222',
    shippingLocation: 'Beirut',
    deliveryMethod: 'Standard Delivery',
    deliveryFee: 0,
    subtotal: 2400,
    totalPrice: 2400,
    itemsSummary: '1x THREE PIECE ATELIER SET',
    itemsCount: 1,
    primaryProductName: 'THREE PIECE ATELIER SET',
    primaryProductSize: 'Black (M) / 38 / S',
    primaryProductImage: 'set3p.jpg',
    orderedItems: [
      {
        productId: 'set-3p',
        productName: 'THREE PIECE ATELIER SET',
        selectedSize: 'Black (M) / 38 / S',
        selectedSetSizes: [
          {
            productId: 'top-3p',
            productName: 'SILK DRAPE TOP',
            selectedSize: 'M',
            selectedColor: 'Black',
          },
          {
            productId: 'pants-3p',
            productName: 'WIDE LEATHER PANTS',
            selectedSize: '38',
          },
          {
            productId: 'belt-3p',
            productName: 'DOUBLE BUCKLE BELT',
            selectedSize: 'S',
          },
        ],
        quantity: 1,
      },
    ],
    status: 'accepted',
    createdAt: '2026-11-09T00:00:00Z',
  };

  const afterSetAccepted = decrementStockForAcceptedOrder(initialCatalog, setOrder);
  const topAfterAccept = afterSetAccepted.find((p) => p.id === 'top-3p')!;
  const pantsAfterAccept = afterSetAccepted.find((p) => p.id === 'pants-3p')!;
  const beltAfterAccept = afterSetAccepted.find((p) => p.id === 'belt-3p')!;

  assert.equal(getSizeQuantity(topAfterAccept, 'M', 'Black'), 0);
  assert.equal(pantsAfterAccept.sizeQuantities['38'], 1);
  assert.equal(beltAfterAccept.sizeQuantities['S'], 0);

  const afterSetCanceled = restoreStockForCanceledOrder(afterSetAccepted, setOrder);
  const topAfterCancel = afterSetCanceled.find((p) => p.id === 'top-3p')!;
  const pantsAfterCancel = afterSetCanceled.find((p) => p.id === 'pants-3p')!;
  const beltAfterCancel = afterSetCanceled.find((p) => p.id === 'belt-3p')!;
  const setAfterCancel = afterSetCanceled.find((p) => p.id === 'set-3p')!;

  assert.equal(getSizeQuantity(topAfterCancel, 'M', 'Black'), 1);
  assert.equal(pantsAfterCancel.sizeQuantities['38'], 2);
  assert.equal(beltAfterCancel.sizeQuantities['S'], 1);
  assert.equal(setAfterCancel.setItems![1].sizeQuantities['38'], 2);
  assert.equal(setAfterCancel.setItems![2].sizeQuantities['S'], 1);
});

import {
  buildCategoryUrl,
  buildProductUrl,
  findCategoryBySlug,
  findProductBySlug,
  parseCatalogUrlState,
} from './catalogLogic';

test('buildCategoryUrl and buildProductUrl generate clean shareable URLs for standard and dynamically added categories/products', () => {
  // Category URLs
  assert.equal(buildCategoryUrl('women', 'Jacket'), '/women/jacket');
  assert.equal(buildCategoryUrl('women', 'Full Set'), '/women/full-set');
  assert.equal(buildCategoryUrl('/women', 'all'), '/women');
  assert.equal(buildCategoryUrl('kids', 'MINIS 1 To 5'), '/kids/minis-1-to-5');
  assert.equal(buildCategoryUrl('kids', 'Baby'), '/kids/minis-1-to-5');
  assert.equal(buildCategoryUrl('/kids', 'all'), '/kids');
  assert.equal(buildCategoryUrl('/new-arrivals'), '/new-arrivals');
  assert.equal(buildCategoryUrl('/gifts'), '/gifts');
  assert.equal(buildCategoryUrl('/home'), '/home');

  // Dynamically generated URL for newly created custom category in Admin Dashboard
  assert.equal(buildCategoryUrl('women', 'Silk Dresses'), '/women/silk-dresses');
  assert.equal(buildCategoryUrl('kids', 'Teen Outerwear'), '/kids/teen-outerwear');

  // Product URLs
  const sampleProduct = INITIAL_PRODUCTS[0];
  const prodUrl = buildProductUrl(sampleProduct);
  assert.equal(
    prodUrl,
    `/women/jackets/${createSafeSlug(sampleProduct.name)}`
  );

  // Dynamically generated URL for newly added custom product
  const customProduct: ProductItem = {
    id: 'samo-women-custom-gown-9999',
    name: 'EMBROIDERED COUTURE SILK GOWN',
    department: 'women',
    category: 'Silk Dresses',
    style: 'Classic',
    price: 3600,
    quantity: 5,
    sizeQuantities: { M: 5 },
    isNewArrival: true,
    imageUrl: 'https://images.samoweave.com/gown.webp',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['M'],
    materials: ['Silk'],
    description: 'Bespoke gown.',
    inStock: true,
    featured: true,
  };

  assert.equal(
    buildProductUrl(customProduct),
    '/women/silk-dresses/embroidered-couture-silk-gown'
  );
});

test('parseCatalogUrlState parses category URLs and direct product popup modal URLs cleanly', () => {
  // 1. Category URL: /women/jacket -> selects Women department & Jackets category
  const womenJacketState = parseCatalogUrlState(
    '/women/jacket',
    INITIAL_CATEGORIES,
    INITIAL_PRODUCTS
  );
  assert.equal(womenJacketState.route, '/women');
  assert.equal(womenJacketState.selectedCategory, 'Jackets');
  assert.equal(womenJacketState.matchedProduct, null);

  // 2. Direct Product Pop-Up URL: /women/jackets/... -> loads category in background and resolves product
  const targetProduct = INITIAL_PRODUCTS[0];
  const prodSlug = createSafeSlug(targetProduct.name);
  const directProductState = parseCatalogUrlState(
    `/women/jackets/${prodSlug}`,
    INITIAL_CATEGORIES,
    INITIAL_PRODUCTS
  );
  assert.equal(directProductState.route, '/women');
  assert.equal(directProductState.selectedCategory, 'Jackets');
  assert.equal(directProductState.matchedProduct?.id, targetProduct.id);

  // 3. Kids Category URL: /kids/minis-1-to-5
  const kidsMinisState = parseCatalogUrlState(
    '/kids/minis-1-to-5',
    INITIAL_CATEGORIES,
    INITIAL_PRODUCTS
  );
  assert.equal(kidsMinisState.route, '/kids');
  assert.equal(kidsMinisState.selectedCategory, 'MINIS 1 To 5');

  // 4. Custom Category & Product created dynamically in Admin Dashboard
  const customCategories = [
    ...INITIAL_CATEGORIES,
    {
      id: 'women-silk-dresses',
      name: 'Silk Dresses',
      slug: 'silk-dresses',
      department: 'women' as const,
      description: 'Couture dresses',
      sortOrder: 12,
    },
  ];
  const customProduct: ProductItem = {
    id: 'samo-women-silk-slip-8888',
    name: 'BIAS CUT SILK SLIP DRESS',
    department: 'women',
    category: 'Silk Dresses',
    style: 'Classic',
    price: 1800,
    quantity: 4,
    sizeQuantities: { M: 4 },
    isNewArrival: true,
    imageUrl: 'slip.webp',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['M'],
    materials: ['Silk'],
    description: 'Slip dress.',
    inStock: true,
    featured: true,
  };
  const customCatalog = [...INITIAL_PRODUCTS, customProduct];

  const customState = parseCatalogUrlState(
    '/women/silk-dresses/bias-cut-silk-slip-dress',
    customCategories,
    customCatalog
  );
  assert.equal(customState.route, '/women');
  assert.equal(customState.selectedCategory, 'Silk Dresses');
  assert.equal(customState.matchedProduct?.id, 'samo-women-silk-slip-8888');

  // 5. Root /home and /gifts
  const homeState = parseCatalogUrlState('/', INITIAL_CATEGORIES, INITIAL_PRODUCTS);
  assert.equal(homeState.route, '/home');
  assert.equal(homeState.selectedCategory, 'all');

  const giftsState = parseCatalogUrlState(
    '/gifts',
    INITIAL_CATEGORIES,
    INITIAL_PRODUCTS
  );
  assert.equal(giftsState.route, '/gifts');
});

import {
  cleanGarmentCode,
  formatGarmentCodeRef,
  resolvePieceGarmentCode,
  resolveProductGarmentCode,
} from './catalogLogic';

test('Garment Code helpers format Ref. codes, support optional per-color serial overrides, and combine Full Set references (e.g. Ref. F-2364+W-5637)', () => {
  assert.equal(cleanGarmentCode('  Ref. w-2278 '), 'W-2278');
  assert.equal(cleanGarmentCode('REF: f-6752'), 'F-6752');
  assert.equal(formatGarmentCodeRef('W-2278'), 'Ref. W-2278');
  assert.equal(formatGarmentCodeRef('Ref. F-6752'), 'Ref. F-6752');
  assert.equal(formatGarmentCodeRef(''), '');

  const shirtWithColorCodes: ProductItem = {
    id: 'shirt-gc-1',
    name: 'SILK ATELIER SHIRT',
    garmentCode: 'F-2364',
    department: 'women',
    category: 'Shirts',
    style: 'Classic',
    price: 820,
    quantity: 10,
    sizeQuantities: { S: 5, M: 5 },
    hasColors: true,
    colorVariants: [
      {
        colorName: 'White',
        imageUrl: 'white.jpg',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 5, M: 5 },
        // No color garmentCode -> falls back to product's F-2364
      },
      {
        colorName: 'Black',
        garmentCode: 'F-2364-BLK',
        imageUrl: 'black.jpg',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 5, M: 5 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'white.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Silk'],
    description: 'Shirt',
    inStock: true,
    featured: true,
  };

  const trousersWithCode: ProductItem = {
    id: 'trousers-gc-2',
    name: 'PLEATED WOOL TROUSERS',
    garmentCode: 'W-5637',
    department: 'women',
    category: 'Trousers',
    style: 'Classic',
    price: 940,
    quantity: 10,
    sizeQuantities: { '36': 5, '38': 5 },
    isNewArrival: true,
    imageUrl: 'trousers.jpg',
    galleryUrls: [],
    sizeType: 'numeric',
    sizes: ['36', '38'],
    materials: ['Wool'],
    description: 'Trousers',
    inStock: true,
    featured: true,
  };

  // Single product: White falls back to product code F-2364; Black uses color override F-2364-BLK
  assert.equal(
    resolveProductGarmentCode(shirtWithColorCodes, { selectedColor: 'White' }),
    'F-2364'
  );
  assert.equal(
    resolveProductGarmentCode(shirtWithColorCodes, { selectedColor: 'Black' }),
    'F-2364-BLK'
  );

  // Full Set combining the two products -> F-2364+W-5637 (or F-2364-BLK+W-5637 when Black is chosen)
  const fullSetItem: ProductItem = {
    id: 'fullset-gc-1',
    name: 'ATELIER SILK & WOOL FULL SET',
    department: 'women',
    category: 'Full Set',
    style: 'Classic',
    price: 1650,
    quantity: 10,
    sizeQuantities: { S: 5, M: 5 },
    isFullSet: true,
    setItems: [
      {
        productId: 'shirt-gc-1',
        productName: 'SILK ATELIER SHIRT',
        pieceLabel: 'Shirt',
        sizeType: 'letter',
        sizes: ['S', 'M'],
        sizeQuantities: { S: 5, M: 5 },
        selectedColors: ['White', 'Black'],
      },
      {
        productId: 'trousers-gc-2',
        productName: 'PLEATED WOOL TROUSERS',
        pieceLabel: 'Trousers',
        sizeType: 'numeric',
        sizes: ['36', '38'],
        sizeQuantities: { '36': 5, '38': 5 },
      },
    ],
    isNewArrival: true,
    imageUrl: 'set.jpg',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: [],
    description: 'Set',
    inStock: true,
    featured: true,
  };

  const syncedCatalog = syncFullSetsWithCatalog([
    shirtWithColorCodes,
    trousersWithCode,
    fullSetItem,
  ]);
  const syncedFullSet = syncedCatalog.find((p) => p.id === 'fullset-gc-1')!;
  assert.equal(syncedFullSet.garmentCode, 'F-2364+W-5637');
  assert.equal(
    formatGarmentCodeRef(
      resolveProductGarmentCode(syncedFullSet, { allProducts: syncedCatalog })
    ),
    'Ref. F-2364+W-5637'
  );

  // When customer selects Black on Piece 1 inside Full Set -> Ref. F-2364-BLK+W-5637
  const withBlackPiece = resolveProductGarmentCode(syncedFullSet, {
    allProducts: syncedCatalog,
    selectedSetSizes: [
      {
        productId: 'shirt-gc-1',
        productName: 'SILK ATELIER SHIRT',
        selectedSize: 'S',
        selectedColor: 'Black',
      },
      {
        productId: 'trousers-gc-2',
        productName: 'PLEATED WOOL TROUSERS',
        selectedSize: '36',
      },
    ],
  });
  assert.equal(formatGarmentCodeRef(withBlackPiece), 'Ref. F-2364-BLK+W-5637');
  assert.equal(
    resolvePieceGarmentCode(syncedFullSet.setItems![0], 'Black', syncedCatalog),
    'F-2364-BLK'
  );
});

test('New Arrivals department routes (/new-arrivals/women and /new-arrivals/kids) and dedicated category banners work cleanly', () => {
  assert.equal(buildCategoryUrl('/new-arrivals', 'women'), '/new-arrivals/women');
  assert.equal(buildCategoryUrl('/new-arrivals', 'kids'), '/new-arrivals/kids');
  assert.equal(buildCategoryUrl('/new-arrivals'), '/new-arrivals');

  const parsedWomen = parseCatalogUrlState('/new-arrivals/women', INITIAL_CATEGORIES, INITIAL_PRODUCTS);
  assert.equal(parsedWomen.route, '/new-arrivals');
  assert.equal(parsedWomen.selectedCategory, 'women');

  const parsedKids = parseCatalogUrlState('/new-arrivals/kids', INITIAL_CATEGORIES, INITIAL_PRODUCTS);
  assert.equal(parsedKids.route, '/new-arrivals');
  assert.equal(parsedKids.selectedCategory, 'kids');

  const parsedDefault = parseCatalogUrlState('/new-arrivals', INITIAL_CATEGORIES, INITIAL_PRODUCTS);
  assert.equal(parsedDefault.route, '/new-arrivals');
  assert.equal(parsedDefault.selectedCategory, 'women');

  assert.equal(getCategoryBannerKey('/new-arrivals', 'women'), 'collection:new-arrivals');
  assert.equal(getCategoryBannerKey('/new-arrivals', 'kids'), 'collection:new-arrivals-kids');

  const defaultBanners = buildDefaultSiteBanners(INITIAL_CATEGORIES);
  assert.ok(defaultBanners.categoryBanners['collection:new-arrivals']);
  assert.equal(
    defaultBanners.categoryBanners['collection:new-arrivals'].categoryName,
    'New Arrivals (Women)'
  );
  assert.ok(defaultBanners.categoryBanners['collection:new-arrivals-kids']);
  assert.equal(
    defaultBanners.categoryBanners['collection:new-arrivals-kids'].categoryName,
    'New Arrival (Kids)'
  );
  assert.equal(defaultBanners.orderEmailSenderAddress, 'orders@samoweave.com');
  assert.equal(defaultBanners.orderEmailBccAddress, 'orders@samoweave.com');
  assert.equal(defaultBanners.orderEmailReplyToAddress, 'info@samoweave.com');
  assert.equal(defaultBanners.orderEmailPromoEnabled, false);
  assert.equal(defaultBanners.orderEmailPromoCode, 'SAMO10');
  assert.equal(
    defaultBanners.orderEmailPromoDescription,
    'Enjoy 10% off your next order'
  );
  assert.equal(defaultBanners.orderEmailPromoBannerUrl, '');

  const mergedWithPromo = mergeSiteBannersConfig(
    {
      orderEmailPromoEnabled: true,
      orderEmailPromoCode: 'VIP15',
      orderEmailPromoDescription: 'Enjoy 15% off your next acquisition at samoweave.com',
      orderEmailPromoBannerUrl: 'https://images.samoweave.com/banners/promo-bg.jpg',
    },
    INITIAL_CATEGORIES
  );
  assert.equal(mergedWithPromo.orderEmailPromoEnabled, true);
  assert.equal(mergedWithPromo.orderEmailPromoCode, 'VIP15');
  assert.equal(
    mergedWithPromo.orderEmailPromoDescription,
    'Enjoy 15% off your next acquisition'
  );
  assert.equal(
    mergedWithPromo.orderEmailPromoBannerUrl,
    'https://images.samoweave.com/banners/promo-bg.jpg'
  );
});

import { buildOrderConfirmationEmailPayload } from './catalogLogic';
import { buildResendEmailPayload } from '../../functions/api/order-confirmation-email';

test('buildOrderConfirmationEmailPayload generates fluid 600px table HTML receipt with SAMO logo, itemized receipt, optional next-order promo gift card with background banner, clickable campaign banner, and dual table CTA buttons', () => {
  const emailInput = {
    order: {
      id: 'ord-9901',
      orderNumber: 'SAMO-9901',
      customerName: 'Layla Khoury',
      customerEmail: 'layla@example.com',
      customerPhone: '+961 70 123 456',
      shippingLocation: 'Achrafieh, Beirut',
      deliveryMethod: 'Standard Delivery' as const,
      paymentMethod: 'COD' as const,
      subtotal: 500,
      discountAmount: 50,
      promoCode: 'SAMO10',
      deliveryFee: 0,
      totalPrice: 450,
      orderedItems: [
        {
          productId: 'w-jkt-1',
          productName: 'AVENUE HEAVY COW LEATHER BIKER JACKET',
          garmentCode: 'W-1042',
          selectedColor: 'Obsidian Black',
          selectedSize: 'M',
          quantity: 1,
          unitPrice: 500,
          imageUrl: 'https://images.samoweave.com/products/biker-jacket.webp',
        },
      ],
      createdAt: '2026-11-19T06:00:00.000Z',
    },
    bannerUrl: 'https://images.samoweave.com/banners/order-email-banner-1.jpg',
    bannerLinkUrl: 'https://samoweave.com/new-arrivals/women',
    promoGiftEnabled: true,
    promoGiftCode: 'SAMOVIP15',
    promoGiftDescription: 'Enjoy 15% off your next order at samoweave.com',
    promoGiftBannerUrl: 'https://images.samoweave.com/banners/promo-bg.jpg',
  };

  const payload = buildOrderConfirmationEmailPayload(emailInput);
  const cloudflarePayload = buildResendEmailPayload(emailInput);

  assert.equal(payload.from, 'SAMO <orders@samoweave.com>');
  assert.deepEqual(payload.to, ['layla@example.com']);
  assert.deepEqual(payload.bcc, ['orders@samoweave.com']);
  assert.equal(payload.reply_to, 'info@samoweave.com');
  assert.equal(payload.subject, 'Order Confirmed — SAMO (#SAMO-9901)');
  assert.equal(
    payload.html.includes('https://images.samoweave.com/logo/samo-weave-logo.png'),
    true
  );
  assert.equal(
    payload.html.includes('https://images.samoweave.com/products/biker-jacket.webp'),
    true
  );
  assert.equal(
    payload.html.includes('width="56"') && payload.html.includes('height="70"'),
    true
  );
  assert.equal(payload.html.includes('YOU GOT 10% OFF'), true);
  assert.equal(cloudflarePayload.html.includes('YOU GOT 10% OFF'), true);
  assert.equal(
    payload.html.includes('A PRIVATE GIFT FOR YOUR NEXT VISIT'),
    false
  );
  assert.equal(
    payload.html.toLowerCase().includes('copy and apply'),
    false
  );
  assert.equal(
    payload.html.toLowerCase().includes('copy & apply'),
    false
  );
  assert.equal(
    payload.html.includes('background="https://images.samoweave.com/banners/promo-bg.jpg"'),
    true
  );
  assert.equal(
    cloudflarePayload.html.includes('background="https://images.samoweave.com/banners/promo-bg.jpg"'),
    true
  );
  assert.equal(
    payload.html.includes('rgba(9,9,11,0.46)'),
    true
  );
  assert.equal(
    cloudflarePayload.html.includes('rgba(9,9,11,0.46)'),
    true
  );
  assert.equal(
    payload.html.includes('padding:0;background-color:#FFFFFF;'),
    true
  );
  assert.equal(
    cloudflarePayload.html.includes('padding:0;background-color:#FFFFFF;'),
    true
  );
  assert.equal(
    payload.html.includes('user-select:all'),
    false
  );
  assert.equal(
    cloudflarePayload.html.includes('user-select:all'),
    false
  );
  assert.equal(payload.html.includes('SAMOVIP15'), true);
  assert.equal(cloudflarePayload.html.includes('SAMOVIP15'), true);
  assert.equal(
    payload.html.includes('Enjoy 15% off your next order'),
    true
  );
  assert.equal(
    cloudflarePayload.html.includes('Enjoy 15% off your next order'),
    true
  );
  assert.equal(
    payload.html.includes('Enjoy 15% off your next order at samoweave.com'),
    false
  );
  assert.equal(
    cloudflarePayload.html.includes('Enjoy 15% off your next order at samoweave.com'),
    false
  );
  assert.equal(
    payload.html.includes('https://images.samoweave.com/banners/order-email-banner-1.jpg'),
    true
  );
  assert.equal(
    payload.html.includes('width="600"'),
    true
  );
  assert.equal(
    payload.html.includes('width:100%;max-width:600px;height:auto;display:block;border:0;'),
    true
  );
  assert.equal(payload.html.includes('EXPLORE NEW ARRIVALS'), true);
  assert.equal(payload.html.includes('CONTACT US'), true);
  assert.equal(
    payload.html.includes(
      'https://api.whatsapp.com/send/?phone=96170224767&amp;text&amp;type=phone_number&amp;app_absent=0'
    ),
    true
  );
  assert.equal(payload.html.includes('DISCOVER THE HOUSE'), false);
  assert.equal(
    payload.html.includes('mailto:support@samoweave.com'),
    true
  );
  assert.equal(
    payload.html.includes('mailto:info@samoweave.com'),
    false
  );
  assert.equal(payload.html.includes('ORDER CONFIRMATION · EST. 1999'), false);
  assert.equal(cloudflarePayload.html.includes('ORDER CONFIRMATION · EST. 1999'), false);
  assert.equal(payload.html.includes('font-size:20.7px;'), true);
  assert.equal(cloudflarePayload.html.includes('font-size:20.7px;'), true);
  assert.equal(payload.html.includes('DELIVERY DETAILS'), true);
  assert.equal(cloudflarePayload.html.includes('DELIVERY DETAILS'), true);
  assert.equal(payload.html.includes('CLIENT &amp; DELIVERY DETAILS'), false);
  assert.equal(cloudflarePayload.html.includes('CLIENT &amp; DELIVERY DETAILS'), false);
  assert.equal(payload.html.includes('<strong>Name:</strong> Layla Khoury'), true);
  assert.equal(cloudflarePayload.html.includes('<strong>Name:</strong> Layla Khoury'), true);
  assert.equal(payload.html.includes('<strong>Client:</strong>'), false);
  assert.equal(cloudflarePayload.html.includes('<strong>Client:</strong>'), false);

  // Verify the two CTA buttons sit BETWEEN the Promo Code Banner and the Main Email Campaign Banner
  const promoIndex = payload.html.indexOf('YOU GOT 10% OFF');
  const buttonsIndex = payload.html.indexOf('EXPLORE NEW ARRIVALS');
  const campaignBannerIndex = payload.html.indexOf(
    'https://images.samoweave.com/banners/order-email-banner-1.jpg'
  );
  assert.equal(promoIndex > 0 && buttonsIndex > promoIndex, true);
  assert.equal(campaignBannerIndex > buttonsIndex, true);

  const cfPromoIndex = cloudflarePayload.html.indexOf('YOU GOT 10% OFF');
  const cfButtonsIndex = cloudflarePayload.html.indexOf('EXPLORE NEW ARRIVALS');
  const cfCampaignBannerIndex = cloudflarePayload.html.indexOf(
    'https://images.samoweave.com/banners/order-email-banner-1.jpg'
  );
  assert.equal(cfPromoIndex > 0 && cfButtonsIndex > cfPromoIndex, true);
  assert.equal(cfCampaignBannerIndex > cfButtonsIndex, true);

  assert.equal(payload.html.includes('AVENUE HEAVY COW LEATHER BIKER JACKET'), true);
  assert.equal(payload.html.includes('Ref. W-1042'), true);
  assert.equal(payload.html.includes('SAMO10'), true);
  assert.equal(payload.html.includes('$450'), true);
  assert.equal(payload.text.includes('SAMO — ORDER CONFIRMED (#SAMO-9901)'), true);
  assert.equal(payload.text.includes('DELIVERY DETAILS'), true);
  assert.equal(payload.text.includes('Name: Layla Khoury'), true);
  assert.equal(payload.text.includes('YOU GOT 10% OFF'), true);
  assert.equal(payload.text.includes('A PRIVATE GIFT FOR YOUR NEXT VISIT'), false);
  assert.equal(payload.text.includes('Promo Code: SAMOVIP15'), true);
  assert.equal(
    payload.text.includes(
      'Contact Us: https://api.whatsapp.com/send/?phone=96170224767&text&type=phone_number&app_absent=0'
    ),
    true
  );
  assert.equal(
    payload.text.includes(
      'Questions about your order? Contact our Client Concierge: support@samoweave.com'
    ),
    true
  );

  // Verify adminAlertOnly mode for Whish/OMT orders sends only to orders@samoweave.com
  const whishAlertInput = {
    ...emailInput,
    order: {
      ...emailInput.order,
      paymentMethod: 'Whish/OMT Payment' as const,
    },
    adminAlertOnly: true,
  };
  const whishAdminPayload = buildOrderConfirmationEmailPayload(whishAlertInput);
  const whishCfAdminPayload = buildResendEmailPayload(whishAlertInput);
  assert.deepEqual(whishAdminPayload.to, ['orders@samoweave.com']);
  assert.equal(whishAdminPayload.bcc, undefined);
  assert.equal(
    whishAdminPayload.subject,
    'Action Required: Verify Whish/OMT Payment Payment — SAMO (#SAMO-9901)'
  );
  assert.deepEqual(whishCfAdminPayload.to, ['orders@samoweave.com']);
  assert.equal(whishCfAdminPayload.bcc, undefined);
});

test('hasEmailReachedPromoLimit enforces per-email promo code usage limits across non-rejected orders', () => {
  const existingOrders = [
    {
      customerEmail: 'Layla@Example.com',
      promoCode: 'SAMO10',
      status: 'accepted' as const,
    },
    {
      customerEmail: 'layla@example.com',
      promoCode: 'SAMO10',
      status: 'rejected' as const,
    },
    {
      customerEmail: 'other@example.com',
      promoCode: 'SAMO10',
      status: 'accepted' as const,
    },
  ];

  // 1 use per email: Layla has 1 accepted order with SAMO10 (and 1 rejected which is ignored) -> limit reached
  assert.equal(
    hasEmailReachedPromoLimit(
      { code: 'SAMO10', maxUsesPerEmail: 1 },
      'layla@example.com',
      existingOrders
    ),
    true
  );

  // 2 uses per email: Layla has only 1 non-rejected use -> limit not reached yet
  assert.equal(
    hasEmailReachedPromoLimit(
      { code: 'SAMO10', maxUsesPerEmail: 2 },
      'layla@example.com',
      existingOrders
    ),
    false
  );

  // Unlimited (0 or undefined): never reached
  assert.equal(
    hasEmailReachedPromoLimit(
      { code: 'SAMO10', maxUsesPerEmail: 0 },
      'layla@example.com',
      existingOrders
    ),
    false
  );
  assert.equal(
    hasEmailReachedPromoLimit(
      { code: 'SAMO10' },
      'layla@example.com',
      existingOrders
    ),
    false
  );
});

import { orderHomeNewArrivalsProducts } from './catalogLogic';

test('orderHomeNewArrivalsProducts places SAHARA CROC CRESCENT first, moves old 1st to 3rd, keeps old 2nd at 2nd, and moves old 3rd to 4th', () => {
  const baseProd = INITIAL_PRODUCTS[0];
  const p0 = { ...baseProd, id: 'na-0', name: 'Product L0', department: 'women' as const, isNewArrival: true };
  const p1 = { ...baseProd, id: 'na-1', name: 'Product L1', department: 'women' as const, isNewArrival: true };
  const p2 = { ...baseProd, id: 'na-2', name: 'Product L2', department: 'women' as const, isNewArrival: true };
  const p3 = { ...baseProd, id: 'na-3', name: 'Product L3', department: 'women' as const, isNewArrival: true };
  const sahara = {
    ...baseProd,
    id: 'w-bag-sahara',
    name: 'SAHARA CROC CRESCENT',
    department: 'women' as const,
    category: 'Bags',
    isNewArrival: false,
  };

  // Before Sahara: prevReordered was [p1, p2, p0, p3] (where p1 was 1st, p2 was 2nd, p0 was 3rd)
  // With Sahara: Sahara is 1st, p2 (old 2nd) stays 2nd, p1 (old 1st) moves to 3rd, p0 (old 3rd) moves to 4th, followed by p3
  const ordered = orderHomeNewArrivalsProducts([p0, p1, p2, p3, sahara], 'women');
  assert.deepEqual(
    ordered.map((p) => p.id),
    ['w-bag-sahara', 'na-2', 'na-1', 'na-0', 'na-3']
  );
});

import {
  applyGoogleSheetUpdatesToCatalog,
  buildGoogleAppsScriptForSamoSheet,
  buildGoogleSheetInventoryRows,
  isValidGoogleAppsScriptWebhookUrl,
  mergeConcurrentOrdersById,
  parseGoogleSheetQuantity,
  parseGoogleSheetSellingPrice,
} from './catalogLogic';

test('buildGoogleSheetInventoryRows & applyGoogleSheetUpdatesToCatalog handle 14-column SAMO_INVENTORY rows, multi-color variants, price parsing, and anti-corruption guards', () => {
  // Verify webhook URL validator
  assert.equal(
    isValidGoogleAppsScriptWebhookUrl(
      'https://script.google.com/macros/s/AKfycb123456789/exec'
    ),
    true
  );
  assert.equal(
    isValidGoogleAppsScriptWebhookUrl('http://script.google.com/macros/s/123/exec'),
    false
  );
  assert.equal(
    isValidGoogleAppsScriptWebhookUrl('https://evil.example.com/macros/s/123'),
    false
  );

  // Verify quantity and price parsers
  assert.equal(parseGoogleSheetQuantity(5), 5);
  assert.equal(parseGoogleSheetQuantity('0'), 0);
  assert.equal(parseGoogleSheetQuantity('-3'), null);
  assert.equal(parseGoogleSheetQuantity('abc'), null);
  assert.equal(parseGoogleSheetSellingPrice('$95.00'), 95);
  assert.equal(parseGoogleSheetSellingPrice('139'), 139);
  assert.equal(parseGoogleSheetSellingPrice('0'), null);
  assert.equal(parseGoogleSheetSellingPrice('-20'), null);

  // Build rows from INITIAL_PRODUCTS
  const rows = buildGoogleSheetInventoryRows(INITIAL_PRODUCTS);
  assert.ok(rows.length > 50);

  // Check single-color product row (NOIR FAUX FUR JACKET, SAMO-W-001, 6700066)
  const noirRow = rows.find(
    (r) =>
      r.garmentCode === '6700066' &&
      r.productName === 'NOIR FAUX FUR JACKET' &&
      r.size === 'M/L'
  );
  assert.ok(noirRow);
  assert.equal(noirRow.colorOption, 'NONE');
  assert.equal(noirRow.sellingPriceFormatted, '$95.00');
  assert.equal(noirRow.websiteStatus, 'Live');

  // Check multi-color product row (HERRINGBONE TROUSERS, 2602, GREY, S/M)
  const herringboneGreyRow = rows.find(
    (r) =>
      r.garmentCode === '2602' &&
      r.productName === 'HERRINGBONE TROUSERS' &&
      r.colorOption === 'GREY' &&
      r.size === 'S/M'
  );
  assert.ok(herringboneGreyRow);
  assert.equal(herringboneGreyRow.quantity, 2);
  assert.equal(herringboneGreyRow.sellingPriceFormatted, '$48.00');

  // Apply inbound update from Google Sheet (strictly Quantity-Only — updates quantity from 2 -> 7 and never overwrites price)
  // Plus a single-color update setting NOIR FAUX FUR JACKET M/L quantity to 0 (Sold Out) even when matched by garmentCode after a product rename
  // Plus an invalid/corrupt row that must be ignored safely
  const result = applyGoogleSheetUpdatesToCatalog(INITIAL_PRODUCTS, [
    {
      sku: 'SAMO-W-056',
      garmentCode: '2602',
      productName: 'HERRINGBONE TROUSERS',
      colorOption: 'GREY',
      size: 'S/M',
      quantity: 7,
      sellingPrice: '$52.00',
    },
    {
      sku: 'SAMO-W-001',
      garmentCode: '6700066',
      productName: 'OLD SHEET PRODUCT NAME BEFORE RENAME',
      colorOption: 'NONE',
      size: 'M/L',
      quantity: '0',
    },
    {
      sku: 'SAMO-W-001',
      garmentCode: '6700066',
      productName: 'NOIR FAUX FUR JACKET',
      colorOption: 'NONE',
      size: 'M/L',
      quantity: '-99',
      sellingPrice: 'invalid',
    },
  ]);

  assert.equal(result.updatedCount, 2);

  const updatedHerringbone = result.products.find(
    (p) => p.name === 'HERRINGBONE TROUSERS'
  )!;
  // Price remains strictly untouched at $48 (Quantity-Only mode)
  assert.equal(updatedHerringbone.price, 48);
  const greyVariant = updatedHerringbone.colorVariants!.find(
    (cv) => cv.colorName.toUpperCase() === 'GREY'
  )!;
  assert.equal(greyVariant.sizeQuantities['S/M'], 7);
  // Total quantity of Herringbone Trousers was 11, +5 on Grey S/M => 16
  assert.equal(updatedHerringbone.quantity, 16);
  assert.equal(updatedHerringbone.inStock, true);

  const updatedNoir = result.products.find(
    (p) => p.name === 'NOIR FAUX FUR JACKET'
  )!;
  assert.equal(updatedNoir.sizeQuantities['M/L'], 0);
  assert.equal(updatedNoir.quantity, 0);
  assert.equal(updatedNoir.inStock, false);
  // Price remained untouched at 95
  assert.equal(updatedNoir.price, 95);

  const script = buildGoogleAppsScriptForSamoSheet({
    siteOrigin: 'https://samoweave.com',
    syncSecret: 'samo_secret_123',
  });
  assert.ok(script.includes('https://samoweave.com/api/sheets-sync'));
  assert.ok(script.includes('Connected samo website catalog'));
  assert.ok(script.includes('getColumnMap_'));
  assert.ok(script.includes('qtyIdx: 8'));
  assert.ok(script.includes('qtyColNum: 9'));
  assert.ok(!script.includes('appendRow'));
  assert.ok(script.includes('onSamoSheetEdit'));
  assert.ok(script.includes('setupAutomaticSyncTrigger'));
});

test('mergeConcurrentOrdersById preserves orders from two customers shopping concurrently while honoring admin status updates and deletions', () => {
  const existingOnServer = [
    {
      id: 'ord-customer-a',
      createdAt: '2026-11-24T14:00:05.000Z',
      status: 'accepted',
      totalPrice: 95,
    },
    {
      id: 'ord-older-1',
      createdAt: '2026-11-24T12:00:00.000Z',
      status: 'pending',
      totalPrice: 120,
    },
  ];

  // Customer B submits their order before their browser pulled Customer A's order
  const incomingFromCustomerB = [
    {
      id: 'ord-customer-b',
      createdAt: '2026-11-24T14:00:08.000Z',
      status: 'accepted',
      totalPrice: 140,
    },
    {
      id: 'ord-older-1',
      createdAt: '2026-11-24T12:00:00.000Z',
      status: 'accepted', // updated status wins
      totalPrice: 120,
    },
  ];

  const merged = mergeConcurrentOrdersById(
    existingOnServer,
    incomingFromCustomerB,
    []
  );
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'ord-customer-b');
  assert.equal(merged[1].id, 'ord-customer-a');
  assert.equal(merged[2].id, 'ord-older-1');
  assert.equal(merged[2].status, 'accepted');

  // Explicit deletion removes only the deleted order
  const afterDelete = mergeConcurrentOrdersById(
    merged,
    incomingFromCustomerB,
    ['ord-older-1']
  );
  assert.equal(afterDelete.length, 2);
  assert.ok(afterDelete.every((o) => o.id !== 'ord-older-1'));
});

import {
  buildNewsletterSubscribedCookieString,
  evaluateNewsletterPopupSessionEligibility,
  hasNewsletterSubscribedCookie,
  toggleProductVisibilityState,
} from './catalogLogic';

test('toggleProductVisibilityState toggles hiddenFromStore without altering quantities or prices and findProductBySlug excludes hidden items', () => {
  const sample = INITIAL_PRODUCTS[0];
  const hiddenProd = toggleProductVisibilityState(sample, false);
  assert.equal(hiddenProd.hiddenFromStore, true);
  assert.equal(hiddenProd.quantity, sample.quantity);
  assert.equal(hiddenProd.price, sample.price);
  assert.deepEqual(hiddenProd.sizeQuantities, sample.sizeQuantities);

  // When hiddenFromStore is true, findProductBySlug must not return it for storefront URLs
  const catalogWithHidden = [hiddenProd, ...INITIAL_PRODUCTS.slice(1)];
  assert.equal(findProductBySlug(catalogWithHidden, sample.id), undefined);

  // Toggling back ON (nextVisible = true) makes it visible again with all quantities preserved
  const restoredProd = toggleProductVisibilityState(hiddenProd, true);
  assert.equal(restoredProd.hiddenFromStore, false);
  const catalogRestored = [restoredProd, ...INITIAL_PRODUCTS.slice(1)];
  assert.equal(findProductBySlug(catalogRestored, sample.id)?.id, sample.id);
});

test('evaluateNewsletterPopupSessionEligibility enforces permanent subscriber suppression and strict 1-per-session browsing guard when maxTimesPerDay is 2', () => {
  const cookieStr = buildNewsletterSubscribedCookieString();
  assert.equal(hasNewsletterSubscribedCookie(cookieStr), true);
  assert.equal(hasNewsletterSubscribedCookie('other_cookie=1; foo=bar'), false);

  // 1. Fresh visitor on first visit of the day (Times Per Day = 2) -> Eligible
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: false,
      cookieString: '',
      shownInCurrentRef: false,
      shownInSessionStorage: false,
      localShownToday: 0,
      maxPerDay: 2,
      serverEligible: true,
      serverSubscribed: false,
    }),
    true
  );

  // 2. Same visitor stays on website for 10 minutes, navigates to /women and back to /home
  // within the same active session (shownInCurrentRef = true or shownInSessionStorage = true) -> NOT Eligible
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: false,
      cookieString: '',
      shownInCurrentRef: true,
      shownInSessionStorage: true,
      localShownToday: 1,
      maxPerDay: 2,
      serverEligible: true,
      serverSubscribed: false,
    }),
    false
  );

  // 3. Visitor closes website and re-enters later that day in a NEW session (session flags reset, localShownToday = 1 < maxPerDay = 2) -> Eligible for 2nd daily impression
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: false,
      cookieString: '',
      shownInCurrentRef: false,
      shownInSessionStorage: false,
      localShownToday: 1,
      maxPerDay: 2,
      serverEligible: true,
      serverSubscribed: false,
    }),
    true
  );

  // 4. Visitor closes and enters a 3rd time on the same day when maxPerDay = 2 (localShownToday = 2) -> NOT Eligible
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: false,
      cookieString: '',
      shownInCurrentRef: false,
      shownInSessionStorage: false,
      localShownToday: 2,
      maxPerDay: 2,
      serverEligible: true,
      serverSubscribed: false,
    }),
    false
  );

  // 5. Subscribed user (via localStorage, 365-day cookie, or server IP memory) -> NEVER Eligible even when localShownToday = 0 and maxPerDay = 2
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: true,
      cookieString: '',
      shownInCurrentRef: false,
      shownInSessionStorage: false,
      localShownToday: 0,
      maxPerDay: 2,
    }),
    false
  );
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: false,
      cookieString: 'theme=dark; samo_nl_subscribed=1',
      shownInCurrentRef: false,
      shownInSessionStorage: false,
      localShownToday: 0,
      maxPerDay: 2,
    }),
    false
  );
  assert.equal(
    evaluateNewsletterPopupSessionEligibility({
      isSubscribedLocalStorage: false,
      cookieString: '',
      shownInCurrentRef: false,
      shownInSessionStorage: false,
      localShownToday: 0,
      maxPerDay: 2,
      serverSubscribed: true,
    }),
    false
  );
});

import {
  applyExclusiveHomeCategoryCover,
  deserializeProductD1Meta,
  ensureHomepageMerchandisingDefaults,
  getHomeWomenCategoryTiles,
  normalizeHomeWomenCategoryTile,
  orderHomeBagsProducts,
  serializeProductD1Meta,
} from './catalogLogic';

test('D1 discount & homepage merchandising serialization preserves percentage and fixed discounts plus all 3 homepage toggles across refresh/clear-cache', () => {
  const sampleBag: ProductItem = {
    ...INITIAL_PRODUCTS[0],
    id: 'test-bag-discount',
    name: 'SAHARA CROC CRESCENT',
    department: 'women',
    category: 'Bags',
    style: 'Fine Leather',
    price: 83,
    discountType: 'fixed',
    discountValue: 8,
    isNewArrival: true,
    showInHomeNewArrivals: true,
    homeNewArrivalsOrder: 2,
    isHomeCategoryCover: false,
    showInHomeBags: true,
    homeBagsOrder: 1,
  };

  const d1Row = serializeProductD1Meta(sampleBag);
  assert.equal(d1Row.featuredColumn, 1);
  assert.equal(d1Row.discountPercentColumn, 8);
  assert.equal(d1Row.discountBadgeColumn, 'fixed');

  const restored = deserializeProductD1Meta({
    custom_style: d1Row.customStyleColumn,
    discount_badge: d1Row.discountBadgeColumn,
    discount_percent: d1Row.discountPercentColumn,
    featured: d1Row.featuredColumn,
  });

  assert.equal(restored.discountType, 'fixed');
  assert.equal(restored.discountValue, 8);
  assert.equal(restored.isNewArrival, true);
  assert.equal(restored.showInHomeNewArrivals, true);
  assert.equal(restored.homeNewArrivalsOrder, 2);
  assert.equal(restored.showInHomeBags, true);
  assert.equal(restored.homeBagsOrder, 1);

  const pricing = getEffectiveProductPrice({
    ...sampleBag,
    ...restored,
  });
  assert.equal(pricing.hasDiscount, true);
  assert.equal(pricing.originalPrice, 83);
  assert.equal(pricing.effectivePrice, 75);
});

test('Homepage merchandising defaults pre-populate existing items, enforce 1-per-category Women cover exclusivity, and order carousels by 1, 2, 3...', () => {
  const defaulted = ensureHomepageMerchandisingDefaults(INITIAL_PRODUCTS);

  // 1. Pre-populated Homepage New Arrivals (Women & Kids)
  const womenHomeNew = orderHomeNewArrivalsProducts(defaulted, 'women');
  assert.equal(womenHomeNew.length > 0, true);
  assert.equal(
    womenHomeNew[0].name.toUpperCase().includes('SAHARA CROC CRESCENT'),
    true
  );
  assert.equal(womenHomeNew[0].showInHomeNewArrivals, true);
  assert.equal(womenHomeNew[0].homeNewArrivalsOrder, 1);

  // Reorder #2 to #1 and #1 to #3 and verify exact ascending order
  if (womenHomeNew.length >= 2) {
    const firstId = womenHomeNew[0].id;
    const secondId = womenHomeNew[1].id;
    const reorderedCatalog = defaulted.map((p) => {
      if (p.id === firstId) return { ...p, homeNewArrivalsOrder: 3 };
      if (p.id === secondId) return { ...p, homeNewArrivalsOrder: 1 };
      return p;
    });
    const afterReorder = orderHomeNewArrivalsProducts(reorderedCatalog, 'women');
    assert.equal(afterReorder[0].id, secondId);
  }

  // Turning off isNewArrival automatically excludes item from Homepage New Arrivals
  const turnedOffNew = defaulted.map((p, idx) =>
    idx === 0 ? { ...p, isNewArrival: false, showInHomeNewArrivals: true } : p
  );
  const normalizedOff = ensureHomepageMerchandisingDefaults(turnedOffNew);
  assert.equal(normalizedOff[0].showInHomeNewArrivals, false);

  // 2. Section 2 Women's 4 Category Tiles (Jackets, Trousers, Skirts, Denim) & 1-per-category exclusivity
  const womenCats = INITIAL_CATEGORIES.filter((c) => c.department === 'women');
  const tiles = getHomeWomenCategoryTiles(defaulted, womenCats);
  assert.deepEqual(
    tiles.map((t) => t.tileName),
    ['Jackets', 'Trousers', 'Skirts', 'Denim']
  );

  const jackets = defaulted.filter(
    (p) =>
      p.department === 'women' &&
      normalizeHomeWomenCategoryTile(p.category) === 'Jackets'
  );
  assert.equal(jackets.filter((p) => p.isHomeCategoryCover).length, 1);

  if (jackets.length >= 2) {
    const secondJacket = jackets.find((p) => !p.isHomeCategoryCover)!;
    const swapped = applyExclusiveHomeCategoryCover(
      defaulted,
      secondJacket.id,
      true,
      secondJacket.category
    );
    const updatedJackets = swapped.filter(
      (p) =>
        p.department === 'women' &&
        normalizeHomeWomenCategoryTile(p.category) === 'Jackets'
    );
    assert.equal(updatedJackets.filter((p) => p.isHomeCategoryCover).length, 1);
    assert.equal(
      updatedJackets.find((p) => p.isHomeCategoryCover)?.id,
      secondJacket.id
    );
  }

  // 3. Homepage Bags Collection toggle & 1, 2, 3... ordering
  const homeBags = orderHomeBagsProducts(defaulted);
  assert.equal(homeBags.length > 0, true);
  assert.equal(homeBags[0].showInHomeBags, true);
  assert.equal(homeBags[0].homeBagsOrder, 1);
});

import {
  isAllowedCorsOrigin,
  isEmailInAdminAllowlist,
  validateAndBuildR2UploadObjectKey,
} from '../../functions/api/_auth';
import { serializePublicCatalogState } from '../../functions/api/catalog';
import { executePromoValidation } from '../../functions/api/promo/validate';
import { executeCreateOrder } from '../../functions/api/orders';
import { executeCreatePreorder } from '../../functions/api/preorders';

test('serializePublicCatalogState strips all PII, orders, preorders, subscribers, admins, promoCodes, hidden products, inactive categories, and webhook secrets', () => {
  const fullState = {
    products: [
      { ...INITIAL_PRODUCTS[0], id: 'pub-1', hiddenFromStore: false },
      { ...INITIAL_PRODUCTS[1], id: 'hid-1', hiddenFromStore: true },
    ],
    categories: [
      { ...INITIAL_CATEGORIES[0], id: 'cat-active', active: true },
      { ...INITIAL_CATEGORIES[1], id: 'cat-inactive', active: false },
    ],
    orders: [
      {
        id: 'ord-secret-1',
        customerName: 'Secret Buyer',
        customerEmail: 'buyer@secret.com',
        customerPhone: '70111222',
      },
    ],
    preorders: [
      {
        id: 'pre-secret-1',
        customerContact: '70999888',
      },
    ],
    newsletterSubscribers: [
      {
        id: 'sub-secret-1',
        email: 'vip@secret.com',
        phone: '+96170123456',
      },
    ],
    admins: [{ id: 'adm-1', email: 'apolokor@gmail.com', role: 'superadmin' }],
    promoCodes: [
      {
        id: 'prm-1',
        code: 'SECRET50',
        discountType: 'percentage',
        discountValue: 50,
        active: true,
      },
    ],
    siteBanners: {
      ...buildDefaultSiteBanners(INITIAL_CATEGORIES),
      orderEmailBccAddress: 'private-bcc@samoweave.com',
      googleSheetsSync: {
        enabled: true,
        webhookUrl: 'https://script.google.com/macros/s/secret-webhook/exec',
        syncSecret: 'top-secret-token-123',
      },
    },
    sizeGuideConfig: { enabled: true },
    newsletterPopupConfig: { enabled: true, delaySeconds: 4 },
    seoConfig: { siteTitle: 'Official Website | SAMO' },
    adminNotificationState: { lastSeenOrdersCount: 5, lastSeenPreordersCount: 2 },
    showLowStockCount: false,
    codEnabled: true,
    autoAcceptOrders: true,
    updatedAt: '2026-11-28T10:00:00.000Z',
  };

  const publicPayload = serializePublicCatalogState(fullState) as Record<string, unknown>;

  // Only visible products and active categories are returned
  const pubProducts = publicPayload.products as Array<{ id: string }>;
  assert.equal(pubProducts.length, 1);
  assert.equal(pubProducts[0].id, 'pub-1');

  const pubCategories = publicPayload.categories as Array<{ id: string }>;
  assert.equal(pubCategories.length, 1);
  assert.equal(pubCategories[0].id, 'cat-active');

  // Sensitive collections must not exist at all on the public payload
  assert.equal('orders' in publicPayload, false);
  assert.equal('preorders' in publicPayload, false);
  assert.equal('newsletterSubscribers' in publicPayload, false);
  assert.equal('admins' in publicPayload, false);
  assert.equal('promoCodes' in publicPayload, false);
  assert.equal('adminNotificationState' in publicPayload, false);

  // siteBanners must not expose orderEmailBccAddress or googleSheetsSync secrets
  const pubBanners = publicPayload.siteBanners as Record<string, unknown>;
  assert.ok(pubBanners);
  assert.equal('orderEmailBccAddress' in pubBanners, false);
  assert.equal('googleSheetsSync' in pubBanners, false);

  // Public storefront flags remain intact
  assert.equal(publicPayload.showLowStockCount, false);
  assert.equal(publicPayload.codEnabled, true);
  assert.equal(publicPayload.autoAcceptOrders, true);
});

test('isEmailInAdminAllowlist, isAllowedCorsOrigin, and validateAndBuildR2UploadObjectKey enforce strict security policies', () => {
  // Super-admins allowed, charbelkorab11123@gmail.com strictly blocked even if passed in dynamic list
  const dynamicAdmins = [
    { email: 'staff@samoweave.com' },
    { email: 'charbelkorab11123@gmail.com' },
  ];
  assert.equal(isEmailInAdminAllowlist('apolokor@gmail.com', dynamicAdmins), true);
  assert.equal(isEmailInAdminAllowlist('joeykorab88@gmail.com', dynamicAdmins), true);
  assert.equal(isEmailInAdminAllowlist('samobougharios@gmail.com', dynamicAdmins), true);
  assert.equal(isEmailInAdminAllowlist('staff@samoweave.com', dynamicAdmins), true);
  assert.equal(isEmailInAdminAllowlist('charbelkorab11123@gmail.com', dynamicAdmins), false);
  assert.equal(isEmailInAdminAllowlist('hacker@example.com', dynamicAdmins), false);

  // CORS origin allowlist
  assert.equal(isAllowedCorsOrigin('https://samoweave.com'), true);
  assert.equal(isAllowedCorsOrigin('https://www.samoweave.com'), true);
  assert.equal(isAllowedCorsOrigin('https://samo-store.pages.dev'), true);
  assert.equal(isAllowedCorsOrigin('https://ais-dev-12345.us-central1.run.app'), true);
  assert.equal(isAllowedCorsOrigin('http://localhost:3000'), true);
  assert.equal(isAllowedCorsOrigin('https://evil-attacker.com'), false);
  assert.equal(isAllowedCorsOrigin('https://samoweave.com.evil.com'), false);

  // R2 upload validation rejects SVG & HTML and generates unique prefixed keys inside products/ or banners/
  const svgAttempt = validateAndBuildR2UploadObjectKey({
    fileName: 'xss.svg',
    folder: 'products',
    contentType: 'image/svg+xml',
  });
  assert.equal(svgAttempt.ok, false);

  const validProductImg = validateAndBuildR2UploadObjectKey({
    fileName: 'Black Cashmere Coat.webp',
    folder: 'products',
    contentType: 'image/webp',
  });
  assert.equal(validProductImg.ok, true);
  if (validProductImg.ok) {
    assert.ok(validProductImg.objectKey.startsWith('products/'));
    assert.ok(validProductImg.objectKey.endsWith('-black-cashmere-coat.webp'));
  }

  const validBannerVideo = validateAndBuildR2UploadObjectKey({
    fileName: 'hero.mp4',
    folder: 'banners',
    contentType: 'video/mp4',
  });
  assert.equal(validBannerVideo.ok, true);
  if (validBannerVideo.ok) {
    assert.ok(validBannerVideo.objectKey.startsWith('banners/'));
    assert.ok(validBannerVideo.objectKey.endsWith('-hero.mp4'));
  }
});

test('executePromoValidation, executeCreateOrder, and executeCreatePreorder validate prices, promo limits, and stock server-side', async () => {
  const testProduct: ProductItem = {
    id: 'prod-coat-1',
    name: 'BLACK CASHMERE COAT',
    department: 'women',
    category: 'Jackets',
    style: 'Classic',
    price: 100,
    discountType: 'fixed',
    discountValue: 15, // effective price = $85
    quantity: 3,
    sizeQuantities: { S: 1, M: 2 },
    isNewArrival: true,
    imageUrl: 'https://images.samoweave.com/products/coat.webp',
    galleryUrls: [],
    sizeType: 'letter',
    sizes: ['S', 'M'],
    materials: ['Cashmere'],
    description: 'Cashmere coat',
    inStock: true,
    featured: true,
  };

  let mutableState: Record<string, unknown> = {
    products: [testProduct],
    categories: INITIAL_CATEGORIES,
    orders: [] as OrderItem[],
    preorders: [],
    promoCodes: [
      {
        id: 'promo-10',
        code: 'SAMO10',
        discountType: 'percentage' as const,
        discountValue: 10,
        active: true,
        usageCount: 0,
        maxUsesPerEmail: 1,
        createdAt: '2026-11-28T00:00:00Z',
      },
    ],
    autoAcceptOrders: true,
    codEnabled: true,
  };

  const memoryAdapter = {
    readState: async () => mutableState,
    writeState: async (patch: Record<string, unknown>) => {
      mutableState = { ...mutableState, ...patch };
      return mutableState;
    },
  };

  // 1. Validate promo code before usage
  const promoCheck1 = executePromoValidation(
    {
      code: 'samo10',
      email: 'client@samoweave.com',
    },
    mutableState
  );
  assert.equal(promoCheck1.valid, true);

  // 2. Create order with SAMO10 promo code (even if client tries to spoof price, server recalculates $85 - 10% = $76.50 + $4 delivery = $80.50)
  const orderRes = await executeCreateOrder(
    {
      customerName: 'Maya',
      customerEmail: 'client@samoweave.com',
      customerPhone: '+961 70 111 222',
      shippingLocation: 'Beirut, Achrafieh',
      deliveryMethod: 'Cash on Delivery ($4 Delivery)',
      promoCode: 'SAMO10',
      orderedItems: [
        {
          productId: 'prod-coat-1',
          productName: 'BLACK CASHMERE COAT',
          selectedSize: 'S',
          quantity: 1,
        },
      ],
    },
    memoryAdapter
  );

  assert.equal(orderRes.status, 200);
  assert.equal(orderRes.body.ok, true);
  const createdOrder = orderRes.body.order as OrderItem;
  assert.equal(createdOrder.subtotal, 85);
  assert.equal(createdOrder.discountAmount, 9);
  assert.equal(createdOrder.deliveryFee, 6);
  assert.equal(createdOrder.totalPrice, 82);
  assert.equal(createdOrder.status, 'accepted');

  // Stock for size S was 1 -> now 0
  const updatedProducts = mutableState.products as ProductItem[];
  assert.equal(updatedProducts[0].sizeQuantities.S, 0);
  assert.equal(updatedProducts[0].quantity, 2);

  // 3. Re-validating SAMO10 with the same email now fails because maxUsesPerEmail === 1
  const promoCheck2 = executePromoValidation(
    {
      code: 'SAMO10',
      email: 'client@samoweave.com',
    },
    mutableState
  );
  assert.equal(promoCheck2.valid, false);

  // 4. Attempting to buy size S again fails out-of-stock check server-side
  const outOfStockOrder = await executeCreateOrder(
    {
      customerName: 'Maya',
      customerEmail: 'other@samoweave.com',
      customerPhone: '+961 70 111 222',
      shippingLocation: 'Beirut',
      deliveryMethod: 'Cash on Delivery ($4 Delivery)',
      orderedItems: [
        {
          productId: 'prod-coat-1',
          productName: 'BLACK CASHMERE COAT',
          selectedSize: 'S',
          quantity: 1,
        },
      ],
    },
    memoryAdapter
  );
  assert.equal(outOfStockOrder.status, 400);
  assert.equal(outOfStockOrder.body.ok, false);

  // 5. Server-side preorder validation and creation
  const preorderRes = await executeCreatePreorder(
    {
      productId: 'prod-coat-1',
      productName: 'BLACK CASHMERE COAT',
      selectedSize: 'S',
      customerContact: '+961 70 555 666',
    },
    memoryAdapter
  );
  assert.equal(preorderRes.status, 200);
  assert.equal(preorderRes.body.ok, true);
  const createdPreorder = preorderRes.body.preorder as { productId: string; selectedSize: string };
  assert.equal(createdPreorder.productId, 'prod-coat-1');
  assert.equal(createdPreorder.selectedSize, 'S');
  assert.equal((mutableState.preorders as unknown[]).length, 1);
});



