# Machinichi — System Architecture
> Comprehensive system architecture covering all layers, components, and data flow
> Stack: React 19 · Vite · Tailwind CSS v4 · Node.js/Express 5 · MongoDB/Mongoose · Firebase · Razorpay

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React 19 SPA)                          │
│                                                                             │
│  ┌────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────────────┐ │
│  │ User Pages  │  │ Admin Pages  │  │ Components│  │ State Management     │ │
│  │ (16 pages)  │  │ (10 pages)   │  │ (60+)     │  │ (React Context)      │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  └──────────┬───────────┘ │
│         │                │                │                   │             │
│         └────────────────┴────────────────┴───────────────────┘             │
│                              │                                              │
│                         Axios HTTP Client                                   │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ HTTPS / REST
┌──────────────────────────────┼──────────────────────────────────────────────┐
│                     API GATEWAY (Express 5 Router)                          │
│                                                                             │
│  Middleware Stack:                                                          │
│  Helmet → CORS → CookieParser → Morgan → RateLimit → Sanitize → Auth      │
│                                                                             │
│  Route Groups:                                                              │
│  /api/auth  /api/admin/auth  /api/user  /api/products  /api/categories     │
│  /api/cart  /api/checkout  /api/payments  /api/orders  /api/admin          │
│  /api/reviews  /api/wishlist  /api/banners  /api/bulk-orders               │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────────┐
│                     SERVICE LAYER (Business Logic)                          │
│                                                                             │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Auth Service    │  │ Inventory    │  │ Payment       │  │ Search      │ │
│  │ (JWT, Firebase) │  │ Service      │  │ (Razorpay)   │  │ (Meilisearch)│ │
│  └────────────────┘  └──────────────┘  └───────────────┘  └─────────────┘ │
│  ┌────────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Tax Service    │  │ Notification │  │ Email Service │  │ Analytics   │ │
│  │ (GST Calc)     │  │ Service      │  │ (Resend)      │  │ Service     │ │
│  └────────────────┘  └──────────────┘  └───────────────┘  └─────────────┘ │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────────┐
│                      DATA LAYER (MongoDB/Mongoose)                          │
│                                                                             │
│  24 Collections:  users  addresses  products  categories  orders            │
│                   payments  carts  reviews  wishlists  coupons              │
│                   inventory_logs  banners  notifications  analytics         │
│                   return_requests  refunds  bulk_orders  businesses         │
│                   refresh_tokens  otps  audit_logs  coupon_usages           │
│                   scratch_card_offers  saved_for_later                      │
└─────────────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                        │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Firebase │  │ Razorpay │  │ Twilio   │  │ Resend   │  │ Cloudinary   │ │
│  │ Auth     │  │ Payments │  │ (SMS)    │  │ (Email)  │  │ (Images)     │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                                    │
│  │ Google   │  │ Meilisearch│ │ MSG91   │                                    │
│  │ OAuth    │  │ Search   │  │ (SMS)   │                                    │
│  └──────────┘  └──────────┘  └──────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.6 | UI framework |
| Vite | 8.0.12 | Build tool / dev server |
| Tailwind CSS | 4.3.0 | Utility CSS framework |
| React Router | 7.15.0 | Client-side routing |
| Axios | 1.18.1 | HTTP client |
| Firebase SDK | 12.15.0 | Google OAuth |
| Lucide React | 1.14.0 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | — | Runtime |
| Express | 5.2.1 | HTTP framework |
| TypeScript | 6.0.3 | Type safety |
| Mongoose | 9.7.2 | MongoDB ODM |
| Zod | 4.4.3 | Schema validation |
| JWT (jsonwebtoken) | 9.0.3 | Auth tokens |
| Firebase Admin | 14.0.0 | Server-side auth |
| Razorpay | 2.9.6 | Payment gateway |
| Helmet | 8.2.0 | Security headers |
| bcrypt | 6.0.0 | Password hashing |
| express-rate-limit | 8.5.2 | Rate limiting |

### Database
| Technology | Purpose |
|------------|---------|
| MongoDB | Primary database (24 collections) |
| Redis | (Optional) Caching layer |

### External Services
| Service | Purpose |
|---------|---------|
| Razorpay | Payment processing |
| Firebase Auth | Google OAuth |
| Twilio / MSG91 | SMS (OTP) |
| Resend | Transactional emails |
| Cloudinary | Image hosting/optimization |
| Meilisearch | Full-text search engine |

---

## 3. Frontend Architecture

### Directory Structure
```
src/
├── admin/              # Admin panel pages (10 pages)
├── components/         # Shared UI components
│   ├── ui/             # Atomic design components
│   ├── product/        # Product domain components
│   ├── search/         # Search components
│   └── layout/         # Header, Footer, Sidebar
├── pages/              # Customer-facing pages (16 pages)
├── hooks/              # Custom React hooks
├── services/           # API client services
├── context/            # React Context providers
├── data/               # (Legacy) Mock data
├── utils/              # Utility functions
├── App.jsx             # Root component + routing
├── index.css           # Global styles + Tailwind
└── main.jsx            # Entry point
```

### Routing Structure
```
/                    → Home
/product             → Product Listing
/product/:slug       → Product Details
/cart                → Cart
/checkout            → Checkout
/payment-method      → Payment
/payment-success     → Payment Confirmation
/orders              → Order History
/trackorder          → Track Order
/return-request      → Return Request
/profile             → User Profile
/favouite            → Wishlist
/saveproduct         → Saved for Later
/categories          → Categories
/bulk                → Bulk Orders
/signin              → Sign In
/create-account      → Registration
/forgot-password     → Password Reset
/admin/login         → Admin Login
/admin/dashboard     → Admin Dashboard
/admin/inventory     → Admin Inventory
/admin/orders        → Admin Orders
/admin/customers     → Admin Customers
/admin/offers-coupons → Admin Offers
/admin/create-offers → Admin Create Offers
/admin/return-request → Admin Returns
/admin/businesses    → Admin Business Approvals
/admin/analytics     → Admin Analytics
/admin/profile       → Admin Profile
```

### State Management
- **React Context** for global state (cart, wishlist, auth)
- **localStorage** for cart persistence (legacy: in-memory)
- **sessionStorage** for auth flags (security issue - needs migration)
- **React hooks** for component-level state

---

## 4. Backend Architecture

### Directory Structure
```
backend/src/
├── config/           # Configuration (DB, Firebase, Razorpay, etc.)
├── controllers/      # Route handlers (14 controllers)
├── middlewares/       # Express middleware (auth, validation, CSRF, RBAC)
├── models/           # Mongoose schemas (24 models)
├── routes/           # Express route definitions (12 route files)
├── services/         # Business logic services
├── validators/       # Zod validation schemas
├── seeds/            # Database seed scripts
├── scripts/          # Utility scripts
└── server.ts         # Entry point
```

### Middleware Pipeline (Order of Execution)
```
1. express.json({ limit: '10kb' })
2. cookieParser()
3. cors({ origin: CLIENT_URL, credentials: true })
4. helmet()                         ← Security headers
5. morgan('dev')                     ← Request logging
6. express-mongo-sanitize           ← NoSQL injection prevention
7. setCsrfCookie                    ← CSRF token cookie
8. Rate Limiters (per-route)        ← Brute force protection
9. validate(schema) (per-route)     ← Zod validation
10. authenticateUser / authenticateAdmin  ← JWT auth
11. Controller                      ← Business logic
12. 404 Handler                     ← Unmatched routes
13. Global Error Handler            ← Error responses
```

---

## 5. Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User     │     │  Frontend │     │  Backend  │     │  MongoDB  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                 │                 │                 │
     │  Sign In Form   │                 │                 │
     │────────────────▶│  POST /auth     │                 │
     │                 │  /login         │                 │
     │                 │────────────────▶│  Find User      │
     │                 │                 │────────────────▶│
     │                 │                 │◀────────────────│
     │                 │                 │  bcrypt.compare │
     │                 │  { accessToken, │                 │
     │                 │  refreshToken } │                 │
     │                 │◀────────────────│                 │
     │                 │                 │                 │
     │  localStorage   │  httpOnly       │                 │
     │  accessToken    │  cookie set     │                 │
     │◀────────────────│◀────────────────│                 │
```

**Token Strategy:**
- **Access Token**: JWT, 15min expiry (currently localStorage - needs httpOnly cookie)
- **Refresh Token**: JWT, 7-day expiry (httpOnly cookie)
- **Admin Access Token**: JWT (separate secret, needs MFA)
- **Auth verification**: Backend `/api/auth/me` call (not localStorage flag)

---

## 6. Data Flow: Checkout → Payment → Order

```
Cart (MongoDB)
  │
  ▼
Checkout Summary (computed from Cart + Product data)
  │
  ▼
Place Order → Order created (status: Pending, paymentStatus: Pending)
  │               └── Items snapshotted from Cart (denormalized)
  │               └── Shipping address embedded
  │               └── Coupon details embedded
  │
  ▼
Razorpay Order Created → Payment doc (status: created)
  │
  ▼
Razorpay Checkout Modal (client-side)
  │
  ▼
Payment Verification (server-side HMAC signature check)
  │
  ├── Success → Payment.status = captured
  │             Order.paymentStatus = Paid
  │             Stock deducted (reserved → sold)
  │             Cart cleared
  │
  └── Failure → Payment.status = failed
                Stock released (reservation rolled back)
                Order.status = Failed

Razorpay Webhook (server-to-server, authoritative fallback)
  ├── payment.captured → Mirrors success path
  ├── payment.failed   → Mirrors failure path
  └── refund.created   → Order updated, stock restored
```

---

## 7. Security Architecture

| Layer | Measure | Status |
|-------|---------|--------|
| Transport | HTTPS enforced | ✅ |
| Headers | Helmet.js (HSTS, CSP, X-Frame-Options) | ✅ Partial |
| CORS | Whitelist origins | ✅ |
| Rate Limiting | Per-route (auth: 5-10 req/15min) | ✅ |
| Input Validation | Zod schemas on all endpoints | ✅ |
| NoSQL Injection | express-mongo-sanitize | ✅ |
| Password Hashing | bcrypt (cost factor 12) | ✅ |
| Token Storage | localStorage (XSS vulnerable) | ⚠️ Needs fix |
| Admin MFA | Not implemented | ❌ Critical |
| CSRF | Middleware exists but not wired | ❌ |
| OTP Exposure | devMode returns OTP in response | ❌ Critical |
| Account Lockout | Not implemented | ❌ High |

---

## 8. Performance Architecture

| Strategy | Implementation | Status |
|----------|---------------|--------|
| Code Splitting | Route-based lazy loading | ❌ Not done |
| Image Optimization | Cloudinary auto-format/quality | ⚠️ Partial |
| Lazy Loading | Native loading="lazy" | ❌ Not done |
| Compression | express-compression | ❌ Not done |
| Caching | HTTP cache headers | ❌ Not done |
| Pagination | MongoDB skip/limit | ⚠️ Partial |
| Projection | MongoDB .select() + .lean() | ⚠️ Partial |
| Virtualization | @tanstack/react-virtual | ❌ Not done |
| Bundle Optimization | Vite manualChunks | ❌ Not done |

---

## 9. External Integrations

| Service | Integration Type | Status |
|---------|-----------------|--------|
| Firebase Auth | Google OAuth + Firebase Admin SDK | ✅ |
| Razorpay | Payment orders, verification, webhooks | ⚠️ Testing |
| Twilio | SMS OTP delivery | ⚠️ Configured |
| Resend | Transactional emails | ⚠️ Configured |
| Cloudinary | Image upload/hosting | ❌ SDK not installed |
| Meilisearch | Full-text search | ❌ Not deployed |
| MSG91 | SMS fallback | ⚠️ Configured |

---

## 10. Known Architectural Issues (From Audit)

| Issue | Severity | Area |
|-------|----------|------|
| Order creation broken on 2/3 code paths | 🔴 Critical | Backend |
| Live checkout path skips inventory checks | 🔴 Critical | Backend |
| No stock restoration on payment failure | 🔴 Critical | Backend |
| Race condition in inventory operations | 🔴 Critical | Backend |
| Storefront runs on mock data | 🟠 High | Frontend |
| Order status model has duplicate fields | 🟠 High | Backend |
| 3 duplicate RBAC middleware implementations | 🟠 Medium | Backend |
| Debug logging in production paths | 🟡 Medium | Backend |
| CSRF wiring unverified | 🟡 Medium | Backend |
