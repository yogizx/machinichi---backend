import {
  ArrowRight,
  BadgeCheck,
  Factory,
  Handshake,
  HeartHandshake,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import machinichiLogo from "./images/machinichi-about-rain.png";

const image = (id, params = "auto=format&fit=crop&w=1200&q=90") =>
  `https://images.unsplash.com/${id}?${params}`;

const stats = [
  ["100%", "quality-focused sourcing"],
  ["Fresh", "small-batch packing"],
  ["Daily", "essentials for Indian kitchens"],
];

const values = [
  {
    title: "Careful Sourcing",
    description: "We choose farms, mills, and supplier partners that value purity, freshness, and responsible handling.",
    icon: Sprout,
  },
  {
    title: "Clean Processing",
    description: "Our staples are selected and packed to preserve natural taste, texture, aroma, and nutrition.",
    icon: Factory,
  },
  {
    title: "Reliable Delivery",
    description: "Every product is prepared for everyday use with dependable packing and customer-first service.",
    icon: PackageCheck,
  },
];

const reasons = [
  "Premium grocery essentials curated for health-conscious homes.",
  "Transparent product selection with an emphasis on natural goodness.",
  "Thoughtful packaging designed to protect freshness and quality.",
  "A growing brand built around consistency, care, and trust.",
];

const trustPoints = [
  {
    title: "Quality Checks",
    text: "Every batch is reviewed for freshness, appearance, and everyday usability before it reaches customers.",
    icon: BadgeCheck,
  },
  {
    title: "Customer First",
    text: "We listen closely to feedback so our product range, packing, and service keep improving.",
    icon: HeartHandshake,
  },
  {
    title: "Honest Value",
    text: "Our focus is simple: wholesome products, fair value, and dependable service for every order.",
    icon: ShieldCheck,
  },
];

const logoRainDrops = [
  { left: 3, size: 92, duration: 30, delay: -8, drift: 16, opacity: 0.96 },
  { left: 14, size: 126, duration: 42, delay: -31, drift: -18, opacity: 0.93 },
  { left: 27, size: 78, duration: 28, delay: -18, drift: 12, opacity: 0.98 },
  { left: 40, size: 142, duration: 46, delay: -44, drift: -20, opacity: 0.92 },
  { left: 53, size: 96, duration: 34, delay: -5, drift: 14, opacity: 0.96 },
  { left: 66, size: 132, duration: 44, delay: -26, drift: -16, opacity: 0.94 },
  { left: 79, size: 84, duration: 30, delay: -14, drift: 12, opacity: 0.98 },
  { left: 92, size: 118, duration: 40, delay: -36, drift: -14, opacity: 0.95 },
  { left: 9, size: 150, duration: 50, delay: -54, drift: 18, opacity: 0.92 },
  { left: 33, size: 104, duration: 38, delay: -48, drift: -14, opacity: 0.96 },
  { left: 58, size: 72, duration: 28, delay: -40, drift: 10, opacity: 1 },
  { left: 84, size: 154, duration: 52, delay: -58, drift: -18, opacity: 0.92 },
];

const heroLogoRainDrops = [
  { left: 5, size: 96, duration: 32, delay: -9, drift: 14, opacity: 0.98 },
  { left: 23, size: 134, duration: 44, delay: -34, drift: -18, opacity: 0.94 },
  { left: 44, size: 88, duration: 30, delay: -18, drift: 12, opacity: 1 },
  { left: 64, size: 146, duration: 48, delay: -42, drift: 18, opacity: 0.94 },
  { left: 82, size: 104, duration: 36, delay: -26, drift: -14, opacity: 0.98 },
  { left: 94, size: 126, duration: 42, delay: -54, drift: -12, opacity: 0.96 },
];

function About() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <LogoRain />
      <section
        className="relative z-10 isolate overflow-hidden bg-[#321304] px-7 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(42,13,0,0.95) 0%, rgba(58,28,12,0.84) 46%, rgba(65,30,8,0.32) 100%), url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1700&q=95')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <LogoRain hero />
        <div className="relative z-10 mx-auto grid max-w-[1390px] gap-10 lg:grid-cols-[1.04fr_0.76fr] lg:items-end">
          <div className="animate-[aboutFadeUp_700ms_ease-out_both]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
              About Machinichi
            </p>
            <h1 className="mt-5 max-w-[760px] text-[42px] font-black leading-[0.98] tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
              Pure essentials for better everyday living.
            </h1>
            <p className="mt-6 max-w-[610px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Machinichi brings thoughtfully selected groceries, grains, dry fruits, flours, oils, and wellness essentials
              to homes that care about freshness, nutrition, and honest quality.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                className="inline-flex h-[48px] items-center gap-2 rounded-[9px] bg-white px-7 text-[12px] font-black uppercase text-[#321607] shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5"
                to="/product"
              >
                Explore Products
                <ArrowRight size={16} strokeWidth={2.6} />
              </Link>
             
            </div>
          </div>

          <div className="about-banner-panel group grid gap-4 rounded-[16px] border border-white/14 bg-white/[0.09] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-500 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:border-[#ffc08c]/64 hover:bg-white/[0.14] hover:shadow-[0_24px_60px_rgba(253,118,26,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] sm:grid-cols-3 lg:grid-cols-1">
            {stats.map(([value, label]) => (
              <div className="rounded-[12px] bg-white/12 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.18] group-hover:shadow-[0_10px_26px_rgba(0,0,0,0.12)]" key={value}>
                <p className="text-[25px] font-black tracking-[-0.04em] text-white">{value}</p>
                <p className="mt-2 text-[12px] font-bold leading-5 text-[#f7e6cf]/78">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-[1390px] px-7 py-12 sm:px-10 sm:py-16 lg:px-[54px]">
        <section className="about-section grid gap-8 lg:grid-cols-[0.82fr_1fr] lg:items-center" id="our-story">
          <div className="group relative overflow-hidden rounded-[18px] bg-[#ede0d3] shadow-[0_16px_38px_rgba(58,31,12,0.12)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(58,31,12,0.18)]">
            <img
              alt="Premium grocery staples and fresh produce arranged for a clean pantry display"
              className="h-[330px] w-full object-cover transition duration-700 group-hover:scale-105 sm:h-[430px]"
              src={image("photo-1543168256-418811576931", "auto=format&fit=crop&w=1000&q=95")}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#321304]/38 via-transparent to-transparent opacity-70 transition duration-500 group-hover:opacity-90" />
            <span className="absolute bottom-5 left-5 rounded-full border border-white/28 bg-white/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md">
              Fresh Essentials
            </span>
          </div>

          <div className="animate-[aboutFadeUp_700ms_ease-out_120ms_both]">
            <SectionLabel icon={Leaf}>About Machinichi</SectionLabel>
            <p className="mt-5 text-[15px] font-medium leading-7 text-[#6f625a] sm:text-[16px]">
              Machinichi.com is a modern commerce and showcase platform connecting buyers, sellers, manufacturers,
              distributors, service providers, and businesses through a seamless digital experience.
            </p>
            <p className="mt-4 text-[15px] font-medium leading-7 text-[#6f625a] sm:text-[16px]">
              Our platform enables businesses to:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-[15px] font-medium leading-7 text-[#6f625a] sm:text-[16px]">
              <li>Showcase products and services</li>
              <li>Sell products online</li>
              <li>Generate business inquiries</li>
              <li>Connect with potential customers</li>
              <li>Expand market reach</li>
            </ul>
            <p className="mt-4 text-[15px] font-medium leading-7 text-[#6f625a] sm:text-[16px]">
              Whether customers wish to purchase products directly or explore business opportunities, Machinichi.com
              provides a reliable platform for discovery, engagement, and growth.
            </p>
          </div>
        </section>

        <section className="about-section mt-14 grid gap-5 md:grid-cols-2">
          <PurposeCard
            icon={Target}
            label="Mission"
            title="To make wholesome essentials accessible."
            text="To simplify commerce and business discovery by creating a trusted platform that connects opportunities with people."
          />
          <PurposeCard
            icon={Sparkles}
            label="Vision"
            title="To become a trusted name in natural living."
            text="Our vision is to grow as a customer-loved brand known for quality groceries, ethical values, and consistent care."
          />
        </section>

        <section className="about-section mt-16">
          <div className="max-w-[760px]">
            <SectionLabel icon={Star}>Why Choose Us</SectionLabel>
            <h2 className="about-heading mt-4 text-[34px] font-black leading-[1.05] tracking-[-0.035em] text-[#21140e] sm:text-[48px]">
              A better way to shop daily nutrition.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {reasons.map((reason, index) => (
              <article
                className="group rounded-[14px] border border-[#eee2d8] bg-white/88 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#f0b37d] hover:bg-[#fff7ee] hover:shadow-[0_22px_48px_rgba(191,76,12,0.13)]"
                key={reason}
              >
                <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#5a3322] text-[13px] font-black text-[#f7e6cf] shadow-[0_8px_18px_rgba(90,51,34,0.2)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                  {index + 1}
                </span>
                <p className="mt-5 text-[15px] font-bold leading-6 text-[#51443c]">{reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section mt-16 overflow-hidden rounded-[18px] bg-[#391504] text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(46,21,8,0.24)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <SectionLabel icon={Handshake} light>
                Product Quality / Values
              </SectionLabel>
              <h2 className="about-heading about-heading-light mt-4 text-[32px] font-black leading-[1.04] tracking-[-0.035em] sm:text-[46px]">
                Quality is not a promise we add later. It starts at selection.
              </h2>
              <p className="mt-5 text-[15px] font-medium leading-7 text-white/78">
                Our values guide every product we offer: purity, freshness, consistency, and respect for the customer&apos;s
                trust. We keep the range focused, useful, and made for real kitchens.
              </p>
            </div>
            <div className="grid gap-4 bg-white/[0.055] p-5 sm:p-7">
              {values.map(({ title, description, icon: Icon }) => (
                <article className="group rounded-[14px] border border-white/12 bg-white/[0.08] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#de792f]/58 hover:bg-white/[0.12] hover:shadow-[0_18px_36px_rgba(0,0,0,0.18)]" key={title}>
                  <Icon className="text-[#de792f] transition duration-300 group-hover:scale-110 group-hover:text-[#ffb16f]" size={26} strokeWidth={2.2} />
                  <h3 className="mt-4 text-[18px] font-black tracking-[-0.02em]">{title}</h3>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-white/72">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-section mt-16 grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <SectionLabel icon={Users}>Customer Trust</SectionLabel>
            <h2 className="about-heading mt-4 text-[34px] font-black leading-[1.05] tracking-[-0.035em] text-[#21140e] sm:text-[48px]">
              Trust grows through every order, every pack, every kitchen.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {trustPoints.map(({ title, text, icon: Icon }) => (
                <article className="group flex gap-4 rounded-[14px] border border-[#eee2d8] bg-white/86 p-5 transition duration-300 hover:-translate-y-1 hover:border-[#efb27b] hover:bg-white hover:shadow-[0_16px_38px_rgba(70,39,14,0.1)]" key={title}>
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#f7e6cf] text-[#5a3322] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                    <Icon size={21} strokeWidth={2.4} />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-black tracking-[-0.015em]">{title}</h3>
                    <p className="mt-2 text-[13px] font-medium leading-6 text-[#73665f]">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="group rounded-[18px] border border-[#eee2d8] bg-white p-6 shadow-[0_14px_38px_rgba(70,39,14,0.075)] transition duration-500 hover:-translate-y-2 hover:border-[#efb27b] hover:shadow-[0_24px_58px_rgba(191,76,12,0.13)]">
            <img
              alt="A table arranged with healthy ingredients and fresh groceries"
              className="h-[310px] w-full rounded-[13px] object-cover transition duration-700 group-hover:scale-[1.02] sm:h-[390px]"
              src={image("photo-1542838132-92c53300491e", "auto=format&fit=crop&w=1000&q=95")}
            />
            <div className="mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9d7b62]">Team & Brand</p>
              <h3 className="mt-3 text-[24px] font-black tracking-[-0.035em] sm:text-[30px]">
                A brand shaped by care, service, and everyday nutrition.
              </h3>
              <p className="mt-3 text-[14px] font-medium leading-6 text-[#6f625a]">
                Behind Machinichi is a team focused on building a dependable grocery experience, from product discovery
                to packing and customer support.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section mt-16 rounded-[18px] bg-[#f7e6cf] px-7 py-9 text-center shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-500 hover:-translate-y-1 hover:bg-[#ffe5c2] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)] sm:px-10 sm:py-12">
          <h2 className="about-heading mx-auto max-w-[760px] text-[32px] font-black leading-[1.08] tracking-[-0.035em] text-[#21140e] sm:text-[46px]">
            Bring home essentials chosen with care.
          </h2>
          <p className="mx-auto mt-4 max-w-[590px] text-[15px] font-medium leading-7 text-[#6b5546]">
            Explore our growing range of groceries, dry fruits, staples, and wellness products made for better daily
            living.
          </p>
          <Link
            className="mt-7 inline-flex h-[48px] items-center gap-2 rounded-[9px] bg-[#5a3322] px-7 text-[12px] font-black uppercase text-white shadow-[0_12px_24px_rgba(69,34,15,0.18)] transition hover:-translate-y-0.5"
            to="/product"
          >
            Shop Machinichi
            <ArrowRight size={16} strokeWidth={2.6} />
          </Link>
        </section>
      </div>

      <style>{`
        @keyframes aboutFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .about-section {
          animation: aboutFadeUp 720ms ease-out both;
        }

        .about-heading {
          position: relative;
          text-wrap: balance;
          text-shadow: 0 8px 24px rgba(90, 51, 34, 0.08);
          transition: color 260ms ease, text-shadow 260ms ease, transform 260ms ease;
        }

        .about-heading::after {
          content: "";
          display: block;
          width: 78px;
          height: 5px;
          margin-top: 16px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #fd761a, #f2b56f);
          box-shadow: 0 8px 22px rgba(253, 118, 26, 0.26);
          transform-origin: left center;
          transition: width 300ms ease, box-shadow 300ms ease;
        }

        .about-heading:hover {
          color: #b44a0f;
          text-shadow: 0 12px 28px rgba(253, 118, 26, 0.14);
        }

        .about-heading:hover::after {
          width: 118px;
          box-shadow: 0 10px 26px rgba(253, 118, 26, 0.34);
        }

        .about-heading-light {
          color: #fff;
          text-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
        }

        .about-heading-light:hover {
          color: #ffd8b8;
        }

        .about-banner-panel {
          will-change: transform;
        }

        .about-logo-rain {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          user-select: none;
          -webkit-mask-image: linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent);
          mask-image: linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent);
        }

        .about-logo-rain::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255, 250, 245, 0.08), rgba(255, 250, 245, 0.12)),
            radial-gradient(circle at 18% 8%, rgba(253, 118, 26, 0.08), transparent 28%),
            radial-gradient(circle at 82% 22%, rgba(90, 51, 34, 0.1), transparent 32%);
        }

        .about-logo-rain-hero {
          opacity: 1;
          mix-blend-mode: normal;
        }

        .about-logo-rain-hero::before {
          background: linear-gradient(90deg, rgba(50, 19, 4, 0.06), rgba(50, 19, 4, 0.02));
        }

        .about-logo-drop {
          position: absolute;
          top: -210px;
          left: var(--drop-left);
          width: clamp(82px, calc(var(--drop-size) * 1.08), 170px);
          height: auto;
          opacity: 0;
          filter: sepia(0.02) saturate(1.45) contrast(1.55) brightness(0.86) drop-shadow(0 10px 1px rgba(255, 250, 245, 0.5)) drop-shadow(0 18px 26px rgba(58, 19, 4, 0.36));
          transform: translate3d(0, -120%, 0) rotate(-4deg);
          animation: aboutLogoRain var(--drop-duration) linear var(--drop-delay) infinite;
          will-change: transform, opacity;
        }

        .about-logo-rain-hero .about-logo-drop {
          filter: sepia(0.02) saturate(1.35) contrast(1.42) brightness(1.05) drop-shadow(0 10px 1px rgba(255, 226, 198, 0.34)) drop-shadow(0 18px 30px rgba(0, 0, 0, 0.46));
        }

        @keyframes aboutLogoRain {
          0% {
            top: -210px;
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(-4deg) scale(0.98);
          }
          8% {
            opacity: var(--drop-opacity);
          }
          86% {
            opacity: var(--drop-opacity);
          }
          100% {
            top: 100%;
            opacity: 0;
            transform: translate3d(var(--drop-drift), 110px, 0) rotate(5deg) scale(1.01);
          }
        }

        @media (max-width: 768px) {
          .about-logo-rain:not(.about-logo-rain-hero) .about-logo-drop:nth-child(n + 8),
          .about-logo-rain-hero .about-logo-drop:nth-child(n + 5) {
            display: none;
          }

          .about-logo-drop {
            width: clamp(62px, calc(var(--drop-size) * 0.82), 118px);
          }
        }

        @media (max-width: 480px) {
          .about-logo-rain:not(.about-logo-rain-hero) .about-logo-drop:nth-child(n + 6),
          .about-logo-rain-hero .about-logo-drop:nth-child(n + 4) {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .about-logo-rain {
            opacity: 0.9;
          }

          .about-logo-drop {
            animation: none;
            opacity: var(--drop-opacity);
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </main>
  );
}

function LogoRain({ hero = false }) {
  const drops = hero ? heroLogoRainDrops : logoRainDrops;

  return (
    <div className={`about-logo-rain ${hero ? "about-logo-rain-hero" : ""}`} aria-hidden="true">
      {drops.map((drop, index) => (
        <img
          alt=""
          className="about-logo-drop"
          key={`${drop.left}-${index}`}
          src={machinichiLogo}
          style={{
            "--drop-left": `${drop.left}%`,
            "--drop-size": `${drop.size}px`,
            "--drop-duration": `${drop.duration}s`,
            "--drop-delay": `${drop.delay}s`,
            "--drop-drift": `${drop.drift}px`,
            "--drop-opacity": drop.opacity,
          }}
        />
      ))}
    </div>
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

function PurposeCard({ icon: Icon, label, title, text }) {
  return (
    <article className="group rounded-[18px] border border-[#eee2d8] bg-white/88 p-7 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)] sm:p-8">
      <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_12px_24px_rgba(90,51,34,0.18)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
        <Icon size={24} strokeWidth={2.3} />
      </span>
      <p className="mt-6 inline-flex rounded-full bg-[#f7e6cf] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#9a5728] transition duration-300 group-hover:bg-[#ffe3c8] group-hover:text-[#b44a0f]">{label}</p>
      <h3 className="about-heading mt-4 text-[27px] font-black leading-tight tracking-[-0.03em] text-[#21140e] sm:text-[34px]">{title}</h3>
      <p className="mt-4 text-[14px] font-medium leading-7 text-[#70635c] sm:text-[15px]">{text}</p>
    </article>
  );
}

export default About;
