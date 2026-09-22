import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Check, Heart, ShoppingCart, Bookmark, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ToasterContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToasterContext);
}

const icons = {
  cart: ShoppingCart,
  favorite: Heart,
  saved: Bookmark,
  success: Check,
};

export function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3000, product = null) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, product, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const first = toasts[0];
    const timer = setTimeout(() => setToasts((prev) => prev.slice(1)), first.duration || 3000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToasterContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-sm:inset-x-4 max-sm:bottom-4 max-sm:w-auto" style={{ pointerEvents: "none" }}>
        {toasts.map((toast) => {
          const Icon = icons[toast.type] || icons.success;
          return (
            <ToastCard key={toast.id} toast={toast} Icon={Icon} onRemove={removeToast} />
          );
        })}
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(16px) scale(0.95); }
        }
      `}</style>
    </ToasterContext.Provider>
  );
}

function ToastCard({ toast, Icon, onRemove }) {
  const navigate = useNavigate();

  if (toast.type === "cart" && toast.product) {
    return (
      <div
        className="flex items-center gap-3 rounded-[14px] bg-[#2b1a13] p-3 pr-5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.25)] animate-[slideUp_300ms_ease-out_both] min-w-[300px] max-sm:min-w-0"
        style={{ pointerEvents: "auto" }}
      >
        <img
          src={toast.product.image || toast.product.images?.[0]?.url}
          alt={toast.product.name}
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#4caf50]">
            <Check size={13} strokeWidth={3} />
            Added to Cart
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white/90">{toast.product.name}</p>
          <button
            type="button"
            onClick={() => { onRemove(toast.id); navigate("/cart"); }}
            className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-[#fd761a] transition hover:text-[#ff8c3e]"
          >
            View Cart <ArrowRight size={11} />
          </button>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="shrink-0 text-white/40 hover:text-white transition"
          type="button"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-[12px] bg-[#2b1a13] px-5 py-4 text-white shadow-[0_12px_28px_rgba(0,0,0,0.25)] animate-[slideUp_300ms_ease-out_both]"
      style={{ pointerEvents: "auto" }}
    >
      <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-white/15">
        <Icon size={15} strokeWidth={2.5} />
      </span>
      <span className="text-[13px] font-bold">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="ml-2 text-white/50 hover:text-white" type="button" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
