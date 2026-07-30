const crypto = require("crypto");

const ETA_BANDS = ["within_1h", "1_to_3h", "today", "tomorrow", "scheduled"];
const MACHINE_STATUS = ["going", "limited", "down"];

const ETA_LABEL = {
  within_1h: "Within 1 hour",
  "1_to_3h": "1 to 3 hours",
  today: "Today",
  tomorrow: "Tomorrow",
  scheduled: "Scheduled",
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

module.exports = function (app) {
  console.log("Loading dispatch routes...");

  function getSdk() {
    const sdk = app.get("sdk");
    sdk.setProjectId("longtermhire");
    return sdk;
  }

  async function loadDispatch(sdk, token) {
    const rows = await sdk.rawQuery(
      `SELECT d.*, s.name AS supplier_name, t.name AS trade_name,
              f.fault_no, f.title, f.severity, f.window_hours, f.status AS fault_status,
              e.equipment_name AS equipment_name, e.equipment_id AS fleet_code, e.model, e.current_hours
       FROM longtermhire_dispatch d
       JOIN longtermhire_supplier s ON s.id = d.supplier_id
       JOIN longtermhire_trade t ON t.id = d.trade_id
       JOIN longtermhire_fault f ON f.id = d.fault_id
       LEFT JOIN longtermhire_equipment_item e ON e.id = f.equipment_id
       WHERE d.token = ?`,
      [token]
    );
    return rows && rows.length ? rows[0] : null;
  }

  async function postToThread(sdk, faultId, authorName, eventType, message) {
    try {
      await sdk.rawQuery(
        `INSERT INTO longtermhire_fault_update
           (fault_id, user_id, author_name, author_side, event_type, message)
         VALUES (?, NULL, ?, 'supplier', ?, ?)`,
        [faultId, authorName, eventType, message]
      );
    } catch (err) {
      console.error("thread post failed", err);
    }
  }

  function tokenState(d) {
    if (!d) return { ok: false, reason: "not_found" };
    if (d.status === "cancelled") return { ok: false, reason: "cancelled" };
    if (d.status === "completed") return { ok: false, reason: "completed" };
    if (d.status === "declined") return { ok: false, reason: "declined" };
    if (d.token_expires_at && new Date(d.token_expires_at) < new Date()) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true };
  }

  app.get("/v1/api/longtermhire/dispatch/:token", async (req, res) => {
    try {
      const sdk = getSdk();
      const d = await loadDispatch(sdk, req.params.token);
      const state = tokenState(d);
      if (!d) return res.status(404).json({ error: "not_found" });

      res.json({
        ok: state.ok,
        reason: state.reason || null,
        stage: d.status === "sent" ? "respond" : "complete",
        job: {
          fault_no: d.fault_no,
          title: d.title,
          severity: d.severity,
          window_hours: d.window_hours,
          equipment_name: d.equipment_name,
          trade_name: d.trade_name,
          supplier_name: d.supplier_name,
          message_body: d.message_body,
          eta_band: d.eta_band,
          attending_name: d.attending_name,
        },
      });
    } catch (err) {
      console.error("dispatch detail error", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.post("/v1/api/longtermhire/dispatch/:token/respond", async (req, res) => {
    try {
      const sdk = getSdk();
      const d = await loadDispatch(sdk, req.params.token);
      const state = tokenState(d);
      if (!d) return res.status(404).json({ error: "not_found" });
      if (!state.ok) return res.status(409).json({ error: state.reason });
      if (d.status !== "sent") return res.status(409).json({ error: "already_responded" });

      const response = req.body.response;
      if (response !== "accept" && response !== "decline") {
        return res.status(400).json({ error: "bad_response" });
      }

      if (response === "decline") {
        await sdk.rawQuery(
          `UPDATE longtermhire_dispatch
           SET status = 'declined', response = 'decline', responded_at = NOW(),
               decline_reason = ?
           WHERE id = ?`,
          [req.body.decline_reason || null, d.id]
        );
        await postToThread(sdk, d.fault_id, d.supplier_name, "message",
          "Declined the job" + (req.body.decline_reason ? ": " + req.body.decline_reason : "."));
        return res.json({ ok: true, status: "declined" });
      }

      const eta = req.body.eta_band;
      if (!ETA_BANDS.includes(eta)) return res.status(400).json({ error: "bad_eta" });

      await sdk.rawQuery(
        `UPDATE longtermhire_dispatch
         SET status = 'accepted', response = 'accept', responded_at = NOW(),
             eta_band = ?, attending_name = ?
         WHERE id = ?`,
        [eta, req.body.attending_name || null, d.id]
      );

      await sdk.rawQuery(
        `UPDATE longtermhire_fault
         SET actioned_at = COALESCE(actioned_at, NOW()),
             status = CASE WHEN status = 'reported' THEN 'actioned' ELSE status END
         WHERE id = ?`,
        [d.fault_id]
      );

      await postToThread(sdk, d.fault_id, d.supplier_name, "actioned",
        "Accepted. ETA " + (ETA_LABEL[eta] || eta).toLowerCase() +
        (req.body.attending_name ? ". Attending: " + req.body.attending_name : "") + ".");

      res.json({ ok: true, status: "accepted", stage: "complete" });
    } catch (err) {
      console.error("dispatch respond error", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.post("/v1/api/longtermhire/dispatch/:token/complete", async (req, res) => {
    try {
      const sdk = getSdk();
      const d = await loadDispatch(sdk, req.params.token);
      const state = tokenState(d);
      if (!d) return res.status(404).json({ error: "not_found" });
      if (!state.ok) return res.status(409).json({ error: state.reason });
      if (d.status !== "accepted") return res.status(409).json({ error: "not_accepted" });

      const machineStatus = req.body.machine_status;
      if (!MACHINE_STATUS.includes(machineStatus)) {
        return res.status(400).json({ error: "bad_machine_status" });
      }

      const hours = req.body.hours_on_site === "" || req.body.hours_on_site == null
        ? null
        : parseFloat(req.body.hours_on_site);

      await sdk.rawQuery(
        `UPDATE longtermhire_dispatch
         SET status = 'completed', completed_at = NOW(),
             findings = ?, work_done = ?, parts_detail = ?, parts_on_order = ?,
             machine_status = ?, hours_on_site = ?, invoice_reference = ?
         WHERE id = ?`,
        [
          req.body.findings || null,
          req.body.work_done || null,
          req.body.parts_detail || null,
          req.body.parts_on_order ? 1 : 0,
          machineStatus,
          isNaN(hours) ? null : hours,
          req.body.invoice_reference || null,
          d.id,
        ]
      );

      if (machineStatus === "going") {
        await sdk.rawQuery(
          `UPDATE longtermhire_fault
           SET attended_at = COALESCE(attended_at, NOW()),
               resolved_at = COALESCE(resolved_at, NOW()),
               status = 'resolved'
           WHERE id = ?`,
          [d.fault_id]
        );
      } else {
        await sdk.rawQuery(
          `UPDATE longtermhire_fault
           SET attended_at = COALESCE(attended_at, NOW())
           WHERE id = ?`,
          [d.fault_id]
        );
      }

      const lines = [];
      if (req.body.findings) lines.push("Found: " + req.body.findings);
      if (req.body.work_done) lines.push("Done: " + req.body.work_done);
      if (req.body.parts_detail) {
        lines.push("Parts: " + req.body.parts_detail +
          (req.body.parts_on_order ? " (on order)" : ""));
      }
      lines.push("Machine: " + machineStatus);
      if (hours && !isNaN(hours)) lines.push("Hours on site: " + hours);
      if (req.body.invoice_reference) lines.push("Invoice: " + req.body.invoice_reference);

      await postToThread(sdk, d.fault_id, d.supplier_name,
        machineStatus === "going" ? "resolved" : "attended",
        lines.join("\n"));

      res.json({ ok: true, status: "completed", resolved: machineStatus === "going" });
    } catch (err) {
      console.error("dispatch complete error", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  app.post("/v1/api/longtermhire/dispatch/_test/mint", async (req, res) => {
    try {
      const sdk = getSdk();
      const faultId = req.body.fault_id;
      const supplierId = req.body.supplier_id;
      const tradeId = req.body.trade_id;
      if (!faultId || !supplierId || !tradeId) {
        return res.status(400).json({ error: "need fault_id, supplier_id, trade_id" });
      }
      const token = crypto.randomBytes(16).toString("hex");
      await sdk.rawQuery(
        `INSERT INTO longtermhire_dispatch
           (fault_id, supplier_id, trade_id, token, token_expires_at, status,
            message_body, sent_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY), 'sent', ?, NOW())`,
        [faultId, supplierId, tradeId, token, req.body.message_body || "Test dispatch"]
      );
      res.json({ ok: true, token, url: "/dispatch/" + token });
    } catch (err) {
      console.error("mint error", err);
      res.status(500).json({ error: "server_error", detail: String(err.message || err) });
    }
  });

  app.get("/dispatch/:token", async (req, res) => {
    let d = null;
    try {
      d = await loadDispatch(getSdk(), req.params.token);
    } catch (err) {
      console.error("dispatch page error", err);
    }

    const state = tokenState(d);
    res.set("Content-Type", "text/html; charset=utf-8");

    if (!state.ok) {
      const msg = {
        not_found: "This link isn't valid.",
        expired: "This link has expired.",
        cancelled: "This job was cancelled.",
        completed: "This job is already marked complete. Thanks.",
        declined: "This job was declined.",
      }[state.reason] || "This link isn't available.";
      return res.send(page(`<div class="card"><h1>Long Term Hire</h1><p class="muted">${esc(msg)}</p><p class="muted">Give us a call if that's not right.</p></div>`));
    }

    const stage = d.status === "sent" ? "respond" : "complete";
    const sev = esc(d.severity || "");
    const win = d.window_hours ? `Response needed within ${d.window_hours} hours` : "";

    const header = `
      <p class="tag">Long Term Hire &middot; job ${esc(d.fault_no || d.id)}</p>
      <h1>${esc(d.equipment_name || "Machine")}</h1>
      <p class="sub">${esc(d.title)}</p>
      ${sev ? `<div class="banner">Severity ${sev}${win ? " &mdash; " + esc(win) : ""}</div>` : ""}
      ${d.message_body ? `<pre class="brief">${esc(d.message_body)}</pre>` : ""}
    `;

    const respondForm = `
      <div class="section">
        <p class="label">Can you attend?</p>
        <div class="row">
          <button type="button" class="big yes" onclick="setResponse('accept')" id="btn-accept">Accept</button>
          <button type="button" class="big" onclick="setResponse('decline')" id="btn-decline">Decline</button>
        </div>
      </div>
      <div id="accept-block" class="hidden">
        <div class="section">
          <p class="label">ETA on site</p>
          <div class="grid">
            ${ETA_BANDS.slice(0, 4).map(b => `<button type="button" class="opt" data-eta="${b}" onclick="setEta('${b}')">${ETA_LABEL[b]}</button>`).join("")}
          </div>
        </div>
        <div class="section">
          <p class="label">Who's attending</p>
          <input type="text" id="attending" placeholder="Name">
        </div>
      </div>
      <div id="decline-block" class="hidden">
        <div class="section">
          <p class="label">Reason (optional)</p>
          <input type="text" id="decline-reason" placeholder="Booked out, wrong trade, too far">
        </div>
      </div>
      <button type="button" class="primary" onclick="submitRespond()" id="submit-respond">Confirm</button>
      <p class="err" id="err"></p>
    `;

    const completeForm = `
      <div class="done">Accepted${d.eta_band ? " &middot; " + esc(ETA_LABEL[d.eta_band] || d.eta_band) : ""}${d.attending_name ? " &middot; " + esc(d.attending_name) : ""}</div>
      <div class="section">
        <p class="label">What did you find?</p>
        <textarea id="findings" rows="3"></textarea>
      </div>
      <div class="section">
        <p class="label">Work done</p>
        <textarea id="work_done" rows="3"></textarea>
      </div>
      <div class="section">
        <p class="label">Parts</p>
        <input type="text" id="parts_detail" placeholder="Part numbers or description">
        <label class="check"><input type="checkbox" id="parts_on_order"> Parts on order</label>
      </div>
      <div class="section">
        <p class="label">Machine status</p>
        <div class="grid3">
          <button type="button" class="opt" data-ms="going" onclick="setMs('going')">Going</button>
          <button type="button" class="opt" data-ms="limited" onclick="setMs('limited')">Limited</button>
          <button type="button" class="opt" data-ms="down" onclick="setMs('down')">Down</button>
        </div>
        <p class="hint" id="ms-hint">Limited or down keeps the job open.</p>
      </div>
      <div class="section">
        <p class="label">Hours on site</p>
        <input type="number" step="0.25" id="hours_on_site" placeholder="1.5">
      </div>
      <div class="section">
        <p class="label">Invoice reference (optional)</p>
        <input type="text" id="invoice_reference">
      </div>
      <button type="button" class="primary" onclick="submitComplete()" id="submit-complete">Submit</button>
      <p class="err" id="err"></p>
    `;

    const body = `<div class="card">${header}${stage === "respond" ? respondForm : completeForm}</div>`;
    res.send(page(body, req.params.token, stage));
  });

  function page(inner, token, stage) {
    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Long Term Hire</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f2f1ec;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e1e1c;padding:16px}
.card{max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:20px 18px 24px}
h1{font-size:20px;font-weight:600;margin:0}
.tag{font-size:12px;color:#8a887f;margin:0 0 4px}
.sub{font-size:15px;color:#5f5e5a;margin:4px 0 0}
.banner{background:#fcebeb;color:#8f2727;font-size:14px;padding:10px 12px;border-radius:8px;margin:14px 0 0}
.brief{background:#f5f4ef;border-radius:8px;padding:10px 12px;font:13px/1.6 ui-monospace,Menlo,monospace;color:#4a4945;white-space:pre-wrap;margin:12px 0 0;overflow-wrap:anywhere}
.section{margin:18px 0 0}
.label{font-size:14px;font-weight:600;margin:0 0 8px}
.row{display:flex;gap:10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
button{font:inherit;cursor:pointer;border-radius:10px;border:1px solid #d3d1c7;background:#fff;color:#1e1e1c;padding:14px 10px;-webkit-tap-highlight-color:transparent}
button:active{transform:scale(.99)}
.big{flex:1;font-size:16px;font-weight:600;padding:16px 0}
.yes.on{background:#1d9e75;border-color:#1d9e75;color:#fff}
.big.on{background:#1e1e1c;border-color:#1e1e1c;color:#fff}
.opt{font-size:15px;padding:14px 6px}
.opt.on{border-color:#185fa5;color:#185fa5;border-width:2px;font-weight:600}
.primary{width:100%;margin-top:22px;background:#185fa5;border-color:#185fa5;color:#fff;font-size:16px;font-weight:600;padding:16px 0}
.primary[disabled]{opacity:.5}
input,textarea{width:100%;font:inherit;padding:12px;border:1px solid #d3d1c7;border-radius:10px;background:#fff;color:#1e1e1c}
textarea{resize:vertical}
.check{display:flex;align-items:center;gap:8px;font-size:15px;margin-top:10px}
.check input{width:20px;height:20px}
.hint{font-size:13px;color:#8a887f;margin:8px 0 0}
.muted{color:#5f5e5a}
.hidden{display:none}
.err{color:#a32d2d;font-size:14px;margin:12px 0 0;min-height:1px}
.done{background:#e1f5ee;color:#0f6e56;font-size:14px;padding:10px 12px;border-radius:8px;margin:14px 0 0}
</style></head><body>
${inner}
<script>
var TOKEN=${JSON.stringify(token || "")};
var response=null,eta=null,ms=null;
function q(id){return document.getElementById(id)}
function setResponse(r){
  response=r;
  q('btn-accept').className='big yes'+(r==='accept'?' on':'');
  q('btn-decline').className='big'+(r==='decline'?' on':'');
  q('accept-block').className=r==='accept'?'':'hidden';
  q('decline-block').className=r==='decline'?'':'hidden';
}
function setEta(v){eta=v;document.querySelectorAll('[data-eta]').forEach(function(b){b.className='opt'+(b.dataset.eta===v?' on':'')})}
function setMs(v){ms=v;document.querySelectorAll('[data-ms]').forEach(function(b){b.className='opt'+(b.dataset.ms===v?' on':'')});
  q('ms-hint').textContent=v==='going'?'This will close the job.':'Limited or down keeps the job open.'}
function fail(m){q('err').textContent=m}
function post(path,payload,btn){
  btn.disabled=true;fail('');
  return fetch('/v1/api/longtermhire/dispatch/'+TOKEN+path,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
  }).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})
   .then(function(res){
      if(!res.ok){btn.disabled=false;fail('Could not save: '+(res.j.error||'try again'));return}
      location.reload();
   }).catch(function(){btn.disabled=false;fail('No connection. Try again when you have signal.')});
}
function submitRespond(){
  if(!response)return fail('Tap accept or decline first.');
  if(response==='accept'&&!eta)return fail('Pick an ETA.');
  post('/respond',{response:response,eta_band:eta,attending_name:(q('attending')||{}).value,decline_reason:(q('decline-reason')||{}).value},q('submit-respond'));
}
function submitComplete(){
  if(!ms)return fail('Pick a machine status.');
  post('/complete',{
    findings:q('findings').value,work_done:q('work_done').value,
    parts_detail:q('parts_detail').value,parts_on_order:q('parts_on_order').checked,
    machine_status:ms,hours_on_site:q('hours_on_site').value,
    invoice_reference:q('invoice_reference').value
  },q('submit-complete'));
}
</script></body></html>`;
  }
};
