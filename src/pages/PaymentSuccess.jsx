import {
  CalendarDays,
  FileText,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import machinichiLogo from "./images/machinichi.png";

import api from "../services/api";

const fallbackImage =
  "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=260&q=90";
const parseCurrency = (value) => Number(String(value).replace(/[^\d]/g, "")) || 0;
const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}`;

const shippingPrices = {
  express: 120,
  standard: 50,
};

function playSuccessSound() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const now = ac.currentTime;
    // Richer chord: C5 (523), E5 (659), G5 (784), Bb5 (932) — a C7 arpeggio
    const notes = [
      { freq: 523.25, time: 0, dur: 0.6, vol: 0.10 },
      { freq: 659.25, time: 0.12, dur: 0.5, vol: 0.09 },
      { freq: 783.99, time: 0.24, dur: 0.45, vol: 0.08 },
      { freq: 1046.50, time: 0.36, dur: 0.4, vol: 0.06 },  // C6 octave
      { freq: 783.99, time: 0.50, dur: 0.6, vol: 0.07 },
    ];
    notes.forEach(({ freq, time, dur, vol }) => {
      [ac.createOscillator(), ac.createOscillator()].forEach((osc, i) => {
        const gain = ac.createGain();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = freq * (i === 0 ? 1 : 2);
        gain.gain.setValueAtTime(vol * (i === 0 ? 1 : 0.15), now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    });
  } catch {}
}

function PaymentSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState("");
  const soundPlayed = useRef(false);

  const verifyPayment = useCallback(async () => {
    if (!state?.razorpay_payment_id || !state?.razorpay_order_id || !state?.razorpay_signature) {
      if (!state?.orderDbId) {
        navigate("/orders", { replace: true });
        return;
      }
      setVerifying(false);
      return;
    }
    try {
      const { data } = await api.post("/payments/verify", {
        razorpay_payment_id: state.razorpay_payment_id,
        razorpay_order_id: state.razorpay_order_id,
        razorpay_signature: state.razorpay_signature,
      });
      if (!data.success) {
        setVerifyError(data.message || "Payment verification failed");
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || "Could not verify payment");
    }
    setVerifying(false);
  }, [state, navigate]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  useEffect(() => {
    if (!verifying && !verifyError && !soundPlayed.current) {
      soundPlayed.current = true;
      playSuccessSound();
    }
  }, [verifying, verifyError]);

  const purchasedItems = state?.cartItems?.length ? state.cartItems : state?.product ? [state.product] : [];
  const orderItems = purchasedItems.length
    ? purchasedItems
    : [
        {
          image: fallbackImage,
          name: "Premium Sharbati Atta",
          price: "₹1,550",
          quantity: 1,
          selectedSize: "10kg Pack",
        },
      ];
  const shippingAddress = state?.shippingAddress || {
    fullName: "Machinichi Customer",
    streetAddress: "Shipping address not provided",
    city: "",
    zipCode: "",
    phoneNumber: "",
  };
  const subtotal = orderItems.reduce((total, item) => total + parseCurrency(item.price) * (item.quantity || 1), 0);
  const shippingAmount = shippingPrices[state?.shippingMethod] ?? shippingPrices.standard;
  const discountAmount = state?.scratchDiscountAmount || 0;
  const promoDiscountAmount = state?.promoDiscountAmount || 0;
  const totalAmount = state?.orderTotal ?? Math.max(subtotal + shippingAmount - discountAmount - promoDiscountAmount, 0);
  const customerName = shippingAddress.fullName?.trim() || "there";
  const referenceId = state?.orderId || state?.razorpay_payment_id || "MAC-82931";

  const trackingState = {
    ...state,
    cartItems: orderItems,
    product: orderItems[0],
    shippingAddress,
    shippingMethod: state?.shippingMethod || "standard",
    scratchDiscountAmount: discountAmount,
    promoDiscountAmount,
    orderTotal: totalAmount,
  };

  const openTracking = () => {
    sessionStorage.setItem("machinichiLastOrder", JSON.stringify(trackingState));
    navigate("/trackorder", { state: trackingState });
  };

  if (verifying) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8f1]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eadfd7] border-t-[#fd761a]" />
          <p className="text-sm font-medium text-[#796d66]">Verifying payment...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#170c07]">

      <section className="mx-auto flex max-w-[1040px] flex-col items-center px-6 pb-12 pt-[88px] text-center max-sm:pt-12">
        <SuccessAnimation />

        <h2 className="mt-[28px] font-serif text-[59px] font-black leading-[1.05] tracking-[-0.045em] max-md:text-[44px] max-sm:text-[34px]">
          A wonderful choice, <span className="italic text-[#b44a0f]">{customerName}!</span>
        </h2>
        <p className="mt-[16px] max-w-[620px] text-[18px] font-medium leading-8 text-[#5f554f] max-sm:text-[15px] max-sm:leading-7">
          Your order has been confirmed. We&apos;re hand-selecting your goods
          <br className="hidden sm:block" />
          with care for a delivery that feels just like a gift.
        </p>

        {verifyError && (
          <div className="mt-5 w-full max-w-[520px] rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-[14px] font-semibold text-red-700">
            {verifyError}
          </div>
        )}

        <div className="mt-[35px] w-full max-w-[520px] overflow-hidden rounded-[22px] border border-[#ffb987] bg-[linear-gradient(135deg,#fffaf4_0%,#fff0df_48%,#ffe3c7_100%)] p-[5px] shadow-[0_18px_42px_rgba(190,78,16,0.16),0_0_0_1px_rgba(255,255,255,0.78)]">
          <div className="relative rounded-[18px] border border-white/80 bg-white/62 px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] max-sm:px-4">
            <span className="absolute -right-8 -top-10 h-[96px] w-[96px] rounded-full bg-[#ff7624]/16 blur-2xl" />
            <div className="relative flex items-center justify-center gap-3 max-sm:flex-col max-sm:gap-2">
              <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#fd761a] text-white shadow-[0_10px_22px_rgba(253,118,26,0.28)]">
                <Sparkles size={18} fill="currentColor" />
              </span>
              <div>
                <p className="text-[11px] font-black tracking-[0.24em] text-[#a13f0d]">CONFIRMATION REFERENCE</p>
                <strong className="mt-[9px] block rounded-[12px] border border-[#ffd1ad] bg-[#fff8f1] px-6 py-3 font-serif text-[31px] font-black tracking-[0.06em] text-[#2d170d] shadow-[0_10px_24px_rgba(96,45,18,0.08),0_0_22px_rgba(253,118,26,0.1)] max-sm:px-4 max-sm:text-[25px]">
                  #{referenceId}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[30px] grid w-full max-w-[860px] gap-[20px] text-left lg:grid-cols-[280px_1fr]">
          <DeliveryCard address={shippingAddress} shippingMethod={state?.shippingMethod} />
          <BreakdownCard
            discountAmount={discountAmount}
            items={orderItems}
            promoCode={state?.promoCode}
            promoDiscountAmount={promoDiscountAmount}
            promoOfferDescription={state?.promoOfferDescription}
            shippingAmount={shippingAmount}
            subtotal={subtotal}
            totalAmount={totalAmount}
          />
        </div>

        <div className="mt-[30px] grid w-full max-w-[580px] gap-4 sm:grid-cols-2">
          <button
            className="flex h-[69px] items-center justify-center gap-4 rounded-full bg-[#fd761a] text-[15px] font-black tracking-[0.2em] text-white shadow-[0_14px_28px_rgba(253,118,26,0.25)]"
            onClick={openTracking}
            type="button"
          >
            <Package size={16} />
            TRACK ORDER
          </button>
          <button
            className="flex h-[69px] items-center justify-center gap-4 rounded-full border-2 border-[#b9a99e] bg-white/50 text-[15px] font-black tracking-[0.2em]"
            onClick={() => navigate("/product")}
          >
            <ShoppingBag size={16} />
            KEEP SHOPPING
          </button>
          <button
            className="flex h-[69px] items-center justify-center gap-4 rounded-full border-2 border-[#b9a99e] bg-white/50 text-[15px] font-black tracking-[0.2em] sm:col-span-2"
            onClick={async () => {
              const id = state?.orderDbId;
              if (!id) return;
              try {
                const { data } = await api.get(`/orders/${id}/invoice`, { responseType: "blob" });
                const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
                const a = document.createElement("a");
                a.href = url;
                a.download = `invoice-${referenceId}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {}
            }}
          >
            <FileText size={16} />
            DOWNLOAD INVOICE
          </button>
        </div>

        <div className="mt-[58px] text-center text-[#c4bbb4]">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-[43px] bg-[#d4ccc5]" />
            <span className="font-serif text-[24px] font-black">Machinichi</span>
            <span className="h-px w-[43px] bg-[#d4ccc5]" />
          </div>
          <p className="mt-[12px] text-[13px] font-black tracking-[0.38em]">© 2026 Machinichi Groups of Companies. All Rights Reserved.</p>
        </div>
      </section>
    </main>
  );
}

function SuccessAnimation() {
  return (
    <div className="payment-success-animation relative grid h-[180px] w-[180px] place-items-center max-sm:h-[154px] max-sm:w-[154px]">
      <span className="success-ring success-ring-one" />
      <span className="success-ring success-ring-two" />
      <span className="success-halo" />
      <span className="success-orbit" />
      <div className="success-core relative grid h-[156px] w-[156px] place-items-center rounded-full border-4 border-white bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,#d9f993_28%,#a8d85c_100%)] shadow-[0_0_52px_rgba(113,191,69,0.36)] max-sm:h-[134px] max-sm:w-[134px]">
        <svg
          aria-label="Payment successful"
          className="success-mark h-[82px] w-[82px] max-sm:h-[70px] max-sm:w-[70px]"
          fill="none"
          role="img"
          viewBox="0 0 80 80"
        >
          <circle
            className="success-circle"
            cx="40"
            cy="40"
            r="31"
            stroke="#101006"
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path
            className="success-check"
            d="M25 41.5L35.2 51.5L56 29.5"
            stroke="#101006"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6"
          />
        </svg>
        <span className="success-logo absolute grid h-[150px] w-[150px] place-items-center overflow-hidden rounded-full bg-[#140a05] shadow-[0_14px_34px_rgba(0,0,0,0.32),0_0_0_3px_rgba(255,255,255,0.96),0_0_38px_rgba(253,118,26,0.34)] max-sm:h-[128px] max-sm:w-[128px]">
          <img className="h-[168px] w-[168px] scale-[1.08] object-cover max-sm:h-[144px] max-sm:w-[144px]" src={machinichiLogo} alt="Machinichi" />
        </span>
      </div>
      <span className="success-spark absolute right-[3px] top-[6px] grid h-[41px] w-[41px] place-items-center rounded-full border-4 border-white bg-[#fd761a] text-white">
        <Sparkles size={18} fill="currentColor" />
      </span>

      <style>{`
        .payment-success-animation {
          animation: successSettle 780ms cubic-bezier(0.18, 0.89, 0.32, 1.28) both;
        }

        .success-core {
          overflow: hidden;
          animation: successGlow 2200ms ease-in-out 620ms infinite;
        }

        .success-core::before {
          content: "";
          position: absolute;
          inset: -45%;
          background: conic-gradient(from 110deg, transparent, rgba(255,255,255,0.72), transparent 28%);
          opacity: 0;
          animation: successCoreSweep 1450ms cubic-bezier(0.22, 1, 0.36, 1) 980ms forwards;
        }

        .success-halo {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(253,118,26,0.18), transparent 62%);
          filter: blur(10px);
          opacity: 0;
          animation: successHaloBloom 1100ms ease-out 980ms both;
        }

        .success-mark {
          animation: successMarkExit 500ms ease-in-out 1320ms forwards;
        }

        .success-ring {
          position: absolute;
          inset: 13px;
          border-radius: 9999px;
          border: 2px solid rgba(90, 162, 53, 0.28);
          opacity: 0;
          transform: scale(0.72);
        }

        .success-ring-one {
          animation: successRipple 1250ms ease-out 120ms both;
        }

        .success-ring-two {
          animation: successRipple 1250ms ease-out 310ms both;
        }

        .success-orbit {
          position: absolute;
          inset: 7px;
          border-radius: 9999px;
          border: 3px solid transparent;
          border-top-color: #fd761a;
          border-right-color: rgba(253, 118, 26, 0.32);
          opacity: 0;
          transform: rotate(0deg);
          animation: successOrbitSpin 1150ms cubic-bezier(0.22, 1, 0.36, 1) 1180ms forwards;
        }

        .success-circle {
          stroke-dasharray: 195;
          stroke-dashoffset: 195;
          animation: drawSuccessCircle 620ms cubic-bezier(0.65, 0, 0.35, 1) 120ms forwards;
        }

        .success-check {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: drawSuccessCheck 520ms cubic-bezier(0.22, 1, 0.36, 1) 620ms forwards;
        }

        .success-spark {
          opacity: 0;
          transform: scale(0.55) rotate(-18deg);
          animation: successSpark 520ms cubic-bezier(0.18, 0.89, 0.32, 1.28) 760ms forwards;
        }

        .success-logo {
          opacity: 0;
          transform: scale(0.58) rotate(-10deg);
          animation: successLogoReveal 760ms cubic-bezier(0.18, 0.89, 0.32, 1.18) 1640ms forwards;
        }

        .success-logo::after {
          content: "";
          position: absolute;
          inset: -35%;
          transform: translateX(-60%) rotate(18deg);
          background: linear-gradient(90deg, transparent 34%, rgba(255,255,255,0.42), transparent 66%);
          animation: successLogoShine 1300ms ease-out 2180ms forwards;
        }

        @keyframes successSettle {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.84);
          }
          62% {
            opacity: 1;
            transform: translateY(0) scale(1.04);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes successRipple {
          0% {
            opacity: 0;
            transform: scale(0.74);
          }
          28% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: scale(1.24);
          }
        }

        @keyframes drawSuccessCircle {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes drawSuccessCheck {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes successMarkExit {
          to {
            opacity: 0;
            transform: scale(0.78);
          }
        }

        @keyframes successOrbitSpin {
          0% {
            opacity: 0;
            transform: rotate(0deg) scale(0.94);
          }
          20% {
            opacity: 1;
          }
          78% {
            opacity: 1;
            transform: rotate(330deg) scale(1);
          }
          100% {
            opacity: 0.82;
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes successLogoReveal {
          0% {
            opacity: 0;
            transform: scale(0.58) rotate(-10deg);
          }
          70% {
            opacity: 1;
            transform: scale(1.08) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes successCoreSweep {
          0% {
            opacity: 0;
            transform: rotate(0deg) scale(0.86);
          }
          24% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(260deg) scale(1.08);
          }
        }

        @keyframes successHaloBloom {
          0% {
            opacity: 0;
            transform: scale(0.72);
          }
          55% {
            opacity: 1;
            transform: scale(1.08);
          }
          100% {
            opacity: 0.68;
            transform: scale(1);
          }
        }

        @keyframes successLogoShine {
          0% {
            transform: translateX(-60%) rotate(18deg);
          }
          100% {
            transform: translateX(58%) rotate(18deg);
          }
        }

        @keyframes successSpark {
          0% {
            opacity: 0;
            transform: scale(0.55) rotate(-18deg);
          }
          70% {
            opacity: 1;
            transform: scale(1.08) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes successGlow {
          0%,
          100% {
            box-shadow: 0 0 42px rgba(113, 191, 69, 0.32);
          }
          50% {
            box-shadow: 0 0 58px rgba(113, 191, 69, 0.48);
          }
        }
      `}</style>
    </div>
  );
}

function DeliveryCard({ address, shippingMethod }) {
  const addressLines = [
    address.streetAddress,
    [address.city, address.zipCode].filter(Boolean).join(", "),
    address.phoneNumber ? `Phone: ${address.phoneNumber}` : "",
  ].filter(Boolean);

  return (
    <aside className="rounded-[14px] border border-[#e5d8cf] bg-white/54 p-[18px] shadow-[0_8px_20px_rgba(65,38,20,0.035)]">
      <div className="flex items-center gap-3 border-b border-[#e4d8cf] pb-[20px]">
        <span className="grid h-[44px] w-[44px] place-items-center rounded-full bg-white text-[#cf4d11] shadow-sm">
          <Truck size={21} />
        </span>
        <div>
          <p className="text-[11px] font-black tracking-[0.08em] text-[#ad4310]">ARRIVAL WINDOW</p>
          <h3 className="mt-[3px] text-[17px] font-black">
            {shippingMethod === "express" ? "1 Business Day" : "3-5 Business Days"}
          </h3>
        </div>
      </div>

      <div className="mt-[18px] flex h-[44px] items-center gap-2 rounded-[9px] bg-white/74 px-[13px] text-[16px] font-medium">
        <CalendarDays size={16} />
        Expected soon
      </div>

      <div className="mt-[26px]">
        <p className="text-[11px] font-black tracking-[0.14em] text-[#8d817a]">SHIPPING DESTINATION</p>
        <p className="mt-[10px] text-[15px] font-black">{address.fullName}</p>
        <p className="mt-[3px] text-[15px] font-medium leading-6">
          {addressLines.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      </div>
    </aside>
  );
}

function BreakdownCard({ discountAmount, items, promoCode, promoDiscountAmount, promoOfferDescription, shippingAmount, subtotal, totalAmount }) {
  return (
    <section className="rounded-[14px] border border-[#e5d8cf] bg-white/54 px-[25px] py-[25px] shadow-[0_8px_20px_rgba(65,38,20,0.035)]">
      <div className="mb-[24px] flex items-center justify-between">
        <h3 className="text-[11px] font-black tracking-[0.16em] text-[#a13f0d]">ORDER BREAKDOWN</h3>
        <span className="rounded-full bg-[#ece6e0] px-3 py-2 text-[12px] font-medium">
          {items.length} {items.length === 1 ? "Item" : "Items"} Total
        </span>
      </div>

      {items.map((item) => (
        <OrderItem item={item} key={item.key || item.name} />
      ))}

      <div className="mt-[23px] border-t border-dashed border-[#d8cbc2] pt-[24px]">
        <AmountLine label="Subtotal" value={formatCurrency(subtotal)} />
        <AmountLine label="Delivery & Handling" value={formatCurrency(shippingAmount)} green />
        {discountAmount ? <AmountLine label="Scratch Card Discount" value={`-${formatCurrency(discountAmount)}`} green /> : null}
        {promoCode ? <AmountLine label={`Promo Code (${promoCode})`} value={`-${formatCurrency(promoDiscountAmount)}`} green /> : null}
        {promoOfferDescription ? (
          <p className="mb-[17px] rounded-[9px] bg-[#edf7e6] px-4 py-3 text-[12px] font-bold text-[#4d8a35]">
            {promoOfferDescription}
          </p>
        ) : null}
        <div className="mt-[15px] flex items-center justify-between rounded-[9px] bg-[#ebe3dd] px-[17px] py-[16px]">
          <span className="text-[16px] font-medium">Final Amount</span>
          <strong className="text-[24px] font-black">{formatCurrency(totalAmount)}</strong>
        </div>
      </div>
    </section>
  );
}

function OrderItem({ item }) {
  const quantity = item.quantity || 1;
  const size = item.selectedSize || item.sizes?.[0] || "Selected Pack";
  const lineTotal = parseCurrency(item.price) * quantity;

  return (
    <div className="mb-[20px] flex items-center gap-[17px]">
      <img className="h-[80px] w-[80px] rounded-[9px] object-cover" src={item.image || fallbackImage} alt="" />
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[17px] font-medium">{item.name}</h4>
        <p className="mt-[2px] text-[16px] font-medium">{size}</p>
        <p className="mt-[5px] text-[15px] font-medium text-[#c84c12]">
          Qty: {quantity} · {item.price}
        </p>
      </div>
      <strong className="text-[18px] font-medium">{formatCurrency(lineTotal)}</strong>
    </div>
  );
}

function AmountLine({ label, value, green = false }) {
  return (
    <div className="mb-[12px] flex items-center justify-between text-[16px] font-medium">
      <span>{label}</span>
      <span className={green ? "font-black text-[#5aa235]" : ""}>{value}</span>
    </div>
  );
}

export default PaymentSuccess;
