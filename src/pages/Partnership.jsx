import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  GraduationCap,
  Handshake,
  Lightbulb,
  Megaphone,
  Network,
  Rocket,
  TrendingUp,
  Users,
} from "lucide-react";

const partnershipOpportunities = [
  {
    title: "Business Referral Partners",
    description:
      "Expand your network and generate mutual business opportunities through trusted referrals.",
    icon: Network,
  },
  {
    title: "Technology Partners",
    description:
      "Collaborate on digital solutions, software services, IT consulting, and innovation initiatives.",
    icon: Lightbulb,
  },
  {
    title: "Marketing Partners",
    description:
      "Work together on branding, digital marketing, lead generation, events, and promotional campaigns.",
    icon: Megaphone,
  },
  {
    title: "Industry Experts & Consultants",
    description:
      "Offer your expertise to businesses seeking guidance and advisory services.",
    icon: BadgeCheck,
  },
  {
    title: "Startup & Innovation Partners",
    description:
      "Support emerging businesses through mentorship, investment opportunities, and strategic collaborations.",
    icon: Rocket,
  },
  {
    title: "Training & Knowledge Partners",
    description:
      "Conduct workshops, webinars, certifications, and professional development programs.",
    icon: GraduationCap,
  },
  {
    title: "Investor & Funding Partners",
    description:
      "Connect with promising businesses seeking growth capital and investment opportunities.",
    icon: TrendingUp,
  },
];

const benefits = [
  "Increased business visibility",
  "Access to qualified leads",
  "Strategic networking opportunities",
  "Business growth collaborations",
  "Market expansion opportunities",
  "Industry recognition",
  "Joint marketing initiatives",
  "Long-term partnership opportunities",
];

const partnerTypes = [
  "Entrepreneurs",
  "Business Owners",
  "Consultants",
  "Agencies",
  "IT Companies",
  "Manufacturers",
  "Service Providers",
  "Educational Institutions",
  "Investors",
  "Industry Associations",
  "Startups",
  "Corporate Organizations",
];

const focusPoints = [
  "Trust",
  "Transparency",
  "Innovation",
  "Collaboration",
  "Sustainable Growth",
];

function Partnership() {
  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section
        className="relative isolate overflow-hidden bg-[#321304] px-7 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(42,13,0,0.96) 0%, rgba(64,31,13,0.86) 48%, rgba(72,34,9,0.28) 100%), url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1700&q=95')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto grid max-w-[1390px] gap-10 lg:grid-cols-[1fr_0.74fr] lg:items-end">
          <div className="animate-[partnershipFadeUp_720ms_ease-out_both]">
            <h1 className="max-w-[780px] text-[40px] font-black leading-[1] tracking-[-0.045em] sm:text-[62px] lg:text-[76px]">
              Partnership Page Content
            </h1>
            <h2 className="mt-7 max-w-[780px] text-[25px] font-black leading-tight tracking-[-0.025em] text-[#f7e6cf] sm:text-[34px]">
              Grow Together Through Strategic Partnerships
            </h2>
            <p className="mt-6 max-w-[700px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Success is built through strong relationships, collaboration, and shared opportunities.
            </p>
            <p className="mt-5 max-w-[700px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Machinichi welcomes businesses, professionals, consultants, agencies, startups, investors, organizations,
              and industry leaders to become strategic partners within our growing business ecosystem.
            </p>
            <p className="mt-5 max-w-[700px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Together, we create value, expand market reach, generate opportunities, and build long-term business
              success. Many business directories and listing platforms create value by helping businesses increase
              visibility, discover opportunities, and build professional networks.
            </p>
            <a
              className="mt-9 inline-flex min-h-[48px] max-w-full items-center gap-2 rounded-[9px] bg-white px-7 py-3 text-[12px] font-black text-[#321607] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf] sm:text-[13px]"
              href="#become-partner"
            >
              Partner with Machinichi Today. 🚀
              <ArrowRight size={16} strokeWidth={2.6} />
            </a>
          </div>

          <aside className="rounded-[16px] border border-white/14 bg-white/[0.09] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:scale-[1.015] hover:border-[#ffc08c]/60 hover:bg-white/[0.14] hover:shadow-[0_24px_60px_rgba(253,118,26,0.22),inset_0_1px_0_rgba(255,255,255,0.14)]">
            <div className="rounded-[13px] bg-white/12 p-5">
              <Handshake className="text-[#ffc08c]" size={30} strokeWidth={2.4} />
              <p className="mt-5 text-[13px] font-black uppercase tracking-[0.18em] text-[#f7e6cf]/82">
                Partnership Opportunities
              </p>
              <div className="mt-5 grid gap-3">
                {partnershipOpportunities.slice(0, 4).map(({ title, icon: Icon }) => (
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
        <section className="partnership-section">
          <SectionTitle icon={Handshake}>Partnership Opportunities</SectionTitle>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {partnershipOpportunities.map(({ title, description, icon: Icon }) => (
              <article
                className="group rounded-[18px] border border-[#eee2d8] bg-white/90 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)]"
                key={title}
              >
                <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_12px_24px_rgba(90,51,34,0.18)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                  <Icon size={24} strokeWidth={2.35} />
                </span>
                <h3 className="mt-6 text-[20px] font-black tracking-[-0.025em] text-[#21140e]">
                  {title}
                </h3>
                <p className="mt-4 text-[14px] font-medium leading-7 text-[#70635c]">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="partnership-section mt-14 grid gap-8 lg:grid-cols-[0.92fr_1fr] lg:items-start">
          <div className="rounded-[18px] bg-[#391504] p-6 text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(46,21,8,0.24)] sm:p-8">
            <SectionTitle icon={CheckCircle2} light>
              Benefits of Partnering with Machinichi
            </SectionTitle>
            <ul className="mt-7 grid gap-3">
              {benefits.map((benefit) => (
                <li
                  className="flex items-start gap-3 rounded-[12px] border border-white/10 bg-white/[0.08] px-4 py-3 text-[14px] font-bold leading-6 text-white/84 transition duration-300 hover:translate-x-1 hover:border-[#de792f]/58 hover:bg-white/[0.12]"
                  key={benefit}
                >
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#ffc08c]" size={18} strokeWidth={2.5} />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[18px] border border-[#eee2d8] bg-white p-6 shadow-[0_14px_38px_rgba(70,39,14,0.075)] transition duration-500 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_24px_58px_rgba(191,76,12,0.13)] sm:p-8">
            <SectionTitle icon={Users}>Who Can Partner?</SectionTitle>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {partnerTypes.map((partnerType) => (
                <li
                  className="flex items-center gap-3 rounded-[12px] border border-[#eee2d8] bg-[#fffaf5] px-4 py-3 text-[14px] font-bold text-[#5f514a] transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:bg-[#fff3e8] hover:text-[#21140e] hover:shadow-[0_14px_30px_rgba(70,39,14,0.08)]"
                  key={partnerType}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#fd761a]" />
                  {partnerType}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="partnership-section mt-14 overflow-hidden rounded-[18px] border border-[#eee2d8] bg-white shadow-[0_14px_38px_rgba(70,39,14,0.075)] transition duration-500 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_24px_58px_rgba(191,76,12,0.13)]">
          <div className="grid gap-0 lg:grid-cols-[0.88fr_1fr]">
            <div className="bg-[#f7e6cf] p-6 sm:p-8 lg:p-10">
              <SectionTitle icon={BriefcaseBusiness}>Our Partnership Approach</SectionTitle>
              <p className="mt-6 text-[15px] font-medium leading-7 text-[#6b5546]">
                We believe in creating win-win relationships that deliver measurable value to all stakeholders.
              </p>
              <p className="mt-5 text-[15px] font-medium leading-7 text-[#6b5546]">
                Our focus is on:
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:p-10">
              {focusPoints.map((point) => (
                <div
                  className="group flex items-center gap-4 rounded-[14px] border border-[#eee2d8] bg-[#fffaf5] p-5 transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:bg-[#fff3e8] hover:shadow-[0_14px_30px_rgba(70,39,14,0.08)]"
                  key={point}
                >
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                    <Building2 size={19} strokeWidth={2.4} />
                  </span>
                  <p className="text-[15px] font-black text-[#21140e]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="partnership-section group relative mt-14 overflow-hidden rounded-[18px] bg-[#391504] px-7 py-9 text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(46,21,8,0.25)] sm:px-10 sm:py-12"
          id="become-partner"
        >
          <span className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#fd761a]/15 blur-3xl transition duration-500 group-hover:bg-[#fd761a]/25" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[780px]">
              <h2 className="text-[31px] font-black leading-[1.08] tracking-[-0.035em] sm:text-[46px]">
                Become a Machinichi Partner
              </h2>
              <p className="mt-5 text-[15px] font-medium leading-7 text-white/76">
                Join a growing ecosystem of businesses and professionals committed to creating opportunities, driving
                innovation, and achieving success together.
              </p>
              <p className="mt-8 text-[15px] font-black leading-7 text-white">
                Let&apos;s Build Meaningful Business Relationships and Grow Together.
              </p>
             
            </div>
            <a
              className="inline-flex min-h-[48px] max-w-full items-center justify-center gap-2 rounded-[9px] bg-white px-7 py-3 text-[12px] font-black text-[#391504] shadow-[0_12px_24px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf] hover:shadow-[0_16px_32px_rgba(0,0,0,0.22)] sm:text-[13px]"
              href="mailto:digital@machinichi.com?subject=Partnership%20Request"
            >
              Partner with Machinichi Today. 🚀
              <ArrowRight size={16} strokeWidth={2.6} />
            </a>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes partnershipFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .partnership-section {
          animation: partnershipFadeUp 720ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .partnership-section,
          [class*="animate-[partnershipFadeUp"] {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

function SectionTitle({ children, icon: Icon, light = false }) {
  return (
    <div>
      <Icon
        className={light ? "text-[#ffc08c]" : "text-[#9a5728]"}
        size={28}
        strokeWidth={2.4}
      />
      <h2
        className={`mt-5 text-[28px] font-black leading-[1.1] tracking-[-0.03em] sm:text-[38px] ${
          light ? "text-white" : "text-[#21140e]"
        }`}
      >
        {children}
      </h2>
    </div>
  );
}

export default Partnership;
