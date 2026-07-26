// @ts-nocheck
import React, { useEffect, useState } from "react";
import api from "../services/api";

// Dial geometry. 0% sits at the left horizon, 100% at the right horizon, and
// the last 20% runs below the horizon — so beating your best month is the only
// state where the needle drops past the line.
const CX = 75;
const CY = 80;
const R = 55;
const NEEDLE = 45;

const angleFor = (pct) => {
  const p = Math.max(0, Math.min(120, pct));
  return p <= 100 ? 180 - p * 1.8 : -(p - 100) * 1.5;
};
const pointOn = (radius, deg) => {
  const rad = (deg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY - radius * Math.sin(rad)];
};
const arc = (fromPct, toPct) => {
  const [x1, y1] = pointOn(R, angleFor(fromPct));
  const [x2, y2] = pointOn(R, angleFor(toPct));
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

const money = (n) =>
  "$" + Math.round(n || 0).toLocaleString("en-AU");

const monthName = (key) => {
  if (!key) return "";
  const [y, m] = String(key).split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-AU", { month: "long", year: "numeric" });
};

const TurnoverGauge = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/v1/api/longtermhire/super_admin/turnover");
        if (res?.data && !res.data.error) setData(res.data.data);
        else setError(true);
      } catch (e) {
        console.error("Could not load turnover:", e);
        setError(true);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5">
        <div className="text-[#9CA3AF] font-[Inter] text-[14px]">
          Turnover figures aren't available.
        </div>
      </div>
    );
  }

  const pct = data ? data.percent : 0;
  const over = pct > 100;
  const [nx, ny] = pointOn(NEEDLE, angleFor(pct));

  return (
    <div className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5">
      <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-3">
        Turnover this month
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <svg width="230" height="150" viewBox="0 0 150 130" role="img"
          aria-label={
            data
              ? `Turnover ${money(data.current)}, ${pct} percent of the best month`
              : "Loading turnover"
          }>
          <line x1="12" y1={CY} x2="138" y2={CY} stroke="#2F2F31" strokeWidth="1" />

          <path d={arc(0, 50)} fill="none" stroke="#d03b3b" strokeWidth="12" />
          <path d={arc(50, 70)} fill="none" stroke="#eb6834" strokeWidth="12" />
          <path d={arc(70, 90)} fill="none" stroke="#fab219" strokeWidth="12" />
          <path d={arc(90, 100)} fill="none" stroke="#0ca30c" strokeWidth="12" />
          {/* The beyond-target stretch sits grey until it's earned. */}
          <path d={arc(100, 120)} fill="none" stroke="#2F2F31" strokeWidth="12" />
          {over && (
            <path d={arc(100, Math.min(120, pct))} fill="none" stroke="#7F77DD" strokeWidth="12" />
          )}

          <line x1={CX} y1={CY} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
            stroke="#E5E5E5" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r="6" fill="#E5E5E5" />

          <text x={CX} y="64" textAnchor="middle" fontSize="24" fontWeight="500" fill="#E5E5E5">
            {data ? money(data.current) : "—"}
          </text>
          <text x={CX} y="124" textAnchor="middle" fontSize="11"
            fill={over ? "#7F77DD" : "#6B7280"}>
            {!data
              ? ""
              : over
              ? pct - 100 + "% past your best"
              : data.best
              ? pct + "% of your best"
              : "no history yet"}
          </text>
        </svg>

        <div className="font-[Inter]">
          <div className="text-[#E5E5E5] text-[15px] font-semibold mb-0.5">
            {data ? monthName(data.current_month) : ""}
          </div>
          <div className="text-[#9CA3AF] text-[13px] mb-4">
            {data && data.best
              ? "Best: " + monthName(data.best_month) + ", " + money(data.best)
              : "Not enough history to compare yet"}
          </div>

          {[
            { c: "#d03b3b", t: "Under 50%" },
            { c: "#eb6834", t: "50 to 70%" },
            { c: "#fab219", t: "70 to 90%" },
            { c: "#0ca30c", t: "90 to 100%" },
            { c: "#7F77DD", t: "Past your best" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: b.c }} />
              <span className="text-[#9CA3AF] text-[13px]">{b.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TurnoverGauge;
