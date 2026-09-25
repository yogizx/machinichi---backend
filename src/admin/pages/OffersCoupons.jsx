import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Edit3,
  Eye,
  Gift,
  HelpCircle,
  Loader2,
  Megaphone,
  MoreVertical,
  Plus,
  Search,
  Ticket,
  Trash2,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";

const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api", withCredentials: true });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const metrics = [
  {
    label: "Active Campaigns",
    value: "24",
    note: "+12.5%",
    icon: Megaphone,
  },
  {
    label: "Coupons Redeemed",
    value: "14,208",
    note: "+3.1k /day",
    icon: Ticket,
  },
  {
    label: "Discount Revenue",
    value: "42L",
    prefix: "\u20b9",
    note: "+23.0% comp",
    icon: CircleDollarSign,
  },
  {
    label: "Conversion Uplift",
    value: "18.5%",
    note: "Stable",
    icon: TrendingUp,
  },
];

const bundles = [
  {
    name: "Flour Power Pack",
    subtitle: "Sharbati Atta + Millet",
    offer: "Save 20%",
    status: "Active",
    art: "bg-[linear-gradient(135deg,#331407,#a46d2e_52%,#f6d59e)]",
  },
  {
    name: "Organic Starter Kit",
    subtitle: "4 Essential Mixes",
    offer: "\u20b9150 OFF",
    status: "Scheduled",
    art: "bg-[linear-gradient(45deg,#7b4a22_25%,#ddb476_25%_50%,#42200f_50%_75%,#f0d3a5_75%)]",
  },
  {
    name: "Supergrain Bundle",
    subtitle: "Quinoa, Ragi + Baja",
    offer: "Free Deliv.",
    status: "Active",
    art: "bg-[radial-gradient(circle_at_35%_35%,#e8c18c_0_10%,transparent_11%),radial-gradient(circle_at_70%_45%,#d09c61_0_9%,transparent_10%),#2b1309]",
  },
];

const initialCampaigns = [
  {
    name: "FESTIVE30",
    subtitle: "Diwali Special Promo",
    type: "30% Percent",
    redemption: "458 uses",
    progress: "62%",
    validity: "Nov 15, 2024",
    status: "Active",
    impact: "1,24,000",
  },
  {
    name: "ORGANICLOVE",
    subtitle: "First Order Discount",
    type: "Fixed \u20b9200",
    redemption: "1,028 uses",
    progress: "94%",
    validity: "Dec 31, 2024",
    status: "Active",
    impact: "2,05,600",
  },
  {
    name: "MILLETMANIA",
    subtitle: "Ragi Week Discount",
    type: "Buy 1 Get 1",
    redemption: "500 uses",
    progress: "100%",
    validity: "Oct 12, 2024",
    status: "Draft",
    impact: "88,000",
  },
];

const performanceData = {
  "Last 7 Days": [
    { label: "Mon", offers: 8, active: 5, redeemed: 420, discount: 58000 },
    { label: "Tue", offers: 10, active: 7, redeemed: 610, discount: 76000 },
    { label: "Wed", offers: 12, active: 9, redeemed: 780, discount: 92000 },
    { label: "Thu", offers: 13, active: 10, redeemed: 730, discount: 88000 },
    { label: "Fri", offers: 16, active: 12, redeemed: 980, discount: 124000 },
    { label: "Sat", offers: 18, active: 14, redeemed: 1320, discount: 168000 },
    { label: "Sun", offers: 17, active: 13, redeemed: 1190, discount: 151000 },
  ],
  "Last 30 Days": [
    { label: "W1", offers: 34, active: 21, redeemed: 2480, discount: 310000 },
    { label: "W2", offers: 41, active: 25, redeemed: 3180, discount: 402000 },
    { label: "W3", offers: 48, active: 29, redeemed: 3860, discount: 486000 },
    { label: "W4", offers: 56, active: 34, redeemed: 4720, discount: 620000 },
  ],
  "This Quarter": [
    { label: "Apr", offers: 52, active: 31, redeemed: 4180, discount: 540000 },
    { label: "May", offers: 68, active: 42, redeemed: 5520, discount: 730000 },
    { label: "Jun", offers: 82, active: 51, redeemed: 6508, discount: 850000 },
  ],
};

const periodOptions = ["Last 7 Days", "Last 30 Days", "This Quarter"];
const statusFilters = ["All Campaigns", "Active", "Draft"];
const campaignsPerPage = 2;

const formatCompactInr = (value) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value >= 1000000 ? 1 : 2)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
};

function OffersCoupons({ onAdminLogout }) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 Days");
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All Campaigns");
  const [isCampaignMenuOpen, setIsCampaignMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState(null);
  const [viewCouponId, setViewCouponId] = useState(null);
  const [viewCouponData, setViewCouponData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const formatCouponDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const day = d.getDate();
    const mon = d.toLocaleString("en-IN", { month: "short" });
    const yr = d.getFullYear();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon} ${yr}, ${h}:${min} ${ampm}`;
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/coupons");
      if (data?.success) {
        const mapped = (data.data || []).map((c) => ({
          _id: c._id,
          name: c.code,
          subtitle: c.name || c.description || "",
          type: c.offerType === "scratch_card"
            ? "Scratch Card"
            : c.offerType === "free_delivery" || c.discountType === "Free Delivery"
              ? "Free Delivery"
              : c.discountType === "Percentage"
                ? `${c.discountValue}% Percent`
                : `${c.discountValue} OFF`,
          redemption: `${c.usedCount || 0} uses`,
          progress: c.usageLimit > 0 ? `${Math.round(((c.usedCount || 0) / c.usageLimit) * 100)}%` : "0%",
          validity: `${formatCouponDate(c.startsAt)} – ${formatCouponDate(c.expiresAt)}`,
          status: c.status === "active" ? "Active" : "Draft",
          impact: "—",
          minOrderAmount: c.minOrderAmount,
          minQuantity: c.minQuantity,
          usageLimit: c.usageLimit,
          perUserLimit: c.perUserLimit,
          discountValue: c.discountValue,
          discountType: c.discountType,
          offerType: c.offerType,
          scratchRules: c.scratchRules || [],
          freeDeliveryDistricts: c.freeDeliveryDistricts || [],
          startsAt: c.startsAt,
          expiresAt: c.expiresAt,
        }));
        setCampaigns(mapped);
      }
    } catch { /* fallback to empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const metrics = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "Active").length;
    const totalRedemptions = campaigns.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    const draft = campaigns.filter((c) => c.status === "Draft").length;
    return [
      { label: "Active Campaigns", value: String(active), note: `${campaigns.length} total`, icon: Megaphone },
      { label: "Coupons Redeemed", value: totalRedemptions.toLocaleString("en-IN"), note: "All time", icon: Ticket },
      { label: "Draft Offers", value: String(draft), note: "Pending", icon: Gift },
      { label: "Total Coupons", value: String(campaigns.length), note: "Created", icon: TrendingUp },
    ];
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesSearch =
        !normalizedSearch ||
        campaign.name.toLowerCase().includes(normalizedSearch) ||
        campaign.subtitle.toLowerCase().includes(normalizedSearch) ||
        campaign.type.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "All Campaigns" || campaign.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / campaignsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visibleCampaigns = filteredCampaigns.slice(
    (safePage - 1) * campaignsPerPage,
    safePage * campaignsPerPage,
  );
  const selectedPerformance = performanceData[selectedPeriod];
  const chartSummary = useMemo(
    () =>
      selectedPerformance.reduce(
        (summary, item) => ({
          offers: summary.offers + item.offers,
          active: Math.max(summary.active, item.active),
          redeemed: summary.redeemed + item.redeemed,
          discount: summary.discount + item.discount,
        }),
        { offers: 0, active: 0, redeemed: 0, discount: 0 },
      ),
    [selectedPerformance],
  );

  const exportCampaigns = () => {
    const rows = filteredCampaigns.map(
      ({ name, subtitle, type, redemption, validity, status, impact }) => [
        name,
        subtitle,
        type,
        redemption,
        validity,
        status,
        impact,
      ],
    );
    const csv = [
      ["Campaign", "Subtitle", "Type", "Redemption", "Validity", "Status", "Impact"],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = "machinichi-campaigns.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleCampaignStatus = async (campaign) => {
    const newStatus = campaign.status === "Active" ? "draft" : "active";
    try {
      await API.put(`/coupons/${campaign._id}`, { status: newStatus, isActive: newStatus === "active" });
      setCampaigns((current) =>
        current.map((c) =>
          c._id === campaign._id
            ? { ...c, status: newStatus === "active" ? "Active" : "Draft" }
            : c,
        ),
      );
    } catch { /* ignore */ }
  };

  const deleteCampaign = async (campaign) => {
    if (!window.confirm(`Delete coupon ${campaign.name}?`)) return;
    try {
      await API.delete(`/coupons/${campaign._id}`);
      setCampaigns((current) => current.filter((c) => c._id !== campaign._id));
      setCurrentPage(1);
    } catch { /* ignore */ }
  };

  const openViewModal = async (campaign) => {
    setViewCouponId(campaign._id);
    setViewOpen(true);
    setViewLoading(true);
    setViewCouponData(null);
    try {
      const { data } = await API.get(`/coupons/${campaign._id}`);
      if (data?.success) {
        setViewCouponData(data.data);
      }
    } catch { /* ignore */ }
    setViewLoading(false);
  };

  const closeViewModal = () => {
    setViewOpen(false);
    setViewCouponId(null);
    setViewCouponData(null);
  };

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#fff7f0] text-[#21150f]">
        <div className="flex flex-col gap-3 border-b border-[#eaded6] bg-[#fffaf6] px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <label className="flex h-9 flex-1 items-center gap-3 rounded-full bg-[#f1e9e3] px-4 text-[#928178] transition focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(173,77,0,0.09)] lg:max-w-[430px]">
            <Search size={15} />
            <input
              className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#302119] outline-none placeholder:text-[#998980]"
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search campaigns, coupons, or customers..."
              type="search"
              value={searchTerm}
            />
          </label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                aria-expanded={isNotificationsOpen}
                aria-label="Notifications"
                className="relative text-[#2d1f18] transition duration-300 hover:-translate-y-0.5 hover:text-[#a9420b] active:translate-y-0 active:scale-[0.98]"
                onClick={() => {
                  setIsNotificationsOpen((isOpen) => !isOpen);
                  setIsHelpOpen(false);
                }}
                type="button"
              >
                <Bell size={18} />
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#ff6d1a]" />
              </button>
              {isNotificationsOpen ? (
                <div className="absolute right-0 top-8 z-30 w-56 rounded-[9px] border border-[#dfcfc3] bg-white p-3 shadow-[0_14px_28px_rgba(66,36,18,0.14)]">
                  <p className="text-[12px] font-black text-[#21150f]">
                    {campaigns.filter((campaign) => campaign.status === "Active").length} active campaigns
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#8a7a71]">
                    Organic starter campaign is trending today.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                aria-expanded={isHelpOpen}
                aria-label="Help"
                className="text-[#2d1f18] transition duration-300 hover:-translate-y-0.5 hover:text-[#a9420b] active:translate-y-0 active:scale-[0.98]"
                onClick={() => {
                  setIsHelpOpen((isOpen) => !isOpen);
                  setIsNotificationsOpen(false);
                }}
                type="button"
              >
                <HelpCircle size={18} />
              </button>
              {isHelpOpen ? (
                <div className="absolute right-0 top-8 z-30 w-56 rounded-[9px] border border-[#dfcfc3] bg-white p-3 shadow-[0_14px_28px_rgba(66,36,18,0.14)]">
                  <p className="text-[12px] font-black text-[#21150f]">Campaign tools</p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-[#8a7a71]">
                    Use filters, exports, and row actions to manage coupons without leaving this page.
                  </p>
                </div>
              ) : null}
            </div>
            <span className="rounded-full bg-[#f1e0d2] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#9a4a18]">
              Pro Admin
            </span>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[30px] font-black tracking-[-0.04em] text-[#21150f]">
                Offers & Coupons
              </h1>
              <p className="mt-1 text-[13px] font-medium text-[#6d5e55]">
                Orchestrate your promotional strategies and campaign
                performance.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-[#dfcfc3] bg-[#f6eee8] px-4 text-[12px] font-black text-[#2f2119] shadow-[0_10px_20px_rgba(66,36,18,0.06)] transition hover:-translate-y-0.5 hover:bg-white active:translate-y-0 active:scale-[0.98]"
                onClick={() => navigate("/admin/create-offers")}
                type="button"
              >
                <Zap size={14} />
                Create Flash Sale
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#ff6d1a] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(255,109,26,0.24)] transition hover:-translate-y-0.5 hover:bg-[#e75e10] active:translate-y-0 active:scale-[0.98]"
                onClick={() => navigate("/admin/create-offers")}
                type="button"
              >
                <Plus size={15} />
                New Coupon
              </button>
            </div>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, prefix, note, icon: Icon }) => (
              <article
                className="rounded-[10px] border border-[#dfcfc3] bg-[#f8eee7] p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)] transition hover:-translate-y-0.5 hover:bg-[#fffaf6]"
                key={label}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#ffd9c6] text-[#b5480b]">
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  <span className="rounded-full bg-[#c8fb65] px-2.5 py-1 text-[9px] font-black text-[#487316]">
                    {note}
                  </span>
                </div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.12em] text-[#8b7b72]">
                  {label}
                </p>
                <p className="mt-1 text-[30px] font-black tracking-[-0.05em] text-[#1d130d]">
                  {prefix}
                  {value}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[14px] border border-[#dfcfc3] bg-white p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b5480b]">
                    Offer Performance
                  </p>
                  <h2 className="mt-1 text-[20px] font-black tracking-[-0.03em] text-[#21150f]">
                    Redemption Intelligence
                  </h2>
                  <p className="mt-1 text-[12px] font-medium text-[#8a7a71]">
                    Coupon redemptions and discount value trends
                  </p>
                </div>
                <div className="relative">
                  <button
                    aria-expanded={isPeriodOpen}
                    className="rounded-[8px] border border-[#dfcfc3] bg-[#f8eee7] px-4 py-2 text-[11px] font-black text-[#7d6d64] shadow-[0_8px_16px_rgba(66,36,18,0.05)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff7f0] active:translate-y-0 active:scale-[0.98]"
                    onClick={() => setIsPeriodOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    {selectedPeriod}
                  </button>
                  {isPeriodOpen ? (
                    <div className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-[8px] border border-[#dfcfc3] bg-white shadow-[0_14px_28px_rgba(66,36,18,0.14)]">
                      {periodOptions.map((period) => (
                        <button
                          className="block w-full px-3 py-2 text-left text-[11px] font-black text-[#7d6d64] transition duration-300 hover:bg-[#fff7f0] active:bg-[#efe7e0]"
                          key={period}
                          onClick={() => {
                            setSelectedPeriod(period);
                            setIsPeriodOpen(false);
                          }}
                          type="button"
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <ChartMetric label="Total Offers Created" value={chartSummary.offers} />
                <ChartMetric label="Active Offers" value={chartSummary.active} />
                <ChartMetric label="Coupons Redeemed" value={chartSummary.redeemed.toLocaleString("en-IN")} />
                <ChartMetric label="Discount Amount Given" value={formatCompactInr(chartSummary.discount)} />
              </div>

              <PerformanceChart
                data={selectedPerformance}
                hoveredIndex={hoveredTrendIndex}
                onHover={setHoveredTrendIndex}
              />
            </article>

            <article className="rounded-[14px] bg-[#3b1204] p-5 text-white shadow-[0_16px_34px_rgba(59,18,4,0.24)]">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#ff8a3c]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff6d1a]" />
                Flash Sale Live
              </p>
              <h2 className="mt-5 max-w-[190px] text-[24px] font-black leading-[1.05] tracking-[-0.04em]">
                Millets Harvest Week
              </h2>
              <p className="mt-3 max-w-[230px] text-[12px] font-semibold leading-5 text-[#d7b9a9]">
                Boost sales for artisanal millet products with curated harvest
                bundles.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  ["04", "DAYS"],
                  ["22", "HRS"],
                  ["18", "SECS"],
                ].map(([value, label]) => (
                  <div
                    className="rounded-[9px] bg-[#2a0f04] px-3 py-3 text-center"
                    key={label}
                  >
                    <p className="text-[18px] font-black">{value}</p>
                    <p className="mt-1 text-[9px] font-black text-[#9f7864]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-[#b79280]">
                <span>Campaign Goal Progress</span>
                <span>86%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#2a0f04]">
                <div className="h-full w-[86%] rounded-full bg-[#ff6d1a]" />
              </div>

              <button
                className="mt-6 h-11 w-full rounded-[8px] bg-white text-[12px] font-black text-[#2a0f04] transition hover:-translate-y-0.5 hover:bg-[#fff3ea] active:translate-y-0 active:scale-[0.98]"
                onClick={() => navigate("/admin/analytics")}
                type="button"
              >
                View Analytics Report
              </button>
            </article>
          </section>

          <section className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#21150f]">
                  Active Bundle Offers
                </h2>
                <p className="mt-1 text-[12px] font-medium text-[#8a7a71]">
                  Top-performing product combinations
                </p>
              </div>
              <button
                className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b5480b] transition duration-300 hover:-translate-y-0.5 hover:text-[#772907] active:translate-y-0 active:scale-[0.98]"
                onClick={() => navigate("/admin/create-offers")}
                type="button"
              >
                View All Bundles
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              {bundles.map((bundle) => (
                <article
                  className="flex items-center gap-4 rounded-[12px] border border-[#dfcfc3] bg-white p-3 shadow-[0_12px_24px_rgba(66,36,18,0.05)] transition hover:-translate-y-0.5 hover:bg-[#fffaf6]"
                  key={bundle.name}
                >
                  <span
                    className={`h-20 w-24 shrink-0 rounded-[8px] ${bundle.art}`}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-black text-[#2b1d15]">
                      {bundle.name}
                    </h3>
                    <p className="mt-1 text-[10px] font-medium text-[#8c7c73]">
                      {bundle.subtitle}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-black text-[#b5480b]">
                        {bundle.offer}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${
                          bundle.status === "Active"
                            ? "bg-[#c8fb65] text-[#426b12]"
                            : "bg-[#eee5dd] text-[#7a6b62]"
                        }`}
                      >
                        {bundle.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-[14px] border border-[#dfcfc3] bg-white shadow-[0_12px_24px_rgba(66,36,18,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#eaded6] px-5 py-4">
              <div>
                <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#21150f]">
                  Manage Campaigns
                </h2>
                <p className="mt-1 text-[11px] font-medium text-[#8a7a71]">
                  Edit and monitor all active promotional codes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    aria-expanded={isCampaignMenuOpen}
                    aria-label="Filter campaigns"
                    className="text-[#7d6d64] transition duration-300 hover:-translate-y-0.5 hover:text-[#2a170d] active:translate-y-0 active:scale-[0.98]"
                    onClick={() => setIsCampaignMenuOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {isCampaignMenuOpen ? (
                    <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-[8px] border border-[#dfcfc3] bg-white shadow-[0_14px_28px_rgba(66,36,18,0.14)]">
                      {statusFilters.map((status) => (
                        <button
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-black text-[#7d6d64] transition duration-300 hover:bg-[#fff7f0] active:bg-[#efe7e0]"
                          key={status}
                          onClick={() => {
                            setStatusFilter(status);
                            setCurrentPage(1);
                            setIsCampaignMenuOpen(false);
                          }}
                          type="button"
                        >
                          {status}
                          {statusFilter === status ? (
                            <Check className="text-[#b5480b]" size={13} strokeWidth={3} />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  aria-label="Download campaigns"
                  className="text-[#7d6d64] transition duration-300 hover:-translate-y-0.5 hover:text-[#2a170d] active:translate-y-0 active:scale-[0.98]"
                  onClick={exportCampaigns}
                  type="button"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-[#fffdf9] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a7a71]">
                  <tr>
                    <th className="px-5 py-4">Campaign / Coupon</th>
                    <th className="px-5 py-4">Offer Type</th>
                    <th className="px-5 py-4">Redemption Utility</th>
                    <th className="px-5 py-4">Validity</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Rev. Impact</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe7e0]">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center"><Loader2 size={20} className="mx-auto animate-spin text-[#b5480b]" /><p className="mt-2 text-[12px] font-semibold text-[#8a7a71]">Loading coupons...</p></td></tr>
                  ) : visibleCampaigns.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center"><p className="text-[13px] font-semibold text-[#8a7a71]">No coupons found</p></td></tr>
                  ) : (
                  visibleCampaigns.map((campaign) => (
                    <tr
                      className="transition hover:bg-[#fff7f0]"
                      key={campaign._id}
                    >
                      <td className="px-5 py-5">
                        <p className="text-[12px] font-black text-[#2b1d15]">
                          {campaign.name}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-[#8a7a71]">
                          {campaign.subtitle}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-[6px] px-2.5 py-2 text-[9px] font-black ${
                            campaign.status === "Draft"
                              ? "bg-[#eee5dd] text-[#7b6b62]"
                              : campaign.type.includes("Fixed")
                                ? "bg-[#223812] text-[#c8fb65]"
                                : "bg-[#fff0e8] text-[#bf4d12]"
                          }`}
                        >
                          {campaign.type}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-[10px] font-semibold text-[#8a7a71]">
                            {campaign.redemption}
                          </span>
                          <div className="h-1.5 w-24 rounded-full bg-[#eaded6]">
                            <div
                              className="h-full rounded-full bg-[#b5480b]"
                              style={{ width: campaign.progress }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-[#8a7a71]">
                            {campaign.progress}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-[10px] font-semibold text-[#5c4c43] leading-5 whitespace-nowrap">
                        {campaign.validity.split(" – ").map((part, i) => (
                          <span key={i} className="block">{part}{i === 0 ? " –" : ""}</span>
                        ))}
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                            campaign.status === "Active"
                              ? "bg-[#c8fb65] text-[#426b12]"
                              : "bg-[#eee5dd] text-[#7a6b62]"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-[12px] font-black text-[#21150f]">
                        {"\u20b9"}
                        {campaign.impact}
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            aria-label={`View ${campaign.name}`}
                            className="grid h-8 w-8 place-items-center rounded-[7px] text-[#6d5e55] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f2e8df] hover:text-[#2a170d] active:translate-y-0 active:scale-[0.98]"
                            onClick={() => openViewModal(campaign)}
                            type="button"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            aria-label={`Edit ${campaign.name}`}
                            className="grid h-8 w-8 place-items-center rounded-[7px] text-[#7a6b62] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f2e8df] hover:text-[#2a170d] active:translate-y-0 active:scale-[0.98]"
                            onClick={() => toggleCampaignStatus(campaign)}
                            type="button"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            aria-label={`Delete ${campaign.name}`}
                            className="grid h-8 w-8 place-items-center rounded-[7px] text-[#b5480b] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff0e8] active:translate-y-0 active:scale-[0.98]"
                            onClick={() => deleteCampaign(campaign)}
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-4 border-t border-[#efe7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-semibold text-[#8a7a71]">
                Displaying {visibleCampaigns.length} of {filteredCampaigns.length} active campaigns
              </p>
              <div className="flex items-center gap-2">
                <PageButton
                  ariaLabel="Previous page"
                  disabled={safePage === 1}
                  onClick={() => goToPage(safePage - 1)}
                >
                  <ChevronLeft size={14} />
                </PageButton>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <PageButton
                    active={page === safePage}
                    key={page}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </PageButton>
                ))}
                <PageButton
                  ariaLabel="Next page"
                  disabled={safePage === totalPages}
                  onClick={() => goToPage(safePage + 1)}
                >
                  <ChevronRight size={14} />
                </PageButton>
              </div>
            </footer>
          </section>
        </div>
      </div>

      {viewOpen && (
        <ViewOfferModal
          loading={viewLoading}
          coupon={viewCouponData}
          onClose={closeViewModal}
        />
      )}
    </AdminLayout>
  );
}

function ViewOfferModal({ loading, coupon, onClose }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const day = d.getDate();
    const mon = d.toLocaleString("en-IN", { month: "short" });
    const yr = d.getFullYear();
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon} ${yr}, ${h}:${min} ${ampm}`;
  };

  const formatCreated = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const remaining = coupon
    ? coupon.usageLimit > 0
      ? Math.max(0, coupon.usageLimit - (coupon.usedCount || 0))
      : "Unlimited"
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-[520px] overflow-hidden rounded-[14px] border border-[#dfcfc3] bg-white shadow-[0_24px_60px_rgba(30,15,5,0.28)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eaded6] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#fff0e8] text-[#b5480b]">
              <Ticket size={16} strokeWidth={2.2} />
            </span>
            <div>
              <h3 className="text-[14px] font-black tracking-[-0.02em] text-[#21150f]">
                Offer Details
              </h3>
              <p className="text-[11px] font-medium text-[#8a7a71]">
                Complete coupon information
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-[7px] text-[#7a6b62] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f2e8df] hover:text-[#2a170d] active:translate-y-0 active:scale-[0.98]"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 72px)" }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-[#b5480b]" />
              <p className="mt-3 text-[12px] font-semibold text-[#8a7a71]">
                Loading offer details...
              </p>
            </div>
          ) : !coupon ? (
            <div className="py-12 text-center">
              <p className="text-[13px] font-semibold text-[#8a7a71]">
                Offer not found
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                  Basic Information
                </p>
                <div className="mt-3 space-y-3">
                  <ModalRow label="Offer Name" value={coupon.name} />
                  <ModalRow label="Internal Description" value={coupon.description || "—"} />
                  <ModalRow
                    label="Offer Type"
                    value={coupon.offerType ? coupon.offerType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Coupon"}
                  />
                  <ModalRow label="Status">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        coupon.status === "active"
                          ? "bg-[#c8fb65] text-[#426b12]"
                          : "bg-[#eee5dd] text-[#7a6b62]"
                      }`}
                    >
                      {coupon.status === "active" ? "Active" : coupon.status === "draft" ? "Draft" : coupon.status}
                    </span>
                  </ModalRow>
                </div>
              </div>

              <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                  Active Dates
                </p>
                <div className="mt-3 space-y-3">
                  <ModalRow label="Start Date & Time" value={formatDate(coupon.startsAt)} />
                  <ModalRow label="End Date & Time" value={formatDate(coupon.expiresAt)} />
                </div>
              </div>

              <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                  Configuration
                </p>
                <div className="mt-3 space-y-3">
                  <ModalRow label="Coupon Code">
                    <span className="inline-flex rounded-[6px] bg-[#223812] px-2 py-0.5 text-[10px] font-black text-[#c8fb65]">
                      {coupon.code}
                    </span>
                  </ModalRow>
                  <ModalRow label="Discount Type" value={coupon.discountType || "—"} />
                  <ModalRow
                    label="Discount Value"
                    value={
                      coupon.discountType === "Percentage"
                        ? `${coupon.discountValue}%`
                        : coupon.discountType === "Free Delivery"
                          ? "Free Delivery"
                          : `₹${coupon.discountValue}`
                    }
                  />
                  <ModalRow label="Minimum Purchase Amount" value={`₹${coupon.minOrderAmount}`} />
                  <ModalRow label="Minimum Quantity" value={coupon.minQuantity} />
                  {coupon.maxDiscountAmount != null && coupon.maxDiscountAmount > 0 ? (
                    <ModalRow label="Max Discount Amount" value={`₹${coupon.maxDiscountAmount}`} />
                  ) : null}
                </div>
              </div>

              {coupon.scratchRules?.length ? (
                <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                    Scratch Card Rules
                  </p>
                  <div className="mt-3 space-y-2">
                    {coupon.scratchRules.map((rule, index) => (
                      <div
                        className="rounded-[8px] border border-[#eaded6] bg-white px-3 py-2 text-[12px] font-bold text-[#21150f]"
                        key={`${rule.basis}-${rule.threshold}-${index}`}
                      >
                        <span className="text-[#b5480b]">Rule {index + 1}:</span>{" "}
                        {rule.basis === "quantity"
                          ? `${rule.threshold}+ item${rule.threshold === 1 ? "" : "s"}`
                          : `Order amount ₹${rule.threshold}+`}{" "}
                        {rule.discountType === "Fixed"
                          ? `→ ₹${rule.discountValue} OFF`
                          : `→ ${rule.discountValue}% OFF`}
                        {rule.label ? <span className="block text-[11px] font-semibold text-[#8a7a71]">{rule.label}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {coupon.discountType === "Free Delivery" ? (
                <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                    Free Delivery Districts
                  </p>
                  <div className="mt-3">
                    {coupon.freeDeliveryDistricts?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {coupon.freeDeliveryDistricts.map((district) => (
                          <span
                            className="rounded-full bg-[#f1ffd2] px-3 py-1 text-[11px] font-black text-[#597219]"
                            key={district}
                          >
                            {district}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] font-bold text-[#8a7a71]">All districts (free delivery everywhere)</p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                  Usage Limits
                </p>
                <div className="mt-3 space-y-3">
                  <ModalRow
                    label="Total Usage Limit"
                    value={coupon.usageLimit > 0 ? coupon.usageLimit.toLocaleString("en-IN") : "Unlimited"}
                  />
                  <ModalRow label="Limit Per Customer" value={coupon.perUserLimit} />
                  <ModalRow label="Current Redemptions" value={`${coupon.usedCount || 0} uses`} />
                  <ModalRow label="Remaining Usage" value={typeof remaining === "number" ? remaining.toLocaleString("en-IN") : remaining} />
                </div>
              </div>

              <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#b5480b]">
                  Metadata
                </p>
                <div className="mt-3 space-y-3">
                  <ModalRow label="Created At" value={formatCreated(coupon.createdAt)} />
                  <ModalRow label="Last Updated" value={formatCreated(coupon.updatedAt)} />
                  <ModalRow label="Coupon ID" value={coupon._id} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalRow({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[11px] font-semibold text-[#8a7a71]">
        {label}
      </span>
      {children ? (
        <span className="text-right text-[12px] font-bold text-[#21150f]">{children}</span>
      ) : (
        <span className="text-right text-[12px] font-bold text-[#21150f]">
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

function ChartMetric({ label, value }) {
  return (
    <div className="rounded-[10px] border border-[#eaded6] bg-[#fffaf6] px-3 py-3 shadow-[0_8px_16px_rgba(66,36,18,0.04)]">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#99877c]">
        {label}
      </p>
      <p className="mt-2 text-[18px] font-black tracking-[-0.04em] text-[#21150f]">
        {value}
      </p>
    </div>
  );
}

function PerformanceChart({ data, hoveredIndex, onHover }) {
  const width = 760;
  const height = 300;
  const padding = { top: 24, right: 42, bottom: 54, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxRedeemed = Math.max(...data.map((item) => item.redeemed)) * 1.16;
  const maxDiscount = Math.max(...data.map((item) => item.discount)) * 1.16;
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
  const barWidth = Math.min(52, Math.max(26, chartWidth / data.length / 2.4));
  const activeIndex = hoveredIndex ?? data.length - 1;
  const activeItem = data[activeIndex];
  const activeX = padding.left + activeIndex * step;
  const activeY =
    padding.top + chartHeight - (activeItem.discount / maxDiscount) * chartHeight;

  const getX = (index) => padding.left + index * step;
  const getRedeemedY = (value) =>
    padding.top + chartHeight - (value / maxRedeemed) * chartHeight;
  const getDiscountY = (value) =>
    padding.top + chartHeight - (value / maxDiscount) * chartHeight;
  const discountPath = data
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"} ${getX(index)} ${getDiscountY(item.discount)}`,
    )
    .join(" ");

  return (
    <div className="mt-6 overflow-hidden rounded-[16px] border border-[#eaded6] bg-[#fffdf9] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-black text-[#6d5e55]">
            <span className="h-3 w-3 rounded-[3px] bg-[#ff6d1a]" />
            Coupons Redeemed
          </span>
          <span className="inline-flex items-center gap-2 text-[11px] font-black text-[#6d5e55]">
            <span className="h-3 w-3 rounded-full bg-[#223812]" />
            Discount Amount
          </span>
        </div>
        <span className="rounded-full bg-[#edf5e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#58752a]">
          Live Performance
        </span>
      </div>

      <div className="relative mt-4">
        <svg
          aria-label="Offer and coupon performance chart"
          className="h-[300px] w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id="couponBarGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff8a3c" />
              <stop offset="100%" stopColor="#b5480b" />
            </linearGradient>
            <filter id="chartSoftShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="8" floodColor="#b5480b" floodOpacity="0.18" stdDeviation="7" />
            </filter>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding.top + chartHeight * tick;
            const label = Math.round(maxRedeemed * (1 - tick)).toLocaleString("en-IN");

            return (
              <g key={tick}>
                <line
                  stroke="#eaded6"
                  strokeDasharray={tick === 1 ? "0" : "5 7"}
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#a89990"
                  fontSize="10"
                  fontWeight="800"
                  textAnchor="end"
                  x={padding.left - 12}
                  y={y + 4}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {data.map((item, index) => {
            const x = getX(index);
            const redeemedY = getRedeemedY(item.redeemed);
            const isActive = activeIndex === index;

            return (
              <g
                className="cursor-pointer"
                key={item.label}
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onHover(null)}
              >
                <rect
                  fill="transparent"
                  height={chartHeight}
                  x={x - Math.max(barWidth, step / 2)}
                  y={padding.top}
                  width={Math.max(barWidth * 2, step)}
                />
                <rect
                  fill="url(#couponBarGradient)"
                  filter={isActive ? "url(#chartSoftShadow)" : undefined}
                  height={padding.top + chartHeight - redeemedY}
                  opacity={isActive ? "1" : "0.72"}
                  rx="9"
                  style={{
                    transformOrigin: `${x}px ${padding.top + chartHeight}px`,
                    animation: `offerBarIn 520ms ease-out ${index * 70}ms both`,
                    transition: "opacity 180ms ease, transform 180ms ease",
                    transform: isActive ? "scaleY(1.04)" : "scaleY(1)",
                  }}
                  width={barWidth}
                  x={x - barWidth / 2}
                  y={redeemedY}
                />
                <text
                  fill="#8a7a71"
                  fontSize="11"
                  fontWeight="900"
                  textAnchor="middle"
                  x={x}
                  y={height - 18}
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          <path
            d={discountPath}
            fill="none"
            stroke="#223812"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
            style={{
              animation: "offerLineIn 800ms ease-out both",
            }}
          />
          {data.map((item, index) => {
            const x = getX(index);
            const y = getDiscountY(item.discount);
            const isActive = activeIndex === index;

            return (
              <g
                className="cursor-pointer"
                key={`${item.label}-point`}
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onHover(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  fill={isActive ? "#c8fb65" : "#fffdf9"}
                  r={isActive ? "8" : "6"}
                  stroke="#223812"
                  strokeWidth="3"
                  style={{ transition: "r 180ms ease, fill 180ms ease" }}
                />
              </g>
            );
          })}

          <line
            stroke="#2a170d"
            strokeDasharray="5 7"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            x1={activeX}
            x2={activeX}
            y1={padding.top}
            y2={padding.top + chartHeight}
          />
        </svg>

        <div
          className="pointer-events-none absolute z-20 min-w-[190px] rounded-[12px] border border-[#dfcfc3] bg-white px-4 py-3 text-left shadow-[0_16px_34px_rgba(66,36,18,0.16)] transition-all duration-200"
          style={{
            left: `clamp(8px, calc(${(activeX / width) * 100}% - 96px), calc(100% - 200px))`,
            top: `max(8px, calc(${(activeY / height) * 100}% - 86px))`,
          }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#b5480b]">
            {activeItem.label}
          </p>
          <div className="mt-2 grid gap-1.5 text-[12px] font-bold text-[#4d3d34]">
            <span>{activeItem.offers} offers created</span>
            <span>{activeItem.active} active offers</span>
            <span>{activeItem.redeemed.toLocaleString("en-IN")} coupons redeemed</span>
            <span>{formatCompactInr(activeItem.discount)} discount given</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes offerBarIn {
          from {
            transform: scaleY(0.2);
          }
          to {
            transform: scaleY(1);
          }
        }

        @keyframes offerLineIn {
          from {
            opacity: 0;
            stroke-dasharray: 14 18;
            stroke-dashoffset: 80;
          }
          to {
            opacity: 1;
            stroke-dasharray: 0;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

function PageButton({ active = false, ariaLabel, children, disabled = false, onClick }) {
  return (
    <button
      aria-label={ariaLabel}
      className={`grid h-8 min-w-8 place-items-center rounded-[8px] px-2 text-[11px] font-black transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${
        active
          ? "bg-[#b5480b] text-white"
          : "bg-[#f6eee8] text-[#6c5c53] hover:bg-[#fff7f0]"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default OffersCoupons;
