const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");

module.exports = function (app) {
  const sdkFor = () => {
    const sdk = app.get("sdk");
    sdk.setProjectId("longtermhire");
    return sdk;
  };

  // 2026-BLA-001 — same shape as quote numbers
  async function nextContractNo(sdk, companyName) {
    const year = new Date().getFullYear();
    const prefix = (companyName || "GEN").replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
    const rows = await sdk.rawQuery(
      "SELECT contract_no FROM longtermhire_contract WHERE contract_no LIKE ? ORDER BY id DESC LIMIT 1",
      [year + "-" + prefix + "-%"]
    );
    let next = 1;
    if (rows && rows.length > 0) {
      const parts = String(rows[0].contract_no).split("-");
      const last = parseInt(parts[parts.length - 1]);
      if (!isNaN(last)) next = last >= 999 ? 1 : last + 1;
    }
    return year + "-" + prefix + "-" + String(next).padStart(3, "0");
  }

  const FIELDS = [
    "agreement_date", "signed_date", "delivery_date", "hire_start_date", "hire_end_date",
    "site_address", "delivery_cost", "pickup_cost", "standard_hire_rate",
    "discount", "discount_type", "minimum_hire_months", "hours_at_signing",
    "damage_waiver_accepted", "damage_waiver_excess",
    "maintenance_levy", "environmental_levy", "damage_waiver_rate",
    "notes", "attachment_equipment_id", "status"
  ];

  const LIST_SQL =
    "SELECT ct.*, c.client_name, c.company_name, c.abn, c.contact_position, u.email, " +
    "e.equipment_name, e.equipment_id AS plant_code, e.model, e.year_made, e.fuel_type " +
    "FROM longtermhire_contract ct " +
    "LEFT JOIN longtermhire_client c ON c.user_id = ct.client_user_id " +
    "LEFT JOIN longtermhire_user u ON u.id = ct.client_user_id " +
    "LEFT JOIN longtermhire_equipment_item e ON e.id = ct.equipment_id ";

  app.get("/v1/api/longtermhire/super_admin/contracts", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const rows = await sdk.rawQuery(LIST_SQL + "ORDER BY ct.id DESC", []);
      return res.status(200).json({ error: false, data: rows });
    } catch (e) {
      console.error("Contracts list error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.get("/v1/api/longtermhire/super_admin/contracts/:id", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const rows = await sdk.rawQuery(LIST_SQL + "WHERE ct.id = ? LIMIT 1", [req.params.id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: true, message: "Contract not found" });
      return res.status(200).json({ error: false, data: rows[0] });
    } catch (e) {
      console.error("Contract fetch error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.post("/v1/api/longtermhire/super_admin/contracts", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const { client_user_id, equipment_id } = req.body;
      if (!client_user_id || !equipment_id) {
        return res.status(400).json({ error: true, message: "client_user_id and equipment_id are required" });
      }

      const cRows = await sdk.rawQuery(
        "SELECT company_name FROM longtermhire_client WHERE user_id = ? LIMIT 1", [client_user_id]
      );
      const companyName = cRows && cRows.length ? cRows[0].company_name : "GEN";
      const contractNo = await nextContractNo(sdk, companyName);

      const cols = ["contract_no", "client_user_id", "equipment_id", "created_by"];
      const vals = [contractNo, client_user_id, equipment_id, req.user_id || null];
      FIELDS.forEach((f) => {
        if (req.body[f] !== undefined && req.body[f] !== "") { cols.push(f); vals.push(req.body[f]); }
      });

      const sql = "INSERT INTO longtermhire_contract (" + cols.join(", ") + ") VALUES (" +
                  cols.map(() => "?").join(", ") + ")";
      const result = await sdk.rawQuery(sql, vals);

      return res.status(201).json({
        error: false, message: "Contract created",
        data: { id: result.insertId, contract_no: contractNo }
      });
    } catch (e) {
      console.error("Contract create error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.put("/v1/api/longtermhire/super_admin/contracts/:id", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const sets = [], vals = [];
      FIELDS.concat(["equipment_id"]).forEach((f) => {
        if (req.body[f] !== undefined) { sets.push(f + " = ?"); vals.push(req.body[f] === "" ? null : req.body[f]); }
      });
      if (sets.length === 0) return res.status(400).json({ error: true, message: "Nothing to update" });
      vals.push(req.params.id);
      await sdk.rawQuery("UPDATE longtermhire_contract SET " + sets.join(", ") + " WHERE id = ?", vals);
      return res.status(200).json({ error: false, message: "Contract updated" });
    } catch (e) {
      console.error("Contract update error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.delete("/v1/api/longtermhire/super_admin/contracts/:id", TokenMiddleware(), RoleMiddleware(["super_admin"]), async (req, res) => {
    try {
      const sdk = sdkFor();
      const rows = await sdk.rawQuery("SELECT status FROM longtermhire_contract WHERE id = ? LIMIT 1", [req.params.id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: true, message: "Contract not found" });
      if (rows[0].status !== "draft") {
        return res.status(400).json({ error: true, message: "Only draft contracts can be deleted" });
      }
      await sdk.rawQuery("DELETE FROM longtermhire_contract WHERE id = ?", [req.params.id]);
      return res.status(200).json({ error: false, message: "Contract deleted" });
    } catch (e) {
      console.error("Contract delete error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });
};
