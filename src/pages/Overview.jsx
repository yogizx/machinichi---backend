import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const image = (id, params = "auto=format&fit=crop&w=520&q=92") =>
  `https://images.unsplash.com/${id}?${params}`;

const orders = [
  {
    id: "ORDER #MN-48291",
    date: "OCT 02, 2024",
    title: "Signature Heritage Flour Blend + 2 items",
    status: "Delivered",
    tone: "bg-[#dcecc8] text-[#5b941c]",
    price: "₹3,520 INR",
    img: image("photo-1509440159596-0249088772ff", "auto=format&fit=crop&w=180&q=95"),
  },
  {
    id: "ORDER #MN-48110",
    date: "SEP 18, 2024",
    title: "Custom Baker's Mix - Julian's Blend",
    status: "Completed",
    tone: "bg-[#e7ddd5] text-[#3f312a]",
    price: "₹2,590 INR",
    img: image("photo-1574323347407-f5e1ad6d020b", "auto=format&fit=crop&w=180&q=95"),
  },
  {
    id: "ORDER #MN-47988",
    date: "AUG 29, 2024",
    title: "Organic Basmati Rice + Dry Fruit Combo",
    status: "Delivered",
    tone: "bg-[#dcecc8] text-[#5b941c]",
    price: "₹1,849 INR",
    img: image("photo-1586201375761-83865001e31c", "auto=format&fit=crop&w=180&q=95"),
  },
  {
    id: "ORDER #MN-47642",
    date: "AUG 11, 2024",
    title: "Cold Pressed Amla Juice Wellness Pack",
    status: "Completed",
    tone: "bg-[#e7ddd5] text-[#3f312a]",
    price: "₹760 INR",
    img: image("photo-1621506289937-a8e4df240d0b", "auto=format&fit=crop&w=180&q=95"),
  },
  {
    id: "ORDER #MN-47209",
    date: "JUL 20, 2024",
    title: "Pooja Essentials Monthly Refill",
    status: "Delivered",
    tone: "bg-[#dcecc8] text-[#5b941c]",
    price: "₹420 INR",
    img: image("photo-1603217192097-13c306522271", "auto=format&fit=crop&w=180&q=95"),
  },
];

const products = [
  {
    name: "Khorasan Whole Grain",
    detail: "2kg / Artisanal Heritage",
    price: "₹1,570 INR",
    tag: "Best Seller",
    tagTone: "bg-[#351000] text-white",
    img: image("photo-1602928321679-560bb453f190", "auto=format&fit=crop&w=520&q=95"),
  },
  {
    name: "Stone-Milled Spelt",
    detail: "1.5kg / Organic Pure",
    price: "₹1,205 INR",
    tag: "Low GI",
    tagTone: "bg-[#7fba3a] text-white",
    img: image("photo-1536304993881-ff6e9eefa2a6", "auto=format&fit=crop&w=520&q=95"),
  },
  {
    name: "Einkorn Starter Kit",
    detail: "3-Pack / Variety Box",
    price: "₹2,660 INR",
    img: image("photo-1602928321679-560bb453f190", "auto=format&fit=crop&w=520&q=95"),
  },
  {
    name: "Pastry Blend 00",
    detail: "2.5kg / Extra Fine",
    price: "₹1,785 INR",
    img: image("photo-1586444248902-2f64eddc13df", "auto=format&fit=crop&w=520&q=95"),
  },
];

const frequentProducts = [
  {
    name: "Machinichi Atta",
    count: "18 orders",
    detail: "5kg / Stone-ground flour",
    img: image("photo-1602928321679-560bb453f190", "auto=format&fit=crop&w=520&q=95"),
    trend: "+24%",
  },
  {
    name: "Organic Basmati Rice",
    count: "14 orders",
    detail: "5kg / Daily pantry staple",
    img: image("photo-1586201375761-83865001e31c", "auto=format&fit=crop&w=520&q=95"),
    trend: "+18%",
  },
  {
    name: "Raw Almonds",
    count: "11 orders",
    detail: "1kg / Premium nuts",
    img: image("photo-1599599810769-bcde5a160d32", "auto=format&fit=crop&w=520&q=95"),
    trend: "+12%",
  },
  {
    name: "Cold Pressed Amla Juice",
    count: "9 orders",
    detail: "500ml / Wellness drink",
    img: image("photo-1621506289937-a8e4df240d0b", "auto=format&fit=crop&w=520&q=95"),
    trend: "+9%",
  },
  {
    name: "Pure Cow Ghee Diyas",
    count: "8 orders",
    detail: "25 pcs / Pooja essential",
    img: image("photo-1603217192097-13c306522271", "auto=format&fit=crop&w=520&q=95"),
    trend: "+8%",
  },
  {
    name: "Millet Upma Mix",
    count: "7 orders",
    detail: "4 pack / Ready 2 eat",
    img: image("photo-1626082927389-6cd097cdc6ec", "auto=format&fit=crop&w=520&q=95"),
    trend: "+7%",
  },
];

const purchasedCategories = [
  {
    name: "Dryfruits",
    img: image("photo-1601275868399-45bec4f4cd9d", "auto=format&fit=crop&w=260&q=95"),
  },
  {
    name: "Nuts",
    img: image("photo-1599599810769-bcde5a160d32", "auto=format&fit=crop&w=260&q=95"),
  },
  {
    name: "Flour",
    img: image("photo-1574323347407-f5e1ad6d020b", "auto=format&fit=crop&w=260&q=95"),
  },
  {
    name: "Ready 2 Eat",
    img: image("photo-1565299624946-b28f40a0ae38", "auto=format&fit=crop&w=260&q=95"),
  },
  {
    name: "Grains",
    img: image("photo-1586201375761-83865001e31c", "auto=format&fit=crop&w=260&q=95"),
  },
  {
    name: "Juices",
    img: image("photo-1621506289937-a8e4df240d0b", "auto=format&fit=crop&w=260&q=95"),
  },
  {
    name: "Pooja Items",
    img: image("photo-1603217192097-13c306522271", "auto=format&fit=crop&w=260&q=95"),
  },
];

const categoryPurchaseDetails = {
  Dryfruits: [
    { name: "Premium Dates", detail: "500g / Naturally sweet", price: "₹260 INR", count: "7 purchases", img: image("photo-1609187151057-7f342c2d4563", "auto=format&fit=crop&w=240&q=95") },
    { name: "Golden Raisins", detail: "250g / Seedless pack", price: "₹180 INR", count: "5 purchases", img: image("photo-1596040033229-a9821ebd058d", "auto=format&fit=crop&w=240&q=95") },
    { name: "Dried Cranberry Mix", detail: "250g / Berry mix", price: "₹430 INR", count: "3 purchases", img: image("photo-1587393855524-087f83d95bc9", "auto=format&fit=crop&w=240&q=95") },
  ],
  Nuts: [
    { name: "Raw Almonds", detail: "1kg / Premium nuts", price: "₹899 INR", count: "11 purchases", img: image("photo-1599599810769-bcde5a160d32", "auto=format&fit=crop&w=240&q=95") },
    { name: "Whole Cashews", detail: "500g / Kitchen staple", price: "₹540 INR", count: "8 purchases", img: image("photo-1567892737950-30c4db37cd89", "auto=format&fit=crop&w=240&q=95") },
    { name: "Kashmiri Walnuts", detail: "500g / Omega rich", price: "₹780 INR", count: "4 purchases", img: image("photo-1608797178974-15b35a64ede9", "auto=format&fit=crop&w=240&q=95") },
  ],
  Flour: [
    { name: "Machinichi Atta", detail: "5kg / Stone-ground flour", price: "₹250 INR", count: "18 purchases", img: image("photo-1602928321679-560bb453f190", "auto=format&fit=crop&w=240&q=95") },
    { name: "Multi-Millet Flour", detail: "2kg / Daily rotis", price: "₹350 INR", count: "9 purchases", img: image("photo-1622467827417-bbe2237067a9", "auto=format&fit=crop&w=240&q=95") },
    { name: "Organic Ragi Flour", detail: "1kg / Calcium rich", price: "₹180 INR", count: "6 purchases", img: image("photo-1574323347407-f5e1ad6d020b", "auto=format&fit=crop&w=240&q=95") },
  ],
  "Ready 2 Eat": [
    { name: "Instant Millet Upma", detail: "4 Pack / Breakfast mix", price: "₹220 INR", count: "6 purchases", img: image("photo-1626082927389-6cd097cdc6ec", "auto=format&fit=crop&w=240&q=95") },
    { name: "Healthy Poha Mix", detail: "3 Pack / Quick meal", price: "₹190 INR", count: "4 purchases", img: image("photo-1604909052743-94e838986d24", "auto=format&fit=crop&w=240&q=95") },
    { name: "Millet Pongal Cup", detail: "2 Pack / Instant meal", price: "₹160 INR", count: "3 purchases", img: image("photo-1565299624946-b28f40a0ae38", "auto=format&fit=crop&w=240&q=95") },
  ],
  Grains: [
    { name: "Organic Basmati Rice", detail: "5kg / Long grain", price: "₹399 INR", count: "14 purchases", img: image("photo-1586201375761-83865001e31c", "auto=format&fit=crop&w=240&q=95") },
    { name: "Red Jasmine Rice", detail: "1kg / Aromatic grain", price: "₹180 INR", count: "6 purchases", img: image("photo-1603133872878-684f208fb84b", "auto=format&fit=crop&w=240&q=95") },
    { name: "Tri-Color Quinoa", detail: "500g / High protein", price: "₹763 INR", count: "4 purchases", img: image("photo-1615485500704-8e990f9900f7", "auto=format&fit=crop&w=240&q=95") },
  ],
  Juices: [
    { name: "Cold Pressed Amla", detail: "500ml / Wellness drink", price: "₹160 INR", count: "5 purchases", img: image("photo-1621506289937-a8e4df240d0b", "auto=format&fit=crop&w=240&q=95") },
    { name: "Sugarcane Ginger Juice", detail: "1L / Fresh blend", price: "₹120 INR", count: "3 purchases", img: image("photo-1613478223719-2ab802602423", "auto=format&fit=crop&w=240&q=95") },
    { name: "Beetroot Carrot Juice", detail: "500ml / Daily cleanse", price: "₹140 INR", count: "3 purchases", img: image("photo-1600271886742-f049cd451bba", "auto=format&fit=crop&w=240&q=95") },
  ],
  "Pooja Items": [
    { name: "Pure Camphor", detail: "100g / Ritual essential", price: "₹90 INR", count: "4 purchases", img: image("photo-1603217192097-13c306522271", "auto=format&fit=crop&w=240&q=95") },
    { name: "Cotton Wicks", detail: "Pack of 100 / Daily use", price: "₹60 INR", count: "3 purchases", img: image("photo-1602928321679-560bb453f190", "auto=format&fit=crop&w=240&q=95&sat=-55") },
    { name: "Natural Incense Sticks", detail: "100g / Temple aroma", price: "₹99 INR", count: "3 purchases", img: image("photo-1602874801007-bd458bb1b8b6", "auto=format&fit=crop&w=240&q=95") },
  ],
};

const parseOrderPrice = (price) => Number(String(price).replace(/[^\d]/g, "")) || 0;
const formatInr = (amount) => `₹${amount.toLocaleString("en-IN")} INR`;

function Overview() {
  const navigate = useNavigate();
  const [favoriteOffset, setFavoriteOffset] = useState(0);
  const [showExpandedOrders, setShowExpandedOrders] = useState(false);
  const [frequentOffset, setFrequentOffset] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(purchasedCategories[0].name);
  const visibleProducts = useMemo(
    () => products.map((_, index) => products[(index + favoriteOffset + products.length) % products.length]),
    [favoriteOffset],
  );
  const totalSpent = useMemo(
    () =>
      orders
        .filter((order) => ["Completed", "Delivered"].includes(order.status))
        .reduce((total, order) => total + parseOrderPrice(order.price), 0),
    [],
  );
  const visibleOrders = orders.slice(0, showExpandedOrders ? 4 : 2);
  const visibleFrequentProducts = useMemo(
    () => Array.from({ length: 3 }, (_, index) => frequentProducts[(index + frequentOffset) % frequentProducts.length]),
    [frequentOffset],
  );
  const rotateFavorites = (direction) => {
    setFavoriteOffset((current) => (current + direction + products.length) % products.length);
  };
  const rotateFrequentProducts = (direction) => {
    setFrequentOffset((current) => (current + direction + frequentProducts.length) % frequentProducts.length);
  };

  return (
    <main className="account-shell relative h-full overflow-hidden bg-[#fffaf5] text-[#191411] antialiased">
      <div className="account-sidebar-fixed border-t border-[#efe5dc]">
        <Sidebar />
      </div>

      <section className="h-full overflow-y-auto border-t border-[#efe5dc]">
        <div className="mx-auto max-w-[1390px] md:pl-[var(--account-sidebar-width)]">
          <div className="px-7 pb-12 pt-9 sm:px-10 sm:pb-16 lg:px-[88px] lg:pb-[34px] lg:pt-[32px]">
            <TotalSpentCard amount={totalSpent} orderCount={orders.filter((order) => ["Completed", "Delivered"].includes(order.status)).length} onViewOrders={() => navigate("/orders")} />

            <section className="mt-[32px]">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-serif text-[34px] font-black leading-none tracking-[-0.045em] sm:text-[36px]">
                Recent Orders <span className="text-[24px] text-[#b94b00]">•</span>
              </h1>
              <button className="hidden items-center gap-2 text-[14px] font-black tracking-[-0.025em] text-[#a43e05] transition hover:text-[#6f2600] sm:flex" onClick={() => navigate("/orders")} type="button">
                View all history
                <ArrowRight size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="mt-[25px] space-y-[19px] transition-all duration-500 ease-out">
              {visibleOrders.map((order, index) => (
                <OrderCard key={order.id} onOpen={() => navigate("/orders")} orderIndex={index} {...order} />
              ))}
            </div>
            {orders.length > 2 ? (
              <div className="mt-6 flex justify-center">
                <button
                  className="flex h-[48px] items-center gap-3 rounded-full border border-[#e7ddd5] bg-white px-6 text-[14px] font-black text-[#a43e05] shadow-[0_4px_12px_rgba(48,29,17,0.035)] transition hover:-translate-y-0.5 hover:bg-[#f4ece5]"
                  onClick={() => setShowExpandedOrders((isExpanded) => !isExpanded)}
                  type="button"
                >
                  {showExpandedOrders ? "View Less Orders" : "View More Orders"}
                  <ArrowRight className={`transition duration-300 ${showExpandedOrders ? "-rotate-90" : ""}`} size={17} strokeWidth={2.4} />
                </button>
              </div>
            ) : null}
            </section>

            <section className="mt-[33px]">
              <div className="flex items-center justify-between gap-5">
                <h2 className="font-serif text-[29px] font-black leading-none tracking-[-0.035em] sm:text-[32px]">
                  Most Frequently Purchased Product
                </h2>
                <div className="flex items-center gap-[12px]">
                  <RoundButton label="Previous frequent products" icon={ArrowLeft} onClick={() => rotateFrequentProducts(-1)} />
                  <RoundButton label="Next frequent products" icon={ArrowRight} onClick={() => rotateFrequentProducts(1)} />
                </div>
              </div>
              <div className="mt-[22px] grid gap-[18px] lg:grid-cols-3">
                {visibleFrequentProducts.map((product) => (
                  <FrequentProductCard key={product.name} {...product} />
                ))}
              </div>
            </section>

            <section className="mt-[33px]">
              <h2 className="font-serif text-[29px] font-black leading-none tracking-[-0.035em] sm:text-[32px]">
                Categories of Product Purchased
              </h2>
              <div className="mt-[22px] grid grid-cols-2 gap-[14px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {purchasedCategories.map((category) => (
                  <PurchasedCategoryCard
                    active={selectedCategory === category.name}
                    key={category.name}
                    onSelect={() => setSelectedCategory(category.name)}
                    {...category}
                  />
                ))}
              </div>
              <CategoryPurchasePanel category={selectedCategory} products={categoryPurchaseDetails[selectedCategory]} />
            </section>

            <section className="mt-[33px]">
            <div className="flex items-center justify-between gap-5">
              <h2 className="font-serif text-[34px] font-black leading-none tracking-[-0.045em] sm:text-[36px]">
                Quick Reorder Favorites
              </h2>
              <div className="hidden items-center gap-[12px] sm:flex">
                <RoundButton label="Previous favorites" icon={ArrowLeft} onClick={() => rotateFavorites(-1)} />
                <RoundButton label="Next favorites" icon={ArrowRight} onClick={() => rotateFavorites(1)} />
              </div>
            </div>

            <div className="mt-[24px] grid gap-[19px] sm:grid-cols-2 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard key={product.name} onAdd={() => navigate("/cart")} {...product} />
              ))}
            </div>
            </section>
          </div>

        </div>
      </section>
    </main>
  );
}

function TotalSpentCard({ amount, onViewOrders, orderCount }) {
  return (
    <article className="relative isolate min-h-[260px] overflow-hidden rounded-[29px] bg-gradient-to-r from-[#ff7419] via-[#ff7b25] to-[#ff7719] px-[39px] py-[37px] text-white shadow-[0_20px_27px_rgba(255,105,18,0.21)]">
      <div className="absolute inset-y-0 right-0 w-[16%] bg-[#d64e00]/8" />
      <div className="absolute right-[32px] top-[31px] flex h-[75px] w-[75px] items-center justify-center rounded-[18px] bg-white/16">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 border-white text-[22px] font-black">
          ₹
        </span>
      </div>

      <p className="text-[16px] font-medium uppercase tracking-[0.23em]">Total Amount Spent</p>
      <div className="mt-[22px] flex flex-wrap items-end gap-[13px]">
        <strong className="text-[54px] font-black leading-[0.9] tracking-[-0.055em] sm:text-[72px]">
          {formatInr(amount)}
        </strong>
      </div>

      <div className="mt-[54px] flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-[14px] text-[16px] font-bold tracking-[-0.02em]">
          <span className="h-[7px] w-[7px] rounded-full bg-white" />
          Calculated from {orderCount} completed orders
        </p>
        <button className="h-[49px] min-w-[165px] rounded-full bg-white px-8 text-[15px] font-black text-[#a93e05] shadow-[0_13px_22px_rgba(130,49,13,0.15)] transition hover:-translate-y-0.5" onClick={onViewOrders} type="button">
          View Orders
        </button>
      </div>
    </article>
  );
}

function OrderCard({ date, id, img, onOpen, orderIndex, price, status, title, tone }) {
  return (
    <article
      className="flex flex-col gap-5 rounded-[23px] border border-[#e6ded7] bg-white px-[22px] py-[18px] shadow-[0_5px_17px_rgba(66,39,22,0.025)] transition duration-300 ease-out sm:flex-row sm:items-center sm:justify-between"
      style={{ animation: `recentOrderIn 320ms ease-out ${Math.min(orderIndex, 3) * 45}ms both` }}
    >
      <div className="flex min-w-0 items-center gap-[31px]">
        <img className="h-[96px] w-[96px] shrink-0 rounded-[13px] object-cover" src={img} alt="" />
        <div className="min-w-0">
          <p className="text-[14px] font-black uppercase tracking-[0.12em] text-[#9b9895]">
            {id} <span className="mx-[8px]">•</span> {date}
          </p>
          <h2 className="mt-[10px] truncate text-[21px] font-medium tracking-[-0.045em] text-[#18130f]">
            {title}
          </h2>
          <span className={`mt-[9px] inline-flex rounded-full px-[12px] py-[3px] text-[11px] font-black uppercase ${tone}`}>
            <span className="mr-[6px] mt-[5px] h-[6px] w-[6px] rounded-full bg-current" />
            {status}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-[42px] sm:justify-end">
        <p className="text-[34px] font-normal leading-none tracking-[-0.05em] text-[#14100d]">{price}</p>
        <button className="flex h-[57px] w-[57px] items-center justify-center rounded-[17px] bg-[#e9dfd6] text-[#111] transition hover:bg-[#ded1c7]" onClick={onOpen} type="button" aria-label={`Open ${id}`}>
          <ChevronRight size={28} strokeWidth={3} />
        </button>
      </div>
      <style>{`
        @keyframes recentOrderIn {
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

function FrequentProductCard({ count, detail, img, name, trend }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-[#e6ded7] bg-white shadow-[0_5px_17px_rgba(66,39,22,0.025)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_26px_rgba(66,39,22,0.07)]">
      <div className="relative h-[138px] overflow-hidden bg-[#f2ebe5]">
        <img className="h-full w-full object-cover" src={img} alt={name} />
        <span className="absolute left-4 top-4 rounded-full bg-[#351000] px-3 py-2 text-[11px] font-black uppercase text-white">
          {count}
        </span>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-black tracking-[-0.04em] text-[#18130f]">{name}</h3>
            <p className="mt-2 text-[13px] font-medium text-[#817872]">{detail}</p>
          </div>
          <span className="rounded-full bg-[#dcecc8] px-3 py-1 text-[12px] font-black text-[#5b941c]">{trend}</span>
        </div>
      </div>
    </article>
  );
}

function PurchasedCategoryCard({ active = false, img, name, onSelect }) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-[18px] border bg-white p-3 text-center shadow-[0_4px_14px_rgba(54,33,20,0.03)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_10px_22px_rgba(54,33,20,0.07)] ${
        active ? "border-[#be4b00] ring-2 ring-[#ffdcc7]" : "border-[#e7ded7]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="mx-auto h-[82px] w-[82px] overflow-hidden rounded-full bg-[#f2ebe5] shadow-[0_10px_22px_rgba(48,24,8,0.08)]">
        <img className="h-full w-full object-cover" src={img} alt={name} />
      </div>
      <h3 className={`mt-4 text-[13px] font-black tracking-[-0.025em] ${active ? "text-[#be4b00]" : "text-[#211a16]"}`}>
        {name}
      </h3>
    </button>
  );
}

function CategoryPurchasePanel({ category, products = [] }) {
  const heroProduct = products[0];

  return (
    <div
      className="mt-[18px] grid overflow-hidden rounded-[26px] border border-[#e6ded7] bg-white shadow-[0_10px_28px_rgba(66,39,22,0.055)] transition-all duration-500 ease-out lg:grid-cols-[0.82fr_1.18fr]"
      key={category}
      style={{ animation: "categoryPanelIn 360ms ease-out both" }}
    >
      <div className="relative min-h-[250px] overflow-hidden bg-[#2d1608] px-6 py-7 text-white">
        {heroProduct ? (
          <img className="absolute inset-0 h-full w-full object-cover opacity-55" src={heroProduct.img} alt="" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d1608]/94 via-[#4a220d]/62 to-[#9e4200]/42" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffd9c2]">Purchased Products</p>
            <h3 className="mt-3 max-w-[260px] font-serif text-[34px] font-black leading-none tracking-[-0.045em]">
              {category}
            </h3>
          </div>
          <div className="mt-10 flex items-end justify-between gap-5">
            <span className="rounded-full bg-white/18 px-4 py-2 text-[12px] font-black backdrop-blur">
              {products.length} saved items
            </span>
            <ChevronRight size={34} strokeWidth={2.6} />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-2 px-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#a43e05]">Showing category purchases</p>
            <h3 className="mt-2 text-[22px] font-black tracking-[-0.04em] text-[#18130f]">{category} Products</h3>
        </div>
        <span className="w-fit rounded-full bg-[#f2ebe5] px-4 py-2 text-[12px] font-black text-[#6d625c]">
          {products.length} items
        </span>
      </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
            <article
              className="group overflow-hidden rounded-[18px] border border-[#efe5dc] bg-[#fffaf5] shadow-[0_4px_14px_rgba(54,33,20,0.03)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(54,33,20,0.08)]"
              key={product.name}
            >
              <div className="h-[118px] overflow-hidden bg-[#f2ebe5]">
                <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={product.img} alt={product.name} />
              </div>
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="truncate text-[16px] font-black tracking-[-0.035em] text-[#211a16]">{product.name}</h4>
                <p className="mt-2 text-[13px] font-medium text-[#817872]">{product.detail}</p>
              </div>
                  <strong className="shrink-0 text-[15px] font-black tracking-[-0.04em] text-[#be4b00]">{product.price}</strong>
                </div>
                <p className="mt-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#9b9895]">{product.count}</p>
            </div>
          </article>
        ))}
        </div>
      </div>

      <style>{`
        @keyframes categoryPanelIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function RoundButton({ icon: Icon, label, onClick }) {
  return (
    <button className="flex h-[47px] w-[47px] items-center justify-center rounded-full border border-[#e7ddd5] bg-white text-[#17120f] shadow-[0_4px_12px_rgba(48,29,17,0.035)] transition hover:bg-[#f4ece5]" onClick={onClick} type="button" aria-label={label}>
      <Icon size={23} strokeWidth={2.4} />
    </button>
  );
}

function ProductCard({ detail, img, name, onAdd, price, tag, tagTone }) {
  return (
    <article className="relative rounded-[20px] border border-[#e7ded7] bg-white p-[8px] pb-[20px] shadow-[0_4px_14px_rgba(54,33,20,0.03)]">
      <div className="relative aspect-[1.24] overflow-hidden rounded-[13px] bg-[#f2ebe5]">
        {tag ? (
          <span className={`absolute left-[14px] top-[14px] z-10 rounded-[7px] px-[13px] py-[7px] text-[12px] font-black uppercase ${tagTone}`}>
            {tag}
          </span>
        ) : null}
        <img className="h-full w-full object-cover" src={img} alt={name} />
      </div>
      <div className="px-[12px] pt-[13px]">
        <h3 className="text-[15px] font-black tracking-[-0.035em]">{name}</h3>
        <p className="mt-[7px] text-[14px] font-medium tracking-[-0.025em] text-[#8a837d]">{detail}</p>
        <p className="mt-[18px] text-[22px] font-normal tracking-[-0.04em] text-[#13100d]">{price}</p>
      </div>
      <button className="absolute bottom-[20px] right-[18px] flex h-[45px] w-[45px] items-center justify-center rounded-full bg-[#be4b00] text-white shadow-[0_8px_17px_rgba(178,70,4,0.25)] transition hover:-translate-y-0.5" onClick={onAdd} type="button" aria-label={`Add ${name} to cart`}>
        <ShoppingCart size={21} strokeWidth={2.4} />
      </button>
    </article>
  );
}

export default Overview;
