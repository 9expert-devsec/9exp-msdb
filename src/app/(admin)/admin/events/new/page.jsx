"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkboxes" },
];

export default function NewEvent() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", banner_url: "", description: "",
    start_date: "", location: "", published: true, email_field_key: "",
  });
  const [fields, setFields] = useState([]);

  const addField = () =>
    setFields(v => [...v, { key:`field_${Date.now()}`, label:"Untitled", type:"short_text", required:false, options:[] }]);

  const updateField = (i, patch) => setFields(v => v.map((f,idx)=>idx===i?{...f,...patch}:f));

  const submit = async () => {
    const payload = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date) : null,
      form_fields: fields,
    };
    const r = await fetch("/api/admin/events", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    if (r.ok) router.push("/admin/events");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Create Event</h1>

      <div className="grid gap-3">
        <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Title *" value={form.title} onChange={e=>setForm(s=>({...s, title:e.target.value}))}/>
        <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Banner URL" value={form.banner_url} onChange={e=>setForm(s=>({...s, banner_url:e.target.value}))}/>
        <textarea rows={4} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="Description" value={form.description} onChange={e=>setForm(s=>({...s, description:e.target.value}))}/>
        <div className="grid sm:grid-cols-2 gap-3">
          <input type="datetime-local" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            value={form.start_date} onChange={e=>setForm(s=>({...s, start_date:e.target.value}))}/>
          <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            placeholder="Location" value={form.location} onChange={e=>setForm(s=>({...s, location:e.target.value}))}/>
        </div>
        <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          placeholder="(Optional) Email field key เช่น email" value={form.email_field_key}
          onChange={e=>setForm(s=>({...s, email_field_key:e.target.value}))}/>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.published} onChange={e=>setForm(s=>({...s, published:e.target.checked}))}/>
          Published
        </label>
      </div>

      <div className="h-px bg-white/10" />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Form fields</h2>
          <button onClick={addField} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">+ Add field</button>
        </div>

        <div className="space-y-3">
          {fields.map((f,i)=>(
            <div key={f.key} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="grid sm:grid-cols-[1fr_200px_110px] gap-3">
                <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  value={f.label} onChange={e=>updateField(i,{label:e.target.value})}/>
                <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  value={f.type} onChange={e=>updateField(i,{type:e.target.value, options:[]})}>
                  {TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={f.required} onChange={e=>updateField(i,{required:e.target.checked})}/>
                  Required
                </label>
              </div>

              {(f.type==="select"||f.type==="radio"||f.type==="checkbox") && (
                <Options value={f.options} onChange={opts=>updateField(i,{options:opts})}/>
              )}

              <div className="text-xs opacity-70">key: {f.key}</div>
              <div className="flex gap-2">
                <button className="px-2 py-1 rounded bg-red-500/20 border border-red-500/30"
                        onClick={()=>setFields(v=>v.filter((_,idx)=>idx!==i))}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={submit} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">Save Event</button>
    </div>
  );
}

function Options({ value=[], onChange }) {
  const [txt,setTxt]=useState("");
  const add=()=>{ if(!txt.trim())return; onChange([...(value||[]), txt.trim()]); setTxt(""); };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
               placeholder="Add option" value={txt} onChange={e=>setTxt(e.target.value)}/>
        <button onClick={add} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">+</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(value||[]).map((op,idx)=>(
          <span key={idx} className="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
            {op} <button className="ml-1 opacity-70" onClick={()=>onChange(value.filter((_,i)=>i!==idx))}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}
