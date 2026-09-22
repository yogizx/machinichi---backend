import {
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Image,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  PlusCircle,
  RotateCcw,
  Tags,
  UserRound,
  UsersRound,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../images/machinichi.png";

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/admin/dashboard",
  },
  {
    label: "Profile",
    icon: UserRound,
    to: "/admin/profile",
  },
  {
    label: "Customer",
    icon: UsersRound,
    to: "/admin/customers",
  },
  {
    label: "Categories",
    icon: Tags,
    to: "/admin/categories",
  },
  {
    label: "Inventory",
    icon: Boxes,
    to: "/admin/inventory",
  },
  {
    label: "Product Listing",
    icon: PackageCheck,
    to: "/admin/product-listing",
  },
  {
    label: "Orders",
    icon: ClipboardList,
    to: "/admin/orders",
  },
  {
    label: "Businesses",
    icon: Building2,
    to: "/admin/businesses",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    to: "/admin/analytics",
  },
  {
    label: "Banner Images",
    icon: Image,
    to: "/admin/banner-images",
  },
  {
    label: "Return Request",
    icon: RotateCcw,
    to: "/admin/return-request",
  },
  {
    label: "Offers & Coupons",
    icon: BadgePercent,
    to: "/admin/offers-coupons",
  },
  {
    label: "Create Offers",
    icon: PlusCircle,
    to: "/admin/create-offers",
  },
];

function AdminSidebar({ onAdminLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onAdminLogout?.();
    navigate("/admin/login");
  };

  return (
    <aside className="sticky top-0 z-20 flex w-full flex-col border-b border-[#ead9cc] bg-[#fffaf5] text-[#2d1a10] shadow-[0_10px_28px_rgba(64,35,17,0.08)] md:h-screen md:w-[280px] md:min-w-[280px] md:border-b-0 md:border-r">
      <div className="border-b border-[#ead9cc] px-5 py-5 md:px-6">
        <NavLink
          aria-label="Machinichi admin dashboard"
          className="flex items-center gap-4 rounded-[10px] p-2 transition duration-300 hover:bg-[#f5ebe2]"
          to="/admin/dashboard"
        >
          <span className="grid h-[86px] w-[86px] shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[#1f130d] bg-black shadow-[0_16px_28px_rgba(0,0,0,0.18)]">
            <img
              alt="Machinichi logo"
              className="h-[76px] w-[76px] object-contain"
              src={logo}
            />
          </span>

          <span className="min-w-0">
            <span className="block text-[24px] font-black leading-none tracking-[-0.035em] text-[#2a1409]">
              Machinichi
            </span>
            <span className="mt-1 block text-[12px] font-black uppercase tracking-[0.12em] text-[#a04a0c]">
              Admin Panel
            </span>
          </span>
        </NavLink>
      </div>

      <nav
        aria-label="Admin navigation"
        className="flex gap-2 overflow-x-auto px-4 py-4 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:px-5 md:py-6"
      >
        {menuItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            className={({ isActive }) =>
              `group flex h-12 shrink-0 items-center gap-3 rounded-[8px] px-4 text-[14px] font-black tracking-[-0.01em] transition duration-300 md:w-full ${
                isActive
                  ? "bg-[#3a1100] text-white shadow-[0_12px_22px_rgba(58,17,0,0.18)]"
                  : "text-[#44352d] hover:-translate-y-0.5 hover:bg-[#f4e9df] hover:text-[#2d1205]"
              }`
            }
            key={label}
            to={to}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-[7px] transition duration-300 ${
                    isActive
                      ? "bg-white/14 text-white"
                      : "bg-white/65 text-[#8f4513] group-hover:bg-white group-hover:text-[#3a1100]"
                  }`}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#ead9cc] px-4 py-4 md:px-5">
        <button
          className="group flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-[#ead9cc] bg-white/72 px-4 text-[14px] font-black text-[#7f2814] shadow-[0_10px_20px_rgba(65,35,17,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[#f0b6a5] hover:bg-[#fff2ee] hover:text-[#a52f17] active:translate-y-0 active:scale-[0.98]"
          onClick={handleLogout}
          type="button"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-[#fff1ed] text-[#a52f17] transition group-hover:bg-[#a52f17] group-hover:text-white">
            <LogOut size={17} strokeWidth={2.3} />
          </span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
