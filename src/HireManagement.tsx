// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import api from "./services/api";

const HireManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [invoices, setInvoices] = useState({});
  const [owingEdits, setOwingEdits] = useState({});
  const [savingInvoice, setSavingInvoice] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/v1/api/longtermhire/super_admin/hire-management");
      if (res && res.data && !res.data.error) {
        setData(res.data.data || []);
      } else {
        setError("Failed to load hire data");
      }
    } catch (e) {
      console.error("Hire management error:", e);
      setError(e.message || "Failed to load hire data");
    } finally {
      setLoading(false);
    }
  };

  const startHire = async (assignmentId) => {
    try {
      setStartingId(assignmentId);
      const today = new Date().toISOString().slice(0, 10);
      await api.post("/v1/api/longtermhire/super_admin/start-hire/" + assignmentId, { start_date: today });
      toast.success("Hire started");
      loadData();
    } catch (e) {
      toast.error("Failed to start hire");
    } finally {
      setStartingId(null);
    }
  };

  const endHire = async (assignmentId, equipmentName) => {
    try {
      setStartingId(assignmentId);
      const today = new Date().toISOString().slice(0, 10);
      await api.post("/v1/api/longtermhire/super_admin/end-hire/" + assignmentId, { end_date: today });
      toast.success("Hire ended");
      loadData();
    } catch (e) {
      toast.error("Failed to end hire");
    } finally {
      setStartingId(null);
    }
  };

  const restartHire = async (assignmentId, equipmentName) => {
    try {
      setStartingId(assignmentId);
      await api.post("/v1/api/longtermhire/super_admin/restart-hire/" + assignmentId, {});
      toast.success("Hire restarted");
      loadData();
    } catch (e) {
      toast.error("Failed to restart hire");
    } finally {
      setStartingId(null);
    }
  };

  const deleteHire = async (assignmentId, equipmentName) => {
    try {
      setStartingId(assignmentId);
      await api.post("/v1/api/longtermhire/super_admin/delete-hire/" + assignmentId, {});
      toast.success("Hire deleted");
      setExpandedItem(null);
      loadData();
    } catch (e) {
      toast.error("Failed to delete hire");
    } finally {
      setStartingId(null);
    }
  };

  const loadInvoices = async (assignmentId) => {
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/hire-invoices/" + assignmentId);
      if (res && res.data && !res.data.error) {
        const map = {};
        (res.data.data || []).forEach((inv) => { map[inv.month_number] = inv; });
        setInvoices((prev) => ({ ...prev, [assignmentId]: map }));
      }
    } catch (e) {
      console.error("Failed to load invoices", e);
    }
  };

  const toggleExpand = (assignmentId) => {
    if (expandedItem === assignmentId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(assignmentId);
      loadInvoices(assignmentId);
    }
  };

  const saveInvoice = async (assignmentId, monthNumber, amount, owing, status) => {
    try {
      setSavingInvoice(assignmentId + "-" + monthNumber);
      await api.post("/v1/api/longtermhire/super_admin/hire-invoice", {
        assignment_id: assignmentId,
        month_number: monthNumber,
        amount: amount,
        amount_owing: owing,
        status: status,
      });
      toast.success("Saved");
      loadInvoices(assignmentId);
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSavingInvoice(null);
    }
  };

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    const { type, assignmentId, equipmentName } = confirmAction;
    setConfirmAction(null);
    if (type === "end") endHire(assignmentId, equipmentName);
    else if (type === "restart") restartHire(assignmentId, equipmentName);
    else if (type === "delete") deleteHire(assignmentId, equipmentName);
  };

  const fmt = (n) => {
    try {
      const num = parseFloat(n || 0);
      return "$" + num.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
    } catch (e) {
      return "$0.00";
    }
  };

  // Calendar month label once a hire has a real start date
  const monthLabel = (startDate, monthNumber) => {
    if (!startDate) return "Month " + monthNumber;
    const d = new Date(startDate);
    const target = new Date(d.getFullYear(), d.getMonth() + (monthNumber - 1), 1);
    return target.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  };

  const monthsBetween = (start) => {
    if (!start) return 0;
    try {
      const s = new Date(start);
      const now = new Date();
      return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()));
    } catch (e) {
      return 0;
    }
  };

  const calcMonthlyPrice = (basePrice, discount, discountType, compDiscount, compDiscountType, month) => {
    try {
      let price = parseFloat(basePrice || 0);
      const disc = parseFloat(discount || 0);
      const comp = parseFloat(compDiscount || 0);
      if (discountType === "%" || discountType === "percentage") {
        price = price - (price * disc / 100);
      } else if (disc > 0) {
        price = price - disc;
      }
      for (let i = 1; i < month; i++) {
        if (comp > 0) {
          if (compDiscountType === "%" || compDiscountType === "percentage") {
            price = price - (price * comp / 100);
          } else {
            price = price - comp;
          }
        }
      }
      return Math.max(0, price);
    } catch (e) {
      return 0;
    }
  };

  // Group by company
  const grouped = {};
  if (Array.isArray(data)) {
    data.forEach((item) => {
      const key = item.company_name || "Unknown";
      if (!grouped[key]) grouped[key] = { email: item.email, items: [] };
      grouped[key].items.push(item);
    });
  }

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
          <p className="text-red-400 mb-3">{error}</p>
          <button onClick={loadData} className="px-4 py-2 bg-[#FDCE06] text-[#1F1F20] rounded font-bold text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em] mb-1">Hire Management</h1>
        <p className="text-[#9CA3AF] font-[Inter] text-sm mt-1">Active equipment hires, invoiced to date, and forecast to end of term.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-[#1F1F20] border border-[#333] rounded-lg p-8 text-center text-[#9CA3AF]">
          No equipment assigned to clients yet.
        </div>
      ) : (
        Object.entries(grouped).map(([companyName, group]) => {
          const activeItems = group.items.filter((i) => i.hire_status === "active");
          const termMonths = 12;

          return (
            <div key={companyName} className="bg-[#1F1F20] border border-[#333] rounded-lg overflow-hidden mb-6">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
                <div>
                  <div className="text-[#FDCE06] font-semibold text-[15px]">{companyName}</div>
                  <div className="text-[#9CA3AF] font-[Inter] text-xs mt-0.5">{group.email} &nbsp;·&nbsp; {group.items.length} item(s) assigned</div>
                </div>
                <span className={"text-xs px-3 py-1 rounded-full font-medium border " + (activeItems.length > 0 ? "bg-[#1a3a1a] text-[#4CAF50] border-[#2d5a2d]" : "bg-[#3a2e00] text-[#FDCE06] border-[#5a4800]")}>
                  {activeItems.length > 0 ? "Active" : "Pending"}
                </span>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[25%]">Equipment</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[10%]">ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[12%]">Start date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[18%]">Progress</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[15%]">Month 1 rate</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-[#9CA3AF] w-[20%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => {
                    const bp = parseFloat(item.custom_base_price || item.base_price || 0);
                    const months = parseInt(item.produce_quote_for || termMonths);
                    const isCompleted = item.hire_status === "completed";
                    const monthsIn = isCompleted && item.hire_end_date
                      ? Math.max(0, (new Date(item.hire_end_date).getFullYear() - new Date(item.hire_start_date).getFullYear()) * 12 + (new Date(item.hire_end_date).getMonth() - new Date(item.hire_start_date).getMonth()))
                      : monthsBetween(item.hire_start_date);
                    const clampedMonths = Math.min(monthsIn, months);
                    const progressPct = months > 0 ? Math.min(100, Math.round((clampedMonths / months) * 100)) : 0;
                    const isActive = item.hire_status === "active";
                    const isExpanded = expandedItem === item.assignment_id;
                    const month1Price = calcMonthlyPrice(bp, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, 1);

                    return (
                      <React.Fragment key={item.assignment_id}>
                        <tr className="border-b border-[#1a1a1a] last:border-0">
                          <td className="px-4 py-3 text-sm font-medium" style={{ color: isCompleted ? "#666" : isActive ? "#E5E5E5" : "#666" }}>{item.equipment_name}</td>
                          <td className="px-4 py-3 text-xs text-[#9CA3AF]">{item.equip_code}</td>
                          <td className="px-4 py-3 text-sm text-[#9CA3AF]">
                            {item.hire_start_date ? (
                              <span style={{ color: isCompleted ? "#666" : "#9CA3AF" }}>
                                {new Date(item.hire_start_date).toLocaleDateString("en-AU")}
                                {isCompleted && item.hire_end_date ? " → " + new Date(item.hire_end_date).toLocaleDateString("en-AU") : ""}
                              </span>
                            ) : <span className="text-[#666]">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {isCompleted ? (
                              <div>
                                <div className="text-[11px] text-[#666] mb-1">Completed · {clampedMonths} of {months} months</div>
                                <div className="bg-[#2A2A2A] rounded h-1.5 w-full">
                                  <div className="h-1.5 rounded bg-[#555]" style={{ width: progressPct + "%" }} />
                                </div>
                              </div>
                            ) : isActive ? (
                              <div>
                                <div className="text-[11px] text-[#9CA3AF] mb-1">{clampedMonths} of {months} months</div>
                                <div className="bg-[#2A2A2A] rounded h-1.5 w-full">
                                  <div className="h-1.5 rounded" style={{ width: progressPct + "%", background: progressPct >= 75 ? "#FDCE06" : "#4CAF50" }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#3a2e00] text-[#FDCE06] border border-[#5a4800]">Not started</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right" style={{ color: isCompleted ? "#666" : "#E5E5E5" }}>{fmt(month1Price)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              {isCompleted ? (
                                <>
                                  <button
                                    onClick={() => toggleExpand(item.assignment_id)}
                                    className="px-3 py-1.5 border border-[#4CAF50] rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#3d9e43] transition-colors"
                                  >
                                    {isExpanded ? "Hide" : "View schedule"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmAction({ type: "restart", assignmentId: item.assignment_id, equipmentName: item.equipment_name })}
                                    disabled={startingId === item.assignment_id}
                                    className="px-3 py-1.5 border border-[#FDCE06] rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] disabled:opacity-50 transition-colors"
                                  >
                                    {startingId === item.assignment_id ? "..." : "Restart Hire"}
                                  </button>
                                  <button
                                    onClick={() => { loadInvoices(item.assignment_id); setConfirmAction({ type: "delete", assignmentId: item.assignment_id, equipmentName: item.equipment_name }); }}
                                    disabled={startingId === item.assignment_id}
                                    className="px-3 py-1.5 border border-[#ef4444] rounded bg-[#ef4444] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#d63a3a] disabled:opacity-50 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : !isActive ? (
                                <button
                                  onClick={() => startHire(item.assignment_id)}
                                  disabled={startingId === item.assignment_id}
                                  className="px-3 py-1.5 border border-[#FDCE06] rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#E5B800] disabled:opacity-50 transition-colors"
                                >
                                  {startingId === item.assignment_id ? "Starting..." : "Start Hire"}
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => toggleExpand(item.assignment_id)}
                                    className="px-3 py-1.5 border border-[#4CAF50] rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#3d9e43] transition-colors"
                                  >
                                    {isExpanded ? "Hide" : "View schedule"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmAction({ type: "end", assignmentId: item.assignment_id, equipmentName: item.equipment_name })}
                                    disabled={startingId === item.assignment_id}
                                    className="px-3 py-1.5 border border-[#ef4444] rounded bg-[#ef4444] text-[#1F1F20] font-[Inter] font-bold text-[13px] hover:bg-[#d63a3a] disabled:opacity-50 transition-colors"
                                  >
                                    End Hire
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 pb-4 bg-[#181818]">
                              <div className="pt-3">
                                <div className="text-[#9CA3AF] text-xs mb-2 font-medium uppercase tracking-wide">Month-by-month schedule</div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr>
                                      <th className="text-left text-[#666] pb-1 w-32">Month</th>
                                      <th className="text-right text-[#666] pb-1">Monthly rate</th>
                                      <th className="text-right text-[#666] pb-1">Accumulative</th>
                                      <th className="text-right text-[#666] pb-1 w-28">Owing</th>
                                      <th className="text-right text-[#666] pb-1 w-44">Invoice</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: months }, (_, i) => {
                                      const m = i + 1;
                                      const price = calcMonthlyPrice(bp, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, m);
                                      const cumulative = Array.from({ length: m }, (_, j) =>
                                        calcMonthlyPrice(bp, item.discount, item.discount_type, item.compounding_discount, item.compounding_discount_type, j + 1)
                                      ).reduce((a, b) => a + b, 0);
                                      const inv = (invoices[item.assignment_id] || {})[m];
                                      const editKey = item.assignment_id + "-" + m;
                                      const owingValue = owingEdits[editKey] !== undefined ? owingEdits[editKey] : (inv ? inv.amount_owing : "");
                                      const isSaving = savingInvoice === editKey;
                                      return (
                                        <tr key={m}>
                                          <td className="py-1 text-[#9CA3AF] whitespace-nowrap">{monthLabel(item.hire_start_date, m)}</td>
                                          <td className="py-1 text-right text-[#E5E5E5]">{fmt(price)}</td>
                                          <td className="py-1 text-right text-[#E5E5E5]">{fmt(cumulative)}</td>
                                          <td className="py-1 text-right">
                                            {inv ? (
                                              parseFloat(inv.amount_owing) <= 0 ? (
                                                <span className="text-[#4CAF50] font-bold">$0.00</span>
                                              ) : (
                                                <input
                                                  type="number"
                                                  value={owingValue}
                                                  onChange={(e) => setOwingEdits({ ...owingEdits, [editKey]: e.target.value })}
                                                  className="w-24 bg-[#292A2B] border border-[#333] rounded px-2 py-0.5 text-right text-[#FDCE06] text-xs outline-none focus:border-[#FDCE06]"
                                                />
                                              )
                                            ) : (
                                              <span className="text-[#666]">—</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-right">
                                            {!inv ? (
                                              <button
                                                onClick={() => saveInvoice(item.assignment_id, m, price, price, "unpaid")}
                                                disabled={isSaving}
                                                className="px-2 py-0.5 border border-[#FDCE06] rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[11px] hover:bg-[#E5B800] disabled:opacity-50"
                                              >
                                                {isSaving ? "..." : "Log invoice"}
                                              </button>
                                            ) : parseFloat(inv.amount_owing) <= 0 ? (
                                              <span className="text-[#4CAF50] font-bold">Paid</span>
                                            ) : (
                                              <div className="flex gap-1 justify-end">
                                                <button
                                                  onClick={() => saveInvoice(item.assignment_id, m, inv.amount, parseFloat(owingValue || 0), parseFloat(owingValue || 0) <= 0 ? "paid" : "unpaid")}
                                                  disabled={isSaving}
                                                  className="px-2 py-0.5 border border-[#FDCE06] rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[11px] hover:bg-[#E5B800] disabled:opacity-50"
                                                >
                                                  {isSaving ? "..." : "Save"}
                                                </button>
                                                <button
                                                  onClick={() => saveInvoice(item.assignment_id, m, inv.amount, 0, "paid")}
                                                  disabled={isSaving}
                                                  className="px-2 py-0.5 border border-[#4CAF50] rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[11px] hover:bg-[#3d9e43] disabled:opacity-50"
                                                >
                                                  Paid
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
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
        })
      )}

      {/* Confirmation Modal */}
      {confirmAction && (() => {
        const invCount = Object.keys(invoices[confirmAction.assignmentId] || {}).length;
        const cfg = {
          end: {
            title: "End hire",
            body: "Invoicing for " + confirmAction.equipmentName + " will stop from today. The hire is marked completed and its schedule stays viewable.",
            note: null,
            label: "End hire",
            btn: "bg-[#ef4444] hover:bg-[#d63a3a] border-[#ef4444]",
          },
          restart: {
            title: "Restart hire",
            body: confirmAction.equipmentName + " will resume from its original start date and invoicing continues. Logged invoices and payments are kept.",
            note: null,
            label: "Restart hire",
            btn: "bg-[#FDCE06] hover:bg-[#E5B800] border-[#FDCE06]",
          },
          delete: {
            title: "Delete hire record",
            body: "This permanently removes the hire history for " + confirmAction.equipmentName + " and resets it to Not started. The equipment stays assigned to the client.",
            note: invCount > 0
              ? invCount + " logged invoice" + (invCount === 1 ? "" : "s") + " and all payment records will be deleted. This cannot be undone."
              : "This cannot be undone.",
            label: "Delete hire",
            btn: "bg-[#ef4444] hover:bg-[#d63a3a] border-[#ef4444]",
          },
        }[confirmAction.type];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-md">
              <div className="px-5 py-4 border-b border-[#333]">
                <h3 className="text-[#E5E5E5] font-[Inter] font-bold text-[18px]">{cfg.title}</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-[#9CA3AF] font-[Inter] text-sm leading-relaxed">{cfg.body}</p>
                {cfg.note && (
                  <div className="mt-3 px-3 py-2 rounded bg-[#2a1616] border border-[#5a2d2d]">
                    <p className="text-[#ef4444] font-[Inter] text-xs leading-relaxed">{cfg.note}</p>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-[#333] flex justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-1.5 border border-[#444] rounded text-[#E5E5E5] font-[Inter] font-bold text-[13px] hover:border-[#666] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={runConfirmedAction}
                  className={"px-4 py-1.5 border rounded text-[#1F1F20] font-[Inter] font-bold text-[13px] transition-colors " + cfg.btn}
                >
                  {cfg.label}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default HireManagement;
