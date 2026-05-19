"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineBolt,
  HiOutlineArrowPath,
  HiOutlineXMark,
} from "react-icons/hi2";

const ENTITY_GROUPS = [
  { entity: "course", label: "Public Courses" },
  { entity: "schedule", label: "Schedules" },
  { entity: "promotion", label: "Promotions" },
  { entity: "career_path", label: "Career Path" },
  { entity: "faq", label: "FAQs" },
  { entity: "instructor", label: "Instructors" },
];

const ACTIONS = ["created", "updated", "deleted"];

function genSecret(length = 32) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function formatDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function StatusBadge({ code, error }) {
  if (error) {
    return (
      <span className="inline-block rounded-full bg-rose-50 px-2 py-[2px] text-[11px] text-rose-700 ring-1 ring-rose-200">
        ERR
      </span>
    );
  }
  if (!code) {
    return (
      <span className="inline-block rounded-full bg-slate-100 px-2 py-[2px] text-[11px] text-slate-500 ring-1 ring-slate-200">
        —
      </span>
    );
  }
  const isOk = code >= 200 && code < 300;
  const cls = isOk
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`inline-block rounded-full px-2 py-[2px] text-[11px] ring-1 ${cls}`}>
      {code}
    </span>
  );
}

export default function WebhookAdminClient() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/webhooks", { cache: "no-store" });
      const j = await r.json();
      setItems(j.items || []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleAdd() {
    setEditing(null);
    setOpenForm(true);
  }

  function handleEdit(item) {
    setEditing(item);
    setOpenForm(true);
  }

  async function handleToggleActive(item) {
    setBusyId(item._id);
    try {
      await fetch(`/api/admin/webhooks/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Delete subscription "${item.name}"?`)) return;
    setBusyId(item._id);
    try {
      await fetch(`/api/admin/webhooks/${item._id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleTest(item) {
    setBusyId(item._id);
    try {
      const r = await fetch(`/api/admin/webhooks/${item._id}/test`, {
        method: "POST",
      });
      const j = await r.json();
      const ok = j.ok;
      const msg = ok
        ? `Test sent OK (status ${j.status})`
        : `Test failed: ${j.error || `status ${j.status}`}`;
      alert(msg);
      await load();
    } catch (e) {
      alert("Test failed: " + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Webhook Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-300">
            ส่ง event ออกแบบ real-time เมื่อข้อมูล MSDB เปลี่ยน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-2xl bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-600"
          >
            <HiOutlineArrowPath className="inline h-4 w-4 mr-1" /> Refresh
          </button>
          <button
            onClick={handleAdd}
            className="rounded-2xl bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
          >
            <HiOutlinePlus className="inline h-4 w-4 mr-1" /> Add Subscription
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-sky-100 text-sky-900">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">URL</th>
              <th className="p-3 text-left">Events</th>
              <th className="p-3 text-center">Active</th>
              <th className="p-3 text-center">Last Triggered</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  ยังไม่มี subscription — กด “Add Subscription” เพื่อเริ่ม
                </td>
              </tr>
            )}
            {items.map((it, idx) => {
              const zebra = idx % 2 === 1 ? "bg-slate-50" : "bg-white";
              return (
                <tr key={it._id} className={zebra}>
                  <td className="p-3 align-top font-medium text-slate-900">
                    {it.name}
                  </td>
                  <td className="p-3 align-top">
                    <code className="text-xs text-slate-700 break-all">
                      {it.url}
                    </code>
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {(it.events || []).map((ev) => (
                        <span
                          key={ev}
                          className="rounded-full bg-sky-50 px-2 py-[2px] text-[11px] text-sky-700 ring-1 ring-sky-200"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 align-top text-center">
                    <button
                      disabled={busyId === it._id}
                      onClick={() => handleToggleActive(it)}
                      className={`rounded-full px-3 py-[2px] text-[11px] ring-1 ${
                        it.is_active
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {it.is_active ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td className="p-3 align-top text-center text-xs text-slate-600">
                    {formatDateTime(it.last_triggered_at)}
                  </td>
                  <td className="p-3 align-top text-center">
                    <StatusBadge code={it.last_status_code} error={it.last_error} />
                    {it.last_error ? (
                      <div
                        className="mt-1 text-[10px] text-rose-600 truncate max-w-[120px] mx-auto"
                        title={it.last_error}
                      >
                        {it.last_error}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 align-top text-right">
                    <div className="inline-flex gap-1">
                      <button
                        disabled={busyId === it._id}
                        onClick={() => handleTest(it)}
                        className="rounded-md bg-sky-100 px-2 py-[2px] text-[12px] text-sky-700 hover:bg-sky-200"
                        title="Send ping event"
                      >
                        <HiOutlineBolt className="inline h-3.5 w-3.5" /> Test
                      </button>
                      <button
                        disabled={busyId === it._id}
                        onClick={() => handleEdit(it)}
                        className="rounded-md bg-amber-100 px-2 py-[2px] text-[12px] text-amber-700 hover:bg-amber-200"
                      >
                        <HiOutlinePencil className="inline h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        disabled={busyId === it._id}
                        onClick={() => handleDelete(it)}
                        className="rounded-md bg-rose-100 px-2 py-[2px] text-[12px] text-rose-700 hover:bg-rose-200"
                      >
                        <HiOutlineTrash className="inline h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openForm && (
        <SubscriptionFormModal
          initial={editing}
          onClose={() => setOpenForm(false)}
          onSaved={async () => {
            setOpenForm(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function SubscriptionFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial?._id;

  const [name, setName] = useState(initial?.name || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [secret, setSecret] = useState(initial?.secret || "");
  const [events, setEvents] = useState(() => {
    const arr = Array.isArray(initial?.events) ? initial.events : [];
    return new Set(arr);
  });
  const [isActive, setIsActive] = useState(
    initial ? !!initial.is_active : true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const eventOptions = useMemo(() => {
    const opts = [];
    for (const g of ENTITY_GROUPS) {
      opts.push({ value: `${g.entity}.*`, label: `${g.label} (all)` });
      for (const a of ACTIONS) {
        opts.push({
          value: `${g.entity}.${a}`,
          label: `${g.label} — ${a}`,
        });
      }
    }
    return opts;
  }, []);

  function toggleEvent(v) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Name is required");
    if (!url.trim()) return setError("URL is required");
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return setError("URL must be http(s)");
      }
    } catch {
      return setError("URL is not valid");
    }

    const payload = {
      name: name.trim(),
      url: url.trim(),
      events: Array.from(events),
      is_active: isActive,
    };
    if (secret.trim()) payload.secret = secret.trim();

    setSaving(true);
    try {
      const r = await fetch(
        isEdit ? `/api/admin/webhooks/${initial._id}` : "/api/admin/webhooks",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const j = await r.json();
      if (!r.ok || !j.ok) {
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      await onSaved();
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit Subscription" : "Add Subscription"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <HiOutlineXMark className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Genesis Production"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://genesis.9expert.app/api/webhooks/msdb"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Secret (HMAC-SHA256)
            </label>
            <div className="flex gap-2">
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={
                  isEdit
                    ? "(leave blank to keep existing)"
                    : "(blank = auto-generate)"
                }
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
              />
              <button
                type="button"
                onClick={() => setSecret(genSecret(32))}
                className="rounded-lg bg-sky-100 px-3 py-2 text-sm text-sky-700 hover:bg-sky-200"
              >
                Generate
              </button>
            </div>
            {isEdit && (
              <p className="mt-1 text-xs text-slate-500">
                เว้นว่างเพื่อคง secret เดิมไว้
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Events
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ENTITY_GROUPS.map((g) => (
                <div
                  key={g.entity}
                  className="rounded-lg border border-slate-200 p-2"
                >
                  <div className="mb-1 text-xs font-semibold text-slate-700">
                    {g.label}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={events.has(`${g.entity}.*`)}
                      onChange={() => toggleEvent(`${g.entity}.*`)}
                    />
                    <span className="font-mono text-xs">{g.entity}.*</span>
                    <span className="text-xs text-slate-500">(wildcard)</span>
                  </label>
                  <div className="mt-1 ml-4 flex flex-wrap gap-2">
                    {ACTIONS.map((a) => (
                      <label
                        key={a}
                        className="flex items-center gap-1 text-xs text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={events.has(`${g.entity}.${a}`)}
                          onChange={() => toggleEvent(`${g.entity}.${a}`)}
                        />
                        <span className="font-mono">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
