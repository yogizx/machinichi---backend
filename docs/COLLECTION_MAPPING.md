# Machinichi — Collection Mapping
> Every MongoDB collection mapped to its backend purpose and key relationships

---

## Primary Collections Overview

| # | Collection | Purpose | Related To |
|---|-----------|---------|-----------|
| 1 | `users` | All users — customers + admins | addresses, orders, carts, wishlists, reviews |
| 2 | `addresses` | Delivery addresses per user | users, orders |
| 3 | `refresh_tokens` | JWT rotation & session management | users |
| 4 | `otps` | Email/phone verification & password reset | users |
| 5 | `products` | Full product catalog with variants | categories, carts, orders, reviews |
| 6 | `categories` | Product taxonomy (7 main categories) | products |
| 7 | `carts` | Persistent cart (guest + user) | users, products |
| 8 | `saved_for_later` | Save for later items | users, products |
| 9 | `wishlists` | Favorite products | users, products |
| 10 | `orders` | All purchase records | users, products, payments |
| 11 | `payments` | Razorpay transaction records | orders, users |
| 12 | `refunds` | Razorpay refund records | orders, payments, return_requests |
| 13 | `return_requests` | Return & refund management | orders, users |
| 14 | `coupons` | Promo codes (MACH10, WELCOME15, FRESH200) | users, orders |
| 15 | `coupon_usages` | Per-user coupon use tracking | coupons, users, orders |
| 16 | `scratch_card_offers` | Admin-configured scratch card offers | orders |
| 17 | `reviews` | Product reviews (verified purchase) | products, users, orders |
| 18 | `inventory_logs` | Stock movement audit trail | products |
| 19 | `banners` | Homepage/category banners | categories, products |
| 20 | `notifications` | In-app / email / SMS / WhatsApp alerts | users, orders |
| 21 | `bulk_orders` | B2B bulk order enquiries | users, products |
| 22 | `audit_logs` | Admin action audit trail | users |
| 23 | `businesses` | B2B business approvals | users |
| 24 | `analytics_events` | Behavioural analytics | users, products |

---

## Relationship Map

```
users
 ├── addresses (1:many)
 ├── refresh_tokens (1:many)
 ├── otps (1:many)
 ├── carts (1:1)
 ├── saved_for_later (1:1)
 ├── wishlists (1:1)
 ├── orders (1:many)
 ├── reviews (1:many)
 ├── bulk_orders (1:many)
 └── notifications (1:many)

products
 ├── categories (many:1)
 ├── carts.items (many:many via embedded)
 ├── orders.items (many:many via embedded)
 ├── wishlists.products (many:many via embedded)
 ├── reviews (1:many)
 └── inventory_logs (1:many)

orders
 ├── users (many:1)
 ├── payments (1:1)
 ├── refunds (1:many)
 └── return_requests (1:many)

coupons
 ├── coupon_usages (1:many)
 └── orders (via embedded coupon snapshot)
```

---

## Enum Reference

### Product Status
`Active` | `Draft` | `Out of Stock` | `Archived`

### Order Status
`Placed` → `Packed` → `Shipped` → `In Transit` → `Out for Delivery` → `Delivered`
Parallel: `Cancelled`

### Payment Status
`Pending` | `Paid` | `Failed` | `Refunded` | `PartialRefund`

### Return Status
`Processing` | `Escalated` | `Refunded` | `Rejected`

### User Roles
`customer` | `admin` | `super_admin`

### Customer Tiers (Admin CRM)
`Regular` | `Gold Member` | `Organic Tier`

### Shipping Methods
`standard` (₹50, 3-5 days) | `express` (₹120, 1 day)

### Product Categories (7 main)
`Dry Fruits` | `Grains` | `Flour` | `Ready To Eat` | `Juices` | `Pooja Items` | `Organic Products`

### Unit Types
`Kilogram` | `Litre` | `Piece` | `Pack`

### GST Rates
`0%` | `5%` | `12%` | `18%`

---

## Indexing Strategy

### High-Priority Indexes
```js
// Users — uniqueness
users.email: unique sparse
users.phone: unique sparse
users.googleId: unique sparse

// Products — discovery
products.slug: unique
products.sku: unique
products.category + products.status + products.isVisible: compound
products: text index (name, description, tags)

// Orders — queries
orders.userId + orders.createdAt: compound
orders.orderId: unique
orders.razorpayOrderId: unique sparse

// Cart — session
carts.userId: unique sparse
carts.sessionId: unique sparse
carts.expiresAt: TTL (30 days)

// OTP — security
otps.expiresAt: TTL (10 min)

// Refresh tokens
refresh_tokens.expiresAt: TTL
refresh_tokens.token: unique
```

---

## Data Snapshots (Denormalization Strategy)

To prevent broken order history when products are edited, these fields are **snapshotted** into embedded documents at purchase time:

| Snapshot Location | Snapshotted Fields |
|---|---|
| `orders.items[]` | name, image, sku, sellingPrice, mrpPrice, gstRate |
| `orders.shippingAddress` | fullName, phone, street, city, zip |
| `carts.items[]` | name, image, sellingPrice (live, refreshed on load) |
| `return_requests.items[]` | name, image, quantity |

---

## Session & Guest Cart Strategy

```
Guest visits site
  → sessionId cookie assigned
  → carts.sessionId = sessionId

Guest logs in
  → Guest cart merged into user cart
  → carts.sessionId cleared, carts.userId set
  → Duplicate products: quantities added

User logs out
  → Cart persists in DB against userId
  → On next login, cart restored
```
