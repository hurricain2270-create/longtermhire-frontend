// @ts-nocheck
import React, { useEffect, useState } from "react";
import Gauge from "./Gauge";
import api from "../services/api";
import { clientApi } from "../services/clientApi";
import { equipmentApi } from "../services/equipmentApi";

const pctOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);


const DashboardGauges = () => {
  const [g, setG] = useState({});

  useEffect(() => {
    // Each figure comes from an endpoint that already exists, so nothing new
    // had to be built for these. One failing doesn't stop the others.
    (async () => {
      try {
        const [fleet, eq] = await Promise.all([
          api.get("/v1/api/longtermhire/super_admin/fleet-report"),
          equipmentApi.getEquipment(1, 200, {}),
        ]);
        const hires = fleet?.data?.data?.hires || [];
        const out = new Set(
          hires.filter((h) => h.hire_status === "active").map((h) => String(h.equipment_id))
        );
        const total = (eq?.data || []).length;
        setG((s) => ({
          ...s,
          fleet: { pct: pctOf(out.size, total), value: pctOf(out.size, total) + "%",
                   caption: out.size + " of " + total + " out" },
        }));
      } catch (e) {
        console.error("Fleet gauge:", e);
      }

      try {
        const res = await api.get("/v1/api/longtermhire/super_admin/faults");
        const open = res?.data?.open_count || 0;
        const waiting = res?.data?.unanswered_count || 0;
        // Answered means we replied last. Nothing open reads as fully on top.
        // Nothing open is not a score. Showing 100% green makes an empty system
    // look like a well-run one.
    const pct = open > 0 ? pctOf(open - waiting, open) : 0;
        setG((s) => ({
          ...s,
          faults: { pct, value: pct + "%",
                    caption: open ? open + " open, " + waiting + " waiting" : "none open" },
        }));
      } catch (e) {
        console.error("Faults gauge:", e);
      }

      try {
        const res = await clientApi.getClients(1, 200, {});
        const rows = res?.data || [];
        const ready = rows.filter(
          (c) =>
            Number(c.has_terms) > 0 &&
            Number(c.equipment_count) > 0 &&
            (!!c.pricing_package_id || Number(c.has_custom_discounts) > 0) &&
            Number(c.has_welcome) > 0
        ).length;
              // With no clients at all this was 0% beside "all set up", which
      // contradicts itself.
      const pct = rows.length > 0 ? pctOf(ready, rows.length) : 0;
      setG((s) => ({ ...s, clients: { pct, value: rows.length > 0 ? pct + "%" : "—",
        caption: rows.length === 0
          ? "no clients yet"
          : rows.length - ready ? rows.length - ready + " incomplete" : "all set up" },
      }));
      } catch (e) {
        console.error("Clients gauge:", e);
      }

    })();
  }, []);

  const dials = [
    { key: "fleet", label: "Listed and out" },
    { key: "faults", label: "Fault response" },
    { key: "clients", label: "Clients ready" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      {dials.map((d) => {
        const v = g[d.key];
        return (
          <div key={d.key} className="bg-[#1F1F20] border border-[#333333] rounded-xl p-4">
            <Gauge
              pct={v ? v.pct : 0}
              value={v ? v.value : "—"}
              caption={v ? v.caption : ""}
              label={d.label}
              width={280}
              height={185}
              valueSize={19}
              captionSize={9}
              ariaLabel={v ? d.label + " " + v.pct + " percent, " + v.caption : d.label}
            />
          </div>
        );
      })}
    </div>
  );
};

export default DashboardGauges;
