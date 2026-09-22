import { useState, useEffect } from "react";
import { Ban, Check, ChevronLeft, ChevronRight, Clock, Download, Eye, FileText, Loader2, Package, X } from "lucide-react";
import api from "../../services/api";
import { motion } from "framer-motion";

export const ORDER_FLOW = ["Pending","Confirmed","Packed","Shipped","In Transit","Out For Delivery","Delivered"];

export const MACHINE_TO_DISPLAY = {
  pending_approval:"Pending", accepted:"Confirmed", packed:"Packed",
  shipped:"Shipped", in_transit:"In Transit", out_for_delivery:"Out For Delivery",
  delivered:"Delivered", cancelled:"Cancelled", returned:"Returned",
};

export const VALID_ACTIONS = {
  pending_approval:[{label:"Approve",value:"accepted",primary:true},{label:"Reject",value:"cancel",danger:true}],
  accepted:[{label:"Pack",value:"packed",primary:true},{label:"Cancel",value:"cancel",danger:true}],
  packed:[{label:"Ship",value:"shipped",primary:true},{label:"Cancel",value:"cancel",danger:true}],
  shipped:[{label:"Out For Delivery",value:"out_for_delivery",primary:true}],
  in_transit:[{label:"Out For Delivery",value:"out_for_delivery",primary:true}],
  out_for_delivery:[{label:"Delivered",value:"delivered",primary:true}],
  delivered:[], cancelled:[], returned:[],
};

const statusStyles = {
  Pending:"bg-amber-50 text-amber-700 border border-amber-200",
  Confirmed:"bg-blue-50 text-blue-700 border border-blue-200",
  Packed:"bg-blue-50 text-blue-700 border border-blue-200",
  Shipped:"bg-indigo-50 text-indigo-700 border border-indigo-200",
  "In Transit":"bg-orange-50 text-orange-700 border border-orange-100",
  "Out For Delivery":"bg-orange-50 text-orange-700 border border-orange-100",
  Delivered:"bg-emerald-50 text-emerald-700 border border-emerald-200",
  Cancelled:"bg-rose-50 text-rose-700 border border-rose-200",
  Returned:"bg-rose-50 text-rose-700 border border-rose-200",
};

export function StatusBadge({ status }) {
  const s = statusStyles[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide ${s}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{status}
    </span>
  );
}

export function PaymentBadge({ payment }) {
  const isCod = payment === "COD";
  return (
    <span className={`inline-flex rounded px-2.5 py-1 text-[10.5px] font-black uppercase ${isCod ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
      {payment}
    </span>
  );
}

export function ActionMenu({ machineStatus, onAction }) {
  const actions = VALID_ACTIONS[machineStatus] || [];
  if (!actions.length) return (
    <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-[#efe5dc] bg-white shadow-xl p-3">
      <p className="text-[12px] font-bold text-[#796d66]">
        {machineStatus === "delivered" ? "✓ Order Delivered" : machineStatus === "cancelled" ? "✕ Cancelled" : "No actions available"}
      </p>
    </div>
  );
  return (
    <div className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border border-[#efe5dc] bg-white shadow-xl">
      {actions.map((a) => (
        <button key={a.value} onClick={() => onAction(a.value)} type="button"
          className={`block w-full px-4 py-3 text-left text-[12.5px] font-black transition hover:bg-[#faf7f4] ${a.danger ? "text-rose-600" : a.primary ? "text-[#fd761a]" : "text-[#3a1100]"}`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

const Backdrop = ({ onClose, children }) => (
  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
    className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 px-4 py-6 backdrop-blur-[3px]"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.div initial={{scale:0.96,y:12}} animate={{scale:1,y:0}} exit={{scale:0.96,y:12}}
      className="w-full" onClick={e => e.stopPropagation()}>
      {children}
    </motion.div>
  </motion.div>
);

export function CancelModal({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(false);
  return (
    <Backdrop onClose={onClose}>
      <div className="mx-auto max-w-[440px] rounded-2xl border border-[#efe5dc] bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-rose-700 font-serif"><Ban size={17} /> Cancel Order</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-[#efe5dc] text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>
        <p className="text-[13px] font-semibold text-[#796d66] mb-4">{order.id} — {order.customer}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Cancel Reason</label>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
              className="w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 py-2.5 text-[13px] outline-none focus:border-rose-400 resize-none"
              placeholder="Why is this order being cancelled?" />
          </div>
          <label className="flex items-center gap-3 rounded-xl bg-rose-50/40 border border-rose-100 px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={refund} onChange={e=>setRefund(e.target.checked)} className="h-4 w-4 accent-rose-600" />
            <span className="text-[13px] font-bold text-[#3a1100]">Trigger Refund</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2.5 border-t border-[#f5eee8] pt-4">
          <button onClick={onClose} className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]" type="button">Back</button>
          <button onClick={()=>onSubmit(reason,refund)} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 text-[12px] font-black text-white transition" type="button">Cancel Order</button>
        </div>
      </div>
    </Backdrop>
  );
}

export function DelayModal({ order, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  return (
    <Backdrop onClose={onClose}>
      <div className="mx-auto max-w-[440px] rounded-2xl border border-[#efe5dc] bg-white shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-amber-700 font-serif"><Clock size={17}/> Log Delay</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-[#efe5dc] text-gray-400"><X size={15}/></button>
        </div>
        <p className="text-[13px] font-semibold text-[#796d66] mb-4">{order.id} — {order.customer}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Delay Reason</label>
            <select value={reason} onChange={e=>setReason(e.target.value)} className="h-11 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-amber-400">
              <option value="">Select reason...</option>
              <option>Inventory shortage</option><option>Logistics delay</option>
              <option>Weather conditions</option><option>Carrier issue</option>
              <option>Quality check</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">New Expected Delivery</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="h-11 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-amber-400"/>
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Note to Customer</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} className="w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 py-2 text-[13px] outline-none focus:border-amber-400 resize-none" placeholder="Apologize and explain..."/>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5 border-t border-[#f5eee8] pt-4">
          <button onClick={onClose} className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]" type="button">Back</button>
          <button disabled={!reason||!date} onClick={()=>onSubmit(reason,date,note)} className="h-10 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 text-[12px] font-black text-white transition disabled:opacity-50" type="button">Confirm Delay</button>
        </div>
      </div>
    </Backdrop>
  );
}

export function InvoiceModal({ order, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const items = order.items || [];
  const subtotal = items.reduce((s,i)=>s+(i.sellingPrice||0)*(i.quantity||1),0);
  const gst = items.reduce((s,i)=>s+(i.gstAmount||0),0);

  const download = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get(`/orders/${order._id}/invoice`,{responseType:"blob"});
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      const a = document.createElement("a"); a.href=url; a.download=`invoice-${order.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch(err) { alert(err.response?.data?.message||"Failed"); }
    setDownloading(false);
  };

  return (
    <Backdrop onClose={onClose}>
      <div className="mx-auto max-w-[600px] rounded-2xl border border-[#efe5dc] bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4">
          <h2 className="flex items-center gap-2 text-[17px] font-black text-[#3a1100] font-serif"><FileText size={17}/> Invoice Preview</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-[#efe5dc] text-gray-400"><X size={15}/></button>
        </div>
        <div className="p-6">
          <div className="flex justify-between mb-5">
            <div className="text-[13px] text-[#5c514b] space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82]">Order</p>
              <p className="font-black text-[#3a1100]">{order.id}</p>
              <p className="font-semibold">{order.customer}</p>
              <p className="text-[#9a8b82]">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82]">Total</p>
              <p className="text-[24px] font-black text-[#fd761a] font-serif">₹{(subtotal+gst).toLocaleString("en-IN")}</p>
            </div>
          </div>
          <table className="w-full text-left text-[12.5px] mb-4">
            <thead className="border-b border-[#f5eee8] text-[10px] font-black uppercase tracking-wider text-[#9a8b82]">
              <tr><th className="pb-2">Item</th><th className="pb-2">SKU</th><th className="pb-2 text-center">Qty</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-[#f5eee8]">
              {items.map((item,i)=>(
                <tr key={i}>
                  <td className="py-2.5 font-semibold text-[#3a1100]">{item.name}</td>
                  <td className="py-2.5 text-[#796d66]">{item.sku||"—"}</td>
                  <td className="py-2.5 text-center font-black">×{item.quantity||1}</td>
                  <td className="py-2.5 text-right">₹{(item.sellingPrice||0).toLocaleString("en-IN")}</td>
                  <td className="py-2.5 text-right font-black">₹{((item.sellingPrice||0)*(item.quantity||1)).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[#f5eee8] pt-3 space-y-1 text-right text-[12.5px]">
            <p className="text-[#796d66]">Subtotal: ₹{subtotal.toLocaleString("en-IN")}</p>
            <p className="text-[#796d66]">GST: ₹{gst.toLocaleString("en-IN")}</p>
            <p className="text-[16px] font-black text-[#3a1100]">Total: ₹{(subtotal+gst).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-[#f5eee8] bg-[#faf7f4] px-6 py-4">
          <button onClick={onClose} className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]" type="button">Close</button>
          <button onClick={download} disabled={downloading} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#3a1100] hover:bg-[#fd761a] px-5 text-[12px] font-black text-white transition disabled:opacity-60" type="button">
            {downloading?<Loader2 size={13} className="animate-spin"/>:<Download size={13}/>} Download PDF
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

export function OrderDetailModal({ order, onClose, onStatusUpdate, onCancel }) {
  const [detailedOrder, setDetailedOrder] = useState(order);
  const items = detailedOrder.items||[];
  const ms = detailedOrder.machineStatus||"pending_approval";
  const displayStatus = MACHINE_TO_DISPLAY[ms]||detailedOrder.status;
  const currentStep = ORDER_FLOW.indexOf(displayStatus);
  const addr = detailedOrder.shippingAddress||{};
  const validActions = VALID_ACTIONS[ms] || [];
  const [actionLoading, setActionLoading] = useState(false);

  const scratchDisc = detailedOrder.scratchDiscount || {};
  const promoDisc = detailedOrder.promoDiscount || {};
  const scratchAmount = typeof scratchDisc === 'number' ? scratchDisc : (scratchDisc.discountAmount || 0);
  const promoAmount = typeof promoDisc === 'number' ? promoDisc : (promoDisc.discountAmount || 0);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const { data } = await api.get(`/orders/${order._id}`);
        if (data.success && data.data) {
          const o = data.data;
          setDetailedOrder({
            ...order,
            items: o.items || order.items,
            customerTotalOrders: o.customerTotalOrders,
            customerLifetimeSpend: o.customerLifetimeSpend,
            userId: o.userId,
            shippingAddress: o.shippingAddress,
            couponCode: o.couponCode,
            scratchDiscount: o.scratchDiscount,
            promoDiscount: o.promoDiscount,
            subtotal: o.subtotal,
            totalDiscount: o.totalDiscount,
            shippingCharges: o.shippingCharges,
            totalGst: o.totalGst,
            amount: o.totalAmount || o.orderTotal,
          });
        }
      } catch (err) {
        console.error("Failed to fetch order details", err);
      }
    };
    fetchOrderDetails();
  }, [order._id]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'cancel') {
        if (onCancel) {
          onCancel(order._id, '', false);
        }
      } else {
        if (onStatusUpdate) {
          await onStatusUpdate(order._id, action);
        }
      }
    } catch {}
    setActionLoading(false);
  };

  const customerSinceDate = detailedOrder.userId?.createdAt ? new Date(detailedOrder.userId.createdAt) : null;
  const customerSinceStr = customerSinceDate 
    ? customerSinceDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  const subtotal = items.reduce((s,i) => s + (i.sellingPrice||0)*(i.quantity||1), 0);
  const totalGst = items.reduce((s,i) => s + (i.gstAmount||0), 0);
  const totalMrp = items.reduce((s,i) => s + (i.mrpPrice||i.mrp||0)*(i.quantity||1), 0);
  const totalDiscount = detailedOrder.totalDiscount || (totalMrp - subtotal) || 0;

  return (
    <Backdrop onClose={onClose}>
      <div className="mx-auto max-w-[960px] max-h-[90vh] overflow-y-auto rounded-2xl border border-[#efe5dc] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-[18px] font-black text-[#3a1100] font-serif">Order {order.id}</h2>
              <p className="text-[12px] font-semibold text-[#796d66]">{order.date}</p>
            </div>
            <StatusBadge status={order.status}/>
            <PaymentBadge payment={order.payment}/>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-[#efe5dc] bg-white text-gray-400 hover:text-gray-600"><X size={16}/></button>
        </div>

        {/* Timeline */}
        <div className="px-6 py-5 border-b border-[#f5eee8] bg-[#fdfbf9]/50">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-4">Order Progress</p>
          <div className="flex items-center">
            {ORDER_FLOW.map((step,idx)=>{
              const done=idx<currentStep, active=idx===currentStep;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black shadow-sm ${done?"bg-emerald-600 text-white":active?"bg-[#fd761a] text-white ring-4 ring-[#fd761a]/15":"bg-[#f0e9e2] text-[#9a8b82]"}`}>
                      {done?<Check size={11} strokeWidth={3}/>:idx+1}
                    </div>
                    <span className={`mt-1.5 text-[8.5px] font-black text-center whitespace-nowrap ${active?"text-[#fd761a]":done?"text-emerald-600":"text-[#9a8b82]"}`}>{step}</span>
                  </div>
                  {idx<ORDER_FLOW.length-1&&<div className={`mx-1 mt-[-16px] h-[2px] flex-1 ${idx<currentStep?"bg-emerald-500":"bg-[#f0e9e2]"}`}/>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Order Details */}
            <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">ORDER DETAILS</p>
              <div className="text-[12.5px] space-y-2">
                <div className="flex justify-between"><span className="text-[#796d66]">Order ID</span><span className="font-bold text-[#3a1100]">{order.id}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Coupon</span><span className="font-bold text-[#3a1100]">{order.couponCode || '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Scratch Card Discount</span><span className="font-bold text-emerald-600">-₹{(scratchAmount||0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Shipping Method</span><span className="font-bold text-[#3a1100] capitalize">{order.shippingMethod || 'standard'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Delivery Charge</span><span className="font-bold text-[#3a1100]">₹{(order.shippingCharges||0).toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">Items ({items.length})</p>
              <div className="space-y-2">
                {items.map((item,i)=>{
                  const productName = item.productId?.name || item.name;
                  const productImage = item.productId?.images?.[0]?.url || item.image;
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-[#efe5dc] bg-white p-2.5">
                      <div className="relative h-12 w-12 shrink-0">
                        <img src={productImage||"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=120&q=80"} alt={productName} className="h-full w-full rounded-lg object-cover"/>
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#fd761a] text-[9px] font-black text-white">{item.quantity||1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-[#3a1100] truncate">{productName}</p>
                        <p className="text-[10px] text-[#796d66]">{item.variantSize?`${item.variantSize} · `:""}{item.sku||""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-black text-[#3a1100]">₹{((item.sellingPrice||0)*(item.quantity||1)).toLocaleString("en-IN")}</p>
                        <p className="text-[9px] text-[#9a8b82]">₹{(item.sellingPrice||0).toLocaleString("en-IN")} each</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment & Summary */}
            <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4 text-[12.5px]">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">PAYMENT & SUMMARY</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-[#796d66]">Subtotal</span><span className="font-bold text-[#3a1100]">₹{subtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Discount</span><span className="font-bold text-emerald-600">-₹{(totalDiscount||0).toLocaleString('en-IN')}</span></div>
                {scratchAmount > 0 && <div className="flex justify-between"><span className="text-[#796d66]">Scratch Card</span><span className="font-bold text-emerald-600">-₹{scratchAmount.toLocaleString('en-IN')}</span></div>}
                {promoAmount > 0 && <div className="flex justify-between"><span className="text-[#796d66]">Promo ({order.couponCode||''})</span><span className="font-bold text-emerald-600">-₹{promoAmount.toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between"><span className="text-[#796d66]">Taxes (GST)</span><span className="font-bold text-[#3a1100]">₹{(order.totalGst||totalGst||0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Shipping</span><span className="font-bold text-[#3a1100]">₹{(order.shippingCharges||0).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between pt-2 border-t border-[#f5eee8]">
                  <span className="font-black text-[#3a1100]">Grand Total</span>
                  <span className="text-[18px] font-black text-[#fd761a]">₹{(order.amount||0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1"><span className="text-[#796d66]">Payment</span><span className={`font-bold ${order.payment==='Paid'||order.payment==='COD'?'text-emerald-600':'text-[#3a1100]'}`}>{order.payment}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Invoice</span><span className="font-bold text-[#3a1100]">{order.transactionId && order.transactionId !== 'N/A' ? order.transactionId : '—'}</span></div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">CUSTOMER DETAILS</p>
              <div className="text-[12.5px] space-y-2">
                <p className="font-bold text-[#3a1100] text-[14px]">{detailedOrder.customer}</p>
                <div className="flex justify-between"><span className="text-[#796d66]">Email</span><span className="font-bold text-[#3a1100]">{detailedOrder.email||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Phone</span><span className="font-bold text-[#3a1100]">{detailedOrder.phone||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Customer Since</span><span className="font-bold text-[#3a1100]">{customerSinceStr}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Total Orders</span><span className="font-bold text-[#3a1100]">{detailedOrder.customerTotalOrders||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Lifetime Spending</span><span className="font-bold text-[#fd761a]">₹{(detailedOrder.customerLifetimeSpend||0).toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            {/* Full Shipping Address */}
            <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">FULL SHIPPING ADDRESS</p>
              <div className="text-[12.5px] space-y-2">
                <div className="flex justify-between"><span className="text-[#796d66]">House/Flat</span><span className="font-bold text-[#3a1100] text-right max-w-[200px]">{addr.houseFlat||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Street</span><span className="font-bold text-[#3a1100] text-right max-w-[200px]">{addr.streetArea||addr.streetAddress||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Area</span><span className="font-bold text-[#3a1100] text-right max-w-[200px]">{addr.streetArea||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Landmark</span><span className="font-bold text-[#3a1100] text-right max-w-[200px]">{addr.landmark||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">City</span><span className="font-bold text-[#3a1100]">{addr.city||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">State</span><span className="font-bold text-[#3a1100]">{addr.state||'—'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Country</span><span className="font-bold text-[#3a1100]">{addr.country||'India'}</span></div>
                <div className="flex justify-between"><span className="text-[#796d66]">Pincode</span><span className="font-bold text-[#3a1100]">{addr.pincode||addr.zipCode||'—'}</span></div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="rounded-xl border border-[#efe5dc] bg-[#fdfbf9] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9a8b82] mb-3">ADMIN ACTIONS</p>
              {validActions.length === 0 ? (
                <p className="text-[12px] font-bold text-[#796d66] py-2">No actions available for this status.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {validActions.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => {
                        if (a.value === 'cancel') {
                          if (window.confirm(`Cancel order ${order.id}?`)) {
                            handleAction('cancel');
                          }
                        } else {
                          handleAction(a.value);
                        }
                      }}
                      disabled={actionLoading}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[11px] font-black transition disabled:opacity-50 ${
                        a.danger
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          : a.primary
                          ? 'bg-[#fd761a] text-white hover:bg-[#e56610]'
                          : 'border border-[#efe5dc] text-[#3a1100] hover:bg-[#faf7f4]'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
