import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  LineChart,
  MonitorCog,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const consultationAreas = [
  {
    title: "Business Strategy & Growth",
    description:
      "Develop actionable strategies to improve profitability, scalability, and market positioning.",
    icon: LineChart,
  },
  {
    title: "Digital Transformation",
    description:
      "Leverage technology, automation, AI, and digital tools to improve operational efficiency and customer experience.",
    icon: MonitorCog,
  },
  {
    title: "Marketing & Brand Development",
    description:
      "Build a stronger brand presence, generate leads, and create sustainable marketing systems.",
    icon: Target,
  },
  {
    title: "Financial & Investment Advisory",
    description:
      "Gain insights into business planning, funding opportunities, investment readiness, and financial management.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Technology & IT Consulting",
    description:
      "Get expert guidance on software solutions, IT infrastructure, cybersecurity, ERP, CRM, and cloud technologies.",
    icon: ShieldCheck,
  },
  {
    title: "Startup Mentoring",
    description:
      "Validate business ideas, refine business models, and create growth roadmaps for startups and entrepreneurs.",
    icon: Rocket,
  },
  {
    title: "Legal & Compliance Support",
    description:
      "Connect with professionals who can assist with registrations, licensing, contracts, and regulatory requirements.",
    icon: Scale,
  },
];

const chooseReasons = [
  "Access to experienced professionals",
  "Industry-specific expertise",
  "Practical business solutions",
  "Growth-focused recommendations",
  "Personalized consultation approach",
  "Trusted business network",
];

const steps = [
  ["Step 1:", "Submit your consultation request"],
  ["Step 2:", "Share your business requirements"],
  ["Step 3:", "Get matched with relevant experts"],
  ["Step 4:", "Schedule your consultation session"],
  ["Step 5:", "Implement recommendations and grow"],
];

function Consultation() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section
        className="relative isolate overflow-hidden bg-[#321304] px-7 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(42,13,0,0.96) 0%, rgba(64,31,13,0.86) 48%, rgba(72,34,9,0.28) 100%), url('https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1700&q=95')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto grid max-w-[1390px] gap-10 lg:grid-cols-[1fr_0.74fr] lg:items-end">
          <div className="animate-[consultationFadeUp_720ms_ease-out_both]">
            <h1 className="max-w-[780px] text-[40px] font-black leading-[1] tracking-[-0.045em] sm:text-[62px] lg:text-[76px]">
              Transform Ideas into Business Growth
            </h1>
            <p className="mt-6 max-w-[700px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Whether you are a startup, entrepreneur, SME, professional service provider, manufacturer, or established
              enterprise, expert guidance can help you make better decisions, avoid costly mistakes, and accelerate growth.
            </p>
            <p className="mt-5 max-w-[700px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              At Machinichi, we connect businesses with consultants, industry experts, service providers, and strategic
              partners who can help solve challenges and unlock new opportunities.
            </p>
            <a
              className="mt-9 inline-flex min-h-[48px] max-w-full items-center gap-2 rounded-[9px] bg-white px-7 py-3 text-[12px] font-black text-[#321607] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf] sm:text-[13px]"
              href="#consultation-next-step"
            >
              Book a Consultation Today and Accelerate Your Business Growth.
              <ArrowRight size={16} strokeWidth={2.6} />
            </a>
          </div>

          <aside className="rounded-[16px] border border-white/14 bg-white/[0.09] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:scale-[1.015] hover:border-[#ffc08c]/60 hover:bg-white/[0.14] hover:shadow-[0_24px_60px_rgba(253,118,26,0.22),inset_0_1px_0_rgba(255,255,255,0.14)]">
            <div className="rounded-[13px] bg-white/12 p-5">
              <Sparkles className="text-[#ffc08c]" size={28} strokeWidth={2.4} />
              <p className="mt-5 text-[13px] font-black uppercase tracking-[0.18em] text-[#f7e6cf]/82">
                Our Consultation Areas
              </p>
              <div className="mt-5 grid gap-3">
                {consultationAreas.slice(0, 4).map(({ title, icon: Icon }) => (
                  <div
                    className="flex items-center gap-3 rounded-[10px] bg-white/10 px-4 py-3 text-[13px] font-black text-white transition duration-300 hover:translate-x-1 hover:bg-white/16"
                    key={title}
                  >
                    <Icon className="text-[#ffc08c]" size={17} strokeWidth={2.4} />
                    {title}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-[1390px] px-7 py-12 sm:px-10 sm:py-16 lg:px-[54px]">
        <section className="consultation-section">
          <SectionHeading title="Our Consultation Areas" />
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {consultationAreas.map(({ title, description, icon: Icon }) => (
              <article
                className="group rounded-[18px] border border-[#eee2d8] bg-white/90 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)]"
                key={title}
              >
                <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_12px_24px_rgba(90,51,34,0.18)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                  <Icon size={24} strokeWidth={2.35} />
                </span>
                <h2 className="mt-6 text-[20px] font-black tracking-[-0.025em] text-[#21140e]">
                  {title}
                </h2>
                <p className="mt-4 text-[14px] font-medium leading-7 text-[#70635c]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="consultation-section mt-14 grid gap-8 lg:grid-cols-[0.86fr_1fr] lg:items-start">
          <div className="rounded-[18px] bg-[#391504] p-6 text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(46,21,8,0.24)] sm:p-8">
            <BadgeCheck className="text-[#ffc08c]" size={28} strokeWidth={2.4} />
            <h2 className="mt-5 text-[30px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[42px]">
              Why Choose Machinichi Consultation Services?
            </h2>
            <ul className="mt-7 grid gap-3">
              {chooseReasons.map((reason) => (
                <li
                  className="flex items-start gap-3 rounded-[12px] border border-white/10 bg-white/[0.08] px-4 py-3 text-[14px] font-bold leading-6 text-white/84 transition duration-300 hover:translate-x-1 hover:border-[#de792f]/58 hover:bg-white/[0.12]"
                  key={reason}
                >
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#ffc08c]" size={18} strokeWidth={2.5} />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[18px] border border-[#eee2d8] bg-white p-6 shadow-[0_14px_38px_rgba(70,39,14,0.075)] transition duration-500 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_24px_58px_rgba(191,76,12,0.13)] sm:p-8">
            <ClipboardList className="text-[#9d7b62]" size={28} strokeWidth={2.4} />
            <h2 className="mt-5 text-[30px] font-black tracking-[-0.035em] text-[#21140e] sm:text-[42px]">
              How It Works
            </h2>
            <div className="mt-7 grid gap-4">
              {steps.map(([step, text]) => (
                <div
                  className="group flex gap-4 rounded-[14px] border border-[#eee2d8] bg-[#fffaf5] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:bg-[#fff3e8] hover:shadow-[0_14px_30px_rgba(70,39,14,0.08)]"
                  key={step}
                >
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#5a3322] text-[13px] font-black text-[#f7e6cf] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                    {step.replace("Step ", "").replace(":", "")}
                  </span>
                  <p className="self-center text-[14px] font-medium leading-6 text-[#5f514a]">
                    <strong className="font-black text-[#21140e]">{step}</strong> {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="consultation-section group relative mt-14 overflow-hidden rounded-[18px] bg-[#f7e6cf] px-7 py-9 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-500 hover:-translate-y-1 hover:bg-[#ffe5c2] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)] sm:px-10 sm:py-12"
          id="consultation-next-step"
        >
          <span className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#fd761a]/0 blur-3xl transition duration-500 group-hover:bg-[#fd761a]/18" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[760px]">
              <h2 className="text-[31px] font-black leading-[1.08] tracking-[-0.035em] text-[#21140e] sm:text-[46px]">
                Ready to Take the Next Step?
              </h2>
              <p className="mt-5 text-[15px] font-medium leading-7 text-[#6b5546]">
                Get expert guidance tailored to your business needs.
              </p>
              
            </div>
            <a
              className="inline-flex min-h-[48px] max-w-full items-center justify-center gap-2 rounded-[9px] bg-[#5a3322] px-7 py-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(69,34,15,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#fd761a] hover:shadow-[0_16px_32px_rgba(253,118,26,0.24)] sm:text-[13px]"
              href="mailto:digital@machinichi.com?subject=Consultation%20Request"
            >

              Book a Consultation Today and Accelerate Your Business Growth.
              <ArrowRight size={16} strokeWidth={2.6} />
            </a>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes consultationFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .consultation-section {
          animation: consultationFadeUp 720ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .consultation-section,
          [class*="animate-[consultationFadeUp"] {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function SectionHeading({ title }) {
  return (
    <div className="max-w-[760px]">
      <Sparkles className="text-[#9a5728]" size={28} strokeWidth={2.4} />
      <h2 className="mt-4 text-[34px] font-black leading-[1.05] tracking-[-0.035em] text-[#21140e] sm:text-[48px]">
        {title}
      </h2>
    </div>
  );
}

export default Consultation;
