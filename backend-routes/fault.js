const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");

module.exports = function (app) {
  const sdkFor = () => {
    const sdk = app.get("sdk");
    sdk.setProjectId("longtermhire");
    return sdk;
  };

  // Fix windows in hours. Emergency measures response, the rest measure time to fix.
  const BANDS = {
    emergency: { hours: 24, kind: "response" },
    major: { hours: 168, kind: "fix" },
    mechanical: { hours: 72, kind: "fix" },
    minor: { hours: 48, kind: "fix" },
  };

  // What the supervisor picked maps to a starting band
  const FROM_REPORT = {
    emergency: "emergency",
    stopped: "major",
    degraded: "mechanical",
    attention: "minor",
  };

  async function ownerFor(sdk, userId) {
    const rows = await sdk.rawQuery(
      "SELECT c.owner_user_id FROM longtermhire_company_member m " +
      "JOIN longtermhire_company c ON c.id = m.company_id WHERE m.user_id = ? LIMIT 1",
      [userId]
    );
    return rows && rows.length && rows[0].owner_user_id ? rows[0].owner_user_id : userId;
  }

  async function nameFor(sdk, userId) {
    const rows = await sdk.rawQuery(
      "SELECT COALESCE(m.member_name, c.client_name, u.email) AS name FROM longtermhire_user u " +
      "LEFT JOIN longtermhire_company_member m ON m.user_id = u.id " +
      "LEFT JOIN longtermhire_client c ON c.user_id = u.id WHERE u.id = ? LIMIT 1",
      [userId]
    );
    return rows && rows.length ? rows[0].name : null;
  }

  async function nextFaultNo(sdk) {
    const y = new Date().getFullYear();
    const rows = await sdk.rawQuery(
      "SELECT fault_no FROM longtermhire_fault WHERE fault_no LIKE ? ORDER BY id DESC LIMIT 1",
      [y + "-F-%"]
    );
    let n = 1;
    if (rows && rows.length) {
      const last = parseInt(String(rows[0].fault_no).split("-").pop());
      if (!isNaN(last)) n = last + 1;
    }
    return y + "-F-" + String(n).padStart(3, "0");
  }

  const LIST_SQL =
    "SELECT f.*, e.equipment_id AS plant_code, e.equipment_name, c.company_name " +
    "FROM longtermhire_fault f " +
    "LEFT JOIN longtermhire_equipment_item e ON e.id = f.equipment_id " +
    "LEFT JOIN longtermhire_client c ON c.user_id = f.client_user_id ";

  async function thread(sdk, faultId) {
    return sdk.rawQuery(
      "SELECT id, author_name, author_side, event_type, message, attachments, created_at " +
      "FROM longtermhire_fault_update WHERE fault_id = ? ORDER BY id",
      [faultId]
    );
  }

  async function addEntry(sdk, faultId, userId, name, side, type, message) {
    await sdk.rawQuery(
      "INSERT INTO longtermhire_fault_update (fault_id, user_id, author_name, author_side, event_type, message) " +
      "VALUES (?, ?, ?, ?, ?, ?)",
      [faultId, userId || null, name || null, side, type, message || null]
    );
  }

  // ---------------- client ----------------

  app.post("/v1/api/longtermhire/client/faults", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const { equipment_id, reported_severity, title, message } = req.body;
      if (!equipment_id || !title) {
        return res.status(400).json({ error: true, message: "equipment_id and a description are required" });
      }
      const owner = await ownerFor(sdk, req.user_id);
      const allowed = await sdk.rawQuery(
        "SELECT 1 FROM longtermhire_client_equipment WHERE client_user_id = ? AND equipment_id = ? LIMIT 1",
        [owner, equipment_id]
      );
      if (!allowed || allowed.length === 0) {
        return res.status(403).json({ error: true, message: "That machine is not on your site" });
      }

      const name = await nameFor(sdk, req.user_id);
      const faultNo = await nextFaultNo(sdk);
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const pick = FROM_REPORT[reported_severity] ? reported_severity : "degraded";

      const result = await sdk.rawQuery(
        "INSERT INTO longtermhire_fault (fault_no, equipment_id, client_user_id, reported_by, reported_by_name, " +
        "reported_severity, title, status, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [faultNo, equipment_id, owner, req.user_id, name, pick, title, "reported", now]
      );
      await addEntry(sdk, result.insertId, req.user_id, name, "client", "reported", message || title);

      return res.status(201).json({ error: false, message: "Reported", data: { id: result.insertId, fault_no: faultNo } });
    } catch (e) {
      console.error("Report fault error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.get("/v1/api/longtermhire/client/faults", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const owner = await ownerFor(sdk, req.user_id);
      const rows = await sdk.rawQuery(LIST_SQL + "WHERE f.client_user_id = ? ORDER BY f.id DESC", [owner]);
      return res.status(200).json({ error: false, data: rows.map((r) => ({ ...r, band: r.severity ? BANDS[r.severity] : null })) });
    } catch (e) {
      console.error("Client faults error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.get("/v1/api/longtermhire/client/faults/:id", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const owner = await ownerFor(sdk, req.user_id);
      const rows = await sdk.rawQuery(LIST_SQL + "WHERE f.id = ? AND f.client_user_id = ? LIMIT 1", [req.params.id, owner]);
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      const f = rows[0];
      return res.status(200).json({
        error: false,
        data: { fault: { ...f, band: f.severity ? BANDS[f.severity] : null }, updates: await thread(sdk, f.id) },
      });
    } catch (e) {
      console.error("Client fault error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.post("/v1/api/longtermhire/client/faults/:id/reply", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const owner = await ownerFor(sdk, req.user_id);
      const rows = await sdk.rawQuery("SELECT id FROM longtermhire_fault WHERE id = ? AND client_user_id = ? LIMIT 1", [req.params.id, owner]);
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      if (!req.body.message) return res.status(400).json({ error: true, message: "Message required" });
      const name = await nameFor(sdk, req.user_id);
      await addEntry(sdk, req.params.id, req.user_id, name, "client", "message", req.body.message);
      return res.status(200).json({ error: false, message: "Sent" });
    } catch (e) {
      console.error("Client reply error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  // ---------------- admin ----------------

  app.get("/v1/api/longtermhire/super_admin/faults", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const rows = await sdk.rawQuery(LIST_SQL + "ORDER BY (f.status = 'resolved'), f.id DESC", []);
      const open = rows.filter((r) => r.status !== "resolved").length;
      return res.status(200).json({
        error: false,
        data: rows.map((r) => ({ ...r, band: r.severity ? BANDS[r.severity] : null })),
        open_count: open,
      });
    } catch (e) {
      console.error("Faults list error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  // Opening a fault is the acknowledgement — no button to forget
  app.get("/v1/api/longtermhire/super_admin/faults/:id", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const rows = await sdk.rawQuery(LIST_SQL + "WHERE f.id = ? LIMIT 1", [req.params.id]);
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      let f = rows[0];

      if (!f.acknowledged_at) {
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        await sdk.rawQuery("UPDATE longtermhire_fault SET acknowledged_at = ?, status = ? WHERE id = ?",
          [now, "acknowledged", f.id]);
        await addEntry(sdk, f.id, req.user_id, "Long Term Hire", "admin", "acknowledged", null);
        f.acknowledged_at = now;
        f.status = "acknowledged";
      }

      return res.status(200).json({
        error: false,
        data: { fault: { ...f, band: f.severity ? BANDS[f.severity] : null }, updates: await thread(sdk, f.id) },
      });
    } catch (e) {
      console.error("Fault fetch error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.post("/v1/api/longtermhire/super_admin/faults/:id/reply", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      if (!req.body.message) return res.status(400).json({ error: true, message: "Message required" });
      await addEntry(sdk, req.params.id, req.user_id, "Long Term Hire", "admin", "message", req.body.message);
      return res.status(200).json({ error: false, message: "Sent" });
    } catch (e) {
      console.error("Admin reply error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  // Diagnose — this is what reveals the bar to the client
  app.put("/v1/api/longtermhire/super_admin/faults/:id/classify", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const band = req.body.severity;
      if (!BANDS[band]) return res.status(400).json({ error: true, message: "Unknown band" });
      await sdk.rawQuery("UPDATE longtermhire_fault SET severity = ?, window_hours = ?, cause = ? WHERE id = ?",
        [band, BANDS[band].hours, req.body.cause || null, req.params.id]);
      await addEntry(sdk, req.params.id, req.user_id, "Long Term Hire", "admin", "classified",
        req.body.note || ("Classified as " + band));
      return res.status(200).json({ error: false, message: "Classified", data: BANDS[band] });
    } catch (e) {
      console.error("Classify error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  // actioned | attended | resolved
  app.post("/v1/api/longtermhire/super_admin/faults/:id/stage", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const stage = req.body.stage;
      const COL = { actioned: "actioned_at", attended: "attended_at", resolved: "resolved_at" };
      if (!COL[stage]) return res.status(400).json({ error: true, message: "Unknown stage" });

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const sets = [COL[stage] + " = ?", "status = ?"];
      const vals = [now, stage];

      if (stage === "resolved" && req.body.hours) {
        sets.push("hours_at_resolution = ?");
        vals.push(parseFloat(req.body.hours));
      }
      vals.push(req.params.id);
      await sdk.rawQuery("UPDATE longtermhire_fault SET " + sets.join(", ") + " WHERE id = ?", vals);
      await addEntry(sdk, req.params.id, req.user_id, "Long Term Hire", "admin", stage, req.body.message || null);

      if (stage === "resolved" && req.body.hours) {
        const f = await sdk.rawQuery("SELECT equipment_id FROM longtermhire_fault WHERE id = ? LIMIT 1", [req.params.id]);
        if (f && f.length) {
          const today = now.slice(0, 10);
          await sdk.rawQuery(
            "INSERT INTO longtermhire_hours_log (equipment_id, hours, read_on, logged_by, logged_by_name, notes) VALUES (?, ?, ?, ?, ?, ?)",
            [f[0].equipment_id, parseFloat(req.body.hours), today, req.user_id, "Long Term Hire", "Read at fault handback"]
          );
          await sdk.rawQuery("UPDATE longtermhire_equipment_item SET current_hours = ?, current_hours_at = ? WHERE id = ?",
            [parseFloat(req.body.hours), today, f[0].equipment_id]);
        }
      }

      return res.status(200).json({ error: false, message: "Updated" });
    } catch (e) {
      console.error("Stage error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });
};
