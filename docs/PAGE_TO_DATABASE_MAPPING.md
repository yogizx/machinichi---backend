# Machinichi — Page to Database Mapping
> Every page → required collections → required APIs → required security

---

## USER PAGES

---

### Page: Home (`/`)
**Current State:** Static, no backend calls
**Required Collections:** `products`, `categories`, `banners`, `analytics_events`
**Required APIs:**
- `GET /api/products/featured` — featured products widget
- `GET /api/categories` — category grid
- `GET /api/banners?position=hero` — hero banners
- `POST /api/analytics/event` — track page view
**Security:** Rate limiting on analytics endpoint

---

### Page: Categories (`/categories`)
**Current State:** Static mock
**Required Collections:** `categories`, `products`
**Required APIs:**
- `GET /api/categories` — all categories with product count
- `GET /api/categories/:slug/products` — products by category
**Security:** Public route, no auth required

---

### Page: Product Listing (`/product`, `/dryfriut`, `/fruit`)
**Current State:** Renders `productCatalog` from Product.jsx (hardcoded)
**Required Collections:** `products`, `categories`
**Required APIs:**
- `GET /api/products?category=&sort=&page=&limit=`
- `GET /api/products/search?q=`
**Security:** Public, no auth required

---

### Page: Product Details (`/product/:slug`)
**Current State:** Reads from localStorage/state
**Required Collections:** `products`, `reviews`
**Required APIs:**
- `GET /api/products/:slug` — full product details
- `GET /api/products/:slug/reviews` — paginated reviews
- `POST /api/analytics/event` — product view tracking
**Security:** Public; auth required to add to cart/wishlist

---

### Page: Cart (`/cart`)
**Current State:** 100% in-memory React state (App.jsx) — **CRITICAL: data lost on refresh**
**Required Collections:** `carts`, `products`
**Required APIs:**
- `GET /api/cart` — load cart (merges guest + user)
- `POST /api/cart/items` — add item
- `PUT /api/cart/items/:productId` — update quantity
- `DELETE /api/cart/items/:productId` — remove item
- `DELETE /api/cart` — clear cart
- `POST /api/cart/save-for-later/:productId` — move to saved
- `POST /api/cart/move-to-cart/:productId` — move from saved
- `POST /api/cart/validate` — stock validation before checkout
**Security:** Auth required; guest cart via session cookie; inventory lock on checkout

---

### Page: Wishlist/Favorites (`/favouite`)
**Current State:** In-memory Set in React state — **lost on refresh**
**Required Collections:** `wishlists`, `products`
**Required APIs:**
- `GET /api/wishlist` — get all favorites
- `POST /api/wishlist/:productId` — add favorite
- `DELETE /api/wishlist/:productId` — remove favorite
**Security:** Auth required

---

### Page: Saved Products (`/saveproduct`)
**Current State:** In-memory array in React state — **lost on refresh**
**Required Collections:** `saved_for_later`, `products`
**Required APIs:**
- `GET /api/saved-for-later` — get saved items
- `POST /api/saved-for-later/:productId` — save item
- `DELETE /api/saved-for-later/:productId` — remove
- `POST /api/saved-for-later/:productId/move-to-cart` — move to cart
**Security:** Auth required

---

### Page: Checkout (`/checkout`)
**Current State:** Addresses in localStorage via shippingAddresses util; promo codes hardcoded (`MACH10`, `WELCOME15`, `FRESH200`); scratch card is hardcoded logic — **CRITICAL: no real validation**
**Required Collections:** `carts`, `orders`, `coupons`, `addresses`, `scratch_card_offers`, `products`
**Required APIs:**
- `GET /api/user/addresses` — load saved addresses
- `POST /api/user/addresses` — add checkout address
- `POST /api/checkout/validate-coupon` — validate coupon code
- `GET /api/checkout/scratch-offer` — get active scratch card offer
- `POST /api/checkout/session` — create checkout session (validate stock, lock inventory)
**Security:** Auth required; CSRF token; coupon validation backend only

---

### Page: Payment Method (`/payment-method`)
**Current State:** Mock UI — clicking "PAY" navigates to success page directly, **NO real payment**
**Required Collections:** `orders`, `payments`
**Required APIs:**
- `POST /api/payments/create-order` — create Razorpay order
- `POST /api/payments/verify` — verify Razorpay signature
- `POST /api/payments/webhook` — Razorpay webhook handler
**Security:** Auth required; Razorpay signature verification mandatory; idempotency key

---

### Page: Payment Success (`/payment-success`)
**Current State:** Static success page with hardcoded order #MAC-82931
**Required Collections:** `orders`, `payments`, `carts`
**Required APIs:**
- Reads from navigation state (populated after payment verification)
- `GET /api/orders/:orderId` — load confirmed order
**Security:** Auth required; validate orderId belongs to user

---

### Page: Orders (`/orders`)
**Current State:** Hardcoded mock orders array — **no real data**
**Required Collections:** `orders`, `products`
**Required APIs:**
- `GET /api/orders?status=&page=&limit=&search=`
- `GET /api/orders/:orderId` — order details
- `POST /api/orders/:orderId/cancel` — cancel order
- `GET /api/orders/:orderId/invoice` — download invoice PDF
**Security:** Auth required; user can only access their own orders

---

### Page: Track Order (`/trackorder`)
**Current State:** Static hardcoded tracking steps; reads from sessionStorage
**Required Collections:** `orders`
**Required APIs:**
- `GET /api/orders/:orderId/tracking` — live tracking status
- `PUT /api/orders/:orderId/delivery-instructions` — update delivery instructions
**Security:** Auth required; order ownership validation

---

### Page: Return Request (`/return-request`)
**Current State:** Return.jsx — not fully analyzed (linked from orders page)
**Required Collections:** `return_requests`, `orders`
**Required APIs:**
- `POST /api/return-requests` — submit return request
- `GET /api/return-requests/:id/status` — check return status
**Security:** Auth required; can only return delivered orders within return window

---

### Page: Profile (`/profile`, `/account`)
**Current State:** ✅ **Partially connected** — calls real backend (`/api/user/me`, `/api/user/addresses`, `/api/user/profile`, `/api/user/password`). Access token in `localStorage` (insecure — move to HttpOnly cookie per AUTH_SECURITY_AUDIT.md)
**Required Collections:** `users`, `addresses`, `otps`
**Required APIs:**
- `GET /api/user/me` ✅ exists
- `PUT /api/user/profile` ✅ exists
- `PUT /api/user/password` ✅ exists
- `GET /api/user/addresses` ✅ exists
- `POST /api/user/addresses` ✅ exists
- `PUT /api/user/addresses/:id` ✅ exists
- `POST /api/user/send-verification-otp` — needs implementation
- `POST /api/user/verify-otp` — needs implementation
**Security:** Auth required; OTP expiry 10 min; rate limit verify endpoint

---

### Page: Overview (`/overview`)
**Current State:** Not analyzed in depth
**Required Collections:** `orders`, `users`
**Required APIs:** `GET /api/user/dashboard-summary` (orders count, spend, etc.)

---

### Page: Bulk Orders (`/bulk`)
**Current State:** BulkBrowsePage.jsx — browse UI for bulk ordering
**Required Collections:** `bulk_orders`, `products`
**Required APIs:**
- `GET /api/products?bulkAvailable=true`
- `POST /api/bulk-orders` — submit bulk enquiry
**Security:** Auth required or guest with email

---

### Page: Sign In (`/signin`)
**Current State:** Calls backend auth APIs but uses sessionStorage for auth state (no real JWT in cookie)
**Required Collections:** `users`, `refresh_tokens`, `otps`, `audit_logs`
**Required APIs:**
- `POST /api/auth/login` ✅ exists
- `POST /api/auth/send-otp` ✅ (OTP-based login)
- `POST /api/auth/google` ✅ exists
- `POST /api/auth/logout` ✅ exists
**Security:** Rate limit 5 attempts/15 min; account lockout; CAPTCHA after 3 failures

---

### Page: Create Account (`/create-account`)
**Current State:** Registration page
**Required Collections:** `users`, `otps`
**Required APIs:**
- `POST /api/auth/register`
- `POST /api/auth/send-verification`
**Security:** Unique email/phone check; Argon2 hashing; OTP email verification

---

### Page: Forgot Password (`/forgot-password`)
**Current State:** UI only
**Required Collections:** `users`, `otps`
**Required APIs:**
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
**Security:** Token expiry 15 min; rate limit; invalidate all sessions on reset

---

## ADMIN PAGES

---

### Page: Admin Login (`/admin/login`)
**Current State:** sessionStorage-based auth — **no real backend validation**
**Required Collections:** `users`, `refresh_tokens`, `audit_logs`
**Required APIs:**
- `POST /api/admin/auth/login` ✅ exists
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/refresh`
**Security:** Role check (`admin` or `super_admin` only); separate JWT secret; audit log every login

---

### Page: Admin Dashboard (`/admin/dashboard`)
**Current State:** All hardcoded mock data (revenue ₹82,650, orders 1,284 etc.)
**Required Collections:** `orders`, `products`, `users`, `inventory_logs`
**Required APIs:**
- `GET /api/admin/stats/overview` — revenue, orders, customers, products sold
- `GET /api/admin/stats/sales-chart?period=` — monthly chart data
- `GET /api/admin/orders/recent` — recent orders table
- `GET /api/admin/products/top` — top products
- `GET /api/admin/categories/performance` — category breakdown
**Security:** Admin role required on all endpoints

---

### Page: Inventory (`/admin/inventory`)
**Current State:** Hardcoded product list in component; upload/download is frontend-only
**Required Collections:** `products`, `categories`, `inventory_logs`
**Required APIs:**
- `GET /api/admin/products?page=&category=&status=&search=`
- `POST /api/admin/products` — create product
- `PUT /api/admin/products/:id` — update product
- `DELETE /api/admin/products/:id` — soft delete
- `PUT /api/admin/products/:id/status` — toggle status
- `POST /api/admin/products/bulk-upload` — CSV/Excel bulk upload
- `GET /api/admin/products/template` — download CSV template
- `POST /api/admin/products/:id/images` — upload images (S3/Cloudinary)
**Security:** Admin role; file validation (type, size); virus scan for uploads

---

### Page: Admin Orders (`/admin/orders`)
**Current State:** Likely hardcoded (not fully read)
**Required Collections:** `orders`, `users`, `products`
**Required APIs:**
- `GET /api/admin/orders?status=&search=&page=`
- `GET /api/admin/orders/:id` — order details
- `PUT /api/admin/orders/:id/status` — update status
- `POST /api/admin/orders/:id/dispatch` — mark dispatched with tracking
**Security:** Admin role; audit log every status change

---

### Page: Customers (`/admin/customers`)
**Current State:** Hardcoded 4 customers; add customer is local state only
**Required Collections:** `users`, `orders`
**Required APIs:**
- `GET /api/admin/customers?tier=&region=&search=&page=`
- `GET /api/admin/customers/:id` — customer profile
- `PUT /api/admin/customers/:id/block` — block/unblock
- `GET /api/admin/customers/stats` — total, new this month, avg. LTV
**Security:** Admin role; super_admin to block customers

---

### Page: Offers & Coupons (`/admin/offers-coupons`)
**Current State:** Hardcoded coupon list
**Required Collections:** `coupons`, `coupon_usages`, `scratch_card_offers`
**Required APIs:**
- `GET /api/admin/coupons`
- `POST /api/admin/coupons` — create coupon
- `PUT /api/admin/coupons/:id`
- `DELETE /api/admin/coupons/:id`
- `GET /api/admin/scratch-offers`
- `POST /api/admin/scratch-offers`
**Security:** Admin role; prevent backdating coupons

---

### Page: Create Offers (`/admin/create-offers`)
**Current State:** Form for scratch card offers (saves to sessionStorage as `machinichiLastOffer`)
**Required Collections:** `scratch_card_offers`
**Required APIs:**
- `POST /api/admin/scratch-offers`
- `PUT /api/admin/scratch-offers/:id`
**Security:** Admin role; validate discount values

---

### Page: Return Requests (`/admin/return-request`)
**Current State:** Hardcoded 4 return requests; status update is local state only
**Required Collections:** `return_requests`, `orders`, `refunds`
**Required APIs:**
- `GET /api/admin/return-requests?status=&search=&page=`
- `GET /api/admin/return-requests/:id` — detailed view
- `PUT /api/admin/return-requests/:id/approve` — approve + trigger refund
- `PUT /api/admin/return-requests/:id/reject`
- `PUT /api/admin/return-requests/:id/escalate`
- `POST /api/admin/return-requests/:id/refund` — partial refund
**Security:** Admin role; audit log; Razorpay refund API call

---

### Page: Business Approvals (`/admin/businesses`)
**Current State:** ✅ Partially implemented — backend routes exist (`/api/admin/businesses`)
**Required Collections:** `businesses`, `users`
**Required APIs:**
- `GET /api/admin/businesses` ✅ exists
- `PUT /api/admin/businesses/:id/approve`
- `PUT /api/admin/businesses/:id/reject`

---

### Page: Analytics (`/admin/analytics`)
**Current State:** All hardcoded chart data; export is browser-only CSV
**Required Collections:** `orders`, `users`, `products`, `analytics_events`
**Required APIs:**
- `GET /api/admin/analytics/kpis?from=&to=`
- `GET /api/admin/analytics/sales-trend?period=`
- `GET /api/admin/analytics/orders-by-region`
- `GET /api/admin/analytics/top-categories`
- `GET /api/admin/analytics/export?type=&format=`

---

### Page: Admin Profile (`/admin/profile`)
**Current State:** UI only
**Required Collections:** `users`
**Required APIs:**
- `GET /api/admin/auth/me`
- `PUT /api/admin/profile`
- `PUT /api/admin/password`
