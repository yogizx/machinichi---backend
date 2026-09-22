import { useState, useMemo } from "react";
import { Eye, EyeOff, ArrowRight, Mail, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GoogleSignInButton from "../components/GoogleSignInButton";

import api from "../services/api";

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

export default function SignIn({ onSignIn }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");
  const redirectTo = searchParams.get("redirect") || "/";

  const [view, setView] = useState(resetToken ? "reset" : "login");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPwd, setConfirmNewPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strength = useMemo(() => getStrength(newPassword), [newPassword]);

  const validations = useMemo(
    () => passwordRules.map((r) => ({ ...r, valid: r.test(newPassword) })),
    [newPassword],
  );
  const isPasswordValid = validations.every((r) => r.valid);
  const pwdMatch = newPassword.length > 0 && confirmNewPwd.length > 0 && newPassword === confirmNewPwd;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!identifier || !password) { setError("Email/phone and password are required"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { identifier, password });
      localStorage.setItem("accessToken", res.data.accessToken);
      onSignIn?.();
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials.");
    }
    setLoading(false);
  };

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
      setSuccess("If that email exists, a reset link has been sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email");
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!isPasswordValid) { setError("Password does not meet requirements"); return; }
    if (newPassword !== confirmNewPwd) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token: resetToken, password: newPassword, confirmPassword: confirmNewPwd,
      });
      setSuccess("Password reset successfully!");
      setTimeout(() => { setView("login"); navigate("/signin"); }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Link may have expired.");
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/google", { idToken });
      localStorage.setItem("accessToken", res.data.accessToken);
      onSignIn?.();
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed");
    }
    setLoading(false);
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#efe2d5] px-4 py-8 text-[#15110f] antialiased"
      style={{
        backgroundImage: "linear-gradient(0deg, rgba(248,241,235,0.88), rgba(248,241,235,0.88)), url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=2200&q=90')",
        backgroundPosition: "center", backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-white/20 backdrop-blur-[2px]" />

      <section className="w-full max-w-[430px]">
        <header className="mb-6 text-center">
          <h1 className="font-serif text-[36px] font-black leading-none tracking-[-0.035em]">Machinichi</h1>
          <p className="mt-2 text-[14px] text-[#5a4f48]">The Modern General Store</p>
        </header>

        <div className="w-full overflow-hidden rounded-[16px] border border-[#dfd3ca] bg-[#f3ece7]/95 shadow-[0_16px_40px_rgba(72,48,34,0.14)]">
          <div className="px-7 py-6">

            {view === "login" && (
              <>
                <h2 className="font-serif text-[26px] font-black">Welcome Back</h2>
                <p className="mt-1 text-[13px] text-[#7a6f67]">Sign in with email or phone number</p>

                <form onSubmit={handleLogin} className="mt-5 space-y-4" noValidate>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#5a4f48]">Email or Phone</label>
                    <div className="flex h-[48px] items-center rounded-[10px] border border-[#c9bdb5] bg-[#f7f0ec]/70 px-4">
                      {identifier.includes("@") || identifier === "" ? (
                        <Mail size={17} className="shrink-0 text-[#9d948d]" />
                      ) : (
                        <Phone size={17} className="shrink-0 text-[#9d948d]" />
                      )}
                      <input
                        className="ml-3 flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                        placeholder="email@example.com or 9876543210"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wide text-[#5a4f48]">Password</label>
                      <button type="button" onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}
                        className="text-[12px] font-semibold text-[#9b4518] hover:text-[#74300d]">Forgot Password?</button>
                    </div>
                    <div className="flex h-[48px] items-center rounded-[10px] border border-[#c9bdb5] bg-[#f7f0ec]/70 px-4">
                      <input
                        className="flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                        placeholder="Enter password"
                        type={showPwd ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPwd((p) => !p)} className="ml-2 text-[#9d948d]">
                        {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-[#ad4d00] text-[17px] font-black text-white shadow-[0_12px_20px_rgba(146,68,9,0.22)] transition hover:-translate-y-0.5 hover:bg-[#9d4500] disabled:opacity-60"
                  >
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Signing In...</> : "SIGN IN"}
                    <ArrowRight size={20} strokeWidth={2.6} />
                  </button>
                </form>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#dfd3ca]" /></div>
                  <div className="relative flex justify-center"><span className="bg-[#f3ece7] px-3 text-[12px] font-semibold text-[#9d948d]">or continue with</span></div>
                </div>

                <GoogleSignInButton onSuccess={handleGoogleSuccess} />
              </>
            )}

            {view === "forgot" && (
              <>
                <button onClick={() => { setView("login"); setError(""); setSuccess(""); }} className="mb-4 text-[13px] font-semibold text-[#9b4518] hover:text-[#74300d]">
                  ← Back to Login
                </button>
                <h2 className="font-serif text-[24px] font-black">Forgot Password</h2>
                <p className="mt-1 text-[13px] text-[#7a6f67]">Enter your registered email address.</p>

                <form onSubmit={handleForgot} className="mt-5 space-y-4" noValidate>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#5a4f48]">Email Address</label>
                    <div className="flex h-[48px] items-center rounded-[10px] border border-[#c9bdb5] bg-[#f7f0ec]/70 px-4">
                      <Mail size={17} className="shrink-0 text-[#9d948d]" />
                      <input
                        className="ml-3 flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                        placeholder="example@gmail.com"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      />
                    </div>
                  </div>

                  {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{error}</p>}
                  {success && <p className="rounded-xl bg-green-50 px-4 py-2.5 text-[13px] font-semibold text-green-600">{success}</p>}

                  {!success && (
                    <button type="submit" disabled={loading}
                      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#ad4d00] text-[16px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#9d4500] disabled:opacity-60"
                    >
                      {loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : "Send Reset Link"}
                      <ArrowRight size={19} strokeWidth={2.5} />
                    </button>
                  )}
                </form>
              </>
            )}

            {view === "reset" && (
              <>
                <h2 className="font-serif text-[24px] font-black">Set New Password</h2>
                <p className="mt-1 text-[13px] text-[#7a6f67]">Enter a strong new password.</p>

                <form onSubmit={handleReset} className="mt-5 space-y-4" noValidate>
                  {["New Password", "Confirm Password"].map((lbl, idx) => {
                    const val = idx === 0 ? newPassword : confirmNewPwd;
                    const setVal = idx === 0 ? setNewPassword : setConfirmNewPwd;
                    const show = idx === 0 ? showNew : showConfirm;
                    const toggle = idx === 0 ? () => setShowNew((p) => !p) : () => setShowConfirm((p) => !p);
                    return (
                      <div key={lbl}>
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#5a4f48]">{lbl}</label>
                        <div className="flex h-[48px] items-center rounded-[10px] border border-[#c9bdb5] bg-[#f7f0ec]/70 px-4">
                          <input
                            className="flex-1 bg-transparent text-[15px] text-[#312b26] outline-none placeholder:text-[#b8b0aa]"
                            placeholder={lbl}
                            type={show ? "text" : "password"}
                            value={val}
                            onChange={(e) => { setVal(e.target.value); setError(""); }}
                          />
                          <button type="button" onClick={toggle} className="ml-2 text-[#9d948d]">
                            {show ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {newPassword && (
                    <div>
                      <div className="flex items-center gap-2 text-[12px] font-semibold mb-1">
                        <span>Password strength:</span>
                        <span className={strength.textColor}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#dfd3ca] overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                      </div>
                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {validations.map((r) => (
                          <div key={r.label} className={`flex items-center gap-1.5 text-[12px] font-medium ${r.valid ? "text-green-700" : "text-[#7a6f67]"}`}>
                            <CheckCircle2 size={13} className={r.valid ? "text-green-500" : "text-[#b8b0aa]"} />
                            {r.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{error}</p>}
                  {success && <p className="rounded-xl bg-green-50 px-4 py-2.5 text-[13px] font-semibold text-green-600">{success}</p>}

                  {!success && (
                    <button type="submit" disabled={loading || !isPasswordValid || !pwdMatch}
                      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#ad4d00] text-[16px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#9d4500] disabled:cursor-not-allowed disabled:bg-[#c9bdb5] disabled:shadow-none disabled:hover:translate-y-0"
                    >
                      {loading ? <><Loader2 size={18} className="animate-spin" /> Resetting...</> : "Reset Password"}
                      <ArrowRight size={19} strokeWidth={2.5} />
                    </button>
                  )}
                </form>
              </>
            )}
          </div>

          <div className="border-t border-[#dfd6cf] bg-[#eee6e1]/80 px-6 py-3 text-center text-[13px] text-[#2d2824]">
            Don&apos;t have an account?{" "}
            <button onClick={() => navigate(`/create-account${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`)} className="font-black text-[#0f0c0a]">Create Account</button>
          </div>
        </div>

        <footer className="mt-5 flex justify-center gap-6 text-[12px] text-[#7e766f]">
          <a href="#privacy" className="hover:text-[#3b312b]">Privacy Policy</a>
          <a href="#terms" className="hover:text-[#3b312b]">Terms</a>
          <a href="#help" className="hover:text-[#3b312b]">Help</a>
        </footer>
      </section>
    </main>
  );
}
