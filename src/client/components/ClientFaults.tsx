// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

const API = "https://api.longtermhire.com";

const OPTIONS = [
  { key: "emergency", label: "Emergency", hint: "Unsafe, or everything's held up", colour: "#B91C1C" },
  { key: "stopped", label: "It's stopped", hint: "Can't be used at all", colour: "#ef4444" },
  { key: "degraded", label: "Working, but not right", hint: "Still usable, something's wrong", colour: "#F59E0B" },
  { key: "attention", label: "Needs attention", hint: "Tyre, light, hose — that sort of thing", colour: "#4CAF50" },
];

const hoursBetween = (a, b) => {
  if (!a) return 0;
  const start = new Date(String(a).replace(" ", "T"));
  const end = b ? new Date(String(b).replace(" ", "T")) : new Date();
  return Math.max(0, (end - start) / 3600000);
};

const human = (h) => {
  if (h < 1) return Math.round(h * 60) + "m";
  if (h < 48) return Math.floor(h) + "h " + Math.round((h % 1) * 60) + "m";
  return Math.floor(h / 24) + "d " + Math.round(h % 24) + "h";
};

const stamp = (d) => {
  if (!d) return "";
  try {
    return new Date(String(d).replace(" ", "T"))
      .toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  } catch (e) { return ""; }
};

const EVENT_LABEL = {
  reported: "Reported", acknowledged: "Seen", classified: "Assessed",
  actioned: "Actioned", attended: "On site", resolved: "Back in service",
};

const ClientFaults = () => {
  const [equipment, setEquipment] = useState([]);
  const [faults, setFaults] = useState([]);
  const [open, setOpen] = useState(null);
  const [thread, setThread] = useState([]);
  const [reporting, setReporting] = useState(false);
  const [form, setForm] = useState({ equipment_id: "", reported_severity: "", title: "" });
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => { load(); loadMachines(); }, []);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const token = () => localStorage.getItem("clientAuthToken");

  const loadMachines = async () => {
    try {
      const res = await fetch(API + "/v1/api/longtermhire/client/my-site", {
        headers: { Authorization: "Bearer " + token() },
      });
      const j = await res.json();
      if (j && !j.error) setEquipment((j.data && j.data.equipment) || []);
    } catch (e) { /* quiet */ }
  };

  const load = async () => {
    try {
      const res = await fetch(API + "/v1/api/longtermhire/client/faults", {
        headers: { Authorization: "Bearer " + token() },
      });
      const j = await res.json();
      if (j && !j.error) setFaults(j.data || []);
    } catch (e) { /* quiet */ }
  };

  const openFault = async (f) => {
    if (open === f.id) { setOpen(null); return; }
    setOpen(f.id);
    try {
      const res = await fetch(API + "/v1/api/longtermhire/client/faults/" + f.id, {
        headers: { Authorization: "Bearer " + token() },
      });
      const j = await res.json();
      if (j && !j.error) setThread(j.data.updates || []);
    } catch (e) { /* quiet */ }
  };

  const submit = async () => {
    if (!form.equipment_id) { toast.error("Which machine?"); return; }
    if (!form.reported_severity) { toast.error("Pick what's happened"); return; }
    if (!form.title.trim()) { toast.error("Tell us what you're seeing"); return; }
    try {
      setBusy(true);
      const res = await fetch(API + "/v1/api/longtermhire/client/faults", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({ ...form, message: form.title }),
      });
      const j = await res.json();
      if (j.error) { toast.error(j.message || "Could not report that"); return; }
      toast.success("Reported — we're on it");
      setReporting(false);
      setForm({ equipment_id: "", reported_severity: "", title: "" });
      load();
    } catch (e) {
      toast.error("Could not report that");
    } finally { setBusy(false); }
  };

  const sendReply = async (id) => {
    if (!reply.trim()) return;
    try {
      setBusy(true);
      await fetch(API + "/v1/api/longtermhire/client/faults/" + id + "/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({ message: reply }),
      });
      setReply("");
      const res = await fetch(API + "/v1/api/longtermhire/client/faults/" + id, {
        headers: { Authorization: "Bearer " + token() },
      });
      const j = await res.json();
      if (j && !j.error) setThread(j.data.updates || []);
    } catch (e) {
      toast.error("Could not send that");
    } finally { setBusy(false); }
  };

  const Bars = ({ f }) => {
    if (!f.severity) {
      return (
        <div className="bg-[#232325] border border-dashed border-[#3A3A3C] rounded-lg px-4 py-3 mb-3">
          <div className="text-[#9CA3AF] text-[13px]">Reported. We're looking at it.</div>
          <div className="text-[#E5E5E5] text-[17px] font-bold tabular-nums mt-0.5">
            {human(hoursBetween(f.reported_at))}
          </div>
        </div>
      );
    }
    const isEmergency = f.severity === "emergency";
    const done = !!f.resolved_at;

    if (isEmergency) {
      const respH = hoursBetween(f.reported_at, f.actioned_at);
      const respPct = Math.min(100, (respH / 24) * 100);
      return (
        <div className="mb-3">
          <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1.5">
            <span className="uppercase tracking-[0.06em] text-[10px]">Response</span>
            <span className={f.actioned_at ? "text-[#4CAF50] font-bold" : ""}>
              {f.actioned_at ? "Actioned in " + human(respH) : human(respH) + " so far"}
            </span>
          </div>
          <div className="bg-[#252527] rounded-full h-2.5 overflow-hidden mb-3">
            <div className="h-2.5 transition-all"
              style={{ width: respPct + "%", background: f.actioned_at ? "#4CAF50" : respPct > 66 ? "#ef4444" : "#F59E0B" }} />
          </div>
          <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1.5">
            <span className="uppercase tracking-[0.06em] text-[10px]">Repair</span>
            <span>{done ? "Back in service" : "In progress"}</span>
          </div>
          <div className="bg-[#252527] rounded-full h-2.5 overflow-hidden">
            <div className="h-2.5" style={{ width: done ? "100%" : "45%", background: done ? "#4CAF50" : "#F59E0B" }} />
          </div>
        </div>
      );
    }

    const usedH = hoursBetween(f.reported_at, f.resolved_at);
    const win = f.window_hours || 72;
    const pct = Math.min(100, (usedH / win) * 100);
    const colour = done ? "#4CAF50" : pct > 75 ? "#ef4444" : pct > 40 ? "#F59E0B" : "#4CAF50";
    return (
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-[#9CA3AF] mb-1.5">
          <span>{done ? "Back in service" : "Being sorted"}</span>
          <span>{done ? "took " + human(usedH) : Math.round(pct) + "% of the window"}</span>
        </div>
        <div className="bg-[#252527] rounded-full h-2.5 overflow-hidden">
          <div className="h-2.5 transition-all" style={{ width: Math.max(2, pct) + "%", background: colour }} />
        </div>
      </div>
    );
  };

  const inputCls =
    "w-full bg-[#292A2B] border border-[#3A3A3C] rounded-lg px-3 py-2.5 text-[#E5E5E5] text-[14px] outline-none focus:border-[#FDCE06] transition-colors";

  return (
    <section className="mb-12 lg:mb-16">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h2 className="text-[#D1D5DB] text-xl sm:text-2xl font-semibold mb-1">Faults</h2>
          <p className="text-[#9CA3AF] text-sm">Something wrong? Tell us and we'll pick it up straight away.</p>
        </div>
        <button onClick={() => setReporting(true)}
          className="px-4 py-2.5 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-bold text-sm hover:bg-[#E5B800] transition-colors whitespace-nowrap">
          Report a fault
        </button>
      </div>

      {faults.length > 0 && (
        <div className="space-y-3 mt-5">
          {faults.map((f) => (
            <div key={f.id} className="bg-[#1F1F20] border border-[#333] rounded-xl p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[#E5E5E5] text-[16px] font-semibold">{f.title}</div>
                  <div className="text-[#6B7280] text-xs mt-0.5">
                    {f.plant_code} · {f.equipment_name} · {stamp(f.reported_at)}
                  </div>
                </div>
                {f.resolved_at ? (
                  <span className="text-[11px] px-3 py-1 rounded-full bg-[#14301C] text-[#4CAF50] border border-[#2d5a2d] font-medium">
                    Resolved
                  </span>
                ) : null}
              </div>

              <Bars f={f} />

              <button onClick={() => openFault(f)}
                className="text-[#FDCE06] text-sm font-medium hover:underline">
                {open === f.id ? "Hide" : "View updates"}
              </button>

              {open === f.id && (
                <div className="mt-4 border-t border-[#2A2A2A] pt-4">
                  {thread.map((u) => (
                    <div key={u.id} className="mb-4 last:mb-0">
                      <div className="text-[11px] text-[#6B7280] mb-1">
                        {u.author_side === "admin" ? "Long Term Hire" : u.author_name}
                        {EVENT_LABEL[u.event_type] ? " · " + EVENT_LABEL[u.event_type] : ""}
                        {" · " + stamp(u.created_at)}
                      </div>
                      {u.message ? (
                        <div className="text-[#E5E5E5] text-[13px] leading-relaxed">{u.message}</div>
                      ) : null}
                    </div>
                  ))}
                  {!f.resolved_at && (
                    <div className="flex gap-2 mt-4">
                      <input value={reply} onChange={(e) => setReply(e.target.value)}
                        placeholder="Add an update…" className={inputCls} />
                      <button onClick={() => sendReply(f.id)} disabled={busy}
                        className="px-4 py-2 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 transition-colors whitespace-nowrap">
                        Send
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {reporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#1F1F20] border border-[#333] rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#333]">
              <h3 className="text-[#E5E5E5] font-semibold text-[17px]">What's happened?</h3>
            </div>
            <div className="px-5 py-4">
              <label className="block text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-2">Machine</label>
              <select value={form.equipment_id}
                onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}
                className={inputCls + " mb-5"}>
                <option value="">Choose a machine</option>
                {equipment.map((e) => (
                  <option key={e.equipment_id} value={e.equipment_id}>
                    {e.plant_code} — {e.equipment_name}
                  </option>
                ))}
              </select>

              <div className="space-y-2 mb-5">
                {OPTIONS.map((o) => (
                  <button key={o.key}
                    onClick={() => setForm({ ...form, reported_severity: o.key })}
                    className={"w-full flex items-center gap-3 text-left border rounded-xl px-4 py-3 transition-colors " +
                      (form.reported_severity === o.key
                        ? "border-[#FDCE06] bg-[#2A2718]"
                        : "border-[#3A3A3C] bg-[#232325] hover:border-[#555]")}>
                    <span className="w-2.5 h-8 rounded flex-none" style={{ background: o.colour }} />
                    <span>
                      <span className="block text-[#E5E5E5] text-[14px] font-semibold">{o.label}</span>
                      <span className="block text-[#9CA3AF] text-[12px]">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              <textarea value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                rows={3} placeholder="What are you seeing?"
                className={inputCls + " resize-none"} />
            </div>
            <div className="px-5 py-4 border-t border-[#333] flex justify-end gap-3">
              <button onClick={() => setReporting(false)}
                className="px-4 py-2 border border-[#444] rounded-lg text-[#E5E5E5] font-bold text-sm hover:border-[#666] transition-colors">
                Cancel
              </button>
              <button onClick={submit} disabled={busy}
                className="px-5 py-2 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 transition-colors">
                {busy ? "Sending…" : "Report it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ClientFaults;
