import {
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  Globe2,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const contactEmail = "digital@machinichi.com";
const addressLines = [
  "Machinichi Foods – Organic Millet Health Foods",
  "4691, Jaihindpuram Main Road,",
  "Thendal Nagar, Villapuram Colony,",
  "Villapuram, Madurai,",
  "Tamil Nadu – 625011, India",
];
const address = addressLines.join(" ");
const mapQuery = encodeURIComponent(address);
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;

const contactCards = [
  {
    title: "Visit Us",
    value: "Madurai, Tamil Nadu",
    detail: "4691, Jaihindpuram Main Road, Thendal Nagar, Villapuram Colony, Villapuram, Madurai, Tamil Nadu 625011",
    icon: MapPin,
  },
  {
    title: "Call Us",
    value: "+91 9952252213",
    detail: "Speak with our support team for orders, products, and store information.",
    icon: Phone,
  },
  {
    title: "Email Us",
    value: contactEmail,
    detail: "Send product queries, partnership requests, or feedback anytime.",
    icon: Mail,
  },
  {
    title: "Website",
    value: "www.machinichi.com",
    detail: "Explore our products, services, and latest business opportunities online.",
    icon: Globe2,
  },
];

const businessHours = [
  ["Monday - Saturday", "9:00 AM - 6:00 PM IST"],
  ["Sunday", "Closed"],
  ["Customer Support", "Same-day response during business hours"],
];

function Contact() {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSent(true);
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] font-sans text-[#27201c] antialiased">
      <section
        className="relative isolate overflow-hidden bg-[#321304] px-7 py-16 text-white sm:px-10 sm:py-20 lg:px-[54px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(42,13,0,0.95) 0%, rgba(58,28,12,0.84) 48%, rgba(65,30,8,0.28) 100%), url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1700&q=95')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto grid max-w-[1390px] gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-end">
          <div className="animate-[contactFadeUp_700ms_ease-out_both]">
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f7e6cf]/86">
              <MessageCircle size={15} strokeWidth={2.8} />
              Contact Machinichi
            </p>
            <h1 className="mt-5 max-w-[760px] text-[42px] font-black leading-[0.98] tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">
              We are here to help you shop better.
            </h1>
            <p className="mt-5 text-[18px] font-black tracking-[-0.02em] text-[#f7e6cf] sm:text-[21px]">
              We would be happy to assist you.
            </p>
            <p className="mt-6 max-w-[620px] text-[15px] font-medium leading-7 text-white/86 sm:text-[17px]">
              Reach out for product questions, delivery support, store information, business enquiries, or feedback.
              Our team will get back to you with care and clarity.
            </p>
          </div>

          <div className="contact-lift rounded-[16px] border border-white/14 bg-white/[0.09] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:scale-[1.015] hover:border-[#ffc08c]/60 hover:bg-white/[0.14] hover:shadow-[0_24px_60px_rgba(253,118,26,0.22),inset_0_1px_0_rgba(255,255,255,0.14)]">
            <div className="group flex items-start gap-4 rounded-[13px] bg-white/12 p-5 transition duration-300 hover:bg-white/[0.18]">
              <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-white text-[#5a3322] shadow-[0_10px_22px_rgba(0,0,0,0.12)] transition duration-300 group-hover:scale-110 group-hover:text-[#c84c12]">
                <Headphones size={22} strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#f7e6cf]/82">Need assistance?</p>
                <h2 className="mt-2 text-[24px] font-black tracking-[-0.035em]">Customer care, made simple.</h2>
                <p className="mt-3 text-[13px] font-medium leading-6 text-white/74">
                  For faster help, include your order details or the product name in your message.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1390px] px-7 py-12 sm:px-10 sm:py-16 lg:px-[54px]">
        <section className="contact-section grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {contactCards.map(({ title, value, detail, icon: Icon }) => (
            <article
              className="group rounded-[18px] border border-[#eee2d8] bg-white/88 p-6 shadow-[0_12px_34px_rgba(70,39,14,0.055)] transition duration-300 hover:-translate-y-2 hover:border-[#efb27b] hover:bg-[#fff8f0] hover:shadow-[0_24px_55px_rgba(191,76,12,0.13)]"
              key={title}
            >
              <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#5a3322] text-[#f7e6cf] shadow-[0_12px_24px_rgba(90,51,34,0.18)] transition duration-300 group-hover:scale-110 group-hover:bg-[#fd761a] group-hover:text-white">
                <Icon size={24} strokeWidth={2.35} />
              </span>
              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-[#9d7b62]">{title}</p>
              <h2 className="mt-2 text-[22px] font-black tracking-[-0.03em]">{value}</h2>
              <p className="mt-3 text-[14px] font-medium leading-6 text-[#70635c]">{detail}</p>
            </article>
          ))}
        </section>

        <section className="contact-section mt-14 grid gap-8 lg:grid-cols-[1fr_0.86fr] lg:items-start">
          <div className="rounded-[18px] border border-[#eee2d8] bg-white p-6 shadow-[0_14px_38px_rgba(70,39,14,0.075)] transition duration-500 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_24px_58px_rgba(191,76,12,0.13)] sm:p-8">
            <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#9d7b62]">
              <Send size={15} strokeWidth={2.8} />
              Contact Form
            </p>
            <h2 className="mt-4 text-[31px] font-black leading-[1.06] tracking-[-0.035em] sm:text-[45px]">
              Send us a message.
            </h2>
            <p className="mt-4 max-w-[620px] text-[15px] font-medium leading-7 text-[#6f625a]">
              Share your question and our team will respond as soon as possible during business hours.
            </p>

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full Name" name="name" placeholder="Enter your name" />
                <Field label="Phone Number" name="phone" placeholder="Enter your phone number" type="tel" />
              </div>
              <Field label="Email Address" name="email" placeholder="Enter your email" type="email" />
              <label className="grid gap-2">
                <span className="text-[13px] font-black text-[#4d3b31]">Message</span>
                <textarea
                  className="min-h-[142px] resize-y rounded-[10px] border border-[#e5d8ce] bg-[#fffaf5] px-4 py-3 text-[14px] font-medium text-[#352820] outline-none transition placeholder:text-[#a4968c] focus:border-[#5a3322] focus:bg-white focus:ring-4 focus:ring-[#5a3322]/10"
                  name="message"
                  placeholder="Tell us how we can help"
                  required
                />
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  className="inline-flex h-[48px] items-center gap-2 rounded-[9px] bg-[#5a3322] px-7 text-[12px] font-black uppercase text-white shadow-[0_12px_24px_rgba(69,34,15,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-[#fd761a] hover:shadow-[0_16px_32px_rgba(253,118,26,0.24)]"
                  type="submit"
                >
                  Send Message
                  <ArrowRight size={16} strokeWidth={2.6} />
                </button>
                {isSent ? (
                  <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#4d7a29]">
                    <ShieldCheck size={17} strokeWidth={2.5} />
                    Thanks, your message is ready for our team.
                  </span>
                ) : null}
              </div>
            </form>
          </div>

          <aside className="grid gap-5">
            <section className="rounded-[18px] bg-[#391504] p-6 text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(46,21,8,0.24)] sm:p-8">
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#f7e6cf]/82">
                <Clock size={15} strokeWidth={2.8} />
                Business Hours
              </p>
              <div className="mt-6 space-y-4">
                {businessHours.map(([day, time]) => (
                  <div className="flex items-start justify-between gap-5 rounded-[10px] border-b border-white/10 p-3 pb-4 transition duration-300 hover:bg-white/[0.08] last:border-b-0 last:pb-3" key={day}>
                    <span className="text-[14px] font-black">{day}</span>
                    <span className="max-w-[180px] text-right text-[13px] font-medium leading-5 text-white/74">{time}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="group relative overflow-hidden rounded-[18px] border border-[#f0d6bf] bg-[#f7e6cf] p-6 shadow-[0_14px_34px_rgba(70,39,14,0.07)] transition duration-500 hover:-translate-y-3 hover:scale-[1.015] hover:border-[#e9a365] hover:bg-[#ffe5c2] hover:shadow-[0_28px_65px_rgba(191,76,12,0.22)] sm:p-8">
              <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#fd761a]/0 blur-2xl transition duration-500 group-hover:bg-[#fd761a]/20" />
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#7b573f]">
                <ShieldCheck className="transition duration-500 group-hover:rotate-12 group-hover:scale-125" size={15} strokeWidth={2.8} />
                Support Promise
              </p>
              <h2 className="mt-4 text-[25px] font-black tracking-[-0.035em] text-[#321607] transition duration-300 group-hover:text-[#a9400d]">Fast, friendly follow-up.</h2>
              <p className="mt-3 text-[14px] font-bold leading-7 text-[#604636]">
                Share your order details, product name, or delivery question. We will route it to the right team during
                business hours.
              </p>
              <div className="mt-6 grid gap-3">
                {["Order support", "Product guidance", "Business enquiries"].map((item) => (
                  <span
                    className="flex items-center gap-3 rounded-[11px] bg-white/70 px-4 py-3 text-[13px] font-black text-[#5a3322] shadow-[0_8px_18px_rgba(69,34,15,0.08)] transition duration-300 group-hover:translate-x-1 group-hover:bg-white group-hover:shadow-[0_12px_24px_rgba(69,34,15,0.13)]"
                    key={item}
                  >
                    <ShieldCheck size={16} className="text-[#5aa235]" strokeWidth={2.5} />
                    {item}
                  </span>
                ))}
              </div>
            
            </section>
          </aside>
        </section>

        <section className="contact-section mt-14 overflow-hidden rounded-[18px] border border-[#eee2d8] bg-white shadow-[0_14px_38px_rgba(70,39,14,0.075)] transition duration-500 hover:-translate-y-1 hover:border-[#efb27b] hover:shadow-[0_24px_58px_rgba(191,76,12,0.13)]">
          <div className="flex flex-col gap-4 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#9d7b62]">
                <MapPin size={15} strokeWidth={2.8} />
                Location Map
              </p>
              <h2 className="mt-3 text-[30px] font-black tracking-[-0.035em] sm:text-[40px]">Find us in Madurai.</h2>
            </div>
            <p className="max-w-[470px] text-[14px] font-medium leading-6 text-[#70635c]">
              Use the map below to locate our address on Jaihindpuram Main Road, near Villapuram Colony.
            </p>
          </div>
          
        

          <div className="relative">
            <iframe
              className="pointer-events-none h-[360px] w-full border-0 sm:h-[460px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              title="Machinichi Foods location map"
            />
            <a
              aria-label="Open Machinichi Foods location in Google Maps"
              className="absolute inset-0"
              href={mapsUrl}
              rel="noreferrer"
              target="_blank"
            />
          </div>
        </section>

        <section className="contact-section group relative mt-14 overflow-hidden rounded-[18px] bg-[#391504] px-7 py-9 text-white shadow-[0_18px_45px_rgba(46,21,8,0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(46,21,8,0.25)] sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#fd761a]/15 blur-3xl transition duration-500 group-hover:bg-[#fd761a]/25" />
          <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[760px]">
              <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#f7e6cf]/82">
                <BriefcaseBusiness size={16} strokeWidth={2.6} />
                Business Enquiries
              </p>
              <h2 className="mt-4 text-[31px] font-black leading-[1.06] tracking-[-0.035em] sm:text-[45px]">
                Let&apos;s build opportunities together.
              </h2>
              <p className="mt-4 text-[15px] font-medium leading-7 text-white/76">
                For dealership, distributorship, partnership, product listing, or business collaboration opportunities,
                please contact us via email or phone.
              </p>
           
            </div>

            <div className="relative z-20 flex flex-col gap-3 sm:flex-row">
              <a
                className="pointer-events-auto inline-flex h-[48px] items-center justify-center gap-2 rounded-[9px] bg-white px-6 text-[12px] font-black uppercase text-[#391504] shadow-[0_12px_24px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-1 hover:bg-[#f7e6cf] hover:shadow-[0_16px_32px_rgba(0,0,0,0.22)]"
                aria-label={`Email Machinichi at ${contactEmail}`}
                href="https://mail.google.com/mail/u/0/?fs=1&to=digital@machinichi.com&tf=cm"
                title={`Email ${contactEmail}`}
              >
                <Mail size={17} strokeWidth={2.5} />
                Email Us
              </a>
              <a
                className="inline-flex h-[48px] items-center justify-center gap-2 rounded-[9px] border border-white/30 bg-white/10 px-6 text-[12px] font-black uppercase text-white backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-[#fd761a] hover:bg-[#fd761a]"
                href="tel:+919952252213"
              >
                <Phone size={17} strokeWidth={2.5} />
                Call Us
              </a>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes contactFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .contact-section {
          animation: contactFadeUp 720ms ease-out both;
        }

        .contact-lift {
          will-change: transform;
        }
      `}</style>
    </main>
  );
}

function Field({ label, name, placeholder, type = "text" }) {
  return (
    <label className="grid gap-2">
      <span className="text-[13px] font-black text-[#4d3b31]">{label}</span>
      <input
        className="h-[48px] rounded-[10px] border border-[#e5d8ce] bg-[#fffaf5] px-4 text-[14px] font-medium text-[#352820] outline-none transition placeholder:text-[#a4968c] focus:border-[#5a3322] focus:bg-white focus:ring-4 focus:ring-[#5a3322]/10"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}

function AddressBlock({ className = "mt-3 text-[14px] font-medium leading-6 text-[#70635c]" }) {
  return (
    <address className={`${className} not-italic`}>
      {addressLines.map((line) => (
        <span className="block" key={line}>
          {line}
        </span>
      ))}
    </address>
  );
}

export default Contact;
