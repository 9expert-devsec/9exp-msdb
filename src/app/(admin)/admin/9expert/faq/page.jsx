"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

/* ------------ type / default ------------ */

const DEFAULT_FAQ = {
  _id: "",
  category: "",
  question: "",
  answer_html: "",
  answer_plain: "",
  order: 0,
  is_published: true,
};

const Section = ({ title, desc, children }) => (
  <section className="rounded-xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3 mb-4">
    <div>
      <div className="text-slate-100 font-semibold">{title}</div>
      {desc && <div className="text-xs text-slate-400 mt-1">{desc}</div>}
    </div>
    {children}
  </section>
);

const FieldLabel = ({ children, hint }) => (
  <label className="block text-sm font-medium text-slate-200">
    {children}
    {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
  </label>
);

/* ------------ FaqForm (modal) ------------ */

function FaqForm({ item, onClose, onSaved, onDeleted }) {
  const isEdit = !!item?._id;
  const [form, setForm] = useState(DEFAULT_FAQ);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // โหลดค่าจาก item ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    if (item && item._id) {
      setForm({
        ...DEFAULT_FAQ,
        ...item,
        order: item.order ?? 0,
        is_published: item.is_published !== false,
      });
    } else {
      setForm({ ...DEFAULT_FAQ });
    }
  }, [item]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category: (form.category || "").trim(),
        question: (form.question || "").trim(),
        answer_html: form.answer_html || "",
        answer_plain: form.answer_plain || "",
        order: Number(form.order) || 0,
        is_published: !!form.is_published,
      };

      // auto answer_plain ถ้ายังว่าง
      if (!payload.answer_plain && payload.answer_html) {
        const tmp = payload.answer_html
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        payload.answer_plain = tmp.slice(0, 260);
      }

      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit ? { ...payload, _id: item._id } : payload;

      const res = await fetch("/api/admin/faqs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Save failed");
      }
      onSaved?.(data.item);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm("ลบคำถามนี้หรือไม่?")) return;
    try {
      const res = await fetch(
        `/api/admin/faqs?id=${encodeURIComponent(item._id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Delete failed");
      }
      onDeleted?.();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-0 sm:p-4">
      <div className="mx-auto w-full sm:max-w-5xl">
        <div className="rounded-2xl bg-slate-950 ring-1 ring-white/10 max-h-[90vh] overflow-y-auto">
          {/* header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/95 backdrop-blur">
            <h2 className="text-lg font-semibold">
              {isEdit ? "Edit FAQ" : "New FAQ"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            >
              Close
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-4 space-y-4">
            {/* ข้อมูลคำถาม */}
            <Section
              title="ข้อมูลคำถาม"
              desc="กำหนดหมวดหมู่คำถาม หัวข้อ และลำดับแสดงผลบนหน้าเว็บ"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>หมวดหมู่คำถาม</FieldLabel>
                  <input
                    className="input"
                    placeholder="เช่น การชำระเงิน, การออกใบกำกับภาษี"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>หัวข้อคำถาม</FieldLabel>
                  <input
                    className="input"
                    placeholder="เช่น สามารถออกใบกำกับภาษีในนามบริษัทได้หรือไม่?"
                    value={form.question}
                    onChange={(e) => set("question", e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={!!form.is_published}
                      onChange={(e) => set("is_published", e.target.checked)}
                    />
                    แสดงบนหน้าเว็บ (Published)
                  </label>
                </div>
                <div>
                  <FieldLabel hint="ตัวเลขยิ่งน้อย แสดงก่อน">
                    ลำดับการแสดงผล
                  </FieldLabel>
                  <input
                    className="input"
                    type="number"
                    value={form.order}
                    onChange={(e) => set("order", e.target.value)}
                  />
                </div>
              </div>
            </Section>

            {/* คำตอบ */}
            <Section
              title="คำตอบ"
              desc="สามารถใส่ได้ทั้งข้อความธรรมดา หรือ HTML เต็มรูปแบบ (เก็บเป็น answer_html)"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel>Answer (HTML / Text)</FieldLabel>
                  <textarea
                    className="textarea min-h-[220px] font-mono text-xs"
                    placeholder={`ตัวอย่าง:
<p>สามารถออกใบกำกับภาษีในนามบริษัทได้ โดยกรอกข้อมูลบริษัทในแบบฟอร์มลงทะเบียน และแจ้งทีมงานทาง LINE OA หรืออีเมล training@9experttraining.com</p>`}
                    value={form.answer_html}
                    onChange={(e) => set("answer_html", e.target.value)}
                  />
                  <FieldLabel hint="ใช้เป็นสรุปสั้น ๆ หรือสำหรับค้นหา">
                    Answer (plain text / optional)
                  </FieldLabel>
                  <textarea
                    className="textarea min-h-[80px] text-xs"
                    placeholder="ถ้าไม่กรอก ระบบจะสร้างจาก HTML ให้โดยอัตโนมัติ"
                    value={form.answer_plain}
                    onChange={(e) => set("answer_plain", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Live Preview</FieldLabel>
                  <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm overflow-auto max-h-[280px]">
                    {form.answer_html ? (
                      <div
                        className="prose prose-sm prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: form.answer_html,
                        }}
                      />
                    ) : (
                      <div className="text-xs text-slate-500">
                        ยังไม่ได้ใส่คำตอบ – พรีวิวจะแสดงที่นี่
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            {/* footer */}
            <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-white/10 -mx-4 px-4 py-3 flex items-center justify-between">
              {isEdit ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-sm"
                >
                  Delete
                </button>
              ) : (
                <div />
              )}
              <button
                disabled={saving}
                className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-sm font-medium"
              >
                {saving ? "Saving..." : "Save FAQ"}
              </button>
            </div>

            <style jsx>{`
              .input {
                width: 100%;
                background: rgba(15, 23, 42, 0.9);
                border: 1px solid rgba(148, 163, 184, 0.4);
                border-radius: 0.75rem;
                padding: 0.5rem 0.75rem;
                font-size: 0.875rem;
                color: #e5e7eb;
              }
              .textarea {
                width: 100%;
                background: rgba(15, 23, 42, 0.9);
                border: 1px solid rgba(148, 163, 184, 0.5);
                border-radius: 0.75rem;
                padding: 0.5rem 0.75rem;
                color: #e5e7eb;
              }
              .textarea:focus,
              .input:focus {
                border-color: rgba(52, 211, 153, 0.7);
                box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.35);
                outline: none;
              }
            `}</style>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------ card แสดงหมวด + list ------------ */

function FaqCategoryCard({ category, items, onEdit }) {
  const [open, setOpen] = useState(true);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [items]
  );

  return (
    <article className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 overflow-hidden">
      {/* header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/80 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-sm font-semibold">
            {category?.[0]?.toUpperCase() || "?"}
          </span>
          <div>
            <div className="text-sm font-semibold">
              {category || "Uncategorized"}
            </div>
            <div className="text-xs text-slate-400">
              {items.length} question{items.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.({ category, isNew: true });
            }}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs"
          >
            + Add in this category
          </button>
          <span className="text-xs inline-flex items-center justify-center h-6 w-6 rounded-full border border-white/20 bg-white/5">
            {open ? "−" : "+"}
          </span>
        </div>
      </div>

      {/* body */}
      {open && (
        <div className="border-t border-white/10">
          {sorted.map((q) => (
            <div
              key={q._id}
              className="px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-slate-900/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{q.question}</div>
                  <div className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">
                    {q.answer_plain || q.answer_html}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(q);
                    }}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px]"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!sorted.length && (
            <div className="px-4 py-3 text-xs text-slate-500">
              ยังไม่มีคำถามในหมวดนี้
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ------------ main page ------------ */

export default function FaqAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faqs", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Load failed");
      }
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = [...items];
    if (s) {
      list = list.filter((i) => {
        const hay =
          (i.category || "") +
          " " +
          (i.question || "") +
          " " +
          (i.answer_plain || "");
        return hay.toLowerCase().includes(s);
      });
    }
    return list;
  }, [items, q]);

  const grouped = useMemo(() => {
    const byCat = new Map();
    filtered.forEach((i) => {
      const cat = i.category || "อื่น ๆ";
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(i);
    });
    return Array.from(byCat.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "th")
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">FAQ & Help Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            จัดการคำถามที่พบบ่อยของ 9Expert: หมวดหมู่คำถาม หัวข้อ และคำตอบ
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...DEFAULT_FAQ })}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm font-medium shadow shadow-emerald-900/30"
        >
          <span className="text-lg leading-none">＋</span>
          <span>New FAQ</span>
        </button>
      </header>

      {/* search */}
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by question or answer..."
          className="w-full sm:w-80 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 text-sm"
        />
        <button
          onClick={fetchItems}
          className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="text-sm text-slate-400">Loading FAQs...</div>
      )}

      {!loading && !grouped.length && (
        <div className="text-sm text-slate-400">
          ยังไม่มี FAQ หรือไม่พบตามคำค้นหา
        </div>
      )}

      {/* list group by category */}
      <div className="space-y-3">
        {grouped.map(([cat, itemsInCat]) => (
          <FaqCategoryCard
            key={cat}
            category={cat}
            items={itemsInCat}
            onEdit={(payload) => {
              if (payload?.isNew) {
                setEditing({ ...DEFAULT_FAQ, category: payload.category });
              } else {
                setEditing(payload);
              }
            }}
          />
        ))}
      </div>

      {/* modal */}
      {editing && (
        <FaqForm
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchItems();
          }}
          onDeleted={() => {
            setEditing(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
