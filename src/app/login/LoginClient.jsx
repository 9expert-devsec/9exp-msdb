"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function safeNextPath(raw, fallback) {
  const s = String(raw || "").trim();
  if (!s) return fallback;

  // allow only internal relative paths
  if (s.startsWith("/") && !s.startsWith("//")) {
    // optional: restrict to admin only
    if (s.startsWith("/admin")) return s;
    return fallback;
  }
  return fallback;
}

export default function LoginClient({ nextPath = "/admin/dashboard" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNextPath(sp.get("next"), nextPath);

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
    if (loading) return;

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
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");

      router.replace(next);
      router.refresh();
    } catch (err) {
      setBanner(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "w-full rounded-xl bg-white/5 px-3 py-2 ring-1 focus:outline-none transition-shadow";
  const okRing = "ring-white/10 focus:ring-emerald-400/40";
  const errRing =
    "ring-red-500/50 focus:ring-red-400/50 shadow-[0_0_0_3px_rgba(248,113,113,0.25)]";

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050b24]">
      {/* Background: soft gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-24 -right-24 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl bg-slate-900/60 backdrop-blur ring-1 ring-white/10 shadow-2xl">
            <div className="p-6 sm:p-7">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl" />
                  <div className="relative h-14 w-14 rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
                    <img
                      src="/logo-9x.png"
                      alt="9Expert logo"
                      className="h-10 w-10 object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-white">Sign in</h1>
                  <p className="mt-1 text-sm text-slate-300/80">
                    Restricted access
                  </p>
                </div>
              </div>

              {/* Banner error */}
              {banner && (
                <div
                  className="mt-5 flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                  aria-live="polite"
                >
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

              <div className="my-5 h-px bg-white/10" />

              <form noValidate onSubmit={onSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm text-slate-200/90 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    className={cx(
                      inputBase,
                      touched.email && errors.email ? errRing : okRing,
                    )}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched.email) {
                        setErrors((s) => ({
                          ...s,
                          email: validate({ email: e.target.value, password })
                            .email,
                        }));
                      }
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
                    autoComplete="email"
                  />
                  {touched.email && errors.email && (
                    <ErrorLine id="email-err">{errors.email}</ErrorLine>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm text-slate-200/90 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      className={cx(
                        inputBase,
                        "pr-10",
                        touched.password && errors.password ? errRing : okRing,
                      )}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) {
                          setErrors((s) => ({
                            ...s,
                            password: validate({
                              email,
                              password: e.target.value,
                            }).password,
                          }));
                        }
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
                        touched.password && errors.password
                          ? "pwd-err"
                          : undefined
                      }
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      aria-pressed={showPwd}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      title={showPwd ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
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
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60
                             bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500
                             ring-1 ring-white/10 shadow-lg shadow-emerald-500/10
                             focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-5 text-center text-xs text-slate-400">
                Protected area • For authorized staff only
              </div>
            </div>
          </div>

          {/* Footer small */}
          <div className="mt-4 text-center text-xs text-white/30">
            © {new Date().getFullYear()} 9Expert Training
          </div>
        </div>
      </div>
    </div>
  );
}
