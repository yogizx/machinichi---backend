import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive, ArrowUpDown, BadgeCheck, BadgeInfo, BarChart3, Bookmark, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Copy, Droplet, Edit3, Eye, EyeOff, ExternalLink, FileText, Grid, Grip, GripVertical,
  ImageIcon, Loader2, Globe, Package, Plus, RefreshCw, Save, Search, Settings, ShieldCheck,
  ShoppingCart, Star, Trash2, Truck, Upload, Video, X, AlertTriangle,
  Clock, TrendingUp, DollarSign, Activity, Heart, Users, MoreVertical, Leaf, CheckSquare, Square,
  Wand2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "../components/AdminLayout";
import api from "../../services/api";

const API = api;

const TABS = [
  { key: "all", label: "All Products", icon: Package },
  { key: "published", label: "Published", icon: CheckCircle2 },
  { key: "unlisted", label: "Draft / Unlisted", icon: EyeOff },
  { key: "archived", label: "Archived", icon: Archive },
  { key: "detailed", label: "Detailed View", icon: BarChart3 },
];

const BADGE_OPTIONS = [
  "Best Seller", "Trending", "New Arrival", "Most Popular",
  "Limited Offer", "Flash Sale", "Featured", "Recommended",
];

const VARIANT_TABS = [
  { key: "material", label: "Material", icon: Droplet },
  { key: "color", label: "Color", icon: Droplet },
  { key: "size", label: "Size", icon: Package },
  { key: "unit", label: "Unit", icon: Settings },
];

const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"];

const TWITTER_CARD_OPTIONS = ["summary", "summary_large_image", "app", "player"];

const REQUIRED_FOR_PUBLISH = [
  { field: "name", label: "Product Name" },
  { field: "category", label: "Category" },
  { field: "brand", label: "Brand" },
  { field: "description", label: "Description" },
  { field: "sellingPrice", label: "Price" },
  { field: "mrpPrice", label: "MRP" },
  { field: "images", label: "At least one image" },
  { field: "sku", label: "SKU" },
  { field: "hsnCode", label: "HSN Code" },
];

const INR = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—";
function genKey() { return Math.random().toString(36).slice(2, 10); }
function generateSlug(text) {
  return (text || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function AIButton({ loading, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#fd761a]/30 bg-[#fff1e6] px-2.5 text-[10px] font-black text-[#fd761a] hover:bg-[#ffe4cc] transition disabled:opacity-50 ml-2">
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
      AI Generate
    </button>
  );
}

function DetailedProductCard({ product, analytics, onEdit, onUnlist, onPublish, onViewUsers }) {
  const img = product.images?.[0]?.url;
  const catName = product.category?.name || "General";
  const price = product.sellingPrice;
  const mrp = product.mrpPrice;
  const discount = product.discountPercent || (mrp && price ? Math.round(((mrp - price) / mrp) * 100) : 0);
  const views = analytics?.totalUniqueViews ?? 0;
  const cartUsers = analytics?.currentCartCount ?? analytics?.totalUniqueCartUsers ?? 0;
  const wishlistCount = analytics?.wishlistCount ?? 0;
  const cartConversion = analytics?.cartConversionRate;
  const weeklyGrowth = analytics?.weeklySalesGrowth;
  const salesThisWeek = analytics?.salesThisWeek ?? 0;
  const prevWeekSales = analytics?.previousWeekSales ?? 0;
  const stock = analytics?.stock || { current: product.warehouseStock ?? product.quantity ?? 0, reserved: product.reservedQuantity ?? 0, available: Math.max(0, (product.warehouseStock ?? product.quantity ?? 0) - (product.reservedQuantity ?? 0)) };
  const available = stock.available ?? 0;
  const lowThreshold = product.lowStockThreshold || 10;
  const maxStock = product.maxStock || Math.max(available * 1.2, 20);
  const stockPct = Math.min(100, Math.max(4, Math.round((available / Math.max(maxStock, 1)) * 100)));
  const isLowStock = available > 0 && available <= lowThreshold;
  const isOutOfStock = available <= 0;
  const packLabel = product.variants?.[0]?.size || product.availableSizes?.[0] || (product.weight ? `${product.weight}${product.unitType ? ` ${product.unitType}` : "g"}` : "1 Pack");
  const statusBadge = product.publishStatus === "published" ? { label: "Published", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" } : product.publishStatus === "archived" ? { label: "Archived", cls: "bg-gray-100 text-gray-600 border-gray-200" } : { label: "Draft", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  const badgeNatural = (product.badges || []).includes("Natural") || (product.tags || []).includes("natural");
  let growthDisplay = null;
  let growthSub = "Vs last week";
  if (weeklyGrowth === null || weeklyGrowth === undefined) {
    growthDisplay = null;
  } else if (prevWeekSales === 0 && salesThisWeek > 0) {
    growthDisplay = "New";
    growthSub = "New sales";
  } else {
    growthDisplay = `${Number(weeklyGrowth) >= 0 ? "+" : ""}${Number(weeklyGrowth).toFixed(2)}%`;
  }
  const hasHistoricalSales = !(prevWeekSales === 0 && salesThisWeek === 0);
  const conversionVal = cartConversion !== null && cartConversion !== undefined ? `${Number(cartConversion).toFixed(2)}%` : null;
  return (
    <div className="rounded-[20px] border border-[#efe5dc] bg-[#fffdf9] shadow-[0_4px_24px_rgba(58,17,0,0.06)] overflow-hidden flex flex-col">
      <div className="p-5 pb-4">
        <div className="flex gap-4">
          <div className="h-[86px] w-[86px] rounded-xl border border-[#efe5dc] bg-white overflow-hidden shrink-0 grid place-items-center">
            {img ? <img src={img} alt={product.name} className="h-full w-full object-cover" /> : <ImageIcon size={22} className="text-[#c7bab0]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-black leading-tight text-[#21150f] line-clamp-2">{product.name}</h3>
              <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusBadge.cls}`}>{statusBadge.label}</span>
            </div>
            <p className="mt-0.5 text-[11.5px] font-bold text-[#9a8b82] truncate">{product.brand || "—"} • {catName}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[18px] font-black text-[#21150f]">{INR(price)}</span>
              {mrp && mrp > price && <span className="text-[13px] font-bold text-[#9a8b82] line-through">{INR(mrp)}</span>}
              {discount > 0 && <span className="rounded-full bg-[#fff1e6] px-2 py-0.5 text-[10px] font-black text-[#fd6b12]">-{discount}%</span>}
              {badgeNatural && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black tracking-wider text-emerald-700"><Leaf size={12} /> NATURAL</span>}
            </div>
            <p className="mt-2 text-[11px] font-bold text-[#796d66]">Pack: {packLabel} <span className="mx-1.5 text-[#c7bab0]">•</span> SKU: {product.sku || "—"}</p>
            <p className="text-[11px] font-bold text-[#796d66]">HSN: {product.hsnCode || "—"}</p>
            {product.variants?.length > 0 && <p className="mt-1 text-[10.5px] font-bold text-[#9a8b82]">{product.variants.length} variant{product.variants.length>1?"s":""} • {product.variants.map(v=>v.size||v.color).filter(Boolean).slice(0,3).join(", ")}</p>}
          </div>
        </div>
      </div>
      <div className="mx-4 grid grid-cols-3 divide-x divide-[#f3ece5] overflow-hidden rounded-2xl border border-[#f3ece5] bg-white">
        <div className="px-3 py-3 text-center">
          <div className="mx-auto flex items-center justify-center gap-1.5 text-[11px] font-black text-[#5c514b]"><span className="grid h-6 w-6 place-items-center rounded-full bg-sky-50 text-sky-600"><Eye size={13} /></span> Views</div>
          <div className="mt-1 text-[18px] font-black text-[#2563eb]">{views}</div>
          <div className="text-[10px] font-bold text-[#9a8b82]">Unique viewers</div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="mx-auto flex items-center justify-center gap-1.5 text-[11px] font-black text-[#5c514b]"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600"><ShoppingCart size={13} /></span> Cart</div>
          <div className="mt-1 text-[18px] font-black text-emerald-600">{cartUsers}</div>
          <div className="text-[10px] font-bold text-[#9a8b82]">Unique users</div>
        </div>
        <div className="px-3 py-3 text-center">
          <div className="mx-auto flex items-center justify-center gap-1.5 text-[11px] font-black text-[#5c514b]"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-50 text-orange-500"><TrendingUp size={13} /></span> Growth</div>
          {growthDisplay === null ? <div className="mt-1 text-[11px] font-black leading-tight text-[#9a8b82]">No data</div> : <div className={`mt-1 text-[16px] font-black ${String(growthDisplay).includes("-") ? "text-rose-600" : String(growthDisplay)==="New" ? "text-emerald-600" : "text-[#fd761a]"}`}>{growthDisplay}</div>}
          <div className="text-[10px] font-bold text-[#9a8b82]">{growthDisplay===null ? "Needs sales" : growthSub}</div>
        </div>
      </div>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#f3ece5] bg-white px-3 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#5c514b]"><span className="grid h-6 w-6 place-items-center rounded-full bg-purple-50 text-purple-600"><Activity size={13} /></span> Conversion</div>
          {conversionVal ? (<><div className="mt-2 text-[20px] font-black text-purple-600">{conversionVal}</div><div className="text-[10px] font-bold text-[#9a8b82]">From cart to purchase</div></>) : (<><div className="mt-2 text-[13px] font-black text-[#9a8b82]">No conversions yet</div><div className="text-[10px] font-bold text-[#9a8b82]">Needs cart activity</div></>)}
        </div>
        <div className="rounded-2xl border border-[#f3ece5] bg-white px-3 py-3 flex flex-col items-center justify-center text-center">
          {hasHistoricalSales ? (<><span className="grid h-6 w-6 place-items-center rounded-full bg-sky-50 text-sky-600"><TrendingUp size={13} /></span><div className="mt-2 text-[12px] font-black text-[#21150f]">Weekly sales: {salesThisWeek}</div><div className="text-[10px] font-bold text-[#9a8b82]">Prev week: {prevWeekSales}</div></>) : (<><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f3ece5] text-[#9a8b82]"><TrendingUp size={14} /></span><div className="mt-2 text-[13px] font-black text-[#21150f]">No historical data</div><div className="text-[10px] font-bold text-[#9a8b82]">Needs more sales</div></>)}
        </div>
      </div>
      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#f3ece5] bg-[#fff8f0] px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-[12px] font-black text-[#21150f]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#ffe9d6] text-[#9b4b09]"><Package size={14} /></span> Stock</div>
          <div className={`mt-2 text-[28px] font-black leading-none ${isOutOfStock ? "text-rose-600" : isLowStock ? "text-amber-600" : "text-[#b45309]"}`}>{available}</div>
          <div className="text-[11px] font-bold text-[#9a8b82]">Available</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f3ece5] overflow-hidden"><div className={`h-full rounded-full transition-all ${isOutOfStock ? "bg-rose-500" : isLowStock ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${isOutOfStock ? 8 : stockPct}%` }} /></div>
          <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-black">
            {isOutOfStock ? <span className="text-rose-600">Out of stock</span> : isLowStock ? <><span className="text-amber-600">Low</span><span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-700"><AlertTriangle size={10} /> Low Alert</span></> : <span className="text-emerald-600">Good</span>}
            {product.trackInventory === false && <span className="ml-auto text-[9px] font-bold text-[#9a8b82]">Not tracked</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-[#f3ece5] bg-[#fff1f5] px-3.5 py-3 flex flex-col">
          <div className="flex items-center gap-1.5 text-[12px] font-black text-[#21150f]"><span className="grid h-7 w-7 place-items-center rounded-full bg-pink-100 text-pink-600"><Heart size={14} /></span> Wishlist</div>
          <div className="mt-2 text-[28px] font-black leading-none text-[#e11d48]">{wishlistCount}</div>
          <div className="text-[11px] font-bold text-[#9a8b82]">Total users</div>
          <button onClick={() => onViewUsers && onViewUsers(product)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-pink-100 px-3 py-2 text-[12px] font-black text-[#be123c] hover:bg-pink-200 transition"><Users size={14} /> View Users</button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-[#f5eee8] bg-[#faf8f5] px-4 py-3">
        <button onClick={() => onEdit(product)} className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#e5d8cd] bg-white text-[11.5px] font-black text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] transition"><Edit3 size={13} /> Edit</button>
        {product.publishStatus === "published" ? (<button onClick={() => onUnlist(product._id)} className="flex-1 inline-flex h-9 items-center justify-center rounded-xl border border-[#e5d8cd] bg-white text-[11.5px] font-black text-amber-700 hover:bg-amber-50">Unlist</button>) : (<button onClick={() => onPublish(product)} className="flex-1 inline-flex h-9 items-center justify-center rounded-xl bg-[#3a1100] text-[11.5px] font-black text-white hover:bg-[#fd761a]">Publish</button>)}
        <button className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5d8cd] bg-white text-[#9a8b82] hover:text-[#3a1100]"><MoreVertical size={14} /></button>
      </div>
    </div>
  );
}

export default function ProductListing({ onAdminLogout, favoriteProducts = new Set() }) {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const highlightParam = searchParams.get("highlight") || "";
  const initialLoadRef = useRef(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [listingForm, setListingForm] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showListingModal, setShowListingModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [draggedVariant, setDraggedVariant] = useState(null);
  const [analyticsMap, setAnalyticsMap] = useState({});
  const [viewUsersModal, setViewUsersModal] = useState(null);
  const [aiGenerating, setAiGenerating] = useState({});
  const [activeVariantTab, setActiveVariantTab] = useState(null);
  const [serviceCenterEnabled, setServiceCenterEnabled] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const limit = 20;
  const abortControllerRef = useRef(null);
  const isDetailedView = tab === "detailed";
  const filteredProducts = useMemo(() => {
    let fp = products;
    if (stockFilter === "low") fp = fp.filter(p => p.quantity <= (p.lowStockThreshold || 10) && p.quantity > 0);
    else if (stockFilter === "out") fp = fp.filter(p => p.quantity <= 0);
    else if (stockFilter === "featured") fp = fp.filter(p => p.isFeatured);
    if (brandFilter) fp = fp.filter(p => p.brand?.toLowerCase().includes(brandFilter.toLowerCase()));
    return fp;
  }, [products, stockFilter, brandFilter]);

  const fetchProducts = async (p = page, skipSearch = false, isSilent = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: p, limit, sort: sortBy, order: sortOrder });
      if (tab !== "all" && tab !== "detailed") params.set("publishStatus", tab);
      if (search && !skipSearch) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const { data } = await API.get(`/admin/products?${params}`, { signal: controller.signal });
      if (data.success) {
        setProducts(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        if (!isSilent) setLoading(false);
        const ids = (data.data || []).map((p) => p._id).filter(Boolean);
        if (ids.length > 0) {
          API.get(`/analytics/products?ids=${ids.join(",")}`)
            .then(({ data: analyticsData }) => {
              if (analyticsData?.success) setAnalyticsMap(analyticsData.data || {});
            })
            .catch(() => { /* analytics unavailable */ });
        }
      }
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
      setError(e.response?.data?.message || "Failed to load products");
    } finally {
      if (!isSilent && !controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await API.get("/categories");
      if (data.success) setCategories(data.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCategories(); }, []);
  
  useEffect(() => {
    const skipSearch = initialLoadRef.current && highlightParam;
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchProducts(1, skipSearch);
      if (skipSearch) initialLoadRef.current = false;
    }, skipSearch ? 0 : 450);
    return () => clearTimeout(delayDebounceFn);
  }, [search, tab, categoryFilter, sortBy, sortOrder]);

  useEffect(() => { fetchProducts(); }, [page]);

  useEffect(() => {
    const onFocus = () => { fetchProducts(page, false, true); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [page]);

  const silentFetchRef = useRef(fetchProducts);
  silentFetchRef.current = fetchProducts;
  useEffect(() => {
    const interval = setInterval(() => silentFetchRef.current(page, false, true), 30000);
    return () => clearInterval(interval);
  }, [page]);

  // Real-time SSE for Detailed View — updates only affected card without full reload
  useEffect(() => {
    if (!isDetailedView || filteredProducts.length === 0) return;
    const ids = filteredProducts.map(p => p._id).filter(Boolean).join(",");
    if (!ids) return;
    let es;
    try {
      const base = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://machinichi-backend.onrender.com/api" : "http://localhost:3000/api")).replace(/\/api\/?$/, "");
      es = new EventSource(`${base}/api/realtime/product-analytics/stream?ids=${ids}`);
      es.onmessage = async (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (!payload.productId) return;
          const { data } = await API.get(`/analytics/products?ids=${payload.productId}`);
          if (data?.success && data.data?.[payload.productId]) {
            setAnalyticsMap(prev => ({ ...prev, [payload.productId]: data.data[payload.productId] }));
          }
        } catch {}
      };
      es.onerror = () => { es?.close(); };
    } catch {}
    return () => { try { es?.close(); } catch {} };
  }, [isDetailedView, filteredProducts.map(p => p._id).join(",")]);

  const normalizeVariantImages = (imagesArr) => {
    const slots = [null, null, null, null];
    if (Array.isArray(imagesArr)) {
      for (let i = 0; i < 4; i++) {
        if (imagesArr[i]) {
          slots[i] = typeof imagesArr[i] === "string"
            ? { url: imagesArr[i], alt: "", _key: genKey() }
            : { url: imagesArr[i].url || "", alt: imagesArr[i].alt || "", _key: genKey() };
        }
      }
    }
    return slots;
  };

  const normalizeVariantTypeImages = (vtImages) => {
    const res = {};
    ["material", "color", "size", "unit"].forEach((type) => {
      let items = vtImages?.[type];
      if (items && !Array.isArray(items) && typeof items === "object" && items.url) {
        items = [items];
      }
      if (!Array.isArray(items)) {
        items = [];
      }
      const slots = [null, null, null, null];
      for (let i = 0; i < 4; i++) {
        if (items[i]) {
          slots[i] = typeof items[i] === "string"
            ? { url: items[i], alt: "", _key: genKey() }
            : { url: items[i].url || "", alt: items[i].alt || "", _key: genKey() };
        }
      }
      res[type] = slots;
    });
    return res;
  };

  const normalizeProductForForm = (product) => {
    const rawVariants = Array.isArray(product.variants) ? product.variants : [];
    const materialVariants = rawVariants.filter(v => v.attributes?.variantType === "material" || v._variantType === "material" || (!v.attributes?.variantType && (v.material || v.materialValue || v.attributes?.material)));
    const colorVariants = rawVariants.filter(v => v.attributes?.variantType === "color" || v._variantType === "color" || (!v.attributes?.variantType && (v.color || v.colorName || v.colorValue)));
    const sizeVariants = rawVariants.filter(v => v.attributes?.variantType === "size" || v._variantType === "size" || (!v.attributes?.variantType && (v.size || v.sizeValue) && !v.color && !v.material));
    const unitVariants = rawVariants.filter(v => v.attributes?.variantType === "unit" || v._variantType === "unit" || (!v.attributes?.variantType && (v.unit || v.unitValue || v.attributes?.unit) && !v.color && !v.material && !v.size));
    const configuredType = product.variantType || (materialVariants.length ? "material" : colorVariants.length ? "color" : sizeVariants.length ? "size" : unitVariants.length ? "unit" : "material");
    return {
      name: product.name || "", brand: product.brand || "",
      category: product.category?._id || product.category || "",
      subcategory: product.subCategory?._id || product.subCategory || "",
      description: product.description || "", shortDescription: product.shortDescription || "",
      sku: product.sku || "", hsnCode: product.hsnCode || "",
      sellingPrice: product.sellingPrice || "", mrpPrice: product.mrpPrice || "",
      costPrice: product.costPrice || "", purchasePrice: product.purchasePrice || "",
      wholesalePrice: product.wholesalePrice || "", distributorPrice: product.distributorPrice || "",
      dealerPrice: product.dealerPrice || "", offerPrice: product.offerPrice || "",
      discountPercent: product.discountPercent || 0, gstRate: product.gstRate || 5,
      currency: product.currency || "INR",
      priceEffectiveFrom: product.priceEffectiveFrom ? new Date(product.priceEffectiveFrom).toISOString().split("T")[0] : "",
      priceEffectiveTo: product.priceEffectiveTo ? new Date(product.priceEffectiveTo).toISOString().split("T")[0] : "",
      tags: product.tags?.join(", ") || "",
      slug: product.slug || "",
      seo: {
        metaTitle: product.seo?.metaTitle || "",
        metaDescription: product.seo?.metaDescription || "",
        metaKeywords: product.seo?.metaKeywords?.join(", ") || "",
        focusKeyword: product.seo?.focusKeyword || "",
        canonicalUrl: product.seo?.canonicalUrl || "",
        ogTitle: product.seo?.ogTitle || "",
        ogDescription: product.seo?.ogDescription || "",
        twitterCard: product.seo?.twitterCard || "summary_large_image",
        structuredData: product.seo?.structuredData || "",
        imageAlt: product.seo?.imageAlt || "",
        imageTitle: product.seo?.imageTitle || "",
        breadcrumb: product.seo?.breadcrumb || "",
      },
      productWeight: product.weight || "",
      productDimensions: product.dimensions || { height: "", width: "", length: "" },
      packageWeight: product.packageWeight || "",
      packageDimensions: product.packageDimensions || { height: "", width: "", length: "" },
      packageDimensionsText: product.measurement?.dimensionsText || "",
      shippingClass: product.shippingClass || "",
      shippingCost: product.shippingCost || "",
      deliveryTime: product.deliveryTime || "",
      pickupAvailable: product.pickupAvailable || false,
      freeShipping: product.freeShipping || false,
      codAvailable: product.codAvailable !== false,
      isFragile: product.isFragile || false,
      isHazardous: product.isHazardous || false,
      warrantyPeriod: product.warranty?.period || "",
      warrantyType: product.warranty?.type || "Manufacturer",
      warrantyTerms: product.warranty?.terms || "",
      warrantyDocument: product.warranty?.documentUrl ? { url: product.warranty.documentUrl, name: "warranty-document" } : null,
      isReturnable: product.returnPolicy?.isReturnable !== false,
      returnPeriodDays: product.returnPolicy?.returnPeriodDays || 7,
      replacementAvailable: product.returnPolicy?.replacementAvailable || false,
      installationRequired: product.returnPolicy?.installationRequired || false,
      serviceCenter: product.returnPolicy?.serviceCenter || "",
      images: product.images?.map(i => ({ ...i, _key: genKey() })) || [],
      badges: product.badges || [],
      badge: product.badges?.[0] || "",
      visibilityFlag: product.isFeatured ? "isFeatured" : product.isTrending ? "isTrending" : product.isBestSeller ? "isBestSeller" : product.isNewArrival ? "isNewArrival" : product.isLimitedOffer ? "isLimitedOffer" : product.isRecommended ? "isRecommended" : "",
      isFeatured: product.isFeatured || false,
      isTrending: product.isTrending || false,
      isBestSeller: product.isBestSeller || false,
      isNewArrival: product.isNewArrival || false,
      isLimitedOffer: product.isLimitedOffer || false,
      isRecommended: product.isRecommended || false,
      isFlashSale: product.isFlashSale || false,
      relatedProductsCategory: product.relatedProductsCategory?._id || product.relatedProductsCategory || product.category?._id || product.category || "",
      productHighlights: { brand: product.brand || "", ...(product.productHighlights || {}) },
      additionalFeatures: product.additionalFeatures || [],
      aboutThisProduct: Array.from({ length: 6 }, (_, i) => (product.aboutThisProduct?.[i] || "")),
      measurement: product.measurement || { packageWeight: "", height: "", numberOfItems: 1, sizes: [] },
      variantType: configuredType,
      materialVariants: materialVariants.map(v => ({ ...v, _key: genKey(), materialValue: v.material || v.materialValue || v.attributes?.material || "", colorValue: v.color || "", colorName: v.colorName || v.attributes?.colorName || "", sizeValue: v.size || "", unitValue: v.unit || v.unitValue || v.attributes?.unit || "", unitQuantity: v.unitQuantity || v.attributes?.unitQuantity || "", images: normalizeVariantImages(v.images) })),
      colorVariants: colorVariants.map(v => ({ ...v, _key: genKey(), materialValue: v.material || v.materialValue || v.attributes?.material || "", colorValue: v.color || "", colorName: v.colorName || v.attributes?.colorName || "", sizeValue: v.size || "", unitValue: v.unit || v.unitValue || v.attributes?.unit || "", unitQuantity: v.unitQuantity || v.attributes?.unitQuantity || "", images: normalizeVariantImages(v.images) })),
      sizeVariants: sizeVariants.map(v => ({ ...v, _key: genKey(), materialValue: v.material || v.materialValue || v.attributes?.material || "", colorValue: v.color || "", colorName: v.colorName || v.attributes?.colorName || "", sizeValue: v.size || "", unitValue: v.unit || v.unitValue || v.attributes?.unit || "", unitQuantity: v.unitQuantity || v.attributes?.unitQuantity || "", images: normalizeVariantImages(v.images) })),
      unitVariants: unitVariants.map(v => ({ ...v, _key: genKey(), materialValue: v.material || v.materialValue || v.attributes?.material || "", colorValue: v.color || "", colorName: v.colorName || v.attributes?.colorName || "", sizeValue: v.size || "", unitValue: v.unit || v.unitValue || v.attributes?.unit || "", unitQuantity: v.unitQuantity || v.attributes?.unitQuantity || "", images: normalizeVariantImages(v.images) })),
      variantTypeImages: normalizeVariantTypeImages(product.variantTypeImages),
    };
  };

  const openListingModal = async (product) => {
    setValidationErrors([]); setSuccessMsg(""); setShowPreview(false);
    setEditingProduct(product);
    setServiceCenterEnabled(!!product?.returnPolicy?.serviceCenter);
    const initialForm = normalizeProductForForm(product || {});
    setActiveVariantTab(initialForm.variantType || "material");
    setModalError("");
    setListingForm(initialForm);
    setShowListingModal(true);

    const targetId = String(product?._id || product?.id || "").trim();
    if (!targetId || !/^[0-9a-fA-F]{24}$/.test(targetId)) {
      setModalError("Invalid product identifier format.");
      return;
    }

    // Fetch fresh product data from the API to ensure we have the latest database values
    try {
      setModalLoading(true);
      const { data } = await API.get(`/admin/products/${targetId}`);
      if (data.success && data.data) {
        const freshProduct = data.data;
        setEditingProduct(freshProduct);
        setServiceCenterEnabled(!!freshProduct.returnPolicy?.serviceCenter);
        const freshForm = normalizeProductForForm(freshProduct);
        setActiveVariantTab(freshForm.variantType || "material");
        setListingForm(freshForm);
        setModalError("");
      } else {
        setModalError(data.message || "Failed to load product data from server.");
      }
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to load product data from server.";
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const updateForm = (field, value) => setListingForm(p => ({ ...p, [field]: value }));

  const checkPublishReady = () => {
    const errors = [];
    REQUIRED_FOR_PUBLISH.forEach(({ field, label }) => {
      const val = listingForm[field];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        errors.push(label);
      }
    });
    if (listingForm.gstRate === undefined || listingForm.gstRate === null || listingForm.gstRate === "") {
      errors.push("GST Rate");
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const buildPayload = () => {
    const allVariants = getAllVariants();
    const s = (v) => (typeof v === "string" && v.trim() === "") ? undefined : v;
    const n = (v, fallback) => (v !== "" && v !== null && v !== undefined && !Number.isNaN(Number(v))) ? Number(v) : fallback;
    return {
      name: listingForm.name, brand: listingForm.brand,
      description: listingForm.description, shortDescription: listingForm.shortDescription,
      sku: s(listingForm.sku),
      hsnCode: listingForm.hsnCode || undefined,
      slug: s(listingForm.slug),
      category: typeof listingForm.category === "object" ? listingForm.category?._id : (listingForm.category || undefined),
      subCategory: typeof listingForm.subcategory === "object" ? listingForm.subcategory?._id : (listingForm.subcategory || undefined),
      sellingPrice: n(listingForm.sellingPrice, 0), mrpPrice: n(listingForm.mrpPrice, 0),
      costPrice: n(listingForm.costPrice, 0),
      purchasePrice: n(listingForm.purchasePrice, undefined),
      wholesalePrice: n(listingForm.wholesalePrice, undefined),
      distributorPrice: n(listingForm.distributorPrice, undefined),
      dealerPrice: n(listingForm.dealerPrice, undefined),
      offerPrice: n(listingForm.offerPrice, undefined),
      gstRate: n(listingForm.gstRate, 5),
      discountPercent: n(listingForm.discountPercent, undefined),
      currency: listingForm.currency || "INR",
      priceEffectiveFrom: listingForm.priceEffectiveFrom || undefined,
      priceEffectiveTo: listingForm.priceEffectiveTo || undefined,
      weight: listingForm.productWeight ? n(String(listingForm.productWeight).replace(/[^0-9.]/g, ""), undefined) : undefined,
      dimensions: listingForm.productDimensions && (listingForm.productDimensions.height || listingForm.productDimensions.width || listingForm.productDimensions.length) ? { height: n(listingForm.productDimensions.height, undefined), width: n(listingForm.productDimensions.width, undefined), length: n(listingForm.productDimensions.length, undefined) } : undefined,
      seo: {
        metaTitle: listingForm.seo?.metaTitle || "",
        metaDescription: listingForm.seo?.metaDescription || "",
        metaKeywords: typeof listingForm.seo?.metaKeywords === "string" ? listingForm.seo.metaKeywords.split(",").map(t => t.trim()).filter(Boolean) : (listingForm.seo?.metaKeywords || []),
        focusKeyword: listingForm.seo?.focusKeyword || "",
        canonicalUrl: listingForm.seo?.canonicalUrl || "",
        ogTitle: listingForm.seo?.ogTitle || "",
        ogDescription: listingForm.seo?.ogDescription || "",
        twitterCard: listingForm.seo?.twitterCard || undefined,
        structuredData: listingForm.seo?.structuredData || "",
        imageAlt: listingForm.seo?.imageAlt || "",
        imageTitle: listingForm.seo?.imageTitle || "",
        breadcrumb: listingForm.seo?.breadcrumb || "",
      },
      packageWeight: n(listingForm.packageWeight, undefined),
      packageDimensions: listingForm.packageDimensions && (listingForm.packageDimensions.height || listingForm.packageDimensions.width || listingForm.packageDimensions.length) ? {
        height: n(listingForm.packageDimensions.height, undefined),
        width: n(listingForm.packageDimensions.width, undefined),
        length: n(listingForm.packageDimensions.length, undefined),
      } : undefined,
      shippingClass: listingForm.shippingClass,
      shippingCost: n(listingForm.shippingCost, undefined),
      deliveryTime: listingForm.deliveryTime,
      pickupAvailable: Boolean(listingForm.pickupAvailable),
      freeShipping: Boolean(listingForm.freeShipping),
      codAvailable: Boolean(listingForm.codAvailable),
      isFragile: Boolean(listingForm.isFragile),
      isHazardous: Boolean(listingForm.isHazardous),
      warranty: {
        period: listingForm.warrantyPeriod || undefined,
        type: listingForm.warrantyType || undefined,
        terms: listingForm.warrantyTerms || undefined,
        documentUrl: listingForm.warrantyDocument?.url || undefined,
      },
      returnPolicy: {
        isReturnable: listingForm.isReturnable,
        returnPeriodDays: n(listingForm.returnPeriodDays, 7),
        replacementAvailable: Boolean(listingForm.replacementAvailable),
        installationRequired: Boolean(listingForm.installationRequired),
        serviceCenter: serviceCenterEnabled ? (listingForm.serviceCenter || undefined) : undefined,
      },
      tags: typeof listingForm.tags === "string" ? listingForm.tags.split(",").map(t => t.trim()).filter(Boolean) : (listingForm.tags || []),
      badges: listingForm.badge ? [listingForm.badge] : [],
      isFeatured: listingForm.visibilityFlag === "isFeatured",
      isTrending: listingForm.visibilityFlag === "isTrending",
      isBestSeller: listingForm.visibilityFlag === "isBestSeller",
      isNewArrival: listingForm.visibilityFlag === "isNewArrival",
      isLimitedOffer: listingForm.visibilityFlag === "isLimitedOffer",
      isRecommended: listingForm.visibilityFlag === "isRecommended",
      isFlashSale: false,
      relatedProductsCategory: typeof listingForm.relatedProductsCategory === "object" ? listingForm.relatedProductsCategory?._id : (listingForm.relatedProductsCategory || undefined),
      productHighlights: {
        ...(listingForm.productHighlights || {}),
        brand: listingForm.brand || listingForm.productHighlights?.brand || "",
        items: (listingForm.productHighlights?.items || []).filter(i => i && (i.title?.trim() || i.description?.trim())),
      },
      additionalFeatures: (listingForm.additionalFeatures || []).filter(f => f && (f.label?.trim() || f.value?.trim())),
      aboutThisProduct: (listingForm.aboutThisProduct || []).map(b => String(b || "").trim()).filter(Boolean),
      measurement: { ...listingForm.measurement, dimensionsText: listingForm.packageDimensionsText || "" },
      images: listingForm.images.filter(img => img && img.url && !img.url.startsWith('data:')).map((img, i) => ({ url: img.url, alt: img.alt || "", isPrimary: i === 0, order: i })),
      variantTypeImages: {
        material: (listingForm.variantTypeImages?.material || []).filter(img => img && img.url && !img.url.startsWith('data:')).map(img => ({ url: img.url, alt: img.alt || "" })),
        color: (listingForm.variantTypeImages?.color || []).filter(img => img && img.url && !img.url.startsWith('data:')).map(img => ({ url: img.url, alt: img.alt || "" })),
        size: (listingForm.variantTypeImages?.size || []).filter(img => img && img.url && !img.url.startsWith('data:')).map(img => ({ url: img.url, alt: img.alt || "" })),
        unit: (listingForm.variantTypeImages?.unit || []).filter(img => img && img.url && !img.url.startsWith('data:')).map(img => ({ url: img.url, alt: img.alt || "" })),
      },
      variantType: activeVariantTab || listingForm.variantType || "material",
      variants: allVariants.map(v => {
        const vType = v._variantType || v.attributes?.variantType || (v.materialValue || v.material ? "material" : v.unitValue || v.unit ? "unit" : v.sizeValue || v.size ? "size" : v.colorValue || v.color ? "color" : "material");
        const unitVal = s(v.unitValue || v.unit || v.attributes?.unit);
        const unitQtyVal = s(v.unitQuantity || v.attributes?.unitQuantity);
        const materialVal = s(v.materialValue || v.material || v.attributes?.material);
        return {
          name: v.name || "", description: v.description || "",
          size: s(v.sizeValue || v.size), color: v.colorValue || v.color || undefined,
          colorName: v.colorName || undefined,
          unit: unitVal,
          unitQuantity: unitQtyVal,
          material: materialVal,
          attributes: {
            ...(v.attributes || {}),
            variantType: vType,
            ...(v.colorName ? { colorName: v.colorName } : {}),
            ...(unitVal ? { unit: unitVal, unitQuantity: unitQtyVal || "" } : {}),
            ...(materialVal ? { material: materialVal } : {}),
            ...(s(v.sizeValue || v.size) ? { size: s(v.sizeValue || v.size) } : {})
          },
          sku: v.sku || `V-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, barcode: v.barcode || undefined,
          mrpPrice: n(v.mrpPrice, 1), sellingPrice: n(v.sellingPrice, 1),
          costPrice: n(v.costPrice, 0), quantity: n(v.quantity, 0),
          weight: v.weight ? n(v.weight, undefined) : undefined,
          isAvailable: v.status !== "Inactive", status: v.status || "Active",
          images: (v.images || []).filter(img => img && img.url && !img.url.startsWith('data:')).map(img => ({ url: img.url, alt: img.alt || "" })),
        };
      }),
    };
  };

  const publishProduct = async () => {
    if (!checkPublishReady()) return;
    const targetId = String(editingProduct?._id || editingProduct?.id || "").trim();
    if (!targetId || !/^[0-9a-fA-F]{24}$/.test(targetId)) {
      setValidationErrors(["Invalid product identifier for publishing."]);
      return;
    }
    setSaving(true); setSuccessMsg(""); setValidationErrors([]);
    try {
      await API.put(`/admin/products/${targetId}`, buildPayload());
      if (editingProduct.publishStatus !== "published") {
        await API.post(`/admin/products/${targetId}/list`, {});
      }
      setSuccessMsg(editingProduct.publishStatus === "published" ? "Product listing updated successfully!" : "Product published and is now live in the store!");
      setShowListingModal(false);
      fetchProducts(page);
    } catch (e) {
      const msg = e.response?.data;
      const errors = [];
      if (msg?.errors && Array.isArray(msg.errors)) {
        msg.errors.forEach(i => errors.push(`${i.path?.join(".") || "field"}: ${i.message}`));
      } else if (msg?.issues && Array.isArray(msg.issues)) {
        msg.issues.forEach(i => errors.push(`${i.path?.join(".") || "field"}: ${i.message}`));
      } else if (msg?.message) {
        errors.push(msg.message);
      } else if (typeof msg === 'string') {
        errors.push(msg);
      } else {
        errors.push("Publishing failed. Please check all required fields.");
      }
      setValidationErrors(errors);
    }
    setSaving(false);
  };

  const saveDraft = async () => {
    const targetId = String(editingProduct?._id || editingProduct?.id || "").trim();
    if (!targetId || !/^[0-9a-fA-F]{24}$/.test(targetId)) {
      setValidationErrors(["Invalid product identifier for saving."]);
      return;
    }
    setSaving(true); setSuccessMsg(""); setValidationErrors([]);
    try {
      await API.put(`/admin/products/${targetId}`, buildPayload());
      setSuccessMsg("Draft saved successfully");
      setShowListingModal(false);
      fetchProducts(page);
    } catch (e) {
      const msg = e.response?.data;
      const errors = [];
      if (msg?.errors && Array.isArray(msg.errors)) {
        msg.errors.forEach(i => errors.push(`${i.path?.join(".") || "field"}: ${i.message}`));
      } else if (msg?.issues && Array.isArray(msg.issues)) {
        msg.issues.forEach(i => errors.push(`${i.path?.join(".") || "field"}: ${i.message}`));
      } else if (msg?.message) {
        errors.push(msg.message);
      } else if (typeof msg === 'string') {
        errors.push(msg);
      } else {
        errors.push("Save failed. Please try again.");
      }
      setValidationErrors(errors);
    }
    setSaving(false);
  };

  const archiveProduct = async (productId) => {
    try {
      await API.post(`/admin/products/${productId}/unlist`, { status: "archived" });
      fetchProducts(page);
    } catch (e) { setError(e.response?.data?.message || "Failed to archive"); }
  };

  const unlistProduct = async (productId) => {
    try {
      await API.post(`/admin/products/${productId}/unlist`, { status: "unlisted" });
      fetchProducts(page);
    } catch (e) { setError(e.response?.data?.message || "Failed to unlist"); }
  };

  const bulkAction = async (action) => {
    setSaving(true);
    for (const id of selected) {
      try {
        if (action === "publish") await API.post(`/admin/products/${id}/list`, {});
        else if (action === "unlist") await API.post(`/admin/products/${id}/unlist`, { status: "unlisted" });
        else if (action === "archive") await API.post(`/admin/products/${id}/unlist`, { status: "archived" });
        else if (action === "delete") await API.delete(`/admin/products/${id}`);
      } catch { /* continue */ }
    }
    setSelected([]); setSaving(false);
    fetchProducts(page);
  };

  const toggleSelect = (id) => {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const addImage = (url) => {
    setListingForm(p => ({
      ...p, images: [...p.images, { url, _key: genKey(), alt: "" }],
    }));
  };

  const removeImage = (key) => {
    setListingForm(p => ({ ...p, images: p.images.filter(i => i._key !== key) }));
  };

  const setPrimaryImage = (key) => {
    setListingForm(p => {
      const images = [...p.images];
      const idx = images.findIndex(i => i._key === key);
      if (idx > 0) {
        const [img] = images.splice(idx, 1);
        images.unshift(img);
      }
      return { ...p, images };
    });
  };

  const generateAIContent = async (type, context) => {
    const key = `ai_${type}`;
    setAiGenerating(p => ({ ...p, [key]: true }));
    try {
      const { data } = await API.post("/admin/ai/generate", { type, context });
      if (data.success) return data.content;
      throw new Error(data.message || "AI generation failed");
    } catch (e) {
      console.error("AI generation error:", e);
      return null;
    } finally {
      setAiGenerating(p => ({ ...p, [key]: false }));
    }
  };

  const getAIContext = () => ({
    name: listingForm?.name, brand: listingForm?.brand,
    category: categories.find(c => c._id === listingForm?.category)?.name || "",
    subCategory: "", sku: listingForm?.sku,
    description: listingForm?.description || "",
    shortDescription: listingForm?.shortDescription || "",
    existingDescription: listingForm?.description || "",
  });

  const calcProfitMargin = () => {
    const sp = Number(listingForm?.sellingPrice);
    const cp = Number(listingForm?.costPrice);
    if (!cp || !sp || cp === 0) return "—";
    return `${(((sp - cp) / cp) * 100).toFixed(2)}%`;
  };

  const getVariantVal = (v, tabKey) => {
    if (!v) return "";
    if (tabKey === "color") return v.colorValue || v.color || "";
    if (tabKey === "size") return v.sizeValue || v.size || "";
    if (tabKey === "material") return v.materialValue || v.material || v.attributes?.material || "";
    if (tabKey === "unit") return v.unitValue ? `${v.unitQuantity || ""} ${v.unitValue}`.trim() : "";
    return v.materialValue || v.material || v.colorValue || v.color || v.sizeValue || v.size || v.name || "";
  };

  const addVariantToTab = (tabKey) => {
    const field = `${tabKey}Variants`;
    setListingForm(p => {
      const existing = p[field] || [];
      const count = existing.length + 1;
      const baseSku = (p.sku || (p.name ? p.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) : "PROD")).trim();
      const newSku = `${baseSku}-${tabKey.toUpperCase().slice(0, 3)}-${String(count).padStart(3, "0")}`;
      
      const baseDigits = (`400${Date.now().toString().slice(-8)}${count}`).slice(0, 12).padStart(12, "0");
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(baseDigits[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      const newBarcode = `${baseDigits}${checkDigit}`;

      return {
        ...p,
        [field]: [...existing, {
          _key: genKey(), name: "", description: "",
          color: tabKey === "color" ? "" : undefined,
          colorValue: tabKey === "color" ? "" : undefined,
          colorName: tabKey === "color" ? "" : undefined,
          size: tabKey === "size" ? "" : undefined,
          sizeValue: tabKey === "size" ? "" : undefined,
          materialValue: tabKey === "material" ? "" : undefined,
          attributes: {
            variantType: tabKey,
            ...(tabKey === "material" ? { material: "" } : {}),
            ...(tabKey === "unit" ? { unit: "", unitQuantity: "" } : {}),
          },
          unitValue: tabKey === "unit" ? "" : undefined,
          unitQuantity: tabKey === "unit" ? "" : undefined,
          sku: newSku, barcode: newBarcode, sellingPrice: p.sellingPrice || "", mrpPrice: p.mrpPrice || "", costPrice: p.costPrice || "",
          quantity: 0, weight: "", status: "Active", images: [null, null, null, null],
        }],
      };
    });
  };

  const updateVariantInTab = (tabKey, varKey, field, value) => {
    const vField = `${tabKey}Variants`;
    setListingForm(p => ({
      ...p,
      [vField]: (p[vField] || []).map(v => {
        if (v._key !== varKey) return v;
        if (field === "attributes") return { ...v, attributes: { ...v.attributes, ...value } };
        return { ...v, [field]: value };
      }),
    }));
  };

  const removeVariantFromTab = (tabKey, varKey) => {
    const field = `${tabKey}Variants`;
    setListingForm(p => ({
      ...p,
      [field]: (p[field] || []).filter(v => v._key !== varKey),
    }));
  };

  const handleVariantImageUpload = async (file, vKey, slotIdx) => {
    if (!file) return;
    let finalUrl = "";
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.success && data?.url) {
        finalUrl = data.url;
      }
    } catch (e) {
      console.error("Variant image upload failed:", e.message);
    }
    if (!finalUrl) {
      alert("Image upload failed. Please check your connection and try again.");
      return;
    }
    if (finalUrl) {
      const currentTab = activeVariantTab || listingForm?.variantType || "material";
      const vList = listingForm?.[`${currentTab}Variants`] || [];
      const targetV = vList.find((v) => v._key === vKey);
      const updatedSlots = [...(targetV?.images || [null, null, null, null])];
      updatedSlots[slotIdx] = { url: finalUrl, alt: file.name, _key: genKey() };
      updateVariantInTab(currentTab, vKey, "images", updatedSlots);
    }
  };

  const getAllVariants = () => {
    if (!listingForm) return [];
    return [
      ...(listingForm.materialVariants || []).map(v => ({ ...v, _variantType: "material" })),
      ...(listingForm.colorVariants || []).map(v => ({ ...v, _variantType: "color" })),
      ...(listingForm.sizeVariants || []).map(v => ({ ...v, _variantType: "size" })),
      ...(listingForm.unitVariants || []).map(v => ({ ...v, _variantType: "unit" })),
    ].map((v, i) => ({ ...v, order: i, isPrimary: i === 0 }));
  };

  const getPublishStatus = (p) => {
    if (p.isDeleted) return { label: "Deleted", color: "text-red-600 bg-red-50" };
    if (p.publishStatus === "published") return { label: "Published", color: "text-green-700 bg-green-50 border border-green-200" };
    if (p.publishStatus === "archived") return { label: "Archived", color: "text-gray-600 bg-gray-100 border border-gray-200" };
    return { label: "Draft", color: "text-amber-700 bg-amber-50 border border-amber-200" };
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#faf9f6] text-[#21150f] px-5 py-8 sm:px-8 lg:px-10">
        
        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 text-[13px] font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" /> {successMsg}
          </div>
        )}

        {/* Top Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-[#3a1100] font-serif">Product Listing Catalog</h1>
            <p className="mt-1.5 text-[13.5px] font-semibold text-[#796d66]">Publish products, manage highlights, and configure SEO & measurement</p>
          </div>
          
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white border border-[#efe5dc] p-2 shadow-sm">
              <span className="text-[11.5px] font-black text-[#796d66] px-2">{selected.length} Selected</span>
              <button onClick={() => bulkAction("publish")} disabled={saving} className="inline-flex h-9 items-center gap-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[11px] font-black text-white transition disabled:opacity-50"><Check size={13} /> Publish</button>
              <button onClick={() => bulkAction("unlist")} disabled={saving} className="inline-flex h-9 items-center gap-1 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-[11px] font-black text-white transition disabled:opacity-50"><EyeOff size={13} /> Unlist</button>
              <button onClick={() => bulkAction("archive")} disabled={saving} className="inline-flex h-9 items-center gap-1 px-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-[11px] font-black text-white transition disabled:opacity-50"><Archive size={13} /> Archive</button>
              <button onClick={() => bulkAction("delete")} disabled={saving} className="inline-flex h-9 items-center gap-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-[11px] font-black text-white transition disabled:opacity-50"><Trash2 size={13} /> Delete</button>
              <button onClick={() => setSelected([])} className="h-9 px-3 rounded-lg border border-[#cfc1b5] text-[11.5px] font-black text-[#796d66] hover:bg-gray-50 transition">Cancel</button>
            </div>
          )}
        </header>

        {/* Tab Pills & Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-1.5 bg-[#f3ece5]/60 p-1 rounded-xl border border-[#efe5dc] w-fit">
            {TABS.map(t => {
              const isActive = tab === t.key;
              const isDetailed = t.key === "detailed";
              return (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setPage(1); }}
                  className={`flex h-10 items-center gap-2 rounded-lg px-4 text-[12.5px] font-black transition-all ${
                    isActive
                      ? isDetailed
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-[#3a1100] text-white shadow-sm"
                      : "text-[#5c514b] hover:text-[#3a1100] hover:bg-[#fffcf9]"
                  }`}
                  type="button"
                >
                  <t.icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white border border-[#efe5dc] p-3 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8b82]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search catalog by name, brand, HSN..." 
                className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-10 pr-4 text-[13px] text-[#211713] outline-none placeholder:text-[#9a8b82] transition focus:border-[#fd761a] focus:bg-white" 
              />
            </div>
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)} 
              className="h-10 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3 text-[12.5px] font-black text-[#5c514b]"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select 
              value={stockFilter} 
              onChange={e => setStockFilter(e.target.value)} 
              className="h-10 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3 text-[12.5px] font-black text-[#5c514b]"
            >
              <option value="">All Attributes</option>
              <option value="featured">Featured Catalog</option>
              <option value="low">Low Inventory Alert</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Listing Feed */}
        {loading ? (
          isDetailedView ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[20px] border border-[#efe5dc] bg-white p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="h-[86px] w-[86px] rounded-xl bg-[#f3ece5]" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-[#f3ece5] rounded w-3/4" />
                      <div className="h-3 bg-[#f3ece5] rounded w-1/2" />
                      <div className="h-3 bg-[#f3ece5] rounded w-2/3" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="h-20 bg-[#f3ece5] rounded-2xl" />
                    <div className="h-20 bg-[#f3ece5] rounded-2xl" />
                    <div className="h-20 bg-[#f3ece5] rounded-2xl" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="h-24 bg-[#f3ece5] rounded-2xl" />
                    <div className="h-24 bg-[#f3ece5] rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-28">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={32} className="animate-spin text-[#fd761a]" />
                <p className="text-[13px] font-bold text-[#796d66]">Retrieving listings...</p>
              </div>
            </div>
          )
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-8 py-12 text-center shadow-sm">
            <AlertTriangle size={42} className="mx-auto text-rose-500 mb-4" />
            <h3 className="text-[17px] font-black text-rose-900 font-serif">Failed to load catalog</h3>
            <p className="mt-1 text-[13px] text-rose-700">{error}</p>
            <button
              onClick={() => fetchProducts(page)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[12.5px] font-black text-white hover:bg-rose-700 transition"
              type="button"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-[#efe5dc] bg-white px-8 py-20 text-center shadow-sm">
            <Package size={42} className="mx-auto text-[#c7bab0] mb-4" />
            <h3 className="text-[17px] font-black text-[#3a1100] font-serif">No products found</h3>
            <p className="mt-1 text-[13px] text-[#796d66]">
              {search || categoryFilter || stockFilter || brandFilter ? "No products matched your search or filters." : "Your catalog is currently empty."}
            </p>
            {(search || categoryFilter || stockFilter || brandFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("");
                  setStockFilter("");
                  setBrandFilter("");
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3a1100] px-4 py-2 text-[12.5px] font-black text-white hover:bg-[#fd761a] transition"
                type="button"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : isDetailedView ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((p) => (
                <DetailedProductCard
                  key={p._id}
                  product={p}
                  analytics={analyticsMap[p._id]}
                  onEdit={openListingModal}
                  onUnlist={unlistProduct}
                  onPublish={openListingModal}
                  onViewUsers={(prod) => setViewUsersModal({ product: prod, analytics: analyticsMap[prod._id] })}
                />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#efe5dc] bg-white px-5 py-4 shadow-sm">
              <p className="text-[12.5px] font-bold text-[#796d66]">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} products</p>
              <div className="flex items-center gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-9 w-9 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 flex items-center justify-center hover:border-[#fd761a] transition" type="button">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pNum = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  if (pNum < 1 || pNum > totalPages) return null;
                  return (
                    <button key={pNum} onClick={() => setPage(pNum)}
                      className={`h-9 min-w-[36px] rounded-lg text-[12.5px] font-black transition-all ${page === pNum ? "bg-[#3a1100] text-white" : "border border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a]"}`} type="button">
                      {pNum}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-9 w-9 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 flex items-center justify-center hover:border-[#fd761a] transition" type="button">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-[#efe5dc] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left border-collapse">
                <thead className="bg-[#faf8f5] text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] border-b border-[#efe5dc]">
                  <tr>
                    <th className="px-5 py-4 w-12 text-center">
                      <button 
                        onClick={() => {
                          const allIds = filteredProducts.map(p => p._id);
                          setSelected(prev => prev.length === allIds.length ? [] : allIds);
                        }}
                        className="text-gray-400 hover:text-[#3a1100]"
                      >
                        {selected.length === filteredProducts.length ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="px-5 py-4 w-16">Image</th>
                    <th className="px-5 py-4">Product Details</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Base Price</th>
                    <th className="px-5 py-4">Variants</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-center">Analytics</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5eee8] bg-white text-[13px]">
                  {filteredProducts.map((p) => {
                    const isSel = selected.includes(p._id);
                    const isHighlighted = highlightParam
                      && (p.name || "").toLowerCase().includes(highlightParam.toLowerCase());
                    const statusBadge = getPublishStatus(p);
                    const a = analyticsMap[p._id];
                    const views = a?.totalUniqueViews ?? 0;
                    const cartUsers = a?.currentCartCount ?? a?.totalUniqueCartUsers ?? 0;

                    return (
                      <tr key={p._id} className={`transition hover:bg-[#fffcf9]/40 ${isSel ? "bg-orange-50/20" : ""}${isHighlighted ? " bg-[#fff3e6]" : ""}`}>
                        <td className="px-5 py-4 text-center">
                          <button 
                            onClick={() => toggleSelect(p._id)}
                            className="text-gray-400 hover:text-[#3a1100]"
                          >
                            {isSel ? (
                              <CheckSquare size={16} className="text-[#fd761a]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="h-12 w-12 rounded-lg border border-[#efe5dc] bg-[#faf7f4] overflow-hidden shrink-0">
                            {p.images?.[0]?.url ? (
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon size={16} className="m-auto text-gray-300" />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-[#3a1100]">{p.name}</p>
                          <p className="text-[11px] font-semibold text-[#9a8b82] mt-0.5">{p.brand} · SKU: {p.sku || "—"}</p>
                        </td>
                        <td className="px-5 py-4 text-[#5c514b]">{p.category?.name || "General"}</td>
                        <td className="px-5 py-4 font-bold text-[#211713]">{INR(p.sellingPrice)}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded bg-[#f3ece5] px-2 py-0.5 text-[11px] font-black text-[#5c514b]">
                            {p.variants?.length || 0} variants
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-3 text-[11.5px] font-bold text-[#796d66]">
                            <span className="flex items-center gap-1" title="Unique viewers"><Eye size={12} /> {views}</span>
                            <span className="flex items-center gap-1" title="Cart users"><ShoppingCart size={12} /> {cartUsers}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => openListingModal(p)} 
                              className="h-8 px-3.5 rounded-lg border border-[#d4c5b8] text-[11px] font-extrabold text-[#5c514b] bg-[#faf8f5] transition-all hover:border-[#fd761a] hover:text-[#fd761a] hover:bg-[#fff8f2] active:scale-95 flex items-center gap-1"
                              type="button"
                            >
                              <Edit3 size={11} /> Configure
                            </button>
                            {p.publishStatus === "published" ? (
                              <button 
                                onClick={() => unlistProduct(p._id)} 
                                className="h-8 px-3 rounded-lg border border-[#cfc1b5] text-[11.5px] font-black text-amber-700 bg-white transition hover:bg-amber-50"
                                type="button"
                              >
                                Unlist
                              </button>
                            ) : (
                              <button 
                                onClick={() => openListingModal(p)} 
                                className="h-8 px-3 rounded-lg bg-[#3a1100] text-[11.5px] font-black text-white hover:bg-[#fd761a]"
                                type="button"
                              >
                                Publish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer / Pagination */}
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f5eee8] px-5 py-4 bg-[#faf8f5]">
              <p className="text-[12.5px] font-bold text-[#796d66]">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} listings</p>
              <div className="flex items-center gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-9 w-9 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 flex items-center justify-center hover:border-[#fd761a] transition" type="button">
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`h-9 min-w-[36px] rounded-lg text-[12.5px] font-black transition-all ${
                      page === p ? "bg-[#3a1100] text-white" : "border border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a]"
                    }`} type="button">
                    {p}
                  </button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-9 w-9 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 flex items-center justify-center hover:border-[#fd761a] transition" type="button">
                  <ChevronRight size={15} />
                </button>
              </div>
            </footer>
          </div>
        )}

        {/* Catalog Modals */}
        <AnimatePresence>
          {showListingModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 py-6 px-4 backdrop-blur-[3px]"
            >
              <motion.div 
                initial={{ scale: 0.96, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 15 }}
                className="w-full max-w-4xl rounded-2xl bg-white border border-[#efe5dc] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
              >
                
                {/* Modal Title bar */}
                <header className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4 shrink-0">
                  <div>
                    <h2 className="text-[17px] font-black text-[#3a1100] font-serif">Configure Storefront Product</h2>
                    <p className="text-[11px] font-bold text-[#9a8b82] uppercase mt-0.5">ID: {editingProduct?._id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowPreview(!showPreview)} 
                      className={`h-8 px-3 rounded-lg text-[11.5px] font-black border transition ${
                        showPreview ? "border-[#fd761a] text-[#fd761a] bg-orange-50/30" : "border-[#cfc1b5] text-[#5c514b] hover:bg-gray-50"
                      }`}
                    >
                      {showPreview ? "Hide Preview" : "Live SEO Preview"}
                    </button>
                    <button onClick={() => setShowListingModal(false)} className="h-8 w-8 rounded-lg border border-[#efe5dc] grid place-items-center text-gray-400 hover:text-gray-600 transition" type="button">
                      <X size={16} />
                    </button>
                  </div>
                </header>

                {modalLoading && (
                  <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 text-[12.5px] font-bold text-blue-700 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading latest product data from database...
                  </div>
                )}

                {modalError && (
                  <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 text-[12.5px] font-bold text-amber-700 flex items-center gap-2">
                    <AlertTriangle size={14} /> {modalError}
                    <button onClick={() => setModalError("")} className="ml-auto text-amber-500 hover:text-amber-700"><X size={14} /></button>
                  </div>
                )}

                {/* Validation Warnings */}
                {validationErrors.length > 0 && (
                  <div className="bg-rose-50 border-b border-rose-100 px-6 py-3.5 text-[12.5px] font-bold text-rose-700 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><AlertTriangle size={14} /> Missing criteria:</span>
                    {validationErrors.map((err, i) => (
                      <span key={i} className="bg-rose-100/50 px-2 py-0.5 rounded text-[11.5px]">{err}</span>
                    ))}
                  </div>
                )}

                {/* Modal Body Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#faf9f6]/40">
                  
                  {/* Google SEO Live Preview Block */}
                  {showPreview && (
                    <motion.section 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }} 
                      className="rounded-xl border border-blue-100 bg-blue-50/30 p-5 overflow-hidden"
                    >
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-1.5"><Globe size={13} /> Google Search Preview</h4>
                      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-1 font-sans">
                        <p className="text-[12px] text-gray-500 truncate">https://machinichi.com/product/{listingForm.slug || editingProduct?.slug || "sample-slug"}</p>
                        <p className="text-[17px] font-medium text-[#1a0dab] hover:underline cursor-pointer truncate">{listingForm.metaTitle || listingForm.name || "Machinichi Organic Title"}</p>
                        <p className="text-[13px] text-[#4d5156] leading-relaxed line-clamp-2">{listingForm.metaDescription || listingForm.description || "Fresh and stone-ground organic product details..."}</p>
                      </div>
                    </motion.section>
                  )}

                  {/* ═══ SECTION 1: GENERAL INFORMATION ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Bookmark size={15} className="text-[#fd761a]" /> General Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Product Title *</label>
                        <input value={listingForm.name} onChange={e => updateForm("name", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Brand Name *</label>
                        <input value={listingForm.brand} onChange={e => updateForm("brand", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Category *</label>
                        <select value={listingForm.category} onChange={e => updateForm("category", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required>
                          <option value="">Select Category</option>
                          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">SKU Reference *</label>
                        <input value={listingForm.sku} onChange={e => updateForm("sku", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required />
                      </div>
                    </div>
                    {/* Primary & Secondary Media */}
                    <div className="pt-2">
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-2">Primary & Secondary Media</label>
                      <div className="flex flex-wrap gap-3 items-start">
                        {listingForm.images?.slice(0, 4).map((img, i) => (
                          <div key={img._key || i} className="relative h-28 w-28 rounded-xl border border-[#efe5dc] overflow-hidden group shadow-sm bg-gray-50">
                            <img src={img.url} alt="" className="h-full w-full object-cover" />
                            {i === 0 && <span className="absolute left-1 top-1 bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">Primary</span>}
                            <button onClick={() => removeImage(img._key)} className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full grid place-items-center text-white opacity-0 group-hover:opacity-100 transition"><X size={10} /></button>
                            {i > 0 && <button onClick={() => setPrimaryImage(img._key)} className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[9px] font-black py-0.5 rounded opacity-0 group-hover:opacity-100 transition" type="button">Set Primary</button>}
                          </div>
                        ))}
                        {listingForm.images.length < 4 && Array.from({ length: 4 - listingForm.images.length }).map((_, i) => (
                          <label key={`upload-${i}`} className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#cfc1b5] hover:border-[#fd761a] text-[#796d66] hover:text-[#fd761a] transition bg-[#faf8f5]">
                            <div className="text-center"><Upload size={20} className="mx-auto mb-1" /><span className="text-[9px] font-bold">Upload</span></div>
                            <input type="file" accept="image/*" className="hidden" onChange={async e => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              e.target.value = "";
                              const formData = new FormData();
                              formData.append("file", f);
                              try {
                                const { data } = await API.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
                                if (data?.success && data?.url) {
                                  addImage(data.url);
                                } else {
                                  alert("Image upload failed. Please try again.");
                                }
                              } catch {
                                alert("Image upload failed. Please check your connection.");
                              }
                            }} />
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Description + AI */}
                    <div>
                      <div className="flex items-center mb-1.5">
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Description *</label>
                        <AIButton loading={aiGenerating.ai_description} onClick={async () => { const content = await generateAIContent("description", getAIContext()); if (content) updateForm("description", content); }} />
                      </div>
                      <textarea value={listingForm.description} onChange={e => updateForm("description", e.target.value)} rows={4} className="w-full rounded-xl border border-[#e5d8cd] px-3.5 py-2 text-[13px] outline-none focus:border-[#fd761a]" required />
                    </div>
                    {/* Short Summary + AI */}
                    <div>
                      <div className="flex items-center mb-1.5">
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Short Summary Description</label>
                        <AIButton loading={aiGenerating.ai_shortDescription} onClick={async () => { const content = await generateAIContent("shortDescription", getAIContext()); if (content) updateForm("shortDescription", content); }} />
                      </div>
                      <input value={listingForm.shortDescription} onChange={e => updateForm("shortDescription", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Brief product summary..." />
                    </div>
                  </div>

                  {/* ═══ SECTION 2: CATALOG PRICING & TAXATION ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <DollarSign size={15} className="text-[#fd761a]" /> Catalog Pricing & Taxation
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">MRP *</label><input type="number" value={listingForm.mrpPrice} onChange={e => updateForm("mrpPrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Selling Price *</label><input type="number" value={listingForm.sellingPrice} onChange={e => updateForm("sellingPrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Purchase Price</label><input type="number" value={listingForm.purchasePrice || ""} onChange={e => updateForm("purchasePrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Cost Price</label><input type="number" value={listingForm.costPrice || ""} onChange={e => updateForm("costPrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Wholesale Price</label><input type="number" value={listingForm.wholesalePrice || ""} onChange={e => updateForm("wholesalePrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Distributor Price</label><input type="number" value={listingForm.distributorPrice || ""} onChange={e => updateForm("distributorPrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Dealer Price</label><input type="number" value={listingForm.dealerPrice || ""} onChange={e => updateForm("dealerPrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Offer Price</label><input type="number" value={listingForm.offerPrice || ""} onChange={e => updateForm("offerPrice", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Discount %</label><input type="number" value={listingForm.discountPercent || ""} onChange={e => updateForm("discountPercent", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">GST % *</label><select value={listingForm.gstRate} onChange={e => updateForm("gstRate", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]"><option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">HSN Code *</label><input value={listingForm.hsnCode} onChange={e => updateForm("hsnCode", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Currency</label><select value={listingForm.currency || "INR"} onChange={e => updateForm("currency", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]">{CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Price Effective From</label><input type="date" value={listingForm.priceEffectiveFrom || ""} onChange={e => updateForm("priceEffectiveFrom", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Price Effective To</label><input type="date" value={listingForm.priceEffectiveTo || ""} onChange={e => updateForm("priceEffectiveTo", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div className="sm:col-span-2 md:col-span-1"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Profit Margin</label><div className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#faf8f5] px-3.5 text-[13px] font-black text-[#3a1100] flex items-center">{calcProfitMargin()}</div></div>
                    </div>
                  </div>

                  {/* ═══ SECTION 3: SEO & SLUG SETTINGS ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Globe size={15} className="text-[#fd761a]" /> SEO & Slug Settings
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center mb-1.5"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">SEO Title</label><AIButton loading={aiGenerating.ai_seoTitle} onClick={async () => { const content = await generateAIContent("seoTitle", getAIContext()); if (content) updateForm("seo", { ...listingForm.seo, metaTitle: content }); }} /></div>
                        <input value={listingForm.seo?.metaTitle || ""} onChange={e => updateForm("seo", { ...listingForm.seo, metaTitle: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder={listingForm.name || "Product title..."} />
                      </div>
                      <div>
                        <div className="flex items-center mb-1.5"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Slug</label><AIButton loading={aiGenerating.ai_slug} onClick={async () => { const content = await generateAIContent("slug", getAIContext()); if (content) updateForm("slug", content); }} /></div>
                        <input value={listingForm.slug || ""} onChange={e => updateForm("slug", e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="product-slug" />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-center mb-1.5"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Meta Description</label><AIButton loading={aiGenerating.ai_metaDescription} onClick={async () => { const content = await generateAIContent("metaDescription", getAIContext()); if (content) updateForm("seo", { ...listingForm.seo, metaDescription: content }); }} /></div>
                        <textarea value={listingForm.seo?.metaDescription || ""} onChange={e => updateForm("seo", { ...listingForm.seo, metaDescription: e.target.value })} rows={2} className="w-full rounded-xl border border-[#e5d8cd] px-3.5 py-2 text-[13px] outline-none focus:border-[#fd761a]" placeholder="SEO-optimized meta description..." />
                      </div>
                      <div className="sm:col-span-2"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Meta Keywords (comma separated)</label><input value={listingForm.seo?.metaKeywords || ""} onChange={e => updateForm("seo", { ...listingForm.seo, metaKeywords: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="organic, fresh, noodles" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Canonical URL</label><input value={listingForm.seo?.canonicalUrl || ""} onChange={e => updateForm("seo", { ...listingForm.seo, canonicalUrl: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="https://machinichi.com/product/..." /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Focus Keyword</label><input value={listingForm.seo?.focusKeyword || ""} onChange={e => updateForm("seo", { ...listingForm.seo, focusKeyword: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. organic noodles" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Open Graph Title</label><input value={listingForm.seo?.ogTitle || ""} onChange={e => updateForm("seo", { ...listingForm.seo, ogTitle: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Title for social sharing" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Open Graph Description</label><input value={listingForm.seo?.ogDescription || ""} onChange={e => updateForm("seo", { ...listingForm.seo, ogDescription: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Description for social sharing" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Twitter Card</label><select value={listingForm.seo?.twitterCard || "summary_large_image"} onChange={e => updateForm("seo", { ...listingForm.seo, twitterCard: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]">{TWITTER_CARD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Structured Data</label><input value={listingForm.seo?.structuredData || ""} onChange={e => updateForm("seo", { ...listingForm.seo, structuredData: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="JSON-LD structured data" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Image Alt</label><input value={listingForm.seo?.imageAlt || ""} onChange={e => updateForm("seo", { ...listingForm.seo, imageAlt: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Alt text for product image" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Image Title</label><input value={listingForm.seo?.imageTitle || ""} onChange={e => updateForm("seo", { ...listingForm.seo, imageTitle: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Title attribute for image" /></div>
                      <div className="sm:col-span-2"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Breadcrumb</label><input value={listingForm.seo?.breadcrumb || ""} onChange={e => updateForm("seo", { ...listingForm.seo, breadcrumb: e.target.value })} className="h-10 w-full rounded-xl border border-[#e5d8cd] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Home > Category > Product" /></div>
                    </div>
                  </div>

                  {/* ═══ SECTION 4: VARIANT MANAGER ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Settings size={15} className="text-[#fd761a]" /> Variant Manager
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {VARIANT_TABS.map(vt => {
                        const isActive = activeVariantTab === vt.key;
                        const count = (listingForm[`${vt.key}Variants`] || []).length;
                        return (
                          <button key={vt.key} type="button" onClick={() => setActiveVariantTab(vt.key)} className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${isActive ? "border-[#fd761a] bg-[#fff1e6] shadow-sm" : "border-[#efe5dc] bg-[#faf8f5] hover:border-[#fd761a]/50"}`}>
                            <vt.icon size={18} className={isActive ? "text-[#fd761a]" : "text-[#9a8b82]"} />
                            <span className={`text-[11px] font-black ${isActive ? "text-[#fd761a]" : "text-[#5c514b]"}`}>{vt.label}</span>
                            {count > 0 && <span className="text-[9px] font-black text-[#9a8b82]">{count} variant{count !== 1 ? "s" : ""}</span>}
                          </button>
                        );
                      })}
                    </div>
                    {activeVariantTab && (
                      <div className="rounded-xl border border-[#efe5dc] bg-[#faf8f5]/40 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[12px] font-black text-[#3a1100] uppercase tracking-wider">{VARIANT_TABS.find(v => v.key === activeVariantTab)?.label} Variants</h4>
                          <button type="button" onClick={() => addVariantToTab(activeVariantTab)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cfc1b5] bg-white px-3 text-[11px] font-black text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] transition"><Plus size={12} /> Add {VARIANT_TABS.find(v => v.key === activeVariantTab)?.label}</button>
                        </div>
                        {(listingForm[`${activeVariantTab}Variants`] || []).length === 0 && <p className="text-[12px] font-bold text-[#9a8b82] text-center py-4">No variants yet. Click Add to create one.</p>}
                        {(listingForm[`${activeVariantTab}Variants`] || []).map((v, idx) => (
                          <div key={v._key || idx} className="rounded-xl border border-[#e5d8cd] bg-white p-4 space-y-3 relative">
                            <button type="button" onClick={() => removeVariantFromTab(activeVariantTab, v._key)} className="absolute top-3 right-3 text-[#9a8b82] hover:text-rose-600 transition"><X size={15} /></button>
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Product Name</label><input value={v.name || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "name", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" placeholder="Variant name" /></div>
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Status</label><select value={v.status || "Active"} onChange={e => updateVariantInTab(activeVariantTab, v._key, "status", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white"><option value="Active">Active</option><option value="Draft">Draft</option><option value="Inactive">Inactive</option></select></div>
                            </div>
                            {activeVariantTab === "material" && (
                              <div>
                                <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">MATERIAL</label>
                                <input
                                  value={v.materialValue || v.material || v.attributes?.material || ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateVariantInTab(activeVariantTab, v._key, "materialValue", val);
                                    updateVariantInTab(activeVariantTab, v._key, "attributes", {
                                      ...(v.attributes || {}),
                                      variantType: "material",
                                      material: val,
                                    });
                                  }}
                                  className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white"
                                  placeholder="Enter material name (e.g. Basmati, Cotton, Silk)"
                                />
                              </div>
                            )}
                            {activeVariantTab === "color" && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">COLOR CODE</label>
                                  <div className="flex items-center gap-2">
                                    <input value={v.colorValue || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "colorValue", e.target.value)} className="h-9 flex-1 rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" placeholder="#FF0000" />
                                    <div className="h-9 w-9 rounded-lg border border-[#e5d8cd] shrink-0" style={{ backgroundColor: v.colorValue || "#ccc" }} title={v.colorValue || "No color"} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">COLOR NAME</label>
                                  <input value={v.colorName || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "colorName", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" placeholder="Red" />
                                </div>
                              </div>
                            )}
                            {activeVariantTab === "size" && (
                              <div>
                                <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">SIZE</label>
                                <input
                                  type="text"
                                  value={v.sizeValue || v.size || ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateVariantInTab(activeVariantTab, v._key, "sizeValue", val);
                                    updateVariantInTab(activeVariantTab, v._key, "size", val);
                                    updateVariantInTab(activeVariantTab, v._key, "attributes", {
                                      ...(v.attributes || {}),
                                      variantType: "size",
                                      size: val,
                                    });
                                  }}
                                  className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white"
                                  placeholder="Enter size (e.g. 456g, 500g, 1kg, S, M, L)"
                                />
                              </div>
                            )}
                            {activeVariantTab === "unit" && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">UNIT</label>
                                  <input
                                    type="text"
                                    value={v.unitValue || v.unit || ""}
                                    onChange={e => {
                                      const val = e.target.value;
                                      updateVariantInTab(activeVariantTab, v._key, "unitValue", val);
                                      updateVariantInTab(activeVariantTab, v._key, "unit", val);
                                      updateVariantInTab(activeVariantTab, v._key, "attributes", {
                                        ...(v.attributes || {}),
                                        variantType: "unit",
                                        unit: val,
                                        unitQuantity: v.unitQuantity || ""
                                      });
                                    }}
                                    className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white"
                                    placeholder="Enter unit (e.g. Pack, Piece, Gram, Kilogram, Box)"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">
                                    UNIT QUANTITY (OPTIONAL)
                                  </label>
                                  <input
                                    type="text"
                                    value={v.unitQuantity || ""}
                                    onChange={e => {
                                      const val = e.target.value;
                                      updateVariantInTab(activeVariantTab, v._key, "unitQuantity", val);
                                      updateVariantInTab(activeVariantTab, v._key, "attributes", {
                                        ...(v.attributes || {}),
                                        variantType: "unit",
                                        unit: v.unitValue || v.unit || "",
                                        unitQuantity: val
                                      });
                                    }}
                                    className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white"
                                    placeholder="e.g. 1, 500, 10"
                                  />
                                </div>
                              </div>
                            )}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <div className="flex items-center mb-1"><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82]">SKU *</label><AIButton loading={aiGenerating[`ai_vsku_${v._key}`]} onClick={async () => { const ctx = { ...getAIContext(), variantType: activeVariantTab, variantValue: getVariantVal(v, activeVariantTab) || `Option ${idx + 1}`, variantIndex: idx }; const content = await generateAIContent("variantSku", ctx); if (content) updateVariantInTab(activeVariantTab, v._key, "sku", content); }} /></div>
                                <input value={v.sku || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "sku", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" />
                              </div>
                              <div>
                                <div className="flex items-center mb-1"><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Barcode</label><AIButton loading={aiGenerating[`ai_vbarcode_${v._key}`]} onClick={async () => { const ctx = { ...getAIContext(), variantType: activeVariantTab, variantValue: getVariantVal(v, activeVariantTab) || `Option ${idx + 1}`, variantIndex: idx }; const content = await generateAIContent("variantBarcode", ctx); if (content) updateVariantInTab(activeVariantTab, v._key, "barcode", content); }} /></div>
                                <input value={v.barcode || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "barcode", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center mb-1"><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Description</label><AIButton loading={aiGenerating[`ai_vdesc_${v._key}`]} onClick={async () => { const content = await generateAIContent("variantDescription", { ...getAIContext(), variantType: activeVariantTab, variantValue: getVariantVal(v, activeVariantTab) || `Option ${idx + 1}`, variantIndex: idx }); if (content) updateVariantInTab(activeVariantTab, v._key, "description", content); }} /></div>
                              <textarea value={v.description || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "description", e.target.value)} rows={2} className="w-full rounded-lg border border-[#e5d8cd] px-2.5 py-1.5 text-[12px] bg-white" placeholder="Variant description..." />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">MRP *</label><input type="number" value={v.mrpPrice || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "mrpPrice", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" /></div>
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Selling Price *</label><input type="number" value={v.sellingPrice || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "sellingPrice", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" /></div>
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Cost Price</label><input type="number" value={v.costPrice || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "costPrice", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" /></div>
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Stock</label><input type="number" value={v.quantity || 0} onChange={e => updateVariantInTab(activeVariantTab, v._key, "quantity", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" /></div>
                              <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Weight</label><input type="number" value={v.weight || ""} onChange={e => updateVariantInTab(activeVariantTab, v._key, "weight", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2.5 text-[12px] bg-white" placeholder="g" /></div>
                            </div>
                            {/* 4 Image Upload Slots for this Individual Variant Entry */}
                            <div className="pt-3 border-t border-[#efe5dc]">
                              <label className="block text-[10.5px] font-black uppercase tracking-wider text-[#796d66] mb-2">
                                {VARIANT_TABS.find(vt => vt.key === activeVariantTab)?.label} Images (Up to 4)
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[0, 1, 2, 3].map((slotIdx) => {
                                  const currentSlots = v.images || [null, null, null, null];
                                  const slot = currentSlots[slotIdx];
                                  const slotLabel = `${VARIANT_TABS.find(vt => vt.key === activeVariantTab)?.label} Image ${slotIdx + 1}`;
                                  return (
                                    <div key={slotIdx} className="flex flex-col items-center justify-center rounded-xl border border-[#e5d8cd] bg-[#faf9f6] p-2.5 shadow-sm min-h-[125px] relative group">
                                      <span className="text-[9.5px] font-extrabold text-[#796d66] mb-1.5 uppercase tracking-wide">{slotLabel}</span>
                                      {slot?.url ? (
                                        <div className="relative h-18 w-full rounded-lg border border-[#efe5dc] overflow-hidden group/img bg-white flex items-center justify-center">
                                          <img src={slot.url} alt={slotLabel} className="h-full w-full object-cover" />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-1.5">
                                            <label className="cursor-pointer h-6 px-2.5 rounded bg-white text-[9.5px] font-black text-[#3a1100] hover:bg-orange-50 flex items-center justify-center shadow-sm">
                                              Replace
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => {
                                                  const file = e.target.files?.[0];
                                                  if (file) handleVariantImageUpload(file, v._key, slotIdx);
                                                  e.target.value = "";
                                                }}
                                              />
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedSlots = [...(v.images || [null, null, null, null])];
                                                updatedSlots[slotIdx] = null;
                                                updateVariantInTab(activeVariantTab, v._key, "images", updatedSlots);
                                              }}
                                              className="h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition shadow-sm"
                                              title="Remove Image"
                                            >
                                              <X size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <label className="flex flex-col h-18 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#cfc1b5] hover:border-[#fd761a] text-[#796d66] hover:text-[#fd761a] transition bg-white">
                                          <Upload size={14} className="mb-0.5" />
                                          <span className="text-[9px] font-bold">Upload Image {slotIdx + 1}</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                              const file = e.target.files?.[0];
                                              if (file) handleVariantImageUpload(file, v._key, slotIdx);
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ═══ SECTION 5: PRODUCT HIGHLIGHTS ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Star size={15} className="text-[#fd761a]" /> Product Highlights
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[["brand","Brand"],["type","Type"],["quantity","Quantity"],["maximumShelfLife","Maximum Shelf Life"],["organic","Organic"],["seller","Seller"],["dietType","Diet Type"],["countryOfOrigin","Country of Origin"]].map(([k,label])=>(
                        <div key={k}><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">{label}</label><input value={listingForm.productHighlights?.[k] || ""} onChange={e=>setListingForm(p=>({ ...p, productHighlights:{ ...(p.productHighlights||{}), [k]: e.target.value }}))} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder={label} /></div>
                      ))}
                    </div>
                    <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Highlight Cards — one per line as Title|Description</label><textarea value={(listingForm.productHighlights?.items||[]).map(i=>`${i.title}|${i.description}`).join("\n")} onChange={e=>{const items=e.target.value.split("\n").filter(Boolean).map(l=>{const [title,description]=l.split("|");return {title: (title||"").trim(), description: (description||"").trim()};}); setListingForm(p=>({ ...p, productHighlights:{ ...(p.productHighlights||{}), items }}));}} rows={3} className="w-full rounded-xl border border-[#e5d8cd] px-3 py-2 text-[12px] outline-none focus:border-[#fd761a]" placeholder="100% Organic|Made with organic, chemical free ingredients" /></div>
                  </div>

                  {/* ═══ SECTION 5.1: RELATED PRODUCTS ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Grid size={15} className="text-[#fd761a]" /> Related Products Category
                    </h3>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">
                        Select Category for Related Products Carousel
                      </label>
                      <select
                        value={listingForm.relatedProductsCategory || ""}
                        onChange={e => updateForm("relatedProductsCategory", e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a] bg-white"
                      >
                        <option value="">Same as Product Category (Default)</option>
                        {categories.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10.5px] font-medium text-[#9a8b82]">
                        Products belonging to the selected category will be automatically displayed under "Products related to this items" on the product detail page (excluding this product).
                      </p>
                    </div>
                  </div>

                  {/* ═══ SECTION 6: ADDITIONAL FEATURES ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Activity size={15} className="text-[#fd761a]" /> Additional Features
                    </h3>
                    <div className="space-y-3">
                      {(listingForm.additionalFeatures||[]).map((f,idx)=>(
                        <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                          <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Label</label><input value={f.label} onChange={e=>{const arr=[...listingForm.additionalFeatures]; arr[idx]={...f, label:e.target.value}; setListingForm(p=>({...p,additionalFeatures:arr}));}} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2 text-[12px]" placeholder="Healthy" /></div>
                          <div><label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Value</label><input value={f.value} onChange={e=>{const arr=[...listingForm.additionalFeatures]; arr[idx]={...f, value:e.target.value}; setListingForm(p=>({...p,additionalFeatures:arr}));}} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-2 text-[12px]" placeholder="Supports a balanced lifestyle." /></div>
                          <button type="button" onClick={()=>{const arr=[...listingForm.additionalFeatures]; arr.splice(idx,1); setListingForm(p=>({...p,additionalFeatures:arr}));}} className="h-9 px-3 rounded-lg border border-[#efe5dc] text-[#9a8b82] hover:text-rose-600"><X size={14}/></button>
                        </div>
                      ))}
                      <button type="button" onClick={()=>setListingForm(p=>({...p, additionalFeatures:[...(p.additionalFeatures||[]), {label:"", value:"", key: `feat_${Date.now()}`}]}))} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cfc1b5] px-3 text-[11px] font-black text-[#5c514b] hover:border-[#fd761a]"><Plus size={12}/> Add Feature</button>
                    </div>
                  </div>

                  {/* ═══ SECTION 7: ABOUT THIS PRODUCT ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <div className="flex items-center border-b border-[#faf7f4] pb-2">
                      <h3 className="text-[14px] font-black text-[#3a1100] flex items-center gap-2">
                        <FileText size={15} className="text-[#fd761a]" /> About this product
                      </h3>
                      <AIButton loading={aiGenerating.ai_aboutProduct} onClick={async () => { const content = await generateAIContent("aboutProduct", getAIContext()); if (content) { const lines = content.split("\n").map(l => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean); const bullets = Array.from({ length: 6 }, (_, i) => lines[i] || ""); setListingForm(p => ({ ...p, aboutThisProduct: bullets })); } }} />
                    </div>
                    <div className="space-y-2">
                      {Array.from({ length: 6 }, (_, i) => listingForm.aboutThisProduct?.[i] || "").map((bullet, i) => (
                        <div key={i}>
                          <label className="block text-[9.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">Bullet {i + 1}</label>
                          <input value={bullet} onChange={e => { const updated = Array.from({ length: 6 }, (_, idx) => listingForm.aboutThisProduct?.[idx] || ""); updated[i] = e.target.value; setListingForm(p => ({ ...p, aboutThisProduct: updated })); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder={`Point ${i + 1}...`} />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10.5px] font-bold text-[#9a8b82]">Each bullet becomes a • point on the product page.</p>
                  </div>

                  {/* ═══ SECTION 8: MEASUREMENT ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Package size={15} className="text-[#fd761a]" /> Measurement
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Package Weight</label><input value={listingForm.measurement?.packageWeight||""} onChange={e=>setListingForm(p=>({...p, measurement:{...(p.measurement||{}), packageWeight:e.target.value}}))} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px]" placeholder="500g" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Height</label><input value={listingForm.measurement?.height||""} onChange={e=>setListingForm(p=>({...p, measurement:{...(p.measurement||{}), height:e.target.value}}))} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px]" placeholder="20 cm" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Number of Items</label><input type="number" value={listingForm.measurement?.numberOfItems||1} onChange={e=>setListingForm(p=>({...p, measurement:{...(p.measurement||{}), numberOfItems:Number(e.target.value)}}))} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px]" /></div>
                      <div className="sm:col-span-2 md:col-span-3"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Sizes (comma separated)</label><input value={(listingForm.measurement?.sizes||[]).join(", ")} onChange={e=>setListingForm(p=>({...p, measurement:{...(p.measurement||{}), sizes:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}}))} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px]" placeholder="250g, 500g, 1kg, 2kg, 5kg, 10kg" /></div>
                    </div>
                  </div>

                  {/* ═══ SECTION 9: SHIPPING & LOGISTICS ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Truck size={15} className="text-[#fd761a]" /> Shipping & Logistics
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Weight (g)</label><input type="number" value={listingForm.productWeight || ""} onChange={e => updateForm("productWeight", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. 500" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Height (cm)</label><input type="number" value={listingForm.productDimensions?.height || ""} onChange={e => updateForm("productDimensions", { ...listingForm.productDimensions, height: e.target.value })} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Width (cm)</label><input type="number" value={listingForm.productDimensions?.width || ""} onChange={e => updateForm("productDimensions", { ...listingForm.productDimensions, width: e.target.value })} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Length (cm)</label><input type="number" value={listingForm.productDimensions?.length || ""} onChange={e => updateForm("productDimensions", { ...listingForm.productDimensions, length: e.target.value })} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Package Weight (g)</label><input type="number" value={listingForm.packageWeight || ""} onChange={e => updateForm("packageWeight", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. 600" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Package Dimensions</label><input value={listingForm.packageDimensionsText || ""} onChange={e => updateForm("packageDimensionsText", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. 20 × 15 × 10 cm" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Shipping Class</label><select value={listingForm.shippingClass || ""} onChange={e => updateForm("shippingClass", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]"><option value="">Select Class</option><option value="standard">Standard</option><option value="express">Express</option><option value="overnight">Overnight</option><option value="heavy">Heavy/Oversized</option><option value="fragile">Fragile</option></select></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Shipping Cost (₹)</label><input type="number" value={listingForm.shippingCost || ""} onChange={e => updateForm("shippingCost", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Leave empty for default" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Delivery Time</label><input value={listingForm.deliveryTime || ""} onChange={e => updateForm("deliveryTime", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. 3-5 business days" /></div>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {[["pickupAvailable","Pickup Available"],["freeShipping","Free Shipping"],["codAvailable","COD Available"],["isFragile","Fragile"],["isHazardous","Hazardous"]].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={listingForm[key] || false} onChange={e => updateForm(key, e.target.checked)} className="h-4 w-4 rounded border-[#e5d8cd] text-[#fd761a] focus:ring-[#fd761a]" />
                          <span className="text-[12px] font-bold text-[#5c514b]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ═══ SECTION 10: WARRANTY & RETURNS ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <ShieldCheck size={15} className="text-[#fd761a]" /> Warranty & Returns
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Warranty Period</label><input value={listingForm.warrantyPeriod || ""} onChange={e => updateForm("warrantyPeriod", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. 12 months" /></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Warranty Type</label><select value={listingForm.warrantyType || "Manufacturer"} onChange={e => updateForm("warrantyType", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]"><option value="Manufacturer">Manufacturer</option><option value="Seller">Seller</option><option value="Extended">Extended</option><option value="None">None</option></select></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Return Period (Days)</label><input type="number" value={listingForm.returnPeriodDays || 7} onChange={e => updateForm("returnPeriodDays", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" /></div>
                      <div className="sm:col-span-2 md:col-span-3"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Warranty Terms</label><textarea value={listingForm.warrantyTerms || ""} onChange={e => updateForm("warrantyTerms", e.target.value)} rows={2} className="w-full rounded-lg border border-[#e5d8cd] px-3 py-2 text-[13px] outline-none focus:border-[#fd761a]" placeholder="Terms and conditions..." /></div>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {[["isReturnable","Returnable"],["replacementAvailable","Replacement Available"],["installationRequired","Installation Required"]].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={listingForm[key] || false} onChange={e => updateForm(key, e.target.checked)} className="h-4 w-4 rounded border-[#e5d8cd] text-[#fd761a] focus:ring-[#fd761a]" />
                          <span className="text-[12px] font-bold text-[#5c514b]">{label}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Warranty Document</label>
                      {listingForm.warrantyDocument ? (
                        <div className="flex items-center gap-3 rounded-lg border border-[#e5d8cd] bg-[#faf8f5] px-3 py-2">
                          <FileText size={16} className="text-[#fd761a] shrink-0" />
                          <span className="text-[12px] font-bold text-[#5c514b] truncate flex-1">{listingForm.warrantyDocument.name || "warranty-document"}</span>
                          <a href={listingForm.warrantyDocument.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#e5d8cd] bg-white px-2 text-[10px] font-black text-[#5c514b] hover:border-[#fd761a] transition"><ExternalLink size={10} /> View</a>
                          <button type="button" onClick={() => updateForm("warrantyDocument", null)} className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-[10px] font-black text-rose-600 hover:bg-rose-50 transition"><Trash2 size={10} /> Delete</button>
                        </div>
                      ) : (
                        <label className="flex h-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#cfc1b5] hover:border-[#fd761a] text-[#796d66] hover:text-[#fd761a] transition bg-[#faf8f5]">
                          <div className="text-center"><Upload size={18} className="mx-auto mb-1" /><span className="text-[10px] font-bold">Upload Warranty Document</span><p className="text-[9px] text-[#9a8b82]">PDF, DOC, DOCX, PNG, JPG</p></div>
                          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const reader = new FileReader(); reader.onload = () => { if (reader.result) updateForm("warrantyDocument", { url: reader.result, name: f.name }); }; reader.readAsDataURL(f); } e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={serviceCenterEnabled} onChange={e => setServiceCenterEnabled(e.target.checked)} className="h-4 w-4 rounded border-[#e5d8cd] text-[#fd761a] focus:ring-[#fd761a]" />
                        <span className="text-[12px] font-bold text-[#5c514b]">Service Center</span>
                      </label>
                    </div>
                    {serviceCenterEnabled && (
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Authorized Service Center</label><input value={listingForm.serviceCenter || ""} onChange={e => updateForm("serviceCenter", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="e.g. Authorized service center in Chennai" /></div>
                    )}
                  </div>

                  {/* ═══ SECTION 11: PRODUCT VISIBILITY ═══ */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[14px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2">
                      <Eye size={15} className="text-[#fd761a]" /> Product Visibility
                    </h3>
                    <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-2">Tags (comma separated)</label><input value={listingForm.tags || ""} onChange={e => updateForm("tags", e.target.value)} className="h-9 w-full rounded-lg border border-[#e5d8cd] px-3 text-[13px] outline-none focus:border-[#fd761a]" placeholder="organic, flour, premium" /></div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-2">Product Badges</label>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {BADGE_OPTIONS.map(b => { const isActive = (listingForm.badge || "") === b; return (
                          <label key={b} className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition ${isActive ? "border-[#fd761a] bg-[#fff1e6]" : "border-[#f3ece5] bg-white hover:bg-[#faf8f5] hover:border-[#fd761a]/50"}`}>
                            <input type="radio" name="productBadge" checked={isActive} onChange={() => updateForm("badge", b)} className="mt-0.5 h-4 w-4 border-[#e5d8cd] text-[#fd761a] focus:ring-[#fd761a]" />
                            <div><span className={`text-[12px] font-black ${isActive ? "text-[#fd761a]" : "text-[#21150f]"}`}>{b}</span></div>
                          </label>
                        ); })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-2">Visibility Flags</label>
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {[["isFeatured","Featured Product","Show in featured section"],["isTrending","Trending","Mark as trending product"],["isBestSeller","Best Seller","Show best seller badge"],["isNewArrival","New Arrival","Mark as new arrival"],["isLimitedOffer","Limited Offer","Show limited offer badge"],["isRecommended","Recommended","Show in recommendations"]].map(([key, label, desc]) => {
                          const isActive = (listingForm.visibilityFlag || "") === key;
                          return (
                            <label key={key} className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition ${isActive ? "border-[#fd761a] bg-[#fff1e6]" : "border-[#f3ece5] bg-white hover:bg-[#faf8f5] hover:border-[#fd761a]/50"}`}>
                              <input type="radio" name="visibilityFlag" checked={isActive} onChange={() => updateForm("visibilityFlag", key)} className="mt-0.5 h-4 w-4 border-[#e5d8cd] text-[#fd761a] focus:ring-[#fd761a]" />
                              <div><span className={`text-[12px] font-black ${isActive ? "text-[#fd761a]" : "text-[#21150f]"}`}>{label}</span><p className="text-[10px] font-bold text-[#9a8b82]">{desc}</p></div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal actions Footer */}
                <footer className="border-t border-[#f5eee8] bg-[#faf7f4] px-6 py-4 flex justify-between items-center shrink-0">
                  <div className="flex gap-2">
                    <button 
                      onClick={saveDraft} 
                      disabled={saving || modalLoading} 
                      className="inline-flex h-11 items-center gap-1 px-4 rounded-xl border border-[#efe5dc] bg-white text-[12px] font-black text-[#5c514b] hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Save size={13} /> Save Draft
                    </button>
                  </div>
                  <div className="flex gap-2.5">
                    <button onClick={() => setShowListingModal(false)} className="h-11 px-5 rounded-xl border border-[#efe5dc] bg-white text-[12px] font-black text-[#5c514b]" type="button">Cancel</button>
                    <button 
                      onClick={publishProduct} 
                      disabled={saving || modalLoading} 
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#3a1100] hover:bg-[#fd761a] px-6 text-[12px] font-black text-white transition disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Publish Live
                    </button>
                  </div>
                </footer>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {viewUsersModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 p-4 backdrop-blur-[3px]">
              <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} className="w-full max-w-md rounded-2xl bg-white border border-[#efe5dc] shadow-2xl overflow-hidden">
                <header className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-5 py-4">
                  <div>
                    <h3 className="text-[14px] font-black text-[#3a1100]">Wishlist Users</h3>
                    <p className="text-[11px] font-bold text-[#9a8b82]">{viewUsersModal.product?.name}</p>
                  </div>
                  <button onClick={() => setViewUsersModal(null)} className="h-8 w-8 grid place-items-center rounded-lg border border-[#efe5dc] text-[#9a8b82] hover:text-[#3a1100]"><X size={16} /></button>
                </header>
                <div className="p-5">
                  {(() => {
                    const a = viewUsersModal.analytics;
                    const count = a?.wishlistCount ?? 0;
                    if (count === 0) return (
                      <div className="py-8 text-center">
                        <Heart size={28} className="mx-auto text-[#c7bab0] mb-2" />
                        <p className="text-[13px] font-bold text-[#796d66]">No wishlist activity</p>
                        <p className="text-[11px] text-[#9a8b82]">Users who add this product to wishlist will appear here.</p>
                      </div>
                    );
                    return (
                      <div className="space-y-3">
                        <div className="rounded-xl bg-pink-50 border border-pink-100 px-4 py-3 flex items-center justify-between">
                          <span className="text-[12px] font-black text-[#be123c]">Total users</span>
                          <span className="text-[18px] font-black text-[#e11d48]">{count}</span>
                        </div>
                        <div className="rounded-xl border border-[#efe5dc] p-3 max-h-64 overflow-auto">
                          <p className="text-[11px] font-bold text-[#9a8b82] mb-2">Current wishlist identities (internal IDs)</p>
                          {(a?.currentWishlistUsers || []).slice(0, 20).map((id) => (
                            <div key={id} className="flex items-center gap-2 py-1.5 border-b border-[#f5eee8] last:border-0">
                              <span className="h-6 w-6 rounded-full bg-pink-100 grid place-items-center text-pink-600"><Heart size={10} /></span>
                              <span className="text-[11px] font-mono text-[#5c514b] truncate">{String(id).slice(0,22)}…</span>
                              <span className="ml-auto text-[10px] font-bold text-emerald-600">Active</span>
                            </div>
                          ))}
                          {(a?.currentWishlistUsers || []).length > 20 && <p className="mt-2 text-[11px] text-[#9a8b82]">+{a.currentWishlistUsers.length - 20} more</p>}
                        </div>
                        <p className="text-[10px] leading-relaxed text-[#9a8b82]">Privacy: only aggregated counts are shown in the card. Raw anonymous identifiers are never exposed publicly and this modal is admin-only.</p>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  );
}
