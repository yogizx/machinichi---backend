import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Loader2,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "https://machinichi-backend.onrender.com/api" : "http://localhost:3000/api")}/admin/auth`;

const initialForm = { email: "", password: "", remember: false };

function Adminlogin({ onAdminLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });
    setServerError("");
  };

  const validateForm = () => {
    const nextErrors = {};
    const email = form.email.trim();
    if (!email) nextErrors.email = "Admin email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid admin email address.";
    if (!form.password) nextErrors.password = "Password is required.";
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, {
        email: form.email.trim(),
        password: form.password,
      }, { withCredentials: true });

      localStorage.setItem("accessToken", res.data.accessToken);
      if (res.data.refreshToken) {
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }
      onAdminLogin?.({ email: form.email.trim(), remember: form.remember });
      navigate("/admin/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Invalid admin credentials.");
    }
    setLoading(false);
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#fffaf5] px-4 py-6 text-[#221711] sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(173,77,0,0.16),transparent_34%),linear-gradient(135deg,#fffaf5_0%,#f1e2d4_46%,#fff6ee_100%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-64 bg-[linear-gradient(90deg,rgba(58,17,0,0.08),rgba(173,77,0,0.06),rgba(58,17,0,0.02))]" />

      <section className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_470px]">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ead9cc] bg-white/65 px-4 py-2 text-[13px] font-black uppercase tracking-[0.08em] text-[#7a3911] shadow-[0_12px_34px_rgba(95,55,25,0.08)]">
              <ShieldCheck size={16} strokeWidth={2.2} />
              Secure Admin Access
            </div>
            <h1 className="mt-6 max-w-[540px] text-[52px] font-black leading-[0.98] tracking-[-0.045em] text-[#2b170d]">
              Manage Machinichi with clarity and control.
            </h1>
            <p className="mt-5 max-w-[500px] text-[17px] leading-7 text-[#5f5149]">
              Sign in to review orders, track customer activity, manage stock, and keep the store running smoothly from one focused workspace.
            </p>
            <div className="mt-8 grid max-w-[520px] grid-cols-3 gap-3">
              {[
                ["Orders", "Live fulfilment"],
                ["Inventory", "Stock control"],
                ["Customers", "Account insights"],
              ].map(([title, subtitle]) => (
                <div key={title}
                  className="rounded-[8px] border border-[#ead9cc] bg-white/58 px-4 py-4 shadow-[0_14px_28px_rgba(74,44,24,0.06)] transition duration-300 hover:-translate-y-1 hover:bg-white/82"
                >
                  <p className="text-[15px] font-black text-[#30190e]">{title}</p>
                  <p className="mt-1 text-[12px] font-medium text-[#806f64]">{subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[470px]">
          <header className="mb-5 text-center lg:text-left">
            <p className="text-[13px] font-black uppercase tracking-[0.16em] text-[#a64b09]">Machinichi Admin</p>
            <h2 className="mt-2 text-[34px] font-black tracking-[-0.035em] text-[#25150d] sm:text-[40px]">Welcome back</h2>
            <p className="mt-2 text-[15px] leading-6 text-[#75675f]">Enter your admin credentials to continue.</p>
          </header>

          <form className="rounded-[14px] border border-[#ead8c9] bg-white/82 p-5 shadow-[0_22px_55px_rgba(74,42,22,0.13)] backdrop-blur-md sm:p-6"
            noValidate onSubmit={handleSubmit}
          >
            {serverError && (
              <div className="mb-4 rounded-[8px] border border-[#f1c8bd] bg-[#fff4f0] px-4 py-3 text-[14px] font-semibold text-[#9b2f15]">
                {serverError}
              </div>
            )}

            <label className="block text-[12px] font-black uppercase tracking-[0.08em] text-[#3d332d]" htmlFor="admin-email">
              Admin Email
            </label>
            <div className={`mt-2 flex h-[52px] items-center rounded-[8px] border bg-[#fffaf6] px-4 focus-within:border-[#ad4d00] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(173,77,0,0.1)] ${errors.email ? "border-[#d84a2b]" : "border-[#dbc7b7]"}`}>
              <Mail size={19} strokeWidth={1.9} />
              <input autoComplete="email"
                className="ml-3 min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#2c1e16] outline-none placeholder:text-[#b6a79e]"
                id="admin-email" onChange={(event) => updateField("email", event.target.value)}
                placeholder="admin@machinichi.com" type="email" value={form.email}
              />
            </div>
            {errors.email && <p className="mt-2 text-[13px] font-semibold text-[#b3361b]">{errors.email}</p>}

            <div className="mt-5 flex items-center justify-between gap-3">
              <label className="block text-[12px] font-black uppercase tracking-[0.08em] text-[#3d332d]" htmlFor="admin-password">Password</label>
              <button type="button" className="text-[13px] font-black text-[#a94d09] transition hover:text-[#6f2d05]">Forgot Password?</button>
            </div>
            <div className={`mt-2 flex h-[52px] items-center rounded-[8px] border bg-[#fffaf6] px-4 focus-within:border-[#ad4d00] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(173,77,0,0.1)] ${errors.password ? "border-[#d84a2b]" : "border-[#dbc7b7]"}`}>
              <LockKeyhole size={19} strokeWidth={1.9} />
              <input autoComplete="current-password"
                className="ml-3 min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#2c1e16] outline-none placeholder:text-[#b6a79e]"
                id="admin-password" onChange={(event) => updateField("password", event.target.value)}
                placeholder="Enter secure password" type={showPassword ? "text" : "password"} value={form.password}
              />
              <button type="button" onClick={() => setShowPassword((p) => !p)}
                className="ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-[7px] text-[#8c7a70] transition hover:bg-[#f3e7dd] hover:text-[#31180c]"
              >
                {showPassword ? <EyeOff size={19} strokeWidth={2} /> : <Eye size={19} strokeWidth={2} />}
              </button>
            </div>
            {errors.password && <p className="mt-2 text-[13px] font-semibold text-[#b3361b]">{errors.password}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-[14px] font-semibold text-[#493a31]" htmlFor="remember-admin">
                <input checked={form.remember} onChange={(event) => updateField("remember", event.target.checked)}
                  className="h-4 w-4 accent-[#ad4d00]" id="remember-admin" type="checkbox"
                />
                Remember Me
              </label>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8d7b70]">
                <Sparkles size={14} /> Protected Portal
              </span>
            </div>

            <button type="submit" disabled={loading}
              className="mt-6 flex h-[54px] w-full items-center justify-center gap-3 rounded-[8px] bg-[#3a1100] px-6 text-[15px] font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_26px_rgba(58,17,0,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ad4d00] hover:shadow-[0_18px_32px_rgba(173,77,0,0.24)] active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : "Login"}
              <ArrowRight size={20} strokeWidth={2.6} />
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] font-medium text-[#817167]">
            Need access? Contact the store owner or system administrator.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Adminlogin;
