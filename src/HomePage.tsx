import React, { useState, useMemo } from "react";

/**
 * Indicative rates only — deliberately NOT read from the database.
 * Clause 4.2 of the hire agreement makes quoted pricing confidential to each
 * hirer, so the public calculator runs on published market rates instead.
 * Edit these figures in one place.
 */
const FLEET = [
  { id: "exc17", name: "1.7 tonne excavator", rate: 3200 },
  { id: "exc55", name: "5.5 tonne excavator", rate: 5400 },
  { id: "exc8", name: "8 tonne excavator", rate: 7800 },
  { id: "exc14", name: "14 tonne excavator", rate: 12500 },
  { id: "exc23", name: "23 tonne excavator", rate: 18500 },
  { id: "tele", name: "4.5 tonne telehandler", rate: 6000 },
  { id: "skid", name: "Skid steer loader", rate: 4600 },
  { id: "vac", name: "Vacuum truck", rate: 27000 },
  { id: "water", name: "Water cart", rate: 5400 },
  { id: "tipper", name: "Tipper truck", rate: 4200 },
];

const COMPOUNDING = 0.02; // 2% off the previous month, every month it stays

const money = (n) =>
  "$" + Math.round(n).toLocaleString("en-AU");

const HomePage: React.FC = () => {
  const [plantId, setPlantId] = useState("vac");
  const [months, setMonths] = useState(12);

  const plant = FLEET.find((f) => f.id === plantId) || FLEET[0];

  const calc = useMemo(() => {
    let rate = plant.rate;
    let total = 0;
    const schedule: number[] = [];
    for (let i = 0; i < months; i++) {
      schedule.push(rate);
      total += rate;
      rate = rate * (1 - COMPOUNDING);
    }
    const flat = plant.rate * months;
    return {
      schedule,
      total,
      flat,
      saved: flat - total,
      last: schedule[schedule.length - 1],
      pct: Math.round((1 - schedule[schedule.length - 1] / plant.rate) * 100),
    };
  }, [plant, months]);

  return (
    <div className="min-h-screen bg-[#1A1A1B] text-[#E5E5E5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <img
            src="/figma-assets/logo.png"
            alt="Long Term Hire"
            className="h-9 w-auto"
          />
          <div className="flex items-center gap-3">
            <a
              href="/client/login"
              className="px-4 py-2 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] transition-colors whitespace-nowrap"
            >
              Client login
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-6 text-center">
        <h1 className="font-[Inter] font-bold text-[34px] sm:text-[44px] leading-[1.1] mb-4">
          Every other hire company charges you the same rate
          <br className="hidden sm:block" />
          <span className="text-[#FDCE06]"> in month twelve as month one.</span>
        </h1>
        <p className="text-[#9CA3AF] font-[Inter] text-[16px] sm:text-[17px] max-w-2xl mx-auto leading-relaxed">
          We don't. Keep a machine on site and its rate falls every single month.
          Have a play below and see what that's worth on your next job.
        </p>
      </section>

      {/* Calculator */}
      <section className="max-w-3xl mx-auto px-5 pb-14">
        <div className="bg-[#1F1F20] border border-[#333333] rounded-2xl p-5 sm:p-7">
          {/* Controls */}
          <div className="grid sm:grid-cols-2 gap-5 mb-7">
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-2">
                Choose a machine
              </label>
              <select
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                className="w-full bg-[#292A2B] border border-[#333333] rounded-lg px-4 py-3 text-[#E5E5E5] font-[Inter] text-[15px] outline-none focus:border-[#FDCE06] transition-colors"
              >
                {FLEET.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-2">
                Keep it for{" "}
                <span className="text-[#E5E5E5] font-semibold">
                  {months} {months === 1 ? "month" : "months"}
                </span>
              </label>
              <input
                type="range"
                min={3}
                max={12}
                step={1}
                value={months}
                onChange={(e) => setMonths(parseInt(e.target.value))}
                aria-label="Hire term in months"
                className="w-full accent-[#FDCE06] mt-3"
              />
              <div className="flex justify-between text-[11px] text-[#6B7280] font-[Inter] mt-1">
                <span>3 months</span>
                <span>12 months</span>
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid sm:grid-cols-2 gap-3 mb-7">
            <div className="bg-[#292A2B] rounded-xl p-4">
              <div className="text-[#9CA3AF] font-[Inter] text-[12px] mb-1">
                Flat rate elsewhere
              </div>
              <div className="font-[Inter] font-bold text-[26px] leading-tight">
                {money(calc.flat)}
              </div>
              <div className="text-[#6B7280] font-[Inter] text-[12px] mt-1">
                {money(plant.rate)} every month
              </div>
            </div>
            <div className="bg-[#14301C] border border-[#2d5a2d] rounded-xl p-4">
              <div className="text-[#4CAF50] font-[Inter] text-[12px] mb-1">
                Your rate with us
              </div>
              <div className="text-[#4CAF50] font-[Inter] font-bold text-[26px] leading-tight">
                {money(calc.total)}
              </div>
              <div className="text-[#6B7280] font-[Inter] text-[12px] mt-1">
                down to {money(calc.last)} by month {months}
              </div>
            </div>
          </div>

          {/* Saving headline */}
          <div className="text-center mb-7">
            <div className="text-[#9CA3AF] font-[Inter] text-[13px] mb-1">
              You keep
            </div>
            <div className="text-[#FDCE06] font-[Inter] font-bold text-[38px] sm:text-[46px] leading-none">
              {money(calc.saved)}
            </div>
            <div className="text-[#6B7280] font-[Inter] text-[13px] mt-2">
              {calc.pct}% off by the final month, on a {months} month hire
            </div>
          </div>

          {/* Rate curve */}
          <div className="mb-6">
            <div className="text-[#9CA3AF] font-[Inter] text-[12px] mb-2">
              What you pay each month
            </div>
            <div className="flex items-end gap-[3px] h-[86px]">
              {calc.schedule.map((r, i) => (
                <div
                  key={i}
                  title={`Month ${i + 1}: ${money(r)}`}
                  className="flex-1 bg-[#4CAF50] rounded-t-[3px] transition-all"
                  style={{ height: `${(r / plant.rate) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-[#6B7280] font-[Inter] mt-1.5">
              <span>month 1 · {money(plant.rate)}</span>
              <span>
                month {months} · {money(calc.last)}
              </span>
            </div>
          </div>

          <a
            href="mailto:admin@longtermhire.com?subject=Hire enquiry"
            className="block text-center px-5 py-3.5 rounded-lg bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[15px] hover:bg-[#E5B800] transition-colors"
          >
            Get a quote on a {plant.name.toLowerCase()}
          </a>
          <p className="text-center text-[#6B7280] font-[Inter] text-[11px] mt-3">
            Indicative rates for illustration. Your quoted rate depends on the
            machine, the site and the term.
          </p>
        </div>
      </section>

      {/* Why it falls */}
      <section className="max-w-4xl mx-auto px-5 pb-16">
        <h2 className="font-[Inter] font-bold text-[24px] text-center mb-3">
          Why the rate falls
        </h2>
        <p className="text-[#9CA3AF] font-[Inter] text-[15px] text-center max-w-2xl mx-auto leading-relaxed mb-8">
          It isn't a discount we invented to win the job. A machine that stays on
          one site genuinely costs us less to run, and we pass that back rather
          than keeping it.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              t: "No float in and out",
              d: "Every move costs money. A machine that stays put is moved once, not once a fortnight.",
            },
            {
              t: "No turnaround",
              d: "No wash down, inspection and re-yard between hires. It works, then it keeps working.",
            },
            {
              t: "No idle weeks",
              d: "Short hires leave gaps we carry. A long hire fills the calendar, so we can charge less for it.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5"
            >
              <div className="text-[#FDCE06] font-[Inter] font-bold text-[15px] mb-2">
                {c.t}
              </div>
              <div className="text-[#9CA3AF] font-[Inter] text-[13px] leading-relaxed">
                {c.d}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A]">
        <div className="max-w-5xl mx-auto px-5 py-7 text-center">
          <p className="text-[#9CA3AF] font-[Inter] text-[13px] mb-1">
            Long Term Hire Pty Ltd &nbsp;·&nbsp; ABN 83 246 158 161
          </p>
          <a
            href="mailto:admin@longtermhire.com"
            className="text-[#FDCE06] font-[Inter] text-[13px] hover:underline"
          >
            admin@longtermhire.com
          </a>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
