import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ClipLoader from "react-spinners/ClipLoader";
import { pdf, PDFViewer } from "@react-pdf/renderer";
import QuotePDF from "./components/QuotePDF";
import { quoteApi } from "./services/quoteApi";
import { clientApi } from "./services/clientApi";
import { settingsApi } from "./services/settingsApi";

const QuoteManagement = () => {
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [previewQuote, setPreviewQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientsRes, quotesRes] = await Promise.all([
        clientApi.getClients(),
        quoteApi.getQuotes(1, 50, {}),
      ]);

      if (clientsRes && !clientsRes.error) {
        const clientList = Array.isArray(clientsRes) ? clientsRes : (clientsRes.data || []);
        setClients(clientList);
      }

      if (quotesRes && !quotesRes.error && quotesRes.data) {
        const mapped = quotesRes.data.map((q) => ({
          id: q.id,
          quoteId: q.quote_id,
          companyName: q.company_name || "",
          companyAddress: q.company_address || "",
          companyEmail: q.company_email || "",
          companyLogo: q.company_logo || null,
          gstPercentage: q.gst_percentage?.toString() || "10",
          termsOfHire: q.terms_of_hire || "",
          quoteExpiresAfter: q.quote_expires_after?.toString() || "7",
          produceQuoteFor: q.produce_quote_for?.toString() || "12",
          equipmentName: q.equipment_name || "",
          equipmentId: q.equipment_id || "",
          basePrice: parseFloat(q.base_price || 0),
          discount: parseFloat(q.discount || 0),
          discountType: q.discount_type || "%",
          compoundingDiscount: parseFloat(q.compounding_discount || 0),
          compoundingDiscountType: q.compounding_discount_type || "%",
          createdDate: q.created_at ? new Date(q.created_at).toLocaleDateString("en-AU") : "",
          status: q.status || "Active",
        }));
        setQuotes(mapped);
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (client) => {
    const existing = quotes.find(
      (q) => q.companyName?.toLowerCase() === client.company_name?.toLowerCase()
    );
    setEditingClient(client);
    setEditForm({
      produceQuoteFor: existing?.produceQuoteFor || "12",
      quoteExpiresAfter: existing?.quoteExpiresAfter || "7",
      termsOfHire: existing?.termsOfHire || "",
    });
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const existing = quotes.find(
        (q) => q.companyName?.toLowerCase() === editingClient.company_name?.toLowerCase()
      );
      const payload = {
        company_id: editingClient.company_id || null,
        client_user_id: editingClient.user_id,
        company_name: editingClient.company_name,
        company_address: editingClient.address || "",
        company_email: editingClient.email || "",
        gst_percentage: 10,
        terms_of_hire: editForm.termsOfHire,
        quote_expires_after: parseInt(editForm.quoteExpiresAfter) || 7,
        produce_quote_for: parseInt(editForm.produceQuoteFor) || 12,
        status: "Active",
      };
      if (existing) {
        await quoteApi.updateQuote(existing.id, payload);
      } else {
        await quoteApi.createQuote(payload);
      }
      toast.success("Template saved");
      setEditingClient(null);
      loadAll();
    } catch (err) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (quote) => {
    try {
      let adminSettings = null;
      try {
        const settingsRes = await settingsApi.getSettings();
        if (!settingsRes.error && settingsRes.data) adminSettings = settingsRes.data;
      } catch (e) {}
      setPreviewData({
        company_name: quote.companyName,
        company_address: quote.companyAddress,
        company_email: quote.companyEmail,
        company_logo: quote.companyLogo,
        gst_percentage: quote.gstPercentage,
        terms_of_hire: quote.termsOfHire,
        quote_id: quote.quoteId,
        quote_expires_after: quote.quoteExpiresAfter,
        produce_quote_for: quote.produceQuoteFor,
        created_at: quote.createdDate,
        admin_company_name: adminSettings?.company_name || "Long Term Hire Pty Ltd",
        admin_company_address: adminSettings?.company_address || "PO Box 4089 MOUNT ELIZA VIC 3930 AUSTRALIA",
        admin_company_logo: adminSettings?.company_logo || null,
        equipmentData: {
          id: quote.equipmentId || "001",
          description: quote.equipmentName || "Equipment",
          basePrice: quote.basePrice || 0,
          discount: quote.discount || 0,
          discount_type: quote.discountType || "%",
          compounding_discount: quote.compoundingDiscount || 0,
          compounding_discount_type: quote.compoundingDiscountType || "%",
        },
      });
      setPreviewQuote(quote);
    } catch (e) {
      toast.error("Failed to load preview");
    }
  };

  const handleTemplatePreview = async (client) => {
    try {
      const tmpl = getClientTemplate(client);
      let adminSettings = null;
      try {
        const settingsRes = await settingsApi.getSettings();
        if (!settingsRes.error && settingsRes.data) adminSettings = settingsRes.data;
      } catch (e) {}
      setPreviewData({
        company_name: client.company_name,
        company_address: client.address || "",
        company_email: client.email || "",
        company_logo: client.company_logo || null,
        gst_percentage: "10",
        terms_of_hire: tmpl?.termsOfHire || "",
        quote_id: "PREVIEW",
        quote_expires_after: tmpl?.quoteExpiresAfter || "7",
        produce_quote_for: tmpl?.produceQuoteFor || "12",
        created_at: new Date().toLocaleDateString("en-AU"),
        admin_company_name: adminSettings?.company_name || "Long Term Hire Pty Ltd",
        admin_company_address: adminSettings?.company_address || "PO Box 4089 MOUNT ELIZA VIC 3930 AUSTRALIA",
        admin_company_logo: adminSettings?.company_logo || null,
        equipmentData: {
          id: "—",
          description: "Equipment description will appear here",
          basePrice: 0,
          discount: 0,
          discount_type: "%",
          compounding_discount: 0,
          compounding_discount_type: "%",
        },
      });
      setPreviewQuote({ quoteId: "Template preview — " + client.company_name });
    } catch (e) {
      toast.error("Failed to load preview");
    }
  };

  const handleDeleteQuote = async (quoteId, id) => {
    if (!window.confirm(`Delete quote ${quoteId}?`)) return;
    try {
      await quoteApi.deleteQuote(id);
      toast.success("Quote deleted");
      loadAll();
    } catch (e) {
      toast.error("Failed to delete quote");
    }
  };

  const getClientTemplate = (client) => {
    return quotes.find(
      (q) => q.companyName?.toLowerCase() === client.company_name?.toLowerCase() && !q.equipmentName
    );
  };

  const receivedQuotes = quotes.filter((q) => q.equipmentName);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ClipLoader color="#FDCE06" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-[36px] leading-[1.11em] mb-6">Quote Management</h1>

      {/* Section 1: Client Quote Templates */}
      <div className="mb-10">
        <h2 className="text-[#E5E5E5] text-lg font-semibold mb-1">Client quote templates</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">Set terms and conditions per client. Clients generate their own quotes from the equipment portal.</p>
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-1/5">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-1/8">Hire duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-1/8">Quote expiry</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-16">GST</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">Terms</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF] w-28"></th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#9CA3AF] text-sm">No clients yet</td></tr>
              ) : clients.map((client, i) => {
                const tmpl = getClientTemplate(client);
                return (
                  <tr key={client.id || i} className="border-b border-[#2A2A2A] last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-[#FDCE06] text-sm font-medium">{client.company_name}</div>
                      <div className="text-[#9CA3AF] text-xs">{client.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#E5E5E5]">{tmpl ? `${tmpl.produceQuoteFor} months` : <span className="text-[#666]">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-[#E5E5E5]">{tmpl ? `${tmpl.quoteExpiresAfter} days` : <span className="text-[#666]">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-[#666]">10%</td>
                    <td className="px-4 py-3 text-sm text-[#9CA3AF] truncate max-w-xs">{tmpl?.termsOfHire ? tmpl.termsOfHire.substring(0, 60) + "…" : <span className="text-[#666]">No template set</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleTemplatePreview(client)}
                          className="px-3 py-1.5 border border-[#4CAF50] rounded bg-[#4CAF50] text-[#1F1F20] font-[Inter] font-bold text-[14px] leading-[1.43em] hover:bg-[#3d9e43] transition-colors"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => openEdit(client)}
                          className="px-3 py-1.5 border border-[#FDCE06] rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[14px] leading-[1.43em] hover:bg-[#E5B800] transition-colors"
                        >
                          Edit Template
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Quotes Received */}
      <div>
        <h2 className="text-[#E5E5E5] text-lg font-semibold mb-1">Quotes received</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">Quotes generated by clients from the equipment portal.</p>
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333333]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-36">Quote no.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-1/5">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF]">Equipment</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF] w-28">Base price</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#9CA3AF] w-28">Date sent</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#9CA3AF] w-36"></th>
              </tr>
            </thead>
            <tbody>
              {receivedQuotes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#9CA3AF] text-sm">No quotes received yet</td></tr>
              ) : receivedQuotes.map((quote, i) => (
                <tr key={quote.id || i} className="border-b border-[#2A2A2A] last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-[#FDCE06]">{quote.quoteId}</td>
                  <td className="px-4 py-3 text-sm text-[#FDCE06] font-medium">{quote.companyName}</td>
                  <td className="px-4 py-3 text-sm text-[#E5E5E5]">{quote.equipmentName}</td>
                  <td className="px-4 py-3 text-sm text-[#E5E5E5] text-right">${quote.basePrice.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-[#9CA3AF]">{quote.createdDate}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handlePreview(quote)}
                        className="text-xs px-3 py-1.5 border border-[#4CAF50] rounded text-[#4CAF50] hover:bg-[#4CAF50]/10 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDeleteQuote(quote.quoteId, quote.id)}
                        className="text-xs px-3 py-1.5 border border-[#ef4444] rounded text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Template Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-lg">
            <div className="p-5 border-b border-[#333] flex items-center justify-between">
              <h3 className="text-[#E5E5E5] font-semibold">Edit template — {editingClient.company_name}</h3>
              <button onClick={() => setEditingClient(null)} className="text-[#9CA3AF] hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#9CA3AF] text-xs mb-1 block">Hire duration (months)</label>
                  <input
                    type="number"
                    value={editForm.produceQuoteFor}
                    onChange={(e) => setEditForm({ ...editForm, produceQuoteFor: e.target.value })}
                    className="w-full bg-[#292A2B] border border-[#333] rounded px-3 py-2 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06]"
                  />
                </div>
                <div>
                  <label className="text-[#9CA3AF] text-xs mb-1 block">Quote expiry (days)</label>
                  <input
                    type="number"
                    value={editForm.quoteExpiresAfter}
                    onChange={(e) => setEditForm({ ...editForm, quoteExpiresAfter: e.target.value })}
                    className="w-full bg-[#292A2B] border border-[#333] rounded px-3 py-2 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">GST</label>
                <input
                  type="text"
                  value="10%"
                  disabled
                  className="w-full bg-[#1a1a1a] border border-[#222] rounded px-3 py-2 text-[#666] text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Terms of hire</label>
                <textarea
                  value={editForm.termsOfHire}
                  onChange={(e) => setEditForm({ ...editForm, termsOfHire: e.target.value })}
                  rows={6}
                  className="w-full bg-[#292A2B] border border-[#333] rounded px-3 py-2 text-[#E5E5E5] text-sm outline-none focus:border-[#FDCE06] resize-none"
                  placeholder="Enter terms and conditions for this client..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-[#333] flex justify-end gap-3">
              <button onClick={() => setEditingClient(null)} className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-white">Cancel</button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#FDCE06] text-[#1F1F20] rounded font-semibold hover:bg-[#E5B800] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-[#1F1F20] border border-[#333] rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#333] flex items-center justify-between">
              <h3 className="text-[#E5E5E5] font-semibold">Quote preview — {previewQuote?.quoteId}</h3>
              <button onClick={() => { setPreviewData(null); setPreviewQuote(null); }} className="text-[#9CA3AF] hover:text-white text-xl">✕</button>
            </div>
            <div className="flex-1 bg-[#525659]">
              <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
                <QuotePDF quoteData={previewData} />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
};

export default QuoteManagement;
