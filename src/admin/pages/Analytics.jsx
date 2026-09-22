import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  CloudUpload,
  Leaf,
  MapPin,
  Package,
  RefreshCw,
  Wheat,
  Mail,
  Clock,
   FileText,
  Award,
  Download,
  BarChart3,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import api from "../../services/api";

const ICON_MAP = { Wheat, Leaf, Package };

const INR = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

// Regional Focus priorities will be loaded dynamically from the backend

const kpiPlaceholders = [
  { label: "Total Gross Revenue", prefix: "₹", value: "—", note: "Loading...", tone: "text-gray-400" },
  { label: "Subscription Retention", value: "—", note: "Loading...", tone: "text-gray-400" },
  { label: "New Organic Signups", value: "—", note: "Loading...", tone: "text-gray-400" },
];

const salesBars = [35, 49, 41, 64, 58, 79, 52, 88, 93, 69, 44, 35, 58, 74];
const trendBars = {
  Day: [52, 38, 62, 44, 71, 59, 82, 67, 94, 73, 48, 56, 76, 64],
  Week: salesBars,
  Month: [44, 58, 51, 69, 76, 62, 84, 91, 73, 66, 79, 88, 54, 61],
};

const dateRanges = [
  "Oct 01, 2024 - Oct 31, 2024",
  "Sep 01, 2024 - Sep 30, 2024",
  "Q4 2024",
  "Last 30 Days",
  "This Month",
  "This Year",
  "All Time",
];

const reportTypes = [
  "Inventory Turnover Ratio",
  "Revenue by Region",
  "Customer Retention Summary",
  "Category Performance",
];

const frequencies = ["One-Time", "Weekly", "Monthly"];



const categories = [
  {
    name: "Artisanal Atta",
    sales: "342 sales today",
    value: "4.2k",
    icon: Wheat,
    tone: "bg-[#ffe2a9] text-[#9b4b09]",
  },
  {
    name: "Organic Millets",
    sales: "198 sales today",
    value: "2.8k",
    icon: Leaf,
    tone: "bg-[#c7f3d5] text-[#167042]",
  },
  {
    name: "Recipe Kits",
    sales: "124 sales today",
    value: "1.9k",
    icon: Package,
    tone: "bg-[#ffd9c6] text-[#9b3513]",
  },
];

const STATE_CODE_TO_NAME = {
  JK: "Jammu & Kashmir",
  HP: "Himachal Pradesh",
  PB: "Punjab",
  UK: "Uttarakhand",
  HR: "Haryana",
  DL: "Delhi",
  RJ: "Rajasthan",
  GJ: "Gujarat",
  MP: "Madhya Pradesh",
  UP: "Uttar Pradesh",
  BR: "Bihar",
  WB: "West Bengal",
  JH: "Jharkhand",
  OD: "Odisha",
  CG: "Chhattisgarh",
  MH: "Maharashtra",
  TG: "Telangana",
  AP: "Andhra Pradesh",
  KA: "Karnataka",
  GA: "Goa",
  KL: "Kerala",
  TN: "Tamil Nadu",
  NE: "Assam",
};


const ALL_INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

const normalizeStateName = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  if (lower === "delhi (nct)" || lower === "delhi") return "delhi";
  return lower;
};

function Analytics({ onAdminLogout }) {
  const [fromDate, setFromDate] = useState("2024-01-01");
  const [toDate, setToDate] = useState("2026-12-31");
  const [activeTrend, setActiveTrend] = useState("Week");
  const [refreshCount, setRefreshCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(reportTypes[0]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState("CSV");
  const [selectedFrequency, setSelectedFrequency] = useState(frequencies[0]);
  const [isFrequencyOpen, setIsFrequencyOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailError, setEmailError] = useState("");
  const [savedConfigs, setSavedConfigs] = useState([]);

  // Dynamic MongoDB-backed states
  const [kpiList, setKpiList] = useState([]);
  const [isDatesLoaded, setIsDatesLoaded] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [trendData, setTrendData] = useState({
    revenue: [],
    retention: [],
    signups: [],
    labels: []
  });
  const [stateList, setStateList] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [categoryList, setCategoryList] = useState([
    { name: "Artisanal Atta", sales: "342 sales today", value: "4.2k", iconName: "Wheat", tone: "bg-[#ffe2a9] text-[#9b4b09]" },
    { name: "Organic Millets", sales: "198 sales today", value: "2.8k", iconName: "Leaf", tone: "bg-[#c7f3d5] text-[#167042]" },
    { name: "Recipe Kits", sales: "124 sales today", value: "1.9k", iconName: "Package", tone: "bg-[#ffd9c6] text-[#9b3513]" }
  ]);
  const [approxRows, setApproxRows] = useState(12400);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveActivity, setLiveActivity] = useState("");
  const [topStates, setTopStates] = useState([]);
  const [bottomStates, setBottomStates] = useState([]);
  const [stateDetail, setStateDetail] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  const stateDetailFetchIdRef = useRef(0);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(
        `/admin/analytics-page?startDate=${fromDate}&endDate=${toDate}&trendView=${activeTrend}`
      );
      if (res.data?.success && res.data?.data) {
        const { kpis, trend, regions: r, categories: c, approxRows: rows } = res.data.data;
        setKpiList(kpis);
        setTrendData({
          revenue: trend?.revenue || [],
          retention: trend?.retention || [],
          signups: trend?.signups || [],
          labels: trend?.labels || []
        });
        setCategoryList(c);
        setApproxRows(rows);
        setStateList(r || []);
      } else {
        setError(res.data?.message || "Failed to load analytics");
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveFeed = async () => {
    try {
      const res = await api.get("/admin/analytics-page/live-feed");
      if (res.data?.success && res.data?.data?.text) {
        setLiveActivity(res.data.data.text);
      }
    } catch (err) {
      console.error("Error loading live feed:", err);
    }
  };

  const loadAnalyticsSettings = async () => {
    try {
      const res = await api.get("/admin/analytics-page/settings");
      if (res.data?.success && res.data?.data) {
        const settings = res.data.data;
        if (settings.fromDate && settings.toDate) {
          setFromDate(settings.fromDate);
          setToDate(settings.toDate);
        }
      }
    } catch (err) {
      console.error("Error loading analytics settings:", err);
    } finally {
      setIsDatesLoaded(true);
    }
  };

  const saveAnalyticsSettings = async (start, end) => {
    try {
      await api.post("/admin/analytics-page/settings", {
        fromDate: start,
        toDate: end
      });
    } catch (err) {
      console.error("Error saving analytics settings:", err);
    }
  };

  const saveReportSettings = async () => {
    setEmailError("");
    setError(null);

    if (!selectedReport) {
      alert("Please select a Report Type.");
      return;
    }
    if (!reportFormat) {
      alert("Please select a format (CSV or PDF).");
      return;
    }
    if (!selectedFrequency) {
      alert("Please select a frequency.");
      return;
    }
    if (!emailAddress || !emailAddress.trim()) {
      setEmailError("Email Address is required.");
      alert("Email Address is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setEmailError("Invalid email address format.");
      alert("Invalid email address format.");
      return;
    }

    try {
      const res = await api.post("/admin/analytics-page/report-config", {
        reportType: selectedReport,
        format: reportFormat,
        frequency: selectedFrequency,
        recipientEmail: emailAddress,
        startDate: fromDate,
        endDate: toDate
      });
      if (res.data?.success) {
        alert(res.data.message || "Report configuration saved successfully and email sent!");
        await loadReportSettings();
      } else {
        alert(res.data?.message || "Failed to save report configuration.");
      }
    } catch (err) {
      console.error("Error saving report settings:", err);
      const msg = err.response?.data?.message || "Failed to save report configuration.";
      setError(msg);
      alert(msg);
    }
  };

  const loadReportSettings = async () => {
    try {
      const res = await api.get("/admin/analytics-page/report-config");
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (Array.isArray(data)) {
          setSavedConfigs(data);
          if (data.length > 0) {
            const latest = data[0];
            setSelectedReport(latest.reportType);
            setReportFormat(latest.format);
            setSelectedFrequency(latest.frequency);
            if (latest.recipientEmail) {
              setEmailAddress(latest.recipientEmail);
            }
          }
        } else {
          setSavedConfigs([data]);
          setSelectedReport(data.reportType);
          setReportFormat(data.format);
          setSelectedFrequency(data.frequency);
          if (data.recipientEmail) {
            setEmailAddress(data.recipientEmail);
          }
        }
      }
    } catch (err) {
      console.error("Error loading report settings:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    return `${day}-${month}-${year} ${strTime}`;
  };

  useEffect(() => {
    if (isDatesLoaded) {
      fetchAnalyticsData();
    }
  }, [fromDate, toDate, activeTrend, refreshCount, isDatesLoaded]);

  useEffect(() => {
    if (isDatesLoaded) {
      saveAnalyticsSettings(fromDate, toDate);
    }
  }, [fromDate, toDate, isDatesLoaded]);

  useEffect(() => {
    const init = async () => {
      await loadAnalyticsSettings();
      await loadReportSettings();
      fetchLiveFeed();
    };
    init();
    const interval = setInterval(fetchLiveFeed, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTopStates = async () => {
    try {
      // This endpoint returns every state with the customer-share denominator
      // calculated by the regional MongoDB aggregation.
      const { data } = await api.get(`/admin/regional/states?startDate=${fromDate}&endDate=${toDate}`);
      if (data.success) setTopStates(data.data || []);
    } catch (err) {
      console.error('Failed to load top states:', err);
    }
  };

  const fetchBottomStates = async () => {
    try {
      const { data } = await api.get(`/admin/regional/states?startDate=${fromDate}&endDate=${toDate}`);
      if (data.success) setBottomStates(data.data || []);
    } catch (err) {
      console.error('Failed to load bottom states:', err);
    }
  };

  const fetchStateDetail = async (stateName) => {
    if (!stateName) return;
    const fetchId = ++stateDetailFetchIdRef.current;
    setStateLoading(true);
    try {
      const { data } = await api.get(
        `/admin/regional/states/${encodeURIComponent(stateName)}?startDate=${fromDate}&endDate=${toDate}`
      );
      if (fetchId !== stateDetailFetchIdRef.current) return;
      if (data.success && data.data) {
        setStateDetail({ ...data.data, name: stateName });
      }
    } catch (err) {
      if (fetchId !== stateDetailFetchIdRef.current) return;
      console.error(`Failed to load detail for ${stateName}:`, err);
    } finally {
      if (fetchId === stateDetailFetchIdRef.current) {
        setStateLoading(false);
      }
    }
  };

  const exportRegionalCSV = async () => {
    try {
      const response = await api.get(`/admin/regional/export/csv?startDate=${fromDate}&endDate=${toDate}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data instanceof Blob ? response.data : new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = `regional-analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export regional analytics');
    }
  };

  const exportReport = async () => {
    try {
      const response = await api.post(
        "/admin/analytics-page/export",
        {
          reportType: selectedReport,
          dateRange: `${fromDate} - ${toDate}`,
          format: reportFormat
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: reportFormat === "CSV" ? "text/csv;charset=utf-8;" : "application/pdf"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = reportFormat.toLowerCase();

      link.href = url;
      link.download = `analytics-${selectedReport.toLowerCase().replaceAll(" ", "-")}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting report:", err);
      alert("Failed to export report. Please try again.");
    }
  };

  const getLineData = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return null;
    const max = Math.max(...dataArray, 1);
    const points = dataArray.map((val, i) => {
      const x = 50 + (i / (dataArray.length - 1)) * 730;
      const y = 200 - (val / max) * 180;
      return { x, y, val };
    });
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");
    return { d, points };
  };

  // ─── Regional Focus data layer ──────────────────────────────────────────────
  //
  // Data sources (all from MongoDB via backend):
  //   • topStates / bottomStates  — from GET /admin/regional/states/top|bottom
  //     Fields: { name, totalCustomers, totalOrders, revenue, marketShare }
  //     marketShare here = customerShare = stateCustomers ÷ totalCustomers × 100
  //
  //   • stateList — from GET /admin/analytics-page (regions field)
  //     Fields: { name, totalCustomers, totalOrders, revenue, share, growth }
  //     share here = revenue share (used only as last-resort fallback)
  //
  //   • stateDetail — from GET /admin/regional/states/:name (per-state detail)
  //     Fields: { name, totalCustomers, totalOrders, revenue, marketShare,
  //               growth, aov, repeatCustomerPct, monthlyTrends, ... }
  //     marketShare = customerShare (same formula as above)
  //
  // The "Customer Share" metric in the UI is:
  //   stateCustomers ÷ totalCustomersAcrossAllStates × 100
  // This is what the backend returns as `marketShare` in the regional endpoints.
  // ─────────────────────────────────────────────────────────────────────────────

  // Merge topStates + bottomStates into one fast-lookup map.
  // These come from the regional endpoints and always carry correct
  // customer-share (marketShare) values from MongoDB aggregation.
  const leaderboardMap = useMemo(() => {
    const map = new Map();
    [...(topStates || []), ...(bottomStates || [])].forEach(s => {
      if (!s?.name) return;
      const key = normalizeStateName(s.name);
      if (!map.has(key)) {
        map.set(key, {
          name: s.name,
          totalCustomers: s.totalCustomers ?? 0,
          totalOrders:    s.totalOrders    ?? 0,
          revenue:        s.revenue        ?? 0,
          customerShare:  s.marketShare    ?? 0,   // ← customer share from MongoDB
          growth:         s.growth         || "0%",
        });
      }
    });
    return map;
  }, [topStates, bottomStates]);

  // The list shown in the Regional Focus sidebar.
  // Only includes states that actually have order data (no empty rows).
  // Sorted by revenue descending.
  const regionalStateList = useMemo(() => {
    // Primary source: leaderboard data (has correct customer share)
    // Fill any gaps with stateList from the analytics-page endpoint.
    const merged = new Map(leaderboardMap);
    (stateList || []).forEach(s => {
      if (!s?.name) return;
      const key = normalizeStateName(s.name);
      if (!merged.has(key) && (s.totalOrders > 0 || s.revenue > 0)) {
        merged.set(key, {
          name: s.name,
          totalCustomers: s.totalCustomers ?? 0,
          totalOrders:    s.totalOrders    ?? 0,
          revenue:        s.revenue        ?? 0,
          customerShare:  s.marketShare ?? s.share ?? 0,
          growth:         s.growth         || "0%",
        });
      }
    });
    return Array.from(merged.values())
      .filter(s => s.totalOrders > 0 || s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [leaderboardMap, stateList]);

  // Quick lookup used by regionData and highlight logic.
  const regionalStateMap = useMemo(() => {
    const map = new Map();
    regionalStateList.forEach(s => map.set(normalizeStateName(s.name), s));
    return map;
  }, [regionalStateList]);

  // Preliminary data shown while the per-state detail fetch is in flight.
  // Uses the best available data from leaderboard / stateList.
  const regionData = useMemo(() => {
    const fallback = {
      name: selectedRegion || "No Data",
      totalCustomers: 0,
      totalOrders:    0,
      revenue:        0,
      customerShare:  0,
      growth:         "0%",
    };
    if (!selectedRegion) {
      const first = regionalStateList[0];
      return first ? { ...first } : fallback;
    }
    const found = regionalStateMap.get(normalizeStateName(selectedRegion));
    return found ? { ...found } : { ...fallback, name: selectedRegion };
  }, [regionalStateMap, selectedRegion, regionalStateList]);

  // displayData is what actually drives the Selected State card.
  // Once stateDetail arrives from MongoDB it takes over from regionData.
  // A fetchId ref prevents stale API responses from overwriting a newer
  // selection, so the card always shows data for the currently selected state.
  const displayData = useMemo(() => {
    if (
      stateDetail &&
      normalizeStateName(stateDetail.name) === normalizeStateName(selectedRegion)
    ) {
      return {
        name:            stateDetail.name,
        totalCustomers:  stateDetail.totalCustomers  ?? 0,
        totalOrders:     stateDetail.totalOrders     ?? 0,
        revenue:         stateDetail.revenue         ?? 0,
        // marketShare in stateDetail = customerShare (stateCustomers ÷ total)
        customerShare:   stateDetail.marketShare     ?? 0,
        growth:          stateDetail.growth          || "0%",
        aov:             stateDetail.aov             ?? 0,
        repeatCustomerPct: stateDetail.repeatCustomerPct ?? 0,
        monthlyTrends:   stateDetail.monthlyTrends   || [],
      };
    }
    // Fallback while loading: show the state's name + whatever preliminary
    // numbers we already have from the leaderboard / analytics-page endpoint.
    return {
      name:            regionData.name,
      totalCustomers:  regionData.totalCustomers,
      totalOrders:     regionData.totalOrders,
      revenue:         regionData.revenue,
      customerShare:   regionData.customerShare,
      growth:          regionData.growth,
      aov:             0,
      repeatCustomerPct: 0,
      monthlyTrends:   [],
    };
  }, [stateDetail, selectedRegion, regionData]);

  // Auto-select the first available state on initial load only.
  // Do NOT override a state the user has explicitly clicked.
  useEffect(() => {
    if (selectedRegion) return; // user already has a selection — don't interfere
    const visibleStates = regionalStateList.filter((s) => normalizeStateName(s.name) !== 'all states');
    const firstState = visibleStates[0] || topStates?.[0];
    if (firstState?.name) {
      setSelectedRegion(firstState.name);
    }
  }, [regionalStateList, topStates]);

  // Gated behind isDatesLoaded so this never fires with the hardcoded
  // default date range before the persisted settings arrive from the
  // backend. Without this guard, topStates/bottomStates would load once
  // with the wrong (default) range, drive the initial auto-selection and
  // its detail fetch, and then reload ~1s later once the real saved range
  // comes in — making the just-selected state's numbers appear to reset.
  useEffect(() => {
    if (!isDatesLoaded) return;
    fetchTopStates();
    fetchBottomStates();
  }, [fromDate, toDate, refreshCount, isDatesLoaded]);

  useEffect(() => {
    if (selectedRegion) {
      fetchStateDetail(selectedRegion);
    }
  }, [selectedRegion, fromDate, toDate, refreshCount]);

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#fff7f0] px-4 py-5 text-[#21150f] sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-[8px] border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-800 shadow-sm">
            {error}
          </div>
        )}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#bf4d12]">
              Decision Intelligence
            </p>
            <h1 className="mt-1 text-[32px] font-black tracking-[-0.04em] text-[#24150d] sm:text-[38px]">
              Analytics & Reports
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-[#8b7b72]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-11 rounded-[8px] border border-[#dfcfc3] bg-[#f7eee8] px-3 text-[12px] font-black text-[#2f2119] shadow-[0_10px_20px_rgba(66,36,18,0.06)] outline-none focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase text-[#8b7b72]">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-11 rounded-[8px] border border-[#dfcfc3] bg-[#f7eee8] px-3 text-[12px] font-black text-[#2f2119] shadow-[0_10px_20px_rgba(66,36,18,0.06)] outline-none focus:bg-white"
              />
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#2b0f04] px-5 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(43,15,4,0.22)] transition hover:-translate-y-0.5 hover:bg-[#3a1100] active:translate-y-0 active:scale-[0.98]"
              onClick={() => setRefreshCount((count) => count + 1)}
              type="button"
            >
              <RefreshCw
                className={`transition duration-300 ${refreshCount ? "rotate-180" : ""}`}
                size={15}
              />
              Refresh Data
            </button>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          {(loading ? kpiPlaceholders : kpiList.length > 0 ? kpiList.filter((kpi) => kpi.label !== "Avg. Basket Value") : kpiPlaceholders).map((kpi) => (
            <article
              className="rounded-[10px] border border-[#dfcfc3] bg-white p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)] transition hover:-translate-y-0.5 hover:bg-[#fffdf9]"
              key={kpi.label}
            >
              <p className="text-[13px] font-semibold text-[#6d5e55]">
                {kpi.label}
              </p>
              <p className="mt-2 text-[34px] font-black leading-none tracking-[-0.05em] text-[#20140e]">
                {kpi.prefix}
                {kpi.value}
              </p>
              <p className={`mt-4 text-[11px] font-black ${kpi.tone}`}>
                {kpi.note}
              </p>
            </article>
          ))}
        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <article className="rounded-[10px] border border-[#dfcfc3] bg-white shadow-[0_12px_24px_rgba(66,36,18,0.05)]">
            <div className="flex flex-col gap-3 border-b border-[#eaded6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#20140e]">
                Sales Trend Analysis
              </h2>
              <div className="flex w-fit rounded-[5px] bg-[#efe5dc] p-1">
                {["Week", "Month"].map((item) => (
                  <button
                    className={`rounded-[4px] px-2.5 py-1 text-[10px] font-black uppercase transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${activeTrend === item
                        ? "bg-[#2b0f04] text-white"
                        : "text-[#55463e] hover:bg-white"
                      }`}
                    key={item}
                    onClick={() => setActiveTrend(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col h-[340px]">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 px-5 py-2.5 border-b border-[#eaded6] bg-[#fffbf8] text-[10px] font-black uppercase tracking-wider text-[#6d5e55]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                  <span>Total Gross Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  <span>Subscription Retention</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                  <span>New Organic Signups</span>
                </div>
              </div>

              {/* Chart SVG */}
              <div className="relative flex-1 p-5 pt-8 overflow-visible">
                {trendData.labels && trendData.labels.length > 0 ? (
                  <div className="relative w-full h-[220px]">
                    <svg viewBox="0 0 800 220" width="100%" height="100%" className="overflow-visible">
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const y = 20 + p * 160;
                        return (
                          <line
                            key={idx}
                            x1={50}
                            y1={y}
                            x2={780}
                            y2={y}
                            stroke="#eaded6"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                          />
                        );
                      })}

                      {/* Render Lines & Dots */}
                      {[
                        { key: "revenue", color: "#3b82f6" },
                        { key: "retention", color: "#10b981" },
                        { key: "signups", color: "#a855f7" }
                      ].map((metric) => {
                        const lineInfo = getLineData(trendData[metric.key]);
                        if (!lineInfo) return null;
                        return (
                          <g key={metric.key}>
                            <path
                              d={lineInfo.d}
                              fill="none"
                              stroke={metric.color}
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {lineInfo.points.map((p, pIdx) => (
                              <circle
                                key={pIdx}
                                cx={p.x}
                                cy={p.y}
                                r={hoveredIdx === pIdx ? 5.5 : 3.5}
                                fill={metric.color}
                                stroke="white"
                                strokeWidth={1.5}
                                className="transition-all duration-150"
                              />
                            ))}
                          </g>
                        );
                      })}

                      {/* Vertical hover guide line */}
                      {hoveredIdx !== null && (
                        <line
                          x1={50 + (hoveredIdx / (trendData.labels.length - 1)) * 730}
                          y1={20}
                          x2={50 + (hoveredIdx / (trendData.labels.length - 1)) * 730}
                          y2={180}
                          stroke="#8b7b72"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* X-Axis labels */}
                      {trendData.labels.map((label, i) => {
                        const isLabelVisible = trendData.labels.length <= 7 || i === 0 || (i + 1) % 5 === 0 || i === trendData.labels.length - 1;
                        if (!isLabelVisible) return null;
                        const x = 50 + (i / (trendData.labels.length - 1)) * 730;
                        return (
                          <text
                            key={i}
                            x={x}
                            y={210}
                            textAnchor="middle"
                            className="text-[10px] font-black uppercase fill-[#9a8a80]"
                          >
                            {label}
                          </text>
                        );
                      })}

                      {/* Hover detection columns */}
                      {trendData.labels.map((_, i) => {
                        const colWidth = 730 / (trendData.labels.length - 1);
                        const x = 50 + i * colWidth - colWidth / 2;
                        return (
                          <rect
                            key={i}
                            x={i === 0 ? 50 : x}
                            y={20}
                            width={i === 0 || i === trendData.labels.length - 1 ? colWidth / 2 : colWidth}
                            height={160}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Tooltip Card overlay */}
                    {hoveredIdx !== null && (
                      <div
                        className="absolute z-10 rounded-[8px] border border-[#dfcfc3] bg-white/95 p-3 shadow-[0_10px_20px_rgba(66,36,18,0.12)] backdrop-blur-sm pointer-events-none"
                        style={{
                          left: `${Math.min(75, Math.max(5, (hoveredIdx / (trendData.labels.length - 1)) * 85))}%`,
                          top: "5px",
                        }}
                      >
                        <p className="text-[11px] font-black uppercase text-[#8d7d73]">
                          {trendData.labels[hoveredIdx]}
                        </p>
                        <div className="mt-2 space-y-1.5 text-[12px] font-semibold text-[#2f2119]">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                            <span>Revenue: ₹{trendData.revenue[hoveredIdx]?.toLocaleString('en-IN') || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                            <span>Retention: {trendData.retention[hoveredIdx] || 0}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                            <span>Organic Signups: {trendData.signups[hoveredIdx] || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-[12px] font-bold text-[#8d7d73]">
                    No trend data available for the selected range.
                  </div>
                )}
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#fd761a]" />
                <h3 className="text-[13px] font-black uppercase tracking-wider text-[#3a1100]">Regional Focus</h3>
                <button onClick={exportRegionalCSV} className="ml-auto grid h-7 w-7 place-items-center rounded-lg border border-[#efe5dc] bg-white text-[#796d66] hover:text-[#fd761a]" title="Export CSV"><Download size={12} /></button>
              </div>
            </div>

            {/* ── Selected state highlight card ────────────────────────────── */}
            {/* Dims while the per-state API fetch is in flight */}
            <div className={`rounded-2xl bg-[#3e1d11] text-white p-5 relative overflow-hidden transition-opacity duration-200 shadow-lg ${stateLoading ? 'opacity-60' : 'opacity-100'}`}>
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#d5bdae]">Selected State</p>
                  <h4 className="mt-1.5 text-[22px] font-black tracking-tight leading-none">{displayData.name}</h4>
                </div>
                {/* Conic-gradient ring — arc length driven by customerShare from MongoDB */}
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-[13px] font-black shadow-inner"
                  style={{ background: `conic-gradient(#e89f71 ${Math.min(displayData.customerShare * 3.6, 360)}deg, #2b1107 0deg)` }}
                >
                  <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#3e1d11] text-white text-[13px] font-bold">
                    {displayData.customerShare}%
                  </span>
                </div>
              </div>

              {/* 4-metric grid — all values from MongoDB via backend */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[10px] bg-[#2d1208] p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#d5bdae]">Customers</p>
                  <p className="mt-1 text-[15px] font-black text-white">
                    {displayData.totalCustomers.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#2d1208] p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#d5bdae]">Orders</p>
                  <p className="mt-1 text-[15px] font-black text-white">
                    {displayData.totalOrders.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#2d1208] p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#d5bdae]">Revenue</p>
                  <p className="mt-1 text-[13px] font-black text-white whitespace-nowrap">
                    {INR(displayData.revenue)}
                  </p>
                </div>
                <div className="rounded-[10px] bg-[#2d1208] p-3 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#d5bdae]">Growth</p>
                  <p className={`mt-1 text-[13px] font-black ${displayData.growth.startsWith("-") ? "text-red-400" : "text-emerald-400"}`}>
                    {displayData.growth.startsWith("-") || displayData.growth.startsWith("+")
                      ? displayData.growth
                      : `+${displayData.growth}`}
                  </p>
                </div>
              </div>

              {/* Customer Share progress bar
                  Formula (from MongoDB): stateCustomers ÷ totalCustomers × 100 */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#d5bdae]">
                  <span>Customer Share</span>
                  <span>{displayData.customerShare}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#2b1107] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#e89f71] transition-all duration-500"
                    style={{ width: `${Math.min(displayData.customerShare, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ── State Dropdown ────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#efe5dc] bg-white shadow-sm">
              <div className="border-b border-[#f5eee8] bg-[#faf7f4] px-5 py-3 flex items-center gap-2">
                <Award size={14} className="text-[#fd761a]"/>
                <h3 className="text-[12px] font-black text-[#3a1100]">Select State</h3>
              </div>
              <div className="p-3">
                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={isStateDropdownOpen}
                    onClick={() => setIsStateDropdownOpen((o) => !o)}
                    className="flex h-11 w-full items-center justify-between rounded-[7px] bg-[#eee5dd] px-4 text-[13px] font-semibold text-[#55463e] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7dcd3] active:translate-y-0 active:scale-[0.98]"
                  >
                    {selectedRegion || "Select a state..."}
                    <ChevronDown
                      className={`transition duration-300 ${isStateDropdownOpen ? "rotate-180" : ""}`}
                      size={16}
                    />
                  </button>

                  {isStateDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsStateDropdownOpen(false)}
                      />
                      <div className="absolute top-12 z-20 max-h-[280px] w-full overflow-y-auto rounded-[7px] border border-[#dfcfc3] bg-white shadow-[0_10px_20px_rgba(66,36,18,0.1)]">
                        {ALL_INDIAN_STATES_AND_UTS.map((state) => {
                          const isSelected = normalizeStateName(selectedRegion) === normalizeStateName(state);
                          return (
                            <button
                              key={state}
                              type="button"
                              onClick={() => {
                                setSelectedRegion(state);
                                setIsStateDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] font-black transition duration-300 ${
                                isSelected
                                  ? "bg-orange-50 text-[#fd761a]"
                                  : "text-[#55463e] hover:bg-[#fff7f0]"
                              }`}
                            >
                              <span>{state}</span>
                              {isSelected ? <Check className="text-[#fd761a]" size={14} strokeWidth={3} /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <article className="rounded-[10px] border border-[#dfcfc3] bg-white p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)]">
            <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#20140e]">
              Top Selling Categories
            </h2>
            <div className="mt-4 space-y-3">
              {categoryList.map(({ name, sales, value, iconName, tone }) => {
                const Icon = ICON_MAP[iconName] || Leaf;
                return (
                  <div
                    className="flex items-center justify-between gap-4 rounded-[8px] bg-[#f8eee7] p-3 transition hover:-translate-y-0.5 hover:bg-[#fff7f0]"
                    key={name}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-[7px] ${tone}`}
                      >
                        <Icon size={18} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black text-[#2a1a12]">
                          {name}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#8d7d73]">
                          {sales}
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] font-black text-[#2a1a12]">
                      {"\u20b9"}
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-[10px] border border-[#dfcfc3] bg-white p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)]">
            <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#20140e]">
              Custom Report Engine
            </h2>

            <div className="mt-5 max-w-2xl">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#8b7b72]">
                  Select Report Type
                </label>
                <button
                  aria-expanded={isReportOpen}
                  className="mt-2 flex h-11 w-full items-center justify-between rounded-[7px] bg-[#eee5dd] px-4 text-[13px] font-semibold text-[#55463e] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7dcd3] active:translate-y-0 active:scale-[0.98]"
                  onClick={() => setIsReportOpen((isOpen) => !isOpen)}
                  type="button"
                >
                  {selectedReport}
                  <ChevronDown
                    className={`transition duration-300 ${isReportOpen ? "rotate-180" : ""}`}
                    size={16}
                  />
                </button>
                {isReportOpen ? (
                  <div className="mt-2 overflow-hidden rounded-[7px] border border-[#dfcfc3] bg-white shadow-[0_10px_20px_rgba(66,36,18,0.1)]">
                    {reportTypes.map((report) => (
                      <button
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] font-black text-[#55463e] transition duration-300 hover:bg-[#fff7f0] active:bg-[#f0e8e1]"
                        key={report}
                        onClick={() => {
                          setSelectedReport(report);
                          setIsReportOpen(false);
                        }}
                        type="button"
                      >
                        {report}
                        {selectedReport === report ? (
                          <Check className="text-[#aa4504]" size={14} strokeWidth={3} />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8b7b72]">
                      Format
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        className={`h-9 rounded-[7px] px-5 text-[11px] font-black uppercase transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${reportFormat === "CSV"
                            ? "bg-[#2b0f04] text-white"
                            : "border border-[#e2d6cd] bg-white text-[#4b3c34] hover:bg-[#fff7f0]"
                          }`}
                        onClick={() => setReportFormat("CSV")}
                        type="button"
                      >
                        CSV
                      </button>
                      <button
                        className={`h-9 rounded-[7px] px-5 text-[11px] font-black uppercase transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${reportFormat === "PDF"
                            ? "bg-[#2b0f04] text-white"
                            : "border border-[#e2d6cd] bg-white text-[#4b3c34] hover:bg-[#fff7f0]"
                          }`}
                        onClick={() => setReportFormat("PDF")}
                        type="button"
                      >
                        PDF
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#8b7b72]">
                      Frequency
                    </label>
                    <button
                      aria-expanded={isFrequencyOpen}
                      className="mt-2 flex h-9 w-full items-center justify-between rounded-[7px] bg-[#eee5dd] px-3 text-[12px] font-semibold text-[#55463e] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7dcd3] active:translate-y-0 active:scale-[0.98]"
                      onClick={() => setIsFrequencyOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      {selectedFrequency}
                      <ChevronDown
                        className={`transition duration-300 ${isFrequencyOpen ? "rotate-180" : ""}`}
                        size={14}
                      />
                    </button>
                    {isFrequencyOpen ? (
                      <div className="mt-2 overflow-hidden rounded-[7px] border border-[#dfcfc3] bg-white shadow-[0_10px_20px_rgba(66,36,18,0.1)]">
                        {frequencies.map((frequency) => (
                          <button
                            className="block w-full px-3 py-2 text-left text-[12px] font-black text-[#55463e] transition duration-300 hover:bg-[#fff7f0] active:bg-[#f0e8e1]"
                            key={frequency}
                            onClick={() => {
                              setSelectedFrequency(frequency);
                              setIsFrequencyOpen(false);
                            }}
                            type="button"
                          >
                            {frequency}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Email Address Field */}
                <div className="mt-5">
                  <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-[#8b7b72]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="admin@example.com"
                    className="mt-2 h-11 w-full rounded-[7px] border border-[#dfcfc3] bg-[#eee5dd] px-4 text-[13px] font-semibold text-[#2f2119] placeholder-[#8d7d73] outline-none transition duration-300 hover:bg-[#e7dcd3] focus:bg-white focus:border-[#ad4d00]"
                  />
                  {emailError && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">{emailError}</p>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    className="flex-1 h-11 rounded-[8px] border border-[#dfcfc3] bg-[#f7eee8] text-[12px] font-black uppercase tracking-[0.06em] text-[#2f2119] shadow-[0_10px_20px_rgba(66,36,18,0.06)] transition duration-300 hover:-translate-y-0.5 hover:bg-white active:translate-y-0 active:scale-[0.98]"
                    onClick={saveReportSettings}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="flex-1 h-11 rounded-[8px] bg-[#aa4504] text-[12px] font-black uppercase tracking-[0.06em] text-white shadow-[0_12px_24px_rgba(170,69,4,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#c5530a] active:translate-y-0 active:scale-[0.98]"
                    onClick={exportReport}
                    type="button"
                  >
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* Saved Report Configurations Card */}
          <article className="rounded-[10px] border border-[#dfcfc3] bg-white p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)] mt-5 col-span-1 xl:col-span-2">
            <h2 className="text-[18px] font-black tracking-[-0.03em] text-[#20140e]">
              Saved Report Configurations
            </h2>
            {savedConfigs.length > 0 ? (
              <div className="mt-5 grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {savedConfigs.map((config, index) => (
                  <div key={config._id || index}
                    className="group relative rounded-xl border border-[#ead9cc] bg-[#faf8f5]/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:border-[#aa4504]/40 hover:shadow-md">

                    {/* Badge for format */}
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${config.format === 'PDF'
                          ? 'bg-[#ffe2a9] text-[#9b4b09]'
                          : 'bg-[#c7f3d5] text-[#167042]'
                        }`}>
                        {config.format}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#efe5dd] text-[#aa4504] group-hover:bg-[#aa4504] group-hover:text-white transition-colors duration-300">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 pr-12">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#8b7b72]">Report Type</p>
                        <h4 className="mt-0.5 text-[15px] font-black text-[#2a1a12] line-clamp-2" title={config.reportType}>
                          {config.reportType}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-[#f2e6dc] pt-4 text-[12.5px] text-[#55463e]">
                      <div className="flex items-center gap-2.5">
                        <Clock size={14} className="text-[#8b7b72] shrink-0" />
                        <span className="font-semibold">
                          <span className="text-[#8b7b72] text-[11px] font-medium mr-1">Frequency:</span>
                          {config.frequency}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail size={14} className="text-[#8b7b72] shrink-0" />
                        <span className="truncate font-semibold" title={config.recipientEmail}>
                          <span className="text-[#8b7b72] text-[11px] font-medium mr-1">Email:</span>
                          {config.recipientEmail}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <CalendarDays size={14} className="text-[#8b7b72] shrink-0" />
                        <span className="font-semibold">
                          <span className="text-[#8b7b72] text-[11px] font-medium mr-1">Created:</span>
                          {formatDate(config.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-bold text-[#8b7b72] py-4 mt-2">No saved configurations yet.</p>
            )}
          </article>
        </section>
      </div>
    </AdminLayout>
  );
}

export default Analytics;
