const INR = (num) => {
  if (num == null || num <= 0) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};

const toNum = (val) => {
  if (val == null) return 0;
  const n = Number(String(val).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=420&q=90";

function resolveBadge(p, discountPercent) {
  const b = (p.badge || "").toUpperCase();
  if (p.isBestSeller || b === "BEST SELLER") return "BEST SELLER";
  if (p.isMostPopular || b === "MOST POPULAR") return "MOST POPULAR";
  if (p.isTrending || b === "TRENDING") return "TRENDING";
  if (discountPercent > 0) return `${discountPercent}% OFF`;
  if (p.isNewArrival || b === "NEW ARRIVAL") return "NEW ARRIVAL";
  if (b === "LIMITED STOCK") return "LIMITED STOCK";
  if (b === "ORGANIC") return "ORGANIC";
  return null;
}

export const BADGE_COLORS = {
  "BEST SELLER": "bg-[#fd761a]",
  "MOST POPULAR": "bg-[#2563eb]",
  "TRENDING": "bg-[#7c3aed]",
  "NEW ARRIVAL": "bg-[#16a34a]",
  "LIMITED STOCK": "bg-[#dc2626]",
  "ORGANIC": "bg-[#16a34a]",
};

export function badgeColor(badge) {
  if (!badge) return null;
  for (const [key, color] of Object.entries(BADGE_COLORS)) {
    if (badge.includes(key)) return color;
  }
  return "bg-[#dc2626]";
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function normalizeProduct(p) {
  if (!p) return defaultProduct();

  const name = p.name || "Premium Organic Product";

  const rawPrice = toNum(p.sellingPrice || p.price);
  const price = INR(rawPrice) || "₹0";

  const rawMrp = toNum(p.mrpPrice || p.mrp || p.comparePrice || p.oldPrice);
  const oldPrice = INR(rawMrp);
  const discountPercent = rawMrp > rawPrice ? Math.round(((rawMrp - rawPrice) / rawMrp) * 100) : 0;

  const image = p.images?.[0]?.url || p.image || FALLBACK_IMG;
  const rating = p.rating ?? 4.5;
  const reviewCount = p.reviewCount ?? p.reviews?.length ?? 0;
  const origin = p.origin || "";
  const category = p.category?.name || p.category || "General";
  const sizes = p.variants?.map((v) => v.size) || p.sizes || ["500g", "1kg"];
  const tags = p.tags || [];
  const badge = resolveBadge(p, discountPercent);
  const unit = p.unit || "piece";
  const description = p.description || "";

  const stockStatus = p.quantity != null ? (p.quantity > 0 ? "In Stock" : "Out of Stock") : null;
  const brand = p.brand || "";

  return {
    id: p._id || p.id || name,
    _id: p._id || p.id || `catalog-${slug(name)}`,
    name,
    brand,
    origin,
    image,
    price,
    oldPrice,
    mrp: oldPrice,
    rating,
    reviewCount,
    badge,
    tags,
    sizes,
    category,
    unit,
    discountPercent,
    description,
    stock: stockStatus,
    selectedSize: sizes[0],
  };
}

export function defaultProduct() {
  return {
    id: "",
    name: "Premium Organic Product",
    origin: "",
    image: FALLBACK_IMG,
    price: "₹0",
    oldPrice: null,
    mrp: null,
    rating: 4.5,
    reviewCount: 0,
    badge: null,
    tags: [],
    sizes: ["500g", "1kg"],
    category: "General",
    unit: "piece",
    discountPercent: 0,
    description: "",
    selectedSize: "500g",
  };
}
