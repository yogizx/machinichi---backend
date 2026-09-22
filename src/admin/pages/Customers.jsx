import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain, Check, ChevronDown, ChevronLeft, ChevronRight,
  Download, Loader2, MoreVertical, Search,
  Settings2, Tags, UserPlus, UsersRound, X, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "../components/AdminLayout";
import API from "../../services/api";

const PER_PAGE = 15;

const TIERS = ["Gold Member", "Organic Tier", "Regular"];
const TIER_COLORS = {
  "Gold Member": "bg-[#3a1100] text-white",
  "Organic Tier": "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "Regular": "bg-gray-100 text-gray-700 border border-gray-200",
};

function getInitials(name) {
  return name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    "from-[#fd761a] to-[#3a1100]","from-[#22c55e] to-[#14532d]",
    "from-[#3b82f6] to-[#1e3a8a]","from-[#a855f7] to-[#581c87]",
    "from-[#f59e0b] to-[#78350f]","from-[#ef4444] to-[#7f1d1d]",
  ];
  const code = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[code % colors.length];
}

export default function Customers({ onAdminLogout }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" });
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const fetchCustomers = useCallback(async (p = page) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: p, limit: PER_PAGE });
      if (search) params.set("search", search);
      const { data } = await API.get(`/admin/customers?${params}`);
      if (data.success) {
        setCustomers(data.data || []);
        setTotal(data.pagination?.total || data.data?.length || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else throw new Error(data.message);
    } catch (e) { setError(e.response?.data?.message || "Failed to load customers"); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchCustomers(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [page]);

  const fetchRef = useRef(fetchCustomers); fetchRef.current = fetchCustomers;
  useEffect(() => {
    const t = setInterval(() => fetchRef.current(), 20000);
    return () => clearInterval(t);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!tierFilter.length) return customers;
    return customers.filter(c => tierFilter.includes(c.tier || "Regular"));
  }, [customers, tierFilter]);

  const metrics = useMemo(() => ({
    total,
    gold: customers.filter(c => c.tier === "Gold Member").length,
    avgOrders: customers.length ? (customers.reduce((s,c) => s + (c.orderCount||0), 0) / customers.length).toFixed(1) : "0",
  }), [customers, total]);

  const exportCSV = () => {
    const rows = filteredCustomers.map(c => [
      c.name||"",
      c.email||"",
      c.phone||"",
      c.tier||"Regular",
      c.orderCount||0,
      c.lastActive ? new Date(c.lastActive).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
      c.cartItems||0,
    ].map(v => `"${v}"`).join(","));
    const csv = ["Name,Email,Phone,Tier,Orders,Last Active,Add to Cart", ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "machinichi-customers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim() || !newCustomer.email.trim()) { setAddError("Name and email are required."); return; }
    setAddSaving(true); setAddError("");
    try {
      await API.post("/admin/customers", newCustomer);
      setAddOpen(false);
      setNewCustomer({ name: "", email: "", phone: "" });
      fetchCustomers(1);
    } catch (err) { setAddError(err.response?.data?.message || "Failed to add customer"); }
    setAddSaving(false);
  };

  const safePage = Math.min(page, totalPages);

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#faf9f6] text-[#21150f] px-5 py-8 sm:px-8 lg:px-10">

        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-[#3a1100] font-serif">Customer CRM</h1>
            <p className="mt-1.5 text-[13.5px] font-semibold text-[#796d66]">Manage your customer base, tiers, and regional insights</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={exportCSV} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12.5px] font-black text-[#5c514b] shadow-sm hover:bg-gray-50 transition" type="button">
              <Download size={14}/> Export CSV
            </button>
            <button onClick={() => { setAddOpen(true); setAddError(""); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fd761a] px-5 text-[12.5px] font-black text-white shadow-[0_4px_12px_rgba(253,118,26,0.15)] transition hover:bg-[#e86710]" type="button">
              <UserPlus size={14}/> Add Customer
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 mb-8">
          {[
            { label: "Total Customers", val: total.toLocaleString("en-IN"), icon: UsersRound, color: "text-[#3a1100] bg-white border-[#efe5dc]" },
            { label: "Gold Members", val: metrics.gold.toLocaleString("en-IN"), icon: Tags, color: "text-amber-700 bg-amber-50/40 border-amber-100" },
            { label: "Avg. Orders / Customer", val: metrics.avgOrders, icon: Brain, color: "text-emerald-700 bg-emerald-50/40 border-emerald-100" },
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

        {/* Main content: Table */}
        <div className="w-full space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#efe5dc] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8b82]"/>
                <input value={search || ""} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
                  className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-10 pr-4 text-[13px] outline-none placeholder:text-[#9a8b82] focus:border-[#fd761a] focus:bg-white transition"/>
              </div>
              <div className="flex items-center gap-2">
                {/* Tier filter */}
                <div className="relative">
                  <button onClick={() => setFilterOpen(o => !o)} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] hover:bg-white transition" type="button">
                    <Settings2 size={13}/> Filter {tierFilter.length > 0 && `(${tierFilter.length})`}
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-[#efe5dc] bg-white shadow-xl p-2">
                      {TIERS.map(t => (
                        <button key={t} type="button" onClick={() => setTierFilter(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev,t])}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[12.5px] font-black text-[#3a1100] hover:bg-[#faf7f4] transition">
                          {t}
                          {tierFilter.includes(t) && <Check size={13} className="text-[#fd761a]"/>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => { setSearch(""); setTierFilter([]); }} className="grid h-10 w-10 place-items-center rounded-xl border border-[#e5d8cd] text-[#796d66] hover:bg-gray-50 transition" type="button">
                  <RefreshCw size={13}/>
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={28} className="animate-spin text-[#fd761a]"/>
                  <p className="text-[12.5px] font-bold text-[#796d66]">Loading customers...</p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 text-center">
                <p className="text-[13.5px] font-bold text-rose-700">{error}</p>
                <button onClick={() => fetchCustomers()} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-black text-white hover:bg-rose-700" type="button">Retry</button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="rounded-2xl border border-[#efe5dc] bg-white px-8 py-16 text-center shadow-sm">
                <UsersRound size={36} className="mx-auto text-[#c7bab0] mb-3"/>
                <p className="text-[15px] font-black text-[#3a1100] font-serif">No customers found</p>
                <p className="mt-1 text-[12.5px] text-[#796d66]">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-[#faf8f5] text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] border-b border-[#efe5dc]">
                      <tr>
                        <th className="px-5 py-4">Customer Name</th>
                        <th className="px-5 py-4">Contact</th>
                        <th className="px-5 py-4">Tier</th>
                        <th className="px-5 py-4 text-center">Orders</th>
                        <th className="px-5 py-4">Joined</th>
                        <th className="px-5 py-4">Last Active</th>
                        <th className="px-5 py-4 text-center">Add to Cart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5eee8] bg-white text-[13px]">
                        {filteredCustomers.map((c, i) => {
                         const initials = getInitials(c.name || c.email || "U");
                         const avatarColor = getAvatarColor(c.name || "User");
                         const joinDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                         const lastActive = c.lastActive ? new Date(c.lastActive).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
                         const tier = c.tier || "Regular";
                         const tierStyle = TIER_COLORS[tier] || "bg-gray-100 text-gray-600 border border-gray-200";

                         return (
                           <tr key={c._id || i} className="transition hover:bg-[#fffcf9]/50">
                             <td className="px-5 py-4">
                               <div className="flex items-center gap-3">
                                 <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarColor} text-[11px] font-black text-white shadow-sm`}>
                                   {initials}
                                 </span>
                                 <span className="min-w-0">
                                   <span className="block font-bold text-[#3a1100]">{c.name || "—"}</span>
                                 </span>
                               </div>
                             </td>
                             <td className="px-5 py-4">
                               <p className="text-[12.5px] text-[#5c514b]">{c.email || "—"}</p>
                               {c.phone && <p className="text-[11px] text-[#9a8b82] mt-0.5">{c.phone}</p>}
                             </td>
                             <td className="px-5 py-4">
                               <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider ${tierStyle}`}>
                                 {tier}
                               </span>
                             </td>
                             <td className="px-5 py-4 text-center">
                               <span className="text-[15px] font-black text-[#211713]">{c.orderCount || 0}</span>
                             </td>
                             <td className="px-5 py-4 text-[12px] text-[#796d66]">{joinDate}</td>
                             <td className="px-5 py-4 text-[12px] text-[#796d66]">{lastActive}</td>
                             <td className="px-5 py-4 text-center">
                               <span className="text-[15px] font-black text-[#211713]">{c.cartItems || 0}</span>
                             </td>
                           </tr>
                         );
                       })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f5eee8] bg-[#faf8f5] px-5 py-4">
                  <p className="text-[12px] font-bold text-[#796d66]">Showing {filteredCustomers.length} of {total} customers</p>
                  <div className="flex items-center gap-1.5">
                    <button disabled={safePage<=1} onClick={()=>setPage(p=>p-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 hover:border-[#fd761a] transition" type="button"><ChevronLeft size={15}/></button>
                    {Array.from({length:totalPages},(_,i)=>i+1).slice(Math.max(0,safePage-3),safePage+2).map(p=>(
                      <button key={p} onClick={()=>setPage(p)} className={`h-9 min-w-[36px] rounded-lg text-[12.5px] font-black transition ${safePage===p?"bg-[#3a1100] text-white":"border border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a]"}`} type="button">{p}</button>
                    ))}
                    <button disabled={safePage>=totalPages} onClick={()=>setPage(p=>p+1)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 hover:border-[#fd761a] transition" type="button"><ChevronRight size={15}/></button>
                  </div>
                </footer>
              </div>
            )}
          </div>



        {/* Add Customer Modal */}
        <AnimatePresence>
          {addOpen && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 z-50 grid place-items-center bg-[#21150f]/50 px-4 backdrop-blur-[3px]"
              onClick={e => { if (e.target===e.currentTarget) setAddOpen(false); }}>
              <motion.form initial={{scale:0.96,y:12}} animate={{scale:1,y:0}} exit={{scale:0.96,y:12}}
                onSubmit={handleAddCustomer}
                className="w-full max-w-[440px] rounded-2xl bg-white border border-[#efe5dc] shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5 border-b border-[#f5eee8] pb-4">
                  <h2 className="text-[17px] font-black text-[#3a1100] font-serif">Add Customer</h2>
                  <button onClick={()=>setAddOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-[#efe5dc] text-gray-400 hover:text-gray-600" type="button"><X size={15}/></button>
                </div>
                {addError && <p className="mb-4 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[12.5px] font-bold text-rose-700">{addError}</p>}
                <div className="space-y-4">
                  {[["Full Name","text","name","e.g. Priya Sharma"],["Email Address","email","email","priya@example.com"],["Phone Number","tel","phone","e.g. 9876543210"]].map(([label,type,field,placeholder])=>(
                    <div key={field}>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">{label}</label>
                      <input type={type} value={newCustomer[field] || ""} onChange={e=>setNewCustomer(p=>({...p,[field]:e.target.value}))} placeholder={placeholder}
                        className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white transition"/>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex justify-end gap-2.5 border-t border-[#f5eee8] pt-4">
                  <button onClick={()=>setAddOpen(false)} className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]" type="button">Cancel</button>
                  <button type="submit" disabled={addSaving} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#fd761a] hover:bg-[#e86710] px-5 text-[12px] font-black text-white transition disabled:opacity-60">
                    {addSaving ? <Loader2 size={12} className="animate-spin"/> : <UserPlus size={12}/>} Save Customer
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dismiss dropdowns */}
        {filterOpen && <div className="fixed inset-0 z-20" onClick={()=>setFilterOpen(false)}/>}
      </div>
    </AdminLayout>
  );
}
