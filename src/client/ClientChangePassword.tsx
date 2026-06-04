// @ts-nocheck
import React, { useState } from "react";
import { clientProfileApi } from "../services/clientProfileApi";
import { toast } from "react-toastify";

const ClientChangePassword = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (form.new_password !== form.confirm_password) { toast.error("Passwords do not match"); return; }
    if (form.new_password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await clientProfileApi.updateProfile({ current_password: form.current_password, new_password: form.new_password });
      if (!res.error) { toast.success("Password updated successfully"); setForm({ current_password: "", new_password: "", confirm_password: "" }); onClose?.(); }
      else toast.error(res.message || "Failed to update password");
    } catch (e) { toast.error("Failed to update password"); } finally { setLoading(false); }
  };

  if (isOpen === false) return null;
  const inp = "w-full bg-[#292A2B] border border-[#333] rounded-md text-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#FDCE06]";
  const lbl = "block text-[#9CA3AF] text-xs mb-1";

  return (
    <div className="bg-[#1F1F20] border border-[#333] rounded-xl p-6 max-w-md">
      <h3 className="text-[#E5E5E5] font-bold text-lg mb-4">Change Password</h3>
      <div className="space-y-3">
        {[["Current Password","current_password"],["New Password","new_password"],["Confirm New Password","confirm_password"]].map(([l, k]) => (
          <div key={k}><label className={lbl}>{l}</label><input type="password" className={inp} value={form[k]} onChange={e => setForm(p => ({...p, [k]: e.target.value}))} /></div>
        ))}
      </div>
      <button onClick={handleSubmit} disabled={loading} className="mt-4 w-full py-2 bg-[#FDCE06] text-black rounded-md font-bold text-sm disabled:opacity-50">{loading ? "Updating..." : "Update Password"}</button>
    </div>
  );
};
export default ClientChangePassword;
