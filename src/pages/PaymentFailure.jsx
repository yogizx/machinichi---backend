import { AlertTriangle, RefreshCw, CreditCard, Headphones, ShoppingBag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

function PaymentFailure() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const errorMessage = state?.error || "Your payment could not be processed.";
  const orderId = state?.orderId || state?.razorpay_order_id;

  const retryPayment = () => {
    navigate("/checkout", { state: { ...state, retry: true } });
  };

  const changePayment = () => {
    navigate("/checkout", { state: { ...state, changePayment: true } });
  };

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#170c07]">
      <section className="mx-auto flex max-w-[520px] flex-col items-center px-6 pb-12 pt-[88px] text-center max-sm:pt-12">
        <div className="grid h-[120px] w-[120px] place-items-center rounded-full bg-[#fff0ed] shadow-[0_0_0_6px_rgba(220,38,38,0.08)]">
          <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[#fde8e8]">
            <AlertTriangle size={40} className="text-[#dc2626]" strokeWidth={2} />
          </div>
        </div>

        <h2 className="mt-[28px] font-serif text-[44px] font-black leading-[1.05] tracking-[-0.045em] max-sm:text-[34px]">
          Payment Failed
        </h2>
        <p className="mt-[12px] max-w-[420px] text-[16px] font-medium leading-7 text-[#5f554f]">
          {errorMessage}
        </p>

        {orderId && (
          <div className="mt-[18px] rounded-[10px] border border-[#fed7d7] bg-[#fff5f5] px-5 py-3">
            <p className="text-[11px] font-black tracking-[0.08em] text-[#991b1b]">ORDER REFERENCE</p>
            <p className="mt-1 text-[15px] font-black text-[#2d170d]">{orderId}</p>
          </div>
        )}

        <div className="mt-[35px] grid w-full max-w-[400px] gap-4">
          <button
            className="flex h-[60px] items-center justify-center gap-3 rounded-full bg-[#fd761a] text-[14px] font-black tracking-[0.12em] text-white shadow-[0_14px_28px_rgba(253,118,26,0.25)] transition hover:-translate-y-0.5"
            onClick={retryPayment}
            type="button"
          >
            <RefreshCw size={16} />
            TRY AGAIN
          </button>
          <button
            className="flex h-[60px] items-center justify-center gap-3 rounded-full border-2 border-[#b9a99e] bg-white/50 text-[14px] font-black tracking-[0.12em] transition hover:-translate-y-0.5"
            onClick={changePayment}
            type="button"
          >
            <CreditCard size={16} />
            TRY DIFFERENT PAYMENT
          </button>
          <button
            className="flex h-[60px] items-center justify-center gap-3 rounded-full border-2 border-[#b9a99e] bg-white/50 text-[14px] font-black tracking-[0.12em] transition hover:-translate-y-0.5"
            onClick={() => navigate("/contact")}
            type="button"
          >
            <Headphones size={16} />
            CONTACT SUPPORT
          </button>
          <button
            className="mt-2 flex h-[50px] items-center justify-center gap-3 text-[13px] font-black tracking-[0.12em] text-[#786e68] transition hover:text-[#2d170d]"
            onClick={() => navigate("/product")}
            type="button"
          >
            <ShoppingBag size={15} />
            CONTINUE SHOPPING
          </button>
        </div>

        <div className="mt-[50px] text-center text-[#c4bbb4]">
          <p className="text-[13px] font-black tracking-[0.38em]">
            No amount has been charged.
          </p>
        </div>
      </section>
    </main>
  );
}

export default PaymentFailure;
