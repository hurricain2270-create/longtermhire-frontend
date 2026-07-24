// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";

const money = (n) => "$" + Math.round(n || 0).toLocaleString("en-AU");

const TermCalculator = ({ equipment = [], userRole = "member" }) => {
  // Pricing is not for supervisors — nothing here reaches them
  const isSupervisor = userRole === "Supervisor";

  const items = useMemo(
    () =>
      (equipment || []).filter(
        (e) => parseFloat(e.compounding_discount || e.compounding_discount_value || 0) > 0
      ),
    [equipment]
  );

  const [id, setId] = useState("");
  const [months, setMonths] = useState(12);

  useEffect(() => {
    if (!id && items.length) setId(String(items[0].id ?? items[0].equipment_id));
  }, [items, id]);

  const plant = items.find((e) => String(e.id ?? e.equipment_id) === String(id)) || items[0];

  const calc = useMemo(() => {
    if (!plant) return null;
    const base = parseFloat(plant.custom_base_price || plant.base_price || 0);
    const disc = parseFloat(plant.discount || 0);
    const dType = plant.discount_type;
    const comp = parseFloat(plant.compounding_discount || plant.compounding_discount_value || 0);
    const cType = plant.compounding_discount_type;

    let rate = base;
    if (dType === "%" || dType === "percentage") rate = rate - (rate * disc) / 100;
    else if (disc > 0) rate = rate - disc;

    const opening = rate;
    const schedule = [];
    let total = 0;
    for (let i = 0; i < months; i++) {
      schedule.push(rate);
      total += rate;
      if (comp > 0) {
        rate = cType === "%" || cType === "percentage" ? rate - (rate * comp) / 100 : rate - comp;
      }
      rate = Math.max(0, rate);
    }
    const last = schedule[schedule.length - 1] || opening;
    return {
      schedule, total, opening, last,
      flat: opening * months,
      saved: opening * months - total,
      pct: opening > 0 ? Math.round((1 - last / opening) * 100) : 0,
      comp, cType,
    };
  }, [plant, months]);

  if (isSupervisor || !plant || !calc) return null;

  return (
    <section className="mb-12 lg:mb-16">
      <div className="bg-gradient-to-b from-[#212122] to-[#1B1B1C] border border-[#333333] rounded-2xl px-6 sm:px-8 py-8">

        <h2 className="text-[#E5E5E5] font-semibold text-[24px] sm:text-[30px] leading-[1.15] tracking-[-0.01em] mb-2">
          The longer you keep it,
          <span className="text-[#FDCE06]"> the less you pay.</span>
        </h2>
        <p className="text-[#9CA3AF] text-[14px] leading-relaxed mb-8 max-w-2xl">
          Your rate falls {calc.comp}{calc.cType === "%" ? "%" : ""} every month a machine stays on
          site. Move the slider and see what that's worth.
        </p>

        {/* three across, matching the equipment grid below */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-10">

          {/* 1 — controls */}
          <div>
            <label className="block text-[#9CA3AF] text-[11px] uppercase tracking-[0.07em] mb-2.5">
              Machine
            </label>
            <div className="relative mb-7">
              <select
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full appearance-none bg-[#292A2B] border border-[#3A3A3C] rounded-xl pl-5 pr-12 py-4 text-[#E5E5E5] text-[16px] font-medium outline-none focus:border-[#FDCE06] hover:border-[#4A4A4C] transition-colors cursor-pointer"
              >
                {items.map((e) => (
                  <option key={e.id ?? e.equipment_id} value={e.id ?? e.equipment_id}>
                    {e.equipment_name}
                  </option>
                ))}
              </select>
              <svg
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2"
                width="13" height="8" viewBox="0 0 13 8" fill="none" aria-hidden="true"
              >
                <path d="M1 1L6.5 6.5L12 1" stroke="#FDCE06" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex items-baseline justify-between mb-2.5">
              <label className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.07em]">Term</label>
              <span className="text-[#E5E5E5] text-[16px] font-semibold tabular-nums">
                {months} months
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={12}
              step={1}
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              aria-label="Hire term in months"
              className="lth-range w-full"
            />
            <div className="flex justify-between text-[11px] text-[#6B7280] mt-2">
              <span>3</span><span>6</span><span>9</span><span>12</span>
            </div>
          </div>

          {/* 2 — the number */}
          <div className="xl:border-l xl:border-r xl:border-[#2E2E30] xl:px-10 flex flex-col justify-center">
            <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.07em] mb-2">
              You keep
            </div>
            <div className="text-[#FDCE06] font-semibold text-[40px] sm:text-[46px] leading-none tabular-nums transition-all duration-300 mb-6">
              {money(calc.saved)}
            </div>
            <div className="flex gap-8">
              <div>
                <div className="text-[#6B7280] text-[12px] mb-1">Flat rate</div>
                <div className="text-[#9CA3AF] text-[17px] font-medium tabular-nums line-through decoration-[#4A4A4C]">
                  {money(calc.flat)}
                </div>
              </div>
              <div>
                <div className="text-[#6B7280] text-[12px] mb-1">Your total</div>
                <div className="text-[#4CAF50] text-[17px] font-semibold tabular-nums">
                  {money(calc.total)}
                </div>
              </div>
            </div>
          </div>

          {/* 3 — the curve */}
          <div className="flex flex-col justify-center">
            <div className="text-[#9CA3AF] text-[11px] uppercase tracking-[0.07em] mb-3">
              Monthly rate
            </div>
            <div className="flex items-end gap-[4px] h-[112px]">
              {calc.schedule.map((r, i) => (
                <div key={i} className="flex-1 group relative flex items-end h-full">
                  <div
                    className="w-full rounded-t-[4px] bg-gradient-to-t from-[#3A8F52] to-[#4CAF50] transition-all duration-300 ease-out"
                    style={{ height: `${(r / calc.opening) * 100}%` }}
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F0F10] border border-[#3A3A3C] rounded px-2 py-1 text-[11px] text-[#E5E5E5] whitespace-nowrap tabular-nums z-10">
                    {money(r)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-[#6B7280] mt-2.5">
              <span>{money(calc.opening)}</span>
              <span className="text-[#4CAF50]">{money(calc.last)} · {calc.pct}% off</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lth-range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:999px;
          background:#2F2F31;outline:none;cursor:pointer;}
        .lth-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;
          border-radius:50%;background:#FDCE06;border:4px solid #1B1B1C;cursor:grab;
          box-shadow:0 0 0 1px #FDCE06;transition:transform .15s ease;}
        .lth-range::-webkit-slider-thumb:hover{transform:scale(1.12);}
        .lth-range::-webkit-slider-thumb:active{cursor:grabbing;transform:scale(1.04);}
        .lth-range::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#FDCE06;
          border:4px solid #1B1B1C;cursor:grab;box-shadow:0 0 0 1px #FDCE06;}
        .lth-range::-moz-range-track{height:6px;border-radius:999px;background:#2F2F31;}
      `}</style>
    </section>
  );
};

export default TermCalculator;
