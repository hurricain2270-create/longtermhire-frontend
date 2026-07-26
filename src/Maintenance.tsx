// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";

const num = (n) =>
  n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("en-AU");

const shortDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  } catch (e) { return null; }
};

const monthsSince = (d) => {
  if (!d) return 0;
  const s = new Date(d), n = new Date();
  let m = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
  const lastDay = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  if (n.getDate() < Math.min(s.getDate(), lastDay)) m -= 1;
  return Math.max(0, m);
};

/** Whichever interval falls due first wins */
const state = (e) => {
  const ih = parseInt(e.service_interval_hours || 0);
  const im = parseInt(e.service_interval_months || 0);
  if (!ih && !im) return { band: "none", pct: 0, label: "No interval set" };

  const options = [];
  if (ih && e.current_hours !== null && e.current_hours !== undefined && e.current_hours !== "") {
    const used = parseFloat(e.current_hours) - parseFloat(e.last_service_hours || 0);
    options.push({ used, total: ih, left: ih - used, unit: "hours" });
  }
  if (im && e.last_service_date) {
    const used = monthsSince(e.last_service_date);
    options.push({ used, total: im, left: im - used, unit: "months" });
  }
  if (!options.length) {
    return {
      band: "waiting", pct: 0,
      label: ih ? "Log hours to start the countdown" : "Set a last service date",
    };
  }

  // Each track gets its own reading, so a machine with both an hours interval
  // and a calendar interval shows both — you can see which one is driving the
  // service and how much room the other has.
  const tracks = options.map((o) => {
    const pct = Math.max(0, Math.min(100, Math.round((o.used / o.total) * 100)));
    const band = o.left < 0 ? "overdue" : o.left <= o.total * 0.1 ? "soon" : "ok";
    const label =
      o.left < 0
        ? "Overdue by " + Math.abs(Math.round(o.left)) + " " + o.unit
        : "Due in " + Math.round(o.left) + " " + o.unit;
    return { ...o, pct, band, label };
  });

  // The one falling due first still decides the row's band and sort order.
  const s = options.sort((a, b) => a.left / a.total - b.left / b.total)[0];
  const lead = tracks.find((t) => t.unit === s.unit) || tracks[0];
  return { band: lead.band, pct: lead.pct, label: lead.label, sort: s.left, tracks };
};

const BANDS = [
  { key: "overdue", title: "Overdue" },
  { key: "soon", title: "Due soon" },
  { key: "ok", title: "Running" },
  { key: "waiting", title: "Awaiting a reading" },
  { key: "none", title: "No schedule set" },
];

// Green to 65%, orange to 90%, red beyond
const barColour = (band, pct) => {
  if (band === "none" || band === "waiting") return null;
  if (band === "overdue" || pct >= 90) return "#ef4444";
  if (pct >= 65) return "#F59E0B";
  return "#4CAF50";
};

// Defined at module scope so React keeps the same input elements between
// renders — declaring these inside the component remounts them on every
// keystroke and the field loses focus.
const inputCls =
  "w-full bg-[#292A2B] border border-[#333] rounded px-3 py-2 text-[#E5E5E5] font-[Inter] text-sm outline-none focus:border-[#FDCE06]";

const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-[#9CA3AF] font-[Inter] text-xs mb-1.5">{label}</label>
    {children}
  </div>
);

const Maintenance = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode, item }
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/v1/api/longtermhire/super_admin/maintenance");
      if (res?.data && !res.data.error) setRows(res.data.data || []);
    } catch (e) {
      toast.error("Could not load the fleet");
    } finally {
      setLoading(false);
    }
  };

  const openHours = (item) => { setForm({ hours: item.current_hours || "" }); setModal({ mode: "hours", item }); };
  const openSchedule = (item) => {
    setForm({
      service_interval_hours: item.service_interval_hours || "",
      service_interval_months: item.service_interval_months || "",
      last_service_hours: item.last_service_hours || "",
      last_service_date: (item.last_service_date || "").slice(0, 10),
    });
    setModal({ mode: "schedule", item });
  };
  const openDone = (item) => {
    setForm({ hours: item.current_hours || "", serviced_on: new Date().toISOString().slice(0, 10) });
    setModal({ mode: "done", item });
  };

  const save = async () => {
    const { mode, item } = modal;
    try {
      setBusy(true);
      if (mode === "hours") {
        await api.post("/v1/api/longtermhire/super_admin/maintenance-hours", {
          equipment_id: item.id, hours: form.hours,
        });
        toast.success("Hours logged");
      } else if (mode === "schedule") {
        await api.put("/v1/api/longtermhire/super_admin/maintenance/" + item.id, form);
        toast.success("Schedule saved");
      } else {
        await api.post("/v1/api/longtermhire/super_admin/maintenance-done/" + item.id, {
          hours: form.hours, serviced_on: form.serviced_on,
        });
        toast.success("Service recorded");
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><ClipLoader color="#FDCE06" size={40} /></div>;
  }

  const withState = rows.map((r) => ({ ...r, s: state(r) }));
  const counts = {
    overdue: withState.filter((r) => r.s.band === "overdue").length,
    soon: withState.filter((r) => r.s.band === "soon").length,
    ok: withState.filter((r) => r.s.band === "ok").length,
    none: withState.filter((r) => r.s.band === "none" || r.s.band === "waiting").length,
  };

  return (
    <div className="p-6">
      <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em] mb-1">Maintenance</h1>
      <p className="text-[#9CA3AF] font-[Inter] text-sm mb-6">
        Whole fleet, ordered by what needs attention first.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {[
          { l: "Overdue", v: counts.overdue, c: "#ef4444" },
          { l: "Due soon", v: counts.soon, c: "#FDCE06" },
          { l: "Scheduled", v: counts.ok, c: "#E5E5E5" },
          { l: "No schedule", v: counts.none, c: "#6B7280" },
        ].map((t) => (
          <div key={t.l} className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-3">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-1">{t.l}</div>
            <div className="font-[Inter] font-bold text-[23px]" style={{ color: t.c }}>{t.v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1F1F20] border border-[#333] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1A1A1B] border-b border-[#2A2A2A]">
              <th className="text-left px-4 py-2.5 text-[12px] uppercase tracking-[0.05em] text-[#9CA3AF] font-medium w-[24%]">Machine</th>
              <th className="text-left px-4 py-2.5 text-[12px] uppercase tracking-[0.05em] text-[#9CA3AF] font-medium w-[15%]">Where</th>
              <th className="text-left px-4 py-2.5 text-[12px] uppercase tracking-[0.05em] text-[#9CA3AF] font-medium w-[14%]">Hours</th>
              <th className="text-left px-4 py-2.5 text-[12px] uppercase tracking-[0.05em] text-[#9CA3AF] font-medium w-[27%]">Next service</th>
              <th className="text-right px-4 py-2.5 w-[20%]"></th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((band) => {
              const list = withState
                .filter((r) => r.s.band === band.key)
                .sort((a, b) => (a.s.sort ?? 0) - (b.s.sort ?? 0));
              if (!list.length) return null;
              return (
                <React.Fragment key={band.key}>
                  <tr>
                    <td colSpan={5} className="bg-[#1A1A1B] border-b border-[#2A2A2A] px-4 pt-3 pb-1.5 text-[12px] uppercase tracking-[0.06em] text-[#6B7280] font-[Inter]">
                      {band.title}
                    </td>
                  </tr>
                  {list.map((r) => (
                    <tr key={r.id} className="border-b border-[#1a1a1a] last:border-0">
                      <td className="px-4 py-3">
                        <div className="text-[#E5E5E5] font-[Inter] text-[14px] font-semibold">{r.equipment_name}</div>
                        <div className="text-[#6B7280] font-[Inter] text-[12px]">{r.plant_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        {r.on_hire_to
                          ? <span className="text-[#9CA3AF] font-[Inter] text-[12px]">{r.on_hire_to}</span>
                          : <span className="text-[#6B7280] font-[Inter] text-[12px] italic">In yard</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[#E5E5E5] font-[Inter] text-[14px] tabular-nums">{num(r.current_hours)}</div>
                        <div className="text-[#6B7280] font-[Inter] text-[12px]">
                          {r.current_hours_at ? shortDate(r.current_hours_at) : "never read"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.s.tracks && r.s.tracks.length ? (
                          r.s.tracks.map((t) => (
                            <div key={t.unit} className="mb-2 last:mb-0">
                              <div className="bg-[#2F2F31] rounded h-1.5 w-full mb-1">
                                <div className="h-1.5 rounded"
                                  style={{ width: t.pct + "%", background: barColour(t.band, t.pct) }} />
                              </div>
                              <div className="font-[Inter] text-[11.5px]"
                                style={{ color: barColour(t.band, t.pct) || "#6B7280" }}>
                                {t.label}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="font-[Inter] text-[11.5px] text-[#6B7280]">{r.s.label}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {r.s.band === "none" ? (
                            <button onClick={() => openSchedule(r)}
                              className="px-3 py-1.5 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[12px] hover:bg-[#E5B800] transition-colors whitespace-nowrap">
                              Set schedule
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openSchedule(r)}
                                title="Change the interval or last service"
                                className="px-2.5 py-1.5 rounded border border-[#444] text-[#9CA3AF] font-[Inter] font-bold text-[12px] hover:border-[#666] hover:text-[#E5E5E5] transition-colors whitespace-nowrap">
                                Schedule
                              </button>
                              <button onClick={() => openHours(r)}
                                className="px-3 py-1.5 rounded border border-[#444] text-[#E5E5E5] font-[Inter] font-bold text-[12px] hover:border-[#666] transition-colors whitespace-nowrap">
                                Log hrs
                              </button>
                              <button onClick={() => openDone(r)}
                                className="px-3 py-1.5 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[12px] hover:bg-[#E5B800] transition-colors whitespace-nowrap">
                                Serviced
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-md">
            <div className="px-5 py-4 border-b border-[#333]">
              <h3 className="text-[#E5E5E5] font-[Inter] font-bold text-[17px]">
                {modal.mode === "hours" ? "Log hours" : modal.mode === "done" ? "Record service" : "Service schedule"}
              </h3>
              <p className="text-[#6B7280] font-[Inter] text-xs mt-0.5">
                {modal.item.plant_code} · {modal.item.equipment_name}
              </p>
            </div>
            <div className="px-5 py-4">
              {modal.mode === "hours" && (
                <Field label="Meter reading">
                  <input type="number" className={inputCls} value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                </Field>
              )}

              {modal.mode === "done" && (
                <>
                  <Field label="Serviced at (hours)">
                    <input type="number" className={inputCls} value={form.hours}
                      onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                  </Field>
                  <Field label="Date serviced">
                    <input type="date" className={inputCls} value={form.serviced_on}
                      onChange={(e) => setForm({ ...form, serviced_on: e.target.value })} />
                  </Field>
                  <p className="text-[#9CA3AF] font-[Inter] text-xs leading-relaxed">
                    The countdown restarts from these figures.
                  </p>
                </>
              )}

              {modal.mode === "schedule" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Every (hours)">
                      <input type="number" className={inputCls} value={form.service_interval_hours}
                        onChange={(e) => setForm({ ...form, service_interval_hours: e.target.value })} />
                    </Field>
                    <Field label="Every (months)">
                      <input type="number" className={inputCls} value={form.service_interval_months}
                        onChange={(e) => setForm({ ...form, service_interval_months: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Last serviced at (hours)">
                      <input type="number" className={inputCls} value={form.last_service_hours}
                        onChange={(e) => setForm({ ...form, last_service_hours: e.target.value })} />
                    </Field>
                    <Field label="Last serviced on">
                      <input type="date" className={inputCls} value={form.last_service_date}
                        onChange={(e) => setForm({ ...form, last_service_date: e.target.value })} />
                    </Field>
                  </div>
                  <p className="text-[#9CA3AF] font-[Inter] text-xs leading-relaxed">
                    Fill either one or both. Whichever falls due first is the one that counts.
                  </p>
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-[#333] flex justify-end gap-3">
              <button onClick={() => setModal(null)}
                className="px-4 py-1.5 border border-[#444] rounded text-[#E5E5E5] font-[Inter] font-bold text-[14px] hover:border-[#666] transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={busy}
                className="px-4 py-1.5 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[14px] hover:bg-[#E5B800] disabled:opacity-50 transition-colors">
                {busy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default Maintenance;
