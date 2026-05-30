// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { contentApi } from "./services/contentApi";

function ContentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await contentApi.getContent(1, 1, {});
        // Find the matching content item
        const items = res?.data || [];
        const found = items.find((c: any) => String(c.id) === String(id));
        setContent(found || null);
        if (!found) setError("Content item not found.");
      } catch (e: any) {
        setError(e.message || "Failed to load content details");
        toast.error("Failed to load content details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <ClipLoader color="#FDCE06" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-[#292A2B] min-h-screen">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/content-management")}
          className="text-[#9CA3AF] hover:text-[#FDCE06] text-sm font-[Inter] transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-[#E5E5E5] font-[Inter] font-bold text-2xl lg:text-[36px]">
          Content Details
        </h1>
      </div>

      {error ? (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      ) : content ? (
        <div className="bg-[#1F1F20] border border-[#333333] rounded-lg p-6 space-y-4">
          <div>
            <p className="text-[#9CA3AF] text-sm font-[Inter] mb-1">Content ID</p>
            <p className="text-[#E5E5E5] font-[Inter]">{content.content_id || content.id}</p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-sm font-[Inter] mb-1">Name</p>
            <p className="text-[#E5E5E5] font-[Inter]">{content.name || "—"}</p>
          </div>
          <div>
            <p className="text-[#9CA3AF] text-sm font-[Inter] mb-1">Description</p>
            <p className="text-[#E5E5E5] font-[Inter]">{content.description || "—"}</p>
          </div>
        </div>
      ) : (
        <p className="text-[#9CA3AF]">No content found.</p>
      )}
    </div>
  );
}

export default ContentDetails;
