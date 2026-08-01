// @ts-nocheck
import React, { useMemo, useState } from "react";

// The rate a machine has to earn before it is worth owning. Built as its own
// page rather than a widget because every number here is a judgement call and
// the sliders are the point — you move them until the answer stops flattering
// you.

const DISCOUNT_CAP = 12; // months, matching the portal's own discount

const money = (n) =>
  !isFinite(n) ? "—" : "$" + Math.round(n).toLocaleString("en-AU");

// Months-equivalent of income per year, allowing for the falling rate. The
// discount runs while a machine stays out and starts again when it comes home.
function earningMonthsPerYear(util, d, hold) {
  let sum = 0, run = 0;
  for (let m = 0; m < hold * 12; m++) {
    if (m % 12 < util) {
      sum += Math.pow(1 - d, Math.min(run, DISCOUNT_CAP - 1));
      run++;
    } else {
      run = 0;
    }
  }
  return sum / hold;
}

function monthlyPayment(principal, annualRate, years, balloonAmount) {
  const i = annualRate / 12;
  const n = years * 12;
  if (n <= 0) return 0;
  if (i === 0) return (principal - balloonAmount) / n;
  const pv = principal - balloonAmount / Math.pow(1 + i, n);
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

const Slider = ({ label, hint, value, onChange, min, max, step, display }) => (
  <div className="mb-5">
    <div className="flex justify-between items-baseline mb-1.5">
      <span className="text-[#9CA3AF] font-[Inter] text-[13px]">{label}</span>
      <span className="text-[#E5E5E5] font-mono text-[14px] font-medium">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
      className="w-full h-1 rounded appearance-none bg-[#3A3A3C] outline-none
                 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                 [&::-webkit-slider-thumb]:bg-[#FDCE06] [&::-webkit-slider-thumb]:cursor-pointer
                 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#1A1A1B]"
    />
    {hint ? (
      <p className="text-[#6B7280] font-[Inter] text-[11px] mt-1">{hint}</p>
    ) : null}
  </div>
);

const Stat = ({ label, value, tone }) => (
  <div className="bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg px-4 py-3.5">
    <p className="text-[#9A9A96] font-[Inter] text-[11px] uppercase tracking-[0.08em] mb-1.5">
      {label}
    </p>
    <p
      className={
        "font-mono text-[20px] font-semibold " +
        (tone === "pos" ? "text-[#6FBF8F]" : tone === "neg" ? "text-[#D97B6C]" : "text-[#F2F0EA]")
      }
    >
      {value}
    </p>
  </div>
);

const Band = ({ children }) => (
  <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-[#FDCE06] mb-4">
    {children}
  </p>
);

const HireRateCalculator = ({ compact = false }) => {
  const [v, setV] = useState({
    price: 100000, resale: 50, hold: 3,
    financed: false, deposit: 20, interest: 8.5, loanyrs: 3, balloon: 0,
    insure: 4000, maint: 4, overhead: 0,
    util: 9, disc: 1, target: 20,
  });
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }));

  const m = useMemo(() => {
    const price = v.price;
    const resaleCash = price * (v.resale / 100);
    const hold = v.hold;
    const disc = v.disc / 100;
    const depreciationPerYear = (price - resaleCash) / hold;

    let equity, financePerYear = 0, financeCostTotal = 0, loanPmt = 0, balloonAmt = 0, loanAmt = 0;
    if (v.financed) {
      const deposit = price * (v.deposit / 100);
      loanAmt = price - deposit;
      balloonAmt = price * (v.balloon / 100);
      loanPmt = monthlyPayment(loanAmt, v.interest / 100, v.loanyrs, balloonAmt);
      const paid = loanPmt * v.loanyrs * 12 + balloonAmt;
      financeCostTotal = Math.max(0, paid - loanAmt);
      financePerYear = financeCostTotal / hold;
      equity = deposit;
    } else {
      equity = price;
    }

    const runningPerYear = v.insure + price * (v.maint / 100) + v.overhead;
    const annualCost = depreciationPerYear + runningPerYear + financePerYear;
    const neededPerYear = annualCost + equity * (v.target / 100);

    const earningMonths = earningMonthsPerYear(v.util, disc, hold);
    const firstMonthRate = earningMonths > 0 ? neededPerYear / earningMonths : 0;
    const breakEvenRate = earningMonths > 0 ? annualCost / earningMonths : 0;
    const avgRate = firstMonthRate * (v.util > 0 ? earningMonths / v.util : 1);
    const floorRate = firstMonthRate * Math.pow(1 - disc, DISCOUNT_CAP - 1);

    const repaymentsPerYear = v.financed ? loanPmt * 12 : 0;
    const revenuePerYear = firstMonthRate * earningMonths;
    const cashPerYear = revenuePerYear - runningPerYear - repaymentsPerYear;

    // Walk the months so the chart and the totals cannot disagree.
    const runningPerMonth = runningPerYear / 12;
    const totalMonths = hold * 12;
    const flows = [-equity];
    let hireRun = 0, totalHireIncome = 0, totalRepaid = 0, onHireMonths = 0;
    for (let mm = 0; mm < totalMonths; mm++) {
      let amt = -runningPerMonth;
      const onHire = mm % 12 < v.util;
      if (onHire) {
        const t = firstMonthRate * Math.pow(1 - disc, Math.min(hireRun, DISCOUNT_CAP - 1));
        amt += t; totalHireIncome += t; onHireMonths++; hireRun++;
      } else {
        hireRun = 0;
      }
      if (v.financed && mm < v.loanyrs * 12) { amt -= loanPmt; totalRepaid += loanPmt; }
      if (v.financed && balloonAmt > 0 && mm === v.loanyrs * 12 - 1) amt -= balloonAmt;
      if (mm === totalMonths - 1) amt += resaleCash;
      flows.push(amt);
    }
    let acc = 0;
    const cum = flows.map((f) => (acc += f));
    const endCash = cum[cum.length - 1];
    const crossing = cum.findIndex((x, i) => i > 0 && x >= 0);

    return {
      price, resaleCash, hold, disc, depreciationPerYear, runningPerYear, financePerYear,
      annualCost, equity, earningMonths, firstMonthRate, breakEvenRate, avgRate, floorRate,
      cashPerYear, financeCostTotal, loanPmt, loanAmt, balloonAmt, cum, endCash, crossing,
      totalHireIncome, totalRepaid, onHireMonths, totalMonths,
      pctOfPrice: (firstMonthRate / price) * 100,
      payback: cashPerYear > 0 ? equity / cashPerYear : null,
    };
  }, [v]);

  // The money position over time. One series, because the purchase dwarfs the
  // monthly flows and drawing both as bars made the detail invisible.
  const chart = useMemo(() => {
    const W = 560, H = 220, padL = 46, padR = 12, padB = 24, padT = 14;
    const cum = m.cum, n = cum.length;
    const stepX = (W - padL - padR) / (n - 1);
    let lo = Math.min(...cum), hi = Math.max(...cum);
    if (hi < 0) hi = 0;
    if (lo > 0) lo = 0;
    const pad = (hi - lo) * 0.08 || 1;
    lo -= pad; hi += pad;
    const yOf = (val) => padT + ((hi - val) / (hi - lo)) * (H - padT - padB);
    const xOf = (i) => padL + i * stepX;
    const zero = yOf(0);

    let s = "";
    for (let yy = 1; yy <= m.hold; yy++) {
      const xg = xOf(yy * 12);
      s += `<line x1="${xg}" y1="${padT}" x2="${xg}" y2="${H - padB}" stroke="#313133"/>`;
      s += `<text x="${xg - 2}" y="${H - 8}" fill="#6A6A68" font-size="10" text-anchor="end" font-family="monospace">yr ${yy}</text>`;
    }
    for (let im = 0; im < m.totalMonths; im++) {
      if (im % 12 >= v.util) {
        s += `<rect x="${xOf(im + 0.5)}" y="${H - padB - 4}" width="${Math.max(1, stepX * 0.9)}" height="4" fill="#D97B6C" opacity="0.55"/>`;
      }
    }
    const path = cum.map((val, i) => `${i ? "L" : "M"}${xOf(i)} ${yOf(val)}`).join(" ");
    const area = `${path} L${xOf(n - 1)} ${zero} L${xOf(0)} ${zero} Z`;
    s += `<defs><clipPath id="bl"><rect x="0" y="${zero}" width="${W}" height="${H - zero}"/></clipPath>`;
    s += `<clipPath id="ab"><rect x="0" y="0" width="${W}" height="${zero}"/></clipPath></defs>`;
    s += `<path d="${area}" fill="#D97B6C" opacity="0.18" clip-path="url(#bl)"/>`;
    s += `<path d="${area}" fill="#6FBF8F" opacity="0.20" clip-path="url(#ab)"/>`;
    s += `<line x1="${padL}" y1="${zero}" x2="${W - padR}" y2="${zero}" stroke="#5A5A5C"/>`;
    s += `<path d="${path}" fill="none" stroke="#FDCE06" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (m.crossing > 0) {
      const cx = xOf(m.crossing);
      const anchor = m.crossing > n * 0.6 ? "end" : "start";
      s += `<line x1="${cx}" y1="${padT}" x2="${cx}" y2="${H - padB}" stroke="#6FBF8F" stroke-dasharray="3 3"/>`;
      s += `<circle cx="${cx}" cy="${zero}" r="3.5" fill="#6FBF8F"/>`;
      s += `<text x="${cx + (anchor === "end" ? -6 : 6)}" y="${padT + 10}" fill="#6FBF8F" font-size="10" text-anchor="${anchor}" font-family="monospace">in front - month ${m.crossing}</text>`;
    }
    const deepest = Math.min(...cum);
    s += `<text x="${padL - 6}" y="${yOf(deepest) + 4}" fill="#D97B6C" font-size="10" text-anchor="end" font-family="monospace">${Math.round(deepest / 1000)}k</text>`;
    s += `<text x="${padL - 6}" y="${yOf(m.endCash) + 4}" fill="${m.endCash >= 0 ? "#6FBF8F" : "#D97B6C"}" font-size="10" text-anchor="end" font-family="monospace">${m.endCash >= 0 ? "+" : ""}${Math.round(m.endCash / 1000)}k</text>`;
    s += `<circle cx="${xOf(n - 1)}" cy="${yOf(m.endCash)}" r="3" fill="#FDCE06"/>`;
    return s;
  }, [m, v.util]);

  const ladder = useMemo(() => {
    const bars = [];
    let run = 0;
    for (let k = 0; k < m.hold * 12; k++) {
      if (k % 12 < v.util) {
        bars.push(100 * Math.pow(1 - m.disc, Math.min(run, DISCOUNT_CAP - 1)));
        run++;
      } else {
        bars.push(null);
        run = 0;
      }
    }
    return bars;
  }, [m, v.util]);

  const verdict =
    m.pctOfPrice > 6
      ? { tone: "bad", text: `That is ${m.pctOfPrice.toFixed(1)}% of the purchase price every month. Very few clients will wear that — either the machine needs to work more months a year, or it is the wrong machine to own.` }
      : m.pctOfPrice < 1.5
      ? { tone: "good", text: `That is ${m.pctOfPrice.toFixed(1)}% of the purchase price a month, comfortably inside what the market pays. Room to price above it.` }
      : { tone: "", text: `That is ${m.pctOfPrice.toFixed(1)}% of the purchase price a month. Long term dry hire typically sits between 2% and 4%, so this is in the normal range — check it against what you know the market charges.` };

  const idleMonths = 12 - v.util;
  const idleCost = m.runningPerYear / 12 + (v.financed ? m.loanPmt : 0);

  const vClass = (tone) =>
    "rounded-lg px-3.5 py-3 text-[13px] leading-relaxed mb-4 border " +
    (tone === "good"
      ? "border-[#35603F] bg-[#1B2E20] text-[#9FD9B4]"
      : tone === "bad"
      ? "border-[#6B3730] bg-[#2E1B18] text-[#E8A99F]"
      : "border-[#3A3A3C] bg-[#2C2C2E] text-[#9A9A96]");

  return (
    <div>
      {!compact && (
        <header className="max-w-[1100px] mx-auto mb-8 pb-5 border-b border-[#3A3A3C] flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-[#F2F0EA] font-[Inter] font-semibold text-[28px] sm:text-[32px]">
            Minimum <span className="text-[#FDCE06] italic font-normal">hire rate</span>
          </h1>
          <p className="text-[#9A9A96] text-[13px] max-w-[340px] sm:text-right leading-relaxed">
            What a machine has to earn to be worth owning — before deciding what the
            market will pay for it.
          </p>
        </header>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5">
        {/* INPUTS */}
        <section className="bg-[#232324] border border-[#3A3A3C] rounded-xl p-6">
          <Band>The machine</Band>
          <Slider label="Purchase price" hint="What it costs you to put on the ground, delivered"
            min={10000} max={800000} step={5000} value={v.price} onChange={set("price")}
            display={money(v.price)} />
          <Slider label="Resale after the term" hint="What it is worth when you sell it, as a share of what you paid"
            min={0} max={80} step={1} value={v.resale} onChange={set("resale")}
            display={v.resale + "%"} />
          <Slider label="How long you keep it" hint="Ownership period the whole calculation runs over"
            min={1} max={5} step={1} value={v.hold} onChange={set("hold")}
            display={v.hold + (v.hold === 1 ? " year" : " years")} />

          <div className="h-px bg-gradient-to-r from-[#B8940A] to-transparent my-6" />
          <Band>Paying for it</Band>

          <div className="flex gap-1.5 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg p-1 mb-5">
            {[["Cash", false], ["Financed", true]].map(([label, on]) => (
              <button key={label} onClick={() => setV((s) => ({ ...s, financed: on }))}
                className={
                  "flex-1 py-2.5 rounded-md font-[Inter] text-[13px] transition-colors " +
                  (v.financed === on ? "bg-[#FDCE06] text-[#1A1A1B] font-semibold" : "text-[#9A9A96]")
                }>
                {label}
              </button>
            ))}
          </div>

          {v.financed && (
            <>
              <Slider label="Deposit" hint="Cash you put in up front"
                min={0} max={60} step={1} value={v.deposit} onChange={set("deposit")}
                display={v.deposit + "%"} />
              <Slider label="Interest rate" hint="Annual rate on the borrowed portion"
                min={0} max={20} step={0.25} value={v.interest} onChange={set("interest")}
                display={v.interest + "%"} />
              <Slider label="Loan term" hint="How long you are paying it off"
                min={1} max={5} step={1} value={v.loanyrs} onChange={set("loanyrs")}
                display={v.loanyrs + (v.loanyrs === 1 ? " year" : " years")} />
              <Slider label="Balloon at the end" hint="Lump sum owing when the term finishes"
                min={0} max={30} step={1} value={v.balloon} onChange={set("balloon")}
                display={v.balloon + "%"} />
              <div className="grid grid-cols-2 gap-3.5 mb-1">
                <Stat label="Monthly repayment" value={money(m.loanPmt)} />
                <Stat label="Borrowed" value={money(m.loanAmt)} />
              </div>
              <p className="text-[#6B7280] font-[Inter] text-[11px] mb-5">
                {money(m.loanPmt * 12)} a year for {v.loanyrs}
                {v.loanyrs === 1 ? " year" : " years"}
                {m.balloonAmt > 0 ? `, then ${money(m.balloonAmt)} owing` : ""}. That comes
                out whether the machine is working or not.
              </p>
            </>
          )}

          <div className="h-px bg-gradient-to-r from-[#B8940A] to-transparent my-6" />
          <Band>What it costs to run</Band>
          <Slider label="Insurance and registration" hint="Per year, whether it is working or not"
            min={0} max={30000} step={250} value={v.insure} onChange={set("insure")}
            display={money(v.insure)} />
          <Slider label="Servicing and repairs" hint="Per year. The breakdowns you wear, not the ones the client causes"
            min={0} max={15} step={0.5} value={v.maint} onChange={set("maint")}
            display={v.maint.toFixed(1) + "% of price"} />
          <Slider label="Overheads carried by this machine" hint="Its share of yard, admin, software, your time — per year"
            min={0} max={40000} step={500} value={v.overhead} onChange={set("overhead")}
            display={money(v.overhead)} />

          <div className="h-px bg-gradient-to-r from-[#B8940A] to-transparent my-6" />
          <Band>How it earns</Band>
          <Slider label="Months on hire per year" hint="Nine means nine on hire then three in the yard, every year"
            min={1} max={12} step={1} value={v.util} onChange={set("util")} display={v.util} />
          <Slider label="Discount per month, compounding" hint="Stops falling after 12 months, same as the portal"
            min={0} max={5} step={0.25} value={v.disc} onChange={set("disc")}
            display={v.disc + "%"} />
          <Slider label="Return you want on your own money" hint="Per year, on the cash you actually put in"
            min={10} max={80} step={1} value={v.target} onChange={set("target")}
            display={v.target + "%"} />

          <p className="text-[#9A9A96] font-[Inter] text-[11.5px] leading-relaxed border-t border-[#3A3A3C] pt-3.5">
            Everything here is <span className="text-[#F2F0EA]">dry hire</span> — no operator,
            no fuel. Float in and out is assumed charged separately to the client. Tax is not
            modelled.
          </p>
        </section>

        {/* RESULTS */}
        <section className="bg-[#232324] border border-[#3A3A3C] rounded-xl p-6">
          <Band>What you have to charge</Band>
          <div className="flex items-end gap-4 flex-wrap mb-1">
            <p className={"text-[#FDCE06] font-[Inter] font-semibold leading-none " + (compact ? "text-[42px]" : "text-[56px]")}>
              {money(m.firstMonthRate)}
            </p>
            <p className="text-[#9A9A96] text-[13px] pb-2.5">
              first month<br />per month, ex GST
            </p>
          </div>
          <p className="text-[#9A9A96] text-[12px] mt-2 mb-5 leading-relaxed">
            Falls to {money(m.floorRate)} by month {DISCOUNT_CAP} and holds there.
          </p>

          <div className={vClass(verdict.tone)}>{verdict.text}</div>

          <div className="grid grid-cols-2 gap-3.5 mb-2">
            <Stat label="Break-even rate" value={money(m.breakEvenRate)} />
            <Stat label="Average over the hire" value={money(m.avgRate)} />
            <Stat label="Your own money in" value={money(m.equity)} />
            <Stat label="Cost to own, per year" value={money(m.annualCost)} />
          </div>
          <p className="text-[#6B7280] font-[Inter] text-[11px] mb-5">
            Losing value {money(m.depreciationPerYear)} · insurance, servicing and overheads{" "}
            {money(m.runningPerYear)}
            {v.financed ? ` · interest ${money(m.financePerYear)}` : ""}. Depreciation is the
            biggest line and the easiest to forget.
          </p>

          <Band>The rate, month by month</Band>
          <div className="flex items-end gap-px h-11 mb-1">
            {ladder.map((h, i) =>
              h === null ? (
                <div key={i} className="flex-1 bg-[#3A3A3C]" style={{ height: 3 }} />
              ) : (
                <div key={i} className="flex-1 bg-[#FDCE06] opacity-90" style={{ height: h + "%" }} />
              )
            )}
          </div>
          <div className="flex justify-between font-mono text-[11px] text-[#9A9A96] mb-5">
            <span>starts at {money(m.firstMonthRate)}</span>
            <span>
              {v.util >= 12
                ? `stops falling at ${money(m.floorRate)}`
                : `${v.util} months down, then back to the top`}
            </span>
          </div>

          <Band>Where your money stands, month by month</Band>
          <div className="bg-gradient-to-b from-[#1F1F20] to-[#232324] border border-[#3A3A3C] rounded-lg px-2 pt-2.5 pb-1.5 mb-2">
            <svg viewBox="0 0 560 220" preserveAspectRatio="none"
              className="w-full h-[220px] block"
              dangerouslySetInnerHTML={{ __html: chart }} />
          </div>
          <div className={vClass(idleMonths >= 1 ? "" : "good") + " mt-2"}>
            {idleMonths >= 1
              ? `On hire ${v.util} months a year, then ${idleMonths} in the yard. Every idle month costs ${money(idleCost)} and earns nothing — closing that gap is worth more than any rate rise.`
              : "Never comes home. That is the whole game."}
          </div>

          <div className="grid grid-cols-2 gap-3.5 mb-2">
            <Stat label="Cash in a normal year" value={money(m.cashPerYear)}
              tone={m.cashPerYear >= 0 ? "pos" : "neg"} />
            <Stat label="Cash at the end, all in" value={money(m.endCash)}
              tone={m.endCash >= 0 ? "pos" : "neg"} />
            <Stat label="Finance cost, total" value={v.financed ? money(m.financeCostTotal) : "none"} />
            <Stat label="Resale at the end" value={money(m.resaleCash)} />
          </div>

          <p className="text-[#F2F0EA] font-[Inter] text-[12.5px] leading-[1.7] mb-5">
            Hire income {money(m.totalHireIncome)} over {m.onHireMonths} months on hire, less
            running costs {money(m.runningPerYear * m.hold)}
            {v.financed ? `, less repayments ${money(m.totalRepaid + m.balloonAmt)}` : ""}, less
            the {money(m.equity)} you put in, plus {money(m.resaleCash)} when you sell it ={" "}
            {money(m.endCash)}.
          </p>

          <p className="text-[#9A9A96] font-[Inter] text-[11.5px] leading-relaxed border-t border-[#3A3A3C] pt-3.5">
            The headline is the <span className="text-[#F2F0EA]">first month</span> of a hire.
            Every month after it is lower, so the rate you quote has to start above the average
            you need. Break-even covers depreciation, running costs, overheads and finance, and
            returns nothing on your own money.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HireRateCalculator;
