import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Loader2,
  MoreHorizontal,
  Package,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Truck,
  Undo2,
  X,
  XCircle,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import Sidebar from "../components/Sidebar";

const filters = ["All", "Ongoing", "Completed", "Cancelled"];

const statusConfig = {
  delivered: { color: "text-emerald-700 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", label: "Delivered", icon: CheckCircle2 },
  shipped: { color: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500", label: "Shipped", icon: Truck },
  in_transit: { color: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500", label: "In Transit", icon: Truck },
  out_for_delivery: { color: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500", label: "Out For Delivery", icon: Truck },
  cancelled: { color: "text-rose-700 bg-rose-50 border-rose-200", dot: "bg-rose-500", label: "Cancelled", icon: XCircle },
  returned: { color: "text-violet-700 bg-violet-50 border-violet-200", dot: "bg-violet-500", label: "Returned", icon: Undo2 },
  pending_approval: { color: "text-orange-700 bg-orange-50 border-orange-200", dot: "bg-orange-500", label: "Processing", icon: Clock },
  accepted: { color: "text-orange-700 bg-orange-50 border-orange-200", dot: "bg-orange-500", label: "Processing", icon: Clock },
  packed: { color: "text-orange-700 bg-orange-50 border-orange-200", dot: "bg-orange-500", label: "Processing", icon: Clock },
  delayed: { color: "text-rose-700 bg-rose-50 border-rose-200", dot: "bg-rose-500", label: "Delayed", icon: AlertCircle },
};

const getStatusConfig = (s) => statusConfig[s] || { color: "text-gray-600 bg-gray-50 border-gray-200", dot: "bg-gray-400", label: s, icon: Package };

const ACTIVE_STATUSES = ["accepted", "packed", "shipped", "in_transit", "out_for_delivery", "pending_approval"];
const TERMINAL_STATUSES = ["delivered", "cancelled", "returned"];
const CANCELLABLE_STATUSES = ["pending_approval", "accepted", "packed"];

const MACHINE_TO_DISPLAY = {
  pending_approval: "Pending", accepted: "Confirmed",
  packed: "Packed", shipped: "Shipped",
  in_transit: "In Transit", out_for_delivery: "Out For Delivery",
  delivered: "Delivered", cancelled: "Cancelled", returned: "Returned",
  delayed: "Delayed",
};

function StatusBadge({ status }) {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon || Package;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide ${cfg.color}`}>
      <Icon size={12} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// Three-stage mini timeline: Placed → Shipped → Delivered
function MiniTimeline({ status, placedDate, shippedDate, deliveredDate }) {
  const isCancelled = status === "cancelled" || status === "returned";
  const shippedDone = ["shipped", "in_transit", "out_for_delivery", "delivered"].includes(status);
  const deliveredDone = status === "delivered";

  let s2 = "pending", s3 = "pending";
  if (status === "returned") {
    s2 = "complete"; s3 = "complete";
  } else if (isCancelled) {
    s2 = shippedDone ? "complete" : "cancelled";
  } else if (deliveredDone) {
    s2 = "complete"; s3 = "complete";
  } else if (shippedDone) {
    s2 = "complete";
  }

  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  const Node = ({ state, label, date, icon: Icon }) => (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.span
        className={`grid h-10 w-10 place-items-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${
          state === "complete" ? "bg-emerald-500 text-white shadow-emerald-200/60" :
          state === "cancelled" ? "bg-rose-500 text-white shadow-rose-200/60" :
          "border-2 border-[#e2d6cb] bg-white text-[#c7bab0]"
        }`}
        animate={state === "complete" ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {state === "complete" || state === "cancelled" ? (
          state === "complete" ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />
        ) : (
          Icon
        )}
      </motion.span>
      <p className={`mt-1.5 text-[11.5px] font-black tracking-tight ${state === "complete" ? "text-emerald-700" : state === "cancelled" ? "text-rose-600" : "text-[#b0a399]"}`}>
        {label}
      </p>
      <p className="mt-0.5 text-[9px] font-semibold text-[#c7bab0]">{date}</p>
    </motion.div>
  );

  return (
    <div className="flex w-full max-w-[340px] items-center">
      <Node state="complete" label="Placed" date={fmt(placedDate)} icon={<Package size={14} />} />
      <motion.div
        className={`mx-1 mt-5 h-[3px] flex-1 rounded-full transition-colors duration-500 ${
          s2 === "complete" ? "bg-emerald-400" : s2 === "cancelled" ? "bg-rose-400" : "bg-[#e9ddd1]"
        }`}
        animate={{ backgroundColor: s2 === "complete" ? "#34d399" : s2 === "cancelled" ? "#fb7185" : "#e9ddd1" }}
        transition={{ duration: 0.5 }}
      />
      <Node state={s2} label="Shipped" date={s2 !== "pending" ? fmt(shippedDate) : "—"} icon={<Truck size={14} />} />
      <motion.div
        className={`mx-1 mt-5 h-[3px] flex-1 rounded-full transition-colors duration-500 ${
          s3 === "complete" ? "bg-emerald-400" : "bg-[#e9ddd1]"
        }`}
        animate={{ backgroundColor: s3 === "complete" ? "#34d399" : "#e9ddd1" }}
        transition={{ duration: 0.5 }}
      />
      <Node state={s3} label={isCancelled ? "Refund" : "Delivered"} date={s3 === "complete" ? fmt(deliveredDate) : "—"} icon={isCancelled ? <Undo2 size={14} /> : <CheckCircle2 size={14} />} />
    </div>
  );
}

function Order() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [stats, setStats] = useState({ total: 0, ongoing: 0, completed: 0, cancelled: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Debounce search 500ms before firing the backend request
  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery(searchTerm.trim());
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get("/orders/my-orders", { params: { limit: 1 } });
      if (data.success) {
        const total = data.pagination?.total || data.data?.length || 0;
        const { data: full } = await api.get("/orders/my-orders", { params: { limit: total > 0 ? Math.min(total, 200) : 10 } });
        const all = full.data || [];
        setStats({
          total: total,
          ongoing: all.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
          completed: all.filter((o) => o.status === "delivered").length,
          cancelled: all.filter((o) => o.status === "cancelled" || o.status === "returned").length,
        });
      }
    } catch (e) {
      console.error("Stats fetch failed", e);
    }
    setStatsLoading(false);
  };

  const fetchOrders = useCallback(async (p = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: p, limit: 10 };
      if (activeFilter === "Completed") params.status = "delivered";
      else if (activeFilter === "Cancelled") params.status = "cancelled";
      if (query) params.search = query;
      const { data } = await api.get("/orders/my-orders", { params });
      if (data.success) {
        let list = data.data || [];
        if (activeFilter === "Ongoing") {
          list = list.filter((o) => ACTIVE_STATUSES.includes(o.status));
        }
        setOrders(list);
        setPagination(data.pagination || null);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
      setOrders([]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, query]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  const changeFilter = (f) => {
    setActiveFilter(f);
    setPage(1);
  };

  const handleAction = (order) => {
    sessionStorage.setItem("machinichiLastOrder", JSON.stringify(order));
    navigate("/trackorder", { state: order });
  };

  const handleReorder = async (order) => {
    try {
      const promises = (order.items || []).map((item) =>
        item.productId
          ? api.post("/cart/add", { productId: item.productId, quantity: item.quantity, variantSize: item.variantSize })
          : Promise.resolve()
      );
      await Promise.all(promises);
      navigate("/cart");
    } catch (err) {
      console.error("Reorder failed", err);
      navigate("/cart");
    }
  };

  const handleCancelOrder = async (order, reason) => {
    setCancelTarget(null);
    try {
      const { data } = await api.put(`/orders/cancel/${order._id}`, { reason });
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, status: "cancelled", orderStatus: "Cancelled", cancellationReason: reason } : o))
        );
        fetchStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const { data } = await api.get(`/orders/${orderId}/invoice`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Failed to download invoice. Please try again later.");
    }
  };

  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statCards = useMemo(
    () => [
      { label: "Total Orders", val: stats.total, icon: ShoppingBag, gradient: "from-orange-500 to-amber-500", bg: "bg-orange-50" },
      { label: "Ongoing", val: stats.ongoing, icon: Clock, gradient: "from-blue-500 to-indigo-500", bg: "bg-blue-50" },
      { label: "Completed", val: stats.completed, icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-50" },
      { label: "Cancelled", val: stats.cancelled, icon: XCircle, gradient: "from-rose-500 to-pink-500", bg: "bg-rose-50" },
    ],
    [stats]
  );

  return (
    <main className="account-shell relative h-full overflow-hidden bg-[#fcf8f4] text-[#211713] antialiased" onClick={() => setOpenMenuId(null)}>
      <div className="account-sidebar-fixed border-t border-[#efe5dc]"><Sidebar /></div>
      <section className="h-full overflow-y-auto border-t border-[#efe5dc]">
        <div className="mx-auto max-w-[1390px] md:pl-[var(--account-sidebar-width)]">
          <div className="px-5 pb-16 pt-7 sm:px-8 lg:px-[60px] lg:pb-[50px] lg:pt-[40px]">

            {/* Header */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-[32px] font-black tracking-tight text-[#3a1100] sm:text-[38px]">My Orders</h1>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-[#796d66]">Track, manage and review all your purchases</p>
              </div>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/product")}
                className="inline-flex h-11 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#fd761a] to-[#e86710] px-6 text-[13px] font-black text-white shadow-[0_4px_16px_rgba(253,118,26,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(253,118,26,0.35)]"
                type="button"
              >
                <ShoppingBag size={15} strokeWidth={2.5} /> Continue Shopping
              </motion.button>
            </div>

            {/* Statistics Cards */}
            <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
              {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                    className={`group relative overflow-hidden rounded-[20px] border border-[#efe5dc] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(0,0,0,0.07)]`}
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.05] blur-3xl transition-all duration-500 group-hover:scale-150" />
                    <div className="relative z-10 flex items-center gap-4">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                        <Icon size={22} strokeWidth={2.2} />
                      </span>
                      <div>
                        <motion.p
                          className="font-serif text-[26px] font-black leading-none tracking-tight text-[#3a1100]"
                          key={stat.val}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {statsLoading ? <Loader2 className="animate-spin text-gray-300" size={20} /> : stat.val}
                        </motion.p>
                        <p className="mt-1.5 text-[12px] font-bold text-[#9a8b82]">{stat.label}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Search + Filters */}
            <div className="mt-8 flex flex-col gap-4 rounded-[20px] border border-[#efe5dc] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b0a399]" />
                <input
                  aria-label="Search orders"
                  className="h-12 w-full rounded-2xl border border-[#e5d8cd] bg-[#fdfbf9] pl-12 pr-10 text-[13.5px] font-semibold text-[#211713] outline-none placeholder:text-[#b0a399] transition-colors focus:border-[#fd761a] focus:bg-white focus:shadow-[0_0_0_4px_rgba(253,118,26,0.06)]"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Order ID, Product Name or Brand..."
                  type="text"
                  value={searchTerm}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0a399] transition hover:text-[#796d66]" type="button">
                    <X size={17} />
                  </button>
                )}
              </div>

              <div className="relative flex flex-wrap gap-1.5 rounded-2xl border border-[#efe5dc] bg-[#fcf9f6] p-1.5">
                {filters.map((f) => (
                  <button
                    className={`relative rounded-xl px-5 py-2.5 text-[12.5px] font-black tracking-wide transition-all duration-200 ${
                      f === activeFilter
                        ? "bg-[#3a1100] text-white shadow-sm"
                        : "text-[#6b625c] hover:bg-[#f3ece5]/70 hover:text-[#211713]"
                    }`}
                    key={f}
                    onClick={() => changeFilter(f)}
                    type="button"
                  >
                    {f === activeFilter && (
                      <motion.span
                        layoutId="activeFilter"
                        className="absolute inset-0 rounded-xl bg-[#3a1100]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{f}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Feed */}
            <div className="mt-6 space-y-6">
              {loading ? (
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse rounded-[20px] border border-[#efe5dc] bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-28 rounded bg-gray-200" />
                          <div className="h-7 w-7 rounded-lg bg-gray-100" />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-3.5 w-24 rounded bg-gray-100" />
                          <div className="h-7 w-28 rounded-full bg-gray-200" />
                        </div>
                      </div>
                      <div className="mt-5 flex gap-5 border-y border-[#f5eee8] py-5">
                        <div className="h-24 w-24 shrink-0 rounded-2xl bg-gray-200" />
                        <div className="flex flex-1 flex-col justify-center gap-3">
                          <div className="h-5 w-3/5 rounded bg-gray-200" />
                          <div className="h-3.5 w-1/3 rounded bg-gray-100" />
                          <div className="h-3.5 w-1/4 rounded bg-gray-100" />
                        </div>
                        <div className="hidden shrink-0 flex-col items-end justify-center lg:flex">
                          <div className="h-3 w-12 rounded bg-gray-100" />
                          <div className="mt-1.5 h-6 w-20 rounded bg-gray-200" />
                          <div className="mt-2 h-5 w-14 rounded-full bg-gray-100" />
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-center gap-10">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="h-10 w-10 rounded-full bg-gray-200" />
                          <div className="h-3 w-12 rounded bg-gray-100" />
                        </div>
                        <div className="mb-4 h-1 flex-1 rounded bg-gray-100" />
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="h-10 w-10 rounded-full bg-gray-200" />
                          <div className="h-3 w-12 rounded bg-gray-100" />
                        </div>
                        <div className="mb-4 h-1 flex-1 rounded bg-gray-100" />
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="h-10 w-10 rounded-full bg-gray-200" />
                          <div className="h-3 w-12 rounded bg-gray-100" />
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <div className="h-3.5 w-32 rounded bg-gray-100" />
                        <div className="flex gap-2">
                          <div className="h-9 w-28 rounded-xl bg-gray-100" />
                          <div className="h-9 w-24 rounded-xl bg-gray-100" />
                          <div className="h-9 w-28 rounded-xl bg-gray-100" />
                          <div className="h-9 w-9 rounded-xl bg-gray-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 px-6 py-5 text-[14px] font-bold text-rose-700">
                  <AlertCircle size={18} /> {error}
                </div>
              ) : orders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[20px] border border-[#efe5dc] bg-white px-8 py-24 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                >
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50 text-[#fd761a] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)]">
                    <ShoppingBag size={36} strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-6 font-serif text-[22px] font-black text-[#3a1100]">
                    {query ? "No matching orders" : "No orders yet"}
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-[13.5px] font-medium leading-relaxed text-[#796d66]">
                    {query ? "We couldn't find any orders matching your search. Try a different keyword or phrase." : "You haven't placed any orders yet. Start exploring our catalog!"}
                  </p>
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#fd761a] to-[#e86710] px-7 text-[13.5px] font-black text-white shadow-[0_4px_16px_rgba(253,118,26,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(253,118,26,0.35)]"
                    onClick={() => navigate("/product")}
                    type="button"
                  >
                    <ShoppingBag size={16} /> {query ? "Browse Products" : "Start Shopping"}
                  </motion.button>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {orders.map((order) => {
                    const status = order.status || "pending_approval";
                    const items = order.items || [];
                    const orderTotal = order.orderTotal || order.totalAmount || 0;
                    const date = new Date(order.createdAt);
                    const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    const displayId = order.orderId || `#${(order._id || "").slice(-6).toUpperCase()}`;
                    const firstItem = items[0] || {};
                    const extraCount = items.length - 1;

                    return (
                      <motion.article
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.3 }}
                        key={order._id || order.orderId}
                        className="group overflow-hidden rounded-[20px] border border-[#efe5dc] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)]"
                      >
                        {/* ── Top bar: Order ID + Date + Status ── */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f5eee8] bg-[#fdfcfb] px-6 py-4 sm:px-7">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#b0a399]">Order</span>
                              <span className="text-[16px] font-black tracking-tight text-[#fd761a]">{displayId}</span>
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => copyToClipboard(order.orderId || order._id)}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[#efe5dc] bg-white text-gray-400 transition hover:border-[#fd761a] hover:text-[#fd761a]"
                              title="Copy Order ID"
                              type="button"
                            >
                              {copiedId === (order.orderId || order._id) ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </motion.button>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#b0a399]">
                              <Calendar size={13} /> {status === "delivered" && order.deliveredAt ? <>Ordered {dateStr} · Delivered {new Date(order.deliveredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</> : `Ordered ${dateStr}`}
                            </span>
                            <StatusBadge status={status} />
                          </div>
                        </div>

                        {/* ── Body: Product + Total ── */}
                        <div className="flex flex-col gap-6 px-6 py-6 sm:px-7">
                          <div className="flex items-center gap-5">
                            {/* Product image — large */}
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-[#efe5dc] bg-[#faf7f4] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                              <img
                                alt={firstItem.productId?.name || firstItem.name}
                                className="h-full w-full object-cover"
                                src={firstItem.productId?.images?.[0]?.url || firstItem.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=80"}
                                loading="lazy"
                              />
                            </div>

                            {/* Product details */}
                            <div className="min-w-0 flex-1">
                              <p
                                className="cursor-pointer truncate text-[15px] font-black text-[#3a1100] transition hover:text-[#fd761a]"
                                onClick={() => navigate(firstItem.productId?.slug ? `/product/${firstItem.productId.slug}` : "/product")}
                              >
                                {firstItem.productId?.name || firstItem.name}
                                {extraCount > 0 && <span className="ml-2 font-semibold text-[#9a8b82]">+{extraCount} more</span>}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-bold text-[#9a8b82]">
                                {firstItem.variantSize && <span className="rounded-lg bg-[#f3ece5] px-2 py-0.5 text-[12px] text-[#fd761a]">{firstItem.variantSize}</span>}
                                <span>Qty: {firstItem.quantity || 1}</span>
                                <span>₹{(firstItem.sellingPrice || 0).toLocaleString("en-IN")}</span>
                              </div>
                              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#c7bab0] sm:hidden">
                                <Calendar size={11} /> {dateStr}, {timeStr}
                              </p>
                            </div>

                            {/* Total — right column */}
                            <div className="hidden shrink-0 flex-col items-end sm:flex">
                              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b0a399]">Total</span>
                              <p className="mt-1 font-serif text-[20px] font-black leading-none text-[#3a1100]">₹{orderTotal.toLocaleString("en-IN")}</p>
                              {order.paymentStatus && (
                                <span
                                  className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                    ["paid", "completed"].includes(order.paymentStatus.toLowerCase())
                                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border border-rose-200 bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {order.paymentStatus}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ── Timeline ── */}
                          <div className="flex justify-center border-t border-[#f5eee8] pt-5">
                            <MiniTimeline status={status} placedDate={order.createdAt} shippedDate={order.shippedAt} deliveredDate={order.deliveredAt} />
                          </div>
                        </div>

                        {/* ── Bottom bar: Payment info + Actions ── */}
                        <div className="border-t border-[#f5eee8] bg-[#faf7f4]/50 px-6 py-4 sm:px-7">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[11.5px] font-bold text-[#9a8b82]">Payment:</span>
                              <span className="text-[12px] font-black text-[#3a1100]">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</span>
                              {order.paymentStatus && (
                                <span
                                  className={`ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider sm:hidden ${
                                    ["paid", "completed"].includes(order.paymentStatus.toLowerCase())
                                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border border-rose-200 bg-rose-50 text-rose-700"
                                  }`}
                                >
                                  {order.paymentStatus}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <motion.button
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.96 }}
                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#cfc1b5] bg-white px-4 text-[12px] font-black text-[#5c514b] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:border-[#fd761a] hover:text-[#fd761a] hover:shadow-[0_4px_12px_rgba(253,118,26,0.12)] active:translate-y-0"
                                onClick={() => handleAction(order)}
                                type="button"
                              >
                                <Truck size={13} /> {["delivered", "cancelled", "returned"].includes(status) ? "View Details" : "Track Order"}
                              </motion.button>

                              {status === "delivered" && order.invoiceUrl && (
                                <motion.button
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.96 }}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#cfc1b5] bg-white px-4 text-[12px] font-black text-[#5c514b] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:border-emerald-400 hover:text-emerald-600 hover:shadow-[0_4px_12px_rgba(16,185,129,0.12)] active:translate-y-0"
                                  onClick={() => handleDownloadInvoice(order._id || order.orderId)}
                                  type="button"
                                >
                                  <FileText size={13} /> Invoice
                                </motion.button>
                              )}

                              {status === "delivered" && (
                                <motion.button
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.96 }}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#cfc1b5] bg-white px-4 text-[12px] font-black text-[#5c514b] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:border-amber-400 hover:text-amber-600 hover:shadow-[0_4px_12px_rgba(251,191,36,0.12)] active:translate-y-0"
                                  onClick={() => navigate(firstItem.productId?.slug ? `/product/${firstItem.productId.slug}` : "/product")}
                                  type="button"
                                >
                                  <Star size={13} className="text-amber-500" /> Review
                                </motion.button>
                              )}

                              {!["cancelled", "returned"].includes(status) && (
                                <motion.button
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.96 }}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#fd761a] to-[#e86710] px-4 text-[12px] font-black text-white shadow-[0_2px_8px_rgba(253,118,26,0.2)] transition-all hover:shadow-[0_6px_16px_rgba(253,118,26,0.3)] active:translate-y-0"
                                  onClick={() => handleReorder(order)}
                                  type="button"
                                >
                                  <RotateCcw size={13} /> Buy Again
                                </motion.button>
                              )}

                              {/* Overflow menu */}
                              <div className="relative">
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  className="grid h-9 w-9 place-items-center rounded-xl border border-[#cfc1b5] bg-white text-[#5c514b] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:border-[#fd761a] hover:text-[#fd761a] hover:shadow-[0_4px_12px_rgba(253,118,26,0.12)] active:translate-y-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === order._id ? null : order._id);
                                  }}
                                  type="button"
                                >
                                  <MoreHorizontal size={16} />
                                </motion.button>
                                {openMenuId === order._id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-[#efe5dc] bg-white py-1.5 shadow-xl"
                                  >
                                    {CANCELLABLE_STATUSES.includes(status) && (
                                      <button
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-50"
                                        onClick={() => { setCancelTarget(order); setOpenMenuId(null); }}
                                        type="button"
                                      >
                                        <X size={14} /> Cancel Order
                                      </button>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>

                          {status === "cancelled" && order.cancellationReason && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 text-[12px] font-bold text-rose-700"
                            >
                              <Info size={15} className="mt-0.5 shrink-0" />
                              <p>Cancelled: {order.cancellationReason}</p>
                            </motion.div>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <nav aria-label="Order pages" className="mt-10 flex items-center justify-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                    page === 1 ? "cursor-not-allowed border-[#efe5dc] text-[#d0c4ba]" : "border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] hover:shadow-[0_4px_12px_rgba(253,118,26,0.1)]"
                  }`}
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  <ChevronLeft size={16} />
                </motion.button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    className={`flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-4 text-[13px] font-black tracking-tight transition-all ${
                      p === page ? "border-[#3a1100] bg-[#3a1100] text-white shadow-[0_4px_12px_rgba(58,17,0,0.15)]" : "border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] hover:shadow-[0_4px_12px_rgba(253,118,26,0.1)]"
                    }`}
                    key={p}
                    onClick={() => setPage(p)}
                    type="button"
                  >
                    {p}
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                    page === pagination.totalPages ? "cursor-not-allowed border-[#efe5dc] text-[#d0c4ba]" : "border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] hover:shadow-[0_4px_12px_rgba(253,118,26,0.1)]"
                  }`}
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  <ChevronRight size={16} />
                </motion.button>
              </nav>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {cancelTarget && <CancelOrderModal order={cancelTarget} onClose={() => setCancelTarget(null)} onSubmit={(reason) => handleCancelOrder(cancelTarget, reason)} />}
      </AnimatePresence>
    </main>
  );
}

function CancelOrderModal({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
  };

  const displayId = order.orderId || `#${(order._id || "").slice(-6).toUpperCase()}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 px-4 py-5 backdrop-blur-[4px]">
      <motion.section initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-rose-100 bg-rose-50 text-rose-500">
              <AlertCircle size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-black text-[#3a1100]">Cancel Order</h2>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9a8b82]">{displayId}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
            <X size={16} />
          </button>
        </header>
        <div className="px-6 py-5">
          <p className="text-[13px] font-medium leading-relaxed text-[#6b625c]">
            This will request a cancellation of your order and restore inventory stock. Cancellations are only permitted prior to package dispatch.
          </p>
          <div className="mt-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a8b82]">Cancellation Reason</label>
            <textarea
              className="mt-2 min-h-[90px] w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-4 py-3 text-[13px] font-medium outline-none placeholder:text-[#c7bab0] transition-colors focus:border-[#fd761a] focus:bg-white"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you are requesting cancellation..."
            />
          </div>
          <div className="mt-5 flex justify-end gap-2.5">
            <button className="h-10 rounded-xl border border-[#efe5dc] bg-white px-5 text-[12px] font-black text-[#5c514b] transition hover:bg-gray-50" onClick={onClose} type="button">
              Keep Order
            </button>
            <button
              className="h-10 rounded-xl bg-rose-600 px-6 text-[12px] font-black text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!reason.trim() || submitting}
              onClick={handleSubmit}
              type="button"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : "Confirm Cancel"}
            </button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

export default Order;
