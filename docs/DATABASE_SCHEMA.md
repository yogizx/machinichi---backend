# Machinichi — Complete Database Schema
> MongoDB Collections | Enterprise E-Commerce Platform
> Generated after full codebase analysis — Phase 0 + Phase 1

---

## COLLECTION 1: users

```js
{
  _id: ObjectId,
  fullName: String,             // required, trimmed
  email: String,                // lowercase, unique sparse index
  phone: String,                // unique sparse index (E.164 format)
  password: String,             // argon2 hash, select: false
  avatar: String,               // URL
  provider: Enum['local','google','firebase'],
  googleId: String,             // sparse unique
  firebaseUid: String,          // sparse unique
  role: Enum['customer','admin','super_admin'],
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  isBlocked: Boolean,
  lastLogin: Date,
  lastLoginIp: String,
  lastLoginDevice: String,
  failedLoginAttempts: Number,
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetAttempts: Number,
  passwordResetLockUntil: Date,
  notificationPreferences: {
    emailNotifications: Boolean,
    smsAlerts: Boolean,
    whatsappUpdates: Boolean
  },
  customerTier: Enum['Regular','Gold Member','Organic Tier'],
  totalOrders: Number,          // denormalized counter
  totalSpend: Number,           // denormalized
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `email` (unique sparse), `phone` (unique sparse), `googleId` (unique sparse), `firebaseUid` (unique sparse), `role`, `isBlocked`, `customerTier`

---

## COLLECTION 2: addresses

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users
  label: String,                // "Home", "Work", custom
  fullName: String,
  phoneNumber: String,          // 10 digits
  streetAddress: String,
  city: String,
  state: String,
  zipCode: String,              // 6 digits
  country: String,              // default "India"
  isDefault: Boolean,
  source: Enum['profile','checkout'],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `userId`, `userId + isDefault`

---

## COLLECTION 3: refresh_tokens

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users
  token: String,                // hashed
  tokenFamily: String,          // rotation detection
  isRevoked: Boolean,
  ipAddress: String,
  userAgent: String,
  expiresAt: Date,
  createdAt: Date
}
```

**Indexes:** `token` (unique), `userId`, `expiresAt` (TTL)

---

## COLLECTION 4: otps

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users
  type: Enum['email_verify','phone_verify','login','password_reset'],
  otp: String,                  // hashed 6-digit
  expiresAt: Date,              // 10 minutes
  isUsed: Boolean,
  attempts: Number,             // max 5
  createdAt: Date
}
```

**Indexes:** `userId + type`, `expiresAt` (TTL)

---

## COLLECTION 5: products

```js
{
  _id: ObjectId,
  name: String,                 // required
  slug: String,                 // unique, auto-generated
  sku: String,                  // unique, e.g. "MACH-FL-001"
  hsnCode: String,              // GST HSN code
  brand: String,
  category: ObjectId,           // ref: categories
  subcategory: String,

  // Descriptions
  description: String,
  shortDescription: String,

  // Pricing
  costPrice: Number,
  mrpPrice: Number,             // Maximum Retail Price
  sellingPrice: Number,
  comparePrice: Number,         // crossed-out price

  // Inventory
  quantity: Number,
  reservedQuantity: Number,     // held in active carts
  lowStockThreshold: Number,
  trackInventory: Boolean,

  // Physical attributes
  weight: Number,               // grams
  dimensions: {
    height: Number,
    width: Number,
    length: Number              // cm
  },

  // Tax
  gstRate: Number,              // percent: 0, 5, 12, 18
  gstCategory: String,

  // Unit
  unitType: Enum['Kilogram','Litre','Piece','Pack'],
  availableSizes: [String],     // ["100g","250g","500g","1kg","2kg","5kg","10kg"]

  // Variants
  variants: [{
    size: String,
    sku: String,
    mrpPrice: Number,
    sellingPrice: Number,
    quantity: Number,
    isAvailable: Boolean
  }],

  // Attributes (dynamic)
  attributes: Map,              // { "color": "Brown", "origin": "India" }
  tags: [String],               // ["ORGANIC", "GLUTEN-FREE"]
  badges: [String],             // ["BEST SELLER", "20% OFF"]

  // Media
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean,
    order: Number
  }],
  videos: [{ url: String, thumbnail: String }],

  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String]
  },

  // Status
  status: Enum['Active','Draft','Out of Stock','Archived'],
  isVisible: Boolean,
  isFeatured: Boolean,

  // Analytics (denormalized)
  totalSales: Number,
  totalRevenue: Number,
  averageRating: Number,
  reviewCount: Number,

  createdBy: ObjectId,          // ref: users (admin)
  updatedBy: ObjectId,
  deletedAt: Date,              // soft delete
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `slug` (unique), `sku` (unique), `category`, `status`, `isVisible`, `isFeatured`, text index on `name + description + tags`

---

## COLLECTION 6: categories

```js
{
  _id: ObjectId,
  name: String,                 // "Dry Fruits", "Grains", "Flour" etc.
  slug: String,                 // unique
  description: String,
  image: String,
  parentCategory: ObjectId,     // ref: categories (for subcategories)
  order: Number,                // display order
  isActive: Boolean,
  productCount: Number,         // denormalized
  seo: {
    metaTitle: String,
    metaDescription: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `slug` (unique), `parentCategory`, `isActive`

---

## COLLECTION 7: carts

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users (null for guest)
  sessionId: String,            // guest cart identifier
  items: [{
    productId: ObjectId,        // ref: products
    variantSize: String,        // "1KG", "500G" etc.
    name: String,               // snapshot
    image: String,              // snapshot
    mrpPrice: Number,
    sellingPrice: Number,
    quantity: Number,
    reservedAt: Date
  }],
  appliedCoupon: {
    code: String,
    discountType: Enum['Percentage','Fixed'],
    discountValue: Number,
    discountAmount: Number
  },
  scratchCardDiscount: {
    discountType: String,
    discountValue: Number,
    discountAmount: Number,
    label: String
  },
  subtotal: Number,             // recalculated
  totalDiscount: Number,
  shippingAmount: Number,
  total: Number,
  expiresAt: Date,              // TTL: 30 days
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `userId` (unique sparse), `sessionId` (unique sparse), `expiresAt` (TTL)

---

## COLLECTION 8: saved_for_later

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users
  items: [{
    productId: ObjectId,
    variantSize: String,
    name: String,
    image: String,
    sellingPrice: Number,
    quantity: Number,
    savedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `userId` (unique)

---

## COLLECTION 9: wishlists (favorites)

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users
  products: [{
    productId: ObjectId,
    variantSize: String,
    addedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `userId` (unique), `products.productId`

---

## COLLECTION 10: orders

```js
{
  _id: ObjectId,
  orderId: String,              // "MAC-82931" human-readable
  userId: ObjectId,             // ref: users

  // Items
  items: [{
    productId: ObjectId,
    variantSize: String,
    name: String,               // snapshot at purchase
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

  // Shipping
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
  scratchDiscount: {
    discountType: String,
    discountValue: Number,
    discountAmount: Number,
    label: String
  },
  promoDiscount: {
    code: String,
    discountType: String,
    discountValue: Number,
    discountAmount: Number,
    description: String
  },
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
  orderStatus: Enum['Placed','Packed','Shipped','In Transit','Out for Delivery','Delivered','Cancelled'],
  cancelReason: String,
  cancelledAt: Date,
  cancelledBy: Enum['user','admin'],

  // Tracking
  trackingNumber: String,
  trackingUrl: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  deliveryInstructions: {
    notes: String,
    preferredTime: String,
    alternatePhone: String,
    alternateInstructions: String
  },

  // Invoice
  invoiceUrl: String,
  invoiceNumber: String,

  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `orderId` (unique), `userId`, `orderStatus`, `paymentStatus`, `createdAt`, `razorpayOrderId` (sparse unique), `razorpayPaymentId` (sparse unique)

---

## COLLECTION 11: payments

```js
{
  _id: ObjectId,
  orderId: ObjectId,            // ref: orders
  userId: ObjectId,             // ref: users
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  amount: Number,               // paise
  currency: String,             // "INR"
  status: Enum['created','authorized','captured','refunded','failed'],
  method: String,               // card, upi, netbanking
  bank: String,
  wallet: String,
  vpa: String,                  // UPI VPA
  errorCode: String,
  errorDescription: String,
  webhookVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `orderId`, `razorpayOrderId` (unique), `razorpayPaymentId` (unique sparse), `status`

---

## COLLECTION 12: refunds

```js
{
  _id: ObjectId,
  orderId: ObjectId,
  paymentId: ObjectId,
  userId: ObjectId,
  razorpayRefundId: String,
  amount: Number,               // paise
  reason: String,
  status: Enum['Initiated','Processed','Failed'],
  returnRequestId: ObjectId,
  processedBy: ObjectId,        // ref: users (admin)
  processedAt: Date,
  createdAt: Date
}
```

**Indexes:** `orderId`, `razorpayRefundId` (unique sparse), `status`

---

## COLLECTION 13: return_requests

```js
{
  _id: ObjectId,
  returnId: String,             // "RT-8842"
  orderId: ObjectId,
  userId: ObjectId,
  items: [{
    orderItemIndex: Number,
    productId: ObjectId,
    name: String,
    quantity: Number,
    reason: Enum['Damaged Product','Wrong Item','Quality Issue','Late Delivery','Other'],
    images: [String]            // evidence URLs
  }],
  status: Enum['Processing','Escalated','Refunded','Rejected'],
  refundAmount: Number,
  refundType: Enum['Full','Partial','None'],
  assignedTo: ObjectId,         // ref: users (admin)
  adminNotes: [{
    note: String,
    addedBy: ObjectId,
    addedAt: Date
  }],
  timeline: [{
    stage: String,
    completedAt: Date,
    isActive: Boolean
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `returnId` (unique), `orderId`, `userId`, `status`

---

## COLLECTION 14: coupons

```js
{
  _id: ObjectId,
  code: String,                 // unique, uppercase
  description: String,
  discountType: Enum['Percentage','Fixed Amount'],
  discountValue: Number,
  maxDiscount: Number,          // cap for percentage coupons
  minSubtotal: Number,          // minimum order value
  usageLimit: Number,           // total times redeemable
  usageCount: Number,
  perUserLimit: Number,
  validFrom: Date,
  validUntil: Date,
  applicableCategories: [ObjectId],
  applicableProducts: [ObjectId],
  isActive: Boolean,
  createdBy: ObjectId,          // ref: users (admin)
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `code` (unique), `isActive`, `validUntil`

---

## COLLECTION 15: coupon_usages

```js
{
  _id: ObjectId,
  couponId: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,
  discountAmount: Number,
  usedAt: Date
}
```

**Indexes:** `couponId + userId` (compound), `orderId`

---

## COLLECTION 16: scratch_card_offers

```js
{
  _id: ObjectId,
  name: String,
  offerType: Enum['Scratch Card','Percentage','Fixed'],
  status: Enum['Active','Draft'],
  scratchCard: {
    productCondition: Enum['All Products','Selected Products'],
    eligibleProducts: [String],
    singleProduct: {
      discountType: String,
      discountValue: Number,
      label: String
    },
    multipleProducts: {
      discountType: String,
      discountValue: Number,
      label: String,
      minItems: Number
    }
  },
  products: [String],
  validFrom: Date,
  validUntil: Date,
  isActive: Boolean,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `status`, `isActive`, `validUntil`

---

## COLLECTION 17: reviews

```js
{
  _id: ObjectId,
  productId: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,            // verified purchase only
  rating: Number,               // 1-5
  title: String,
  body: String,
  images: [{ url: String, alt: String }],
  isVerifiedPurchase: Boolean,
  helpfulVotes: Number,
  reportedCount: Number,
  status: Enum['Pending','Approved','Rejected'],
  adminNote: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `productId`, `userId`, `orderId`, `status`, `rating`, `createdAt`

---

## COLLECTION 18: inventory_logs

```js
{
  _id: ObjectId,
  productId: ObjectId,
  variantSize: String,
  type: Enum['restock','sale','return','adjustment','reservation','release'],
  quantityBefore: Number,
  quantityChange: Number,
  quantityAfter: Number,
  reference: String,            // orderId, returnId etc.
  note: String,
  performedBy: ObjectId,        // ref: users (admin or system)
  createdAt: Date
}
```

**Indexes:** `productId`, `type`, `createdAt`

---

## COLLECTION 19: banners

```js
{
  _id: ObjectId,
  title: String,
  subtitle: String,
  imageUrl: String,
  mobileImageUrl: String,
  linkUrl: String,
  linkType: Enum['product','category','external','page'],
  position: Enum['hero','category-top','sidebar','popup'],
  order: Number,
  isActive: Boolean,
  validFrom: Date,
  validUntil: Date,
  clicks: Number,
  impressions: Number,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `position`, `isActive`, `order`

---

## COLLECTION 20: notifications

```js
{
  _id: ObjectId,
  userId: ObjectId,
  type: Enum['order_placed','order_shipped','order_delivered','return_update','coupon','promo','system'],
  title: String,
  message: String,
  data: Object,                 // orderId, couponCode etc.
  isRead: Boolean,
  channel: Enum['in_app','email','sms','whatsapp'],
  createdAt: Date
}
```

**Indexes:** `userId + isRead`, `createdAt`, `type`

---

## COLLECTION 21: bulk_orders

```js
{
  _id: ObjectId,
  userId: ObjectId,             // ref: users
  companyName: String,
  contactName: String,
  email: String,
  phone: String,
  items: [{
    productId: ObjectId,
    name: String,
    variantSize: String,
    quantity: Number,
    unitPrice: Number
  }],
  totalQuantity: Number,
  estimatedValue: Number,
  message: String,
  status: Enum['Enquiry','Quoted','Confirmed','Fulfilled','Cancelled'],
  quotedPrice: Number,
  adminNotes: String,
  assignedTo: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `userId`, `status`, `createdAt`

---

## COLLECTION 22: audit_logs

```js
{
  _id: ObjectId,
  userId: ObjectId,
  role: String,
  action: String,               // "admin.login", "order.cancel", "product.delete"
  resource: String,             // "Order", "Product", "User"
  resourceId: ObjectId,
  ipAddress: String,
  userAgent: String,
  before: Object,               // snapshot before change
  after: Object,                // snapshot after change
  createdAt: Date
}
```

**Indexes:** `userId`, `action`, `resource + resourceId`, `createdAt`

---

## COLLECTION 23: businesses (existing)

```js
{
  // Already implemented in backend/src/models/Business.ts
  // Used for B2B/partnership approvals (admin BusinessApprovals page)
}
```

---

## COLLECTION 24: analytics_events

```js
{
  _id: ObjectId,
  eventType: Enum['page_view','product_view','add_to_cart','purchase','search'],
  userId: ObjectId,             // optional
  sessionId: String,
  productId: ObjectId,          // optional
  categoryId: ObjectId,         // optional
  searchQuery: String,
  metadata: Object,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

**Indexes:** `eventType`, `userId`, `productId`, `createdAt` (TTL: 90 days)
