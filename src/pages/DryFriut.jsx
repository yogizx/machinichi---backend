import { Bookmark, ChevronDown, Heart, ShoppingCart, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { slugifyProduct } from "../data/products";
import { badgeColor, normalizeProduct } from "../utils/normalizeProduct";

export const dryFruitProducts = [
  {
    name: "Premium California Almonds",
    origin: "NATURALLY CRUNCHY - CALIFORNIA",
    price: "₹940",
    oldPrice: "₹1,180",
    badge: "20% OFF",
    tags: ["PREMIUM"],
    rating: 5,
    sizes: ["250G", "500G", "1KG"],
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Whole Kashmiri Walnuts",
    origin: "MOUNTAIN GROWN - KASHMIR",
    price: "₹780",
    tags: ["OMEGA RICH"],
    rating: 4,
    sizes: ["250G", "500G", "1KG"],
    image: "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Jumbo Roasted Cashews",
    origin: "HANDPICKED - GOA COAST",
    price: "₹860",
    oldPrice: "₹1,040",
    badge: "BEST SELLER",
    tags: ["ROASTED"],
    rating: 5,
    sizes: ["250G", "500G", "1KG"],
    image: "https://images.unsplash.com/photo-1567892737950-30c4db37cd89?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Medjool Royal Dates",
    origin: "SOFT & NATURAL - MIDDLE EAST",
    price: "₹520",
    tags: ["NATURAL"],
    rating: 4,
    sizes: ["500G", "1KG", "2KG"],
    image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Golden Turkish Apricots",
    origin: "SUN DRIED - TURKEY",
    price: "₹610",
    tags: ["SUN DRIED"],
    rating: 3,
    sizes: ["250G", "500G", "1KG"],
    image: "https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Seedless Black Raisins",
    origin: "VINE DRIED - NASHIK",
    price: "₹260",
    tags: ["SEEDLESS"],
    rating: 4,
    sizes: ["250G", "500G", "1KG"],
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Salted Pistachio Kernels",
    origin: "LIGHTLY SALTED - IRAN",
    price: "₹1,120",
    tags: ["PROTEIN"],
    rating: 5,
    sizes: ["250G", "500G"],
    image: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Dried Cranberry Mix",
    origin: "TART & SWEET - CANADA",
    price: "₹430",
    oldPrice: "₹520",
    badge: "NEW",
    tags: ["BERRY MIX"],
    rating: 3,
    sizes: ["250G", "500G", "1KG"],
    image: "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?auto=format&fit=crop&w=420&q=90",
  },
];

const categories = [
  ["Premium Nuts", "24", false],
  ["Dry Fruits", "18", true],
  ["Seeds & Berries", "32", false],
  ["Trail Mixes", "12", false],
];

const benefits = [
  ["High Protein Content", false],
  ["Certified Organic", true],
  ["Heart Healthy", false],
  ["No Added Sugar", false],
];

const sortOptions = ["Popularity", "Price: Low to High", "Price: High to Low"];
const dryFruitTypes = ["ALMONDS", "CASHEWS", "DATES", "BERRIES"];
const ratingOptions = [5, 4, 3, 2, 1];
const priceBounds = { min: 5, max: 250 };

const parsePrice = (price) => {
  const amount = Number(String(price).replace(/[^\d]/g, "")) || 0;
  return amount > priceBounds.max ? Math.round(amount / 10) : amount;
};

const getRangePercent = (value) => ((value - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100;
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

function DryFriut({ favoriteProducts, onAddToCart = () => {}, onFavoriteToggle }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Dry Fruits");
  const [selectedBenefits, setSelectedBenefits] = useState(() => new Set(["Certified Organic"]));
  const [selectedDryFruitType, setSelectedDryFruitType] = useState("ALMONDS");
  const [selectedRating, setSelectedRating] = useState(null);
  const [productRatings, setProductRatings] = useState(() =>
    Object.fromEntries(dryFruitProducts.map((product) => [product.name, product.rating])),
  );
  const [priceRange, setPriceRange] = useState(priceBounds);
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(dryFruitProducts.length);
  const selectedFavorites = favoriteProducts ?? new Set();

  const normalizedProducts = useMemo(() => dryFruitProducts.map(normalizeProduct), []);

  const ratedProducts = useMemo(
    () =>
      normalizedProducts.map((product) => ({
        ...product,
        rating: productRatings[product.name] ?? product.rating,
      })),
    [productRatings, normalizedProducts],
  );

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const filteredProducts = useMemo(() => {
    const items = ratedProducts.filter((product) => {
      const price = parsePrice(product.price);
      const matchesPrice = price >= priceRange.min && price <= priceRange.max;
      const matchesRating = selectedRating ? product.rating === selectedRating : true;
      return matchesPrice && matchesRating;
    });

    if (sortBy === "Price: Low to High") {
      items.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    }

    if (sortBy === "Price: High to Low") {
      items.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return items;
  }, [priceRange, ratedProducts, selectedRating, sortBy]);

  const selectSort = (option) => {
    setSortBy(option);
    setIsSortOpen(false);
  };

  const toggleBenefit = (benefit) => {
    setSelectedBenefits((current) => {
      const next = new Set(current);
      if (next.has(benefit)) {
        next.delete(benefit);
      } else {
        next.add(benefit);
      }
      return next;
    });
  };

  const updateProductRating = (productName, rating) => {
    setProductRatings((current) => ({ ...current, [productName]: rating }));
  };

  const toggleFavorite = (productName) => {
    onFavoriteToggle?.(productName);
  };

  return (
    <div className="min-h-screen bg-[#fff8f1] text-[#342821]">
      <main className="mx-auto flex w-full max-w-[1420px] gap-[48px] px-8 pb-14 pt-12 max-xl:max-w-[1180px] max-xl:gap-9 max-lg:max-w-[820px] max-lg:flex-col max-lg:px-5 max-sm:px-4 max-sm:pt-7">
        <aside className="w-[280px] shrink-0 max-xl:w-[250px] max-lg:w-full">
          <FilterPanel
            selectedBenefits={selectedBenefits}
            selectedCategory={selectedCategory}
            selectedDryFruitType={selectedDryFruitType}
            onBenefitToggle={toggleBenefit}
            onCategorySelect={setSelectedCategory}
            onDryFruitTypeSelect={setSelectedDryFruitType}
            onPriceRangeChange={setPriceRange}
            onRatingSelect={setSelectedRating}
            priceRange={priceRange}
            selectedRating={selectedRating}
          />
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-8 flex items-start justify-between gap-6 max-sm:flex-col">
            <div>
              <h1 className="font-serif text-[43px] font-black leading-none tracking-[-0.035em] text-[#2b1a13] max-xl:text-[38px] max-sm:text-[34px]">
                Premium Dry Fruit Staples
              </h1>
              <p className="mt-2 text-[14px] font-semibold leading-none text-[#796d66] max-sm:text-[12px]">
                Showing 48 premium dry fruit items
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

          {isLoading ? (
            <div className="grid grid-cols-4 gap-x-[28px] gap-y-[34px] max-xl:gap-x-5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-4 gap-x-[28px] gap-y-[34px] max-xl:gap-x-5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {filteredProducts.slice(0, visibleCount).map((product, index) => (
                <ProductCard
                  key={product.name}
                  product={product}
                  index={index}
                  isFavorite={selectedFavorites.has(product.name)}
                  onAddToCart={onAddToCart}
                  onFavoriteToggle={toggleFavorite}
                  onRatingChange={updateProductRating}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-6 py-12 text-center shadow-[0_8px_18px_rgba(65,38,20,0.05)]">
              <h2 className="text-[20px] font-black text-[#3a302b]">No products found</h2>
              <p className="mt-2 text-[14px] font-medium text-[#7f736c]">Try a different rating or price range.</p>
            </div>
          )}

          <div className="mt-[58px] flex flex-col items-center">
            <button
              className="h-[52px] min-w-[220px] rounded-full bg-gradient-to-r from-[#8d3500] to-[#c95e06] px-9 text-[13px] font-black tracking-[0.08em] text-white shadow-[0_9px_16px_rgba(120,54,8,0.22)] transition duration-300 hover:-translate-y-0.5"
              onClick={() => setVisibleCount((count) => Math.min(count + 8, filteredProducts.length))}
              type="button"
            >
              VIEW MORE ITEMS
            </button>
            <p className="mt-4 text-[12px] font-medium text-[#7f736c]">
              Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} products
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function FilterPanel({
  selectedBenefits,
  selectedCategory,
  selectedDryFruitType,
  onBenefitToggle,
  onCategorySelect,
  onDryFruitTypeSelect,
  onPriceRangeChange,
  onRatingSelect,
  priceRange,
  selectedRating,
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
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Dry Fruit Categories</h2>
        <div className="space-y-4">
          {categories.map(([label, count, active]) => (
            <button
              className={`flex w-full items-center justify-between text-left leading-none ${
                selectedCategory === label || (!selectedCategory && active) ? "font-black text-[#fd761a]" : "text-[#6c625c]"
              }`}
              key={label}
              onClick={() => onCategorySelect(label)}
              type="button"
            >
              <span>{label}</span>
              <span className="text-[13px] text-[#998c84]">{count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-b border-[#eadfd7] py-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Price Range</h2>
        <div
          className="relative h-[28px] w-[250px] cursor-pointer touch-none max-xl:w-[220px]"
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
        <div className="flex w-[250px] items-center justify-between text-[15px] font-bold text-[#84776f] max-xl:w-[220px]">
          <span>₹5 INR</span>
          <span>₹250 INR</span>
        </div>
      </section>

      <section className="border-b border-[#eadfd7] py-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Health Benefits</h2>
        <div className="space-y-4">
          {benefits.map(([label]) => (
            <label className="flex cursor-pointer items-center gap-3 leading-none" key={label}>
              <input
                checked={selectedBenefits.has(label)}
                className="sr-only"
                onChange={() => onBenefitToggle(label)}
                type="checkbox"
              />
              <span
                className={`grid h-[16px] w-[16px] place-items-center rounded-[3px] border ${
                  selectedBenefits.has(label)
                    ? "border-[#fd761a] bg-[#fd761a]"
                    : "border-[#d8c9be] bg-white"
                }`}
              >
                {selectedBenefits.has(label) ? (
                  <span className="text-[11px] font-black leading-none text-white">{"\u2713"}</span>
                ) : null}
              </span>
              <span>{label}</span>
            </label>
          ))}
        </div>
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
                className={`grid h-[16px] w-[16px] place-items-center rounded-[3px] border ${
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

      <section className="pt-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Dry Fruit Type</h2>
        <div className="flex flex-wrap gap-3">
          {dryFruitTypes.map((dryFruitType) => (
            <Pill
              active={selectedDryFruitType === dryFruitType}
              key={dryFruitType}
              onClick={() => onDryFruitTypeSelect(dryFruitType)}
            >
              {dryFruitType}
            </Pill>
          ))}
        </div>
      </section>
    </div>
  );
}

function Pill({ children, active = false, onClick }) {
  return (
    <button
      className={`h-[43px] rounded-full border px-[22px] text-[13px] font-bold max-sm:h-[36px] max-sm:px-4 max-sm:text-[11px] ${
        active
          ? "border-[#fd761a] bg-[#fd761a] text-white shadow-[0_4px_9px_rgba(253,118,26,0.2)]"
          : "border-[#d9cabf] bg-[#fffaf6] text-[#8a7d75]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)]">
      <div className="h-[250px] bg-[#eadfd7] max-xl:h-[220px] max-sm:h-[260px]" />
      <div className="space-y-3 px-4 pb-4 pt-4">
        <div className="h-4 w-3/4 rounded bg-[#eadfd7]" />
        <div className="h-3 w-1/2 rounded bg-[#eadfd7]" />
        <div className="h-4 w-1/3 rounded bg-[#eadfd7]" />
        <div className="flex gap-2">
          <div className="h-[35px] w-[60px] rounded-[7px] bg-[#eadfd7] max-xl:h-[31px]" />
          <div className="h-[35px] w-[60px] rounded-[7px] bg-[#eadfd7] max-xl:h-[31px]" />
          <div className="h-[35px] w-[60px] rounded-[7px] bg-[#eadfd7] max-xl:h-[31px]" />
        </div>
        <div className="h-[52px] w-full rounded-[9px] bg-[#eadfd7] max-xl:h-[46px]" />
      </div>
    </div>
  );
}

function ProductCard({ product, index, isFavorite, onAddToCart, onFavoriteToggle, onRatingChange }) {
  const navigate = useNavigate();
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
    navigate(`/product/${slugifyProduct(product.name)}`, { state: { product: selectedProduct } });
  };
  const addToCart = (event) => {
    event.stopPropagation();
    onAddToCart(selectedProduct);
  };
  const toggleFavorite = (event) => {
    event.stopPropagation();
    onFavoriteToggle(product.name);
  };
  const selectRating = (rating) => {
    onRatingChange(product.name, rating);
  };

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)] transition duration-300 hover:-translate-y-1"
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
      <div className="relative h-[250px] overflow-hidden bg-[#eadfd7] max-xl:h-[220px] max-sm:h-[260px]">
        <img className="h-full w-full object-cover" src={product.image} alt={product.name} />
        {product.badge ? (
          <span className="absolute left-0 top-0 rounded-br-[7px] bg-[#b14a05] px-4 py-3 text-[14px] font-black text-white max-xl:text-[12px]">
            {product.badge}
          </span>
        ) : null}
        <button
          aria-label={isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={isFavorite}
          className={`absolute right-3 top-3 z-10 grid h-[42px] w-[42px] place-items-center rounded-full border backdrop-blur transition duration-300 ease-out hover:-translate-y-0.5 hover:scale-105 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd761a]/50 max-xl:h-[38px] max-xl:w-[38px] ${
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
            className={`transition duration-300 ${isFavorite ? "fill-current scale-110" : "fill-transparent"}`}
            size={19}
            strokeWidth={2.3}
          />
        </button>
      </div>

      <div className="px-4 pb-4 pt-4">
        <h3 className="truncate text-[15px] font-bold leading-none text-[#403530] max-xl:text-[13px]">{product.name}</h3>
        {product.origin ? <p className="mt-3 truncate text-[10px] font-black leading-none text-[#988b84] max-xl:text-[8px]">{product.origin}</p> : null}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <StarRating interactive onSelect={selectRating} rating={product.rating} size={16} />
            <span className="text-[11px] font-black text-[#8a7d75]">{product.rating}.0</span>
            {product.reviewCount > 0 ? (
              <span className="text-[10px] font-medium text-[#9c8f87]">• {product.reviewCount} Reviews</span>
            ) : null}
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
              className={`h-[35px] rounded-[7px] border px-4 text-[13px] font-bold max-xl:h-[31px] max-xl:px-3 max-xl:text-[11px] ${
                selectedSize === size
                  ? "border-[#fd761a] bg-[#fd761a] text-white"
                  : "border-[#e0d2c6] bg-[#fffaf6] text-[#a19188]"
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
        <button
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-[9px] bg-[#fd761a] text-[13px] font-black text-white shadow-[0_5px_10px_rgba(253,118,26,0.22)] transition hover:bg-[#e86710] max-xl:h-[46px] max-xl:text-[12px]"
          onClick={addToCart}
          onKeyDown={(event) => event.stopPropagation()}
          type="button"
        >
          <ShoppingCart size={16} strokeWidth={2.3} />
          ADD TO CART
        </button>
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

export default DryFriut;
