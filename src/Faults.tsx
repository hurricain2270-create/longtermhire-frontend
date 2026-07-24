// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";

const BANDS = [
  { key: "emergency", label: "Emergency", window: "24h response", colour: "#B91C1C" },
  { key: "major", label: "Major failure", window: "1 week", colour: "#ef4444" },
  { key: "mechanical", label: "Mechanical", window: "3 days", colour: "#F59E0B" },
  { key: "minor", label: "Minor", window: "2 days", colour: "#4CAF50" },
];

const REPORTED_AS = {
  emergency: "Emergency", stopped: "It's stopped",
  degraded: "Working, but not right", attention: "Needs attention",
};

const EVENT_LABEL = {
  reported: "Reported", acknowledged: "Seen", classified: "Assessed",
  actioned: "Actioned", attended: "On site", resolved: "Back in service", message: "",
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
  "flex-1 bg-[#292A2B] border border-[#3A3A3C] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-[13px] outline-none focus:border-[#FDCE06]";

const Card = ({
  f, open, detail, busy, reply, setReply,
  resolveHours, setResolveHours,
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
          <div className="text-[#6B7280] font-[Inter] text-[11px] mt-0.5">
            {f.fault_no} · {f.plant_code} {f.equipment_name} · {f.company_name} · {stamp(f.reported_at)}
          </div>
          <div className="text-[#6B7280] font-[Inter] text-[11px] mt-0.5">
            {f.reported_by_name} called it &ldquo;{REPORTED_AS[f.reported_severity] || f.reported_severity}&rdquo;
          </div>
        </div>
        <div className="text-right">
          {band ? (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-[Inter] font-bold"
              style={{ background: band.colour + "22", color: band.colour, border: "1px solid " + band.colour + "55" }}>
              {band.label} · {band.window}
            </span>
          ) : (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#3a2e00] text-[#FDCE06] border border-[#5a4800] font-[Inter] font-bold">
              Needs assessing
            </span>
          )}
          <div className="text-[#9CA3AF] font-[Inter] text-[11px] mt-1.5 tabular-nums">
            {f.resolved_at ? "took " + human(hrs(f.reported_at, f.resolved_at)) : human(hrs(f.reported_at)) + " open"}
          </div>
        </div>
      </div>

      <button onClick={() => openFault(f)}
        className="text-[#FDCE06] font-[Inter] text-[13px] font-medium hover:underline">
        {isOpen ? "Close" : "Open"}
      </button>

      {isOpen && detail && (
        <div className="mt-4 border-t border-[#2A2A2A] pt-4">
          {!d.severity && (
            <div className="mb-4">
              <div className="text-[#9CA3AF] font-[Inter] text-[11px] uppercase tracking-[0.06em] mb-2">
                Assess it — this is what shows the bar to the client
              </div>
              <div className="flex flex-wrap gap-2">
                {BANDS.map((b) => (
                  <button key={b.key} onClick={() => classify(d.id, b.key)} disabled={busy}
                    className="px-3 py-1.5 rounded border font-[Inter] font-bold text-[12px] transition-colors disabled:opacity-50"
                    style={{ borderColor: b.colour + "66", color: b.colour, background: b.colour + "18" }}>
                    {b.label} · {b.window}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            {updates.map((u, i) => {
              const prev = updates[i - 1];
              const gap = prev ? hrs(prev.created_at, u.created_at) : null;
              return (
                <div key={u.id}>
                  {gap !== null && (
                    <div className="border-l border-dashed border-[#333] ml-[5px] pl-4 py-1.5 text-[#6B7280] font-[Inter] text-[11px]">
                      {u.author_side === prev.author_side ? "then " : "replied in "}
                      <span className="text-[#9CA3AF]">{human(gap)}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-none"
                      style={{ background: u.author_side === "admin" ? "#4CAF50" : "#F59E0B" }} />
                    <div className="flex-1">
                      <div className="text-[#6B7280] font-[Inter] text-[11px]">
                        {u.author_side === "admin" ? "You" : u.author_name}
                        {EVENT_LABEL[u.event_type] ? " · " + EVENT_LABEL[u.event_type] : ""}
                        {" · " + stamp(u.created_at)}
                      </div>
                      {u.message ? (
                        <div className="text-[#E5E5E5] font-[Inter] text-[13px] leading-relaxed mt-0.5">{u.message}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!d.resolved_at && (
            <>
              <div className="flex gap-2 mb-3">
                <input value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder="Add an update…" className={inputCls} />
                <button onClick={() => send(d.id)} disabled={busy}
                  className="px-4 py-2 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] disabled:opacity-50 whitespace-nowrap">
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
                  className="w-36 bg-[#292A2B] border border-[#3A3A3C] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-[13px] outline-none focus:border-[#FDCE06]" />
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
  const [reply, setReply] = useState("");
  const [resolveHours, setResolveHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/v1/api/longtermhire/super_admin/faults");
      if (res?.data && !res.data.error) setRows(res.data.data || []);
    } catch (e) {
      toast.error("Could not load faults");
    } finally { setLoading(false); }
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

  const classify = async (id, band) => {
    try {
      setBusy(true);
      await api.put("/v1/api/longtermhire/super_admin/faults/" + id + "/classify", { severity: band });
      toast.success("Classified");
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

  const send = async (id) => {
    if (!reply.trim()) return;
    try {
      setBusy(true);
      await api.post("/v1/api/longtermhire/super_admin/faults/" + id + "/reply", { message: reply });
      setReply("");
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
            <div className="text-[#9CA3AF] font-[Inter] text-[11px] uppercase tracking-[0.06em] mb-1">{t.l}</div>
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
          {openRows.map((f) => <Card key={f.id} f={f} open={open} detail={detail} busy={busy} reply={reply} setReply={setReply} resolveHours={resolveHours} setResolveHours={setResolveHours} openFault={openFault} classify={classify} stage={stage} send={send} />)}
          {doneRows.length > 0 && (
            <div className="text-[#6B7280] font-[Inter] text-[11px] uppercase tracking-[0.06em] mt-7 mb-3">Resolved</div>
          )}
          {doneRows.map((f) => <Card key={f.id} f={f} open={open} detail={detail} busy={busy} reply={reply} setReply={setReply} resolveHours={resolveHours} setResolveHours={setResolveHours} openFault={openFault} classify={classify} stage={stage} send={send} />)}
        </>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default Faults;
