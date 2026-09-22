import { useEffect, useMemo, useState } from "react";
import {
  Ban, BadgeX, BriefcaseBusiness, Building2, Check, ChevronLeft, ChevronRight,
  ExternalLink, Eye, Globe, ImageIcon, Link, Loader2, Mail, MapPin,
  MessageCircleMore, Phone, Search, ShieldAlert, ThumbsDown, ThumbsUp, User, Video, X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";

const _rawBase = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://machinichi-backend.onrender.com/api" : "http://localhost:3000/api");
const API_BASE = `${_rawBase.trim().replace(/\/+$/, "")}/admin/businesses`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const defaultLogo = "https://images.unsplash.com/photo-1504711434969-e33886168d6c?auto=format&fit=crop&w=120&q=80";

const tabs = ["All", "Pending", "Approved", "Rejected"];
const itemsPerPage = 10;

export default function BusinessApprovals({ onAdminLogout }) {
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const statusMap = { All: null, Pending: "pending", Approved: "approved", Rejected: "rejected" };

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: itemsPerPage });
      const status = statusMap[activeTab];
      if (status) params.set("status", status);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await fetch(`${API_BASE}?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBusinesses(data.businesses);
      setTotal(data.total);
    } catch {
      setBusinesses([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
  }, [activeTab, page]);

  const handleSearch = () => {
    setPage(1);
    fetchBusinesses();
  };

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const stats = useMemo(() => {
    const all = businesses.length;
    const pending = businesses.filter((b) => b.status === "pending").length;
    const approved = businesses.filter((b) => b.status === "approved").length;
    const rejected = businesses.filter((b) => b.status === "rejected").length;
    return { all, pending, approved, rejected };
  }, [businesses]);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/${id}/approve`, { method: "POST", headers: getAuthHeaders() });
      setSelected(null);
      fetchBusinesses();
    } catch {}
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await fetch(`${API_BASE}/${rejectModal}/reject`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setRejectModal(null);
      setRejectReason("");
      setSelected(null);
      fetchBusinesses();
    } catch {}
    setActionLoading(false);
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#fff7f0] px-4 py-5 text-[#21150f] sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[#eaded6] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[22px] font-black tracking-[-0.02em] text-[#7a1f06]">Business Approvals</h1>
            <p className="mt-1 text-[13px] font-medium text-[#8a7a70]">Review and manage business listing requests</p>
          </div>
          <label className="flex h-10 items-center gap-3 rounded-full border border-[#eaded6] bg-white px-4 text-[#9a8a80] transition focus-within:border-[#c35416] focus-within:shadow-[0_0_0_4px_rgba(195,84,22,0.1)] sm:w-[320px]">
            <Search size={16} />
            <input className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#322118] outline-none placeholder:text-[#9a8a80]"
              placeholder="Search businesses, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </label>
        </header>

        <section className="mt-6 grid gap-0 overflow-hidden rounded-[10px] border border-[#eaded6] bg-white shadow-[0_12px_24px_rgba(66,36,18,0.05)] sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Submissions", value: total, color: "text-[#18100b]" },
            { label: "Pending Review", value: stats.pending, color: "text-[#c77800]", accent: true },
            { label: "Approved", value: stats.approved, color: "text-[#13a64f]" },
            { label: "Rejected", value: stats.rejected, color: "text-[#c12f23]" },
          ].map((card) => (
            <article key={card.label}
              className={`min-h-[90px] border-b border-[#eaded6] p-5 transition hover:bg-[#fffaf6] sm:odd:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 ${card.accent ? "border-l-4 border-l-[#c43d0b]" : ""}`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.11em] text-[#9a8a80]">{card.label}</p>
              <p className={`mt-2 text-[30px] font-black tracking-[-0.04em] ${card.color}`}>{card.value}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 flex gap-4 overflow-x-auto border-b border-[#eaded6]">
          {tabs.map((tab) => (
            <button key={tab}
              className={`shrink-0 border-b-2 pb-3 text-[13px] font-black transition hover:text-[#9a2f09] ${
                activeTab === tab ? "border-[#c43d0b] text-[#9a2f09]" : "border-transparent text-[#6d5e55]"
              }`}
              onClick={() => { setActiveTab(tab); setPage(1); }}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#eaded6] bg-white shadow-[0_16px_34px_rgba(66,36,18,0.08)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-[#c35416]" />
            </div>
          ) : businesses.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Building2 size={48} className="text-[#d4c5ba]" />
              <p className="mt-4 text-[15px] font-bold text-[#8a7a70]">No businesses found</p>
              <p className="mt-1 text-[13px] text-[#aa9a90]">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-[#fffdf9] text-[11px] font-black uppercase tracking-[0.12em] text-[#8b7c73]">
                    <tr>
                      <th className="px-6 py-5">Business</th>
                      <th className="px-6 py-5">Owner</th>
                      <th className="px-6 py-5">Contact</th>
                      <th className="px-6 py-5">Submitted</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efe7e0]">
                    {businesses.map((biz) => (
                      <tr key={biz._id} className="transition hover:bg-[#fff7f0]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[#e3d6ce] bg-[#f7f0ea]">
                              <img src={biz.logo || defaultLogo} alt="" className="h-full w-full object-cover"
                                onError={(e) => { e.target.style.display = "none"; }} />
                            </span>
                            <div>
                              <p className="text-[14px] font-black leading-5 text-[#1e130d]">{biz.name}</p>
                              {biz.tagline && <p className="mt-0.5 text-[11px] text-[#9a8a80] line-clamp-1">{biz.tagline}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px] font-semibold text-[#2f2119]">{biz.ownerName || "—"}</td>
                        <td className="px-6 py-4">
                          <p className="text-[13px] font-semibold text-[#2f2119]">{biz.email || "—"}</p>
                          {biz.phone && <p className="mt-0.5 text-[11px] text-[#9a8a80]">{biz.phone}</p>}
                        </td>
                        <td className="px-6 py-4 text-[13px] text-[#5a4b42] whitespace-nowrap">
                          {new Date(biz.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black ${statusStyles[biz.status]}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {biz.status.charAt(0).toUpperCase() + biz.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <button
                              className="grid h-8 w-8 place-items-center rounded-[7px] text-[#7f7067] transition hover:-translate-y-0.5 hover:bg-[#f2e8df] hover:text-[#2b180e]"
                              onClick={() => setSelected(biz)}
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="flex flex-col gap-4 border-t border-[#efe7e0] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#9b8b82]">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, total)} of {total} businesses
                </p>
                <div className="flex items-center gap-2">
                  <PageButton disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft size={15} />
                  </PageButton>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PageButton key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageButton>
                  ))}
                  <PageButton disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight size={15} />
                  </PageButton>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {selected && (
        <BusinessDetailModal
          business={selected}
          onClose={() => setSelected(null)}
          onApprove={() => handleApprove(selected._id)}
          onReject={() => { setRejectModal(selected._id); setRejectReason(""); }}
          actionLoading={actionLoading}
        />
      )}

      {rejectModal && (
        <RejectModal
          reason={rejectReason}
          onChange={setRejectReason}
          onConfirm={handleReject}
          onClose={() => { setRejectModal(null); setRejectReason(""); }}
          loading={actionLoading}
        />
      )}
    </AdminLayout>
  );
}

function BusinessDetailModal({ business, onClose, onApprove, onReject, actionLoading }) {
  const b = business;

  const sections = [
    {
      title: "Basic Information",
      icon: Building2,
      fields: [
        { label: "Business Name", value: b.name },
        { label: "Tagline", value: b.tagline },
        { label: "Category", value: b.category },
        { label: "Description", value: b.description, full: true },
      ],
    },
    {
      title: "Owner Details",
      icon: User,
      fields: [
        { label: "Owner Name", value: b.ownerName },
        { label: "Designation", value: b.ownerDesignation },
        { label: "LinkedIn", value: b.ownerLinkedin, link: true },
        { label: "Website", value: b.ownerWebsite, link: true },
      ],
    },
    {
      title: "Contact Information",
      icon: Mail,
      fields: [
        { label: "Email", value: b.email },
        { label: "Phone", value: b.phone },
        { label: "Website", value: b.website, link: true },
      ],
    },
    {
      title: "Address",
      icon: MapPin,
      fields: [
        { label: "Address", value: b.address },
        { label: "City", value: b.city },
        { label: "State", value: b.state },
        { label: "Pincode", value: b.pincode },
      ],
    },
  ];

  const socialLinks = [
    { label: "Facebook", value: b.socialFacebook, icon: Globe },
    { label: "Instagram", value: b.socialInstagram, icon: ImageIcon },
    { label: "LinkedIn", value: b.socialLinkedin, icon: BriefcaseBusiness },
    { label: "Twitter / X", value: b.socialTwitter, icon: MessageCircleMore },
    { label: "WhatsApp", value: b.socialWhatsapp, icon: Phone },
    { label: "YouTube", value: b.socialYoutube, icon: Video },
  ].filter((s) => s.value);

  const images = b.images || [];
  const hasImages = images.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-[16px] border border-[#eaded6] bg-[#fffaf5] shadow-[0_28px_60px_rgba(33,21,15,0.28)] animate-modalIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-[#e7ded7] bg-white text-[#7f7067] transition hover:border-[#b62917] hover:text-[#b62917]">
          <X size={16} strokeWidth={2.4} />
        </button>

        <div className="overflow-y-auto">
          <div className="relative">
            {b.coverBanner ? (
              <div className="h-32 sm:h-44 overflow-hidden bg-[#f7f0ea]">
                <img src={b.coverBanner} alt="" className="h-full w-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }} />
              </div>
            ) : (
              <div className="h-16 sm:h-20 bg-gradient-to-r from-[#f7f0ea] to-[#ede3da]" />
            )}
            <div className={`px-6 sm:px-8 ${b.coverBanner ? "-mt-10 sm:-mt-14" : "mt-4"}`}>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex items-end gap-4">
                  <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border-2 border-white bg-[#f7f0ea] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                    {b.logo ? (
                      <img src={b.logo} alt="" className="h-full w-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <Building2 size={32} className="text-[#c4b5a8]" />
                    )}
                  </span>
                  <div className="pb-1">
                    <h2 className="text-[22px] font-black tracking-[-0.02em] text-[#1f130d]">{b.name}</h2>
                    {b.tagline && <p className="mt-0.5 text-[13px] text-[#8a7a70]">{b.tagline}</p>}
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-black self-start sm:self-end ${statusStyles[b.status]}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 pb-4 mt-6 space-y-5">
            {sections.map((section) => {
              const hasValue = section.fields.some((f) => f.value);
              if (!hasValue) return null;
              return (
                <div key={section.title} className="rounded-[12px] border border-[#ede3da] bg-white p-5">
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#fff1e8] text-[#c7470a]">
                      <section.icon size={16} strokeWidth={2.2} />
                    </span>
                    <h3 className="text-[14px] font-black tracking-[-0.01em] text-[#2b1b12]">{section.title}</h3>
                  </div>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {section.fields.map((f) => {
                      if (!f.value) return null;
                      const isLong = f.full;
                      return (
                        <div key={f.label} className={isLong ? "sm:col-span-2" : ""}>
                          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#9a8a80]">{f.label}</p>
                          {f.link ? (
                            <a href={f.value} target="_blank" rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#c35416] break-all hover:text-[#8a3b0a] hover:underline">
                              {f.value} <ExternalLink size={12} />
                            </a>
                          ) : (
                            <p className={`mt-1 text-[13px] font-semibold text-[#2f2119] ${isLong ? "whitespace-pre-wrap leading-relaxed" : "break-all"}`}>
                              {f.value}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {socialLinks.length > 0 && (
              <div className="rounded-[12px] border border-[#ede3da] bg-white p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#fff1e8] text-[#c7470a]">
                    <Link size={16} strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[14px] font-black tracking-[-0.01em] text-[#2b1b12]">Social Links</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {socialLinks.map((s) => (
                    <a key={s.label} href={s.value} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[8px] border border-[#ede3da] bg-[#fcf8f4] px-4 py-3 text-[13px] font-semibold text-[#2f2119] transition hover:border-[#c35416] hover:bg-[#fff7f0] hover:text-[#c35416]">
                      <s.icon size={16} className="shrink-0" />
                      <span className="truncate">{s.label}</span>
                      <ExternalLink size={12} className="ml-auto shrink-0 text-[#9a8a80]" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {hasImages && (
              <div className="rounded-[12px] border border-[#ede3da] bg-white p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#fff1e8] text-[#c7470a]">
                    <ImageIcon size={16} strokeWidth={2.2} />
                  </span>
                  <h3 className="text-[14px] font-black tracking-[-0.01em] text-[#2b1b12]">Media ({images.length})</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="group relative aspect-video overflow-hidden rounded-[10px] border border-[#ede3da] bg-[#f7f0ea]">
                      <img src={url} alt="" className="h-full w-full object-cover transition group-hover:scale-105"
                        onError={(e) => { e.target.style.display = "none"; }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                        <ExternalLink size={20} className="text-white/0 transition group-hover:text-white/80" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {b.rejectionReason && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <ShieldAlert size={18} className="text-red-600" />
                  <h3 className="text-[14px] font-black text-red-700">Rejection Reason</h3>
                </div>
                <p className="text-[13px] font-medium text-red-700 leading-relaxed">{b.rejectionReason}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pb-1 text-[11px] text-[#9a8a80]">
              <span>Submitted {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              {b.reviewedAt && <><span>•</span><span>Reviewed {new Date(b.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></>}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 rounded-b-[16px] border-t border-[#eaded6] bg-[#fcf8f4] px-6 sm:px-8 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {b.status === "pending" ? (
              <>
                <button onClick={onReject} disabled={actionLoading}
                  className="flex h-11 items-center justify-center gap-2 rounded-full border-2 border-red-300 bg-white px-6 text-[13px] font-black text-red-600 transition hover:border-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={15} />}
                  Reject
                </button>
                <button onClick={onApprove} disabled={actionLoading}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#16a34a] to-[#22c55e] px-6 text-[13px] font-black text-white shadow-[0_8px_18px_rgba(22,163,74,0.22)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={15} />}
                  Approve
                </button>
              </>
            ) : (
              <button onClick={onClose}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#c35416] px-6 text-[13px] font-black text-white shadow-[0_8px_18px_rgba(195,84,22,0.2)] transition hover:-translate-y-0.5">
                <Check size={15} /> Close
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-modalIn { animation: modalIn 280ms ease-out both; }
      `}</style>
    </div>
  );
}

function RejectModal({ reason, onChange, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#21150f]/50 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-[14px] border border-[#eaded6] bg-white p-6 shadow-[0_24px_48px_rgba(33,21,15,0.22)] animate-modalIn"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-red-50 text-red-600">
            <BadgeX size={20} />
          </span>
          <div>
            <h3 className="text-[16px] font-black text-[#1f130d]">Reject Business</h3>
            <p className="text-[12px] text-[#8a7a70]">Provide a reason for rejection</p>
          </div>
        </div>
        <textarea
          className="mt-2 h-28 w-full rounded-[10px] border border-[#dfcfc3] bg-[#fcf8f4] p-4 text-[13px] font-semibold text-[#2f2119] outline-none transition focus:border-[#c35416] focus:shadow-[0_0_0_4px_rgba(195,84,22,0.1)] placeholder:text-[#aa9a90] resize-none"
          placeholder="Enter the reason for rejecting this business listing..."
          value={reason}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
        <p className="mt-2 text-[11px] font-semibold text-[#9a8a80]">{reason.length} / 500 characters</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} disabled={loading}
            className="h-10 rounded-full border border-[#dfcfc3] bg-white px-5 text-[12px] font-black text-[#2f2119] transition hover:bg-[#fcf8f4] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!reason.trim() || loading}
            className="flex h-10 items-center gap-2 rounded-full bg-red-600 px-5 text-[12px] font-black text-white shadow-[0_8px_18px_rgba(220,38,38,0.2)] transition hover:bg-red-700 disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function PageButton({ active, children, disabled, onClick }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-[8px] px-2 text-[12px] font-black transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${
        active ? "bg-[#b5480b] text-white shadow-[0_8px_16px_rgba(181,72,11,0.22)]" : "text-[#3f3028] hover:bg-[#fff2e9]"
      }`}>
      {children}
    </button>
  );
}
