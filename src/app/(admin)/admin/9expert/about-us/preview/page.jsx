"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

const Section = ({ title, subtitle, children }) => (
  <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
    <div>
      <div className="text-slate-100 font-semibold">{title}</div>
      {subtitle && (
        <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
      )}
    </div>
    {children}
  </section>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-medium">
    {children}
  </span>
);

export default function AboutViewPage() {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // สมมติว่า API ฝั่ง backend คือ /api/about-us
        const res = await fetch("/api/about-us", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "โหลดข้อมูลไม่สำเร็จ");
        }
        setItem(data.item || null);
      } catch (e) {
        console.error(e);
        setErr(e.message || "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-10 text-sm text-slate-300">
        กำลังโหลดข้อมูล About Us...
      </div>
    );
  }

  if (err) {
    return (
      <div className="py-10 space-y-2">
        <div className="text-sm text-red-300">โหลดข้อมูลล้มเหลว: {err}</div>
        <div className="text-xs text-slate-400">
          ตรวจสอบว่า API <code>/api/about-us</code> ทำงานปกติหรือไม่
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-10 space-y-2">
        <div className="text-sm text-slate-300">
          ยังไม่มีข้อมูล About Us ในระบบ
        </div>
        <div className="text-xs text-slate-400">
          ไปที่หน้า <code>/admin/9expert/about-us</code> เพื่อเพิ่มข้อมูลก่อน
        </div>
      </div>
    );
  }

  // พยายามรองรับชื่อฟิลด์ที่อาจใช้ในระบบจริง
  const {
    title,
    subtitle,
    tagline,
    hero_title,
    hero_subtitle,
    hero_image_url,
    mission_title,
    mission_html,
    vision_title,
    vision_html,
    values_title,
    values_html,
    // main rich content field (จาก rich text editor)
    content_html,
    html_content,
    body_html,
    // sections: [{title, html}]
    sections = [],
    seo_title,
    seo_description,
    updatedAt,
  } = item;

  const mainHtml = content_html || html_content || body_html || "";

  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-3">
            About Us Preview
            <Badge>read-only view</Badge>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            หน้าสรุปเนื้อหา About 9Expert ที่ดึงจากฐานข้อมูลเดียวกับหน้าแก้ไข
          </p>
        </div>

        <div className="text-right text-xs text-slate-400">
          API: <code className="text-emerald-300">GET /api/about-us</code>
          <br />
          {formattedUpdatedAt && (
            <span>อัปเดตล่าสุด: {formattedUpdatedAt}</span>
          )}
        </div>
        <a
          href="/admin/9expert/about-us"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
               bg-emerald-600 hover:bg-emerald-500 text-white text-sm
               transition shadow shadow-emerald-900/30"
        >
          Edit About Us
        </a>
      </header>

      {/* Hero section */}
      <Section title="Hero / Header">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 items-start">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-slate-50">
              {hero_title || title || "About 9Expert Training"}
            </div>
            {(hero_subtitle || subtitle || tagline) && (
              <div className="text-sm text-slate-300">
                {hero_subtitle || subtitle || tagline}
              </div>
            )}
            {(seo_title || seo_description) && (
              <div className="mt-3 rounded-xl bg-slate-950/50 border border-white/10 p-3 space-y-1">
                <div className="text-xs font-semibold text-slate-400">
                  SEO Meta
                </div>
                {seo_title && (
                  <div className="text-xs text-slate-200">
                    <span className="text-slate-400">Title: </span>
                    {seo_title}
                  </div>
                )}
                {seo_description && (
                  <div className="text-xs text-slate-200">
                    <span className="text-slate-400">Description: </span>
                    {seo_description}
                  </div>
                )}
              </div>
            )}
          </div>

          {hero_image_url && (
            <div className="flex justify-end">
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 max-w-xs">
                <img
                  src={hero_image_url}
                  alt="About hero"
                  className="w-full h-40 object-cover"
                />
                <div className="px-3 py-2 text-[11px] text-slate-400 border-t border-white/10">
                  Hero image (จากฟิลด์ hero_image_url)
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Main rich HTML content */}
      {mainHtml && (
        <Section
          title="Main Content"
          subtitle="แสดงผลตาม Rich Text / HTML ที่บันทึกไว้ (dangerouslySetInnerHTML)"
        >
          <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-4 prose prose-invert max-w-none">
            <div
              // main rich text
              dangerouslySetInnerHTML={{ __html: mainHtml }}
            />
          </div>
        </Section>
      )}

      {/* Mission / Vision / Values (ถ้ามี) */}
      {(mission_html || vision_html || values_html) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {mission_html && (
            <Section title={mission_title || "Our Mission"}>
              <div
                className="prose prose-invert text-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: mission_html }}
              />
            </Section>
          )}

          {vision_html && (
            <Section title={vision_title || "Our Vision"}>
              <div
                className="prose prose-invert text-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: vision_html }}
              />
            </Section>
          )}

          {values_html && (
            <Section title={values_title || "Core Values"}>
              <div
                className="prose prose-invert text-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: values_html }}
              />
            </Section>
          )}
        </div>
      )}

      {/* Section list (เช่น block ย่อย ๆ) */}
      {Array.isArray(sections) && sections.length > 0 && (
        <Section
          title="Sections"
          subtitle="บล็อกเนื้อหาย่อย ๆ (เช่น ประวัติบริษัท / แนวคิด / ทีมงาน ฯลฯ)"
        >
          <div className="space-y-4">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-slate-950/60 border border-white/10 p-3"
              >
                {sec.title && (
                  <div className="text-sm font-semibold text-slate-100 mb-1">
                    {sec.title}
                  </div>
                )}
                {sec.html && (
                  <div
                    className="prose prose-invert text-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sec.html }}
                  />
                )}
                {sec.body && !sec.html && (
                  <div
                    className="prose prose-invert text-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sec.body }}
                  />
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ถ้าไม่มี mainHtml กับ sections เลย แสดง note เล็กน้อย */}
      {!mainHtml && (!sections || sections.length === 0) && (
        <Section title="ไม่มีเนื้อหา">
          <div className="text-xs text-slate-400">
            ยังไม่มีฟิลด์ content_html / html_content / body_html หรือ sections
            ในเอกสาร about-us
          </div>
        </Section>
      )}
    </div>
  );
}
