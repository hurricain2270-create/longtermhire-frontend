// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "./services/api";
import { BTN } from "./styles/buttons";

// People with plant sitting idle who are not in the hire business themselves.
// They list it, we approve it, and from then on a client cannot tell the
// difference. We always can — quoting a machine we cannot actually deliver
// would be the worst mistake this system could make.

const EMPTY = {
  business_name: "", contact_name: "", email: "", phone: "", abn: "",
  street: "", suburb: "", state: "", postcode: "", notes: "",
};

const Field = ({ label, value, onChange, placeholder, hint, ...rest }) => (
  <div>
    <label className="block text-[#9CA3AF] font-[Inter] text-[13px] mb-1.5">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#292A2B] border border-[#333333] rounded-lg text-[#E5E5E5]
                 text-[16px] px-3.5 py-3 outline-none focus:border-[#FDCE06]"
      {...rest}
    />
    {hint ? <p className="text-[#6B7280] font-[Inter] text-[11px] mt-1">{hint}</p> : null}
  </div>
);

const Partners = () => {
  const [data, setData] = useState({ partners: [], machines: [] });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [openPartner, setOpenPartner] = useState(null);

  const load = async () => {
    try {
      const res = await api.get("/v1/api/longtermhire/super_admin/partners");
      if (res?.data && !res.data.error) setData(res.data.data);
    } catch (e) {
      console.error("Could not load partners:", e);
      toast.error("Could not load the partners");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.business_name || !form.email) {
      toast.error("A business name and an email are needed");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/v1/api/longtermhire/super_admin/partners", form);
      if (res?.data?.error) throw new Error();
      toast.success(res.data.data.sent ? "Partner added and invited" : "Partner added, but the email did not go");
      setForm(EMPTY);
      setAdding(false);
      load();
    } catch (e) {
      toast.error("Could not save that");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (machineId, status, name) => {
    if (status === "approved" &&
        !window.confirm("Approve " + name + "?\n\nIt goes live to clients straight away.")) return;
    try {
      await api.put("/v1/api/longtermhire/super_admin/partner-machine/" + machineId,
                    { partner_status: status });
      toast.success(status === "approved" ? name + " is live" : "Saved");
      load();
    } catch (e) {
      toast.error("Could not save that");
    }
  };

  const machinesOf = (partnerId) =>
    (data.machines || []).filter((m) => m.owner_partner_id === partnerId);

  const pendingAll = (data.machines || []).filter((m) => m.partner_status === "pending");

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      <header className="mb-6">
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[28px] sm:text-[36px] leading-tight">
          Partners
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Plant that belongs to somebody else. Once approved a client cannot tell
          the difference — but everywhere we look, it is marked.
        </p>
      </header>

      {/* Partner machines carry a purple edge everywhere they appear to us. */}
      <div className="bg-[#1F1F20] border-l-[3px] border-l-[#7F77DD] border border-[#333333]
                      rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#7F77DD] flex-none" />
        <p className="text-[#9CA3AF] font-[Inter] text-[13px]">
          This purple edge means a machine is not ours. Look for it before quoting
          or committing a hire.
        </p>
      </div>

      {!adding && (
        <button onClick={() => setAdding(true)} className={BTN.primaryLg + " mb-6"}>
          + Add a partner
        </button>
      )}

      {adding && (
        <section className="bg-[#1F1F20] border border-[#333333] rounded-xl p-5 mb-6 max-w-[560px]">
          <h2 className="text-[#E5E5E5] font-[Inter] text-[18px] font-semibold mb-1">
            Add a partner
          </h2>
          <p className="text-[#9CA3AF] font-[Inter] text-[13px] mb-4">
            They get a link to their own portal. No login to remember.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Field label="Business" value={form.business_name}
              onChange={(v) => setForm({ ...form, business_name: v })}
              placeholder="Bradley Earthworks" />
            <Field label="Contact" value={form.contact_name}
              onChange={(v) => setForm({ ...form, contact_name: v })} placeholder="Dan" />
            <Field label="Email" value={form.email} inputMode="email"
              onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Phone" value={form.phone} inputMode="tel"
              onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="ABN" value={form.abn} inputMode="numeric"
              onChange={(v) => setForm({ ...form, abn: v })} hint="If handy" />
            <Field label="Number and street" value={form.street}
              onChange={(v) => setForm({ ...form, street: v })} />
            <Field label="Suburb or town" value={form.suburb}
              onChange={(v) => setForm({ ...form, suburb: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="State" value={form.state}
                onChange={(v) => setForm({ ...form, state: v })} placeholder="QLD" />
              <Field label="Postcode" value={form.postcode} inputMode="numeric"
                onChange={(v) => setForm({ ...form, postcode: v })} />
            </div>
          </div>
          <Field label="Notes" value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
            placeholder="How we know them, anything worth remembering" />

          <div className="flex gap-2.5 mt-5">
            <button onClick={save} disabled={saving} className={BTN.success + " flex-1"}>
              {saving ? "Saving…" : "Add and send the link"}
            </button>
            <button onClick={() => setAdding(false)} className={BTN.secondary}>Cancel</button>
          </div>
        </section>
      )}

      {pendingAll.length > 0 && (
        <section className="bg-[#1F1F20] border-l-[3px] border-l-[#F59E0B] border border-[#333333]
                            rounded-xl p-5 mb-6">
          <p className="text-[#F59E0B] font-[Inter] text-[12px] uppercase tracking-[0.06em] mb-3">
            Waiting on you · {pendingAll.length}
          </p>
          {pendingAll.map((m) => (
            <div key={m.id} className="flex flex-wrap justify-between items-center gap-3 py-2.5
                                       border-b border-[#2a2a2a] last:border-0">
              <div>
                <p className="text-[#E5E5E5] font-[Inter] text-[15px]">
                  <span className="text-[#7F77DD] font-mono text-[13px]">{m.plant_code}</span>{" "}
                  {m.equipment_name}
                </p>
                <p className="text-[#6B7280] font-[Inter] text-[12px]">
                  {m.owner}{m.category_name ? " · " + m.category_name : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStatus(m.id, "approved", m.equipment_name)}
                  className={BTN.successSm}>Approve</button>
                <button onClick={() => setStatus(m.id, "declined", m.equipment_name)}
                  className={BTN.secondarySm}>Not for us</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <p className="text-[#9CA3AF] font-[Inter] text-[14px]">Loading…</p>
      ) : (data.partners || []).length === 0 ? (
        <p className="text-[#9CA3AF] font-[Inter] text-[14px]">
          No partners yet. Add one and they get a link to list their plant.
        </p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {data.partners.map((p) => {
            const mine = machinesOf(p.id);
            const isOpen = openPartner === p.id;
            return (
              <section key={p.id}
                className="bg-[#1F1F20] border-l-[3px] border-l-[#7F77DD] border border-[#333333] rounded-xl p-5">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <h3 className="text-[#E5E5E5] font-[Inter] text-[17px] font-semibold">
                      {p.business_name}
                    </h3>
                    <p className="text-[#9CA3AF] font-[Inter] text-[13px] mt-0.5">
                      {[p.contact_name, p.phone, p.email].filter(Boolean).join(" · ")}
                    </p>
                    {p.street || p.suburb ? (
                      <p className="text-[#6B7280] font-[Inter] text-[12px]">
                        {[p.street, p.suburb, p.state, p.postcode].filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#292A2B] border border-[#333]
                                   text-[#9CA3AF] font-[Inter] text-[12px] flex-none">
                    {mine.length} {mine.length === 1 ? "machine" : "machines"}
                  </span>
                </div>

                {p.notes ? (
                  <p className="text-[#6B7280] font-[Inter] text-[13px] mb-2">{p.notes}</p>
                ) : null}

                <div className="flex items-center gap-2 mt-2">
                  <a href={"https://www.longtermhire.com/partner/" + p.token}
                    target="_blank" rel="noreferrer"
                    className="text-[#FDCE06] font-[Inter] text-[13px] hover:underline">
                    Open their portal
                  </a>
                  <button
                    onClick={() => {
                      const link = "https://www.longtermhire.com/partner/" + p.token;
                      navigator.clipboard?.writeText(link);
                      toast.success("Link copied");
                    }}
                    className="text-[#6B7280] font-[Inter] text-[13px] hover:text-[#9CA3AF]">
                    copy link
                  </button>
                </div>

                <div className="border-t border-[#2a2a2a] mt-3 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#9CA3AF] font-[Inter] text-[13px]">
                      {Number(p.pending) > 0
                        ? Number(p.pending) + " waiting on approval"
                        : mine.length > 0 ? "All approved" : "Nothing listed yet"}
                    </span>
                    {mine.length > 0 && (
                      <button onClick={() => setOpenPartner(isOpen ? null : p.id)}
                        className="text-[#FDCE06] font-[Inter] text-[13px] hover:underline">
                        {isOpen ? "Hide" : "View plant"}
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 space-y-1.5">
                      {mine.map((m) => (
                        <div key={m.id} className="flex justify-between items-center gap-3
                                                   bg-[#292A2B] rounded-lg px-3 py-2">
                          <div>
                            <p className="text-[#E5E5E5] font-[Inter] text-[14px]">
                              <span className="text-[#7F77DD] font-mono text-[12px]">{m.plant_code}</span>{" "}
                              {m.equipment_name}
                            </p>
                            <p className="text-[#6B7280] font-[Inter] text-[12px]">
                              {m.category_name || "No category"}
                              {m.base_price ? " · $" + Number(m.base_price).toLocaleString("en-AU") : ""}
                            </p>
                          </div>
                          <span className={
                            "px-2.5 py-1 rounded-full font-[Inter] text-[12px] flex-none " +
                            (m.partner_status === "approved" ? "bg-[#14352a] text-[#4CAF50]"
                              : m.partner_status === "declined" ? "bg-[#3d1a1a] text-[#ef4444]"
                              : "bg-[#3a2f14] text-[#F59E0B]")
                          }>
                            {m.partner_status === "approved" ? "Live"
                              : m.partner_status === "declined" ? "Declined" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Partners;
