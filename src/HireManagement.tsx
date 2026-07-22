// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";
import { authHeader } from "./services/authHeader";

const fmt = (n) => {
  const num = parseFloat(n || 0);
  const fixed = num.toFixed(2);
  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "$" + parts.join(".");
};

const monthsBetween = (start) => {
  if (!start) return 0;
  const s = new Date(start);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()));
};

const calcSchedule = (basePrice, discount, discountType, compDiscount, compDiscountType, months) => {
  let price = parseFloat(basePrice || 0);
  const disc = parseFloat(discount || 0);
  const comp = parseFloat(compDiscount || 0);
  const total = parseInt(months || 12);

  if (discountType === "%" || discountType === "percentage") {
    price = price - (price * disc / 100);
  } else {
    price = price - disc;
  }

  let cumulative = 0;
  const schedule = [];
  for (let m = 1; m <= total; m++) {
    cumulative += price;
    schedule.push({ month: m, price: parseFloat(price.toFixed(2)), cumulative: parseFloat(cumulative.toFixed(2)) });
    if (comp > 0) {
      if (compDiscountType === "%" || compDiscountType === "percentage") {
        price = price - (price * comp / 100);
      } else {
        price = price - comp;
      }
    }
  }
  return schedule;
};

const HireManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/hire-management");
      if (!res.data.error) setData(res.data.data || []);
    } catch (e) {
      toast.error("Failed to load hire data");
    } finally {
      setLoading(false);
    }
  };

  const startHire = async (assignmentId) => {
    setStartingId(assignmentId);
    try {
      await api.post(`/v1/api/longtermhire/super_admin/start-hire/${assignmentId}`, {
        start_date: new Date().toISOString().slice(0, 10)
      });
      toast.success("Hire started");
      loadData();
    } catch (e) {
      toast.error("Failed to start hire");
    } finally {
      setStartingId(null);
    }
  };

  // Group by company
  const grouped = data.reduce((acc, item) => {
    const key = item.company_name;
    if (!acc[key]) acc[key] = { email: item.email, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ClipLoader color="#FDCE06" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[#E5E5E5] text-xl font-semibold mb-1">Hire management</h1>
        <p className="text-[#9CA3AF] text-sm">Active equipment hires, invoiced to date, and forecast to end of term.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg p-8 text-center text-[#9CA3AF]">
          No equipment assigned to clients yet.
        </div>
      ) : Object.entries(grouped).map(([companyName, group]) => {
        const activeItems = group.items.filter(i => i.hire_status === "active");
        const totalInvoiced = activeItems.reduce((sum, item) => {
          const months = monthsBetween(item.hire_start_date);
          const schedule = calcSchedule(item.custom_base_price || item.base_price, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, item.produce_quote_for || 12);
          return sum + (schedule.slice(0, months).reduce((s, r) => s + r.price, 0));
        }, 0);
        const totalForecast = activeItems.reduce((sum, item) => {
          const schedule = calcSchedule(item.custom_base_price || item.base_price, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, item.produce_quote_for || 12);
          return sum + (schedule[schedule.length - 1]?.cumulative || 0);
        }, 0);
        const thisMonth = activeItems.reduce((sum, item) => {
          const months = monthsBetween(item.hire_start_date);
          const schedule = calcSchedule(item.custom_base_price || item.base_price, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, item.produce_quote_for || 12);
          return sum + (schedule[months]?.price || schedule[0]?.price || 0);
        }, 0);

        return (
          <div key={companyName} className="bg-[#1F1F20] border border-[#333] rounded-lg overflow-hidden mb-6">
            {/* Client header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
              <div>
                <div className="text-[#FDCE06] font-[Inter] font-semibold text-[15px]">{companyName}</div>
                <div className="text-[#9CA3AF] text-xs mt-0.5">{group.email} &nbsp;·&nbsp; {group.items.length} {group.items.length === 1 ? "item" : "items"} assigned</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium border ${activeItems.length > 0 ? "bg-[#1a3a1a] text-[#4CAF50] border-[#2d5a2d]" : "bg-[#3a2e00] text-[#FDCE06] border-[#5a4800]"}`}>
                {activeItems.length > 0 ? "Active" : "Pending"}
              </span>
            </div>

            {/* Summary stats */}
            {activeItems.length > 0 && (
              <div className="grid grid-cols-4 border-b border-[#2A2A2A]">
                {[
                  { label: "Invoiced to date", value: fmt(totalInvoiced), color: "#4CAF50" },
                  { label: "This month", value: fmt(thisMonth), color: "#E5E5E5" },
                  { label: "Forecast to term end", value: fmt(totalForecast), color: "#FDCE06" },
                  { label: "Items on hire", value: activeItems.length.toString(), color: "#E5E5E5" },
                ].map((s, i) => (
                  <div key={i} className={`px-4 py-3 ${i < 3 ? "border-r border-[#2A2A2A]" : ""}`}>
                    <div className="text-[#9CA3AF] text-[11px] mb-1">{s.label}</div>
                    <div className="text-[16px] font-medium" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Equipment rows */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[22%]">Equipment</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[8%]">ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[12%]">Start date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[16%]">Progress</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[12%]">Month 1 rate</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[12%]">Invoiced</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[12%]">Forecast total</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[14%]"></th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const termMonths = parseInt(item.produce_quote_for || 12);
                  const schedule = calcSchedule(item.custom_base_price || item.base_price, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, termMonths);
                  const monthsIn = monthsBetween(item.hire_start_date);
                  const clampedMonths = Math.min(monthsIn, termMonths);
                  const invoiced = schedule.slice(0, clampedMonths).reduce((s, r) => s + r.price, 0);
                  const forecast = schedule[schedule.length - 1]?.cumulative || 0;
                  const progressPct = termMonths > 0 ? Math.min(100, Math.round((clampedMonths / termMonths) * 100)) : 0;
                  const isActive = item.hire_status === "active";
                  const isExpanded = expandedItem === item.assignment_id;

                  return (
                    <React.Fragment key={item.assignment_id}>
                      <tr className="border-b border-[#1a1a1a] last:border-0">
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: isActive ? "#E5E5E5" : "#666" }}>{item.equipment_name}</td>
                        <td className="px-4 py-3 text-xs text-[#9CA3AF]">{item.equip_code}</td>
                        <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                          {item.hire_start_date ? new Date(item.hire_start_date).toLocaleDateString("en-AU") : <span className="text-[#666]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <>
                              <div className="text-[11px] text-[#9CA3AF] mb-1">{clampedMonths} of {termMonths} months</div>
                              <div className="bg-[#2A2A2A] rounded h-1.5 w-full">
                                <div className="h-1.5 rounded" style={{ width: `${progressPct}%`, background: progressPct >= 75 ? "#FDCE06" : "#4CAF50" }} />
                              </div>
                            </>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#3a2e00] text-[#FDCE06] border border-[#5a4800]">Not started</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[#E5E5E5]">{fmt(schedule[0]?.price || 0)}</td>
                        <td className="px-4 py-3 text-sm text-right" style={{ color: isActive ? "#4CAF50" : "#666" }}>{isActive ? fmt(invoiced) : "—"}</td>
                        <td className="px-4 py-3 text-sm text-right" style={{ color: isActive ? "#FDCE06" : "#666" }}>{isActive ? fmt(forecast) : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            {!isActive ? (
                              <button
                                onClick={() => startHire(item.assignment_id)}
                                disabled={startingId === item.assignment_id}
                                className="px-3 py-1.5 border border-[#FDCE06] rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] disabled:opacity-50 transition-colors"
                              >
                                {startingId === item.assignment_id ? "Starting..." : "Start Hire"}
                              </button>
                            ) : (
                              <button
                                onClick={() => setExpandedItem(isExpanded ? null : item.assignment_id)}
                                className="px-3 py-1.5 border border-[#4CAF50] rounded text-[#4CAF50] font-[Inter] font-bold text-[13px] hover:bg-[#4CAF50]/10 transition-colors"
                              >
                                {isExpanded ? "Hide" : "View"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-4 pb-4 bg-[#181818]">
                            <div className="pt-3">
                              <div className="text-[#9CA3AF] text-xs mb-2 font-medium">Month-by-month schedule</div>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr>
                                    <th className="text-left text-[#666] pb-1 w-20">Month</th>
                                    <th className="text-right text-[#666] pb-1">Monthly rate</th>
                                    <th className="text-right text-[#666] pb-1">Accumulative</th>
                                    <th className="text-right text-[#666] pb-1 w-20">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {schedule.map((row) => (
                                    <tr key={row.month}>
                                      <td className="py-0.5 text-[#9CA3AF]">Month {row.month}</td>
                                      <td className="py-0.5 text-right text-[#E5E5E5]">{fmt(row.price)}</td>
                                      <td className="py-0.5 text-right text-[#E5E5E5]">{fmt(row.cumulative)}</td>
                                      <td className="py-0.5 text-right">
                                        {row.month <= clampedMonths ? (
                                          <span className="text-[#4CAF50]">Invoiced</span>
                                        ) : (
                                          <span className="text-[#666]">Forecast</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default HireManagement;
