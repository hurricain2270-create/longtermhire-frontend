// @ts-nocheck
import React, { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";

const ClientHires = ({ userRole = "member" }) => {
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Supervisors do not see hire information at all
  const isSupervisor = userRole === "Supervisor";

  useEffect(() => {
    if (isSupervisor) {
      setLoading(false);
      return;
    }
    loadHires();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupervisor]);

  const loadHires = async () => {
    try {
      const token = localStorage.getItem("clientAuthToken");
      const res = await fetch(
        "https://api.longtermhire.com/v1/api/longtermhire/client/my-hires",
        { headers: { Authorization: "Bearer " + token } }
      );
      const json = await res.json();
      if (json && !json.error) setHires(json.data || []);
    } catch (e) {
      console.error("Failed to load hires", e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => {
    const num = parseFloat(n || 0);
    return "$" + num.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
  };

  const monthsBetween = (start, end) => {
    if (!start) return 0;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
  };

  const calcMonthlyPrice = (basePrice, discount, discountType, compDiscount, compDiscountType, month) => {
    let price = parseFloat(basePrice || 0);
    const disc = parseFloat(discount || 0);
    const comp = parseFloat(compDiscount || 0);
    if (discountType === "%" || discountType === "percentage") {
      price = price - (price * disc) / 100;
    } else if (disc > 0) {
      price = price - disc;
    }
    for (let i = 1; i < month; i++) {
      if (comp > 0) {
        if (compDiscountType === "%" || compDiscountType === "percentage") {
          price = price - (price * comp) / 100;
        } else {
          price = price - comp;
        }
      }
    }
    return Math.max(0, price);
  };

  if (isSupervisor) return null;
  if (loading) {
    return (
      <section className="mb-12 lg:mb-16">
        <div className="flex justify-center py-8">
          <ClipLoader color="#FDCE06" size={28} />
        </div>
      </section>
    );
  }
  if (hires.length === 0) return null;

  return (
    <section className="mb-12 lg:mb-16">
      <h2 className="text-[#D1D5DB] text-xl sm:text-2xl font-semibold mb-2">
        Your current hires
      </h2>
      <p className="text-[#9CA3AF] text-sm mb-8">
        Track where each hire is up to and what it will cost through to the end of term.
      </p>

      <div className="space-y-4">
        {hires.map((h) => {
          const bp = parseFloat(h.custom_base_price || h.base_price || 0);
          const months = parseInt(h.produce_quote_for || 12);
          const isCompleted = h.hire_status === "completed";
          const monthsIn = Math.min(
            monthsBetween(h.hire_start_date, isCompleted ? h.hire_end_date : null),
            months
          );
          const progressPct = months > 0 ? Math.min(100, Math.round((monthsIn / months) * 100)) : 0;
          const isExpanded = expanded === h.assignment_id;

          const schedule = Array.from({ length: months }, (_, i) => {
            const m = i + 1;
            const price = calcMonthlyPrice(bp, h.discount, h.discount_type, h.compounding_discount, h.compounding_discount_type, m);
            return { month: m, price };
          });
          let running = 0;
          const withCumulative = schedule.map((r) => {
            running += r.price;
            return { ...r, cumulative: running };
          });

          const paidToDate = withCumulative.slice(0, monthsIn).reduce((a, b) => a + b.price, 0);
          const termTotal = withCumulative[withCumulative.length - 1]?.cumulative || 0;
          const currentRate = withCumulative[Math.min(monthsIn, months - 1)]?.price || 0;

          return (
            <div
              key={h.assignment_id}
              className="bg-[#1F1F20] border border-[#333333] rounded-lg overflow-hidden"
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[#E5E5E5] text-lg font-semibold">
                      {h.equipment_name}
                    </div>
                    <div className="text-[#9CA3AF] text-xs mt-0.5">
                      {h.equip_code}
                      {h.hire_start_date
                        ? " · Started " + new Date(h.hire_start_date).toLocaleDateString("en-AU")
                        : ""}
                    </div>
                  </div>
                  <span
                    className={
                      "text-xs px-3 py-1 rounded-full font-medium border " +
                      (isCompleted
                        ? "bg-[#2A2A2A] text-[#9CA3AF] border-[#444]"
                        : "bg-[#1a3a1a] text-[#4CAF50] border-[#2d5a2d]")
                    }
                  >
                    {isCompleted ? "Completed" : "On hire"}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-[#9CA3AF] mb-1.5">
                    <span>
                      Month {Math.min(monthsIn + (isCompleted ? 0 : 1), months)} of {months}
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="bg-[#2A2A2A] rounded h-2 w-full">
                    <div
                      className="h-2 rounded transition-all"
                      style={{
                        width: progressPct + "%",
                        background: isCompleted ? "#555" : progressPct >= 75 ? "#FDCE06" : "#4CAF50",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#292A2B] rounded p-3">
                    <div className="text-[#9CA3AF] text-[11px] mb-1">
                      {isCompleted ? "Final rate" : "This month"}
                    </div>
                    <div className="text-[#E5E5E5] text-[15px] font-semibold">
                      {fmt(currentRate)}
                    </div>
                  </div>
                  <div className="bg-[#292A2B] rounded p-3">
                    <div className="text-[#9CA3AF] text-[11px] mb-1">Invoiced to date</div>
                    <div className="text-[#4CAF50] text-[15px] font-semibold">
                      {fmt(paidToDate)}
                    </div>
                  </div>
                  <div className="bg-[#292A2B] rounded p-3">
                    <div className="text-[#9CA3AF] text-[11px] mb-1">Full term</div>
                    <div className="text-[#FDCE06] text-[15px] font-semibold">
                      {fmt(termTotal)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(isExpanded ? null : h.assignment_id)}
                  className="text-[#FDCE06] text-sm font-medium hover:underline"
                >
                  {isExpanded ? "Hide breakdown" : "View month-by-month breakdown"}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-[#333333] bg-[#181818] p-4 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[380px]">
                      <thead>
                        <tr className="text-[#666] text-xs">
                          <th className="text-left pb-2 font-medium">Month</th>
                          <th className="text-right pb-2 font-medium">Rate</th>
                          <th className="text-right pb-2 font-medium">Running total</th>
                          <th className="text-right pb-2 font-medium w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withCumulative.map((r) => (
                          <tr key={r.month} className="border-t border-[#222]">
                            <td className="py-1.5 text-[#9CA3AF]">Month {r.month}</td>
                            <td className="py-1.5 text-right text-[#E5E5E5]">{fmt(r.price)}</td>
                            <td className="py-1.5 text-right text-[#E5E5E5]">{fmt(r.cumulative)}</td>
                            <td className="py-1.5 text-right">
                              {r.month <= monthsIn ? (
                                <span className="text-[#4CAF50] text-xs">Invoiced</span>
                              ) : (
                                <span className="text-[#666] text-xs">Upcoming</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parseFloat(h.compounding_discount || 0) > 0 && (
                    <p className="text-[#9CA3AF] text-xs mt-3">
                      Your rate reduces by {h.compounding_discount}
                      {h.compounding_discount_type === "%" ? "%" : ""} each month it stays on hire.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ClientHires;
