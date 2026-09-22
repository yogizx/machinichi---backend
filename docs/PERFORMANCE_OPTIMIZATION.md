# Performance Optimization — Enterprise E-Commerce

## Core Web Vitals Targets

| Metric | Current | Target |
|--------|---------|--------|
| LCP (Largest Contentful Paint) | Unknown | <1.5s |
| FID (First Input Delay) | Unknown | <50ms |
| CLS (Cumulative Layout Shift) | Unknown | <0.05 |
| TTFB (Time to First Byte) | Unknown | <200ms |
| FCP (First Contentful Paint) | Unknown | <1.0s |
| SI (Speed Index) | Unknown | <2.0s |
| Time to Interactive | Unknown | <2.5s |

---

## 1. Bundle Optimization

### Current State
- `package.json` has no code splitting configuration
- Single bundle contains all 34 pages + admin pages
- No lazy loading implemented
- Lucide React icons are imported individually (good) but could be optimized

### Code Splitting Strategy

```jsx
// src/App.jsx — Route-based code splitting
import { lazy, Suspense } from 'react';
import LoadingScreen from './components/ui/LoadingScreen';

const Home = lazy(() => import('./pages/Home'));
const ProductListing = lazy(() => import('./pages/ProductListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));

// In layout:
<Suspense fallback={<LoadingScreen />}>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/product" element={<ProductListing />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### Component-level Code Splitting

```jsx
// For heavy components like ProductQuickView
const ProductQuickView = lazy(() => import('./ProductQuickView'));

// For search components
const SearchBar = lazy(() => import('../search/SearchBar'));
const SearchResults = lazy(() => import('../search/SearchResults'));
```

### Tree Shaking Configuration

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react'],
          search: ['@meilisearch/instant-meilisearch'],
          cloudinary: ['@cloudinary/url-gen', '@cloudinary/react'],
        },
      },
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

---

## 2. Image Optimization

### Current Issues
- All images from Unsplash (no control over optimization)
- No lazy loading
- No responsive images
- No WebP/AVIF
- Large image sizes

### Cloudinary Implementation (see CLOUDINARY_INTEGRATION.md)

```jsx
// src/components/product/ProductImage.jsx
// Already defined in Cloudinary doc

// Implementation checklist:
// 1. Replace all <img> with ProductImage component
// 2. Add loading="lazy" to below-fold images
// 3. Add priority={true} to above-fold images (hero carousel)
// 4. Use Cloudinary f_auto, q_auto, w_{size}
// 5. Implement blur-up LQIP placeholders
```

### Image Dimensions by Component

| Component | Width | Aspect Ratio | Priority |
|-----------|-------|-------------|----------|
| Hero Banner | 1920 | 21:9 | Highest |
| Product Card | 400 | 1:1 | Medium |
| Product Detail | 800 | 1:1 | High |
| Product Gallery Thumb | 150 | 1:1 | Low |
| Cart Item | 100 | 1:1 | Low |
| Search Suggestion | 50 | 1:1 | Low |
| Category Card | 600 | 4:3 | Medium |

---

## 3. Lazy Loading Strategy

### Component Lazy Loading
```
Above the fold (eager):
- Header
- Hero section
- First row of product cards (4-5 cards)

Below the fold (lazy):
- Remaining product cards
- Footer
- Review sections
- Related products
- Subscription banners
```

### Image Lazy Loading

```javascript
// Use Intersection Observer for custom lazy loading
// or native loading="lazy" (supported in all modern browsers)

// Native approach (simplest):
<img loading="lazy" src="..." alt="..." />

// For more control:
function useLazyLoad(ref) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
}
```

### Route Prefetching

```jsx
// Prefetch likely next pages on hover
import { usePrefetch } from 'react-router-dom';

function NavLink({ to, children }) {
  const prefetch = usePrefetch();

  return (
    <Link
      to={to}
      onMouseEnter={() => prefetch(to)}
      onFocus={() => prefetch(to)}
    >
      {children}
    </Link>
  );
}
```

---

## 4. Virtualization

### When to Virtualize
- Product lists with 100+ items on screen
- Search results with 1000+ items
- Admin inventory tables
- Order history

### Implementation

```bash
npm install @tanstack/react-virtual
```

```jsx
// src/components/product/VirtualizedProductGrid.jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedProductGrid({ products }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 350, // Estimated card height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[800px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ProductCard product={products[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. API Performance

### Backend Optimizations

```typescript
// 1. MongoDB Projection — only fetch needed fields
Product.find(filter)
  .select('name slug images sellingPrice mrpPrice variants quantity averageRating reviewCount')
  .lean() // Returns plain JS object, not Mongoose doc — faster

// 2. Pagination with skip/limit (already implemented)
// 3. Compound indexes (already partially implemented)

// 4. Response compression
import compression from 'compression';
app.use(compression());

// 5. HTTP caching headers
app.get('/api/products/featured', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  // ...
});
```

### Frontend Optimizations

```javascript
// 1. API response caching
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const { data } = await api.get(url);
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}

// 2. Request deduplication
const inflightRequests = new Map();

async function dedupedFetch(url) {
  if (inflightRequests.has(url)) {
    return inflightRequests.get(url);
  }
  const promise = api.get(url);
  inflightRequests.set(url, promise);
  promise.finally(() => inflightRequests.delete(url));
  return promise;
}

// 3. Debounced search (200ms)
// 4. Preconnect to API and CDN
<link rel="preconnect" href="http://localhost:5000" />
<link rel="preconnect" href="https://res.cloudinary.com" />
```

---

## 6. CSS Optimization

### Current Issues
- Tailwind generates large CSS (all utilities included)
- Inline hex colors everywhere (not reusable)
- No design tokens
- Animations defined inline with `<style>` tags

### Optimizations

```css
/* src/index.css — Design tokens */
@theme {
  --color-brand: #fd761a;
  --color-brand-dark: #e86710;
  --color-surface: #ffffff;
  --color-background: #fffaf5;
  --color-text-primary: #211713;
  --color-text-secondary: #6b625c;
  --color-border: #e5d8cd;
  --color-border-light: #f0e8e0;
  --color-success: #7baa41;
  --color-warning: #f6a623;
  --color-danger: #d83b35;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.06);
  --shadow-card-hover: 0 12px 28px rgba(0,0,0,0.08);
}

/* Use @apply sparingly — prefer utility classes */
/* Remove CSS animations from inline <style> tags */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Tailwind Purge Configuration
```javascript
// vite.config.js
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  // Tailwind v4 purges automatically
});
```

---

## 7. Memory & State Management

### Current Issues
- Cart/wishlist/saved stored in memory → lost on refresh
- No persistence
- Session storage used for auth → XSS vulnerable

### Solutions

```jsx
// 1. Context + localStorage for cart persistence
// src/context/CartContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = action.payload.key;
      const existing = state.items.find((i) => i.key === key);
      return {
        items: existing
          ? state.items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + action.payload.quantity } : i,
            )
          : [...state.items, action.payload],
      };
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter((i) => i.key !== action.payload) };
    case 'UPDATE_QUANTITY':
      return {
        items: state.items.map((i) =>
          i.key === action.payload.key ? { ...i, quantity: action.payload.quantity } : i,
        ),
      };
    case 'CLEAR':
      return { items: [] };
    case 'HYDRATE':
      return { items: action.payload };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('machinichi_cart');
    if (saved) {
      dispatch({ type: 'HYDRATE', payload: JSON.parse(saved) });
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('machinichi_cart', JSON.stringify(state.items));
  }, [state.items]);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}
```

---

## 8. Critical Rendering Path

### Head Tags (index.html)
```html
<!-- Preconnect to origins -->
<link rel="preconnect" href="http://localhost:5000" />
<link rel="preconnect" href="https://res.cloudinary.com" />
<link rel="dns-prefetch" href="http://localhost:5000" />
<link rel="dns-prefetch" href="https://res.cloudinary.com" />

<!-- Font loading -->
<link rel="preload" href="/fonts/roboto-v30-latin-regular.woff2" as="font" crossorigin />

<!-- Preload critical above-fold hero image -->
<link rel="preload" href="https://res.cloudinary.com/..." as="image" />
```

### Render-blocking Resources
- Remove unused CSS
- Inline critical CSS for above-fold content
- Defer non-critical JS
- Async/defer for third-party scripts

---

## 9. Network Optimizations

### CDN Strategy
```
Static assets (Vite build) → CDN
- JS bundles
- CSS files
- Fonts
- Images (via Cloudinary)
```

### HTTP/2 Benefits (already enabled via HTTPS)
- Multiplexing
- Server push (use cautiously)
- Header compression

### Caching Headers

| Asset Type | Cache Duration | Example |
|------------|---------------|---------|
| JS/CSS bundles | 1 year (with hash) | `Cache-Control: public, max-age=31536000, immutable` |
| Product images | 1 year | `Cache-Control: public, max-age=31536000, immutable` |
| API responses | 5 minutes | `Cache-Control: public, max-age=300` |
| Search results | 1 minute | `Cache-Control: public, max-age=60` |
| HTML (index.html) | No cache | `Cache-Control: no-cache` |

---

## 10. Monitoring & Measurement

### Tools
```bash
# Lighthouse CI for automated perf testing
npm install -g @lhci/cli

# Web Vitals tracking
npm install web-vitals
```

### Real User Monitoring (RUM)
```javascript
// src/utils/analytics.js
import { onLCP, onFID, onCLS, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    url: window.location.href,
    timestamp: Date.now(),
  };

  // Send to analytics endpoint
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  });
}

onLCP(sendToAnalytics);
onFID(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

---

## 11. Accessibility (a11y) — Quick Wins

| Issue | Fix |
|-------|-----|
| Missing alt text | Add descriptive alt to all images |
| Low contrast | Ensure text meets WCAG AA (4.5:1) |
| Focus indicators | Add visible focus rings (already partially done) |
| Keyboard navigation | Ensure all interactive elements are keyboard-accessible |
| ARIA labels | Add aria-label to icon buttons |
| Skip to content | Add skip navigation link |
| Semantic HTML | Use `<main>`, `<nav>`, `<article>`, `<section>` correctly |

---

## 12. Performance Budget

### Bundle Size Budget
| Category | Budget |
|----------|--------|
| Total JS (initial) | <200KB |
| Total CSS (initial) | <30KB |
| Home page (total) | <500KB |
| Product listing (total) | <400KB |
| Product detail (total) | <350KB |
| Checkout (total) | <300KB |
| Fonts | <50KB |
| Images (above fold) | <200KB |
| Third-party scripts | <100KB |

### Time Budget
| Page | Load | Interactive |
|------|------|-------------|
| Home | <2s | <3s |
| Product Listing | <2s | <3s |
| Product Detail | <2s | <3s |
| Search Results | <1.5s | <2.5s |
| Cart | <1.5s | <2s |
| Checkout | <1.5s | <2s |

---

## 13. Implementation Checklist

### Phase 1 — Quick Wins (Week 1)
- [ ] Enable compression (express compression middleware)
- [ ] Add image lazy loading (`loading="lazy"`)
- [ ] Implement route-based code splitting
- [ ] Move inline styles to design tokens
- [ ] Add preconnect hints
- [ ] Configure HTTP caching headers

### Phase 2 — Medium (Week 2)
- [ ] Implement Cloudinary image optimization
- [ ] Add responsive images with srcSet
- [ ] Implement blur-up LQIP
- [ ] Add Web Vitals monitoring
- [ ] Cart persistence with localStorage
- [ ] API response caching (frontend)

### Phase 3 — Advanced (Week 3)
- [ ] Virtualization for large lists
- [ ] CSS bundle size optimization
- [ ] Service worker for offline support
- [ ] Predictive prefetching
- [ ] CDN setup
- [ ] Performance budget CI check

### Phase 4 — Monitoring (Ongoing)
- [ ] Lighthouse CI integration
- [ ] RUM dashboard
- [ ] Error tracking
- [ ] Performance regression alerts
- [ ] A/B testing for performance
