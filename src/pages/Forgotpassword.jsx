import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Mail, ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

const passwordRules = [
  { label: "Minimum 8 characters", test: (v) => v.length >= 8 },
  { label: "At least 1 uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "At least 1 lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "At least 1 number", test: (v) => /\d/.test(v) },
  { label: "At least 1 special character", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
  { label: "No spaces", test: (v) => !/\s/.test(v) },
];

function Forgotpassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [view, setView] = useState(resetToken ? "reset" : "forgot");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const validations = useMemo(
    () => passwordRules.map((r) => ({ ...r, valid: r.test(newPassword) })),
    [newPassword],
  );
  const isPasswordValid = validations.every((r) => r.valid);
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const canReset = isPasswordValid && passwordsMatch;

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSuccess("If a Machinichi account exists with that email, a password reset link has been sent.");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to send reset email. Please try again.";
      setError(msg);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSuccess("A new reset link has been sent to your email.");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Too many requests. Please wait before trying again.");
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!canReset) return;
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token: resetToken,
        password: newPassword,
        confirmPassword,
      });
      setSuccess("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => navigate("/signin"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. The link may have expired.");
    }
    setLoading(false);
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#efe2d5] px-4 py-6 text-[#15110f] antialiased"
      style={{
        backgroundImage: "linear-gradient(0deg, rgba(248,241,235,0.84), rgba(248,241,235,0.84)), url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=2200&q=90')",
        backgroundPosition: "center", backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-white/20 backdrop-blur-[2px]" />
      <section className="flex w-full max-w-[460px] flex-col items-center">
        <header className="mb-4 text-center">
          <h1 className="font-serif text-[34px] font-black leading-none tracking-[-0.035em]">Machinichi</h1>
          <p className="mt-2 text-[15px] text-[#2a2521]">Secure password recovery</p>
        </header>

        <div className="w-full overflow-hidden rounded-[13px] border border-[#dfd3ca] bg-[#f3ece7]/90 shadow-[0_14px_35px_rgba(72,48,34,0.12)]">
          <div className="px-6 py-5">
            <button className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase text-[#7c3b12] hover:text-[#52250a]" onClick={() => navigate("/signin")} type="button">
              <ArrowLeft size={17} strokeWidth={2.4} /> Back to sign in
            </button>

            {view === "reset" ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ad4d00]/10 text-[#ad4d00]">
                    <KeyRound size={24} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="font-serif text-[26px] font-black leading-none">Reset Password</h2>
                    <p className="mt-2 text-[14px] leading-6 text-[#5f554e]">Create a strong password for your account.</p>
                  </div>
                </div>

                <form className="mt-6" onSubmit={handleReset}>
                  {["New Password", "Confirm Password"].map((lbl, idx) => {
                    const val = idx === 0 ? newPassword : confirmPassword;
                    const setVal = idx === 0 ? setNewPassword : setConfirmPassword;
                    const show = idx === 0 ? showNew : showConfirm;
                    const toggle = idx === 0 ? () => setShowNew((p) => !p) : () => setShowConfirm((p) => !p);
                    return (
                      <div key={lbl} className={idx === 1 ? "mt-4" : ""}>
                        <label className="block text-[12px] font-black uppercase text-[#3d3834]">{lbl}</label>
                        <div className="mt-2 flex h-[50px] items-center rounded-[8px] border border-[#c9bdb5] bg-[#f7f0ec]/70 px-4 focus-within:border-[#ad4d00]">
                          <input
                            className="ml-1 flex-1 bg-transparent text-[16px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                            placeholder={lbl}
                            type={show ? "text" : "password"}
                            value={val}
                            onChange={(e) => setVal(e.target.value)}
                          />
                          <button type="button" onClick={toggle} className="ml-2 text-[#9d948d]">
                            {show ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-4 grid gap-2 rounded-[10px] border border-[#ded4cb] bg-white/48 p-4 sm:grid-cols-2">
                    {validations.map((r) => (
                      <div key={r.label} className={`flex items-center gap-2 text-[13px] font-semibold ${r.valid ? "text-[#24703c]" : "text-[#7c766f]"}`}>
                        <CheckCircle2 size={16} className={r.valid ? "text-[#24703c]" : "text-[#b8b0aa]"} strokeWidth={2.4} />
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  {error && <p className="mt-3 rounded-[8px] bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{error}</p>}
                  {success && <p className="mt-3 rounded-[8px] border border-[#b7d7bd] bg-[#eef8ef] px-4 py-3 text-[14px] font-black text-[#24703c]">{success}</p>}

                  {!success && (
                    <button type="submit" disabled={loading || !canReset}
                      className="mt-5 flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#ad4d00] text-[16px] font-black text-white shadow-[0_12px_20px_rgba(146,68,9,0.22)] transition hover:-translate-y-0.5 hover:bg-[#9d4500] disabled:cursor-not-allowed disabled:bg-[#c9bdb5] disabled:shadow-none"
                    >
                      {loading ? <><Loader2 size={18} className="animate-spin" /> Resetting...</> : "Reset Password"}
                      <ArrowRight size={21} strokeWidth={2.6} />
                    </button>
                  )}
                </form>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ad4d00]/10 text-[#ad4d00]">
                    <ShieldCheck size={24} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="font-serif text-[26px] font-black leading-none">Forgot Password?</h2>
                    <p className="mt-2 text-[14px] leading-6 text-[#5f554e]">
                      Enter your email address and we'll send a secure link to reset your password.
                    </p>
                  </div>
                </div>

                <form className="mt-6" onSubmit={handleForgot}>
                  <label className="block text-[12px] font-black uppercase text-[#3d3834]">Email Address</label>
                  <div className="mt-2 flex h-[50px] items-center rounded-[8px] border border-[#c9bdb5] bg-[#f7f0ec]/70 px-4 focus-within:border-[#ad4d00]">
                    <Mail size={20} strokeWidth={1.8} />
                    <input
                      className="ml-3 min-w-0 flex-1 bg-transparent text-[16px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                      placeholder="example@gmail.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {error && <p className="mt-3 text-[14px] font-semibold text-[#9b4518]">{error}</p>}
                  {success && (
                    <div>
                      <p className="mt-3 rounded-[8px] border border-[#b7d7bd] bg-[#eef8ef] px-4 py-3 text-[14px] font-semibold text-[#24703c]">{success}</p>
                      <button type="button" onClick={handleResend} disabled={loading || resendCooldown > 0}
                        className="mt-3 text-[13px] font-semibold text-[#ad4d00] underline hover:text-[#9d4500] disabled:text-[#b8b0aa] disabled:no-underline"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : loading ? "Sending..." : "Resend reset link"}
                      </button>
                    </div>
                  )}

                  {!success && (
                    <button type="submit" disabled={loading}
                      className="mt-5 flex h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#ad4d00] px-7 text-[16px] font-black text-white shadow-[0_12px_20px_rgba(146,68,9,0.22)] transition hover:-translate-y-0.5 hover:bg-[#9d4500] disabled:opacity-60"
                    >
                      {loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : "Send Reset Link"}
                      <ArrowRight size={21} strokeWidth={2.6} />
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Forgotpassword;
