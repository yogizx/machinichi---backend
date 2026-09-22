import { MapPin, Send, ShoppingCart, Star } from "lucide-react";
import { useMemo, useState } from "react";

const packSizes = {
  weight: ["10KG", "20KG", "25KG", "50KG", "100KG"],
  liquid: ["5L", "10L", "20L", "50L"],
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

const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=520&q=90`;

const bulkProductsBySize = {
  "10KG": {
    Dryfruits: [
      product("Premium California Almonds", "Dryfruits", "10KG", 9400, 8250, image("photo-1508061253366-f7da158b6d46"), "Naturally crunchy almonds packed for stores, gifting counters, and wholesale pantry supply."),
      product("Royal Medjool Dates", "Dryfruits", "10KG", 7200, 6480, image("photo-1609187151057-7f342c2d4563"), "Soft premium dates for retailers, hospitality kitchens, and festive bulk orders."),
    ],
    Flour: [
      product("Stone Ground Wheat Atta", "Flour", "10KG", 520, 455, image("photo-1602928321679-560bb453f190"), "Fresh whole wheat atta made for reliable daily kitchen and retail supply."),
      product("Organic Ragi Flour", "Flour", "10KG", 820, 735, image("photo-1622467827417-bbe2237067a9"), "Calcium-rich millet flour for health stores and institutional kitchens."),
    ],
    Grains: [
      product("Premium Brown Basmati Rice", "Grains", "10KG", 1286, 1125, image("photo-1586201375761-83865001e31c"), "Aromatic long-grain rice for restaurants, distributors, and supermarkets."),
      product("Organic Pearled Barley", "Grains", "10KG", 980, 875, image("photo-1615485290382-441e4d049cb5"), "Clean, wholesome barley for bulk pantry and food service needs."),
    ],
  },
  "20KG": {
    Dryfruits: [
      product("Premium Almonds", "Dryfruits", "20KG", 18800, 16250, image("photo-1508061253366-f7da158b6d46"), "High-quality almonds for wholesale shelves and corporate food programs."),
      product("Cashew Nuts", "Dryfruits", "20KG", 19600, 17100, image("photo-1567892737950-30c4db37cd89"), "Handpicked cashews packed for distributors, hotels, and retail chains."),
    ],
    Flour: [
      product("Premium Wheat Flour", "Flour", "20KG", 980, 855, image("photo-1602928321679-560bb453f190"), "Soft, consistent wheat flour for bakeries, canteens, and restaurants."),
      product("Multi Grain Flour", "Flour", "20KG", 1320, 1160, image("photo-1574323347407-f5e1ad6d020b"), "Nutritious mixed-grain flour for health-focused food businesses."),
    ],
    Grains: [
      product("Basmati Rice", "Grains", "20KG", 2450, 2180, image("photo-1536304993881-ff6e9eefa2a6"), "Premium rice supply for supermarkets, caterers, and food service buyers."),
      product("Foxtail Millet", "Grains", "20KG", 1680, 1495, image("photo-1615485290382-441e4d049cb5"), "Healthy millet option for organic stores and institutional supply."),
    ],
  },
  "25KG": {
    Nuts: [
      product("Whole Kashmiri Walnuts", "Nuts", "25KG", 21200, 18950, image("photo-1608797178974-15b35a64ede9"), "Omega-rich walnuts packed for premium retail and wholesale programs."),
      product("Jumbo Roasted Cashews", "Nuts", "25KG", 23600, 20990, image("photo-1567892737950-30c4db37cd89"), "Crunchy roasted cashews for hospitality, gifting, and supermarket buyers."),
    ],
    Flour: [
      product("Chakki Atta", "Flour", "25KG", 1225, 1080, image("photo-1602928321679-560bb453f190"), "Classic whole wheat flour for recurring high-volume kitchen needs."),
      product("Besan Flour", "Flour", "25KG", 1850, 1640, image("photo-1574323347407-f5e1ad6d020b"), "Fine gram flour suited for snacks, sweets, and commercial kitchens."),
    ],
    "Pooja Items": [
      product("Natural Incense Sticks", "Pooja Items", "25KG", 6200, 5450, image("photo-1603217192097-13c306522271"), "Traditional aroma essentials for distributors and festive retail demand."),
    ],
  },
  "50KG": {
    Flour: [
      product("Premium Wheat Flour", "Flour", "50KG", 2400, 2100, image("photo-1602928321679-560bb453f190"), "High-volume flour supply with dependable texture and freshness."),
      product("Organic Millet Flour", "Flour", "50KG", 3750, 3290, image("photo-1622467827417-bbe2237067a9"), "Bulk millet flour for health brands, kitchens, and distributors."),
    ],
    Grains: [
      product("Basmati Rice", "Grains", "50KG", 6125, 5425, image("photo-1536304993881-ff6e9eefa2a6"), "Large-format rice packaging for restaurants and institutional buyers."),
      product("Brown Rice", "Grains", "50KG", 5750, 5120, image("photo-1586201375761-83865001e31c"), "Nutritious brown rice for wellness stores and commercial kitchens."),
    ],
  },
  "100KG": {
    Flour: [
      product("Stone Ground Wheat Atta", "Flour", "100KG", 4800, 4200, image("photo-1602928321679-560bb453f190"), "Commercial-grade bulk atta for large kitchens and recurring supply contracts."),
      product("Multi Grain Flour", "Flour", "100KG", 6600, 5780, image("photo-1574323347407-f5e1ad6d020b"), "Large quantity multigrain flour for nutrition-focused food service buyers."),
    ],
    Grains: [
      product("Premium Basmati Rice", "Grains", "100KG", 12250, 10800, image("photo-1536304993881-ff6e9eefa2a6"), "Premium rice stock for distributors, supermarkets, and institutional supply."),
      product("Organic Millet Mix", "Grains", "100KG", 7900, 6950, image("photo-1615485290382-441e4d049cb5"), "Bulk millet mix for healthy meal programs and retail repacking."),
    ],
  },
  "5L": {
    Juices: [
      product("Mango Juice", "Juices", "5L", 980, 850, image("photo-1621506289937-a8e4df240d0b"), "Refreshing mango juice packed for events, cafes, and hospitality buyers."),
      product("Mixed Fruit Juice", "Juices", "5L", 920, 805, image("photo-1613478223719-2ab802602423"), "Balanced fruit blend for caterers, restaurants, and beverage counters."),
    ],
    "Cooking Oils": [
      product("Groundnut Oil", "Cooking Oils", "5L", 1450, 1280, image("photo-1474979266404-7eaacbcd87c5"), "Cold-pressed groundnut oil suited for restaurants and specialty stores."),
    ],
  },
  "10L": {
    Juices: [
      product("Amla Juice", "Juices", "10L", 1760, 1540, image("photo-1621506289937-a8e4df240d0b"), "Wellness-focused juice supply for health stores and corporate pantry buyers."),
      product("Sugarcane Ginger Juice", "Juices", "10L", 1680, 1480, image("photo-1613478223719-2ab802602423"), "Fresh-tasting beverage option for events and food service counters."),
    ],
    "Cooking Oils": [
      product("Sesame Oil", "Cooking Oils", "10L", 2960, 2640, image("photo-1474979266404-7eaacbcd87c5"), "Traditional cooking oil for hotels, restaurants, and retail supply."),
    ],
  },
  "20L": {
    Juices: [
      product("Mango Juice", "Juices", "20L", 3820, 3380, image("photo-1621506289937-a8e4df240d0b"), "Large-volume mango juice for caterers, banquets, and distributors."),
      product("Mixed Fruit Juice", "Juices", "20L", 3560, 3150, image("photo-1613478223719-2ab802602423"), "Bulk beverage supply for food service and corporate events."),
    ],
    "Cooking Oils": [
      product("Groundnut Oil", "Cooking Oils", "20L", 5750, 5125, image("photo-1474979266404-7eaacbcd87c5"), "Dependable cooking oil supply for commercial kitchens."),
      product("Sunflower Oil", "Cooking Oils", "20L", 3980, 3560, image("photo-1596040033229-a9821ebd058d"), "Everyday oil for restaurants, canteens, and bulk retail buyers."),
    ],
  },
  "50L": {
    Juices: [
      product("Amla Juice", "Juices", "50L", 8600, 7480, image("photo-1621506289937-a8e4df240d0b"), "High-volume wellness beverage supply for distributors and large buyers."),
      product("Sugarcane Ginger Juice", "Juices", "50L", 8200, 7190, image("photo-1613478223719-2ab802602423"), "Refreshing large-format juice supply for food service operations."),
    ],
    "Cooking Oils": [
      product("Groundnut Oil", "Cooking Oils", "50L", 14200, 12650, image("photo-1474979266404-7eaacbcd87c5"), "Large pack cooking oil for institutional and commercial kitchen use."),
    ],
  },
};

function product(name, category, size, mrp, price, img, description) {
  return {
    category,
    description,
    image: img,
    mrp,
    name,
    price,
    rating: 5,
    size,
    stockStatus: "In Stock",
  };
}

function formatSize(size) {
  return String(size)
    .replace(/(\d)(KG|L)$/i, "$1 $2")
    .replace("KG", "kg");
}

function formatCurrency(amount) {
  return `\u20b9${Number(amount).toLocaleString("en-IN")}`;
}

function BulkBrowsePage({ onAddToCart = () => {} }) {
  const allPackSizes = [...packSizes.weight, ...packSizes.liquid];
  const [selectedPackSize, setSelectedPackSize] = useState(allPackSizes[0]);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const groupedProducts = useMemo(() => bulkProductsBySize[selectedPackSize] || {}, [selectedPackSize]);
  const categoryEntries = Object.entries(groupedProducts);
  const productCount = categoryEntries.reduce((total, [, products]) => total + products.length, 0);

  const openEnquiry = (selectedProduct) => {
    setIsEnquiryOpen(true);
    setIsSubmitted(false);
    setFormData({
      ...initialForm,
      productName: selectedProduct?.name || "",
      quantity: selectedProduct ? Number(String(selectedProduct.size).replace(/[^\d.]/g, "")) : "",
      unit: selectedPackSize.includes("L") ? "L" : "kg",
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
  const addBulkProductToCart = (selectedProduct) => {
    onAddToCart({
      ...selectedProduct,
      oldPrice: formatCurrency(selectedProduct.mrp),
      origin: `${selectedProduct.category} - BULK SUPPLY`,
      price: formatCurrency(selectedProduct.price),
      quantity: 1,
      selectedSize: selectedProduct.size,
      sizes: [selectedProduct.size],
    });
    setCartMessage(`${selectedProduct.name} added to cart successfully.`);
    window.setTimeout(() => setCartMessage(""), 2400);
  };

  return (
    <div className="min-h-screen bg-[#fff8f1] text-[#342821]">
      <main className="mx-auto w-full max-w-[1420px] px-8 pb-14 pt-12 max-lg:px-5 max-sm:px-4 max-sm:pt-7">
        <header className="mb-8 flex items-start justify-between gap-6 max-md:flex-col">
          <div>
            <h1 className="font-serif text-[43px] font-black leading-none tracking-[-0.035em] text-[#2b1a13] max-xl:text-[38px] max-sm:text-[34px]">
              Bulk Orders
            </h1>
            <p className="mt-2 max-w-[760px] text-[14px] font-semibold leading-6 text-[#796d66] max-sm:text-[12px]">
              Browse dummy bulk products by pack size. Select a quantity to see matching products from every category,
              grouped clearly for fast business purchasing.
            </p>
          </div>

          <button
            className="flex h-[48px] items-center justify-center gap-2 rounded-[9px] bg-gradient-to-r from-[#8d3500] to-[#c95e06] px-8 text-[12px] font-black tracking-[0.04em] text-white shadow-[0_9px_16px_rgba(120,54,8,0.22)] transition duration-300 hover:-translate-y-0.5"
            onClick={() => openEnquiry(null)}
            type="button"
          >
            REQUEST BULK QUOTE
            <Send size={15} strokeWidth={2.4} />
          </button>
        </header>

        <BulkPackSizeSelector
          selectedPackSize={selectedPackSize}
          onSelectPackSize={setSelectedPackSize}
        />

        {cartMessage ? (
          <div className="mt-5 rounded-[12px] border border-[#d7e7cf] bg-[#f4fbef] px-5 py-4 text-[13px] font-black text-[#2f6b1f] shadow-[0_8px_18px_rgba(65,38,20,0.06)] animate-[productIn_220ms_ease-out_both]">
            {cartMessage}
          </div>
        ) : null}

        <section className="mt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#b65314]">
                Showing {formatSize(selectedPackSize)}
              </p>
              <h2 className="mt-2 text-[28px] font-black tracking-[-0.025em] text-[#2b1a13] max-sm:text-[23px]">
                Products grouped by category
              </h2>
            </div>
            <p className="rounded-full border border-[#eadfd7] bg-[#fffaf6] px-4 py-2 text-[12px] font-black text-[#7d7068]">
              {productCount} products available
            </p>
          </div>

          {categoryEntries.length > 0 ? (
            <div className="space-y-10" key={selectedPackSize}>
              {categoryEntries.map(([category, products], groupIndex) => (
                <section
                  className="rounded-[12px] border border-[#eadfd7] bg-[#fffaf6]/70 p-5 shadow-[0_8px_18px_rgba(65,38,20,0.05)] sm:p-6"
                  key={category}
                  style={{ animation: `productIn 420ms ease-out ${groupIndex * 60}ms both` }}
                >
                  <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#eadfd7] pb-4">
                    <h3 className="text-[24px] font-black tracking-[-0.025em] text-[#2b1a13] max-sm:text-[20px]">
                      {category}
                    </h3>
                    <span className="text-[12px] font-black text-[#998c84]">
                      {products.length} items
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-x-[28px] gap-y-[34px] max-xl:gap-x-5 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
                    {products.map((productItem, index) => (
                      <BulkProductCard
                        index={index}
                        key={`${productItem.category}-${productItem.name}`}
                        onAddToCart={addBulkProductToCart}
                        product={productItem}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-6 py-12 text-center shadow-[0_8px_18px_rgba(65,38,20,0.05)]">
              <h2 className="text-[20px] font-black text-[#3a302b]">No products available for the selected bulk pack size.</h2>
              <p className="mt-2 text-[14px] font-medium text-[#7f736c]">Try another pack size to view matching bulk products.</p>
            </div>
          )}
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

function BulkPackSizeSelector({ selectedPackSize, onSelectPackSize }) {
  return (
    <section className="sticky top-4 z-10 rounded-[12px] border border-[#eadfd7] bg-[#fffaf6]/95 px-5 py-5 shadow-[0_10px_24px_rgba(65,38,20,0.08)] backdrop-blur">
      <div className="grid gap-5 lg:grid-cols-2">
        <PackSizeGroup
          label="Weight-Based"
          onSelectPackSize={onSelectPackSize}
          selectedPackSize={selectedPackSize}
          sizes={packSizes.weight}
        />
        <PackSizeGroup
          label="Liquid-Based"
          onSelectPackSize={onSelectPackSize}
          selectedPackSize={selectedPackSize}
          sizes={packSizes.liquid}
        />
      </div>
    </section>
  );
}

function PackSizeGroup({ label, onSelectPackSize, selectedPackSize, sizes }) {
  return (
    <div>
      <h2 className="mb-3 text-[16px] font-black text-[#3a302b]">{label}</h2>
      <div className="flex flex-wrap gap-3">
        {sizes.map((size) => {
          const isSelected = selectedPackSize === size;

          return (
            <button
              aria-pressed={isSelected}
              className={`h-[43px] rounded-full border px-[22px] text-[13px] font-black transition duration-300 hover:-translate-y-0.5 max-sm:h-[38px] max-sm:px-4 max-sm:text-[12px] ${
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
    </div>
  );
}

function BulkProductCard({ product, index, onAddToCart }) {
  return (
    <article
      className="overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)] transition duration-300 hover:-translate-y-1"
      style={{ animation: `productIn 480ms ease-out ${index * 45}ms both` }}
    >
      <div className="relative h-[250px] overflow-hidden bg-[#eadfd7] max-xl:h-[220px] max-sm:h-[260px]">
        <img className="h-full w-full object-cover" src={product.image} alt={product.name} />
        <span className="absolute left-0 top-0 rounded-br-[7px] bg-[#b14a05] px-4 py-3 text-[14px] font-black text-white max-xl:text-[12px]">
          {formatSize(product.size)}
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase text-[#1f5a1d] shadow-[0_6px_14px_rgba(65,38,20,0.12)]">
          {product.stockStatus}
        </span>
      </div>

      <div className="px-4 pb-4 pt-4">
        <h3 className="truncate text-[15px] font-bold leading-none text-[#403530] max-xl:text-[13px]">{product.name}</h3>
        <p className="mt-3 truncate text-[10px] font-black leading-none text-[#988b84] max-xl:text-[8px]">
          {product.category} - BULK SUPPLY
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
              <span className="text-[20px] font-black text-[#3c302b] max-xl:text-[17px]">{formatCurrency(product.price)}</span>
              <span className="text-[13px] font-bold text-[#9c8f87] line-through">{formatCurrency(product.mrp)}</span>
            </div>
          </div>
          <span className="rounded-[5px] bg-[#173215] px-2.5 py-1.5 text-[9px] font-black leading-none text-white max-xl:px-2 max-xl:text-[8px]">
            BULK
          </span>
        </div>

        <button
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-3 rounded-[9px] bg-[#fd761a] text-[13px] font-black text-white shadow-[0_5px_10px_rgba(253,118,26,0.22)] transition hover:bg-[#e86710] max-xl:h-[46px] max-xl:text-[12px]"
          onClick={() => onAddToCart(product)}
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

export default BulkBrowsePage;
