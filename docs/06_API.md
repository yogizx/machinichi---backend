# Machinichi — API Reference
> Complete REST API documentation — routes, controllers, validation, and frontend mappings

---

## 1. API Structure

```
Base URL: http://localhost:5000/api
Production: https://api.machinichi.com/api

All routes mounted at server.ts:
/api/*
```

### Middleware Pipeline (Applied to all /api routes)
```
express.json({ limit: '10kb' })
cookieParser()
cors({ origin: CLIENT_URL, credentials: true })
helmet()
morgan('dev')
express-mongo-sanitize
setCsrfCookie
```

### Per-Route Middleware
| Middleware | Applied To | Purpose |
|-----------|------------|---------|
| `strictLimiter` | Auth routes | 6 req / 5 min |
| `loginLimiter` | Login routes | 5 req / 15 min |
| `googleLimiter` | Google OAuth | 3 req / 15 min |
| `validate(schema)` | Mutation routes | Zod schema validation |
| `authenticateUser` | Protected routes | JWT auth |
| `authenticateAdmin` | Admin routes | JWT + admin role |
| `optionalAuth` | Public product routes | Attach user if token present |

---

## 2. Authentication APIs

### POST /api/auth/register
Create a new user account.
```
Body: { fullName, email, phone?, countryCode?, password, confirmPassword }
Middleware: strictLimiter, validate(registerSchema)
Response: 201 { success: true, message: 'Account created successfully' }
Errors: 400 Validation error, 409 Email/phone already exists
```

### POST /api/auth/login
Sign in with email/phone + password.
```
Body: { identifier (email|phone), password, rememberMe? }
Middleware: loginLimiter, validate(loginSchema)
Response: 200 { success: true, accessToken, user }
Cookies: accessToken (15min), refreshToken (7d)
Errors: 401 Invalid credentials, 429 Rate limit, 423 Account locked
```

### POST /api/auth/google
Sign in/up with Google OAuth.
```
Body: { idToken }
Middleware: googleLimiter
Response: Same as login
Note: Firebase Admin SDK verifies ID token server-side
```

### POST /api/auth/refresh-token
Silently refresh access/refresh token pair.
```
Cookies: refreshToken (required)
Response: 200 { success: true }
Cookies: New accessToken + refreshToken
```

### POST /api/auth/logout
Invalidate current session.
```
Cookies: accessToken, refreshToken
Response: 200 { success: true, message: 'Logged out successfully' }
```

### POST /api/auth/forgot-password
Request password reset email/OTP.
```
Body: { email }
Middleware: strictLimiter, validate(forgotPasswordSchema)
Response: 200 { message: 'If account exists, reset code sent' }
```

### POST /api/auth/reset-password
Complete password reset.
```
Body: { token, password, confirmPassword }
Middleware: validate(resetPasswordSchema)
Response: 200 { message: 'Password reset successful' }
```

### POST /api/auth/send-otp
Send phone verification OTP.
```
Body: { phone, devMode? }
Middleware: strictLimiter
Response: 200 { message: 'OTP sent', otp? (dev only) }
Critical: devMode must be guarded by NODE_ENV check
```

---

## 3. Admin Auth APIs

### POST /api/admin/auth/login
Admin login.
```
Body: { email, password }
Middleware: loginLimiter, validate(adminLoginSchema)
Response: 200 { success: true, accessToken, user }
Note: Requires role = 'admin' | 'super_admin'
```

### POST /api/admin/auth/forgot-password
Admin password reset request.
```
Body: { email }
Middleware: validate(forgotPasswordSchema)
Response: 200 { message: 'Reset code sent' }
```

---

## 4. User Profile APIs (authenticateUser required)

| Method | Path | Description | Body/Params |
|--------|------|-------------|-------------|
| GET | /api/user/profile | Get user profile | — |
| PUT | /api/user/profile | Update profile | { fullName, avatar, phone } |
| PUT | /api/user/password | Change password | { currentPassword, newPassword } |
| GET | /api/user/addresses | List addresses | — |
| POST | /api/user/addresses | Add address | { fullName, phoneNumber, streetAddress, city, state, zipCode, label, isDefault } |
| PUT | /api/user/addresses/:id | Update address | Same as add |
| DELETE | /api/user/addresses/:id | Delete address | — |
| PUT | /api/user/addresses/:id/default | Set default | — |
| GET | /api/user/wishlist | Get wishlist | — |
| POST | /api/user/wishlist | Add to wishlist | { productId } |
| DELETE | /api/user/wishlist/:productId | Remove | — |
| GET | /api/user/notifications | Get notifications | query: ?page=&limit= |
| PUT | /api/user/notifications/read | Mark read | { notificationIds[] } |

---

## 5. Product APIs

### Public (optionalAuth or no auth)

| Method | Path | Description | Query Params |
|--------|------|-------------|-------------|
| GET | /api/products | Paginated listing | page, limit, sort, category, minPrice, maxPrice, brand, rating, inStock, search, tags |
| GET | /api/products/featured | Featured products | limit (default 8) |
| GET | /api/products/bulk | Bulk-eligible products | — |
| GET | /api/products/:slug | Product detail by slug | — |
| GET | /api/products/:id/related | Related products | limit (default 4) |
| GET | /api/products/sitemap | All slugs for SEO | — |

### Admin (authenticateAdmin required)

| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | /api/products | Create product | multipart/form-data (images + JSON fields) |
| PUT | /api/products/:id | Update product | multipart/form-data |
| DELETE | /api/products/:id | Soft delete | — |

---

## 6. Category APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/categories | — | All active categories with product counts |
| GET | /api/categories/:slug | — | Category by slug with subcategories |
| POST | /api/categories | Admin | Create category |
| PUT | /api/categories/:id | Admin | Update category |
| DELETE | /api/categories/:id | Admin | Delete category |

---

## 7. Cart APIs (authenticateUser required)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/cart | Get user cart (creates if not exists) |
| POST | /api/cart/items | Add item { productId, variantSize, quantity } |
| PUT | /api/cart/items/:productId | Update quantity { quantity, variantSize? } |
| DELETE | /api/cart/items/:productId | Remove item |
| DELETE | /api/cart | Clear cart |
| POST | /api/cart/save-for-later/:productId | Move to saved for later |
| POST | /api/cart/move-to-cart/:productId | Move back to cart |
| POST | /api/cart/validate | Validate stock before checkout |

**Note**: Guest cart uses `sessionId` from cookie (no auth required for add/remove).

---

## 8. Checkout APIs (authenticateUser required)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/checkout/validate-coupon | Validate coupon { code, subtotal } |
| GET | /api/checkout/scratch-offer | Get active scratch card offer |
| POST | /api/checkout/session | Create checkout session (validate stock, lock inventory) |
| POST | /api/checkout/place-order | Place order from cart (🟡 Currently broken — missing orderTotal) |

---

## 9. Payment APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/payments/create-order | User | Create Razorpay order |
| POST | /api/payments/create-direct | User | Direct payment (🟡 Workaround — skips inventory) |
| POST | /api/payments/verify | User | Verify Razorpay signature |
| POST | /api/payments/refund | Admin | Initiate refund |
| POST | /api/payments/webhook | — | Razorpay webhook handler |
| GET | /api/payments/order/:orderId | User | Get payment by order |
| GET | /api/payments/:id | User | Get payment by ID |

---

## 10. Order APIs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/orders | User | Create order (🟡 Currently broken) |
| GET | /api/orders | User | List user orders (?status=&page=&limit=) |
| GET | /api/orders/:id | User | Get order detail |
| PUT | /api/orders/:id/status | Admin | Update order status |

---

## 11. Admin Dashboard APIs (authenticateAdmin required)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/dashboard | Dashboard overview stats |
| GET | /api/admin/users | List all users (?role=&tier=&search=&page=) |
| GET | /api/admin/users/:id | User detail |
| PUT | /api/admin/users/:id/role | Update user role |
| PUT | /api/admin/users/:id/status | Block/unblock user |
| GET | /api/admin/reports | Sales/payment reports |

### Missing Admin APIs (Needed for live data)
```
GET  /api/admin/stats/overview      — Revenue, orders, customers
GET  /api/admin/stats/sales-chart   — Monthly chart data
GET  /api/admin/orders/recent       — Recent orders
GET  /api/admin/products/top        — Top selling products
GET  /api/admin/categories/performance — Category breakdown
GET  /api/admin/analytics/kpis      — Analytics KPIs
GET  /api/admin/analytics/sales-trend — Sales trend
GET  /api/admin/analytics/export    — CSV/PDF exports
```

---

## 12. Page-to-API Mapping

| Page | API Calls | Status |
|------|-----------|--------|
| Home | GET /products/featured, GET /categories, GET /banners | ⚠️ Not connected (mock data) |
| Product Listing | GET /products (?category=&sort=&page=) | ⚠️ Not connected (mock data) |
| Product Details | GET /products/:slug, GET /products/:id/related, GET /products/:slug/reviews | ⚠️ Not connected (mock data) |
| Cart | GET /cart, POST /cart/items, PUT /cart/items/:id, DELETE /cart/items/:id | ❌ In-memory only |
| Checkout | GET /user/addresses, POST /user/addresses, POST /checkout/validate-coupon, GET /checkout/scratch-offer | ⚠️ Partial (mock coupons) |
| Payment Method | POST /payments/create-order, POST /payments/verify | ⚠️ Partial (mock payment) |
| Payment Success | GET /orders/:orderId | ❌ Not connected |
| Orders | GET /orders, GET /orders/:orderId, POST /orders/:id/cancel | ❌ Mock data |
| Track Order | GET /orders/:orderId/tracking | ❌ Mock data |
| Return Request | POST /return-requests, GET /return-requests/:id/status | ❌ Mock data |
| Profile | GET /user/me, PUT /user/profile, PUT /user/password, GET /user/addresses | ✅ Connected |
| Wishlist | GET /user/wishlist, POST /user/wishlist, DELETE /user/wishlist/:id | ❌ In-memory only |
| Saved for Later | GET /saved-for-later, POST /saved-for-later, DELETE /saved-for-later/:id | ❌ In-memory only |
| Sign In | POST /auth/login, POST /auth/google | ✅ Connected |
| Create Account | POST /auth/register, POST /auth/send-otp | ✅ Connected |
| Forgot Password | POST /auth/forgot-password, POST /auth/reset-password | ✅ Connected |
| Admin Dashboard | GET /admin/dashboard, GET /admin/users, GET /admin/reports | ❌ Mock data |
| Admin Inventory | GET /admin/products, POST /admin/products, PUT /admin/products/:id | ⚠️ Partial |
| Admin Orders | GET /admin/orders, PUT /admin/orders/:id/status | ❌ Mock data |
| Admin Customers | GET /admin/users, PUT /admin/users/:id/block | ❌ Mock data |
| Admin Coupons | GET /admin/coupons, POST /admin/coupons, PUT /admin/coupons/:id | ❌ Mock data |
| Admin Returns | GET /admin/return-requests, PUT /admin/return-requests/:id/approve | ❌ Mock data |
| Admin Analytics | GET /admin/analytics/kpis, GET /admin/analytics/sales-trend | ❌ Mock data |
| Admin Business Approvals | GET /admin/businesses, PUT /admin/businesses/:id/approve | ✅ Connected |
| Bulk Orders | GET /products?bulkAvailable=true, POST /bulk-orders | ❌ Mock data |

---

## 13. API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message",
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

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Pagination Query Parameters
```
?page=1        (default: 1)
&limit=20      (default: 20, max: 100)
&sort=price    (field name)
&order=asc     (asc | desc)
```

---

## 14. Known API Issues (From Audit)

| Issue | Route | Severity | Fix |
|-------|-------|----------|-----|
| Missing `orderTotal` causes ValidationError | POST /api/orders, POST /api/checkout/place-order | 🔴 Critical | Add orderTotal field |
| Shipping address field names don't match schema | POST /api/checkout/place-order | 🔴 Critical | Fix field mapping |
| `/api/payments/create-direct` skips inventory entirely | POST /api/payments/create-direct | 🔴 Critical | Remove or fix — use canonical path |
| No stock check before payment | All checkout paths | 🔴 Critical | Add inventory validation |
| No stock restoration on payment failure | POST /api/payments/verify (failure) | 🔴 Critical | Add releaseStock() |
| Duplicate order creation paths (3 controllers) | Orders, Checkout, Payments | 🔴 Critical | Consolidate to one |
| Debug console.log in production routes | Multiple routes | 🟡 Medium | Remove |
| CSRF protection not wired | All routes | 🟡 Medium | Wire csrfProtection middleware |
| No admin stats API endpoints | Admin dashboard | 🟠 High | Create endpoints |
| No user orders API | /api/user/orders | 🟠 High | Create endpoint |
| No invoice generation API | — | 🟡 Medium | Create endpoint |
