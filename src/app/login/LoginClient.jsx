"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/* helpers */
function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}
const ErrorLine = ({ children, id }) => (
  <div
    id={id}
    className="mt-1 flex items-start gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[12px] text-red-300"
  >
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
    <span>{children}</span>
  </div>
);

export default function LoginClient({ nextPath = "/admin/dashboard" }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [touched, setTouched] = useState({});

  function validate(fields = { email, password }) {
    const e = {};
    if (!fields.email?.trim()) e.email = "กรุณากรอกอีเมล";
    else if (!isValidEmail(fields.email)) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!fields.password?.trim()) e.password = "กรุณากรอกรหัสผ่าน";
    return e;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setTouched({ email: true, password: true });
    if (Object.keys(e).length) return;

    setBanner("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      router.replace(nextPath);
    } catch (err) {
      setBanner(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 ring-1 ring-white/10 p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-4">Sign in (Admin)</h1>

        {banner && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>{banner}</div>
          </div>
        )}

        <form noValidate onSubmit={onSubmit} className="space-y-3">
          {/* Email */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="text"
              className={[
                "w-full rounded-xl bg-white/5 px-3 py-2 ring-1 focus:outline-none transition-shadow",
                touched.email && errors.email
                  ? "ring-red-500/50 focus:ring-red-400/50 shadow-[0_0_0_3px_rgba(248,113,113,0.25)]"
                  : "ring-white/10 focus:ring-emerald-400/40",
              ].join(" ")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched.email)
                  setErrors((s) => ({
                    ...s,
                    email: validate({ email: e.target.value, password }).email,
                  }));
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, email: true }));
                setErrors((s) => ({
                  ...s,
                  email: validate({ email, password }).email,
                }));
              }}
              placeholder="admin@example.com"
              aria-invalid={!!(touched.email && errors.email)}
              aria-describedby={
                touched.email && errors.email ? "email-err" : undefined
              }
            />
            {touched.email && errors.email && (
              <ErrorLine id="email-err">{errors.email}</ErrorLine>
            )}
          </div>

          {/* Password + eye */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className={[
                  "w-full rounded-xl bg-white/5 px-3 py-2 pr-10 ring-1 focus:outline-none transition-shadow",
                  touched.password && errors.password
                    ? "ring-red-500/50 focus:ring-red-400/50 shadow-[0_0_0_3px_rgba(248,113,113,0.25)]"
                    : "ring-white/10 focus:ring-emerald-400/40",
                ].join(" ")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (touched.password)
                    setErrors((s) => ({
                      ...s,
                      password: validate({ email, password: e.target.value })
                        .password,
                    }));
                }}
                onBlur={() => {
                  setTouched((t) => ({ ...t, password: true }));
                  setErrors((s) => ({
                    ...s,
                    password: validate({ email, password }).password,
                  }));
                }}
                placeholder="••••••••"
                aria-invalid={!!(touched.password && errors.password)}
                aria-describedby={
                  touched.password && errors.password ? "pwd-err" : undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-pressed={showPwd}
                aria-label={showPwd ? "Hide password" : "Show password"}
                title={showPwd ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                {showPwd ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.09A10.94 10.94 0 0112 5c5.523 0 9.75 4.5 9.75 7s-4.227 7-9.75 7c-1.03 0-2.02-.14-2.95-.4M6.61 6.61C4.1 8.1 2.25 10.4 2.25 12s4.227 7 9.75 7" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2.25 12c0 1.6 4.227 7 9.75 7s9.75-5.4 9.75-7-4.227-7-9.75-7-9.75 5.4-9.75 7z" />
                    <circle cx="12" cy="12" r="3.25" />
                  </svg>
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <ErrorLine id="pwd-err">{errors.password}</ErrorLine>
            )}
          </div>

          <button
            className="w-full rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
