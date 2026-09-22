import {
  ArrowLeft,
  CreditCard,
  Landmark,
  Lock,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const formatCurrency = (value) => `₹${Number(value).toLocaleString("en-IN")}`;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PaymentMethod() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const orderItems = state?.cartItems?.length ? state.cartItems : state?.product ? [state.product] : [];
  const subtotal = orderItems.reduce((t, item) => t + (Number(String(item.price).replace(/[^\d]/g, "")) || 0) * (item.quantity || 1), 0);
  const totalAmount = state?.orderTotal ?? subtotal;
  const shippingAmount = state?.shippingMethod === "express" ? 120 : 50;
  const discountAmount = state?.scratchDiscountAmount || 0;
  const promoDiscountAmount = state?.promoDiscountAmount || 0;

  const handlePay = useCallback(async () => {
    setPaying(true);
    setPayError("");

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { setPayError("Failed to load payment gateway. Please try again."); setPaying(false); return; }

      const payload = {
        amount: totalAmount,
        currency: "INR",
        items: orderItems.map((item) => ({
          name: item.name,
          image: item.image || "",
          quantity: item.quantity || 1,
          sellingPrice: Number(String(item.price).replace(/[^\d]/g, "")) || 0,
          selectedSize: item.selectedSize,
        })),
        shippingAddress: state?.shippingAddress ? {
          fullName: state.shippingAddress.fullName,
          streetAddress: state.shippingAddress.streetAddress || "",
          city: state.shippingAddress.city,
          state: state.shippingAddress.state || "",
          zipCode: state.shippingAddress.pincode || state.shippingAddress.zipCode || "",
          phoneNumber: state.shippingAddress.mobileNumber || state.shippingAddress.phoneNumber || "",
          country: state.shippingAddress.country || "India",
          mobileNumber: state.shippingAddress.mobileNumber || "",
          houseFlat: state.shippingAddress.houseFlat || "",
          streetArea: state.shippingAddress.streetArea || "",
          landmark: state.shippingAddress.landmark || "",
          pincode: state.shippingAddress.pincode || "",
          deliveryInstructions: state.shippingAddress.deliveryInstructions || "",
          isDefault: state.shippingAddress.isDefault || false,
        } : undefined,
        subtotal,
        shippingCharges: shippingAmount,
        discountAmount,
        promoCode: state?.promoCode || "",
        promoDiscount: promoDiscountAmount,
      };

      const { data: orderRes } = await api.post("/payments/create-direct", payload);
      const { id: razorpayOrderId, amount: rpAmount, key } = orderRes.data;

      const options = {
        key,
        amount: rpAmount,
        currency: "INR",
        name: "Machinichi",
        description: `Order ${orderRes.data.orderId || ""}`,
        order_id: razorpayOrderId,
        prefill: {
          name: state?.shippingAddress?.fullName || "",
          contact: state?.shippingAddress?.phoneNumber || "",
        },
        theme: { color: "#fd761a" },
        handler: async function (response) {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderRes.data.orderDbId,
            });
            navigate("/payment-success", {
              state: {
                ...state,
                paymentMethod,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                orderId: orderRes.data.orderId,
                orderDbId: orderRes.data.orderDbId,
              },
            });
          } catch {
            setPayError("Payment verification failed. Please contact support.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => { setPaying(false); },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (resp) {
        setPayError(resp.error?.description || "Payment failed. Please try again.");
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setPayError(err.response?.data?.message || "Something went wrong. Please try again.");
      setPaying(false);
    }
  }, [totalAmount, orderItems, state, subtotal, shippingAmount, discountAmount, promoDiscountAmount, paymentMethod, navigate]);

  return (
    <main className="min-h-screen bg-[#fff8f1] text-[#1a0d07]">
      <div className="mx-auto grid max-w-[1250px] gap-6 px-[17px] py-[27px] lg:grid-cols-[1fr_390px]">
        <section>
          <button
            className="mb-[27px] flex items-center gap-3 text-[24px] font-serif font-black tracking-[-0.03em]"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={21} className="text-[#b43f08]" />
            Payment Method
          </button>

          <div className="space-y-[13px]">
            <PaymentOption
              active={paymentMethod === "upi"}
              icon={Smartphone}
              onClick={() => setPaymentMethod("upi")}
              title="UPI (PhonePe, GooglePay, BHIM)"
              subtitle="Instant payment using your UPI ID"
            />
            <CardPayment active={paymentMethod === "card"} onClick={() => setPaymentMethod("card")} />
            <PaymentOption
              active={paymentMethod === "netbanking"}
              icon={Landmark}
              onClick={() => setPaymentMethod("netbanking")}
              title="Net Banking"
              subtitle="Pay via your bank account"
            />
          </div>

          {payError && (
            <div className="mt-5 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-[14px] font-semibold text-red-700">
              {payError}
            </div>
          )}
        </section>

        <aside className="rounded-[13px] border border-[#e4d8cf] bg-[#f7f0ea] px-[26px] py-[27px] shadow-[0_8px_22px_rgba(65,38,20,0.045)]">
          <h2 className="text-[19px] font-black">Order Summary</h2>
          <div className="mt-[19px] border-t border-[#e0d4ca] pt-[21px]">
            {orderItems.map((item) => (
              <SummaryProduct
                key={item.key || item.name}
                image={item.image}
                title={item.name}
                subtitle={`Qty: ${item.quantity || 1} · ${item.selectedSize || ""}`}
                price={formatCurrency(Number(String(item.price).replace(/[^\d]/g, "")) || 0)}
              />
            ))}
          </div>

          <div className="mt-[26px] border-t border-[#e0d4ca] pt-[19px]">
            <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
            <SummaryLine label="Delivery" value={shippingAmount ? formatCurrency(shippingAmount) : "FREE"} green />
            {discountAmount ? <SummaryLine label="Scratch Discount" value={`-${formatCurrency(discountAmount)}`} green /> : null}
            {promoDiscountAmount ? <SummaryLine label="Promo Discount" value={`-${formatCurrency(promoDiscountAmount)}`} green /> : null}
          </div>

          <div className="mt-[18px] border-t border-[#e0d4ca] pt-[24px]">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] font-black">Total Amount</h3>
              <strong className="text-[22px] font-black text-[#b64008]">{formatCurrency(totalAmount)}</strong>
            </div>
          </div>

          <button
            className="mt-[45px] flex h-[56px] w-full items-center justify-center gap-2 rounded-[9px] bg-[#ff7624] text-[17px] font-black text-white shadow-[0_8px_16px_rgba(255,118,36,0.22)] disabled:opacity-60"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? <Loader2 size={18} className="animate-spin" /> : <Lock size={17} />}
            {paying ? "PROCESSING..." : `PAY ${formatCurrency(totalAmount)}`}
          </button>
          <p className="mt-[14px] flex items-center justify-center gap-1 text-[11px] font-medium text-[#5f5650]">
            <ShieldCheck size={12} />
            Buyer Protection Enabled
          </p>
        </aside>
      </div>
    </main>
  );
}

function PaymentOption({ active = false, icon: Icon, onClick, title, subtitle }) {
  return (
    <button
      className={`flex min-h-[72px] w-full items-center justify-between rounded-[10px] px-[18px] text-left ${active ? "border-2 border-[#c84c12] bg-[#eee6df]" : "bg-[#f1e9e1]"
        }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-[16px]">
        <span className="grid h-[40px] w-[40px] place-items-center rounded-[7px] bg-white text-[#c84c12]">
          <Icon size={21} strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="text-[17px] font-black tracking-[-0.02em]">{title}</h2>
          <p className="mt-[2px] text-[12px] font-medium text-[#4d443e]">{subtitle}</p>
        </div>
      </div>
      <span className={`grid h-[22px] w-[22px] place-items-center rounded-full border-2 ${active ? "border-[#bd4a0d]" : "border-[#91857e]"}`}>
        {active ? <span className="h-[8px] w-[8px] rounded-full bg-[#bd4a0d]" /> : null}
      </span>
    </button>
  );
}

function CardPayment({ active = false, onClick }) {
  return (
    <section
      className={`rounded-[10px] px-[18px] py-[16px] ${active ? "border-2 border-[#c84c12] bg-[#eee6df]" : "bg-[#f1e9e1]"
        }`}
    >
      <button className="flex w-full items-start justify-between text-left" onClick={onClick} type="button">
        <div className="flex items-center gap-[16px]">
          <span className="grid h-[40px] w-[40px] place-items-center rounded-[7px] bg-white text-[#c84c12]">
            <CreditCard size={21} strokeWidth={2.1} />
          </span>
          <div>
            <h2 className="text-[17px] font-black tracking-[-0.02em]">Credit or Debit Card</h2>
            <p className="mt-[2px] text-[12px] font-medium text-[#4d443e]">All major cards supported</p>
          </div>
        </div>
        <span className={`grid h-[22px] w-[22px] place-items-center rounded-full border-2 ${active ? "border-[#bd4a0d]" : "border-[#91857e]"}`}>
          {active ? <span className="h-[8px] w-[8px] rounded-full bg-[#bd4a0d]" /> : null}
        </span>
      </button>

      {active ? <form className="mt-[21px]">
        <label className="block">
          <span className="mb-[7px] block text-[11px] font-black text-[#4c403a]">CARD NUMBER</span>
          <div className="relative">
            <input
              className="h-[41px] w-full rounded-[5px] border border-[#d9cec5] bg-white px-[14px] pr-10 text-[14px] font-medium text-[#7a8390] outline-none"
              defaultValue="XXXX XXXX XXXX XXXX"
            />
            <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a7a09b]" size={18} />
          </div>
        </label>
        <div className="mt-[13px] grid gap-[15px] sm:grid-cols-2">
          <label className="block">
            <span className="mb-[7px] block text-[11px] font-black text-[#4c403a]">EXPIRY DATE</span>
            <input className="h-[41px] w-full rounded-[5px] border border-[#d9cec5] bg-white px-[14px] text-[14px] font-medium text-[#7a8390] outline-none" defaultValue="MM / YY" />
          </label>
          <label className="block">
            <span className="mb-[7px] block text-[11px] font-black text-[#4c403a]">CVV</span>
            <input className="h-[41px] w-full rounded-[5px] border border-[#d9cec5] bg-white px-[14px] text-[14px] font-medium text-[#7a8390] outline-none" defaultValue="•••" />
          </label>
        </div>
        <label className="mt-[15px] flex items-center gap-2 text-[11px] font-medium text-[#4d443e]">
          <span className="h-[14px] w-[14px] rounded-[3px] border border-[#d8cbc2] bg-white" />
          Save card securely for future payments
        </label>
      </form> : null}
    </section>
  );
}

function SummaryProduct({ image, title, subtitle, price }) {
  return (
    <div className="mb-[14px] flex gap-[14px]">
      <img className="h-[61px] w-[61px] rounded-[7px] object-cover" src={image} alt="" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[14px] font-medium">{title}</h3>
        <p className="mt-[4px] text-[13px] font-medium text-[#3f362f]">{subtitle}</p>
        <p className="mt-[4px] text-[11px] font-black text-[#c8430b]">{price}</p>
      </div>
    </div>
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

export default PaymentMethod;
