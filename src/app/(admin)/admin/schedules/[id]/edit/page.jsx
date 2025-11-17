"use client";
import { useEffect, useState } from "react";

export default function EditSchedulePage({ params }) {
  const { id } = params;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);

  // ค่าที่จะแก้
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("classroom");
  const [dates, setDates] = useState([]);       // ใช้คอมโพเนนท์ Calendar เดิมของคุณได้
  const [signupUrl, setSignupUrl] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/schedules/${id}`, { cache: "no-store" });
      const j = await r.json();
      setItem(j.item);
      setStatus(j.item.status);
      setType(j.item.type || "classroom");
      setDates((j.item.dates || []).map((d) => new Date(d).toISOString()));
      setSignupUrl(j.item.signup_url || "");
      setLoading(false);
    })();
  }, [id]);

  async function onSave() {
    const r = await fetch(`/api/admin/schedules/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        type,
        signup_url: signupUrl || undefined,
        dates, // ส่งเป็น ISO strings ให้ API อัปเดต
      }),
    });
    if (r.ok) {
      alert("อัปเดตรอบอบรมแล้ว");
      window.location.href = "/admin/schedules";
    } else {
      alert(await r.text());
    }
  }

  if (loading) return <div className="p-6 text-white/70">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-white">Edit Schedule</h1>

      <div className="rounded-xl border border-white/10 p-4">
        <div className="text-white/80 mb-2">
          <div>คอร์ส: <b>{item?.course?.course_id}</b> — {item?.course?.course_name}</div>
        </div>

        {/* status/type */}
        <div className="grid sm:grid-cols-2 gap-3">
          <select className="rounded-lg bg-slate-900/40 px-3 py-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="open">เปิดรับสมัคร</option>
            <option value="nearly_full">ใกล้เต็ม</option>
            <option value="full">เต็ม</option>
          </select>

          <div className="flex gap-3">
            <button type="button"
              className={`px-3 py-2 rounded-lg border ${type==="classroom"?"border-sky-400 text-sky-300":"border-white/15 text-white/60"}`}
              onClick={()=>setType("classroom")}
            >● Classroom</button>
            <button type="button"
              className={`px-3 py-2 rounded-lg border ${type==="hybrid"?"border-fuchsia-400 text-fuchsia-300":"border-white/15 text-white/60"}`}
              onClick={()=>setType("hybrid")}
            >● Hybrid</button>
          </div>
        </div>

        {/* signup url */}
        <input
          className="mt-3 w-full rounded-lg bg-slate-900/40 px-3 py-2"
          placeholder="ลิงก์หน้าสมัคร (ถ้ามี)"
          value={signupUrl}
          onChange={(e)=>setSignupUrl(e.target.value)}
        />

        {/* ใส่คอมโพเนนท์เลือกวันของคุณไว้ตรงนี้ แล้วอัปเดต setDates([...]) */}

        <div className="mt-4">
          <button onClick={onSave} className="rounded-xl bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
