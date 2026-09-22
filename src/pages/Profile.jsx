import { useRef, useState, useEffect, useCallback } from "react";
import {
  AlertCircle, AtSign, Bell, Camera, Check, CheckCircle2, Eye, EyeOff, IdCard,
  LockKeyhole, LogOut, Mail, MapPin, MessageSquare, PenLine, RotateCcw, Save,
  ShieldCheck, ShieldX, Smartphone, Star, Sparkles, X, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { formatShippingAddress, isCompleteShippingAddress } from "../utils/shippingAddresses";

import api from "../services/api";

const defaultAvatar = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=260&q=90";

function Profile({ onSignOut }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [avatar, setAvatar] = useState(defaultAvatar);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [dirty, setDirty] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [shippingAddr, setShippingAddr] = useState(null);
  const [draftAddr, setDraftAddr] = useState(null);
  const [editingAddr, setEditingAddr] = useState(false);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyType, setVerifyType] = useState("email");

  const [myReviews, setMyReviews] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      const [revRes, ordRes] = await Promise.all([
        api.get("/reviews/my"),
        api.get("/orders/my-orders", { params: { limit: 50, sort: "createdAt", order: "desc" } }),
      ]);
      if (revRes.data?.success) setMyReviews(revRes.data.data || []);
      if (ordRes.data?.success) {
        setDeliveredOrders((ordRes.data.data || []).filter((o) => o.status === "delivered"));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchReviews();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, addrRes] = await Promise.all([
        api.get("/user/me"),
        api.get("/user/addresses"),
      ]);
      const u = profileRes.data.user;
      setUser(u);
      setAvatar(u.avatar || defaultAvatar);
      setDraftName(u.fullName || "");
      setDraftPhone(u.phone || "");

      const addrs = addrRes.data.addresses || [];
      setAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0] || null;
      setShippingAddr(defaultAddr);
      setDraftAddr(defaultAddr ? { ...defaultAddr } : null);
    } catch (err) {
      if (err.response?.status === 401) { onSignOut?.(); navigate("/signin"); return; }
      setError("Failed to load profile");
    }
    setLoading(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put("/user/profile", { fullName: draftName, phone: draftPhone });
      setDirty(false);
      setPasswordMsg("");
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save changes");
    }
    setSaving(false);
  };

  const handleDiscard = () => {
    if (user) {
      setDraftName(user.fullName || "");
      setDraftPhone(user.phone || "");
    }
    if (shippingAddr) setDraftAddr({ ...shippingAddr });
    setDirty(false);
    setPasswordMsg("");
    setError("");
  };

  const handleSignOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch { }
    localStorage.removeItem("accessToken");
    onSignOut?.();
    navigate("/signin");
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setError("");
    try {
      await api.delete("/user/delete-account");
      setDeleteModalOpen(false);
      localStorage.removeItem("accessToken");
      onSignOut?.();
      navigate("/signin");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete account");
      setDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePasswordUpdate = async (currentPassword, newPassword) => {
    try {
      await api.put("/user/password", { currentPassword, newPassword });
      setPasswordMsg("Password updated successfully!");
      setPasswordModalOpen(false);
      setDirty(true);
    } catch (err) {
      throw err.response?.data?.message || "Failed to update password";
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!draftAddr) return;
    setSaving(true);
    try {
      let saved;
      if (draftAddr._id) {
        const res = await api.put(`/user/addresses/${draftAddr._id}`, { ...draftAddr, isDefault: true });
        saved = res.data.address;
      } else {
        const res = await api.post("/user/addresses", { ...draftAddr, isDefault: true });
        saved = res.data.address;
      }
      setShippingAddr(saved);
      setDraftAddr(saved);
      setEditingAddr(false);
      setDirty(true);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save address");
    }
    setSaving(false);
  };

  const openPhotoPicker = () => fileInputRef.current?.click();
  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (file) setAvatar(URL.createObjectURL(file));
    setDirty(true);
  };

  const openVerify = (type) => {
    setVerifyType(type);
    setVerifyModalOpen(true);
  };

  if (loading) {
    return (
      <main className="account-shell flex items-center justify-center bg-[#fffaf5] min-h-screen">
        <Loader2 size={32} className="animate-spin text-[#ad4d00]" />
      </main>
    );
  }

  return (
    <main className="account-shell relative h-full overflow-hidden bg-[#fffaf5] text-[#191411] antialiased">
      <div className="account-sidebar-fixed border-t border-[#efe5dc]">
        <Sidebar />
      </div>

      <section className="h-full overflow-y-auto border-t border-[#efe5dc]">
        <div className="mx-auto max-w-[1390px] md:pl-[var(--account-sidebar-width)]">
          <div className="px-7 pb-12 pt-10 sm:px-10 sm:pb-16 sm:pt-12 lg:px-[88px] lg:pb-[62px] lg:pt-[54px]">
            <header className="flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-[50px]">
              <div className="relative h-[134px] w-[134px] shrink-0 rounded-full bg-[#d99d54] p-[3px] shadow-[0_12px_24px_rgba(62,34,17,0.16)]">
                <img alt="Profile" className="h-full w-full rounded-full object-cover" src={avatar} />
                <button
                  aria-label="Change profile photo"
                  className="absolute bottom-[1px] right-[-10px] flex h-[45px] w-[45px] items-center justify-center rounded-full bg-[#ff6d12] text-white shadow-[0_10px_22px_rgba(255,109,18,0.24)]"
                  onClick={openPhotoPicker} type="button"
                >
                  <Camera size={18} strokeWidth={2.8} />
                </button>
                <input accept="image/*" className="hidden" onChange={handlePhotoChange} ref={fileInputRef} type="file" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-serif text-[39px] font-black leading-none tracking-[-0.045em] sm:text-[43px]">Personal Info</h1>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#fff1e8] px-4 py-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#c7470a]">
                    <PenLine size={14} strokeWidth={2.8} /> Edit Profile
                  </span>
                </div>
                <p className="mt-[14px] text-[15px] font-medium tracking-[-0.025em] text-[#38312c] sm:text-[16px]">Manage your identity and security settings.</p>
              </div>
            </header>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-[14px] font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <ProfileSection icon={IdCard} title="Profile Details" className="mt-[53px]">
              <div className="grid gap-x-[24px] gap-y-[22px] md:grid-cols-2">
                <InputField label="Full Name" value={draftName}
                  onChange={(v) => { setDraftName(v.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ")); setDirty(true); }} />

                <div className="relative">
                  <InputField label="Email Address" value={user?.email || ""}
                    readOnly={user?.isEmailVerified} disabled={!user?.isEmailVerified && !dirty} />
                  <div className="mt-2 flex items-center gap-2">
                    {user?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#dcecc8] px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.06em] text-[#3e7a0e]">
                        <ShieldCheck size={13} strokeWidth={2.8} /> Verified
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2ed] px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.06em] text-[#b62917]">
                          <ShieldX size={13} strokeWidth={2.8} /> Not Verified
                        </span>
                        <button type="button" onClick={() => openVerify("email")}
                          className="text-[12px] font-black uppercase tracking-[0.06em] text-[#ff6d12] underline-offset-2 hover:underline">
                          Verify
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <InputField label="Phone Number" value={draftPhone}
                    onChange={(v) => { setDraftPhone(v.replace(/\D/g, "").slice(0, 15)); setDirty(true); }}
                    readOnly={user?.isPhoneVerified} />
                  <div className="mt-2 flex items-center gap-2">
                    {user?.isPhoneVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#dcecc8] px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.06em] text-[#3e7a0e]">
                        <ShieldCheck size={13} strokeWidth={2.8} /> Verified
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2ed] px-3 py-0.5 text-[11px] font-black uppercase tracking-[0.06em] text-[#b62917]">
                          <ShieldX size={13} strokeWidth={2.8} /> Not Verified
                        </span>
                        <button type="button" onClick={() => openVerify("phone")}
                          className="text-[12px] font-black uppercase tracking-[0.06em] text-[#ff6d12] underline-offset-2 hover:underline">
                          Verify
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <InputField label="Account Type" value={user?.provider === "google" ? "Google Account" : "Email & Password"} readOnly />
              </div>

              <div className="mt-8 pt-6 border-t border-[#eadfd6] flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="h-[45px] rounded-full border-2 border-[#d32f2f] bg-white px-6 text-[15px] font-black tracking-[-0.025em] text-[#d32f2f] transition-all duration-300 hover:bg-[#d32f2f] hover:text-white hover:shadow-[0_8px_18px_rgba(211,47,47,0.15)]"
                >
                  Delete Account
                </button>
              </div>
            </ProfileSection>

            <ProfileSection icon={LockKeyhole} title="Security" className="mt-[47px]">
              <div className="flex flex-col gap-5 rounded-[11px] border border-[#eadfd6] bg-[#f2ebe5] px-7 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:flex-row sm:items-center sm:justify-between sm:px-[32px] sm:py-[28px]">
                <div>
                  <h3 className="text-[17px] font-bold tracking-[-0.035em]">Password</h3>
                  <p className="mt-[8px] text-[13px] font-medium tracking-[-0.025em] text-[#211b17]">
                    {passwordMsg || (user?.provider === "local"
                      ? "Update your password regularly. Use a strong, unique password."
                      : "Signed in with Google. Password cannot be changed.")}
                  </p>
                </div>
                {user?.provider === "local" && (
                  <button
                    className="h-[45px] min-w-[183px] rounded-full border-2 border-[#2b1f1a] px-6 text-[15px] font-black tracking-[-0.025em] text-[#211814] transition hover:bg-[#2b1f1a] hover:text-white"
                    onClick={() => setPasswordModalOpen(true)} type="button"
                  >
                    Update Password
                  </button>
                )}
              </div>
            </ProfileSection>

            <ProfileSection icon={MapPin} title="Shipping Address" className="mt-[47px]">
              <form className="rounded-[18px] border border-[#eadfd6] bg-white/86 p-5 shadow-[0_14px_34px_rgba(53,31,18,0.06)] sm:p-7"
                onSubmit={handleSaveAddress}
              >
                <div className="mb-6 flex flex-col gap-3 border-b border-[#eadfd6] pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-[19px] font-black tracking-[-0.035em] text-[#1b1714]">Default delivery address</h3>
                    <p className="mt-2 text-[13px] font-bold leading-6 text-[#655e59]">
                      {shippingAddr && isCompleteShippingAddress(shippingAddr)
                        ? formatShippingAddress(shippingAddr)
                        : "Add your default shipping address for faster checkout."}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[#fff1e8] px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#c7470a]">Profile default</span>
                </div>

                <div className="grid gap-x-[24px] gap-y-[22px] md:grid-cols-2">
                  <InputField label="Full Name" value={draftAddr?.fullName || ""}
                    onChange={(v) => setDraftAddr((p) => ({ ...p, fullName: v.replace(/[^A-Za-z\s]/g, "") }))}
                    disabled={!editingAddr} placeholder="e.g. Rahul Sharma" />
                  <InputField label="Phone Number" value={draftAddr?.phoneNumber || ""} maxLength={10}
                    onChange={(v) => setDraftAddr((p) => ({ ...p, phoneNumber: v.replace(/\D/g, "").slice(0, 10) }))}
                    disabled={!editingAddr} placeholder="9876543210" />
                  <div className="md:col-span-2">
                    <InputField label="Street Address" value={draftAddr?.streetAddress || ""}
                      onChange={(v) => setDraftAddr((p) => ({ ...p, streetAddress: v }))}
                      disabled={!editingAddr} placeholder="123, Green Park Main" />
                  </div>
                  <InputField label="City" value={draftAddr?.city || ""}
                    onChange={(v) => setDraftAddr((p) => ({ ...p, city: v.replace(/[^A-Za-z\s]/g, "") }))}
                    disabled={!editingAddr} placeholder="New Delhi" />
                  <InputField label="Zip Code" value={draftAddr?.zipCode || ""} maxLength={6}
                    onChange={(v) => setDraftAddr((p) => ({ ...p, zipCode: v.replace(/\D/g, "").slice(0, 6) }))}
                    disabled={!editingAddr} placeholder="110016" />
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  {editingAddr ? (
                    <>
                      <button type="button" onClick={() => { setDraftAddr(shippingAddr ? { ...shippingAddr } : null); setEditingAddr(false); }}
                        className="h-[46px] rounded-full border-2 border-[#e0d6ce] bg-white px-7 text-[14px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] hover:bg-[#f2ebe5]">
                        Cancel
                      </button>
                      <button type="submit" disabled={saving}
                        className="h-[46px] rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[14px] font-black text-white shadow-[0_13px_22px_rgba(255,103,17,0.18)] transition hover:-translate-y-0.5 disabled:opacity-60">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : "Save Address"}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setDraftAddr(shippingAddr ? { ...shippingAddr } : { fullName: "", phoneNumber: "", streetAddress: "", city: "", zipCode: "" }); setEditingAddr(true); }}
                      className="h-[46px] rounded-full border-2 border-[#2b1f1a] px-8 text-[14px] font-black text-[#211814] transition hover:bg-[#2b1f1a] hover:text-white">
                      {shippingAddr ? "Edit" : "Add Address"}
                    </button>
                  )}
                </div>
              </form>
            </ProfileSection>

            <ProfileSection icon={Bell} title="Communication" className="mt-[51px]">
              <div className="space-y-[20px]">
                <Preference icon={Mail} title="Email Notifications" description="Weekly deals and recipe recommendations." defaultChecked />
                <Preference icon={MessageSquare} title="SMS Alerts" description="Order updates and delivery tracking." />
              </div>
            </ProfileSection>

            <ProfileSection icon={Star} title="Reviews" className="mt-[51px]">
              {reviewSuccess && (
                <ReviewSuccessAnimation productName={reviewSuccess} onDone={() => setReviewSuccess(null)} />
              )}
              {!reviewSuccess && (
                <div className="space-y-4">
                  {deliveredOrders.length === 0 ? (
                    <p className="text-[14px] font-medium text-[#655e59]">
                      No delivered orders yet. Once you receive your order, you can review products here.
                    </p>
                  ) : (
                    deliveredOrders.map((order) =>
                      (order.items || []).map((item, i) => {
                        const alreadyReviewed = myReviews.some(
                          (r) => r.productId?._id === (item.productId?._id || item.productId)
                        );
                        return (
                          <div
                            className="flex items-center gap-4 rounded-[10px] border border-[#eadfd7] bg-white p-4"
                            key={`${order._id}-${i}`}
                          >
                            <img
                              src={item.image || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=80&q=80"}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-[8px] object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-black truncate">{item.name}</p>
                              <p className="text-[11px] font-medium text-[#7f7067]">
                                {order.orderId || order._id?.slice(-6).toUpperCase()}
                              </p>
                            </div>
                            {alreadyReviewed ? (
                              <span className="flex items-center gap-1.5 rounded-full bg-[#dcecc8] px-4 py-2 text-[11px] font-black text-[#3e7a0e]">
                                <Check size={14} /> Reviewed
                              </span>
                            ) : (
                              <button
                                className="h-10 rounded-[8px] bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-5 text-[12px] font-black text-white shadow"
                                onClick={() =>
                                  setReviewModal({
                                    productId: item.productId?._id || item.productId,
                                    productName: item.name,
                                    productImage: item.image,
                                  })
                                }
                                type="button"
                              >
                                Write Review
                              </button>
                            )}
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </ProfileSection>

            <div className="mt-[47px] flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-[24px]">
              <button onClick={handleSaveAll} disabled={saving || !dirty}
                className="group relative flex h-[60px] flex-1 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[16px] font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_22px_rgba(255,103,17,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_28px_rgba(255,103,17,0.3)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? "Saving..." : "Save All Changes"}
              </button>

              <button onClick={handleDiscard} disabled={!dirty}
                className="flex h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#d0c6be] bg-white px-8 text-[14px] font-bold uppercase tracking-[0.08em] text-[#5a4f48] transition-all duration-300 hover:border-[#8a7a70] hover:text-[#2b1f1a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
                <RotateCcw size={16} /> Discard
              </button>

              <button onClick={handleSignOut}
                className="flex h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#d32f2f] bg-white px-8 text-[14px] font-bold uppercase tracking-[0.08em] text-[#d32f2f] transition-all duration-300 hover:bg-[#d32f2f] hover:text-white hover:shadow-[0_8px_18px_rgba(211,47,47,0.2)] active:scale-[0.98]">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </section>

      {passwordModalOpen && (
        <UpdatePasswordModal
          onClose={() => setPasswordModalOpen(false)}
          onUpdate={handlePasswordUpdate}
        />
      )}

      {verifyModalOpen && (
        <VerifyModal
          type={verifyType}
          label={verifyType === "email" ? user?.email : user?.phone}
          onClose={() => setVerifyModalOpen(false)}
          onVerified={() => { setVerifyModalOpen(false); fetchProfile(); }}
        />
      )}
      {reviewModal && (
        <ReviewModal
          productName={reviewModal.productName}
          productImage={reviewModal.productImage}
          productId={reviewModal.productId}
          onClose={() => setReviewModal(null)}
          onSuccess={() => {
            setReviewModal(null);
            setReviewSuccess(reviewModal.productName);
            fetchReviews();
          }}
        />
      )}
      {deleteModalOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteModalOpen(false)}
          onDelete={handleDeleteAccount}
          loading={deleteLoading}
        />
      )}
    </main>
  );
}

function ProfileSection({ children, className = "", icon: Icon, title }) {
  return (
    <section className={className}>
      <div className="flex items-center gap-[14px]">
        <Icon className="text-[#b62917]" size={25} strokeWidth={1.9} />
        <h2 className="text-[24px] font-black tracking-[-0.035em] text-[#1b1714]">{title}</h2>
      </div>
      <div className="mt-[15px] border-t border-[#dfd6ce] pt-[31px]">{children}</div>
    </section>
  );
}

function InputField({ label, value, onChange, readOnly = false, disabled = false, placeholder = "", maxLength }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-black uppercase tracking-[0.025em] text-[#77706a]">{label}</span>
      <input
        className={`mt-[12px] h-[57px] w-full rounded-[10px] border px-[22px] text-[15px] font-bold tracking-[-0.025em] text-[#17120f] outline-none transition placeholder:text-[#9a8b82] ${
          disabled || readOnly
            ? "border-[#e7ded7] bg-[#f2ebe5] shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] cursor-not-allowed"
            : "border-[#e0d3c9] bg-white focus:border-[#ff6d12] focus:shadow-[0_0_0_4px_rgba(255,109,18,0.1)]"
        }`}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </label>
  );
}

function Preference({ checked: initialChecked = false, description, icon: Icon, onToggle, title }) {
  const [checked, setChecked] = useState(initialChecked);
  const toggle = () => setChecked((p) => !p);
  return (
    <article className="flex min-h-[77px] items-center justify-between gap-5 rounded-[10px] border border-[#e6ddd5] bg-white px-[22px] py-4 shadow-[0_2px_8px_rgba(68,41,23,0.025)]">
      <div className="flex items-center gap-[21px]">
        <Icon className="shrink-0 text-[#341913]" size={27} strokeWidth={1.8} />
        <div>
          <h3 className="text-[16px] font-black tracking-[-0.035em]">{title}</h3>
          <p className="mt-[4px] text-[13px] font-medium tracking-[-0.02em] text-[#332d28]">{description}</p>
        </div>
      </div>
      <button type="button"
        className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[4px] border-2 transition ${
          checked ? "border-[#ff6b13] bg-[#ff6b13] text-white" : "border-[#c4b8ae] bg-white text-transparent hover:border-[#8a7a70]"
        }`}
        onClick={toggle}
      >
        <Check size={19} strokeWidth={3.2} />
      </button>
    </article>
  );
}

const passwordRules = [
  { id: "length", label: "Minimum 8 characters", test: (v) => v.length >= 8 },
  { id: "uppercase", label: "At least 1 uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lowercase", label: "At least 1 lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "At least 1 number", test: (v) => /\d/.test(v) },
  { id: "special", label: "At least 1 special character", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

function UpdatePasswordModal({ onClose, onUpdate }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ current: false, newPass: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validations = passwordRules.map((r) => ({ ...r, valid: r.test(newPassword) }));
  const isPwdValid = validations.every((r) => r.valid);
  const pwdMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = !!currentPassword && isPwdValid && pwdMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await onUpdate(currentPassword, newPassword);
      onClose();
    } catch (msg) {
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c0f09]/55 px-4 py-5 backdrop-blur-sm">
      <section className="mx-auto w-full max-w-[560px] rounded-[24px] border border-[#eadfd6] bg-[#fffaf5] shadow-[0_24px_60px_rgba(25,12,6,0.28)] animate-[profilePasswordModal_260ms_ease-out_both] max-h-[95vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-5 border-b border-[#eadfd6] px-6 py-6 sm:px-8">
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#b62917]">Security</p>
            <h2 className="mt-2 font-serif text-[30px] font-black leading-none tracking-[-0.045em] text-[#191411]">Update Password</h2>
            <p className="mt-3 max-w-[390px] text-[14px] font-medium leading-6 text-[#655e59]">Enter your current password and a new strong password.</p>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e7ded7] bg-white text-[#2b1f1a] transition hover:border-[#b62917] hover:text-[#b62917]">
            <X size={18} strokeWidth={2.4} />
          </button>
        </header>

        <form className="px-6 py-6 sm:px-8" onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <PwdField label="Current Password" value={currentPassword}
              onChange={setCurrentPassword} show={visible.current}
              toggle={() => setVisible((p) => ({ ...p, current: !p.current }))} />
            <PwdField label="New Password" value={newPassword}
              onChange={setNewPassword} show={visible.newPass}
              toggle={() => setVisible((p) => ({ ...p, newPass: !p.newPass }))} />
            <PwdField label="Confirm Password" value={confirmPassword}
              onChange={setConfirmPassword} show={visible.confirm}
              toggle={() => setVisible((p) => ({ ...p, confirm: !p.confirm }))}
              error={confirmPassword && !pwdMatch ? "Passwords do not match." : ""}
              success={pwdMatch ? "Passwords match." : ""} />
          </div>

          <div className="mt-6 rounded-[16px] border border-[#e7ded7] bg-white px-5 py-5">
            <h3 className="text-[13px] font-black uppercase tracking-[0.12em] text-[#77706a]">Requirements</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {validations.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-[13px] font-bold text-[#332d28]">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                    r.valid ? "bg-[#dcecc8] text-[#5b941c]" : "bg-[#fff2ed] text-[#b62917]"
                  }`}>
                    {r.valid ? <Check size={15} strokeWidth={3.2} /> : <AlertCircle size={14} strokeWidth={2.5} />}
                  </span>
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{error}</p>}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose}
              className="h-[48px] rounded-full border-2 border-[#e0d6ce] bg-white px-7 text-[15px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] hover:bg-[#f2ebe5]">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit || loading}
              className="flex h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[15px] font-black text-white shadow-[0_13px_22px_rgba(255,103,17,0.18)] transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
      <style>{`
        @keyframes profilePasswordModal {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function PwdField({ label, value, onChange, show, toggle, error, success }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-black uppercase tracking-[0.025em] text-[#77706a]">{label}</span>
      <div className="relative mt-[12px]">
        <input
          className={`h-[56px] w-full rounded-[12px] border bg-white px-[18px] pr-12 text-[15px] font-bold tracking-[-0.025em] text-[#17120f] outline-none transition ${
            error ? "border-[#d34428] shadow-[0_0_0_4px_rgba(211,68,40,0.08)]" :
            success ? "border-[#7fba3a] shadow-[0_0_0_4px_rgba(127,186,58,0.1)]" :
            "border-[#e7ded7] focus:border-[#ff6d12] focus:shadow-[0_0_0_4px_rgba(255,109,18,0.1)]"
          }`}
          type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        <button type="button" onClick={toggle}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#655e59] transition hover:bg-[#f2ebe5] hover:text-[#191411]">
          {show ? <EyeOff size={18} strokeWidth={2.2} /> : <Eye size={18} strokeWidth={2.2} />}
        </button>
      </div>
      {(error || success) && <p className={`mt-2 text-[12px] font-black ${success ? "text-[#5b941c]" : "text-[#b62917]"}`}>{error || success}</p>}
    </label>
  );
}

function VerifyModal({ type, label, onClose, onVerified }) {
  const [step, setStep] = useState("send");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const icon = type === "email" ? <Mail size={22} /> : <Smartphone size={22} />;
  const title = type === "email" ? "Verify Email" : "Verify Phone";

  const handleSendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/user/send-verification-otp", { type });
      setStep("verify");
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter a valid 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/user/verify-otp", { type, otp });
      onVerified();
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c0f09]/55 px-4 py-5 backdrop-blur-sm">
      <section className="mx-auto w-full max-w-[440px] rounded-[24px] border border-[#eadfd6] bg-[#fffaf5] shadow-[0_24px_60px_rgba(25,12,6,0.28)] animate-[verifyModalIn_260ms_ease-out_both]">
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfd6] px-6 py-6 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1e8] text-[#c7470a]">{icon}</span>
            <div>
              <h2 className="font-serif text-[26px] font-black leading-none tracking-[-0.045em] text-[#191411]">{title}</h2>
              <p className="mt-2 text-[13px] font-medium text-[#655e59] break-all">{label}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e7ded7] bg-white text-[#2b1f1a] transition hover:border-[#b62917] hover:text-[#b62917]">
            <X size={16} strokeWidth={2.4} />
          </button>
        </header>

        <div className="px-6 py-6 sm:px-8">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-[13px] font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {step === "send" ? (
            <div className="text-center">
              <p className="text-[15px] font-medium leading-6 text-[#38312c]">
                We'll send a 6-digit verification code to your {type}.
              </p>
              <button type="button" onClick={handleSendOTP} disabled={loading}
                className="mt-6 h-[50px] w-full rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] text-[15px] font-black text-white shadow-[0_13px_22px_rgba(255,103,17,0.18)] transition enabled:hover:-translate-y-0.5 disabled:opacity-55">
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : `Send Code to ${type === "email" ? "Email" : "WhatsApp"}`}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-[15px] font-medium leading-6 text-[#38312c]">
                Enter the 6-digit code sent to your {type}.
              </p>
              <input
                className="mt-5 h-[64px] w-full rounded-[16px] border-2 border-[#e0d3c9] bg-white px-6 text-center text-[28px] font-black tracking-[0.3em] text-[#191411] outline-none transition focus:border-[#ff6d12] focus:shadow-[0_0_0_4px_rgba(255,109,18,0.1)]"
                type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button type="button" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}
                  className="h-[50px] rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[15px] font-black text-white shadow-[0_13px_22px_rgba(255,103,17,0.18)] transition enabled:hover:-translate-y-0.5 disabled:opacity-55">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify"}
                </button>
                <button type="button" onClick={handleSendOTP} disabled={loading || cooldown > 0}
                  className="h-[50px] rounded-full border-2 border-[#e0d6ce] bg-white px-6 text-[14px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] disabled:opacity-40">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      <style>{`
        @keyframes verifyModalIn {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function ReviewModal({ productName, productImage, productId, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a rating"); return; }
    if (!comment.trim()) { setError("Please write a review"); return; }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/reviews", {
        productId,
        rating,
        title: comment.trim().slice(0, 100),
        comment: comment.trim(),
      });
      if (data.success) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c0f09]/55 px-4 py-5 backdrop-blur-sm">
      <section className="w-full max-w-[480px] rounded-[20px] border border-[#eadfd6] bg-[#fffaf5] shadow-xl">
        <header className="flex items-center justify-between border-b border-[#eadfd6] px-6 py-5">
          <div className="flex items-center gap-3">
            <img src={productImage || ""} alt="" className="h-10 w-10 rounded-[6px] object-cover" />
            <h2 className="text-[18px] font-black">Review {productName}</h2>
          </div>
          <button onClick={onClose} type="button" className="text-[#7f7067] hover:text-[#2b180e]"><X size={18} /></button>
        </header>
        <form className="px-6 py-5" onSubmit={handleSubmit}>
          <div className="flex items-center gap-1 mb-5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                className="p-1 transition hover:scale-110"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                <Star
                  size={32}
                  className={star <= (hover || rating) ? "fill-[#ff8b54] text-[#ff8b54]" : "text-[#d4cac2]"}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <textarea
            className="min-h-[120px] w-full rounded-[10px] border border-[#dfcfc3] px-4 py-3 text-[14px] font-semibold outline-none focus:border-[#ff6d12]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
          />
          {error && <p className="mt-2 rounded-[8px] bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-[#dfcfc3] bg-white px-4 text-[12px] font-black text-[#2f2119]">Cancel</button>
            <button type="submit" disabled={submitting} className="h-10 rounded-[8px] bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-5 text-[12px] font-black text-white shadow disabled:opacity-50">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : "Submit Review"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ReviewSuccessAnimation({ productName, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="relative">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{
              background: ["#ff6b13", "#ffd33d", "#5a941d", "#2476dd", "#c12f23"][i % 5],
              animation: `confettiFall ${0.8 + Math.random() * 0.6}s ease-out ${i * 0.08}s forwards`,
              transform: `translate(${Math.cos((i * 30 * Math.PI) / 180) * 40}px, ${Math.sin((i * 30 * Math.PI) / 180) * 40}px)`,
            }}
          />
        ))}
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#5a941d] to-[#8bc34a]"
          style={{ animation: "successPop 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards" }}
        >
          <Check size={36} className="text-white" strokeWidth={3} />
        </div>
      </div>
      <div style={{ animation: "fadeUp 0.5s ease-out 0.3s both" }}>
        <p className="mt-4 text-[22px] font-black text-[#1f130d]">Thank You For Your Review!</p>
        <p className="mt-2 text-[14px] font-medium text-[#655e59]">{productName}</p>
        <p className="mt-1 text-[13px] font-medium text-[#7f7067]">Your feedback helps other customers make informed choices.</p>
      </div>
    </div>
  );
}

function DeleteAccountModal({ onClose, onDelete, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c0f09]/55 px-4 py-5 backdrop-blur-sm">
      <section className="mx-auto w-full max-w-[440px] rounded-[24px] border border-[#eadfd6] bg-[#fffaf5] shadow-[0_24px_60px_rgba(25,12,6,0.28)] animate-[deleteModalIn_260ms_ease-out_both]">
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfd6] px-6 py-6 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-[#d32f2f]">
              <AlertCircle size={22} />
            </span>
            <div>
              <h2 className="font-serif text-[26px] font-black leading-none tracking-[-0.045em] text-[#191411]">Delete Account</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e7ded7] bg-white text-[#2b1f1a] transition hover:border-[#b62917] hover:text-[#b62917] disabled:opacity-50">
            <X size={16} strokeWidth={2.4} />
          </button>
        </header>

        <div className="px-6 py-6 sm:px-8">
          <p className="text-[15px] font-medium leading-6 text-[#38312c]">
            Are you sure you want to permanently delete your account? This action cannot be undone.
          </p>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading}
              className="h-[48px] rounded-full border-2 border-[#e0d6ce] bg-white px-7 text-[15px] font-black text-[#2b1f1a] transition hover:border-[#2b1f1a] hover:bg-[#f2ebe5] disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={onDelete} disabled={loading}
              className="flex h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d32f2f] to-[#f44336] px-8 text-[15px] font-black text-white shadow-[0_13px_22px_rgba(211,47,47,0.18)] transition enabled:hover:-translate-y-0.5 disabled:opacity-55">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </section>
      <style>{`
        @keyframes deleteModalIn {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export default Profile;
