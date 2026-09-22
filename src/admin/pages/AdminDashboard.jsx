import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  CalendarDays,
  ChevronDown,
  Check,
  ClipboardCheck,
  Leaf,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import AdminLayout from "../components/AdminLayout";

const formatInr = (value) => `₹${Number(value).toLocaleString("en-IN")} INR`;
const formatCompact = (val) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${val}`;
};
const CATEGORY_ICONS = { BadgeDollarSign, Leaf, PackageCheck, ShoppingBag };

function AdminDashboard({ onAdminLogout }) {
  const navigate = useNavigate();
  const taskInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("This Year");
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [popupError, setPopupError] = useState("");
  const [hoveredBar, setHoveredBar] = useState(null);

  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const retry = () => {
    setLoading(true);
    setHasError(false);
    setStats(null);
    setRevenueData([]);
    setTopProducts([]);
    setCategories([]);
    setRecentOrders([]);
  };

  useEffect(() => {
    if (loading && !hasError) {
      fetchData();
    }
  }, [loading, hasError]);

  const fetchTasks = async () => {
    try {
      const res = await api.get("/admin/tasks");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTasks(res.data.data.map(t => ({
          id: t._id,
          title: t.title,
          completed: t.status === 'Completed'
        })));
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const getRevenueParams = (period) => {
    const now = new Date();
    let startDate, endDate, groupBy;
    if (period === "This Week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      monday.setHours(0, 0, 0, 0);
      startDate = monday.toISOString();
      endDate = now.toISOString();
      groupBy = "day";
    } else if (period === "This Month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endDate = now.toISOString();
      groupBy = "day";
    } else if (period === "Last 30 Days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString();
      endDate = now.toISOString();
      groupBy = "day";
    } else {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      endDate = now.toISOString();
      groupBy = "month";
    }
    return { startDate, endDate, groupBy };
  };

  const getExpectedLabels = (period) => {
    const now = new Date();
    if (period === "This Year") {
      return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    }
    if (period === "This Week") {
      return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    }
    if (period === "This Month") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    }
    if (period === "Last 30 Days") {
      const weeks = [];
      for (let w = 0; w < 5; w++) {
        const startDay = new Date(now);
        startDay.setDate(now.getDate() - 29 + w * 7);
        const endDay = new Date(now);
        endDay.setDate(now.getDate() - 29 + Math.min(w * 7 + 6, 29));
        const monthShort = startDay.toLocaleString("en-US", { month: "short" });
        weeks.push(`${monthShort} ${startDay.getDate()}–${endDay.getDate()}`);
      }
      return weeks;
    }
    return [];
  };

  const matchBackendToExpected = (backendData, expectedLabels, period) => {
    const now = new Date();
    const backendMap = {};
    backendData.forEach((item) => {
      const key = item._id || "";
      let displayLabel = key;
      if (period === "This Year" || period === "This Month") {
        const parts = key.split("-");
        if (parts.length >= 3) {
          const date = new Date(`${key}T00:00:00`);
          displayLabel = period === "This Year"
            ? date.toLocaleString("en-US", { month: "short" })
            : String(date.getDate());
        } else if (parts.length === 2) {
          displayLabel = new Date(`${key}-01T00:00:00`).toLocaleString("en-US", { month: "short" });
        }
      } else if (period === "This Week") {
        const date = new Date(`${key}T00:00:00`);
        displayLabel = date.toLocaleString("en-US", { weekday: "short" });
      } else if (period === "Last 30 Days") {
        const date = new Date(`${key}T00:00:00`);
        const daysSinceStart = Math.round((date - new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)) / 86400000);
        const weekIndex = Math.min(Math.max(0, Math.floor(daysSinceStart / 7)), 4);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 29 + weekIndex * 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - 29 + Math.min(weekIndex * 7 + 6, 29));
        const monthShort = weekStart.toLocaleString("en-US", { month: "short" });
        displayLabel = `${monthShort} ${weekStart.getDate()}–${weekEnd.getDate()}`;
      }
      backendMap[displayLabel] = (backendMap[displayLabel] || 0) + (item.totalRevenue || 0);
    });
    return expectedLabels.map((label) => ({
      label,
      revenue: backendMap[label] ?? 0,
      pct: 0,
    }));
  };

  const fetchData = async () => {
    try {
      const { startDate: initStart, endDate: initEnd, groupBy: initGroup } = getRevenueParams("This Year");
      const [statsRes, revenueRes, topRes, catRes, ordersRes, tasksRes] = await Promise.allSettled([
        api.get("/admin/dashboard"),
        api.get(`/admin/revenue?groupBy=${initGroup}&startDate=${initStart}&endDate=${initEnd}`),
        api.get("/admin/top-products?limit=5"),
        api.get("/admin/categories"),
        api.get("/orders/admin/all?limit=5"),
        api.get("/admin/tasks"),
      ]);

      if (statsRes.status === "fulfilled") {
        const body = statsRes.value.data;
        if (body.success && body.data) {
          const d = body.data;
          setStats({
            totalRevenue: d.totalRevenue || 0,
            totalOrders: d.totalOrders || 0,
            totalUsers: d.totalUsers || 0,
            totalProducts: d.totalProducts || 0,
            pendingOrders: d.pendingOrders || 0,
            todayOrders: d.todayOrders || 0,
            monthOrders: d.monthOrders || 0,
          });
        }
      }

      if (revenueRes.status === "fulfilled") {
        const body = revenueRes.value.data;
        if (body.success && Array.isArray(body.data)) {
          const expectedLabels = getExpectedLabels("This Year");
          const scaled = matchBackendToExpected(body.data, expectedLabels, "This Year");
          const maxRev = Math.max(...scaled.map((m) => m.revenue || 0), 1);
          scaled.forEach((m) => { m.pct = Math.min(100, Math.round(((m.revenue || 0) / maxRev) * 100)); });
          setRevenueData({ "This Year": scaled });
        }
      }

      if (topRes.status === "fulfilled") {
        const body = topRes.value.data;
        if (body.success && Array.isArray(body.data)) {
          const products = body.data;
          const maxSales = Math.max(...products.map((p) => p.totalSales || 0), 1);
          setTopProducts(products.map((p) => ({
            name: p.name,
            sales: (p.totalSales || 0).toLocaleString("en-IN"),
            value: formatInr(p.totalRevenue || 0),
            progress: `${Math.min(100, Math.round(((p.totalSales || 0) / maxSales) * 100))}%`,
          })));
        }
      }

      if (catRes.status === "fulfilled") {
        const body = catRes.value.data;
        if (body.success && Array.isArray(body.data)) {
          const cats = body.data;
          const maxSales = Math.max(...cats.map((c) => c.totalSales || 0), 1);
          const icons = [BadgeDollarSign, Leaf, PackageCheck, ShoppingBag];
          setCategories(cats.map((c, i) => ({
            name: c.categoryName || c.name || c._id,
            totalSales: c.totalSales || 0,
            totalRevenue: c.totalRevenue || 0,
            revenue: formatInr(c.totalRevenue || 0),
            growth: "+0%",
            progress: `${Math.min(100, Math.round(((c.totalSales || 0) / maxSales) * 100))}%`,
            icon: icons[i % icons.length],
          })));
        }
      }

      if (ordersRes.status === "fulfilled") {
        const body = ordersRes.value.data;
        if (body.success && Array.isArray(body.data)) {
          setRecentOrders(body.data.map((o) => ({
            id: o.orderId || o._id?.slice(-8).toUpperCase() || "#ORD",
            customer: o.shippingAddress?.fullName || o.userId?.name || "Customer",
            product: o.items?.[0]?.productId?.name || o.items?.[0]?.name || "N/A",
            amount: formatInr(o.orderTotal || o.totalAmount || o.total || 0),
            status: o.orderStatus || o.status || "Pending",
          })));
        }
      }

      if (tasksRes.status === "fulfilled") {
        const body = tasksRes.value.data;
        if (body.success && Array.isArray(body.data)) {
          setTasks(body.data.map(t => ({
            id: t._id,
            title: t.title,
            completed: t.status === 'Completed'
          })));
        }
      }

      const anyData = [statsRes, revenueRes, topRes, catRes, ordersRes, tasksRes].some((r) => r.status === "fulfilled");
      setHasError(!anyData);
    } catch { setHasError(true); }
    setLoading(false);
  };

  const periodOptions = ["This Year", "This Month", "Last 30 Days", "This Week"];

  const fetchRevenue = async (period) => {
    try {
      const { startDate, endDate, groupBy } = getRevenueParams(period);
      const { data } = await api.get(`/admin/revenue?groupBy=${groupBy}&startDate=${startDate}&endDate=${endDate}`);
      if (data?.success && Array.isArray(data.data)) {
        const expectedLabels = getExpectedLabels(period);
        const scaled = matchBackendToExpected(data.data, expectedLabels, period);
        const maxRev = Math.max(...scaled.map((m) => m.revenue || 0), 1);
        scaled.forEach((m) => { m.pct = Math.min(100, Math.round(((m.revenue || 0) / maxRev) * 100)); });
        setRevenueData((prev) => ({ ...prev, [period]: scaled }));
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchRevenue(selectedPeriod);
    }
  }, [selectedPeriod, loading]);

  const chartBars = useMemo(() => revenueData[selectedPeriod] || getExpectedLabels(selectedPeriod).map((label) => ({ revenue: 0, label, pct: 0 })), [revenueData, selectedPeriod]);

  const maxRevenue = useMemo(() => {
    return Math.max(...chartBars.map((b) => b.revenue || 0), 1);
  }, [chartBars]);

  const notifications = useMemo(() => {
    const items = [];
    if (stats?.pendingOrders > 0) items.push({ title: `${stats.pendingOrders} pending orders need attention`, detail: "Review orders", to: "/admin/orders" });
    items.push({ title: "Manage your product catalog", detail: "Open product listing", to: "/admin/product-listing" });
    items.push({ title: "Check inventory levels", detail: "View inventory", to: "/admin/inventory" });
    return items;
  }, [stats]);

  useEffect(() => {
    if (isCreateTaskOpen) {
      taskInputRef.current?.focus();
      setPopupError("");
    }
  }, [isCreateTaskOpen]);

  const [searching, setSearching] = useState(false);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return;

    setSearching(true);
    try {
      const { data } = await api.get("/admin/products", {
        params: { search: trimmedSearch, limit: 1, page: 1 },
      });
      const hasProductMatch = data.success && (data.pagination?.total || 0) > 0;
      navigate(
        hasProductMatch
          ? `/admin/product-listing?search=${encodeURIComponent(trimmedSearch)}&highlight=${encodeURIComponent(trimmedSearch)}`
          : `/admin/orders?search=${encodeURIComponent(trimmedSearch)}&highlight=${encodeURIComponent(trimmedSearch)}`,
      );
    } catch {
      navigate(`/admin/orders?search=${encodeURIComponent(trimmedSearch)}&highlight=${encodeURIComponent(trimmedSearch)}`);
    } finally {
      setSearching(false);
    }
  };

  const openNotification = (to) => {
    setIsNotificationsOpen(false);
    navigate(to);
  };

  const updateTasks = (updater) => {
    const applyUpdate = () => setTasks(updater);

    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(applyUpdate);
      return;
    }

    applyUpdate();
  };

  const closeCreateTaskModal = () => {
    setIsCreateTaskOpen(false);
    setTaskInput("");
    setPopupError("");
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    const trimmedTask = taskInput.trim();
    if (!trimmedTask) {
      setPopupError("Please enter a task.");
      return;
    }

    try {
      setPopupError("");
      const res = await api.post("/admin/tasks", { title: trimmedTask });
      if (res.data?.success) {
        await fetchTasks();
        closeCreateTaskModal();
      } else {
        setPopupError(res.data?.message || "Failed to create task.");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      setPopupError(err.response?.data?.message || "Failed to create task. Please try again.");
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;
    const newStatus = newCompleted ? "Completed" : "Pending";

    try {
      const res = await api.put(`/admin/tasks/${taskId}`, { status: newStatus });
      if (res.data?.success) {
        updateTasks((currentTasks) =>
          currentTasks.map((t) =>
            t.id === taskId ? { ...t, completed: newCompleted } : t
          )
        );
      } else {
        alert(res.data?.message || "Failed to update task status.");
      }
    } catch (err) {
      console.error("Error updating task status:", err);
      alert(err.response?.data?.message || "Failed to update task status. Please try again.");
    }
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-[14px] border border-[#ead9cc] bg-[#fffaf5]/90 p-4 shadow-[0_18px_36px_rgba(66,36,18,0.08)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a24a0a]">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-[30px] font-black tracking-[-0.04em] text-[#27150b] sm:text-[36px]">
              Welcome back, Admin
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] font-medium leading-6 text-[#76675d]">
              Monitor sales, orders, inventory health, customer activity, and
              store performance from one operational overview.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form
              className="flex h-11 items-center gap-2 rounded-[8px] border border-[#decbbc] bg-white px-4 text-[#8b7a70] transition duration-300 focus-within:border-[#ad4d00] focus-within:shadow-[0_0_0_4px_rgba(173,77,0,0.1)]"
              onSubmit={handleSearchSubmit}
            >
              <Search size={18} />
              <input
                aria-label="Search dashboard"
                className="w-full bg-transparent text-[14px] font-semibold text-[#312017] outline-none placeholder:text-[#aa9b91] sm:w-56"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search orders, products..."
                type="search"
                value={searchTerm}
              />
              <button
                aria-label="Search"
                className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#ad4d00] px-3 text-[12px] font-bold text-white transition hover:bg-[#8c3f00] disabled:opacity-50"
                disabled={!searchTerm.trim() || searching}
                type="submit"
              >
                {searching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </form>
            <div className="relative">
              <button
                aria-expanded={isNotificationsOpen}
                aria-label="Notifications"
                className="grid h-11 w-11 place-items-center rounded-[8px] border border-[#decbbc] bg-white text-[#4d382d] transition duration-300 hover:-translate-y-0.5 hover:border-[#c9ad98] hover:bg-[#fff6ef] active:translate-y-0 active:scale-[0.98]"
                onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
                type="button"
              >
                <Bell size={18} />
              </button>

              {isNotificationsOpen ? (
                <div className="absolute right-0 top-14 z-30 w-[280px] overflow-hidden rounded-[12px] border border-[#decbbc] bg-white shadow-[0_18px_36px_rgba(66,36,18,0.16)]">
                  {notifications.map((notification) => (
                    <button
                      className="block w-full border-b border-[#f0e3d8] px-4 py-3 text-left transition duration-300 last:border-b-0 hover:bg-[#fff6ef] active:bg-[#f7eadf]"
                      key={notification.title}
                      onClick={() => openNotification(notification.to)}
                      type="button"
                    >
                      <span className="block text-[13px] font-black leading-5 text-[#2f1d13]">
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-[12px] font-bold text-[#ad4d00]">
                        {notification.detail}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {hasError ? (
          <section className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-[16px] font-bold text-red-700">Failed to load dashboard data</p>
            <p className="mt-2 text-[13px] text-red-600">Check your connection and try again.</p>
            <button onClick={retry} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-5 text-[13px] font-bold text-white transition hover:bg-red-700" type="button">
              Retry
            </button>
          </section>
        ) : null}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <article key={i} className="animate-pulse rounded-[12px] border border-[#ead9cc] bg-[#fffaf5] p-5">
              <div className="h-4 w-24 rounded bg-[#ead9cc]" />
              <div className="mt-3 h-8 w-28 rounded bg-[#ead9cc]" />
            </article>
          )) : [
            { title: "Total Revenue", value: formatInr(stats?.totalRevenue || 0), change: (stats?.monthOrders ? "+12" : "+0") + "%", icon: BadgeDollarSign, tone: "bg-[#3a1100]" },
            { title: "Total Orders", value: (stats?.totalOrders || 0).toLocaleString("en-IN"), change: (stats?.todayOrders ? "+" + ((stats.todayOrders / (stats.totalOrders || 1)) * 100).toFixed(1) : "+0") + "%", icon: ShoppingBag, tone: "bg-[#ad4d00]" },
            { title: "Total Customers", value: (stats?.totalUsers || 0).toLocaleString("en-IN"), change: "+0%", icon: UsersRound, tone: "bg-[#6e3a17]" },
            { title: "Total Products", value: (stats?.totalProducts || 0).toLocaleString("en-IN"), change: "+0%", icon: PackageCheck, tone: "bg-[#8b5a2b]" },
          ].map(({ title, value, change, icon: Icon, tone }) => (
            <article
              className="rounded-[12px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_16px_34px_rgba(66,36,18,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_rgba(66,36,18,0.11)]"
              key={title}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[13px] font-bold text-[#827267]">
                    {title}
                  </p>
                  <p className="mt-3 text-[30px] font-black tracking-[-0.04em] text-[#28160c]">
                    {value}
                  </p>
                </div>
                <span
                  className={`grid h-11 w-11 place-items-center rounded-[10px] text-white shadow-[0_12px_22px_rgba(58,17,0,0.18)] ${tone}`}
                >
                  <Icon size={21} strokeWidth={2.2} />
                </span>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[13px] font-black text-[#1f7a3a]">
                <TrendingUp size={16} />
                <span>{change}</span>
                <span className="font-semibold text-[#95857b]">
                  vs last month
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-12 xl:items-start">
          <article className="rounded-[16px] border border-[#ead9cc] bg-[#fffaf5] p-6 shadow-[0_16px_34px_rgba(66,36,18,0.07)] xl:col-span-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[24px] font-black tracking-[-0.035em] text-[#21150f]">
                  Sales Overview
                </h2>
                <p className="mt-2 text-[16px] font-medium text-[#806e63]">
                  Monthly revenue performance
                </p>
              </div>
              <div className="relative">
                <button
                  aria-expanded={isPeriodOpen}
                  className="inline-flex h-[50px] min-w-[184px] items-center justify-center gap-3 rounded-[10px] border border-[#decbbc] bg-white px-5 text-[16px] font-black text-[#4d382d] transition duration-300 hover:-translate-y-0.5 hover:border-[#c9ad98] hover:bg-[#fff6ef] active:translate-y-0 active:scale-[0.98]"
                  onClick={() => setIsPeriodOpen((isOpen) => !isOpen)}
                  type="button"
                >
                  <CalendarDays size={19} />
                  {selectedPeriod}
                  <ChevronDown
                    className={`transition duration-300 ${isPeriodOpen ? "rotate-180" : ""}`}
                    size={17}
                  />
                </button>

                {isPeriodOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-40 overflow-hidden rounded-[10px] border border-[#decbbc] bg-white shadow-[0_14px_30px_rgba(66,36,18,0.14)]">
                    {periodOptions.map((period) => (
                      <button
                        className={`block w-full px-4 py-2.5 text-left text-[12px] font-black transition duration-300 hover:bg-[#fff6ef] active:bg-[#f7eadf] ${
                          selectedPeriod === period
                            ? "bg-[#fbf2ea] text-[#ad4d00]"
                            : "text-[#4d382d]"
                        }`}
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

            <div className="mt-8 overflow-hidden rounded-[14px] bg-[#fbf1e8] p-4 sm:p-5">
              <div className="h-[280px] w-full min-w-0">
                <svg
                  aria-label="Sales revenue overview chart"
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                  role="img"
                  viewBox="0 0 900 280"
                >
                  <defs>
                    <linearGradient id="salesAreaFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#b95700" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#b95700" stopOpacity="0.02" />
                    </linearGradient>
                    <filter id="salesLineShadow" height="140%" width="120%" x="-10%" y="-20%">
                      <feDropShadow dx="0" dy="4" floodColor="#6d2b00" floodOpacity="0.18" stdDeviation="3" />
                    </filter>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = 224 - tick * 190;
                    return (
                      <g key={tick}>
                        <line
                          stroke="#eadbcd"
                          strokeDasharray="2 6"
                          strokeWidth="1"
                          x1="56"
                          x2="878"
                          y1={y}
                          y2={y}
                        />
                        <text
                          fill="#8e7f75"
                          fontSize="11"
                          fontWeight="700"
                          textAnchor="end"
                          x="46"
                          y={y + 4}
                        >
                          {formatCompact(maxRevenue * tick)}
                        </text>
                      </g>
                    );
                  })}

                  <line stroke="#decbbc" strokeWidth="1" x1="56" x2="878" y1="224" y2="224" />
                  <polygon
                    fill="url(#salesAreaFill)"
                    points={`56,224 ${chartBars.map((bar, index) => {
                      const x = chartBars.length === 1 ? 467 : 56 + (index * 822) / (chartBars.length - 1);
                      const y = 224 - ((bar.revenue || 0) / maxRevenue) * 190;
                      return `${x},${y}`;
                    }).join(" ")} 878,224`}
                  />
                  <polyline
                    fill="none"
                    filter="url(#salesLineShadow)"
                    points={chartBars.map((bar, index) => {
                      const x = chartBars.length === 1 ? 467 : 56 + (index * 822) / (chartBars.length - 1);
                      const y = 224 - ((bar.revenue || 0) / maxRevenue) * 190;
                      return `${x},${y}`;
                    }).join(" ")}
                    stroke="#a84900"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                  />
                  {chartBars.map((bar, index) => {
                    const x = chartBars.length === 1 ? 467 : 56 + (index * 822) / (chartBars.length - 1);
                    const y = 224 - ((bar.revenue || 0) / maxRevenue) * 190;
                    const label = bar.label;
                    return (
                      <g className="group" key={index}>
                        <circle cx={x} cy={y} fill="#fffaf5" r="5.5" stroke="#a84900" strokeWidth="3" />
                        <text fill="#8e7f75" fontSize="12" fontWeight="800" textAnchor="middle" x={x} y="254">
                          {label}
                        </text>
                        <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
                          <rect fill="#2a170d" height="25" rx="5" width="76" x={x - 38} y={Math.max(y - 38, 2)} />
                          <text fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle" x={x} y={Math.max(y - 22, 18)}>
                            {formatInr(bar.revenue)}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </article>

          <article className="rounded-[14px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_16px_34px_rgba(66,36,18,0.07)] xl:col-span-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#2a170d]">
                    Top Products
                  </h2>
                  <p className="mt-1 text-[13px] font-medium text-[#837469]">
                    Best selling items
                  </p>
                </div>
                <ArrowUpRight className="text-[#ad4d00]" size={20} />
              </div>

              <div className="mt-6 space-y-5">
                {topProducts.map((product) => (
                  <div key={product.name}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-black text-[#342117]">
                          {product.name}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-[#8b7a70]">
                          {product.sales} sales
                        </p>
                      </div>
                      <p className="text-[14px] font-black text-[#2a170d]">
                        {product.value}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[#eadbcf]">
                      <div
                        className="h-full rounded-full bg-[#ad4d00]"
                        style={{ width: product.progress }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-[12px] bg-[#3a1100] p-5 text-white">
                <p className="text-[13px] font-semibold text-white/70">
                  Today&apos;s Target
                </p>
                <p className="mt-2 text-[28px] font-black tracking-[-0.04em]">
                  {topProducts.length > 0 ? `${Math.min(100, Math.round((stats?.todayOrders || 0) / Math.max(stats?.totalOrders || 1, 1) * 100))}% Complete` : "No data"}
                </p>
                <p className="mt-2 text-[13px] leading-5 text-white/72">
                  {topProducts.length > 0 ? `${stats?.todayOrders || 0} orders today · keep it up!` : "Continue driving sales to reach today&apos;s goal."}
                </p>
              </div>
          </article>

          <article className="rounded-[14px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_16px_34px_rgba(66,36,18,0.07)] xl:col-span-12">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#2a170d]">
                  Top Categories
                </h2>
                <p className="mt-1 text-[13px] font-medium text-[#837469]">
                  Category performance by orders, revenue, and product activity
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#e8f7ec] px-3 py-1 text-[12px] font-black text-[#23723a]">
                {categories.length} categories tracked
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
              {categories.map((category, index) => {
                const Icon = category.icon;
                const isTopCategory = index === 0;

                return (
                  <article
                    className={`group flex min-h-[214px] flex-col rounded-[12px] border p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(66,36,18,0.11)] ${
                      isTopCategory
                        ? "border-[#ad4d00] bg-[#fff1e5] shadow-[0_14px_28px_rgba(173,77,0,0.12)]"
                        : "border-[#ead9cc] bg-white/78 hover:border-[#d7bba6] hover:bg-white"
                    }`}
                    key={category.name}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`grid h-9 min-w-9 place-items-center rounded-[9px] text-[12px] font-black ${
                          isTopCategory
                            ? "bg-[#3a1100] text-white"
                            : "bg-[#f1e2d5] text-[#7a4420]"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span
                        className={`grid h-9 min-w-9 place-items-center rounded-full transition duration-300 group-hover:scale-110 ${
                          isTopCategory
                            ? "bg-[#ad4d00] text-white"
                            : "bg-[#fbf2ea] text-[#ad4d00]"
                        }`}
                      >
                        <Icon size={17} strokeWidth={2.4} />
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-[15px] font-black leading-5 text-[#2f1d13]">
                        {category.name}
                      </h3>
                      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#8b7a70]">
                        {category.totalSales.toLocaleString("en-IN")} sales
                      </p>
                    </div>

                    <div className="mt-auto pt-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#9b8a80]">
                            Revenue
                          </p>
                          <p className="mt-1 text-[13px] font-black text-[#2a170d]">
                            {category.revenue}
                          </p>
                        </div>
                        <p className="text-[12px] font-black text-[#1f7a3a]">
                          {category.growth}
                        </p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#eadbcf]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 group-hover:brightness-110 ${
                            isTopCategory
                              ? "bg-gradient-to-r from-[#3a1100] to-[#ad4d00]"
                              : "bg-[#ad4d00]"
                          }`}
                          style={{ width: category.progress }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
          <article className="overflow-hidden rounded-[14px] border border-[#ead9cc] bg-[#fffaf5] shadow-[0_16px_34px_rgba(66,36,18,0.07)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#ead9cc] px-5 py-4">
              <div>
                <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#2a170d]">
                  Recent Orders
                </h2>
                <p className="mt-1 text-[13px] font-medium text-[#837469]">
                  Latest store activity
                </p>
              </div>
              <button
                className="rounded-[8px] bg-[#3a1100] px-4 py-2 text-[13px] font-black text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#ad4d00] active:translate-y-0 active:scale-[0.98]"
                onClick={() => navigate("/admin/orders")}
                type="button"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-[#fbf2ea] text-[12px] font-black uppercase tracking-[0.08em] text-[#8a786d]">
                  <tr>
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe2d7]">
                  {recentOrders.map((order) => (
                    <tr
                      className="transition hover:bg-[#fff6ef]"
                      key={order.id}
                    >
                      <td className="px-5 py-4 text-[14px] font-black text-[#2f1d13]">
                        {order.id}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-semibold text-[#4e4038]">
                        {order.customer}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-semibold text-[#4e4038]">
                        {order.product}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-black text-[#2f1d13]">
                        {order.amount}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[12px] font-black ${
                            order.status === "Delivered"
                              ? "bg-[#e8f7ec] text-[#23723a]"
                              : order.status === "Pending"
                                ? "bg-[#fff0d8] text-[#9a5a05]"
                                : "bg-[#edf1ff] text-[#3655a4]"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[14px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_16px_34px_rgba(66,36,18,0.07)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[20px] font-black tracking-[-0.03em] text-[#2a170d]">
                  Tasks
                </h2>
                <p className="mt-1 text-[13px] font-medium text-[#837469]">
                  {tasks.filter((task) => !task.completed).length} active
                </p>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3a1100] px-4 text-[12px] font-black text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#ad4d00] active:translate-y-0 active:scale-[0.98]"
                onClick={() => setIsCreateTaskOpen(true)}
                type="button"
              >
                <Plus size={15} />
                Create Task
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {/* Pending Tasks Section */}
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.08em] text-[#8a786d] mb-2.5">
                  Pending Tasks
                </h3>
                {tasks.filter((task) => !task.completed).length === 0 ? (
                  <p className="text-[13px] font-semibold text-[#8b7a70] italic p-3 rounded-[10px] border border-[#ead9cc] border-dashed text-center">
                    No pending tasks
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.filter((task) => !task.completed).map((task, index) => (
                      <div
                        className="flex items-start gap-3 rounded-[10px] border border-[#ead9cc] bg-[#fff7f0] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                        key={task.id}
                        style={{
                          animation: `adminTaskIn 280ms ease-out ${Math.min(index, 6) * 35}ms both`,
                          viewTransitionName: `admin-task-${task.id}`,
                        }}
                      >
                        <button
                          aria-label={`Mark complete: ${task.title}`}
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[7px] border border-[#d5bca8] bg-white text-transparent transition duration-300 hover:border-[#ad4d00] hover:text-[#ad4d00] active:scale-95"
                          onClick={() => toggleTaskCompletion(task.id)}
                          type="button"
                        >
                          <Check size={15} strokeWidth={3} />
                        </button>
                        <p className="text-[13px] font-bold leading-5 text-[#4d3d34]">
                          {task.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-[#ead9cc]" />

              {/* Completed Tasks Section */}
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-[0.08em] text-[#8a786d] mb-2.5">
                  Completed Tasks
                </h3>
                {tasks.filter((task) => task.completed).length === 0 ? (
                  <p className="text-[13px] font-semibold text-[#8b7a70] italic p-3 rounded-[10px] border border-[#ead9cc] border-dashed text-center">
                    No completed tasks
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.filter((task) => task.completed).map((task, index) => (
                      <div
                        className="flex items-start gap-3 rounded-[10px] border border-[#d8c8bb] bg-[#f3ebe4] p-3 opacity-75 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white"
                        key={task.id}
                        style={{
                          animation: `adminTaskIn 280ms ease-out ${Math.min(index, 6) * 35}ms both`,
                          viewTransitionName: `admin-task-${task.id}`,
                        }}
                      >
                        <button
                          aria-label={`Mark incomplete: ${task.title}`}
                          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[7px] border border-[#23723a] bg-[#23723a] text-white transition duration-300 active:scale-95"
                          onClick={() => toggleTaskCompletion(task.id)}
                          type="button"
                        >
                          <Check size={15} strokeWidth={3} />
                        </button>
                        <p className="text-[13px] font-bold leading-5 text-[#8b7a70] line-through decoration-[#ad4d00]/60">
                          {task.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        </section>
      </div>

      <div
        aria-hidden={!isCreateTaskOpen}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[#2a170d]/45 px-4 backdrop-blur-sm transition-all duration-300 ${
          isCreateTaskOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeCreateTaskModal}
      >
        <div
          aria-modal="true"
          className={`w-full max-w-md rounded-[14px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_24px_70px_rgba(42,23,13,0.24)] transition-all duration-300 ${
            isCreateTaskOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0"
          }`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a24a0a]">
                Tasks
              </p>
              <h2 className="mt-2 text-[22px] font-black tracking-[-0.03em] text-[#2a170d]">
                Create Task
              </h2>
            </div>
            <button
              aria-label="Close create task popup"
              className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#decbbc] bg-white text-[#4d382d] transition duration-300 hover:-translate-y-0.5 hover:border-[#c9ad98] hover:bg-[#fff6ef] active:translate-y-0 active:scale-[0.98]"
              disabled={!isCreateTaskOpen}
              onClick={closeCreateTaskModal}
              tabIndex={isCreateTaskOpen ? 0 : -1}
              type="button"
            >
              <X size={17} />
            </button>
          </div>

          <form className="mt-5" onSubmit={handleCreateTask}>
            <label
              className="text-[13px] font-black text-[#4d382d]"
              htmlFor="admin-task-input"
            >
              Task
            </label>
            <input
              className="mt-2 h-12 w-full rounded-[8px] border border-[#decbbc] bg-white px-4 text-[14px] font-semibold text-[#312017] outline-none transition duration-300 placeholder:text-[#aa9b91] focus:border-[#ad4d00] focus:shadow-[0_0_0_4px_rgba(173,77,0,0.1)]"
              disabled={!isCreateTaskOpen}
              id="admin-task-input"
              onChange={(event) => {
                setTaskInput(event.target.value);
                if (event.target.value.trim()) setPopupError("");
              }}
              placeholder="Enter a task"
              ref={taskInputRef}
              tabIndex={isCreateTaskOpen ? 0 : -1}
              type="text"
              value={taskInput}
            />
            {popupError && (
              <p className="mt-2 text-[13px] font-bold text-red-600">{popupError}</p>
            )}
            <button
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#3a1100] px-4 text-[13px] font-black text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#ad4d00] active:translate-y-0 active:scale-[0.98]"
              disabled={!isCreateTaskOpen}
              tabIndex={isCreateTaskOpen ? 0 : -1}
              type="submit"
            >
              <ClipboardCheck size={16} />
              Create Task
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes adminTaskIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </AdminLayout>
  );
}

export default AdminDashboard;
