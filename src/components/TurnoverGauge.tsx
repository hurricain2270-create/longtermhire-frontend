// @ts-nocheck
import React, { useEffect, useState } from "react";
import api from "../services/api";
import Gauge from "./Gauge";

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

  return (
    <div className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5">
      <div className="text-[#9CA3AF] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-3">
        Turnover this month
      </div>

      <div className="flex flex-wrap items-center gap-8">
        <Gauge
          pct={pct}
          value={data ? money(data.current) : "—"}
          caption={
            !data
              ? ""
              : over
              ? pct >= 150
                ? (pct / 100).toFixed(1) + "x your best month"
                : pct - 100 + "% past your best"
              : data.best
              ? pct + "% of your best"
              : "no history yet"
          }
          width={460}
          height={300}
          valueSize={20}
          captionSize={9}
          ariaLabel={
            data
              ? `Turnover ${money(data.current)}, ${pct} percent of the best month`
              : "Loading turnover"
          }
        />

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
