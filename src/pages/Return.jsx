import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  FileText,
  Eye,
  HelpCircle,
  Mail,
  PackageCheck,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../services/api";

const RETURN_REASONS = [
  "Damaged product",
  "Defective or not working",
  "Wrong item delivered",
  "Item missing from package",
  "Size or fit issue",
  "Product not as described",
  "Changed mind",
  "Other",
];

const RESOLUTIONS = [
  { value: "refund", label: "Refund", hint: "Money back to original payment method" },
  { value: "replacement", label: "Replacement", hint: "Same item shipped again" },
];

// Canonical lifecycle → display metadata
const STATUS_META = {
  draft: { label: "Draft", tone: "bg-gray-100 text-gray-600" },
  submitted: { label: "Pending", tone: "bg-[#fff1d8] text-[#9b5b05]" },
  under_review: { label: "Under Review", tone: "bg-[#e7edf8] text-[#315c9f]" },
  approved: { label: "Approved", tone: "bg-[#e5f2d8] text-[#4d8a35]" },
  rejected: { label: "Rejected", tone: "bg-[#ffe4df] text-[#b62917]" },
  pickup_scheduled: { label: "Pickup Scheduled", tone: "bg-[#e7edf8] text-[#315c9f]" },
  pickup_failed: { label: "Pickup Failed", tone: "bg-[#ffe4df] text-[#b62917]" },
  item_received: { label: "Item Received", tone: "bg-[#e7edf8] text-[#315c9f]" },
  inspection_completed: { label: "Inspection Done", tone: "bg-[#e7edf8] text-[#315c9f]" },
  on_hold: { label: "On Hold", tone: "bg-[#fff1d8] text-[#9b5b05]" },
  refund_processing: { label: "Resolution Processing", tone: "bg-[#e7edf8] text-[#315c9f]" },
  refund_failed: { label: "Refund Pending", tone: "bg-[#ffe4df] text-[#b62917]" },
  completed: { label: "Completed", tone: "bg-[#e5f2d8] text-[#4d8a35]" },
  cancelled: { label: "Cancelled", tone: "bg-gray-100 text-gray-600" },
};

// Legacy / alias statuses mapped to canonical keys for display
const STATUS_ALIAS = {
  Requested: "submitted",
  Processing: "under_review",
  Approved: "approved",
  Rejected: "rejected",
  Completed: "completed",
  Cancelled: "cancelled",
  pending: "submitted",
  processing: "under_review",
  approved: "approved",
  rejected: "rejected",
  refunded: "completed",
  escalated: "under_review",
  picked_up: "item_received",
  cancelled: "cancelled",
};

const canon = (s) => STATUS_ALIAS[s] || s || "submitted";
const statusLabel = (s) => STATUS_META[canon(s)]?.label || s;
const statusTone = (s) => STATUS_META[canon(s)]?.tone || "bg-gray-100 text-gray-600";

const CANCELLABLE = new Set(["draft", "submitted", "under_review", "approved"]);

// 7-stage visual pipeline
const PIPELINE = ["Pending", "Review", "Approved", "Pickup", "Received", "Inspection", "Resolved"];
const PIPELINE_INDEX = {
  draft: 0,
  submitted: 0,
  under_review: 1,
  approved: 2,
  pickup_scheduled: 3,
  pickup_failed: 3,
  item_received: 4,
  inspection_completed: 5,
  on_hold: 5,
  refund_processing: 6,
  refund_failed: 6,
  completed: 6,
};
const TERMINAL = new Set(["rejected", "cancelled"]);

const INR = (v) => (v === undefined || v === null ? "—" : `₹${Number(v).toLocaleString("en-IN")}`);
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Return() {
  const location = useLocation();
  const cameraInputRef = useRef(null);

  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [eligLoading, setEligLoading] = useState(false);

  // Per-item form state keyed by orderItemId
  const [picked, setPicked] = useState({});
  const [resolution, setResolution] = useState("refund");
  const pickupMode = "pickup"; // courier pickup only — drop-off removed
  const [pickupAddress, setPickupAddress] = useState({ fullName: "", phone: "", addressLine1: "", city: "", state: "", pincode: "" });
  const [overallNote, setOverallNote] = useState("");
  const [evidence, setEvidence] = useState([]); // {id, name, preview, url, uploading}
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // {type, text, request}
  const [message, setMessage] = useState("");

  const [returnRequests, setReturnRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [trackingRequest, setTrackingRequest] = useState(null);
  const [trackingDetail, setTrackingDetail] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const fetchEligibleOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const { data } = await api.get("/returns/eligible-orders");
      const list = data?.data || data?.eligible || [];
      setEligibleOrders(list);
      // Preselect order passed from Order history page
      const hinted = location.state?.orderId;
      if (hinted) {
        const found = list.find((o) => String(o._id) === String(hinted) || o.orderId === hinted);
        if (found) setSelectedOrderId(String(found._id));
        else if (list.length > 0) setSelectedOrderId((cur) => cur || String(list[0]._id));
      } else if (list.length > 0) {
        setSelectedOrderId((cur) => cur || String(list[0]._id));
      }
    } catch {
      // Fallback: derive from delivered orders directly
      try {
        const { data } = await api.get("/orders/my-orders", { params: { status: "delivered", limit: 50 } });
        const list = (data?.data || []).map((o) => ({
          _id: o._id,
          orderId: o.orderId,
          createdAt: o.createdAt,
          deliveredAt: o.deliveredAt,
          orderTotal: o.orderTotal,
          items: (o.items || []).map((i) => ({
            orderItemId: String(i._id),
            name: i.name,
            sku: i.sku,
            image: i.image,
            quantity: i.quantity,
            unitPrice: i.sellingPrice,
            eligible: true,
            windowDays: 7,
            daysSinceDelivery: 0,
            returnable: true,
          })),
        }));
        setEligibleOrders(list);
        if (list.length > 0) setSelectedOrderId((cur) => cur || String(list[0]._id));
      } catch (e) {
        setOrdersError(e.response?.data?.message || "Failed to load returnable orders.");
      }
    }
    setOrdersLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/returns/my-requests", { params: { limit: 50 } });
      setReturnRequests(data?.data || []);
    } catch {
      setReturnRequests([]);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    fetchEligibleOrders();
    fetchHistory();
  }, [fetchEligibleOrders, fetchHistory]);

  const selectedOrder = useMemo(
    () => eligibleOrders.find((o) => String(o._id) === String(selectedOrderId)) || null,
    [eligibleOrders, selectedOrderId]
  );

  // Full server-side eligibility (window, category, duplicates) for the selected order
  useEffect(() => {
    if (!selectedOrderId) return;
    setEligLoading(true);
    api
      .post("/returns/eligibility", { orderId: selectedOrderId })
      .then(({ data }) => {
        setEligibility(data?.data || null);
        // Prefill pickup address from the order's shipping address when available
        return api.get(`/orders/${selectedOrderId}`).then(({ data: od }) => {
          const sa = od?.data?.shippingAddress;
          if (sa) {
            setPickupAddress((cur) => ({
              fullName: cur.fullName || sa.fullName || "",
              phone: cur.phone || sa.phoneNumber || "",
              addressLine1: cur.addressLine1 || sa.streetAddress || "",
              city: cur.city || sa.city || "",
              state: cur.state || sa.state || "",
              pincode: cur.pincode || sa.zipCode || "",
            }));
          }
        }).catch(() => {});
      })
      .catch(() => setEligibility(null))
      .finally(() => setEligLoading(false));
  }, [selectedOrderId]);

  const eligItemsById = useMemo(() => {
    const map = {};
    for (const it of eligibility?.items || []) map[it.orderItemId] = it;
    // Fall back to the lightweight eligible-orders payload
    for (const it of selectedOrder?.items || []) {
      if (!map[it.orderItemId]) map[it.orderItemId] = it;
    }
    return map;
  }, [eligibility, selectedOrder]);

  const togglePick = (orderItemId) => {
    const info = eligItemsById[orderItemId];
    if (info && info.eligible === false) return;
    setPicked((cur) => {
      if (cur[orderItemId]) {
        const next = { ...cur };
        delete next[orderItemId];
        return next;
      }
      return {
        ...cur,
        [orderItemId]: { quantity: 1, reason: RETURN_REASONS[0], description: "" },
      };
    });
    setSubmitResult(null);
  };

  const updatePick = (orderItemId, patch) => {
    setPicked((cur) => ({ ...cur, [orderItemId]: { ...cur[orderItemId], ...patch } }));
  };

  const addEvidenceFiles = async (files) => {
    const list = Array.from(files || []).slice(0, 5 - evidence.length);
    if (!list.length) return;
    const placeholders = list.map((f) => ({
      id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: f.name,
      preview: URL.createObjectURL(f),
      url: null,
      uploading: true,
    }));
    setEvidence((cur) => [...cur, ...placeholders]);
    const form = new FormData();
    list.forEach((f) => form.append("files", f));
    try {
      const { data } = await api.post("/returns/evidence", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const urls = data?.urls || [];
      setEvidence((cur) =>
        cur.map((e) => {
          const idx = placeholders.findIndex((p) => p.id === e.id);
          if (idx === -1) return e;
          return { ...e, url: urls[idx] || null, uploading: false };
        })
      );
    } catch {
      // Keep previews; submit will surface the missing-photo requirement.
      setEvidence((cur) => cur.map((e) => (placeholders.some((p) => p.id === e.id) ? { ...e, uploading: false } : e)));
      setMessage("Photo upload failed — please retry. At least one product photo is mandatory for every return request.");
    }
  };

  const removeEvidence = (id) => {
    setEvidence((cur) => {
      const target = cur.find((e) => e.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return cur.filter((e) => e.id !== id);
    });
  };

  const pickedEntries = Object.entries(picked);
  const estimatedRefund = useMemo(() => {
    let sum = 0;
    for (const [id, p] of pickedEntries) {
      const info = eligItemsById[id];
      sum += (info?.unitPrice || 0) * (p.quantity || 0);
    }
    return sum;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, eligItemsById]);

  const validationError = useMemo(() => {
    if (pickedEntries.length === 0) return "Select at least one item to return.";
    for (const [id, p] of pickedEntries) {
      const info = eligItemsById[id];
      if (!info) return "Eligibility is still loading — please wait.";
      if (info.eligible === false) return `"${info.name}" is not eligible for return.`;
      const max = info.maxReturnableQuantity ?? info.quantity ?? 1;
      if (!Number.isInteger(p.quantity) || p.quantity < 1 || p.quantity > max)
        return `Quantity for "${info.name}" must be between 1 and ${max}.`;
      if (!p.reason) return "Choose a return reason for every selected item.";
      if (p.reason === "Other" && !(p.description || overallNote).trim())
        return 'A description is required when the reason is "Other".';
    }
    // Product photos are mandatory for every return request: the admin
    // reviews order details, reason and attached photos before deciding.
    if (!evidence.some((e) => e.url)) return "Please attach at least one photo of the return product — photos are mandatory for every return request.";
    if (evidence.some((e) => e.uploading)) return "Please wait for photo uploads to finish.";
    if (pickupMode === "pickup") {
      const { fullName, phone, addressLine1, city, pincode } = pickupAddress;
      if (!fullName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !pincode.trim())
        return "Pickup address is incomplete — all fields are required for courier pickup.";
      if (!/^[6-9]\d{9}$/.test(phone.trim())) return "Pickup phone must be a valid 10-digit Indian mobile number.";
      if (!/^\d{6}$/.test(pincode.trim())) return "Pickup pincode must be 6 digits.";
    }
    if (!agreeTerms) return "Please accept the terms and declaration to continue.";
    return "";
  }, [pickedEntries, eligItemsById, evidence, pickupMode, pickupAddress, overallNote, agreeTerms]);

  const submitReturn = async () => {
    if (validationError || submitting) {
      setMessage(validationError);
      return;
    }
    setSubmitting(true);
    setMessage("");
    setSubmitResult(null);
    try {
      const payload = {
        orderId: String(selectedOrder._id),
        items: pickedEntries.map(([orderItemId, p]) => ({
          orderItemId,
          quantity: p.quantity,
          reason: p.reason,
          description: p.description || overallNote || "",
        })),
        resolution,
        pickupMode,
        description: overallNote,
        images: evidence.map((e) => e.url).filter(Boolean),
        ...(pickupMode === "pickup" ? { pickupAddress } : {}),
        agreeTerms: true,
      };
      const { data } = await api.post("/returns", payload);
      const created = data?.data;
      if (data?.rejected) {
        setSubmitResult({ type: "rejected", text: `Request ${created?.returnId} was rejected: ${created?.rejectionReason || created?.decisionReason || "not eligible."}`, request: created });
      } else if (data?.autoApproved) {
        setSubmitResult({ type: "approved", text: `Return ${created?.returnId} auto-approved. RMA: ${created?.rmaNumber}.`, request: created });
      } else {
        setSubmitResult({ type: "review", text: `Return ${created?.returnId} submitted and queued for admin review.`, request: created });
      }
      setPicked({});
      setOverallNote("");
      setAgreeTerms(false);
      fetchHistory();
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to submit return request.";
      const errs = e.response?.data?.errors;
      setMessage(errs?.map((x) => x.message).join(" ") || msg);
    }
    setSubmitting(false);
  };

  const openTracking = async (request) => {
    setTrackingRequest(request);
    setTrackingDetail(null);
    setTrackingLoading(true);
    try {
      const { data } = await api.get(`/returns/${request._id}`);
      setTrackingDetail(data?.data || request);
    } catch {
      setTrackingDetail(request);
    }
    setTrackingLoading(false);
  };

  const cancelRequest = async (request) => {
    if (!window.confirm(`Cancel return ${request.returnId}?`)) return;
    try {
      await api.put(`/returns/cancel/${request._id}`);
      setMessage(`Return ${request.returnId} cancelled.`);
      fetchHistory();
      if (trackingRequest?._id === request._id) setTrackingRequest({ ...request, status: "cancelled" });
    } catch (e) {
      setMessage(e.response?.data?.message || "Failed to cancel return request.");
    }
  };

  const latestRequest = returnRequests[0];
  const evidenceSlots = useMemo(() => Array.from({ length: Math.max(0, 5 - evidence.length) }), [evidence.length]);

  return (
    <main className="account-shell relative h-full overflow-hidden bg-[#fffaf5] text-[#191411] antialiased">
      <div className="account-sidebar-fixed border-t border-[#efe5dc]">
        <Sidebar />
      </div>

      <section className="h-full overflow-y-auto overflow-x-clip border-t border-[#efe5dc]">
        <div className="mx-auto max-w-[1390px] md:pl-[var(--account-sidebar-width)]">
          <div className="px-7 pb-12 pt-9 sm:px-10 sm:pb-16 lg:px-[88px] lg:pb-[48px] lg:pt-[38px]">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#b64008]">Account Support</p>
                <h1 className="mt-3 font-serif text-[39px] font-black leading-none tracking-[-0.045em] sm:text-[46px]">
                  Return Request
                </h1>
                <p className="mt-4 max-w-[680px] text-[15px] font-medium leading-7 text-[#5f5650]">
                  Submit return complaints, attach product proof, and follow every request from review to refund.
                </p>
              </div>
              <div className="rounded-full bg-[#efe7df] px-5 py-3 text-[12px] font-black text-[#6c5f58]">
                Return window: 7 days from delivery
              </div>
            </header>

            {message ? (
              <p className="mt-5 rounded-[12px] border border-[#f4b487] bg-[#fff4e8] px-4 py-4 text-[13px] font-bold text-[#8a4a17]">
                {message}
              </p>
            ) : null}

            <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_360px] [&>*]:min-w-0">
              <section className="space-y-7">
                <Panel>
                  <SectionTitle icon={PackageCheck} title="Recent Orders" />
                  <p className="mt-4 text-[14px] font-medium leading-6 text-[#6c5f58]">
                    Only delivered orders inside the 7-day return window are listed. Select an order, then pick the items to return.
                  </p>
                  {ordersLoading ? (
                    <div className="mt-6 flex items-center gap-2 text-[13px] font-bold text-[#796d66]">
                      <Loader2 size={16} className="animate-spin" /> Loading returnable orders…
                    </div>
                  ) : ordersError ? (
                    <p className="mt-6 rounded-[12px] border border-[#ffcfc6] bg-[#fff1ee] px-4 py-3 text-[13px] font-bold text-[#b62917]">
                      {ordersError}
                    </p>
                  ) : eligibleOrders.length === 0 ? (
                    <p className="mt-6 rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-4 py-4 text-[13px] font-bold text-[#6c5f58]">
                      No returnable orders right now. Orders become returnable once delivered and stay eligible for 7 days from the delivery date.
                    </p>
                  ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {eligibleOrders.map((order) => (
                        <RecentOrderCard
                          active={String(selectedOrderId) === String(order._id)}
                          key={order._id}
                          onSelect={() => {
                            setSelectedOrderId(String(order._id));
                            setPicked({});
                            setSubmitResult(null);
                            setTrackingRequest(null);
                            setTrackingDetail(null);
                            setMessage("");
                          }}
                          order={order}
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                {selectedOrder ? (
                  <Panel>
                    <SectionTitle icon={FileText} title="Select Items to Return" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <InfoPill label="Order ID" value={selectedOrder.orderId} />
                      <InfoPill label="Order Date" value={fmtDate(selectedOrder.createdAt)} />
                      <InfoPill label="Delivery Date" value={fmtDate(selectedOrder.deliveredAt)} />
                    </div>
                    {eligLoading ? (
                      <p className="mt-4 flex items-center gap-2 text-[13px] font-bold text-[#796d66]">
                        <Loader2 size={15} className="animate-spin" /> Checking eligibility…
                      </p>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {(selectedOrder.items || []).map((item) => {
                          const info = eligItemsById[item.orderItemId] || item;
                          const isPicked = !!picked[item.orderItemId];
                          const max = info.maxReturnableQuantity ?? info.quantity ?? 1;
                          return (
                            <div
                              key={item.orderItemId}
                              className={`rounded-[16px] border p-4 transition ${
                                isPicked ? "border-[#fd761a] bg-[#fff6ee]" : "border-[#eadfd7] bg-[#fffaf6]"
                              } ${info.eligible === false ? "opacity-70" : ""}`}
                            >
                              <div className="flex items-start gap-4">
                                <input
                                  type="checkbox"
                                  checked={isPicked}
                                  disabled={info.eligible === false}
                                  onChange={() => togglePick(item.orderItemId)}
                                  className="mt-1 h-5 w-5 accent-[#fd761a]"
                                  aria-label={`Select ${item.name}`}
                                />
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="h-16 w-16 rounded-[12px] object-cover" />
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[14px] font-black text-[#342821]">{item.name}</p>
                                  <p className="mt-1 text-[12px] font-bold text-[#8b7d75]">
                                    {item.sku} · {INR(info.unitPrice)} · purchased {info.quantity ?? item.quantity}
                                  </p>
                                  {info.eligible === false ? (
                                    <p className="mt-2 flex items-start gap-1.5 text-[12px] font-bold text-[#b62917]">
                                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                      Not eligible — {(info.checks || []).find((c) => !c.passed)?.detail || "fails return policy."}
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-[12px] font-bold text-[#4d8a35]">
                                      Eligible · {max} unit(s) returnable · {info.windowDays ?? 7}-day window ({info.daysSinceDelivery ?? 0}d since delivery)
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isPicked ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
                                  <label className="block">
                                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#77706a]">Qty</span>
                                    <div className="mt-2 flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#eadfd7] bg-white text-[16px] font-black"
                                        onClick={() => updatePick(item.orderItemId, { quantity: Math.max(1, picked[item.orderItemId].quantity - 1) })}
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center text-[15px] font-black">{picked[item.orderItemId].quantity}</span>
                                      <button
                                        type="button"
                                        className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#eadfd7] bg-white text-[16px] font-black"
                                        onClick={() => updatePick(item.orderItemId, { quantity: Math.min(max, picked[item.orderItemId].quantity + 1) })}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </label>
                                  <label className="block">
                                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#77706a]">Return reason</span>
                                    <select
                                      className="mt-2 h-11 w-full rounded-[10px] border border-[#eadfd7] bg-white px-3 text-[13px] font-bold outline-none focus:border-[#fd761a]"
                                      value={picked[item.orderItemId].reason}
                                      onChange={(e) => updatePick(item.orderItemId, { reason: e.target.value })}
                                    >
                                      {RETURN_REASONS.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                              ) : null}
                              {isPicked && picked[item.orderItemId].reason === "Other" ? (
                                <textarea
                                  className="mt-3 min-h-[80px] w-full resize-none rounded-[10px] border border-[#eadfd7] bg-white px-4 py-3 text-[13px] font-semibold outline-none placeholder:text-[#9a8b82] focus:border-[#fd761a]"
                                  placeholder="Explain what happened (required for “Other”)."
                                  value={picked[item.orderItemId].description}
                                  onChange={(e) => updatePick(item.orderItemId, { description: e.target.value })}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                ) : null}

                {selectedOrder && pickedEntries.length > 0 ? (
                  <>
                    <Panel>
                      <SectionTitle icon={RotateCcw} title="Resolution Preference" />
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {RESOLUTIONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            aria-pressed={resolution === r.value}
                            onClick={() => setResolution(r.value)}
                            className={`rounded-[12px] border px-4 py-3.5 text-left transition hover:-translate-y-0.5 ${
                              resolution === r.value
                                ? "border-[#fd761a] bg-[#fff1e4] shadow-[0_10px_20px_rgba(191,76,12,0.12)]"
                                : "border-[#eadfd7] bg-white/80 hover:border-[#f4b487]"
                            }`}
                          >
                            <p className={`text-[14px] font-black ${resolution === r.value ? "text-[#b64008]" : "text-[#342821]"}`}>{r.label}</p>
                            <p className="mt-1 text-[12px] font-semibold text-[#6c5f58]">{r.hint}</p>
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-[13px] font-bold text-[#6c5f58]">
                        Estimated {resolution === "refund" ? "refund" : "value"}:{" "}
                        <span className="text-[#342821]">{INR(estimatedRefund)}</span>
                      </p>
                      <label className="mt-4 block">
                        <span className="text-[13px] font-black uppercase tracking-[0.12em] text-[#77706a]">Message to admin (optional)</span>
                        <textarea
                          className="mt-3 min-h-[90px] w-full resize-none rounded-[12px] border border-[#eadfd7] bg-white px-4 py-3 text-[14px] font-semibold outline-none placeholder:text-[#9a8b82] focus:border-[#fd761a]"
                          placeholder="Anything else the admin should know…"
                          value={overallNote}
                          onChange={(e) => setOverallNote(e.target.value)}
                        />
                      </label>
                    </Panel>

                    <Panel>
                      <SectionTitle icon={Truck} title="Courier Pickup" />
                      <p className="mt-4 flex items-start gap-2 rounded-[12px] bg-[#eef3fd] px-4 py-3 text-[13px] font-semibold leading-6 text-[#315c9f]">
                        <Truck size={16} className="mt-0.5 shrink-0" />
                        Our courier partner will collect the return from your address below. Keep the item(s) packed and ready.
                      </p>
                      {pickupMode === "pickup" ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {[
                            ["fullName", "Full name"],
                            ["phone", "Phone (10-digit mobile)"],
                            ["addressLine1", "Street address"],
                            ["city", "City"],
                            ["state", "State"],
                            ["pincode", "Pincode (6 digits)"],
                          ].map(([key, label]) => (
                            <label key={key} className="block">
                              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#77706a]">{label}</span>
                              <input
                                className="mt-2 h-11 w-full rounded-[10px] border border-[#eadfd7] bg-white px-3 text-[13px] font-bold outline-none focus:border-[#fd761a]"
                                value={pickupAddress[key]}
                                onChange={(e) => setPickupAddress((cur) => ({ ...cur, [key]: e.target.value }))}
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </Panel>

                    <Panel>
                      <SectionTitle icon={Camera} title="Image Evidence" />
                      <p className="mt-4 text-[14px] font-medium leading-6 text-[#6c5f58]">
                        Upload up to 5 photos — item, invoice label and packaging. <strong>At least 1 photo is mandatory</strong> for every return request; the admin reviews these photos before approving or rejecting.
                      </p>
                      <button
                        className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[12px] bg-[#351405] px-5 text-[14px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#4b1d08] disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit"
                        disabled={evidence.length >= 5}
                        onClick={() => cameraInputRef.current?.click()}
                        type="button"
                      >
                        <Camera size={18} />
                        Upload Photos
                      </button>
                      <input
                        accept="image/*"
                        className="hidden"
                        multiple
                        onChange={(event) => {
                          addEvidenceFiles(event.target.files);
                          event.target.value = "";
                        }}
                        ref={cameraInputRef}
                        type="file"
                      />
                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {evidence.map((image) => (
                          <div className="group relative aspect-square overflow-hidden rounded-[13px] border border-[#eadfd7] bg-white" key={image.id}>
                            <img alt={image.name} className="h-full w-full object-cover" src={image.url || image.preview} />
                            {image.uploading ? (
                              <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                                <Loader2 size={18} className="animate-spin" />
                              </span>
                            ) : null}
                            <button
                              aria-label={`Remove ${image.name}`}
                              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[#1d1009]/70 text-white transition hover:bg-[#b62917]"
                              onClick={() => removeEvidence(image.id)}
                              type="button"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        {evidenceSlots.map((_, index) => (
                          <div className="grid aspect-square place-items-center rounded-[13px] border border-dashed border-[#dccdc2] bg-[#fffaf6] text-[#9a8b82]" key={index}>
                            <Camera size={20} />
                          </div>
                        ))}
                      </div>
                      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-4 py-4">
                        <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 h-4 w-4 accent-[#fd761a]" />
                        <span className="text-[13px] font-semibold leading-6 text-[#5f5650]">
                          I confirm the items are unused (unless defective), packed with all accessories, and the details above are true. I accept the published return policy.
                        </span>
                      </label>
                      {validationError && pickedEntries.length > 0 ? (
                        <p className="mt-4 text-[13px] font-bold text-[#8a4a17]">{validationError}</p>
                      ) : null}
                      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[13px] font-bold text-[#6c5f58]">{evidence.length}/5 photos · est. {INR(estimatedRefund)}</p>
                        <button
                          className="h-[54px] rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[14px] font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_24px_rgba(255,103,17,0.18)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                          disabled={!!validationError || submitting}
                          onClick={submitReturn}
                          type="button"
                        >
                          {submitting ? "Submitting…" : "Submit Return Request"}
                        </button>
                      </div>
                      {submitResult ? (
                        <div
                          className={`mt-5 rounded-[12px] border px-4 py-4 text-[13px] font-bold ${
                            submitResult.type === "rejected"
                              ? "border-[#ffcfc6] bg-[#fff1ee] text-[#b62917]"
                              : submitResult.type === "approved"
                                ? "border-[#cfe4b5] bg-[#edf7e6] text-[#4d8a35]"
                                : "border-[#c9d8f2] bg-[#eef3fd] text-[#315c9f]"
                          }`}
                        >
                          {submitResult.text}
                          {submitResult.request?.rmaNumber ? (
                            <span className="mt-1 block">Quote RMA {submitResult.request.rmaNumber} on the package and at handover.</span>
                          ) : null}
                        </div>
                      ) : null}
                    </Panel>
                  </>
                ) : null}

              </section>

              <aside className="space-y-6 self-start xl:sticky xl:top-6 xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto xl:pb-2">
                <StatusSummary status={latestRequest?.status || "submitted"} requestId={latestRequest?.returnId} rma={latestRequest?.rmaNumber} />
                <PolicyCard />
                <SupportCard />
                <FaqCard />
              </aside>
            </div>

            <div className="mt-7 space-y-7">
              <Panel>
                  <div className="flex items-center justify-between">
                    <SectionTitle icon={ClipboardList} title="Return Request History" />
                    <button onClick={fetchHistory} type="button" className="grid h-9 w-9 place-items-center rounded-xl border border-[#eadfd7] text-[#796d66] transition hover:border-[#fd761a] hover:text-[#fd761a]">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  {historyLoading ? (
                    <p className="mt-5 flex items-center gap-2 text-[13px] font-bold text-[#796d66]">
                      <Loader2 size={15} className="animate-spin" /> Loading history…
                    </p>
                  ) : returnRequests.length === 0 ? (
                    <p className="mt-5 rounded-[12px] border border-[#eadfd7] bg-[#fffaf6] px-4 py-4 text-[13px] font-bold text-[#6c5f58]">
                      No return requests yet. Your requests and their live status will appear here.
                    </p>
                  ) : (
                    <div className="mt-6 overflow-x-auto rounded-[16px] border border-[#eadfd7] bg-white">
                      <table className="min-w-[900px] w-full border-collapse text-left">
                        <thead className="bg-[#fff1e4] text-[11px] font-black uppercase tracking-[0.16em] text-[#8a4a17]">
                          <tr>
                            <th className="px-5 py-4">Return ID / RMA</th>
                            <th className="px-5 py-4">Items</th>
                            <th className="px-5 py-4">Amount</th>
                            <th className="px-5 py-4">Request Date</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Tracking</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#efe5dc] text-[14px]">
                          {returnRequests.map((request) => (
                            <tr className="bg-white transition hover:bg-[#fffaf6]" key={request._id}>
                              <td className="px-5 py-4">
                                <p className="font-black text-[#342821]">{request.returnId}</p>
                                {request.rmaNumber ? <p className="mt-0.5 text-[12px] font-bold text-[#fd761a]">{request.rmaNumber}</p> : null}
                              </td>
                              <td className="px-5 py-4 font-bold text-[#342821]">
                                {(request.items || []).map((i) => i.name).filter(Boolean).join(", ") || request.reason || "—"}
                              </td>
                              <td className="px-5 py-4 font-black text-[#5f5650]">{INR(request.refundAmount)}</td>
                              <td className="px-5 py-4 font-semibold text-[#6c5f58]">{fmtDate(request.createdAt)}</td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex rounded-full px-4 py-2 text-[12px] font-black ${statusTone(request.status)}`}>
                                  {statusLabel(request.status)}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    aria-label={`View return tracking for ${request.returnId}`}
                                    className={`grid h-10 w-10 place-items-center rounded-full border transition hover:-translate-y-0.5 hover:border-[#fd761a] hover:bg-[#fff1e4] hover:text-[#b64008] ${
                                      trackingRequest?._id === request._id ? "border-[#fd761a] bg-[#fff1e4] text-[#b64008]" : "border-[#eadfd7] bg-white text-[#8a4a17]"
                                    }`}
                                    onClick={() => openTracking(request)}
                                    type="button"
                                  >
                                    <Eye size={18} strokeWidth={2.3} />
                                  </button>
                                  {CANCELLABLE.has(canon(request.status)) ? (
                                    <button
                                      onClick={() => cancelRequest(request)}
                                      type="button"
                                      className="rounded-full border border-[#eadfd7] px-3 py-2 text-[11px] font-black text-[#b62917] transition hover:border-[#b62917]"
                                    >
                                      Cancel
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>

                {trackingRequest ? (
                  <Panel>
                    <SectionTitle icon={RotateCcw} title="Return Tracking" />
                    {trackingLoading ? (
                      <p className="mt-5 flex items-center gap-2 text-[13px] font-bold text-[#796d66]">
                        <Loader2 size={15} className="animate-spin" /> Loading live status…
                      </p>
                    ) : (
                      <ReturnTrackingDetail request={trackingDetail || trackingRequest} />
                    )}
                  </Panel>
                ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({ children }) {
  return (
    <section className="rounded-[21px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)] sm:px-7">
      {children}
    </section>
  );
}

function RecentOrderCard({ active, onSelect, order }) {
  const first = order.items?.[0] || {};
  return (
    <button
      aria-pressed={active}
      className={`group relative overflow-hidden rounded-[18px] border p-4 text-left transition duration-300 hover:-translate-y-1 ${
        active
          ? "border-[#fd761a] bg-[#fff1e4] shadow-[0_16px_32px_rgba(191,76,12,0.16)]"
          : "border-[#eadfd7] bg-[#fffaf6] shadow-[0_8px_20px_rgba(53,31,18,0.035)] hover:border-[#f4b487] hover:bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex gap-4">
        <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden rounded-[15px] bg-[#f3e6dc]">
          {first.image ? (
            <img alt={first.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={first.image} />
          ) : (
            <div className="grid h-full w-full place-items-center text-[#9a8b82]"><PackageCheck size={28} /></div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-[#4d8a35] shadow-sm">
            Delivered
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9a8b82]">{order.orderId}</p>
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
                active ? "border-[#fd761a] bg-[#fd761a] text-white" : "border-[#d8c9be] bg-white text-transparent"
              }`}
            >
              <CheckCircle2 size={16} />
            </span>
          </div>
          <h2 className="mt-2 line-clamp-2 text-[17px] font-black leading-tight tracking-[-0.035em] text-[#342821]">
            {first.name}
            {(order.items?.length || 1) > 1 ? <span className="ml-2 font-semibold text-[#9a8b82]">+{(order.items.length - 1)} more</span> : null}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-black text-[#6c5f58]">
            <span className="rounded-full bg-white px-3 py-1.5">{INR(order.orderTotal)}</span>
            <span className="rounded-full bg-white px-3 py-1.5">Delivered {fmtDate(order.deliveredAt)}</span>
          </div>
        </div>
      </div>
      <div className={`mt-4 h-1.5 rounded-full transition ${active ? "bg-[#fd761a]" : "bg-[#eadfd7] group-hover:bg-[#f4b487]"}`} />
    </button>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[#ffd3c0] text-[#c7470a]">
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <h2 className="text-[24px] font-black tracking-[-0.035em]">{title}</h2>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-[11px] border border-[#eadfd7] bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a8b82]">{label}</p>
      <p className="mt-2 truncate text-[13px] font-black text-[#342821]">{value}</p>
    </div>
  );
}

function StatusSummary({ requestId, status, rma }) {
  const c = canon(status);
  const activeIndex = PIPELINE_INDEX[c] ?? 0;
  const done = c === "completed";

  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-[#351405] px-6 py-6 text-white shadow-[0_14px_28px_rgba(53,20,5,0.18)]">
      <div className="flex items-center gap-3">
        <RotateCcw size={20} className="text-[#ff8b54]" />
        <h3 className="text-[18px] font-black">Latest Return</h3>
      </div>
      <p className="mt-3 text-[12px] font-bold text-white/68">{requestId || "No return request yet"}</p>
      {rma ? <p className="mt-1 text-[12px] font-black text-[#ff8b54]">{rma}</p> : null}
      <div className="mt-6 space-y-4">
        {PIPELINE.map((step, index) => {
          const reached = done || index <= activeIndex;
          return (
            <div className="flex items-center gap-3" key={step}>
              <span className={`grid h-8 w-8 place-items-center rounded-full ${reached ? "bg-[#ff7624]" : "bg-white/14"}`}>
                {reached ? <CheckCircle2 size={16} /> : <Clock3 size={15} />}
              </span>
              <span className="text-[13px] font-black">{step}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReturnTrackingDetail({ request }) {
  const c = canon(request.status);
  const activeIndex = TERMINAL.has(c) ? -1 : (PIPELINE_INDEX[c] ?? 0);
  const done = c === "completed";

  return (
    <div className="mt-6 rounded-[18px] border border-[#eadfd7] bg-white px-5 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9a8b82]">Tracking result</p>
          <h3 className="mt-2 text-[22px] font-black tracking-[-0.035em] text-[#342821]">{request.returnId}</h3>
          {request.rmaNumber ? <p className="mt-1 text-[13px] font-black text-[#fd761a]">RMA: {request.rmaNumber}</p> : null}
        </div>
        <span className={`w-fit rounded-full px-4 py-2 text-[12px] font-black ${statusTone(request.status)}`}>
          Current: {statusLabel(request.status)}
        </span>
      </div>

      {c === "rejected" ? (
        <p className="mt-5 flex items-start gap-2 rounded-[12px] border border-[#ffcfc6] bg-[#fff1ee] px-4 py-3 text-[13px] font-bold text-[#b62917]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Rejected: {request.rejectionReason || request.decisionReason || "Not eligible under the return policy."} Contact support to appeal.
        </p>
      ) : null}
      {c === "pickup_failed" ? (
        <p className="mt-5 flex items-start gap-2 rounded-[12px] bg-[#fff8f1] px-4 py-3 text-[13px] font-bold text-[#8a4a17]">
          <Truck size={16} className="mt-0.5 shrink-0" />
          Pickup failed{request.shipment?.lastFailureReason ? `: ${request.shipment.lastFailureReason}` : ""}. We are rescheduling — a drop-off alternative is available if needed.
        </p>
      ) : null}
      {c === "on_hold" ? (
        <p className="mt-5 flex items-start gap-2 rounded-[12px] bg-[#fff8f1] px-4 py-3 text-[13px] font-bold text-[#8a4a17]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          On hold after inspection{request.inspection?.findings ? `: ${request.inspection.findings}` : ""}. The published policy is being applied.
        </p>
      ) : null}
      {c === "refund_failed" ? (
        <p className="mt-5 flex items-start gap-2 rounded-[12px] border border-[#ffcfc6] bg-[#fff1ee] px-4 py-3 text-[13px] font-bold text-[#b62917]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Refund is pending{request.refund?.failureReason ? `: ${request.refund.failureReason}` : ""}. The request stays open and finance has been alerted.
        </p>
      ) : null}
      {request.shipment?.instructions || request.shippingInstructions ? (
        <p className="mt-5 rounded-[12px] bg-[#eef3fd] px-4 py-3 text-[13px] font-semibold leading-6 text-[#315c9f]">
          {request.shipment?.instructions || request.shippingInstructions}
          {request.shipment?.courier ? ` Courier: ${request.shipment.courier}.` : ""}
          {request.shipment?.trackingNumber ? ` Tracking: ${request.shipment.trackingNumber}.` : ""}
        </p>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-4 lg:grid-cols-7">
        {PIPELINE.map((step, index) => {
          const isComplete = done || index < activeIndex;
          const isCurrent = !done && !TERMINAL.has(c) && index === activeIndex;
          const isActive = done || index <= activeIndex;
          return (
            <div className="relative" key={step}>
              <div className="relative flex items-center gap-4 md:flex-col md:items-start">
                <span
                  className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-4 transition-all duration-500 ${
                    isCurrent
                      ? "animate-pulse border-[#ffd3c0] bg-[#fd761a] text-white shadow-[0_0_0_8px_rgba(253,118,26,0.12)]"
                      : isComplete
                        ? "border-[#d8edc8] bg-[#4d8a35] text-white"
                        : "border-[#eadfd7] bg-[#fffaf6] text-[#9a8b82]"
                  }`}
                >
                  {isComplete ? <CheckCircle2 size={20} /> : isCurrent ? <CircleDot size={20} /> : <Clock3 size={18} />}
                </span>
                <div className="min-w-0">
                  <p className={`text-[13px] font-black ${isActive ? "text-[#342821]" : "text-[#9a8b82]"}`}>{step}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 text-[#6c5f58]">
                    {isCurrent ? "Current status" : isComplete ? "Completed" : "Pending update"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(request.statusHistory || []).length > 0 ? (
        <div className="mt-8 border-t border-[#f5eee8] pt-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9a8b82]">Audit trail</p>
          <div className="mt-3 space-y-2.5">
            {(request.statusHistory || []).slice().reverse().slice(0, 8).map((h, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-[12px]">
                <p className="font-bold text-[#342821]">
                  {statusLabel(h.from)} → {statusLabel(h.to)}
                  <span className="ml-2 font-semibold text-[#9a8b82]">by {h.actorRole}</span>
                </p>
                <p className="shrink-0 font-semibold text-[#9a8b82]">{fmtDate(h.timestamp)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PolicyCard() {
  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
      <div className="flex items-center gap-3">
        <ShieldCheck size={20} className="text-[#4d8a35]" />
        <h3 className="text-[18px] font-black">Return Policy Summary</h3>
      </div>
      <ul className="mt-4 space-y-3 text-[13px] font-semibold leading-6 text-[#5f5650]">
        <li>Returns are accepted within 7 days of delivery (per-product window applies).</li>
        <li>Only delivered orders and returnable categories qualify.</li>
        <li>Attach product photos — the admin reviews them before approving or rejecting.</li>
        <li>Keep invoices, packaging, and product labels available.</li>
      </ul>
      <div className="mt-5 rounded-[12px] bg-[#fff1e4] px-4 py-4 text-[13px] font-black text-[#b64008]">
        Estimated refund timeline: 3-5 business days after approval.
      </div>
    </section>
  );
}

function SupportCard() {
  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
      <div className="flex items-center gap-3">
        <Truck size={20} className="text-[#c7470a]" />
        <h3 className="text-[18px] font-black">Customer Support</h3>
      </div>
      <div className="mt-4 space-y-3 text-[13px] font-bold text-[#5f5650]">
        <p className="flex items-center gap-3"><Phone size={15} /> +91 98765 43210</p>
        <p className="flex items-center gap-3"><Mail size={15} /> returns@machinichi.com</p>
      </div>
    </section>
  );
}

function FaqCard() {
  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
      <div className="flex items-center gap-3">
        <HelpCircle size={20} className="text-[#c7470a]" />
        <h3 className="text-[18px] font-black">Return FAQs</h3>
      </div>
      <div className="mt-4 space-y-4 text-[13px] font-semibold leading-6 text-[#5f5650]">
        <p><strong>Can I return partial items?</strong><br />Yes — select only the items and quantities you want to return. The rest of the order stays intact.</p>
        <p><strong>Do I need proof?</strong><br />Yes — at least one product photo is mandatory for every return request.</p>
        <p className="flex gap-2 rounded-[12px] bg-[#fff8f1] px-4 py-3 text-[#8a4a17]">
          <AlertCircle size={16} className="mt-1 shrink-0" />
          Refunds go to the original payment method; replacements and store credit are confirmed at resolution.
        </p>
      </div>
    </section>
  );
}

export default Return;
