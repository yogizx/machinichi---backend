import {
  AlertTriangle,
  Check,
  Clock3,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Route,
  Send,
  Truck,
} from "lucide-react";

const sections = [
  {
    title: "Order Processing",
    icon: PackageCheck,
    paragraphs: [
      "Orders are usually processed within 1–3 business days after payment confirmation.",
    ],
    featured: true,
  },
  {
    title: "Delivery Timeline",
    icon: Clock3,
    timelines: [
      ["Tamil Nadu", "2–5 Business Days"],
      ["South India", "3–7 Business Days"],
      ["Rest of India", "5–10 Business Days"],
      [
        "International Orders",
        "Delivery times depend on destination country and customs procedures.",
      ],
    ],
  },
  {
    title: "Shipping Partners",
    icon: Truck,
    paragraphs: [
      "We may use reputable logistics and courier partners for delivery.",
    ],
  },
  {
    title: "Tracking Information",
    icon: Route,
    intro: "Tracking details may be shared through:",
    items: ["Email", "SMS", "WhatsApp"],
  },
  {
    title: "Delays",
    icon: AlertTriangle,
    intro: "Delivery timelines are estimates and may be affected by:",
    items: [
      "Weather conditions",
      "Public holidays",
      "Transportation disruptions",
      "Customs clearance",
      "Force majeure events",
    ],
  },
  {
    title: "Incorrect Address",
    icon: MapPin,
    paragraphs: [
      "Customers are responsible for providing accurate delivery information.",
      "Additional charges may apply for re-delivery.",
    ],
    featured: true,
  },
];

function ShippingPolicy() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section className="relative isolate overflow-hidden bg-[#321304] px-6 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_82%_24%,#fd761a_0,transparent_28%),radial-gradient(circle_at_10%_100%,#f7e6cf_0,transparent_32%)]" />
        <div className="relative mx-auto max-w-[1390px] animate-[shippingFadeUp_700ms_ease-out_both]">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
            <Send size={16} strokeWidth={2.7} />
            Shipping &amp; Delivery Policy
          </p>
          <h1 className="mt-5 max-w-[1000px] text-[40px] font-black leading-[1.02] tracking-[-0.045em] sm:text-[62px] lg:text-[74px]">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-bold text-[#f7e6cf] backdrop-blur-sm">
            <strong className="mr-1.5 text-white">Last Updated:</strong> June 6, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1190px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-6">
          {sections.map((section, index) => (
            <ShippingSection {...section} delay={index * 55} key={section.title} />
          ))}
          <ContactSection delay={sections.length * 55} />
        </div>
      </div>

      <style>{`
        @keyframes shippingFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function ShippingSection({
  title,
  icon: Icon,
  intro,
  paragraphs = [],
  items,
  timelines,
  featured = false,
  delay,
}) {
  return (
    <section
      className={`group rounded-[18px] border p-6 shadow-[0_12px_34px_rgba(70,39,14,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_20px_48px_rgba(90,51,34,0.12)] sm:p-8 ${
        featured
          ? "border-[#ead1ba] bg-[#f7e6cf]/65"
          : "border-[#eee2d8] bg-white/90"
      }`}
      style={{ animation: `shippingFadeUp 650ms ease-out ${delay}ms both` }}
    >
      <div className="flex items-center gap-4 border-b border-[#eaded5] pb-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_10px_22px_rgba(90,51,34,0.2)] transition duration-300 group-hover:bg-[#fd761a] group-hover:text-white">
          <Icon size={22} strokeWidth={2.35} />
        </span>
        <h2 className="text-[24px] font-black leading-tight tracking-[-0.03em] text-[#21140e] sm:text-[30px]">
          {title}
        </h2>
      </div>

      <div className="mt-5 text-[14px] font-medium leading-7 text-[#655850] sm:text-[15px]">
        {intro ? <p>{intro}</p> : null}

        {paragraphs.map((paragraph) => (
          <p className="mt-3 first:mt-0" key={paragraph}>
            {paragraph}
          </p>
        ))}

        {items ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li className="flex items-start gap-3 rounded-[10px] bg-[#fffaf5] px-4 py-3" key={item}>
                <Check className="mt-1 shrink-0 text-[#c45b18]" size={16} strokeWidth={2.8} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {timelines ? (
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            {timelines.map(([region, timing]) => (
              <article className="rounded-[12px] border border-[#eee2d8] bg-[#fffaf5] p-5 transition duration-300 hover:border-[#efb27b] hover:bg-white" key={region}>
                <h3 className="text-[16px] font-black text-[#352219]">{region}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#655850]">{timing}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContactSection({ delay }) {
  return (
    <section
      className="group rounded-[18px] border border-[#eee2d8] bg-white/90 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_20px_48px_rgba(90,51,34,0.12)] sm:p-8"
      style={{ animation: `shippingFadeUp 650ms ease-out ${delay}ms both` }}
    >
      <div className="flex items-center gap-4 border-b border-[#eaded5] pb-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_10px_22px_rgba(90,51,34,0.2)] transition duration-300 group-hover:bg-[#fd761a] group-hover:text-white">
          <Truck size={22} strokeWidth={2.35} />
        </span>
        <h2 className="text-[24px] font-black leading-tight tracking-[-0.03em] text-[#21140e] sm:text-[30px]">
          Contact
        </h2>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          className="inline-flex items-center gap-2 rounded-[9px] bg-[#5a3322] px-4 py-3 text-[14px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#fd761a]"
          href="mailto:digital@machinichi.com"
        >
          <Mail size={17} strokeWidth={2.4} />
          Email: digital@machinichi.com
        </a>
        <a
          className="inline-flex items-center gap-2 rounded-[9px] bg-[#f7e6cf] px-4 py-3 text-[14px] font-black text-[#5a3322] transition hover:-translate-y-0.5 hover:bg-[#ffe0bd]"
          href="tel:+919952252213"
        >
          <Phone size={17} strokeWidth={2.4} />
          Phone: +91-9952252213
        </a>
      </div>
    </section>
  );
}

export default ShippingPolicy;
