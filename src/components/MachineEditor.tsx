// @ts-nocheck
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import { equipmentApi } from "../services/equipmentApi";
import { contentApi } from "../services/contentApi";
import { BTN } from "../styles/buttons";
import EquipmentCard from "../client/components/EquipmentCard";

const LBL = "block text-[#9CA3AF] font-[Inter] text-[15px] mb-1.5";
const FLD =
  "w-full bg-[#292A2B] border border-[#333333] rounded-md text-[#E5E5E5] font-[Inter] text-[17px] px-3.5 py-2.5 outline-none focus:border-[#FDCE06] transition-colors";

const parseSpecs = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : p ? [p] : [];
  } catch (e) {
    return String(raw).trim() ? [String(raw).trim()] : [];
  }
};
const fileNameOf = (s) => {
  const v = typeof s === "string" ? s : s?.url || s?.image_url || "";
  return v.split("/").pop() || "document.pdf";
};
const urlOf = (s) => (typeof s === "string" ? s : s?.url || s?.image_url || "");

const MachineEditor = ({
  machine,
  content,
  categories = [],
  onHire = false,
  index = 0,
  total = 0,
  onPrev,
  onNext,
  onBack,
  onSaved,
}) => {
  const [form, setForm] = useState({
    equipmentName: "",
    equipmentId: "",
    categoryId: "",
    basePrice: "",
    minimumDuration: "",
    description: "",
  });
  const [photos, setPhotos] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState(false);

  useEffect(() => {
    if (!machine) return;
    setForm({
      equipmentName: machine.equipment_name || "",
      equipmentId: machine.equipment_id || "",
      categoryId: machine.category_id || "",
      basePrice: machine.base_price ?? "",
      minimumDuration: machine.minimum_duration ?? "",
      description: (content && content.description) || "",
    });
    const imgs =
      content && Array.isArray(content.images) && content.images.length
        ? content.images
        : content && content.image_url
        ? [{ id: "legacy", image_url: content.image_url, is_main: 1 }]
        : [];
    setPhotos(imgs);
    setSpecs(parseSpecs(machine.specs_files));
  }, [machine, content]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const mainIdx = Math.max(
    0,
    photos.findIndex((p) => p.is_main === 1 || p.is_main === true)
  );
  const [shown, setShown] = useState(0);
  useEffect(() => setShown(mainIdx), [machine, photos.length]);

  // Photos live on the content record, so one has to exist before we can
  // attach anything. Creating it is harmless, so do it quietly when needed.
  const ensureContent = async () => {
    if (content && content.id) return content.id;
    const res = await contentApi.addContent({
      equipment_id: machine.id,
      equipment_name: form.equipmentName || machine.equipment_name,
      description: form.description || "",
      banner_description: "",
      image_url: "",
    });
    const newId = res?.data?.id || res?.id;
    if (!newId) throw new Error("could not create a content record");
    return newId;
  };

  const addPhotos = async (files) => {
    const list = Array.from(files || []).filter(
      (f) => !f.type || f.type.startsWith("image/")
    );
    if (!list.length) return;
    setBusyPhoto(true);
    try {
      const contentId = await ensureContent();
      for (const file of list) {
        const up = await equipmentApi.uploadFile(file);
        if (!up?.url) throw new Error("upload failed");
        await contentApi.addImage(contentId, {
          image_url: up.url,
          is_main: photos.length === 0 ? 1 : 0,
        });
      }
      toast.success(list.length === 1 ? "Photo added" : "Photos added");
      onSaved && onSaved();
    } catch (e) {
      console.error("Photo add failed:", e);
      toast.error("That photo wouldn't upload");
    } finally {
      setBusyPhoto(false);
    }
  };

  const makeMain = async (img) => {
    if (!content?.id || img.id === "legacy") return;
    try {
      await contentApi.setMainImage(content.id, img.id);
      onSaved && onSaved();
    } catch (e) {
      toast.error("Could not set the main photo");
    }
  };

  const dropPhoto = async (img) => {
    if (!content?.id || img.id === "legacy") return;
    if (!window.confirm("Remove this photo?")) return;
    try {
      await contentApi.removeImage(content.id, img.id);
      onSaved && onSaved();
    } catch (e) {
      toast.error("Could not remove that photo");
    }
  };

  const addSpec = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setBusyPhoto(true);
    try {
      const next = specs.slice();
      for (const file of list) {
        const up = await equipmentApi.uploadFile(file);
        if (!up?.url) throw new Error("upload failed");
        next.push(up.url);
      }
      await saveEquipment({ specs_files: JSON.stringify(next) });
      setSpecs(next);
      toast.success("Spec sheet added");
      onSaved && onSaved();
    } catch (e) {
      console.error("Spec upload failed:", e);
      toast.error("That file wouldn't upload");
    } finally {
      setBusyPhoto(false);
    }
  };

  const dropSpec = async (i) => {
    if (!window.confirm("Remove this spec sheet?")) return;
    const next = specs.filter((_, k) => k !== i);
    try {
      await saveEquipment({ specs_files: JSON.stringify(next) });
      setSpecs(next);
      onSaved && onSaved();
    } catch (e) {
      toast.error("Could not remove that spec sheet");
    }
  };

  // Pass through every field we don't edit, or the update wipes them.
  const saveEquipment = async (extra = {}) =>
    equipmentApi.updateEquipment(machine.id, {
      categoryId: form.categoryId || machine.category_id,
      category: machine.category_name,
      equipmentId: form.equipmentId,
      equipmentName: form.equipmentName,
      basePrice: form.basePrice,
      minimumDuration: form.minimumDuration,
      position: machine.position || "",
      availability: machine.availability ? 1 : 0,
      ownership_status: machine.ownership_status || "owned",
      model: machine.model || "",
      year_made: machine.year_made || "",
      fuel_type: machine.fuel_type || "",
      previous_code: machine.previous_code || "",
      waiver_excess: machine.waiver_excess || "",
      description: machine.description || "",
      specs_files: machine.specs_files,
      ...extra,
    });

  const save = async () => {
    setSaving(true);
    let eqOk = false;
    try {
      await saveEquipment();
      eqOk = true;
      const contentId = content?.id;
      const payload = {
        equipment_id: machine.id,
        equipment_name: form.equipmentName,
        description: form.description,
        banner_description: content?.banner_description || "",
        image_url: content?.image_url || "",
      };
      if (contentId) await contentApi.updateContent(contentId, payload);
      else await contentApi.addContent(payload);
      toast.success("Saved");
      onSaved && onSaved();
    } catch (e) {
      console.error("Save failed:", e);
      // Say which half landed — a generic failure leaves you guessing.
      toast.error(
        eqOk
          ? "Machine details saved, but the description didn't. Try again."
          : "Nothing saved. " + (e?.message || "Try again.")
      );
    } finally {
      setSaving(false);
    }
  };

  if (!machine) return null;

  const written = String(form.description || "").trim().length > 0;
  const priced = !!form.basePrice;
  const shownPhoto = photos[shown] || photos[0] || null;
  const catName =
    (categories.find((c) => String(c.id) === String(form.categoryId)) || {})
      .category_name || machine.category_name || "";

  const mark = (ok, label) => (
    <span className={ok ? "text-[#9CA3AF]" : "text-[#F59E0B]"}>{label}</span>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-3 font-[Inter]">
          <button onClick={onPrev} disabled={index <= 0} aria-label="Previous machine"
            className="w-12 h-12 rounded-lg border border-[#333] text-[#9CA3AF] text-[26px] leading-none flex items-center justify-center hover:border-[#FDCE06] hover:text-[#FDCE06] disabled:opacity-25 transition-colors">
            &#8249;
          </button>
          <span className="text-[#9CA3AF] text-[16px] min-w-[70px] text-center">
            {index + 1} of {total}
          </span>
          <button onClick={onNext} disabled={index >= total - 1} aria-label="Next machine"
            className="w-12 h-12 rounded-lg border border-[#333] text-[#9CA3AF] text-[26px] leading-none flex items-center justify-center hover:border-[#FDCE06] hover:text-[#FDCE06] disabled:opacity-25 transition-colors">
            &#8250;
          </button>
          <button onClick={onBack} className={BTN.secondaryLg + " ml-2"}>
            Back to fleet
          </button>
        </div>
        <button onClick={save} disabled={saving} className={BTN.primaryLg}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
        <h2 className="text-[#E5E5E5] font-[Inter] text-[24px] font-semibold">
          {form.equipmentName || "Unnamed machine"}
        </h2>
        <span className="text-[#9CA3AF] font-[Inter] text-[16px]">{form.equipmentId}</span>
        {onHire && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#14352a] text-[#4CAF50] font-[Inter] text-[12px]">
            On hire
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-[Inter] text-[15px] pb-4 mb-4 border-b border-[#333]">
        {mark(written, written ? "Description" : "No description")}
        {mark(photos.length > 0, photos.length + (photos.length === 1 ? " photo" : " photos"))}
        {mark(specs.length > 0, specs.length > 0 ? specs.length + " spec" : "No spec sheet")}
        {mark(priced, priced ? "Priced" : "No price")}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-5">
        <div>
          <label className={LBL}>Machine name</label>
          <input value={form.equipmentName} onChange={set("equipmentName")} className={FLD + " mb-3"} />

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className={LBL}>Plant no.</label>
              <input value={form.equipmentId} onChange={set("equipmentId")} className={FLD} />
            </div>
            <div>
              <label className={LBL}>Category</label>
              <select value={form.categoryId} onChange={set("categoryId")} className={FLD}>
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div>
              <label className={LBL}>Base rate</label>
              <input value={form.basePrice} onChange={set("basePrice")} inputMode="decimal" className={FLD} />
            </div>
            <div>
              <label className={LBL}>Min. term (months)</label>
              <input value={form.minimumDuration} onChange={set("minimumDuration")} inputMode="numeric" className={FLD} />
            </div>
          </div>

          <label className={LBL}>Description</label>
          <textarea value={form.description} onChange={set("description")}
            className={FLD + " h-[150px] resize-y"} />
          <p className="text-[#6B7280] font-[Inter] text-[14px] mt-1.5">
            Shown on the client portal listing.
          </p>
        </div>

        <div>
          <div className="w-full aspect-[4/3] bg-[#1F1F20] border border-[#333] rounded-xl flex items-center justify-center mb-2 relative overflow-hidden">
            {shownPhoto ? (
              <img src={shownPhoto.image_url} alt={form.equipmentName}
                className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-[#F59E0B] font-[Inter] text-[13px]">No photos yet</span>
            )}
            {shownPhoto && (shownPhoto.is_main === 1 || shownPhoto.is_main === true) && (
              <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#FDCE06] text-[#1F1F20] font-[Inter] text-[12px] font-bold">
                Main
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={p.id ?? i}
                onClick={() => setShown(i)}
                className={"aspect-square rounded-lg overflow-hidden bg-[#1F1F20] cursor-pointer border " +
                  (i === shown ? "border-[#FDCE06]" : "border-[#333]")}>
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="aspect-square rounded-lg border border-dashed border-[#444] flex items-center justify-center text-[#9CA3AF] hover:border-[#FDCE06] hover:text-[#FDCE06] cursor-pointer text-[18px]">
              {busyPhoto ? <ClipLoader color="#FDCE06" size={14} /> : "+"}
              <input type="file" accept="image/*,.heic,.heif" multiple hidden
                onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
            </label>
          </div>

          {shownPhoto && shownPhoto.id !== "legacy" && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => makeMain(shownPhoto)} className={BTN.secondary}>
                Set as main
              </button>
              <button onClick={() => dropPhoto(shownPhoto)} className={BTN.danger + " ml-auto"}>
                Remove photo
              </button>
            </div>
          )}

          <div className="text-[#9CA3AF] font-[Inter] text-[14px] uppercase tracking-[0.06em] mt-5 mb-2.5">
            Spec sheets
          </div>
          {specs.map((s, i) => (
            <div key={i}
              className="flex items-center gap-2 border border-[#333] rounded-lg px-3 py-2 mb-1.5">
              <a href={urlOf(s)} target="_blank" rel="noreferrer"
                className="flex-1 text-[#E5E5E5] font-[Inter] text-[15px] truncate hover:text-[#FDCE06]">
                {fileNameOf(s)}
              </a>
              <button onClick={() => dropSpec(i)}
                className="text-[#9CA3AF] hover:text-[#ef4444] text-[20px] px-2">
                &times;
              </button>
            </div>
          ))}
          <label className="block border border-dashed border-[#444] rounded-lg py-4 text-center text-[#9CA3AF] font-[Inter] text-[15px] hover:border-[#FDCE06] hover:text-[#FDCE06] cursor-pointer">
            Add a spec sheet
            <input type="file" accept=".pdf,application/pdf" multiple hidden
              onChange={(e) => { addSpec(e.target.files); e.target.value = ""; }} />
          </label>

          <div className="text-[#9CA3AF] font-[Inter] text-[14px] uppercase tracking-[0.06em] mt-5 mb-2.5">
            What the client sees
          </div>
          {/* The actual component the client portal renders, not a lookalike —
              so the preview cannot drift away from the real thing. Client
              specific pricing (custom rates, discounts) isn't applied here. */}
          <EquipmentCard
            equipment={{
              id: machine.id,
              equipment_id: form.equipmentId,
              equipment_name: form.equipmentName,
              name: form.equipmentName,
              base_price: form.basePrice,
              description: form.description,
              content_description: form.description,
              content_images: photos,
              image_url: shownPhoto ? shownPhoto.image_url : "",
              availability: machine.availability,
              status: machine.status,
              minimum_duration: form.minimumDuration,
              specs_files: JSON.stringify(specs),
            }}
            onQuickView={() => {}}
            onRequest={() => {}}
            requestLoading={false}
            selectedImageIndex={shown}
            onImageSelect={(_id, i) => setShown(i)}
            formatCurrency={(n) =>
              "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
            }
            handleImageLoad={() => {}}
            imageObjectFit={{}}
          />
        </div>
      </div>

    </div>
  );
};

export default MachineEditor;
