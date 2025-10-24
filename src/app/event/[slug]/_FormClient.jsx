"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormClient({ event }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState({});

  const setVal = (k, v) => setAnswers((prev) => ({ ...prev, [k]: v }));

  function getSelectedArray(key) {
    return Array.isArray(answers[key]) ? answers[key] : [];
  }

  async function onSubmit(e) {
    e.preventDefault();

    // ===== Custom validation สำหรับ radio/checkbox (รวม Other) =====
    const fields = event.form_fields || [];

    for (const f of fields) {
      // RADIO: ถ้า required และเลือก Other ต้องกรอกข้อความด้วย
      if (f.type === "radio") {
        const selected = answers[f.key];
        const otherKey = `${f.key}__other`;
        if (f.required && !selected) {
          alert(`กรุณาเลือกตัวเลือกในหัวข้อ: ${f.label}`);
          return;
        }
        if (selected === "Other" && f.required) {
          if (!String(answers[otherKey] || "").trim()) {
            alert(`กรุณากรอกข้อความสำหรับ "Other" ในหัวข้อ: ${f.label}`);
            return;
          }
        }
      }

      // CHECKBOX: ถ้า required ต้องติ๊กอย่างน้อย 1 รายการ
      if (f.type === "checkbox") {
        const selected = getSelectedArray(f.key);
        const otherEnabled = !!answers[`${f.key}__other_enabled`];
        const otherText = String(answers[`${f.key}__other`] || "").trim();

        if (f.required) {
          // ไม่ได้ติ๊กใด ๆ และไม่ได้เปิด Other
          if (selected.length === 0 && !otherEnabled) {
            alert(`กรุณาเลือกอย่างน้อย 1 รายการในหัวข้อ: ${f.label}`);
            return;
          }
          // ถ้าเปิด Other ต้องกรอกข้อความด้วย
          if (otherEnabled && otherText === "") {
            alert(`กรุณากรอกข้อความสำหรับ "Other" ในหัวข้อ: ${f.label}`);
            return;
          }
        }
      }
    }
    // ===== end validation =====

    setLoading(true);
    const r = await fetch(`/api/events/${event.slug}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setLoading(false);
    if (r.ok) {
      router.push(`/event/${event.slug}/success`);
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {(event.form_fields || []).map((f) => (
        <div key={f.key} className="space-y-2">
          <label className="block font-medium">
            {f.label} {f.required && <span className="text-red-400">*</span>}
          </label>

          {/* short/email/phone */}
          {["short_text", "email", "phone"].includes(f.type) && (
            <input
              required={f.required}
              type={f.type === "email" ? "email" : "text"}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              onChange={(e) => setVal(f.key, e.target.value)}
            />
          )}

          {/* long text */}
          {f.type === "long_text" && (
            <textarea
              required={f.required}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              onChange={(e) => setVal(f.key, e.target.value)}
            />
          )}

          {/* select */}
          {f.type === "select" && (
            <select
              required={f.required}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              onChange={(e) => setVal(f.key, e.target.value)}
            >
              <option value="">-- เลือก --</option>
              {(f.options || []).map((op, i) => (
                <option key={i} value={op}>
                  {op}
                </option>
              ))}
            </select>
          )}

          {/* radio + Other */}
          {f.type === "radio" && (
            <RadioWithOther field={f} answers={answers} setVal={setVal} />
          )}

          {/* checkbox + Other */}
          {f.type === "checkbox" && (
            <CheckboxWithOther field={f} answers={answers} setVal={setVal} />
          )}
        </div>
      ))}

      <button
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}

/* ---------- sub components ---------- */
function RadioWithOther({ field: f, answers, setVal }) {
  const otherKey = `${f.key}__other`;
  const selected = answers[f.key];

  return (
    <div className="flex flex-col gap-2">
      {(f.options || []).map((op, i) => {
        const isOther = String(op).trim().toLowerCase() === "other";
        return (
          <div key={i} className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={f.key}
                value={op}
                onChange={() => setVal(f.key, op)}
                required={f.required}
              />
              <span>{op}</span>
            </label>
            {isOther && selected === "Other" && (
              <input
                type="text"
                className="ml-6 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                placeholder="โปรดระบุ..."
                value={answers[otherKey] || ""}
                onChange={(e) => setVal(otherKey, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckboxWithOther({ field: f, answers, setVal }) {
  const otherToggleKey = `${f.key}__other_enabled`;
  const otherValueKey = `${f.key}__other`;
  const selected = Array.isArray(answers[f.key]) ? answers[f.key] : [];

  return (
    <div className="flex flex-col gap-2">
      {(f.options || []).map((op, i) => {
        const isOther = String(op).trim().toLowerCase() === "other";
        return (
          <div key={i} className="flex flex-col gap-2">
            {!isOther ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(op)}
                  onChange={(e) => {
                    const prev = Array.isArray(answers[f.key]) ? answers[f.key] : [];
                    setVal(
                      f.key,
                      e.target.checked ? [...prev, op] : prev.filter((v) => v !== op)
                    );
                  }}
                />
                <span>{op}</span>
              </label>
            ) : (
              <>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!answers[otherToggleKey]}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setVal(otherToggleKey, enabled);
                      if (!enabled) setVal(otherValueKey, "");
                    }}
                  />
                  <span>Other</span>
                </label>
                {!!answers[otherToggleKey] && (
                  <input
                    type="text"
                    className="ml-6 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                    placeholder="โปรดระบุ..."
                    value={answers[otherValueKey] || ""}
                    onChange={(e) => setVal(otherValueKey, e.target.value)}
                    // ช่องนี้จะถูกบังคับใน onSubmit แล้ว
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
