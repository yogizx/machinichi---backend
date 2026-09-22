import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gift,
  Leaf,
  Loader2,
  Lock,
  LogIn,
  MapPin,
  Plus,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

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

const productImage =
  "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=360&q=92";

const parseCurrency = (value) => Number(String(value).replace(/[^\d]/g, "")) || 0;
const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}.00`;

const defaultScratchOffers = {
  singleProduct: {
    discountType: "Percentage (%)",
    discountValue: 5,
    label: "Single product reward",
  },
  multipleProducts: {
    discountType: "Percentage (%)",
    discountValue: 10,
    label: "Multi product reward",
    minItems: 2,
  },
};

const promoOffers = {
  MACH10: {
    code: "MACH10",
    description: "10% Discount Applied",
    discountType: "Percentage (%)",
    discountValue: 10,
    successMessage: "Promo Code Applied Successfully",
  },
  WELCOME15: {
    code: "WELCOME15",
    description: "15% welcome discount applied, capped at ₹300",
    discountType: "Percentage (%)",
    discountValue: 15,
    maxDiscount: 300,
    successMessage: "Promo Code Applied Successfully",
  },
  FRESH200: {
    code: "FRESH200",
    description: "₹200 off on orders above ₹1,000",
    discountType: "Fixed Amount",
    discountValue: 200,
    minSubtotal: 1000,
    successMessage: "Promo Code Applied Successfully",
  },
};

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

const getTotalItemCount = (items) =>
  items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);

const normalizeDiscountValue = (value) => Number(String(value).replace(/[^\d.]/g, "")) || 0;

const isScratchOfferEligible = (offer, items) => {
  if (!offer || offer.offerType !== "Scratch Card" || offer.status === "Draft") return false;
  if (offer.scratchCard?.productCondition === "All Products") return true;

  const eligibleProducts = offer.scratchCard?.eligibleProducts?.length
    ? offer.scratchCard.eligibleProducts
    : offer.products;

  if (!eligibleProducts?.length) return true;

  return items.every((item) => eligibleProducts.includes(item.name));
};

const getConfiguredScratchOffer = (items) => {
  try {
    const savedOffer = JSON.parse(sessionStorage.getItem("machinichiLastOffer") || "null");

    if (!isScratchOfferEligible(savedOffer, items)) return null;

    const scratchCard = savedOffer.scratchCard;
    const minItems = Number(scratchCard?.multipleProducts?.minItems) || 2;
    const reward =
      getTotalItemCount(items) >= minItems
        ? scratchCard?.multipleProducts
        : scratchCard?.singleProduct;

    return reward?.discountValue ? reward : null;
  } catch {
    return null;
  }
};

const getScratchOfferForCart = (items) => {
  const configuredOffer = getConfiguredScratchOffer(items);

  if (configuredOffer) return configuredOffer;

  return getTotalItemCount(items) > 1
    ? defaultScratchOffers.multipleProducts
    : defaultScratchOffers.singleProduct;
};

const getScratchDiscountAmount = (subtotal, reward) => {
  const discountValue = normalizeDiscountValue(reward?.discountValue);

  if (!discountValue) return 0;

  return reward?.discountType === "Fixed Amount"
    ? Math.min(discountValue, subtotal)
    : Math.round((subtotal * discountValue) / 100);
};

const getScratchRewardText = (reward) => {
  const discountValue = normalizeDiscountValue(reward?.discountValue);

  if (!discountValue) return "Mystery Offer";

  return reward?.discountType === "Fixed Amount"
    ? `${formatCurrency(discountValue).replace(".00", "")} OFF`
    : `${discountValue}% OFF`;
};

const getPromoDiscountAmount = (subtotal, offer, alreadyAppliedDiscount = 0) => {
  if (!offer) return 0;

  const discountableAmount = Math.max(subtotal - alreadyAppliedDiscount, 0);
  const discountValue = normalizeDiscountValue(offer.discountValue);

  if (!discountValue || discountableAmount <= 0) return 0;

  const rawDiscount =
    offer.discountType === "Fixed Amount"
      ? discountValue
      : Math.round((discountableAmount * discountValue) / 100);

  const cappedDiscount = offer.maxDiscount ? Math.min(rawDiscount, offer.maxDiscount) : rawDiscount;

  return Math.min(cappedDiscount, discountableAmount);
};

function SignInPrompt() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl bg-white px-6 py-12 text-center shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fef3eb]">
        <LogIn size={32} className="text-[#fd761a]" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-[#1a1a1a]">Sign in to checkout</h3>
        <p className="mt-1 text-sm text-[#796d66]">Please sign in to continue with your order</p>
      </div>
      <button
        onClick={() => navigate("/signin?redirect=/checkout")}
        className="flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-[#fd761a] text-base font-semibold text-white shadow-[0_8px_20px_rgba(253,118,26,0.25)]"
      >
        <LogIn size={20} />
        Sign In
      </button>
      <p className="text-xs text-[#a69c95]">
        Don&apos;t have an account?{" "}
        <button onClick={() => navigate("/create-account?redirect=/checkout")} className="font-semibold text-[#fd761a] underline">
          Create one
        </button>
      </p>
    </div>
  );
}

function Checkout({ isSignedIn }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const orderItems = useMemo(() => {
    const checkoutItems = state?.cartItems?.length ? state.cartItems : state?.product ? [state.product] : [];
    return checkoutItems;
  }, [state]);
  const selected = orderItems[0];

  // If the person lands on /checkout without real cart/product data (e.g. a
  // page refresh, which wipes React Router navigation state, or a direct
  // URL visit), there is no product to check out. Previously this silently
  // fell back to a hardcoded placeholder item and could submit a real
  // payment for the wrong product. Instead, send them back to their cart
  // to re-start checkout with real data.
  useEffect(() => {
    if (!orderItems.length) {
      navigate("/cart", { replace: true });
    }
  }, [orderItems, navigate]);
  const formRef = useRef(null);
  const addressModalFormRef = useRef(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressForm, setAddressForm] = useState({
    country: "India",
    fullName: "",
    mobileNumber: "",
    houseFlat: "",
    streetArea: "",
    landmark: "",
    pincode: "",
    city: "",
    state: "",
    isDefault: false,
    deliveryInstructions: "",
  });
  const [addressError, setAddressError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [scratchReward, setScratchReward] = useState(null);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const shippingOptions = {
    standard: { price: "₹50", title: "Standard Delivery", subtitle: "Estimated delivery: 2-3 business days" },
    express: { price: "₹120", title: "Express Delivery", subtitle: "Guaranteed delivery: Tomorrow" },
  };
  const subtotal = orderItems.reduce(
    (total, item) => total + (parseCurrency(item.price) || 0) * (item.quantity || 1),
    0,
  );
  const itemQuantity = selected?.quantity || 1;
  const itemSize = selected?.selectedSize || "10kg Pack";
  const shippingAmount = appliedPromo?.discountType === "Free Delivery" ? 0 : parseCurrency(shippingOptions[shippingMethod].price);
  
  const selectedAddress =
    savedAddresses.find((a) => a._id === selectedAddressId) || savedAddresses[0];

  const nextScratchReward = useMemo(() => getScratchOfferForCart(orderItems), [orderItems]);
  const scratchDiscountAmount = scratchReward ? getScratchDiscountAmount(subtotal, scratchReward) : 0;
  const promoDiscountAmount = appliedPromo
    ? (appliedPromo.calculatedAmount ?? getPromoDiscountAmount(subtotal, appliedPromo, scratchDiscountAmount))
    : 0;
  const discountAmount = scratchDiscountAmount + promoDiscountAmount;
  const totalBeforeDiscount = subtotal + shippingAmount;
  const total = Math.max(totalBeforeDiscount - discountAmount, 0);
  const scratchBackground = useMemo(
    () =>
      `radial-gradient(circle at 24% 35%, transparent ${scratchProgress * 0.5}px, rgba(91,49,24,0.9) ${
        scratchProgress * 0.5 + 1
      }px), linear-gradient(135deg, #8d4a19, #c96b21 52%, #f0b46c)`,
    [scratchProgress],
  );

  const revealScratchOffer = () => {
    if (scratchReward) return;

    setScratchReward(nextScratchReward);
    setScratchProgress(100);
  };

  const scratchCard = () => {
    if (scratchReward) return;

    setScratchProgress((progress) => {
      const nextProgress = Math.min(progress + 18, 100);
      if (nextProgress >= 72) {
        setScratchReward(nextScratchReward);
        return 100;
      }

      return nextProgress;
    });
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const { data } = await api.get("/user/addresses");
        if (data && data.addresses) {
          setSavedAddresses(data.addresses);
          const defaultAddr = data.addresses.find((a) => a.isDefault) || data.addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr._id);
            setIsEditingAddress(false);
          } else {
            setSelectedAddressId("");
            setIsEditingAddress(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch shipping addresses:", err);
      }
    };
    if (isSignedIn) {
      fetchAddresses();
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (selectedAddress) {
      setAddressForm({
        country: selectedAddress.country || "India",
        fullName: selectedAddress.fullName || "",
        mobileNumber: selectedAddress.mobileNumber || selectedAddress.phoneNumber || "",
        houseFlat: selectedAddress.houseFlat || "",
        streetArea: selectedAddress.streetArea || selectedAddress.streetAddress || "",
        landmark: selectedAddress.landmark || "",
        pincode: selectedAddress.pincode || selectedAddress.zipCode || "",
        city: selectedAddress.city || "",
        state: selectedAddress.state || "",
        isDefault: selectedAddress.isDefault || false,
        deliveryInstructions: selectedAddress.deliveryInstructions || "",
      });
    }
  }, [selectedAddressId, savedAddresses]);

  const saveAddress = async (e) => {
    if (e) e.preventDefault();

    if (!addressForm.fullName.trim()) {
      setAddressError("Please enter your full name.");
      return;
    }
    if (!addressForm.mobileNumber.trim() || !/^\d{10}$/.test(addressForm.mobileNumber.trim())) {
      setAddressError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!addressForm.houseFlat.trim()) {
      setAddressError("Please enter your Flat / House No. / Building / Apartment.");
      return;
    }
    if (!addressForm.streetArea.trim()) {
      setAddressError("Please enter your Area / Street / Sector / Village.");
      return;
    }
    if (!addressForm.pincode.trim() || !/^\d{6}$/.test(addressForm.pincode.trim())) {
      setAddressError("Please enter a valid 6-digit pincode.");
      return;
    }
    if (!addressForm.city.trim()) {
      setAddressError("Please enter your Town / City.");
      return;
    }
    if (!addressForm.state.trim()) {
      setAddressError("Please enter your State.");
      return;
    }
    if (!addressForm.country.trim()) {
      setAddressError("Please enter your Country / Region.");
      return;
    }

    setSavingAddress(true);
    setAddressError("");
    try {
      const payload = {
        fullName: addressForm.fullName.trim(),
        mobileNumber: addressForm.mobileNumber.trim(),
        country: addressForm.country.trim(),
        state: addressForm.state.trim(),
        city: addressForm.city.trim(),
        pincode: addressForm.pincode.trim(),
        streetArea: addressForm.streetArea.trim(),
        houseFlat: addressForm.houseFlat.trim(),
        landmark: addressForm.landmark ? addressForm.landmark.trim() : "",
        deliveryInstructions: addressForm.deliveryInstructions ? addressForm.deliveryInstructions.trim() : "",
        isDefault: addressForm.isDefault,
      };

      let response;
      if (editingAddressId) {
        response = await api.put(`/user/addresses/${editingAddressId}`, payload);
      } else {
        response = await api.post("/user/addresses", payload);
      }

      const savedAddr = response.data.address;

      const { data } = await api.get("/user/addresses");
      if (data && data.addresses) {
        setSavedAddresses(data.addresses);
      }

      setSelectedAddressId(savedAddr._id);
      setIsEditingAddress(false);
      setAddressSaved(true);
      setTimeout(() => setAddressSaved(false), 3000);
    } catch (err) {
      console.error("Error saving address:", err);
      setAddressError(err.response?.data?.message || "Failed to save address. Please try again.");
    } finally {
      setSavingAddress(false);
    }
  };

  const applyPromoCode = async () => {
    const normalizedCode = promoCode.trim().toUpperCase();

    if (!normalizedCode) {
      setAppliedPromo(null);
      setPromoMessage("Please enter a coupon code.");
      return;
    }

    try {
      const totalQty = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const { data } = await api.post("/checkout/apply-coupon", {
        code: normalizedCode,
        orderAmount: subtotal,
        totalQuantity: totalQty,
        items: orderItems.filter((item) => item._id).map((item) => ({
          productId: item._id,
          quantity: item.quantity || 1,
          sellingPrice: parseCurrency(item.price) || 0,
        })),
      });

      if (data.success) {
        const coupon = data.data;
        const offer = {
          couponId: coupon.couponId,
          code: coupon.code,
          name: coupon.name || coupon.description || "",
          description: coupon.description || "",
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          calculatedAmount: coupon.discountAmount,
          successMessage: "Coupon Applied Successfully",
        };
        setPromoCode(normalizedCode);
        setAppliedPromo(offer);
        const discountText = coupon.discountType === "Free Delivery"
          ? "Free delivery applied!"
          : `You saved ${formatCurrency(coupon.discountAmount)}.`;
        setPromoMessage(`Coupon Applied Successfully. ${offer.name}. ${discountText}`);
      }
    } catch (err) {
      setAppliedPromo(null);
      const msg = err.response?.data?.message || "Invalid coupon code. Please check the code and try again.";
      setPromoMessage(msg);
    }
  };

  const continueToPayment = async () => {
    if (isEditingAddress) {
      setAddressError("Please save your shipping address before proceeding.");
      const addressPanel = document.getElementById("address-panel");
      if (addressPanel) addressPanel.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const currentSelected = savedAddresses.find((a) => a._id === selectedAddressId) || savedAddresses[0];
    if (!currentSelected) {
      setAddressError("Please save a shipping address before continuing.");
      const addressPanel = document.getElementById("address-panel");
      if (addressPanel) addressPanel.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!orderItems.length || orderItems.some((item) => !item._id)) {
      setPayError("Your cart data looks out of date. Please return to your cart and try again.");
      return;
    }

    setPaying(true);
    setPayError("");

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { setPayError("Failed to load payment gateway. Please try again."); setPaying(false); return; }

      const payloadShipping = appliedPromo?.discountType === "Free Delivery" ? 0 : (shippingMethod === "express" ? 120 : 50);
      const streetAddressCombined = [currentSelected.houseFlat, currentSelected.streetArea, currentSelected.landmark].filter(Boolean).join(", ");
      
      const payload = {
        amount: total,
        currency: "INR",
        items: orderItems.map((item) => ({
          productId: item._id,
          name: item.name,
          image: item.image || "",
          quantity: item.quantity || 1,
          sellingPrice: parseCurrency(item.price) || 0,
          selectedSize: item.selectedSize,
        })),
        shippingAddress: {
          fullName: currentSelected.fullName,
          streetAddress: streetAddressCombined || currentSelected.streetAddress || "",
          city: currentSelected.city,
          state: currentSelected.state || "",
          zipCode: currentSelected.pincode || currentSelected.zipCode || "",
          phoneNumber: currentSelected.mobileNumber || currentSelected.phoneNumber || "",
          country: currentSelected.country || "India",
          mobileNumber: currentSelected.mobileNumber || "",
          houseFlat: currentSelected.houseFlat || "",
          streetArea: currentSelected.streetArea || "",
          landmark: currentSelected.landmark || "",
          pincode: currentSelected.pincode || "",
          deliveryInstructions: currentSelected.deliveryInstructions || "",
          isDefault: currentSelected.isDefault || false,
        },
        subtotal,
        shippingCharges: payloadShipping,
        discountAmount,
        coupon: appliedPromo ? { code: appliedPromo.code, couponId: appliedPromo.couponId, discountAmount: promoDiscountAmount, discountType: appliedPromo.discountType } : undefined,
        promoCode: appliedPromo ? appliedPromo.code : "",
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
          name: currentSelected.fullName || "",
          contact: currentSelected.mobileNumber || currentSelected.phoneNumber || "",
          method: "upi",
          vpa: "success@razorpay",
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
                product: selected,
                cartItems: orderItems,
                shippingAddress: currentSelected,
                shippingMethod,
                scratchDiscountAmount,
                promoCode: appliedPromo?.code || "",
                promoDiscountAmount,
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
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#150b07]">
      <div className="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 lg:px-10">
        <button
          className="mb-7 flex items-center gap-4 font-serif text-[31px] font-black leading-none tracking-[-0.035em] max-sm:mb-6 max-sm:text-[27px]"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={28} strokeWidth={2.4} />
          Checkout
        </button>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.86fr]">
          <section className="space-y-7">
            <Panel id="address-panel" className="px-7 py-7 max-sm:px-5">
              <SectionTitle icon={MapPin} title="Shipping Address" />

              <div className="mt-7">
                {isEditingAddress ? (
                  <form onSubmit={saveAddress} className="space-y-5">
                    {savedAddresses.length > 0 && (
                      <label className="block">
                        <span className="mb-[9px] block text-[13px] font-black text-[#6b5d54]">EDIT SAVED ADDRESS OR ADD NEW</span>
                        <select
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white/78 px-[16px] text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingAddressId(val);
                            if (val === "") {
                              setAddressForm({
                                country: "India",
                                fullName: "",
                                mobileNumber: "",
                                houseFlat: "",
                                streetArea: "",
                                landmark: "",
                                pincode: "",
                                city: "",
                                state: "",
                                isDefault: false,
                                deliveryInstructions: "",
                              });
                            } else {
                              const sel = savedAddresses.find((a) => a._id === val);
                              if (sel) {
                                setAddressForm({
                                  country: sel.country || "India",
                                  fullName: sel.fullName || "",
                                  mobileNumber: sel.mobileNumber || sel.phoneNumber || "",
                                  houseFlat: sel.houseFlat || "",
                                  streetArea: sel.streetArea || sel.streetAddress || "",
                                  landmark: sel.landmark || "",
                                  pincode: sel.pincode || sel.zipCode || "",
                                  city: sel.city || "",
                                  state: sel.state || "",
                                  isDefault: sel.isDefault || false,
                                  deliveryInstructions: sel.deliveryInstructions || "",
                                });
                              }
                            }
                          }}
                          value={editingAddressId}
                        >
                          <option value="">-- Add New Shipping Address --</option>
                          {savedAddresses.map((a) => (
                            <option key={a._id} value={a._id}>
                              Edit: {a.fullName} - {a.houseFlat || a.streetAddress}, {a.city}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">COUNTRY / REGION *</span>
                        <input
                          type="text"
                          value="India"
                          readOnly
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-[#f5eee8] px-4 text-[15px] font-bold outline-none text-[#5f554e] cursor-not-allowed"
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">FULL NAME (FIRST AND LAST NAME) *</span>
                        <input
                          type="text"
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value.replace(/[^A-Za-z\s]/g, "") })}
                          placeholder="Rahul Sharma"
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">MOBILE NUMBER *</span>
                        <input
                          type="tel"
                          value={addressForm.mobileNumber}
                          onChange={(e) => setAddressForm({ ...addressForm, mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                          placeholder="9876543210"
                          maxLength={10}
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">FLAT / HOUSE NO. / BUILDING / APARTMENT *</span>
                        <input
                          type="text"
                          value={addressForm.houseFlat}
                          onChange={(e) => setAddressForm({ ...addressForm, houseFlat: e.target.value })}
                          placeholder="Flat 402, Block B, Sunshine Apartments"
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">AREA / STREET / SECTOR / VILLAGE *</span>
                        <input
                          type="text"
                          value={addressForm.streetArea}
                          onChange={(e) => setAddressForm({ ...addressForm, streetArea: e.target.value })}
                          placeholder="Sector 15, Near Central Market"
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">LANDMARK (OPTIONAL)</span>
                        <input
                          type="text"
                          value={addressForm.landmark}
                          onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                          placeholder="Opposite Metro Station"
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                        />
                      </label>
                      <label>
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">PINCODE *</span>
                        <input
                          type="text"
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                          placeholder="400001"
                          maxLength={6}
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">TOWN / CITY *</span>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value.replace(/[^A-Za-z\s]/g, "") })}
                          placeholder="Mumbai"
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">STATE *</span>
                        <select
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          className="h-[52px] w-full rounded-[10px] border border-[#ded1c8] bg-white px-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                          required
                        >
                          <option value="">-- Select State --</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="sm:col-span-2 flex items-center gap-3 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                          className="h-5 w-5 rounded border-[#ded1c8] text-[#fd761a] focus:ring-[#fd761a]"
                        />
                        <span className="text-[14px] font-bold text-[#5f554e]">Make this my default address</span>
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-[6px] block text-[12px] font-black tracking-wide text-[#6b5d54]">DELIVERY INSTRUCTIONS (OPTIONAL)</span>
                        <textarea
                          value={addressForm.deliveryInstructions}
                          onChange={(e) => setAddressForm({ ...addressForm, deliveryInstructions: e.target.value })}
                          placeholder="Leave with security, ring bell, call before delivery, etc."
                          className="min-h-[90px] w-full rounded-[10px] border border-[#ded1c8] bg-white p-4 text-[15px] font-bold outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#fd761a] text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(253,118,26,0.22)] transition hover:-translate-y-0.5 disabled:opacity-50"
                      >
                        {savingAddress ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          "Use this Address"
                        )}
                      </button>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingAddress(false);
                            setAddressError("");
                          }}
                          className="h-[52px] rounded-xl border border-[#ded1c8] bg-white px-6 text-[15px] font-bold text-[#5f554e] transition hover:bg-[#fffcf9]"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {addressError && (
                      <p className="rounded-[12px] border border-[#f0c8b3] bg-[#fff1e4] px-4 py-3 text-[13px] font-black text-[#a64010]">
                        {addressError}
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const activeAddr = savedAddresses.find((a) => a._id === selectedAddressId) || savedAddresses[0];
                      if (!activeAddr) return null;

                      const houseFlat = activeAddr.houseFlat || "";
                      const streetArea = activeAddr.streetArea || activeAddr.streetAddress || "";
                      const landmark = activeAddr.landmark || "";
                      const city = activeAddr.city || "";
                      const state = activeAddr.state || "";
                      const country = activeAddr.country || "India";
                      const pincode = activeAddr.pincode || activeAddr.zipCode || "";
                      const mobile = activeAddr.mobileNumber || activeAddr.phoneNumber || "";

                      return (
                        <div className="rounded-[16px] border border-[#eadfd6] bg-[#fff8f1] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] space-y-4">
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#c7470a]">
                              DELIVERING TO:
                            </span>
                            <h3 className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#1b1714]">
                              {activeAddr.fullName}
                            </h3>
                            <div className="mt-3 space-y-1 text-[15px] font-bold leading-6 text-[#5f554e]">
                              <p>{houseFlat} {streetArea}</p>
                              {landmark && <p>Landmark: {landmark}</p>}
                              <p>{city}, {state} - {pincode}</p>
                              <p>{country}</p>
                              <p className="mt-2 text-[#7c6f66]">Phone: {mobile}</p>
                              {activeAddr.deliveryInstructions && (
                                <div className="mt-3 rounded-lg bg-white/60 p-3 border border-[#eadfd6]/60 text-[13px]">
                                  <strong className="block text-[11px] uppercase tracking-wider text-[#a19085]">Instructions:</strong>
                                  <span className="italic">{activeAddr.deliveryInstructions}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#eadfd6]/50 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddressId(activeAddr._id);
                                setIsEditingAddress(true);
                                setAddressError("");
                              }}
                              className="text-[14px] font-bold text-[#fd761a] hover:underline"
                            >
                              Change Delivery Address
                            </button>
                            {activeAddr.isDefault && (
                              <span className="rounded-full bg-[#dceecb] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#5d8f35]">
                                Default Address
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => {
                        const shippingMethodEl = document.getElementById("shipping-method-panel");
                        if (shippingMethodEl) {
                          shippingMethodEl.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className="flex h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-[#fd761a] text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(253,118,26,0.22)] transition hover:-translate-y-0.5"
                    >
                      Continue <ArrowRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            </Panel>

            <Panel id="shipping-method-panel" className="px-7 py-7 max-sm:px-5">
              <SectionTitle icon={Truck} title="Shipping Method" />
              <div className="mt-6 space-y-4">
                <ShippingOption
                  active={shippingMethod === "standard"}
                  onClick={() => setShippingMethod("standard")}
                  title={shippingOptions.standard.title}
                  subtitle={shippingOptions.standard.subtitle}
                  price={shippingOptions.standard.price}
                />
                <ShippingOption
                  active={shippingMethod === "express"}
                  onClick={() => setShippingMethod("express")}
                  title={shippingOptions.express.title}
                  subtitle={shippingOptions.express.subtitle}
                  price={shippingOptions.express.price}
                />
              </div>
            </Panel>
          </section>

          <aside>
            <Panel className="bg-[#f5eee8]/88 px-7 py-8 shadow-[0_12px_32px_rgba(52,30,16,0.12)] max-sm:px-5">
              <div className="flex items-center gap-4">
                <h2 className="text-[26px] font-black tracking-[-0.04em]">Order Summary</h2>
                <span className="rounded-full bg-[#e5ddd5] px-[16px] py-[7px] text-[12px] font-black">
                  {orderItems.length} {orderItems.length === 1 ? "ITEM" : "ITEMS"}
                </span>
              </div>

              <div className="mt-7 space-y-4">
                {orderItems.map((item) => (
                  <OrderSummaryItem item={item} key={item.key || item.name} />
                ))}
              </div>

              <div className="hidden">
                <img
                  className="h-32 w-32 rounded-[9px] object-cover max-sm:h-36 max-sm:w-full"
                  src={selected?.image || productImage}
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[18px] font-black tracking-[-0.03em]">{selected?.name || "Premium Sharbati Atta"}</h3>
                    <strong className="text-[25px] tracking-[-0.04em]">{formatCurrency(subtotal).replace(".00", "")}</strong>
                  </div>
                  <p className="mt-[24px] text-[15px] font-medium">Quantity: {itemQuantity} • {itemSize}</p>
                  <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#dceecb] px-[14px] py-[8px] text-[12px] font-black text-[#5d8f35]">
                    <Leaf size={14} />
                    NATURAL
                  </span>
                </div>
              </div>

              <div className="mt-7">
                <p className="mb-[12px] text-[13px] font-medium tracking-[0.02em]">COUPON CODE</p>
                <div className="grid grid-cols-[1fr_130px] gap-[13px] max-sm:grid-cols-1">
                  <input
                    className="h-[62px] rounded-[10px] border border-[#ded1c8] bg-white px-[17px] text-[16px] font-medium text-[#5b6678] outline-none"
                    onChange={(event) => {
                      setPromoCode(event.target.value.toUpperCase());
                      setAppliedPromo(null);
                      setPromoMessage("");
                    }}
                    placeholder="Enter code"
                    value={promoCode}
                  />
                  <button
                    className="h-[62px] rounded-[10px] bg-[#351405] text-[14px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#4b1d08]"
                    onClick={applyPromoCode}
                    type="button"
                  >
                    APPLY
                  </button>
                </div>
                {promoMessage ? (
                  <div
                    className={`mt-4 rounded-[12px] border px-4 py-4 text-[13px] font-bold leading-6 ${
                      appliedPromo
                        ? "border-[#cfe4b5] bg-[#f0f7e8] text-[#4d8a35]"
                        : "border-[#f0c8b3] bg-[#fff1e4] text-[#a64010]"
                    }`}
                  >
                    <p className="font-black">{appliedPromo ? "Coupon Applied Successfully" : "Coupon not applied"}</p>
                    <p className="mt-1">{promoMessage}</p>
                  </div>
                ) : null}
              </div>

              <ScratchCard
                discount={scratchReward}
                isScratching={isScratching}
                onPointerDown={() => {
                  setIsScratching(true);
                  scratchCard();
                }}
                onPointerEnter={() => {
                  if (isScratching) scratchCard();
                }}
                onPointerLeave={() => setIsScratching(false)}
                onPointerMove={() => {
                  if (isScratching) scratchCard();
                }}
                onPointerUp={() => setIsScratching(false)}
                onReveal={revealScratchOffer}
                progress={scratchProgress}
                scratchBackground={scratchBackground}
              />

              <div className="mt-7 border-t border-[#d8c9be] pt-6">
                <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
                <SummaryLine label="Shipping" value={formatCurrency(shippingAmount)} green />
                {scratchReward ? (
                  <SummaryLine label={`Scratch Card (${getScratchRewardText(scratchReward)})`} value={`-${formatCurrency(scratchDiscountAmount)}`} green />
                ) : null}
                {appliedPromo ? (
                  <SummaryLine label={`Coupon (${appliedPromo.code})`} value={appliedPromo.discountType === "Free Delivery" ? "Free Delivery" : `-${formatCurrency(promoDiscountAmount)}`} green />
                ) : null}
              </div>

              <div className="mt-5 border-t border-[#d8c9be] pt-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-[24px] font-black tracking-[-0.04em]">Order Total</h3>
                    {discountAmount ? (
                      <p className="mt-2 text-[13px] font-bold text-[#4d8a35]">
                        Final price after applied checkout discounts
                      </p>
                    ) : null}
                  </div>
                  <strong className="text-[38px] font-black tracking-[-0.06em] text-[#fd761a] max-sm:text-[31px]">{formatCurrency(total)}</strong>
                </div>
              </div>

              {payError ? (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-[14px] font-semibold text-red-700">
                  {payError}
                </div>
              ) : null}

              {isSignedIn ? (
                <>
                  <button
                    className="mt-4 flex h-[68px] w-full items-center justify-center gap-4 rounded-[12px] bg-[#fd761a] text-[17px] font-medium tracking-[0.1em] text-white shadow-[0_16px_28px_rgba(253,118,26,0.22)] disabled:opacity-60 max-sm:h-16 max-sm:text-[14px]"
                    onClick={continueToPayment}
                    disabled={paying}
                    type="button"
                  >
                    {paying ? <Loader2 size={22} className="animate-spin" /> : <><ArrowRight size={32} strokeWidth={2.2} /> PAY NOW</>}
                  </button>
                  <div className="mt-5 flex h-[52px] items-center justify-center gap-3 rounded-[10px] bg-[#e9e2dc] text-[13px] font-medium tracking-[0.08em] max-sm:text-[11px]">
                    <Lock size={17} />
                    SECURE 256-BIT SSL ENCRYPTION
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <SignInPrompt />
                </div>
              )}
            </Panel>

            <div className="mt-6 grid grid-cols-3 gap-4 max-sm:grid-cols-1">
              <TrustBadge icon={ShieldCheck} title="100% SECURE" />
              <TrustBadge icon={Leaf} title="PURE ORGANIC" />
              <TrustBadge icon={Truck} title="LIVE TRACKING" />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function AddressPreview({ address }) {
  const addressLines = [
    address.streetAddress,
    [address.city, address.zipCode].filter(Boolean).join(", "),
    address.phoneNumber ? `Phone: ${address.phoneNumber}` : "",
  ].filter(Boolean);

  return (
    <article className="rounded-[16px] border border-[#eadfd6] bg-[#fff8f1] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#c7470a]">
            Selected address
          </p>
          <h3 className="mt-2 text-[20px] font-black tracking-[-0.04em] text-[#1b1714]">
            {address.fullName}
          </h3>
          <div className="mt-3 space-y-1 text-[14px] font-bold leading-6 text-[#5f554e]">
            {addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <span className="w-fit rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#5d8f35] shadow-[0_6px_14px_rgba(53,31,18,0.06)]">
          {address.source === "profile" ? "Profile default" : "Saved address"}
        </span>
      </div>
    </article>
  );
}

function AddressModal({ address, formRef, onChange, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c0f09]/58 px-4 py-5 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-[640px] rounded-[24px] border border-[#eadfd6] bg-[#fffaf5] shadow-[0_24px_60px_rgba(25,12,6,0.3)] animate-[checkoutAddressModal_260ms_ease-out_both]">
        <header className="flex items-start justify-between gap-5 border-b border-[#eadfd6] px-6 py-6 sm:px-8">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#c7470a]">Checkout</p>
            <h2 className="mt-2 font-serif text-[30px] font-black leading-none tracking-[-0.045em] text-[#191411]">
              Add Shipping Address
            </h2>
            <p className="mt-3 max-w-[430px] text-[14px] font-medium leading-6 text-[#655e59]">
              Save another delivery location and select it for this order.
            </p>
          </div>
          <button
            aria-label="Close add address popup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e7ded7] bg-white text-[#2b1f1a] transition hover:border-[#b62917] hover:text-[#b62917]"
            onClick={onClose}
            type="button"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </header>

        <form className="px-6 py-6 sm:px-8" onSubmit={onSave} ref={formRef}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="FULL NAME"
              name="modalFullName"
              onChange={(value) => onChange("fullName", value)}
              pattern="[A-Za-z\s]{2,}"
              placeholder="e.g. Rahul Sharma"
              title="Full name should contain at least two alphabet characters."
              value={address.fullName}
            />
            <Field
              inputMode="numeric"
              label="PHONE NUMBER"
              maxLength={10}
              name="modalPhoneNumber"
              onChange={(value) => onChange("phoneNumber", value)}
              pattern="\d{10}"
              placeholder="9876543210"
              title="Phone number must be exactly 10 digits."
              value={address.phoneNumber}
            />
            <Field
              className="sm:col-span-2"
              label="STREET ADDRESS"
              minLength={5}
              name="modalStreetAddress"
              onChange={(value) => onChange("streetAddress", value)}
              placeholder="123, Green Park Main"
              title="Street address is required."
              value={address.streetAddress}
            />
            <Field
              label="CITY"
              name="modalCity"
              onChange={(value) => onChange("city", value)}
              pattern="[A-Za-z\s]{2,}"
              placeholder="New Delhi"
              title="City should contain at least two alphabet characters."
              value={address.city}
            />
            <Field
              inputMode="numeric"
              label="ZIP CODE"
              maxLength={6}
              name="modalZipCode"
              onChange={(value) => onChange("zipCode", value)}
              pattern="\d{5,6}"
              placeholder="110016"
              title="ZIP code must be 5 or 6 digits."
              value={address.zipCode}
            />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="h-[48px] rounded-full border-2 border-[#e0d6ce] bg-white px-7 text-[15px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] hover:bg-[#f2ebe5]"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-[48px] rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[15px] font-black text-white shadow-[0_13px_22px_rgba(255,103,17,0.18)] transition hover:-translate-y-0.5"
              type="submit"
            >
              Save Address
            </button>
          </div>
        </form>

        <style>{`
          @keyframes checkoutAddressModal {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.96);
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

function OrderSummaryItem({ item }) {
  const itemQuantity = item.quantity || 1;
  const itemSize = item.selectedSize || item.sizes?.[0] || "10kg Pack";
  const lineTotal = parseCurrency(item.price) * itemQuantity;

  return (
    <div className="flex items-center gap-5 rounded-[14px] border border-white bg-white/76 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] max-sm:flex-col max-sm:items-start">
      <img
        className="h-32 w-32 rounded-[9px] object-cover max-sm:h-36 max-sm:w-full"
        src={item.image || productImage}
        alt=""
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-[18px] font-black tracking-[-0.03em]">{item.name || "Premium Sharbati Atta"}</h3>
          <strong className="text-[25px] tracking-[-0.04em]">{formatCurrency(lineTotal).replace(".00", "")}</strong>
        </div>
        <p className="mt-[24px] text-[15px] font-medium">Quantity: {itemQuantity} â€¢ {itemSize}</p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#dceecb] px-[14px] py-[8px] text-[12px] font-black text-[#5d8f35]">
          <Leaf size={14} />
          NATURAL
        </span>
      </div>
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <section className={`rounded-[21px] border border-[#e4d8cf] bg-white/74 shadow-[0_8px_24px_rgba(53,31,18,0.04)] ${className}`}>
      {children}
    </section>
  );
}

function ScratchCard({
  discount,
  isScratching,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerUp,
  onReveal,
  progress,
  scratchBackground,
}) {
  const rewardText = getScratchRewardText(discount);

  return (
    <div className="mt-[28px] rounded-[14px] border border-[#ded1c8] bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#ffe4d6] text-[#c7470a]">
            <Gift size={19} strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-[17px] font-black tracking-[-0.03em]">Scratch Card Offer</h3>
            <p className="mt-1 text-[12px] font-medium text-[#7d716a]">
              Scratch to reveal your checkout discount.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#f0e5dc] px-3 py-2 text-[11px] font-black text-[#8d3500]">
          {discount ? "APPLIED" : "UNLOCK"}
        </span>
      </div>

      <button
        aria-label={discount ? `Scratch card revealed ${rewardText}` : "Scratch card to reveal offer"}
        className={`scratch-card group relative h-[136px] w-full overflow-hidden rounded-[14px] border border-[#e1d2c7] bg-[#fff7ef] text-left shadow-[0_10px_24px_rgba(75,43,22,0.08)] transition duration-500 ${
          discount ? "scratch-card-revealed shadow-[0_18px_36px_rgba(198,78,12,0.2)]" : ""
        }`}
        onClick={onReveal}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        type="button"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,215,157,0.8),transparent_31%),linear-gradient(135deg,#fff6e8,#fffaf5_45%,#ffe9d4)]" />
        <div className="absolute -left-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-[#fd761a]/14 blur-2xl" />
        <div className="absolute -right-10 bottom-0 h-24 w-24 rounded-full bg-[#5d8f35]/16 blur-2xl" />

        <div
          className={`offer-reveal relative z-10 flex h-full flex-col items-center justify-center px-5 text-center transition duration-500 ${
            discount ? "scale-100 opacity-100" : "scale-95 opacity-60"
          }`}
        >
          <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#4d8a35]">You won</p>
          <p className="mt-1 text-[38px] font-black tracking-[-0.06em] text-[#fd761a] drop-shadow-[0_5px_14px_rgba(253,118,26,0.2)] max-sm:text-[32px]">
            {discount ? rewardText : "Mystery Offer"}
          </p>
          <p className="mt-1 text-[12px] font-bold text-[#7d716a]">
            {discount ? discount.label || "Discount applied automatically" : "Scratch or tap to reveal"}
          </p>
          <span
            className={`mt-3 h-1.5 w-32 rounded-full bg-gradient-to-r from-[#5d8f35] via-[#fd761a] to-[#c7470a] transition duration-700 ${
              discount ? "opacity-100 scale-x-100" : "opacity-0 scale-x-50"
            }`}
          />
        </div>

        <div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center px-5 text-center text-white transition duration-700 ease-out ${
            discount ? "pointer-events-none opacity-0 scale-110 blur-sm" : "opacity-100"
          }`}
          style={{
            background: scratchBackground,
            clipPath: `inset(0 0 0 ${progress}%)`,
          }}
        >
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.24),transparent_26%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.16),transparent_24%)]" />
          <span className="scratch-swipe absolute inset-y-0 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[1px]" />
          <p className="relative text-[11px] font-black uppercase tracking-[0.2em] text-white/78">
            Swipe to unlock
          </p>
          <p className="relative mt-2 text-[27px] font-black tracking-[-0.04em]">Reveal Offer</p>
          <div className="relative mt-4 h-1.5 w-32 overflow-hidden rounded-full bg-white/22">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-white via-[#ffe0b7] to-white transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className={`pointer-events-none absolute inset-0 z-30 ${discount ? "scratch-burst" : "opacity-0"}`}>
          {Array.from({ length: 12 }, (_, index) => (
            <span className="scratch-particle" key={index} style={{ "--i": index }} />
          ))}
          <span className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#fd761a]/45" />
        </div>

        <span
          className={`absolute inset-x-6 bottom-3 z-30 text-center text-[11px] font-bold text-white/80 transition ${
            isScratching && !discount ? "opacity-100" : "opacity-0"
          }`}
        >
          Light sweep is unlocking...
        </span>
      </button>

      <style>{`
        .scratch-card {
          isolation: isolate;
        }

        .scratch-card::after {
          content: "";
          position: absolute;
          inset: -40% -55%;
          z-index: 5;
          transform: translateX(-65%) rotate(18deg);
          background: linear-gradient(90deg, transparent 34%, rgba(255,255,255,0.58) 49%, transparent 64%);
          opacity: 0;
          pointer-events: none;
        }

        .scratch-card-revealed::after {
          animation: scratchOfferSwipe 820ms ease-out both;
        }

        .scratch-card-revealed .offer-reveal {
          animation: scratchOfferPop 620ms cubic-bezier(.18,.89,.32,1.24) both;
        }

        .scratch-swipe {
          animation: scratchSwipe 1.9s ease-in-out infinite;
        }

        .scratch-burst {
          animation: scratchBurstFade 900ms ease-out both;
        }

        .scratch-particle {
          --angle: calc(var(--i) * 30deg);
          position: absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: linear-gradient(135deg, #fd761a, #ffe0a3);
          box-shadow: 0 0 14px rgba(253,118,26,0.5);
          transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0.5);
          animation: scratchParticlePop 820ms ease-out both;
          animation-delay: calc(var(--i) * 18ms);
        }

        @keyframes scratchSwipe {
          0% {
            transform: translateX(0) rotate(12deg);
            opacity: 0;
          }
          20%, 70% {
            opacity: 1;
          }
          100% {
            transform: translateX(430%) rotate(12deg);
            opacity: 0;
          }
        }

        @keyframes scratchOfferSwipe {
          0% {
            opacity: 0;
            transform: translateX(-65%) rotate(18deg);
          }
          15%, 72% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(70%) rotate(18deg);
          }
        }

        @keyframes scratchOfferPop {
          0% {
            transform: scale(0.88);
            filter: saturate(0.7);
          }
          54% {
            transform: scale(1.06);
            filter: saturate(1.35);
          }
          100% {
            transform: scale(1);
            filter: saturate(1);
          }
        }

        @keyframes scratchBurstFade {
          0% {
            opacity: 0;
          }
          12%, 68% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes scratchParticlePop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0.5);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(-58px) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-[17px]">
      <span className="grid h-[65px] w-[65px] place-items-center rounded-[12px] bg-[#ffd3c0] text-[#c7470a]">
        <Icon size={29} strokeWidth={2.2} />
      </span>
      <h2 className="text-[26px] font-black tracking-[-0.035em]">{title}</h2>
    </div>
  );
}

function Field({ className = "", inputMode, label, maxLength, minLength, name, onChange, pattern, placeholder, title, value }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-[9px] block text-[13px] font-black">{label}</span>
      <input
        className="h-[62px] w-full rounded-[10px] border border-[#ded1c8] bg-white/78 px-[16px] text-[17px] font-medium tracking-[-0.03em] text-[#5b6678] outline-none transition focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        pattern={pattern}
        placeholder={placeholder}
        required
        title={title}
        value={value}
      />
    </label>
  );
}

function ShippingOption({ active = false, onClick, title, subtitle, price }) {
  return (
    <button
      className={`relative flex min-h-[106px] w-full items-center justify-between rounded-[13px] border bg-white/76 px-[26px] text-left ${
        active ? "border-2 border-[#d34e11]" : "border-[#ded1c8]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-[25px]">
        <span className={`grid h-[31px] w-[31px] place-items-center rounded-full border-2 ${active ? "border-[#d34e11]" : "border-[#d7c8bd]"}`}>
          {active ? <span className="h-[11px] w-[11px] rounded-full bg-[#d34e11]" /> : null}
        </span>
        <span>
          <strong className="block text-[17px] font-black tracking-[-0.025em]">{title}</strong>
          <span className="mt-1 block text-[15px] font-medium tracking-[-0.03em]">{subtitle}</span>
        </span>
      </div>
      <strong className={`text-[25px] tracking-[-0.05em] ${active ? "text-[#d34e11]" : "text-black"}`}>{price}</strong>
      {active ? (
        <span className="absolute -right-1 -top-1 grid h-[24px] w-[24px] place-items-center rounded-full bg-[#d34e11] text-[12px] font-black text-white">
          ✓
        </span>
      ) : null}
    </button>
  );
}

function SummaryLine({ label, value, green = false }) {
  return (
    <div className="mb-[17px] flex items-center justify-between text-[18px] font-medium tracking-[-0.035em]">
      <span>{label}</span>
      <span className={green ? "text-[#4d8a35]" : ""}>{value}</span>
    </div>
  );
}

function TrustBadge({ icon: Icon, title }) {
  return (
    <div className="flex h-[102px] flex-col items-center justify-center rounded-[13px] border border-[#e4d8cf] bg-white/78 text-center shadow-[0_6px_16px_rgba(53,31,18,0.035)]">
      <Icon size={25} strokeWidth={2.1} />
          <p className="mt-3 text-[11px] font-medium">{title}</p>
    </div>
  );
}

export default Checkout;
