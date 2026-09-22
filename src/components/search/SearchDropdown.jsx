import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Loader2, Search, TrendingUp, X, Star } from "lucide-react";
import api from "../../services/api";

const SEARCH_HISTORY_KEY = "machinichi_search_history";
const TRENDING = ["Organic Rice", "Cold Pressed Oil", "Dry Fruits", "Wheat Atta", "Pure Honey"];
const DEBOUNCE_MS = 350;
const MIN_SEARCH_LENGTH = 2;

const isProductVisible = (p) => {
  if (p.isVisible === false) return false;
  if (p.publishStatus && p.publishStatus !== "published") return false;
  if (p.status === "Draft" || p.status === "Discontinued") return false;
  return true;
};

function formatCurrency(val) {
  if (val == null) return "";
  const n = Number(String(val).replace(/[^\d.]/g, ""));
  return `\u20B9${n.toLocaleString("en-IN")}`;
}

function SearchDropdown({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"); }
    catch { return []; }
  });

  const hasContent = query.length > 0 || history.length > 0;
  const open = hasContent && !dismissed;
  const groupedItems = products.length + categories.length + brands.length;

  const persistHistory = (terms) => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(terms));
    setHistory(terms);
  };

  const addToHistory = (term) => {
    if (!term.trim()) return;
    persistHistory([term, ...history.filter((t) => t !== term)].slice(0, 10));
  };

  const removeFromHistory = (term, e) => {
    e.stopPropagation();
    persistHistory(history.filter((t) => t !== term));
  };

  const clearHistory = () => persistHistory([]);

  const doSearch = useCallback((term) => {
    const q = term || query.trim();
    if (!q) return;
    addToHistory(q);
    setDismissed(true);
    setQuery("");
    onClose?.();
    navigate(`/product?search=${encodeURIComponent(q)}`);
  }, [query, navigate, onClose]);

  const goToProduct = (slug, name) => {
    setDismissed(true);
    setQuery("");
    onClose?.();
    if (slug) {
      navigate(`/product/${slug}`);
    } else if (name) {
      navigate(`/product?search=${encodeURIComponent(name)}`);
    }
  };

  const cancelPending = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const searchApi = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setLoading(false);
      return;
    }
    cancelPending();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const { data } = await api.get(`/products?search=${encodeURIComponent(trimmed)}&limit=12&sort=createdAt&order=desc`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (data.success && data.data?.length) {
        const prods = data.data.filter(isProductVisible).slice(0, 6).map((p) => {
          const rawPrice = Number(String(p.sellingPrice || p.price).replace(/[^\d]/g, "")) || 0;
          const rawMrp = Number(String(p.mrpPrice || p.mrp).replace(/[^\d]/g, "")) || 0;
          return {
            _id: p._id,
            name: p.name || "",
            image: p.images?.[0]?.url || p.image || "",
            slug: p.slug || "",
            category: p.category?.name || p.category || "",
            origin: p.origin || "",
            brand: p.brand || "",
            price: rawPrice,
            mrp: rawMrp,
            discount: rawMrp > rawPrice ? Math.round(((rawMrp - rawPrice) / rawMrp) * 100) : 0,
            rating: p.rating ?? 4.5,
            stock: p.quantity != null ? (p.quantity > 0 ? "In Stock" : "Out of Stock") : "",
          };
        });
        if (controller.signal.aborted) return;
        setProducts(prods);
        const cats = [...new Set(prods.filter((p) => p.category).map((p) => p.category))];
        setCategories(cats);
        const brnds = [...new Set(prods.filter((p) => p.brand).map((p) => p.brand))];
        setBrands(brnds);
      } else {
      if (controller.signal.aborted) return;
      setProducts([]);
      setCategories([]);
      setBrands([]);
    }
  } catch (err) {
    if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || controller.signal.aborted) return;
    setProducts([]);
    setCategories([]);
    setBrands([]);
  }
  if (!controller.signal.aborted) setLoading(false);
}, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    cancelPending();
    if (query.trim().length < 1) {
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setLoading(false);
      return;
    }
    if (query.trim().length < MIN_SEARCH_LENGTH) {
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchApi(query), DEBOUNCE_MS);
    return () => {
      clearTimeout(debounceRef.current);
      cancelPending();
    };
  }, [query, searchApi]);

  useEffect(() => {
    const handle = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDismissed(true);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => cancelPending();
  }, []);

  const totalItems = groupedItems + (groupedItems > 0 ? 1 : 0);
  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex < 0) { doSearch(); return; }
      let idx = 0;
      for (const p of products) {
        if (idx === activeIndex) { goToProduct(p.slug, p.name); return; }
        idx++;
      }
      for (const c of categories) {
        if (idx === activeIndex) { doSearch(c); return; }
        idx++;
      }
      for (const b of brands) {
        if (idx === activeIndex) { doSearch(b); return; }
        idx++;
      }
      if (idx === activeIndex) { doSearch(); return; }
    } else if (e.key === "Escape") {
      setDismissed(true);
      onClose?.();
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full" onKeyDown={handleKeyDown}>
      <div className="flex h-10 items-center rounded-full bg-white/15 pl-3 pr-1.5 text-white/80 transition-all duration-300 focus-within:bg-white/25 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.2)]">
        {loading ? (
          <Loader2 size={16} className="animate-spin shrink-0" strokeWidth={2} />
        ) : (
          <Search size={16} strokeWidth={2} className="shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onFocus={() => { if (query.length > 0 || history.length > 0) setDismissed(false); }}
          placeholder="Search products..."
          className="ml-2 w-[120px] bg-transparent text-[13px] outline-none placeholder:text-white/50 xl:w-[180px]"
          aria-label="Search products"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="search-dropdown"
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setProducts([]); setActiveIndex(-1); }}
            className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center text-white/50 hover:text-white"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div
          id="search-dropdown"
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-[340px] origin-top-right animate-[fadeUp_200ms_ease-out_both] overflow-hidden rounded-2xl bg-white shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:min-w-[420px] lg:min-w-[520px] xl:min-w-[600px]"
          style={{ pointerEvents: "auto" }}
        >
          {query.length === 0 && history.length > 0 ? (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#a69c95]">Recent Searches</span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] font-bold text-[#a69c95] hover:text-[#c8430b] transition"
                >
                  Clear all
                </button>
              </div>
              {history.map((term, i) => (
                <button
                  key={term}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === i}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                    activeIndex === i ? "bg-[#fff1e4]" : "hover:bg-[#f5f0eb]"
                  }`}
                  onClick={() => { setQuery(term); doSearch(term); }}
                >
                  <Clock size={15} className="shrink-0 text-[#a69c95]" />
                  <span className="flex-1 text-[13px] font-semibold text-[#3c302b]">{term}</span>
                  <button
                    type="button"
                    onClick={(e) => removeFromHistory(term, e)}
                    className="text-[#a69c95] hover:text-[#c8430b] transition"
                    aria-label={`Remove ${term}`}
                  >
                    <X size={14} />
                  </button>
                </button>
              ))}
              <div className="mx-4 mt-2 border-t border-[#f0e8e0] pt-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#a69c95]">Trending</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TRENDING.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setQuery(t); doSearch(t); }}
                      className="flex items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fffaf5] px-3 py-1.5 text-[11px] font-bold text-[#5a4d45] transition hover:border-[#fd761a] hover:text-[#fd761a]"
                    >
                      <TrendingUp size={12} />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex animate-pulse gap-3 rounded-xl p-2">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-[#f0e8e0]" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-3/4 rounded bg-[#f0e8e0]" />
                    <div className="h-2.5 w-1/2 rounded bg-[#f0e8e0]" />
                    <div className="h-2.5 w-1/3 rounded bg-[#f0e8e0]" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 && categories.length === 0 && brands.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[#f5f0eb]">
                <Search size={24} className="text-[#a69c95]" />
              </div>
              <p className="mt-4 text-[15px] font-black text-[#3c302b]">No products found</p>
              <p className="mt-1 text-[12px] font-medium text-[#796d66]">Try a different search term</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {TRENDING.slice(0, 3).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setQuery(t); doSearch(t); }}
                    className="rounded-full border border-[#eadfd7] bg-[#fffaf5] px-3 py-1.5 text-[11px] font-bold text-[#5a4d45] transition hover:border-[#fd761a] hover:text-[#fd761a]"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-2 max-h-[70vh] overflow-y-auto">
              {products.length > 0 && (
                <div>
                  <span className="block px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#a69c95]">Products</span>
                  {products.map((p, i) => (
                    <button
                      key={p._id}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === i}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        activeIndex === i ? "bg-[#fff1e4]" : "hover:bg-[#f5f0eb]"
                      }`}
                      onClick={() => goToProduct(p.slug, p.name)}
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-[#3c302b]">{p.name}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#988b84]">
                          {[p.brand, p.category].filter(Boolean).join(" · ") || "Machinichi Selection"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[14px] font-black text-[#3c302b]">{formatCurrency(p.price)}</span>
                          {p.mrp > p.price && (
                            <span className="text-[11px] font-medium text-[#988b84] line-through">{formatCurrency(p.mrp)}</span>
                          )}
                          {p.discount > 0 && (
                            <span className="rounded-full bg-[#dceecb] px-2 py-0.5 text-[10px] font-black text-[#23723a]">{p.discount}% OFF</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#f59e0b]">
                            <Star size={11} fill="currentColor" />
                            {p.rating}
                          </span>
                          {p.stock && (
                            <span className={`text-[10px] font-bold ${p.stock === "In Stock" ? "text-[#23723a]" : "text-[#dc2626]"}`}>
                              {p.stock}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {categories.length > 0 && (
                <>
                  <div className="mx-4 my-1 border-t border-[#f0e8e0]" />
                  <span className="block px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#a69c95]">Categories</span>
                  {categories.map((c, i) => {
                    const idx = products.length + i;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === idx}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          activeIndex === idx ? "bg-[#fff1e4]" : "hover:bg-[#f5f0eb]"
                        }`}
                        onClick={() => doSearch(c)}
                      >
                        <Search size={14} className="shrink-0 text-[#a69c95]" />
                        <span className="text-[13px] font-semibold text-[#3c302b]">{c}</span>
                      </button>
                    );
                  })}
                </>
              )}
              {brands.length > 0 && (
                <>
                  <div className="mx-4 my-1 border-t border-[#f0e8e0]" />
                  <span className="block px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#a69c95]">Brands</span>
                  {brands.map((b, i) => {
                    const idx = products.length + categories.length + i;
                    return (
                      <button
                        key={b}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === idx}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          activeIndex === idx ? "bg-[#fff1e4]" : "hover:bg-[#f5f0eb]"
                        }`}
                        onClick={() => doSearch(b)}
                      >
                        <Search size={14} className="shrink-0 text-[#a69c95]" />
                        <span className="text-[13px] font-semibold text-[#3c302b]">{b}</span>
                      </button>
                    );
                  })}
                </>
              )}
              <div className="mx-4 my-2 border-t border-[#f0e8e0]" />
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === totalItems - 1}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-black text-[#fd761a] transition ${
                  activeIndex === totalItems - 1 ? "bg-[#fff1e4]" : "hover:bg-[#fff5ed]"
                }`}
                onClick={() => doSearch()}
              >
                <Search size={15} />
                View all results for &quot;{query}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchDropdown;
