"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const FIELD_TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select (Dropdown)" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkboxes" },
];

export default function EditEventPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventData, setEventData] = useState({
    title: "",
    banner_url: "",
    description: "",
    start_date: "",
    location: "",
    published: true,
    email_field_key: "",
    form_fields: [],
  });

  // โหลดข้อมูลอีเวนต์
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/admin/events/${id}`, { cache: "no-store" });
      if (!r.ok) {
        setLoading(false);
        return;
      }
      const data = await r.json();
      if (!isMounted) return;

      setEventData({
        title: data.title || "",
        banner_url: data.banner_url || "",
        description: data.description || "",
        start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0,16) : "",
        location: data.location || "",
        published: !!data.published,
        email_field_key: data.email_field_key || "",
        form_fields: Array.isArray(data.form_fields) ? data.form_fields : [],
      });
      setLoading(false);
    })();
    return () => { isMounted = false; };
  }, [id]);

  function updateField(idx, patch) {
    setEventData(s => ({
      ...s,
      form_fields: s.form_fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  }

  function addField() {
    setEventData(s => ({
      ...s,
      form_fields: [
        ...s.form_fields,
        { key: `field_${Date.now()}`, label: "Untitled", type: "short_text", required: false, options: [] },
      ],
    }));
  }

  async function onSave() {
    setSaving(true);
    const payload = {
      ...eventData,
      start_date: eventData.start_date ? new Date(eventData.start_date) : null,
    };
    const r = await fetch(`/api/admin/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) {
      router.push("/admin/events");
    } else {
      alert("บันทึกไม่สำเร็จ");
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Event</h1>
        <div className="text-sm opacity-70">ID: {id}</div>
      </div>

      <div className="grid gap-3">
        <input
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Title *"
          value={eventData.title}
          onChange={e => setEventData(s => ({ ...s, title: e.target.value }))}
        />
        <input
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Banner URL"
          value={eventData.banner_url}
          onChange={e => setEventData(s => ({ ...s, banner_url: e.target.value }))}
        />
        <textarea
          rows={4}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Description"
          value={eventData.description}
          onChange={e => setEventData(s => ({ ...s, description: e.target.value }))}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="datetime-local"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            value={eventData.start_date}
            onChange={e => setEventData(s => ({ ...s, start_date: e.target.value }))}
          />
          <input
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            placeholder="Location"
            value={eventData.location}
            onChange={e => setEventData(s => ({ ...s, location: e.target.value }))}
          />
        </div>
        <input
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="(Optional) Email field key เช่น email"
          value={eventData.email_field_key}
          onChange={e => setEventData(s => ({ ...s, email_field_key: e.target.value }))}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={eventData.published}
            onChange={e => setEventData(s => ({ ...s, published: e.target.checked }))}
          />
          Published
        </label>
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Form fields</h2>
          <button onClick={addField} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            + Add field
          </button>
        </div>

        <div className="space-y-3">
          {eventData.form_fields.map((f, idx) => (
            <div key={f.key} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="grid sm:grid-cols-[1fr_200px_110px] gap-3">
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  value={f.label}
                  onChange={e => updateField(idx, { label: e.target.value })}
                />
                <select
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  value={f.type}
                  onChange={e => updateField(idx, { type: e.target.value, options: [] })}
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={e => updateField(idx, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>

              {(f.type === "select" || f.type === "radio" || f.type === "checkbox") && (
                <OptionsEditor
                  value={f.options || []}
                  onChange={opts => updateField(idx, { options: opts })}
                />
              )}

              <div className="text-xs opacity-70">key: {f.key}</div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setEventData(s => ({
                      ...s,
                      form_fields: s.form_fields.filter((_, i) => i !== idx),
                    }))
                  }
                  className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        disabled={saving}
        onClick={onSave}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}

function OptionsEditor({ value = [], onChange }) {
  const [txt, setTxt] = useState("");
  function add() {
    if (!txt.trim()) return;
    onChange([...(value || []), txt.trim()]);
    setTxt("");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Add option"
          value={txt}
          onChange={e => setTxt(e.target.value)}
        />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(value || []).map((op, i) => (
          <span key={i} className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
            {op}
            <button className="ml-2 opacity-70 hover:opacity-100" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
