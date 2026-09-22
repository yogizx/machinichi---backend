import { useState, useEffect, useRef } from "react";
import {
  GripVertical,
  Trash2,
  Plus,
  Upload,
  Link,
  ArrowRight,
  Loader2
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import api from "../../services/api";

function Bannerimage({ onAdminLogout }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState({});
  const fileInputRefs = useRef({});

  // Fetch banners from backend
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await api.get("/banners/all");
      setBanners(response.data?.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching banners:", err);
      setError("Failed to load banners. Please verify the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Add a new blank banner card dynamically
  const handleAddBanner = async () => {
    try {
      const newBannerData = {
        imageWebp: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80",
        imageFallback: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80",
        bigText: "",
        smallText: "",
        buttonText: "",
        buttonURL: "",
        contentPosition: "Left Side",
        isActive: true,
        order: banners.length
      };
      
      const response = await api.post("/banners", newBannerData);
      if (response.data?.data) {
        setBanners([...banners, response.data.data]);
      } else {
        fetchBanners();
      }
    } catch (err) {
      console.error("Error creating banner:", err);
      alert("Failed to create banner. Please try again.");
    }
  };

  // Delete an individual banner card
  const handleDeleteBanner = async (id) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      await api.delete(`/banners/${id}`);
      setBanners(banners.filter((banner) => banner._id !== id));
    } catch (err) {
      console.error("Error deleting banner:", err);
      alert("Failed to delete banner. Please try again.");
    }
  };

  // Toggle active / inactive state
  const handleToggleActive = async (id, currentActive) => {
    try {
      // Optimistically update
      setBanners(
        banners.map((banner) =>
          banner._id === id ? { ...banner, isActive: !currentActive } : banner
        )
      );
      await api.put(`/banners/${id}`, { isActive: !currentActive });
    } catch (err) {
      console.error("Error updating banner status:", err);
      fetchBanners(); // revert
    }
  };

  // Universal local text input changes handler
  const handleUpdateLocalField = (id, field, value) => {
    setBanners(
      banners.map((banner) =>
        banner._id === id ? { ...banner, [field]: value } : banner
      )
    );
    // Mark as unsaved
    setSaveStatus(prev => ({ ...prev, [id]: "Unsaved changes" }));
  };

  // Explicitly save text inputs to database
  const handleSaveBanner = async (id, banner) => {
    try {
      setSaveStatus(prev => ({ ...prev, [id]: "Saving..." }));
      await api.put(`/banners/${id}`, {
        bigText: banner.bigText || "",
        smallText: banner.smallText || "",
        buttonText: banner.buttonText || "",
        buttonURL: banner.buttonURL || "",
        contentPosition: banner.contentPosition || "Left Side"
      });
      setSaveStatus(prev => ({ ...prev, [id]: "Changes saved!" }));
      setTimeout(() => {
        setSaveStatus(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 3000);
    } catch (err) {
      console.error("Error saving banner:", err);
      setSaveStatus(prev => ({ ...prev, [id]: "Failed to save" }));
    }
  };

  // Handle local image file upload, send to sharp/webp converter, and save to DB
  const handleImageChange = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingId(id);
      const response = await api.post("/banners/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      if (response.data?.imageWebp) {
        const { imageWebp, imageFallback } = response.data;
        // Update local state
        setBanners(
          banners.map((banner) =>
            banner._id === id ? { ...banner, imageWebp, imageFallback } : banner
          )
        );
        // Persist to database instantly
        await api.put(`/banners/${id}`, { imageWebp, imageFallback });
      }
    } catch (err) {
      console.error("Error uploading image:", err);
      alert("Failed to upload and optimize image. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  // Trigger file dialog
  const triggerFileInput = (id) => {
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id].click();
    }
  };

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = (e, index) => {
    const isHandle = e.target.closest(".drag-handle");
    if (!isHandle) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove("opacity-50");
    setDraggedIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reorderedBanners = [...banners];
    const [draggedBanner] = reorderedBanners.splice(draggedIndex, 1);
    reorderedBanners.splice(targetIndex, 0, draggedBanner);

    const updatedBanners = reorderedBanners.map((b, idx) => ({ ...b, order: idx }));
    setBanners(updatedBanners);
    setDraggedIndex(null);

    // Save display order to database
    try {
      const reorders = updatedBanners.map(b => ({ id: b._id, order: b.order }));
      await api.patch("/banners/reorder", { reorders });
    } catch (err) {
      console.error("Error saving display order:", err);
    }
  };

  if (loading) {
    return (
      <AdminLayout onAdminLogout={onAdminLogout}>
        <div className="flex min-h-screen items-center justify-center bg-[#fffaf5]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eadfd7] border-t-[#fd761a]" />
            <p className="text-sm font-medium text-[#796d66]">Loading Banners...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout onAdminLogout={onAdminLogout}>
        <div className="flex min-h-screen items-center justify-center bg-[#fffaf5] p-6 text-center">
          <div className="bg-white border border-[#ead9cc] p-8 rounded-2xl shadow max-w-md">
            <h2 className="text-lg font-black text-[#2a1409]">Failed to Load Banners</h2>
            <p className="mt-2 text-sm text-[#796d66]">{error}</p>
            <button
              onClick={fetchBanners}
              type="button"
              className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#fd761a] hover:bg-[#e05e0f] text-white px-5 py-2.5 text-sm font-black shadow cursor-pointer transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="p-6 md:p-10 bg-[#fffaf5] min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <h1 className="text-[32px] font-black text-[#2a1409] tracking-tight leading-none">
              Banner Images
            </h1>
            <p className="mt-2.5 text-[15px] font-medium text-[#796d66]">
              Manage homepage banner images, texts, button, link and layout settings.
            </p>
          </div>
          <button
            onClick={handleAddBanner}
            type="button"
            className="flex items-center justify-center gap-1.5 rounded-[12px] bg-[#fd761a] hover:bg-[#e05e0f] text-white px-5.5 py-3 text-[14px] font-black shadow-[0_4px_14px_rgba(253,118,26,0.25)] hover:-translate-y-0.5 transition duration-300 active:translate-y-0 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            Add Banner
          </button>
        </div>

        {/* Banners List */}
        <div className="flex flex-col gap-8">
          {banners.map((banner, index) => {
            const bigTextVal = banner.bigText || banner.title || "";
            const smallTextVal = banner.smallText || banner.subtitle || "";
            const buttonTextVal = banner.buttonText || banner.cta || "";
            const buttonURLVal = banner.buttonURL || banner.ctaLink || banner.linkUrl || "";

            const isImageOnly =
              !bigTextVal.trim() &&
              !smallTextVal.trim() &&
              !buttonTextVal.trim();

            const isUploading = uploadingId === banner._id;

            return (
              <div
                key={banner._id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`bg-white border border-[#ead9cc] rounded-[20px] p-6 md:p-8 shadow-[0_12px_36px_rgba(64,35,17,0.04)] hover:shadow-[0_16px_48px_rgba(64,35,17,0.07)] transition duration-300 ${
                  draggedIndex === index ? "border-dashed border-[#fd761a]" : ""
                }`}
              >
                {/* Banner Card Header */}
                <div className="flex items-center justify-between border-b border-[#f4e9df] pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="drag-handle text-[#a6958a] hover:text-[#2a1409] cursor-grab active:cursor-grabbing p-1.5 transition rounded-lg hover:bg-[#fff5ee]"
                      title="Drag to reorder"
                    >
                      <GripVertical size={18} strokeWidth={2.5} />
                    </button>
                    <span className="text-[18px] font-black text-[#2a1409]">
                      Banner {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Active Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-[#44352d]">
                        Active
                      </span>
                      <button
                        onClick={() => handleToggleActive(banner._id, banner.isActive)}
                        type="button"
                        className={`relative inline-flex h-[26px] w-[48px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          banner.isActive ? "bg-[#fd761a]" : "bg-[#ead9cc]"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            banner.isActive ? "translate-x-[22px]" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Delete Icon */}
                    <button
                      onClick={() => handleDeleteBanner(banner._id)}
                      type="button"
                      className="text-[#c2410c] hover:text-[#ef4444] hover:bg-[#fff2ee] p-2 rounded-lg transition duration-200 cursor-pointer"
                      title="Delete banner"
                    >
                      <Trash2 size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                {/* Banner Card Split Columns */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* Left Column: Spacious Form Fields (xl:col-span-7) */}
                  <div className="xl:col-span-7 flex flex-col gap-6">
                    
                    {/* Settings Row (Image selector and Content position side by side) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Image Selector Panel */}
                      <div className="flex flex-col gap-2 bg-[#fffbf9] border border-[#ead9cc]/50 rounded-xl p-4">
                        <label className="block text-[11px] font-black text-[#5c4a3e] uppercase tracking-wider">
                          Banner Image <span className="text-[#fd761a] font-bold">*</span>
                        </label>
                        
                        <div className="flex gap-4 items-center mt-1">
                          <div className="relative h-16 w-28 shrink-0 rounded-lg overflow-hidden border border-[#ead9cc] bg-white shadow-sm flex items-center justify-center">
                            {isUploading ? (
                              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 size={18} className="animate-spin text-[#fd761a]" />
                              </div>
                            ) : null}
                            <img
                              src={banner.imageFallback || banner.imageUrl || banner.imageWebp || banner.image}
                              alt={`Banner ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex-1 flex flex-col gap-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              ref={(el) => (fileInputRefs.current[banner._id] = el)}
                              onChange={(e) => handleImageChange(banner._id, e)}
                              className="hidden"
                            />
                            <button
                              onClick={() => triggerFileInput(banner._id)}
                              type="button"
                              disabled={isUploading}
                              className="w-max flex items-center justify-center gap-1.5 rounded-lg border border-[#fd761a] bg-white text-[#fd761a] hover:bg-[#fff2ee] px-3.5 py-1.5 text-[12px] font-black transition duration-200 cursor-pointer shadow-sm hover:shadow disabled:opacity-50"
                            >
                              <Upload size={13} strokeWidth={2.5} />
                              Change Image
                            </button>
                            <span className="text-[10px] font-bold text-[#a6958a]">
                              Recommended size: 1920 x 800px
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content Alignment Selector Panel */}
                      <div className="flex flex-col gap-2 bg-[#fffbf9] border border-[#ead9cc]/50 rounded-xl p-4 justify-center">
                        <label className="block text-[11px] font-black text-[#5c4a3e] uppercase tracking-wider">
                          Content Alignment
                        </label>
                        
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() =>
                              handleUpdateLocalField(banner._id, "contentPosition", "Left Side")
                            }
                            type="button"
                            className={`flex-1 py-2 px-3 border text-xs font-black rounded-lg transition duration-200 cursor-pointer text-center ${
                              banner.contentPosition === "Left Side"
                                ? "bg-[#fd761a] border-[#fd761a] text-white shadow-sm"
                                : "bg-white border-[#ead9cc] text-[#44352d] hover:bg-[#fffbf9]"
                            }`}
                          >
                            Left Side
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateLocalField(banner._id, "contentPosition", "Right Side")
                            }
                            type="button"
                            className={`flex-1 py-2 px-3 border text-xs font-black rounded-lg transition duration-200 cursor-pointer text-center ${
                              banner.contentPosition === "Right Side"
                                ? "bg-[#fd761a] border-[#fd761a] text-white shadow-sm"
                                : "bg-white border-[#ead9cc] text-[#44352d] hover:bg-[#fffbf9]"
                            }`}
                          >
                            Right Side
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Text Inputs Panel */}
                    <div className="flex flex-col gap-4">
                      
                      {/* Big Text Input */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-[#5c4a3e] uppercase tracking-wider">
                            Big Text <span className="text-[#fd761a] font-bold">*</span>
                          </label>
                          <span className="text-[10px] font-bold text-[#a6958a]">
                            {banner.bigText?.length || 0}/100
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter big text (optional)"
                          maxLength={100}
                          value={banner.bigText || ""}
                          onChange={(e) =>
                            handleUpdateLocalField(banner._id, "bigText", e.target.value)
                          }
                          className="w-full border border-[#ead9cc] bg-white rounded-xl px-4 py-2.5 text-[14px] text-[#2d1a10] placeholder-[#c4b6ad] focus:outline-none focus:border-[#fd761a] focus:ring-1 focus:ring-[#fd761a] transition duration-200 shadow-sm"
                        />
                      </div>

                      {/* Small Text Input */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-[#5c4a3e] uppercase tracking-wider">
                            Small Text <span className="text-[#fd761a] font-bold">*</span>
                          </label>
                          <span className="text-[10px] font-bold text-[#a6958a]">
                            {banner.smallText?.length || 0}/150
                          </span>
                        </div>
                        <textarea
                          placeholder="Enter small text (optional)"
                          maxLength={150}
                          value={banner.smallText || ""}
                          onChange={(e) =>
                            handleUpdateLocalField(banner._id, "smallText", e.target.value)
                          }
                          className="w-full border border-[#ead9cc] bg-white rounded-xl p-3.5 text-[14px] text-[#2d1a10] placeholder-[#c4b6ad] focus:outline-none focus:border-[#fd761a] focus:ring-1 focus:ring-[#fd761a] resize-none h-[68px] transition duration-200 shadow-sm"
                        />
                      </div>

                    </div>

                    {/* CTA Details panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Button Text */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-[#5c4a3e] uppercase tracking-wider">
                            Button Text <span className="text-[#fd761a] font-bold">*</span>
                          </label>
                          <span className="text-[10px] font-bold text-[#a6958a]">
                            {banner.buttonText?.length || 0}/30
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter button text (optional)"
                          maxLength={30}
                          value={banner.buttonText || ""}
                          onChange={(e) =>
                            handleUpdateLocalField(banner._id, "buttonText", e.target.value)
                          }
                          className="w-full border border-[#ead9cc] bg-white rounded-xl px-4 py-2.5 text-[14px] text-[#2d1a10] placeholder-[#c4b6ad] focus:outline-none focus:border-[#fd761a] focus:ring-1 focus:ring-[#fd761a] transition duration-200 shadow-sm"
                        />
                      </div>

                      {/* Button URL */}
                      <div className="flex flex-col gap-1.5">
                        <label className="block text-[11px] font-black text-[#5c4a3e] uppercase tracking-wider">
                          Button URL <span className="text-[#fd761a] font-bold">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Enter button URL (optional)"
                            value={banner.buttonURL || ""}
                            onChange={(e) =>
                              handleUpdateLocalField(banner._id, "buttonURL", e.target.value)
                            }
                            className="w-full border border-[#ead9cc] bg-white rounded-xl pl-4 pr-9 py-2.5 text-[14px] text-[#2d1a10] placeholder-[#c4b6ad] focus:outline-none focus:border-[#fd761a] focus:ring-1 focus:ring-[#fd761a] transition duration-200 shadow-sm"
                          />
                          <Link
                            size={14}
                            className="absolute right-3.5 text-[#a6958a]"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Saving Controller Actions */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#f4e9df]">
                      <span className={`text-[12px] font-bold transition duration-300 ${
                        saveStatus[banner._id] === "Changes saved!" ? "text-green-600" :
                        saveStatus[banner._id] === "Failed to save" ? "text-red-500" : "text-[#8c7a6e]"
                      }`}>
                        {saveStatus[banner._id] || ""}
                      </span>
                      <button
                        onClick={() => handleSaveBanner(banner._id, banner)}
                        type="button"
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-[#fd761a] hover:bg-[#e05e0f] text-white px-4.5 py-2 text-xs font-black shadow-md hover:-translate-y-0.5 transition duration-200 active:translate-y-0 cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>

                  </div>

                  {/* Right Column: Premium Mockup Preview Box (xl:col-span-5) */}
                  <div className="xl:col-span-5 flex flex-col justify-start">
                    <span className="block text-[11px] font-black text-[#44352d] uppercase tracking-wider mb-2">
                      Live Preview
                    </span>
                    
                    <div className="flex-1 flex flex-col justify-between h-full bg-[#fbf9f7] border border-[#ead9cc] rounded-2xl overflow-hidden shadow-sm">
                      {/* Device Header */}
                      <div className="bg-[#f3eae1] px-4 py-3 flex items-center border-b border-[#ead9cc] select-none">
                        <div className="flex gap-1.5 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                        </div>
                        <span className="text-[10px] font-black text-[#5c4a3e] tracking-wider uppercase mx-auto">
                          Live Slide Preview
                        </span>
                      </div>

                      {/* Mockup Slide */}
                      <div className="p-4 flex-1 flex items-center justify-center min-h-[220px]">
                        <div className="relative w-full aspect-[1920/800] rounded-xl overflow-hidden border border-[#ead9cc] bg-white shadow-[0_8px_24px_rgba(42,20,9,0.12)] flex items-center select-none group">
                          {/* Background Image */}
                          <img
                            src={banner.imageFallback || banner.imageWebp || banner.imageUrl || banner.image}
                            alt="Preview Background"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />

                          {/* Overlay text & content if not image-only */}
                          {!isImageOnly && (
                            <div
                              className={`absolute inset-0 flex flex-col justify-center px-5 py-4 transition-all duration-300 w-full ${
                                banner.contentPosition === "Right Side"
                                  ? "bg-gradient-to-l from-[#251307]/90 via-[#251307]/50 to-transparent text-right items-end pl-14"
                                  : "bg-gradient-to-r from-[#251307]/90 via-[#251307]/50 to-transparent text-left items-start pr-14"
                              }`}
                            >
                              {/* Big Text */}
                              {bigTextVal.trim() && (
                                <h2 className="text-white font-extrabold text-[12px] sm:text-[14px] md:text-[16px] lg:text-[12px] xl:text-[14px] leading-tight tracking-tight drop-shadow-md max-w-[85%] font-sans uppercase">
                                  {bigTextVal}
                                </h2>
                              )}

                              {/* Small Text */}
                              {smallTextVal.trim() && (
                                <p className="mt-1 text-white/90 font-bold text-[8px] sm:text-[9.5px] md:text-[10.5px] lg:text-[8px] xl:text-[9.5px] leading-snug max-w-[90%] font-sans">
                                  {smallTextVal}
                                </p>
                              )}

                              {/* CTA Button */}
                              {buttonTextVal.trim() && (
                                <div className="mt-3 flex items-center">
                                  <span className="rounded-full bg-[#fd761a] hover:bg-[#e05e0f] text-white px-3 py-1.5 text-[8px] sm:text-[9.5px] md:text-[10px] lg:text-[8px] xl:text-[9px] font-black tracking-wide uppercase transition duration-300 flex items-center gap-1 shadow-[0_4px_10px_rgba(253,118,26,0.3)]">
                                    {buttonTextVal}
                                    <ArrowRight size={8} strokeWidth={3} />
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mockup Status Footer */}
                      <div className="bg-[#fffcf9] border-t border-[#ead9cc]/50 px-4 py-2.5 flex items-center justify-between text-[10px] text-[#8c7a6e]">
                        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              banner.isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                            }`}
                          />
                          {banner.isActive ? "Active on Homepage" : "Disabled"}
                        </span>
                        <span className="font-medium">Aspect Ratio: 2.4:1</span>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

export default Bannerimage;
