# Machinichi — Database Architecture
> Complete MongoDB database design — collections, schemas, relationships, indexes, and data flow
> Engine: MongoDB + Mongoose ODM · 24 Collections

---

## 1. Entity Relationship Overview

```
 ┌─────────────────────────────────────────────────────────────────┐
 │  USER (1) ──────< ADDRESS (many)                                │
 │  USER (1) ──────< REFRESH_TOKEN (many)                          │
 │  USER (1) ──────< LOGIN_AUDIT (many)                            │
 │  USER (1) ─────── CART (1:1, sparse-unique)                     │
 │  USER (1) ─────── WISHLIST (1:1, unique)                        │
 │  USER (1) ─────── SAVED_FOR_LATER (1:1, unique)                 │
 │  USER (1) ──────< ORDER (many)                                   │
 │  USER (1) ──────< REVIEW (many)                                  │
 │  USER (1) ──────< PAYMENT (many)                                 │
 │  USER (1) ──────< RETURN_REQUEST (many)                          │
 │  USER (1) ──────< BULK_ORDER (many)                              │
 │  USER (1) ──────< NOTIFICATION (many)                            │
 │                                                                   │
 │  CATEGORY (1) ──────< CATEGORY (self-ref via parentCategory)     │
 │  CATEGORY (1) ──────< PRODUCT (many)                              │
 │                                                                   │
 │  PRODUCT (1) ──────< INVENTORY_LOG (many)                        │
 │  PRODUCT (1) ──────< REVIEW (many)                                │
 │  PRODUCT ─── embedded ─── variants[]                              │
 │                                                                   │
 │  CART ─── embedded ─── items[] (ref: Product)                    │
 │  ORDER ─── embedded ─── items[] (denormalized Product snapshot)  │
 │  ORDER ─── embedded ─── shippingAddress (denormalized)           │
 │                                                                   │
 │  COUPON (1) ──────< COUPON_USAGE (many)                          │
 │  COUPON ─── applicableCategories[] → Category                    │
 │  COUPON ─── applicableProducts[] → Product                       │
 │                                                                   │
 │  PAYMENT (1) ──────< REFUND (many)                               │
 └─────────────────────────────────────────────────────────────────┘
```

---

## 2. Collection Summary

| # | Collection | Documents | Purpose | Key Indexes |
|---|-----------|-----------|---------|-------------|
| 1 | users | — | All users (customers + admins) | email, phone (unique sparse) |
| 2 | addresses | — | Delivery addresses | userId, userId+isDefault |
| 3 | refresh_tokens | — | JWT rotation & sessions | token (unique), userId, expiresAt TTL |
| 4 | otps | — | Email/phone verification | userId+type, expiresAt TTL |
| 5 | products | — | Product catalog with variants | slug, sku, category+status+isVisible |
| 6 | categories | — | 7 main categories + subcategories | slug, parentCategory |
| 7 | carts | — | Persistent cart (guest + user) | userId (unique sparse), sessionId TTL |
| 8 | saved_for_later | — | Save for later items | userId (unique) |
| 9 | wishlists | — | Favorite products | userId (unique), products.productId |
| 10 | orders | — | All purchase records | orderId, userId, orderStatus |
| 11 | payments | — | Razorpay transaction records | razorpayOrderId, razorpayPaymentId |
| 12 | refunds | — | Razorpay refund records | orderId, razorpayRefundId |
| 13 | return_requests | — | Return & refund management | returnId, orderId, userId |
| 14 | coupons | — | Promo codes & discounts | code (unique), isActive |
| 15 | coupon_usages | — | Per-user coupon tracking | couponId+userId, orderId |
| 16 | scratch_card_offers | — | Admin-configured offers | status, isActive |
| 17 | reviews | — | Product reviews (verified) | productId, userId, orderId, status |
| 18 | inventory_logs | — | Stock movement audit trail | productId, type, createdAt |
| 19 | banners | — | Homepage/category banners | position, isActive, order |
| 20 | notifications | — | In-app/email/SMS/WhatsApp | userId+isRead, createdAt |
| 21 | bulk_orders | — | B2B bulk order enquiries | userId, status, createdAt |
| 22 | audit_logs | — | Admin action audit trail | userId, action, resource+resourceId |
| 23 | businesses | — | B2B business approvals | — |
| 24 | analytics_events | — | Behavioral analytics | eventType, userId, productId |

---

## 3. Schema Details

### 3.1 Users
```js
{
  _id: ObjectId,
  fullName: String,                    // required, trimmed
  email: String,                       // lowercase, unique sparse
  phone: String,                       // E.164, unique sparse
  password: String,                    // argon2 hash, select: false
  avatar: String,                      // Cloudinary URL
  provider: Enum['local','google','firebase'],
  googleId: String,                    // sparse unique
  firebaseUid: String,                 // sparse unique
  role: Enum['customer','admin','super_admin'],  // default: customer
  isEmailVerified: Boolean,            // default: false
  isPhoneVerified: Boolean,            // default: false
  isBlocked: Boolean,                  // default: false
  lastLogin: Date,
  lastLoginIp: String,
  lastLoginDevice: String,
  failedLoginAttempts: Number,         // default: 0
  lockUntil: Date,                     // account lockout
  passwordResetToken: String,          // hashed
  passwordResetExpires: Date,
  passwordResetAttempts: Number,
  passwordResetLockUntil: Date,
  notificationPreferences: {           // saved to backend
    emailNotifications: Boolean,
    smsAlerts: Boolean,
    whatsappUpdates: Boolean
  },
  customerTier: Enum['Regular','Gold Member','Organic Tier'],
  totalOrders: Number,                 // denormalized counter
  totalSpend: Number,                  // denormalized
  createdAt: Date,
  updatedAt: Date
}
```

### 3.2 Products
```js
{
  _id: ObjectId,
  name: String,                        // required
  slug: String,                        // unique, URL-friendly
  sku: String,                         // unique, e.g. "MACH-FL-001"
  hsnCode: String,                     // GST HSN code
  brand: String,
  category: ObjectId,                  // ref: categories
  subcategory: String,
  subtitle: String,                    // short description for cards
  description: String,
  shortDescription: String,

  // Pricing
  costPrice: Number,
  mrpPrice: Number,
  sellingPrice: Number,
  comparePrice: Number,                // crossed-out price

  // Inventory
  quantity: Number,                    // current stock
  reservedQuantity: Number,            // held in active carts
  lowStockThreshold: Number,           // default: 10
  trackInventory: Boolean,             // default: true

  // Physical
  weight: Number,                      // grams
  dimensions: { height, width, length },
  unitType: Enum['Kilogram','Litre','Piece','Pack'],
  availableSizes: [String],           // ["100g","250g","500g","1kg"]

  // Variants
  variants: [{
    size: String,
    sku: String,
    mrpPrice: Number,
    sellingPrice: Number,
    quantity: Number,
    isAvailable: Boolean
  }],

  // Attributes
  attributes: Map,                     // dynamic key-value
  tags: [String],
  badges: [String],                   // ["BEST SELLER", "20% OFF"]

  // Media
  images: [{ url, alt, isPrimary, order }],
  videos: [{ url, thumbnail }],

  // SEO
  seo: { metaTitle, metaDescription, metaKeywords },

  // Status
  status: Enum['Active','Draft','Out of Stock','Archived'],
  isVisible: Boolean,
  isFeatured: Boolean,
  publishStatus: Enum['unlisted','published','archived'],
  countryOfOrigin: String,
  organicCertification: String,

  // Analytics (denormalized)
  totalSales: Number,
  totalRevenue: Number,
  averageRating: Number,
  reviewCount: Number,

  createdBy: ObjectId,                 // ref: users (admin)
  updatedBy: ObjectId,
  deletedAt: Date,                     // soft delete
  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 Orders
```js
{
  _id: ObjectId,
  orderId: String,                     // "MAC-82931" human-readable
  userId: ObjectId,                    // ref: users

  // Denormalized items snapshot
  items: [{
    productId: ObjectId,
    variantSize: String,
    name: String,                      // snapshotted at purchase
    image: String,
    sku: String,
    mrpPrice: Number,
    sellingPrice: Number,
    quantity: Number,
    gstRate: Number,
    gstAmount: Number,
    lineTotal: Number,
    returnStatus: Enum['None','Requested','Approved','Rejected','Refunded']
  }],

  // Denormalized shipping address
  shippingAddress: {
    fullName: String,
    phoneNumber: String,
    streetAddress: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  shippingMethod: Enum['standard','express'],
  shippingAmount: Number,

  // Pricing
  subtotal: Number,
  totalDiscount: Number,
  scratchDiscount: { discountType, discountValue, discountAmount, label },
  promoDiscount: { code, discountType, discountValue, discountAmount, description },
  cgst: Number,
  sgst: Number,
  igst: Number,
  totalGst: Number,
  orderTotal: Number,

  // Payment
  paymentStatus: Enum['Pending','Paid','Failed','Refunded','PartialRefund'],
  paymentMethod: Enum['razorpay','cod','upi','netbanking','card'],
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,

  // Status
  orderStatus: Enum['Pending','Packed','Shipped','In Transit','Out for Delivery','Delivered','Cancelled'],
  cancelReason: String,
  cancelledAt: Date,
  cancelledBy: Enum['user','admin'],

  // Tracking
  trackingNumber: String,
  trackingUrl: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  deliveryInstructions: { notes, preferredTime, alternatePhone },

  // Invoice
  invoiceUrl: String,
  invoiceNumber: String,

  createdAt: Date,
  updatedAt: Date
}
```

---

## 4. Indexing Strategy

### Unique Indexes (Data Integrity)
```js
users:     { email: 1 }        unique sparse
users:     { phone: 1 }        unique sparse
users:     { googleId: 1 }     unique sparse
users:     { firebaseUid: 1 }  unique sparse
products:  { slug: 1 }         unique
products:  { sku: 1 }          unique
orders:    { orderId: 1 }      unique
orders:    { razorpayOrderId: 1 } unique sparse
payments:  { razorpayOrderId: 1 } unique
payments:  { razorpayPaymentId: 1 } unique sparse
refunds:   { razorpayRefundId: 1 } unique sparse
coupons:   { code: 1 }         unique
categories: { slug: 1 }        unique
return_requests: { returnId: 1 } unique
```

### Compound Indexes (Query Performance)
```js
// Products — common query patterns
products: { category: 1, sellingPrice: 1, averageRating: -1 }
products: { category: 1, brand: 1 }
products: { sellingPrice: 1, discountPercent: -1 }
products: { tags: 1, isActive: 1 }
products: { publishStatus: 1, isVisible: 1, status: 1 }

// Orders — listing + filtering
orders:   { userId: 1, createdAt: -1 }
orders:   { orderStatus: 1, createdAt: -1 }
orders:   { paymentStatus: 1 }

// Users — admin queries
users:    { role: 1, customerTier: 1 }
users:    { isBlocked: 1 }

// Reviews
reviews:  { productId: 1, status: 1, createdAt: -1 }
reviews:  { userId: 1, orderId: 1 }

// Addresses
addresses: { userId: 1, isDefault: 1 }

// Inventory
inventory_logs: { productId: 1, createdAt: -1 }
inventory_logs: { type: 1, createdAt: -1 }
```

### TTL Indexes (Auto-Expiry)
```js
carts:          { expiresAt: 1 }  expireAfterSeconds: 0  // 30 days
otps:           { expiresAt: 1 }  expireAfterSeconds: 0  // 10 min
refresh_tokens: { expiresAt: 1 }  expireAfterSeconds: 0
analytics_events: { createdAt: 1 } expireAfterSeconds: 7776000  // 90 days
```

### Text Indexes (Full-Text Search)
```js
products: { name: 'text', description: 'text', tags: 'text' }
// Weight: name: 10, tags: 5, description: 1
```

---

## 5. Data Denormalization Strategy

To prevent broken order/product history when data changes, these fields are snapshotted:

| Location | Snapshotted Fields | Reason |
|----------|-------------------|--------|
| Order.items[] | name, image, sku, sellingPrice, mrpPrice, gstRate | Order must show what customer paid |
| Order.shippingAddress | fullName, phone, street, city, state, zip | Address may change later |
| Cart.items[] | name, image, sellingPrice (refreshed on load) | UX consistency |
| ReturnRequest.items[] | name, image, quantity | Evidence for returns team |

---

## 6. Cart → Checkout → Order Data Flow

```
Cart.items[] (source of truth for intent to buy)
  │
  ▼
Checkout Summary (computed from Cart + live Product prices)
  │
  ▼
Order created (snapshot of Cart.items + shippingAddress)
  └── Items: denormalized product data at purchase time
  └── Shipping address: denormalized
  └── Coupon: embedded discount snapshot
  │
  ▼
Payment (Razorpay)
  │
  ├── Captured → Order.paymentStatus = Paid, stock deducted
  └── Failed → Stock released, order cancelled
  │
  ▼
Fulfillment → Packed → Shipped → Delivered
```

### Guest Cart → User Cart Merge
```
Guest adds items → sessionId cookie assigned
Guest logs in    → Guest cart merged into user cart
                   Duplicate products: quantities added
                   sessionId cleared, userId set
User logs out    → Cart persists in DB against userId
                   On next login, cart restored
```

---

## 7. Product Lifecycle

```
Draft → Inventory Set → Listing Configured → Published → Archived
  │          │                │                    │           │
  │    stock added      description, SEO,     visible on     removed
  │                     images, badges         storefront    from store
```

### Status Flow
```
status:        Draft → Active → Out of Stock → Archived
publishStatus: unlisted → published → archived
isVisible:     false → true → false
```

---

## 8. Key Design Decisions

### Why Denormalization?
- **Order items**: Standard e-commerce practice — an order must show what the customer actually paid, even if the product is later edited or deleted
- **Shipping address**: Snapshotted so order records remain accurate if user updates their address later
- **Not a duplication bug**: Intentional, documented design pattern

### Why Two Status Fields on Products?
- `status`: Inventory-driven (Draft, Active, Out of Stock, Archived)
- `publishStatus`: Listing-driven (unlisted, published, archived)
- Both must be in correct state for product to appear on storefront

### Why TTL Indexes?
- Abandoned guest carts auto-expire after 30 days
- OTPs auto-delete after 10 minutes (security)
- Analytics data self-prunes at 90 days (data retention policy)

---

## 9. Known Issues (From Audit)

| Issue | Severity | Fix Timeline |
|-------|----------|-------------|
| `Order.status` + `Order.orderStatus` duplicate fields | 🟠 High | Phase 1 — collapse to single enum |
| `Order.orderTotal` vs `Order.totalAmount` naming | 🟠 Medium | Phase 1 — pick one, deprecate |
| No SearchHistory collection | 🟡 Medium | Phase 3 — create new collection |
| No atomic inventory operations | 🔴 Critical | Phase 1 — use findOneAndUpdate |
| No stock restoration on cancel/fail | 🔴 Critical | Phase 1 — add releaseStock calls |

---

## 10. Enums Reference

| Enum | Values |
|------|--------|
| User Roles | `customer` · `admin` · `super_admin` |
| Customer Tiers | `Regular` · `Gold Member` · `Organic Tier` |
| Product Status | `Active` · `Draft` · `Out of Stock` · `Archived` |
| Publish Status | `unlisted` · `published` · `archived` |
| Order Status | `Pending` → `Packed` → `Shipped` → `In Transit` → `Out for Delivery` → `Delivered` · `Cancelled` |
| Payment Status | `Pending` · `Paid` · `Failed` · `Refunded` · `PartialRefund` |
| Payment Methods | `razorpay` · `cod` · `upi` · `netbanking` · `card` |
| Return Status | `Processing` · `Escalated` · `Refunded` · `Rejected` |
| Refund Status | `Initiated` · `Processed` · `Failed` |
| Shipping Methods | `standard` (₹50, 3-5 days) · `express` (₹120, 1 day) |
| Categories (7) | `Dry Fruits` · `Grains` · `Flour` · `Ready To Eat` · `Juices` · `Pooja Items` · `Organic Products` |
| Unit Types | `Kilogram` · `Litre` · `Piece` · `Pack` |
| GST Rates | `0%` · `5%` · `12%` · `18%` |
| Auth Provider | `local` · `google` · `firebase` |
| Notification Channel | `in_app` · `email` · `sms` · `whatsapp` |
| Banner Position | `hero` · `category-top` · `sidebar` · `popup` |
| Review Status | `Pending` · `Approved` · `Rejected` |
| Inventory Log Type | `restock` · `sale` · `return` · `adjustment` · `reservation` · `release` |
| Bulk Order Status | `Enquiry` · `Quoted` · `Confirmed` · `Fulfilled` · `Cancelled` |
| Analytics Event | `page_view` · `product_view` · `add_to_cart` · `purchase` · `search` |
