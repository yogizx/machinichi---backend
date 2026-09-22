import {
  BadgeCheck,
  Ban,
  Check,
  FileCheck,
  Gavel,
  Info,
  Mail,
  PackageCheck,
  Phone,
  Scale,
  ShieldAlert,
  ShoppingCart,
  Store,
  UserCheck,
} from "lucide-react";

const sections = [
  {
    title: "Acceptance of Terms",
    icon: FileCheck,
    paragraphs: [
      "By accessing or using Machinichi.com, you agree to be bound by these Terms and Conditions.",
    ],
    featured: true,
  },
  {
    title: "Nature of Platform",
    icon: Store,
    intro: "Machinichi.com operates as:",
    items: [
      "An E-Commerce Platform",
      "A Product Showcase Platform",
      "A Business Enquiry Platform",
      "A Service Promotion Platform",
    ],
    outro:
      "Some products may be available for direct purchase, while others may be displayed for quotation requests, distributorship opportunities, dealership inquiries, or business collaborations.",
  },
  {
    title: "User Eligibility",
    icon: UserCheck,
    paragraphs: [
      "Users must be at least 18 years old or use the website under parental supervision.",
    ],
  },
  {
    title: "Product Information",
    icon: Info,
    paragraphs: [
      "We strive to ensure product descriptions, specifications, images, and pricing are accurate.",
      "However:",
    ],
    items: [
      "Images may vary slightly from actual products.",
      "Specifications may change without notice.",
      "Availability may vary.",
      "Pricing errors may occasionally occur.",
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    intro: "Machinichi.com reserves the right to:",
    items: [
      "Accept or reject orders",
      "Cancel suspicious transactions",
      "Limit order quantities",
      "Correct pricing errors",
    ],
  },
  {
    title: "Intellectual Property",
    icon: BadgeCheck,
    intro: "All website content including:",
    items: ["Logos", "Images", "Text", "Graphics", "Videos", "Layouts", "Designs"],
    outro:
      "are the property of Machinichi.com and protected by applicable laws.",
  },
  {
    title: "Prohibited Activities",
    icon: Ban,
    intro: "Users shall not:",
    items: [
      "Attempt unauthorized access",
      "Upload malicious software",
      "Violate laws",
      "Interfere with website functionality",
    ],
  },
  {
    title: "Limitation of Liability",
    icon: ShieldAlert,
    intro: "Machinichi.com shall not be liable for:",
    items: [
      "Indirect damages",
      "Business losses",
      "Delivery delays",
      "Technical interruptions",
      "Third-party service failures",
    ],
  },
  {
    title: "Governing Law",
    icon: Gavel,
    paragraphs: [
      "These Terms shall be governed by the laws of India.",
      "Any disputes shall be subject to the jurisdiction of courts in Tamil Nadu, India.",
    ],
    featured: true,
  },
];

function TermsConditions() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section className="relative isolate overflow-hidden bg-[#321304] px-6 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_82%_24%,#fd761a_0,transparent_28%),radial-gradient(circle_at_10%_100%,#f7e6cf_0,transparent_32%)]" />
        <div className="relative mx-auto max-w-[1390px] animate-[termsFadeUp_700ms_ease-out_both]">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
            <Scale size={16} strokeWidth={2.7} />
            Clear Terms, Trusted Service
          </p>
          <h1 className="mt-5 max-w-[920px] text-[42px] font-black leading-none tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
            Terms &amp; Conditions
          </h1>
          <p className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-bold text-[#f7e6cf] backdrop-blur-sm">
            <strong className="mr-1.5 text-white">Last Updated:</strong> June 6, 2026
          </p>

        </div>
      </section>

      <div className="mx-auto max-w-[1190px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-6">
          {sections.map((section, index) => (
            <TermsSection {...section} delay={index * 45} key={section.title} />
          ))}
          <ContactSection delay={sections.length * 45} />
        </div>
      </div>

      <style>{`
        @keyframes termsFadeUp {
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

function TermsSection({
  title,
  icon: Icon,
  intro,
  paragraphs = [],
  items,
  outro,
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
      style={{ animation: `termsFadeUp 650ms ease-out ${delay}ms both` }}
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

        {outro ? <p className="mt-5">{outro}</p> : null}
      </div>
    </section>
  );
}

function ContactSection({ delay }) {
  return (
    <section
      className="group rounded-[18px] border border-[#eee2d8] bg-white/90 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_20px_48px_rgba(90,51,34,0.12)] sm:p-8"
      style={{ animation: `termsFadeUp 650ms ease-out ${delay}ms both` }}
    >
      <div className="flex items-center gap-4 border-b border-[#eaded5] pb-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_10px_22px_rgba(90,51,34,0.2)] transition duration-300 group-hover:bg-[#fd761a] group-hover:text-white">
          <PackageCheck size={22} strokeWidth={2.35} />
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

export default TermsConditions;
