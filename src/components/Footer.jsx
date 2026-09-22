import { Link, useLocation } from "react-router-dom";

const quickLinks = [
  ["Home", "/"],
  ["About Us", "/about"],
  ["Categories", "/categories"],
  ["Bulk Orders", "/bulk"],
  ["Contact Us", "/contact"],
];

const joinVentureLinks = [
  ["Consultation", "/consultation"],
  ["Partnership", "/partnership"],
];

const complaintLinkColumns = [
  [
    ["Privacy Policy", "/privacy-policy"],
    ["Terms & Conditions", "/terms-conditions"],
    ["Refund Policy", "/refund-policy"],
  ],
  [
    ["Shipping Policy", "/shipping-policy"],
    ["Cookie Policy", "/cookie-policy"],
    ["Disclaimer", "/disclaimer"],
  ],
];

function Footer() {
  const location = useLocation();
  const currentRoute = `${location.pathname}${location.hash}`;

  return (
    <footer className="w-full border-t border-[#3b1f13] bg-[#5a3322] px-5 py-8 text-[#f7e6cf] shadow-[0_-8px_24px_rgba(45,22,12,0.14)] sm:px-8 lg:px-12">
      <div className="mx-auto grid w-full max-w-[1390px] gap-8 md:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_1.5fr]">
        <div>
          <Link
            className="text-[21px] font-black tracking-[-0.04em] text-white transition hover:text-[#f7e6cf]"
            to="/"
          >
            MACHINICHI
          </Link>

          <p className="mt-4 max-w-[255px] text-[14px] font-medium leading-6 text-[#f7e6cf]/84">
            Your trusted source for pure, organic, and wholesome essentials.
            Nourishing lives, the natural way.
          </p>

          <div className="mt-5 flex items-center gap-4 text-white">
            <a
              className="text-[20px] font-bold transition hover:text-[#f7e6cf]"
              href="https://www.facebook.com/"
              aria-label="Facebook"
            >
              f
            </a>

            <a
              className="transition hover:text-[#f7e6cf]"
              href="https://www.instagram.com/"
              aria-label="Instagram"
            >
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-[5px] border-2 border-current">
                <span className="h-[5px] w-[5px] rounded-full border border-current" />
              </span>
            </a>
          </div>
        </div>

        <FooterColumn currentRoute={currentRoute} title="QUICK LINKS" links={quickLinks} />
        <FooterColumn currentRoute={currentRoute} title="JOIN VENTURE" links={joinVentureLinks} />
        <PolicyLinks currentRoute={currentRoute} />
      </div>

      <p className="mx-auto mt-8 w-full max-w-[1390px] border-t border-white/16 pt-5 text-center text-[13px] font-medium text-[#f7e6cf]/72">
        {"\u00a9"} 2026 Machinichi Groups of Companies. All Rights Reserved.
      </p>
    </footer>
  );
}

function isFooterLinkActive(to, currentRoute) {
  if (to.includes("#")) return currentRoute === to;
  return currentRoute.split("#")[0] === to;
}

function PolicyLinks({ currentRoute }) {
  return (
    <div>
      <h3 className="text-[13px] font-black tracking-[0.05em] text-white">
        COMPLAINS
      </h3>

      <div className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {complaintLinkColumns.map((links, columnIndex) => (
          <div className="space-y-2.5" key={columnIndex}>
            {links.map(([label, to]) => (
              <FooterLink currentRoute={currentRoute} key={label} label={label} to={to} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterColumn({ currentRoute, title, links }) {
  return (
    <div>
      <h3 className="text-[13px] font-black tracking-[0.05em] text-white">
        {title}
      </h3>

      <div className="mt-4 space-y-2.5">
        {links.map(([label, to]) => (
          <FooterLink currentRoute={currentRoute} key={label} label={label} to={to} />
        ))}
      </div>
    </div>
  );
}

function FooterLink({ currentRoute, label, to }) {
  const isActive = isFooterLinkActive(to, currentRoute);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`group relative -mx-2 block w-fit rounded-[8px] px-2 py-1 text-[14px] transition duration-300 ${
        isActive
          ? "translate-x-0.5 bg-white/10 font-black text-white shadow-[0_8px_18px_rgba(255,236,210,0.08)]"
          : "font-medium text-[#f7e6cf]/82 hover:translate-x-0.5 hover:text-white"
      }`}
      to={to}
    >
      <span className="relative">
        {label}
        <span
          className={`absolute -bottom-1 left-0 h-[2px] rounded-full bg-[#ffd9c6] transition-all duration-300 ${
            isActive ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-70"
          }`}
        />
      </span>
    </Link>
  );
}

export default Footer;
