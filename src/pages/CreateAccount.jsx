import { useState, useRef, useEffect, useMemo } from "react";
import { Eye, EyeOff, Phone, Mail, ArrowRight, ChevronDown, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import machinichiImage from "./images/machinichi.png";
import GoogleSignInButton from "../components/GoogleSignInButton";
import api from "../services/api";

const COUNTRIES = [
  { code: "IN", name: "India", dial: "+91" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "AE", name: "UAE", dial: "+971" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "DE", name: "Germany", dial: "+49" },
];

const flagUrl = (code) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const passwordRules = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "Uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "Lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "Number", test: (v) => /\d/.test(v) },
  { label: "Special character", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

const getStrength = (pwd) => {
  if (!pwd) return { label: "", pct: 0, color: "", textColor: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9\s]/.test(pwd)) score++;
  if (score <= 1) return { label: "Weak", pct: 25, color: "bg-red-500", textColor: "text-red-600" };
  if (score <= 2) return { label: "Fair", pct: 50, color: "bg-orange-500", textColor: "text-orange-600" };
  if (score <= 3) return { label: "Medium", pct: 75, color: "bg-yellow-500", textColor: "text-yellow-700" };
  return { label: "Strong", pct: 100, color: "bg-green-500", textColor: "text-green-600" };
};

export default function CreateAccount({ onSignIn }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showCountry, setShowCountry] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef([]);

  const [devMode, setDevMode] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");

  const [emailExists, setEmailExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const emailCheckRef = useRef(null);
  const phoneCheckRef = useRef(null);

  const strength = useMemo(() => getStrength(form.password), [form.password]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setInterval(() => setOtpTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [otpTimer]);

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const checkEmailUniqueness = (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    emailCheckRef.current = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const { data } = await api.post("/auth/check-user", { email: email.trim().toLowerCase() });
        setEmailExists(data.emailExists);
        if (data.emailExists) setErrors((p) => ({ ...p, email: "This email is already registered" }));
      } catch { /* ignore */ }
      setCheckingEmail(false);
    }, 600);
  };

  const checkPhoneUniqueness = (phone) => {
    if (!phone || phone.length < 10) return;
    if (phoneCheckRef.current) clearTimeout(phoneCheckRef.current);
    phoneCheckRef.current = setTimeout(async () => {
      setCheckingPhone(true);
      try {
        const { data } = await api.post("/auth/check-user", { phone: `${country.dial}${phone}` });
        setPhoneExists(data.phoneExists);
        if (data.phoneExists) setErrors((p) => ({ ...p, phone: "This phone number is already registered" }));
      } catch { /* ignore */ }
      setCheckingPhone(false);
    }, 600);
  };

  const validate = () => {
    const e = {};
    const name = form.fullName.trim().replace(/\s+/g, " ");
    if (!name || name.length < 3) e.fullName = "Full name must be at least 3 characters";
    else if (!/^[A-Za-z\s]+$/.test(name)) e.fullName = "Letters and spaces only";
    else if (name.length > 50) e.fullName = "Max 50 characters";

    const email = form.email.trim().toLowerCase();
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email address.";
    else if (emailExists) e.email = "This email is already registered";

    if (!form.phone || !/^\d{10}$/.test(form.phone)) e.phone = "Enter a valid 10-digit phone number";
    else if (phoneExists) e.phone = "This phone number is already registered";
    else if (!phoneVerified) e.phone = "Please verify your phone number first";

    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])/.test(form.password))
      e.password = "Must include uppercase, lowercase, number & special character";

    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sendOTP = async () => {
    if (!form.phone || !/^\d{7,}$/.test(form.phone)) {
      setErrors((p) => ({ ...p, phone: "Enter a valid phone number first" }));
      return;
    }
    setOtpLoading(true);
    setOtpError("");
    try {
      const payload = { phone: `${country.dial}${form.phone}`, devMode };
      const emailVal = form.email.trim().toLowerCase();
      if (emailVal) payload.email = emailVal;
      const res = await api.post("/auth/send-otp", payload);
      if (import.meta.env.DEV && res.data.otp) {
        const digits = res.data.otp.toString().split("");
        setOtp(digits);
      }
      setOtpSent(true);
      setOtpTimer(60);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send OTP";
      setOtpError(msg);
      setErrors((p) => ({ ...p, phone: msg }));
      if (msg.toLowerCase().includes("email")) setErrors((p) => ({ ...p, email: msg }));
    }
    setOtpLoading(false);
  };

  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Enter all 6 digits"); return; }
    setVerifyLoading(true);
    setOtpError("");
    try {
      await api.post("/auth/verify-otp", { phone: `${country.dial}${form.phone}`, otp: code });
      setPhoneVerified(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP");
    }
    setVerifyLoading(false);
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        fullName: form.fullName.trim().replace(/\s+/g, " "),
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        countryCode: country.dial,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      const message = res.data.message || "Account created successfully! Redirecting to login...";
      setSuccess(message);
      const delay = res.data.message && res.data.message.includes("could not be delivered") ? 4000 : 2000;
      setTimeout(() => {
        navigate(`/signin${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`);
      }, delay);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Registration failed. Try again.");
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    setSubmitError("");
    try {
      const res = await api.post("/auth/google", { idToken });
      localStorage.setItem("accessToken", res.data.accessToken);
      setSuccess(res.data.isNewUser ? "Account created! Redirecting..." : "Signed in! Redirecting...");
      setTimeout(() => navigate(redirectTo), 1500);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Google sign-in failed");
    }
    setLoading(false);
  };

  const nameValid = form.fullName.trim().length >= 3 && /^[A-Za-z\s]+$/.test(form.fullName);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  return (
    <main className="min-h-screen bg-[#fbf5ef] text-[#17120f] antialiased">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_1fr]">
        <section className="hidden items-center justify-center bg-black lg:flex">
          <img src={machinichiImage} alt="Machinichi" className="w-full max-w-[435px] object-contain" />
        </section>

        <section className="flex min-h-screen items-center justify-center overflow-y-auto bg-[#fbf2e9] px-4 py-8 sm:px-8 lg:px-14">
          <div className="w-full max-w-[500px] rounded-[22px] border border-[#ead7bf] bg-[#fffdf8]/90 px-6 py-7 shadow-[0_20px_50px_rgba(80,48,20,0.08)] sm:px-7">
            <h2 className="font-serif text-[30px] font-black leading-tight tracking-[-0.04em] text-[#061d3b]">Create Account</h2>
            <p className="mt-1 text-[14px] text-[#6f7b91]">Start your performance journey today.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              <Field label="Full Name" error={errors.fullName}>
                <input
                  className={inputCls(errors.fullName)}
                  placeholder="e.g. John Doe"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " "))}
                />
                {form.fullName && !nameValid && <p className="mt-1 text-[11px] text-[#9b958f]">3-50 characters, letters and spaces only</p>}
              </Field>

              <Field label="Email Address" error={errors.email}>
                <div className={rowCls(errors.email)}>
                  <Mail size={17} className="shrink-0 text-[#9b958f]" />
                  <input
                    className="ml-2 flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="example@email.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => { setField("email", e.target.value); setEmailExists(false); checkEmailUniqueness(e.target.value); }}
                  />
                  {form.email && emailValid && !emailExists && <CheckCircle2 size={16} className="text-green-500" />}
                  {checkingEmail && <Loader2 size={14} className="animate-spin text-[#9b958f]" />}
                </div>
              </Field>

              <Field label="Phone Number" error={errors.phone}>
                <div className={rowCls(errors.phone, phoneVerified ? "border-green-400" : "")}>
                  <div className="relative">
                    <button type="button" onClick={() => setShowCountry((p) => !p)}
                      className="flex items-center gap-1.5 pr-3 border-r border-[#ded4cb] text-[13px] font-bold text-[#526784]"
                    >
                      <img src={flagUrl(country.code)} className="h-4 w-6 rounded object-cover" alt={country.name} />
                      <span>{country.dial}</span>
                      <ChevronDown size={12} className={`transition ${showCountry ? "rotate-180" : ""}`} />
                    </button>
                    {showCountry && (
                      <div className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-[#ded4cb] bg-white shadow-xl overflow-y-auto max-h-52">
                        {COUNTRIES.map((c) => (
                          <button key={c.code} type="button"
                            onClick={() => {
                              setCountry(c);
                              setShowCountry(false);
                              setPhoneVerified(false);
                              setOtpSent(false);
                              setOtp(["", "", "", "", "", ""]);
                              setOtpError("");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-[#fbf2e9]"
                          >
                            <img src={flagUrl(c.code)} className="h-4 w-6 rounded object-cover" alt={c.name} />
                            <span className="font-semibold">{c.name}</span>
                            <span className="ml-auto text-[#9b958f]">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    className="ml-3 flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="9876543210"
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => {
                      setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10));
                      setPhoneVerified(false);
                      setOtpSent(false);
                      setOtp(["", "", "", "", "", ""]);
                      setOtpError("");
                      setPhoneExists(false);
                      checkPhoneUniqueness(e.target.value);
                    }}
                    disabled={phoneVerified}
                  />
                  {import.meta.env.DEV && (
                    <button type="button" onClick={() => setDevMode((d) => !d)}
                      title={devMode ? "Dev mode ON" : "Dev mode OFF"}
                      className={`ml-2 rounded-full px-2.5 py-1 text-[11px] font-black transition ${devMode ? "bg-amber-500 text-white ring-2 ring-amber-400/50" : "bg-[#e8e2da] text-[#7a6e65]"}`}
                    >Dev</button>
                  )}

                  {phoneVerified ? (
                    <span className="ml-2 flex items-center gap-1 text-[12px] font-bold text-green-600">
                      <ShieldCheck size={15} /> Verified
                    </span>
                  ) : (
                    !form.phone || form.phone.length < 10 ? null : (
                      <button type="button" onClick={sendOTP} disabled={otpLoading || otpTimer > 0 || checkingPhone || phoneExists}
                        className="ml-2 rounded-full bg-[#ad4d00] px-3 py-1 text-[12px] font-black text-white disabled:opacity-50"
                      >
                        {checkingPhone ? <Loader2 size={12} className="animate-spin" /> : otpLoading ? <Loader2 size={12} className="animate-spin" /> : otpTimer > 0 ? `${otpTimer}s` : "Send OTP"}
                      </button>
                    )
                  )}
                </div>

                {otpSent && !phoneVerified && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      {otp.map((d, i) => (
                        <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                          type="text" inputMode="numeric" maxLength={1} value={d}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKey(i, e)}
                          className="h-11 w-11 rounded-xl border border-[#ded4cb] bg-white text-center text-[18px] font-bold text-[#17120f] outline-none focus:border-[#ad4d00] focus:ring-2 focus:ring-[#ad4d00]/20"
                        />
                      ))}
                    </div>
                    {otpError && <p className="mt-1.5 text-[12px] text-red-600">{otpError}</p>}
                    <div className="mt-2.5 flex items-center gap-3">
                      <button type="button" onClick={verifyOTP} disabled={verifyLoading}
                        className="rounded-full bg-[#ad4d00] px-5 py-2 text-[13px] font-black text-white disabled:opacity-60"
                      >
                        {verifyLoading ? <Loader2 size={14} className="animate-spin" /> : "Verify OTP"}
                      </button>
                      {otpTimer === 0 ? (
                        <button type="button" onClick={sendOTP} className="text-[12px] font-semibold text-[#ad4d00] underline">Resend OTP</button>
                      ) : (
                        <span className="text-[12px] text-[#9b958f]">Resend in {otpTimer}s</span>
                      )}
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Password" error={errors.password}>
                <div className={rowCls(errors.password)}>
                  <input
                    className="flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="Enter password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPwd((p) => !p)} className="ml-2 text-[#9b958f]">
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-[12px] font-semibold">
                      <span>Strength:</span>
                      <span className={strength.textColor}>{strength.label}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[#dfd3ca] overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Confirm Password" error={errors.confirmPassword}>
                <div className={rowCls(errors.confirmPassword)}>
                  <input
                    className="flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="Confirm password"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirm((p) => !p)} className="ml-2 text-[#9b958f]">
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <p className="mt-1 text-[12px] font-semibold text-green-600">✓ Passwords match</p>
                )}
              </Field>

              <label className="flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#ded4cb] text-[#a68135] focus:ring-[#a68135]"
                />
                <span className="text-[13px] text-[#25211d]">
                  I agree to the{" "}
                  <a href="/terms-conditions" className="font-semibold text-[#a68135] underline hover:text-[#7d5f20]">Terms & Conditions</a>
                  {" "}and{" "}
                  <a href="/privacy-policy" className="font-semibold text-[#a68135] underline hover:text-[#7d5f20]">Privacy Policy</a>
                </span>
              </label>

              {submitError && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">{submitError}</p>}
              {success && <p className="rounded-xl bg-green-50 px-4 py-3 text-[13px] font-semibold text-green-600">{success}</p>}

              <button type="submit" disabled={loading || !termsAccepted}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#a68135] text-[16px] font-black text-white shadow-[0_12px_24px_rgba(120,88,30,0.22)] transition hover:-translate-y-0.5 hover:bg-[#98762f] disabled:opacity-60"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Creating Account...</> : "Create Account"}
                <ArrowRight size={20} strokeWidth={2.5} />
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#ead7bf]" /></div>
              <div className="relative flex justify-center"><span className="bg-[#fffdf8] px-3 text-[13px] font-semibold text-[#9b958f]">or continue with</span></div>
            </div>

            <GoogleSignInButton onSuccess={handleGoogleSuccess} label="Continue with Google" />

            <p className="mt-5 text-center text-[14px] text-[#25211d]">
              Already have an account?{" "}
              <button onClick={() => navigate(`/signin${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`)} className="font-black text-[#a68135] hover:text-[#7d5f20]">Log in</button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-black uppercase tracking-wide text-[#6f7281]">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `h-[44px] w-full rounded-[12px] border ${err ? "border-red-400" : "border-[#ded4cb]"} bg-white/50 px-4 text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa] focus:border-[#c9b8aa] focus:bg-white/80`;

const rowCls = (err, extra = "") =>
  `flex h-[44px] items-center rounded-[12px] border ${err ? "border-red-400" : "border-[#ded4cb]"} ${extra} bg-white/50 px-4 transition focus-within:border-[#c9b8aa] focus-within:bg-white/80`;
