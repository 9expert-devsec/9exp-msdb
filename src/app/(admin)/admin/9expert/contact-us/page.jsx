"use client";

import { useEffect, useState } from "react";

const DEFAULT = {
  company_name: "",
  company_legal_name: "",
  tagline: "",

  address_line1: "",
  address_line2: "",
  district: "",
  province: "",
  postcode: "",
  country: "Thailand",

  phone_main: "",
  phone_secondary: "",
  fax: "",

  email_main: "",
  email_support: "",
  email_sales: "",

  line_id: "",
  line_oa_url: "",
  line_qr_url: "",

  website_url: "",

  facebook_url: "",
  instagram_url: "",
  youtube_url: "",
  tiktok_url: "",
  linkedin_url: "",

  google_map_url: "",
  google_map_embed: "",

  social_links: [],

  extra_notes: "",
  updated_by: "",
};

export default function ContactUsAdminPage() {
  const [form, setForm] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /* ---------- load existing contact info ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/contact-us", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data.item) {
          setForm({
            ...DEFAULT,
            ...data.item,
          });
        } else {
          setForm(DEFAULT);
        }
      } catch (e) {
        console.error("Load contact-us failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- manage social_links ---------- */
  const addSocial = () =>
    set("social_links", [
      ...(form.social_links || []),
      { key: "", label: "", url: "", icon: "" },
    ]);

  const updateSocial = (index, field, value) => {
    const next = [...(form.social_links || [])];
    next[index] = { ...(next[index] || {}), [field]: value };
    set("social_links", next);
  };

  const removeSocial = (index) => {
    const next = [...(form.social_links || [])];
    next.splice(index, 1);
    set("social_links", next);
  };

  /* ---------- submit ---------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        social_links: form.social_links || [],
      };

      const res = await fetch("/api/admin/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Save failed");
      }

      alert("บันทึก Contact Info เรียบร้อยแล้ว");
    } catch (e) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-sm text-slate-300">
        กำลังโหลดข้อมูล Contact...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contact Information</h1>
          <p className="text-sm text-slate-400 mt-1">
            ศูนย์กลางเก็บข้อมูลช่องทางติดต่อของ 9Expert Training
            เพื่อใช้กับระบบอื่นผ่าน API
            <span className="ml-2 text-xs text-slate-500">
              (GET /api/contact-us)
            </span>
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Company Info */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-100 font-semibold">Company Info</div>
              <div className="text-xs text-slate-400 mt-1">
                ข้อมูลพื้นฐานของบริษัท เช่นชื่อบริษัทตามทะเบียน/ชื่อการตลาด
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="label">Company Name (Display)</label>
              <input
                className="input"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="เช่น 9Expert Training"
              />
            </div>
            <div>
              <label className="label">Legal Name (จดทะเบียน)</label>
              <input
                className="input"
                value={form.company_legal_name}
                onChange={(e) => set("company_legal_name", e.target.value)}
                placeholder="ชื่อบริษัทตามหนังสือรับรอง"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Tagline / Short Description</label>
              <input
                className="input"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="เช่น Professional IT & Data Training Center"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-slate-100 font-semibold">ที่อยู่สำนักงาน</div>
          <div className="text-xs text-slate-400 mt-1">
            ที่อยู่สำหรับแสดงบนเว็บไซต์ / ใบเสร็จ / ใบกำกับภาษี
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="lg:col-span-2">
              <label className="label">Address Line 1</label>
              <input
                className="input"
                value={form.address_line1}
                onChange={(e) => set("address_line1", e.target.value)}
                placeholder="บ้านเลขที่, อาคาร, ชั้น, ซอย, ถนน ..."
              />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Address Line 2 (optional)</label>
              <input
                className="input"
                value={form.address_line2}
                onChange={(e) => set("address_line2", e.target.value)}
              />
            </div>
            <div>
              <label className="label">แขวง/ตำบล</label>
              <input
                className="input"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
              />
            </div>
            <div>
              <label className="label">เขต/อำเภอ</label>
              <input
                className="input"
                value={form.province}
                onChange={(e) => set("province", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Postcode</label>
              <input
                className="input"
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Country</label>
              <input
                className="input"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Phones & Emails */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-slate-100 font-semibold">โทรศัพท์ & อีเมล</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="label">Phone (หลัก)</label>
              <input
                className="input"
                value={form.phone_main}
                onChange={(e) => set("phone_main", e.target.value)}
                placeholder="เช่น 02-xxx-xxxx"
              />
            </div>
            <div>
              <label className="label">Phone (รอง)</label>
              <input
                className="input"
                value={form.phone_secondary}
                onChange={(e) => set("phone_secondary", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Fax</label>
              <input
                className="input"
                value={form.fax}
                onChange={(e) => set("fax", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Email (หลัก)</label>
              <input
                type="email"
                className="input"
                value={form.email_main}
                onChange={(e) => set("email_main", e.target.value)}
                placeholder="info@9experttraining.com"
              />
            </div>
            <div>
              <label className="label">Email (Support)</label>
              <input
                type="email"
                className="input"
                value={form.email_support}
                onChange={(e) => set("email_support", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email (Sales)</label>
              <input
                type="email"
                className="input"
                value={form.email_sales}
                onChange={(e) => set("email_sales", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* LINE & Website */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-slate-100 font-semibold">LINE & Website</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="label">LINE ID / LINE Name</label>
              <input
                className="input"
                value={form.line_id}
                onChange={(e) => set("line_id", e.target.value)}
                placeholder="@9experttraining"
              />
            </div>
            <div>
              <label className="label">LINE OA URL</label>
              <input
                className="input"
                value={form.line_oa_url}
                onChange={(e) => set("line_oa_url", e.target.value)}
                placeholder="https://lin.ee/xxxxxx"
              />
            </div>
            <div>
              <label className="label">LINE QR Image URL</label>
              <input
                className="input"
                value={form.line_qr_url}
                onChange={(e) => set("line_qr_url", e.target.value)}
                placeholder="https://.../line-qr.png"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="label">Website URL</label>
              <input
                className="input"
                value={form.website_url}
                onChange={(e) => set("website_url", e.target.value)}
                placeholder="https://www.9experttraining.com"
              />
            </div>
          </div>
        </section>

        {/* Social links fixed & extra */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-100 font-semibold">Social Media</div>
              <div className="text-xs text-slate-400 mt-1">
                ลิงก์ Social หลัก + ช่องทางอื่น ๆ แบบ custom
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="label">Facebook URL</label>
              <input
                className="input"
                value={form.facebook_url}
                onChange={(e) => set("facebook_url", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Instagram URL</label>
              <input
                className="input"
                value={form.instagram_url}
                onChange={(e) => set("instagram_url", e.target.value)}
              />
            </div>
            <div>
              <label className="label">YouTube URL</label>
              <input
                className="input"
                value={form.youtube_url}
                onChange={(e) => set("youtube_url", e.target.value)}
              />
            </div>
            <div>
              <label className="label">TikTok URL</label>
              <input
                className="input"
                value={form.tiktok_url}
                onChange={(e) => set("tiktok_url", e.target.value)}
              />
            </div>
            <div>
              <label className="label">LinkedIn URL</label>
              <input
                className="input"
                value={form.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-300 font-semibold">
                ช่องทางอื่น ๆ (Custom Channels)
              </div>
              <button
                type="button"
                onClick={addSocial}
                className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20"
              >
                + เพิ่มช่องทาง
              </button>
            </div>

            <div className="space-y-2">
              {(form.social_links || []).map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 lg:grid-cols-4 gap-2 rounded-xl bg-slate-950/60 border border-white/10 p-2"
                >
                  <div>
                    <label className="label text-[11px]">Key</label>
                    <input
                      className="input"
                      value={s.key || ""}
                      onChange={(e) =>
                        updateSocial(i, "key", e.target.value)
                      }
                      placeholder="เช่น facebook-group, discord"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">Label</label>
                    <input
                      className="input"
                      value={s.label || ""}
                      onChange={(e) =>
                        updateSocial(i, "label", e.target.value)
                      }
                      placeholder="เช่น Facebook Group (VIP)"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px]">URL</label>
                    <input
                      className="input"
                      value={s.url || ""}
                      onChange={(e) =>
                        updateSocial(i, "url", e.target.value)
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="label text-[11px]">
                        Icon (optional)
                      </label>
                      <input
                        className="input"
                        value={s.icon || ""}
                        onChange={(e) =>
                          updateSocial(i, "icon", e.target.value)
                        }
                        placeholder="เช่น facebook, discord, line"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSocial(i)}
                      className="h-9 px-3 rounded-lg bg-red-500/80 hover:bg-red-500 text-xs"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
              {!form.social_links?.length && (
                <div className="text-xs text-slate-500">
                  ยังไม่มีช่องทางพิเศษ เพิ่มใหม่ด้วยปุ่ม{" "}
                  <b>+ เพิ่มช่องทาง</b> ด้านบน
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Map & Notes */}
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-slate-100 font-semibold">แผนที่ & หมายเหตุ</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="label">Google Map URL</label>
              <input
                className="input"
                value={form.google_map_url}
                onChange={(e) => set("google_map_url", e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
              />
              <p className="text-[11px] text-slate-500 mt-1">
                ใช้สำหรับลิงก์ปุ่ม &quot;ดูแผนที่&quot; ไปยัง Google Maps
              </p>
              <label className="label mt-3">Extra Notes</label>
              <textarea
                className="textarea min-h-[100px]"
                value={form.extra_notes}
                onChange={(e) => set("extra_notes", e.target.value)}
                placeholder="เช่น วิธีเดินทาง, จุดสังเกต, ที่จอดรถ ฯลฯ"
              />
              <div className="mt-3">
                <label className="label text-xs">Updated by (optional)</label>
                <input
                  className="input"
                  value={form.updated_by}
                  onChange={(e) => set("updated_by", e.target.value)}
                  placeholder="เช่น Gus, Admin ฯลฯ"
                />
              </div>
            </div>
            <div>
              <label className="label">
                Google Map Embed (iframe HTML) — สำหรับ Preview
              </label>
              <textarea
                className="textarea min-h-[160px] font-mono text-xs"
                value={form.google_map_embed}
                onChange={(e) => set("google_map_embed", e.target.value)}
                placeholder={`วาง <iframe ... ></iframe> จาก Google Maps ตรงนี้`}
              />
              <div className="mt-2 text-[11px] text-slate-500">
                ระบบจะใช้เฉพาะในฝั่ง FE ที่รองรับ <code>dangerouslySetInnerHTML</code>{" "}
                เช่น Landing Page หรือ Contact Page
              </div>
              <div className="mt-3 rounded-xl bg-slate-950/60 border border-white/10 p-2 h-48 overflow-hidden">
                {form.google_map_embed?.trim() ? (
                  <div
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                    dangerouslySetInnerHTML={{
                      __html: form.google_map_embed,
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    ยังไม่มี Map Embed — วางโค้ด iframe เพื่อลอง Preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-white/10 -mx-4 px-4 py-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-sm"
          >
            {saving ? "Saving..." : "Save Contact Info"}
          </button>
        </div>

        {/* local styles */}
        <style jsx>{`
          .label {
            display: block;
            font-size: 0.8rem;
            color: #e5e7eb;
            margin-bottom: 0.15rem;
          }
          .input {
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.5);
            border-radius: 0.75rem;
            padding: 0.45rem 0.75rem;
            font-size: 0.85rem;
            color: #e5e7eb;
          }
          .textarea {
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(148, 163, 184, 0.5);
            border-radius: 0.75rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            color: #e5e7eb;
          }
        `}</style>
      </form>
    </div>
  );
}
