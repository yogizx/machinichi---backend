# Machinichi — Responsive Design Strategy
> Complete responsive design guide for all devices, breakpoints, and screen sizes
> Tailwind CSS v4 breakpoints: sm(640) · md(768) · lg(1024) · xl(1280) · 2xl(1536)

---

## 1. Breakpoint Strategy

```
Mobile First — all base styles are mobile, then progressively enhanced.

Base     < 640px    (320-480px)   Small phones, iPhone SE
sm       640px+     (480-768px)   Large phones, phablets
md       768px+     (768-1024px)  Tablets (iPad mini, iPad Air)
lg       1024px+    (1024-1280px) Small laptops, iPad Pro portrait
xl       1280px+    (1280-1536px) Desktop, large laptops
2xl      1536px+    (1536px+)     Large desktop monitors
```

### Container Max-Widths
| Page | Max Width | Breakpoint |
|------|-----------|------------|
| Home | 1390px | xl |
| Products | 1420px | xl |
| Cart | 1200px | lg |
| Checkout | 1200px | lg |
| Admin | 1400px | xl |

---

## 2. Responsive Grid System

### Product Grid
```jsx
<div className="grid grid-cols-2 gap-3
                sm:grid-cols-3
                lg:grid-cols-4
                xl:grid-cols-4 gap-x-4 gap-y-6">
```

| Breakpoint | Columns | Card Width | Gap | Products Visible |
|------------|---------|------------|-----|------------------|
| Base (<640) | 2 | ~50vw | 12px | 8 |
| sm (640+) | 3 | ~33vw | 16px | 12 |
| lg (1024+) | 4 | ~25vw | 24px | 16 |
| xl (1280+) | 4 | ~300px max | 24px | 20 |

### Admin Dashboard Stats
```jsx
<div className="grid grid-cols-1 gap-4
                xs:grid-cols-2
                md:grid-cols-2
                lg:grid-cols-4">
```

### Cart Layout
```jsx
<div className="grid grid-cols-1 gap-6
                lg:grid-cols-[1fr_390px]">
```

### Checkout Layout
```jsx
<div className="grid grid-cols-1 gap-8
                lg:grid-cols-[1fr_420px]">
```

---

## 3. Mobile-First Design (< 640px)

### Critical Issues to Fix

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| No mobile navigation | Global (Header) | 🔴 Critical | Add hamburger drawer |
| Mandatory sign-in gate | Global | 🔴 Critical | Allow public browsing |
| Filter sidebar disappears | Product page | 🔴 High | Add filter bottom sheet |
| Sticky header missing | Global | 🟠 High | position: sticky |
| Search not available | Header | 🟠 High | Add search icon + overlay |
| Category circles cut off | Home | 🟠 High | Horizontal scroll with snap |
| Touch targets < 44px | Global | 🟠 High | Min 44x44px all tap targets |
| "VIEW MORE" hidden | Home | 🟡 Medium | Show on all screens |

### Mobile Navigation Drawer
```jsx
// Full-screen overlay drawer
<div className={`fixed inset-0 z-50 bg-[#321304] transform transition-transform
                ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
  <div className="flex items-center justify-between p-4">
    <span className="text-white font-black text-xl">Machinichi</span>
    <button onClick={() => setMenuOpen(false)}>
      <X size={24} className="text-white" />
    </button>
  </div>
  <nav className="flex flex-col gap-6 px-8 pt-8">
    <NavLink to="/" className="text-white text-lg font-bold">Home</NavLink>
    <NavLink to="/categories" className="text-white/80 text-lg">Categories</NavLink>
    <NavLink to="/product" className="text-white/80 text-lg">Products</NavLink>
    <NavLink to="/bulk" className="text-white/80 text-lg">Bulk Orders</NavLink>
    <NavLink to="/about" className="text-white/80 text-lg">About</NavLink>
    <NavLink to="/contact" className="text-white/80 text-lg">Contact</NavLink>
    <hr className="border-white/20 my-4" />
    <NavLink to="/orders" className="text-white/80 text-lg">My Orders</NavLink>
    <NavLink to="/favouite" className="text-white/80 text-lg">Wishlist</NavLink>
    <NavLink to="/profile" className="text-white/80 text-lg">Profile</NavLink>
  </nav>
</div>
```

### Mobile Filter Bottom Sheet
```jsx
// Trigger: "FILTER (n)" button in sticky bar
<div className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl
                transform transition-transform duration-300
                ${filterOpen ? 'translate-y-0' : 'translate-y-full'}`}
     style={{ maxHeight: '85vh' }}>
  <div className="flex items-center justify-between p-4 border-b">
    <h3 className="font-bold text-lg">Filters</h3>
    <button onClick={() => setFilterOpen(false)}>
      <X size={20} />
    </button>
  </div>
  <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 130px)' }}>
    {/* Accordion filter groups */}
  </div>
  <div className="flex gap-3 p-4 border-t bg-white sticky bottom-0">
    <button className="flex-1 py-3 border rounded-lg font-semibold">Clear All</button>
    <button className="flex-1 py-3 bg-brand text-white rounded-lg font-semibold">Apply Filters</button>
  </div>
</div>
```

### Mobile Sticky Bottom Bar (Product Detail)
```jsx
<div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t p-3 lg:hidden">
  <div className="flex gap-3">
    <button className="flex-1 h-12 border border-brand rounded-xl font-semibold text-brand">
      Add to Cart
    </button>
    <button className="flex-1 h-12 bg-brand text-white rounded-xl font-semibold">
      Buy Now
    </button>
  </div>
</div>
```

---

## 4. Tablet Design (640px - 1024px)

### iPad Mini / iPad Air Portrait
| Element | Behavior |
|---------|----------|
| Header | Full nav visible, search bar present |
| Hero | min-height: 450px |
| Product Grid | 3 columns |
| Cart Sidebar | Collapses below items (full width) |
| Checkout | Single column (form + summary stacked) |
| Admin Stats | 2 columns |
| Filters | Sidebar visible (narrow version) |

### iPad Pro Portrait (1024px)
| Element | Behavior |
|---------|----------|
| Product Grid | 3 columns (max-xl) |
| Cart | 2 columns (lg breakpoint) |
| Checkout | 2 columns (lg breakpoint) |
| Admin Dashboard | 4 stat columns |
| Category Cards | 4 columns |

---

## 5. Desktop Design (1024px+)

### Small Laptop (1024px - 1280px)
| Element | Behavior |
|---------|----------|
| Layout | Full sidebar + main content |
| Product Grid | 4 columns |
| Cart | Sidebar sticky |
| Checkout | 2-column split |
| Admin | Full dashboard grid |
| Filters | Always visible in sidebar |

### Large Desktop (1280px - 1536px)
| Element | Behavior |
|---------|----------|
| Container | Max-width active (1390-1420px) |
| Product Grid | 4 columns, larger cards |
| Hero | Split layout (text left + image right) |
| Mega Menu | Grid of category cards |
| Admin | xl:col-span-8 + xl:col-span-4 |

### Ultra Wide (1536px+)
| Element | Behavior |
|---------|----------|
| Container | Centered, never wider than 1420px |
| Everything | Scale-limited, whitespace balanced |

---

## 6. Responsive Typography

```css
/* Base typography scale */
h1 { font-size: clamp(1.75rem, 4vw, 3.75rem); }   /* 28px → 60px */
h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); }     /* 24px → 40px */
h3 { font-size: clamp(1.25rem, 2vw, 1.75rem); }   /* 20px → 28px */
h4 { font-size: 1.125rem; }                        /* 18px */
body { font-size: 1rem; }                          /* 16px */
small { font-size: 0.875rem; }                     /* 14px */
.caption { font-size: 0.75rem; }                   /* 12px */

/* Hero heading specific */
.hero-title {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.1;
}
```

---

## 7. Responsive Spacing

```css
/* Section padding */
.section {
  padding: clamp(1.5rem, 4vw, 4rem) 0;
}

/* Between sections (mobile vs desktop) */
.section-gap {
  margin-top: clamp(2rem, 4vw, 4rem);
}

/* Card padding */
.card {
  padding: clamp(0.75rem, 2vw, 1.5rem);
}
```

---

## 8. Touch Target Standards

| Element | Min Size | Current Status |
|---------|----------|----------------|
| Nav links (mobile drawer) | 44px | ❌ Needs fix |
| Icon buttons (header) | 44x44px | ❌ Needs fix |
| Product card buttons | 40px | ✅ OK |
| Quantity stepper | 44px | ❌ Needs fix |
| Filter checkboxes | 44px | ❌ Needs fix |
| Wishlist heart | 44x44px | ❌ Needs fix |
| Form inputs | 44px | ✅ OK |
| Bottom sheet close | 44x44px | ❌ Needs fix |

### Fix Pattern
```jsx
// Before
<button onClick={handleClick}>
  <Heart size={20} />
</button>

// After
<button
  onClick={handleClick}
  className="flex items-center justify-center h-11 w-11"
  aria-label="Add to wishlist"
>
  <Heart size={20} />
</button>
```

---

## 9. Responsive Images

```jsx
// Product image with responsive srcSet
<img
  src={cloudinaryUrl(product.image, { w: 400, q: 80 })}
  srcSet={`
    ${cloudinaryUrl(product.image, { w: 200 })} 200w,
    ${cloudinaryUrl(product.image, { w: 400 })} 400w,
    ${cloudinaryUrl(product.image, { w: 800 })} 800w,
    ${cloudinaryUrl(product.image, { w: 1200 })} 1200w
  `}
  sizes="(max-width: 640px) 50vw,
         (max-width: 1024px) 33vw,
         25vw"
  loading="lazy"
/>
```

---

## 10. Testing Matrix

| Page | < 640px | 640px | 768px | 1024px | 1280px | 1536px+ |
|------|---------|-------|-------|--------|--------|---------|
| Home | ✅ Plan | ✅ | ✅ | ✅ | ✅ | ✅ |
| Product Listing | ❌ No filters | ❌ | ✅ | ✅ | ✅ | ✅ |
| Product Details | ❌ No sticky CTA | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cart | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Checkout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Payment | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profile | ⚠️ Sidebar overlap | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Admin Dashboard | ⚠️ 1-col stats | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| All Pages | ❌ Nav missing | ❌ | ✅ | ✅ | ✅ | ✅ |

### Responsive Audit Checklist
```
[ ] Mobile navigation drawer working on all pages
[ ] No horizontal scrollbars on any page
[ ] All touch targets >= 44x44px
[ ] Forms usable on mobile (inputs not zooming)
[ ] Images don't overflow containers
[ ] Text doesn't overflow on small screens
[ ] Filters accessible on mobile (bottom sheet)
[ ] Sticky header present on all pages
[ ] Cart/checkout usable on mobile
[ ] Admin panel usable on tablet
[ ] Product grid adapts columns correctly
[ ] Footer doesn't break on any breakpoint
[ ] All modals scrollable on small screens
[ ] Toast notifications visible on mobile
[ ] Payment page responsive
```
