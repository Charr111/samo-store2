import {
  AdminRecord,
  CategoryItem,
  OrderItem,
  PreorderItem,
  ProductItem,
  PromoCodeItem,
} from "../types/samo";
import { SUPER_ADMIN_EMAILS } from "../utils/catalogLogic";

export const LEGACY_REMOVED_PRODUCT_IDS: readonly string[] = [
  "samo-w-jacket-01",
  "samo-w-trench-01",
  "samo-w-bags-01",
  "samo-w-fur-01",
  "samo-w-trousers-01",
  "samo-w-pants-01",
  "samo-w-skirts-01",
  "samo-w-denim-01",
  "samo-w-tops-01",
  "samo-w-fullset-01",
  "samo-w-belts-01",
  "samo-k-baby-01",
  "samo-k-junior-01",
  "samo-k-teen-01",
  "samo-k-children-02",
  "samo-women-ivory-pleated-top-2575"
];

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    "id": "women-jacket",
    "name": "Jackets",
    "slug": "jackets",
    "department": "women",
    "description": "Architectural biker, bomber, and structured shoulder silhouettes in grained leather and wool.",
    "sortOrder": 1,
    "sizeGuides": [
      "tops_guide"
    ]
  },
  {
    "id": "women-trousers",
    "name": "Trousers",
    "slug": "trousers",
    "department": "women",
    "description": "Tailored high-waist and elongated pleated wool and leather trousers.",
    "sortOrder": 2,
    "sizeGuides": [
      "trousers_guide"
    ]
  },
  {
    "id": "women-pants",
    "name": "Pants",
    "slug": "pants",
    "department": "women",
    "description": "Relaxed sport-chic track pants, cargo silhouettes, and flared suede styles.",
    "sortOrder": 3,
    "sizeGuides": [
      "trousers_guide"
    ]
  },
  {
    "id": "women-skirts",
    "name": "Skirts",
    "slug": "skirts",
    "department": "women",
    "description": "Asymmetric midi, wrap leather, and sculptural maxi column skirts.",
    "sortOrder": 4
  },
  {
    "id": "women-denim",
    "name": "Denim",
    "slug": "denim",
    "department": "women",
    "description": "Japanese raw selvedge, baggy couture-wash jeans, and structured denim outerwear.",
    "sortOrder": 5,
    "sizeGuides": [
      "trousers_guide"
    ]
  },
  {
    "id": "women-tops",
    "name": "Tops",
    "slug": "tops",
    "department": "women",
    "description": "Draped silk blouses, heavy jersey hoodies, and second-skin satin tops.",
    "sortOrder": 6,
    "sizeGuides": [
      "tops_guide"
    ]
  },
  {
    "id": "women-full-set",
    "name": "Full Set",
    "slug": "full-set",
    "department": "women",
    "description": "Coordinated two-piece tailoring, suede ensembles, and sport-chic monolith sets.",
    "sortOrder": 7,
    "sizeGuides": [
      "tops_guide",
      "trousers_guide"
    ]
  },
  {
    "id": "women-trench-coat",
    "name": "Trench Coat",
    "slug": "trench-coat",
    "department": "women",
    "description": "Floor-sweeping double-breasted storm-flap coats in calfskin, suede, and gabardine.",
    "sortOrder": 8,
    "sizeGuides": [
      "tops_guide"
    ]
  },
  {
    "id": "women-fur",
    "name": "Fur",
    "slug": "fur",
    "department": "women",
    "description": "Voluminous shearling, plush faux-fur opera coats, and cropped winter statements.",
    "sortOrder": 9,
    "sizeGuides": [
      "tops_guide"
    ]
  },
  {
    "id": "women-bags",
    "name": "Bags",
    "slug": "bags",
    "department": "women",
    "description": "Signature top-handle bags, croc-embossed totes, and suede baguettes.",
    "sortOrder": 10,
    "sizeGuides": []
  },
  {
    "id": "women-belts",
    "name": "Accessories",
    "slug": "accessories",
    "department": "women",
    "description": "Heavy brass hardware waist belts and grained Italian cow leather straps.",
    "sortOrder": 11,
    "sizeGuides": []
  },
  {
    "id": "women-footwear-9807",
    "name": "Footwear",
    "slug": "footwear",
    "department": "women",
    "description": "Detachable mink sliders and artisanal footwear.",
    "sortOrder": 12,
    "sizeGuides": []
  },
  {
    "id": "women-classic-set-5642",
    "name": "Classic set",
    "slug": "classic-set",
    "department": "women",
    "description": "Tailored two-piece classic ensembles.",
    "sortOrder": 13,
    "sizeGuides": [
      "tops_guide",
      "trousers_guide"
    ]
  },
  {
    "id": "women-comfy-set-0599",
    "name": "Comfy set",
    "slug": "comfy-set",
    "department": "women",
    "description": "Relaxed coordinated lounge and sport-chic sets.",
    "sortOrder": 14,
    "sizeGuides": [
      "trousers_guide",
      "tops_guide"
    ]
  },
  {
    "id": "women-dress-9621",
    "name": "Dress",
    "slug": "dress",
    "department": "women",
    "description": "Plisse pleated midi dresses and sculpted evening silhouettes.",
    "sortOrder": 15,
    "sizeGuides": []
  },
  {
    "id": "women-hat",
    "name": "Hat",
    "slug": "hat",
    "department": "women",
    "description": "Artisanal mink cossack hats and winter headwear.",
    "sortOrder": 16,
    "sizeGuides": []
  },
  {
    "id": "kids-minis",
    "name": "MINIS 1 To 5",
    "slug": "minis-1-to-5",
    "department": "kids",
    "description": "Ultra-soft cashmere, organic cotton, and mini shearling pieces for ages 1 to 5.",
    "sortOrder": 1
  },
  {
    "id": "kids-children",
    "name": "CHILDREN 6+",
    "slug": "children-6-plus",
    "department": "kids",
    "description": "Sport-chic sets, tailored coats, and structured silhouettes for children 6+.",
    "sortOrder": 2
  },
  {
    "id": "kids-teen",
    "name": "Teen 13+",
    "slug": "teen-13-plus",
    "department": "kids",
    "description": "Runway-proportioned outerwear, wide denim, and suede silhouettes for teens 13+.",
    "sortOrder": 3
  }
];

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    "id": "samo-w-001",
    "name": "NOIR FAUX FUR JACKET",
    "garmentCode": "6700066",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 95,
    "quantity": 1,
    "sizeQuantities": {
      "M/L": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "dual_letter",
    "sizes": [
      "M/L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-002",
    "name": "SNOW FAUX FUR JACKET",
    "garmentCode": "6810012",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 95,
    "quantity": 1,
    "sizeQuantities": {
      "M/L": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "dual_letter",
    "sizes": [
      "M/L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-003",
    "name": "ESPRESSO FAUX FUR JACKET",
    "garmentCode": "6810012",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 95,
    "quantity": 1,
    "sizeQuantities": {
      "M/L": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "dual_letter",
    "sizes": [
      "M/L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-004",
    "name": "WHITE MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 0,
    "sizeQuantities": {
      "40/41": 0
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": false,
    "featured": false
  },
  {
    "id": "samo-w-005",
    "name": "BLACK MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "39/40": 0,
      "40/41": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "39/40",
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-006",
    "name": "ORANGE MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "40/41": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-007",
    "name": "CAMEL MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-008",
    "name": "BURGUNDY MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "39/40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "39/40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-009",
    "name": "MIXED MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "40/41": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-010",
    "name": "SUNSET MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "39/40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "39/40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-011",
    "name": "BLUSH MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "40/41": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-012",
    "name": "BURGUNDY MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 2,
    "sizeQuantities": {
      "OS": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-013",
    "name": "ESPRESSO MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-014",
    "name": "MIDNIGHT MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-015",
    "name": "CHARCOAL MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 2,
    "sizeQuantities": {
      "OS": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-016",
    "name": "TAUPE MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 2,
    "sizeQuantities": {
      "OS": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-017",
    "name": "CHOCOLATE MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-018",
    "name": "SILVER MINK COSSACK",
    "garmentCode": "56701",
    "department": "women",
    "category": "Hat",
    "style": "Accessories",
    "price": 110,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-019",
    "name": "SAHARA CROC CRESCENT",
    "garmentCode": "40310",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 139,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-020",
    "name": "SLATE SUEDE BAGUETTE",
    "garmentCode": "40456",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 135,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-021",
    "name": "JADE CROC BAGUETTE",
    "garmentCode": "40456",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 135,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-022",
    "name": "PEARL CROC BAGUETTE",
    "garmentCode": "40456",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 135,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-023",
    "name": "COGNAC CROC TOTE",
    "garmentCode": "40086",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 157,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-024",
    "name": "MERLOT CROC SADDLE",
    "garmentCode": "40397",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 118,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-025",
    "name": "ONYX CROC CRESCENT",
    "garmentCode": "40310",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 139,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-026",
    "name": "TERRACOTTA CROC SATCHEL",
    "garmentCode": "40406",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 145,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-027",
    "name": "NOIR CROC SADDLE",
    "garmentCode": "40397",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 118,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-028",
    "name": "RUBY CROC CRESCENT",
    "garmentCode": "40310",
    "department": "women",
    "category": "Bags",
    "style": "Accessories",
    "price": 139,
    "quantity": 1,
    "sizeQuantities": {
      "OS": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "OS"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-030",
    "name": "JOKER MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "40/41": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-031",
    "name": "FAWN MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 2,
    "sizeQuantities": {
      "38/39": 1,
      "39/40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39",
      "39/40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-033",
    "name": "BOREALIS MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "39/40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "39/40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-034",
    "name": "DOVE MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-035",
    "name": "COAL MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-036",
    "name": "OATMEAL MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-037",
    "name": "SAGE MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-038",
    "name": "GRAPHITE MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-039",
    "name": "TRUFFLE MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "38/39": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38/39"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-040",
    "name": "MOSAIC MINK SLIDERS",
    "garmentCode": "02005",
    "department": "women",
    "category": "Footwear",
    "style": "Accessories",
    "price": 40,
    "quantity": 1,
    "sizeQuantities": {
      "40/41": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40/41"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-041",
    "name": "CUTOUT DENIM",
    "garmentCode": "W-2272",
    "department": "women",
    "category": "Denim",
    "style": "Sport Chic",
    "price": 55,
    "quantity": 6,
    "sizeQuantities": {
      "34": 1,
      "36": 2,
      "38": 1,
      "40": 1,
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "34",
      "36",
      "38",
      "40",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-046",
    "name": "PLEATED DENIM",
    "garmentCode": "W-2263",
    "department": "women",
    "category": "Denim",
    "style": "Sport Chic",
    "price": 55,
    "quantity": 4,
    "sizeQuantities": {
      "34": 1,
      "36": 1,
      "38": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "34",
      "36",
      "38"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-049",
    "name": "WASHED DENIM",
    "garmentCode": "W-2278",
    "department": "women",
    "category": "Denim",
    "style": "Sport Chic",
    "price": 55,
    "quantity": 6,
    "sizeQuantities": {
      "34": 1,
      "36": 1,
      "38": 2,
      "40": 1,
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "34",
      "36",
      "38",
      "40",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-054",
    "name": "HERRINGBONE TROUSERS",
    "garmentCode": "2602",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 48,
    "quantity": 11,
    "sizeQuantities": {
      "S/M": 6,
      "L/XL": 5
    },
    "hasColors": true,
    "colorVariants": [
      {
        "colorName": "Brown",
        "colorHex": "#4A2C1D",
        "garmentCode": "2602",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "dual_letter",
        "sizes": [
          "S/M",
          "L/XL"
        ],
        "sizeQuantities": {
          "S/M": 2,
          "L/XL": 1
        }
      },
      {
        "colorName": "Grey",
        "colorHex": "#71717A",
        "garmentCode": "2602",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "dual_letter",
        "sizes": [
          "S/M",
          "L/XL"
        ],
        "sizeQuantities": {
          "S/M": 2,
          "L/XL": 2
        }
      },
      {
        "colorName": "Matcha",
        "colorHex": "#748B6F",
        "garmentCode": "2602",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "dual_letter",
        "sizes": [
          "S/M",
          "L/XL"
        ],
        "sizeQuantities": {
          "S/M": 2,
          "L/XL": 2
        }
      }
    ],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "dual_letter",
    "sizes": [
      "S/M",
      "L/XL"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-060",
    "name": "HERRINGBONE SKIRT",
    "garmentCode": "2603",
    "department": "women",
    "category": "Skirts",
    "style": "Classic",
    "price": 48,
    "quantity": 3,
    "sizeQuantities": {
      "S/M": 2,
      "L/XL": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "dual_letter",
    "sizes": [
      "S/M",
      "L/XL"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-062",
    "name": "PLEATED IVORY",
    "garmentCode": "2319",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 38,
    "quantity": 4,
    "sizeQuantities": {
      "38": 0,
      "40": 1,
      "42": 1,
      "44": 1,
      "46": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38",
      "40",
      "42",
      "44",
      "46"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-067",
    "name": "PLEATED BEIGE",
    "garmentCode": "2319",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 38,
    "quantity": 5,
    "sizeQuantities": {
      "38": 1,
      "40": 1,
      "42": 1,
      "44": 1,
      "46": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38",
      "40",
      "42",
      "44",
      "46"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-072",
    "name": "PLEATED BLACK",
    "garmentCode": "2319",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 38,
    "quantity": 3,
    "sizeQuantities": {
      "38": 0,
      "40": 0,
      "42": 1,
      "44": 1,
      "46": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38",
      "40",
      "42",
      "44",
      "46"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-077",
    "name": "LACE BLAZER",
    "garmentCode": "2329",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 54,
    "quantity": 5,
    "sizeQuantities": {
      "38": 1,
      "40": 1,
      "42": 1,
      "44": 1,
      "46": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38",
      "40",
      "42",
      "44",
      "46"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-082",
    "name": "EMERALD TRENCH",
    "garmentCode": "00752",
    "department": "women",
    "category": "Trench Coat",
    "style": "Classic",
    "price": 125,
    "quantity": 4,
    "sizeQuantities": {
      "S": 1,
      "M": 1,
      "L": 1,
      "XL": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "S",
      "M",
      "L",
      "XL"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-086",
    "name": "CASHMERE BLAZER",
    "garmentCode": "00765",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 95,
    "quantity": 5,
    "sizeQuantities": {
      "40": 1,
      "42": 1,
      "44": 1,
      "46": 1,
      "48": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40",
      "42",
      "44",
      "46",
      "48"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-091",
    "name": "FLUID TROUSERS",
    "garmentCode": "913",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 55,
    "quantity": 5,
    "sizeQuantities": {
      "40": 1,
      "42": 1,
      "44": 1,
      "46": 1,
      "48": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40",
      "42",
      "44",
      "46",
      "48"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-096",
    "name": "RELAXED SWEATS",
    "garmentCode": "2602003",
    "department": "women",
    "category": "Pants",
    "style": "Sport Chic",
    "price": 30,
    "quantity": 9,
    "sizeQuantities": {
      "M": 4,
      "L": 3,
      "S": 2
    },
    "hasColors": true,
    "colorVariants": [
      {
        "colorName": "Light Grey",
        "colorHex": "#A1A1AA",
        "garmentCode": "2602003",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "letter",
        "sizes": [
          "M",
          "L"
        ],
        "sizeQuantities": {
          "M": 2,
          "L": 1
        }
      },
      {
        "colorName": "Graige",
        "colorHex": "#B8B0A4",
        "garmentCode": "2602003",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "letter",
        "sizes": [
          "S",
          "M",
          "L"
        ],
        "sizeQuantities": {
          "S": 2,
          "M": 2,
          "L": 2
        }
      }
    ],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "M",
      "L",
      "S"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-101",
    "name": "WHITE KNIT",
    "garmentCode": "2082",
    "department": "women",
    "category": "Tops",
    "style": "Classic",
    "price": 33,
    "quantity": 4,
    "sizeQuantities": {
      "36": 0,
      "38": 1,
      "40": 1,
      "42": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-105",
    "name": "BLUE KNIT",
    "garmentCode": "2082",
    "department": "women",
    "category": "Tops",
    "style": "Classic",
    "price": 33,
    "quantity": 6,
    "sizeQuantities": {
      "36": 2,
      "38": 2,
      "40": 1,
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-109",
    "name": "FLEECE JACKET",
    "garmentCode": "F309",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 35,
    "quantity": 11,
    "sizeQuantities": {
      "M": 3,
      "L": 4,
      "XXL": 2,
      "XL": 2
    },
    "hasColors": true,
    "colorVariants": [
      {
        "colorName": "Burgundy",
        "colorHex": "#5E131D",
        "garmentCode": "F309",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "letter",
        "sizes": [
          "M",
          "L",
          "XXL"
        ],
        "sizeQuantities": {
          "M": 1,
          "L": 2,
          "XXL": 1
        }
      },
      {
        "colorName": "Brown",
        "colorHex": "#4A2C1D",
        "garmentCode": "F309",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "letter",
        "sizes": [
          "M",
          "L",
          "XL",
          "XXL"
        ],
        "sizeQuantities": {
          "M": 1,
          "L": 1,
          "XL": 1,
          "XXL": 1
        }
      },
      {
        "colorName": "Beige",
        "colorHex": "#D6C7B2",
        "garmentCode": "F309",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "letter",
        "sizes": [
          "M",
          "L",
          "XL"
        ],
        "sizeQuantities": {
          "M": 1,
          "L": 1,
          "XL": 1
        }
      }
    ],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "M",
      "L",
      "XXL",
      "XL"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-119",
    "name": "METALLIC BLAZER",
    "garmentCode": "01330",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 57,
    "quantity": 1,
    "sizeQuantities": {
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-120",
    "name": "ZEBRA TROUSERS",
    "garmentCode": "31027",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 48,
    "quantity": 2,
    "sizeQuantities": {
      "S": 0,
      "M": 1,
      "L": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "S",
      "M",
      "L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-123",
    "name": "PLISSE DRESS",
    "garmentCode": "6693",
    "department": "women",
    "category": "Dress",
    "style": "Classic",
    "price": 65,
    "quantity": 2,
    "sizeQuantities": {
      "36": 1,
      "38": 0,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-126",
    "name": "SMOOTH SWEATS",
    "garmentCode": "34001",
    "department": "women",
    "category": "Pants",
    "style": "Sport Chic",
    "price": 35,
    "quantity": 5,
    "sizeQuantities": {
      "S/M": 1,
      "M/L": 4
    },
    "hasColors": true,
    "colorVariants": [
      {
        "colorName": "White",
        "colorHex": "#FAFAFA",
        "garmentCode": "34001",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "dual_letter",
        "sizes": [
          "S/M",
          "M/L"
        ],
        "sizeQuantities": {
          "S/M": 1,
          "M/L": 2
        }
      },
      {
        "colorName": "Black",
        "colorHex": "#111113",
        "garmentCode": "34001",
        "imageUrl": "",
        "galleryUrls": [],
        "sizeType": "dual_letter",
        "sizes": [
          "M/L"
        ],
        "sizeQuantities": {
          "M/L": 2
        }
      }
    ],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "dual_letter",
    "sizes": [
      "S/M",
      "M/L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-129",
    "name": "CROPPED BOMBER",
    "garmentCode": "65120",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 35,
    "quantity": 5,
    "sizeQuantities": {
      "S": 1,
      "M": 1,
      "L": 3
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "S",
      "M",
      "L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-132",
    "name": "BUTTON TROUSERS",
    "garmentCode": "000210",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 45,
    "quantity": 1,
    "sizeQuantities": {
      "38": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "38"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-133",
    "name": "PINSTRIPE TROUSERS",
    "garmentCode": "100102",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 48,
    "quantity": 4,
    "sizeQuantities": {
      "36": 1,
      "38": 1,
      "40": 1,
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-137",
    "name": "PLEATED TROUSERS",
    "garmentCode": "20237",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 48,
    "quantity": 3,
    "sizeQuantities": {
      "36": 1,
      "38": 1,
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-140",
    "name": "CHIFFON TOP",
    "garmentCode": "03067",
    "department": "women",
    "category": "Tops",
    "style": "Classic",
    "price": 35,
    "quantity": 4,
    "sizeQuantities": {
      "36": 1,
      "38": 1,
      "40": 1,
      "42": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40",
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-144",
    "name": "BOMBER JACKET",
    "garmentCode": "88021",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 35,
    "quantity": 2,
    "sizeQuantities": {
      "S": 0,
      "M": 1,
      "L": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "letter",
    "sizes": [
      "S",
      "M",
      "L"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-147",
    "name": "HERRINGBONE TAILORED SET",
    "garmentCode": "11452+17285",
    "department": "women",
    "category": "Classic set",
    "style": "Classic",
    "price": 147,
    "quantity": 2,
    "sizeQuantities": {
      "36": 1,
      "38": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-149",
    "name": "RUCHED BLAZER",
    "garmentCode": "11480",
    "department": "women",
    "category": "Jackets",
    "style": "Classic",
    "price": 83,
    "quantity": 2,
    "sizeQuantities": {
      "36": 1,
      "38": 0,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-152",
    "name": "LINED TROUSERS",
    "garmentCode": "17284",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 66,
    "quantity": 1,
    "sizeQuantities": {
      "36": 1,
      "38": 0
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-154",
    "name": "BRUSHED TROUSERS",
    "garmentCode": "17229",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 66,
    "quantity": 3,
    "sizeQuantities": {
      "36": 1,
      "38": 1,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-157",
    "name": "PALAZZO TROUSERS",
    "garmentCode": "17331",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 68,
    "quantity": 1,
    "sizeQuantities": {
      "36": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-158",
    "name": "CAMEL CINCHED TROUSERS",
    "garmentCode": "17330",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 68,
    "quantity": 3,
    "sizeQuantities": {
      "36": 1,
      "38": 1,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-161",
    "name": "BLACK CINCHED TROUSERS",
    "garmentCode": "17330",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 68,
    "quantity": 2,
    "sizeQuantities": {
      "36": 0,
      "38": 1,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-164",
    "name": "MINT ARC TROUSERS",
    "garmentCode": "17281",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 55,
    "quantity": 2,
    "sizeQuantities": {
      "36": 0,
      "38": 1,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-167",
    "name": "BROWN ARC TROUSERS",
    "garmentCode": "17281",
    "department": "women",
    "category": "Trousers",
    "style": "Classic",
    "price": 55,
    "quantity": 2,
    "sizeQuantities": {
      "36": 1,
      "38": 0,
      "40": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "36",
      "38",
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-170",
    "name": "CAMEL TRENCH",
    "garmentCode": "88901",
    "department": "women",
    "category": "Trench Coat",
    "style": "Classic",
    "price": 210,
    "quantity": 2,
    "sizeQuantities": {
      "40": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "40"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-171",
    "name": "CRIMSON CASHMERE COAT",
    "garmentCode": "99136",
    "department": "women",
    "category": "Trench Coat",
    "style": "Classic",
    "price": 115,
    "quantity": 2,
    "sizeQuantities": {
      "42": 2
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "42"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-172",
    "name": "NAVY CASHMERE COAT",
    "garmentCode": "99136",
    "department": "women",
    "category": "Trench Coat",
    "style": "Classic",
    "price": 115,
    "quantity": 2,
    "sizeQuantities": {
      "46": 1,
      "48": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "46",
      "48"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-174",
    "name": "CHARCOAL CASHMERE COAT",
    "garmentCode": "99136",
    "department": "women",
    "category": "Trench Coat",
    "style": "Classic",
    "price": 115,
    "quantity": 2,
    "sizeQuantities": {
      "46": 1,
      "48": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "46",
      "48"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-w-176",
    "name": "BLACK CASHMERE COAT",
    "garmentCode": "99136",
    "department": "women",
    "category": "Trench Coat",
    "style": "Classic",
    "price": 115,
    "quantity": 3,
    "sizeQuantities": {
      "44": 1,
      "46": 1,
      "48": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "numeric",
    "sizes": [
      "44",
      "46",
      "48"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-001",
    "name": "CRIMSON TAILORED COAT SET",
    "garmentCode": "707",
    "department": "kids",
    "category": "CHILDREN 6+",
    "style": "Classic",
    "price": 115,
    "quantity": 5,
    "sizeQuantities": {
      "7y": 1,
      "8y": 1,
      "9y": 1,
      "10y": 1,
      "11y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "7y",
      "8y",
      "9y",
      "10y",
      "11y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-006",
    "name": "FAWN MINIS COAT SET",
    "garmentCode": "601",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 105,
    "quantity": 1,
    "sizeQuantities": {
      "3y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "3y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-007",
    "name": "PLUM MINIS COAT SET",
    "garmentCode": "607",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 105,
    "quantity": 1,
    "sizeQuantities": {
      "3y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "3y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-008",
    "name": "SKY LINED MINIS SET",
    "garmentCode": "1370",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 28,
    "quantity": 4,
    "sizeQuantities": {
      "2y": 1,
      "3y": 1,
      "4y": 1,
      "5y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "2y",
      "3y",
      "4y",
      "5y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-012",
    "name": "AZURE MINIS BOY SET",
    "garmentCode": "1376",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 28,
    "quantity": 3,
    "sizeQuantities": {
      "2y": 1,
      "3y": 0,
      "4y": 1,
      "5y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "2y",
      "3y",
      "4y",
      "5y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-016",
    "name": "LAVENDER MINIS GIRL SET",
    "garmentCode": "4244",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 28,
    "quantity": 4,
    "sizeQuantities": {
      "2y": 1,
      "3y": 1,
      "4y": 1,
      "5y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "2y",
      "3y",
      "4y",
      "5y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-020",
    "name": "SLATE BLUE-GREY BOY SET",
    "garmentCode": "6245",
    "department": "kids",
    "category": "CHILDREN 6+",
    "style": "Classic",
    "price": 43,
    "quantity": 5,
    "sizeQuantities": {
      "5y": 1,
      "6y": 1,
      "7y": 1,
      "8y": 1,
      "9y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "5y",
      "6y",
      "7y",
      "8y",
      "9y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-025",
    "name": "UMBER CHILDREN BOY SET",
    "garmentCode": "277035",
    "department": "kids",
    "category": "CHILDREN 6+",
    "style": "Classic",
    "price": 48,
    "quantity": 5,
    "sizeQuantities": {
      "8y": 1,
      "9y": 1,
      "10y": 1,
      "11y": 1,
      "12y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "8y",
      "9y",
      "10y",
      "11y",
      "12y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-030",
    "name": "MIST BLUE-GREY SET",
    "garmentCode": "20160",
    "department": "kids",
    "category": "CHILDREN 6+",
    "style": "Classic",
    "price": 52,
    "quantity": 3,
    "sizeQuantities": {
      "11y": 1,
      "12y": 1,
      "13y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "11y",
      "12y",
      "13y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-033",
    "name": "NAVY SPORT GIRL SET",
    "garmentCode": "25223",
    "department": "kids",
    "category": "CHILDREN 6+",
    "style": "Classic",
    "price": 55,
    "quantity": 5,
    "sizeQuantities": {
      "8y": 1,
      "10y": 1,
      "11y": 1,
      "12y": 1,
      "14y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "8y",
      "10y",
      "11y",
      "12y",
      "14y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-038",
    "name": "SCARLET SPORT DRESS",
    "garmentCode": "1008",
    "department": "kids",
    "category": "CHILDREN 6+",
    "style": "Classic",
    "price": 28,
    "quantity": 4,
    "sizeQuantities": {
      "10y": 1,
      "11y": 1,
      "12y": 1,
      "13y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "10y",
      "11y",
      "12y",
      "13y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-042",
    "name": "MIDNIGHT NAVY MINIS SET",
    "garmentCode": "26-3024",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 55,
    "quantity": 3,
    "sizeQuantities": {
      "6-9M": 1,
      "9-12M": 1,
      "12-18M": 1,
      "18-24M": 0
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "months",
    "sizes": [
      "6-9M",
      "9-12M",
      "12-18M",
      "18-24M"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-046",
    "name": "IVORY OLIVE MINIS SET",
    "garmentCode": "26-3024",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 55,
    "quantity": 4,
    "sizeQuantities": {
      "6-9M": 1,
      "9-12M": 1,
      "12-18M": 1,
      "18-24M": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "months",
    "sizes": [
      "6-9M",
      "9-12M",
      "12-18M",
      "18-24M"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  },
  {
    "id": "samo-k-050",
    "name": "CHESTNUT MINIS COAT SET",
    "garmentCode": "602",
    "department": "kids",
    "category": "MINIS 1 To 5",
    "style": "Classic",
    "price": 105,
    "quantity": 5,
    "sizeQuantities": {
      "2y": 1,
      "3y": 1,
      "4y": 1,
      "5y": 1,
      "6y": 1
    },
    "hasColors": false,
    "colorVariants": [],
    "isNewArrival": false,
    "discountType": "none",
    "discountValue": 0,
    "imageUrl": "",
    "galleryUrls": [],
    "sizeType": "years",
    "sizes": [
      "2y",
      "3y",
      "4y",
      "5y",
      "6y"
    ],
    "materials": [],
    "description": "",
    "inStock": true,
    "featured": false
  }
];

export const INITIAL_PROMO_CODES: PromoCodeItem[] = [
  {
    id: "promo-samo10",
    code: "SAMO10",
    discountType: "percentage",
    discountValue: 10,
    active: true,
    createdAt: "2026-10-20T00:00:00.000Z",
  },
  {
    id: "promo-samo200",
    code: "SAMO200",
    discountType: "fixed",
    discountValue: 200,
    active: true,
    createdAt: "2026-10-20T00:00:00.000Z",
  },
];

export const INITIAL_ORDERS: OrderItem[] = [];

export const INITIAL_PREORDERS: PreorderItem[] = [];

export const INITIAL_ADMINS: AdminRecord[] = SUPER_ADMIN_EMAILS.map((email) => ({
  id: email,
  email,
  addedBy: "System Bootstrap (Owner)",
  createdAt: "2026-10-20T00:00:00.000Z",
}));
