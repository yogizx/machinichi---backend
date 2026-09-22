import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArchiveRestore, ArrowLeft, ArrowUpDown, CheckCheck, ChevronDown, ChevronRight,
  FolderClosed, FolderOpen, ImageIcon, Loader2, Package, Plus, Search, SlidersHorizontal,
  Trash2, X, Edit3, Eye, Square, CheckSquare, Bell, UserRound
} from "lucide-react";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";

const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api", withCredentials: true });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function buildTree(cats) {
  const map = {};
  const roots = [];
  cats.forEach((c) => { map[c._id] = { ...c, children: [] }; });
  cats.forEach((c) => {
    const parent = c.parentCategory?._id || c.parentCategory?.toString();
    if (parent && map[parent]) {
      map[parent].children.push(map[c._id]);
    } else if (!parent) {
      roots.push(map[c._id]);
    }
  });
  return roots;
}

function countVisible(list) {
  return list.filter((c) => c.isActive !== false).length;
}

function renderCategoryIcon(cat) {
  const lower = cat.name.toLowerCase();
  let emoji = "";
  let bgClass = "bg-[#faf7f4]";

  if (lower.includes("dry fruit")) {
    emoji = "🍊";
    bgClass = "bg-[#fff0e6]";
  } else if (lower.includes("grain")) {
    emoji = "🌾";
    bgClass = "bg-[#fffbe6]";
  } else if (lower.includes("flour")) {
    emoji = "🥣";
    bgClass = "bg-[#faf8f6]";
  } else if (lower.includes("ready to eat")) {
    emoji = "🍛";
    bgClass = "bg-[#fff2e8]";
  } else if (lower.includes("juice")) {
    emoji = "🍹";
    bgClass = "bg-[#e6f7ff]";
  } else if (lower.includes("pooja")) {
    emoji = "🛕";
    bgClass = "bg-[#fff7e6]";
  } else if (lower.includes("organic")) {
    emoji = "🌿";
    bgClass = "bg-[#f6ffed]";
  }

  if (emoji) {
    return (
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[16px] ${bgClass}`}>
        {emoji}
      </span>
    );
  }

  if (cat.image) {
    return (
      <img
        src={cat.image}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full border border-[#eaded6] object-cover bg-white"
      />
    );
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5f0eb] text-[#8d7f76]">
      <FolderClosed size={15} />
    </span>
  );
}

function TreeNode({ node, selectedId, onSelect, selectedIds, onToggleSelect, depth = 0, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded || depth < 1);
  const hasChildren = node.children?.length > 0;
  const isSelected = selectedId === node._id;
  const isInactive = node.isActive === false;
  const isChecked = selectedIds.has(node._id);

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-all duration-200 ${
          isSelected ? "bg-[#fff0e6] shadow-sm" : isInactive ? "opacity-60" : "hover:bg-[#fff9f5]"
        }`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        <button
          type="button"
          onClick={() => onToggleSelect(node._id)}
          className="flex items-center justify-center h-5 w-5 shrink-0 rounded-md border border-[#c5b7ad] hover:border-[#ff6507] transition-all bg-white"
        >
          {isChecked && (
            <span className="h-2.5 w-2.5 rounded-sm bg-[#ff6507]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => { onSelect(node); if (hasChildren) setOpen(!open); }}
          className={`flex flex-1 items-center gap-3 text-left transition-all duration-200 ${
            isSelected
              ? "text-[#ff6507] font-bold"
              : isInactive
                ? "text-[#b5a69c]"
                : "text-[#2d1810]"
          }`}
        >
          {hasChildren ? (
            open ? <ChevronDown size={14} className="shrink-0 text-[#b5a69c]" /> : <ChevronRight size={14} className="shrink-0 text-[#b5a69c]" />
          ) : (
            <span className="w-[14px]" />
          )}
          {renderCategoryIcon(node)}
          <span className="flex-1 truncate text-[14px] font-bold">{node.name}</span>
          {node.productCount != null && (
            <span className="shrink-0 flex items-center justify-center h-6 min-w-6 rounded-full bg-[#f7f0ea] px-1.5 text-[11px] font-bold text-[#2d1810]">{node.productCount}</span>
          )}
        </button>
      </div>
      {open && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode key={child._id} node={child} selectedId={selectedId} onSelect={onSelect} selectedIds={selectedIds} onToggleSelect={onToggleSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCategories({ onAdminLogout }) {
  const [allCats, setAllCats] = useState([]);
  const [activeCats, setActiveCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState(null); // 'create' | 'edit'
  const [form, setForm] = useState({ name: "", description: "", image: "", parentCategory: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showMobileTree, setShowMobileTree] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const formRef = useRef(null);
  const [catProducts, setCatProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, activeRes] = await Promise.all([
        API.get("/categories/all"),
        API.get("/categories"),
      ]);
      if (allRes.data?.success) setAllCats(allRes.data.data || []);
      if (activeRes.data?.success) setActiveCats(activeRes.data.data || []);
    } catch { /* fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedCat) { setCatProducts([]); return; }
    let cancelled = false;
    setLoadingProducts(true);
    API.get(`/categories/${selectedCat._id}/products`)
      .then(({ data }) => {
        if (!cancelled && data?.success) setCatProducts(data.data?.products || []);
      })
      .catch(() => { if (!cancelled) setCatProducts([]); })
      .finally(() => { if (!cancelled) setLoadingProducts(false); });
    return () => { cancelled = true; };
  }, [selectedCat?._id]);

  const tree = useMemo(() => buildTree(allCats), [allCats]);

  const filteredCats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCats;
    return allCats.filter((c) => c.name.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q));
  }, [allCats, searchQuery]);

  const activeCount = useMemo(() => countVisible(allCats), [allCats]);
  const totalCount = allCats.length;

  const openCreate = (parentId = "") => {
    setFormMode("create");
    setForm({ name: "", description: "", image: "", parentCategory: parentId, isActive: true });
    setShowForm(true);
    setError("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const openEdit = (cat) => {
    setFormMode("edit");
    setForm({
      name: cat.name || "",
      description: cat.description || "",
      image: cat.image || "",
      parentCategory: cat.parentCategory?._id || "",
      isActive: cat.isActive !== false,
    });
    setShowForm(true);
    setError("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormMode(null);
    setForm({ name: "", description: "", image: "", parentCategory: "", isActive: true });
    setError("");
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Category name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image: form.image.trim(),
        parentCategory: form.parentCategory || undefined,
        isActive: form.isActive,
      };
      if (formMode === "edit" && selectedCat) {
        await API.put(`/categories/${selectedCat._id}`, payload);
      } else {
        await API.post("/categories", payload);
      }
      closeForm();
      setSelectedCat(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save category");
    }
    setSaving(false);
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category? This may fail if products are linked.")) return;
    try {
      await API.delete(`/categories/${id}`);
      setSelectedCat((prev) => prev?._id === id ? null : prev);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  const toggleActive = async (cat) => {
    try {
      await API.put(`/categories/${cat._id}`, { isActive: !cat.isActive });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle status");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCats.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCats.map((c) => c._id)));
    }
  };

  const batchToggleActive = async (active) => {
    if (selectedIds.size === 0) return;
    const action = active ? "restore" : "archive";
    if (!window.confirm(`${action === "archive" ? "Archive" : "Restore"} ${selectedIds.size} selected categor${selectedIds.size === 1 ? "y" : "ies"}?`)) return;
    for (const id of selectedIds) {
      try { await API.put(`/categories/${id}`, { isActive: active }); } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    await loadData();
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected categor${selectedIds.size === 1 ? "y" : "ies"}?`)) return;
    for (const id of selectedIds) {
      try { await API.delete(`/categories/${id}`); } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    setSelectedCat((prev) => (prev && selectedIds.has(prev._id) ? null : prev));
    await loadData();
  };

  const sortOptions = [
    { value: "createdAt", label: "Date Created" },
    { value: "name", label: "Name" },
    { value: "productCount", label: "Product Count" },
  ];

  const sortedCats = useMemo(() => {
    const list = [...filteredCats];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "productCount") cmp = (a.productCount || 0) - (b.productCount || 0);
      else cmp = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return sortOrder === "desc" ? -cmp : cmp;
    });
    return list;
  }, [filteredCats, sortBy, sortOrder]);

  const parentOptions = allCats.filter((c) => c._id !== selectedCat?._id);

  const catDetails = selectedCat;

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#fffaf5] text-[#2d1810] pb-10">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">

          {/* Top-Right Header Bar */}
          <div className="flex justify-end gap-4 mb-6">
            <button
              type="button"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eaded6] bg-white text-[#2d1810] shadow-[0_8px_20px_rgba(64,35,17,0.03)] hover:bg-[#fff9f5] transition"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff6507] text-[10px] font-black text-white">
                5
              </span>
            </button>
            <button
              type="button"
              className="flex h-11 items-center gap-3 rounded-2xl border border-[#eaded6] bg-white px-4 text-[14px] font-bold text-[#2d1810] shadow-[0_8px_20px_rgba(64,35,17,0.03)] hover:bg-[#fff9f5] transition"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f7f0ea] border border-[#eaded6] text-[#8d7f76]">
                <UserRound size={14} />
              </span>
              <span>Admin</span>
              <ChevronDown size={14} className="text-[#8d7f76]" />
            </button>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left: Category Tree */}
            <div className={`lg:w-[340px] xl:w-[380px] shrink-0 ${showMobileTree ? "fixed inset-0 z-40 flex flex-col bg-[#fffaf5] lg:static lg:z-auto" : "hidden lg:block"}`}>
              {showMobileTree && (
                <div className="flex items-center justify-between border-b border-[#eaded6] px-4 py-4 lg:hidden">
                  <h2 className="text-[16px] font-bold text-[#2d1810]">Categories</h2>
                  <button onClick={() => setShowMobileTree(false)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-[#fff0e6] text-[#8d7f76]" type="button"><X size={18} /></button>
                </div>
              )}

              <div className="flex flex-col gap-5 rounded-[24px] border border-[#eaded6] bg-white p-6 shadow-[0_12px_28px_rgba(64,35,17,0.03)] lg:sticky lg:top-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff0e6] text-[#ff6507]">
                      <FolderClosed size={20} />
                    </span>
                    <div>
                      <h2 className="text-[20px] font-bold text-[#2d1810]">Categories</h2>
                      <p className="text-[12px] font-bold text-[#8d7f76]">{activeCount} active · {totalCount} total</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {filteredCats.length > 0 && (
                      <button onClick={selectAll} className="grid h-10 w-10 place-items-center rounded-xl text-[#8d7f76] hover:bg-[#fff0e6] hover:text-[#ff6507] transition" type="button" title={selectedIds.size === filteredCats.length ? "Deselect all" : "Select all"}>
                        <CheckCheck size={16} />
                      </button>
                    )}
                    <button onClick={() => openCreate("")} className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff6507] text-white shadow-[0_8px_20px_rgba(255,101,7,0.18)] transition hover:bg-[#e05300]" type="button" title="Add category"><Plus size={18} /></button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8d7f76]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search categories..."
                      className="h-11 w-full rounded-xl border border-[#eaded6] bg-[#faf7f4] pl-10 pr-4 text-[13px] font-medium text-[#2d1810] outline-none placeholder:text-[#aa9b91] focus:border-[#ff6507] focus:ring-2 focus:ring-[#ff6507]/10 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { const next = sortOptions[(sortOptions.findIndex((o) => o.value === sortBy) + 1) % sortOptions.length]; setSortBy(next.value); }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#eaded6] bg-white text-[#ff6507] hover:bg-[#fff0e6] transition"
                    title={`Sort: ${sortOptions.find((o) => o.value === sortBy)?.label}`}
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                </div>

                {selectedIds.size > 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[#ff6507]/20 bg-[#ff6507]/5 px-3 py-2">
                    <span className="text-[12px] font-bold text-[#ff6507] flex-1">{selectedIds.size} selected</span>
                    <button onClick={() => batchToggleActive(false)} className="grid h-7 w-7 place-items-center rounded-lg text-[#8d7f76] hover:text-[#ff6507] hover:bg-white/60" title="Archive selected" type="button"><Archive size={14} /></button>
                    <button onClick={() => batchToggleActive(true)} className="grid h-7 w-7 place-items-center rounded-lg text-[#8d7f76] hover:text-emerald-600 hover:bg-white/60" title="Restore selected" type="button"><ArchiveRestore size={14} /></button>
                    <button onClick={batchDelete} className="grid h-7 w-7 place-items-center rounded-lg text-[#8d7f76] hover:text-red-500 hover:bg-white/60" title="Delete selected" type="button"><Trash2 size={14} /></button>
                    <button onClick={() => setSelectedIds(new Set())} className="grid h-7 w-7 place-items-center rounded-lg text-[#8d7f76] hover:text-[#2d1810] hover:bg-white/60" title="Clear selection" type="button"><X size={14} /></button>
                  </div>
                ) : null}

                <div className="max-h-[60vh] overflow-y-auto space-y-1.5 pr-1">
                  {loading ? (
                    <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#ff6507]" /></div>
                  ) : filteredCats.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <FolderClosed size={28} className="mx-auto text-[#d0c4ba]" />
                      <p className="mt-2 text-[14px] font-bold text-[#8d7f76]">No categories found</p>
                      {searchQuery && (
                        <p className="mt-1 text-[12px] text-[#aa9b91]">Try a different search</p>
                      )}
                    </div>
                  ) : searchQuery ? (
                    sortedCats.map((cat) => {
                      const isSelected = selectedCat?._id === cat._id;
                      const isChecked = selectedIds.has(cat._id);
                      return (
                        <div
                          key={cat._id}
                          className={`flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-all duration-200 ${
                            isSelected ? "bg-[#fff0e6] shadow-sm" : cat.isActive === false ? "opacity-60" : "hover:bg-[#fff9f5]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelect(cat._id)}
                            className="flex items-center justify-center h-5 w-5 shrink-0 rounded-md border border-[#c5b7ad] hover:border-[#ff6507] transition-all bg-white"
                          >
                            {isChecked && (
                              <span className="h-2.5 w-2.5 rounded-sm bg-[#ff6507]" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedCat(cat); setShowMobileTree(false); }}
                            className={`flex flex-1 items-center gap-3 text-left transition-all duration-200 ${
                              isSelected
                                ? "text-[#ff6507] font-bold"
                                : cat.isActive === false
                                  ? "text-[#b5a69c]"
                                  : "text-[#2d1810]"
                            }`}
                          >
                            {renderCategoryIcon(cat)}
                            <span className="flex-1 truncate text-[14px] font-bold">{cat.name}</span>
                            {cat.productCount != null && (
                              <span className="shrink-0 flex items-center justify-center h-6 min-w-6 rounded-full bg-[#f7f0ea] px-1.5 text-[11px] font-bold text-[#2d1810]">{cat.productCount}</span>
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    tree.map((node) => (
                      <TreeNode
                        key={node._id}
                        node={node}
                        selectedId={selectedCat?._id}
                        onSelect={(n) => { setSelectedCat(n); setShowMobileTree(false); }}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Category Details / Form */}
            <div className="min-w-0 flex-1 space-y-5">
              {/* Mobile tree button */}
              <button onClick={() => setShowMobileTree(true)} className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#eaded6] bg-white px-4 text-[13px] font-bold text-[#2d1810] shadow-sm transition hover:bg-[#fff9f5] lg:hidden" type="button">
                <FolderClosed size={16} className="text-[#ff6507]" /> Browse Categories <ChevronRight size={14} className="ml-auto text-[#8d7f76]" />
              </button>

              {/* Form */}
              {showForm && (
                <form ref={formRef} onSubmit={saveCategory} className="rounded-[24px] border border-[#eaded6] bg-white p-6 shadow-[0_12px_28px_rgba(64,35,17,0.03)] sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-bold text-[#2d1810]">
                      {formMode === "create" ? "Create Category" : "Edit Category"}
                    </h3>
                    <button onClick={closeForm} type="button" className="grid h-9 w-9 place-items-center rounded-xl text-[#8d7f76] hover:bg-[#fff0e6] hover:text-[#ff6507] transition"><X size={18} /></button>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#8d7f76]">Name *</label>
                      <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-11 w-full rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 text-[14px] font-medium text-[#2d1810] outline-none placeholder:text-[#aa9b91] focus:border-[#ff6507] focus:ring-2 focus:ring-[#ff6507]/10 transition" placeholder="e.g. Dry Fruits" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#8d7f76]">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="h-24 w-full rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 py-3 text-[14px] font-medium text-[#2d1810] outline-none placeholder:text-[#aa9b91] focus:border-[#ff6507] focus:ring-2 focus:ring-[#ff6507]/10 resize-none transition" placeholder="Brief description" />
                    </div>
                    <div>
                      <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#8d7f76]">Parent Category</label>
                      <select value={form.parentCategory} onChange={(e) => setForm((p) => ({ ...p, parentCategory: e.target.value }))} className="h-11 w-full rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 text-[14px] font-medium text-[#2d1810] outline-none focus:border-[#ff6507] focus:ring-2 focus:ring-[#ff6507]/10 transition">
                        <option value="">None (Top Level)</option>
                        {parentOptions.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#8d7f76]">Status</label>
                      <div className="flex h-11 items-center gap-3 rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded border-[#c5b7ad] text-[#ff6507] focus:ring-[#ff6507]" />
                          <span className="text-[13px] font-bold text-[#2d1810]">Active</span>
                        </label>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-[12px] font-bold uppercase tracking-wider text-[#8d7f76]">Image</label>
                      <div className="flex items-center gap-4">
                        <label className="relative flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#eaded6] bg-[#faf7f4] transition hover:border-[#ff6507] hover:bg-[#fff9f5]">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploading(true);
                              setError("");
                              try {
                                const fd = new FormData();
                                fd.append("file", file);
                                const { data } = await API.post("/upload", fd);
                                if (data.success) setForm((p) => ({ ...p, image: data.url }));
                              } catch (err) {
                                setError(err.response?.data?.message || "Upload failed");
                              }
                              setUploading(false);
                            }}
                          />
                          {uploading ? (
                            <Loader2 size={22} className="animate-spin text-[#ff6507]" />
                          ) : form.image ? (
                            <img src={form.image} alt="" className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-[#8d7f76]">
                              <ImageIcon size={22} />
                              <span className="text-[12px] font-bold">Click to upload</span>
                            </div>
                          )}
                        </label>
                        {form.image && (
                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, image: "" }))}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#eaded6] text-[#8d7f76] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-600">{error}</p>}
                  <div className="mt-6 flex gap-3">
                    <button type="submit" disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-[#ff6507] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,101,7,0.18)] transition hover:bg-[#e05300] disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      {formMode === "create" ? "Create Category" : "Save Changes"}
                    </button>
                    <button type="button" onClick={closeForm} className="flex h-11 items-center gap-2 rounded-xl border border-[#eaded6] bg-white px-5 text-[13px] font-bold text-[#2d1810] transition hover:bg-[#fff9f5]">Cancel</button>
                  </div>
                </form>
              )}

              {/* Category Details */}
              {!showForm && catDetails && (
                <div className="rounded-[24px] border border-[#eaded6] bg-white p-6 shadow-[0_12px_28px_rgba(64,35,17,0.03)] sm:p-8">
                  <button
                    type="button"
                    onClick={() => setSelectedCat(null)}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[#8d7f76] hover:text-[#ff6507] transition mb-4"
                  >
                    <ArrowLeft size={15} /> Back to Categories
                  </button>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                      {catDetails.image ? (
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] border border-[#eaded6] bg-[#fffaf5]">
                          <img src={catDetails.image} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[20px] bg-[#fffaf5] border border-[#eaded6]">
                          <ImageIcon size={28} className="text-[#d0c4ba]" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-[22px] font-bold text-[#2d1810]">{catDetails.name}</h3>
                          <span className={`rounded-full px-3 py-0.5 text-[11px] font-bold border ${
                            catDetails.isActive !== false
                              ? "bg-[#f6ffed] text-[#389e0d] border-[#b7eb8f]"
                              : "bg-[#f5f5f5] text-[#8c8c8c] border-[#d9d9d9]"
                          }`}>
                            {catDetails.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] font-semibold text-[#8d7f76]">/{catDetails.slug}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEdit(catDetails)} className="flex h-10 items-center gap-1.5 rounded-xl border border-[#eaded6] bg-white px-4 text-[13px] font-bold text-[#5a4d45] hover:border-[#ff6507] hover:text-[#ff6507] transition duration-200" type="button"><Edit3 size={14} /> Edit</button>
                      <button onClick={() => toggleActive(catDetails)} className={`flex h-10 items-center gap-1.5 rounded-xl border px-4 text-[13px] font-bold transition duration-200 ${
                        catDetails.isActive !== false
                          ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                          : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      }`} type="button">
                        {catDetails.isActive !== false ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                        {catDetails.isActive !== false ? "Archive" : "Restore"}
                      </button>
                      <button onClick={() => deleteCategory(catDetails._id)} className="flex h-10 items-center gap-1.5 rounded-xl border border-red-200 px-4 text-[13px] font-bold text-red-500 hover:bg-red-50 transition duration-200" type="button"><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d7f76]">Product Count</p>
                      <p className="mt-1 text-[22px] font-bold text-[#2d1810]">{loadingProducts ? <Loader2 size={18} className="animate-spin text-[#ff6507]" /> : catProducts.length}</p>
                    </div>
                    <div className="rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d7f76]">Parent</p>
                      <p className="mt-1 text-[15px] font-bold text-[#2d1810]">{catDetails.parentCategory?.name || "Top Level"}</p>
                    </div>
                    <div className="rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d7f76]">Created</p>
                      <p className="mt-1 text-[13px] font-bold text-[#2d1810]">{new Date(catDetails.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d7f76]">Updated</p>
                      <p className="mt-1 text-[13px] font-bold text-[#2d1810]">{new Date(catDetails.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>

                  {catDetails.description && (
                    <div className="mt-5 rounded-xl border border-[#eaded6] bg-[#faf7f4] px-4 py-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8d7f76]">Description</p>
                      <p className="mt-1 text-[13px] text-[#2d1810] font-medium leading-relaxed">{catDetails.description}</p>
                    </div>
                  )}

                  {/* Products in this category */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[14px] font-bold text-[#2d1810]">
                        Products ({loadingProducts ? "..." : catProducts.length})
                      </h4>
                    </div>
                    {loadingProducts ? (
                      <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#ff6507]" /></div>
                    ) : catProducts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#eaded6] bg-[#faf7f4] px-4 py-10 text-center">
                        <Package size={28} className="mx-auto text-[#d0c4ba]" />
                        <p className="mt-2 text-[13px] font-bold text-[#8d7f76]">No products in this category</p>
                        <p className="mt-1 text-[12px] text-[#aa9b91]">Add products from Inventory to see them here</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#eaded6] overflow-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-[#eaded6] bg-[#faf7f4]">
                              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8d7f76]">Product</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8d7f76]">SKU</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8d7f76]">Price</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8d7f76]">Stock</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8d7f76]">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catProducts.map((p) => (
                              <tr key={p._id} className="border-b border-[#eaded6] last:border-0 hover:bg-[#fff9f5] transition">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    {p.images?.[0]?.url ? (
                                      <img src={p.images[0].url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-[#eaded6] object-cover bg-white" />
                                    ) : (
                                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f5f0eb] text-[#8d7f76]"><Package size={14} /></span>
                                    )}
                                    <span className="text-[13px] font-bold text-[#2d1810] truncate max-w-[180px]">{p.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[12px] font-semibold text-[#8d7f76]">{p.sku}</td>
                                <td className="px-4 py-3 text-[13px] font-bold text-[#2d1810]">₹{p.sellingPrice}</td>
                                <td className="px-4 py-3 text-[13px] font-bold text-[#2d1810]">{p.quantity}</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    p.status === "Active" ? "bg-[#f6ffed] text-[#389e0d]" :
                                    p.status === "Out of Stock" ? "bg-[#fff2e8] text-[#d46b08]" :
                                    "bg-[#f5f5f5] text-[#8c8c8c]"
                                  }`}>
                                    {p.status || "Draft"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Subcategories */}
                  {(() => {
                    const subs = allCats.filter((c) => (c.parentCategory?._id || c.parentCategory?.toString()) === catDetails._id);
                    if (subs.length === 0) return null;
                    return (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[14px] font-bold text-[#2d1810]">Subcategories ({subs.length})</h4>
                          <button onClick={() => openCreate(catDetails._id)} className="flex items-center gap-1 text-[12px] font-bold text-[#ff6507] hover:underline" type="button"><Plus size={13} /> Add Subcategory</button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {subs.map((sub) => (
                            <button
                              key={sub._id}
                              type="button"
                              onClick={() => setSelectedCat(sub)}
                              className="flex items-center gap-3 rounded-xl border border-[#eaded6] bg-white p-4 text-left transition hover:border-[#ff6507]/30 hover:shadow-sm"
                            >
                              <FolderClosed size={16} className="shrink-0 text-[#8d7f76]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold text-[#2d1810]">{sub.name}</p>
                                <p className="text-[11px] text-[#8d7f76] font-semibold">{sub.productCount ?? 0} products</p>
                              </div>
                              <ChevronRight size={14} className="shrink-0 text-[#d0c4ba]" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Empty / Welcome state */}
              {!showForm && !catDetails && (
                <div className="rounded-[24px] border border-[#eaded6] bg-white px-8 py-16 text-center shadow-[0_12px_28px_rgba(64,35,17,0.03)] flex flex-col items-center justify-center">
                  <div className="w-[180px] h-[180px] mx-auto flex items-center justify-center">
                    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <rect x="30" y="60" width="140" height="100" rx="12" fill="#FFF5ED" stroke="#FF6507" strokeWidth="2" strokeDasharray="6 4"/>
                      <rect x="50" y="40" width="100" height="40" rx="8" fill="#FF6507" opacity="0.12"/>
                      <rect x="60" y="50" width="80" height="6" rx="3" fill="#FF6507" opacity="0.5"/>
                      <rect x="70" y="62" width="60" height="4" rx="2" fill="#FF6507" opacity="0.3"/>
                      <circle cx="80" cy="110" r="16" fill="#FFF5ED" stroke="#FF6507" strokeWidth="1.5"/>
                      <path d="M74 110 L78 114 L86 106" stroke="#FF6507" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="104" y="96" width="50" height="8" rx="4" fill="#FF6507" opacity="0.15"/>
                      <rect x="104" y="110" width="36" height="6" rx="3" fill="#FF6507" opacity="0.1"/>
                      <circle cx="56" cy="140" r="10" fill="#FFF5ED" stroke="#FF6507" strokeWidth="1.5"/>
                      <path d="M52 140 L55 143 L60 137" stroke="#FF6507" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="74" y="134" width="44" height="6" rx="3" fill="#FF6507" opacity="0.12"/>
                      <rect x="74" y="144" width="30" height="4" rx="2" fill="#FF6507" opacity="0.08"/>
                    </svg>
                  </div>
                  <h3 className="mt-6 text-[22px] font-bold tracking-tight text-[#2d1810]">No category selected</h3>
                  <p className="mt-2 text-[14px] text-[#8d7f76] max-w-[320px]">Select a category from the tree or create a new one.</p>
                  <button onClick={() => openCreate("")} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff6507] px-6 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,101,7,0.18)] transition hover:bg-[#e05300]" type="button">
                    <Plus size={16} /> Create Category
                  </button>
                </div>
              )}

              {/* Category grid overview (when no tree selection) */}
              {!showForm && !catDetails && !loading && sortedCats.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4 border-l-[4px] border-[#ff6507] pl-3">
                    <h4 className="text-[16px] font-black text-[#2d1810]">All Categories</h4>
                    <span className="flex items-center gap-1 text-[13px] font-black text-[#ff6507] cursor-pointer hover:underline">
                      View All <ChevronRight size={14} className="stroke-[3]" />
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sortedCats.slice(0, 12).map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => setSelectedCat(cat)}
                        className="group rounded-[20px] border border-[#eaded6] bg-white p-5 text-left shadow-[0_8px_20px_rgba(64,35,17,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex items-center justify-between gap-4 w-full"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {cat.image ? (
                            <img src={cat.image} alt="" className="h-14 w-14 shrink-0 rounded-full border border-[#eaded6] object-cover bg-white" />
                          ) : (
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f5f0eb] border border-[#eaded6] text-[#8d7f76]"><FolderClosed size={22} /></span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] font-bold text-[#2d1810] group-hover:text-[#ff6507] transition-colors">{cat.name}</p>
                            <p className="mt-0.5 text-[13px] font-medium text-[#8d7f76]">{cat.productCount ?? 0} products</p>
                          </div>
                        </div>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#eaded6] bg-white text-[#ff6507] transition group-hover:bg-[#ff6507] group-hover:text-white">
                          <ChevronRight size={14} strokeWidth={3} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
