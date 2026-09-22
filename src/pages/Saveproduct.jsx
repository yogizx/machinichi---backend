import { ArrowLeft, Bookmark, LogIn, ShoppingCart, Star, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { slugifyProduct } from "../data/products";

function Saveproduct({ savedProducts = [], onMoveToCart = () => {}, onRemoveSaved = () => {} }) {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#342821]">
      <div className="mx-auto w-full max-w-[1420px] px-8 pb-14 pt-12 max-xl:max-w-[1180px] max-lg:max-w-[820px] max-lg:px-5 max-sm:px-4 max-sm:pt-7">
        <button
          className="mb-8 flex items-center gap-3 text-[24px] font-serif font-black tracking-[-0.03em] transition hover:text-[#b43f08]"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft size={21} className="text-[#b43f08]" />
          Saved Products
        </button>

        <div className="mb-9 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
          <div>
            <p className="text-[12px] font-black tracking-[0.14em] text-[#b64008]">SAVE FOR LATER</p>
            <h1 className="mt-2 font-serif text-[43px] font-black leading-none tracking-[-0.035em] text-[#2b1a13] max-xl:text-[38px] max-sm:text-[34px]">
              Your Saved Pantry Picks
            </h1>
            <p className="mt-3 max-w-[590px] text-[14px] font-semibold leading-6 text-[#796d66] max-sm:text-[12px]">
              Keep products aside while you browse, then move them to your cart whenever you are ready.
            </p>
          </div>

          <div className="rounded-full border border-[#eadfd7] bg-[#fffaf6] px-5 py-3 text-[13px] font-black text-[#6c5f58] shadow-[0_1px_4px_rgba(64,35,20,0.04)]">
            {savedProducts.length} {savedProducts.length === 1 ? "ITEM" : "ITEMS"} SAVED
          </div>
        </div>

        {savedProducts.length ? (
          <section className="grid grid-cols-4 gap-x-[28px] gap-y-[34px] max-xl:grid-cols-3 max-xl:gap-x-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {savedProducts.map((product, index) => (
              <SavedCard
                index={index}
                key={product.key}
                product={product}
                onMoveToCart={() => {
                  onMoveToCart(product.key);
                  navigate("/cart");
                }}
                onOpen={() => navigate(`/product/${slugifyProduct(product.name)}`, { state: { product } })}
                onRemove={() => onRemoveSaved(product.key)}
              />
            ))}
          </section>
        ) : (
          <section className="grid min-h-[430px] place-items-center rounded-[16px] border border-[#e4d8cf] bg-white/80 px-6 py-12 text-center shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
            <div className="flex flex-col items-center">
              <span className="grid h-[84px] w-[84px] place-items-center rounded-full bg-[#fceee6] text-[#fd761a] shadow-inner">
                <Bookmark size={38} strokeWidth={2.2} />
              </span>
              <h2 className="mt-6 text-[28px] font-black tracking-[-0.035em] text-[#2b1a13]">No Saved Products</h2>
              <p className="mx-auto mt-3 max-w-[420px] text-[14px] font-medium leading-6 text-[#6b625c]">
                You haven't saved any products for later yet. Use "Save for Later" on product cards to collect items for another cart run.
              </p>
              
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  className="flex h-[50px] min-w-[200px] items-center justify-center rounded-full bg-gradient-to-r from-[#8d3500] to-[#c95e06] px-8 text-[13px] font-black tracking-[0.08em] text-white shadow-[0_9px_16px_rgba(120,54,8,0.22)] transition duration-300 hover:-translate-y-0.5"
                  onClick={() => navigate("/product")}
                  type="button"
                >
                  EXPLORE PRODUCTS
                </button>
                <button
                  className="flex h-[50px] min-w-[180px] items-center justify-center gap-2 rounded-full border-2 border-[#5a3322] bg-white px-8 text-[13px] font-black tracking-[0.08em] text-[#5a3322] transition duration-300 hover:bg-[#5a3322] hover:text-white"
                  onClick={() => navigate("/signin")}
                  type="button"
                >
                  <LogIn size={16} strokeWidth={2.4} />
                  SIGN IN
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SavedCard({ product, index, onMoveToCart, onOpen, onRemove }) {
  return (
    <article
      className="cursor-pointer overflow-hidden rounded-[10px] bg-white shadow-[0_8px_18px_rgba(65,38,20,0.09)] transition duration-300 hover:-translate-y-1"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="link"
      tabIndex={0}
      style={{ animation: `savedProductIn 480ms ease-out ${index * 45}ms both` }}
    >
      <div className="relative h-[235px] overflow-hidden bg-[#eadfd7] max-sm:h-[260px]">
        <img className="h-full w-full object-cover transition duration-500 hover:scale-105" src={product.image} alt={product.name} />
        {product.badge ? (
          <span className="absolute left-0 top-0 rounded-br-[7px] bg-[#b14a05] px-4 py-3 text-[13px] font-black text-white">
            {product.badge}
          </span>
        ) : null}
        <button
          aria-label={`Remove ${product.name} from saved products`}
          className="absolute right-3 top-3 z-10 grid h-[42px] w-[42px] place-items-center rounded-full border border-white/80 bg-white/90 text-[#7c6a60] shadow-[0_6px_14px_rgba(65,38,20,0.12)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:scale-105 hover:text-[#c8430b] active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fd761a]/50"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          type="button"
        >
          <Trash2 aria-hidden="true" size={18} strokeWidth={2.3} />
        </button>
      </div>

      <div className="px-4 pb-4 pt-4">
        <p className="truncate text-[10px] font-black leading-none text-[#988b84]">{product.origin}</p>
        <h3 className="mt-3 truncate text-[16px] font-black leading-none tracking-[-0.02em] text-[#403530]">
          {product.name}
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <StarRating rating={product.rating} />
          <span className="text-[11px] font-black text-[#8a7d75]">{product.rating}.0</span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-[22px] font-black text-[#3c302b]">{product.price}</span>
          {product.oldPrice ? <span className="text-[13px] font-bold text-[#9c8f87] line-through">{product.oldPrice}</span> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-[7px] border border-[#e0d2c6] bg-[#fffaf6] px-3 py-2 text-[11px] font-bold text-[#a19188]">
            {product.selectedSize || product.sizes?.[0] || "1KG"}
          </span>
          {product.tags?.map((tag) => (
            <span className="rounded-[7px] bg-[#173215] px-3 py-2 text-[10px] font-black text-white" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <button
          className="mt-4 flex h-[50px] w-full items-center justify-center gap-3 rounded-[9px] bg-[#fd761a] text-[13px] font-black text-white shadow-[0_5px_10px_rgba(253,118,26,0.22)] transition hover:bg-[#e86710]"
          onClick={(event) => {
            event.stopPropagation();
            onMoveToCart();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          type="button"
        >
          <ShoppingCart size={16} strokeWidth={2.3} />
          MOVE TO CART
        </button>
      </div>

      <style>{`
        @keyframes savedProductIn {
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

function StarRating({ rating }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          aria-hidden="true"
          className={index < rating ? "fill-[#f6a623] text-[#f6a623]" : "fill-[#eadfd7] text-[#eadfd7]"}
          key={index}
          size={15}
          strokeWidth={1.8}
        />
      ))}
    </span>
  );
}

export default Saveproduct;
