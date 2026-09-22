import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  IdCard,
  KeyRound,
  Link,
  Loader2,
  LockKeyhole,
  Pencil,
  PlusCircle,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AdminLayout from "../components/AdminLayout";
import api from "../../services/api";

const adminProfileStorageKey = "machinichiAdminProfile";
const gstCertificateStorageKey = "machinichiAdminGstCertificate";
const fssaiCertificateStorageKey = "machinichiAdminFssaiCertificate";
const twoStepStorageKey = "machinichiAdminTwoStep";
const storeInfoStorageKey = "machinichiAdminStoreInfo";

const defaultAvatar =
  "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=300&q=90";
const maxPdfFileSize = 2 * 1024 * 1024;

const defaultProfile = {
  fullName: "Machinichi Admin",
  email: "admin@machinichi.com",
  phone: "",
  avatar: defaultAvatar,
};

const defaultTwoStep = {
  enabled: false,
  email: "",
};

const defaultStoreInfo = {
  brandName: "",
  location: "",
  city: "",
  state: "",
  storeEmail: "",
};

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Puducherry",
];

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const readStoredJson = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? { ...fallback, ...JSON.parse(stored) } : fallback;
  } catch {
    return fallback;
  }
};

function Adminprofile({ onAdminLogout }) {
  const avatarInputRef = useRef(null);
  const gstInputRef = useRef(null);
  const [profile, setProfile] = useState(() =>
    readStoredJson(adminProfileStorageKey, defaultProfile),
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [draftName, setDraftName] = useState(profile.fullName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [certificate, setCertificate] = useState(() =>
    readStoredJson(gstCertificateStorageKey, null),
  );
  const [certificateMessage, setCertificateMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/user/me");
        const u = res.data?.user;
        if (u) {
          const fetched = {
            fullName: u.fullName || profile.fullName,
            email: u.email || profile.email,
            phone: u.phone || profile.phone || "",
            avatar: u.avatar || profile.avatar,
          };
          setProfile(fetched);
          setDraftName(fetched.fullName);
          localStorage.setItem(adminProfileStorageKey, JSON.stringify(fetched));

          if (u.gstCertificate) {
            setCertificate(u.gstCertificate);
            localStorage.setItem(gstCertificateStorageKey, JSON.stringify(u.gstCertificate));
          } else {
            setCertificate(null);
            localStorage.removeItem(gstCertificateStorageKey);
          }

          if (u.fssaiCertificate) {
            setFssaiCertificate(u.fssaiCertificate);
            localStorage.setItem(fssaiCertificateStorageKey, JSON.stringify(u.fssaiCertificate));
          } else {
            setFssaiCertificate(null);
            localStorage.removeItem(fssaiCertificateStorageKey);
          }

          if (u.twoStep) {
            setTwoStep(u.twoStep);
            setTwoStepEmailInput(u.twoStep.email || "");
            localStorage.setItem(twoStepStorageKey, JSON.stringify(u.twoStep));
          } else {
            setTwoStep(defaultTwoStep);
            setTwoStepEmailInput("");
            localStorage.setItem(twoStepStorageKey, JSON.stringify(defaultTwoStep));
          }

          if (u.storeInfo) {
            setStoreInfo(u.storeInfo);
            localStorage.setItem(storeInfoStorageKey, JSON.stringify(u.storeInfo));
          } else {
            setStoreInfo(defaultStoreInfo);
            localStorage.setItem(storeInfoStorageKey, JSON.stringify(defaultStoreInfo));
          }

          if (u.compliance) {
            setCompliance(u.compliance);
            localStorage.setItem("machinichiAdminCompliance", JSON.stringify(u.compliance));
          }
        }
      } catch {
        // localStorage fallback already in state
      }
      setProfileLoading(false);
    })();
  }, []);

  const persistProfile = (nextProfile) => {
    setProfile(nextProfile);
    localStorage.setItem(adminProfileStorageKey, JSON.stringify(nextProfile));
  };

  const saveName = async () => {
    const nextName = draftName.trim();
    if (!nextName) return;
    try {
      await api.put("/user/profile", { fullName: nextName });
      persistProfile({ ...profile, fullName: nextName });
      setIsEditingName(false);
    } catch {
      // fallback: save locally
      persistProfile({ ...profile, fullName: nextName });
      setIsEditingName(false);
    }
  };

  const cancelNameEdit = () => {
    setDraftName(profile.fullName);
    setIsEditingName(false);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      await api.put("/user/password", { currentPassword, newPassword });
      setPasswordUpdated(true);
      setIsPasswordModalOpen(false);
    } catch (err) {
      throw err.response?.data?.message || "Failed to update password";
    }
  };

  const validatePdf = (file) => {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Please upload a PDF file only.";
    if (file.size > maxPdfFileSize) {
      return `PDF must be 2 MB or smaller. This file is ${formatBytes(file.size)}.`;
    }
    return "";
  };

  const handleCertificateUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validatePdf(file);
    if (validationMessage) {
      setCertificateMessage(validationMessage);
      event.target.value = "";
      return;
    }

    try {
      setCertificateMessage("Uploading GST Certificate...");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/upload/pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data?.success) {
        const nextCertificate = {
          name: uploadRes.data.name,
          size: uploadRes.data.size,
          uploadedAt: uploadRes.data.uploadedAt || new Date().toISOString(),
          url: uploadRes.data.url,
        };

        await api.put("/user/profile", { gstCertificate: nextCertificate });

        setCertificate(nextCertificate);
        localStorage.setItem(gstCertificateStorageKey, JSON.stringify(nextCertificate));
        setCertificateMessage("GST Certificate uploaded successfully. GST Amount is now enabled in Inventory.");
      } else {
        setCertificateMessage("Failed to upload GST Certificate.");
      }
    } catch (error) {
      setCertificateMessage(error.response?.data?.message || "Error uploading GST Certificate.");
    } finally {
      event.target.value = "";
    }
  };

  const deleteCertificate = async () => {
    try {
      setCertificateMessage("Removing GST Certificate...");
      await api.put("/user/profile", { gstCertificate: null });
      setCertificate(null);
      localStorage.removeItem(gstCertificateStorageKey);
      setCertificateMessage("GST Certificate removed.");
    } catch (error) {
      setCertificateMessage(error.response?.data?.message || "Failed to remove GST Certificate.");
    }
  };

  const fssaiInputRef = useRef(null);
  const [fssaiCertificate, setFssaiCertificate] = useState(() =>
    readStoredJson(fssaiCertificateStorageKey, null),
  );
  const [fssaiCertificateMessage, setFssaiCertificateMessage] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [compliance, setCompliance] = useState(() => readStoredJson("machinichiAdminCompliance", {}));

  const openPdfPreview = useCallback(async (url) => {
    try {
      const relativePath = url.replace(/^https?:\/\/[^/]+/, "");
      const res = await fetch(relativePath, { credentials: "include" });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl(blobUrl);
    } catch {
      setPdfPreviewUrl(url);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const [twoStep, setTwoStep] = useState(() =>
    readStoredJson(twoStepStorageKey, defaultTwoStep),
  );
  const [twoStepEmailInput, setTwoStepEmailInput] = useState(() => twoStep.email || "");
  const [twoStepError, setTwoStepError] = useState("");
  const [twoStepSuccess, setTwoStepSuccess] = useState("");

  const [storeInfo, setStoreInfo] = useState(() =>
    readStoredJson(storeInfoStorageKey, defaultStoreInfo),
  );
  const [storeEmailError, setStoreEmailError] = useState("");
  const [storeInfoMessage, setStoreInfoMessage] = useState("");

  const handleFssaiUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validatePdf(file);
    if (validationMessage) {
      setFssaiCertificateMessage(validationMessage);
      event.target.value = "";
      return;
    }

    try {
      setFssaiCertificateMessage("Uploading FSSAI Certificate...");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/upload/pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data?.success) {
        const nextCertificate = {
          name: uploadRes.data.name,
          size: uploadRes.data.size,
          uploadedAt: uploadRes.data.uploadedAt || new Date().toISOString(),
          url: uploadRes.data.url,
        };

        await api.put("/user/profile", { fssaiCertificate: nextCertificate });

        setFssaiCertificate(nextCertificate);
        localStorage.setItem(fssaiCertificateStorageKey, JSON.stringify(nextCertificate));
        setFssaiCertificateMessage("FSSAI Certificate uploaded successfully.");
      } else {
        setFssaiCertificateMessage("Failed to upload FSSAI Certificate.");
      }
    } catch (error) {
      setFssaiCertificateMessage(error.response?.data?.message || "Error uploading FSSAI Certificate.");
    } finally {
      event.target.value = "";
    }
  };

  const deleteFssaiCertificate = async () => {
    try {
      setFssaiCertificateMessage("Removing FSSAI Certificate...");
      await api.put("/user/profile", { fssaiCertificate: null });
      setFssaiCertificate(null);
      localStorage.removeItem(fssaiCertificateStorageKey);
      setFssaiCertificateMessage("FSSAI Certificate removed.");
    } catch (error) {
      setFssaiCertificateMessage(error.response?.data?.message || "Failed to remove FSSAI Certificate.");
    }
  };

  const toggleTwoStep = async () => {
    const nextEnabled = !twoStep.enabled;
    setTwoStepError("");
    setTwoStepSuccess("");
    try {
      await api.put("/user/profile", {
        twoStep: { enabled: nextEnabled, email: twoStep.email }
      });
      const nextState = { ...twoStep, enabled: nextEnabled };
      setTwoStep(nextState);
      localStorage.setItem(twoStepStorageKey, JSON.stringify(nextState));
      setTwoStepSuccess(nextEnabled ? "2 Step Verification enabled." : "2 Step Verification disabled.");
      if (nextEnabled) {
        setTwoStepEmailInput(twoStep.email || "");
      }
    } catch (error) {
      setTwoStepError(error.response?.data?.message || "Failed to toggle 2 Step Verification state.");
    }
  };

  const updateTwoStepEmail = async () => {
    setTwoStepError("");
    setTwoStepSuccess("");
    const trimmed = twoStepEmailInput.trim();
    const adminEmail = (profile.email || "").trim().toLowerCase();

    if (!trimmed) {
      setTwoStepError("Please enter a verification email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setTwoStepError("Please enter a valid email address.");
      return;
    }

    if (trimmed.toLowerCase() === adminEmail) {
      setTwoStepError("Please use a different email address from your Admin login email.");
      return;
    }

    try {
      await api.put("/user/profile", {
        twoStep: { enabled: twoStep.enabled, email: trimmed }
      });
      const nextState = { ...twoStep, email: trimmed };
      setTwoStep(nextState);
      localStorage.setItem(twoStepStorageKey, JSON.stringify(nextState));
      setTwoStepSuccess("Verification email address updated successfully.");
    } catch (error) {
      setTwoStepError(error.response?.data?.message || "Failed to update verification email.");
    }
  };

  const handleStoreInfoChange = (field, value) => {
    setStoreInfo((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem(storeInfoStorageKey, JSON.stringify(next));
      return next;
    });
    if (field === "storeEmail") {
      const trimmed = value.trim();
      if (trimmed) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          setStoreEmailError("Please enter a valid store email address.");
        } else {
          setStoreEmailError("");
        }
      } else {
        setStoreEmailError("");
      }
    }
  };

  const saveStoreInfo = async () => {
    if (storeInfo.storeEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(storeInfo.storeEmail.trim())) {
        setStoreEmailError("Please enter a valid store email address.");
        return;
      }
    }
    setStoreInfoMessage("Saving store information...");
    try {
      await api.put("/user/profile", { storeInfo });
      localStorage.setItem(storeInfoStorageKey, JSON.stringify(storeInfo));
      setStoreInfoMessage("Store information updated successfully.");
    } catch (error) {
      setStoreInfoMessage(error.response?.data?.message || "Failed to save store information.");
    }
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
        {profileLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-[#ad4d00]" />
          </div>
        ) : null}

        {!profileLoading && (
        <header className="rounded-[16px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_18px_44px_rgba(64,35,17,0.08)] sm:p-7">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#a04a0c]">
              Admin Account
            </p>
            <h1 className="mt-2 text-[34px] font-black leading-none tracking-[-0.045em] text-[#2a1409] sm:text-[42px]">
              Profile Management
            </h1>
            <p className="mt-3 max-w-[640px] text-[14px] font-semibold leading-6 text-[#6f5d50]">
              Manage account identity, security settings, 2-step verification, and certificate controls.
            </p>
          </div>
        </header>
        )}

        <ProfileSection className="mt-6" icon={IdCard} title="Personal Information">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                  Name
                </span>
                {!isEditingName ? (
                  <button
                    className="inline-flex h-8 items-center gap-2 rounded-[8px] bg-[#fff0e6] px-3 text-[11px] font-black uppercase tracking-[0.04em] text-[#8d3c12] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffe2d0]"
                    onClick={() => setIsEditingName(true)}
                    type="button"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                ) : null}
              </div>
              {isEditingName ? (
                <div className="grid gap-3">
                  <input
                    className="admin-input bg-white"
                    onChange={(event) => setDraftName(event.target.value)}
                    value={draftName}
                  />
                  <div className="flex gap-2">
                    <button
                      className="h-9 rounded-[8px] bg-[#2a0f04] px-4 text-[12px] font-black text-white transition hover:bg-[#3a1100]"
                      onClick={saveName}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="h-9 rounded-[8px] border border-[#dcc9ba] bg-white px-4 text-[12px] font-black text-[#35251d] transition hover:bg-[#fff7f0]"
                      onClick={cancelNameEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="min-h-12 rounded-[8px] bg-[#e9dfd8] px-4 py-3 text-[13px] font-bold text-[#302119]">
                  {profile.fullName}
                </p>
              )}
            </div>
            <ReadOnlyField label="Email" value={profile.email} />
            <ReadOnlyField label="Phone Number" value={profile.phone} />
          </div>
        </ProfileSection>

        <ProfileSection className="mt-6" icon={LockKeyhole} title="Security">
          <div className="flex flex-col gap-5 rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[17px] font-black tracking-[-0.035em] text-[#2a170d]">
                Password
              </h3>
              <p className="mt-2 text-[13px] font-semibold leading-6 text-[#6d5e55]">
                {passwordUpdated
                  ? "Password updated for this admin session."
                  : "Use a strong, unique password for admin access."}
              </p>
            </div>
            <button
              className="h-11 rounded-full border-2 border-[#2a0f04] px-6 text-[13px] font-black uppercase tracking-[0.04em] text-[#2a0f04] transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a0f04] hover:text-white"
              onClick={() => setIsPasswordModalOpen(true)}
              type="button"
            >
              Update Password
            </button>
          </div>
        </ProfileSection>

        <ProfileSection className="mt-6" icon={ShieldCheck} title="Certificate">
          <div className="grid gap-6">
            {/* GST Certificate */}
            <div className="rounded-[14px] border border-[#eaded6] bg-[#fffaf6] p-5 shadow-[0_12px_30px_rgba(64,38,22,0.04)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[#fff0e6] text-[#8d3c12]">
                    <FileText size={22} />
                  </span>
                  <div>
                    <h3 className="text-[18px] font-black tracking-[-0.035em] text-[#2a170d]">
                      GST Certificate
                    </h3>
                    <p className="mt-2 text-[13px] font-semibold leading-6 text-[#6d5e55]">
                      Supported Format: PDF only. Maximum File Size: 2 MB.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#2a0f04] px-4 text-[12px] font-black uppercase tracking-[0.04em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#3a1100]"
                    onClick={() => gstInputRef.current?.click()}
                    type="button"
                  >
                    <Upload size={15} />
                    {certificate ? "Replace PDF" : "Upload PDF"}
                  </button>
                  {certificate ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#ffcdb4] bg-[#fff0e9] px-4 text-[12px] font-black uppercase tracking-[0.04em] text-[#9f3509] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffe1d1]"
                      onClick={deleteCertificate}
                      type="button"
                    >
                      <Trash2 size={15} />
                      Delete PDF
                    </button>
                  ) : null}
                  {certificate?.url ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d7dfc9] bg-[#edf5e8] px-4 text-[12px] font-black uppercase tracking-[0.04em] text-[#3d6b12] transition duration-300 hover:-translate-y-0.5 hover:bg-[#dcefd0]"
                      onClick={() => openPdfPreview(certificate.url)}
                      type="button"
                    >
                      <Eye size={15} />
                      View PDF
                    </button>
                  ) : null}
                </div>
              </div>

              <input
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleCertificateUpload}
                ref={gstInputRef}
                type="file"
              />

              {certificate ? (
                <div className="mt-5 rounded-[12px] border border-[#d7dfc9] bg-[#edf5e8] p-4">
                  <p className="text-[12px] font-black uppercase tracking-[0.1em] text-[#58752a]">
                    Uploaded File
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-all text-[14px] font-black text-[#2a170d]">
                      {certificate.name}
                    </p>
                    <p className="text-[13px] font-bold text-[#6d5e55]">
                      {formatBytes(certificate.size)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[12px] border border-dashed border-[#dccfc6] bg-white/70 px-4 py-6 text-center text-[13px] font-bold text-[#7a6a60]">
                  No GST Certificate uploaded. Inventory GST Amount inputs are hidden.
                </div>
              )}

              {certificateMessage ? (
                <p
                  className={`mt-4 rounded-[10px] border px-4 py-3 text-[12px] font-bold leading-5 ${
                    certificateMessage.includes("successfully") || certificateMessage.includes("removed")
                      ? "border-[#d7dfc9] bg-[#edf5e8] text-[#58752a]"
                      : "border-[#ffcdb4] bg-[#fff0e9] text-[#9f3509]"
                  }`}
                >
                  {certificateMessage}
                </p>
              ) : null}
            </div>

            {/* FSSAI Certificate */}
            <div className="rounded-[14px] border border-[#eaded6] bg-[#fffaf6] p-5 shadow-[0_12px_30px_rgba(64,38,22,0.04)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[#fff0e6] text-[#8d3c12]">
                    <FileText size={22} />
                  </span>
                  <div>
                    <h3 className="text-[18px] font-black tracking-[-0.035em] text-[#2a170d]">
                      FSSAI Certificate
                    </h3>
                    <p className="mt-2 text-[13px] font-semibold leading-6 text-[#6d5e55]">
                      Supported Format: PDF only. Maximum File Size: 2 MB.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#2a0f04] px-4 text-[12px] font-black uppercase tracking-[0.04em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#3a1100]"
                    onClick={() => fssaiInputRef.current?.click()}
                    type="button"
                  >
                    <Upload size={15} />
                    {fssaiCertificate ? "Replace PDF" : "Upload PDF"}
                  </button>
                  {fssaiCertificate ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#ffcdb4] bg-[#fff0e9] px-4 text-[12px] font-black uppercase tracking-[0.04em] text-[#9f3509] transition duration-300 hover:-translate-y-0.5 hover:bg-[#ffe1d1]"
                      onClick={deleteFssaiCertificate}
                      type="button"
                    >
                      <Trash2 size={15} />
                      Delete PDF
                    </button>
                  ) : null}
                  {fssaiCertificate?.url ? (
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-[#d7dfc9] bg-[#edf5e8] px-4 text-[12px] font-black uppercase tracking-[0.04em] text-[#3d6b12] transition duration-300 hover:-translate-y-0.5 hover:bg-[#dcefd0]"
                      onClick={() => openPdfPreview(fssaiCertificate.url)}
                      type="button"
                    >
                      <Eye size={15} />
                      View PDF
                    </button>
                  ) : null}
                </div>
              </div>

              <input
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFssaiUpload}
                ref={fssaiInputRef}
                type="file"
              />

              {fssaiCertificate ? (
                <div className="mt-5 rounded-[12px] border border-[#d7dfc9] bg-[#edf5e8] p-4">
                  <p className="text-[12px] font-black uppercase tracking-[0.1em] text-[#58752a]">
                    Uploaded File
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="break-all text-[14px] font-black text-[#2a170d]">
                      {fssaiCertificate.name}
                    </p>
                    <p className="text-[13px] font-bold text-[#6d5e55]">
                      {formatBytes(fssaiCertificate.size)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[12px] border border-dashed border-[#dccfc6] bg-white/70 px-4 py-6 text-center text-[13px] font-bold text-[#7a6a60]">
                  No FSSAI Certificate uploaded.
                </div>
              )}

              {fssaiCertificateMessage ? (
                <p
                  className={`mt-4 rounded-[10px] border px-4 py-3 text-[12px] font-bold leading-5 ${
                    fssaiCertificateMessage.includes("successfully") || fssaiCertificateMessage.includes("removed")
                      ? "border-[#d7dfc9] bg-[#edf5e8] text-[#58752a]"
                      : "border-[#ffcdb4] bg-[#fff0e9] text-[#9f3509]"
                  }`}
                >
                  {fssaiCertificateMessage}
                </p>
              ) : null}
            </div>
          </div>
        </ProfileSection>

        {/* Compliance Section */}
        <ProfileSection className="mt-6" icon={ShieldCheck} title="Compliance & Certifications">
          <div className="rounded-[14px] border border-[#eaded6] bg-[#fffaf6] p-5 shadow-[0_12px_30px_rgba(64,38,22,0.04)]">
            <div className="flex items-start gap-4 mb-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-[#fff0e6] text-[#8d3c12]">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h3 className="text-[18px] font-black tracking-[-0.035em] text-[#2a170d]">
                  Product Compliance Documents
                </h3>
                <p className="mt-2 text-[13px] font-semibold leading-6 text-[#6d5e55]">
                  Upload compliance certificates for your products. Supported formats: PDF, JPG, PNG. Maximum File Size: 2 MB.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { key: "bis", label: "BIS", desc: "Bureau of Indian Standards" },
                { key: "ce", label: "CE", desc: "Conformité Européenne" },
                { key: "iso", label: "ISO", desc: "International Organization for Standardization" },
                { key: "fda", label: "FDA", desc: "U.S. Food and Drug Administration" },
                { key: "rohs", label: "RoHS", desc: "Restriction of Hazardous Substances" },
                { key: "msds", label: "MSDS", desc: "Material Safety Data Sheet" },
              ].map((cert) => (
                <div key={cert.key} className="rounded-[12px] border border-[#d7dfc9] bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[14px] font-black text-[#2a170d]">{cert.label}</p>
                      <p className="text-[11px] font-semibold text-[#6d5e55]">{cert.desc}</p>
                    </div>
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#dcc9ba] bg-[#faf8f5] px-3 text-[10px] font-black text-[#5c514b] hover:border-[#ff6d12] hover:text-[#ff6d12]">
                      <Upload size={11} />
                      Upload
                      <input
                        type="file"
                        accept="application/pdf,.pdf,image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            alert("File size must be 2 MB or less.");
                            return;
                          }
                          try {
                            const formData = new FormData();
                            formData.append("file", file);
                            const uploadRes = await api.post("/upload/pdf", formData, {
                              headers: { "Content-Type": "multipart/form-data" },
                            });
                            if (uploadRes.data?.success) {
                              const complianceData = { ...(compliance || {}) };
                              complianceData[cert.key] = uploadRes.data.url;
                              await api.put("/user/profile", { compliance: complianceData });
                              setCompliance(complianceData);
                            }
                          } catch (err) {
                            alert(err.response?.data?.message || "Upload failed");
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {compliance?.[cert.key] ? (
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#edf5e8] border border-[#d7dfc9] px-3 py-2">
                      <CheckCircle2 size={14} className="text-[#58752a] shrink-0" />
                      <span className="text-[11px] font-bold text-[#58752a] truncate flex-1">Uploaded</span>
                      <button
                        onClick={() => openPdfPreview(compliance[cert.key])}
                        className="text-[10px] font-bold text-[#3d6b12] hover:underline"
                        type="button"
                      >
                        View PDF
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const complianceData = { ...(compliance || {}) };
                            delete complianceData[cert.key];
                            await api.put("/user/profile", { compliance: complianceData });
                            setCompliance(complianceData);
                          } catch (err) {
                            alert("Failed to remove");
                          }
                        }}
                        className="text-[10px] font-bold text-[#9f3509] hover:underline"
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border border-dashed border-[#dccfc6] bg-white/70 px-3 py-3 text-center text-[11px] font-bold text-[#7a6a60]">
                      No document uploaded
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Product Certifications */}
            <div className="mt-5 rounded-[12px] border border-[#d7dfc9] bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[14px] font-black text-[#2a170d]">Product Certifications</p>
                  <p className="text-[11px] font-semibold text-[#6d5e55]">Upload certification documents with name. Maximum File Size: 2 MB.</p>
                </div>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "application/pdf,.pdf";
                    input.onchange = async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        alert("File size must be 2 MB or less.");
                        return;
                      }
                      const certName = prompt("Enter certification name (e.g., Organic, Halal, Kosher):");
                      if (!certName || !certName.trim()) return;
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const uploadRes = await api.post("/upload/pdf", formData, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        if (uploadRes.data?.success) {
                          const complianceData = { ...(compliance || {}) };
                          complianceData.productCertifications = [
                            ...(complianceData.productCertifications || []),
                            {
                              name: certName.trim(),
                              url: uploadRes.data.url,
                              size: uploadRes.data.size || file.size,
                              uploadedAt: uploadRes.data.uploadedAt || new Date().toISOString(),
                            },
                          ];
                          await api.put("/user/profile", { compliance: complianceData });
                          setCompliance(complianceData);
                        }
                      } catch (err) {
                        alert(err.response?.data?.message || "Upload failed");
                      }
                    };
                    input.click();
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dcc9ba] bg-[#faf8f5] px-3 text-[10px] font-black text-[#5c514b] hover:border-[#ff6d12] hover:text-[#ff6d12]"
                  type="button"
                >
                  <PlusCircle size={11} /> Add
                </button>
              </div>
              <div className="space-y-3">
                {(compliance?.productCertifications || []).map((cert, idx) => (
                  <div key={idx} className="rounded-lg border border-[#d7dfc9] bg-[#edf5e8] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-[#2a170d] truncate">{cert.name}</p>
                        {cert.url && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#6d5e55]">
                            <FileText size={12} className="shrink-0" />
                            <span className="truncate">{cert.name}.pdf</span>
                            {cert.size ? <span className="shrink-0">({formatBytes(cert.size)})</span> : null}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cert.url ? (
                          <button
                            onClick={() => openPdfPreview(cert.url)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#d7dfc9] bg-white px-2 text-[10px] font-black text-[#3d6b12] hover:bg-[#dcefd0]"
                            type="button"
                          >
                            <Eye size={11} /> View PDF
                          </button>
                        ) : null}
                        <button
                          onClick={async () => {
                            try {
                              const complianceData = { ...(compliance || {}) };
                              complianceData.productCertifications = complianceData.productCertifications.filter((_, i) => i !== idx);
                              await api.put("/user/profile", { compliance: complianceData });
                              setCompliance(complianceData);
                            } catch (err) {
                              alert("Failed to remove");
                            }
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#ffcdb4] bg-[#fff0e9] px-2 text-[10px] font-black text-[#9f3509] hover:bg-[#ffe1d1]"
                          type="button"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {(!compliance?.productCertifications || compliance.productCertifications.length === 0) && (
                  <p className="text-[11px] font-bold text-[#7a6a60]">No certifications added yet</p>
                )}
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* 2 Step Verification Section */}
        <ProfileSection className="mt-6" icon={KeyRound} title="2 Step Verification">
          <div className="rounded-[14px] border border-[#eaded6] bg-[#fffaf6] p-5 shadow-[0_12px_30px_rgba(64,38,22,0.04)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[18px] font-black tracking-[-0.035em] text-[#2a170d]">
                  Two-Factor Authentication
                </h3>
                <p className="mt-1 text-[13px] font-semibold leading-6 text-[#6d5e55]">
                  Add an extra layer of security to your admin account using a separate verification email.
                </p>
              </div>

              <button
                className={`inline-flex h-11 items-center gap-2 rounded-full px-6 text-[13px] font-black uppercase tracking-[0.04em] transition duration-300 ${
                  twoStep.enabled
                    ? "border-2 border-[#58752a] bg-[#edf5e8] text-[#58752a] hover:bg-[#e1efda]"
                    : "border-2 border-[#2a0f04] bg-[#2a0f04] text-white hover:bg-[#3a1100]"
                }`}
                onClick={toggleTwoStep}
                type="button"
              >
                {twoStep.enabled ? <CheckCircle2 size={16} /> : null}
                {twoStep.enabled ? "Enabled" : "Enable"}
              </button>
            </div>

            {twoStep.enabled ? (
              <div className="mt-5 border-t border-[#eaded6] pt-5">
                <div className="max-w-[640px]">
                  <label className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                    Verification Email Address
                  </label>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      className={`h-12 flex-1 rounded-[8px] border bg-white px-4 text-[13px] font-bold text-[#302119] outline-none transition placeholder:text-[#aa9b91] ${
                        twoStepError
                          ? "border-[#d34428] shadow-[0_0_0_4px_rgba(211,68,40,0.08)]"
                          : "border-[#dcc9ba] focus:border-[#ff6d12]"
                      }`}
                      onChange={(e) => {
                        setTwoStepEmailInput(e.target.value);
                        setTwoStepError("");
                        setTwoStepSuccess("");
                      }}
                      placeholder="Enter another email address..."
                      type="email"
                      value={twoStepEmailInput}
                    />
                    <button
                      className="inline-flex h-12 items-center justify-center rounded-[8px] bg-[#2a0f04] px-6 text-[12px] font-black uppercase tracking-[0.04em] text-white transition duration-300 hover:bg-[#3a1100] sm:shrink-0"
                      onClick={updateTwoStepEmail}
                      type="button"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {twoStepError ? (
                  <p className="mt-3 flex items-center gap-2 rounded-[10px] border border-[#ffcdb4] bg-[#fff0e9] px-4 py-3 text-[12px] font-bold text-[#9f3509]">
                    <AlertCircle size={16} className="shrink-0" />
                    {twoStepError}
                  </p>
                ) : twoStepSuccess ? (
                  <p className="mt-3 flex items-center gap-2 rounded-[10px] border border-[#d7dfc9] bg-[#edf5e8] px-4 py-3 text-[12px] font-bold text-[#58752a]">
                    <CheckCircle2 size={16} className="shrink-0" />
                    {twoStepSuccess}
                  </p>
                ) : null}
              </div>
            ) : null}

            {twoStepSuccess && !twoStep.enabled ? (
              <p className="mt-3 text-[12px] font-bold text-[#6d5e55]">
                {twoStepSuccess}
              </p>
            ) : null}
          </div>
        </ProfileSection>

        {/* Store Information Section */}
        <ProfileSection className="mt-6" icon={Building2} title="Store Information">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                Brand Name
              </span>
              <input
                className="mt-3 h-12 w-full rounded-[8px] border border-[#dcc9ba] bg-white px-4 text-[13px] font-bold text-[#302119] outline-none focus:border-[#ff6d12]"
                onChange={(e) => handleStoreInfoChange("brandName", e.target.value)}
                placeholder="Enter Brand Name"
                value={storeInfo.brandName}
              />
            </div>

            <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                Location
              </span>
              <input
                className="mt-3 h-12 w-full rounded-[8px] border border-[#dcc9ba] bg-white px-4 text-[13px] font-bold text-[#302119] outline-none focus:border-[#ff6d12]"
                onChange={(e) => handleStoreInfoChange("location", e.target.value)}
                placeholder="Enter Location"
                value={storeInfo.location}
              />
            </div>

            <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                City
              </span>
              <input
                className="mt-3 h-12 w-full rounded-[8px] border border-[#dcc9ba] bg-white px-4 text-[13px] font-bold text-[#302119] outline-none focus:border-[#ff6d12]"
                onChange={(e) => handleStoreInfoChange("city", e.target.value)}
                placeholder="Enter City"
                value={storeInfo.city}
              />
            </div>

            <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                State
              </span>
              <select
                className="mt-3 h-12 w-full rounded-[8px] border border-[#dcc9ba] bg-white px-4 text-[13px] font-bold text-[#302119] outline-none focus:border-[#ff6d12]"
                onChange={(e) => handleStoreInfoChange("state", e.target.value)}
                value={storeInfo.state}
              >
                <option value="">Select State</option>
                {indianStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4 lg:col-span-2">
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
                Store Email ID
              </span>
              <input
                className={`mt-3 h-12 w-full rounded-[8px] border bg-white px-4 text-[13px] font-bold text-[#302119] outline-none ${
                  storeEmailError ? "border-[#d34428]" : "border-[#dcc9ba] focus:border-[#ff6d12]"
                }`}
                onChange={(e) => handleStoreInfoChange("storeEmail", e.target.value)}
                placeholder="Enter Store Email Address"
                type="email"
                value={storeInfo.storeEmail}
              />
              {storeEmailError ? (
                <p className="mt-2 text-[12px] font-black text-[#b62917]">{storeEmailError}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            {storeInfoMessage ? (
              <p className="text-[12px] font-bold text-[#58752a]">{storeInfoMessage}</p>
            ) : <span />}
            <button
              className="h-10 rounded-[8px] bg-[#2a0f04] px-6 text-[12px] font-black uppercase tracking-[0.04em] text-white transition hover:bg-[#3a1100]"
              onClick={saveStoreInfo}
              type="button"
            >
              Save Store Info
            </button>
          </div>
        </ProfileSection>
      </div>

      {isPasswordModalOpen ? (
        <UpdatePasswordModal
          onClose={() => setIsPasswordModalOpen(false)}
          onUpdate={updatePassword}
        />
      ) : null}

      {pdfPreviewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { if (pdfPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}>
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#eaded6] px-6 py-4">
              <p className="text-[15px] font-black text-[#2a170d]">Certificate Preview</p>
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#eaded6] text-[#6d5e55] transition hover:bg-[#fff0e9] hover:text-[#9f3509]"
                onClick={() => { if (pdfPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <iframe
              className="h-full w-full flex-1 rounded-b-2xl border-0"
              src={pdfPreviewUrl}
              title="Certificate Preview"
            />
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function ProfileSection({ children, className = "", icon: Icon, title }) {
  return (
    <section className={`${className} rounded-[16px] border border-[#ead9cc] bg-[#fffaf5] p-5 shadow-[0_18px_44px_rgba(64,35,17,0.06)] sm:p-6`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#fff0e6] text-[#8d3c12]">
          <Icon size={19} strokeWidth={2.1} />
        </span>
        <h2 className="text-[22px] font-black tracking-[-0.035em] text-[#2a170d]">
          {title}
        </h2>
      </div>
      <div className="mt-5 border-t border-[#eaded6] pt-5">{children}</div>
    </section>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <label className="block rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
      <span className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#76665c]">
        {label}
      </span>
      <input
        className="mt-3 h-12 w-full rounded-[8px] border border-transparent bg-[#e9dfd8] px-4 text-[13px] font-bold text-[#6d5e55] outline-none"
        readOnly
        value={value}
      />
    </label>
  );
}

const passwordRules = [
  { id: "length", label: "Minimum 8 characters", test: (value) => value.length >= 8 },
  { id: "uppercase", label: "At least one uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "At least one lowercase letter", test: (value) => /[a-z]/.test(value) },
  { id: "number", label: "At least one number", test: (value) => /\d/.test(value) },
  { id: "special", label: "At least one special character", test: (value) => /[^A-Za-z0-9\s]/.test(value) },
];

function UpdatePasswordModal({ onClose, onUpdate }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [visibleFields, setVisibleFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const validations = passwordRules.map((rule) => ({
    ...rule,
    valid: rule.test(newPassword),
  }));
  const isPasswordValid = validations.every((rule) => rule.valid);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = isPasswordValid && passwordsMatch && currentPassword.length > 0;

  const toggleVisibility = (field) => {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setUpdating(true);
    setError("");
    try {
      await onUpdate(currentPassword, newPassword);
    } catch (errMessage) {
      setError(errMessage);
    }
    setUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c0f09]/55 px-4 py-5 backdrop-blur-sm sm:items-center">
      <section className="w-full max-w-[560px] max-h-[90vh] flex flex-col rounded-[20px] border border-[#eadfd6] bg-[#fffaf5] shadow-[0_24px_60px_rgba(25,12,6,0.28)]">
        <header className="flex items-start justify-between gap-5 border-b border-[#eadfd6] px-6 py-6 sm:px-8 shrink-0">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#b62917]">
              Security
            </p>
            <h2 className="mt-2 text-[30px] font-black leading-none tracking-[-0.045em] text-[#191411]">
              Update Password
            </h2>
          </div>
          <button
            aria-label="Close update password popup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e7ded7] bg-white text-[#2b1f1a] transition hover:border-[#b62917] hover:text-[#b62917]"
            onClick={onClose}
            type="button"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </header>

        <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 sm:px-8 pb-8">
            <div className="grid gap-5">
              <PasswordInput
                error={error === "Current password is incorrect" ? error : ""}
                label="Current Password"
                onChange={(val) => {
                  setCurrentPassword(val);
                  if (error) setError("");
                }}
                onToggleVisibility={() => toggleVisibility("currentPassword")}
                showPassword={visibleFields.currentPassword}
                value={currentPassword}
              />
              <PasswordInput
                error={newPassword.length > 0 && !isPasswordValid ? "Password does not meet all requirements." : ""}
                label="New Password"
                onChange={(val) => {
                  setNewPassword(val);
                  if (error) setError("");
                }}
                onToggleVisibility={() => toggleVisibility("newPassword")}
                showPassword={visibleFields.newPassword}
                value={newPassword}
              />
              <PasswordInput
                error={confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match." : ""}
                label="Confirm Password"
                onChange={(val) => {
                  setConfirmPassword(val);
                  if (error) setError("");
                }}
                onToggleVisibility={() => toggleVisibility("confirmPassword")}
                showPassword={visibleFields.confirmPassword}
                success={passwordsMatch ? "Passwords match correctly." : ""}
                value={confirmPassword}
              />
            </div>

            <div className="mt-6 rounded-[16px] border border-[#e7ded7] bg-white px-5 py-5">
              <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-[#77706a]">
                Password Requirements
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {validations.map((rule) => (
                  <div className="flex items-center gap-3 text-[13px] font-bold text-[#332d28]" key={rule.id}>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition ${
                        rule.valid ? "bg-[#dcecc8] text-[#5b941c]" : "bg-[#fff2ed] text-[#b62917]"
                      }`}
                    >
                      {rule.valid ? <Check size={15} strokeWidth={3.2} /> : <AlertCircle size={14} strokeWidth={2.5} />}
                    </span>
                    {rule.label}
                  </div>
                ))}
              </div>
            </div>

            {error && error !== "Current password is incorrect" ? (
              <p className="mt-5 flex items-center gap-2 rounded-[12px] bg-[#fff0e9] px-4 py-3 text-[13px] font-black text-[#b62917]">
                <AlertCircle size={18} strokeWidth={2.4} />
                {error}
              </p>
            ) : passwordsMatch && !error ? (
              <p className="mt-5 flex items-center gap-2 rounded-[12px] bg-[#e4f2d5] px-4 py-3 text-[13px] font-black text-[#5b941c]">
                <CheckCircle2 size={18} strokeWidth={2.4} />
                Passwords match and the new password is ready to update.
              </p>
            ) : null}
          </div>

          <div className="border-t border-[#eadfd6] bg-[#fffaf5] px-6 py-5 sm:px-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end shrink-0 rounded-b-[20px]">
            <button
              className="h-[48px] rounded-full border-2 border-[#e0d6ce] bg-white px-7 text-[15px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] hover:bg-[#f2ebe5]"
              disabled={updating}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-[48px] rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[15px] font-black text-white shadow-[0_13px_22px_rgba(255,103,17,0.18)] transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={!canSubmit || updating}
              type="submit"
            >
              {updating ? <Loader2 size={18} className="animate-spin" /> : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PasswordInput({ error = "", label, onChange, onToggleVisibility, showPassword, success = "", value }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-black uppercase tracking-[0.025em] text-[#77706a]">
        {label}
      </span>
      <div className="relative mt-[12px]">
        <input
          className={`h-[56px] w-full rounded-[12px] border bg-white px-[18px] pr-12 text-[15px] font-bold text-[#17120f] outline-none transition placeholder:text-[#9a8b82] ${
            error
              ? "border-[#d34428] shadow-[0_0_0_4px_rgba(211,68,40,0.08)]"
              : success
                ? "border-[#7fba3a] shadow-[0_0_0_4px_rgba(127,186,58,0.1)]"
                : "border-[#e7ded7] focus:border-[#ff6d12] focus:shadow-[0_0_0_4px_rgba(255,109,18,0.1)]"
          }`}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          type={showPassword ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#655e59] transition hover:bg-[#f2ebe5] hover:text-[#191411]"
          onClick={onToggleVisibility}
          type="button"
        >
          {showPassword ? <EyeOff size={18} strokeWidth={2.2} /> : <Eye size={18} strokeWidth={2.2} />}
        </button>
      </div>
      {error || success ? (
        <p className={`mt-2 text-[12px] font-black ${success ? "text-[#5b941c]" : "text-[#b62917]"}`}>
          {success || error}
        </p>
      ) : null}
    </label>
  );
}

export default Adminprofile;
