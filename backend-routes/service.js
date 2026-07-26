const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");

module.exports = function (app) {
  const sdkFor = () => {
    const sdk = app.get("sdk");
    sdk.setProjectId("longtermhire");
    return sdk;
  };

  // A member sees their company owner's equipment; an owner sees their own
  async function resolveClientUserId(sdk, userId) {
    const rows = await sdk.rawQuery(
      "SELECT c.owner_user_id FROM longtermhire_company_member m " +
      "JOIN longtermhire_company c ON c.id = m.company_id " +
      "WHERE m.user_id = ? LIMIT 1",
      [userId]
    );
    if (rows && rows.length && rows[0].owner_user_id) return rows[0].owner_user_id;
    return userId;
  }

  // Everything on this client's site, with what's needed for a service countdown
  app.get("/v1/api/longtermhire/client/my-site", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const ownerId = await resolveClientUserId(sdk, req.user_id);

      const equipment = await sdk.rawQuery(
        "SELECT ce.id AS assignment_id, ce.hire_start_date, ce.hire_end_date, ce.hire_status, " +
        "e.id AS equipment_id, e.equipment_id AS plant_code, e.equipment_name, e.model, e.year_made, " +
        "e.fuel_type, e.service_interval_hours, e.service_interval_months, e.last_service_hours, " +
        "e.last_service_date, e.current_hours, e.current_hours_at " +
        "FROM longtermhire_client_equipment ce " +
        "JOIN longtermhire_equipment_item e ON e.id = ce.equipment_id " +
        "WHERE ce.client_user_id = ? AND ce.hire_status = ? " +
        "ORDER BY e.equipment_name",
        [ownerId, "active"]
      );

      const faults = await sdk.rawQuery(
        "SELECT f.id, f.equipment_id, f.title, f.severity, f.status, f.reported_at, f.resolved_at " +
        "FROM longtermhire_fault f WHERE f.client_user_id = ? AND f.status <> ? " +
        "ORDER BY f.reported_at DESC",
        [ownerId, "resolved"]
      );

      return res.status(200).json({ error: false, data: { equipment: equipment, open_faults: faults } });
    } catch (e) {
      console.error("My site error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  // Log a meter reading — keeps the history and updates the machine's latest
  app.post("/v1/api/longtermhire/client/log-hours", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const { equipment_id, hours, notes } = req.body;
      if (!equipment_id || hours === undefined || hours === null || hours === "") {
        return res.status(400).json({ error: true, message: "equipment_id and hours are required" });
      }
      const reading = parseFloat(hours);
      if (isNaN(reading) || reading < 0) {
        return res.status(400).json({ error: true, message: "Hours must be a positive number" });
      }

      const ownerId = await resolveClientUserId(sdk, req.user_id);
      const allowed = await sdk.rawQuery(
        "SELECT 1 FROM longtermhire_client_equipment WHERE client_user_id = ? AND equipment_id = ? LIMIT 1",
        [ownerId, equipment_id]
      );
      if (!allowed || allowed.length === 0) {
        return res.status(403).json({ error: true, message: "That machine is not on your site" });
      }

      const prev = await sdk.rawQuery(
        "SELECT current_hours FROM longtermhire_equipment_item WHERE id = ? LIMIT 1",
        [equipment_id]
      );
      const previous = prev && prev.length ? parseFloat(prev[0].current_hours || 0) : 0;
      if (previous && reading < previous) {
        return res.status(400).json({
          error: true,
          message: "That reading is lower than the last one recorded (" + previous + "). Check the meter."
        });
      }

      const who = await sdk.rawQuery(
        "SELECT COALESCE(m.member_name, c.client_name, u.email) AS name " +
        "FROM longtermhire_user u " +
        "LEFT JOIN longtermhire_company_member m ON m.user_id = u.id " +
        "LEFT JOIN longtermhire_client c ON c.user_id = u.id " +
        "WHERE u.id = ? LIMIT 1",
        [req.user_id]
      );
      const name = who && who.length ? who[0].name : null;
      const today = new Date().toISOString().slice(0, 10);

      await sdk.rawQuery(
        "INSERT INTO longtermhire_hours_log (equipment_id, hours, read_on, logged_by, logged_by_name, notes) VALUES (?, ?, ?, ?, ?, ?)",
        [equipment_id, reading, today, req.user_id, name, notes || null]
      );
      await sdk.rawQuery(
        "UPDATE longtermhire_equipment_item SET current_hours = ?, current_hours_at = ? WHERE id = ?",
        [reading, today, equipment_id]
      );

      return res.status(200).json({
        error: false, message: "Hours logged",
        data: { hours: reading, read_on: today, logged_by: name }
      });
    } catch (e) {
      console.error("Log hours error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  // Reading history for one machine
  app.get("/v1/api/longtermhire/client/hours/:equipmentId", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const ownerId = await resolveClientUserId(sdk, req.user_id);
      const allowed = await sdk.rawQuery(
        "SELECT 1 FROM longtermhire_client_equipment WHERE client_user_id = ? AND equipment_id = ? LIMIT 1",
        [ownerId, req.params.equipmentId]
      );
      if (!allowed || allowed.length === 0) {
        return res.status(403).json({ error: true, message: "That machine is not on your site" });
      }
      const rows = await sdk.rawQuery(
        "SELECT hours, read_on, logged_by_name, notes FROM longtermhire_hours_log " +
        "WHERE equipment_id = ? ORDER BY read_on DESC, id DESC LIMIT 40",
        [req.params.equipmentId]
      );
      return res.status(200).json({ error: false, data: rows });
    } catch (e) {
      console.error("Hours history error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });
};
