import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Check, ChevronRight, CircleDollarSign, Download, Eye,
  Filter, Hourglass, Loader2, MoreVertical, ReceiptText, RefreshCw,
  Search, SortAsc, X, CheckCircle2, Clock, PackageX,
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "../components/AdminLayout";

const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://machinichi-backend.onrender.com/api" : "http://localhost:3000/api"), withCredentials: true });
API.interceptors.request.use((c) => {
  const t = localStorage.getItem("accessToken");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const STATUS_STYLES = {
  pending:      "bg-amber-50 text-amber-700 border border-amber-200",
  approved:     "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected:     "bg-rose-50 text-rose-700 border border-rose-200",
  processing:   "bg-blue-50 text-blue-700 border border-blue-100",
  refunded:     "bg-emerald-50 text-emerald-800 border border-emerald-200",
  escalated:    "bg-orange-50 text-orange-700 border border-orange-100",
  cancelled:    "bg-gray-100 text-gray-600 border border-gray-200",
};

const STATUS_LABELS = {
  pending: "Pending", approved: "Approved", rejected: "Rejected",
  processing: "Processing", refunded: "Refunded", escalated: "Escalated", cancelled: "Cancelled",
};

const REASON_COLORS = {
  "Quality Issue": "bg-[#fd761a]",
  "Late Delivery":  "bg-[#3a1100]",
  "Damaged Item":   "bg-rose-600",
  "Wrong Item":     "bg-gray-500",
  "Other":          "bg-slate-400",
};

const INR = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "—";

function StatusBadge({ status }) {
  const key = status?.toLowerCase() || "pending";
  const style = STATUS_STYLES[key] || "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[key] || status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{label}
    </span>
  );
}

const REASON_DISTRIBUTION = [
  { label: "Quality Issues", width: "84%", color: "bg-[#fd761a]" },
  { label: "Late Delivery",  width: "62%", color: "bg-[#3a1100]" },
  { label: "Damaged Item",   width: "46%", color: "bg-rose-600" },
  { label: "Wrong Item",     width: "24%", color: "bg-gray-400" },
];

const RETURN_TIMELINE = [
  { title: "Request Received",   icon: ReceiptText },
  { title: "Pickup / Drop-off",  icon: PackageX },
  { title: "Item Inspected",     icon: Eye },
  { title: "Refund Processed",   icon: CircleDollarSign },
];

export default function ReturnRequest({ onAdminLogout }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await API.get("/returns/admin/all");
      if (data.success) setReturns(data.data || []);
      else throw new Error(data.message);
    } catch (e) { setError(e.response?.data?.message || "Failed to load return requests"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  // Auto-select first on load
  useEffect(() => {
    if (returns.length > 0 && !selectedId) setSelectedId(returns[0]._id);
  }, [returns]);

  // 20s polling
  const fetchRef = useRef(fetchReturns); fetchRef.current = fetchReturns;
  useEffect(() => {
    const t = setInterval(() => fetchRef.current(), 20000);
    return () => clearInterval(t);
  }, []);

  const updateStatus = async (id, status, refundAmount) => {
    setActionLoading(true);
    try {
      const { data } = await API.put(`/returns/status/${id}`, { status, refundAmount });
      if (data.success) {
        setReturns(prev => prev.map(r => r._id === id ? { ...r, status, ...data.data } : r));
      }
    } catch (e) { alert(e.response?.data?.message || "Update failed"); }
    setActionLoading(false);
  };

  const exportCSV = () => {
    const rows = filtered.map(r => [
      r.returnId || r._id, r.userId?.name || "Customer", r.orderId?.orderId || "",
      r.reason || "", r.status, r.refundAmount || 0
    ].map(c => `"${c}"`).join(","));
    const csv = ["Return ID,Customer,Order,Reason,Status,Amount", ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "machinichi-returns.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns
      .filter(r => {
        const matchSearch = !q ||
          (r.returnId || "").toLowerCase().includes(q) ||
          (r.userId?.name || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" || r.status?.toLowerCase() === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt || 0), db = new Date(b.createdAt || 0);
        return sortDir === "desc" ? db - da : da - db;
      });
  }, [returns, search, statusFilter, sortDir]);

  const selectedReturn = filtered.find(r => r._id === selectedId) || filtered[0];

  // Metrics from live data
  const metrics = useMemo(() => ({
    total: returns.length,
    pending: returns.filter(r => r.status === "pending").length,
    refunded: returns.filter(r => r.status === "refunded").length,
    totalRefund: returns.filter(r => r.status === "refunded").reduce((s, r) => s + (r.refundAmount || 0), 0),
  }), [returns]);

  const TIMELINE_STATUSES = ["pending", "processing", "approved", "refunded"];
  const currentStep = selectedReturn ? TIMELINE_STATUSES.indexOf(selectedReturn.status?.toLowerCase()) : 0;

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#faf9f6] text-[#21150f] px-5 py-8 sm:px-8 lg:px-10">

        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-[#3a1100] font-serif">Returns & Refunds</h1>
            <p className="mt-1.5 text-[13.5px] font-semibold text-[#796d66]">Review return requests, process refunds, and manage escalations</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={exportCSV} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12.5px] font-black text-[#5c514b] shadow-sm hover:bg-gray-50 transition" type="button">
              <Download size={14}/> Export CSV
            </button>
            <button onClick={fetchReturns} className="grid h-10 w-10 place-items-center rounded-xl border border-[#efe5dc] bg-white text-[#796d66] hover:bg-gray-50 transition" type="button">
              <RefreshCw size={14}/>
            </button>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
          {[
            { label:"Total Requests", val:metrics.total, icon:ReceiptText, color:"text-[#3a1100] bg-white border-[#efe5dc]" },
            { label:"Awaiting Review", val:metrics.pending, icon:Hourglass, color:"text-amber-700 bg-amber-50/40 border-amber-100" },
            { label:"Refunds Issued", val:metrics.refunded, icon:CircleDollarSign, color:"text-emerald-700 bg-emerald-50/40 border-emerald-100" },
            { label:"Total Refund Value", val:INR(metrics.totalRefund), icon:Eye, color:"text-[#fd761a] bg-orange-50/30 border-orange-100" },
          ].map((m, i) => {
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

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[13px] font-bold text-rose-700 flex items-center gap-2">
            <AlertTriangle size={14}/> {error}
          </div>
        )}

        {/* Main layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

          {/* Left: Table + Distribution */}
          <div className="space-y-5">
            {/* Filters Row */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#efe5dc] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8b82]"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, customer, reason..."
                  className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-10 pr-4 text-[13px] outline-none placeholder:text-[#9a8b82] focus:border-[#fd761a] transition"/>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={()=>setFilterOpen(o=>!o)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] hover:bg-white transition" type="button">
                    <Filter size={13}/> {STATUS_LABELS[statusFilter] || "All Statuses"}
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-xl border border-[#efe5dc] bg-white shadow-xl">
                      {["all","pending","processing","approved","refunded","escalated","rejected","cancelled"].map(s=>(
                        <button key={s} onClick={()=>{setStatusFilter(s);setFilterOpen(false);}} type="button"
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-[12px] font-black transition hover:bg-[#faf7f4] ${statusFilter===s?"text-[#fd761a]":"text-[#3a1100]"}`}>
                          {s==="all"?"All Statuses":(STATUS_LABELS[s]||s)}
                          {statusFilter===s&&<Check size={12} className="text-[#fd761a]"/>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={()=>setSortDir(d=>d==="desc"?"asc":"desc")} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] hover:bg-white transition" type="button">
                  <SortAsc size={13}/> {sortDir==="desc"?"Newest":"Oldest"}
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={28} className="animate-spin text-[#fd761a]"/>
                  <p className="text-[12.5px] font-bold text-[#796d66]">Loading requests...</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-[#efe5dc] bg-white px-8 py-16 text-center shadow-sm">
                <ReceiptText size={36} className="mx-auto text-[#c7bab0] mb-3"/>
                <p className="text-[15px] font-black text-[#3a1100] font-serif">No return requests</p>
                <p className="mt-1 text-[12.5px] text-[#796d66]">Adjust filters or search to find requests.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-[#faf8f5] text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] border-b border-[#efe5dc]">
                      <tr>
                        <th className="px-5 py-4">Return ID</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Reason</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Refund Amt</th>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5eee8] bg-white text-[13px]">
                      {filtered.map(r => {
                        const isActive = r._id === selectedReturn?._id;
                        return (
                          <tr key={r._id} onClick={()=>setSelectedId(r._id)}
                            className={`cursor-pointer transition ${isActive?"bg-orange-50/20":"hover:bg-[#fffcf9]/50"}`}>
                            <td className="px-5 py-4 font-black text-[#fd761a]">{r.returnId || r._id?.slice(-8).toUpperCase()}</td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-[#3a1100]">{r.userId?.name || "Customer"}</p>
                              <p className="text-[11px] text-[#9a8b82] mt-0.5">{r.userId?.email||""}</p>
                            </td>
                            <td className="px-5 py-4 text-[#5c514b]">{r.reason || "—"}</td>
                            <td className="px-5 py-4"><StatusBadge status={r.status}/></td>
                            <td className="px-5 py-4 font-black text-[#211713]">{r.refundAmount ? INR(r.refundAmount) : "—"}</td>
                            <td className="px-5 py-4 text-[12px] text-[#796d66]">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button onClick={()=>setSelectedId(r._id)} type="button"
                                className={`grid h-8 w-8 place-items-center rounded-lg border transition ${isActive?"border-[#fd761a] text-[#fd761a] bg-orange-50/30":"border-[#cfc1b5] text-[#796d66] hover:border-[#fd761a] hover:text-[#fd761a]"}`}>
                                <ChevronRight size={15}/>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reason Distribution */}
            <div className="rounded-2xl border border-[#efe5dc] bg-white p-5 shadow-sm">
              <h3 className="text-[14px] font-black text-[#3a1100] font-serif mb-4">Return Reason Distribution</h3>
              <div className="grid gap-5 md:grid-cols-[120px_1fr] md:items-center">
                <div className="relative h-[110px] w-[110px] rounded-full mx-auto md:mx-0"
                  style={{background:"conic-gradient(#fd761a 0 45%,#3a1100 45% 63%,#e11d48 63% 79%,#94a3b8 79% 100%)"}}>
                  <div className="absolute inset-[16px] grid place-items-center rounded-full bg-white text-[18px] font-black text-[#3a1100] font-serif">45%</div>
                </div>
                <div className="space-y-3">
                  {REASON_DISTRIBUTION.map(rd => (
                    <div key={rd.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-[11.5px] font-black text-[#3a1100]">
                          <span className={`h-2.5 w-2.5 rounded-full ${rd.color}`}/>
                          {rd.label}
                        </span>
                        <span className="text-[11px] font-bold text-[#796d66]">{rd.width}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#f0e9e2] overflow-hidden">
                        <div className={`h-full rounded-full ${rd.color} transition-all duration-700`} style={{width:rd.width}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Case Detail Panel */}
          <aside className="overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
            {!selectedReturn ? (
              <div className="flex items-center justify-center h-60 text-[#796d66]">
                <div className="text-center">
                  <ReceiptText size={32} className="mx-auto text-[#c7bab0] mb-2"/>
                  <p className="text-[13px] font-bold">Select a request to review</p>
                </div>
              </div>
            ) : (
              <>
                {/* Case Header */}
                <div className="bg-[#3a1100] text-white px-5 py-5 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#fd761a]/10 blur-2xl pointer-events-none"/>
                  <div className="flex items-start justify-between relative">
                    <div>
                      <span className="inline-flex rounded-lg bg-[#fd761a] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wide mb-3">
                        {selectedReturn.status === "escalated" ? "⚠ Escalated" : "Active Case"}
                      </span>
                      <h3 className="text-[17px] font-black font-serif">Return {selectedReturn.returnId || selectedReturn._id?.slice(-8).toUpperCase()}</h3>
                      <p className="mt-0.5 text-[12px] text-[#dfc8ba] font-semibold">{selectedReturn.userId?.name || "Customer"}</p>
                    </div>
                    <button onClick={fetchReturns} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition"><RefreshCw size={13}/></button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-b border-[#f5eee8] bg-[#fdfbf9] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">Processing Timeline</p>
                  <div className="space-y-3">
                    {RETURN_TIMELINE.map((step, idx) => {
                      const Icon = step.icon;
                      const done = idx < currentStep, active = idx === currentStep;
                      return (
                        <div key={step.title} className="flex items-center gap-3">
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black ${done?"bg-emerald-600 text-white":active?"bg-[#fd761a] text-white":"bg-[#f0e9e2] text-[#9a8b82]"}`}>
                            {done ? <Check size={11} strokeWidth={3}/> : idx+1}
                          </span>
                          <p className={`text-[12.5px] font-bold ${done?"text-emerald-700":active?"text-[#fd761a]":"text-[#9a8b82]"}`}>{step.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-4">
                  <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4 text-[12.5px] space-y-2">
                    {[
                      ["Order ID", selectedReturn.orderId?.orderId || "—"],
                      ["Reason", selectedReturn.reason || "—"],
                      ["Description", selectedReturn.description || "—"],
                      ["Requested Amount", selectedReturn.requestedAmount ? INR(selectedReturn.requestedAmount) : "—"],
                      ["Refund Amount", selectedReturn.refundAmount ? INR(selectedReturn.refundAmount) : "Pending"],
                    ].map(([k,v])=>(
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-[#796d66] font-medium shrink-0">{k}</span>
                        <span className="font-bold text-[#3a1100] text-right truncate max-w-[160px]">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div>
                    <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">Admin Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label:"Approve Refund", status:"approved",  cls:"bg-emerald-600 hover:bg-emerald-700 text-white" },
                        { label:"Reject Request", status:"rejected",  cls:"bg-rose-600 hover:bg-rose-700 text-white" },
                        { label:"Mark Refunded",  status:"refunded",  cls:"bg-[#3a1100] hover:bg-[#fd761a] text-white" },
                        { label:"Escalate Case",  status:"escalated", cls:"bg-orange-600 hover:bg-orange-700 text-white" },
                      ].map(btn=>(
                        <button key={btn.label} type="button" disabled={actionLoading || selectedReturn.status===btn.status}
                          onClick={()=>updateStatus(selectedReturn._id, btn.status, selectedReturn.requestedAmount)}
                          className={`h-10 rounded-xl text-[11.5px] font-black transition disabled:opacity-40 ${btn.cls}`}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>

        {/* Click outside to close filter */}
        {filterOpen && <div className="fixed inset-0 z-20" onClick={()=>setFilterOpen(false)}/>}
      </div>
    </AdminLayout>
  );
}
