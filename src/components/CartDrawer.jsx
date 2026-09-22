import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, X, ArrowRight, ShieldCheck } from "lucide-react";

function formatCurrency(price) {
  const n = Number(String(price).replace(/[^\d]/g, "")) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function CartDrawer({ open, items = [], onClose, onUpdateQuantity, onRemoveItem, onCheckout }) {
  const navigate = useNavigate();
  const [removingKeys, setRemovingKeys] = useState(new Set());

  const subtotal = items.reduce((sum, item) => {
    const price = Number(String(item.price || item.sellingPrice || 0).replace(/[^\d]/g, "")) || 0;
    return sum + price * item.quantity;
  }, 0);
  const delivery = items.length ? 50 : 0;
  const total = subtotal + delivery;
  const savings = items.reduce((sum, item) => {
    const sp = Number(String(item.price || item.sellingPrice || 0).replace(/[^\d]/g, "")) || 0;
    const mp = Number(String(item.mrp || item.mrpPrice || 0).replace(/[^\d]/g, "")) || 0;
    return sum + Math.max(0, mp - sp) * item.quantity;
  }, 0);

  const handleRemove = (key) => {
    setRemovingKeys((prev) => new Set(prev).add(key));
    setTimeout(() => {
      onRemoveItem(key);
      setRemovingKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }, 300);
  };

  const handleViewCart = () => {
    onClose();
    navigate("/cart");
  };

  const handleCheckout = () => {
    onClose();
    onCheckout?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="absolute right-0 top-0 flex h-full w-full flex-col bg-[#fffaf5] shadow-2xl sm:w-[420px] lg:w-[480px] animate-[slideInRight_300ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#eadfd7] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingCart size={20} className="text-[#fd761a]" strokeWidth={2.2} />
            <span className="text-[18px] font-black text-[#2b1a13]">Cart</span>
            {items.length > 0 && (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[#fd761a] px-1.5 text-[10px] font-black text-white">
                {items.reduce((t, i) => t + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eadfd7] bg-white text-[#6c5f58] transition hover:border-[#c8430b] hover:text-[#c8430b]"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#f1e9e1] text-[#c84c12]">
              <ShoppingCart size={36} />
            </span>
            <h3 className="mt-5 text-[22px] font-black tracking-[-0.03em] text-[#2b1a13]">Your cart is empty</h3>
            <p className="mt-2 max-w-[260px] text-[13px] font-medium leading-6 text-[#6b625c]">
              Add fresh staples, grains, and fruits to build your basket.
            </p>
            <button
              type="button"
              onClick={() => { onClose(); navigate("/product"); }}
              className="mt-6 h-[48px] rounded-full bg-gradient-to-r from-[#8d3500] to-[#c95e06] px-8 text-[13px] font-black tracking-[0.08em] text-white shadow-[0_9px_16px_rgba(120,54,8,0.22)] transition hover:-translate-y-0.5"
            >
              CONTINUE SHOPPING
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {items.map((item) => {
                const isRemoving = removingKeys.has(item.key);
                const price = Number(String(item.price || item.sellingPrice || 0).replace(/[^\d]/g, "")) || 0;
                const mrp = Number(String(item.mrp || item.mrpPrice || 0).replace(/[^\d]/g, "")) || 0;
                return (
                  <div
                    key={item.key}
                    className={`flex gap-3 rounded-xl border bg-white p-3 transition-all duration-300 ${
                      isRemoving ? "scale-95 opacity-0 -translate-y-2" : "scale-100 opacity-100 translate-y-0"
                    } border-[#f0e8e0] shadow-[0_2px_8px_rgba(65,38,20,0.06)]`}
                  >
                    <img
                      src={item.image || ""}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                      onError={(e) => { e.target.src = ""; e.target.alt = item.name || "Product"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13px] font-bold text-[#3c302b]">{item.name}</p>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.key)}
                          className="shrink-0 text-[#9c8f87] transition hover:text-[#c8430b]"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[10px] font-semibold text-[#988b84]">
                        {item.selectedSize || item.sizes?.[0] || "1KG"}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex h-8 items-center rounded-lg border border-[#d8c9be]">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.key, item.quantity - 1)}
                            className="flex h-full w-8 items-center justify-center text-[#6c5f58] transition hover:text-[#c8430b]"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="flex h-full w-8 items-center justify-center text-[13px] font-bold text-[#3c302b] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.key, item.quantity + 1)}
                            className="flex h-full w-8 items-center justify-center text-[#6c5f58] transition hover:text-[#23723a]"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-[15px] font-black text-[#3c302b]">{formatCurrency(price * item.quantity)}</span>
                          {mrp > price && (
                            <p className="text-[10px] font-medium text-[#988b84] line-through">{formatCurrency(mrp * item.quantity)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-[#eadfd7] bg-[#f7f0ea] px-5 py-4 space-y-3">
              <div className="space-y-1.5 text-[13px] font-medium text-[#5a4d45]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#3c302b]">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span className="font-bold text-[#4c9b35]">{formatCurrency(delivery)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex items-center justify-between text-[#23723a]">
                    <span>You Save</span>
                    <span className="font-bold">{formatCurrency(savings)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[#e0d4ca] pt-3">
                <span className="text-[16px] font-black text-[#2b1a13]">Total</span>
                <span className="text-[20px] font-black text-[#b64008]">{formatCurrency(total)}</span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#ff7624] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(255,118,36,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(255,118,36,0.3)]"
              >
                CHECKOUT
                <ArrowRight size={16} />
              </button>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleViewCart}
                  className="text-[12px] font-bold text-[#6c5f58] underline underline-offset-2 transition hover:text-[#c8430b]"
                >
                  View Cart
                </button>
                <span className="text-[#d8c9be]">|</span>
                <button
                  type="button"
                  onClick={() => { onClose(); navigate("/product"); }}
                  className="text-[12px] font-bold text-[#6c5f58] underline underline-offset-2 transition hover:text-[#c8430b]"
                >
                  Continue Shopping
                </button>
              </div>
              <p className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#5f5650]">
                <ShieldCheck size={12} />
                Buyer Protection Enabled
              </p>
            </div>
          </>
        )}
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default CartDrawer;
