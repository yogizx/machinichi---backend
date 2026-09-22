import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Ban, Check, ChevronLeft, ChevronRight, Clock, Download, Eye,
  FileText, Loader2, MoreVertical, Package, RefreshCw, Search, X,
  TrendingUp, ShoppingBag, AlertCircle, CheckCircle2,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import api from "../../services/api";
import AdminLayout from "../components/AdminLayout";
import {
  MACHINE_TO_DISPLAY, VALID_ACTIONS,
  StatusBadge, PaymentBadge, ActionMenu,
  CancelModal, DelayModal, InvoiceModal, OrderDetailModal,
} from "../components/OrderModals";

const TABS = ["All Orders","Pending","Confirmed","Packed","Shipped","In Transit","Out For Delivery","Delivered","Cancelled","Returned"];
const PER_PAGE = 15;

const TAB_TO_MACHINE = {
  "Pending":"pending_approval","Confirmed":"accepted","Packed":"packed",
  "Shipped":"shipped","In Transit":"in_transit","Out For Delivery":"out_for_delivery",
  "Delivered":"delivered","Cancelled":"cancelled","Returned":"returned",
};

export default function AdminOrders({ onAdminLogout }) {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const highlightParam = searchParams.get("highlight") || "";
  const initialLoadRef = useRef(true);
  const [activeTab, setActiveTab] = useState("All Orders");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [delayModal, setDelayModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [tabCounts, setTabCounts] = useState({});

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get("/orders/admin/status-counts");
      if (data.success) setTabCounts(data.data || {});
    } catch { /* non-critical */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/orders/admin/all", { params: { limit: 200, sort: "createdAt", order: "desc" } });
      if (data.success && data.data?.length) {
        const rawOrders = data.data;
        const customerStats = {};
        rawOrders.forEach(o => {
          const uid = o.userId?._id || '';
          if (uid) {
            if (!customerStats[uid]) customerStats[uid] = { orders: 0, spend: 0 };
            customerStats[uid].orders++;
            customerStats[uid].spend += (o.totalAmount || o.orderTotal || 0);
          }
        });
        setOrders(rawOrders.map(o => ({
          _id: o._id,
          _userId: o.userId?._id || '',
          id: o.orderId || o._id?.slice(-6).toUpperCase() || "",
          orderId: o.orderId,
          customer: o.shippingAddress?.fullName || o.userId?.name || "Customer",
          date: new Date(o.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),
          amount: (o.totalAmount||o.orderTotal||0).toLocaleString("en-IN"),
          rawAmount: o.totalAmount||o.orderTotal||0,
          payment: o.paymentMethod||o.paymentStatus||"N/A",
          paymentMethod: o.paymentMethod||'',
          status: MACHINE_TO_DISPLAY[o.status]||o.orderStatus||"Pending",
          machineStatus: o.status||"pending_approval",
          email: o.userId?.email||"",
          phone: o.shippingAddress?.phoneNumber||o.userId?.phone||"",
          items: o.items||[],
          statusHistory: o.statusHistory||[],
          delayHistory: o.delayHistory||[],
          trackingNumber: o.trackingNumber,
          courierName: o.courierName,
          shippingAddress: o.shippingAddress,
          shippingMethod: o.shippingMethod||'standard',
          couponCode: o.couponCode||'',
          scratchDiscount: o.scratchDiscount||null,
          promoDiscount: o.promoDiscount||null,
          subtotal: o.subtotal||0,
          totalDiscount: o.totalDiscount||0,
          shippingCharges: o.shippingCharges||o.shippingAmount||0,
          totalGst: o.totalGst||0,
          transactionId: o.razorpayPaymentId||"N/A",
          createdAt: o.createdAt,
          customerTotalOrders: customerStats[o.userId?._id || '']?.orders || 0,
          customerLifetimeSpend: customerStats[o.userId?._id || '']?.spend || 0,
        })));
      } else setOrders([]);
    } catch { setOrders([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); fetchCounts(); }, [fetchOrders, fetchCounts]);

  useEffect(() => {
    if (initialLoadRef.current && search.trim()) {
      const t = setTimeout(() => { initialLoadRef.current = false; }, 500);
      return () => clearTimeout(t);
    }
  }, [search]);

  // Silent 15s polling
  const fetchRef = useRef(fetchOrders); fetchRef.current = fetchOrders;
  useEffect(() => {
    const t = setInterval(() => fetchRef.current(), 15000);
    return () => clearInterval(t);
  }, []);

  const updateOrder = (id, updates) =>
    setOrders(prev => prev.map(o => o._id === id ? { ...o, ...updates } : o));

  const handleStatusUpdate = async (orderId, newStatus) => {
    setActionId(null);
    try {
      const { data } = await api.put(`/orders/status/${orderId}`, { status: newStatus });
      if (data.success) {
        updateOrder(orderId, { status: MACHINE_TO_DISPLAY[newStatus], machineStatus: newStatus, statusHistory: data.data?.statusHistory });
        fetchCounts();
      }
    } catch (err) { alert(err.response?.data?.message || "Update failed"); }
  };

  const handleCancel = async (orderId, reason, refundRequired) => {
    setCancelModal(null); setActionId(null);
    try {
      const { data } = await api.put(`/orders/cancel/${orderId}`, { reason, refundRequired });
      if (data.success) {
        updateOrder(orderId, { status: "Cancelled", machineStatus: "cancelled", statusHistory: data.data?.statusHistory });
        fetchCounts();
      }
    } catch (err) { alert(err.response?.data?.message || "Cancel failed"); }
  };

  const handleDelay = async (orderId, reason, expectedDate, customerNote) => {
    setDelayModal(null); setActionId(null);
    try {
      const { data } = await api.post(`/orders/delay/${orderId}`, { reason, expectedDate, customerNote });
      if (data.success) updateOrder(orderId, { delayHistory: data.data?.delayHistory });
    } catch (err) { alert(err.response?.data?.message || "Delay failed"); }
  };

  const exportCSV = () => {
    const rows = filtered.map(({ id, customer, date, amount, payment, status }) =>
      [id, customer, date, amount, payment, status].map(c => `"${String(c).replaceAll('"','""')}"`).join(",")
    );
    const csv = [["Order ID","Customer","Date","Amount","Payment","Status"].join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "machinichi-orders.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Metrics
  const metrics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.machineStatus === "pending_approval").length,
    delivered: orders.filter(o => o.machineStatus === "delivered").length,
    revenue: orders.filter(o => o.machineStatus === "delivered").reduce((s,o) => s + o.rawAmount, 0),
  }), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const machine = TAB_TO_MACHINE[activeTab];
    const skipSearchFilter = initialLoadRef.current && highlightParam && q;
    return orders.filter(o => {
      const matchTab = activeTab === "All Orders" || o.machineStatus === machine;
      const matchSearch = skipSearchFilter || !q
        || o.id.toLowerCase().includes(q)
        || o.customer.toLowerCase().includes(q)
        || o.email.toLowerCase().includes(q)
        || (o.items || []).some(
          (item) =>
            (item.name && item.name.toLowerCase().includes(q))
            || (item.productId?.name && item.productId.name.toLowerCase().includes(q))
            || (item.sku && item.sku.toLowerCase().includes(q)),
        );
      return matchTab && matchSearch;
    });
  }, [orders, activeTab, search, highlightParam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const showStart = filtered.length ? (safePage - 1) * PER_PAGE + 1 : 0;
  const showEnd = Math.min(safePage * PER_PAGE, filtered.length);

  const canDownload = (ms) => ["packed","shipped","in_transit","out_for_delivery","delivered"].includes(ms);

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#faf9f6] text-[#21150f] px-5 py-8 sm:px-8 lg:px-10">

        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-[#3a1100] font-serif">Order Management</h1>
            <p className="mt-1 text-[13.5px] font-semibold text-[#796d66]">Track and manage the full order lifecycle</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={exportCSV} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12.5px] font-black text-[#5c514b] shadow-sm hover:bg-gray-50 transition">
              <Download size={14}/> Export CSV
            </button>
            <button onClick={() => { fetchOrders(); fetchCounts(); }} className="grid h-10 w-10 place-items-center rounded-xl border border-[#efe5dc] bg-white text-[#796d66] hover:bg-gray-50 transition">
              <RefreshCw size={15}/>
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
          {[
            { label:"Total Orders", val:metrics.total, icon:ShoppingBag, color:"text-[#3a1100] bg-white border-[#efe5dc]" },
            { label:"Awaiting Action", val:metrics.pending, icon:AlertCircle, color:"text-amber-700 bg-amber-50/40 border-amber-100" },
            { label:"Delivered", val:metrics.delivered, icon:CheckCircle2, color:"text-emerald-700 bg-emerald-50/40 border-emerald-100" },
            { label:"Delivered Revenue", val:`₹${metrics.revenue.toLocaleString("en-IN")}`, icon:TrendingUp, color:"text-[#fd761a] bg-orange-50/30 border-orange-100" },
          ].map((m,i) => {
            const Icon = m.icon;
            return (
              <div key={i} className={`rounded-2xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] ${m.color}`}>
                <div className="flex justify-between items-center opacity-75">
                  <span className="text-[10.5px] font-black uppercase tracking-wider">{m.label}</span>
                  <Icon size={14}/>
                </div>
                <p className="mt-2.5 text-[22px] font-black font-serif sm:text-[26px]">{m.val}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs + Search */}
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[#efe5dc] bg-white p-4 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => {
              const count = tabCounts[tab];
              const active = activeTab === tab;
              return (
                <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }} type="button"
                  className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-black transition whitespace-nowrap ${
                    active ? "bg-[#3a1100] text-white shadow-sm" : "text-[#796d66] hover:bg-[#faf7f4] hover:text-[#3a1100]"
                  }`}>
                  {tab}
                  {typeof count === "number" && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-[#f3ece5] text-[#796d66]"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8b82]"/>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by Order ID, customer name, email..."
              className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-10 pr-4 text-[13px] outline-none placeholder:text-[#9a8b82] transition focus:border-[#fd761a] focus:bg-white"/>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={30} className="animate-spin text-[#fd761a]"/>
              <p className="text-[12.5px] font-bold text-[#796d66]">Loading orders...</p>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-[#efe5dc] bg-white px-8 py-20 text-center shadow-sm">
            <ShoppingBag size={40} className="mx-auto text-[#c7bab0] mb-4"/>
            <h3 className="text-[16px] font-black text-[#3a1100] font-serif">No orders found</h3>
            <p className="mt-1 text-[13px] text-[#796d66]">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#efe5dc] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead className="bg-[#faf8f5] text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] border-b border-[#efe5dc]">
                  <tr>
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">State</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5eee8] bg-white text-[13px]">
                  {visible.map(order => {
                    const isHighlighted = highlightParam
                      && order.id.toLowerCase() === highlightParam.toLowerCase();
                    return (
                    <tr key={order._id} className={`transition hover:bg-[#fffcf9]/60${isHighlighted ? " bg-[#fff3e6]" : ""}`}>
                      <td className="px-5 py-4 font-black text-[#fd761a]">{order.id}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#3a1100]">{order.customer}</p>
                        {order.email && <p className="text-[11px] text-[#9a8b82] mt-0.5">{order.email}</p>}
                      </td>
                      <td className="px-5 py-4 text-[#5c514b]">{order.date}</td>
                      <td className="px-5 py-4 font-black text-[#211713]">₹{order.amount}</td>
                      <td className="px-5 py-4"><PaymentBadge payment={order.payment}/></td>
                      <td className="px-5 py-4 text-[#5c514b] font-semibold">{order.shippingAddress?.state || "—"}</td>
                      <td className="px-5 py-4"><StatusBadge status={order.status}/></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          {canDownload(order.machineStatus) && (
                            <>
                              <button onClick={() => setInvoiceModal(order)} title="Invoice"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-[#cfc1b5] text-[#796d66] hover:text-[#fd761a] hover:border-[#fd761a] transition" type="button">
                                <FileText size={14}/>
                              </button>
                              <button title="Shipping Label" type="button"
                                onClick={async () => {
                                  try {
                                    const { data } = await api.get(`/orders/${order._id}/label`,{responseType:"blob"});
                                    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
                                    const a = document.createElement("a"); a.href=url; a.download=`label-${order.id}.pdf`; a.click();
                                    URL.revokeObjectURL(url);
                                  } catch(err) { alert(err.response?.data?.message||"Label download failed"); }
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-[#cfc1b5] text-[#796d66] hover:text-[#fd761a] hover:border-[#fd761a] transition">
                                <Package size={14}/>
                              </button>
                            </>
                          )}
                          <button onClick={() => setSelectedOrder(order)} title="View Details"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-[#cfc1b5] text-[#796d66] hover:text-[#fd761a] hover:border-[#fd761a] transition" type="button">
                            <Eye size={14}/>
                          </button>
                          <div className="relative">
                            <button onClick={() => setActionId(c => c === order._id ? null : order._id)} type="button"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[#cfc1b5] text-[#796d66] hover:text-[#fd761a] hover:border-[#fd761a] transition">
                              <MoreVertical size={14}/>
                            </button>
                            {actionId === order._id && (
                              <ActionMenu machineStatus={order.machineStatus} onAction={action => {
                                if (action === "cancel") setCancelModal(order);
                                else if (action === "delay") setDelayModal(order);
                                else handleStatusUpdate(order._id, action);
                              }}/>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f5eee8] bg-[#faf8f5] px-5 py-4">
              <p className="text-[12px] font-bold text-[#796d66]">Showing {showStart}–{showEnd} of {filtered.length} orders</p>
              <div className="flex items-center gap-1.5">
                <button disabled={safePage<=1} onClick={()=>setPage(p=>p-1)} type="button"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 hover:border-[#fd761a] transition">
                  <ChevronLeft size={15}/>
                </button>
                {Array.from({length:totalPages},(_,i)=>i+1).slice(Math.max(0,safePage-3),safePage+2).map(p=>(
                  <button key={p} onClick={()=>setPage(p)} type="button"
                    className={`h-9 min-w-[36px] rounded-lg text-[12.5px] font-black transition ${safePage===p?"bg-[#3a1100] text-white":"border border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a]"}`}>
                    {p}
                  </button>
                ))}
                <button disabled={safePage>=totalPages} onClick={()=>setPage(p=>p+1)} type="button"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 hover:border-[#fd761a] transition">
                  <ChevronRight size={15}/>
                </button>
              </div>
            </footer>
          </div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {cancelModal && <CancelModal order={cancelModal} onClose={()=>setCancelModal(null)} onSubmit={(r,rf)=>handleCancel(cancelModal._id,r,rf)}/>}
          {delayModal && <DelayModal order={delayModal} onClose={()=>setDelayModal(null)} onSubmit={(r,d,n)=>handleDelay(delayModal._id,r,d,n)}/>}
          {invoiceModal && <InvoiceModal order={invoiceModal} onClose={()=>setInvoiceModal(null)}/>}
          {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={()=>setSelectedOrder(null)} onStatusUpdate={handleStatusUpdate} onCancel={(id,reason,refund)=>handleCancel(id,reason,refund)}/>}
        </AnimatePresence>

        {/* Click outside to close action menu */}
        {actionId && <div className="fixed inset-0 z-20" onClick={()=>setActionId(null)}/>}
      </div>
    </AdminLayout>
  );
}
