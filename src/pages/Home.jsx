import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Heart,
  ShoppingCart,
  Star,
  Stethoscope,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

import ProductImage from "../components/product/ProductImage";
import { slugifyProduct } from "../data/products";
import bowlImage from "./images/bowl.png";

const image = (id, params = "auto=format&fit=crop&w=900&q=90") =>
  `https://images.unsplash.com/${id}?${params}`;

const heroSlides = [
  {
    id: 1,
    title: "FLAT 20% OFF on",
    subtitle: "Stone-Ground",
    subtitle2: "Atta",
    description: "EXPERIENCE WHOLESOME GOODNESS IN EVERY GRAIN.",
    cta: "SHOP NOW",
    ctaLink: "/product",
    background: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1600&q=95",
  },
  {
    id: 2,
    title: "PREMIUM SELECTION of",
    subtitle: "Organic Rice &",
    subtitle2: "Grains",
    description: "ETHICALLY SOURCED ANCIENT GRAINS & AROMATIC BASMATI.",
    cta: "EXPLORE GRAINS",
    ctaLink: "/product?category=Grains",
    background: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1600&q=95",
  },
  {
    id: 3,
    title: "PURE & NATURAL",
    subtitle: "Cold-Pressed",
    subtitle2: "Oils",
    description: "TRADITIONALLY EXTRACTED FOR RICH AROMA & NUTRIENTS.",
    cta: "SHOP OILS",
    ctaLink: "/product?search=oil",
    background: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1600&q=95",
  },
  {
    id: 4,
    title: "HANDPICKED & FRESH",
    subtitle: "Dry Fruits &",
    subtitle2: "Nuts",
    description: "POWER-PACKED NUTRITION FOR YOUR DAILY WELLNESS.",
    cta: "DISCOVER NUTS",
    ctaLink: "/product?category=Nuts",
    background: "https://images.unsplash.com/photo-1601275868399-45bec4f4cd9d?auto=format&fit=crop&w=1600&q=95",
  },
];

const products = [
  {
    name: "Machinichi Atta",
    weight: "5kg",
    price: "₹250",
    oldPrice: "₹320",
    img: image("photo-1602928321679-560bb453f190", "auto=format&fit=crop&w=520&q=95"),
    tag: "BEST SELLER",
    tagTone: "bg-[#5C2D12] text-white",
    rating: 4.5,
    reviewCount: 128,
  },
  {
    name: "Organic Rice",
    weight: "5kg",
    price: "₹399",
    oldPrice: "₹520",
    img: image("photo-1536304993881-ff6e9eefa2a6", "auto=format&fit=crop&w=520&q=95"),
    tag: "20% OFF",
    tagTone: "bg-[#EA6D17] text-white",
    rating: 4,
    reviewCount: 96,
  },
  {
    name: "Basmati Rice",
    weight: "2kg",
    price: "₹249",
    oldPrice: "₹320",
    img: image("photo-1586201375761-83865001e31c", "auto=format&fit=crop&w=520&q=95"),
    tag: "NEW",
    tagTone: "bg-[#EA6D17] text-white",
    rating: 4.5,
    reviewCount: 204,
  },
  {
    name: "Cold Pressed Oil",
    weight: "1L",
    price: "₹599",
    oldPrice: "₹749",
    img: image("photo-1474979266404-7eaacbcd87c5", "auto=format&fit=crop&w=520&q=95"),
    tag: "ORGANIC",
    tagTone: "bg-[#5C2D12] text-white",
    rating: 5,
    reviewCount: 67,
  },
  {
    name: "Raw Honey",
    weight: "500g",
    price: "₹299",
    oldPrice: "₹399",
    img: image("photo-1587049352851-8d4e89133924", "auto=format&fit=crop&w=520&q=95"),
    tag: "BEST SELLER",
    tagTone: "bg-[#5C2D12] text-white",
    rating: 4,
    reviewCount: 53,
  },
];

const wellness = [
  {
    title: "Cleanse\nCare",
    icon: Droplet,
    img: image("photo-1587854692152-cbe660dbde88", "auto=format&fit=crop&w=720&q=95"),
    link: "/product?search=cleanse",
  },
  {
    title: "Heart\nHealth",
    icon: Heart,
    img: image("photo-1606914501449-5a96b6ce24ca", "auto=format&fit=crop&w=720&q=95"),
    link: "/product?search=heart+health",
  },
  {
    title: "Everyday\nCare",
    icon: Stethoscope,
    img: image("photo-1576091160550-2173dba999ef", "auto=format&fit=crop&w=720&q=95"),
    link: "/product?search=everyday",
  },
];

function Home({ favoriteProducts = new Set(), onAddToCart = () => { }, onFavoriteToggle = () => { } }) {
  return (
    <div className="min-h-screen bg-[#FAF6F0] font-sans text-[#2C1810] antialiased">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <main className="space-y-12 sm:space-y-14">
          <Hero />
          <Categories />
          <Bundles />
          <Trending favoriteProducts={favoriteProducts} onAddToCart={onAddToCart} onFavoriteToggle={onFavoriteToggle} />
          <Subscription />
          <Wellness />
        </main>
      </div>
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveBanners = async () => {
      try {
        const response = await api.get("/banners/active");
        if (response.data?.data && response.data.data.length > 0) {
          setSlides(response.data.data);
        } else {
          // Format static fallback to align with backend schema
          const fallback = heroSlides.map(slide => ({
            _id: String(slide.id),
            imageWebp: slide.background,
            imageFallback: slide.background,
            bigText: `${slide.title} ${slide.subtitle || ""} ${slide.subtitle2 || ""}`.trim(),
            smallText: slide.description || "",
            buttonText: slide.cta || "",
            buttonURL: slide.ctaLink || "",
            contentPosition: "Left Side",
            isActive: true
          }));
          setSlides(fallback);
        }
      } catch (err) {
        console.error("Error loading active banners:", err);
        const fallback = heroSlides.map(slide => ({
          _id: String(slide.id),
          imageWebp: slide.background,
          imageFallback: slide.background,
          bigText: `${slide.title} ${slide.subtitle || ""} ${slide.subtitle2 || ""}`.trim(),
          smallText: slide.description || "",
          buttonText: slide.cta || "",
          buttonURL: slide.ctaLink || "",
          contentPosition: "Left Side",
          isActive: true
        }));
        setSlides(fallback);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveBanners();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToPrev = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const current = slides[currentSlide];
  const showControls = slides.length > 1;

  if (loading || slides.length === 0) {
    return (
      <section className="relative isolate min-h-[360px] sm:min-h-[440px] lg:min-h-[480px] overflow-hidden rounded-[24px] bg-[#2B1106] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-xs font-semibold tracking-wider text-white/70">Loading Banners...</p>
        </div>
      </section>
    );
  }

  const bigTextVal = current.bigText || current.title || "";
  const smallTextVal = current.smallText || current.subtitle || "";
  const buttonTextVal = current.buttonText || current.cta || "";
  const buttonURLVal = current.buttonURL || current.ctaLink || current.linkUrl || "";

  const isImageOnly =
    !bigTextVal.trim() &&
    !smallTextVal.trim() &&
    !buttonTextVal.trim();

  // Validate internal / external URL redirection
  const handleCtaClick = (url) => {
    if (!url) return;
    const lower = url.toLowerCase().trim();
    if (lower.startsWith("javascript:")) return; // Block malicious javascript links

    if (lower.startsWith("http://") || lower.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      navigate(url);
    }
  };

  return (
    <section className="relative isolate min-h-[360px] sm:min-h-[440px] lg:min-h-[480px] overflow-hidden rounded-[24px] bg-[#2B1106] text-white shadow-[0_20px_50px_rgba(43,17,6,0.2)] flex items-center">
      
      {/* Background Slides with Fade Transition & Native Fallback */}
      {slides.map((slide, index) => {
        const slideWebp = slide.imageWebp || slide.image || slide.imageUrl;
        const slideFallback = slide.imageFallback || slide.imageUrl || slide.image;

        return (
          <div
            key={slide._id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentSlide ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"
            }`}
          >
            {/* Browser Compatible Picture Tag */}
            <picture className="absolute inset-0 w-full h-full">
              <source srcSet={slideWebp} type="image/webp" />
              <img
                src={slideFallback}
                alt={slide.bigText || slide.title || "Machinichi Banner"}
                className="w-full h-full object-cover object-[center_right]"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </picture>

            {/* Correct Dark Gradient Overlay */}
            <div
              className={`absolute inset-0 ${
                slide.contentPosition === "Right Side"
                  ? "bg-gradient-to-l from-[#140602]/95 via-[#230d06]/75 to-transparent"
                  : "bg-gradient-to-r from-[#140602]/95 via-[#230d06]/75 to-transparent"
              }`}
            />
          </div>
        );
      })}

      {/* Previous Slide Button */}
      {showControls && (
        <button
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#2C1810] shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition cursor-pointer"
          onClick={goToPrev}
          type="button"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* Next Slide Button */}
      {showControls && (
        <button
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#2C1810] shadow-lg hover:bg-white hover:scale-110 active:scale-95 transition cursor-pointer"
          onClick={goToNext}
          type="button"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* Dynamic Content Overlay */}
      {!isImageOnly && (
        <div className={`w-full flex items-center z-10 px-6 py-9 sm:px-12 lg:px-16 ${
          current.contentPosition === "Right Side" ? "justify-end" : "justify-start"
        }`}>
          <div
            key={current._id}
            className={`animate-[fadeUp_500ms_ease-out_both] max-w-[620px] flex flex-col ${
              current.contentPosition === "Right Side" ? "items-end text-right" : "items-start text-left"
            }`}
          >
            {bigTextVal.trim() && (
              <h1 className="font-sans text-[32px] sm:text-[46px] lg:text-[52px] font-extrabold leading-[1.08] tracking-tight text-white uppercase drop-shadow-md">
                {bigTextVal}
              </h1>
            )}
            
            {smallTextVal.trim() && (
              <p className="mt-4 text-[13px] sm:text-[14px] font-bold tracking-widest uppercase leading-relaxed text-white/90 max-w-[460px]">
                {smallTextVal}
              </p>
            )}

            {buttonTextVal.trim() && (
              <div className="mt-7 flex items-center gap-4">
                <button
                  className="flex items-center gap-2.5 rounded-[10px] bg-[#EA6D17] hover:bg-[#d55b0e] px-8 py-3.5 text-[13px] sm:text-[14px] font-extrabold uppercase tracking-wider text-white shadow-[0_8px_22px_rgba(234,109,23,0.38)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  onClick={() => handleCtaClick(buttonURLVal)}
                  type="button"
                >
                  {buttonTextVal}
                  <ArrowRight size={17} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination Dots */}
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
          {slides.map((slide, index) => (
            <button
              key={slide._id}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setCurrentSlide(index)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                index === currentSlide
                  ? "w-8 h-2.5 bg-white shadow-md"
                  : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
              }`}
              type="button"
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/categories")
      .then(({ data }) => {
        if (data?.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const openCategory = (categoryName) => {
    navigate(`/product?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section>
      <SectionHeader title="Shop by Category" action="VIEW ALL CATEGORIES" onAction={() => navigate("/categories")} />

      <div className="relative mt-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4 sm:gap-6 justify-items-center">
          {categories.map((item) => (
            <article
              className="group cursor-pointer text-center flex flex-col items-center"
              key={item._id}
              onClick={() => openCategory(item.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCategory(item.name);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div className="h-[90px] w-[90px] sm:h-[102px] sm:w-[102px] lg:h-[108px] lg:w-[108px] p-1 rounded-full bg-white shadow-[0_6px_18px_rgba(44,24,16,0.1)] border-2 border-[#EAE1D4] flex items-center justify-center transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_12px_24px_rgba(44,24,16,0.16)]">
                <div className="h-full w-full overflow-hidden rounded-full bg-white">
                  <ProductImage src={item.image} alt={item.name} width={200} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" priority />
                </div>
              </div>
              <p className="mt-3.5 text-[12px] sm:text-[13px] font-extrabold tracking-wider uppercase text-[#2C1810] transition group-hover:text-[#EA6D17]">
                {item.name}
              </p>
            </article>
          ))}
        </div>

        <button
          aria-label="Next categories"
          className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2C1810] shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-[#EAE1D4] hover:scale-110 transition cursor-pointer z-10"
        >
          <ChevronRight size={19} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}

function Bundles() {
  const navigate = useNavigate();
  return (
    <section>
      <SectionHeader title="Featured Products" action="VIEW ALL" onAction={() => navigate("/product")} />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <BundleCard
          title="Morning Essentials"
          subtitle="100% Natural - Rich in Nutrients Norcients"
          description="Start your day right with wholesome staples."
          price="₹1,249"
          oldPrice="₹1,500"
          img={image("photo-1620916566398-39f1143ab7be", "auto=format&fit=crop&w=320&q=95")}
          badge="BEST SELLER"
        />
        <BundleCard
          title="Daily Nutrition Bundle"
          subtitle="Wholesome blend for your everyday health"
          description="A perfect mix of nutrition for your everyday meals."
          price="₹499"
          oldPrice="₹749"
          img={image("photo-1585238342024-78d387f4a707", "auto=format&fit=crop&w=320&q=95")}
          badge="NEW ARRIVAL"
        />
      </div>
    </section>
  );
}

function BundleCard({ title, subtitle, description, price, oldPrice, img, badge }) {
  return (
    <article className="relative flex flex-col sm:flex-row items-center justify-between gap-5 rounded-[22px] border border-[#E8DCCF] bg-[#F5EFE8] p-6 sm:p-7 shadow-[0_4px_20px_rgba(44,24,16,0.05)] transition duration-300 hover:shadow-[0_10px_28px_rgba(44,24,16,0.1)] group">
      <span className="absolute top-5 left-6 rounded-full bg-[#5C2D12] px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
        {badge}
      </span>
      <button
        aria-label="Add to wishlist"
        className="absolute top-5 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm border border-white/80 text-[#7A6B63] hover:text-[#EA6D17] transition cursor-pointer"
        type="button"
      >
        <Heart size={15} strokeWidth={2.2} />
      </button>

      <div className="pt-6 sm:pt-4 min-w-0 flex-1">
        <h3 className="font-sans text-[22px] sm:text-[24px] font-extrabold text-[#2C1810] leading-tight">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] sm:text-[14px] font-semibold text-[#6D625C] max-w-[300px]">
          {subtitle || description}
        </p>
        <div className="mt-4 flex items-baseline gap-2.5">
          <strong className="text-[24px] sm:text-[28px] font-extrabold text-[#2C1810] tracking-tight">{price}</strong>
          {oldPrice ? <span className="text-[15px] sm:text-[16px] font-semibold text-[#A69B93] line-through">{oldPrice}</span> : null}
        </div>
        <button className="mt-4 flex items-center justify-center gap-2 rounded-[10px] bg-[#EA6D17] hover:bg-[#d55b0e] px-6 py-2.5 text-[12px] sm:text-[13px] font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(234,109,23,0.3)] transition cursor-pointer">
          <ShoppingCart size={15} strokeWidth={2.5} />
          ADD TO CART
        </button>
      </div>
      <div className="h-[140px] w-[140px] sm:h-[170px] sm:w-[170px] shrink-0 overflow-hidden rounded-[18px] bg-white p-2.5 shadow-inner flex items-center justify-center">
        <ProductImage src={img} alt={title} width={320} className="h-full w-full object-cover rounded-[14px] group-hover:scale-105 transition duration-500" />
      </div>
    </article>
  );
}

function Trending({ favoriteProducts = new Set(), onAddToCart, onFavoriteToggle }) {
  const navigate = useNavigate();
  const openProductDetail = (product) => {
    navigate(`/product/${slugifyProduct(product.name)}`, { state: { product } });
  };
  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    onAddToCart({
      name: product.name,
      price: product.price,
      image: product.img,
      selectedSize: product.weight,
      sizes: [product.weight],
      quantity: 1,
    });
  };

  const handleToggleFavorite = (e, productName) => {
    e.stopPropagation();
    onFavoriteToggle(productName);
  };

  return (
    <section>
      <SectionHeader
        title="Trending Collections"
        action="VIEW ALL"
        subtitle="Explore our most loved products."
        onAction={() => navigate("/product")}
      />
      <div className="relative mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5">
          {products.map((product) => (
            <article
              className="group relative flex flex-col justify-between rounded-[20px] border border-[#ECE2D5] bg-[#F6F1EB] p-3.5 sm:p-4 shadow-[0_4px_16px_rgba(44,24,16,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(44,24,16,0.12)] cursor-pointer"
              key={product.name}
              onClick={() => openProductDetail(product)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openProductDetail(product);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div>
                {product.tag ? (
                  <span
                    className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm ${
                      product.tag.includes("%") || product.tag === "NEW" ? "bg-[#EA6D17]" : "bg-[#5C2D12]"
                    }`}
                  >
                    {product.tag}
                  </span>
                ) : null}

                <button
                  aria-label={favoriteProducts.has(product.name) ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
                  aria-pressed={favoriteProducts.has(product.name)}
                  className={`absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
                    favoriteProducts.has(product.name)
                      ? "border-[#EA6D17] bg-[#EA6D17] text-white shadow-md"
                      : "border-white/80 bg-white/90 text-[#7A6B63] shadow-sm hover:text-[#EA6D17]"
                  }`}
                  onClick={(e) => handleToggleFavorite(e, product.name)}
                  type="button"
                >
                  <Heart
                    aria-hidden="true"
                    className={`transition ${favoriteProducts.has(product.name) ? "fill-current scale-110" : "fill-transparent"}`}
                    size={15}
                    strokeWidth={2.2}
                  />
                </button>

                <div className="relative aspect-[0.88] w-full overflow-hidden rounded-[14px] bg-white p-2.5 shadow-inner flex items-center justify-center">
                  <ProductImage
                    src={product.img}
                    alt={product.name}
                    width={400}
                    className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                  {product.rating ? (
                    <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-[11px] sm:text-[12px] font-bold text-[#F59E0B] shadow-sm border border-gray-100">
                      <Star size={11} strokeWidth={2.3} className="fill-[#F59E0B]" />
                      <span>{product.rating}</span>
                      <span className="text-[10px] sm:text-[11px] text-gray-500">({product.reviewCount})</span>
                    </div>
                  ) : null}
                </div>

                <h3 className="mt-3 font-sans text-[16px] sm:text-[17px] font-extrabold text-[#2C1810] leading-snug line-clamp-1">
                  {product.name}
                </h3>
                <p className="mt-0.5 text-[13px] sm:text-[14px] font-bold text-[#8C7D73]">{product.weight}</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[18px] sm:text-[19px] font-extrabold text-[#2C1810] tracking-tight">{product.price}</span>
                  {product.oldPrice ? <span className="text-[14px] sm:text-[15px] font-semibold text-[#A69B93] line-through">{product.oldPrice}</span> : null}
                </div>
              </div>

              <button
                onClick={(e) => handleAddToCart(e, product)}
                className="mt-3.5 flex h-[42px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#EA6D17] hover:bg-[#d55b0e] text-[13px] sm:text-[14px] font-black text-white uppercase tracking-wider shadow-[0_4px_12px_rgba(234,109,23,0.3)] transition active:scale-98 cursor-pointer"
                type="button"
              >
                <ShoppingCart size={15} strokeWidth={2.4} />
                ADD TO CART
              </button>
            </article>
          ))}
        </div>

        <button
          aria-label="Next trending products"
          className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#2C1810] shadow-[0_6px_16px_rgba(0,0,0,0.12)] border border-[#EAE1D4] hover:scale-110 transition cursor-pointer z-10"
        >
          <ChevronRight size={19} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}

function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState("Monthly");
  const features = ["100% Natural", "No Preservatives", "Rich in Nutrients"];
  const planOptions = ["Monthly", "Quarterly", "Halfyearly", "Annually"];

  return (
    <section className="relative overflow-hidden rounded-[26px] bg-[#2D1306] bg-gradient-to-r from-[#280E04] via-[#331407] to-[#200A03] p-7 sm:p-10 lg:p-12 text-white shadow-[0_20px_50px_rgba(40,16,5,0.22)]">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        
        {/* Left Group: Larger Flour Bowl Image + Text Info */}
        <div className="flex flex-col sm:flex-row items-center gap-7 sm:gap-10 flex-1 max-w-[780px]">
          {/* Wooden Flour Bowl Image - Noticeably Larger */}
          <div className="shrink-0 w-[230px] h-[230px] sm:w-[270px] sm:h-[270px] lg:w-[310px] lg:h-[310px] flex items-center justify-center relative">
            <img
              src={bowlImage}
              alt="Flour bowl with golden wheat"
              className="w-full h-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.65)] hover:scale-105 transition duration-500"
            />
          </div>

          {/* Text Content */}
          <div>
            <h2 className="font-sans text-[30px] sm:text-[40px] lg:text-[44px] font-extrabold leading-[1.08] text-white tracking-tight">
              Artisanal flour,
              <br />
              delivered by habit.
            </h2>
            <p className="mt-3.5 text-[14px] sm:text-[15px] font-medium leading-relaxed text-white/85 max-w-[460px]">
              Stone-ground to retain nutrients, aroma, and flavour. Wholesome, natural, and perfect for your daily meals.
            </p>
            
            <div className="mt-5 flex flex-wrap items-center gap-4 sm:gap-6">
              {features.map((feature) => (
                <div className="flex items-center gap-2" key={feature}>
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#EA6D17] text-white shadow-sm shrink-0">
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                  <span className="text-[12px] sm:text-[13px] font-extrabold tracking-wider uppercase text-white/95">{feature}</span>
                </div>
              ))}
            </div>

            <button className="mt-7 flex items-center gap-2.5 rounded-[10px] bg-[#EA6D17] hover:bg-[#d55b0e] px-8 py-3.5 text-[13px] sm:text-[14px] font-black uppercase tracking-wider text-white shadow-[0_8px_22px_rgba(234,109,23,0.4)] transition hover:scale-105 cursor-pointer">
              SUBSCRIBE & SAVE
              <ArrowRight size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Right Side: Subscription Selector Card */}
        <div className="w-full lg:w-[400px] shrink-0 rounded-[22px] border border-white/12 bg-[#1A0A03]/60 backdrop-blur-md p-6 sm:p-7 shadow-xl relative overflow-hidden">
          <div className="border-b border-white/10 pb-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#EA6D17]">SUBSCRIPTION</p>
            <h3 className="mt-1 font-sans text-[24px] sm:text-[26px] font-extrabold text-white tracking-tight">Create Plan&apos;s As</h3>
            <p className="mt-1 text-[13px] text-white/70 font-medium">
              Choose how often you want your essentials delivered.
            </p>
          </div>
          
          <div className="mt-5 grid grid-cols-2 gap-3.5">
            {planOptions.map((plan) => {
              const isSelected = selectedPlan === plan;
              return (
                <button
                  aria-pressed={isSelected}
                  className={`flex items-center justify-between rounded-[12px] p-4 text-left transition duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-[#EA6D17] border border-[#EA6D17] text-white shadow-lg shadow-orange-950/30"
                      : "bg-white/5 border border-white/12 text-white/80 hover:bg-white/10"
                  }`}
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  type="button"
                >
                  <span className="text-[14px] sm:text-[15px] font-extrabold">{plan}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
                      isSelected ? "bg-white text-[#EA6D17]" : "border border-white/30 text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Green Leaves Accent at bottom right */}
          <div className="absolute -bottom-3 -right-3 w-16 h-16 pointer-events-none opacity-85 flex items-center justify-center text-emerald-500 text-3xl">
            🌿
          </div>
        </div>

      </div>
    </section>
  );
}

function Wellness() {
  const navigate = useNavigate();

  return (
    <section className="pt-2">
      <div className="text-center">
        <p className="text-[12px] sm:text-[13px] font-black tracking-[0.22em] text-[#94532B] uppercase">CURATED FOR YOU</p>
        <h2 className="mt-1 font-sans text-[34px] sm:text-[42px] lg:text-[46px] font-extrabold text-[#2C1810] tracking-tight leading-tight flex items-center justify-center gap-2">
          Curated Wellness Solutions
          <span className="text-[#94532B] text-2xl">🍂</span>
        </h2>
        <p className="mt-2 text-[15px] sm:text-[16px] text-[#6B5E56] font-medium max-w-[480px] mx-auto leading-snug">
          Thoughtfully chosen products to support
          <br />
          your health, wellness &amp; daily balance.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3 lg:gap-8">
        {wellness.map((item) => (
          <WellnessCard key={item.title} {...item} onExplore={() => navigate(item.link)} />
        ))}
      </div>
    </section>
  );
}

function WellnessCard({ title, icon: Icon, img, onExplore }) {
  return (
    <article className="group relative h-[330px] sm:h-[360px] lg:h-[380px] overflow-hidden rounded-[22px] bg-[#2B1106] border border-[#EAE1D4] shadow-[0_10px_26px_rgba(44,24,16,0.08)] cursor-pointer">
      <ProductImage
        src={img}
        alt={title.replace("\n", " ")}
        width={720}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
        aspectRatio="auto"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      
      <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5 z-10 p-5 rounded-[18px] bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-xl flex flex-col items-start justify-between">
        <Icon size={24} strokeWidth={2.2} className="text-white mb-2" />
        <h3 className="whitespace-pre-line font-sans text-[22px] sm:text-[24px] font-extrabold leading-[1.1] tracking-tight text-white mb-3">
          {title}
        </h3>
        <button
          className="flex items-center gap-1.5 rounded-[10px] bg-[#FCE4C6] hover:bg-white text-[#2C1810] px-4 py-2 text-[11px] sm:text-[12px] font-extrabold uppercase tracking-wider shadow-sm transition hover:scale-105 cursor-pointer"
          onClick={onExplore}
          type="button"
        >
          EXPLORE
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}

function SectionHeader({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E8DCCF] pb-3.5">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">🥜</span>
          <h2 className="font-sans text-[24px] sm:text-[28px] font-extrabold text-[#2C1810] tracking-tight">{title}</h2>
        </div>
        {subtitle ? <p className="mt-1 text-[14px] sm:text-[15px] font-medium text-[#6B5E56]">{subtitle}</p> : null}
      </div>
      {action ? (
        <button
          className="flex items-center gap-1 text-[12px] sm:text-[13px] font-black tracking-wider text-[#7C543A] hover:text-[#EA6D17] transition uppercase cursor-pointer shrink-0"
          onClick={onAction}
          type="button"
        >
          {action}
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}

export default Home;
