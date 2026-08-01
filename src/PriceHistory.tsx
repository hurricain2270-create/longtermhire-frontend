// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "./services/api";
import { BTN } from "./styles/buttons";
import HireRateCalculator from "./HireRateCalculator";

const PERIODS = [
  "now",
  "3 months ago",
  "6 months ago",
  "a year ago",
  "2 years ago",
  "3 years ago",
  "longer ago",
];
const SOURCES = ["owner told me", "direct quote", "lost a job", "client said"];

const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const yearOf = (d) => (d ? String(d).slice(0, 4) : "");

const PriceHistory = () => {
  const [tab, setTab] = useState("market");
  const [data, setData] = useState({ prices: [], categories: [], asking: [] });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(null);

  const [form, setForm] = useState({
    category_name: "",
    monthly_price: "",
    applied_period: "now",
    source: "owner told me",
    note: "",
  });

  const load = async () => {
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/price-history");
      if (res?.data && !res.data.error) setData(res.data.data);
    } catch (e) {
      console.error("Could not load prices:", e);
      toast.error("Could not load the prices");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.category_name || !form.monthly_price) {
      toast.error("Pick a category and put in a price");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/v1/api/longtermhire/super_admin/price-history", form);
      if (res?.data?.error) throw new Error(res.data.message);
      toast.success("Price added");
      setForm({ ...form, monthly_price: "", note: "" });
      setAdding(false);
      load();
    } catch (e) {
      toast.error("Could not save that");
    } finally {
      setSaving(false);
    }
  };

  // Anything parked in Miscellaneous can be filed properly later, without
  // retyping it.
  const reclassify = async (id, category_name) => {
    try {
      await api.put("/v1/api/longtermhire/super_admin/price-history/" + id, { category_name });
      toast.success("Filed under " + category_name);
      load();
    } catch (e) {
      toast.error("Could not move that");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this price?")) return;
    try {
      await api.delete("/v1/api/longtermhire/super_admin/price-history/" + id);
      load();
    } catch (e) {
      toast.error("Could not remove that");
    }
  };

  // Group what we have learnt by category, newest first.
  const groups = useMemo(() => {
    const by = {};
    (data.prices || []).forEach((p) => {
      if (!by[p.category_name]) by[p.category_name] = [];
      by[p.category_name].push(p);
    });
    const askingBy = {};
    (data.asking || []).forEach((a) => { askingBy[a.category_name] = Number(a.asking); });
    const order = (a, b) =>
      a === "Miscellaneous" ? 1 : b === "Miscellaneous" ? -1 : a.localeCompare(b);
    return Object.keys(by).sort(order).map((cat) => {
      const rows = by[cat];
      const vals = rows.map((r) => Number(r.monthly_price)).filter((n) => n > 0);
      return {
        cat,
        rows,
        mid: median(vals),
        low: Math.min(...vals),
        high: Math.max(...vals),
        asking: askingBy[cat] || 0,
        latest: rows[0]?.applied_date,
      };
    });
  }, [data]);

  // Categories with nothing recorded, or nothing recent — worth a phone call.
  const stale = useMemo(() => {
    const known = {};
    (data.prices || []).forEach((p) => {
      const t = new Date(p.applied_date).getTime();
      if (!known[p.category_name] || t > known[p.category_name]) known[p.category_name] = t;
    });
    const yearAgo = Date.now() - 365 * 24 * 3600 * 1000;
    return (data.categories || []).filter((c) => !known[c] || known[c] < yearAgo);
  }, [data]);

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      <header className="mb-6">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[28px] sm:text-[36px] leading-tight">
          Price History
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          What the market charges, as and when we learn it. Nobody publishes long
          term rates, so this is the only record there is.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
        <div>
      {!adding && (
        <button onClick={() => setAdding(true)} className={BTN.primaryLg + " mb-6"}>
          + Add a price
        </button>
      )}

      {adding && (
        <section className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5 mb-6 max-w-[460px]">
          <h2 className="text-[#E5E5E5] font-[Inter] text-[18px] font-semibold mb-4">Add a price</h2>

          <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Category</label>
          <select
            value={form.category_name}
            onChange={(e) => setForm({ ...form, category_name: e.target.value })}
            className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06] mb-4"
          >
            <option value="">Pick one</option>
            {(data.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Per month</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.monthly_price}
                onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                placeholder="6000"
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[18px] px-3.5 py-3 outline-none focus:border-[#FDCE06]"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">When</label>
              <select
                value={form.applied_period}
                onChange={(e) => setForm({ ...form, applied_period: e.target.value })}
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]"
              >
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">Where it came from</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {SOURCES.map((s) => (
              <button key={s} onClick={() => setForm({ ...form, source: s })}
                className={
                  "px-3.5 py-2 rounded-full text-[13px] transition-colors " +
                  (form.source === s
                    ? "bg-[#FDCE06] text-[#1F1F20] font-semibold"
                    : "bg-[#292A2B] border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06]")
                }>
                {s}
              </button>
            ))}
          </div>

          <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">
            Note <span className="text-[#6B7280]">optional</span>
          </label>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="who, where, anything worth remembering"
            className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5] text-[15px] px-3.5 py-3 outline-none focus:border-[#FDCE06] mb-5"
          />

          <div className="flex gap-2.5">
            <button onClick={save} disabled={saving} className={BTN.success + " flex-1"}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setAdding(false)} className={BTN.secondary}>Cancel</button>
          </div>
        </section>
      )}

      {stale.length > 0 && (
        <section className="bg-[#1F1F20] border border-[#333333] rounded-xl p-4 mb-6">
          <p className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-2">
            Nothing learnt in the last year
          </p>
          <div className="flex flex-wrap gap-2">
            {stale.map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-full bg-[#292A2B] border border-[#333] text-[#9CA3AF] text-[13px]">
                {c}
              </span>
            ))}
          </div>
          <p className="text-[#6B7280] font-[Inter] text-[12px] mt-2.5">
            Worth a call next time you are talking to someone.
          </p>
        </section>
      )}

      {loading ? (
        <p className="text-[#9CA3AF] font-[Inter] text-[14px]">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-[#9CA3AF] font-[Inter] text-[14px]">
          Nothing recorded yet. Add the first price above.
        </p>
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          {groups.map((g) => (
            <section key={g.cat} className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5">
              <div className="flex justify-between items-start mb-4 gap-3">
                <div>
                  <h3 className="text-[#E5E5E5] font-[Inter] text-[17px] font-semibold">{g.cat}</h3>
                  <p className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">
                    {g.cat === "Miscellaneous"
                      ? g.rows.length + " to file"
                      : g.rows.length + " recorded · " + money(g.low) + " to " + money(g.high)}
                  </p>
                </div>
                <div className="text-right flex-none">
                  <p className="text-[#FDCE06] font-[Inter] text-[22px]">{money(g.mid)}</p>
                  <p className="text-[#6B7280] font-[Inter] text-[11px]">middle of what we know</p>
                </div>
              </div>

              {g.rows.slice(0, open === g.cat ? 99 : 3).map((r) => {
                const recent = new Date(r.applied_date).getTime() > Date.now() - 365 * 24 * 3600 * 1000;
                return (
                  <div key={r.id} className="flex justify-between items-start gap-3 py-2 border-b border-[#2a2a2a] last:border-0">
                    <div>
                      <span className={"font-[Inter] text-[14px] " + (recent ? "text-[#E5E5E5]" : "text-[#9CA3AF]")}>
                        {money(r.monthly_price)}
                      </span>
                      <span className="text-[#6B7280] font-[Inter] text-[12px]"> · {yearOf(r.applied_date)} · {r.source}</span>
                      {r.note ? <p className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">{r.note}</p> : null}
                      {g.cat === "Miscellaneous" && (
                        <select
                          value=""
                          onChange={(e) => e.target.value && reclassify(r.id, e.target.value)}
                          className="mt-1.5 bg-[#292A2B] border border-[#333] rounded-md text-[#9CA3AF] text-[12px] px-2 py-1 outline-none focus:border-[#FDCE06]"
                        >
                          <option value="">File under…</option>
                          {(data.categories || [])
                            .filter((x) => x !== "Miscellaneous")
                            .map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      )}
                    </div>
                    <button onClick={() => remove(r.id)}
                      className="text-[#6B7280] hover:text-[#ef4444] text-[16px] flex-none">×</button>
                  </div>
                );
              })}

              {g.rows.length > 3 && (
                <button onClick={() => setOpen(open === g.cat ? null : g.cat)}
                  className="text-[#FDCE06] font-[Inter] text-[13px] mt-2 hover:underline">
                  {open === g.cat ? "Show fewer" : "Show all " + g.rows.length}
                </button>
              )}

              {g.asking > 0 && (
                <p className="text-[#9CA3AF] font-[Inter] text-[13px] mt-4 pt-3 border-t border-[#2a2a2a]">
                  You are asking <span className="text-[#E5E5E5]">{money(g.asking)}</span> on average.
                  Middle of what you know is <span className="text-[#E5E5E5]">{money(g.mid)}</span>.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
        </div>

        {/* What a machine has to earn, beside what the market pays for it. */}
        <aside className="bg-[#1A1A1B] border border-[#3A3A3C] rounded-xl p-5 xl:sticky xl:top-6">
          <p className="text-[#F2F0EA] font-[Inter] text-[18px] font-semibold">
            Minimum <span className="text-[#FDCE06] italic font-normal">hire rate</span>
          </p>
          <p className="text-[#9A9A96] font-[Inter] text-[12.5px] mt-1 mb-5 leading-relaxed">
            What a machine has to earn to be worth owning, before deciding what the
            market will pay for it.
          </p>
          <HireRateCalculator compact />
        </aside>
      </div>
    </div>
  );
};

export default PriceHistory;
