import { useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";

// One shared definition of "a good password" for sign-up and password reset.
// (The server enforces the same rules - this is only the live feedback.)
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter (a-z)", test: (v) => /[a-z]/.test(v) },
  { label: "One number (0-9)", test: (v) => /\d/.test(v) },
  { label: "One special character (!@#$%...)", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

export const isPasswordValid = (v) =>
  PASSWORD_RULES.every((r) => r.test(v)) && !/\s/.test(v) && v.length <= 128;

export const getPasswordStrength = (pwd) => {
  if (!pwd) return { label: "", pct: 0, color: "", textColor: "" };
  const passed = PASSWORD_RULES.filter((r) => r.test(pwd)).length;
  if (passed <= 2) return { label: "Weak", pct: 25, color: "bg-red-500", textColor: "text-red-600" };
  if (passed === 3) return { label: "Fair", pct: 50, color: "bg-orange-500", textColor: "text-orange-600" };
  if (passed === 4) return { label: "Good", pct: 75, color: "bg-yellow-500", textColor: "text-yellow-700" };
  if (pwd.length >= 12) return { label: "Very strong", pct: 100, color: "bg-emerald-600", textColor: "text-emerald-700" };
  return { label: "Strong", pct: 100, color: "bg-green-500", textColor: "text-green-600" };
};

export default function PasswordStrengthMeter({ password, showRules = true }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <span>Password strength:</span>
        <span className={strength.textColor}>{strength.label}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#dfd3ca]">
        <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
      </div>
      {showRules && (
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.label} className={`flex items-center gap-1.5 text-[12px] font-semibold ${ok ? "text-green-600" : "text-[#9b958f]"}`}>
                {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
