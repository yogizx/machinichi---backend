# Product Listing Redesign — Complete Architecture Plan

## Current State Analysis

### Files to Modify
| File | Path | Role | Issues |
|------|------|------|--------|
| `Product.jsx` | `src/pages/Product.jsx` | Main product listing (822 lines) | Monolithic, mixed concerns, hardcoded data |
| `DryFriut.jsx` | `src/pages/DryFriut.jsx` | Dry fruit listing (685 lines) | 90% duplicate of Product.jsx |
| `ProductDetails.jsx` | `src/pages/ProductDetails.jsx` | Product detail page (516 lines) | Hardcoded related products, mock reviews |
| `Categories.jsx` | `src/pages/Categories.jsx` | Category browsing (266 lines) | Static, no real data |
| `Home.jsx` | `src/pages/Home.jsx` | Home page (448 lines) | No search bar, static products |
| `Header.jsx` | `src/components/Header.jsx` | Main header (96 lines) | No search bar on desktop |
| `App.jsx` | `src/App.jsx` | Root + state (362 lines) | In-memory cart/wishlist, fragile state |

### Current Product Schema Gap
The existing `Product.ts` model is well-structured with variants, but the frontend mapping is broken — it maps backend fields incorrectly and uses hardcoded fallbacks.

---

## 1. Component Architecture (New)

### New Directory Structure
```
src/
├── components/
│   ├── ui/                          # Atomic design system
│   │   ├── Button.jsx
│   │   ├── Badge.jsx
│   │   ├── Skeleton.jsx
│   │   ├── Shimmer.jsx
│   │   ├── Accordion.jsx
│   │   ├── BottomSheet.jsx          # Mobile filter drawer
│   │   ├── PriceSlider.jsx
│   │   ├── StarRating.jsx
│   │   ├── StockIndicator.jsx
│   │   ├── QuantitySelector.jsx
│   │   └── Toast.jsx
│   │
│   ├── product/                     # Product domain components
│   │   ├── ProductCard.jsx          # Single product card (extracted)
│   │   ├── ProductCardSkeleton.jsx  # Loading state
│   │   ├── ProductGrid.jsx          # Grid with lazy loading
│   │   ├── ProductFilters.jsx       # Filter sidebar
│   │   ├── ProductFilterMobile.jsx  # Bottom sheet mobile filter
│   │   ├── ProductSort.jsx          # Sort dropdown
│   │   ├── ProductPagination.jsx    # Pagination / infinite scroll
│   │   ├── ProductVariantSelector.jsx
│   │   ├── ProductQuickView.jsx     # Quick view modal
│   │   ├── ProductImage.jsx         # Cloudinary image with lazy load
│   │   ├── ProductPrice.jsx
│   │   ├── ProductRating.jsx
│   │   └── ProductStockBadge.jsx
│   │
│   ├── search/                      # Search domain components
│   │   ├── SearchBar.jsx            # Main search bar
│   │   ├── SearchSuggestions.jsx    # Autocomplete dropdown
│   │   ├── SearchHistory.jsx
│   │   ├── VoiceSearch.jsx
│   │   └── TrendingSearches.jsx
│   │
│   └── layout/
│       ├── Header.jsx               # Updated with search
│       └── MobileNav.jsx            # New mobile navigation
│
├── hooks/                           # Custom hooks
│   ├── useProducts.js               # Product fetching + filtering
│   ├── useSearch.js                 # Meilisearch hook
│   ├── useInfiniteScroll.js
│   ├── useDebounce.js
│   ├── useLocalStorage.js
│   └── useVoiceSearch.js
│
├── services/                        # API services
│   ├── api.js                       # Axios instance
│   ├── productService.js
│   ├── searchService.js             # Meilisearch client
│   └── cloudinaryService.js
│
├── context/                         # State management
│   ├── CartContext.jsx
│   ├── WishlistContext.jsx
│   ├── SearchContext.jsx
│   └── ProductContext.jsx
│
└── pages/                           # Simplified pages
    ├── ProductListing.jsx           # Unified product listing
    ├── ProductDetail.jsx
    ├── Home.jsx                     # Updated with search
    └── CategoryPage.jsx
```

---

## 2. Product Card Redesign

### Final Card Layout (top to bottom)
```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │         PRODUCT IMAGE         │  │  ← Large, aspect-ratio 1:1, object-cover
│  │      (Cloudinary optimized)   │  │  ← Lazy loaded with blur placeholder
│  │                               │  │
│  │  ♡ Wishlist        -25% OFF   │  │  ← Overlay: heart top-right, discount top-left
│  │                    QUICK VIEW  │  │  ← Quick view on hover (desktop only)
│  └───────────────────────────────┘  │
│                                     │
│  Product Name                      │  ← 2 lines max, font-medium text-base
│  Origin / Subtitle                 │  ← 1 line, text-sm text-gray-500
│  ★★★★☆  (128 reviews)              │  ← Stars + review count link
│                                     │
│  ₹499  ₹799  37% OFF               │  ← Selling price (large) + MRP (strikethrough) + discount
│                                     │
│  500g ● 1kg ● 2kg ● 5kg           │  ← Variant pills (selected state highlighted)
│                                     │
│  ┌─────────────────────────────┐   │
│  │    ADD TO CART  │  BUY NOW  │   │  ← Two CTAs side by side
│  └─────────────────────────────┘   │
│                                     │
│  Only 5 left in stock              │  ← Red/orange warning when low stock (<10)
│                                     │
└─────────────────────────────────────┘
```

### Tailwind Design Tokens to Add (index.css)
```css
@theme {
  --color-brand: #fd761a;
  --color-brand-dark: #e86710;
  --color-brand-light: #fff8f1;
  --color-surface: #ffffff;
  --color-background: #fffaf5;
  --color-text-primary: #211713;
  --color-text-secondary: #6b625c;
  --color-border: #e5d8cd;
  --color-border-light: #f0e8e0;
  --color-success: #7baa41;
  --color-warning: #f6a623;
  --color-danger: #d83b35;
  --color-info: #4a90d9;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-card-hover: 0 12px 28px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
  --shadow-popover: 0 20px 48px rgba(0,0,0,0.1);
}
```

---

## 3. Product Card Component

```jsx
// src/components/product/ProductCard.jsx
// Props: product, onAddToCart, onBuyNow, onWishlistToggle, isWishlisted, priority (for loading)

function ProductCard({ product, onAddToCart, onBuyNow, onWishlistToggle, isWishlisted, priority = false }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0]);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const discount = calculateDiscount(product);

  return (
    <article
      className="group relative flex flex-col rounded-xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-gray-100">
        {!imageLoaded && <Skeleton className="absolute inset-0" />}
        <img
          src={cloudinaryUrl(product.image, { w: 400, q: 80, f: 'webp' })}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setImageLoaded(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white">
            -{discount}% OFF
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onWishlistToggle(product.id); }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
        >
          <Heart className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-600'} size={18} />
        </button>

        {/* Quick View (on hover) */}
        <div className={`absolute inset-x-0 bottom-0 transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <button className="mx-auto mb-3 flex h-10 w-[90%] items-center justify-center rounded-lg bg-white/95 text-sm font-semibold shadow-lg backdrop-blur transition hover:bg-white">
            Quick View
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</h3>
        {product.subtitle && (
          <p className="truncate text-xs font-medium text-gray-500">{product.subtitle}</p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1.5">
          <StarRating rating={product.rating} size={14} />
          <span className="text-xs text-gray-500">({product.reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">₹{formatPrice(selectedVariant?.sellingPrice || product.sellingPrice)}</span>
          {(selectedVariant?.mrpPrice || product.mrpPrice) > (selectedVariant?.sellingPrice || product.sellingPrice) && (
            <>
              <span className="text-sm text-gray-400 line-through">₹{formatPrice(selectedVariant?.mrpPrice || product.mrpPrice)}</span>
              <span className="text-xs font-semibold text-green-600">{discount}% off</span>
            </>
          )}
        </div>

        {/* Variant Selector */}
        {(product.variants?.length > 1) && (
          <div className="flex flex-wrap gap-1.5">
            {product.variants.map((v) => (
              <button
                key={v.sku}
                onClick={(e) => { e.stopPropagation(); setSelectedVariant(v); }}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                  selectedVariant?.sku === v.sku
                    ? 'border-brand bg-brand text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                {v.size || v.weight}
              </button>
            ))}
          </div>
        )}

        {/* Stock Warning */}
        {getAvailableStock(product, selectedVariant) <= 5 && getAvailableStock(product, selectedVariant) > 0 && (
          <p className="flex items-center gap-1 text-xs font-medium text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Only {getAvailableStock(product, selectedVariant)} left
          </p>
        )}
        {getAvailableStock(product, selectedVariant) === 0 && (
          <p className="text-xs font-medium text-red-500">Out of Stock</p>
        )}

        {/* Action Buttons */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product, selectedVariant); }}
            disabled={getAvailableStock(product, selectedVariant) === 0}
            className="flex h-10 items-center justify-center rounded-lg border border-brand text-sm font-semibold text-brand transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onBuyNow(product, selectedVariant); }}
            disabled={getAvailableStock(product, selectedVariant) === 0}
            className="flex h-10 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
}
```

---

## 4. Filters Redesign

### Desktop Filter Sidebar
```
┌────────────────────────────┐
│ Product Filters            │  ← Sticky sidebar, scrollable
├────────────────────────────┤
│ ▶ Category                 │  ← Accordion (collapsible)
│   □ Dryfruits         (24) │     Checkboxes with count
│   □ Nuts              (18) │
│   □ Flour             (32) │
│   □ Grains            (12) │
├────────────────────────────┤
│ ▶ Price Range              │  ← Accordion
│   ─────●────────●──────    │     Dual range slider
│   ₹200              ₹2000  │     Min/Max input fields
├────────────────────────────┤
│ ▶ Brand                    │  ← Accordion
│   □ Machinichi        (45) │     Checkboxes
│   □ Organic Valley    (23) │
│   □ Pure Farm         (12) │
├────────────────────────────┤
│ ▶ Rating                   │  ← Accordion
│   ★★★★☆  & Up         (45) │     Clickable star rows
│   ★★★☆☆  & Up         (78) │
│   ★★☆☆☆  & Up        (102) │
│   ★☆☆☆☆  & Up        (150) │
├────────────────────────────┤
│ ▶ Availability             │  ← Accordion
│   ○ In Stock Only          │     Radio buttons
│   ○ All Products           │
├────────────────────────────┤
│ ▶ Discount                 │  ← Accordion
│   □ 50% or more       (5)  │     Checkboxes
│   □ 30% or more      (12)  │
│   □ 20% or more      (28)  │
│   □ 10% or more      (45)  │
├────────────────────────────┤
│ ▶ Weight / Size            │  ← Accordion
│   □ 250g              (34) │
│   □ 500g              (56) │
│   □ 1kg               (78) │
│   □ 5kg               (23) │
├────────────────────────────┤
│   [CLEAR ALL FILTERS]      │  ← Reset button
└────────────────────────────┘
```

### Mobile Bottom Sheet
- Triggered by "Filter" button in sticky top bar
- Slides up from bottom
- Same accordion structure
- "Apply Filters" + "Clear All" buttons at bottom
- Backdrop dismiss
- 85% viewport height max

---

## 5. Sorting

```jsx
const sortOptions = [
  { value: 'popularity', label: 'Popularity', field: 'totalSales', order: 'desc' },
  { value: 'newest', label: 'Newest First', field: 'createdAt', order: 'desc' },
  { value: 'price-asc', label: 'Price: Low to High', field: 'sellingPrice', order: 'asc' },
  { value: 'price-desc', label: 'Price: High to Low', field: 'sellingPrice', order: 'desc' },
  { value: 'rating', label: 'Customer Rating', field: 'averageRating', order: 'desc' },
  { value: 'discount', label: 'Biggest Discount', field: 'discountPercent', order: 'desc' },
  { value: 'bestselling', label: 'Best Selling', field: 'totalSales', order: 'desc' },
];
```

Design: Clean dropdown with chevron, or horizontal pill-style selector.

---

## 6. Pagination / Infinite Scroll

### Strategy: Progressive Enhancement
1. **Initial load**: 20 products (server-side paginated)
2. **Scroll**: Intersection Observer triggers next page fetch
3. **Load More**: Fallback button at bottom for accessibility
4. **Virtualization**: If >100 products on screen (react-window)

### Backend Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 7. API Requirements — New Endpoints

### Enhance Existing Product Routes (`/api/products`)

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|-------------|
| `GET` | `/api/products` | Paginated listing | `page`, `limit`, `sort`, `order`, `search`, `category`, `minPrice`, `maxPrice`, `brand`, `rating`, `inStock`, `discount`, `tags` |
| `GET` | `/api/products/featured` | Featured products | `limit` |
| `GET` | `/api/products/search` | Search (Meilisearch) | `q`, `page`, `limit` |
| `GET` | `/api/products/slug/:slug` | Product detail by slug | — |
| `GET` | `/api/products/related/:id` | Related products | `limit` |
| `GET` | `/api/products/filters` | Available filter options | `category` (optional) |
| `GET` | `/api/products/autocomplete` | Search autocomplete | `q` |
| `POST` | `/api/products/compare` | Compare products | Body: `productIds[]` |

### New: Filter Options Endpoint
```
GET /api/products/filters?category=categoryId
Response:
{
  "brands": [{ "name": "Machinichi", "count": 45 }],
  "priceRange": { "min": 99, "max": 2500 },
  "ratings": [{ "value": 4, "count": 45 }, ...],
  "discounts": [{ "range": "10-20", "count": 28 }, ...],
  "sizes": [{ "value": "1kg", "count": 78 }],
  "tags": [{ "value": "organic", "count": 120 }]
}
```

---

## 8. Database Schema Updates

### Product Model Enhancements (add to existing)
```
// New fields to add to Product.ts:
subtitle: String                         // Short description for cards
seoTitle: String                         // Search-optimized title
barcode: String                           // For variant tracking
countryOfOrigin: String                   // "India"
organicCertification: String              // "USDA Organic", "India Organic"
nutritionalInfo: {                        // Per 100g
  energy: String,
  protein: String,
  carbs: String,
  fat: String,
  fiber: String,
  sodium: String
}
returnPolicy: {
  isReturnable: Boolean,
  returnPeriodDays: Number,
  returnCondition: String
}
shippingInfo: {
  weight: Number,
  dimensions: { length, width, height },
  shippingClass: String
}
```

### Indexes to Add
```javascript
// Compound indexes for common filter combinations
productSchema.index({ category: 1, sellingPrice: 1, averageRating: -1 });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ sellingPrice: 1, discountPercent: -1 });
productSchema.index({ tags: 1, isActive: 1 });
```

---

## 9. UI States

### Loading State — Skeleton Grid
```jsx
function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow-card">
          <div className="aspect-square rounded-lg bg-gray-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="h-3 w-1/4 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Empty State
- Illustration + "No products found" message
- Suggested actions: clear filters, browse categories, search something else
- Category quick links below

### Error State
- Error illustration
- "Something went wrong" message
- "Try Again" button
- "Browse Categories" fallback

---

## 10. Responsive Grid Configuration

```css
/* Tailwind grid classes on container */
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-4 gap-y-6">
```

| Breakpoint | Columns | Card Width | Gap |
|------------|---------|------------|-----|
| Mobile (<640px) | 2 | ~50vw | 12px |
| Tablet (640+) | 3 | ~33vw | 16px |
| Desktop (1024+) | 4 | ~25vw | 24px |
| Wide (1280+) | 4 | ~300px max | 24px |

---

## 11. Implementation Order

### Phase 1 — Foundation (Week 1)
1. Create design system tokens (colors, shadows, radii) in index.css
2. Build atomic UI components (Button, Badge, Skeleton, StarRating, PriceSlider)
3. Create API service layer (api.js, productService.js)
4. Build ProductCard component
5. Build ProductGrid component with skeleton loading
6. Update Header with desktop search bar

### Phase 2 — Full Listing (Week 2)
7. Build ProductFilters (desktop sidebar + mobile bottom sheet)
8. Build ProductSort component
9. Implement pagination with infinite scroll
10. Add filter URL sync (search params)
11. Connect to real backend API
12. Build ProductQuickView modal

### Phase 3 — Search & Polish (Week 3)
13. Integrate Meilisearch (see MEILISEARCH_IMPLEMENTATION.md)
14. Implement voice search
15. Add product compare feature
16. Analytics tracking for search/filter/sort events
17. Performance optimization (lazy loading, virtualization)
18. End-to-end testing

---

## 12. Files to Create/Modify

### New Files
| File | Priority |
|------|----------|
| `src/components/ui/Button.jsx` | P0 |
| `src/components/ui/Skeleton.jsx` | P0 |
| `src/components/ui/Badge.jsx` | P0 |
| `src/components/ui/StarRating.jsx` | P0 |
| `src/components/ui/PriceSlider.jsx` | P1 |
| `src/components/ui/Accordion.jsx` | P1 |
| `src/components/ui/BottomSheet.jsx` | P1 |
| `src/components/ui/StockIndicator.jsx` | P1 |
| `src/components/ui/QuantitySelector.jsx` | P2 |
| `src/components/product/ProductCard.jsx` | P0 |
| `src/components/product/ProductCardSkeleton.jsx` | P0 |
| `src/components/product/ProductGrid.jsx` | P0 |
| `src/components/product/ProductFilters.jsx` | P0 |
| `src/components/product/ProductFilterMobile.jsx` | P1 |
| `src/components/product/ProductSort.jsx` | P0 |
| `src/components/product/ProductPagination.jsx` | P0 |
| `src/components/product/ProductVariantSelector.jsx` | P0 |
| `src/components/product/ProductQuickView.jsx` | P1 |
| `src/components/product/ProductImage.jsx` | P0 |
| `src/components/product/ProductPrice.jsx` | P0 |
| `src/components/product/ProductRating.jsx` | P0 |
| `src/components/product/ProductStockBadge.jsx` | P0 |
| `src/components/search/SearchBar.jsx` | P0 |
| `src/components/search/SearchSuggestions.jsx` | P1 |
| `src/components/search/VoiceSearch.jsx` | P2 |
| `src/components/layout/MobileNav.jsx` | P1 |
| `src/hooks/useProducts.js` | P0 |
| `src/hooks/useDebounce.js` | P0 |
| `src/hooks/useInfiniteScroll.js` | P0 |
| `src/hooks/useLocalStorage.js` | P1 |
| `src/hooks/useVoiceSearch.js` | P2 |
| `src/services/api.js` | P0 |
| `src/services/productService.js` | P0 |
| `src/services/cloudinaryService.js` | P1 |
| `src/context/CartContext.jsx` | P0 |
| `src/context/WishlistContext.jsx` | P0 |
| `src/context/SearchContext.jsx` | P1 |
| `src/pages/ProductListing.jsx` | P0 |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Product.jsx` | Replace with new ProductListing page |
| `src/pages/DryFriut.jsx` | Remove — unified into ProductListing |
| `src/App.jsx` | Replace in-memory state with Context, simplify |
| `src/components/Header.jsx` | Add search bar, mobile nav triggers |
| `src/pages/Home.jsx` | Add hero search bar, trending search |
| `src/index.css` | Add design tokens |
| `src/pages/ProductDetails.jsx` | Connect to real API, Cloudinary images |

### Deleted Files
| File | Reason |
|------|--------|
| `src/data/products.js` | Replace with real API data |
| `src/pages/DryFriut.jsx` | Unified into ProductListing |
