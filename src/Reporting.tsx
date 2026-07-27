// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";
import { BTN } from "./styles/buttons";

const Reporting = () => {
  const [data, setData] = useState({ equipment: [], hires: [], quotes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/v1/api/longtermhire/super_admin/fleet-report");
      if (res && res.data && !res.data.error) {
        setData(res.data.data || { equipment: [], hires: [], quotes: [] });
      } else {
        setError("Failed to load report");
      }
    } catch (e) {
      setError(e?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => {
    const num = parseFloat(n || 0);
    return "$" + num.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
  };

  const monthsSince = (d) => {
    if (!d) return null;
    const s = new Date(d);
    const now = new Date();
    return Math.max(0, Math.floor((now - s) / 86400000));
  };

  // Rate for hire-month N, stepping down with the compounding discount
  const rateForMonth = (basePrice, h, n) => {
    let price = parseFloat((h && h.custom_base_price) || basePrice || 0);
    const disc = parseFloat((h && h.discount) || 0);
    const comp = parseFloat((h && h.compounding_discount) || 0);
    const dt = h && h.discount_type;
    const ct = h && h.compounding_discount_type;
    if (dt === "%" || dt === "percentage") price = price - (price * disc) / 100;
    else if (disc > 0) price = price - disc;
    for (let i = 1; i < n; i++) {
      if (comp > 0) {
        if (ct === "%" || ct === "percentage") price = price - (price * comp) / 100;
        else price = price - comp;
      }
    }
    return Math.max(0, price);
  };

  const rateFor = (basePrice, h) => rateForMonth(basePrice, h, 1);

  // Which calendar month does hire-month N end in? (21 Feb start -> month 1 = March)
  const endMonthOf = (startDate, n) => {
    const d = new Date(startDate);
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const lastDay = new Date(y, m + n + 1, 0).getDate();
    const end = new Date(y, m + n, Math.min(day, lastDay));
    end.setDate(end.getDate() - 1);
    return { year: end.getFullYear(), month: end.getMonth() };
  };

  // What this hire bills in a given calendar month, 0 if not running then
  const billedInMonth = (basePrice, h, target) => {
    if (!h || !h.hire_start_date) return 0;
    const term = parseInt(h.produce_quote_for || 12);
    for (let n = 1; n <= term; n++) {
      const em = endMonthOf(h.hire_start_date, n);
      if (em.year === target.getFullYear() && em.month === target.getMonth()) {
        if (h.hire_end_date) {
          const end = new Date(h.hire_end_date);
          if (end.getFullYear() * 12 + end.getMonth() < em.year * 12 + em.month) return 0;
        }
        return rateForMonth(basePrice, h, n);
      }
    }
    return 0;
  };

  const equipment = data.equipment || [];
  const hires = data.hires || [];
  const quotes = data.quotes || [];

  const today = new Date();

  const activeHireFor = (eqRowId) =>
    hires.find(
      (h) =>
        String(h.equipment_id) === String(eqRowId) &&
        h.hire_status === "active" &&
        h.hire_start_date &&
        new Date(h.hire_start_date) <= today
    );

  // Includes hires booked to start later
  const bookedHireFor = (eqRowId) =>
    hires.find((h) => String(h.equipment_id) === String(eqRowId) && h.hire_status === "active");

  const quotesFor = (name) =>
    quotes.filter(
      (q) => (q.equipment_name || "").trim().toLowerCase() === (name || "").trim().toLowerCase()
    );

  const isOwned = (e) => (e.ownership_status || "owned") === "owned";

  const owned = equipment.filter(isOwned);
  const onHire = equipment.filter((e) => activeHireFor(e.id));
  const utilisation = owned.length > 0 ? Math.round((onHire.length / owned.length) * 100) : 0;
  const monthTotal = (offset) => {
    const t = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return equipment.reduce(
      (sum, e) => sum + billedInMonth(e.base_price, bookedHireFor(e.id), t),
      0
    );
  };
  const lastMonth = monthTotal(-1);
  const thisMonth = monthTotal(0);
  const nextMonth = monthTotal(1);
  const monthAfter = monthTotal(2);
  const monthName = (offset) =>
    new Date(today.getFullYear(), today.getMonth() + offset, 1)
      .toLocaleDateString("en-AU", { month: "long" });

  const quotedNotOwned = equipment
    .filter((e) => !isOwned(e) && quotesFor(e.equipment_name).length > 0)
    .map((e) => ({ ...e, q: quotesFor(e.equipment_name) }));

  const ownedNotHired = equipment.filter((e) => isOwned(e) && !activeHireFor(e.id));

  const listedNoInterest = equipment.filter(
    (e) => !isOwned(e) && quotesFor(e.equipment_name).length === 0 && !activeHireFor(e.id)
  );

  const lastOffHire = (eqRowId) => {
    const done = hires
      .filter((h) => String(h.equipment_id) === String(eqRowId) && h.hire_end_date)
      .sort((a, b) => new Date(b.hire_end_date) - new Date(a.hire_end_date));
    return done.length > 0 ? done[0].hire_end_date : null;
  };

  const pill = (text, bg, color, border) => (
    <span
      className="text-[12px] px-2 py-0.5 rounded-full font-[Inter]"
      style={{ background: bg, color: color, border: "1px solid " + border }}
    >
      {text}
    </span>
  );

  const Section = ({ title, blurb, rows, accent }) => (
    <div className="mb-8">
      <h2 className="text-[#E5E5E5] font-[Inter] font-bold text-[20px] leading-[1.2em] mb-1">{title}</h2>
      <p className="text-[#9CA3AF] font-[Inter] text-sm mb-3">{blurb}</p>
      <div
        className="bg-[#1F1F20] rounded-lg overflow-hidden"
        style={{ border: accent ? "2px solid #FDCE06" : "1px solid #333333" }}
      >
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-[#6B7280] font-[Inter] text-sm">Nothing here.</div>
        ) : (
          <table className="w-full">
            <tbody>{rows}</tbody>
          </table>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ClipLoader color="#FDCE06" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg p-6 text-center">
          <p className="text-red-400 mb-3 font-[Inter]">{error}</p>
          <button onClick={load} className={BTN.primary}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em] mb-1">Reporting</h1>
      <p className="text-[#9CA3AF] font-[Inter] text-sm mb-6">
        Internal view. Ownership status is never shown to clients.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Owned", value: String(owned.length), color: "#E5E5E5" },
          { label: "On hire now", value: String(onHire.length), color: "#4CAF50" },
          { label: "Utilisation", value: utilisation + "%", color: "#E5E5E5" },
        ].map((s, i) => (
          <div key={i} className="bg-[#292A2B] rounded-lg p-4">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] mb-1">{s.label}</div>
            <div className="font-[Inter] font-bold text-[24px]" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: monthName(-1), value: fmt(lastMonth), color: "#9CA3AF", note: "Last month" },
          { label: monthName(0), value: fmt(thisMonth), color: "#4CAF50", note: "This month" },
          { label: monthName(1), value: fmt(nextMonth), color: "#FDCE06", note: "Next month" },
          { label: monthName(2), value: fmt(monthAfter), color: "#FDCE06", note: "Month after" },
        ].map((s, i) => (
          <div key={i} className="bg-[#292A2B] rounded-lg p-4">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] mb-1">
              {s.note} &middot; {s.label}
            </div>
            <div className="font-[Inter] font-bold text-[22px]" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Section
        title="Quoted, not owned"
        blurb="A client has priced these. Interest exists before you've spent anything."
        accent
        rows={quotedNotOwned.map((e) => (
          <tr key={e.id} className="border-b border-[#2A2A2A] last:border-0">
            <td className="px-4 py-3 text-[#9CA3AF] font-[Inter] text-xs w-20">{e.equipment_id}</td>
            <td className="px-4 py-3 text-[#E5E5E5] font-[Inter] text-sm font-medium">{e.equipment_name}</td>
            <td className="px-4 py-3">
              {pill(
                e.q.reduce((a, b) => a + Number(b.quote_count), 0) +
                  " quote" +
                  (e.q.reduce((a, b) => a + Number(b.quote_count), 0) === 1 ? "" : "s") +
                  " \u00b7 " +
                  e.q.map((x) => x.company_name).join(", "),
                "#3a2e00",
                "#FDCE06",
                "#5a4800"
              )}
            </td>
            <td className="px-4 py-3 text-right text-[#E5E5E5] font-[Inter] text-sm w-36">{fmt(e.base_price)} / mo</td>
          </tr>
        ))}
      />

      <Section
        title="Owned, not hired"
        blurb="Yours, sitting still. This is revenue you're actually losing."
        rows={ownedNotHired.map((e) => {
          const off = lastOffHire(e.id);
          const days = off ? monthsSince(off) : null;
          return (
            <tr key={e.id} className="border-b border-[#2A2A2A] last:border-0">
              <td className="px-4 py-3 text-[#9CA3AF] font-[Inter] text-xs w-20">{e.equipment_id}</td>
              <td className="px-4 py-3 text-[#E5E5E5] font-[Inter] text-sm font-medium">{e.equipment_name}</td>
              <td className="px-4 py-3">
                {days !== null
                  ? pill("Idle " + days + " days", "#3a2e00", "#FDCE06", "#5a4800")
                  : pill("Never hired", "#292A2B", "#9CA3AF", "#333333")}
              </td>
              <td className="px-4 py-3 text-right text-[#E5E5E5] font-[Inter] text-sm w-36">{fmt(e.base_price)} / mo</td>
            </tr>
          );
        })}
      />

      <Section
        title="Listed, no interest"
        blurb="Not owned, nobody's asked. Costing you nothing."
        rows={listedNoInterest.map((e) => (
          <tr key={e.id} className="border-b border-[#2A2A2A] last:border-0">
            <td className="px-4 py-3 text-[#6B7280] font-[Inter] text-xs w-20">{e.equipment_id}</td>
            <td className="px-4 py-3 text-[#9CA3AF] font-[Inter] text-sm">{e.equipment_name}</td>
            <td className="px-4 py-3 text-[#6B7280] font-[Inter] text-xs">
              {e.created_at ? "Listed " + new Date(e.created_at).toLocaleDateString("en-AU") : ""}
            </td>
            <td className="px-4 py-3 text-right text-[#6B7280] font-[Inter] text-sm w-36">{fmt(e.base_price)} / mo</td>
          </tr>
        ))}
      />

</div>
  );
};

export default Reporting;
