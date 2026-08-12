// @ts-nocheck
import React, { useEffect, useState } from "react";
import api from "./services/api";

// Every client, every machine they can see, and what they pay for it.
//
// Meant for printing and throwing away - nothing is saved. It answers the
// question you cannot answer from any single screen: what is the same excavator
// earning from different companies, and who is actually paying list.
//
// Print styles strip the dark background, because printing a black page wastes
// a cartridge and reads worse on paper.

const money = (n) =>
  n === null || n === undefined || n === "" || isNaN(Number(n))
    ? "—"
    : "$" + Number(n).toLocaleString("en-AU");

const RateSheet = ({ open, onClose }) => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setError(false);
    (async () => {
      try {
        const res = await api.get("/v1/api/longtermhire/super_admin/rate-sheet");
        if (res?.data?.error) throw new Error();
        setRows(res.data.data || []);
      } catch (e) {
        setError(true);
      }
    })();
  }, [open]);

  if (!open) return null;

  // Group by company, because that is how you read it.
  const byCompany = {};
  (rows || []).forEach((r) => {
    const key = r.company_name || r.client_name || "Unnamed";
    (byCompany[key] = byCompany[key] || []).push(r);
  });
  const companies = Object.keys(byCompany).sort();

  const rateOf = (r) =>
    r.custom_base_price !== null && r.custom_base_price !== "" &&
    Number(r.custom_base_price) > 0
      ? Number(r.custom_base_price)
      : Number(r.list_price) || 0;

  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto print:bg-white print:static print:overflow-visible">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #rate-sheet, #rate-sheet * { visibility: visible; }
          #rate-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          #rate-sheet { background: #fff !important; color: #111 !important; }
          #rate-sheet * { color: #111 !important; border-color: #ccc !important; }
          #rate-sheet .band { color: #444 !important; }
          #rate-sheet tr { page-break-inside: avoid; }
          #rate-sheet .company { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-[900px] mx-auto my-8 print:my-0 print:max-w-none">
        <div className="flex justify-between items-center gap-3 mb-3 no-print">
          <p className="text-[#E5E5E5] font-[Inter] text-[15px]">
            Print this and throw it away — nothing is saved.
          </p>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[14px] px-4 py-2 rounded-lg">
              Print
            </button>
            <button onClick={onClose}
              className="border border-[#333] text-[#9CA3AF] font-[Inter] text-[14px] px-4 py-2 rounded-lg">
              Close
            </button>
          </div>
        </div>

        <div id="rate-sheet" className="bg-[#1F1F20] border border-[#333] rounded-xl p-7 print:border-0 print:rounded-none print:p-0">
          <div className="flex justify-between items-baseline border-b border-[#333] pb-4 mb-5">
            <div>
              <p className="text-[#E5E5E5] font-[Inter] text-[22px] font-semibold">
                Rates by client
              </p>
              <p className="text-[#9CA3AF] font-[Inter] text-[13px] mt-1">
                What each company can see and what they pay for it
              </p>
            </div>
            <p className="text-[#9CA3AF] font-[Inter] text-[12px]">{today}</p>
          </div>

          {error ? (
            <p className="text-[#ef4444] font-[Inter] text-[14px]">
              Could not load that. Close and try again.
            </p>
          ) : rows === null ? (
            <p className="text-[#9CA3AF] font-[Inter] text-[14px]">Working it out…</p>
          ) : companies.length === 0 ? (
            <p className="text-[#9CA3AF] font-[Inter] text-[14px]">
              No equipment is assigned to anybody yet.
            </p>
          ) : (
            companies.map((name) => {
              const list = byCompany[name];
              const out = list.filter((r) => r.hire_status === "active").length;
              return (
                <div key={name} className="company mb-7">
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-[#E5E5E5] font-[Inter] text-[16px] font-semibold">
                      {name}
                    </p>
                    <p className="band text-[#9CA3AF] font-[Inter] text-[12px]">
                      {list.length} {list.length === 1 ? "machine" : "machines"} visible
                      {out > 0 ? " · " + out + " on hire" : ""}
                    </p>
                  </div>

                  <table className="w-full border-collapse table-fixed">
                    <colgroup>
                      <col className="w-[13%]" />
                      <col className="w-[34%]" />
                      <col className="w-[13%]" />
                      <col className="w-[15%]" />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-[#333]">
                        {["Plant", "Machine", "List", "They pay", "Discount", "Status"].map((h) => (
                          <th key={h}
                            className={
                              "band text-[#9CA3AF] font-[Inter] text-[11px] uppercase tracking-[0.05em] font-normal py-1.5 " +
                              (h === "List" || h === "They pay" ? "text-right pr-3" : "text-left")
                            }>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r, i) => {
                        const theirs = rateOf(r);
                        const custom =
                          r.custom_base_price !== null && r.custom_base_price !== "" &&
                          Number(r.custom_base_price) > 0;
                        const onHire = r.hire_status === "active";
                        return (
                          <tr key={i} className="border-b border-[#2a2a2a]">
                            <td className="py-2 font-mono text-[12px] text-[#9CA3AF]">
                              {r.plant_code}
                              {r.owner_partner_id ? " (P)" : ""}
                            </td>
                            <td className="py-2 text-[#E5E5E5] font-[Inter] text-[13px] truncate pr-2"
                              title={r.equipment_name}>
                              {r.equipment_name}
                            </td>
                            <td className="py-2 text-[#9CA3AF] font-[Inter] text-[13px] text-right pr-3">
                              {money(r.list_price)}
                            </td>
                            <td className={
                              "py-2 font-[Inter] text-[13px] font-semibold text-right pr-3 " +
                              (custom ? "text-[#FDCE06]" : "text-[#E5E5E5]")
                            }>
                              {money(theirs)}
                              {custom ? " *" : ""}
                            </td>
                            <td className="py-2 text-[#9CA3AF] font-[Inter] text-[13px]">
                              {Number(r.compounding_discount) > 0
                                ? r.compounding_discount + "% a month"
                                : Number(r.discount) > 0
                                ? r.discount + (r.discount_type === "$" ? " off" : "%")
                                : "—"}
                            </td>
                            <td className={
                              "py-2 font-[Inter] text-[13px] " +
                              (onHire ? "text-[#4CAF50]" : "text-[#6B7280]")
                            }>
                              {onHire ? "On hire" : "Can see it"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}

          {rows && rows.length > 0 ? (
            <p className="band text-[#6B7280] font-[Inter] text-[11.5px] border-t border-[#333] pt-3 mt-2 leading-relaxed">
              * a rate set for that client rather than the list price.
              (P) marks a machine we do not own.
              "Can see it" means the machine is in their catalogue but not on hire.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RateSheet;
