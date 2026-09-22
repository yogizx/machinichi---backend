import { useState, useEffect } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  HeartPulse,
  IndianRupee,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const benefits = [
  ["Premium Quality Products", BadgeCheck],
  ["Fresh & Hygienic", ShieldCheck],
  ["Organic & Healthy Options", HeartPulse],
  ["Affordable Pricing", IndianRupee],
  ["Fast Delivery", Clock3],
  ["Trusted by Thousands of Customers", PackageCheck],
];

function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories")
      .then(({ data }) => {
        if (data?.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCategory = (categoryName) => {
    navigate(`/product?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] text-[#2f241e]">
      <main className="mx-auto w-full max-w-[1390px] px-5 pb-16 pt-6 sm:px-8 sm:pt-8 lg:px-[54px]">
        <Hero onBrowse={() => navigate("/product")} />

        <section className="mt-12 sm:mt-16">
          <SectionIntro
            eyebrow="Shop by need"
            title="Explore Every Machinichi Category"
            description="From pantry staples to ritual essentials, each category is curated to help you shop with confidence."
          />

          {loading ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[380px] animate-pulse rounded-[10px] border border-[#eee2d8] bg-[#f5efe9]" />
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => (
                <CategoryCard
                  category={category}
                  index={index}
                  key={category._id}
                  onView={() => openCategory(category.name)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 rounded-[12px] border border-[#eadfd7] bg-white/80 px-5 py-8 shadow-[0_14px_38px_rgba(70,39,14,0.055)] sm:mt-18 sm:px-8 sm:py-10">
          <SectionIntro
            eyebrow="Why choose us"
            title="Quality You Can Taste in Every Order"
            description="Our collections are built around purity, dependable sourcing, and everyday value for families."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(([benefit, Icon]) => (
              <article
                className="group flex min-h-[104px] items-start gap-4 rounded-[10px] border border-[#eee2d8] bg-[#fffaf6] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#e1cbbd] hover:shadow-[0_12px_28px_rgba(70,39,14,0.08)]"
                key={benefit}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] bg-[#5a3322] text-[#f7e6cf] transition duration-300 group-hover:bg-[#fd761a] group-hover:text-white">
                  <Icon size={21} strokeWidth={2.2} />
                </span>
                <div>
                  <h3 className="text-[15px] font-black leading-snug text-[#34251d]">
                    {benefit}
                  </h3>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#756a63]">
                    Carefully managed standards from selection to delivery.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 overflow-hidden rounded-[13px] bg-[#351505] px-6 py-9 text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-[650px]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f5b37d]">
              Complete collection
            </p>
            <h2 className="mt-3 font-sans text-[31px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[44px]">
              Bring home better everyday essentials.
            </h2>
            <p className="mt-4 max-w-[540px] text-[14px] font-medium leading-6 text-white/82 sm:text-[15px]">
              Browse the full Machinichi product range and discover premium staples, healthy options, and trusted favorites in one place.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            <button
              className="flex h-[48px] items-center justify-center gap-2 rounded-[9px] bg-white px-7 text-[11px] font-black text-[#321607] shadow-[0_12px_24px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5"
              onClick={() => navigate("/product")}
              type="button"
            >
              BROWSE ALL PRODUCTS
              <ArrowRight size={15} strokeWidth={2.5} />
            </button>
            <button
              className="h-[48px] rounded-[9px] border border-white/24 bg-white/10 px-7 text-[11px] font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16"
              onClick={() => navigate("/product")}
              type="button"
            >
              START SHOPPING
            </button>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes categoryIn {
          from {
            opacity: 0;
            transform: translateY(14px);
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

function Hero({ onBrowse }) {
  return (
    <section
      className="relative isolate overflow-hidden rounded-[17px] bg-[#321304] px-6 py-12 text-white shadow-[0_18px_42px_rgba(58,31,12,0.16)] sm:px-10 sm:py-16 lg:px-[70px]"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(42,13,0,0.94) 0%, rgba(55,23,6,0.82) 38%, rgba(65,30,8,0.42) 70%, rgba(38,15,4,0.18) 100%), url('https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1600&q=95')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="max-w-[620px] animate-[categoryIn_650ms_ease-out_both]">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f5b37d]">
          Machinichi collections
        </p>
        <h1 className="mt-4 font-sans text-[40px] font-bold leading-[0.98] tracking-[-0.035em] sm:text-[58px]">
          Our Categories
        </h1>
        <p className="mt-5 max-w-[510px] text-[14px] font-medium leading-6 text-white/88 sm:text-[16px]">
          Machinichi offers a wide range of premium-quality products across multiple categories, from wholesome pantry staples to healthy snacks and traditional essentials.
        </p>
        <button
          className="mt-8 flex h-[48px] items-center justify-center gap-2 rounded-[9px] bg-white px-8 text-[11px] font-black text-[#2e170d] shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5"
          onClick={onBrowse}
          type="button"
        >
          EXPLORE PRODUCTS
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}

function SectionIntro({ eyebrow, title, description }) {
  return (
    <div className="max-w-[690px]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b65314]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-sans text-[27px] font-bold leading-tight tracking-[-0.025em] text-[#2b1a13] sm:text-[36px]">
        {title}
      </h2>
      <p className="mt-3 text-[14px] font-medium leading-6 text-[#736860] sm:text-[15px]">
        {description}
      </p>
    </div>
  );
}

function CategoryCard({ category, index, onView }) {
  return (
    <article
      className="group overflow-hidden rounded-[10px] border border-[#eee2d8] bg-white shadow-[0_12px_30px_rgba(70,39,14,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(70,39,14,0.12)]"
      style={{ animation: `categoryIn 520ms ease-out ${index * 55}ms both` }}
    >
      <div className="relative h-[210px] overflow-hidden bg-[#eadfd7]">
        {category.image ? (
          <img
            alt={category.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={category.image}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[#b69480] text-[48px] font-serif">
            {category.name?.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#231109]/62 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 rounded-full bg-white/92 px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#5a3322] shadow-[0_10px_22px_rgba(0,0,0,0.12)]">
          {category.name}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[21px] font-black tracking-[-0.02em] text-[#2c211b]">
            {category.name}
          </h3>
          {typeof category.productCount === "number" && (
            <span className="rounded-full bg-[#fdf3eb] px-3 py-1 text-[11px] font-bold text-[#b65314]">
              {category.productCount} {category.productCount === 1 ? "product" : "products"}
            </span>
          )}
        </div>
        <p className="mt-3 min-h-[72px] text-[13px] font-medium leading-6 text-[#746960]">
          {category.description || "Explore our curated collection of quality products."}
        </p>
        <button
          className="mt-5 flex h-[44px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#fd761a] px-5 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(253,118,26,0.22)] transition hover:bg-[#e86710]"
          onClick={onView}
          type="button"
        >
          VIEW PRODUCTS
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}

export default Categories;
