const TokenMiddleware = require("../../../baas/middleware/TokenMiddleware");
const RoleMiddleware = require("../middleware/RoleMiddleware");
const UploadService = require("../../../baas/services/UploadService");
const { getLocalPath } = require("../../../baas/services/UtilService");

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

  async function addEntry(sdk, faultId, userId, name, side, type, message, attachments) {
    const photos = Array.isArray(attachments) && attachments.length
      ? JSON.stringify(attachments) : null;
    await sdk.rawQuery(
      "INSERT INTO longtermhire_fault_update (fault_id, user_id, author_name, author_side, event_type, message, attachments) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?)",
      [faultId, userId || null, name || null, side, type, message || null, photos]
    );
  }

  // Photo upload for faults — same S3 path chat already uses
  app.post("/v1/api/longtermhire/client/fault-upload", TokenMiddleware(), function (req, res) {
    const config = app.get("configuration");
    const uploadMiddleware = config.upload_type === "s3"
      ? UploadService.s3_upload().single("file")
      : UploadService.local_upload().single("file");

    uploadMiddleware(req, res, function (err) {
      if (err) {
        console.error("Fault photo upload error:", err);
        return res.status(500).json({ error: true, message: "Upload failed: " + err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: true, message: "No file uploaded" });
      }
      const fileUrl = config.upload_type === "s3" ? req.file.location : getLocalPath(req.file.path);
      return res.status(200).json({
        error: false,
        data: { url: fileUrl, name: req.file.originalname, type: req.file.mimetype },
      });
    });
  });

  // ---------------- client ----------------

  app.post("/v1/api/longtermhire/client/faults", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const { equipment_id, reported_severity, title, message, attachments } = req.body;
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
      const photos = Array.isArray(attachments) && attachments.length
        ? JSON.stringify(attachments) : null;
      await sdk.rawQuery(
        "INSERT INTO longtermhire_fault_update (fault_id, user_id, author_name, author_side, event_type, message, attachments) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [result.insertId, req.user_id, name, "client", "reported", message || title, photos]
      );

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
      // resolved faults leave the supervisor's view entirely — they stay on the admin side
      // Once a fault is closed off it clears from every client screen — owner,
      // engineer and supervisor alike. The page is about what still needs doing.
      const rows = await sdk.rawQuery(
        LIST_SQL + "WHERE f.client_user_id = ? AND f.status <> ? ORDER BY f.id DESC",
        [owner, "resolved"]
      );
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
      const rows = await sdk.rawQuery(
        LIST_SQL + "WHERE f.id = ? AND f.client_user_id = ? AND f.status <> ? LIMIT 1",
        [req.params.id, owner, "resolved"]
      );
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
      const hasPhotos = Array.isArray(req.body.attachments) && req.body.attachments.length > 0;
      if (!req.body.message && !hasPhotos) {
        return res.status(400).json({ error: true, message: "Add a message or a photo" });
      }
      const name = await nameFor(sdk, req.user_id);
      await addEntry(sdk, req.params.id, req.user_id, name, "client", "message",
        req.body.message, req.body.attachments);
      return res.status(200).json({ error: false, message: "Sent" });
    } catch (e) {
      console.error("Client reply error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  /**
   * Can this fault be dispatched, and to which trades?
   * The machine has to have the switch on and at least one supplier against it.
   * Coverage decides — if nobody covers the machine, the client never sees the
   * option and goes back to talking to us, which is the old way and is fine.
   */
  app.get("/v1/api/longtermhire/client/faults/:id/dispatch-options", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const owner = await ownerFor(sdk, req.user_id);
      const rows = await sdk.rawQuery(
        "SELECT f.id, f.equipment_id, COALESCE(e.auto_dispatch,0) AS auto_dispatch " +
        "FROM longtermhire_fault f " +
        "JOIN longtermhire_equipment_item e ON e.id = f.equipment_id " +
        "WHERE f.id = ? AND f.client_user_id = ? LIMIT 1",
        [req.params.id, owner]
      );
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      if (Number(rows[0].auto_dispatch) !== 1) {
        return res.status(200).json({ error: false, data: { trades: [] } });
      }
      const sup = await sdk.rawQuery(
        "SELECT DISTINCT s.trade FROM longtermhire_equipment_supplier es " +
        "JOIN longtermhire_supplier s ON s.id = es.supplier_id " +
        "WHERE es.equipment_id = ? AND s.active = 1 AND s.trade IS NOT NULL ORDER BY s.trade",
        [rows[0].equipment_id]
      );
      return res.status(200).json({
        error: false,
        data: { trades: (sup || []).map((r) => r.trade) },
      });
    } catch (e) {
      console.error("Dispatch options error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  /**
   * Send the job to whoever covers that trade on that machine.
   * The email carries the whole story — what the machine is, what Larry said in
   * his own words, his photo, the specifics, where to go and who to meet — plus
   * one-tap reply buttons. A tyre fitter will not create an account, so the
   * replies are unguessable links rather than a login.
   */
  app.post("/v1/api/longtermhire/client/faults/:id/dispatch", TokenMiddleware(), async (req, res) => {
    try {
      const sdk = sdkFor();
      const owner = await ownerFor(sdk, req.user_id);
      const { trade, answers, site_contact_name, site_contact_phone } = req.body;
      if (!trade) return res.status(400).json({ error: true, message: "Pick what it is" });

      const rows = await sdk.rawQuery(
        "SELECT f.*, COALESCE(e.auto_dispatch,0) AS auto_dispatch, " +
        "e.equipment_id AS plant_code, e.equipment_name, c.company_name " +
        "FROM longtermhire_fault f " +
        "JOIN longtermhire_equipment_item e ON e.id = f.equipment_id " +
        "LEFT JOIN longtermhire_client c ON c.user_id = f.client_user_id " +
        "WHERE f.id = ? AND f.client_user_id = ? LIMIT 1",
        [req.params.id, owner]
      );
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      const f = rows[0];
      if (Number(f.auto_dispatch) !== 1) {
        return res.status(400).json({ error: true, message: "Not set up for this machine" });
      }

      const sup = await sdk.rawQuery(
        "SELECT s.* FROM longtermhire_equipment_supplier es " +
        "JOIN longtermhire_supplier s ON s.id = es.supplier_id " +
        "WHERE es.equipment_id = ? AND s.trade = ? AND s.active = 1 LIMIT 1",
        [f.equipment_id, trade]
      );
      if (!sup || !sup.length) {
        return res.status(400).json({ error: true, message: "Nobody covers that on this machine" });
      }
      const s = sup[0];
      const reporter = await nameFor(sdk, req.user_id);

      // The first thing Larry wrote, and any photo he took, so the subby sees
      // the evidence rather than a tidy summary of it.
      let firstMessage = f.title || "";
      let photoUrls = [];
      try {
        const first = await sdk.rawQuery(
          "SELECT message, attachments FROM longtermhire_fault_update " +
          "WHERE fault_id = ? ORDER BY id LIMIT 1",
          [f.id]
        );
        if (first && first.length) {
          if (first[0].message) firstMessage = first[0].message;
          const raw = first[0].attachments;
          const list = Array.isArray(raw) ? raw : raw ? JSON.parse(raw) : [];
          photoUrls = (list || []).map((p) => (typeof p === "string" ? p : p.url)).filter(Boolean);
        }
      } catch (e) {
        console.error("Could not read the first fault entry:", e);
      }

      const token = require("crypto").randomBytes(24).toString("hex");
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const dispatchRes = await sdk.rawQuery(
        "INSERT INTO longtermhire_dispatch " +
        "(fault_id, supplier_id, trade, token, site_contact_name, site_contact_phone, status, created_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)",
        [f.id, s.id, trade, token, site_contact_name || reporter,
         site_contact_phone || null, now]
      );

      const base = "https://www.longtermhire.com/job/" + token;
      const btn = (label, key, primary) =>
        `<a href="${base}/${key}" style="display:block; text-align:center; padding:14px 18px; margin-bottom:8px; border-radius:6px; font-size:16px; text-decoration:none; ` +
        (primary
          ? "background:#1b8a3a; color:#fff; font-weight:600;"
          : "background:#fff; border:1px solid #bbb; color:#333;") +
        `">${label}</a>`;

      const details = Object.keys(answers || {})
        .map((k) => `<li><b>${k}:</b> ${answers[k] || "not given"}</li>`)
        .join("");
      const photos = photoUrls
        .map((u) => `<img src="${u}" alt="" style="width:100%; max-width:460px; border-radius:6px; margin-bottom:10px;" />`)
        .join("");

      const label = (t) =>
        `<p style="margin:0 0 3px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:.05em;">${t}</p>`;

      const html = `
        <div style="font-family: Inter, Arial, sans-serif; max-width:600px; background:#f6f6f6; padding:16px;">
          <div style="background:#fff; border:1px solid #ddd; border-radius:8px; padding:22px;">
            <h2 style="margin:0 0 2px; font-size:20px; color:#111;">${trade} — job on site</h2>
            <p style="margin:0 0 18px; color:#666; font-size:13px;">From Long Term Hire · reference ${f.id}</p>

            ${label("Machine")}
            <p style="margin:0 0 16px; font-size:15px; color:#111;"><b>${f.plant_code} — ${f.equipment_name}</b></p>

            ${label("What's happened")}
            <p style="margin:0 0 3px; font-size:15px; color:#111;">${f.title || ""}</p>
            <p style="margin:0 0 16px; font-size:14px; color:#444;">${firstMessage}</p>

            ${photos}

            ${details ? label("Details") : ""}
            <ul style="margin:0 0 16px; padding-left:18px; font-size:14px; color:#333; line-height:1.7;">${details}</ul>

            <div style="background:#f9f9f9; border-radius:6px; padding:14px; margin-bottom:18px;">
              ${label("Where")}
              <p style="margin:0 0 10px; font-size:15px; color:#111;">${f.company_name || ""}</p>
              ${label("Meet")}
              <p style="margin:0; font-size:15px; color:#111;">
                ${site_contact_name || reporter}${site_contact_phone ? ' · <a href="tel:' + site_contact_phone + '" style="color:#111;">' + site_contact_phone + "</a>" : ""}
              </p>
            </div>

            <div style="border-top:1px solid #eee; padding-top:18px;">
              <p style="margin:0 0 12px; font-size:15px; color:#111;"><b>Can you take this one?</b></p>
              ${btn("Yes — on my way", "yes", true)}
              ${btn("Yes — but not today", "later")}
              ${btn("I need more information", "question")}
              ${btn("Ring me", "call")}
              ${btn("Can't do this one", "no")}
              <p style="margin:12px 0 0; font-size:12px; color:#888;">One tap. Nothing to log into.</p>
            </div>
          </div>
        </div>`;

      let sent = false;
      try {
        const MailService = require("../../../baas/services/MailService");
        const config = app.get("configuration");
        const mailService = new MailService(config);
        if (s.email) {
          await mailService.send(
            config.mail?.from_mail || "admin@longtermhire.com",
            s.email,
            `${trade} — ${f.plant_code} ${f.equipment_name}, ${f.company_name || ""}`,
            html
          );
          sent = true;
        }
      } catch (mailErr) {
        console.error("Dispatch email failed:", mailErr);
      }

      const summary =
        `Sent to ${s.name}${s.contact_name ? " (" + s.contact_name + ")" : ""}` +
        `${s.phone ? " · " + s.phone : ""}` +
        (sent ? "" : " — email did not go, ring them");
      await addEntry(sdk, f.id, req.user_id, reporter, "client", "message", summary, null);

      return res.status(200).json({
        error: false,
        data: { supplier: s.name, phone: s.phone, sent, dispatch_id: dispatchRes.insertId },
      });
    } catch (e) {
      console.error("Dispatch error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  /**
   * The supplier's side. No login — the token in the link is the credential,
   * so these are deliberately outside TokenMiddleware.
   * GET  /v1/api/longtermhire/job/:token          what the job is
   * POST /v1/api/longtermhire/job/:token/respond  yes / later / question / call / no
   */
  app.get("/v1/api/longtermhire/job/:token", async (req, res) => {
    try {
      const sdk = sdkFor();
      const rows = await sdk.rawQuery(
        "SELECT d.*, f.title, f.id AS fault_id, e.equipment_id AS plant_code, e.equipment_name, " +
        "c.company_name, s.name AS supplier_name " +
        "FROM longtermhire_dispatch d " +
        "JOIN longtermhire_fault f ON f.id = d.fault_id " +
        "LEFT JOIN longtermhire_equipment_item e ON e.id = f.equipment_id " +
        "LEFT JOIN longtermhire_client c ON c.user_id = f.client_user_id " +
        "LEFT JOIN longtermhire_supplier s ON s.id = d.supplier_id " +
        "WHERE d.token = ? LIMIT 1",
        [req.params.token]
      );
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      const d = rows[0];
      return res.status(200).json({
        error: false,
        data: {
          trade: d.trade, status: d.status, response: d.response,
          plant_code: d.plant_code, equipment_name: d.equipment_name,
          title: d.title, company_name: d.company_name,
          site_contact_name: d.site_contact_name, site_contact_phone: d.site_contact_phone,
          supplier_name: d.supplier_name, fault_id: d.fault_id,
        },
      });
    } catch (e) {
      console.error("Job lookup error:", e);
      return res.status(500).json({ error: true, message: e.message });
    }
  });

  app.post("/v1/api/longtermhire/job/:token/respond", async (req, res) => {
    try {
      const sdk = sdkFor();
      const { response, eta, note } = req.body;
      const allowed = ["yes", "later", "question", "call", "no"];
      if (!allowed.includes(response)) {
        return res.status(400).json({ error: true, message: "Unknown response" });
      }

      const rows = await sdk.rawQuery(
        "SELECT d.*, s.name AS supplier_name FROM longtermhire_dispatch d " +
        "LEFT JOIN longtermhire_supplier s ON s.id = d.supplier_id WHERE d.token = ? LIMIT 1",
        [req.params.token]
      );
      if (!rows || !rows.length) return res.status(404).json({ error: true, message: "Not found" });
      const d = rows[0];

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      await sdk.rawQuery(
        "UPDATE longtermhire_dispatch SET status = ?, response = ?, eta = ?, note = ?, responded_at = ? WHERE id = ?",
        [response === "no" ? "declined" : "answered", response, eta || null, note || null, now, d.id]
      );

      // Everything lands in the fault thread so it can be watched without asking.
      const WORDS = {
        yes: "On my way" + (eta ? " — " + eta : ""),
        later: "Can do, but not today" + (eta ? " — " + eta : ""),
        question: note || "Has a question",
        call: "Asked for a call",
        no: "Cannot take this one",
      };
      const EVENT = {
        yes: "Accepted", later: "Accepted", question: "Asked a question",
        call: "Asked for a call", no: "Declined",
      };
      await addEntry(
        sdk, d.fault_id, null, d.supplier_name || "Supplier", "supplier",
        "message", EVENT[response] + " — " + WORDS[response], null
      );

      // Anything that needs us gets an email; a plain yes does not.
      if (response !== "yes") {
        try {
          const MailService = require("../../../baas/services/MailService");
          const config = app.get("configuration");
          const mailService = new MailService(config);
          const to = process.env.ADMIN_NOTIFY_EMAIL || config.mail?.from_mail;
          if (to) {
            await mailService.send(
              config.mail?.from_mail || "admin@longtermhire.com",
              to,
              `${d.supplier_name || "Supplier"} — ${EVENT[response]} on fault ${d.fault_id}`,
              `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#111;">
                 <p><b>${d.supplier_name || "Supplier"}</b> — ${EVENT[response]}</p>
                 <p>${WORDS[response]}</p>
                 <p style="color:#666;font-size:13px;">Fault reference ${d.fault_id}.</p>
               </div>`
            );
          }
        } catch (mailErr) {
          console.error("Response notification failed:", mailErr);
        }
      }

      return res.status(200).json({ error: false, data: { response } });
    } catch (e) {
      console.error("Job respond error:", e);
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
      const hasPhotos = Array.isArray(req.body.attachments) && req.body.attachments.length > 0;
      if (!req.body.message && !hasPhotos) {
        return res.status(400).json({ error: true, message: "Add a message or a photo" });
      }
      await addEntry(sdk, req.params.id, req.user_id, "Long Term Hire", "admin", "message",
        req.body.message, req.body.attachments);
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

      // Severity and timeframe are separate judgements. A minor fault can be a
      // three week wait on a part; a major one can be back running by tomorrow.
      // The band's own figure is only a fallback when no timeframe was chosen.
      let hours = parseFloat(req.body.window_hours);
      if (!isFinite(hours) || hours <= 0) hours = BANDS[band].hours;
      if (hours > 8760) hours = 8760; // a year, as a sanity ceiling

      await sdk.rawQuery("UPDATE longtermhire_fault SET severity = ?, window_hours = ?, cause = ? WHERE id = ?",
        [band, hours, req.body.cause || null, req.params.id]);
      await addEntry(sdk, req.params.id, req.user_id, "Long Term Hire", "admin", "classified",
        req.body.note || ("Classified as " + band + " — " + hours + "h to repair"));
      return res.status(200).json({ error: false, message: "Classified",
        data: { ...BANDS[band], hours } });
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
