import {
  Check,
  Cookie,
  CreditCard,
  Database,
  FileText,
  LockKeyhole,
  Mail,
  RefreshCw,
  Scale,
  Share2,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    title: "Information We Collect",
    icon: Database,
    intro: "We may collect the following information:",
    items: [
      "Full Name",
      "Email Address",
      "Phone Number",
      "Billing Address",
      "Shipping Address",
      "Company Name (if applicable)",
      "IP Address",
      "Browser Information",
      "Device Information",
      "Purchase History",
      "Communication Records",
    ],
  },
  {
    title: "How We Use Your Information",
    icon: FileText,
    intro: "Your information may be used to:",
    items: [
      "Process and fulfill orders",
      "Deliver products and services",
      "Provide customer support",
      "Improve our website and services",
      "Send order updates and notifications",
      "Respond to inquiries",
      "Send promotional communications (where permitted)",
    ],
  },
  {
    title: "Payment Security",
    icon: CreditCard,
    paragraphs: [
      "Payments made on Machinichi.com are processed through secure third-party payment gateways. We do not store complete debit card, credit card, banking credentials, or UPI PIN information.",
    ],
    featured: true,
  },
  {
    title: "Information Sharing",
    icon: Share2,
    paragraphs: [
      "We do not sell, rent, or trade your personal information.",
      "We may share information with:",
    ],
    items: [
      "Shipping partners",
      "Payment processors",
      "Technology service providers",
      "Government authorities when legally required",
    ],
  },
  {
    title: "Cookies",
    icon: Cookie,
    intro: "Our website uses cookies to:",
    items: [
      "Improve user experience",
      "Analyze website traffic",
      "Remember user preferences",
      "Support marketing activities",
    ],
    outro: "Users can disable cookies through browser settings.",
  },
  {
    title: "Data Protection",
    icon: LockKeyhole,
    paragraphs: [
      "We implement appropriate technical and organizational measures to safeguard personal information.",
    ],
    featured: true,
  },
  {
    title: "User Rights",
    icon: Scale,
    intro: "You may request:",
    items: [
      "Access to your personal information",
      "Correction of inaccurate information",
      "Deletion of information where legally permissible",
    ],
    outro: "For privacy-related requests, contact:",
    email: "digital@machinichi.com",
  },
  {
    title: "Changes to This Policy",
    icon: RefreshCw,
    paragraphs: [
      "We reserve the right to modify this Privacy Policy at any time. Updated versions will be posted on this page.",
    ],
  },
];

function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section className="relative isolate overflow-hidden bg-[#321304] px-6 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_82%_24%,#fd761a_0,transparent_28%),radial-gradient(circle_at_10%_100%,#f7e6cf_0,transparent_32%)]" />
        <div className="relative mx-auto max-w-[1390px]">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
            <ShieldCheck size={16} strokeWidth={2.7} />
            Your Privacy Matters
          </p>
          <h1 className="mt-5 text-[42px] font-black leading-none tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
            Privacy Policy
          </h1>
          <p className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-bold text-[#f7e6cf] backdrop-blur-sm">
            <strong className="mr-1.5 text-white">Last Updated:</strong> June 6, 2026
          </p>
          <p className="mt-7 max-w-[780px] text-[15px] font-medium leading-7 text-white/84 sm:text-[17px]">
            Welcome to Machinichi.com (&quot;Website&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We are committed
            to protecting your privacy and ensuring that your personal information is handled securely and responsibly.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1190px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-6">
          {sections.map((section) => (
            <PolicySection {...section} key={section.title} />
          ))}
        </div>
      </div>
    </main>
  );
}

function PolicySection({
  title,
  icon: Icon,
  intro,
  paragraphs = [],
  items,
  outro,
  email,
  featured = false,
}) {
  return (
    <section
      className={`group rounded-[18px] border p-6 shadow-[0_12px_34px_rgba(70,39,14,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_20px_48px_rgba(90,51,34,0.12)] sm:p-8 ${
        featured
          ? "border-[#ead1ba] bg-[#f7e6cf]/65"
          : "border-[#eee2d8] bg-white/90"
      }`}
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

        {email ? (
          <a
            className="mt-3 inline-flex items-center gap-2 rounded-[9px] bg-[#5a3322] px-4 py-3 font-black text-white transition hover:bg-[#fd761a]"
            href={`mailto:${email}`}
          >
            <Mail size={17} strokeWidth={2.4} />
            <span>Email: {email}</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

export default PrivacyPolicy;
