import {
  ArrowRight,
  Building2,
  Factory,
  Globe2,
  GraduationCap,
  Heart,
  Hotel,
  Landmark,
  LineChart,
  MessageCircle,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

const phone = "+919952252213";
const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hi! I'd like to discuss industry-specific digital marketing for my business.")}`;

const industries = [
  {
    num: "01",
    title: "Retail & E-Commerce",
    description: "Build visibility, product discovery and conversion across Google, social platforms, marketplaces and your own website.",
    tags: ["SEO", "Google Ads", "Social Commerce", "Product Photography"],
    icon: ShoppingCart,
    route: "/industries/retail-ecommerce/",
    accent: "from-[#fd761a] to-[#f59e0b]",
  },
  {
    num: "02",
    title: "Healthcare & Clinics",
    description: "Help patients find your clinic, understand your services and take the next step through search, local visibility and trusted digital content.",
    tags: ["Local SEO", "Google Business Profile", "Google Ads", "AI Search"],
    icon: Heart,
    route: "/industries/healthcare-clinics/",
    accent: "from-[#ef4444] to-[#f97316]",
  },
  {
    num: "03",
    title: "Education & Training",
    description: "Reach students and parents when they search for institutions, courses, admissions and training opportunities.",
    tags: ["Education SEO", "Google Ads", "Social Media", "GEO/AEO"],
    icon: GraduationCap,
    route: "/industries/education-training/",
    accent: "from-[#6366f1] to-[#8b5cf6]",
  },
  {
    num: "04",
    title: "Hospitality & Hotels",
    description: "Increase discoverability, direct enquiries, reviews and bookings through search, local SEO, social media and digital conversion systems.",
    tags: ["Local SEO", "Google Maps", "Reviews", "Google Ads"],
    icon: Hotel,
    route: "/industries/hospitality-hotels/",
    accent: "from-[#14b8a6] to-[#06b6d4]",
  },
  {
    num: "05",
    title: "Textiles & Garments",
    description: "Build digital visibility for textile retailers, manufacturers, garment businesses and brands targeting regional, national and international buyers.",
    tags: ["SEO", "Product Photography", "E-Commerce", "B2B Marketing"],
    icon: Shirt,
    route: "/industries/textiles-madurai/",
    accent: "from-[#d946ef] to-[#ec4899]",
  },
  {
    num: "06",
    title: "Port, Marine & Industrial",
    description: "Build professional B2B visibility for manufacturers, shipping, logistics, marine and industrial businesses targeting procurement teams and corporate buyers.",
    tags: ["B2B SEO", "LinkedIn", "Google Ads", "AI Search"],
    icon: Factory,
    route: "/industries/port-marine-industrial-thoothukudi/",
    accent: "from-[#64748b] to-[#475569]",
  },
  {
    num: "07",
    title: "Malaysian SMEs",
    description: "Digital marketing and transformation support for Malaysian SMEs targeting local growth, online visibility and digital adoption.",
    tags: ["SEO", "GEO/AEO", "Google Ads", "AI Automation"],
    icon: Store,
    route: "/industries/smes-malaysia-grant-eligible/",
    accent: "from-[#22c55e] to-[#10b981]",
  },
  {
    num: "08",
    title: "Real Estate & Property Developers",
    description: "Generate property visibility and qualified enquiries through local search, paid campaigns, content, websites and digital lead-generation systems.",
    tags: ["Local SEO", "Google Ads", "Lead Generation", "Property Marketing"],
    icon: Building2,
    route: "/industries/real-estate-builders/",
    accent: "from-[#b45309] to-[#d97706]",
  },
];

const comparisonRows = [
  { industry: "Retail", audience: "Consumers", need: "Product Discovery", channels: "SEO + Social + Ads" },
  { industry: "Healthcare", audience: "Patients", need: "Trust + Local Discovery", channels: "Local SEO + Google Ads" },
  { industry: "Education", audience: "Students + Parents", need: "Admissions", channels: "SEO + Ads + Social" },
  { industry: "Hospitality", audience: "Guests", need: "Bookings + Reviews", channels: "Local SEO + Google Maps" },
  { industry: "Textiles", audience: "Retailers + Buyers", need: "Product Visibility", channels: "SEO + Photography + B2B" },
  { industry: "Industrial", audience: "Procurement Teams", need: "B2B Enquiries", channels: "SEO + LinkedIn + Google Ads" },
  { industry: "Malaysian SMEs", audience: "Business Owners", need: "Digital Growth", channels: "SEO + Ads + Automation" },
  { industry: "Real Estate", audience: "Property Buyers", need: "Qualified Leads", channels: "SEO + Google Ads + Lead Gen" },
];

const whyCards = [
  {
    num: "01",
    title: "Industry Search Intent",
    text: "Understand the exact searches customers use in each sector.",
    icon: Search,
  },
  {
    num: "02",
    title: "Industry-Specific Content",
    text: "Build content around real customer questions, services and buying decisions.",
    icon: Target,
  },
  {
    num: "03",
    title: "Industry-Specific Conversion",
    text: "Use the right CTA, landing page and enquiry mechanism for each market.",
    icon: TrendingUp,
  },
  {
    num: "04",
    title: "Industry-Specific AI Visibility",
    text: "Optimize content so AI search engines can understand your expertise and relevance.",
    icon: Sparkles,
  },
];

const locationData = [
  {
    city: "Madurai",
    focus: ["Textiles", "Healthcare", "Education", "Hospitality"],
  },
  {
    city: "Thoothukudi",
    focus: ["Industrial", "Marine", "Logistics"],
  },
  {
    city: "Malaysia",
    focus: ["SMEs", "Manufacturing", "Retail"],
  },
];

const navChips = industries.map((ind) => ind.title.split(" & ")[0].split(",")[0]);

function Industries() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      {/* ─── HERO ─── */}
      <section
        className="relative isolate overflow-hidden bg-[#321304] px-7 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(42,13,0,0.96) 0%, rgba(72,33,10,0.88) 40%, rgba(90,51,34,0.72) 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-[#fd761a]/8 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-[#f59e0b]/6 blur-[100px]" />
          <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#fd761a]/5 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1390px] gap-10 lg:grid-cols-[1.04fr_0.76fr] lg:items-end">
          <div className="animate-[indFadeUp_700ms_ease-out_both]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
              Industries We Serve
            </p>
            <h1 className="mt-5 max-w-[760px] text-[42px] font-black leading-[0.98] tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
              Digital Marketing Built Around Your Industry
            </h1>
            <p className="mt-6 max-w-[610px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Every industry has different customers, search behaviour, buying cycles, competition, and conversion paths. We build digital marketing strategies around how your market actually works — from local search and AI visibility to paid campaigns, content and conversion-focused websites.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#industry-cards"
                className="inline-flex h-[48px] items-center gap-2 rounded-[9px] bg-white px-7 text-[12px] font-black uppercase text-[#321607] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf]"
              >
                Find Your Industry
                <ArrowRight size={16} strokeWidth={2.6} />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[48px] items-center gap-2 rounded-[9px] border border-white/20 bg-white/[0.08] px-7 text-[12px] font-black uppercase text-white transition duration-300 hover:-translate-y-1 hover:border-[#de792f]/50 hover:bg-white/[0.14]"
              >
                Talk to Our Team
                <MessageCircle size={15} strokeWidth={2.6} />
              </a>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-[18px] border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm">
              <div className="grid grid-cols-4 gap-3">
                {industries.slice(0, 8).map((ind) => {
                  const Icon = ind.icon;
                  return (
                    <div
                      key={ind.num}
                      className="group flex flex-col items-center gap-2 rounded-[12px] border border-white/8 bg-white/[0.04] p-3 text-center transition duration-300 hover:border-[#fd761a]/40 hover:bg-white/[0.08]"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/80 transition duration-300 group-hover:bg-[#fd761a] group-hover:text-white">
                        <Icon size={18} strokeWidth={2.2} />
                      </span>
                      <span className="text-[9px] font-bold leading-tight text-white/60 group-hover:text-white/90">
                        {ind.title.split(" & ")[0].split(", ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 text-center text-[11px] font-semibold text-white/40">
                8 Industry Sectors — 1 Strategic Partner
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INDUSTRY NAV STRIP ─── */}
      <nav
        className="sticky top-0 z-30 border-b border-[#eadfd7] bg-[#fffaf5]/90 backdrop-blur-md"
        aria-label="Industry quick navigation"
      >
        <div className="mx-auto flex max-w-[1390px] gap-2 overflow-x-auto px-7 py-3 sm:px-10 lg:px-[54px] scrollbar-none">
          {navChips.map((chip, i) => (
            <a
              key={chip}
              href="#industry-cards"
              className="shrink-0 rounded-full border border-[#eadfd7] bg-white/80 px-4 py-2 text-[11px] font-bold text-[#6f625a] transition duration-300 hover:-translate-y-0.5 hover:border-[#fd761a]/40 hover:bg-[#fff3e8] hover:text-[#b44a0f]"
            >
              {chip}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[1390px] px-7 sm:px-10 lg:px-[54px]">
        {/* ─── INTRO ─── */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-[800px]">
            <SectionLabel icon={Globe2}>Why Industry Focus Matters</SectionLabel>
            <h2 className="ind-heading mt-5 text-[31px] font-black leading-tight tracking-[-0.035em] text-[#21140e] sm:text-[45px]">
              One Strategy Doesn&apos;t Fit Every Industry
            </h2>
            <p className="mt-5 text-[15px] font-medium leading-7 text-[#70635c] sm:text-[17px]">
              A healthcare clinic does not acquire customers like an e-commerce store.
              A college does not market like a textile manufacturer.
              A hotel does not sell like a B2B industrial company.
              A real estate developer does not have the same buyer journey as a local retailer.
            </p>
            <p className="mt-4 text-[15px] font-medium leading-7 text-[#70635c] sm:text-[17px]">
              That is why we combine{" "}
              <strong className="text-[#5a3322]">SEO</strong>,{" "}
              <strong className="text-[#5a3322]">Local SEO</strong>,{" "}
              <strong className="text-[#5a3322]">GEO/AEO</strong>,{" "}
              <strong className="text-[#5a3322]">Google Ads</strong>,{" "}
              <strong className="text-[#5a3322]">Social Media</strong>, and{" "}
              <strong className="text-[#5a3322]">Website Development</strong>{" "}
              with industry-specific positioning — so every channel works harder for your market.
            </p>
          </div>
        </section>

        {/* ─── INDUSTRY CARDS ─── */}
        <section id="industry-cards" className="scroll-mt-16">
          <SectionLabel icon={Store}>Industries We Serve</SectionLabel>
          <h2 className="ind-heading mt-5 text-[31px] font-black leading-tight tracking-[-0.035em] text-[#21140e] sm:text-[45px]">
            Choose Your Industry
          </h2>
          <p className="mt-3 max-w-[600px] text-[15px] font-medium text-[#70635c]">
            Explore sector-specific strategies built for how your customers actually search, compare and buy.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((ind, idx) => {
              const Icon = ind.icon;
              return (
                <Link
                  key={ind.num}
                  to={ind.route}
                  className="ind-card group relative flex flex-col rounded-[18px] border border-[#eee2d8] bg-white/88 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)] sm:p-7"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span className="absolute right-5 top-5 text-[11px] font-black text-[#d6ccc4] transition duration-300 group-hover:text-[#fd761a]">
                    {ind.num}
                  </span>
                  <span className={`grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br ${ind.accent} text-white shadow-[0_12px_24px_rgba(90,51,34,0.18)] transition duration-300 group-hover:scale-110`}>
                    <Icon size={24} strokeWidth={2.3} />
                  </span>
                  <h3 className="mt-5 text-[18px] font-black leading-snug tracking-[-0.02em] text-[#21140e]">
                    {ind.title}
                  </h3>
                  <p className="mt-3 flex-1 text-[13px] font-medium leading-6 text-[#70635c]">
                    {ind.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {ind.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#f7e6cf]/70 px-2.5 py-1 text-[9px] font-bold text-[#9a5728]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-black text-[#b44a0f] transition duration-300 group-hover:gap-2.5">
                    Explore {ind.title.split(" & ")[0]} <ArrowRight size={14} strokeWidth={2.6} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── COMPARISON MATRIX ─── */}
        <section className="py-14 sm:py-20">
          <SectionLabel icon={LineChart}>Industry Comparison</SectionLabel>
          <h2 className="ind-heading mt-5 text-[31px] font-black leading-tight tracking-[-0.035em] text-[#21140e] sm:text-[45px]">
            Different Industries. Different Digital Journeys.
          </h2>

          {/* Desktop table */}
          <div className="mt-10 hidden overflow-hidden rounded-[16px] border border-[#eee2d8] bg-white shadow-[0_12px_34px_rgba(70,39,14,0.055)] md:block">
            <table className="w-full text-left">
              <thead className="bg-[#faf5ef]">
                <tr>
                  {["Industry", "Primary Audience", "Key Digital Need", "Core Channels"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.14em] text-[#9a5728]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e8e0]">
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.industry}
                    className="transition duration-200 hover:bg-[#fff8f0]"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <td className="px-6 py-4 text-[13px] font-bold text-[#21140e]">
                      {row.industry}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-[#70635c]">
                      {row.audience}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-[#70635c]">
                      {row.need}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-[#f7e6cf]/70 px-3 py-1 text-[10px] font-bold text-[#9a5728]">
                        {row.channels}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-8 grid gap-3 md:hidden">
            {comparisonRows.map((row) => (
              <div
                key={row.industry}
                className="rounded-[14px] border border-[#eee2d8] bg-white p-4"
              >
                <p className="text-[14px] font-bold text-[#21140e]">{row.industry}</p>
                <div className="mt-2 space-y-1.5 text-[12px] text-[#70635c]">
                  <p><span className="font-semibold text-[#9a5728]">Audience:</span> {row.audience}</p>
                  <p><span className="font-semibold text-[#9a5728]">Need:</span> {row.need}</p>
                  <p><span className="font-semibold text-[#9a5728]">Channels:</span> {row.channels}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── WHY INDUSTRY-SPECIFIC ─── */}
        <section className="pb-14 sm:pb-20">
          <SectionLabel icon={ShieldCheck}>Why It Works</SectionLabel>
          <h2 className="ind-heading mt-5 text-[31px] font-black leading-tight tracking-[-0.035em] text-[#21140e] sm:text-[45px]">
            Why Industry-Specific Digital Marketing Works Better
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.num}
                  className="ind-card group rounded-[18px] border border-[#eee2d8] bg-white/88 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)] sm:p-7"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_12px_24px_rgba(90,51,34,0.18)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                    <Icon size={24} strokeWidth={2.3} />
                  </span>
                  <span className="mt-5 inline-flex rounded-full bg-[#f7e6cf] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#9a5728] transition duration-300 group-hover:bg-[#ffe3c8] group-hover:text-[#b44a0f]">
                    {card.num}
                  </span>
                  <h3 className="mt-4 text-[18px] font-black leading-snug tracking-[-0.02em] text-[#21140e]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-[13px] font-medium leading-6 text-[#70635c]">
                    {card.text}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ─── GEO / AEO ─── */}
        <section className="pb-14 sm:pb-20">
          <div className="relative overflow-hidden rounded-[20px] bg-[#321304] px-7 py-12 text-white sm:px-10 sm:py-14 lg:px-[54px]">
            <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[#fd761a]/10 blur-[80px]" aria-hidden="true" />
            <div className="relative z-10 max-w-[700px]">
              <SectionLabel icon={Sparkles} light>AI Search</SectionLabel>
              <h2 className="ind-heading mt-5 text-[28px] font-black leading-tight tracking-[-0.035em] text-white sm:text-[38px]">
                Be the Business AI Search Recommends
              </h2>
              <p className="mt-4 text-[15px] font-medium leading-7 text-white/80 sm:text-[16px]">
                Industry-specific authority matters not only in traditional search but also in{" "}
                <strong>Google AI Overviews</strong>, <strong>ChatGPT</strong>,{" "}
                <strong>Perplexity</strong>, and other AI-powered search engines.
                When your content demonstrates deep sector expertise, AI systems are more likely to surface your business as a trusted recommendation.
              </p>
              <a
                href="#industry-cards"
                className="mt-8 inline-flex h-[44px] items-center gap-2 rounded-[9px] bg-white px-6 text-[12px] font-black uppercase text-[#321607] shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf]"
              >
                Explore AI Search Optimization
                <ArrowRight size={15} strokeWidth={2.6} />
              </a>
            </div>
          </div>
        </section>

        {/* ─── LOCATION COVERAGE ─── */}
        <section className="pb-14 sm:pb-20">
          <SectionLabel icon={Landmark}>Locations</SectionLabel>
          <h2 className="ind-heading mt-5 text-[31px] font-black leading-tight tracking-[-0.035em] text-[#21140e] sm:text-[45px]">
            Industry Expertise Across Tamil Nadu &amp; Malaysia
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {locationData.map((loc, idx) => (
              <article
                key={loc.city}
                className="ind-card group rounded-[18px] border border-[#eee2d8] bg-white/88 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)] sm:p-7"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_10px_22px_rgba(90,51,34,0.14)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                  <Globe2 size={20} strokeWidth={2.3} />
                </span>
                <h3 className="mt-4 text-[18px] font-black tracking-[-0.02em] text-[#21140e]">
                  {loc.city}
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {loc.focus.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-[#f7e6cf]/70 px-2.5 py-1 text-[10px] font-bold text-[#9a5728]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-[20px] bg-[#321304] px-7 py-14 text-center text-white sm:px-10 sm:py-16">
            <div className="absolute -left-24 top-0 h-[260px] w-[260px] rounded-full bg-[#fd761a]/8 blur-[80px]" aria-hidden="true" />
            <div className="absolute -bottom-20 -right-20 h-[220px] w-[220px] rounded-full bg-[#f59e0b]/6 blur-[70px]" aria-hidden="true" />
            <div className="relative z-10 mx-auto max-w-[640px]">
              <h2 className="ind-heading text-[28px] font-black leading-tight tracking-[-0.035em] sm:text-[38px]">
                Not Sure Which Digital Strategy Fits Your Industry?
              </h2>
              <p className="mt-4 text-[15px] font-medium leading-7 text-white/80 sm:text-[16px]">
                Tell us what you sell, who you serve and where you operate. We will help identify the digital channels and industry-specific opportunities worth prioritizing.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[48px] items-center gap-2 rounded-[9px] bg-white px-7 text-[12px] font-black uppercase text-[#321607] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf]"
                >
                  <MessageCircle size={15} strokeWidth={2.6} />
                  WhatsApp for a Free Consultation
                </a>
                <Link
                  to="/categories"
                  className="inline-flex h-[48px] items-center gap-2 rounded-[9px] border border-white/20 bg-white/[0.08] px-7 text-[12px] font-black uppercase text-white transition duration-300 hover:-translate-y-1 hover:border-[#de792f]/50 hover:bg-white/[0.14]"
                >
                  Explore Our Services
                  <ArrowRight size={15} strokeWidth={2.6} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes indFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ind-heading {
          animation: indFadeUp 700ms ease-out both;
        }

        .ind-card {
          animation: indFadeUp 600ms ease-out both;
        }

        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .ind-heading,
          .ind-card {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function SectionLabel({ children, icon: Icon, light = false }) {
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] shadow-sm transition duration-300 hover:-translate-y-0.5 ${
        light
          ? "border-white/12 bg-white/[0.08] text-[#f7e6cf]/90 hover:border-[#de792f]/50 hover:text-white"
          : "border-[#efdcca] bg-white/70 text-[#9a5728] hover:border-[#f0b37d] hover:bg-[#fff3e8] hover:text-[#b44a0f]"
      }`}
    >
      <Icon size={15} strokeWidth={2.8} />
      {children}
    </p>
  );
}

export default Industries;
