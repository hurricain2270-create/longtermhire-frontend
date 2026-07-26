// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

const API = "https://api.longtermhire.com";

const fmtDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  } catch (e) { return null; }
};

const daysSince = (d) => {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / 86400000);
};

const monthsSince = (d) => {
  if (!d) return 0;
  const s = new Date(d), n = new Date();
  let m = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
  const lastDay = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  if (n.getDate() < Math.min(s.getDate(), lastDay)) m -= 1;
  return Math.max(0, m);
};

/** Whichever falls due first — hours or calendar */
const serviceState = (e) => {
  const out = { scheduled: false, pct: 0, label: "Not scheduled", due: false, overdue: false };

  const ih = parseInt(e.service_interval_hours || 0);
  const im = parseInt(e.service_interval_months || 0);
  if (!ih && !im) return out;
  out.scheduled = true;

  let byHours = null, byMonths = null;
  if (ih && e.current_hours !== null && e.current_hours !== undefined) {
    const since = parseFloat(e.current_hours || 0) - parseFloat(e.last_service_hours || 0);
    byHours = { used: since, total: ih, left: ih - since, unit: "hrs/km" };
  }
  if (im && e.last_service_date) {
    const used = monthsSince(e.last_service_date);
    byMonths = { used, total: im, left: im - used, unit: "months" };
  }

  const candidates = [byHours, byMonths].filter(Boolean);
  if (candidates.length === 0) {
    out.label = ih ? "Log hours to start the countdown" : "Awaiting first service";
    return out;
  }

  const soonest = candidates.sort(
    (a, b) => a.left / a.total - b.left / b.total
  )[0];

  out.pct = Math.max(0, Math.min(100, Math.round((soonest.used / soonest.total) * 100)));
  out.overdue = soonest.left < 0;
  out.due = soonest.left <= soonest.total * 0.1;
  out.label = out.overdue
    ? "Overdue by " + Math.abs(Math.round(soonest.left)) + " " + soonest.unit
    : "Due in " + Math.round(soonest.left) + " " + soonest.unit;
  return out;
};

const ClientSite = ({ userRole = "member" }) => {
  const [data, setData] = useState({ equipment: [], open_faults: [] });
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const token = localStorage.getItem("clientAuthToken");
      const res = await fetch(API + "/v1/api/longtermhire/client/my-site", {
        headers: { Authorization: "Bearer " + token },
      });
      const json = await res.json();
      if (json && !json.error) setData(json.data || { equipment: [], open_faults: [] });
    } catch (e) {
      console.error("Site load failed", e);
    } finally {
      setLoading(false);
    }
  };

  const logHours = async (item) => {
    const value = drafts[item.equipment_id];
    if (!value) { toast.error("Enter the meter reading first"); return; }
    try {
      setSaving(item.equipment_id);
      const token = localStorage.getItem("clientAuthToken");
      const res = await fetch(API + "/v1/api/longtermhire/client/log-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ equipment_id: item.equipment_id, hours: value }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.message || "Could not log that reading"); return; }
      toast.success("Logged " + value + " on " + item.equipment_name);
      setDrafts((d) => ({ ...d, [item.equipment_id]: "" }));
      load();
    } catch (e) {
      toast.error("Could not log that reading");
    } finally {
      setSaving(null);
    }
  };

  if (loading || (data.equipment || []).length === 0) return null;

  const items = data.equipment;
  const dueCount = items.filter((e) => { const s = serviceState(e); return s.due || s.overdue; }).length;
  const lastLogged = items
    .map((e) => daysSince(e.current_hours_at))
    .filter((d) => d !== null)
    .sort((a, b) => a - b)[0];

  return (
    <section className="mb-12 lg:mb-16">
      <h2 className="text-[#D1D5DB] text-xl sm:text-2xl font-semibold mb-2">Machines on hire</h2>
      <p className="text-[#9CA3AF] text-sm mb-6">
        What's here, when it's next due for service, and where the meters are up to.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-3">
          <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-1">On site</div>
          <div className="text-[#E5E5E5] text-[20px] font-semibold">{items.length}</div>
        </div>
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-3">
          <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-1">Service due</div>
          <div className={"text-[20px] font-semibold " + (dueCount ? "text-[#FDCE06]" : "text-[#E5E5E5]")}>
            {dueCount}
          </div>
        </div>
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg px-4 py-3">
          <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-1">Hrs/Km logged</div>
          <div className="text-[#E5E5E5] text-[20px] font-semibold">
            {lastLogged === undefined ? "never" : lastLogged === 0 ? "today" : lastLogged + "d ago"}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((e) => {
          const s = serviceState(e);
          const months = monthsSince(e.hire_start_date);
          const busy = saving === e.equipment_id;
          return (
            <div key={e.assignment_id} className="bg-[#1F1F20] border border-[#333] rounded-xl p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[#E5E5E5] text-[17px] font-semibold">{e.equipment_name}</div>
                  <div className="text-[#6B7280] text-xs mt-0.5">
                    {e.plant_code}
                    {e.model ? " · " + e.model : ""}
                    {e.year_made ? " · " + e.year_made : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#6B7280] text-[11px] uppercase tracking-[0.06em] mb-0.5">On hire since</div>
                  <div className="text-[#E5E5E5] text-[14px] font-medium">{fmtDate(e.hire_start_date) || "—"}</div>
                  <div className="text-[#6B7280] text-xs">{months} {months === 1 ? "month" : "months"}</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-2">Next service</div>
                  {s.scheduled ? (
                    <>
                      <div className="bg-[#2A2A2A] rounded h-1.5 w-full mb-2">
                        <div
                          className="h-1.5 rounded transition-all"
                          style={{
                            width: s.pct + "%",
                            background: s.overdue || s.pct >= 90 ? "#ef4444" : s.pct >= 65 ? "#F59E0B" : "#4CAF50",
                          }}
                        />
                      </div>
                      <div className={"text-xs " + (s.overdue || s.pct >= 90 ? "text-[#ef4444]" : s.pct >= 65 ? "text-[#F59E0B]" : "text-[#9CA3AF]")}>
                        {s.label}
                      </div>
                    </>
                  ) : (
                    <div className="text-[#6B7280] text-xs">Not scheduled</div>
                  )}
                </div>

                <div>
                  <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.06em] mb-2">Machine hrs/km</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={drafts[e.equipment_id] ?? ""}
                      onChange={(ev) => setDrafts((d) => ({ ...d, [e.equipment_id]: ev.target.value }))}
                      placeholder={e.current_hours ? "Read the meter" : "First reading"}
                      className="flex-1 min-w-0 bg-[#292A2B] border border-[#3A3A3C] rounded-lg px-3 py-2 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06] transition-colors"
                    />
                    <button
                      onClick={() => logHours(e)}
                      disabled={busy}
                      className="px-4 py-2 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-bold text-sm hover:bg-[#E5B800] disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {busy ? "…" : "Log"}
                    </button>
                  </div>
                  <div className="text-[#6B7280] text-xs mt-2">
                    {e.current_hours
                      ? "Last read " + e.current_hours + " on " + fmtDate(e.current_hours_at)
                      : "No reading yet"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ClientSite;
