import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Check, ChevronRight, CircleDollarSign, Download, Eye,
  Filter, Hourglass, Loader2, ReceiptText, RefreshCw,
  Search, SortAsc, CheckCircle2, X,
} from "lucide-react";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";

const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://machinichi-backend.onrender.com/api" : "http://localhost:3000/api"), withCredentials: true });
API.interceptors.request.use((c) => {
  const t = localStorage.getItem("accessToken");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

const STATUS_ALIAS = {
  Requested: "submitted", Processing: "under_review", Approved: "approved",
  Rejected: "rejected", Completed: "completed", Cancelled: "cancelled",
  pending: "submitted", processing: "under_review", approved: "approved",
  rejected: "rejected", refunded: "completed", escalated: "under_review",
  picked_up: "item_received", cancelled: "cancelled",
};
const canon = (s) => STATUS_ALIAS[s] || s || "submitted";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600 border border-gray-200",
  submitted: "bg-amber-50 text-amber-700 border border-amber-200",
  under_review: "bg-blue-50 text-blue-700 border border-blue-100",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border border-rose-200",
  pickup_scheduled: "bg-blue-50 text-blue-700 border border-blue-100",
  pickup_failed: "bg-rose-50 text-rose-700 border border-rose-200",
  item_received: "bg-blue-50 text-blue-700 border border-blue-100",
  inspection_completed: "bg-blue-50 text-blue-700 border border-blue-100",
  on_hold: "bg-amber-50 text-amber-700 border border-amber-200",
  refund_processing: "bg-blue-50 text-blue-700 border border-blue-100",
  refund_failed: "bg-rose-50 text-rose-700 border border-rose-200",
  completed: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  cancelled: "bg-gray-100 text-gray-600 border border-gray-200",
};

const STATUS_LABELS = {
  draft: "Draft", submitted: "Pending", under_review: "Under Review",
  approved: "Approved", rejected: "Rejected", pickup_scheduled: "Pickup Scheduled",
  pickup_failed: "Pickup Failed", item_received: "Item Received",
  inspection_completed: "Inspected", on_hold: "On Hold",
  refund_processing: "Resolution Processing", refund_failed: "Refund Pending",
  completed: "Completed", cancelled: "Cancelled",
};

const FILTER_OPTIONS = ["all", "submitted", "under_review", "approved", "pickup_scheduled", "pickup_failed", "item_received", "inspection_completed", "on_hold", "refund_processing", "refund_failed", "completed", "rejected", "cancelled"];

const TIMELINE_STEPS = ["Request", "Review", "Approved", "Pickup", "Received", "Inspected", "Resolved"];
const STEP_INDEX = {
  draft: 0, submitted: 0, under_review: 1, approved: 2,
  pickup_scheduled: 3, pickup_failed: 3, item_received: 4,
  inspection_completed: 5, on_hold: 5, refund_processing: 6,
  refund_failed: 6, completed: 6,
};

const INR = (v) => (v === undefined || v === null || v === "" ? "—" : `₹${Number(v).toLocaleString("en-IN")}`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function StatusBadge({ status }) {
  const key = canon(status);
  const style = STATUS_STYLES[key] || "bg-gray-100 text-gray-600 border border-gray-200";
  const label = STATUS_LABELS[key] || status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{label}
    </span>
  );
}

// Direct refund action — available once the admin has approved the return.
const REFUND_ACTION = {
  key: "refund-now",
  label: "Refund Amount",
  cls: "bg-emerald-600 hover:bg-emerald-700 text-white",
  endpoint: (id) => `/returns/${id}/refund`,
  fields: [
    { name: "amount", label: "Refund amount (₹)", type: "number", required: false },
    { name: "note", label: "Refund note (optional)", type: "text", required: false },
  ],
};

/* Per-status admin actions → { label, endpoint, fields } */
function actionsFor(status) {
  const c = canon(status);
  switch (c) {
    case "submitted":
      return [
        { key: "review", label: "Move to Review", cls: "bg-blue-600 hover:bg-blue-700 text-white", endpoint: (id) => `/returns/${id}/review`, fields: [] },
        { key: "approve", label: "Approve + Issue RMA", cls: "bg-emerald-600 hover:bg-emerald-700 text-white", endpoint: (id) => `/returns/${id}/approve`, fields: [{ name: "comment", label: "Approval note", type: "text", required: false }, { name: "refundAmount", label: "Override refund amount (optional)", type: "number", required: false }] },
        { key: "reject", label: "Reject", cls: "bg-rose-600 hover:bg-rose-700 text-white", endpoint: (id) => `/returns/${id}/reject`, fields: [{ name: "reason", label: "Rejection reason (shown to customer)", type: "text", required: true }] },
      ];
    case "under_review":
      return [
        { key: "approve", label: "Approve + Issue RMA", cls: "bg-emerald-600 hover:bg-emerald-700 text-white", endpoint: (id) => `/returns/${id}/approve`, fields: [{ name: "comment", label: "Approval note", type: "text", required: false }, { name: "refundAmount", label: "Override refund amount (optional)", type: "number", required: false }] },
        { key: "reject", label: "Reject", cls: "bg-rose-600 hover:bg-rose-700 text-white", endpoint: (id) => `/returns/${id}/reject`, fields: [{ name: "reason", label: "Rejection reason (shown to customer)", type: "text", required: true }] },
      ];
    case "approved":
      return [
        REFUND_ACTION,
        { key: "pickup", label: "Schedule Pickup", cls: "bg-blue-600 hover:bg-blue-700 text-white", endpoint: (id) => `/returns/${id}/schedule-pickup`, fields: [{ name: "courier", label: "Courier", type: "text", required: false }, { name: "trackingNumber", label: "Tracking / AWB number", type: "text", required: false }, { name: "pickupDate", label: "Pickup date", type: "date", required: false }, { name: "pickupMode", label: "Mode (pickup / dropoff)", type: "text", required: false }, { name: "instructions", label: "Instructions for customer", type: "text", required: false }] },
        { key: "receipt", label: "Record Receipt", cls: "bg-[#3a1100] hover:bg-[#fd761a] text-white", endpoint: (id) => `/returns/${id}/confirm-receipt`, fields: [{ name: "notes", label: "Receipt notes", type: "text", required: false }] },
      ];
    case "pickup_scheduled":
      return [
        REFUND_ACTION,
        { key: "receipt", label: "Confirm Item Received", cls: "bg-[#3a1100] hover:bg-[#fd761a] text-white", endpoint: (id) => `/returns/${id}/confirm-receipt`, fields: [{ name: "notes", label: "Receipt notes", type: "text", required: false }] },
        { key: "pickupFailed", label: "Mark Pickup Failed", cls: "bg-orange-600 hover:bg-orange-700 text-white", endpoint: (id) => `/returns/${id}/pickup-failed`, fields: [{ name: "reason", label: "Failure reason", type: "text", required: true }, { name: "rescheduleDate", label: "Reschedule date (optional)", type: "date", required: false }] },
      ];
    case "pickup_failed":
      return [
        { key: "pickup", label: "Reschedule / Drop-off", cls: "bg-blue-600 hover:bg-blue-700 text-white", endpoint: (id) => `/returns/${id}/schedule-pickup`, fields: [{ name: "courier", label: "Courier", type: "text", required: false }, { name: "pickupDate", label: "New pickup date", type: "date", required: false }, { name: "pickupMode", label: "Mode (pickup / dropoff)", type: "text", required: false }, { name: "instructions", label: "Instructions", type: "text", required: false }] },
      ];
    case "item_received":
      return [
        REFUND_ACTION,
        { key: "inspect", label: "Inspect Item", cls: "bg-blue-600 hover:bg-blue-700 text-white", endpoint: (id) => `/returns/${id}/inspect`, fields: [{ name: "condition", label: "Condition (excellent/good/damaged/defective/wrong/missing_parts/used)", type: "text", required: true }, { name: "quantityReceived", label: "Quantity received", type: "number", required: true }, { name: "disposition", label: "Disposition (restock/quarantine/repair/write_off)", type: "text", required: true }, { name: "passed", label: "Passed? (true/false)", type: "text", required: true }, { name: "findings", label: "Findings", type: "text", required: false }] },
      ];
    case "inspection_completed":
      return [
        REFUND_ACTION,
        { key: "reject", label: "Reject Refund", cls: "bg-rose-600 hover:bg-rose-700 text-white", endpoint: (id) => `/returns/${id}/reject`, fields: [{ name: "reason", label: "Rejection reason", type: "text", required: true }] },
      ];
    case "on_hold":
      return [
        REFUND_ACTION,
        { key: "inspect", label: "Re-inspect", cls: "bg-blue-600 hover:bg-blue-700 text-white", endpoint: (id) => `/returns/${id}/inspect`, fields: [{ name: "condition", label: "Condition", type: "text", required: true }, { name: "quantityReceived", label: "Quantity received", type: "number", required: true }, { name: "disposition", label: "Disposition", type: "text", required: true }, { name: "passed", label: "Passed? (true/false)", type: "text", required: true }, { name: "findings", label: "Findings", type: "text", required: false }] },
        { key: "reject", label: "Reject", cls: "bg-rose-600 hover:bg-rose-700 text-white", endpoint: (id) => `/returns/${id}/reject`, fields: [{ name: "reason", label: "Rejection reason", type: "text", required: true }] },
      ];
    case "refund_processing":
      return [
        { key: "complete", label: "Complete Return", cls: "bg-emerald-600 hover:bg-emerald-700 text-white", endpoint: (id) => `/returns/${id}/complete`, fields: [{ name: "comment", label: "Closing note", type: "text", required: false }] },
        { key: "refundFailed", label: "Mark Refund Failed", cls: "bg-rose-600 hover:bg-rose-700 text-white", endpoint: (id) => `/returns/${id}/refund-failed`, fields: [{ name: "reason", label: "Failure reason (stays refund-pending)", type: "text", required: true }] },
      ];
    case "refund_failed":
      return [
        REFUND_ACTION,
        { key: "complete", label: "Force Complete", cls: "bg-emerald-600 hover:bg-emerald-700 text-white", endpoint: (id) => `/returns/${id}/complete`, fields: [{ name: "comment", label: "Closing note", type: "text", required: false }] },
      ];
    default:
      return [];
  }
}

export default function ReturnRequest({ onAdminLogout }) {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [formError, setFormError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalReturn, setModalReturn] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Explicit View action: select the row AND open the full case file modal.
  const openViewModal = async (r) => {
    setSelectedId(r._id);
    setActiveAction(null);
    setFormError("");
    setModalReturn(r);
    setModalLoading(true);
    try {
      const { data } = await API.get(`/returns/${r._id}`);
      setModalReturn(data.data || r);
    } catch {
      setModalReturn(r);
    }
    setModalLoading(false);
  };

  const fetchReturns = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { limit: 100 };
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await API.get("/returns/admin/all", { params });
      if (data.success) setReturns(data.data || []);
      else throw new Error(data.message);
      try {
        const { data: s } = await API.get("/returns/admin/stats");
        if (s.success) setStats(s.data);
      } catch { /* stats optional */ }
    } catch (e) { setError(e.response?.data?.message || "Failed to load return requests"); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  useEffect(() => {
    if (returns.length > 0 && !selectedId) setSelectedId(returns[0]._id);
  }, [returns, selectedId]);

  const fetchRef = useRef(fetchReturns); fetchRef.current = fetchReturns;
  useEffect(() => {
    const t = setInterval(() => fetchRef.current(), 20000);
    return () => clearInterval(t);
  }, []);

  const selectedReturn = useMemo(
    () => returns.find((r) => r._id === selectedId) || returns[0] || null,
    [returns, selectedId]
  );

  useEffect(() => {
    if (!selectedReturn) { setDetail(null); return; }
    setDetailLoading(true);
    API.get(`/returns/${selectedReturn._id}`)
      .then(({ data }) => setDetail(data.data || selectedReturn))
      .catch(() => setDetail(selectedReturn))
      .finally(() => setDetailLoading(false));
  }, [selectedReturn?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async () => {
    if (!activeAction || !selectedReturn) return;
    for (const f of activeAction.fields) {
      if (f.required && !String(formValues[f.name] ?? "").trim()) {
        setFormError(`"${f.label}" is required.`);
        return;
      }
    }
    setFormError("");
    setActionLoading(true);
    try {
      const payload = {};
      for (const f of activeAction.fields) {
        let v = formValues[f.name];
        if (v === undefined || v === "") continue;
        if (f.type === "number") v = Number(v);
        if (f.name === "passed") v = String(v).toLowerCase() === "true";
        if (f.name === "quantityReceived") v = parseInt(v, 10);
        payload[f.name] = v;
      }
      const { data } = await API.post(activeAction.endpoint(selectedReturn._id), payload);
      if (data.success || data.data) {
        const updated = data.data || data;
        setReturns((prev) => prev.map((r) => (r._id === selectedReturn._id ? { ...r, ...updated } : r)));
        setDetail((prev) => (prev ? { ...prev, ...updated } : updated));
        setActiveAction(null);
        setFormValues({});
      }
    } catch (e) { setFormError(e.response?.data?.message || "Action failed"); }
    setActionLoading(false);
  };

  const addNote = async () => {
    if (!noteText.trim() || !selectedReturn) return;
    setActionLoading(true);
    try {
      const { data } = await API.post(`/returns/${selectedReturn._id}/notes`, { note: noteText.trim() });
      if (data.data) {
        setReturns((prev) => prev.map((r) => (r._id === selectedReturn._id ? { ...r, ...data.data } : r)));
        setDetail((prev) => (prev ? { ...prev, ...data.data } : data.data));
        setNoteText("");
      }
    } catch (e) { alert(e.response?.data?.message || "Failed to add note"); }
    setActionLoading(false);
  };

  const exportCSV = () => {
    const rows = filtered.map((r) => [
      r.returnId || r._id, r.rmaNumber || "", r.userId?.name || "Customer", r.orderId?.orderId || "",
      (r.items || []).map((i) => `${i.name} x${i.returnQuantity}`).join("; ") || r.reason || "",
      canon(r.status), r.refundAmount || 0,
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = ["Return ID,RMA,Customer,Order,Items,Status,Amount", ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "machinichi-returns.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns
      .filter((r) => {
        const matchSearch = !q ||
          (r.returnId || "").toLowerCase().includes(q) ||
          (r.rmaNumber || "").toLowerCase().includes(q) ||
          (r.userId?.name || "").toLowerCase().includes(q) ||
          (r.reason || "").toLowerCase().includes(q);
        return matchSearch;
      })
      .sort((a, b) => {
        const da = new Date(a.createdAt || 0), db = new Date(b.createdAt || 0);
        return sortDir === "desc" ? db - da : da - db;
      });
  }, [returns, search, sortDir]);

  const metrics = useMemo(() => ({
    total: stats?.total ?? returns.length,
    awaiting: returns.filter((r) => ["submitted", "under_review"].includes(canon(r.status))).length,
    resolved: returns.filter((r) => canon(r.status) === "completed").length,
    totalRefund: returns.filter((r) => canon(r.status) === "completed").reduce((s, r) => s + (r.refundAmount || 0), 0),
    sla: stats?.slaBreaches ?? 0,
  }), [returns, stats]);

  // Return Reason Distribution — computed ONLY from live return data.
  // Empty state shows "No data yet" — never hardcoded percentages.
  const reasonDist = useMemo(() => {
    const counts = {};
    for (const r of returns) {
      for (const i of r.items || []) counts[i.reason || r.reason || "Other"] = (counts[i.reason || r.reason || "Other"] || 0) + 1;
      if (!(r.items || []).length && r.reason) counts[r.reason] = (counts[r.reason] || 0) + 1;
    }
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    const colors = ["bg-[#fd761a]", "bg-[#3a1100]", "bg-rose-600", "bg-gray-400", "bg-blue-500", "bg-emerald-600"];
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count], i) => ({
      label, count, pct: Math.round((count / total) * 100), color: colors[i % colors.length],
    }));
  }, [returns]);

  const view = detail || selectedReturn;
  const currentStep = view ? (STEP_INDEX[canon(view.status)] ?? 0) : 0;
  const isTerminal = view ? ["rejected", "cancelled", "completed"].includes(canon(view.status)) : false;
  const availableActions = view ? actionsFor(view.status) : [];

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen overflow-x-clip bg-[#faf9f6] text-[#21150f] px-5 py-8 sm:px-8 lg:px-10">

        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-[#3a1100] font-serif">Returns & Refunds</h1>
            <p className="mt-1.5 text-[13.5px] font-semibold text-[#796d66]">Validate, approve, track and close every return with a full audit trail</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={exportCSV} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12.5px] font-black text-[#5c514b] shadow-sm hover:bg-gray-50 transition" type="button">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={fetchReturns} className="grid h-10 w-10 place-items-center rounded-xl border border-[#efe5dc] bg-white text-[#796d66] hover:bg-gray-50 transition" type="button">
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
          {[
            { label: "Total Requests", val: metrics.total, icon: ReceiptText },
            { label: "Awaiting Review", val: metrics.awaiting, icon: Hourglass },
            { label: "Resolved", val: metrics.resolved, icon: CircleDollarSign },
            { label: "SLA Breaches", val: metrics.sla, icon: AlertTriangle },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="rounded-2xl border border-[#efe5dc] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
                <div className="flex justify-between items-center opacity-75">
                  <span className="text-[10.5px] font-black uppercase tracking-wider">{m.label}</span>
                  <Icon size={14} />
                </div>
                <p className="mt-2.5 text-[22px] font-black font-serif sm:text-[26px]">{m.val}</p>
                {i === 2 ? <p className="mt-1 text-[11.5px] font-bold text-[#796d66]">Refund value {INR(metrics.totalRefund)}</p> : null}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[13px] font-bold text-rose-700 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">

          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#efe5dc] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8b82]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, RMA, customer, reason..."
                  className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-10 pr-4 text-[13px] outline-none placeholder:text-[#9a8b82] focus:border-[#fd761a] transition" />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setFilterOpen((o) => !o)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] hover:bg-white transition" type="button">
                    <Filter size={13} /> {statusFilter === "all" ? "All Statuses" : (STATUS_LABELS[statusFilter] || statusFilter)}
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 top-12 z-30 max-h-72 w-52 overflow-y-auto rounded-xl border border-[#efe5dc] bg-white py-1 shadow-xl">
                      {FILTER_OPTIONS.map((s) => (
                        <button key={s} onClick={() => { setStatusFilter(s); setFilterOpen(false); }} type="button"
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-[12px] font-black transition hover:bg-[#faf7f4] ${statusFilter === s ? "text-[#fd761a]" : "text-[#3a1100]"}`}>
                          {s === "all" ? "All Statuses" : (STATUS_LABELS[s] || s)}
                          {statusFilter === s && <Check size={12} className="text-[#fd761a]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] hover:bg-white transition" type="button">
                  <SortAsc size={13} /> {sortDir === "desc" ? "Newest" : "Oldest"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={28} className="animate-spin text-[#fd761a]" />
                  <p className="text-[12.5px] font-bold text-[#796d66]">Loading requests...</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-[#efe5dc] bg-white px-8 py-16 text-center shadow-sm">
                <ReceiptText size={36} className="mx-auto text-[#c7bab0] mb-3" />
                <p className="text-[15px] font-black text-[#3a1100] font-serif">No return requests</p>
                <p className="mt-1 text-[12.5px] text-[#796d66]">Adjust filters or search to find requests.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-[#faf8f5] text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] border-b border-[#efe5dc]">
                      <tr>
                        <th className="px-5 py-4">Return ID / RMA</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Items</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Refund Amt</th>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5eee8] bg-white text-[13px]">
                      {filtered.map((r) => {
                        const isActive = r._id === view?._id;
                        return (
                          <tr key={r._id} onClick={() => { setSelectedId(r._id); setActiveAction(null); setFormError(""); }}
                            className={`cursor-pointer transition ${isActive ? "bg-orange-50/20" : "hover:bg-[#fffcf9]/50"}`}>
                            <td className="px-5 py-4">
                              <p className="font-black text-[#fd761a]">{r.returnId || r._id?.slice(-8).toUpperCase()}</p>
                              {r.rmaNumber ? <p className="text-[11px] font-bold text-[#796d66]">{r.rmaNumber}</p> : null}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-bold text-[#3a1100]">{r.userId?.name || "Customer"}</p>
                              <p className="text-[11px] text-[#9a8b82] mt-0.5">{r.userId?.email || ""}</p>
                            </td>
                            <td className="px-5 py-4 text-[#5c514b] max-w-[220px] truncate">
                              {(r.items || []).map((i) => `${i.name} x${i.returnQuantity ?? i.quantity ?? 1}`).join("; ") || r.reason || "—"}
                            </td>
                            <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                            <td className="px-5 py-4 font-black text-[#211713]">{r.refundAmount ? INR(r.refundAmount) : "—"}</td>
                            <td className="px-5 py-4 text-[12px] text-[#796d66]">{fmtDate(r.createdAt)}</td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openViewModal(r); }}
                                  type="button"
                                  title={`View return ${r.returnId}`}
                                  aria-label={`View return ${r.returnId}`}
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-[#cfc1b5] text-[#796d66] transition hover:border-[#fd761a] hover:text-[#fd761a]"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openViewModal(r); }}
                                  type="button"
                                  title={`View return ${r.returnId}`}
                                  aria-label={`Open return ${r.returnId}`}
                                  className={`grid h-8 w-8 place-items-center rounded-lg border transition ${isActive ? "border-[#fd761a] text-[#fd761a] bg-orange-50/30" : "border-[#cfc1b5] text-[#796d66] hover:border-[#fd761a] hover:text-[#fd761a]"}`}
                                >
                                  <ChevronRight size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#efe5dc] bg-white p-5 shadow-sm">
              <h3 className="text-[14px] font-black text-[#3a1100] font-serif mb-4">Return Reason Distribution</h3>
              {reasonDist.length === 0 ? (
                <p className="text-[12.5px] font-bold text-[#796d66]">No data yet — distribution appears here once customers submit return requests.</p>
              ) : (
                <div className="space-y-3">
                  {reasonDist.map((rd) => (
                    <div key={rd.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-[11.5px] font-black text-[#3a1100]">
                          <span className={`h-2.5 w-2.5 rounded-full ${rd.color}`} />
                          {rd.label} <span className="font-bold text-[#9a8b82]">({rd.count})</span>
                        </span>
                        <span className="text-[11px] font-bold text-[#796d66]">{rd.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#f0e9e2] overflow-hidden">
                        <div className={`h-full rounded-full ${rd.color} transition-all duration-700`} style={{ width: `${rd.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
            {!view ? (
              <div className="flex items-center justify-center h-60 text-[#796d66]">
                <div className="text-center">
                  <ReceiptText size={32} className="mx-auto text-[#c7bab0] mb-2" />
                  <p className="text-[13px] font-bold">Select a request to review</p>
                </div>
              </div>
            ) : detailLoading && !detail ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 size={24} className="animate-spin text-[#fd761a]" />
              </div>
            ) : (
              <>
                <div className="bg-[#3a1100] text-white px-5 py-5 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#fd761a]/10 blur-2xl pointer-events-none" />
                  <div className="flex items-start justify-between relative">
                    <div>
                      <span className="inline-flex rounded-lg bg-[#fd761a] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wide mb-3">
                        {isTerminal ? STATUS_LABELS[canon(view.status)] : "Active Case"}
                      </span>
                      <h3 className="text-[17px] font-black font-serif">Return {view.returnId}</h3>
                      <p className="mt-0.5 text-[12px] text-[#dfc8ba] font-semibold">{view.userId?.name || "Customer"} · {view.orderId?.orderId || ""}</p>
                      {view.rmaNumber ? <p className="mt-1 text-[12px] font-black text-[#ffb37e]">{view.rmaNumber}</p> : null}
                    </div>
                    <button onClick={fetchReturns} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition"><RefreshCw size={13} /></button>
                  </div>
                </div>

                <div className="border-b border-[#f5eee8] bg-[#fdfbf9] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">Lifecycle</p>
                  <div className="space-y-2.5">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const done = isTerminal ? canon(view.status) === "completed" : idx < currentStep;
                      const active = !isTerminal && idx === currentStep;
                      return (
                        <div key={step} className="flex items-center gap-3">
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${done ? "bg-emerald-600 text-white" : active ? "bg-[#fd761a] text-white" : "bg-[#f0e9e2] text-[#9a8b82]"}`}>
                            {done ? <Check size={10} strokeWidth={3} /> : idx + 1}
                          </span>
                          <p className={`text-[12px] font-bold ${done ? "text-emerald-700" : active ? "text-[#fd761a]" : "text-[#9a8b82]"}`}>{step}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3"><StatusBadge status={view.status} /></div>
                </div>

                <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto">
                  <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4 text-[12.5px] space-y-2">
                    <KV k="Order" v={view.orderSnapshot?.orderRef || view.orderId?.orderId || "—"} />
                    <KV k="Delivered" v={fmtDate(view.orderSnapshot?.deliveredAt)} />
                    <KV k="Resolution" v={view.resolution?.replace("_", " ") || "refund"} />
                    <KV k="Pickup mode" v={view.pickupMode || view.shipment?.mode || "pickup"} />
                    <KV k="Refund calc." v={view.refundAmount ? `${INR(view.refundAmount)} (${view.refundType || "Full"})` : "Pending"} />
                    <KV k="Refund txn" v={view.refund?.transactionStatus ? `${view.refund.transactionStatus}${view.refund.paymentReference ? ` · ${view.refund.paymentReference}` : ""}` : "—"} />
                    {view.shipment?.courier ? <KV k="Courier" v={`${view.shipment.courier}${view.shipment.trackingNumber ? ` · ${view.shipment.trackingNumber}` : ""}`} /> : null}
                    {view.inspection?.condition ? <KV k="Inspection" v={`${view.inspection.condition} · ${view.inspection.disposition || ""} · ${view.inspection.passed ? "passed" : "failed"}`} /> : null}
                    {view.rejectionReason ? <KV k="Rejection" v={view.rejectionReason} alert /> : null}
                    {view.shipment?.lastFailureReason ? <KV k="Pickup issue" v={view.shipment.lastFailureReason} alert /> : null}
                    {view.refund?.failureReason ? <KV k="Refund issue" v={view.refund.failureReason} alert /> : null}
                  </div>

                  <div>
                    <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Items ({(view.items || []).length})</p>
                    <div className="space-y-2">
                      {(view.items || []).map((it, i) => (
                        <div key={i} className="rounded-xl border border-[#efe5dc] p-3 text-[12px]">
                          <p className="font-black text-[#3a1100]">{it.name} <span className="font-bold text-[#796d66]">x{it.returnQuantity ?? it.quantity ?? 1}</span></p>
                          <p className="mt-1 font-semibold text-[#796d66]">{it.reason} · {INR(it.unitPrice)}</p>
                          {it.description ? <p className="mt-1 text-[#5c514b]">“{it.description}”</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  {((view.evidence || []).length > 0 || (view.images || []).length > 0) ? (
                    <div>
                      <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Customer return photos</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[...(view.evidence || []).map((e) => e.url), ...(view.images || [])].slice(0, 8).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-[#efe5dc]">
                            <img src={url} alt={`evidence ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(view.statusHistory || []).length > 0 ? (
                    <div>
                      <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Audit trail</p>
                      <div className="space-y-2">
                        {[...(view.statusHistory || [])].reverse().slice(0, 10).map((h, i) => (
                          <div key={i} className="text-[11.5px]">
                            <p className="font-bold text-[#3a1100]">{STATUS_LABELS[canon(h.from)] || h.from} → {STATUS_LABELS[canon(h.to)] || h.to} <span className="font-semibold text-[#9a8b82]">· {h.actorRole}</span></p>
                            <p className="text-[#9a8b82]">{fmtDate(h.timestamp)}{h.comment ? ` · ${h.comment}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(view.adminNotes || []).length > 0 ? (
                    <div>
                      <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Admin notes</p>
                      <div className="space-y-2">
                        {view.adminNotes.slice(-5).map((n, i) => (
                          <p key={i} className="rounded-lg bg-[#faf7f4] px-3 py-2 text-[12px] text-[#5c514b]">{n.note} <span className="text-[#9a8b82]">· {fmtDate(n.addedAt)}</span></p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">Admin Actions</p>
                    {availableActions.length === 0 ? (
                      <p className="rounded-xl bg-[#faf7f4] px-4 py-3 text-[12px] font-bold text-[#796d66]">
                        {isTerminal ? "Terminal state — no further transitions. Notes below still join the audit trail." : "No actions available."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {availableActions.map((a) => (
                          <button key={a.key} type="button" disabled={actionLoading}
                            onClick={() => { setActiveAction(a); setFormError(""); setFormValues(a.key === "refund-now" ? { amount: view?.refundAmount ?? "" } : {}); }}
                            className={`h-10 rounded-xl text-[11.5px] font-black transition disabled:opacity-40 ${a.cls} ${activeAction?.key === a.key ? "ring-2 ring-offset-1 ring-[#fd761a]" : ""}`}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {activeAction ? (
                      <div className="mt-3 rounded-xl border border-[#fd761a]/40 bg-[#fff8f1] p-4">
                        <p className="text-[12px] font-black text-[#b64008]">{activeAction.label}</p>
                        <div className="mt-3 space-y-2.5">
                          {activeAction.fields.map((f) => (
                            <label key={f.name} className="block">
                              <span className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82]">{f.label}{f.required ? " *" : ""}</span>
                              <input
                                type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                                step={f.type === "number" ? "0.01" : undefined}
                                min={f.type === "number" ? 0 : undefined}
                                value={formValues[f.name] ?? ""}
                                onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                                className="mt-1.5 h-10 w-full rounded-lg border border-[#e5d8cd] bg-white px-3 text-[12.5px] outline-none focus:border-[#fd761a]"
                              />
                            </label>
                          ))}
                          {activeAction.fields.length === 0 ? <p className="text-[12px] text-[#796d66]">No extra input needed.</p> : null}
                          {activeAction.key === "refund-now" ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-[12px] font-bold text-emerald-800">
                              This will refund the amount to the customer&rsquo;s original payment method. This action is final and cannot be undone.
                            </div>
                          ) : null}
                        </div>
                        {formError ? <p className="mt-2 text-[12px] font-bold text-rose-700">{formError}</p> : null}
                        <div className="mt-3 flex gap-2">
                          <button onClick={runAction} disabled={actionLoading} type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3a1100] text-[12px] font-black text-white transition hover:bg-[#fd761a] disabled:opacity-50">
                            {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {activeAction.key === "refund-now" ? "Confirm Refund" : "Confirm"}
                          </button>
                          <button onClick={() => { setActiveAction(null); setFormError(""); }} type="button" className="h-10 rounded-xl border border-[#e5d8cd] bg-white px-4 text-[12px] font-black text-[#5c514b]">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add an audit note…"
                        className="h-10 flex-1 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3 text-[12.5px] outline-none placeholder:text-[#9a8b82] focus:border-[#fd761a]" />
                      <button onClick={addNote} disabled={actionLoading || !noteText.trim()} type="button" className="h-10 rounded-xl border border-[#e5d8cd] bg-white px-4 text-[12px] font-black text-[#5c514b] transition hover:border-[#fd761a] hover:text-[#fd761a] disabled:opacity-40">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>

        {modalReturn ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 px-4 py-6 backdrop-blur-[3px]" onClick={() => setModalReturn(null)}>
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#efe5dc] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82]">Return case file</p>
                  <h3 className="mt-1 text-[18px] font-black text-[#3a1100] font-serif">
                    {modalReturn.returnId}
                    {modalReturn.rmaNumber ? <span className="ml-2 text-[13px] text-[#fd761a]">{modalReturn.rmaNumber}</span> : null}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={modalReturn.status} />
                  <button onClick={() => setModalReturn(null)} type="button" aria-label="Close"
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
                    <X size={16} />
                  </button>
                </div>
              </div>
              {modalLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[13px] font-bold text-[#796d66]">
                  <Loader2 size={18} className="animate-spin text-[#fd761a]" /> Loading case file…
                </div>
              ) : (
                <div className="space-y-5 px-6 py-5 text-[13px]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <KV k="Customer" v={`${modalReturn.userId?.name || "Customer"}${modalReturn.userId?.email ? ` · ${modalReturn.userId.email}` : ""}`} />
                    <KV k="Order" v={modalReturn.orderSnapshot?.orderRef || modalReturn.orderId?.orderId || "—"} />
                    <KV k="Delivered" v={fmtDate(modalReturn.orderSnapshot?.deliveredAt)} />
                    <KV k="Requested" v={fmtDate(modalReturn.createdAt)} />
                    <KV k="Resolution" v={modalReturn.resolution?.replace("_", " ") || "refund"} />
                    <KV k="Refund" v={modalReturn.refundAmount ? `${INR(modalReturn.refundAmount)} (${modalReturn.refundType || "Full"})` : "Pending"} />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Items & reasons</p>
                    <div className="space-y-2">
                      {(modalReturn.items || []).map((it, i) => (
                        <div key={i} className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-3">
                          <p className="font-black text-[#3a1100]">{it.name} <span className="font-bold text-[#796d66]">x{it.returnQuantity ?? it.quantity ?? 1} · {INR(it.unitPrice)}</span></p>
                          <p className="mt-1 font-bold text-[#8a4a17]">Reason: {it.reason}</p>
                          {it.description ? <p className="mt-1 text-[#5c514b]">“{it.description}”</p> : null}
                        </div>
                      ))}
                      {!(modalReturn.items || []).length ? <p className="text-[#796d66]">{modalReturn.reason || "—"}</p> : null}
                    </div>
                  </div>
                  {((modalReturn.evidence || []).length > 0 || (modalReturn.images || []).length > 0) ? (
                    <div>
                      <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Customer return photos</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[...(modalReturn.evidence || []).map((e) => e.url), ...(modalReturn.images || [])].slice(0, 8).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-[#efe5dc]">
                            <img src={url} alt={`evidence ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-[#fff8f1] px-4 py-3 font-bold text-[#8a4a17]">No photos attached to this request.</p>
                  )}
                  {modalReturn.rejectionReason ? <KV k="Rejection reason" v={modalReturn.rejectionReason} alert /> : null}
                  {(modalReturn.statusHistory || []).length > 0 ? (
                    <div>
                      <p className="text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] mb-2">Audit trail</p>
                      <div className="space-y-2">
                        {[...modalReturn.statusHistory].reverse().slice(0, 10).map((h, i) => (
                          <p key={i} className="text-[12px] font-bold text-[#3a1100]">
                            {STATUS_LABELS[canon(h.from)] || h.from} → {STATUS_LABELS[canon(h.to)] || h.to}
                            <span className="ml-2 font-semibold text-[#9a8b82]">· {h.actorRole} · {fmtDate(h.timestamp)}</span>
                            {h.comment ? <span className="block font-medium text-[#796d66]">{h.comment}</span> : null}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="rounded-xl bg-[#faf7f4] px-4 py-3 font-semibold text-[#796d66]">
                    Approve or reject from the case panel on the right — every decision is recorded with your reason.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {filterOpen && <div className="fixed inset-0 z-20" onClick={() => setFilterOpen(false)} />}
      </div>
    </AdminLayout>
  );
}

function KV({ k, v, alert }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#796d66] font-medium shrink-0">{k}</span>
      <span className={`font-bold text-right max-w-[200px] ${alert ? "text-rose-700" : "text-[#3a1100]"}`}>{v}</span>
    </div>
  );
}
