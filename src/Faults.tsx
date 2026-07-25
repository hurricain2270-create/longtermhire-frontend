// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";
import { equipmentApi } from "./services/equipmentApi";

// Some files (HEIC from iPhone, drags out of Apple Photos) arrive with an
// empty MIME type, so fall back to the extension rather than dropping them.
const isImageFile = (f) =>
  !!f && (f.type ? f.type.startsWith("image/") : /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i.test(f.name || ""));

// Severity only. How long it takes to fix is a separate judgement, picked
// per fault, because the two don't correlate.
const BANDS = [
  { key: "emergency", label: "Emergency", colour: "#B91C1C" },
  { key: "major", label: "Major failure", colour: "#ef4444" },
  { key: "mechanical", label: "Mechanical", colour: "#F59E0B" },
  { key: "minor", label: "Minor", colour: "#4CAF50" },
];

const TIMEFRAMES = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 168 },
  { label: "2 weeks", hours: 336 },
  { label: "4 weeks", hours: 672 },
];

const REPORTED_AS = {
  emergency: "Emergency", stopped: "It's stopped",
  degraded: "Working, but not right", attention: "Needs attention",
};

const EVENT_LABEL = {
  reported: "Reported", acknowledged: "Seen", classified: "Assessed",
  actioned: "Actioned", attended: "On site", resolved: "Back in service", message: "",
};

const photosOf = (raw) => {
  if (!raw) return [];
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(p) ? p : [];
  } catch (e) {
    return [];
  }
};

const hrs = (a, b) => {
  if (!a) return 0;
  const s = new Date(String(a).replace(" ", "T"));
  const e = b ? new Date(String(b).replace(" ", "T")) : new Date();
  return Math.max(0, (e - s) / 3600000);
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

// At module scope — declaring these inside the component remounts them on every
// keystroke, which destroys the input and loses focus.
const inputCls =
  "flex-1 bg-[#292A2B] border border-[#3A3A3C] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-[14px] outline-none focus:border-[#FDCE06]";

const Card = ({
  f, open, detail, busy, reply, setReply,
  replyPhotos, setReplyPhotos, uploading, addReplyPhotos,
  resolveHours, setResolveHours,
  pendingBand, setPendingBand, customDays, setCustomDays,
  openFault, classify, stage, send,
}) => {
  const band = BANDS.find((b) => b.key === f.severity);
  const isOpen = open === f.id;
  const d = isOpen && detail ? detail.fault : f;
  const updates = isOpen && detail ? detail.updates : [];

  return (
    <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-4 sm:p-5 mb-3">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[#E5E5E5] font-[Inter] text-[15px] font-semibold">{f.title}</div>
          <div className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">
            {f.fault_no} · {f.plant_code} {f.equipment_name} · {f.company_name} · {stamp(f.reported_at)}
          </div>
          <div className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">
            {f.reported_by_name} called it &ldquo;{REPORTED_AS[f.reported_severity] || f.reported_severity}&rdquo;
          </div>
        </div>
        <div className="text-right">
          {band ? (
            <span className="text-[12px] px-2.5 py-1 rounded-full font-[Inter] font-bold"
              style={{ background: band.colour + "22", color: band.colour, border: "1px solid " + band.colour + "55" }}>
              {band.label}{d.window_hours ? " · " + human(d.window_hours) : ""}
            </span>
          ) : (
            <span className="text-[12px] px-2.5 py-1 rounded-full bg-[#3a2e00] text-[#FDCE06] border border-[#5a4800] font-[Inter] font-bold">
              Needs assessing
            </span>
          )}
          <div className="text-[#9CA3AF] font-[Inter] text-[12px] mt-1.5 tabular-nums">
            {f.resolved_at ? "took " + human(hrs(f.reported_at, f.resolved_at)) : human(hrs(f.reported_at)) + " open"}
          </div>
        </div>
      </div>

      {f.severity && (
        f.severity === "emergency" ? (
          <div className="mb-3">
            <div className="flex justify-between text-[12px] text-[#9CA3AF] font-[Inter] mb-1.5">
              <span className="uppercase tracking-[0.06em] text-[11px]">Response</span>
              <span className={f.actioned_at ? "text-[#4CAF50] font-bold" : ""}>
                {f.actioned_at
                  ? "actioned in " + human(hrs(f.reported_at, f.actioned_at))
                  : human(hrs(f.reported_at)) + " so far"}
              </span>
            </div>
            <div className="bg-[#252527] rounded-full h-2 overflow-hidden mb-3">
              <div className="h-2 transition-all" style={{
                width: Math.min(100, (hrs(f.reported_at, f.actioned_at) / 24) * 100) + "%",
                background: f.actioned_at ? "#4CAF50"
                  : (hrs(f.reported_at) / 24) * 100 > 66 ? "#ef4444" : "#F59E0B",
              }} />
            </div>
            <div className="flex justify-between text-[12px] text-[#9CA3AF] font-[Inter] mb-1.5">
              <span className="uppercase tracking-[0.06em] text-[11px]">Repair</span>
              <span>{f.resolved_at ? "back in service" : "in progress"}</span>
            </div>
            <div className="bg-[#252527] rounded-full h-2 overflow-hidden">
              <div className="h-2" style={{
                width: f.resolved_at ? "100%" : "45%",
                background: f.resolved_at ? "#4CAF50" : "#F59E0B",
              }} />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="flex justify-between text-[12px] text-[#9CA3AF] font-[Inter] mb-1.5">
              <span>{f.resolved_at ? "Back in service" : "Being sorted"}</span>
              <span>
                {f.resolved_at
                  ? "took " + human(hrs(f.reported_at, f.resolved_at))
                  : Math.round(Math.min(100, (hrs(f.reported_at) / (f.window_hours || 72)) * 100))
                    + "% of the estimated fault repair timeline"}
              </span>
            </div>
            <div className="bg-[#252527] rounded-full h-2 overflow-hidden">
              <div className="h-2 transition-all" style={{
                width: Math.max(2, Math.min(100, (hrs(f.reported_at, f.resolved_at) / (f.window_hours || 72)) * 100)) + "%",
                background: f.resolved_at ? "#4CAF50"
                  : (hrs(f.reported_at) / (f.window_hours || 72)) * 100 > 75 ? "#ef4444"
                  : (hrs(f.reported_at) / (f.window_hours || 72)) * 100 > 40 ? "#F59E0B" : "#4CAF50",
              }} />
            </div>
          </div>
        )
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => openFault(f)}
          className="text-[#FDCE06] font-[Inter] text-[14px] font-medium hover:underline">
          {isOpen ? "Close" : "Open"}
        </button>
        {/* Same badge the chat list uses for unread messages */}
        {f.unanswered > 0 && (
          <div className="bg-[#FDCE06] text-[#1F1F20] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {f.unanswered}
          </div>
        )}
      </div>

      {isOpen && detail && (
        <div className="mt-4 border-t border-[#2A2A2A] pt-4">
          {!d.severity && (
            <div className="mb-4">
              <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
                Assess it — this is what shows the bar to the client
              </div>
              <div className="flex flex-wrap gap-2">
                {BANDS.map((b) => {
                  const picked = pendingBand === b.key;
                  return (
                    <button key={b.key} onClick={() => setPendingBand(picked ? null : b.key)} disabled={busy}
                      className="px-3 py-1.5 rounded border font-[Inter] font-bold text-[12px] transition-colors disabled:opacity-50"
                      style={{
                        borderColor: picked ? b.colour : b.colour + "66",
                        color: picked ? "#1F1F20" : b.colour,
                        background: picked ? b.colour : b.colour + "18",
                      }}>
                      {b.label}
                    </button>
                  );
                })}
              </div>

              {/* Second judgement: how long the repair will take. Unrelated to
                  how serious it is. */}
              {pendingBand && (
                <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                  <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
                    How long to repair?
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {TIMEFRAMES.map((t) => (
                      <button key={t.hours} onClick={() => classify(d.id, pendingBand, t.hours)} disabled={busy}
                        className="px-3 py-1.5 rounded border border-[#333] text-[#E5E5E5] font-[Inter] text-[14px] hover:border-[#FDCE06] hover:text-[#FDCE06] disabled:opacity-50 transition-colors">
                        {t.label}
                      </button>
                    ))}
                    <span className="text-[#6B7280] font-[Inter] text-[12px] px-1">or</span>
                    <input value={customDays} onChange={(e) => setCustomDays(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && parseFloat(customDays) > 0 && !busy) {
                          classify(d.id, pendingBand, parseFloat(customDays) * 24);
                        }
                      }}
                      placeholder="days" inputMode="decimal"
                      className="w-20 bg-[#292A2B] border border-[#333] rounded px-2 py-1.5 text-[#E5E5E5] font-[Inter] text-[14px] outline-none focus:border-[#FDCE06]" />
                    <button
                      onClick={() => classify(d.id, pendingBand, parseFloat(customDays) * 24)}
                      disabled={busy || !(parseFloat(customDays) > 0)}
                      className="px-3 py-1.5 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[14px] hover:bg-[#E5B800] disabled:opacity-50 transition-colors">
                      Set
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            {updates.map((u, i) => {
              const prev = updates[i - 1];
              const gap = prev ? hrs(prev.created_at, u.created_at) : null;
              const mine = u.author_side === "admin";
              return (
                <div key={u.id}>
                  {gap !== null && (
                    <div className="border-l border-dashed border-[#333] ml-[5px] pl-4 py-1.5 text-[#6B7280] font-[Inter] text-[12px]">
                      <span className="text-[#9CA3AF]">{human(gap)}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-none"
                      style={{ background: u.author_side === "admin" ? "#4CAF50" : "#F59E0B" }} />
                    <div className="flex-1">
                      <div className="text-[#6B7280] font-[Inter] text-[12px]">
                        {u.author_side === "admin" ? "You" : u.author_name}
                        {EVENT_LABEL[u.event_type] ? " · " + EVENT_LABEL[u.event_type] : ""}
                        {" · " + stamp(u.created_at)}
                      </div>
                      {u.message ? (
                        <div className={`inline-block max-w-[85%] px-3 py-2 mt-1 rounded-lg font-[Inter] text-[14px] leading-relaxed ${
                          mine ? "bg-[#FDCE06] text-[#1F1F20]" : "bg-[#1F1F20] text-[#E5E5E5] border border-[#333333]"
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
                  </div>
                </div>
              );
            })}
          </div>

          {!d.resolved_at && (
            <>
              {replyPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {replyPhotos.map((src, n) => (
                    <div key={n} className="relative w-16 h-16 rounded overflow-hidden bg-[#292A2B]">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => setReplyPhotos((p) => p.filter((_, x) => x !== n))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[12px] leading-none flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mb-3">
                <label className="w-10 h-10 flex-none rounded border border-[#3A3A3C] bg-[#232325] flex items-center justify-center cursor-pointer hover:border-[#FDCE06] transition-colors">
                  <span className="text-[#FDCE06] text-[18px] leading-none font-light">
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
                      if (!busy) send(d.id);
                    }
                  }}
                  placeholder="Add an update…" className={inputCls} />
                <button onClick={() => send(d.id)} disabled={busy}
                  className="px-4 py-2 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[14px] hover:bg-[#E5B800] disabled:opacity-50 whitespace-nowrap">
                  Send
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {!d.actioned_at && (
                  <button onClick={() => stage(d.id, "actioned")} disabled={busy}
                    className="px-3 py-1.5 rounded border border-[#444] text-[#E5E5E5] font-[Inter] font-bold text-[12px] hover:border-[#666] disabled:opacity-50">
                    Actioned
                  </button>
                )}
                {!d.attended_at && (
                  <button onClick={() => stage(d.id, "attended")} disabled={busy}
                    className="px-3 py-1.5 rounded border border-[#444] text-[#E5E5E5] font-[Inter] font-bold text-[12px] hover:border-[#666] disabled:opacity-50">
                    On site
                  </button>
                )}
                <input value={resolveHours} onChange={(e) => setResolveHours(e.target.value)}
                  placeholder="hrs at handback"
                  className="w-36 bg-[#292A2B] border border-[#3A3A3C] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-[14px] outline-none focus:border-[#FDCE06]" />
                <button onClick={() => stage(d.id, "resolved", { hours: resolveHours })} disabled={busy}
                  className="px-3 py-1.5 rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[12px] hover:bg-[#3d9e43] disabled:opacity-50">
                  Back in service
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};


const Faults = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pendingBand, setPendingBand] = useState(null);
  const [customDays, setCustomDays] = useState("");
  const [reply, setReply] = useState("");
  const [resolveHours, setResolveHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyPhotos, setReplyPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Live thread. Same approach the chat uses: reuse the fetch that already
  // works, on a 3s timer, silently. A fault clock is judged on response time,
  // so a reply must not wait for a refresh.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(async () => {
      try {
        const res = await api.get("/v1/api/longtermhire/super_admin/faults/" + open);
        if (res?.data && !res.data.error) setDetail(res.data.data);
        load(true);
      } catch (e) { /* quiet — next tick will retry */ }
    }, 3000);
    return () => clearInterval(t);
  }, [open]);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/v1/api/longtermhire/super_admin/faults");
      if (res?.data && !res.data.error) setRows(res.data.data || []);
    } catch (e) {
      if (!silent) toast.error("Could not load faults");
    } finally { if (!silent) setLoading(false); }
  };

  // opening it is the acknowledgement — the backend stamps it
  const openFault = async (f) => {
    if (open === f.id) { setOpen(null); setDetail(null); return; }
    setOpen(f.id);
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/faults/" + f.id);
      if (res?.data && !res.data.error) {
        setDetail(res.data.data);
        setResolveHours("");
        load();
      }
    } catch (e) {
      toast.error("Could not open that fault");
    }
  };

  const classify = async (id, band, windowHours) => {
    try {
      setBusy(true);
      await api.put("/v1/api/longtermhire/super_admin/faults/" + id + "/classify",
        { severity: band, window_hours: windowHours });
      toast.success("Classified");
      setPendingBand(null);
      setCustomDays("");
      const res = await api.get("/v1/api/longtermhire/super_admin/faults/" + id);
      if (res?.data && !res.data.error) setDetail(res.data.data);
      load();
    } catch (e) {
      toast.error("Could not classify");
    } finally { setBusy(false); }
  };

  const stage = async (id, name, extra = {}) => {
    try {
      setBusy(true);
      await api.post("/v1/api/longtermhire/super_admin/faults/" + id + "/stage",
        { stage: name, message: reply || null, ...extra });
      setReply("");
      const res = await api.get("/v1/api/longtermhire/super_admin/faults/" + id);
      if (res?.data && !res.data.error) setDetail(res.data.data);
      load();
      toast.success("Updated");
    } catch (e) {
      toast.error("Could not update");
    } finally { setBusy(false); }
  };

  const addReplyPhotos = async (files) => {
    const list = Array.from(files || []).filter(isImageFile);
    if (!list.length) {
      toast.error("That file isn't an image we can read");
      return;
    }
    setUploading(true);
    for (const file of list) {
      try {
        // Same upload path the main chat uses — proven to work on both portals.
        const up = await equipmentApi.uploadFile(file);
        const url = up?.url;
        if (!url) throw new Error("no url returned");
        setReplyPhotos((p) => [...p, url]);
      } catch (e) {
        console.error("Fault reply photo upload failed:", e);
        toast.error("Upload failed: " + (e?.message || "unknown"), { autoClose: 15000 });
      }
    }
    setUploading(false);
  };

  const send = async (id) => {
    if (!reply.trim() && replyPhotos.length === 0) return;
    try {
      setBusy(true);
      await api.post("/v1/api/longtermhire/super_admin/faults/" + id + "/reply", { message: reply, attachments: replyPhotos });
      setReply("");
      setReplyPhotos([]);
      const res = await api.get("/v1/api/longtermhire/super_admin/faults/" + id);
      if (res?.data && !res.data.error) setDetail(res.data.data);
    } catch (e) {
      toast.error("Could not send");
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><ClipLoader color="#FDCE06" size={40} /></div>;
  }

  const openRows = rows.filter((r) => r.status !== "resolved");
  const doneRows = rows.filter((r) => r.status === "resolved");
  const undiagnosed = openRows.filter((r) => !r.severity).length;

  return (
    <div className="p-6">
      <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em] mb-1">Faults</h1>
      <p className="text-[#9CA3AF] font-[Inter] text-sm mb-6">
        Opening a fault marks it seen. Assessing it is what shows the client their bar.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { l: "Open", v: openRows.length, c: openRows.length ? "#FDCE06" : "#E5E5E5" },
          { l: "Needs assessing", v: undiagnosed, c: undiagnosed ? "#ef4444" : "#6B7280" },
          { l: "Resolved", v: doneRows.length, c: "#4CAF50" },
        ].map((t) => (
          <div key={t.l} className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-3">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-1">{t.l}</div>
            <div className="font-[Inter] font-bold text-[23px]" style={{ color: t.c }}>{t.v}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg p-8 text-center text-[#9CA3AF] font-[Inter] text-sm">
          Nothing reported yet.
        </div>
      ) : (
        <>
          {openRows.map((f) => <Card key={f.id} f={f} open={open} detail={detail} busy={busy} reply={reply} setReply={setReply} replyPhotos={replyPhotos} setReplyPhotos={setReplyPhotos} uploading={uploading} addReplyPhotos={addReplyPhotos} resolveHours={resolveHours} setResolveHours={setResolveHours} pendingBand={pendingBand} setPendingBand={setPendingBand} customDays={customDays} setCustomDays={setCustomDays} openFault={openFault} classify={classify} stage={stage} send={send} />)}
          {doneRows.length > 0 && (
            <div className="text-[#6B7280] font-[Inter] text-[12px] uppercase tracking-[0.06em] mt-7 mb-3">Resolved</div>
          )}
          {doneRows.map((f) => <Card key={f.id} f={f} open={open} detail={detail} busy={busy} reply={reply} setReply={setReply} resolveHours={resolveHours} setResolveHours={setResolveHours} pendingBand={pendingBand} setPendingBand={setPendingBand} customDays={customDays} setCustomDays={setCustomDays} openFault={openFault} classify={classify} stage={stage} send={send} />)}
        </>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default Faults;
