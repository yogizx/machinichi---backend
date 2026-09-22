import { ChevronDown, MapPin, Send, ShoppingCart, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { productCatalog } from "./Product";

const bulkSizePattern = /^(10|20|25|50|100)\s?KG$|^(5|10|20|50)\s?L$|CUSTOM/i;
const bulkPackSizes = ["10KG", "20KG", "25KG", "50KG", "100KG", "5L", "10L", "20L", "50L"];
const sortOptions = ["Popularity", "Price: Low to High", "Price: High to Low"];
const priceBounds = { min: 1000, max: 50000 };

const productDescriptions = {
  "Premium Brown Basmati Rice":
    "Aromatic organic rice for restaurants, supermarkets, hotels, distributors, and wholesale pantry supply.",
  "Stone Ground Wheat Atta":
    "Fresh-milled whole wheat flour ideal for commercial kitchens, retailers, institutions, and recurring bulk orders.",
};

const initialForm = {
  fullName: "",
  companyName: "",
  phone: "",
  email: "",
  productName: "",
  quantity: "",
  unit: "kg",
  location: "",
  requirements: "",
};

const parseAmount = (price) => Number(String(price).replace(/[^\d]/g, "")) || 0;
const parseSizeValue = (size) => Number(String(size).replace(/[^\d.]/g, "")) || 1;
const formatCurrency = (amount) => `\u20b9${Number(amount).toLocaleString("en-IN")}`;
const formatSize = (size) =>
  String(size)
    .replace(/(\d)(KG|L)$/i, "$1 $2")
    .replace("KG", "kg");
const normalizeSize = (size) => String(size).replace(/\s+/g, "").toUpperCase();
const getRangePercent = (value) => ((value - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100;

const getBulkProducts = () =>
  productCatalog
    .map((product) => {
      const bulkSizes = product.sizes.filter((size) => bulkSizePattern.test(size));

      if (!bulkSizes.length) return null;

      return {
        ...product,
        bulkSizes,
        description:
          productDescriptions[product.name] ||
          "Premium Machinichi product available for large-quantity business procurement.",
        stockStatus: "In Stock",
      };
    })
    .filter(Boolean);

function getBulkPrice(product, selectedSize) {
  const baseSize = product.sizes[0];
  const baseAmount = parseAmount(product.price);
  const baseOldAmount = parseAmount(product.oldPrice || product.price);
  const multiplier = parseSizeValue(selectedSize) / parseSizeValue(baseSize);
  const mrp = Math.round(baseOldAmount * multiplier);
  const bulkPrice = Math.max(Math.round(baseAmount * multiplier * 0.9), 1);

  return { bulkPrice, mrp };
}

function BulkProductPage({ onAddToCart = () => {} }) {
  const bulkProducts = useMemo(() => getBulkProducts(), []);
  const categories = useMemo(
    () =>
      Array.from(new Set(bulkProducts.map((product) => product.category))).map((category) => [
        category,
        bulkProducts.filter((product) => product.category === category).length,
      ]),
    [bulkProducts],
  );
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedUnitType, setSelectedUnitType] = useState("All");
  const [selectedPackSize, setSelectedPackSize] = useState(null);
  const [priceRange, setPriceRange] = useState(priceBounds);
  const [sortBy, setSortBy] = useState(sortOptions[0]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  const filteredProducts = useMemo(() => {
    const items = bulkProducts.filter((product) => {
      const firstBulkSize = product.bulkSizes[0];
      const { bulkPrice } = getBulkPrice(product, firstBulkSize);
      const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
      const matchesUnit =
        selectedUnitType === "All"
          ? true
          : product.bulkSizes.some((size) =>
              selectedUnitType === "Weight" ? size.toUpperCase().includes("KG") : size.toUpperCase().includes("L"),
            );
      const matchesPackSize = selectedPackSize
        ? product.bulkSizes.some((size) => normalizeSize(size) === selectedPackSize)
        : true;
      const matchesPrice = bulkPrice >= priceRange.min && bulkPrice <= priceRange.max;

      return matchesCategory && matchesUnit && matchesPackSize && matchesPrice;
    });

    if (sortBy === "Price: Low to High") {
      items.sort((a, b) => getBulkPrice(a, a.bulkSizes[0]).bulkPrice - getBulkPrice(b, b.bulkSizes[0]).bulkPrice);
    }

    if (sortBy === "Price: High to Low") {
      items.sort((a, b) => getBulkPrice(b, b.bulkSizes[0]).bulkPrice - getBulkPrice(a, a.bulkSizes[0]).bulkPrice);
    }

    return items;
  }, [bulkProducts, priceRange, selectedCategory, selectedPackSize, selectedUnitType, sortBy]);

  const openEnquiry = (product, selectedSize) => {
    const isLiquid = selectedSize?.toUpperCase().includes("L");

    setIsEnquiryOpen(true);
    setIsSubmitted(false);
    setFormData({
      ...initialForm,
      productName: product?.name || "",
      quantity: selectedSize ? parseSizeValue(selectedSize) : "",
      unit: isLiquid ? "L" : "kg",
    });
  };

  const closeEnquiry = () => {
    setIsEnquiryOpen(false);
    setIsSubmitted(false);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const submitEnquiry = (event) => {
    event.preventDefault();
    setIsSubmitted(true);
  };
  const addBulkProductToCart = (product, selectedSize) => {
    const { bulkPrice, mrp } = getBulkPrice(product, selectedSize);

    onAddToCart({
      ...product,
      baseOldPrice: product.oldPrice,
      basePrice: product.price,
      oldPrice: formatCurrency(mrp),
      price: formatCurrency(bulkPrice),
      quantity: 1,
      selectedSize,
      sizes: product.bulkSizes,
    });
    setCartMessage(`${product.name} added to cart successfully.`);
    window.setTimeout(() => setCartMessage(""), 2400);
  };

  return (
    <div className="min-h-screen bg-[#fff8f1] text-[#342821]">
      <main className="mx-auto flex w-full max-w-[1420px] gap-[48px] px-8 pb-14 pt-12 max-xl:max-w-[1180px] max-xl:gap-9 max-lg:max-w-[820px] max-lg:flex-col max-lg:px-5 max-sm:px-4 max-sm:pt-7">
        <aside className="w-[280px] shrink-0 max-xl:w-[250px] max-lg:w-full">
          <BulkFilterPanel
            categories={categories}
            onCategorySelect={setSelectedCategory}
            onPriceRangeChange={setPriceRange}
            onUnitTypeSelect={setSelectedUnitType}
            priceRange={priceRange}
            selectedCategory={selectedCategory}
            selectedUnitType={selectedUnitType}
          />
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-8 flex items-start justify-between gap-6 max-sm:flex-col">
            <div>
              <h1 className="font-serif text-[43px] font-black leading-none tracking-[-0.035em] text-[#2b1a13] max-xl:text-[38px] max-sm:text-[34px]">
                Bulk Orders
              </h1>
              <p className="mt-2 max-w-[640px] text-[14px] font-semibold leading-6 text-[#796d66] max-sm:text-[12px]">
                Premium Machinichi products in large pack sizes for businesses, retailers, wholesalers, hotels,
                restaurants, distributors, and institutions.
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
                      onClick={() => {
                        setSortBy(option);
                        setIsSortOpen(false);
                      }}
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

          <BulkPackSizeFilter
            selectedPackSize={selectedPackSize}
            onSelectPackSize={setSelectedPackSize}
          />

          {cartMessage ? (
            <div className="mb-6 rounded-[12px] border border-[#d7e7cf] bg-[#f4fbef] px-5 py-4 text-[13px] font-black text-[#2f6b1f] shadow-[0_8px_18px_rgba(65,38,20,0.06)] animate-[productIn_220ms_ease-out_both]">
              {cartMessage}
            </div>
          ) : null}

          {filteredProducts.length > 0 ? (
            <div
              className="grid grid-cols-4 gap-x-[28px] gap-y-[34px] max-xl:gap-x-5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
              key={selectedPackSize || "all-pack-sizes"}
            >
              {filteredProducts.map((product, index) => (
                <BulkProductCard
                  index={index}
                  key={product.name}
                  onAddToCart={addBulkProductToCart}
                  product={product}
                  selectedPackSize={selectedPackSize}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-6 py-12 text-center shadow-[0_8px_18px_rgba(65,38,20,0.05)]">
              <h2 className="text-[20px] font-black text-[#3a302b]">
                {selectedPackSize ? "No products available for the selected bulk pack size." : "No bulk products found"}
              </h2>
              <p className="mt-2 text-[14px] font-medium text-[#7f736c]">
                Try a different pack size, category, unit, or price range.
              </p>
            </div>
          )}

          <div className="mt-[58px] rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-6 py-7 shadow-[0_8px_18px_rgba(65,38,20,0.05)] sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-[22px] font-black tracking-[-0.025em] text-[#2b1a13]">Need a custom bulk size?</h2>
              <p className="mt-2 max-w-[560px] text-[13px] font-medium leading-6 text-[#796d66]">
                Request custom pack sizes, recurring supply, or business pricing from the Machinichi sales team.
              </p>
            </div>
            <button
              className="mt-5 flex h-[48px] items-center justify-center gap-2 rounded-[9px] bg-gradient-to-r from-[#8d3500] to-[#c95e06] px-8 text-[12px] font-black tracking-[0.04em] text-white shadow-[0_9px_16px_rgba(120,54,8,0.22)] transition duration-300 hover:-translate-y-0.5 sm:mt-0"
              onClick={() => openEnquiry(null, null)}
              type="button"
            >
              REQUEST BULK QUOTE
              <Send size={15} strokeWidth={2.4} />
            </button>
          </div>
        </section>
      </main>

      {isEnquiryOpen ? (
        <BulkEnquiryModal
          formData={formData}
          isSubmitted={isSubmitted}
          onChange={updateField}
          onClose={closeEnquiry}
          onSubmit={submitEnquiry}
        />
      ) : null}

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
    </div>
  );
}

function BulkPackSizeFilter({ selectedPackSize, onSelectPackSize }) {
  return (
    <section className="sticky top-4 z-10 mb-8 rounded-[12px] border border-[#eadfd7] bg-[#fffaf6]/95 px-5 py-5 shadow-[0_10px_24px_rgba(65,38,20,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Bulk Pack Sizes</h2>
          <p className="mt-1 text-[12px] font-semibold text-[#7f736c]">
            Select a pack size to instantly view matching bulk products across all categories.
          </p>
        </div>

        <button
          className={`h-[38px] rounded-full border px-5 text-[12px] font-black transition ${
            selectedPackSize === null
              ? "border-[#fd761a] bg-[#fd761a] text-white shadow-[0_4px_9px_rgba(253,118,26,0.2)]"
              : "border-[#d9cabf] bg-white text-[#8a7d75] hover:border-[#fd761a] hover:text-[#c34b0d]"
          }`}
          onClick={() => onSelectPackSize(null)}
          type="button"
        >
          All Sizes
        </button>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
        {bulkPackSizes.map((size) => {
          const isSelected = selectedPackSize === size;

          return (
            <button
              aria-pressed={isSelected}
              className={`h-[43px] shrink-0 rounded-full border px-[22px] text-[13px] font-black transition duration-300 hover:-translate-y-0.5 max-sm:h-[38px] max-sm:px-4 max-sm:text-[12px] ${
                isSelected
                  ? "border-[#fd761a] bg-[#fd761a] text-white shadow-[0_8px_18px_rgba(253,118,26,0.22)]"
                  : "border-[#d9cabf] bg-white text-[#7d7068] hover:border-[#fd761a] hover:text-[#c34b0d]"
              }`}
              key={size}
              onClick={() => onSelectPackSize(size)}
              type="button"
            >
              {formatSize(size)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BulkFilterPanel({
  categories,
  selectedCategory,
  selectedUnitType,
  onCategorySelect,
  onPriceRangeChange,
  onUnitTypeSelect,
  priceRange,
}) {
  const minPercent = getRangePercent(priceRange.min);
  const maxPercent = getRangePercent(priceRange.max);
  const unitTypes = ["All", "Weight", "Liquid"];

  return (
    <div className="text-[16px] font-semibold text-[#5f554f] max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-8 max-md:block max-sm:text-[14px]">
      <section className="border-b border-[#eadfd7] pb-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Bulk Categories</h2>
        <div className="space-y-4">
          <button
            className={`flex w-full items-center justify-between text-left leading-none ${
              selectedCategory === null ? "font-black text-[#fd761a]" : "text-[#6c625c]"
            }`}
            onClick={() => onCategorySelect(null)}
            type="button"
          >
            <span>All Bulk Products</span>
            <span className="text-[13px] text-[#998c84]">{categories.reduce((sum, [, count]) => sum + count, 0)}</span>
          </button>
          {categories.map(([label, count]) => (
            <button
              className={`flex w-full items-center justify-between text-left leading-none ${
                selectedCategory === label ? "font-black text-[#fd761a]" : "text-[#6c625c]"
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
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Bulk Unit Type</h2>
        <div className="flex flex-wrap gap-3">
          {unitTypes.map((unitType) => (
            <Pill
              active={selectedUnitType === unitType}
              key={unitType}
              onClick={() => onUnitTypeSelect(unitType)}
            >
              {unitType}
            </Pill>
          ))}
        </div>
      </section>

      <section className="border-b border-[#eadfd7] py-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Price Range</h2>
        <div className="space-y-4">
          <input
            aria-label="Minimum bulk price"
            className="w-full accent-[#fd761a]"
            max={priceBounds.max}
            min={priceBounds.min}
            onChange={(event) =>
              onPriceRangeChange((current) => ({
                ...current,
                min: Math.min(Number(event.target.value), current.max - 1000),
              }))
            }
            step="1000"
            type="range"
            value={priceRange.min}
          />
          <input
            aria-label="Maximum bulk price"
            className="w-full accent-[#fd761a]"
            max={priceBounds.max}
            min={priceBounds.min}
            onChange={(event) =>
              onPriceRangeChange((current) => ({
                ...current,
                max: Math.max(Number(event.target.value), current.min + 1000),
              }))
            }
            step="1000"
            type="range"
            value={priceRange.max}
          />
        </div>
        <div className="mt-3 h-[2px] rounded-full bg-[#d8c6b9]">
          <div
            className="h-[2px] rounded-full bg-[#a7470c]"
            style={{ marginLeft: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
          />
        </div>
        <p className="mt-4 rounded-[10px] border border-[#eadfd7] bg-[#fffaf6] px-4 py-3 text-[13px] font-black leading-5 text-[#3a302b] shadow-[0_1px_4px_rgba(64,35,20,0.04)]">
          Selected Price Range:{" "}
          <span className="text-[#b65314]">
            {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
          </span>
        </p>
      </section>

      <section className="pt-8">
        <h2 className="mb-5 text-[20px] font-black text-[#3a302b] max-sm:text-[18px]">Bulk Pack Sizes</h2>
        <div className="flex flex-wrap gap-3">
          {bulkPackSizes.map((size) => (
            <span
              className="rounded-full border border-[#d9cabf] bg-[#fffaf6] px-4 py-2 text-[11px] font-black text-[#8a7d75]"
              key={size}
            >
              {formatSize(size)}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Pill({ active = false, children, onClick }) {
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

function BulkProductCard({ product, index, onAddToCart, selectedPackSize }) {
  const selectedFilterSize = product.bulkSizes.find((size) => normalizeSize(size) === selectedPackSize);
  const [selectedSize, setSelectedSize] = useState(selectedFilterSize || product.bulkSizes[0]);
  const { bulkPrice, mrp } = getBulkPrice(product, selectedSize);

  useEffect(() => {
    if (selectedFilterSize) {
      setSelectedSize(selectedFilterSize);
    }
  }, [selectedFilterSize]);

  return (
    <article
      className="overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)] transition duration-300 hover:-translate-y-1"
      style={{ animation: `productIn 480ms ease-out ${index * 45}ms both` }}
    >
      <div className="relative h-[250px] overflow-hidden bg-[#eadfd7] max-xl:h-[220px] max-sm:h-[260px]">
        <img className="h-full w-full object-cover" src={product.image} alt={product.name} />
        {product.badge ? (
          <span className="absolute left-0 top-0 rounded-br-[7px] bg-[#b14a05] px-4 py-3 text-[14px] font-black text-white max-xl:text-[12px]">
            {product.badge}
          </span>
        ) : null}
        <span className="absolute right-3 top-3 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase text-[#1f5a1d] shadow-[0_6px_14px_rgba(65,38,20,0.12)]">
          {product.stockStatus}
        </span>
      </div>

      <div className="px-4 pb-4 pt-4">
        <h3 className="truncate text-[15px] font-bold leading-none text-[#403530] max-xl:text-[13px]">{product.name}</h3>
        <p className="mt-3 truncate text-[10px] font-black leading-none text-[#988b84] max-xl:text-[8px]">
          {product.category} - {product.origin}
        </p>
        <p className="mt-3 line-clamp-3 min-h-[60px] text-[12px] font-medium leading-5 text-[#756a63]">
          {product.description}
        </p>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} size={16} />
              <span className="text-[11px] font-black text-[#8a7d75]">{product.rating}.0</span>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[20px] font-black text-[#3c302b] max-xl:text-[17px]">{formatCurrency(bulkPrice)}</span>
              <span className="text-[13px] font-bold text-[#9c8f87] line-through">{formatCurrency(mrp)}</span>
            </div>
          </div>
          <div className="flex max-w-[46%] shrink-0 flex-wrap justify-end gap-1.5 pt-0.5">
            {product.tags.map((tag) => (
              <span
                className="rounded-[5px] bg-[#173215] px-2.5 py-1.5 text-[9px] font-black leading-none text-white max-xl:px-2 max-xl:text-[8px]"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.08em] text-[#988b84]">Bulk Size</p>
          <div className="flex flex-wrap gap-2">
            {product.bulkSizes.map((size) => (
              <button
                aria-pressed={selectedSize === size}
                className={`h-[35px] rounded-[7px] border px-4 text-[13px] font-bold max-xl:h-[31px] max-xl:px-3 max-xl:text-[11px] ${
                  selectedSize === size
                    ? "border-[#fd761a] bg-[#fd761a] text-white"
                    : "border-[#e0d2c6] bg-[#fffaf6] text-[#a19188]"
                }`}
                key={size}
                onClick={() => setSelectedSize(size)}
                type="button"
              >
                {formatSize(size)}
              </button>
            ))}
          </div>
        </div>

        <button
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-[9px] bg-[#fd761a] text-[13px] font-black text-white shadow-[0_5px_10px_rgba(253,118,26,0.22)] transition hover:bg-[#e86710] max-xl:h-[46px] max-xl:text-[12px]"
          onClick={() => onAddToCart(product, selectedSize)}
          type="button"
        >
          <ShoppingCart size={16} strokeWidth={2.3} />
          ADD TO CART
        </button>
      </div>
    </article>
  );
}

function StarRating({ rating, size = 14 }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={index < rating ? "fill-[#f6a623] text-[#f6a623]" : "fill-[#eadfd7] text-[#eadfd7]"}
          key={index}
          size={size}
          strokeWidth={1.8}
        />
      ))}
    </span>
  );
}

function BulkEnquiryModal({ formData, isSubmitted, onChange, onClose, onSubmit }) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1d0d05]/72 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-[820px] overflow-y-auto rounded-[12px] bg-[#fffaf5] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b65314]">Bulk enquiry</p>
            <h2 className="mt-2 text-[27px] font-black tracking-[-0.025em] text-[#2b1a13]">Submit Bulk Enquiry</h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-[8px] border border-[#eadfd7] bg-white text-[20px] font-black text-[#5a3322] transition hover:bg-[#fff3e8]"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        {isSubmitted ? (
          <div className="mt-6 rounded-[10px] border border-[#d7e7cf] bg-[#f4fbef] p-6 text-[#244118]">
            <h3 className="text-[22px] font-black">Enquiry received</h3>
            <p className="mt-2 text-[14px] font-medium leading-6">
              Thank you. Our sales team will review your requirement and contact you with a bulk quote.
            </p>
            <button
              className="mt-5 h-[44px] rounded-[8px] bg-[#5a3322] px-6 text-[11px] font-black text-white"
              onClick={onClose}
              type="button"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <Field label="Full Name" name="fullName" onChange={onChange} required value={formData.fullName} />
            <Field label="Company Name" name="companyName" onChange={onChange} value={formData.companyName} />
            <Field label="Phone Number" name="phone" onChange={onChange} required type="tel" value={formData.phone} />
            <Field label="Email Address" name="email" onChange={onChange} required type="email" value={formData.email} />
            <Field label="Product Name" name="productName" onChange={onChange} required value={formData.productName} />
            <Field label="Required Quantity" name="quantity" onChange={onChange} required type="number" value={formData.quantity} />

            <label className="block">
              <span className="text-[12px] font-black text-[#574941]">Preferred Unit</span>
              <select
                className="mt-2 h-[46px] w-full rounded-[8px] border border-[#eadfd7] bg-white px-4 text-[14px] font-semibold text-[#3a302b] outline-none focus:border-[#fd761a]"
                name="unit"
                onChange={onChange}
                value={formData.unit}
              >
                <option value="kg">kg</option>
                <option value="L">L</option>
              </select>
            </label>

            <Field
              icon={MapPin}
              label="Delivery Location"
              name="location"
              onChange={onChange}
              required
              value={formData.location}
            />

            <label className="block sm:col-span-2">
              <span className="text-[12px] font-black text-[#574941]">Additional Requirements</span>
              <textarea
                className="mt-2 min-h-[110px] w-full rounded-[8px] border border-[#eadfd7] bg-white px-4 py-3 text-[14px] font-semibold text-[#3a302b] outline-none focus:border-[#fd761a]"
                name="requirements"
                onChange={onChange}
                value={formData.requirements}
              />
            </label>

            <div className="sm:col-span-2">
              <button
                className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#fd761a] px-7 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(253,118,26,0.22)] transition hover:bg-[#e86710] sm:w-auto"
                type="submit"
              >
                SUBMIT BULK ENQUIRY
                <Send size={15} strokeWidth={2.5} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, name, onChange, required = false, type = "text", value }) {
  return (
    <label className="block">
      <span className="text-[12px] font-black text-[#574941]">{label}</span>
      <span className="relative mt-2 block">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8d84]" size={16} />
        ) : null}
        <input
          className={`h-[46px] w-full rounded-[8px] border border-[#eadfd7] bg-white px-4 text-[14px] font-semibold text-[#3a302b] outline-none focus:border-[#fd761a] ${Icon ? "pl-10" : ""}`}
          name={name}
          onChange={onChange}
          required={required}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}

export default BulkProductPage;
