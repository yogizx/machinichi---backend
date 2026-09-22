import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Headphones,
  LocateFixed,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  PackageSearch,
  Send,
  ShieldQuestion,
  Truck,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import Sidebar from "../components/Sidebar";

const POLL_INTERVAL = 15000;
const fallbackImage = "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=260&q=90";

const STEP_ORDER = ["pending_approval", "accepted", "packed", "shipped", "in_transit", "out_for_delivery", "delivered"];

const STEP_META = {
  pending_approval: { title: "Pending", desc: "Order received and awaiting approval", icon: ClipboardCheck },
  accepted: { title: "Confirmed", desc: "Your order has been confirmed", icon: PackageCheck },
  packed: { title: "Packed", desc: "Your order has been packed", icon: Boxes },
  shipped: { title: "Shipped", desc: "Your order has been shipped", icon: Truck },
  in_transit: { title: "In Transit", desc: "Your order is on the way", icon: LocateFixed },
  out_for_delivery: { title: "Out For Delivery", desc: "Your order is out for delivery", icon: Truck },
  delivered: { title: "Delivered", desc: "Your order has been delivered", icon: CheckCircle2 },
};

const STATUS_BADGE = {
  delivered: { color: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Delivered", icon: CheckCircle2 },
  shipped: { color: "text-blue-700 bg-blue-50 border-blue-200", label: "Shipped", icon: Truck },
  in_transit: { color: "text-blue-700 bg-blue-50 border-blue-200", label: "In Transit", icon: Truck },
  out_for_delivery: { color: "text-blue-700 bg-blue-50 border-blue-200", label: "Out For Delivery", icon: Truck },
  cancelled: { color: "text-rose-700 bg-rose-50 border-rose-200", label: "Cancelled", icon: XCircle },
  returned: { color: "text-violet-700 bg-violet-50 border-violet-200", label: "Returned", icon: Undo2 },
  pending_approval: { color: "text-orange-700 bg-orange-50 border-orange-200", label: "Processing", icon: Clock3 },
  accepted: { color: "text-orange-700 bg-orange-50 border-orange-200", label: "Processing", icon: Clock3 },
  packed: { color: "text-orange-700 bg-orange-50 border-orange-200", label: "Processing", icon: Clock3 },
  delayed: { color: "text-rose-700 bg-rose-50 border-rose-200", label: "Delayed", icon: AlertCircle },
};
const getStatusConfig = (s) => STATUS_BADGE[s] || { color: "text-gray-600 bg-gray-50 border-gray-200", label: s, icon: Package };

const formatCurrency = (value) => `₹${(value || 0).toLocaleString("en-IN")}`;
const formatDate = (date) => (date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—");
const formatDateShort = (date) => (date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const formatTime = (date) => (date ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "");

function Trackorder() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [inputOrderId, setInputOrderId] = useState("");

  const getInitialOrderId = () => {
    if (state?._id || state?.orderDbId || state?.orderId) return state._id || state.orderDbId || state.orderId;
    try {
      const saved = sessionStorage.getItem("machinichiTrackedOrderId");
      return saved || "";
    } catch { return ""; }
  };

  const [activeOrderId, setActiveOrderId] = useState(getInitialOrderId);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const [allOrdersLoading, setAllOrdersLoading] = useState(false);

  const fetchOrder = useCallback(async (idToFetch) => {
    if (!idToFetch) return;
    setLoading(true);
    setError("");

    const tryTrack = async (id) => {
      const { data } = await api.get(`/orders/track/${id}`);
      if (data.success) return data.data;
      return null;
    };
    const tryAuth = async (id) => {
      const { data } = await api.get(`/orders/${id}`);
      if (data.success) return data.data;
      return null;
    };

    try {
      let result = await tryAuth(idToFetch);
      if (!result) result = await tryTrack(idToFetch);
      if (result) {
        setOrderData(result);
        sessionStorage.setItem("machinichiTrackedOrderId", idToFetch);
      } else {
        setError("Order not found. Please verify the ID.");
      }
    } catch {
      try {
        const result = await tryTrack(idToFetch);
        if (result) {
          setOrderData(result);
          sessionStorage.setItem("machinichiTrackedOrderId", idToFetch);
        } else {
          setError("Order not found. Please verify the ID.");
        }
      } catch {
        setError("Invalid Order ID or network error.");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeOrderId) fetchOrder(activeOrderId);
  }, [activeOrderId, fetchOrder]);

  useEffect(() => {
    if (!activeOrderId) return;
    const interval = setInterval(() => fetchOrder(activeOrderId), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOrder, activeOrderId]);

  useEffect(() => {
    const openSupport = () => setIsChatOpen(true);
    window.addEventListener("machinichi:open-support", openSupport);
    return () => window.removeEventListener("machinichi:open-support", openSupport);
  }, []);

  const fetchAllOrders = useCallback(async () => {
    setAllOrdersLoading(true);
    try {
      const { data } = await api.get("/orders/my-orders?page=1&limit=50");
      if (data.success) setAllOrders(data.data || []);
      const { data: first } = await api.get("/orders/my-orders?page=1&limit=5");
      if (first.success) setRecentOrders(first.data || []);
    } catch {} finally {
      setRecentLoading(false);
      setAllOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeOrderId) fetchAllOrders();
  }, [activeOrderId, fetchAllOrders]);

  const handleSearchOrder = (e) => {
    e.preventDefault();
    if (inputOrderId.trim()) setActiveOrderId(inputOrderId.trim());
  };

  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ── Empty / search state ──────────────────────────────────
  if (!activeOrderId || error) {
    return (
      <main className="account-shell relative h-full overflow-hidden bg-[#fcf8f4] text-[#211713] antialiased">
        <div className="account-sidebar-fixed border-t border-[#efe5dc]"><Sidebar /></div>
        <section className="flex h-full items-start justify-center overflow-y-auto border-t border-[#efe5dc] px-6 py-12">
          <div className="flex w-full max-w-[520px] flex-col gap-6">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#efe5dc] bg-white/80 p-8 text-center shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50 text-[#fd761a] shadow-inner">
                <PackageSearch size={32} strokeWidth={1.8} />
              </div>
              <h1 className="mt-6 font-serif text-[22px] font-black text-[#3a1100]">Track Your Order</h1>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#796d66] max-w-sm mx-auto">
                Enter your Order ID below to get real-time updates on your shipment.
              </p>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-[12px] font-bold text-rose-700">
                  <AlertCircle size={15} /> {error}
                </motion.div>
              )}

              <form onSubmit={handleSearchOrder} className="mt-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Enter Order ID..."
                      value={inputOrderId}
                      onChange={(e) => setInputOrderId(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-4 pr-10 text-[13.5px] font-semibold text-[#211713] outline-none placeholder:text-[#c7bab0] transition-colors focus:border-[#fd761a] focus:bg-white"
                    />
                    {inputOrderId && (
                      <button type="button" onClick={() => setInputOrderId("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c7bab0] hover:text-[#796d66]">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={loading || !inputOrderId.trim()}
                    className="flex h-12 w-[120px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#fd761a] to-[#e86710] text-[13px] font-black text-white shadow-[0_4px_12px_rgba(253,118,26,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(253,118,26,0.3)] disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <><Send size={15} /> Track</>}
                  </motion.button>
                </div>
              </form>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                <button onClick={() => navigate("/orders")} className="h-11 rounded-xl bg-[#3a1100] px-6 text-[12px] font-black text-white transition hover:bg-[#521b04]" type="button">
                  My Orders
                </button>
                <button onClick={() => navigate("/product")} className="h-11 rounded-xl border border-[#efe5dc] bg-white px-6 text-[12px] font-black text-[#3a1100] transition hover:bg-gray-50" type="button">
                  Shop Products
                </button>
              </div>
            </motion.div>

            {recentOrders.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-[#efe5dc] bg-white/80 p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] backdrop-blur">
                <h2 className="flex items-center gap-2 text-[13px] font-black text-[#3a1100]">
                  <Clock3 size={14} /> Recent Orders
                </h2>
                <div className="mt-3 divide-y divide-[#f5ede6]">
                  {recentOrders.slice(0, 4).map((o) => (
                    <button
                      key={o._id}
                      onClick={() => setActiveOrderId(o._id)}
                      className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-80"
                      type="button"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50 text-[11px] font-black text-[#fd761a]">
                        <PackageSearch size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-black text-[#3a1100] truncate">{o._id.slice(-8).toUpperCase()}</p>
                        <p className="text-[11px] font-semibold text-[#796d66]">{o.items?.[0]?.name || `${o.items?.length || 0} item(s)`}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-black text-[#fd761a]">Track &rarr;</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate("/orders")} className="mt-2 w-full rounded-xl border border-[#efe5dc] py-2.5 text-[12px] font-black text-[#5c514b] transition hover:bg-gray-50" type="button">
                  View All Orders
                </button>
              </motion.div>
            )}

            {recentLoading && !activeOrderId && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-[#efe5dc] bg-white/80 p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)]">
                <div className="h-4 w-24 rounded bg-[#f5ede6] animate-pulse" />
                <div className="mt-4 space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#f5ede6] animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 rounded bg-[#f5ede6] animate-pulse" />
                        <div className="h-2.5 w-32 rounded bg-[#f5ede6] animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (loading && !orderData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fcf8f4]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#fd761a]" />
          <p className="text-[13px] font-bold text-[#796d66]">Locating package...</p>
        </div>
      </main>
    );
  }

  const order = orderData;
  const items = order?.items || [];
  const address = order?.shippingAddress || {};
  const rawStatus = order?.status || "pending_approval";
  const activeIndex = Math.max(STEP_ORDER.indexOf(rawStatus), 0);
  const isCancelled = rawStatus === "cancelled" || rawStatus === "returned";
  const isDelivered = rawStatus === "delivered";

  const placedDate = order?.createdAt ? new Date(order.createdAt) : new Date();
  const estimatedDelivery = order?.estimatedDelivery ? new Date(order.estimatedDelivery) : new Date(Date.now() + 3 * 86400000);
  const statusHistory = order?.statusHistory || [];
  const delayHistory = order?.delayHistory || [];
  const trackingNumber = order?.trackingNumber || "";
  const courierName = order?.courierName || "Premium Ground";
  const orderTotal = order?.orderTotal || order?.totalAmount || 0;
  const displayId = order?.orderId || `#${(order?._id || "").slice(-6).toUpperCase()}`;

  // Resolve a per-stage timestamp: explicit field first, else statusHistory entry
  const explicitStageDate = {
    pending_approval: order?.createdAt,
    accepted: order?.acceptedAt,
    packed: order?.packedAt,
    shipped: order?.shippedAt,
    out_for_delivery: order?.outForDeliveryAt,
    delivered: order?.deliveredAt,
  };
  const getStageDate = (key) => {
    if (explicitStageDate[key]) return new Date(explicitStageDate[key]);
    const entry = [...statusHistory].reverse().find((h) => h.status === key);
    return entry?.changedAt ? new Date(entry.changedAt) : null;
  };

  const arrivalStatusLabel = isCancelled
    ? "Cancelled"
    : isDelivered
    ? "Delivered"
    : delayHistory.length > 0
    ? "Delayed"
    : rawStatus === "out_for_delivery"
    ? "Arriving Today"
    : "On Time";

  const addressLines = [
    address.streetAddress,
    [address.city, address.state, address.zipCode].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <main className="account-shell relative h-full overflow-hidden bg-[#fcf8f4] text-[#211713] antialiased">
      <div className="account-sidebar-fixed border-t border-[#efe5dc]"><Sidebar /></div>
      <section className="h-full overflow-y-auto border-t border-[#efe5dc]">
        <div className="mx-auto max-w-[1390px] md:pl-[var(--account-sidebar-width)]">
          <div className="px-5 pb-16 pt-8 sm:px-8 lg:px-10">

            {/* Header */}
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <button className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#796d66] transition hover:text-[#fd761a]" onClick={() => navigate("/orders")} type="button">
                  <ArrowLeft size={14} /> Back to Orders
                </button>
                <div className="mt-4 flex items-center gap-2">
                  <h1 className="font-serif text-[26px] font-black tracking-tight text-[#3a1100] sm:text-[32px]">
                    Order <span className="text-[#fd761a]">{displayId}</span>
                  </h1>
                  <button onClick={() => copyToClipboard(displayId)} className="text-gray-400 transition hover:text-gray-600" title="Copy Order ID" type="button">
                    {copiedId ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-[13px] font-semibold text-[#796d66]">
                  Placed on {formatDate(placedDate)} at {formatTime(placedDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form onSubmit={handleSearchOrder} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Track another order..."
                    value={inputOrderId}
                    onChange={(e) => setInputOrderId(e.target.value)}
                    className="h-10 w-[180px] rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12px] font-semibold text-[#211713] outline-none placeholder:text-[#c7bab0] transition-colors focus:border-[#fd761a] focus:bg-white sm:w-[220px]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputOrderId.trim()}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-[#fd761a] text-white shadow-sm transition hover:bg-[#e86710] disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <PackageSearch size={14} />}
                  </button>
                </form>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition hover:bg-gray-50"
                  type="button"
                >
                  <ShieldQuestion size={14} /> Help
                </button>
              </div>
            </header>

            {/* Enterprise 7-stage timeline */}
            {!isCancelled && <TrackingProgress activeIndex={activeIndex} isDelivered={isDelivered} getStageDate={getStageDate} />}
            {isCancelled && (
              <section className="mt-8 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-500 text-white">
                  <X size={20} />
                </span>
                <div>
                  <p className="font-serif text-[16px] font-black text-rose-700">This order was {rawStatus === "returned" ? "returned" : "cancelled"}</p>
                  {order?.cancellationReason && <p className="mt-1 text-[12.5px] font-semibold text-rose-600">{order.cancellationReason}</p>}
                </div>
              </section>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Estimated Arrival */}
              <ArrivalCard
                estimatedDelivery={estimatedDelivery}
                statusLabel={arrivalStatusLabel}
                courierName={courierName}
                trackingNumber={trackingNumber}
                copiedId={copiedId}
                onCopy={() => copyToClipboard(trackingNumber || displayId)}
              />

              {/* WhatsApp Updates */}
              <WhatsappCard
                enabled={whatsappEnabled}
                onToggle={() => setWhatsappEnabled((v) => !v)}
                onOpenChat={() => setIsChatOpen(true)}
                orderIdDisplay={displayId}
                status={STEP_META[rawStatus]?.title || rawStatus}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              {/* Order Items */}
              <section className="overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-[#f5eee8] bg-[#fdfcfb] px-6 py-4">
                  <h3 className="flex items-center gap-2 font-serif text-[17px] font-black text-[#3a1100]">
                    <CalendarIcon size={16} className="text-[#fd761a]" /> Order Items
                  </h3>
                  <span
                    className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      ["paid", "completed"].includes((order?.paymentStatus || "").toLowerCase())
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {order?.paymentStatus || "Pending"} · {formatCurrency(orderTotal)}
                  </span>
                </div>
                <div className="divide-y divide-[#f5eee8] px-6">
                  {items.map((item, idx) => {
                    const rs = item.returnStatus || "None";
                    const rsBadge = rs !== "None" ? (
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        rs === "Approved" || rs === "Refunded" ? "bg-emerald-100 text-emerald-700" :
                        rs === "Requested" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {rs === "Refunded" ? "Refunded" : rs}
                      </span>
                    ) : null;
                    const productName = item.productId?.name || item.name;
                    const productImage = item.productId?.images?.[0]?.url || item.image;
                    return (
                      <div key={idx} className="flex items-center gap-4 py-4">
                        <img className="h-16 w-16 shrink-0 rounded-xl border border-[#efe5dc] object-cover" src={productImage || fallbackImage} alt={productName} />
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[14px] font-bold text-[#3a1100]">
                            {productName}
                            {rsBadge}
                          </h4>
                          <p className="mt-1 text-[12px] font-medium text-[#796d66]">
                            {item.variantSize || "Standard"}
                            <span className="mx-1.5 rounded bg-[#f3ece5] px-1.5 py-0.5 text-[10.5px] font-bold text-[#5c514b]">Qty {item.quantity || 1}</span>
                          </p>
                        </div>
                        <strong className="shrink-0 text-[14px] font-black text-[#211713]">{formatCurrency((item.sellingPrice || 0) * (item.quantity || 1))}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-[#f5eee8] bg-[#fdfbf9]/60 px-6 py-5 text-[12.5px] sm:grid-cols-4">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[#9a8b82] text-[10px]">Order ID</p>
                    <p className="mt-1 font-black text-[#3a1100]">{displayId}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[#9a8b82] text-[10px]">Order Date</p>
                    <p className="mt-1 font-black text-[#3a1100]">{formatDateShort(placedDate)}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[#9a8b82] text-[10px]">Payment Method</p>
                    <p className="mt-1 font-black text-[#3a1100]">{order?.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[#9a8b82] text-[10px]">Subtotal / Shipping</p>
                    <p className="mt-1 font-black text-[#3a1100]">
                      {formatCurrency(order?.subtotal)} + {formatCurrency(order?.shippingAmount || order?.shippingCharges)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f5eee8] px-6 py-4">
                  <span className="text-[14.5px] font-black text-[#3a1100]">
                    Total: <span className="font-serif text-[#fd761a]">{formatCurrency(orderTotal)}</span>
                  </span>
                  <div className="flex gap-2.5">
                    {isDelivered && (
                      <a
                        href={`${api.defaults.baseURL}/orders/${order?._id}/invoice`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#cfc1b5] bg-white px-5 text-[12px] font-black text-[#5c514b] transition hover:border-[#fd761a] hover:text-[#fd761a]"
                      >
                        Invoice
                      </a>
                    )}
                    {!isCancelled && (
                      <button
                        onClick={async () => {
                          try {
                            await Promise.all(items.map((it) => (it.productId ? api.post("/cart/add", { productId: it.productId, quantity: it.quantity, variantSize: it.variantSize }) : Promise.resolve())));
                            navigate("/cart");
                          } catch {
                            navigate("/cart");
                          }
                        }}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#fd761a] px-5 text-[12px] font-black text-white shadow-sm transition hover:bg-[#e86710]"
                        type="button"
                      >
                        Buy Again
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Right column: address + help */}
              <aside className="space-y-6">
                <section className="rounded-2xl border border-[#efe5dc] bg-white p-6 shadow-sm">
                  <h3 className="flex items-center gap-2 font-serif text-[16px] font-black text-[#3a1100]">
                    <MapPin size={16} className="text-[#fd761a]" /> Delivery Address
                  </h3>
                  <div className="mt-4 rounded-xl border border-[#efe5dc] bg-[#faf7f4] p-4 text-[13px] leading-relaxed text-[#5c514b]">
                    <strong className="mb-1 block text-[#3a1100]">{address.fullName || "Customer"}</strong>
                    {addressLines.map((line, i) => (
                      <span className="block" key={i}>{line}</span>
                    ))}
                    {address.phoneNumber && <span className="mt-1.5 block font-semibold">Phone: {address.phoneNumber}</span>}
                  </div>
                </section>

                <HelpCard onOpenChat={() => setIsChatOpen(true)} onChangeInstructions={() => setIsInstructionModalOpen(true)} />
              </aside>
            </div>

            {/* Detailed vertical timeline */}
            <section className="mt-6 grid gap-6 rounded-2xl border border-[#efe5dc] bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[1fr_280px]">
              <div>
                <h3 className="font-serif text-[18px] font-black text-[#3a1100]">Detailed Tracking Timeline</h3>
                <div className="relative ml-3 mt-6 space-y-7 border-l border-[#efe5dc] pl-6">
                  {STEP_ORDER.map((key, idx) => {
                    const meta = STEP_META[key];
                    const Icon = meta.icon;
                    const isPast = idx <= activeIndex && !isCancelled;
                    const stageDate = getStageDate(key);
                    return (
                      <div className="relative" key={key}>
                        <span
                          className={`absolute -left-[33px] grid h-8 w-8 place-items-center rounded-full border-2 border-white shadow-sm ${
                            isPast ? "bg-[#fd761a] text-white" : "bg-[#f5eee8] text-[#c7bab0]"
                          }`}
                        >
                          <Icon size={14} />
                        </span>
                        <p className={`text-[13.5px] font-black ${isPast ? "text-[#3a1100]" : "text-[#c7bab0]"}`}>{meta.title}</p>
                        <p className={`mt-0.5 text-[12px] font-medium ${isPast ? "text-[#796d66]" : "text-[#c7bab0]"}`}>{meta.desc}</p>
                        <p className="mt-1 text-[11px] font-bold text-[#b0a399]">
                          {stageDate ? `${formatDateShort(stageDate)} · ${formatTime(stageDate)}` : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="hidden flex-col items-center justify-center rounded-2xl border border-[#efe5dc] bg-[#fdfbf9] p-6 text-center lg:flex">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#fff1e4] text-[#fd761a]">
                  <PackageCheck size={30} />
                </span>
                <h4 className="mt-4 font-serif text-[15px] font-black text-[#3a1100]">We care about your order!</h4>
                <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-[#9a8b82]">Sit back and relax! Your order is on the way to you.</p>
              </div>
            </section>

            {/* ── Past Orders ── */}
            {allOrders.filter((o) => o._id !== order?._id).length > 0 && (
              <section className="mt-8 overflow-hidden rounded-[20px] border border-[#efe5dc] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
                <div className="border-b border-[#f5eee8] px-6 py-4 sm:px-7">
                  <h2 className="font-serif text-[17px] font-black text-[#3a1100]">Past Orders</h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-[#9a8b82]">Click any order to view its tracking timeline</p>
                </div>
                <div className="divide-y divide-[#f5eee8]">
                  {allOrders
                    .filter((o) => o._id !== order?._id)
                    .slice(0, 10)
                    .map((o) => {
                      const d = new Date(o.createdAt);
                      const dStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      const st = o.status || "pending_approval";
                      const cfg = getStatusConfig(st);
                      const BadgeIcon = cfg.icon;
                      return (
                        <button
                          key={o._id}
                          onClick={() => { setActiveOrderId(o._id); setOrderData(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-[#faf7f4] sm:px-7"
                          type="button"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#efe5dc] bg-[#faf7f4]">
                            <img className="h-full w-full object-cover" src={o.items?.[0]?.image || fallbackImage} alt="" loading="lazy" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-black text-[#3a1100]">{o.items?.[0]?.name || "Order"}{o.items?.length > 1 ? ` +${o.items.length - 1} more` : ""}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-[#796d66]">{o.orderId || `#${(o._id || "").slice(-6).toUpperCase()}`} · {dStr}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${cfg.color}`}>
                            <BadgeIcon size={10} strokeWidth={2.5} /> {cfg.label}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </section>
            )}

          </div>
        </div>
      </section>

      <AnimatePresence>{isChatOpen && <TrackingIssuesChat onClose={() => setIsChatOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {isInstructionModalOpen && (
          <DeliveryInstructionModal canEdit={["pending_approval", "accepted", "packed"].includes(rawStatus)} onClose={() => setIsInstructionModalOpen(false)} />
        )}
      </AnimatePresence>
    </main>
  );
}

function TrackingProgress({ activeIndex, isDelivered, getStageDate }) {
  return (
    <section className="mt-8 overflow-hidden rounded-[20px] border border-[#efe5dc] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
      {/* Section header */}
      <div className="border-b border-[#f5eee8] px-7 py-4">
        <h2 className="font-serif text-[17px] font-black text-[#3a1100]">Tracking Timeline</h2>
        <p className="mt-0.5 text-[12px] font-semibold text-[#9a8b82]">Real-time order status updates</p>
      </div>

      <div className="px-6 py-8 sm:px-8">
        {/* ── Desktop: Horizontal 7-stage timeline ── */}
        <div className="relative hidden lg:block">
          {/* Background track */}
          <div className="absolute left-[4%] right-[4%] top-[22px] h-[3px] rounded-full bg-[#f0e8e1]" />
          {/* Progress track */}
          <motion.div
            className="absolute left-[4%] top-[22px] h-[3px] rounded-full bg-gradient-to-r from-[#fd761a] via-[#f59e0b] to-emerald-500"
            initial={{ width: "0%" }}
            animate={{ width: `${isDelivered ? 92 : Math.max((activeIndex / 6) * 88, 0)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          <div className="relative grid grid-cols-7">
            {STEP_ORDER.map((key, idx) => {
              const meta = STEP_META[key];
              const Icon = meta.icon;
              const isActive = idx === activeIndex && !isDelivered;
              const isComplete = idx < activeIndex || (idx === activeIndex && isDelivered);
              const stageDate = getStageDate(key);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.35 }}
                  className="relative z-10 flex flex-col items-center text-center"
                  key={key}
                >
                  <motion.span
                    animate={
                      isActive ? { scale: [1, 1.18, 1] } : {}
                    }
                    transition={{ duration: 0.8, repeat: isActive ? Infinity : 0, repeatDelay: 1.5 }}
                    className={`grid h-[46px] w-[46px] place-items-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
                      isComplete
                        ? key === "delivered"
                          ? "bg-emerald-500 text-white shadow-emerald-200/60"
                          : "bg-[#fd761a] text-white shadow-orange-200/60"
                        : isActive
                        ? "bg-[#fd761a] text-white shadow-[0_4px_16px_rgba(253,118,26,0.4)] ring-[6px] ring-[#fd761a]/15"
                        : "bg-[#f0e8e1] text-[#c7bab0]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={isComplete || isActive ? 2.5 : 1.8} />
                  </motion.span>
                  <div className="mt-3 space-y-0.5">
                    <p className={`text-[12px] font-black tracking-tight ${isComplete || isActive ? "text-[#3a1100]" : "text-[#b0a399]"}`}>
                      {meta.title}
                    </p>
                    <p className={`mx-auto max-w-[100px] text-[9.5px] font-semibold leading-tight ${isComplete || isActive ? "text-[#796d66]" : "text-[#c7bab0]"}`}>
                      {meta.desc}
                    </p>
                    <p className="mt-1 text-[9px] font-bold text-[#b0a399]">
                      {stageDate ? `${formatDateShort(stageDate)}, ${formatTime(stageDate)}` : "—"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: Vertical timeline with connecting lines ── */}
        <div className="relative lg:hidden">
          {STEP_ORDER.map((key, idx) => {
            const meta = STEP_META[key];
            const Icon = meta.icon;
            const isActive = idx === activeIndex && !isDelivered;
            const isComplete = idx < activeIndex || (idx === activeIndex && isDelivered);
            const isLast = idx === STEP_ORDER.length - 1;
            const stageDate = getStageDate(key);
            return (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="relative flex gap-4 pb-6"
                key={key}
              >
                {/* Connecting line (except last) */}
                {!isLast && (
                  <div className="absolute left-[19px] top-[42px] h-[calc(100%_-_12px)] w-[2px]">
                    <div className={`h-full w-full rounded-full transition-colors duration-500 ${isComplete ? "bg-[#fd761a]" : "bg-[#f0e8e1]"}`} />
                  </div>
                )}

                {/* Circle */}
                <span
                  className={`relative z-10 grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.04)] ${
                    isComplete
                      ? key === "delivered"
                        ? "bg-emerald-500 text-white shadow-emerald-200/60"
                        : "bg-[#fd761a] text-white shadow-orange-200/60"
                      : isActive
                      ? "bg-[#fd761a] text-white shadow-[0_4px_12px_rgba(253,118,26,0.35)] ring-[5px] ring-[#fd761a]/12"
                      : "bg-[#f0e8e1] text-[#c7bab0]"
                  }`}
                >
                  <Icon size={16} strokeWidth={isComplete || isActive ? 2.5 : 1.8} />
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-1.5">
                  <div className="flex items-center gap-2.5">
                    <p className={`text-[13px] font-black ${isComplete || isActive ? "text-[#3a1100]" : "text-[#b0a399]"}`}>
                      {meta.title}
                    </p>
                    {isActive && (
                      <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#fd761a]">
                        Current
                      </span>
                    )}
                  </div>
                  <p className={`mt-0.5 text-[11px] font-semibold leading-snug ${isComplete || isActive ? "text-[#796d66]" : "text-[#c7bab0]"}`}>
                    {meta.desc}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-[#b0a399]">
                    {stageDate ? `${formatDateShort(stageDate)}, ${formatTime(stageDate)}` : "—"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MiniCalendar({ date }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="w-[210px] shrink-0 rounded-xl bg-white/95 p-3 text-[#3a1100] shadow-lg">
      <div className="flex items-center justify-between px-1">
        <ChevronLeft size={13} className="text-[#c7bab0]" />
        <span className="text-[11px] font-black">{monthLabel}</span>
        <ChevronRight size={13} className="text-[#c7bab0]" />
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[9px] font-bold text-[#b0a399]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {cells.map((day, i) => (
          <span
            key={i}
            className={`flex h-5 w-5 items-center justify-center justify-self-center rounded-full text-[10px] font-bold ${
              day === date.getDate() ? "bg-[#fd761a] text-white" : day ? "text-[#5c514b]" : ""
            }`}
          >
            {day || ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function ArrivalCard({ estimatedDelivery, statusLabel, courierName, trackingNumber, copiedId, onCopy }) {
  const badgeColor =
    statusLabel === "Delayed" ? "bg-amber-500" : statusLabel === "Cancelled" ? "bg-rose-500" : statusLabel === "Delivered" ? "bg-emerald-600" : "bg-emerald-500";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#521b04] bg-[#3a1100] p-6 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#fd761a]/10 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#dfc8ba]">Estimated Arrival</p>
          <h2 className="mt-2 font-serif text-[26px] font-black tracking-tight">{formatDate(estimatedDelivery)}</h2>
          <p className="mt-1 text-[12px] font-bold text-[#dfc8ba]">by {estimatedDelivery.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>

          <span className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white ${badgeColor}`}>
            {statusLabel}
          </span>

          <p className="mt-4 flex items-center gap-1.5 text-[12px] font-bold text-[#dfc8ba]">
            <Truck size={13} /> via {courierName} · 2–3 business days
          </p>

          {trackingNumber && (
            <button onClick={onCopy} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-[11.5px] font-bold transition hover:bg-white/15" type="button">
              Tracking: <strong className="select-all">{trackingNumber}</strong>
              {copiedId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          )}
        </div>
        <MiniCalendar date={estimatedDelivery} />
      </div>
    </section>
  );
}

function WhatsappCard({ enabled, onToggle, onOpenChat, orderIdDisplay, status }) {
  return (
    <section className="flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white shadow-md">
            <MessageSquare size={18} />
          </span>
          <div>
            <h4 className="text-[14px] font-black text-emerald-900">WhatsApp Updates</h4>
            <p className="mt-0.5 text-[11.5px] font-medium text-emerald-700">Real-time shipping notifications</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${enabled ? "bg-emerald-600 text-white" : "bg-gray-300 text-gray-700"}`}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Phone illustration built with CSS, populated with real order data */}
      <div className="mx-auto mt-5 w-[190px] rounded-[22px] border-[6px] border-[#0b1410] bg-[#e5ddd5] p-2 shadow-xl">
        <div className="flex items-center gap-1.5 rounded-t-lg bg-emerald-700 px-2 py-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-emerald-700"><MessageSquare size={10} /></span>
          <span className="text-[9px] font-bold text-white">Machinichi</span>
        </div>
        <div className="space-y-1.5 px-1 py-2">
          <div className="ml-4 rounded-lg rounded-tl-none bg-white px-2 py-1.5 text-[8px] font-semibold leading-snug text-[#333]">
            Hi! Your Order {orderIdDisplay} is now <strong>{status}</strong>.
          </div>
          <div className="mr-4 rounded-lg rounded-tr-none bg-emerald-200 px-2 py-1.5 text-right text-[8px] font-semibold leading-snug text-[#1a3c2e]">
            Track your order anytime here.
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-emerald-200/60 pt-4">
        <span className="text-[12.5px] font-bold text-emerald-800">{enabled ? "Receive live updates" : "Updates paused"}</span>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggle}
            type="button"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              enabled ? "bg-emerald-600" : "bg-gray-300"
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
          <button onClick={onOpenChat} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-emerald-700" type="button">
            View Chat
          </button>
        </div>
      </div>
    </section>
  );
}

function HelpCard({ onOpenChat, onChangeInstructions }) {
  const [openIdx, setOpenIdx] = useState(null);
  const items = [
    { label: "Tracking Issues", icon: Headphones, onClick: onOpenChat, body: "Chat with our support team about a delayed or missing shipment." },
    { label: "Change Delivery Instructions", icon: MapPin, onClick: onChangeInstructions, body: "Update delivery notes, preferred time slot, or an alternate phone number." },
    { label: "Returns & Refund Policy", icon: Undo2, onClick: () => window.open("/refund-policy", "_blank"), body: "Review our returns window and refund process." },
  ];

  return (
    <section className="rounded-2xl border border-[#efe5dc] bg-white p-6 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a8b82]">Need Help?</p>
      <div className="mt-3 divide-y divide-[#f5eee8]">
        {items.map(({ label, icon: Icon, onClick, body }, idx) => (
          <div key={idx}>
            <button
              className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[13px] font-black text-[#5c514b] transition hover:text-[#fd761a]"
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              type="button"
            >
              <span className="flex items-center gap-3">
                <Icon size={15} className="text-gray-400" /> {label}
              </span>
              <ChevronDown size={15} className={`text-gray-400 transition-transform ${openIdx === idx ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {openIdx === idx && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pb-4 pl-7 pr-2 text-[12px] font-medium leading-relaxed text-[#796d66]">
                    {body}
                    <button onClick={onClick} className="mt-2 block text-[11.5px] font-black text-[#fd761a] hover:underline" type="button">
                      Open →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#efe5dc] bg-[#fffcf9] p-3.5 text-[12px] font-bold text-[#796d66]">
        <Clock3 size={15} className="text-[#fd761a]" /> Support available daily, 9 AM – 8 PM
      </div>
    </section>
  );
}

function TrackingIssuesChat({ onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "support-welcome", sender: "support", text: "Hello! Machinichi support assistant here. Let us know if you have any questions or delays regarding your shipment." },
  ]);
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: "user", text: trimmed },
      { id: `support-${Date.now()}`, sender: "support", text: "Got it. We will coordinate with our ground logistical partner and update you as soon as possible." },
    ]);
    setMessage("");
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#21150f]/50 px-4 py-5 backdrop-blur-[4px] sm:items-center">
      <motion.section initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="flex max-h-[82vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#efe5dc] bg-[#fffaf5] shadow-2xl">
        <header className="flex items-center justify-between gap-4 bg-[#3a1100] px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fd761a]"><Headphones size={16} /></span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-black">Tracking Assistance</h3>
              <p className="text-[10px] font-semibold text-[#dfc8ba]">Customer Care Agent</p>
            </div>
          </div>
          <button aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m) => (
            <div className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`} key={m.id}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] font-semibold leading-relaxed ${m.sender === "user" ? "bg-[#fd761a] text-white shadow-sm" : "border border-[#efe5dc] bg-white text-[#3a1100] shadow-sm"}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <form className="border-t border-[#efe5dc] bg-white p-4" onSubmit={handleSubmit}>
          <div className="flex items-end gap-2.5">
            <textarea
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-4 py-2.5 text-[13px] font-medium outline-none placeholder:text-[#c7bab0] focus:border-[#fd761a] focus:bg-white"
              id="tracking-issue-message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={1}
              value={message}
            />
            <button aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#3a1100] text-white transition hover:bg-[#fd761a]" type="submit">
              <Send size={15} />
            </button>
          </div>
        </form>
      </motion.section>
    </motion.div>
  );
}

function DeliveryInstructionModal({ canEdit, onClose }) {
  const [showToast, setShowToast] = useState(false);
  const handleSave = (e) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onClose();
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#21150f]/50 px-4 py-5 backdrop-blur-[4px] sm:items-center">
      <motion.section initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a8b82]">Preferences</p>
            <h2 className="mt-1 font-serif text-[22px] font-black text-[#3a1100]">Shipping Instructions</h2>
          </div>
          <button aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </header>
        <div className="space-y-5 px-6 py-6">
          <div className={`flex gap-3 rounded-xl border p-4 text-[12.5px] font-bold leading-relaxed ${canEdit ? "border-emerald-200 bg-emerald-50/50 text-emerald-800" : "border-rose-200 bg-rose-50/40 text-rose-800"}`}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>Note: Delivery instructions can only be modified while the order is Pending, Confirmed, or Packed.</p>
          </div>
          <form className="grid gap-4" onSubmit={handleSave}>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#9a8b82]" htmlFor="delivery-notes">Delivery Note</label>
              <textarea
                className="mt-2 min-h-[80px] w-full resize-none rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-4 py-3 text-[13px] font-medium outline-none placeholder:text-[#c7bab0] focus:border-[#fd761a] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canEdit}
                id="delivery-notes"
                placeholder="Example: Leave package with the security gate guardian or call on arrival..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#9a8b82]" htmlFor="preferred-time">Preferred Delivery Time Slot</label>
                <select className="mt-2 h-11 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-4 text-[13px] font-semibold text-[#211713] outline-none focus:border-[#fd761a] disabled:opacity-60" disabled={!canEdit} id="preferred-time">
                  <option>Anytime (Recommended)</option>
                  <option>Morning (9 AM – 12 PM)</option>
                  <option>Afternoon (12 PM – 4 PM)</option>
                  <option>Evening (4 PM – 8 PM)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#9a8b82]" htmlFor="alternate-phone">Alternate Phone Number</label>
                <input className="mt-2 h-11 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-4 text-[13px] font-medium outline-none focus:border-[#fd761a] disabled:opacity-60" disabled={!canEdit} id="alternate-phone" placeholder="e.g. 9876543210" type="tel" />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2.5 border-t border-[#f5eee8] pt-4 sm:flex-row sm:justify-end">
              <button className="h-11 rounded-xl border border-[#efe5dc] bg-white px-5 text-[12px] font-black text-[#5c514b] transition hover:bg-gray-50" onClick={onClose} type="button">Close</button>
              <button className="h-11 rounded-xl bg-[#3a1100] px-6 text-[12px] font-black text-white shadow-sm transition hover:bg-[#fd761a] disabled:cursor-not-allowed disabled:opacity-50" disabled={!canEdit} type="submit">Save Preferences</button>
            </div>
          </form>
          {showToast && (
            <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 text-center text-[12.5px] font-bold text-emerald-700">Preferences updated successfully!</div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

export default Trackorder;
