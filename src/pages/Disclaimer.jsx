import {
  Check,
  CircleAlert,
  FileWarning,
  Info,
  Scale,
  ShieldAlert,
} from "lucide-react";

const sections = [
  {
    title: "General Information",
    icon: Info,
    paragraphs: [
      "The information provided on Machinichi.com is for general informational and commercial purposes only.",
    ],
    featured: true,
  },
  {
    title: "Accuracy and Warranties",
    icon: FileWarning,
    intro: "While we strive for accuracy, we make no warranties regarding:",
    items: ["Completeness", "Accuracy", "Reliability", "Availability"],
    outro: "Users rely on information at their own risk.",
  },
  {
    title: "Product Display",
    icon: Scale,
    paragraphs: [
      "Some products displayed on Machinichi.com may be intended for direct sale, while others may be displayed for inquiries, dealership opportunities, distributorship, quotations, or business collaborations.",
    ],
  },
  {
    title: "Third-Party Responsibility",
    icon: ShieldAlert,
    paragraphs: [
      "Machinichi.com shall not be responsible for losses arising from the use of this website or third-party links.",
    ],
    featured: true,
  },
];

function Disclaimer() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section className="relative isolate overflow-hidden bg-[#321304] px-6 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_82%_24%,#fd761a_0,transparent_28%),radial-gradient(circle_at_10%_100%,#f7e6cf_0,transparent_32%)]" />
        <div className="relative mx-auto max-w-[1390px] animate-[disclaimerFadeUp_700ms_ease-out_both]">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
            <CircleAlert size={16} strokeWidth={2.7} />
            Disclaimer
          </p>
          <h1 className="mt-5 max-w-[1000px] text-[42px] font-black leading-none tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
            Disclaimer
          </h1>
          <p className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-bold text-[#f7e6cf] backdrop-blur-sm">
            <strong className="mr-1.5 text-white">Last Updated:</strong> June 6, 2026
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1190px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-6">
          {sections.map((section, index) => (
            <DisclaimerSection {...section} delay={index * 65} key={section.title} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes disclaimerFadeUp {
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

function DisclaimerSection({
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
      style={{ animation: `disclaimerFadeUp 650ms ease-out ${delay}ms both` }}
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

export default Disclaimer;
