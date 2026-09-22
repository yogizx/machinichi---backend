import { ArrowLeft, ArrowRight, Check, Leaf, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const parseCurrency = (value) => Number(String(value).replace(/[^\d]/g, "")) || 0;
const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}.00`;

function Cart({ cartItems = [], onClearCart, onRemoveItem, onUpdateQuantity }) {
  const navigate = useNavigate();
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [itemPendingRemoval, setItemPendingRemoval] = useState(null);
  const selectedItems = useMemo(
    () => cartItems.filter((item) => selectedKeys.has(item.key)),
    [cartItems, selectedKeys],
  );
  const checkoutItems = selectedItems.length ? selectedItems : cartItems;
  const subtotal = checkoutItems.reduce((total, item) => total + parseCurrency(item.price) * item.quantity, 0);
  const delivery = checkoutItems.length ? 50 : 0;
  const total = subtotal + delivery;

  const checkout = () => {
    if (!cartItems.length) return;

    navigate("/checkout", {
      state: {
        cartItems: checkoutItems,
        product: checkoutItems[0],
      },
    });
  };
  const clearCart = () => {
    setSelectedKeys(new Set());
    onClearCart();
  };
  const requestRemoveItem = (item) => {
    setItemPendingRemoval(item);
  };
  const cancelRemoveItem = () => {
    setItemPendingRemoval(null);
  };
  const confirmRemoveItem = () => {
    if (!itemPendingRemoval) return;

    setSelectedKeys((current) => {
      const next = new Set(current);
      next.delete(itemPendingRemoval.key);
      return next;
    });
    onRemoveItem(itemPendingRemoval.key);
    setItemPendingRemoval(null);
  };
  const toggleSelection = (key) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#342821]">
      <div className="mx-auto w-full max-w-[1420px] px-8 pb-14 pt-12 max-xl:max-w-[1180px] max-lg:max-w-[820px] max-lg:px-5 max-sm:px-4 max-sm:pt-7">
        <button
          className="mb-8 flex items-center gap-3 text-[24px] font-serif font-black tracking-[-0.03em]"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ArrowLeft size={21} className="text-[#b43f08]" />
          Cart
        </button>

        <div className="mb-8 flex items-start justify-between gap-6 max-sm:flex-col">
          <div>
            <h1 className="font-serif text-[43px] font-black leading-none tracking-[-0.035em] text-[#2b1a13] max-xl:text-[38px] max-sm:text-[34px]">
              Your Shopping Cart
            </h1>
            <p className="mt-2 text-[14px] font-semibold leading-none text-[#796d66] max-sm:text-[12px]">
              Review your wholesome picks before checkout
            </p>
          </div>
          {cartItems.length ? (
            <button
              className="flex h-[48px] w-[180px] items-center justify-center rounded-[10px] border border-[#eadfd7] bg-[#fffaf6] px-6 text-[13px] font-bold text-[#6c5f58] shadow-[0_1px_4px_rgba(64,35,20,0.04)] max-sm:w-full"
              onClick={clearCart}
              type="button"
            >
              CLEAR CART
            </button>
          ) : null}
        </div>

        {cartItems.length ? (
          <div className="grid gap-[48px] lg:grid-cols-[1fr_390px]">
            <section className="space-y-5">
              {cartItems.map((item) => (
                <CartItem
                  item={item}
                  key={item.key}
                  isSelected={selectedKeys.has(item.key)}
                  onDecrease={() => onUpdateQuantity(item.key, item.quantity - 1)}
                  onIncrease={() => onUpdateQuantity(item.key, item.quantity + 1)}
                  onRemove={() => requestRemoveItem(item)}
                  onSelect={() => toggleSelection(item.key)}
                />
              ))}
            </section>

            <aside className="rounded-[13px] border border-[#e4d8cf] bg-[#f7f0ea] px-[26px] py-[27px] shadow-[0_8px_22px_rgba(65,38,20,0.045)]">
              <h2 className="text-[19px] font-black">Order Summary</h2>
              <div className="mt-[26px] border-t border-[#e0d4ca] pt-[19px]">
                <SummaryLine label="Items" value={`${cartItems.length}`} />
                {selectedItems.length ? <SummaryLine label="Selected for checkout" value={`${selectedItems.length}`} green /> : null}
                <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
                <SummaryLine label="Delivery" value={formatCurrency(delivery)} green />
                <SummaryLine label="Taxes (GST)" value="₹0.00" />
              </div>
              <div className="mt-[18px] border-t border-[#e0d4ca] pt-[24px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-[18px] font-black">Total Amount</h3>
                  <strong className="text-[22px] font-black text-[#b64008]">{formatCurrency(total)}</strong>
                </div>
              </div>
              <button
                className="mt-[45px] flex h-[56px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#ff7624] text-[17px] font-black text-white shadow-[0_8px_16px_rgba(255,118,36,0.22)]"
                onClick={checkout}
                type="button"
              >
                CHECKOUT
                <ArrowRight size={17} />
              </button>
              <p className="mt-[14px] flex items-center justify-center gap-1 text-[11px] font-medium text-[#5f5650]">
                <ShieldCheck size={12} />
                Buyer Protection Enabled
              </p>
            </aside>
          </div>
        ) : (
          <section className="grid min-h-[420px] place-items-center rounded-[13px] border border-[#e4d8cf] bg-white/74 px-6 py-12 text-center shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
            <div>
              <span className="mx-auto grid h-[74px] w-[74px] place-items-center rounded-full bg-[#f1e9e1] text-[#c84c12]">
                <ShoppingCart size={31} />
              </span>
              <h2 className="mt-6 text-[26px] font-black tracking-[-0.035em]">Your cart is empty</h2>
              <p className="mx-auto mt-3 max-w-[360px] text-[14px] font-medium leading-6 text-[#6b625c]">
                Add fresh staples, grains, and fruits to build your Machinichi basket.
              </p>
              <button
                className="mt-8 h-[52px] min-w-[220px] rounded-full bg-gradient-to-r from-[#8d3500] to-[#c95e06] px-9 text-[13px] font-black tracking-[0.08em] text-white shadow-[0_9px_16px_rgba(120,54,8,0.22)] transition duration-300 hover:-translate-y-0.5"
                onClick={() => navigate("/product")}
                type="button"
              >
                SHOP PRODUCTS
              </button>
            </div>
          </section>
        )}
      </div>

      {itemPendingRemoval ? (
        <RemoveCartItemModal item={itemPendingRemoval} onCancel={cancelRemoveItem} onConfirm={confirmRemoveItem} />
      ) : null}
    </main>
  );
}

function CartItem({ item, isSelected, onDecrease, onIncrease, onRemove, onSelect }) {
  return (
    <article
      className={`relative flex items-center gap-[25px] overflow-hidden rounded-[14px] border p-[23px] transition duration-300 ease-out max-sm:flex-col max-sm:items-start ${
        isSelected
          ? "scale-[1.01] border-[#ff7a21] bg-[#fff1e4] shadow-[0_16px_36px_rgba(191,76,12,0.2),0_0_0_4px_rgba(255,122,33,0.12)]"
          : "border-white bg-white/76 shadow-[0_8px_18px_rgba(65,38,20,0.09)] hover:border-[#f2dac8] hover:shadow-[0_12px_26px_rgba(65,38,20,0.12)]"
      }`}
    >
      {isSelected ? <span className="absolute inset-y-0 left-0 w-[5px] bg-[#ff7624]" /> : null}
      <label
        className={`relative z-10 flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black transition duration-300 max-sm:self-end ${
          isSelected
            ? "border-[#ff7624] bg-white text-[#b64008] shadow-[0_8px_16px_rgba(191,76,12,0.14)]"
            : "border-[#eadfd7] bg-white/75 text-[#7a6c64] hover:border-[#f4b487]"
        }`}
      >
        <input
          checked={isSelected}
          className="sr-only"
          onChange={onSelect}
          type="checkbox"
        />
        <span
          className={`grid h-[24px] w-[24px] place-items-center rounded-full border transition duration-300 ${
            isSelected
              ? "border-[#fd761a] bg-[#fd761a] text-white shadow-[0_0_0_4px_rgba(253,118,26,0.16)]"
              : "border-[#d8c9be] bg-white text-transparent"
          }`}
        >
          <Check size={15} strokeWidth={3.5} />
        </span>
        <span>{isSelected ? "Selected" : "Select"}</span>
      </label>
      <img className="h-[154px] w-[154px] rounded-[9px] object-cover max-sm:h-36 max-sm:w-full" src={item.image || ""} alt={item.name} onError={(e) => { e.target.src = ""; e.target.alt = item.name || "Product"; }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[18px] font-black tracking-[-0.03em]">{item.name}</h3>
            <p className="mt-2 text-[12px] font-black leading-none text-[#988b84]">{item.origin || "MACHINICHI SELECTION"}</p>
          </div>
          <button className="text-[#9c8f87] transition hover:text-[#c8430b]" onClick={onRemove} type="button" aria-label={`Remove ${item.name}`}>
            <Trash2 size={18} />
          </button>
        </div>

        <div className="mt-[24px] flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-[15px] font-medium">Pack: {item.selectedSize || item.sizes?.[0] || "1KG"}</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#dceecb] px-[14px] py-[8px] text-[12px] font-black text-[#5d8f35]">
              <Leaf size={14} />
              NATURAL
            </span>
          </div>
          <div className="flex h-[52px] w-[128px] items-center justify-between rounded-[9px] border border-[#a99b91] px-5 text-[18px] font-bold">
            <button aria-label="Decrease quantity" onClick={onDecrease} type="button">
              <Minus size={15} />
            </button>
            <span>{item.quantity}</span>
            <button aria-label="Increase quantity" onClick={onIncrease} type="button">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-[24px] font-black tracking-[-0.04em] text-[#3c302b]">{item.price}</span>
          <span className="text-[13px] font-medium text-[#6b625c]">x {item.quantity}</span>
        </div>
      </div>
    </article>
  );
}

function SummaryLine({ label, value, green = false }) {
  return (
    <div className="mb-[10px] flex items-center justify-between text-[14px] font-medium text-[#5a4d45]">
      <span>{label}</span>
      <span className={green ? "font-black text-[#4c9b35]" : ""}>{value}</span>
    </div>
  );
}

function RemoveCartItemModal({ item, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1d1009]/55 px-4 py-5 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-[460px] rounded-[22px] border border-[#eadfd7] bg-[#fffaf6] px-6 py-6 shadow-[0_24px_60px_rgba(25,12,6,0.28)] animate-[cartRemoveModal_240ms_ease-out_both] sm:px-7">
        <div className="flex items-start justify-between gap-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#fff1e4] text-[#c8430b]">
            <Trash2 size={22} strokeWidth={2.2} />
          </span>
          <button
            aria-label="Close remove item confirmation"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#eadfd7] bg-white text-[#6c5f58] transition hover:border-[#c8430b] hover:text-[#c8430b]"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="mt-5 font-serif text-[28px] font-black leading-none tracking-[-0.04em] text-[#2b1a13]">
          Remove Product?
        </h2>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-[#5f5650]">
          Are you sure you want to remove this product from your cart?
        </p>
        <div className="mt-5 rounded-[13px] border border-[#eadfd7] bg-white/78 px-4 py-4">
          <p className="truncate text-[15px] font-black text-[#342821]">{item.name}</p>
          <p className="mt-2 text-[13px] font-semibold text-[#7a6c64]">
            Pack: {item.selectedSize || item.sizes?.[0] || "1KG"} · Qty {item.quantity}
          </p>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="h-[48px] rounded-full border-2 border-[#e0d6ce] bg-white px-7 text-[14px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] hover:bg-[#f2ebe5]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-[48px] rounded-full bg-[#c8430b] px-8 text-[14px] font-black text-white shadow-[0_12px_22px_rgba(200,67,11,0.2)] transition hover:-translate-y-0.5 hover:bg-[#9d3107]"
            onClick={onConfirm}
            type="button"
          >
            Confirm
          </button>
        </div>

        <style>{`
          @keyframes cartRemoveModal {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </section>
    </div>
  );
}

export default Cart;
