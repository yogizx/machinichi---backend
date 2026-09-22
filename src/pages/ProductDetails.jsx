import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Crosshair,
  Droplet,
  Heart,
  Leaf,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import api from "../services/api";

// Visual image assets matching the reference image presentation
const mainCookieBoxImage =
  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1000&q=92";
const thumb1 =
  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=300&q=90";
const thumb2 =
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=300&q=90";
const thumb3 =
  "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=300&q=90";
const thumb4 =
  "https://images.unsplash.com/photo-1548365328-8c6db4b63388?auto=format&fit=crop&w=300&q=90";

const customerReviewsList = [];

const defaultSavedAddresses = [];

function getHighlightIcon(title = "") {
  const t = (title || "").toLowerCase();
  if (t.includes("crispy") || t.includes("delicious") || t.includes("snack") || t.includes("taste") || t.includes("flavor") || t.includes("food") || t.includes("treat") || t.includes("crunch")) return "🍪";
  if (t.includes("fresh") || t.includes("prepared") || t.includes("cook") || t.includes("baking")) return "🥗";
  if (t.includes("organic") || t.includes("natural") || t.includes("pure") || t.includes("eco")) return "🌿";
  if (t.includes("healthy") || t.includes("diet") || t.includes("health") || t.includes("nutritious")) return "🥑";
  if (t.includes("premium") || t.includes("quality") || t.includes("best") || t.includes("gold") || t.includes("grade")) return "🏆";
  if (t.includes("fast") || t.includes("delivery") || t.includes("ship") || t.includes("express")) return "🚚";
  if (t.includes("secure") || t.includes("safety") || t.includes("shield") || t.includes("guarantee") || t.includes("protect")) return "🛡️";
  if (t.includes("perfect") || t.includes("party") || t.includes("tea") || t.includes("evening")) return "☕";
  return "📦";
}

function ProductDetails({
  favoriteProducts = new Set(),
  savedProducts = [],
  onAddToCart = () => {},
  onFavoriteToggle = () => {},
  onSaveForLater = () => {},
}) {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [apiProduct, setApiProduct] = useState(null);
  const [relatedProductsApi, setRelatedProductsApi] = useState([]);
  const [trendingProductsApi, setTrendingProductsApi] = useState([]);

  useEffect(() => {
    if (state?.product) {
      setApiProduct(state.product);
    }
    if (!slug) return;
    (async () => {
      try {
        const { data } = await api.get(`/products/slug/${encodeURIComponent(slug)}`);
        if (data.success && data.data) {
          setApiProduct(data.data);
        }
      } catch {
        /* fallback to existing state if available */
      }
    })();
  }, [slug]);

  const selected = apiProduct || (state?.product ? state.product : {});

  useEffect(() => {
    const targetId = selected._id || selected.id || slug;
    if (!targetId) return;
    (async () => {
      try {
        const { data } = await api.get(`/products/related/${encodeURIComponent(targetId)}`);
        if (data.success && Array.isArray(data.data)) {
          setRelatedProductsApi(data.data);
        }
      } catch {}
    })();
  }, [selected._id, selected.id, slug]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/products/trending");
        if (data.success && Array.isArray(data.data)) {
          setTrendingProductsApi(data.data);
        }
      } catch {}
    })();
  }, []);

  const product = {
    ...selected,
    title: selected.name || "Product",
    price: selected.sellingPrice ? `₹${Number(selected.sellingPrice).toLocaleString("en-IN")}` : selected.price || "₹0",
    oldPrice: selected.mrpPrice ? `₹${Number(selected.mrpPrice).toLocaleString("en-IN")}` : selected.oldPrice || "",
    mainImage: selected.images?.[0]?.url || selected.image || mainCookieBoxImage,
    rating: selected.averageRating || selected.rating || 4.8,
    reviewsCount: selected.reviewCount || selected.reviewsCount || 0,
  };

  const isFavorite = favoriteProducts.has(product.title);
  const isSaved = savedProducts.some((item) => (item.name || item.title) === (product.title || product.name));

  const handleSaveForLater = () => {
    if (!product) return;
    onSaveForLater({
      name: product.title || product.name,
      price: product.price,
      oldPrice: product.oldPrice,
      image: product.mainImage || product.image,
      sizes: [selectedSize],
      selectedSize: selectedSize,
      origin: product.origin || "ORGANIC STAPLE",
      rating: product.rating || 5,
    });
  };

  useEffect(() => {
    if (product._id) {
      let vid = localStorage.getItem("analytics_visitor_id");
      if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem("analytics_visitor_id", vid);
      }
      api.post(`/tracking/products/${product._id}/view`, { sessionId: vid }).catch(() => {});
    }
  }, [product._id]);

  const [activeImage, setActiveImage] = useState(product.mainImage);
  
  // Dynamic grouping for all 4 variant types: Material, Color, Size, Unit
  const configuredVariantGroups = useMemo(() => {
    const groups = [];
    const rawVariants = Array.isArray(selected.variants)
      ? selected.variants.filter((v) => v.status !== "Inactive" && v.isAvailable !== false)
      : [];

    const createOption = (v, type, labelVal, index) => {
      const selPrice = v.sellingPrice
        ? `₹${Number(v.sellingPrice).toLocaleString("en-IN")}`
        : product.price;
      const mrpPrice = v.mrpPrice
        ? `₹${Number(v.mrpPrice).toLocaleString("en-IN")}`
        : product.oldPrice;
      const variantImg =
        Array.isArray(v.images) && v.images.length > 0 && v.images[0]?.url
          ? v.images[0].url
          : (selected.images?.[0]?.url || product.mainImage);

      return {
        id: v._id || v.sku || `opt-${type}-${index}`,
        type,
        label: labelVal,
        price: selPrice,
        oldPrice: mrpPrice,
        image: variantImg,
        variantObj: v,
      };
    };

    if (rawVariants.length > 0) {
      // 1. Material Variants
      const materialVariants = rawVariants.filter(
        (v) =>
          v.attributes?.variantType === "material" ||
          v._variantType === "material" ||
          v.material ||
          v.materialValue ||
          v.attributes?.material
      );
      if (materialVariants.length > 0) {
        groups.push({
          type: "material",
          label: "Material",
          options: materialVariants.map((v, i) =>
            createOption(
              v,
              "material",
              v.material ||
                v.materialValue ||
                v.attributes?.material ||
                (v.name && v.name !== selected.name ? v.name : `Material ${i + 1}`),
              i
            )
          ),
        });
      }

      // 2. Color Variants
      const colorVariants = rawVariants.filter(
        (v) =>
          v.attributes?.variantType === "color" ||
          v._variantType === "color" ||
          v.color ||
          v.colorValue ||
          v.colorName ||
          v.attributes?.colorName
      );
      if (colorVariants.length > 0) {
        groups.push({
          type: "color",
          label: "Color",
          options: colorVariants.map((v, i) =>
            createOption(
              v,
              "color",
              v.colorName ||
                v.attributes?.colorName ||
                v.colorValue ||
                v.color ||
                (v.name && v.name !== selected.name ? v.name : `Color ${i + 1}`),
              i
            )
          ),
        });
      }

      // 3. Size Variants
      const sizeVariants = rawVariants.filter(
        (v) =>
          v.attributes?.variantType === "size" ||
          v._variantType === "size" ||
          v.size ||
          v.sizeValue ||
          v.attributes?.size
      );
      if (sizeVariants.length > 0) {
        groups.push({
          type: "size",
          label: "Size",
          options: sizeVariants.map((v, i) =>
            createOption(
              v,
              "size",
              v.sizeValue ||
                v.size ||
                v.attributes?.size ||
                (v.name && v.name !== selected.name ? v.name : `Size ${i + 1}`),
              i
            )
          ),
        });
      }

      // 4. Unit Variants
      const unitVariants = rawVariants.filter(
        (v) =>
          v.attributes?.variantType === "unit" ||
          v._variantType === "unit" ||
          v.unit ||
          v.unitValue ||
          v.attributes?.unit
      );
      if (unitVariants.length > 0) {
        groups.push({
          type: "unit",
          label: "Unit",
          options: unitVariants.map((v, i) => {
            const qty = v.unitQuantity || v.attributes?.unitQuantity || "";
            const u = v.unit || v.unitValue || v.attributes?.unit || "";
            const labelVal =
              qty && u
                ? `${qty} ${u}`
                : u || qty || (v.name && v.name !== selected.name ? v.name : `Unit ${i + 1}`);
            return createOption(v, "unit", labelVal, i);
          }),
        });
      }
    }

    // Legacy fallback if no variants array exists but measurement.sizes exist
    if (groups.length === 0 && selected.measurement?.sizes && selected.measurement.sizes.length > 0) {
      groups.push({
        type: "size",
        label: "Size",
        options: selected.measurement.sizes.map((sizeStr) => ({
          id: sizeStr,
          type: "size",
          label: sizeStr,
          price: product.price,
          oldPrice: product.oldPrice,
          image: product.mainImage,
          variantObj: null,
        })),
      });
    }

    // Return ALL configured variant groups in fixed display order.
    // Groups are already pushed in order: Material → Color → Size → Unit.
    // Only groups with actual data are included (empty groups are skipped above).

    return groups;
  }, [selected, product.price, product.oldPrice, product.mainImage]);

  const [selectedOptionIdMap, setSelectedOptionIdMap] = useState({});

  const handleSelectOption = (groupType, opt) => {
    setSelectedOptionIdMap((prev) => ({
      ...prev,
      [groupType]: prev[groupType] === opt.id ? null : opt.id,
    }));
  };

  const activeSelectedOption = useMemo(() => {
    for (const group of configuredVariantGroups) {
      const selectedId = selectedOptionIdMap[group.type];
      if (selectedId) {
        const found = group.options.find((o) => o.id === selectedId);
        if (found) return found;
      }
    }
    return null;
  }, [configuredVariantGroups, selectedOptionIdMap]);

  useEffect(() => {
    if (activeSelectedOption) {
      const varImgs = (activeSelectedOption.variantObj?.images || [])
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter(Boolean);
      if (varImgs.length > 0) {
        setActiveImage(varImgs[0]);
      } else if (activeSelectedOption.image) {
        setActiveImage(activeSelectedOption.image);
      }
    } else {
      const baseImg = selected.images?.[0]?.url || product.mainImage;
      setActiveImage(baseImg);
    }
  }, [activeSelectedOption, selected.images, product.mainImage]);

  const galleryThumbs = useMemo(() => {
    if (activeSelectedOption) {
      const varImgs = (activeSelectedOption.variantObj?.images || [])
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter(Boolean);
      if (varImgs.length > 0) {
        return Array.from(new Set(varImgs));
      }
      return [activeSelectedOption.image || product.mainImage];
    }

    const baseImages =
      selected.images && selected.images.length > 0
        ? selected.images.map((img) => (typeof img === "string" ? img : img?.url)).filter(Boolean)
        : [product.mainImage, thumb2, thumb3, thumb4];

    return Array.from(new Set(baseImages));
  }, [activeSelectedOption, selected.images, product.mainImage]);

  // Build related products from API data
  const relatedProductsData = useMemo(() => {
    if (relatedProductsApi && relatedProductsApi.length > 0) {
      return relatedProductsApi.map(p => ({
        _id: p._id,
        name: p.name || "Product",
        rating: p.averageRating || "4.8",
        price: p.sellingPrice ? `₹${Number(p.sellingPrice).toLocaleString("en-IN")}` : "₹0",
        image: p.images?.[0]?.url || p.thumbnail || "",
        slug: p.slug || "",
      }));
    }
    if (selected.frequentlyBoughtTogether && selected.frequentlyBoughtTogether.length > 0) {
      return selected.frequentlyBoughtTogether.map(p => ({
        _id: p._id,
        name: p.name || "Product",
        rating: p.averageRating || "4.8",
        price: p.sellingPrice ? `₹${Number(p.sellingPrice).toLocaleString("en-IN")}` : "₹0",
        image: p.images?.[0]?.url || p.thumbnail || "",
        slug: p.slug || "",
      }));
    }
    return [];
  }, [relatedProductsApi, selected]);

  // Build trending products from API data (exclude current product)
  const trendingProductsData = useMemo(() => {
    const currentId = selected._id || selected.id;
    if (trendingProductsApi && trendingProductsApi.length > 0) {
      return trendingProductsApi
        .filter(p => p._id !== currentId)
        .map(p => ({
        _id: p._id,
        name: p.name || "Product",
        rating: p.averageRating || "4.8",
        price: p.sellingPrice ? `₹${Number(p.sellingPrice).toLocaleString("en-IN")}` : "₹0",
        image: p.images?.[0]?.url || p.thumbnail || "",
        slug: p.slug || "",
      }));
    }
    if (selected.crossSell && selected.crossSell.length > 0) {
      return selected.crossSell.map(p => ({
        _id: p._id,
        name: p.name || "Product",
        rating: p.averageRating || "4.8",
        price: p.sellingPrice ? `₹${Number(p.sellingPrice).toLocaleString("en-IN")}` : "₹0",
        image: p.images?.[0]?.url || p.thumbnail || "",
        slug: p.slug || "",
      }));
    }
    return [];
  }, [trendingProductsApi, selected]);

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Share Popover State
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Delivery Location Side Drawer State
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(
    "Rajiv Gandhi Street, Coimbatore - 641001"
  );
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const [estimatedDeliveryDate] = useState("25 July 2026");

  // Customer Says Expand State
  const [showAllCustomerSays, setShowAllCustomerSays] = useState(false);
  const [showMoreFirstReviewImages, setShowMoreFirstReviewImages] = useState(false);

  const activePrice = activeSelectedOption ? activeSelectedOption.price : product.price;
  const activeOldPrice = activeSelectedOption ? activeSelectedOption.oldPrice : product.oldPrice;
  const activeSku = activeSelectedOption?.variantObj?.sku || selected.sku || "";
  const activeBarcode = activeSelectedOption?.variantObj?.barcode || selected.barcode || "";
  const activeDescription = activeSelectedOption?.variantObj?.description || product.productDescriptionDetailed || product.description || "No description available for this product.";

  const handleAddToCartClick = () => {
    const itemToCart = {
      ...product,
      price: activePrice,
      oldPrice: activeOldPrice,
      selectedSize: activeSelectedOption?.label || "Default",
      variantSku: activeSelectedOption?.variantObj?.sku,
      selectedVariant: activeSelectedOption?.variantObj,
      image: activeSelectedOption?.image || product.mainImage,
      quantity,
    };
    onAddToCart(itemToCart, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleBuyNow = () => {
    const itemToCart = {
      ...product,
      price: activePrice,
      oldPrice: activeOldPrice,
      selectedSize: activeSelectedOption?.label || "Default",
      variantSku: activeSelectedOption?.variantObj?.sku,
      selectedVariant: activeSelectedOption?.variantObj,
      image: activeSelectedOption?.image || product.mainImage,
      quantity,
    };
    navigate("/checkout", { state: { product: itemToCart, quantity } });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedToast(true);
    setTimeout(() => {
      setCopiedToast(false);
      setIsShareOpen(false);
    }, 1800);
  };

  const handleWhatsAppShare = () => {
    const text = `Check out ${product.title} on Machinichi: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    setIsShareOpen(false);
  };

  const handleSelectAddress = (address) => {
    setSelectedLocation(address);
    setIsLocationDrawerOpen(false);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setSelectedLocation("Current Location (Coimbatore - 641001)");
          setIsLocationDrawerOpen(false);
        },
        () => {
          setSelectedLocation("Coimbatore, Tamil Nadu - 641001");
          setIsLocationDrawerOpen(false);
        }
      );
    } else {
      setSelectedLocation("Coimbatore, Tamil Nadu - 641001");
      setIsLocationDrawerOpen(false);
    }
  };

  const handleCustomLocationApply = (e) => {
    e.preventDefault();
    if (locationSearchInput.trim()) {
      setSelectedLocation(locationSearchInput.trim());
      setLocationSearchInput("");
      setIsLocationDrawerOpen(false);
    }
  };

  const displayedCustomerSays = showAllCustomerSays
    ? customerReviewsList
    : customerReviewsList.slice(0, 3);

  return (
    <div className="w-full bg-[#fcfcfc] text-[#111111] font-sans antialiased">
      {/* 1. Main Product Details Area */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          {/* Left Product Gallery */}
          <div className="flex flex-col-reverse gap-4 sm:flex-row">
            {/* Thumbnail Stack */}
            <div className="flex shrink-0 flex-row gap-3 sm:flex-col sm:items-center">
              {galleryThumbs.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition-all ${
                    activeImage === imgUrl ? "border-[#f96e15]" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  type="button"
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
              <button
                className="mt-1 grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                type="button"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Large Main Display Image */}
            <div className="relative min-h-[380px] flex-1 overflow-hidden rounded-2xl bg-[#1d120c] shadow-md sm:min-h-[500px]">
              <img
                src={activeImage}
                alt={product.title}
                className="h-full w-full object-cover"
              />

              {/* Functional Share Button & Popover */}
              <div className="absolute right-4 top-4 z-20">
                <button
                  className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-extrabold text-[#111111] shadow-md backdrop-blur transition hover:bg-white"
                  onClick={() => setIsShareOpen((prev) => !prev)}
                  type="button"
                >
                  <Share2 size={16} /> Share
                </button>

                {isShareOpen && (
                  <div className="absolute right-0 top-12 z-30 w-48 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl animate-in fade-in duration-200">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-[#111111] hover:bg-gray-100 transition"
                    >
                      <Copy size={15} className="text-[#f96e15]" />
                      {copiedToast ? (
                        <span className="font-extrabold text-[#16a34a]">Link Copied! ✓</span>
                      ) : (
                        "Copy Link"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-[#111111] hover:bg-gray-100 transition"
                    >
                      <MessageCircle size={15} className="text-[#25d366]" />
                      WhatsApp
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Product Purchase Details Panel */}
          <div className="flex flex-col justify-center">
            {/* Discount Badges */}
            <div className="flex items-center gap-3">
              {selected.discountPercent > 0 && (
                <span className="rounded-full bg-[#d7f59d] px-4 py-1.5 text-sm font-black text-[#234b07]">
                  {selected.discountPercent}% OFF
                </span>
              )}
              {selected.productHighlights?.organic && (
                <span className="rounded-full bg-[#f2eee9] px-4 py-1.5 text-sm font-black text-[#2b241f]">
                  100% ORGANIC
                </span>
              )}
              {selected.badges && selected.badges.length > 0 && selected.badges.slice(0, 2).map((badge, i) => (
                <span key={i} className="rounded-full bg-[#f2eee9] px-4 py-1.5 text-sm font-black text-[#2b241f]">
                  {badge.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Product Title */}
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#111111] sm:text-5xl">
              {product.title}
            </h1>

            {/* Star Rating & Review Count */}
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex text-[#f9a825]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={20} fill="currentColor" stroke="none" />
                ))}
              </div>
              <span className="text-base font-semibold text-[#111111]">
                4.8 ({product.reviewsCount} Reviews)
              </span>
            </div>

            {/* Pricing Section */}
            <div className="mt-5 flex items-baseline gap-4">
              <span className="text-4xl font-black text-[#111111] sm:text-5xl">{activePrice}</span>
              {activeOldPrice && activeOldPrice !== activePrice && (
                <span className="text-2xl font-semibold text-gray-400 line-through">
                  {activeOldPrice}
                </span>
              )}
              {selected.discountPercent > 0 && (
                <span className="rounded-full bg-[#e53935] px-3.5 py-1 text-sm font-bold text-white">
                  {selected.discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Dynamic Variant Selector Cards (Material / Color / Size / Unit) */}
            {configuredVariantGroups.length > 0 && (
              <div className="mt-7 space-y-6">
                {configuredVariantGroups.map((group) => (
                  <div key={group.type}>
                    <p className="text-sm font-extrabold text-[#111111]">
                      {group.label} <span className="font-normal text-gray-500">(Choose an option)</span>
                    </p>

                    <div className="mt-3.5 grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {group.options.map((opt) => {
                        const isSelected = selectedOptionIdMap[group.type] === opt.id;
                        const isColorGroup = group.type === "color";
                        const colorCode = opt.variantObj?.colorValue || opt.variantObj?.color;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(group.type, opt)}
                            className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition-all duration-200 ${
                              isSelected
                                ? "border-2 border-[#f96e15] bg-[#fff8f3] shadow-md ring-2 ring-[#f96e15]/20"
                                : "border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs"
                            }`}
                          >
                            {/* Variant Specific Image or Color Swatch */}
                            <div className="mb-2 h-14 w-14 overflow-hidden rounded-xl bg-gray-50 p-1 flex items-center justify-center">
                              {isColorGroup && colorCode && (!opt.variantObj?.images || opt.variantObj.images.length === 0) ? (
                                <div
                                  className="h-full w-full rounded-lg border border-gray-300 shadow-inner"
                                  style={{ backgroundColor: colorCode }}
                                  title={opt.label}
                                />
                              ) : (
                                <img
                                  src={opt.image || product.mainImage}
                                  alt={`${product.title} ${opt.label}`}
                                  className="h-full w-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                                />
                              )}
                            </div>

                            <span className="text-sm font-extrabold text-[#111111] line-clamp-1">{opt.label}</span>
                            <span className="text-xs font-bold text-gray-600 mt-0.5">{opt.price}</span>

                            {/* Selected Orange Check Indicator */}
                            {isSelected && (
                              <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#f96e15] text-xs font-bold text-white shadow-xs">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-12 items-center rounded-xl border border-gray-300 bg-white px-4 text-base font-bold">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1.5 text-gray-600 hover:text-[#111111]"
                  type="button"
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-lg">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1.5 text-gray-600 hover:text-[#111111]"
                  type="button"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* BUY NOW & ADD TO CART Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleBuyNow}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#f96e15] py-4 text-base font-extrabold tracking-wide text-white shadow-md transition hover:bg-[#e05d09]"
              >
                <Zap size={18} fill="currentColor" /> BUY NOW
              </button>
              <button
                type="button"
                onClick={handleAddToCartClick}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#f96e15] bg-white py-4 text-base font-extrabold tracking-wide text-[#f96e15] shadow-sm transition hover:bg-[#fff5ee]"
              >
                <ShoppingCart size={18} /> {isAdded ? "ADDED!" : "ADD TO CART"}
              </button>
            </div>

            {/* Improved Selected Delivery Location & Delivered By Date */}
            <div className="mt-6 rounded-3xl border border-gray-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fff2e8] text-[#f96e15]">
                    <MapPin size={22} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                      Selected Delivery Location
                    </span>
                    <span className="text-base font-extrabold text-[#111111] leading-snug line-clamp-1">
                      {selectedLocation}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationDrawerOpen(true)}
                  className="shrink-0 rounded-full bg-[#f0f4ff] px-4 py-2 text-xs font-extrabold text-[#2563eb] transition hover:bg-[#2563eb] hover:text-white"
                >
                  Change
                </button>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3 text-sm font-bold text-[#16a34a] sm:text-base">
                  <Truck size={20} className="shrink-0 text-[#16a34a]" />
                  <span>
                    Delivered by: <span className="font-extrabold text-[#111111]">{estimatedDeliveryDate}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Wishlist & Save for Later & Easy Returns */}
            <div className="mt-5 flex flex-wrap items-center gap-7 text-sm font-bold text-[#111111]">
              <button
                type="button"
                onClick={() => onFavoriteToggle(product.title, product._id)}
                className="flex items-center gap-2 hover:text-[#f96e15]"
              >
                <Heart size={18} className={isFavorite ? "fill-[#f96e15] text-[#f96e15]" : ""} />
                Wishlist
              </button>
              <button
                type="button"
                onClick={handleSaveForLater}
                className="flex items-center gap-2 hover:text-[#f96e15]"
              >
                <Bookmark size={18} className={isSaved ? "fill-[#f96e15] text-[#f96e15]" : ""} />
                {isSaved ? "Saved" : "Save for Later"}
              </button>
              <span className="flex items-center gap-2">
                <RotateCcw size={18} /> Easy Returns
              </span>
            </div>

            {/* 5 Feature Badges Row */}
            <div className="mt-7 grid grid-cols-5 gap-2 border-t border-gray-200 pt-6 text-center text-xs font-bold text-gray-800">
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5efe8] text-[#111111]">
                  <ShieldCheck size={20} />
                </div>
                <span>{selected.returnPolicy?.isReturnable !== false ? "Returnable" : "Non-returnable"}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5efe8] text-[#111111]">
                  <RefreshCw size={20} />
                </div>
                <span>{selected.returnPolicy?.returnPeriodDays || 7} Days Replacement</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5efe8] text-[#111111]">
                  <Leaf size={20} />
                </div>
                <span>{selected.productHighlights?.organic ? "100% Organic" : "Premium Quality"}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5efe8] text-[#111111]">
                  <Truck size={20} />
                </div>
                <span>{selected.freeShipping ? "Free Shipping" : "Fast Delivery"}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f5efe8] text-[#111111]">
                  <Lock size={20} />
                </div>
                <span>Secure Transaction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Product Highlights Section */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-extrabold text-[#111111]">Product Highlights</h2>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {/* Left Table Spec Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="grid grid-cols-2 gap-y-5 text-sm font-bold text-[#111111]">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🏷️</span> <span className="text-gray-500 font-semibold">Brand</span>
              </div>
              <div>{product.productHighlights?.brand || product.brand || "—"}</div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">🍪</span> <span className="text-gray-500 font-semibold">Type</span>
              </div>
              <div>{product.productHighlights?.type || product.category?.name || "—"}</div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">📦</span> <span className="text-gray-500 font-semibold">Quantity</span>
              </div>
              <div>{product.productHighlights?.quantity || product.availableSizes?.[0] || "—"}</div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">⌛</span> <span className="text-gray-500 font-semibold">Maximum Shelf Life</span>
              </div>
              <div>{product.productHighlights?.maximumShelfLife || "—"}</div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">🌾</span> <span className="text-gray-500 font-semibold">Organic</span>
              </div>
              <div>
                {(() => {
                  const val = product.productHighlights?.organic;
                  if (val === undefined || val === null || val === "") return "—";
                  if (val === true || val === "true") return "Yes";
                  if (val === false || val === "false") return "No";
                  return String(val);
                })()}
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">🏪</span> <span className="text-gray-500 font-semibold">Seller</span>
              </div>
              <div>{product.productHighlights?.seller || "—"}</div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">🥗</span> <span className="text-gray-500 font-semibold">Diet Type</span>
              </div>
              <div>{product.productHighlights?.dietType || "—"}</div>

              <div className="flex items-center gap-2.5">
                <span className="text-lg">🌍</span> <span className="text-gray-500 font-semibold">Country of Origin</span>
              </div>
              <div>{product.productHighlights?.countryOfOrigin || product.countryOfOrigin || "—"}</div>
            </div>
          </div>

          {/* Right Highlights Cards */}
          <div className="rounded-2xl border border-[#f0e6dd] bg-[#fffaf5] p-7 shadow-sm">
            <div className="space-y-5">
              {product.productHighlights?.items && product.productHighlights.items.length > 0 ? (
                product.productHighlights.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#3b2416] text-white text-lg">
                      {item.icon || getHighlightIcon(item.title)}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-[#111111]">{item.title}</h4>
                      <p className="text-sm font-medium text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-gray-400 text-center py-4">No highlight cards configured for this product.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. About This Product + Additional Features (SIDE BY SIDE) */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* About This Product */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-[#111111]">About this product</h2>
              <div className="grid h-10 w-10 place-items-center rounded-full border border-orange-200 bg-[#fff5ee] text-[#f96e15] text-lg">
                🌾
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-sm font-medium leading-relaxed text-gray-700">
              {(product.aboutThisProduct && product.aboutThisProduct.length > 0 ? product.aboutThisProduct.filter(Boolean) : []).map((txt, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-[#f96e15] text-base font-bold">•</span> {txt}
                </li>
              ))}
              {(!product.aboutThisProduct || product.aboutThisProduct.length === 0 || product.aboutThisProduct.every(t => !t)) && (
                <li className="text-gray-400 text-center py-2">No product details configured.</li>
              )}
            </ul>
          </div>

          {/* Additional Features with Icons */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#111111]">Additional Features</h2>

            <div className="mt-5 space-y-4 text-sm font-medium text-gray-700">
              {product.additionalFeatures && product.additionalFeatures.length > 0 ? (
                product.additionalFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[#f96e15] shrink-0">
                      {f.icon === "Activity" ? <Activity size={18} /> : f.icon === "Droplet" ? <Droplet size={18} /> : f.icon === "CheckCircle2" ? <CheckCircle2 size={18} /> : f.icon === "Leaf" ? <Leaf size={18} /> : <Utensils size={18} />}
                    </span>
                    <div className="grid grid-cols-[110px_1fr] flex-1">
                      <span className="font-extrabold text-[#111111]">{f.label}</span>
                      <span>: {f.value}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No additional features configured for this product.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Product Description (BELOW Section 3, FULL WIDTH) */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#111111]">Product Description</h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            {activeDescription}
          </p>

          {selected.tags && selected.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold text-[#111111]">
              {selected.tags.map((tag, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[#f96e15]">🏷️</span> {tag}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Measurement (BELOW Section 4, FULL WIDTH) */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#111111]">Measurement</h2>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-3.5 rounded-xl bg-[#faf7f3] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm">📦</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Package Weight</p>
                <p className="text-base font-extrabold text-[#111111]">
                  {(() => {
                    const raw = product.measurement?.packageWeight || product.packageWeight || product.weight;
                    if (!raw) return "—";
                    const s = String(raw).trim();
                    return /[a-zA-Z]$/.test(s) ? s : `${s}g`;
                  })()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 rounded-xl bg-[#faf7f3] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm">📏</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Height</p>
                <p className="text-base font-extrabold text-[#111111]">
                  {(() => {
                    const raw = product.measurement?.height || product.dimensions?.height;
                    if (!raw) return "—";
                    const s = String(raw).trim();
                    return /[a-zA-Z]$/.test(s) ? s : `${s} cm`;
                  })()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 rounded-xl bg-[#faf7f3] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm">🔢</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">No. of Items</p>
                <p className="text-base font-extrabold text-[#111111]">{product.measurement?.numberOfItems ?? 1}</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 rounded-xl bg-[#faf7f3] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl shadow-sm">🎒</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Size</p>
                <p className="text-sm font-extrabold text-[#111111]">
                  {(product.measurement?.sizes?.length > 0 ? product.measurement.sizes : product.availableSizes?.length > 0 ? product.availableSizes : ["Default"]).join(" / ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Products Related to This Item */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[#111111]">Products related to this items</h2>
          <div className="flex items-center gap-2.5">
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f96e15] text-white shadow-sm hover:bg-[#e05d09]"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f96e15] text-white shadow-sm hover:bg-[#e05d09]"
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {relatedProductsData.length > 0 ? relatedProductsData.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.slug && navigate(`/product/${item.slug}`)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:shadow-md cursor-pointer"
            >
              <button
                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-gray-600 backdrop-blur hover:text-[#f96e15]"
                type="button"
              >
                <Heart size={16} />
              </button>
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-gray-300"><Package size={32} /></div>
                )}
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#111111]">{item.name}</h3>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-[#f9a825] font-bold text-xs">
                  <Star size={13} fill="currentColor" stroke="none" /> {item.rating}
                </div>
                <span className="font-black text-[#111111]">{item.price}</span>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-8 text-center">
              <Package size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-400">No related products configured.</p>
            </div>
          )}
        </div>
      </section>

      {/* 7. Customer Reviews + Customer Says (SIDE BY SIDE) */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Reviews Left Box */}
          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-extrabold text-[#111111]">Customer Reviews</h2>

            <div className="mt-5 flex items-center gap-7">
              <div>
                <span className="text-6xl font-black text-[#111111]">{product.rating}</span>
                <div className="mt-1.5 flex text-[#f9a825]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} fill="currentColor" stroke="none" />
                  ))}
                </div>
                <p className="mt-1.5 text-sm font-bold text-gray-500">{product.reviewsCount} Reviews</p>
              </div>

              {/* Progress Bars */}
              <div className="flex-1 space-y-2 text-sm font-semibold text-gray-600">
                <div className="flex items-center gap-2.5">
                  <span className="w-12 text-right">5 Star</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-[80%] rounded-full bg-[#f96e15]" />
                  </div>
                  <span className="w-8 text-gray-400 font-medium">118</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 text-right">4 Star</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-[20%] rounded-full bg-[#f96e15]" />
                  </div>
                  <span className="w-8 text-gray-400 font-medium">24</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 text-right">3 Star</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-[8%] rounded-full bg-[#f96e15]" />
                  </div>
                  <span className="w-8 text-gray-400 font-medium">7</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 text-right">2 Star</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-[3%] rounded-full bg-[#f96e15]" />
                  </div>
                  <span className="w-8 text-gray-400 font-medium">2</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-12 text-right">1 Star</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-[2%] rounded-full bg-[#f96e15]" />
                  </div>
                  <span className="w-8 text-gray-400 font-medium">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Says Right Box */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
            <div>
              <h2 className="text-xl font-extrabold text-[#111111]">Customer Says</h2>

              <div className="mt-5 space-y-5 transition-all duration-300">
                {displayedCustomerSays.map((rev, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2.5 border-b border-gray-100 pb-5 last:border-0 last:pb-0 animate-in fade-in duration-300"
                  >
                    {/* Header: Avatar, Name, Date */}
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.avatar}
                        alt={rev.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="text-sm font-extrabold text-[#111111]">{rev.name}</h4>
                        <span className="text-xs font-medium text-gray-400">{rev.date}</span>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex text-[#f9a825]">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} size={14} fill="currentColor" stroke="none" />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-sm font-medium leading-relaxed text-gray-800">{rev.text}</p>

                    {/* Customer Uploaded Product Images BELOW Review Text */}
                    {idx === 0 ? (
                      /* First Review Gallery with +2 indicator */
                      <div className="mt-1 flex items-center gap-2.5">
                        <img
                          src={thumb1}
                          alt="Review Image 1"
                          className="h-14 w-14 rounded-xl border border-gray-200 object-cover"
                        />
                        <img
                          src={thumb2}
                          alt="Review Image 2"
                          className="h-14 w-14 rounded-xl border border-gray-200 object-cover"
                        />

                        {!showMoreFirstReviewImages ? (
                          <button
                            type="button"
                            onClick={() => setShowMoreFirstReviewImages(true)}
                            className="group relative h-14 w-14 overflow-hidden rounded-xl border border-gray-200 focus:outline-none"
                          >
                            <img
                              src={thumb3}
                              alt="Review Image 3"
                              className="h-full w-full object-cover brightness-50 transition group-hover:scale-105"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                              +2
                            </span>
                          </button>
                        ) : (
                          <>
                            <img
                              src={thumb3}
                              alt="Review Image 3"
                              className="h-14 w-14 rounded-xl border border-gray-200 object-cover animate-in fade-in"
                            />
                            <img
                              src={thumb4}
                              alt="Review Image 4"
                              className="h-14 w-14 rounded-xl border border-gray-200 object-cover animate-in fade-in"
                            />
                          </>
                        )}
                      </div>
                    ) : (
                      /* Subsequent Reviews: Product image BELOW text */
                      rev.productImage && (
                        <div className="mt-1">
                          <img
                            src={rev.productImage}
                            alt="Customer Uploaded Review"
                            className="h-14 w-14 rounded-xl border border-gray-200 object-cover"
                          />
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expandable See More / See Less Button */}
            <div className="mt-6 text-center border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAllCustomerSays((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#111111] hover:text-[#f96e15] transition-colors"
              >
                {showAllCustomerSays ? (
                  <>
                    See Less <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    See More <ChevronDown size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Trending Products */}
      <section className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-[#111111]">Trending Products</h2>
          <div className="flex items-center gap-2.5">
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f96e15] text-white shadow-sm hover:bg-[#e05d09]"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-[#f96e15] text-white shadow-sm hover:bg-[#e05d09]"
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {trendingProductsData.length > 0 ? trendingProductsData.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.slug && navigate(`/product/${item.slug}`)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:shadow-md cursor-pointer"
            >
              <button
                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-gray-600 backdrop-blur hover:text-[#f96e15]"
                type="button"
              >
                <Heart size={16} />
              </button>
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-gray-300"><Package size={32} /></div>
                )}
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#111111]">{item.name}</h3>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-[#f9a825] font-bold text-xs">
                  <Star size={13} fill="currentColor" stroke="none" /> {item.rating}
                </div>
                <span className="font-black text-[#111111]">{item.price}</span>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-8 text-center">
              <Package size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-400">No trending products configured.</p>
            </div>
          )}
        </div>
      </section>

      {/* Delivery Address Selection Side Drawer (Matching Uploaded Reference Image) */}
      {isLocationDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsLocationDrawerOpen(false)}
          />

          {/* Side Panel Container */}
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl transition-transform animate-in slide-in-from-right duration-300">
            {/* Top Handle Pill Bar */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-[#111111]">
                Select delivery address
              </h3>
              <button
                type="button"
                onClick={() => setIsLocationDrawerOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleCustomLocationApply} className="mt-5">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by area, street name, pin code"
                  value={locationSearchInput}
                  onChange={(e) => setLocationSearchInput(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white py-3.5 pl-11 pr-20 text-sm font-medium text-[#111111] shadow-sm placeholder:text-gray-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
                {locationSearchInput.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 top-2 rounded-xl bg-[#2563eb] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8]"
                  >
                    Apply
                  </button>
                )}
              </div>
            </form>

            {/* Action: Use My Current Location */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="mt-5 flex items-center gap-2.5 text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] hover:underline"
            >
              <Crosshair size={18} className="text-[#2563eb]" />
              Use my current location
            </button>

            {/* Divider */}
            <div className="my-6 border-t border-dashed border-gray-200" />

            {/* Saved Addresses List */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Saved addresses
              </p>

              <div className="mt-4 space-y-3">
                {defaultSavedAddresses.map((addr, idx) => {
                  const isSelected = selectedLocation === addr;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectAddress(addr)}
                      className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? "border-[#f96e15] bg-[#fff8f3] shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <MapPin
                        size={18}
                        className={`mt-0.5 shrink-0 ${
                          isSelected ? "text-[#f96e15]" : "text-gray-400 group-hover:text-[#f96e15]"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#111111]">{addr}</p>
                        <p className="mt-0.5 text-xs font-medium text-gray-500">Standard Delivery</p>
                      </div>
                      {isSelected && (
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f96e15] text-xs font-bold text-white">
                          ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetails;
