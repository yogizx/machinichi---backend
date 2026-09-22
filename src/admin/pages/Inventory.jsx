import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, Barcode, ChevronLeft, ChevronRight, Download, Edit3, ImageIcon, Loader2,
  PackagePlus, PlusCircle, RefreshCw, Search, SlidersHorizontal, Trash2, Upload, X,
  Check, AlertTriangle, Clock, Package, Layers, Warehouse, Box, Calendar, Activity,
  Eye, ShieldAlert, History, Filter, ArrowUpDown, Boxes, Group, CheckSquare, Square,
  Users, ShoppingCart, TrendingUp, Link2, GitBranch, ChevronDown, ChevronUp,
  Truck, FileText, Hash
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";
import AdminLayout from "../components/AdminLayout";

const API = api;

const perPageOptions = [10, 20, 50];
const inventoryTypeOptions = ["Normal", "Serialized", "Batch Managed", "Lot Managed", "Digital"];

const emptyProductForm = {
  name: "", description: "", slug: "", hsnCode: "", brand: "", category: "", subCategory: "",
  manufacturer: "", manufacturerName: "",
  mrpPrice: "", sellingPrice: "", costPrice: "", image: "",
  // Inventory Management
  openingStock: "", quantity: "", reservedStock: "", warehouse: "", rackLocation: "",
  batchNumber: "", lotNumber: "", serialNumber: "",
  expiryDate: "", manufacturingDate: "",
  minStock: "", maxStock: "", reorderLevel: "", inventoryType: "Normal",
  // Supplier Management (inline)
  suppliers: [],
  // Purchase Management
  purchaseHistory: [],
  // Product Relationships
  frequentlyBoughtTogether: [], crossSell: [], upSell: [], bundle: [],
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Inventory({ onAdminLogout }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupByBatch, setGroupByBatch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isPerPageOpen, setIsPerPageOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [manageProduct, setManageProduct] = useState(null);
  const [manageForm, setManageForm] = useState(null);
  const [manageErrors, setManageErrors] = useState({});
  const [manageSaving, setManageSaving] = useState(false);
  const [manageApiError, setManageApiError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkField, setBulkField] = useState("quantity");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [auditProduct, setAuditProduct] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [suppliersList, setSuppliersList] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [expandedSections, setExpandedSections] = useState({ basic: true, inventory: false, supplier: false, purchase: false, sales: false, relationships: false });
  const [newSupplierForm, setNewSupplierForm] = useState(null);
  const [newPurchaseForm, setNewPurchaseForm] = useState(null);

  const fetchProducts = async (page = currentPage) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page, limit: perPage });
      if (searchTerm) params.set("search", searchTerm);
      const { data } = await API.get(`/admin/inventory?${params}`);
      if (data.success) {
        setProducts(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
        setLastUpdatedAt(new Date());
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load inventory");
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const { data } = await API.get("/categories");
      if (data.success) setCategories(data.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCategories(); }, []);

  const fetchSuppliers = async () => {
    try {
      const { data } = await API.get("/admin/suppliers?limit=200");
      if (data.success) setSuppliersList(data.data || []);
    } catch { /* ignore */ }
  };

  const fetchAllProducts = async () => {
    try {
      const { data } = await API.get("/admin/products?limit=500");
      if (data.success) setAllProducts(data.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchSuppliers(); fetchAllProducts(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setCurrentPage(1); fetchProducts(1); }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { fetchProducts(); }, [currentPage, perPage]);

  const silentFetchRef = useRef(fetchProducts);
  silentFetchRef.current = fetchProducts;
  useEffect(() => {
    const interval = setInterval(() => silentFetchRef.current(currentPage), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentPage, perPage]);

  // keep lastUpdated ticking every 30s for relative time display without extra fetch
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick(v => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const warehouseOptions = useMemo(() => {
    const s = new Set(products.map(p => p.warehouse).filter(Boolean));
    return Array.from(s);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let out = [...products];
    if (categoryFilter && categoryFilter !== "") out = out.filter(p => (p.category?._id || p.category) === categoryFilter);
    if (warehouseFilter) out = out.filter(p => (p.warehouse || "") === warehouseFilter);
    if (inventoryTypeFilter) out = out.filter(p => (p.inventoryType || "Normal") === inventoryTypeFilter);
    if (statusFilter === "low") out = out.filter(p => {
      const avail = (p.availableStock ?? ((p.quantity ?? 0) - (p.reservedQuantity ?? 0)));
      const reorder = p.reorderLevel ?? p.lowStockThreshold ?? 10;
      return avail > 0 && avail <= reorder;
    });
    else if (statusFilter === "out") out = out.filter(p => {
      const avail = (p.availableStock ?? ((p.quantity ?? 0) - (p.reservedQuantity ?? 0)));
      return avail <= 0;
    });
    else if (statusFilter === "expiry") out = out.filter(p => {
      if (!p.expiryDate) return false;
      const d = daysUntil(p.expiryDate);
      return d !== null && d <= 30;
    });
    else if (statusFilter === "overstock") out = out.filter(p => p.maxStock && (p.quantity ?? 0) > p.maxStock);
    return out;
  }, [products, categoryFilter, warehouseFilter, inventoryTypeFilter, statusFilter]);

  const groupedDisplay = useMemo(() => {
    if (!groupByBatch) return filteredProducts;
    // group by warehouse + batch/lot for visual separation; keep flat but annotated
    return [...filteredProducts].sort((a, b) => {
      const ak = `${a.warehouse || ""}-${a.batchNumber || a.lotNumber || ""}`;
      const bk = `${b.warehouse || ""}-${b.batchNumber || b.lotNumber || ""}`;
      return ak.localeCompare(bk);
    });
  }, [filteredProducts, groupByBatch]);

  const metrics = useMemo(() => {
    const totalSKUs = products.length;
    const low = products.filter(p => {
      const avail = (p.availableStock ?? ((p.quantity ?? 0) - (p.reservedQuantity ?? 0)));
      const reorder = p.reorderLevel ?? p.lowStockThreshold ?? 10;
      return avail > 0 && avail <= reorder;
    }).length;
    const out = products.filter(p => (p.availableStock ?? ((p.quantity ?? 0) - (p.reservedQuantity ?? 0))) <= 0).length;
    const expiring = products.filter(p => p.expiryDate && daysUntil(p.expiryDate) !== null && daysUntil(p.expiryDate) <= 30 && daysUntil(p.expiryDate) >= 0).length;
    const expired = products.filter(p => p.expiryDate && daysUntil(p.expiryDate) !== null && daysUntil(p.expiryDate) < 0).length;
    const valuation = products.reduce((s, p) => s + (p.sellingPrice || 0) * (p.quantity || 0), 0);
    return { totalSKUs, low, out, expiring, expired, valuation };
  }, [products]);

  const safePage = Math.min(currentPage, totalPages);
  const showingStart = groupedDisplay.length ? (safePage - 1) * perPage + 1 : 0;
  const showingEnd = Math.min(safePage * perPage, groupedDisplay.length);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyProductForm);
    setFormError("");
    setExpandedSections({ basic: true, inventory: false, supplier: false, purchase: false, sales: false, relationships: false });
    setShowModal(true);
  };
  const openEditModal = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "", description: product.description || "", slug: product.slug || "",
      hsnCode: product.hsnCode || "", brand: product.brand || "",
      category: product.category?._id || "", subCategory: product.subCategory?._id || "",
      manufacturerName: product.manufacturerName || "",
      mrpPrice: product.mrpPrice ?? "", sellingPrice: product.sellingPrice ?? "",
      costPrice: product.costPrice ?? "",
      image: product.images?.[0]?.url || "",
      // Inventory
      openingStock: product.openingStock ?? "", quantity: product.quantity ?? "",
      reservedStock: product.reservedQuantity ?? "",
      warehouse: product.warehouse || "", rackLocation: product.rackLocation || "",
      batchNumber: product.batchNumber || "", lotNumber: product.lotNumber || "",
      serialNumber: product.serialNumber || "",
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0,10) : "",
      manufacturingDate: product.manufacturingDate ? new Date(product.manufacturingDate).toISOString().slice(0,10) : "",
      minStock: product.minStock ?? "", maxStock: product.maxStock ?? "",
      reorderLevel: product.reorderLevel ?? product.lowStockThreshold ?? "",
      inventoryType: product.inventoryType || "Normal",
      // Supplier & Purchase (read from product)
      suppliers: (product.suppliers || []).map(s => ({
        name: s.name || s.supplierId?.name || "",
        code: s.code || s.supplierId?.code || "",
        contact: s.contact || s.supplierId?.phone || s.supplierId?.contact || "",
        supplierId: s.supplierId?._id || s.supplierId || "",
        supplierSKU: s.supplierSKU || "",
        purchaseCost: s.purchaseCost || "",
        leadTime: s.leadTime || "",
        isPreferred: s.isPreferred || false,
      })),
      purchaseHistory: (product.purchaseHistory || []).map(p => ({
        invoiceNumber: p.invoiceNumber || "",
        date: p.date || "",
        vendor: p.vendor || "",
        cost: p.cost || "",
        quantity: p.quantity || "",
      })),
      // Relationships
      frequentlyBoughtTogether: product.frequentlyBoughtTogether || [],
      crossSell: product.crossSell || [],
      upSell: product.upSell || [],
      bundle: product.bundle || [],
    });
    setFormError("");
    setExpandedSections({ basic: true, inventory: false, supplier: false, purchase: false, sales: false, relationships: false });
    setShowModal(true);
  };
  const saveProduct = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category) {
      setFormError("Product Name and Category are required");
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(form.category)) {
      setFormError("Please select a valid category from the category dropdown.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const catName = categories.find(c => c._id === form.category)?.name || "General";
      const payload = {
        name: form.name.trim(), hsnCode: form.hsnCode.trim() || "0000",
        brand: form.brand.trim() || "",
        description: form.description?.trim() || "",
        slug: form.slug?.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        category: form.category,
        subCategory: (form.subCategory && /^[0-9a-fA-F]{24}$/.test(form.subCategory)) ? form.subCategory : undefined,
        manufacturerName: form.manufacturerName.trim() || undefined,
        mrpPrice: Number(form.mrpPrice) || 0, sellingPrice: Number(form.sellingPrice) || 0,
        costPrice: Number(form.costPrice) || 0,
        unitType: "Kilogram",
        images: form.image ? [{ url: form.image, alt: form.name, isPrimary: true, order: 0 }] : [],
        tags: [catName.toLowerCase()],
        // Inventory Management
        openingStock: Number(form.openingStock) || 0,
        quantity: Number(form.quantity) || 0,
        reservedQuantity: Number(form.reservedStock) || 0,
        warehouse: form.warehouse.trim() || undefined,
        rackLocation: form.rackLocation.trim() || undefined,
        batchNumber: form.batchNumber.trim() || undefined,
        lotNumber: form.lotNumber.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
        expiryDate: form.expiryDate || undefined,
        manufacturingDate: form.manufacturingDate || undefined,
        minStock: Number(form.minStock) || 5,
        maxStock: form.maxStock ? Number(form.maxStock) : undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        lowStockThreshold: form.reorderLevel ? Number(form.reorderLevel) : 10,
        inventoryType: form.inventoryType || "Normal",
        // Supplier Management
        suppliers: form.suppliers?.length ? form.suppliers.filter(s => s.supplierId).map(s => ({
          supplierId: s.supplierId,
          supplierSKU: s.supplierSKU || undefined,
          purchaseCost: s.purchaseCost ? Number(s.purchaseCost) : undefined,
          leadTime: s.leadTime ? Number(s.leadTime) : undefined,
          isPreferred: s.isPreferred || false,
        })) : [],
        // Purchase Management
        purchaseHistory: form.purchaseHistory?.length ? form.purchaseHistory.map(p => ({
          invoiceNumber: p.invoiceNumber || undefined,
          date: p.date || undefined,
          supplierId: p.supplierId || undefined,
          cost: p.cost ? Number(p.cost) : 0,
          quantity: p.quantity ? Number(p.quantity) : 0,
          reference: p.vendor || undefined,
        })) : [],
        // Product Relationships
        frequentlyBoughtTogether: form.frequentlyBoughtTogether?.length ? form.frequentlyBoughtTogether : undefined,
        crossSell: form.crossSell?.length ? form.crossSell : undefined,
        upSell: form.upSell?.length ? form.upSell : undefined,
        bundle: form.bundle?.length ? form.bundle : undefined,
      };

      let productId;
      if (editingId) {
        const { data } = await API.put(`/admin/products/${editingId}`, payload);
        productId = editingId;
      } else {
        const { data } = await API.post("/admin/products", payload);
        productId = data.data?._id;
      }

      setShowModal(false); fetchProducts(currentPage);
    } catch (err) {
      const status = err.response?.status;
      const issues = err.response?.data?.errors || err.response?.data?.issues;
      const message = err.response?.data?.message;

      if (Array.isArray(issues) && issues.length) {
        const msg = issues.map(i => {
          const path = i.path?.length ? i.path.join(".") + ": " : "";
          return path + i.message;
        }).join(" • ");
        setFormError("Validation Error: " + msg);
      } else if (status === 400 && message) {
        setFormError("Product Creation Failed: " + message);
      } else if (status === 401) {
        setFormError("Admin session expired. Please login again.");
      } else if (status === 403) {
        setFormError("You do not have permission to create products.");
      } else if (status === 409) {
        setFormError("Conflict Error: " + (message || "A product with this information already exists."));
      } else if (status === 413) {
        setFormError("Product image is too large. Please upload a smaller image file.");
      } else if (status === 422) {
        setFormError("Validation Error: " + (message || "Please check form fields."));
      } else if (status === 500) {
        setFormError("Server error while creating the product: " + (message || "Please check backend logs."));
      } else {
        setFormError(message || err.message || "Unable to connect to the backend server.");
      }
    }
    setSaving(false);
  };
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setFormError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await API.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data?.url) {
        setForm(p => ({ ...p, image: data.url }));
      } else {
        setFormError("Product image upload failed. Please try again.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Product image upload failed. Please try a smaller image.");
    } finally {
      setUploadingImage(false);
    }
  };
  const handleRestock = async (e) => {
    e.preventDefault();
    const qty = Number(restockQty);
    if (!restockProduct || !qty || qty <= 0) return;
    try {
      const currentStock = restockProduct.quantity || 0;
      await API.patch(`/admin/products/${restockProduct._id}/inventory`, { quantity: currentStock + qty, note: `Restocked +${qty}` });
      setRestockProduct(null); setRestockQty(""); fetchProducts(currentPage);
    } catch (err) {
      const msg = err.response?.data?.issues?.[0]?.message || err.response?.data?.message || "Restock failed";
      alert(msg);
    }
  };
  const confirmDelete = async () => {
    if (!deleteProduct) return;
    try { await API.delete(`/admin/products/${deleteProduct._id}`); setDeleteProduct(null); fetchProducts(currentPage); }
    catch (err) { alert(err.response?.data?.message || "Delete failed"); }
  };

  // ── Manage inventory drawer ──
  const openManage = (p) => {
    setManageProduct(p);
    setManageApiError(""); setManageErrors({});
    setManageForm({
      openingStock: p.openingStock ?? "",
      quantity: p.quantity ?? 0,
      reservedQuantity: p.reservedQuantity ?? 0,
      minStock: p.minStock ?? "",
      maxStock: p.maxStock ?? "",
      reorderLevel: p.reorderLevel ?? p.lowStockThreshold ?? "",
      lowStockThreshold: p.lowStockThreshold ?? "",
      warehouse: p.warehouse || "",
      rackLocation: p.rackLocation || "",
      barcode: p.barcode || "",
      batchNumber: p.batchNumber || "",
      lotNumber: p.lotNumber || "",
      serialNumber: p.serialNumber || "",
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().slice(0,10) : "",
      manufacturingDate: p.manufacturingDate ? new Date(p.manufacturingDate).toISOString().slice(0,10) : "",
      inventoryType: p.inventoryType || "Normal",
      note: "",
    });
  };
  const validateManage = () => {
    const errs = {};
    const q = Number(manageForm.quantity);
    const r = Number(manageForm.reservedQuantity);
    if (q < 0) errs.quantity = "Current stock cannot be negative";
    if (r < 0) errs.reservedQuantity = "Reserved cannot be negative";
    if (r > q) errs.reservedQuantity = "Reserved cannot exceed Current Stock";
    if (manageForm.minStock !== "" && Number(manageForm.minStock) < 0) errs.minStock = "Minimum cannot be negative";
    if (manageForm.maxStock !== "" && Number(manageForm.maxStock) < 0) errs.maxStock = "Maximum cannot be negative";
    if (manageForm.reorderLevel !== "" && Number(manageForm.reorderLevel) < 0) errs.reorderLevel = "Reorder cannot be negative";
    if (manageForm.maxStock !== "" && manageForm.reorderLevel !== "" && Number(manageForm.reorderLevel) >= Number(manageForm.maxStock)) errs.reorderLevel = "Reorder must be < Maximum Stock";
    if (manageForm.minStock !== "" && manageForm.maxStock !== "" && Number(manageForm.minStock) > Number(manageForm.maxStock)) errs.maxStock = "Maximum must be ≥ Minimum";
    if (manageForm.expiryDate && manageForm.manufacturingDate && new Date(manageForm.expiryDate) <= new Date(manageForm.manufacturingDate)) errs.expiryDate = "Expiry must be after Manufacturing date";
    if (manageForm.openingStock !== "" && Number(manageForm.openingStock) < 0) errs.openingStock = "Opening stock cannot be negative";
    setManageErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const saveManage = async (e) => {
    e.preventDefault();
    if (!validateManage()) return;
    setManageSaving(true); setManageApiError("");
    try {
      const payload = {};
      const numFields = ["openingStock","quantity","reservedQuantity","minStock","maxStock","reorderLevel","lowStockThreshold"];
      numFields.forEach(k => {
        const v = manageForm[k];
        if (v !== "" && v !== null && v !== undefined) payload[k] = Number(v);
      });
      // map reorderLevel also to lowStockThreshold fallback for backward compat if lowStockThreshold empty
      if (payload.reorderLevel !== undefined && payload.lowStockThreshold === undefined) payload.lowStockThreshold = payload.reorderLevel;
      ["warehouse","rackLocation","barcode","batchNumber","lotNumber","serialNumber","inventoryType"].forEach(k => {
        if (manageForm[k] !== "") payload[k] = manageForm[k];
      });
      if (manageForm.expiryDate) payload.expiryDate = new Date(manageForm.expiryDate).toISOString();
      if (manageForm.manufacturingDate) payload.manufacturingDate = new Date(manageForm.manufacturingDate).toISOString();
      if (manageForm.note) payload.note = manageForm.note;
      // ensure at least one field
      if (Object.keys(payload).length === 0) { setManageApiError("No changes to save"); setManageSaving(false); return; }
      await API.patch(`/admin/products/${manageProduct._id}/inventory`, payload);
      setManageProduct(null); fetchProducts(currentPage);
    } catch (err) {
      const issues = err.response?.data?.issues;
      if (Array.isArray(issues) && issues.length) {
        const map = {};
        issues.forEach(it => { const path = it.path?.[0] || "_"; map[path] = it.message; });
        setManageErrors(map);
        setManageApiError(issues.map(i => `${i.path?.join(".")}: ${i.message}`).join(" • "));
      } else setManageApiError(err.response?.data?.message || "Inventory update failed");
    }
    setManageSaving(false);
  };

  const fetchAudit = async (p) => {
    setAuditProduct(p); setAuditLoading(true); setAuditError(""); setAuditLogs([]);
    try {
      const { data } = await API.get(`/admin/products/${p._id}/inventory-logs?limit=50`);
      if (data.success) setAuditLogs(data.data || []);
      else setAuditError("Failed to load audit");
    } catch (e) { setAuditError(e.response?.data?.message || "Failed to load audit"); }
    setAuditLoading(false);
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const ids = groupedDisplay.map(p => p._id);
    setSelectedIds(prev => prev.length === ids.length ? [] : ids);
  };
  const handleBulkAdjust = async (e) => {
    e.preventDefault();
    if (!selectedIds.length || bulkValue === "") return;
    const v = Number(bulkValue);
    if (isNaN(v) || v < 0) { alert("Value must be ≥ 0"); return; }
    setBulkSaving(true);
    try {
      for (const id of selectedIds) {
        const p = products.find(x => x._id === id);
        const payload = { note: `Bulk adjust ${bulkField} → ${v}` };
        if (bulkField === "quantity") payload.quantity = v;
        else if (bulkField === "reservedQuantity") {
          if (v > (p?.quantity ?? 0)) { alert(`Reserved cannot exceed current stock for ${p?.sku}`); continue; }
          payload.reservedQuantity = v;
        }
        else if (bulkField === "reorderLevel") payload.reorderLevel = v;
        else if (bulkField === "warehouse") payload.warehouse = bulkValue;
        else if (bulkField === "addQty") {
          const cur = p?.quantity ?? 0;
          payload.quantity = cur + v;
        }
        await API.patch(`/admin/products/${id}/inventory`, payload);
      }
      setShowBulk(false); setBulkValue(""); setSelectedIds([]); fetchProducts(currentPage);
    } catch (err) { alert(err.response?.data?.message || err.response?.data?.issues?.[0]?.message || "Bulk update failed"); }
    setBulkSaving(false);
  };

  const availableFor = (p, formOverride) => {
    const cur = formOverride ? Number(formOverride.quantity ?? 0) : (p.availableStock ?? ((p.quantity ?? 0) - (p.reservedQuantity ?? 0)));
    if (formOverride) return Math.max(0, Number(formOverride.quantity || 0) - Number(formOverride.reservedQuantity || 0));
    return Math.max(0, cur);
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#faf9f6] text-[#21150f] px-5 py-8 sm:px-8 lg:px-10">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-black tracking-tight text-[#3a1100] font-serif">Inventory Management</h1>
            <p className="mt-1.5 text-[13.5px] font-semibold text-[#796d66]">Enterprise stock control — opening, current, reserved &amp; available (auto-calculated) with warehouse &amp; batch tracking</p>
            <p className="mt-1.5 flex items-center gap-2 text-[11.5px] font-bold text-[#9a8b82]">
              <Clock size={12} /> Last updated: {lastUpdatedAt ? `${lastUpdatedAt.toLocaleString()} • ${Math.floor((Date.now() - lastUpdatedAt.getTime())/60000) === 0 ? "just now" : `${Math.floor((Date.now() - lastUpdatedAt.getTime())/60000)} min ago`} • auto-refresh every 5 mins` : "never"} <button onClick={() => fetchProducts(currentPage)} className="ml-1 inline-flex h-6 items-center gap-1 rounded-lg border border-[#efe5dc] bg-white px-2 text-[10.5px] font-black text-[#5c514b] hover:border-[#fd761a]"> <RefreshCw size={11}/> Refresh</button>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button onClick={() => setShowBulk(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3a1100] px-5 text-[12.5px] font-black text-white hover:bg-[#5a1f0a] transition" type="button">
                <SlidersHorizontal size={14} /> Bulk Adjust ({selectedIds.length})
              </button>
            )}
            <button onClick={openAddModal} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#fd761a] px-6 text-[13px] font-black text-white shadow-[0_4px_12px_rgba(253,118,26,0.15)] transition hover:bg-[#e86710] hover:-translate-y-0.5" type="button">
              <PlusCircle size={15} /> Add New Product
            </button>
          </div>
        </header>

        {/* Analytics row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-8">
          {[
            { label: "Total SKUs", val: metrics.totalSKUs, icon: Package, cls: "bg-white border-[#efe5dc] text-[#3a1100]" },
            { label: "Out of Stock", val: metrics.out, icon: AlertTriangle, cls: "bg-rose-50/40 border-rose-100 text-rose-700" },
            { label: "Low Stock Alert", val: metrics.low, icon: SlidersHorizontal, cls: "bg-amber-50/40 border-amber-100 text-amber-700" },
            { label: "Expiring ≤30d", val: metrics.expiring, sub: metrics.expired ? `${metrics.expired} expired` : null, icon: Clock, cls: "bg-orange-50/40 border-orange-100 text-orange-700" },
            { label: "Valuation", val: `₹${metrics.valuation.toLocaleString("en-IN")}`, icon: Boxes, cls: "bg-emerald-50/40 border-emerald-100 text-emerald-700" },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className={`rounded-2xl border p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] ${m.cls}`}>
                <div className="flex justify-between items-center opacity-80"><span className="text-[11px] font-bold uppercase tracking-wider">{m.label}</span><Icon size={14} /></div>
                <p className="mt-2.5 text-[22px] font-black tracking-tight font-serif sm:text-[24px]">{m.val}</p>
                {m.sub && <p className="text-[11px] font-bold opacity-70">{m.sub}</p>}
              </div>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#efe5dc] bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.015)] mb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8b82]" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, SKU, barcode…" className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] pl-10 pr-4 text-[13px] text-[#211713] outline-none placeholder:text-[#9a8b82] transition focus:border-[#fd761a] focus:bg-white" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] outline-none">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="h-10 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] outline-none">
                <option value="">All Warehouses</option>
                {warehouseOptions.map(w => <option key={w} value={w}>{w}</option>)}
                {warehouseOptions.length===0 && <option disabled>No warehouses</option>}
              </select>
              <select value={inventoryTypeFilter} onChange={e => setInventoryTypeFilter(e.target.value)} className="h-10 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] outline-none">
                <option value="">All Types</option>
                {inventoryTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[12.5px] font-black text-[#5c514b] outline-none">
                <option value="">All Stock Status</option>
                <option value="low">Low Stock (≤ reorder)</option>
                <option value="out">Out of Stock</option>
                <option value="expiry">Expiry ≤30 days</option>
                <option value="overstock">Over Max Stock</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[#f5eee8] pt-3">
            <label className="flex items-center gap-2 text-[12.5px] font-bold text-[#5c514b] cursor-pointer">
              <input type="checkbox" checked={groupByBatch} onChange={e => setGroupByBatch(e.target.checked)} className="h-4 w-4 rounded border-[#c7bab0] text-[#fd761a] focus:ring-[#fd761a]" />
              Group by Batch / Lot
            </label>
            <span className="text-[11px] text-[#9a8b82]">Available = Current − Reserved (live auto-calc) • Hover stock bar for breakdown</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button disabled={safePage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 grid place-items-center" type="button"><ChevronLeft size={14} /></button>
              <span className="text-[12px] font-black text-[#796d66]">Page {safePage} / {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 grid place-items-center" type="button"><ChevronRight size={14} /></button>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="h-8 rounded-lg border border-[#e5d8cd] bg-white px-2 text-[12px] font-bold text-[#5c514b]">
                {perPageOptions.map(o => <option key={o} value={o}>{o}/page</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3.5 text-[13px] font-semibold text-rose-700 flex items-center justify-between"><span>{error}</span><button onClick={() => fetchProducts()} className="underline font-bold" type="button">Retry</button></div>}

        {loading ? <div className="flex items-center justify-center py-24"><div className="flex flex-col items-center gap-2"><Loader2 size={30} className="animate-spin text-[#fd761a]" /><p className="text-[12.5px] font-bold text-[#796d66]">Fetching records…</p></div></div>
        : groupedDisplay.length === 0 ? <div className="rounded-2xl border border-[#efe5dc] bg-white px-8 py-20 text-center shadow-sm"><Archive size={42} className="mx-auto text-[#c7bab0] mb-4" /><h3 className="text-[17px] font-black text-[#3a1100] font-serif">No products found</h3><p className="mt-1 text-[13px] text-[#796d66]">Try adjusting search or filters.</p></div>
        : (
          <div className="rounded-2xl border border-[#efe5dc] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.015)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-left border-collapse">
                <thead className="bg-[#faf8f5] text-[10.5px] font-black uppercase tracking-wider text-[#9a8b82] border-b border-[#efe5dc]">
                  <tr>
                    <th className="px-4 py-4 w-8 text-center"><button onClick={toggleSelectAll} className="text-[#9a8b82] hover:text-[#3a1100]" type="button">{selectedIds.length===groupedDisplay.length && groupedDisplay.length>0 ? <CheckSquare size={16} className="text-[#fd761a]" /> : <Square size={16} />}</button></th>
                    <th className="px-3 py-4 w-14">Image</th>
                    <th className="px-3 py-4">Product • SKU / Barcode</th>
                    <th className="px-3 py-4">Warehouse • Rack</th>
                    <th className="px-3 py-4">Type</th>
                    <th className="px-3 py-4">Opening → Current / Reserved → <span className="text-[#fd761a]">Available</span></th>
                    <th className="px-3 py-4">Min / Max / Reorder</th>
                    <th className="px-3 py-4">Batch • Lot • Serial</th>
                    <th className="px-3 py-4">Mfg → Expiry</th>
                    <th className="px-3 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5eee8] bg-white text-[13px]">
                  {groupedDisplay.map((product) => {
                    const cur = product.quantity ?? 0;
                    const reserved = product.reservedQuantity ?? 0;
                    const avail = product.availableStock ?? Math.max(0, cur - reserved);
                    const maxForPct = product.maxStock || Math.max(avail * 1.5, 20);
                    const pct = Math.min(100, Math.max(4, Math.round((avail / Math.max(maxForPct,1))*100)));
                    const reorder = product.reorderLevel ?? product.lowStockThreshold ?? 10;
                    const isLow = avail > 0 && avail <= reorder;
                    const isOut = avail <= 0;
                    const isOverMax = product.maxStock && cur > product.maxStock;
                    const expDays = product.expiryDate ? daysUntil(product.expiryDate) : null;
                    const expWarn = expDays !== null && expDays <= 30 && expDays >= 0;
                    const expOver = expDays !== null && expDays < 0;
                    const isSel = selectedIds.includes(product._id);
                    return (
                      <tr key={product._id} className={`transition hover:bg-[#fffcf9]/40 ${isSel ? "bg-orange-50/30" : ""}`}>
                        <td className="px-4 py-4 text-center"><button onClick={() => toggleSelect(product._id)} className="text-[#9a8b82] hover:text-[#3a1100]" type="button">{isSel ? <CheckSquare size={16} className="text-[#fd761a]" /> : <Square size={16} />}</button></td>
                        <td className="px-3 py-4"><div className="h-11 w-11 rounded-lg border border-[#efe5dc] bg-[#faf7f4] overflow-hidden shrink-0 grid place-items-center">{product.images?.[0]?.url ? <img src={product.images[0].url} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-gray-300" />}</div></td>
                        <td className="px-3 py-4 min-w-[180px]">
                          <p className="font-bold text-[#3a1100] leading-tight line-clamp-1">{product.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#796d66] bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5"><Barcode size={10} /> {product.sku}</span>
                            {product.barcode && <span className="text-[11px] font-mono bg-[#fff7ed] border border-orange-100 rounded px-1.5 py-0.5 text-[#9a3412]">{product.barcode}</span>}
                          </div>
                          <p className="text-[11px] font-semibold text-[#9a8b82] mt-1">{product.brand || "Machinichi"} • {product.category?.name || "General"}</p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center gap-1 rounded bg-[#faf7f4] border border-[#efe5dc] px-2 py-1 text-[11px] font-bold text-[#5c514b]"><Warehouse size={11} /> {product.warehouse || "—"}</span>
                          <p className="text-[11px] font-semibold text-[#9a8b82] mt-1 flex items-center gap-1"><Box size={10} /> {product.rackLocation || "No rack"}</p>
                        </td>
                        <td className="px-3 py-4"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${product.inventoryType==="Digital"?"bg-purple-50 border-purple-200 text-purple-700":product.inventoryType==="Batch Managed"?"bg-sky-50 border-sky-200 text-sky-700":product.inventoryType==="Serialized"?"bg-amber-50 border-amber-200 text-amber-700":product.inventoryType==="Lot Managed"?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-[#faf7f4] border-[#efe5dc] text-[#5c514b]"}`}>{product.inventoryType || "Normal"}</span></td>
                        <td className="px-3 py-4 min-w-[220px]">
                          <div className="flex items-center gap-1.5 text-[12px] font-black">
                            <span className="text-[#9a8b82]" title="Opening Stock">{product.openingStock ?? 0}</span>
                            <span className="text-[#c7bab0]">→</span>
                            <span className={isOut?"text-rose-600":isLow?"text-amber-600":"text-[#3a1100]"} title="Current Stock">{cur}</span>
                            <span className="text-[#c7bab0]">/</span>
                            <span className="text-[#796d66]" title="Reserved">{reserved}</span>
                            <span className="text-[#c7bab0]">→</span>
                            <span className={`rounded px-1.5 py-0.5 ${isOut?"bg-rose-50 text-rose-700 border border-rose-100":isLow?"bg-amber-50 text-amber-700 border border-amber-100":"bg-emerald-50 text-emerald-700 border border-emerald-100"}`} title="Available = Current - Reserved">{avail}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-[#f0e9e2] overflow-hidden" title={`Available ${avail} / Max ${maxForPct} • Reserved ${reserved}`}>
                            <div className={`h-full rounded-full ${isOut?"bg-rose-500":isLow?"bg-amber-500":isOverMax?"bg-sky-500":"bg-emerald-500"}`} style={{ width: `${isOut?8:pct}%` }} />
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            {isOut && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-700 border border-rose-100">Out</span>}
                            {isLow && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 border border-amber-100 flex items-center gap-0.5"><AlertTriangle size={10}/> Low</span>}
                            {isOverMax && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-sky-700 border border-sky-100">Over Max</span>}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[11px] font-bold text-[#5c514b] leading-relaxed">
                          <div>Min: <span className="text-[#3a1100]">{product.minStock ?? "—"}</span> • Max: <span className={isOverMax?"text-rose-600":"text-[#3a1100]"}>{product.maxStock ?? "—"}</span></div>
                          <div className={isLow?"text-amber-700":"text-[#9a8b82]"}>Reorder: {reorder}</div>
                        </td>
                        <td className="px-3 py-4 text-[11px] font-mono">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[#5c514b]"><Layers size={10}/> B: {product.batchNumber || "—"}</span>
                            <span className="text-[#796d66]">L: {product.lotNumber || "—"}</span>
                            <span className="text-[#9a8b82]">S: {product.serialNumber ? String(product.serialNumber).slice(0,12) : "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[11px] font-bold">
                          <div className="flex items-center gap-1 text-[#5c514b]"><Calendar size={11}/> {product.manufacturingDate ? new Date(product.manufacturingDate).toLocaleDateString("en-IN") : "—"}</div>
                          <div className={`flex items-center gap-1 mt-1 ${expOver?"text-rose-600":expWarn?"text-amber-600":"text-[#796d66]"}`}>
                            <Clock size={11}/> {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("en-IN") : "—"}
                            {expWarn && <span className="rounded bg-amber-50 border border-amber-200 px-1 py-0.5 text-[9px] font-black uppercase text-amber-700">{expDays}d left</span>}
                            {expOver && <span className="rounded bg-rose-50 border border-rose-200 px-1 py-0.5 text-[9px] font-black uppercase text-rose-700">Expired</span>}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <button onClick={() => openManage(product)} className="h-8 px-2.5 rounded-lg border border-[#cfc1b5] text-[11.5px] font-black text-[#5c514b] bg-white hover:border-[#fd761a] hover:text-[#fd761a]" type="button"><Edit3 size={11} className="inline mr-1"/>Manage</button>
                            <button onClick={() => setRestockProduct(product)} className="h-8 px-2.5 rounded-lg border border-emerald-200 text-[11.5px] font-black text-emerald-700 bg-white hover:bg-emerald-50" type="button"><RefreshCw size={11} className="inline mr-1"/>+Stock</button>
                            <button onClick={() => fetchAudit(product)} className="h-8 w-8 rounded-lg border border-[#efe5dc] bg-white grid place-items-center text-[#9a8b82] hover:text-[#3a1100]" title="Audit log" type="button"><History size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f5eee8] px-5 py-4 bg-[#faf8f5]">
              <p className="text-[12px] font-bold text-[#796d66]">Showing {showingStart}–{showingEnd} of {total} SKUs {groupByBatch && <span className="ml-2 rounded bg-white border border-[#efe5dc] px-2 py-0.5 text-[11px]">Grouped by Batch/Lot</span>}</p>
              <div className="flex items-center gap-1.5">
                <button disabled={safePage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="h-9 w-9 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 grid place-items-center hover:border-[#fd761a]" type="button"><ChevronLeft size={15} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0,10).map((p) => (<button key={p} onClick={() => setCurrentPage(p)} className={`h-9 min-w-[36px] rounded-lg text-[12.5px] font-black ${safePage === p ? "bg-[#3a1100] text-white" : "border border-[#cfc1b5] bg-white text-[#5c514b] hover:border-[#fd761a]"}`} type="button">{p}</button>))}
                <button disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-9 w-9 rounded-lg border border-[#cfc1b5] bg-white disabled:opacity-40 grid place-items-center hover:border-[#fd761a]" type="button"><ChevronRight size={15} /></button>
              </div>
            </footer>
          </div>
        )}

        {/* Add/Edit Product modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 py-6 px-4 backdrop-blur-[3px]" onClick={e => { if (e.target===e.currentTarget) setShowModal(false); }}>
              <motion.form initial={{ scale: 0.96, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 15 }} onSubmit={saveProduct} className="w-full max-w-4xl rounded-2xl bg-white border border-[#efe5dc] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                <header className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4 shrink-0">
                  <div>
                    <h2 className="text-[17px] font-black text-[#3a1100] font-serif">{editingId ? "Edit Product" : "Add New Product"}</h2>
                    <p className="text-[11px] font-bold text-[#9a8b82] uppercase mt-0.5">{editingId ? `SKU: ${form.sku || "Auto"} • ID: ${editingId}` : "SKU & Product ID auto-generated"}</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-lg border border-[#efe5dc] grid place-items-center text-gray-400 hover:text-gray-600" type="button"><X size={16}/></button>
                </header>
                {formError && <div className="bg-rose-50 border-b border-rose-100 px-6 py-3 text-[12.5px] font-bold text-rose-700">{formError}</div>}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#faf9f6]/40">

                  {/* Section 1: Basic Product Information */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] overflow-hidden">
                    <button type="button" onClick={() => setExpandedSections(p => ({...p, basic: !p.basic}))} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#faf7f4] transition">
                      <span className="text-[13px] font-black text-[#3a1100] flex items-center gap-2"><Package size={14} className="text-[#fd761a]"/> Basic Product Information</span>
                      {expandedSections.basic ? <ChevronUp size={16} className="text-[#9a8b82]"/> : <ChevronDown size={16} className="text-[#9a8b82]"/>}
                    </button>
                    {expandedSections.basic && (
                      <div className="px-5 pb-5 border-t border-[#f5eee8]">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Product Name *</label><input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" required/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">SKU</label><div className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-gray-50 px-3.5 text-[13px] text-[#796d66] flex items-center">{editingId ? (form.sku || "Auto") : "Auto-generated"}</div></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Product ID</label><div className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-gray-50 px-3.5 text-[13px] text-[#796d66] flex items-center font-mono">{editingId ? editingId : "Auto-generated"}</div></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Brand</label><input value={form.brand} onChange={e => setForm(p=>({...p,brand:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Manufacturer</label><input value={form.manufacturerName} onChange={e => setForm(p=>({...p,manufacturerName:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" placeholder="e.g. ABC Foods Ltd"/></div>
                           <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Category *</label><select value={form.category} onChange={e => { const newCat = e.target.value; setForm(p => { const newSubCat = (p.subCategory && categories.find(c => c._id === p.subCategory)?.parentCategory === newCat) ? p.subCategory : ""; return {...p, category: newCat, subCategory: newSubCat}; }); }} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" required><option value="">Select Category</option>{categories.filter(c => !c.parentCategory).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                           <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Sub Category</label><select value={form.subCategory} onChange={e => setForm(p=>({...p,subCategory:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"><option value="">None</option>{categories.filter(c => c.parentCategory === form.category).length === 0 ? <option disabled>No Sub Categories Available</option> : categories.filter(c => c.parentCategory === form.category).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">HSN Code</label><input value={form.hsnCode} onChange={e => setForm(p=>({...p,hsnCode:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" placeholder="e.g. 1905"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Barcode</label><input value={editingId ? "" : "Auto-generated"} disabled className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-gray-50 px-3.5 text-[13px] text-[#796d66]"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">MRP *</label><input type="number" min="0" step="0.01" value={form.mrpPrice} onChange={e => setForm(p=>({...p,mrpPrice:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" required/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Selling Price *</label><input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={e => setForm(p=>({...p,sellingPrice:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" required/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Cost Price</label><input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(p=>({...p,costPrice:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                           <div className="sm:col-span-2 lg:col-span-3"><label className="mb-2 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Product Image</label><div className="flex items-center gap-4">{form.image && <div className="relative h-20 w-20 rounded-xl border border-[#efe5dc] overflow-hidden shadow-sm"><img src={form.image} alt="" className="h-full w-full object-cover"/><button onClick={()=>setForm(p=>({...p,image:""}))} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 grid place-items-center text-white" type="button"><X size={10}/></button></div>}<label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#cfc1b5] hover:border-[#fd761a] text-[#796d66] hover:text-[#fd761a] bg-[#faf8f5]"><Upload size={18}/><input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) handleImageUpload(f); e.target.value="";}}/></label></div></div>
                           <div className="sm:col-span-2 lg:col-span-3"><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Description</label><textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={3} className="w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 py-2 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white resize-none" placeholder="Enter product description..."/></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Inventory Management */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] overflow-hidden">
                    <button type="button" onClick={() => setExpandedSections(p => ({...p, inventory: !p.inventory}))} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#faf7f4] transition">
                      <span className="text-[13px] font-black text-[#3a1100] flex items-center gap-2"><Boxes size={14} className="text-[#fd761a]"/> Inventory Management</span>
                      {expandedSections.inventory ? <ChevronUp size={16} className="text-[#9a8b82]"/> : <ChevronDown size={16} className="text-[#9a8b82]"/>}
                    </button>
                    {expandedSections.inventory && (
                      <div className="px-5 pb-5 border-t border-[#f5eee8]">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Opening Stock</label><input type="number" min="0" value={form.openingStock} onChange={e => setForm(p=>({...p,openingStock:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Current Stock *</label><input type="number" min="0" value={form.quantity} onChange={e => setForm(p=>({...p,quantity:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" required/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Reserved Stock</label><input type="number" min="0" value={form.reservedStock} onChange={e => setForm(p=>({...p,reservedStock:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Available Stock</label><div className="h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 flex items-center text-[13px] font-black text-emerald-700">{Math.max(0, Number(form.quantity||0) - Number(form.reservedStock||0))}</div><p className="text-[10px] text-[#9a8b82] mt-1">= Current − Reserved (auto)</p></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Warehouse</label><input value={form.warehouse} onChange={e => setForm(p=>({...p,warehouse:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" placeholder="WH-A1"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Rack Location</label><input value={form.rackLocation} onChange={e => setForm(p=>({...p,rackLocation:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" placeholder="Rack 12-B"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Batch Number</label><input value={form.batchNumber} onChange={e => setForm(p=>({...p,batchNumber:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Lot Number</label><input value={form.lotNumber} onChange={e => setForm(p=>({...p,lotNumber:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Serial Number</label><input value={form.serialNumber} onChange={e => setForm(p=>({...p,serialNumber:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Manufacturing Date</label><input type="date" value={form.manufacturingDate} onChange={e => setForm(p=>({...p,manufacturingDate:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Expiry Date</label><input type="date" value={form.expiryDate} onChange={e => setForm(p=>({...p,expiryDate:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Minimum Stock</label><input type="number" min="0" value={form.minStock} onChange={e => setForm(p=>({...p,minStock:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Maximum Stock</label><input type="number" min="0" value={form.maxStock} onChange={e => setForm(p=>({...p,maxStock:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Reorder Level</label><input type="number" min="0" value={form.reorderLevel} onChange={e => setForm(p=>({...p,reorderLevel:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                          <div><label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82]">Inventory Type</label><select value={form.inventoryType} onChange={e => setForm(p=>({...p,inventoryType:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white">{inventoryTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 3: Supplier Management */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] overflow-hidden">
                    <div className="w-full flex items-center justify-between px-5 py-4">
                      <button type="button" onClick={() => setExpandedSections(p => ({...p, supplier: !p.supplier}))} className="flex items-center gap-2 flex-1 text-left hover:bg-[#faf7f4] transition -mx-5 -my-4 px-5 py-4">
                        <span className="text-[13px] font-black text-[#3a1100] flex items-center gap-2"><Truck size={14} className="text-[#fd761a]"/> Supplier Management <span className="text-[11px] font-bold text-[#9a8b82]">({form.suppliers?.length || 0} linked)</span></span>
                        {expandedSections.supplier ? <ChevronUp size={16} className="text-[#9a8b82]"/> : <ChevronDown size={16} className="text-[#9a8b82]"/>}
                      </button>
                      <button type="button" onClick={() => setForm(p => ({...p, suppliers: [...(p.suppliers||[]), { supplierId: "", supplierSKU: "", purchaseCost: "", leadTime: "", isPreferred: false }]}))} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dcc9ba] bg-[#faf8f5] px-3 text-[11px] font-black text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] ml-3 shrink-0">
                        <PlusCircle size={12}/> Add
                      </button>
                    </div>
                    {expandedSections.supplier && (
                      <div className="px-5 pb-5 border-t border-[#f5eee8]">
                        <div className="mt-4 space-y-3">
                          {form.suppliers?.map((sup, idx) => (
                            <div key={idx} className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/40 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-black text-[#3a1100]">Supplier {idx + 1}</p>
                                <button type="button" onClick={() => setForm(p => ({...p, suppliers: (p.suppliers||[]).filter((_,i) => i !== idx)}))} className="h-7 w-7 rounded-lg border border-rose-200 bg-white grid place-items-center text-rose-500 hover:bg-rose-50"><Trash2 size={11}/></button>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Supplier Name *</label><input value={sup.name || ""} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], name: e.target.value}; return {...p, suppliers: s}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="Enter Supplier Name"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Supplier Code</label><input value={sup.code || ""} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], code: e.target.value}; return {...p, suppliers: s}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="Enter Supplier Code"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Supplier Contact</label><input value={sup.contact || ""} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], contact: e.target.value}; return {...p, suppliers: s}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="Enter Contact Info"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Supplier SKU</label><input value={sup.supplierSKU || ""} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], supplierSKU: e.target.value}; return {...p, suppliers: s}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="Enter Supplier SKU"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Purchase Cost (₹)</label><input type="number" min="0" step="0.01" value={sup.purchaseCost || ""} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], purchaseCost: Number(e.target.value)}; return {...p, suppliers: s}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="e.g. 500"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Lead Time (Days)</label><input type="number" min="0" value={sup.leadTime || ""} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], leadTime: Number(e.target.value)}; return {...p, suppliers: s}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="e.g. 7"/></div>
                                <div className="flex items-end"><label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5c514b] cursor-pointer h-9"><input type="checkbox" checked={sup.isPreferred || false} onChange={e => { setForm(p => { const s = [...(p.suppliers||[])]; s[idx] = {...s[idx], isPreferred: e.target.checked}; return {...p, suppliers: s}; }); }} className="h-3.5 w-3.5 rounded border-[#c7bab0] text-[#fd761a]"/> Preferred Supplier</label></div>
                              </div>
                            </div>
                          ))}
                          {(!form.suppliers || form.suppliers.length === 0) && (
                            <p className="text-[12px] font-bold text-[#9a8b82] text-center py-3">No suppliers added. Click + Add to link a supplier.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Purchase Management */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] overflow-hidden">
                    <div className="w-full flex items-center justify-between px-5 py-4">
                      <button type="button" onClick={() => setExpandedSections(p => ({...p, purchase: !p.purchase}))} className="flex items-center gap-2 flex-1 text-left hover:bg-[#faf7f4] transition -mx-5 -my-4 px-5 py-4">
                        <span className="text-[13px] font-black text-[#3a1100] flex items-center gap-2"><FileText size={14} className="text-[#fd761a]"/> Purchase Management <span className="text-[11px] font-bold text-[#9a8b82]">({form.purchaseHistory?.length || 0} records)</span></span>
                        {expandedSections.purchase ? <ChevronUp size={16} className="text-[#9a8b82]"/> : <ChevronDown size={16} className="text-[#9a8b82]"/>}
                      </button>
                      <button type="button" onClick={() => setForm(p => ({...p, purchaseHistory: [...(p.purchaseHistory||[]), { date: new Date().toISOString().slice(0,10), quantity: "", cost: "", supplierId: "", invoiceNumber: "" }]}))} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dcc9ba] bg-[#faf8f5] px-3 text-[11px] font-black text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a] ml-3 shrink-0">
                        <PlusCircle size={12}/> Add
                      </button>
                    </div>
                    {expandedSections.purchase && (
                      <div className="px-5 pb-5 border-t border-[#f5eee8]">
                        <div className="mt-4 space-y-3">
                          {form.purchaseHistory?.map((ph, idx) => (
                            <div key={idx} className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/40 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-black text-[#3a1100]">Purchase Record {idx + 1}</p>
                                <button type="button" onClick={() => setForm(p => ({...p, purchaseHistory: (p.purchaseHistory||[]).filter((_,i) => i !== idx)}))} className="h-7 w-7 rounded-lg border border-rose-200 bg-white grid place-items-center text-rose-500 hover:bg-rose-50"><Trash2 size={11}/></button>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">PO Number</label><input value={ph.invoiceNumber || ""} onChange={e => { setForm(p => { const h = [...(p.purchaseHistory||[])]; h[idx] = {...h[idx], invoiceNumber: e.target.value}; return {...p, purchaseHistory: h}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="e.g. PO-2024-001"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Purchase Date *</label><input type="date" value={ph.date ? new Date(ph.date).toISOString().slice(0,10) : ""} onChange={e => { setForm(p => { const h = [...(p.purchaseHistory||[])]; h[idx] = {...h[idx], date: e.target.value}; return {...p, purchaseHistory: h}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" required/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Vendor</label><input value={ph.vendor || ""} onChange={e => { setForm(p => { const h = [...(p.purchaseHistory||[])]; h[idx] = {...h[idx], vendor: e.target.value}; return {...p, purchaseHistory: h}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" placeholder="Enter Vendor Name"/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Purchase Price (₹) *</label><input type="number" min="0" step="0.01" value={ph.cost || ""} onChange={e => { setForm(p => { const h = [...(p.purchaseHistory||[])]; h[idx] = {...h[idx], cost: Number(e.target.value)}; return {...p, purchaseHistory: h}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" required/></div>
                                <div><label className="block text-[10px] font-bold uppercase text-[#9a8b82] mb-1">Purchase Quantity *</label><input type="number" min="1" value={ph.quantity || ""} onChange={e => { setForm(p => { const h = [...(p.purchaseHistory||[])]; h[idx] = {...h[idx], quantity: Number(e.target.value)}; return {...p, purchaseHistory: h}; }); }} className="h-9 w-full rounded-lg border border-[#e5d8cd] bg-white px-2.5 text-[12px]" required/></div>
                              </div>
                            </div>
                          ))}
                          {(!form.purchaseHistory || form.purchaseHistory.length === 0) && (
                            <p className="text-[12px] font-bold text-[#9a8b82] text-center py-3">No purchase records. Click + Add to create one.</p>
                          )}
                          {form.purchaseHistory && form.purchaseHistory.length > 0 && (
                            <div className="mt-4 rounded-xl border border-[#efe5dc] bg-[#faf7f4] p-4">
                              <p className="text-[11px] font-black text-[#3a1100] mb-3 flex items-center gap-2"><History size={12} className="text-[#fd761a]"/> Purchase History Summary</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-[#efe5dc]">
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">#</th>
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">PO Number</th>
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">Date</th>
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">Vendor</th>
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">Price (₹)</th>
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">Qty</th>
                                      <th className="pb-2 text-[9px] font-bold uppercase text-[#9a8b82]">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {form.purchaseHistory.map((ph, idx) => (
                                      <tr key={idx} className="border-b border-[#f5eee8] last:border-0">
                                        <td className="py-2 text-[11px] font-bold text-[#5c514b]">{idx + 1}</td>
                                        <td className="py-2 text-[11px] font-bold text-[#3a1100]">{ph.invoiceNumber || "—"}</td>
                                        <td className="py-2 text-[11px] text-[#5c514b]">{ph.date ? new Date(ph.date).toLocaleDateString("en-IN") : "—"}</td>
                                        <td className="py-2 text-[11px] text-[#5c514b]">{ph.vendor || "—"}</td>
                                        <td className="py-2 text-[11px] text-[#5c514b]">{ph.cost ? `₹${Number(ph.cost).toLocaleString("en-IN")}` : "—"}</td>
                                        <td className="py-2 text-[11px] text-[#5c514b]">{ph.quantity || "—"}</td>
                                        <td className="py-2 text-[11px] font-bold text-[#3a1100]">{ph.cost && ph.quantity ? `₹${(Number(ph.cost) * Number(ph.quantity)).toLocaleString("en-IN")}` : "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-[#efe5dc]">
                                      <td colSpan={5} className="pt-2 text-[10px] font-bold uppercase text-[#9a8b82]">Total Records: {form.purchaseHistory.length}</td>
                                      <td className="pt-2 text-[11px] font-black text-[#3a1100]">{form.purchaseHistory.reduce((sum, ph) => sum + (Number(ph.quantity) || 0), 0)}</td>
                                      <td className="pt-2 text-[11px] font-black text-[#3a1100]">₹{form.purchaseHistory.reduce((sum, ph) => sum + ((Number(ph.cost) || 0) * (Number(ph.quantity) || 0)), 0).toLocaleString("en-IN")}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 5: Sales Management (Read-only) */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] overflow-hidden">
                    <button type="button" onClick={() => setExpandedSections(p => ({...p, sales: !p.sales}))} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#faf7f4] transition">
                      <span className="text-[13px] font-black text-[#3a1100] flex items-center gap-2"><TrendingUp size={14} className="text-[#fd761a]"/> Sales Management <span className="text-[11px] font-bold text-[#9a8b82]">(auto-calculated)</span></span>
                      {expandedSections.sales ? <ChevronUp size={16} className="text-[#9a8b82]"/> : <ChevronDown size={16} className="text-[#9a8b82]"/>}
                    </button>
                    {expandedSections.sales && (
                      <div className="px-5 pb-5 border-t border-[#f5eee8]">
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/60 p-3.5 text-center"><p className="text-[10px] font-bold uppercase text-[#9a8b82]">Sales Count</p><p className="mt-1 text-[20px] font-black text-[#3a1100]">{editingId ? (allProducts.find(p=>p._id===editingId)?.salesCount || 0) : "—"}</p><p className="text-[10px] text-[#9a8b82]">Based on completed orders</p></div>
                          <div className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/60 p-3.5 text-center"><p className="text-[10px] font-bold uppercase text-[#9a8b82]">Revenue</p><p className="mt-1 text-[20px] font-black text-[#3a1100]">₹{(editingId ? (allProducts.find(p=>p._id===editingId)?.totalRevenue || 0) : 0).toLocaleString("en-IN")}</p><p className="text-[10px] text-[#9a8b82]">From actual sales</p></div>
                          <div className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/60 p-3.5 text-center"><p className="text-[10px] font-bold uppercase text-[#9a8b82]">Last Sold Date</p><p className="mt-1 text-[14px] font-black text-[#3a1100]">{editingId && allProducts.find(p=>p._id===editingId)?.lastSoldDate ? new Date(allProducts.find(p=>p._id===editingId).lastSoldDate).toLocaleDateString("en-IN") : "—"}</p><p className="text-[10px] text-[#9a8b82]">Most recent sale</p></div>
                          <div className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/60 p-3.5 text-center"><p className="text-[10px] font-bold uppercase text-[#9a8b82]">Avg Selling Price</p><p className="mt-1 text-[20px] font-black text-[#3a1100]">₹{(editingId ? (allProducts.find(p=>p._id===editingId)?.averageSellingPrice || 0) : 0).toLocaleString("en-IN")}</p><p className="text-[10px] text-[#9a8b82]">Calculated from sales</p></div>
                        </div>
                        <div className="mt-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] font-bold text-blue-700 flex items-center gap-2"><Activity size={12}/> Sales data is automatically updated from order completions. These values cannot be manually edited.</div>
                      </div>
                    )}
                  </div>

                  {/* Section 6: Product Relationships */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] overflow-hidden">
                    <button type="button" onClick={() => setExpandedSections(p => ({...p, relationships: !p.relationships}))} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#faf7f4] transition">
                      <span className="text-[13px] font-black text-[#3a1100] flex items-center gap-2"><GitBranch size={14} className="text-[#fd761a]"/> Product Relationships</span>
                      {expandedSections.relationships ? <ChevronUp size={16} className="text-[#9a8b82]"/> : <ChevronDown size={16} className="text-[#9a8b82]"/>}
                    </button>
                    {expandedSections.relationships && (
                      <div className="px-5 pb-5 border-t border-[#f5eee8]">
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          {[
                            { key: "frequentlyBoughtTogether", label: "Frequently Bought Together", desc: "Products often purchased with this item" },
                            { key: "crossSell", label: "Cross Sell", desc: "Complementary products to suggest" },
                            { key: "upSell", label: "Up Sell", desc: "Higher-end alternatives to recommend" },
                            { key: "bundle", label: "Bundle", desc: "Products sold together as a package" },
                          ].map(rel => (
                            <div key={rel.key}>
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1">{rel.label}</label>
                              <p className="text-[10px] text-[#9a8b82] mb-2">{rel.desc}</p>
                              <div className="space-y-1.5">
                                {(form[rel.key] || []).map((pid, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <select value={pid} onChange={e => {
                                      const v = e.target.value;
                                      setForm(p => { const arr = [...(p[rel.key]||[])]; arr[idx] = v; return {...p, [rel.key]: arr}; });
                                    }} className="h-8 flex-1 rounded-lg border border-[#e5d8cd] bg-white px-2 text-[11px]"><option value="">Select product</option>{allProducts.filter(p => p._id !== editingId).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select>
                                    <button type="button" onClick={() => setForm(p => ({...p, [rel.key]: (p[rel.key]||[]).filter((_,i)=>i!==idx)}))} className="h-8 w-8 rounded-lg border border-rose-200 bg-white grid place-items-center text-rose-500 hover:bg-rose-50"><X size={10}/></button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => setForm(p => ({...p, [rel.key]: [...(p[rel.key]||[]), ""]}))} className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-[#cfc1b5] bg-[#faf8f5] px-2 text-[10px] font-black text-[#5c514b] hover:border-[#fd761a] hover:text-[#fd761a]"><PlusCircle size={10}/> Add</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
                <footer className="border-t border-[#f5eee8] bg-[#faf7f4] px-6 py-4 flex justify-between items-center shrink-0">
                  <button onClick={() => setShowModal(false)} type="button" className="h-10 rounded-xl border border-[#efe5dc] bg-white px-5 text-[12px] font-black text-[#5c514b]">Cancel</button>
                  <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3a1100] px-6 text-[12px] font-black text-white hover:bg-[#fd761a] disabled:opacity-50">{saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}{editingId ? "Save Changes" : "Create Product"}</button>
                </footer>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manage Inventory enterprise modal */}
        <AnimatePresence>
          {manageProduct && manageForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 py-6 px-4 backdrop-blur-[3px]" onClick={e=>{ if(e.target===e.currentTarget) setManageProduct(null); }}>
              <motion.form initial={{ scale: 0.97, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 12 }} onSubmit={saveManage} className="w-full max-w-4xl rounded-2xl bg-white border border-[#efe5dc] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                <header className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-6 py-4 shrink-0">
                  <div>
                    <h2 className="text-[16px] font-black text-[#3a1100] font-serif flex items-center gap-2"><Boxes size={16} className="text-[#fd761a]"/> Manage Inventory — {manageProduct.name}</h2>
                    <p className="text-[11px] font-bold text-[#9a8b82]">SKU: {manageProduct.sku} • Barcode: {manageProduct.barcode || "—"} • Available auto-calc: <span className="text-[#fd761a]">{Math.max(0, Number(manageForm.quantity||0)-Number(manageForm.reservedQuantity||0))}</span> = Current ({manageForm.quantity||0}) − Reserved ({manageForm.reservedQuantity||0})</p>
                  </div>
                  <button onClick={() => setManageProduct(null)} className="h-8 w-8 rounded-lg border border-[#efe5dc] grid place-items-center text-gray-400 hover:text-gray-600" type="button"><X size={16}/></button>
                </header>
                {manageApiError && <div className="bg-rose-50 border-b border-rose-100 px-6 py-3 text-[12.5px] font-bold text-rose-700">{manageApiError}</div>}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#faf9f6]/40">
                  {/* Stock levels */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[13px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2"><Activity size={14} className="text-[#fd761a]"/> Stock Levels (negative blocked)</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { k:"openingStock", l:"Opening Stock", t:"number" },
                        { k:"quantity", l:"Current Stock *", t:"number" },
                        { k:"reservedQuantity", l:"Reserved Stock", t:"number" },
                        { k:"warehouse", l:"Warehouse", t:"text", placeholder:"WH-A1" },
                        { k:"rackLocation", l:"Rack Location", t:"text", placeholder:"Rack 12-B" },
                        { k:"minStock", l:"Minimum Stock", t:"number" },
                        { k:"maxStock", l:"Maximum Stock", t:"number" },
                        { k:"reorderLevel", l:"Reorder Level *", t:"number" },
                      ].map(f => (
                        <div key={f.k}>
                          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">{f.l}</label>
                          <input type={f.t} min={f.t==="number"?0:undefined} value={manageForm[f.k]} onChange={e=>setManageForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.placeholder||""} className={`h-10 w-full rounded-xl border bg-[#fdfbf9] px-3.5 text-[13px] outline-none ${manageErrors[f.k]?"border-rose-300 bg-rose-50/30 focus:border-rose-400":"border-[#e5d8cd] focus:border-[#fd761a] focus:bg-white"}`} />
                          {manageErrors[f.k] && <p className="mt-1 text-[11px] font-bold text-rose-600">{manageErrors[f.k]}</p>}
                        </div>
                      ))}
                      <div>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Available Stock (live)</label>
                        <div className="h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 flex items-center text-[13px] font-black text-emerald-700">{Math.max(0, Number(manageForm.quantity||0)-Number(manageForm.reservedQuantity||0))}</div>
                        <p className="text-[10px] text-[#9a8b82] mt-1">= Current − Reserved (auto-calc)</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800 flex items-center gap-2"><AlertTriangle size={12}/> Reorder must be &lt; Maximum • Reserved ≤ Current • Negative values blocked • Backend errors shown inline</div>
                  </div>
                  {/* Batch / lot / dates / type */}
                  <div className="bg-white rounded-xl border border-[#efe5dc] p-5 space-y-4">
                    <h3 className="text-[13px] font-black text-[#3a1100] border-b border-[#faf7f4] pb-2 flex items-center gap-2"><Layers size={14} className="text-[#fd761a]"/> Batch / Lot / Serial &amp; Dates • Type</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Barcode</label><input value={manageForm.barcode} onChange={e=>setManageForm(p=>({...p,barcode:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" placeholder="e.g. 890103…"/></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Batch Number</label><input value={manageForm.batchNumber} onChange={e=>setManageForm(p=>({...p,batchNumber:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Lot Number</label><input value={manageForm.lotNumber} onChange={e=>setManageForm(p=>({...p,lotNumber:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Serial Number</label><input value={manageForm.serialNumber} onChange={e=>setManageForm(p=>({...p,serialNumber:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Manufacturing Date</label><input type="date" value={manageForm.manufacturingDate} onChange={e=>setManageForm(p=>({...p,manufacturingDate:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white"/></div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Expiry Date</label><input type="date" value={manageForm.expiryDate} onChange={e=>setManageForm(p=>({...p,expiryDate:e.target.value}))} className={`h-10 w-full rounded-xl border bg-[#fdfbf9] px-3.5 text-[13px] outline-none ${manageErrors.expiryDate?"border-rose-300 bg-rose-50/30 focus:border-rose-400":"border-[#e5d8cd] focus:border-[#fd761a] focus:bg-white"}`} />{manageErrors.expiryDate && <p className="mt-1 text-[11px] font-bold text-rose-600">{manageErrors.expiryDate}</p>}</div>
                      <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Inventory Type</label><select value={manageForm.inventoryType} onChange={e=>setManageForm(p=>({...p,inventoryType:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white">{inventoryTypeOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                      <div className="sm:col-span-2"><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Note (audit)</label><input value={manageForm.note} onChange={e=>setManageForm(p=>({...p,note:e.target.value}))} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" placeholder="Reason for adjustment (appears in audit)"/></div>
                    </div>
                    <div className="rounded-lg bg-[#fff7ed] border border-orange-100 px-3 py-2 text-[11px] font-bold text-[#9a3412] flex flex-wrap gap-3"><span>Batch/Lot grouping: toggle in toolbar filters</span><span>•</span><span>Expiry warnings shown in table when ≤30 days</span><span>•</span><span>Audit link per row → inventory logs</span></div>
                  </div>
                </div>
                <footer className="border-t border-[#f5eee8] bg-[#faf7f4] px-6 py-4 flex justify-between items-center shrink-0">
                  <button onClick={() => setManageProduct(null)} type="button" className="h-10 rounded-xl border border-[#efe5dc] bg-white px-5 text-[12px] font-black text-[#5c514b]">Cancel</button>
                  <button type="submit" disabled={manageSaving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3a1100] px-6 text-[12px] font-black text-white hover:bg-[#fd761a] disabled:opacity-50">{manageSaving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} Save Inventory</button>
                </footer>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Restock quick */}
        <AnimatePresence>
          {restockProduct && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[#21150f]/50 px-4 backdrop-blur-[3px]" onClick={e=>{if(e.target===e.currentTarget) setRestockProduct(null);}}>
              <motion.form initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onSubmit={handleRestock} className="w-full max-w-md rounded-2xl bg-white border border-[#efe5dc] shadow-2xl p-6">
                <h3 className="text-[17px] font-black text-[#3a1100] font-serif">Quick Restock</h3>
                <p className="text-[13px] text-[#796d66] mt-1.5 mb-4">Adjust inventory for <strong>{restockProduct.name}</strong>.<br/>Current Quantity: <span className="font-bold text-[#3a1100]">{restockProduct.quantity || 0}</span> units • Available: <span className="font-bold text-emerald-700">{restockProduct.availableStock ?? Math.max(0,(restockProduct.quantity||0)-(restockProduct.reservedQuantity||0))}</span></p>
                <input type="number" min="1" value={restockQty} onChange={e=>setRestockQty(e.target.value)} placeholder="Enter positive stock increment (e.g. 50)" className="h-11 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-4 text-[13px] outline-none focus:border-[#fd761a] focus:bg-white" required autoFocus/>
                <div className="mt-5 flex justify-end gap-2.5 border-t border-[#f5eee8] pt-4"><button onClick={()=>setRestockProduct(null)} type="button" className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]">Cancel</button><button type="submit" className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-[12px] font-black text-white">Add Stock</button></div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete */}
        <AnimatePresence>
          {deleteProduct && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[#21150f]/50 px-4 backdrop-blur-[3px]" onClick={e=>{if(e.target===e.currentTarget) setDeleteProduct(null);}}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-2xl bg-white border border-[#efe5dc] shadow-2xl p-6">
                <h3 className="text-[17px] font-black text-rose-600 font-serif">Remove Product?</h3>
                <p className="text-[13px] text-[#796d66] mt-2 mb-4 leading-relaxed">Are you sure you want to delete <strong>{deleteProduct.name}</strong>? This will permanently erase the product.</p>
                <div className="flex justify-end gap-2.5 border-t border-[#f5eee8] pt-4"><button onClick={()=>setDeleteProduct(null)} className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]" type="button">Cancel</button><button onClick={confirmDelete} className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 text-[12px] font-black text-white" type="button">Delete SKU</button></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audit modal */}
        <AnimatePresence>
          {auditProduct && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 p-4 backdrop-blur-[3px]" onClick={e=>{if(e.target===e.currentTarget) setAuditProduct(null);}}>
              <motion.div initial={{ scale: 0.97, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 10 }} className="w-full max-w-2xl rounded-2xl bg-white border border-[#efe5dc] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <header className="flex items-center justify-between border-b border-[#f5eee8] bg-[#faf7f4] px-5 py-4 shrink-0"><div><h3 className="text-[14px] font-black text-[#3a1100] flex items-center gap-2"><History size={14} className="text-[#fd761a]"/> Audit — {auditProduct.name}</h3><p className="text-[11px] font-bold text-[#9a8b82]">SKU: {auditProduct.sku} • GET /admin/products/:id/inventory-logs</p></div><button onClick={()=>setAuditProduct(null)} className="h-8 w-8 grid place-items-center rounded-lg border border-[#efe5dc] text-[#9a8b82] hover:text-[#3a1100]" type="button"><X size={16}/></button></header>
                <div className="flex-1 overflow-auto p-5">
                  {auditLoading ? <div className="py-10 flex flex-col items-center gap-2"><Loader2 size={22} className="animate-spin text-[#fd761a]"/><p className="text-[12px] font-bold text-[#796d66]">Loading audit trail…</p></div>
                  : auditError ? <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-[12px] font-bold text-rose-700">{auditError}</div>
                  : auditLogs.length===0 ? <div className="py-8 text-center text-[13px] font-bold text-[#796d66]">No audit entries yet.</div>
                  : <div className="space-y-2">{auditLogs.map((log,i)=>(
                    <div key={log._id||i} className="rounded-xl border border-[#efe5dc] bg-[#faf9f6]/40 px-4 py-3 flex items-start justify-between gap-3">
                      <div><p className="text-[12px] font-black text-[#3a1100]">{log.type || log.reference || "admin_adjustment"} <span className="font-bold text-[#796d66]">• {log.quantityChange>0?`+${log.quantityChange}`:log.quantityChange} ({log.quantityBefore} → {log.quantityAfter})</span></p><p className="text-[11px] text-[#9a8b82] mt-0.5">{log.note || log.reference || "—"} • by {log.performedBy?.name || log.performedBy || "system"}</p></div>
                      <span className="text-[11px] font-bold text-[#9a8b82] shrink-0">{log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : ""}</span>
                    </div>))}</div>}
                </div>
                <footer className="border-t border-[#f5eee8] bg-[#faf7f4] px-5 py-3 flex justify-end"><button onClick={()=>setAuditProduct(null)} className="h-9 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]" type="button">Close</button></footer>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk adjust */}
        <AnimatePresence>
          {showBulk && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[#21150f]/50 p-4 backdrop-blur-[3px]" onClick={e=>{if(e.target===e.currentTarget) setShowBulk(false);}}>
              <motion.form initial={{ scale: 0.97 }} animate={{ scale: 1 }} exit={{ scale: 0.97 }} onSubmit={handleBulkAdjust} className="w-full max-w-md rounded-2xl bg-white border border-[#efe5dc] shadow-2xl p-6">
                <h3 className="text-[15px] font-black text-[#3a1100]">Bulk Adjust — {selectedIds.length} SKUs</h3>
                <p className="text-[11px] font-bold text-[#9a8b82] mt-1">Applies via PATCH /admin/products/:id/inventory per item</p>
                <div className="mt-4 grid gap-3">
                  <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Field</label><select value={bulkField} onChange={e=>setBulkField(e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px]"><option value="quantity">Set Current Stock (quantity)</option><option value="addQty">Add Quantity (increment)</option><option value="reservedQuantity">Set Reserved Quantity</option><option value="reorderLevel">Set Reorder Level</option><option value="warehouse">Set Warehouse</option></select></div>
                  <div><label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#9a8b82] mb-1.5">Value</label>{bulkField==="warehouse" ? <input value={bulkValue} onChange={e=>setBulkValue(e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" placeholder="WH-A1"/> : <input type="number" min="0" value={bulkValue} onChange={e=>setBulkValue(e.target.value)} className="h-10 w-full rounded-xl border border-[#e5d8cd] bg-[#fdfbf9] px-3.5 text-[13px] outline-none focus:border-[#fd761a]" required/>}</div>
                </div>
                <div className="mt-5 flex justify-end gap-2.5 border-t border-[#f5eee8] pt-4"><button onClick={()=>setShowBulk(false)} type="button" className="h-10 rounded-xl border border-[#efe5dc] bg-white px-4 text-[12px] font-black text-[#5c514b]">Cancel</button><button type="submit" disabled={bulkSaving} className="h-10 rounded-xl bg-[#3a1100] hover:bg-[#fd761a] px-5 text-[12px] font-black text-white disabled:opacity-50">{bulkSaving?<Loader2 size={13} className="animate-spin"/>:"Apply to All"}</button></div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
