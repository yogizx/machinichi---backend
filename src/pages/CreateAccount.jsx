import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Mail, ArrowRight, ChevronDown, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import machinichiImage from "./images/machinichi.png";
import GoogleSignInButton from "../components/GoogleSignInButton";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMPTY_OTP = ["", "", "", "", "", ""];

const formatClock = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

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

  // E-mail OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [emailVerified, setEmailVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0); // seconds until another OTP may be requested
  const [otpExpiry, setOtpExpiry] = useState(0); // seconds the current OTP is still valid (5 minutes)
  const [otpError, setOtpError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const otpRefs = useRef([]);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");

  // "Is this e-mail / phone already registered?" - checked against the database while typing.
  const [emailExists, setEmailExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false); // checked and NOT registered before
  const [phoneAvailable, setPhoneAvailable] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const emailCheckRef = useRef(null);
  const phoneCheckRef = useRef(null);
  const latestEmailRef = useRef("");
  const latestPhoneRef = useRef("");

  const timersRunning = resendTimer > 0 || otpExpiry > 0;
  useEffect(() => {
    if (!timersRunning) return undefined;
    const t = setInterval(() => {
      setResendTimer((s) => (s > 0 ? s - 1 : 0));
      setOtpExpiry((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [timersRunning]);

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const resetOtpFlow = () => {
    setOtpSent(false);
    setOtp(EMPTY_OTP);
    setOtpError("");
    setOtpInfo("");
    setResendTimer(0);
    setOtpExpiry(0);
  };

  const checkEmailUniqueness = (rawEmail) => {
    const email = rawEmail.trim().toLowerCase();
    latestEmailRef.current = email;
    if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    setEmailAvailable(false);
    if (!EMAIL_RE.test(email)) { setCheckingEmail(false); return; }
    setCheckingEmail(true);
    emailCheckRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post("/auth/check-user", { email });
        if (latestEmailRef.current !== email) return; // the user kept typing: ignore this answer
        setEmailExists(!!data.emailExists);
        setEmailAvailable(!data.emailExists);
        if (data.emailExists) setErrors((p) => ({ ...p, email: "This email is already registered" }));
      } catch { /* the server checks again when the account is created */ }
      if (latestEmailRef.current === email) setCheckingEmail(false);
    }, 500);
  };

  const checkPhoneUniqueness = (digits, dial) => {
    const phone = `${dial}${digits}`;
    latestPhoneRef.current = phone;
    if (phoneCheckRef.current) clearTimeout(phoneCheckRef.current);
    setPhoneAvailable(false);
    if (!/^\d{10}$/.test(digits)) { setCheckingPhone(false); return; }
    setCheckingPhone(true);
    phoneCheckRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post("/auth/check-user", { phone });
        if (latestPhoneRef.current !== phone) return;
        setPhoneExists(!!data.phoneExists);
        setPhoneAvailable(!data.phoneExists);
        if (data.phoneExists) setErrors((p) => ({ ...p, phone: "This phone number is already registered" }));
      } catch { /* the server checks again when the account is created */ }
      if (latestPhoneRef.current === phone) setCheckingPhone(false);
    }, 500);
  };

  const validate = () => {
    const e = {};
    const name = form.fullName.trim().replace(/\s+/g, " ");
    if (!name || name.length < 3) e.fullName = "Full name must be at least 3 characters";
    else if (!/^[A-Za-z\s]+$/.test(name)) e.fullName = "Letters and spaces only";
    else if (name.length > 50) e.fullName = "Max 50 characters";

    const email = form.email.trim().toLowerCase();
    if (!email) e.email = "Email is required";
    else if (!EMAIL_RE.test(email)) e.email = "Please enter a valid email address.";
    else if (emailExists) e.email = "This email is already registered";
    else if (!emailVerified) e.email = "Please verify your email with the OTP first";

    if (!form.phone || !/^\d{10}$/.test(form.phone)) e.phone = "Enter a valid 10-digit phone number";
    else if (phoneExists) e.phone = "This phone number is already registered";

    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,128}$/.test(form.password))
      e.password = "Must include uppercase, lowercase, number & special character (no spaces)";

    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const emailValue = form.email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(emailValue);
  const phoneValid = /^\d{10}$/.test(form.phone);
  const phoneReady = phoneValid && phoneAvailable && !phoneExists && !checkingPhone;
  const emailReady = emailValid && emailAvailable && !emailExists && !checkingEmail;
  const canSendOtp = emailReady && phoneReady && !emailVerified;

  const sendOTP = async () => {
    if (!emailValid) { setErrors((p) => ({ ...p, email: "Enter a valid email address first" })); return; }
    if (!phoneValid) { setErrors((p) => ({ ...p, phone: "Enter your 10-digit phone number first" })); return; }
    if (emailExists || phoneExists) return;

    setOtpLoading(true);
    setOtpError("");
    setOtpInfo("");
    try {
      const { data } = await api.post("/auth/send-otp", { email: emailValue, phone: `${country.dial}${form.phone}` });
      setOtp(EMPTY_OTP);
      setOtpSent(true);
      setResendTimer(data.resendAfterSeconds ?? 60);
      setOtpExpiry(data.expiresInSeconds ?? 300);
      setOtpInfo(
        data.remainingSends === 0
          ? "OTP sent. This was your last OTP for now - you can request another one after 10 minutes."
          : `OTP sent to ${emailValue}. Please check your inbox (and spam folder).`
      );
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || "Failed to send OTP. Please try again.";
      setOtpError(msg);
      if (data?.field === "email") { setEmailExists(true); setEmailAvailable(false); setErrors((p) => ({ ...p, email: msg })); }
      if (data?.field === "phone") { setPhoneExists(true); setPhoneAvailable(false); setErrors((p) => ({ ...p, phone: msg })); }
      if (err.response?.status === 429 && data?.retryAfterSeconds) setResendTimer(data.retryAfterSeconds);
    }
    setOtpLoading(false);
  };

  const verifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Enter all 6 digits"); return; }
    setVerifyLoading(true);
    setOtpError("");
    try {
      await api.post("/auth/verify-otp", { email: emailValue, otp: code });
      setEmailVerified(true);
      setErrors((p) => ({ ...p, email: "" }));
      resetOtpFlow();
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
  const handleOtpPaste = (e) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = [...EMPTY_OTP];
    digits.split("").forEach((d, idx) => { next[idx] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        fullName: form.fullName.trim().replace(/\s+/g, " "),
        email: emailValue,
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
      const data = err.response?.data;
      setSubmitError(data?.errors?.[0]?.message || data?.message || "Registration failed. Try again.");
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
  const passwordsMatch = form.confirmPassword.length > 0 && form.password === form.confirmPassword;

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
                  autoComplete="name"
                  maxLength={50}
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " "))}
                />
                {form.fullName && !nameValid && <p className="mt-1 text-[11px] text-[#9b958f]">3-50 characters, letters and spaces only</p>}
              </Field>

              <Field label="Email Address" error={errors.email}>
                <div className={rowCls(errors.email, emailVerified || (emailAvailable && !emailExists) ? "border-green-400" : "")}>
                  <Mail size={17} className="shrink-0 text-[#9b958f]" />
                  <input
                    className="ml-2 flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="example@email.com"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={form.email}
                    disabled={emailVerified}
                    onChange={(e) => {
                      setField("email", e.target.value);
                      setEmailExists(false);
                      resetOtpFlow();
                      checkEmailUniqueness(e.target.value);
                    }}
                  />
                  {checkingEmail && <Loader2 size={14} className="animate-spin text-[#9b958f]" />}
                  {!checkingEmail && (emailVerified || (emailAvailable && !emailExists)) && (
                    <span className="ml-2 flex items-center gap-1 text-[12px] font-bold text-green-600" title="This email has no account yet">
                      <ShieldCheck size={15} /> Verified
                    </span>
                  )}
                </div>

                {emailVerified ? (
                  <div className="mt-1.5 flex items-center gap-3">
                    <p className="text-[12px] font-semibold text-green-600">✓ Email verified with OTP</p>
                    <button
                      type="button"
                      onClick={() => { setEmailVerified(false); resetOtpFlow(); }}
                      className="text-[12px] font-semibold text-[#ad4d00] underline"
                    >
                      Change email
                    </button>
                  </div>
                ) : (
                  emailReady && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={sendOTP}
                        disabled={!canSendOtp || otpLoading || resendTimer > 0}
                        className="rounded-full bg-[#ad4d00] px-4 py-1.5 text-[12px] font-black text-white disabled:opacity-50"
                      >
                        {otpLoading ? <Loader2 size={12} className="animate-spin" /> : resendTimer > 0 ? `Resend in ${resendTimer}s` : otpSent ? "Resend OTP" : "Send OTP"}
                      </button>
                      {!phoneReady && <span className="text-[11px] text-[#9b958f]">Enter a valid phone number below to receive the OTP.</span>}
                    </div>
                  )
                )}

                {otpInfo && !emailVerified && <p className="mt-1.5 text-[12px] font-semibold text-green-700">{otpInfo}</p>}
                {otpError && !emailVerified && <p className="mt-1.5 text-[12px] font-semibold text-red-600">{otpError}</p>}

                {otpSent && !emailVerified && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      {otp.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => (otpRefs.current[i] = el)}
                          type="text"
                          inputMode="numeric"
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKey(i, e)}
                          onPaste={handleOtpPaste}
                          aria-label={`OTP digit ${i + 1}`}
                          className="h-11 w-11 rounded-xl border border-[#ded4cb] bg-white text-center text-[18px] font-bold text-[#17120f] outline-none focus:border-[#ad4d00] focus:ring-2 focus:ring-[#ad4d00]/20"
                        />
                      ))}
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={verifyOTP}
                        disabled={verifyLoading || otpExpiry === 0}
                        className="rounded-full bg-[#ad4d00] px-5 py-2 text-[13px] font-black text-white disabled:opacity-60"
                      >
                        {verifyLoading ? <Loader2 size={14} className="animate-spin" /> : "Verify OTP"}
                      </button>
                      {otpExpiry > 0 ? (
                        <span className="text-[12px] text-[#6f7281]">OTP valid for {formatClock(otpExpiry)}</span>
                      ) : (
                        <span className="text-[12px] font-semibold text-red-600">OTP expired - request a new one</span>
                      )}
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Phone Number" error={errors.phone}>
                <div className={rowCls(errors.phone, phoneAvailable && !phoneExists ? "border-green-400" : "")}>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountry((p) => !p)}
                      className="flex items-center gap-1.5 pr-3 border-r border-[#ded4cb] text-[13px] font-bold text-[#526784]"
                    >
                      <img src={flagUrl(country.code)} className="h-4 w-6 rounded object-cover" alt={country.name} />
                      <span>{country.dial}</span>
                      <ChevronDown size={12} className={`transition ${showCountry ? "rotate-180" : ""}`} />
                    </button>
                    {showCountry && (
                      <div className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-[#ded4cb] bg-white shadow-xl overflow-y-auto max-h-52">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountry(c);
                              setShowCountry(false);
                              setPhoneExists(false);
                              setErrors((p) => ({ ...p, phone: "" }));
                              checkPhoneUniqueness(form.phone, c.dial);
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
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setField("phone", digits);
                      setPhoneExists(false);
                      checkPhoneUniqueness(digits, country.dial);
                    }}
                  />
                  {checkingPhone && <Loader2 size={14} className="animate-spin text-[#9b958f]" />}
                  {!checkingPhone && phoneAvailable && !phoneExists && (
                    <span className="ml-2 flex items-center gap-1 text-[12px] font-bold text-green-600" title="This phone number has no account yet">
                      <ShieldCheck size={15} /> Verified
                    </span>
                  )}
                </div>
                {form.phone && !phoneValid && <p className="mt-1 text-[11px] text-[#9b958f]">Enter exactly 10 digits</p>}
              </Field>

              <Field label="Password" error={errors.password}>
                <div className={rowCls(errors.password)}>
                  <input
                    className="flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="Enter password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="new-password"
                    maxLength={128}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPwd((p) => !p)} className="ml-2 text-[#9b958f]" aria-label={showPwd ? "Hide password" : "Show password"}>
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={form.password} />
              </Field>

              <Field label="Confirm Password" error={errors.confirmPassword}>
                <div className={rowCls(errors.confirmPassword, passwordsMatch ? "border-green-400" : "")}>
                  <input
                    className="flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                    placeholder="Confirm password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    maxLength={128}
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                  />
                  {passwordsMatch && <CheckCircle2 size={19} className="ml-2 shrink-0 text-green-500" aria-label="Passwords match" />}
                  <button type="button" onClick={() => setShowConfirm((p) => !p)} className="ml-2 text-[#9b958f]" aria-label={showConfirm ? "Hide password" : "Show password"}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {passwordsMatch && <p className="mt-1 text-[12px] font-semibold text-green-600">Passwords match</p>}
                {form.confirmPassword && !passwordsMatch && <p className="mt-1 text-[12px] font-semibold text-red-600">Passwords do not match yet</p>}
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

              <button
                type="submit"
                disabled={loading || !termsAccepted}
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
