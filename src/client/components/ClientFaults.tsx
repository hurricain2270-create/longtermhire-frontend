// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { equipmentApi } from "../../services/equipmentApi";
import { BTN } from "../../styles/buttons";

const API = "https://api.longtermhire.com";

const OPTIONS = [
  { key: "emergency", label: "Emergency", hint: "Unsafe, or everything's held up", colour: "#B91C1C" },
  { key: "stopped", label: "It's stopped", hint: "Can't be used at all", colour: "#ef4444" },
  { key: "degraded", label: "Working, but not right", hint: "Still usable, something's wrong", colour: "#F59E0B" },
  { key: "attention", label: "Needs attention", hint: "Tyre, light, hose — that sort of thing", colour: "#4CAF50" },
];

// Some files (HEIC from iPhone, drags out of Apple Photos) arrive with an
// empty MIME type, so fall back to the extension rather than dropping them.
const isImageFile = (f) =>
  !!f && (f.type ? f.type.startsWith("image/") : /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i.test(f.name || ""));

const photosOf = (raw) => {
  if (!raw) return [];
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(p) ? p : [];
  } catch (e) {
    return [];
  }
};

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


// What a supplier needs before they will turn up. Kept short on purpose — a man
// standing next to a broken machine will answer three questions, not ten.
const PLAYBOOK = {
  Tyres: ["Which tyre", "Tyre size if you can see it", "Where on site"],
  Hydraulics: ["Which hose or ram", "Is it leaking under load", "Where on site"],
  "Auto electrical": ["What is not working", "Does it crank", "Where on site"],
  "Fitter / mechanic": ["What is it doing", "Any warning lights", "Where on site"],
  "Towing / float": ["Can it be driven", "Where does it need to go", "Where on site"],
  Glass: ["Which window", "Where on site"],
  Welding: ["What has broken", "Where on site"],
  Other: ["What is needed", "Where on site"],
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
  const [photos, setPhotos] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyPhotos, setReplyPhotos] = useState([]);
  const [, tick] = useState(0);

  useEffect(() => { load(); loadMachines(); }, []);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Live thread — same 3s poll as the chat, reusing the existing fetch.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(API + "/v1/api/longtermhire/client/faults/" + open, {
          headers: { Authorization: "Bearer " + token() },
        });
        const j = await res.json();
        if (j && !j.error) setThread(j.data.updates || []);
        load();
      } catch (e) { /* quiet — next tick will retry */ }
    }, 3000);
    return () => clearInterval(t);
  }, [open]);

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

  const uploadOne = async (file) => {
    // Same upload path the main chat uses — proven to work on both portals.
    const up = await equipmentApi.uploadFile(file);
    if (!up?.url) throw new Error("no url returned");
    return up.url;
  };

  const addReplyPhotos = async (files) => {
    const list = Array.from(files || []).filter(isImageFile);
    if (!list.length) return;
    setUploading(true);
    for (const file of list) {
      try {
        const url = await uploadOne(file);
        setReplyPhotos((p) => [...p, url]);
      } catch (e) {
        console.error("Fault reply photo upload failed:", e);
        toast.error("Upload failed: " + (e?.message || "unknown"), { autoClose: 15000 });
      }
    }
    setUploading(false);
  };

  const addPhotos = async (files) => {
    const list = Array.from(files || []).filter(isImageFile);
    if (!list.length) return;
    setUploading(true);
    for (const file of list) {
      try {
        const url = await uploadOne(file);
        if (url) {
          setPhotos((p) => [...p, url]);
        } else {
          toast.error("That photo wouldn't upload");
        }
      } catch (e) {
        toast.error("That photo wouldn't upload");
      }
    }
    setUploading(false);
  };

  // After a fault is raised on a machine set up for it, offer the trades that
  // machine is actually covered for. Coverage decides — no cover, no offer, and
  // it goes back to us the old way.
  const [dispatch, setDispatch] = useState(null); // { faultId, trades, trade, answers }
  const [dispatching, setDispatching] = useState(false);

  const offerDispatch = async (faultId) => {
    try {
      const res = await fetch(
        API + "/v1/api/longtermhire/client/faults/" + faultId + "/dispatch-options",
        { headers: { Authorization: "Bearer " + token() } }
      );
      const j = await res.json();
      if (!j.error && j.data?.trades?.length) {
        setDispatch({ faultId, trades: j.data.trades, trade: null, answers: {} });
      }
    } catch (e) {
      // Nothing to offer is a perfectly normal outcome.
    }
  };

  const sendDispatch = async () => {
    if (!dispatch?.trade) return;
    setDispatching(true);
    try {
      const res = await fetch(
        API + "/v1/api/longtermhire/client/faults/" + dispatch.faultId + "/dispatch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
          body: JSON.stringify({ trade: dispatch.trade, answers: dispatch.answers }),
        }
      );
      const j = await res.json();
      if (j.error) { toast.error(j.message || "Could not send that"); return; }
      toast.success(j.data?.sent ? j.data.supplier + " has been sent the job" : "Logged — give them a ring");
      setDispatch(null);
      load();
    } catch (e) {
      toast.error("Could not send that");
    } finally { setDispatching(false); }
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
        body: JSON.stringify({ ...form, message: form.title, attachments: photos }),
      });
      const j = await res.json();
      if (j.error) { toast.error(j.message || "Could not report that"); return; }
      toast.success("Reported — we're on it");
      if (j.data?.id) offerDispatch(j.data.id);
      setReporting(false);
      setForm({ equipment_id: "", reported_severity: "", title: "" });
      setPhotos([]);
      load();
    } catch (e) {
      toast.error("Could not report that");
    } finally { setBusy(false); }
  };

  const sendReply = async (id) => {
    if (!reply.trim() && replyPhotos.length === 0) return;
    try {
      setBusy(true);
      await fetch(API + "/v1/api/longtermhire/client/faults/" + id + "/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token() },
        body: JSON.stringify({ message: reply, attachments: replyPhotos }),
      });
      setReply("");
      setReplyPhotos([]);
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
          <span>{done ? "took " + human(usedH) : Math.round(pct) + "% of the estimated fault repair timeline"}</span>
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
        {/* Hazard stripes — the one thing on this page that should be
            impossible to miss. The label sits on a solid panel so it stays
            readable over the stripes. */}
        <button onClick={() => setReporting(true)}
          className="px-4 py-2.5 rounded-lg font-bold text-sm hover:brightness-110 transition-all whitespace-nowrap"
          style={{
            background:
              "repeating-linear-gradient(45deg, #FDCE06 0px, #FDCE06 10px, #1F1F20 10px, #1F1F20 20px)",
            color: "#ffffff",
            // The label crosses both the yellow and the black, so it needs an
            // outline to stay readable on either.
            textShadow:
              "0 0 3px #000, 0 0 3px #000, 0 0 3px #000, 0 1px 2px #000",
          }}>
          Report a Fault
        </button>
      </div>

      {dispatch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog" aria-label="Send this job to a supplier">
          <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-5 w-full max-w-[420px]">
            {!dispatch.trade ? (
              <>
                <h3 className="text-[#E5E5E5] font-[Inter] text-[19px] font-semibold mb-1">
                  What is it?
                </h3>
                <p className="text-[#9CA3AF] font-[Inter] text-[13px] mb-4">
                  Pick one and we will get someone out to it.
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {dispatch.trades.map((t) => (
                    <button key={t}
                      onClick={() => setDispatch({ ...dispatch, trade: t })}
                      className="w-full text-left px-4 py-3 rounded-lg bg-[#292A2B] border border-[#333] text-[#E5E5E5] text-[16px] hover:border-[#FDCE06] transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
                {/* Deliberately quieter than the buttons. It should be there when
                    it is genuinely something else, not the easy way out. */}
                <button onClick={() => setDispatch(null)}
                  className="text-[#6B7280] font-[Inter] text-[13px] hover:text-[#9CA3AF]">
                  It is something else — leave it with Long Term Hire
                </button>
              </>
            ) : (
              <>
                <h3 className="text-[#E5E5E5] font-[Inter] text-[19px] font-semibold mb-1">
                  {dispatch.trade}
                </h3>
                <p className="text-[#9CA3AF] font-[Inter] text-[13px] mb-4">
                  Two or three things so they turn up with the right gear.
                </p>
                {(PLAYBOOK[dispatch.trade] || PLAYBOOK.Other).map((q) => (
                  <div key={q} className="mb-3">
                    <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">{q}</label>
                    <input
                      value={dispatch.answers[q] || ""}
                      onChange={(e) =>
                        setDispatch({ ...dispatch, answers: { ...dispatch.answers, [q]: e.target.value } })
                      }
                      className="w-full bg-[#292A2B] border border-[#333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]"
                    />
                  </div>
                ))}
                <div className="flex gap-2.5 mt-5">
                  <button onClick={sendDispatch} disabled={dispatching} className={BTN.success + " flex-1"}>
                    {dispatching ? "Sending…" : "Send it"}
                  </button>
                  <button onClick={() => setDispatch({ ...dispatch, trade: null })} className={BTN.secondary}>
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                      <div className="text-[13px] text-[#6B7280] mb-1">
                        {u.author_side === "admin" ? "Long Term Hire" : u.author_name}
                        {EVENT_LABEL[u.event_type] ? " · " + EVENT_LABEL[u.event_type] : ""}
                        {" · " + stamp(u.created_at)}
                      </div>
                      {u.message ? (
                        <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-[13px] leading-relaxed ${
                          u.author_side === "client" ? "bg-[#FDCE06] text-[#1F1F20]" : "bg-[#1F1F20] text-[#E5E5E5] border border-[#333333]"
                        }`}>{u.message}</div>
                      ) : null}
                      {photosOf(u.attachments).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {photosOf(u.attachments).map((src, n) => (
                            <a key={n} href={src} target="_blank" rel="noreferrer"
                              className="block w-24 h-24 rounded-lg overflow-hidden border border-[#333] hover:border-[#FDCE06] transition-colors">
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {!f.resolved_at && (
                    <>
                      {replyPhotos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {replyPhotos.map((src, n) => (
                            <div key={n} className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#292A2B]">
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              <button type="button"
                                onClick={() => setReplyPhotos((p) => p.filter((_, x) => x !== n))}
                                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[11px] leading-none flex items-center justify-center">
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-4">
                        <label className="w-11 h-11 flex-none rounded-lg border border-[#3A3A3C] bg-[#232325] flex items-center justify-center cursor-pointer hover:border-[#FDCE06] transition-colors">
                          <span className="text-[#FDCE06] text-[20px] leading-none font-light">
                            {uploading ? "…" : "+"}
                          </span>
                          <input type="file" accept="image/*,.heic,.heif" multiple
                            onChange={(e) => { addReplyPhotos(e.target.files); e.target.value = ""; }}
                            className="hidden" />
                        </label>
                        <input value={reply} onChange={(e) => setReply(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (!busy) sendReply(f.id);
                            }
                          }}
                          placeholder="Add an update…"
                          className="flex-1 bg-[#D8D8D6] border border-[#BFBFBD] rounded-lg px-3 py-2.5 text-[#1F1F20] text-[14px] outline-none focus:border-[#FDCE06] placeholder:text-[#6B6B69] transition-colors" />
                        <button onClick={() => sendReply(f.id)} disabled={busy}
                          className="px-4 py-2 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 transition-colors whitespace-nowrap">
                          Send
                        </button>
                      </div>
                    </>
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
                className={inputCls + " resize-none mb-5"} />

              <label className="block text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-2">
                Photos
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addPhotos(e.dataTransfer.files); }}
                className={"rounded-xl border-2 border-dashed p-3 transition-colors " +
                  (dragging ? "border-[#FDCE06] bg-[#2A2718]" : "border-[#3A3A3C]")}
              >
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#292A2B]">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => setPhotos((p) => p.filter((_, n) => n !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[12px] leading-none flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}

                  <label className="aspect-square rounded-lg border border-[#3A3A3C] bg-[#232325] flex flex-col items-center justify-center cursor-pointer hover:border-[#FDCE06] transition-colors">
                    <span className="text-[#FDCE06] text-[26px] leading-none font-light">+</span>
                    <span className="text-[#6B7280] text-[10px] mt-1">
                      {uploading ? "…" : "photo"}
                    </span>
                    <input type="file" accept="image/*,.heic,.heif" multiple
                      onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }}
                      className="hidden" />
                  </label>
                </div>
                <p className="text-[#4A4A4C] text-[11px] mt-2 hidden sm:block">
                  Drag photos in, or click the square.
                </p>
              </div>
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
