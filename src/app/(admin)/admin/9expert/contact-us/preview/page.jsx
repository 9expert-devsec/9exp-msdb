"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
  updatedAt: null,
};

export default function ContactUsPreviewPage() {
  const [data, setData] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/contact-us", { cache: "no-store" });
        const json = await res.json();
        if (json?.ok && json.item) {
          setData({ ...DEFAULT, ...json.item });
        } else {
          setData(DEFAULT);
        }
      } catch (e) {
        console.error("Load contact-us (preview) failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatAddress = () => {
    const parts = [
      data.address_line1,
      data.address_line2,
      data.district,
      data.province,
      data.postcode,
      data.country,
    ]
      .map((x) => (x || "").trim())
      .filter(Boolean);
    return parts.join(" ");
  };

  if (loading) {
    return (
      <div className="py-10 text-sm text-slate-300">
        กำลังโหลด Contact Info ...
      </div>
    );
  }

  const hasAnySocial =
    data.facebook_url ||
    data.instagram_url ||
    data.youtube_url ||
    data.tiktok_url ||
    data.linkedin_url ||
    (data.social_links || []).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contact Info Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            หน้าสรุปช่องทางการติดต่อของ 9Expert Training
            สำหรับดูข้อมูลรวมจากฐานเดียวกับ API{" "}
            <span className="text-xs text-slate-500">(/api/contact-us)</span>
          </p>
        </div>
        <Link
          href="/admin/9expert/contact-us"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-sm"
        >
          แก้ไขข้อมูล Contact
        </Link>
      </header>

      {/* Company card */}
      <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              {data.company_name || "ยังไม่กำหนดชื่อบริษัท"}
            </h2>
            {data.company_legal_name && (
              <p className="text-xs text-slate-400 mt-1">
                ชื่อจดทะเบียน:{" "}
                <span className="text-slate-200">
                  {data.company_legal_name}
                </span>
              </p>
            )}
            {data.tagline && (
              <p className="text-sm text-slate-300 mt-2 italic">
                “{data.tagline}”
              </p>
            )}
          </div>

          {data.updatedAt && (
            <div className="text-xs text-right text-slate-400">
              <div>
                อัปเดตล่าสุด:{" "}
                {new Date(data.updatedAt).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              {data.updated_by && (
                <div>โดย: {data.updated_by || "ไม่ระบุผู้แก้ไข"}</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main 3-column summary */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Address */}
        <div className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 flex flex-col gap-2">
          <div className="text-sm font-semibold text-slate-100">
            ที่อยู่สำนักงาน
          </div>
          <p className="text-sm text-slate-200 whitespace-pre-line">
            {formatAddress() || "ยังไม่ได้กรอกที่อยู่"}
          </p>
          {data.google_map_url && (
            <a
              href={data.google_map_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 underline"
            >
              เปิดแผนที่ใน Google Maps
            </a>
          )}
        </div>

        {/* Phones & Emails */}
        <div className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-100">
            โทรศัพท์ & อีเมล
          </div>
          <div className="space-y-1 text-sm text-slate-200">
            <Row label="โทรหลัก" value={data.phone_main} />
            <Row label="โทรรอง" value={data.phone_secondary} />
            <Row label="Fax" value={data.fax} />
          </div>
          <div className="mt-2 border-t border-white/10 pt-2 space-y-1 text-sm text-slate-200">
            <Row label="Email (หลัก)" value={data.email_main} />
            <Row label="Email (Support)" value={data.email_support} />
            <Row label="Email (Sales)" value={data.email_sales} />
          </div>
        </div>

        {/* LINE & Website */}
        <div className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 flex flex-col gap-3">
          <div className="text-sm font-semibold text-slate-100">
            LINE & Website
          </div>
          <div className="space-y-1 text-sm text-slate-200">
            <Row label="LINE ID" value={data.line_id} />
            <Row
              label="LINE OA"
              value={data.line_oa_url}
              isLink
            />
            <Row
              label="Website"
              value={data.website_url}
              isLink
            />
          </div>
          {data.line_qr_url && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={data.line_qr_url}
                alt="LINE QR"
                className="h-16 w-16 rounded-md object-contain ring-1 ring-white/15 bg-white"
              />
              <div className="text-xs text-slate-400">
                QR Code สำหรับเพิ่ม LINE Official Account
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Social & extras */}
      {hasAnySocial && (
        <section className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-100">
            Social Media & ช่องทางอื่น ๆ
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Chip label="Facebook" url={data.facebook_url} />
            <Chip label="Instagram" url={data.instagram_url} />
            <Chip label="YouTube" url={data.youtube_url} />
            <Chip label="TikTok" url={data.tiktok_url} />
            <Chip label="LinkedIn" url={data.linkedin_url} />

            {(data.social_links || []).map((s, i) => (
              <Chip
                key={i}
                label={s.label || s.key}
                url={s.url}
                hint={s.icon}
              />
            ))}
          </div>
        </section>
      )}

      {/* Map preview & notes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-100">
            หมายเหตุ / Note
          </div>
          <p className="text-sm text-slate-200 whitespace-pre-line">
            {data.extra_notes || "ยังไม่มี Note เพิ่มเติม"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/80 ring-1 ring-white/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-100">
            แผนที่ (Google Map Embed)
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-white/10 h-64 overflow-hidden">
            {data.google_map_embed?.trim() ? (
              <div
                className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                dangerouslySetInnerHTML={{
                  __html: data.google_map_embed,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                ยังไม่มีโค้ด iframe สำหรับแผนที่
              </div>
            )}
          </div>
        </div>
      </section>

      {/* local styles for small components */}
      <style jsx>{`
        .row-label {
          width: 7rem;
          flex-shrink: 0;
          color: #9ca3af;
          font-size: 0.78rem;
        }
      `}</style>
    </div>
  );
}

/* ---------- small sub components ---------- */

function Row({ label, value, isLink }) {
  if (!value) {
    return (
      <div className="flex items-baseline gap-2 text-xs text-slate-500">
        <span className="row-label">{label}</span>
        <span>-</span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="row-label">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-300 hover:text-emerald-200 underline break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-slate-200 break-all">{value}</span>
      )}
    </div>
  );
}

function Chip({ label, url, hint }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/20"
    >
      <span className="font-semibold">{label}</span>
      {hint && <span className="text-[10px] text-emerald-200/80">({hint})</span>}
    </a>
  );
}
