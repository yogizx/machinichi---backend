# Route Audit

> Generated from source-code analysis. All routes traced from **server.ts** → **routes/index.ts** → individual route files.

---

## API Routes (`/api`)

### Health (`/api/health`)

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| GET | `/api/health` | — | `healthCheck` | `server.ts:46` |

---

### Auth (`/api/auth`)

Mounted at `server.ts:55` via `routes/index.ts:11`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| POST | `/api/auth/register` | `strictLimiter`, `validate(registerSchema)` | `register` | `auth.routes.ts:17` |
| POST | `/api/auth/verify-email` | `validate(verifyEmailSchema)` | `verifyEmail` | `auth.routes.ts:18` |
| POST | `/api/auth/login` | `strictLimiter`, `validate(loginSchema)` | `login` | `auth.routes.ts:32` |
| POST | `/api/auth/google` | `googleLimiter` | `googleAuth` | `auth.routes.ts:33` |
| POST | `/api/auth/forgot-password` | `strictLimiter`, `validate(forgotPasswordSchema)` | `forgotPassword` | `auth.routes.ts:47` |
| POST | `/api/auth/reset-password` | `validate(resetPasswordSchema)` | `resetPassword` | `auth.routes.ts:60` |
| POST | `/api/auth/refresh-token` | — | `refreshToken` | `auth.routes.ts:74` |
| POST | `/api/auth/logout` | — | `logout` | `auth.routes.ts:75` |

---

### Admin Auth (`/api/admin/auth`)

Mounted at `server.ts:56` via `routes/index.ts:12`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| POST | `/api/admin/auth/login` | `loginLimiter`, `validate(adminLoginSchema)` | `adminLogin` | `adminAuth.routes.ts:22` |
| POST | `/api/admin/auth/forgot-password` | `validate(forgotPasswordSchema)` | `adminForgotPassword` | `adminAuth.routes.ts:36` |
| POST | `/api/admin/auth/reset-password` | `validate(resetPasswordSchema)` | `adminResetPassword` | `adminAuth.routes.ts:49` |

---

### User Profile (`/api/user`)

Mounted at `server.ts:58` via `routes/index.ts:17`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| GET | `/api/user/profile` | `authenticateUser` | `getProfile` | `profile.routes.ts:11` |
| PUT | `/api/user/profile` | `authenticateUser`, `validate(updateProfileSchema)` | `updateProfile` | `profile.routes.ts:12` |
| PUT | `/api/user/password` | `authenticateUser`, `validate(changePasswordSchema)` | `changePassword` | `profile.routes.ts:13` |
| GET | `/api/user/addresses` | `authenticateUser` | `getAddresses` | `profile.routes.ts:17` |
| POST | `/api/user/addresses` | `authenticateUser`, `validate(addressSchema)` | `addAddress` | `profile.routes.ts:18` |
| PUT | `/api/user/addresses/:id` | `authenticateUser`, `validate(addressSchema)` | `updateAddress` | `profile.routes.ts:19` |
| DELETE | `/api/user/addresses/:id` | `authenticateUser` | `deleteAddress` | `profile.routes.ts:20` |
| PUT | `/api/user/addresses/:id/default` | `authenticateUser` | `setDefaultAddress` | `profile.routes.ts:21` |
| GET | `/api/user/wishlist` | `authenticateUser` | `getWishlist` | `profile.routes.ts:25` |
| POST | `/api/user/wishlist` | `authenticateUser`, `validate(wishlistSchema)` | `addToWishlist` | `profile.routes.ts:26` |
| DELETE | `/api/user/wishlist/:productId` | `authenticateUser` | `removeFromWishlist` | `profile.routes.ts:27` |
| GET | `/api/user/notifications` | `authenticateUser` | `getNotifications` | `profile.routes.ts:31` |
| PUT | `/api/user/notifications/read` | `authenticateUser`, `validate(notificationReadSchema)` | `markNotificationsRead` | `profile.routes.ts:32` |

> `authenticateUser` is an alias for `authMiddleware` (exported from `auth.middleware.ts:66`).

---

### Products (`/api/products`)

Mounted at `server.ts:59` via `routes/index.ts:21`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| GET | `/api/products` | `optionalAuth` | `getProducts` | `product.routes.ts:21` |
| GET | `/api/products/sitemap` | — | `getProductSitemap` | `product.routes.ts:22` |
| GET | `/api/products/bulk` | — | `getBulkProducts` | `product.routes.ts:23` |
| GET | `/api/products/:slug` | `optionalAuth` | `getProductBySlug` | `product.routes.ts:25` |
| POST | `/api/products` | `authenticateAdmin`, `upload.array('images', 10)`, `validate(createProductSchema)` | `createProduct` | `product.routes.ts:39` |
| PUT | `/api/products/:id` | `authenticateAdmin`, `upload.array('images', 10)`, `validate(updateProductSchema)` | `updateProduct` | `product.routes.ts:41` |
| DELETE | `/api/products/:id` | `authenticateAdmin` | `deleteProduct` | `product.routes.ts:42` |
| GET | `/api/products/:id/related` | — | `getRelatedProducts` | `product.routes.ts:44` |

---

### Categories (`/api/categories`)

Mounted at `server.ts:60` via `routes/index.ts:22`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| GET | `/api/categories` | — | `getCategories` | `category.routes.ts:11` |
| GET | `/api/categories/:slug` | — | `getCategoryBySlug` | `category.routes.ts:13` |
| POST | `/api/categories` | `authenticateAdmin`, `validate(categorySchema)` | `createCategory` | `category.routes.ts:25` |
| PUT | `/api/categories/:id` | `authenticateAdmin`, `validate(categorySchema)` | `updateCategory` | `category.routes.ts:27` |
| DELETE | `/api/categories/:id` | `authenticateAdmin` | `deleteCategory` | `category.routes.ts:28` |

---

### Orders (`/api/orders`)

Mounted at `server.ts:61` via `routes/index.ts:24`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| POST | `/api/orders` | `authenticateUser`, `validate(createOrderSchema)` | `createOrder` | `order.routes.ts:11` |
| GET | `/api/orders` | `authenticateUser` | `getOrders` | `order.routes.ts:12` |
| GET | `/api/orders/:id` | `authenticateUser` | `getOrderById` | `order.routes.ts:13` |
| PUT | `/api/orders/:id/status` | `authenticateAdmin`, `validate(updateOrderStatusSchema)` | `updateOrderStatus` | `order.routes.ts:26` |

---

### Payments (`/api/payments`)

Mounted at `server.ts:62` via `routes/index.ts:26`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| GET | `/api/payments/order/:orderId` | `authenticateUser` | `getPaymentByOrder` | `payment.routes.ts:13` |
| GET | `/api/payments/:id` | `authenticateUser` | `getPaymentById` | `payment.routes.ts:14` |
| POST | `/api/payments/create-order` | `authenticateUser` | `createPaymentOrder` | `payment.routes.ts:16` |
| POST | `/api/payments/create-direct` | `authenticateUser` | `createDirectPaymentOrder` | `payment.routes.ts:19` |
| POST | `/api/payments/verify` | `authenticateUser` | `verifyPayment` | `payment.routes.ts:21` |
| POST | `/api/payments/refund` | `authenticateUser`, `authenticateAdmin` | `initiateRefund` | `payment.routes.ts:23` |
| POST | `/api/payments/webhook` | — | `handleWebhook` | `payment.routes.ts:25` |

---

### Admin Dashboard (`/api/admin`)

Mounted at `server.ts:63` via `routes/index.ts:29`.

| Method | Path | Middleware | Controller | Source |
|--------|------|-----------|------------|--------|
| GET | `/api/admin/dashboard` | `authenticateAdmin` | `getDashboard` | `admin.routes.ts:11` |
| GET | `/api/admin/users` | `authenticateAdmin` | `getUsers` | `admin.routes.ts:13` |
| GET | `/api/admin/users/:id` | `authenticateAdmin` | `getUserById` | `admin.routes.ts:14` |
| PUT | `/api/admin/users/:id/role` | `authenticateAdmin`, `validate(updateUserRoleSchema)` | `updateUserRole` | `admin.routes.ts:15` |
| PUT | `/api/admin/users/:id/status` | `authenticateAdmin`, `validate(updateUserStatusSchema)` | `updateUserStatus` | `admin.routes.ts:27` |
| GET | `/api/admin/reports` | `authenticateAdmin` | `getReports` | `admin.routes.ts:37` |

---

## Middleware Summary

### Global Middleware (applied to ALL routes below the mount point)

| Middleware | Mount Point | Purpose | Source |
|-----------|------------|---------|--------|
| `express.json({ limit: '10kb' })` | `server.ts:37` | Parse JSON bodies | — |
| `cookieParser()` | `server.ts:38` | Parse cookies | `server.ts:38` |
| `cors(...)` | `server.ts:39-42` | CORS for `localhost:5173` | `server.ts:39` |
| `helmet()` | `server.ts:43` | Security headers | `server.ts:43` |
| `morgan('dev')` | `server.ts:44` | Request logging | `server.ts:44` |
| `setCsrfCookie` | `server.ts:52` | Sets CSRF token cookie (no-op effectively) | `csrf.middleware.ts:8` |
| 404 handler | `server.ts:67` | Catch-all for unmatched routes | `server.ts:67` |
| Error handler | `server.ts:70` | Global error handler | `server.ts:70` |

### Route-level Middleware

| Middleware | Description | Source |
|-----------|------------|--------|
| `strictLimiter` | 6 req / 5 min | `auth.routes.ts:5` |
| `loginLimiter` | 5 req / 15 min | `auth.routes.ts:6` / `adminAuth.routes.ts:5` |
| `googleLimiter` | 3 req / 15 min | `auth.routes.ts:7` |
| `validate(schema)` | Zod schema validation | `validate.middleware.ts` |
| `authenticateUser` | JWT auth (alias for `authMiddleware`) | `auth.middleware.ts:66` |
| `authenticateAdmin` | JWT auth + admin role check | `auth.middleware.ts:68` |
| `optionalAuth` | Attaches user if token present, no error | `auth.middleware.ts:70` |

---

## Frontend → Backend Mappings

| Page | Frontend File | API Call | Backend Route |
|------|--------------|----------|--------------|
| Sign In | `src/pages/SignIn.jsx` | `POST /api/auth/login` | `auth.routes.ts:32` |
| Create Account | `src/pages/CreateAccount.jsx` | `POST /api/auth/register` | `auth.routes.ts:17` |
| Admin Login | `src/admin/pages/Adminlogin.jsx` | `POST /api/admin/auth/login` | `adminAuth.routes.ts:22` |
| Profile | `src/pages/Profile.jsx` | `GET /api/user/profile` | `profile.routes.ts:11` |
| Addresses | `src/pages/Profile.jsx` | `GET /api/user/addresses` | `profile.routes.ts:17` |
| Checkout | `src/pages/Checkout.jsx` | `POST /api/payments/create-order` | `payment.routes.ts:16` |
| Payment Method | `src/pages/PaymentMethod.jsx` | `POST /api/payments/create-direct` | `payment.routes.ts:19` |
| Payment Success | `src/pages/PaymentSuccess.jsx` | `POST /api/payments/verify` | `payment.routes.ts:21` |

---

## CSRF Audit

- `setCsrfCookie` middleware: **mounted** at `/api` → `server.ts:52`
- `csrfProtection` middleware: **never mounted** — exported from `csrf.middleware.ts:14` but not imported or used in any file
- **Result**: CSRF protection is effectively **disabled**. No CSRF tokens are checked on any route.

---

## Auth Middleware Behavior (`authMiddleware`)

1. Checks `req.cookies.accessToken` first
2. Falls back to `Authorization: Bearer <token>` header
3. If no token: returns 401 `'Access denied. No token provided.'`
4. Verifies token with `jwt.verify(token, process.env.JWT_ACCESS_SECRET!)`
5. On expiration: returns 401 `'Token expired. Please refresh your token.'`
6. On invalid token: returns 401 `'Invalid token.'`
7. Looks up user by decoded `userId`: returns 401 `'User not found or inactive.'` if missing or inactive
8. Attaches `{ userId, role }` to `req.user`

---

## 404 Handler Behavior (`server.ts:67`)

Returns `{ message: 'Route not found' }` at **status 404** for any unmatched route — this is the error seen for `POST /api/payments/create-direct`.

---

## Current Debug Logs Added

| Location | Log Type | What It Shows |
|----------|---------|--------------|
| `validate.middleware.ts` | `[VALIDATE]` | Failed validation field/message details |
| `auth.middleware.ts` | `[AUTH]` | Cookie token presence, Authorization header, final 401 reason |
| `adminAuth.controller.ts` | `[ADMIN LOGIN]` | Received body keys, email value, password length |
| `payment.controller.ts` | `[CREATE DIRECT PAYMENT]` | User ID, request body keys |
| `routes/index.ts` | `[API ROUTES]` | Payment routes mounted |
| `payment.routes.ts` | `[PAYMENT ROUTES]` | Route registration confirmation |
