// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

const API = "https://api.longtermhire.com";

// The partner's own portal. Somebody with plant sitting idle who is not in the
// hire business — so this is not a management tool. Four tabs, five short steps
// to list a machine, and the money first on every card.

const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

const BLANK = {
  equipment_name: "", category_name: "", model: "", year_made: "",
  current_hours: "", last_service_date: "", attachments: "",
  insured_by: "", condition_notes: "", description: "", photos: [], docs: [],
  partner_price: "",
};

const STEPS = ["What is it", "How it has been treated", "Photos", "Paperwork", "The terms"];

const Field = ({ label, hint, value, onChange, ...rest }) => (
  <div className="mb-4">
    <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5]
                 text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]"
      {...rest} />
    {hint ? <p className="text-[#6B7280] font-[Inter] text-[12px] mt-1">{hint}</p> : null}
  </div>
);

const Area = ({ label, hint, value, onChange, rows = 3, ...rest }) => (
  <div className="mb-4">
    <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">{label}</label>
    <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5]
                 text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06] resize-y"
      {...rest} />
    {hint ? <p className="text-[#6B7280] font-[Inter] text-[12px] mt-1">{hint}</p> : null}
  </div>
);

// Declared out here on purpose. Inside the component it would be a new type on
// every render, so React would throw away the inputs and you would lose focus
// after every keystroke.
const Shell = ({ children }) => (
  <div className="min-h-screen bg-[#1A1A1B] p-4 sm:p-8">
    <div className="max-w-[820px] mx-auto">{children}</div>
  </div>
);

const PartnerPortal = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("plant");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(BLANK);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [draggingDoc, setDraggingDoc] = useState(false);
  // Updating a machine already listed - new hours, fresh photos, a renewed
  // certificate. None of that should need a phone call.
  const [updating, setUpdating] = useState(null);
  const [upd, setUpd] = useState({ current_hours: "", last_service_date: "",
                                   condition_notes: "", photos: [], docs: [],
                                   partner_price: "" });

  const sendUpdate = async () => {
    setSending(true);
    try {
      const res = await fetch(
        API + "/v1/api/longtermhire/partner/" + token + "/machine/" + updating.id,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(upd),
        }
      );
      const j = await res.json();
      if (j.error) throw new Error(j.message);
      toast.success("Thanks, that is updated");
      setUpdating(null);
      setUpd({ current_hours: "", last_service_date: "", condition_notes: "",
               photos: [], docs: [], partner_price: "" });
      load();
    } catch (e) {
      toast.error("That did not save. Give it another go.");
    } finally {
      setSending(false);
    }
  };
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    try {
      const res = await fetch(API + "/v1/api/longtermhire/partner/" + token);
      const j = await res.json();
      if (j.error) { setError(true); return; }
      setData(j.data);
    } catch (e) {
      setError(true);
    }
  };
  useEffect(() => { load(); }, [token]);

  // Half-finished listings survive a closed browser. A secretary doing this in
  // two sittings should not lose the first one.
  useEffect(() => {
    const saved = localStorage.getItem("partnerDraft:" + token);
    if (saved) { try { setForm(JSON.parse(saved)); } catch (e) {} }
  }, [token]);
  useEffect(() => {
    if (form.equipment_name || form.model) {
      localStorage.setItem("partnerDraft:" + token, JSON.stringify(form));
    }
  }, [form, token]);

  // Straight to S3 through our own endpoint - a partner has a token, not a
  // login, so this cannot go through the usual authenticated path.
  const addFiles = async (files, key = "photos", max = 6, imagesOnly = true,
                          setter = setForm, current = null) => {
    const target = current || form;
    const list = Array.from(files || []).filter(
      (f) => !imagesOnly || f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (!list.length) return;
    if (target[key].length + list.length > max) {
      toast.error("That is as many as we need");
      return;
    }
    setUploading(true);
    for (const file of list) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(file.name + " is over 10MB");
        continue;
      }
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(API + "/v1/api/longtermhire/partner/" + token + "/photo", {
          method: "POST",
          body,
        });
        const j = await res.json();
        if (j.error) throw new Error(j.message);
        setter((f) => ({ ...f, [key]: [...f[key], { url: j.data.url, name: j.data.name, type: j.data.type }] }));
      } catch (e) {
        toast.error(file.name + " would not upload");
      }
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.equipment_name) { toast.error("We need to know what it is"); return; }
    setSending(true);
    try {
      const res = await fetch(API + "/v1/api/longtermhire/partner/" + token + "/machine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (j.error) throw new Error(j.message);
      toast.success("Sent. We will come back to you shortly.");
      localStorage.removeItem("partnerDraft:" + token);
      setForm(BLANK);
      setStep(0);
      setTab("plant");
      load();
    } catch (e) {
      toast.error("That did not send. Give it another go, or ring us.");
    } finally {
      setSending(false);
    }
  };

  if (error) {
    return (
      <Shell>
        <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-6 mt-10 text-center">
          <p className="text-[#E5E5E5] font-[Inter] text-[18px]">This link is not valid</p>
          <p className="text-[#9CA3AF] font-[Inter] text-[14px] mt-2">
            Give Long Term Hire a ring and we will send you another one.
          </p>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return <Shell><p className="text-[#9CA3AF] font-[Inter] mt-10">Loading…</p></Shell>;
  }

  const machines = data.machines || [];
  const live = machines.filter((m) => m.partner_status === "approved");
  const earningNow = live.filter((m) => Number(m.on_hire) > 0);

  const TABS = [
    { key: "plant", label: "My plant" },
    { key: "add", label: "Add a machine" },
    { key: "earnings", label: "Earnings" },
  ];

  return (
    <Shell>
      <header className="mb-6 pb-5 border-b border-[#333]">
        <p className="text-[#6B7280] font-[Inter] text-[12px] uppercase tracking-[0.06em]">
          Long Term Hire
        </p>
        <h1 className="text-[#F2F0EA] font-[Inter] font-semibold text-[26px] sm:text-[30px] mt-1">
          {data.partner.business_name}
        </h1>
        <p className="text-[#9CA3AF] font-[Inter] text-[14px] mt-1">
          {machines.length === 0
            ? "Nothing listed yet. Add what is sitting in the yard."
            : earningNow.length > 0
            ? earningNow.length + (earningNow.length === 1 ? " machine" : " machines") + " out earning."
            : live.length + (live.length === 1 ? " machine" : " machines") + " listed, none out yet."}
        </p>
      </header>

      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={
              "px-4 py-2.5 rounded-lg font-[Inter] text-[14px] transition-colors " +
              (tab === t.key
                ? "bg-[#FDCE06] text-[#1A1A1B] font-semibold"
                : "bg-[#1F1F20] border border-[#333] text-[#9CA3AF] hover:border-[#FDCE06]")
            }>
            {t.label}
          </button>
        ))}
      </div>

      {updating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#1F1F20] border border-[#333] rounded-xl w-full max-w-[440px] my-8 p-5">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div>
                <p className="text-[#E5E5E5] font-[Inter] text-[18px] font-semibold">
                  {updating.equipment_name}
                </p>
                <p className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">
                  Anything you leave blank stays as it is
                </p>
              </div>
              <button onClick={() => setUpdating(null)}
                className="text-[#6B7280] hover:text-[#E5E5E5] text-[22px] leading-none flex-none">×</button>
            </div>

            <Field label="Hours now"
              hint={updating.current_hours ? "Last we knew, " + updating.current_hours : "Off the meter"}
              value={upd.current_hours} inputMode="numeric"
              onChange={(v) => setUpd({ ...upd, current_hours: v })} />

            <Field label="Last serviced" type="date"
              value={upd.last_service_date}
              onChange={(v) => setUpd({ ...upd, last_service_date: v })} />

            <Field label="What you want for it, per month"
              hint={updating.partner_price
                ? "Currently " + money(updating.partner_price)
                : "Before GST. Leave blank to keep it as it is."}
              value={upd.partner_price} inputMode="decimal"
              onChange={(v) => setUpd({ ...upd, partner_price: v })} />

            <Area label="Anything worth telling us"
              hint="A repair, a new attachment, something that has come up"
              value={upd.condition_notes}
              onChange={(v) => setUpd({ ...upd, condition_notes: v })} />

            <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">
              More photos
            </label>
            <div className="rounded-lg p-4 text-center mb-3 border border-dashed border-[#444] bg-[#292A2B]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files, "photos", 6, true, setUpd, upd);
              }}>
              <input id="upd-photos" type="file" accept="image/*" multiple className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  addFiles(e.target.files, "photos", 6, true, setUpd, upd);
                  e.target.value = "";
                }} />
              <label htmlFor="upd-photos"
                className="inline-block bg-[#292A2B] border border-[#FDCE06] text-[#FDCE06]
                           font-[Inter] font-semibold text-[14px] px-4 py-2.5 rounded-lg cursor-pointer">
                {uploading ? "Uploading…" : "+ Add photos"}
              </label>
            </div>

            {upd.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {upd.photos.map((p, i) => (
                  <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-[#292A2B] border border-[#333]">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">
              A renewed certificate
            </label>
            <div className="rounded-lg p-4 text-center mb-4 border border-dashed border-[#444] bg-[#292A2B]">
              <input id="upd-docs" type="file" accept="image/*,application/pdf" multiple
                className="hidden" disabled={uploading}
                onChange={(e) => {
                  addFiles(e.target.files, "docs", 6, true, setUpd, upd);
                  e.target.value = "";
                }} />
              <label htmlFor="upd-docs"
                className="inline-block text-[#9CA3AF] font-[Inter] text-[14px] underline cursor-pointer">
                {upd.docs.length > 0 ? upd.docs.length + " attached" : "Attach a document"}
              </label>
            </div>

            <div className="flex gap-2.5">
              <button onClick={sendUpdate} disabled={sending}
                className="flex-1 bg-[#4CAF50] text-[#1A1A1B] font-[Inter] font-bold text-[15px]
                           px-5 py-3 rounded-lg disabled:opacity-50">
                {sending ? "Saving…" : "Send it through"}
              </button>
              <button onClick={() => setUpdating(null)}
                className="px-5 py-3 rounded-lg border border-[#333] text-[#9CA3AF] font-[Inter] text-[15px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "plant" && (
        <div className="space-y-3">
          {machines.length === 0 ? (
            <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-6 text-center">
              <p className="text-[#E5E5E5] font-[Inter] text-[16px]">Nothing here yet</p>
              <p className="text-[#9CA3AF] font-[Inter] text-[14px] mt-1.5 mb-4">
                A machine sitting in the yard costs you rego, insurance and value.
                Listing one takes about ten minutes.
              </p>
              <button onClick={() => setTab("add")}
                className="bg-[#FDCE06] text-[#1A1A1B] font-[Inter] font-bold text-[15px] px-5 py-3 rounded-lg">
                Add a machine
              </button>
            </div>
          ) : machines.map((m) => {
            const out = Number(m.on_hire) > 0;
            return (
              <div key={m.id} className="bg-[#1F1F20] border border-[#333] rounded-xl p-5">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="text-[#E5E5E5] font-[Inter] text-[17px] font-semibold">
                      {m.equipment_name}
                    </p>
                    <p className="text-[#6B7280] font-[Inter] text-[12px] mt-0.5">
                      {[m.plant_code, m.category_name, m.year_made,
                        m.current_hours ? m.current_hours + " hrs" : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={
                    "px-3 py-1 rounded-full font-[Inter] text-[12px] font-medium flex-none " +
                    (out ? "bg-[#14352a] text-[#4CAF50]"
                      : m.partner_status === "approved" ? "bg-[#292A2B] text-[#9CA3AF]"
                      : m.partner_status === "declined" ? "bg-[#3d1a1a] text-[#ef4444]"
                      : "bg-[#3a2f14] text-[#F59E0B]")
                  }>
                    {out ? "Out earning"
                      : m.partner_status === "approved" ? "Listed, waiting"
                      : m.partner_status === "declined" ? "Not for us"
                      : "With us for review"}
                  </span>
                </div>

                {out && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-[#292A2B] rounded-lg px-3 py-2.5">
                      <p className="text-[#6B7280] font-[Inter] text-[11px] uppercase tracking-[0.05em]">
                        This month
                      </p>
                      <p className="text-[#FDCE06] font-mono text-[17px] mt-0.5">
                        {money(m.base_price)}
                      </p>
                    </div>
                    <div className="bg-[#292A2B] rounded-lg px-3 py-2.5">
                      <p className="text-[#6B7280] font-[Inter] text-[11px] uppercase tracking-[0.05em]">
                        Hours now
                      </p>
                      <p className="text-[#E5E5E5] font-mono text-[17px] mt-0.5">
                        {m.current_hours || "—"}
                      </p>
                    </div>
                    <div className="bg-[#292A2B] rounded-lg px-3 py-2.5">
                      <p className="text-[#6B7280] font-[Inter] text-[11px] uppercase tracking-[0.05em]">
                        Last service
                      </p>
                      <p className="text-[#E5E5E5] font-mono text-[17px] mt-0.5">
                        {m.last_service_date
                          ? new Date(m.last_service_date).toLocaleDateString("en-AU",
                              { day: "numeric", month: "short" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                )}

                {m.partner_status === "pending" && (
                  <p className="text-[#9CA3AF] font-[Inter] text-[13px] mt-1">
                    We are looking at it. Nothing more needed from you for now.
                  </p>
                )}

                <button onClick={() => setUpdating(m)}
                  className="text-[#FDCE06] font-[Inter] text-[13px] hover:underline mt-3">
                  Update hours or add photos
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "add" && (
        <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-5 sm:p-6">
          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] rounded"
                style={{ background: i <= step ? "#FDCE06" : "#3A3A3C" }} />
            ))}
          </div>
          <p className="text-[#6B7280] font-[Inter] text-[12px]">
            Step {step + 1} of {STEPS.length}
          </p>
          <p className="text-[#E5E5E5] font-[Inter] text-[19px] font-semibold mb-4">
            {STEPS[step]}
          </p>

          {step === 0 && (
            <>
              <Field label="What is it" hint="However you would describe it to somebody"
                value={form.equipment_name} onChange={set("equipment_name")}
                placeholder="Kubota U55-4 excavator" />
              <div className="mb-4">
                <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">
                  What sort of machine
                </label>
                <select value={form.category_name} onChange={(e) => set("category_name")(e.target.value)}
                  className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5]
                             text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]">
                  <option value="">Pick one</option>
                  {(data.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Model" value={form.model} onChange={set("model")} />
                <Field label="Year" value={form.year_made} onChange={set("year_made")}
                  inputMode="numeric" placeholder="2019" />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Hours on it" hint="Off the meter, near enough is fine"
                value={form.current_hours} onChange={set("current_hours")} inputMode="numeric" />
              <Field label="Last serviced" hint="Roughly when, if you know"
                value={form.last_service_date} onChange={set("last_service_date")}
                type="date" />
              <Field label="What comes with it"
                hint="Buckets, hitches, anything that goes on the truck with it"
                value={form.attachments} onChange={set("attachments")}
                placeholder="600mm bucket, mud bucket, ripper" />
              <Area label="Anything not right"
                hint="Better we know now than a client finds out on site"
                value={form.condition_notes} onChange={set("condition_notes")}
                placeholder="Slight weep on the boom ram, aircon is average" />
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[#9CA3AF] font-[Inter] text-[14px] mb-4">
                Four is plenty. Front, back, in the cab, and the hour meter — that
                last one saves an argument later.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files, "photos", 6);
                }}
                className={
                  "rounded-lg p-6 text-center mb-4 border border-dashed transition-colors " +
                  (dragging ? "border-[#FDCE06] bg-[#2E2A18]" : "border-[#444] bg-[#292A2B]")
                }>
                <input id="partner-photos" type="file" accept="image/*" multiple
                  className="hidden" disabled={uploading}
                  onChange={(e) => { addFiles(e.target.files, "photos", 6); e.target.value = ""; }} />
                <label htmlFor="partner-photos"
                  className="inline-block bg-[#FDCE06] text-[#1A1A1B] font-[Inter] font-bold
                             text-[15px] px-5 py-3 rounded-lg cursor-pointer">
                  {uploading ? "Uploading…" : "+ Add photos"}
                </label>
                <p className="text-[#6B7280] font-[Inter] text-[13px] mt-3">
                  Or drag them in from a folder. Straight off a phone is fine.
                </p>
              </div>

              {form.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                  {form.photos.map((p, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden bg-[#292A2B]
                                            border border-[#333] aspect-[4/3]">
                      <img src={p.url} alt={"Photo " + (i + 1)}
                        className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm((f) => ({
                          ...f, photos: f.photos.filter((_, k) => k !== i),
                        }))}
                        aria-label="Remove this photo"
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70
                                   text-[#E5E5E5] text-[16px] leading-none">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[#6B7280] font-[Inter] text-[12px] mb-1">
                {form.photos.length} of 6
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Who insures it"
                hint="Yours stays in place. We need to know who to talk to."
                value={form.insured_by} onChange={set("insured_by")}
                placeholder="CGU, policy through Smith Brokers" />

              <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">
                Certificate of currency
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDraggingDoc(true); }}
                onDragLeave={() => setDraggingDoc(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingDoc(false);
                  addFiles(e.dataTransfer.files, "docs", 4);
                }}
                className={
                  "rounded-lg p-5 text-center mb-3 border border-dashed transition-colors " +
                  (draggingDoc ? "border-[#FDCE06] bg-[#2E2A18]" : "border-[#444] bg-[#292A2B]")
                }>
                <input id="partner-docs" type="file" accept="image/*,application/pdf" multiple
                  className="hidden" disabled={uploading}
                  onChange={(e) => { addFiles(e.target.files, "docs", 4); e.target.value = ""; }} />
                <label htmlFor="partner-docs"
                  className="inline-block bg-[#292A2B] border border-[#FDCE06] text-[#FDCE06]
                             font-[Inter] font-semibold text-[14px] px-4 py-2.5 rounded-lg cursor-pointer">
                  {uploading ? "Uploading…" : "+ Add the certificate"}
                </label>
                <p className="text-[#6B7280] font-[Inter] text-[12.5px] mt-2.5">
                  A PDF or a photo of it. Manuals and service books can go here too.
                </p>
              </div>

              {form.docs.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  {form.docs.map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 bg-[#292A2B]
                                            border border-[#333] rounded-lg px-3 py-2.5">
                      <a href={d.url} target="_blank" rel="noreferrer"
                        className="text-[#E5E5E5] font-[Inter] text-[14px] truncate hover:text-[#FDCE06]">
                        {d.name || "Document"}
                      </a>
                      <button
                        onClick={() => setForm((f) => ({
                          ...f, docs: f.docs.filter((_, k) => k !== i),
                        }))}
                        aria-label="Remove"
                        className="text-[#6B7280] hover:text-[#ef4444] text-[16px] flex-none">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Area label="Anything else worth knowing"
                hint="Manuals, service books, quirks a new operator should know"
                value={form.description} onChange={set("description")} rows={4} />
            </>
          )}

          {step === 4 && (
            <>
            <Field label="What you want for it, per month"
              hint="Before GST. What you would be happy to receive while it is out."
              value={form.partner_price} onChange={set("partner_price")}
              inputMode="decimal" placeholder="2400" />
            <p className="text-[#6B7280] font-[Inter] text-[12.5px] -mt-2 mb-4">
              We add our margin on top when we quote a client, so this is what
              comes to you. Tell us a figure and we will say if it works.
            </p>

            <div className="bg-[#292A2B] border border-[#333] rounded-lg p-4 mb-4">
              <p className="text-[#E5E5E5] font-[Inter] text-[15px] font-semibold mb-3">
                How it works
              </p>
              <ul className="text-[#9CA3AF] font-[Inter] text-[14px] leading-relaxed space-y-2 list-disc pl-5">
                <li>We find the client, write the contract and do the invoicing.</li>
                <li>You are paid monthly for as long as it is out.</li>
                <li>We service it on time and you can see the record here.</li>
                <li>Faults are handled by us. You are told what happened and what it cost.</li>
                <li>Minimum three months once it goes out, then a month's notice either way.</li>
              </ul>
              <p className="text-[#6B7280] font-[Inter] text-[12.5px] mt-4">
                Nothing is committed by sending this. We will come back to you with
                what we think it will earn before anything goes anywhere.
              </p>
            </div>
            </>
          )}

          <div className="flex gap-2.5 mt-5">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)}
                className="px-5 py-3 rounded-lg border border-[#333] text-[#9CA3AF] font-[Inter] text-[15px]">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)}
                className="flex-1 bg-[#FDCE06] text-[#1A1A1B] font-[Inter] font-bold text-[15px]
                           px-5 py-3 rounded-lg">
                Next
              </button>
            ) : (
              <button onClick={submit} disabled={sending}
                className="flex-1 bg-[#4CAF50] text-[#1A1A1B] font-[Inter] font-bold text-[15px]
                           px-5 py-3 rounded-lg disabled:opacity-50">
                {sending ? "Sending…" : "Send it to Long Term Hire"}
              </button>
            )}
          </div>
          <p className="text-[#6B7280] font-[Inter] text-[12px] mt-3 text-center">
            Half-finished is fine — it is saved on this device until you come back.
          </p>
        </div>
      )}

      {tab === "earnings" && (
        <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-6">
          <p className="text-[#E5E5E5] font-[Inter] text-[16px] font-semibold mb-1">Earnings</p>
          <p className="text-[#9CA3AF] font-[Inter] text-[14px]">
            {earningNow.length === 0
              ? "Nothing out yet. Once a machine is on hire this is where you will see what it has earned and when you are paid."
              : "Statements are coming shortly. For now, ring us any time and we will tell you where everything stands."}
          </p>
        </div>
      )}
    </Shell>
  );
};

export default PartnerPortal;
