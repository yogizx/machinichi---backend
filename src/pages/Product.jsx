import { Bookmark, ChevronDown, Clock, Heart, Search, ShoppingCart, Star, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { badgeColor, normalizeProduct } from "../utils/normalizeProduct";
import { useToast } from "../components/Toaster";
import { useDebounce } from "../hooks/useDebounce";

const SEARCH_HISTORY_KEY = "machinichi_search_history";

const sortOptions = ["Popularity", "Price: Low to High", "Price: High to Low"];
const PRODUCTS_PER_PAGE = 12;
const ratingOptions = [5, 4, 3, 2, 1];
const priceBounds = { min: 200, max: 2000 };

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const isProductVisible = (p) => {
  if (p.isVisible === false) return false;
  if (p.publishStatus && p.publishStatus !== "published") return false;
  if (p.status === "Draft" || p.status === "Discontinued") return false;
  return true;
};

const parsePrice = (price) => {
  const amount = Number(String(price).replace(/[^\d]/g, "")) || 0;
  return amount > priceBounds.max ? Math.round(amount / 10) : amount;
};

const getRangePercent = (value) => ((value - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100;
const formatPriceRangeAmount = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const parseWeight = (size) => {
  const value = Number(String(size).replace(/[^\d.]/g, "")) || 1;
  return String(size).toUpperCase().includes("G") && !String(size).toUpperCase().includes("KG")
    ? value / 1000
    : value;
};
const formatPriceForSize = (price, baseSize, selectedSize) => {
  if (!price) return price;

  const amount = Number(String(price).replace(/[^\d]/g, ""));
  if (!amount) return price;

  const prefix = String(price).match(/^\D*/)?.[0] || "";
  const baseWeight = parseWeight(baseSize);
  const selectedWeight = parseWeight(selectedSize);
  const adjustedAmount = Math.round((amount / baseWeight) * selectedWeight);

  return `${prefix}${adjustedAmount.toLocaleString("en-IN")}`;
};

function Product({ favoriteProducts, onAddToCart = () => {}, onFavoriteToggle, onSaveForLater = () => {} }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const searchFromUrl = searchParams.get("search") || "";
  const selectedCategory = categoryFromUrl || null;
  const [selectedRating, setSelectedRating] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiProducts, setApiProducts] = useState([]);
  const [productRatings, setProductRatings] = useState({});
  const [priceRange, setPriceRange] = useState(priceBounds);
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [showSearchResults, setShowSearchResults] = useState(!!searchFromUrl);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"); }
    catch { return []; }
  });
  const searchRef = useRef(null);
  const searchWrapperRef = useRef(null);

  const addToSearchHistory = (term) => {
    if (!term.trim()) return;
    setSearchHistory((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, 10);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeSearchHistoryItem = (term) => {
    setSearchHistory((prev) => {
      const next = prev.filter((t) => t !== term);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const selectedFavorites = favoriteProducts ?? new Set();

  const activeProductCatalog = apiProducts;

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ limit: "100", sort: "createdAt", order: "desc" });
        if (searchFromUrl) params.set("search", searchFromUrl);
        const { data } = await api.get(`/products?${params.toString()}`);
        if (data.success && data.data?.length) {
          setApiProducts(data.data.filter(isProductVisible).map(normalizeProduct));
        }
      } catch { /* fallback to hardcoded */ }
      setIsLoading(false);
    })();
  }, [searchFromUrl]);

  useEffect(() => {
    if (apiProducts.length > 0) {
      const sourceProducts = selectedCategory
        ? apiProducts.filter((p) => p.category === selectedCategory)
        : apiProducts;
      if (sourceProducts.length > 0) {
        const prices = sourceProducts.map((p) => parsePrice(p.price)).filter((n) => n > 0);
        if (prices.length > 0) {
          setPriceRange({ min: Math.min(...prices), max: Math.max(...prices) });
          return;
        }
      }
    }
    setPriceRange(priceBounds);
  }, [selectedCategory, apiProducts]);

  useEffect(() => {
    if (searchFromUrl) {
      const t = setTimeout(() => {
        setSearchQuery(searchFromUrl);
        setShowSearchResults(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [searchFromUrl]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) { next.set("search", q); } else { next.delete("search"); }
      return next;
    }, { replace: true });
  }, [debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [selectedCategory, sortBy, selectedRating, priceRange, searchQuery]);

  const ratedProducts = useMemo(
    () =>
      activeProductCatalog.map((product) => ({
        ...product,
        rating: productRatings[product.name] ?? product.rating,
      })),
    [productRatings, activeProductCatalog],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const items = ratedProducts.filter((product) => {
      const price = parsePrice(product.price);
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const matchesPrice = price >= priceRange.min && price <= priceRange.max;
      const matchesRating = selectedRating ? product.rating === selectedRating : true;
      const matchesSearch = !q || product.name.toLowerCase().includes(q) || product.origin.toLowerCase().includes(q) || product.category.toLowerCase().includes(q);
      return matchesCategory && matchesPrice && matchesRating && matchesSearch;
    });

    if (sortBy === "Price: Low to High") {
      items.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }

    if (sortBy === "Price: High to Low") {
      items.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return items;
  }, [priceRange, ratedProducts, selectedCategory, selectedRating, sortBy, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const p of activeProductCatalog) {
      const cat = p.category;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [activeProductCatalog]);

  const totalProducts = activeProductCatalog.length;

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE),
    [filteredProducts, currentPage],
  );

  const selectSort = (option) => {
    setSortBy(option);
    setIsSortOpen(false);
  };

  const selectCategory = (category) => {
    const nextCategory = selectedCategory === category ? null : category;
    if (nextCategory) {
      setSearchParams({ category: nextCategory });
    } else {
      setSearchParams({});
    }
  };

  const updateProductRating = (productName, rating) => {
    setProductRatings((current) => ({ ...current, [productName]: rating }));
  };

  const toggleFavorite = (productName) => {
    onFavoriteToggle?.(productName);
  };

  const clearFilters = useCallback(() => {
    setSelectedRating(null);
    setPriceRange(priceBounds);
    setSortBy(sortOptions[0]);
    setSearchQuery("");
    setCurrentPage(1);
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <div className="min-h-screen bg-[#fff8f1] text-[#342821]">
      <main className="mx-auto flex w-full max-w-[1420px] gap-[48px] px-8 pb-14 pt-12 max-xl:max-w-[1180px] max-xl:gap-9 max-lg:max-w-[820px] max-lg:flex-col max-lg:px-5 max-sm:px-4 max-sm:pt-7">
        <aside className="w-[240px] shrink-0 max-xl:w-[220px] max-lg:w-full">
          <FilterPanel
            selectedCategory={selectedCategory}
            onCategorySelect={selectCategory}
            onPriceRangeChange={setPriceRange}
            onRatingSelect={setSelectedRating}
            priceRange={priceRange}
            selectedRating={selectedRating}
            onClearFilters={clearFilters}
            totalProducts={totalProducts}
            categoryCounts={categoryCounts}
          />
        </aside>

        <section className="min-w-0 flex-1">
          <div ref={searchWrapperRef} className="relative mb-6">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9c8f87]" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setShowSearchResults(true);
                setCurrentPage(1);
              }}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) { setShowSearchResults(true); }
                else if (!searchQuery.trim() && searchHistory.length > 0) { setShowSearchResults(true); }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  e.preventDefault();
                  addToSearchHistory(searchQuery.trim());
                  setShowSearchResults(false);
                }
              }}
              placeholder="Search products, categories, brands..."
              className="h-[52px] w-full rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] pl-12 pr-10 text-[14px] font-medium text-[#3c302b] outline-none placeholder:text-[#9c8f87] focus:border-[#fd761a] focus:shadow-[0_0_0_3px_rgba(253,118,26,0.1)]"
              aria-label="Search products"
            />
            {searchQuery ? (
              <button onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
                setCurrentPage(1);
                searchRef.current?.focus();
              }} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9c8f87] hover:text-[#3c302b]" type="button">
                <X size={18} />
              </button>
            ) : null}
            {showSearchResults && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[360px] overflow-y-auto rounded-[12px] border border-[#eadfd7] bg-white shadow-[0_12px_32px_rgba(65,38,20,0.12)]">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 10).map((product) => (
                    <button
                      key={product.name}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-[#fff8f1]"
                      onMouseDown={() => { setSearchQuery(product.name); setShowSearchResults(false); setCurrentPage(1); }}
                      type="button"
                    >
                      <img src={product.image} alt="" className="h-[48px] w-[48px] shrink-0 rounded-[8px] object-cover bg-[#eadfd7]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#3c302b]">{product.name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-[#9c8f87]">
                          {[product.brand, product.category].filter(Boolean).join(" · ") || ""}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[13px] font-black text-[#3c302b]">{product.price}</span>
                          {product.oldPrice && <span className="text-[10px] font-medium text-[#9c8f87] line-through">{product.oldPrice}</span>}
                          {product.stock && (
                            <span className={`ml-auto text-[9px] font-bold ${product.stock === "In Stock" ? "text-[#23723a]" : "text-[#dc2626]"}`}>
                              {product.stock}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-6 text-center text-[13px] font-medium text-[#9c8f87]">No products found</p>
                )}
              </div>
            )}
            {showSearchResults && !searchQuery.trim() && searchHistory.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-[12px] border border-[#eadfd7] bg-white shadow-[0_12px_32px_rgba(65,38,20,0.12)] overflow-hidden">
                <p className="px-4 pt-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-[#a69c95]">Recent searches</p>
                {searchHistory.map((term) => (
                  <div key={term} className="flex items-center justify-between px-4 py-2 hover:bg-[#fff8f1] group">
                    <button
                      type="button"
                      className="flex items-center gap-2.5 text-[13px] font-semibold text-[#3c302b] flex-1 text-left"
                      onClick={() => {
                        addToSearchHistory(term);
                        setSearchQuery(term);
                        setShowSearchResults(false);
                        setCurrentPage(1);
                      }}
                    >
                      <Clock size={14} className="text-[#a69c95]" />
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSearchHistoryItem(term); }}
                      className="opacity-0 group-hover:opacity-100 text-[#a69c95] hover:text-[#3c302b] transition"
                      aria-label={`Remove ${term}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-8 flex items-start justify-between gap-6 max-sm:flex-col">
            <div>
              <h1 className="font-serif text-[43px] font-black leading-none tracking-[-0.035em] text-[#2b1a13] max-xl:text-[38px] max-sm:text-[34px]">
                {selectedCategory ? `${selectedCategory} Collection` : "Organic Pantry Staples"}
              </h1>
              <p className="mt-2 text-[14px] font-semibold leading-none text-[#796d66] max-sm:text-[12px]">
                {selectedCategory ? `Showing premium ${selectedCategory.toLowerCase()} items` : "Showing all premium category items"}
              </p>
            </div>

            <div className="relative w-[315px] max-sm:w-full">
              <button
                aria-expanded={isSortOpen}
                aria-haspopup="listbox"
                className="flex h-[48px] w-full items-center justify-between rounded-[10px] border border-[#eadfd7] bg-[#fffaf6] px-6 text-[13px] font-bold text-[#6c5f58] shadow-[0_1px_4px_rgba(64,35,20,0.04)]"
                onClick={() => setIsSortOpen((open) => !open)}
                type="button"
              >
                <span>SORT BY:</span>
                <span className="font-semibold">{sortBy}</span>
                <ChevronDown size={16} />
              </button>

              {isSortOpen ? (
                <div
                  className="absolute left-0 right-0 top-[54px] z-20 overflow-hidden rounded-[10px] border border-[#eadfd7] bg-[#fffaf6] text-[13px] font-bold text-[#6c5f58] shadow-[0_10px_22px_rgba(64,35,20,0.08)]"
                  role="listbox"
                >
                  {sortOptions.map((option) => (
                    <button
                      aria-selected={sortBy === option}
                      className={`flex h-[44px] w-full items-center justify-between px-6 text-left ${
                        sortBy === option ? "text-[#fd761a]" : "text-[#6c5f58]"
                      }`}
                      key={option}
                      onClick={() => selectSort(option)}
                      role="option"
                      type="button"
                    >
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {isLoading && apiProducts.length === 0 ? (
            <div className="grid grid-cols-1 gap-x-[28px] gap-y-[34px] md:grid-cols-2 xl:grid-cols-3 max-xl:gap-x-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-[28px] gap-y-[34px] md:grid-cols-2 xl:grid-cols-3 max-xl:gap-x-5">
              {paginatedProducts.map((product, index) => (
                <ProductCard
                  key={product.name}
                  product={product}
                  index={index}
                  isFavorite={selectedFavorites.has(product.name)}
                  onAddToCart={onAddToCart}
                  onFavoriteToggle={toggleFavorite}
                  onRatingChange={updateProductRating}
                  onSaveForLater={onSaveForLater}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-6 py-12 text-center shadow-[0_8px_18px_rgba(65,38,20,0.05)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#f5f0eb]">
                <Search size={32} className="text-[#a69c95]" />
              </div>
              <h2 className="mt-5 text-[20px] font-black text-[#3a302b]">No products found</h2>
              <p className="mt-2 text-[14px] font-medium text-[#7f736c]">Try adjusting your filters or search term.</p>
              <button
                onClick={clearFilters}
                className="mt-6 inline-flex h-[44px] items-center gap-2 rounded-[10px] border-2 border-[#fd761a] px-6 text-[12px] font-black text-[#fd761a] transition hover:bg-[#fd761a] hover:text-white"
                type="button"
              >
                <X size={15} strokeWidth={2.5} />
                CLEAR ALL FILTERS
              </button>
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredProducts.length} onPageChange={setCurrentPage} />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function FilterPanel({
  selectedCategory,
  onCategorySelect,
  onPriceRangeChange,
  onRatingSelect,
  priceRange,
  selectedRating,
  onClearFilters,
  totalProducts,
  categoryCounts,
}) {
  const priceTrackRef = useRef(null);
  const [activePriceHandle, setActivePriceHandle] = useState(null);
  const minPercent = getRangePercent(priceRange.min);
  const maxPercent = getRangePercent(priceRange.max);

  const updatePriceFromPointer = (event, handle) => {
    const track = priceTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const trackWidth = rect.width * 0.776;
    const offset = Math.min(Math.max(event.clientX - rect.left, 0), trackWidth);
    const rawValue = priceBounds.min + (offset / trackWidth) * (priceBounds.max - priceBounds.min);
    const nextValue = Math.round(rawValue);

    onPriceRangeChange((current) => {
      if (handle === "min") {
        return { ...current, min: Math.min(nextValue, current.max - 1) };
      }

      return { ...current, max: Math.max(nextValue, current.min + 1) };
    });
  };

  const startPriceDrag = (event) => {
    const track = priceTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const trackWidth = rect.width * 0.776;
    const offset = Math.min(Math.max(event.clientX - rect.left, 0), trackWidth);
    const pointerValue = priceBounds.min + (offset / trackWidth) * (priceBounds.max - priceBounds.min);
    const handle =
      Math.abs(pointerValue - priceRange.min) <= Math.abs(pointerValue - priceRange.max) ? "min" : "max";

    setActivePriceHandle(handle);
    updatePriceFromPointer(event, handle);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <div className="text-[16px] font-semibold text-[#5f554f] max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-8 max-md:block max-sm:text-[14px]">
      <section className="border-b border-[#eadfd7] pb-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Categories</h2>
        <div className="space-y-4">
          <button
            className={`flex w-full items-center justify-between text-left leading-none ${
              !selectedCategory ? "font-black text-[#fd761a]" : "text-[#6c625c]"
            }`}
            onClick={() => onCategorySelect(null)}
            type="button"
          >
            <span>All Categories</span>
            <span className="text-[13px] text-[#998c84]">{totalProducts}</span>
          </button>
          {Object.keys(categoryCounts).map((cat) => (
            <button
              className={`flex w-full items-center justify-between text-left leading-none ${
                selectedCategory === cat ? "font-black text-[#fd761a]" : "text-[#6c625c]"
              }`}
              key={cat}
              onClick={() => onCategorySelect(cat)}
              type="button"
            >
              <span>{cat}</span>
              <span className="text-[13px] text-[#998c84]">{categoryCounts[cat]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-b border-[#eadfd7] py-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Price Range</h2>
        <div
          className="relative h-[28px] w-[250px] cursor-pointer touch-none max-xl:w-[220px] max-lg:w-full"
          onPointerDown={startPriceDrag}
          onPointerMove={(event) => {
            if (activePriceHandle) {
              updatePriceFromPointer(event, activePriceHandle);
            }
          }}
          onPointerUp={() => setActivePriceHandle(null)}
          ref={priceTrackRef}
        >
          <div className="absolute left-0 right-[62px] top-[12px] h-[2px] rounded-full bg-[#d8c6b9]" />
          <div
            className="absolute top-[12px] h-[2px] rounded-full bg-[#a7470c]"
            style={{
              left: `calc(${minPercent}% * 0.776)`,
              width: `calc(${maxPercent - minPercent}% * 0.776)`,
            }}
          />
          <span
            className="pointer-events-none absolute top-[6px] h-[14px] w-[14px] rounded-full border-2 border-[#b65314] bg-[#fff8f1]"
            style={{ left: `calc(${minPercent}% * 0.776)` }}
          />
          <span
            className="pointer-events-none absolute top-[6px] h-[14px] w-[14px] rounded-full border-2 border-[#b65314] bg-[#fff8f1]"
            style={{ left: `calc(${maxPercent}% * 0.776)` }}
          />
        </div>
        <div className="flex w-[250px] items-center justify-between text-[15px] font-bold text-[#84776f] max-xl:w-[220px] max-lg:w-full">
          <span>{formatPriceRangeAmount(priceBounds.min)}</span>
          <span>{formatPriceRangeAmount(priceBounds.max)}</span>
        </div>
        <p
          aria-live="polite"
          className="mt-4 w-[250px] rounded-[10px] border border-[#eadfd7] bg-[#fffaf6] px-4 py-3 text-[13px] font-black leading-5 text-[#3a302b] shadow-[0_1px_4px_rgba(64,35,20,0.04)] max-xl:w-[220px] max-lg:w-full"
        >
          Selected Price Range:{" "}
          <span className="text-[#b65314]">
            {formatPriceRangeAmount(priceRange.min)} - {formatPriceRangeAmount(priceRange.max)}
          </span>
        </p>
      </section>

      <section className="border-b border-[#eadfd7] py-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Customer Rating</h2>
        <div className="space-y-4">
          {ratingOptions.map((rating) => (
            <label className="flex cursor-pointer items-center gap-3 leading-none" key={rating}>
              <input
                checked={selectedRating === rating}
                className="sr-only"
                onChange={() => onRatingSelect(selectedRating === rating ? null : rating)}
                type="checkbox"
              />
              <span
                className={`grid h-[18px] w-[18px] place-items-center rounded-[4px] border-2 ${
                  selectedRating === rating
                    ? "border-[#fd761a] bg-[#fd761a]"
                    : "border-[#d8c9be] bg-white"
                }`}
              >
                {selectedRating === rating ? (
                  <span className="text-[11px] font-black leading-none text-white">{"\u2713"}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                <StarRating rating={rating} size={15} />
                <span>{rating} Star</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <button
        className="mt-8 flex h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[#fd761a] text-[12px] font-black text-[#fd761a] transition hover:bg-[#fd761a] hover:text-white"
        onClick={onClearFilters}
        type="button"
      >
        <X size={15} strokeWidth={2.5} />
        CLEAR ALL FILTERS
      </button>
    </div>
  );
}

function Pagination({ currentPage, totalPages, totalItems, onPageChange }) {
  const startItem = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, totalItems);
  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="mt-[58px] flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <button
          className={`flex h-[42px] w-[42px] items-center justify-center rounded-[8px] border text-[13px] font-bold transition ${
            currentPage === 1
              ? "cursor-not-allowed border-[#eadfd7] text-[#b5a69c]"
              : "border-[#eadfd7] bg-white text-[#6c5f58] hover:border-[#fd761a] hover:text-[#fd761a]"
          }`}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ChevronDown size={16} className="rotate-90" />
        </button>

        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[13px] font-bold text-[#b5a69c]">
              ...
            </span>
          ) : (
            <button
              key={page}
              className={`flex h-[42px] min-w-[42px] items-center justify-center rounded-[8px] border px-3 text-[13px] font-bold transition ${
                page === currentPage
                  ? "border-[#fd761a] bg-[#fd761a] text-white shadow-[0_4px_9px_rgba(253,118,26,0.2)]"
                  : "border-[#eadfd7] bg-white text-[#6c5f58] hover:border-[#fd761a] hover:text-[#fd761a]"
              }`}
              onClick={() => onPageChange(page)}
              type="button"
            >
              {page}
            </button>
          ),
        )}

        <button
          className={`flex h-[42px] w-[42px] items-center justify-center rounded-[8px] border text-[13px] font-bold transition ${
            currentPage === totalPages
              ? "cursor-not-allowed border-[#eadfd7] text-[#b5a69c]"
              : "border-[#eadfd7] bg-white text-[#6c5f58] hover:border-[#fd761a] hover:text-[#fd761a]"
          }`}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          <ChevronDown size={16} className="-rotate-90" />
        </button>
      </div>

      <p className="text-[12px] font-medium text-[#7f736c]">
        Showing {startItem}–{endItem} of {totalItems} Products
      </p>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)]">
      <div className="aspect-[4/3] bg-[#e8ddd4]" />
      <div className="space-y-3 px-4 pb-4 pt-4">
        <div className="h-[18px] w-3/4 rounded-md bg-[#e8ddd4]" />
        <div className="h-[12px] w-1/3 rounded-md bg-[#e8ddd4]" />
        <div className="h-[14px] w-full rounded-md bg-[#e8ddd4]" />
        <div className="flex gap-2">
          <div className="h-[35px] w-[60px] rounded-[7px] bg-[#e8ddd4] max-xl:h-[31px]" />
          <div className="h-[35px] w-[60px] rounded-[7px] bg-[#e8ddd4] max-xl:h-[31px]" />
          <div className="h-[35px] w-[60px] rounded-[7px] bg-[#e8ddd4] max-xl:h-[31px]" />
        </div>
        <div className="h-[52px] w-full rounded-[9px] bg-[#e8ddd4] max-xl:h-[46px]" />
        <div className="h-[46px] w-full rounded-[9px] bg-[#e8ddd4] max-xl:h-[42px]" />
      </div>
    </div>
  );
}

function ProductCard({ product, index, isFavorite, onAddToCart, onFavoriteToggle, onRatingChange, onSaveForLater }) {
  const navigate = useNavigate();
  const addToast = useToast();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const selectedPrice = formatPriceForSize(product.price, product.sizes[0], selectedSize);
  const selectedOldPrice = formatPriceForSize(product.oldPrice, product.sizes[0], selectedSize);
  const selectedProduct = {
    ...product,
    baseOldPrice: product.oldPrice,
    basePrice: product.price,
    oldPrice: selectedOldPrice,
    price: selectedPrice,
    selectedSize,
  };
  const openDetails = () => {
    navigate(`/product/${slugify(product.name)}`, { state: { product: selectedProduct } });
  };
  const addToCart = (event) => {
    event.stopPropagation();
    onAddToCart(selectedProduct);
    addToast?.("Added to cart", "cart");
  };
  const saveForLater = (event) => {
    event.stopPropagation();
    onSaveForLater(selectedProduct);
    addToast?.("Saved for later", "saved");
  };
  const toggleFavorite = (event) => {
    event.stopPropagation();
    onFavoriteToggle(product.name);
    addToast?.(isFavorite ? "Removed from favorites" : "Added to favorites", "favorite");
  };
  const selectRating = (rating) => {
    onRatingChange(product.name, rating);
  };

  return (
    <article
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(66,36,18,0.11)]"
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
      role="link"
      tabIndex={0}
      style={{ animation: `productIn 480ms ease-out ${index * 45}ms both` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eadfd7]">
        <img
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=420&q=90"; }}
        />
        {product.badge ? (
          <span className={`absolute left-0 top-0 z-10 rounded-br-[7px] px-4 py-3 text-[14px] font-black text-white max-xl:text-[12px] ${badgeColor(product.badge)}`}>
            {product.badge}
          </span>
        ) : null}
        <button
          aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={isFavorite}
          className={`absolute right-3 top-3 z-10 grid h-[42px] w-[42px] place-items-center rounded-full border backdrop-blur transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-110 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd761a]/50 max-xl:h-[38px] max-xl:w-[38px] ${
            isFavorite
              ? "border-[#fd761a] bg-[#fd761a] text-white shadow-[0_8px_18px_rgba(253,118,26,0.28)]"
              : "border-white/80 bg-white/90 text-[#7c6a60] shadow-[0_6px_14px_rgba(65,38,20,0.12)] hover:text-[#fd761a]"
          }`}
          onClick={toggleFavorite}
          onKeyDown={(event) => event.stopPropagation()}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={`transition-all duration-300 ${isFavorite ? "fill-current scale-110" : "fill-transparent group-hover:scale-110"}`}
            size={19}
            strokeWidth={2.3}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <h3 className="truncate text-[15px] font-bold leading-none text-[#403530] max-xl:text-[13px]">{product.name}</h3>
        {product.origin ? <p className="mt-3 truncate text-[10px] font-black leading-none text-[#988b84] max-xl:text-[8px]">{product.origin}</p> : null}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <StarRating interactive onSelect={selectRating} rating={product.rating} size={16} />
            <span className="text-[11px] font-black text-[#8a7d75]">
              {product.rating}{product.reviewCount > 0 ? ` (${product.reviewCount})` : ""}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[20px] font-black text-[#3c302b] max-xl:text-[17px]">{selectedPrice}</span>
            {selectedOldPrice ? <span className="text-[13px] font-bold text-[#9c8f87] line-through">{selectedOldPrice}</span> : null}
            {product.discountPercent > 0 ? <span className="text-[10px] font-black text-[#fd761a]">({product.discountPercent}% OFF)</span> : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {product.sizes.map((size) => (
            <button
              aria-pressed={selectedSize === size}
              className={`h-[35px] rounded-[7px] border px-4 text-[13px] font-bold transition-all duration-200 max-xl:h-[31px] max-xl:px-3 max-xl:text-[11px] ${
                selectedSize === size
                  ? "border-[#fd761a] bg-[#fd761a] text-white"
                  : "border-[#e0d2c6] bg-[#fffaf6] text-[#a19188] hover:border-[#a19188]"
              }`}
              key={size}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedSize(size);
              }}
              onKeyDown={(event) => event.stopPropagation()}
              type="button"
            >
              {size}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[9px] bg-[#fd761a] text-[13px] font-black text-white shadow-[0_5px_10px_rgba(253,118,26,0.22)] transition-all duration-200 hover:bg-[#e86710] hover:shadow-[0_8px_18px_rgba(253,118,26,0.32)] active:scale-[0.98] max-xl:h-[46px] max-xl:text-[12px]"
            onClick={addToCart}
            onKeyDown={(event) => event.stopPropagation()}
            type="button"
          >
            <ShoppingCart size={16} strokeWidth={2.3} />
            ADD TO CART
          </button>
          <button
            className="flex h-[46px] w-full items-center justify-center gap-3 rounded-[9px] border border-[#eadfd7] bg-[#fffaf6] text-[12px] font-black text-[#7a5a42] transition-all duration-200 hover:border-[#fd761a] hover:text-[#c34b0d] max-xl:h-[42px] max-xl:text-[11px]"
            onClick={saveForLater}
            onKeyDown={(event) => event.stopPropagation()}
            type="button"
          >
            <Bookmark size={15} strokeWidth={2.3} />
            SAVE FOR LATER
          </button>
        </div>
      </div>

      <style>{`
        @keyframes productIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </article>
  );
}

function StarRating({ interactive = false, onSelect, rating, size = 14 }) {
  return (
    <span
      className={`flex items-center gap-0.5 ${interactive ? "cursor-pointer" : ""}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = index < rating;
        const star = (
          <Star
            aria-hidden="true"
            className={filled ? "fill-[#f6a623] text-[#f6a623]" : "fill-[#eadfd7] text-[#eadfd7]"}
            size={size}
            strokeWidth={1.8}
          />
        );

        if (!interactive) {
          return <span key={starValue}>{star}</span>;
        }

        return (
          <button
            aria-label={`Set rating to ${starValue} stars`}
            className="rounded-sm transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd761a]/45"
            key={starValue}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(starValue);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            type="button"
          >
            {star}
          </button>
        );
      })}
    </span>
  );
}

export default Product;
