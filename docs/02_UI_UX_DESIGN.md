# Machinichi — UI/UX Design System
> Complete UI/UX strategy, design tokens, component architecture, and page-by-page audit
> Stack: React 19 · Tailwind CSS v4 · Lucide Icons

---

## 1. Brand Identity

### Brand Personality
- **Warm & Earthy**: Natural food staples brand
- **Trustworthy**: Organic certification, FSSAI compliance
- **Premium but Accessible**: Quality products at fair prices
- **Indian Heritage**: Traditional grains, dry fruits, pooja items

### Color Palette

```
Primary Dark:    #321304 / #5a3322  (Header, footer, hero overlays)
Primary Orange:  #fd761a / #ad4d00  (CTAs, accents, brand elements)
Background:      #fffaf5            (Page background - warm cream)
Surface:         #fff8f1 / #f7f0ea  (Cards, panels)
Border:          #eadfd7 / #e4d8cf  (Dividers, card borders)
Text Primary:    #27201c / #342821  (Headings)
Text Secondary:  #4a3e38            (Body text - fixed contrast)
Text Muted:      #796d66            (Labels, secondary info)
Success:         #23723a            (In stock, verified badge)
Warning:         #9a5a05            (Low stock, pending)
Error:           #b62917            (Out of stock, errors)
Info:            #3655a4            (Information)
```

### Typography
```
--font-sans:    "Inter", Arial, sans-serif      (UI, body, labels)
--font-display: "Playfair Display", Georgia, serif  (Hero headings, product names)
--font-mono:    "Roboto Mono", monospace         (Prices, codes)

Scale:  12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60
        xs    s   base  m   l   xl   2xl  3xl  4xl  5xl
```

### Shadows
```
--shadow-sm:  0 1px 4px rgba(64, 35, 20, 0.04)
--shadow-md:  0 8px 18px rgba(65, 38, 20, 0.09)
--shadow-lg:  0 16px 34px rgba(66, 36, 18, 0.07)
--shadow-xl:  0 24px 60px rgba(25, 12, 6, 0.28)
--shadow-card-hover: 0 20px 42px rgba(66, 36, 18, 0.11)
--shadow-header:     0 8px 24px rgba(45, 22, 12, 0.22)
```

### Border Radius
```
--radius-sm:   8px    (Badges, small elements)
--radius-md:   12px   (Cards, inputs)
--radius-lg:   16px   (Modals, dropdowns)
--radius-xl:   20px   (Hero sections, search bar)
--radius-2xl:  24px   (Large containers)
--radius-full: 9999px (Pills, avatars)
```

---

## 2. Design Tokens (index.css)

```css
@theme {
  /* Typography */
  --font-display: "Playfair Display", Georgia, serif;
  --font-sans: "Inter", Arial, sans-serif;

  /* Brand Colors */
  --color-brand-dark:     #321304;
  --color-brand-brown:    #5a3322;
  --color-brand-primary:  #fd761a;
  --color-brand-cta:      #ad4d00;

  /* Backgrounds */
  --color-bg-cream:       #fffaf5;
  --color-bg-warm:        #fff8f1;
  --color-bg-surface:     #f7f0ea;
  --color-bg-muted:       #f2ebe5;

  /* Borders */
  --color-border-soft:    #eadfd7;
  --color-border-medium:  #e0d3c9;
  --color-border-dark:    #d8c9be;

  /* Text */
  --color-text-primary:   #27201c;
  --color-text-secondary: #4a3e38;
  --color-text-muted:     #796d66;
  --color-text-subtle:    #988b84;

  /* Semantic */
  --color-success:        #23723a;
  --color-success-bg:     #e8f7ec;
  --color-warning:        #9a5a05;
  --color-warning-bg:     #fff0d8;
  --color-error:          #b62917;
  --color-error-bg:       #fff2ed;
  --color-info:           #3655a4;
  --color-info-bg:        #edf1ff;

  /* Radii */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-2xl:  24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card:       0 8px 18px rgba(65, 38, 20, 0.09);
  --shadow-card-hover: 0 16px 34px rgba(66, 36, 18, 0.11);
  --shadow-modal:      0 24px 60px rgba(25, 12, 6, 0.28);
  --shadow-header:     0 8px 24px rgba(45, 22, 12, 0.22);
}
```

---

## 3. Component Architecture

### Atomic Design Structure
```
ui/ (Atoms)
├── Button.jsx           ← Primary, secondary, ghost, danger variants
├── Badge.jsx            ← Discount, status, certification badges
├── Skeleton.jsx         ← Loading skeleton with shimmer
├── Input.jsx            ← Text, email, password, phone inputs
├── Select.jsx           ← Dropdown select
├── Checkbox.jsx         ← Checkbox with animation
├── Radio.jsx            ← Radio button group
├── Modal.jsx            ← Accessible modal with focus trap
├── BottomSheet.jsx      ← Mobile filter/action sheet
├── Toast.jsx            ← Success/error/info notifications
├── StarRating.jsx       ← Interactive star rating
├── PriceSlider.jsx      ← Dual-range price filter
├── Accordion.jsx        ← Collapsible sections
├── QuantitySelector.jsx ← +/- stepper
├── StockIndicator.jsx   ← In stock / Low stock / OOS
├── Breadcrumb.jsx       ← Navigation breadcrumbs
└── Pagination.jsx       ← Page navigation

product/ (Molecules)
├── ProductCard.jsx      ← Product card with image, price, variants, CTAs
├── ProductCardSkeleton.jsx ← Loading state for card
├── ProductGrid.jsx      ← Responsive grid with pagination
├── ProductFilters.jsx   ← Desktop filter sidebar
├── ProductFilterMobile.jsx ← Mobile bottom sheet filter
├── ProductSort.jsx      ← Sort dropdown
├── ProductVariantSelector.jsx ← Size/weight pills
├── ProductQuickView.jsx ← Quick view modal
├── ProductImage.jsx     ← Cloudinary image with lazy load + blur
├── ProductPrice.jsx     ← Price display with MRP and discount
├── ProductRating.jsx    ← Star rating display
└── ProductStockBadge.jsx ← Stock status badge

search/ (Molecules)
├── SearchBar.jsx        ← Full search with autocomplete
├── SearchSuggestions.jsx ← Dropdown suggestions
├── SearchHistory.jsx    ← Recent searches
├── VoiceSearch.jsx      ← Speech recognition
└── TrendingSearches.jsx ← Trending queries

layout/ (Organisms)
├── Header.jsx           ← Sticky header with nav, search, icons
├── Footer.jsx           ← Footer with links, social, newsletter
├── MobileNav.jsx        ← Hamburger drawer navigation
├── MegaMenu.jsx         ← Category mega menu
└── MiniCart.jsx         ← Cart dropdown
```

---

## 4. Page-by-Page UI States

### Home Page (`/`)
```
Sections:
1. Announcement bar (dismissible): "Free shipping on ₹999+"
2. Sticky header: Logo | Nav | Search | Wishlist | Cart(3) | Profile
3. Hero: Full-width image + overlay text + 2 CTAs ("Shop Now" / "View Bundles")
4. Trust strip: "50K+ customers · 4.8★ rating · 100% Organic · Free shipping"
5. Category carousel: Horizontal scroll with chevrons
6. Flash deals: Countdown timer + discounted products
7. Trending collections: 4-col product grid
8. Social proof: Review carousel with photos
9. Bundle deals: Card grid with pricing
10. Email capture: "Get 10% off" subscription strip
11. Footer: Links, categories, social, payment methods
```

### Product Listing (`/product`)
```
Layout:
├── Breadcrumb: Home > Products > [Category]
├── Results bar: "24 Products · Showing 1-12" + Sort dropdown + View toggle
├── Filter sidebar (desktop) / Slide-up drawer (mobile)
│   ├── Category (checkboxes with counts)
│   ├── Price range (dual slider)
│   ├── Brand (checkboxes)
│   ├── Rating (star rows)
│   ├── Discount (% ranges)
│   └── Availability (radio: in stock / all)
└── Product grid: 2-col mobile, 3-col tablet, 4-col desktop

States:
- Loading: 8 skeleton cards with shimmer
- Empty: "No products found" illustration + "Clear filters" + "Browse categories"
- Error: Error illustration + "Try Again" + fallback categories
- Loaded: Product cards with lazy images
- Load more: IntersectionObserver + "Load More" button fallback
```

### Product Details (`/product/:slug`)
```
Layout (desktop):
├── Breadcrumb + Back button
├── Left: Image gallery (main + thumbnails + zoom + lightbox)
├── Right (sticky sidebar):
│   ├── Product name + rating + review count
│   ├── Price (selling + MRP + discount %)
│   ├── Variant selector (size/weight pills)
│   ├── Stock status + delivery estimator (pincode input)
│   ├── Quantity selector + Add to Cart + Buy Now
│   └── Trust badges (FSSAI, return policy, secure payment)
├── Tabs/Collapse sections:
│   ├── Description
│   ├── Nutritional info
│   ├── Reviews with photo upload
│   └── Return policy
└── Related products carousel

Mobile: Sticky bottom bar with Add to Cart + Buy Now
```

### Cart (`/cart`)
```
Layout:
├── Progress indicator: Cart (active) → Checkout → Payment → Done
├── Cart items: Image | Name + Variant | Qty stepper | Price | Remove
├── Coupon code input + "Apply" button
├── Cross-sell: "Customers also bought" (2-3 items)
├── Order summary:
│   ├── Subtotal
│   ├── Discount
│   ├── Shipping
│   ├── GST (CGST + SGST)
│   └── Total
├── "Proceed to Checkout" CTA
└── Trust seals: Secure payment, return guarantee

States:
- Empty: Illustration + "Your cart is empty" + "Start Shopping" CTA
- Loaded: Items with edit/remove options
- Saving: Disabled buttons + spinner on quantity change
```

### Checkout (`/checkout`)
```
Layout (2-col on desktop, stacked on mobile):
├── Progress indicator: Cart → Checkout (active) → Payment → Done
├── Left:
│   ├── Shipping address (saved + add new)
│   ├── Delivery instructions (optional notes)
│   ├── Shipping method (Standard ₹50 / Express ₹120)
│   └── Promo code + Scratch card
├── Right (sticky):
│   ├── Order summary (collapsible on mobile)
│   └── "Continue to Payment" CTA + trust badges
└── Guest checkout option (no sign-in required)
```

### Payment (`/payment-method`)
```
States:
- Loading: Razorpay checkout modal/spinner
- Processing: "Your payment is being processed..."
- Success: Confetti animation + Order # + Timeline + "Track Order" + "Continue Shopping"
- Failed: Error message + "Try Again" + "Choose different method" + support contact
```

---

## 5. Navigation Architecture

### Desktop Nav (Header)
```
[Logo]  Shop ▾  |  About  |  Bulk Orders  |  Blog  |  Contact
         ↓ Mega Menu
    Dryfruits    Nuts       Flour
    Ready 2 Eat  Grains     Juices
    Pooja Items  [New Arrivals]  [Best Sellers]

[Search bar]  [❤ Wishlist]  [🛒 Cart(3)]  [👤 Profile]
```

### Mobile Nav (Drawer)
```
☰ ← Hamburger icon in header

Full-screen overlay drawer:
┌──────────────────────────────┐
│  [Profile]  Hi, User!        │
│                              │
│  🏠 Home                     │
│  📂 Categories → expandable  │
│  📦 Products                 │
│  💼 Bulk Orders              │
│  ℹ️ About Us                 │
│  ✉️ Contact                  │
│                              │
│  ─── Account ───            │
│  ❤ Wishlist                  │
│  📋 Orders                   │
│  👤 Profile                  │
│  🚪 Sign Out                │
└──────────────────────────────┘
```

### Breadcrumb Pattern
```
All pages:
Home > [Category] > [Subcategory] > [Product Name]
```

---

## 6. Loading States

### Skeleton Components

```jsx
// Product Card Skeleton
function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl bg-white p-4 shadow-card">
      <div className="aspect-square rounded-lg bg-gray-200" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="h-3 w-1/4 rounded bg-gray-200" />
        <div className="h-10 w-full rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

// Image Blur Placeholder (LQIP)
<img
  src={cloudinaryBlurPlaceholder(publicId)}
  className="absolute inset-0 blur-sm transition-opacity"
/>
<img
  src={cloudinaryUrl(publicId, { w: 400, q: 80 })}
  loading="lazy"
  onLoad={() => setLoaded(true)}
  className={`transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
/>
```

---

## 7. Micro-interactions & Animations

### Page Transitions
```css
::view-transition-new(root) {
  animation: page-fade-in 300ms ease-out;
}

@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Component Animations
| Element | Animation | Duration |
|---------|-----------|----------|
| Product cards on mount | Staggered fade-up (max 4 * 45ms) | 180ms |
| Add to cart | Fly-to-cart + badge bounce | 400ms |
| Wishlist toggle | Heart fill animation | 200ms |
| Quantity change | Number flip | 150ms |
| Star rating | Left-to-right sweep fill | 300ms |
| Modal open | Scale + fade | 200ms |
| Mobile drawer | Slide from right | 250ms |
| Toast notification | Slide in from top | 300ms |
| Skeleton shimmer | Infinite sweep | 1.5s loop |

---

## 8. Error & Empty States

### Error State Components
```jsx
function ErrorState({ title, message, onRetry, fallbackLinks }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <AlertCircle size={48} className="text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
      {fallbackLinks && (
        <div className="mt-4 flex gap-4">
          {fallbackLinks.map(link => (
            <a key={link.href} href={link.href} className="text-brand underline">
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Empty State Components
```jsx
function EmptyState({ icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900 mt-4">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 mb-6">{message}</p>
      {action}
    </div>
  );
}
```

---

## 9. Accessibility Requirements

| Requirement | Standard | Status |
|-------------|----------|--------|
| Skip navigation link | WCAG 2.4.1 | ❌ Missing |
| ARIA labels on icon buttons | WCAG 4.1.2 | ⚠️ Partial |
| Color contrast (4.5:1 min) | WCAG 1.4.3 | ❌ Fails |
| Focus indicators | WCAG 2.4.7 | ⚠️ Partial |
| Keyboard navigation | WCAG 2.1.1 | ⚠️ Partial |
| Modal focus trap | WCAG 2.1.2 | ❌ Missing |
| Form input labels | WCAG 1.3.1 | ✅ Good |
| Semantic HTML | WCAG 1.3.1 | ⚠️ Partial |
| Touch targets (44x44px) | WCAG 2.5.5 | ❌ Missing |
| Role attributes | WCAG 4.1.2 | ⚠️ Partial |

---

## 10. Conversion Optimization

### Cart Abandonment Prevention
1. Exit-intent popup: "Wait! Get 5% off if you checkout now"
2. Cart persistence (localStorage + backend sync)
3. Abandoned cart email after 30 min
4. WhatsApp cart recovery for Indian users

### Product Page CTA
1. Urgency: "Only 8 left in stock!"
2. Social proof: "284 sold this week"
3. Bulk deals: "Buy 3, Get 10% off"
4. Subscribe & save: 10% recurring discount

### Checkout Friction Removal
1. Guest checkout option
2. Address auto-fill (Google Places)
3. UPI intent for mobile
4. Progress indicator
5. Trust seals above CTA

### Homepage Conversion
1. Hero countdown timer for flash sales
2. Category quick-add buttons
3. Recent browsing personalization
4. "Continue browsing" section
