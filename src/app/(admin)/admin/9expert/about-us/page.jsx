"use client";

import { useEffect, useState } from "react";

const DEFAULT = {
  title: "About 9Expert Training",
  content_html: "",
  updated_by: "",
};

export default function AboutUsAdminPage() {
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /* ---------- load existing about-us ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/about-us", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data.item) {
          setForm({
            title: data.item.title || DEFAULT.title,
            content_html: data.item.content_html || "",
            updated_by: data.item.updated_by || "",
          });
        } else {
          setForm(DEFAULT);
        }
      } catch (e) {
        console.error("Load about-us failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content_html: form.content_html,
        updated_by: form.updated_by || undefined,
      };

      const res = await fetch("/api/admin/about-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Save failed");
      }
      alert("บันทึก About Us เรียบร้อยแล้ว");
    } catch (e) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-sm text-slate-300">
        กำลังโหลดข้อมูล About Us...
      </div>
    );
  }

  const length = (form.content_html || "").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">About Us (9Expert)</h1>
          <p className="text-sm text-slate-400 mt-1">
            เก็บเนื้อหา About Us ไว้เป็นศูนย์กลาง แล้วให้ระบบอื่นเรียกผ่าน API
            <span className="ml-2 text-xs text-slate-500">
              (GET /api/about-us)
            </span>
          </p>
        </div>
      </header>

      {/* Main layout: Editor & Preview */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Editor */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-100">
              Title
            </label>
            <input
              className="mt-1 w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="เช่น เกี่ยวกับ 9Expert Training"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-100">
                About Us Content
              </div>
              <div className="text-xs text-slate-400 mt-1">
                รองรับทั้ง{" "}
                <b>Text ธรรมดา</b> หรือ <b>HTML เต็มรูปแบบ</b> (เช่น
                &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt; ฯลฯ)
              </div>
            </div>
            <div className="text-xs text-slate-400">
              Length: <span className="font-mono">{length}</span> chars
            </div>
          </div>

          <textarea
            className="w-full min-h-[320px] rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm font-mono leading-relaxed text-slate-100"
            placeholder={`ตัวอย่าง HTML:

<h1>เกี่ยวกับ 9Expert Training</h1>
<p>9Expert Training เป็นผู้ให้บริการอบรมด้าน IT และ Data...</p>
<ul>
  <li>Microsoft 365 / Power Platform</li>
  <li>Data Analytics / Power BI</li>
  <li>AI & Automation</li>
</ul>

หรือจะพิมพ์เป็น Text ธรรมดาก็ได้ แล้วค่อยค่อยปรับเป็น HTML ภายหลัง`}
            value={form.content_html}
            onChange={(e) => set("content_html", e.target.value)}
          />

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400">
                Updated by (optional)
              </label>
              <input
                className="mt-1 w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-1.5 text-xs"
                value={form.updated_by}
                onChange={(e) => set("updated_by", e.target.value)}
                placeholder="เช่น Gus, Admin, ฯลฯ"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 rounded-xl px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save About Us"}
            </button>
          </div>
        </section>

        {/* RIGHT: Preview */}
        <section className="rounded-2xl bg-slate-900/60 ring-1 ring-white/10 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-100">
              Live Preview
            </div>
            <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800/80 text-slate-300">
              แสดงผลจาก HTML ที่กรอกด้านซ้าย
            </span>
          </div>

          <div className="flex-1 rounded-xl bg-slate-950/60 border border-white/10 p-4 overflow-auto">
            {form.content_html?.trim() ? (
              <div
                className="prose prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: form.content_html }}
              />
            ) : (
              <p className="text-sm text-slate-500">
                ยังไม่มีเนื้อหา About Us — ลองพิมพ์หรือวาง HTML ในช่องด้านซ้าย
                แล้วกด Save
              </p>
            )}
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            API สำหรับดึงข้อมูลหน้า About Us:{" "}
            <code className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
              GET /api/about-us
            </code>
          </div>
        </section>
      </form>
    </div>
  );
}
