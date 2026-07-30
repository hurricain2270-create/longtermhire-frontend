// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const API = "https://api.longtermhire.com";

// The supplier's page. No login — the token in the address is the credential.
// Built for a phone held in one hand: one column, big targets, nothing to zoom.
const CHOICES = [
  { key: "yes", label: "Yes — on my way", primary: true },
  { key: "later", label: "Yes — but not today" },
  { key: "question", label: "I need more information" },
  { key: "call", label: "Ring me" },
  { key: "no", label: "Can't do this one", quiet: true },
];

const ETAS = ["Within the hour", "This morning", "This arvo", "Tomorrow"];

const JobPage = () => {
  const { token } = useParams();
  const [params] = useSearchParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(false);
  const [choice, setChoice] = useState(null);
  const [eta, setEta] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API + "/v1/api/longtermhire/job/" + token);
        const j = await res.json();
        if (j.error) { setError(true); return; }
        setJob(j.data);
        // Tapping a button in the email lands here with the choice already made.
        const pre = window.location.pathname.split("/").pop();
        if (CHOICES.some((c) => c.key === pre)) setChoice(pre);
      } catch (e) {
        setError(true);
      }
    })();
  }, [token]);

  const send = async (key, extra = {}) => {
    setSending(true);
    try {
      const res = await fetch(API + "/v1/api/longtermhire/job/" + token + "/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: key, ...extra }),
      });
      const j = await res.json();
      if (j.error) { setError(true); return; }
      setDone(key);
    } catch (e) {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const Shell = ({ children }) => (
    <div style={{ minHeight: "100vh", background: "#292A2B", padding: "16px",
                  fontFamily: "Inter, Arial, sans-serif" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>{children}</div>
    </div>
  );

  if (error) {
    return (
      <Shell>
        <div style={{ background: "#1F1F20", border: "1px solid #333", borderRadius: "12px",
                      padding: "24px", textAlign: "center", marginTop: "40px" }}>
          <p style={{ margin: 0, color: "#E5E5E5", fontSize: "18px" }}>This link has expired</p>
          <p style={{ margin: "8px 0 0", color: "#9CA3AF", fontSize: "14px" }}>
            Give Long Term Hire a ring and they will sort it out.
          </p>
        </div>
      </Shell>
    );
  }

  if (!job) {
    return <Shell><p style={{ color: "#9CA3AF", marginTop: "40px" }}>Loading…</p></Shell>;
  }

  if (done) {
    const WORD = {
      yes: "Thanks, that's logged", later: "Thanks, that's logged",
      question: "Sent to the bloke on site", call: "We'll ring you shortly",
      no: "No worries, thanks for letting us know",
    };
    const SUB = {
      yes: (job.site_contact_name || "The site") + " has been told you're coming.",
      later: (job.site_contact_name || "The site") + " has been told.",
      question: "You'll get an answer as soon as they see it.",
      call: "Someone will be in touch.",
      no: "We'll get someone else onto it.",
    };
    return (
      <Shell>
        <div style={{ background: "#1F1F20", border: "1px solid #333", borderRadius: "12px",
                      padding: "28px 22px", textAlign: "center", marginTop: "40px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%",
                        background: done === "no" ? "#3d1a1a" : "#14352a",
                        color: done === "no" ? "#ef4444" : "#4CAF50",
                        fontSize: "24px", lineHeight: "48px", margin: "0 auto 14px" }}>
            {done === "no" ? "×" : "✓"}
          </div>
          <p style={{ margin: "0 0 6px", color: "#E5E5E5", fontSize: "19px", fontWeight: 600 }}>
            {WORD[done]}
          </p>
          <p style={{ margin: 0, color: "#9CA3AF", fontSize: "15px" }}>{SUB[done]}</p>
        </div>
      </Shell>
    );
  }

  const Field = ({ label, value }) =>
    value ? (
      <div style={{ marginBottom: "12px" }}>
        <p style={{ margin: "0 0 2px", color: "#6B7280", fontSize: "12px",
                    textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</p>
        <p style={{ margin: 0, color: "#E5E5E5", fontSize: "16px" }}>{value}</p>
      </div>
    ) : null;

  return (
    <Shell>
      <div style={{ background: "#1F1F20", border: "1px solid #333", borderRadius: "12px",
                    padding: "20px", marginBottom: "14px" }}>
        <p style={{ margin: "0 0 2px", color: "#E5E5E5", fontSize: "20px", fontWeight: 600 }}>
          {job.trade} — job on site
        </p>
        <p style={{ margin: "0 0 18px", color: "#6B7280", fontSize: "13px" }}>
          From Long Term Hire · reference {job.fault_id}
        </p>
        <Field label="Machine" value={(job.plant_code || "") + " " + (job.equipment_name || "")} />
        <Field label="What's happened" value={job.title} />
        <Field label="Where" value={job.company_name} />
        {job.site_contact_name ? (
          <div>
            <p style={{ margin: "0 0 2px", color: "#6B7280", fontSize: "12px",
                        textTransform: "uppercase", letterSpacing: ".05em" }}>Meet</p>
            <p style={{ margin: 0, color: "#E5E5E5", fontSize: "16px" }}>
              {job.site_contact_name}
              {job.site_contact_phone ? (
                <> · <a href={"tel:" + job.site_contact_phone}
                       style={{ color: "#FDCE06" }}>{job.site_contact_phone}</a></>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      <div style={{ background: "#1F1F20", border: "1px solid #333", borderRadius: "12px", padding: "20px" }}>
        {!choice ? (
          <>
            <p style={{ margin: "0 0 14px", color: "#E5E5E5", fontSize: "17px", fontWeight: 600 }}>
              Can you take this one?
            </p>
            {CHOICES.map((c) => (
              <button key={c.key} onClick={() => (c.key === "yes" || c.key === "later" || c.key === "question" ? setChoice(c.key) : send(c.key))}
                style={{
                  display: "block", width: "100%", padding: "15px 18px", marginBottom: "9px",
                  borderRadius: "8px", fontSize: "16px", cursor: "pointer", textAlign: "center",
                  border: c.primary ? "none" : "1px solid #333",
                  background: c.primary ? "#4CAF50" : "#292A2B",
                  color: c.primary ? "#1F1F20" : c.quiet ? "#9CA3AF" : "#E5E5E5",
                  fontWeight: c.primary ? 700 : 400,
                }}>
                {c.label}
              </button>
            ))}
          </>
        ) : choice === "question" ? (
          <>
            <p style={{ margin: "0 0 4px", color: "#E5E5E5", fontSize: "18px", fontWeight: 600 }}>
              What do you need to know?
            </p>
            <p style={{ margin: "0 0 14px", color: "#9CA3AF", fontSize: "14px" }}>
              It goes straight to the bloke on site.
            </p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4}
              placeholder="Steel rim or alloy? Can I get a truck in there?"
              style={{ width: "100%", background: "#292A2B", border: "1px solid #333",
                       borderRadius: "8px", color: "#E5E5E5", fontSize: "16px", padding: "12px",
                       marginBottom: "14px", fontFamily: "inherit" }} />
            <button onClick={() => send("question", { note })} disabled={sending || !note.trim()}
              style={{ width: "100%", padding: "15px", borderRadius: "8px", border: "none",
                       background: "#4CAF50", color: "#1F1F20", fontSize: "16px", fontWeight: 700,
                       cursor: "pointer", opacity: sending || !note.trim() ? 0.5 : 1 }}>
              {sending ? "Sending…" : "Send"}
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 4px", color: "#E5E5E5", fontSize: "18px", fontWeight: 600 }}>
              {choice === "yes" ? "On your way" : "Not today"}
            </p>
            <p style={{ margin: "0 0 14px", color: "#9CA3AF", fontSize: "14px" }}>
              Rough time? <span style={{ color: "#6B7280" }}>optional</span>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
              {ETAS.map((t) => (
                <button key={t} onClick={() => setEta(eta === t ? "" : t)}
                  style={{ flex: "1 1 44%", padding: "12px 8px", borderRadius: "8px",
                           fontSize: "14px", cursor: "pointer",
                           border: eta === t ? "none" : "1px solid #333",
                           background: eta === t ? "#FDCE06" : "#292A2B",
                           color: eta === t ? "#1F1F20" : "#E5E5E5",
                           fontWeight: eta === t ? 600 : 400 }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => send(choice, { eta })} disabled={sending}
              style={{ width: "100%", padding: "15px", borderRadius: "8px", border: "none",
                       background: "#4CAF50", color: "#1F1F20", fontSize: "16px", fontWeight: 700,
                       cursor: "pointer", opacity: sending ? 0.5 : 1 }}>
              {sending ? "Sending…" : "Done"}
            </button>
          </>
        )}
      </div>
    </Shell>
  );
};

export default JobPage;
