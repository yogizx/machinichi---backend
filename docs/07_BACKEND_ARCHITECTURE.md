# Machinichi — Backend Architecture
> Complete backend design — controllers, services, middleware, models, and server configuration
> Stack: Node.js · Express 5 · TypeScript · Mongoose · Zod

---

## 1. Server Entry Point (server.ts)

```
Order of operations:
1. Load environment variables (dotenv)
2. Connect to MongoDB (mongoose.connect)
3. Initialize Firebase Admin SDK
4. Configure Express global middleware (helmet, cors, cookieParser, morgan, sanitize)
5. Mount route groups (/api/auth, /api/products, etc.)
6. 404 handler for unmatched routes
7. Global error handler
8. Start server on PORT (default: 5000)
```

```typescript
// server.ts — Global Middleware Stack (applied in order)
app.use(express.json({ limit: '10kb' }));        // Body parser with size limit
app.use(cookieParser());                           // Cookie parser
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(helmet());                                  // Security headers
app.use(morgan('dev'));                             // Request logging
app.use(sanitize);                                  // NoSQL injection prevention
app.use('/api', setCsrfCookie);                     // CSRF token cookie

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/bulk-orders', bulkOrderRoutes);

// 404 Handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});
```

---

## 2. Directory Structure

```
backend/src/
├── config/           # 5 config files
│   ├── db.ts                    # MongoDB connection
│   ├── firebase.ts              # Firebase Admin SDK init
│   ├── razorpay.ts              # Razorpay client init
│   └── cloudinary.ts            # Cloudinary config (SDK not installed)
│
├── models/           # 24 Mongoose schemas
│   ├── User.ts
│   ├── Product.ts
│   ├── Order.ts
│   ├── Category.ts
│   ├── Cart.ts
│   ├── Payment.ts
│   ├── Review.ts
│   ├── ... (all 24 collections)
│
├── controllers/      # 14 controller files
│   ├── auth.controller.ts
│   ├── product.controller.ts
│   ├── order.controller.ts
│   ├── checkout.controller.ts
│   ├── payment.controller.ts
│   ├── cart.controller.ts
│   ├── review.controller.ts
│   ├── admin.controller.ts
│   ├── ... (domain-based controllers)
│
├── services/         # 8 service files
│   ├── inventory.service.ts      # Stock management
│   ├── razorpay.service.ts       # Payment processing
│   ├── tax.service.ts            # GST calculations
│   ├── email.service.ts          # Transactional emails
│   ├── sms.service.ts            # SMS OTP delivery
│   ├── search.service.ts         # Meilisearch client
│   ├── sync.service.ts           # Search index sync
│   └── auth.service.ts           # Auth helpers
│
├── middlewares/      # 5 middleware files
│   ├── auth.middleware.ts        # JWT verification + RBAC
│   ├── validate.middleware.ts    # Zod schema validation
│   ├── rbac.middleware.ts        # Role-based access (legacy)
│   ├── role.middleware.ts        # Role check (legacy)
│   └── csrf.middleware.ts        # CSRF token (not wired)
│
├── validators/       # Zod validation schemas
│   └── index.ts                  # All schemas in one file
│
├── routes/           # 12 route files
│   ├── index.ts                  # Central route aggregator
│   ├── auth.routes.ts
│   ├── product.routes.ts
│   ├── cart.routes.ts
│   ├── checkout.routes.ts
│   ├── payment.routes.ts
│   ├── order.routes.ts
│   ├── admin.routes.ts
│   └── ... (per-domain routes)
│
├── seeds/            # Database seed scripts
│   └── seed.ts                   # Initial data population
│
└── server.ts         # Application entry point
```

---

## 3. Controllers Overview

| Controller | Functions | Lines | Key Operations |
|-----------|-----------|-------|----------------|
| auth.controller | register, login, logout, refreshToken, forgotPassword, resetPassword | — | JWT issue/verify, bcrypt hash/compare |
| adminAuth.controller | adminLogin, adminForgotPassword, adminResetPassword | — | Admin role check, separate JWT |
| product.controller | getProducts, getProductBySlug, createProduct, updateProduct, deleteProduct, getFeaturedProducts, getRelatedProducts | — | CRUD, image upload, stock tracking |
| category.controller | getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory | — | CRUD with subcategory support |
| cart.controller | getCart, addItem, updateItemQuantity, removeItem, clearCart, saveForLater, moveToCart, validateCart | — | Stock reservation, guest/user cart merge |
| checkout.controller | getCheckoutSummary, placeOrder, validateCoupon, getScratchOffer | — | Order creation, tax calculation, coupon validation |
| payment.controller | createPaymentOrder, createDirectPaymentOrder, verifyPayment, initiateRefund, handleWebhook | — | Razorpay integration, HMAC verification |
| order.controller | createOrder, getOrders, getOrderById, updateOrderStatus | — | CRUD + status transitions |
| review.controller | createReview, getProductReviews, approveReview, deleteReview | — | Verified purchase gating, moderation |
| profile.controller | getProfile, updateProfile, changePassword, getAddresses, addAddress, updateAddress, deleteAddress | — | User data CRUD |
| admin.controller | getDashboard, getUsers, getUserById, updateUserRole, updateUserStatus, getReports | — | Admin operations, user management |
| wishlist.controller | getWishlist, addToWishlist, removeFromWishlist | — | Favorites management |
| notification.controller | getNotifications, markNotificationsRead | — | In-app notification delivery |
| bulkOrder.controller | createBulkOrder, getBulkOrders, updateBulkOrderStatus | — | B2B enquiry management |

---

## 4. Services Layer

### Inventory Service (inventory.service.ts)
```typescript
// Core stock management functions
checkStock(productId, variantSize, quantity)     // Returns boolean
reserveStock(productId, variantSize, quantity)    // Reserved for cart
deductStock(productId, variantSize, quantity)     // On successful payment
releaseStock(productId, variantSize, quantity)    // On payment failure/cancel

// Issue: Uses read-then-write (non-atomic)
// Fix: Convert to findOneAndUpdate with $inc + $gte guard
```

### Payment Service (razorpay.service.ts)
```typescript
createOrder(amount, currency)                     // Create Razorpay order
verifyPayment(orderId, paymentId, signature)      // HMAC-SHA256 verification
verifyWebhook(body, signature, secret)            // Webhook signature verification
processRefund(paymentId, amount)                  // Initiate refund
```

### Tax Service (tax.service.ts)
```typescript
calculateGST(amount, gstRate)                     // Calculate CGST + SGST
calculateOrderTax(items, shippingAddress)         // Full order tax breakdown
// Supports: 0%, 5%, 12%, 18% GST rates
```

### Email Service (email.service.ts)
```typescript
sendOTP(email, otp)                               // Email verification OTP
sendPasswordReset(email, token)                   // Password reset link
sendOrderConfirmation(email, order)               // Order placed
sendShippingUpdate(email, order)                  // Status change notification
sendWelcomeEmail(email, name)                     // New user welcome
// Provider: Resend API
```

### SMS Service (sms.service.ts)
```typescript
sendOTP(phone, otp)                               // Phone verification OTP
// Providers: Twilio (primary), MSG91 (fallback)
```

---

## 5. Auth Middleware (auth.middleware.ts)

```typescript
// Three middleware functions exported:

// 1. authenticateUser (alias: authMiddleware)
//    - Checks req.cookies.accessToken first
//    - Falls back to Authorization: Bearer <token>
//    - Verifies JWT with process.env.JWT_ACCESS_SECRET
//    - Looks up user by decoded.userId
//    - Attaches { userId, role } to req.user
//    - Returns 401 on any failure

// 2. authenticateAdmin
//    - Calls authenticateUser internally
//    - Checks req.user.role is in ['admin', 'super_admin']
//    - Returns 403 if not admin

// 3. optionalAuth
//    - Reads token if present (cookie or header)
//    - Attaches user if valid, no error if missing
//    - Used for public product routes
```

### Known Issues (From Audit)
```
1. Current authenticateAdmin only rejects 'customer' role
   → Fix: Use explicit allowlist ['admin', 'super_admin']

2. Duplicate RBAC middleware exists (3 implementations)
   → Fix: Delete rbac.middleware.ts and role.middleware.ts
   → Keep auth.middleware.ts as the single source

3. Debug console.log in middleware
   → Fix: Remove in production build
```

---

## 6. Validation Middleware (Zod)

```typescript
// validate.middleware.ts
// Generic validation middleware that works with any Zod schema

export const validate = (schema: ZodSchema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;  // Replace with parsed (coerced) values
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
```

### Validator Structure (validators/index.ts)
```typescript
// Auth schemas
registerSchema, loginSchema, emailSchema, passwordSchema,
forgotPasswordSchema, resetPasswordSchema

// Profile schemas
updateProfileSchema, changePasswordSchema, addressSchema

// Product schemas
createProductSchema, updateProductSchema

// Order schemas
createOrderSchema, updateOrderStatusSchema

// Cart schemas
addToCartSchema, updateCartItemSchema

// Admin schemas
adminLoginSchema
```

---

## 7. Error Handling Strategy

### 401 — Unauthorized
```json
{ "message": "Access denied. No token provided." }
{ "message": "Token expired. Please refresh your token." }
{ "message": "Invalid token." }
```

### 403 — Forbidden
```json
{ "message": "Admin access required" }
```

### 400 — Validation Error
```json
{ "message": "Validation failed", "errors": [{ "field": "email", "message": "..." }] }
```

### 404 — Not Found
```json
{ "message": "Route not found" }
```

### 409 — Conflict
```json
{ "message": "Email already registered" }
```

### 429 — Rate Limit
```json
{ "message": "Too many requests. Please try again later." }
```

### 500 — Server Error
```json
{ "message": "Internal server error" }
```

---

## 8. Configuration

### Environment Variables

| Variable | Used In | Required |
|----------|---------|----------|
| PORT | server.ts | No (default 5000) |
| MONGODB_URI | config/db.ts | Yes |
| JWT_ACCESS_SECRET | auth middleware | Yes |
| JWT_REFRESH_SECRET | auth middleware | Yes |
| JWT_ADMIN_SECRET | admin auth | Yes |
| CLIENT_URL | CORS | Yes |
| COOKIE_DOMAIN | Cookies | No |
| FIREBASE_* | config/firebase.ts | Yes |
| RAZORPAY_KEY_ID | config/razorpay.ts | Yes |
| RAZORPAY_KEY_SECRET | config/razorpay.ts | Yes |
| RAZORPAY_WEBHOOK_SECRET | Payment controller | Yes |
| TWILIO_* | SMS service | No |
| MSG91_* | SMS service (fallback) | No |
| RESEND_API_KEY | Email service | No |
| CLOUDINARY_* | config/cloudinary.ts | No |
| MEILISEARCH_* | Search service | No |
| NODE_ENV | Various | Yes |

---

## 9. Code Quality & Technical Debt

### Known Technical Debt

| Issue | Area | Severity | Resolution |
|-------|------|----------|------------|
| 3 order-creation code paths | Controllers | 🔴 Critical | Consolidate to checkout.controller.placeOrder |
| 3 duplicate RBAC middleware files | Middleware | 🟠 High | Delete 2, keep auth.middleware.ts |
| Order has 2 status fields | Order model | 🟠 High | Collapse to single orderStatus |
| Debug console.log in prod paths | Multiple | 🟡 Medium | Remove all debug logs |
| CSRF middleware not wired | Middleware | 🟡 Medium | Wire to mutation routes |
| Field name mismatch (orderTotal vs totalAmount) | Order model | 🟠 High | Pick one |
| Shipping address field names mismatch | Checkout controller | 🔴 Critical | Fix validator field names |
| Console.log payment routes registration | Routes | 🟡 Medium | Remove |

### Best Practices Already Followed
- ✅ Zod validation on all request bodies
- ✅ Rate limiting on all auth routes
- ✅ Helmet.js security headers
- ✅ NoSQL injection sanitization
- ✅ Password hashing with bcrypt (cost 12)
- ✅ Firebase Admin SDK for Google token verification
- ✅ JWT with limited expiry (15min access, 7d refresh)
- ✅ Refresh token rotation in progress
- ✅ httpOnly cookies for refresh tokens
- ✅ CORS restricted to known origins
- ✅ Generic error messages (no user enumeration)
- ✅ Soft delete for products
- ✅ Audit trail for inventory changes
- ✅ Denormalized order snapshots for history integrity

---

## 10. Development & Deployment

### Local Development
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Nodemon with ts-node (hot reload)
```

### Build & Production
```bash
npm run build        # tsc → dist/server.js
npm start            # node dist/server.js
```

### Database Seeding
```bash
npm run seed         # ts-node src/seeds/seed.ts
```
