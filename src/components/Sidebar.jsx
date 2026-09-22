import {
  ClipboardList,
  Clock3,
  Headphones,
  MapPinned,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const menuItems = [
  { label: "Profile", icon: UserRound, to: "/profile" },
  { label: "Overview", icon: Clock3, to: "/overview" },
  { label: "Orders", icon: ClipboardList, to: "/orders" },
  { label: "Track Orders", icon: MapPinned, to: "/trackorder" },
  { label: "Return Request", icon: RotateCcw, to: "/return-request" },
];

function Sidebar({ showHelp = true }) {
  const { pathname } = useLocation();

  return (
    <aside className="w-full shrink-0 border-b border-[#e8ded5] bg-[#fffaf5] px-3 py-4 text-[#342b25] md:w-[185px] md:min-w-[185px] md:self-start md:border-b-0 md:border-r md:px-3 md:py-5">
      <h2 className="mb-3 text-[12px] font-black uppercase tracking-[0.055em] text-[#332d28]">
        Account
      </h2>

      <nav aria-label="Account navigation" className="flex flex-col gap-1.5">
        {menuItems.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) => {
              const active =
                isActive || (to === "/profile" && pathname === "/account");

              return `flex h-[38px] w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] font-semibold tracking-[-0.01em] transition duration-200 ${
                active
                  ? "bg-[#3a1100] text-white shadow-[0_4px_10px_rgba(58,17,0,0.12)]"
                  : "bg-transparent text-[#3b332e] hover:bg-[#f4ece5] hover:text-[#2f1206]"
              }`;
            }}
          >
            {({ isActive }) => {
              const active =
                isActive || (to === "/profile" && pathname === "/account");

              return (
                <>
                  <Icon
                    className={active ? "text-white" : "text-[#342b25]"}
                    size={15}
                    strokeWidth={2}
                  />

                  <span className="truncate">{label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {showHelp && (
        <div className="mt-6 hidden rounded-2xl border border-[#efe5dc] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] md:block">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1e4] text-[#fd761a]">
            <Headphones size={17} />
          </span>
          <h3 className="mt-3 text-[13px] font-black text-[#3a1100]">Need Help?</h3>
          <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-[#9a8b82]">
            We're here to help you with your orders.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("machinichi:open-support"))}
            className="mt-3.5 h-9 w-full rounded-xl border border-[#fd761a]/40 text-[11.5px] font-black text-[#fd761a] transition hover:bg-[#fff8f2]"
          >
            Contact Support
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;