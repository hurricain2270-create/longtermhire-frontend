// @ts-nocheck
import React, { useEffect, useState } from "react";
import Gauge from "./Gauge";
import api from "../services/api";
import { clientApi } from "../services/clientApi";
import { equipmentApi } from "../services/equipmentApi";
import { contentApi } from "../services/contentApi";

const pctOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const specCount = (raw) => {
  if (!raw) return 0;
  if (Array.isArray(raw)) return raw.length;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.length : p ? 1 : 0;
  } catch (e) {
    return String(raw).trim() ? 1 : 0;
  }
};

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
        const pct = open > 0 ? pctOf(open - waiting, open) : 100;
        setG((s) => ({
          ...s,
          faults: { pct, value: pct + "%",
                    caption: open ? open + " open, " + waiting + " waiting" : "none open" },
        }));
      } catch (e) {
        console.error("Faults gauge:", e);
      }

      try {
        const res = await api.get("/v1/api/longtermhire/super_admin/maintenance");
        const rows = res?.data?.data || [];
        const scheduled = rows.filter(
          (r) => Number(r.service_interval_hours) > 0 || Number(r.service_interval_months) > 0
        );
        const overdue = scheduled.filter((r) => {
          const ih = Number(r.service_interval_hours) || 0;
          const cur = Number(r.current_hours);
          const lastH = Number(r.last_service_hours) || 0;
          if (ih > 0 && !isNaN(cur) && cur - lastH > ih) return true;
          const im = Number(r.service_interval_months) || 0;
          if (im > 0 && r.last_service_date) {
            const d = new Date(r.last_service_date);
            if (!isNaN(d.getTime())) {
              const months =
                (new Date().getFullYear() - d.getFullYear()) * 12 +
                (new Date().getMonth() - d.getMonth());
              if (months > im) return true;
            }
          }
          return false;
        }).length;
        const pct = scheduled.length ? pctOf(scheduled.length - overdue, scheduled.length) : 100;
        setG((s) => ({
          ...s,
          service: { pct, value: pct + "%",
                     caption: overdue ? overdue + " overdue" : "all on schedule" },
        }));
      } catch (e) {
        console.error("Servicing gauge:", e);
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
        const pct = pctOf(ready, rows.length);
        setG((s) => ({
          ...s,
          clients: { pct, value: pct + "%",
                     caption: rows.length - ready
                       ? rows.length - ready + " incomplete"
                       : "all set up" },
        }));
      } catch (e) {
        console.error("Clients gauge:", e);
      }

      try {
        const [content, eq] = await Promise.all([
          contentApi.getContent(1, 200, {}),
          equipmentApi.getEquipment(1, 200, {}),
        ]);
        const rows = content?.data || [];
        const machines = (eq?.data || []).length;
        const complete = rows.filter((it) => {
          const hasDesc = String(it.description || "").trim().length > 0;
          const hasImg =
            (Array.isArray(it.images) && it.images.length > 0) || !!it.image_url;
          return hasDesc && hasImg && specCount(it.specs_files) > 0;
        }).length;
        const pct = pctOf(complete, machines);
        setG((s) => ({
          ...s,
          listings: { pct, value: pct + "%",
                      caption: machines - complete
                        ? machines - complete + " need work"
                        : "all complete" },
        }));
      } catch (e) {
        console.error("Listings gauge:", e);
      }
    })();
  }, []);

  const dials = [
    { key: "fleet", label: "Fleet on hire" },
    { key: "faults", label: "Fault response" },
    { key: "service", label: "Servicing" },
    { key: "clients", label: "Clients ready" },
    { key: "listings", label: "Listings" },
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
