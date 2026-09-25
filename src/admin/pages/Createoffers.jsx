import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Gift,
  Info,
  Loader2,
  MapPin,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Settings,
  Ticket,
  Timer,
  Trash2,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";

const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api", withCredentials: true });
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const offerTypes = [
  { label: "Coupon", icon: Ticket },
  { label: "Flash Sale", icon: Zap },
  { label: "Bundle", icon: Package },
  { label: "Scratch Card", icon: Sparkles },
  { label: "Free Delivery", icon: Truck },
];

const offerTypeToApi = {
  Coupon: "coupon",
  "Flash Sale": "flash_sale",
  Bundle: "bundle",
  "Scratch Card": "scratch_card",
  "Free Delivery": "free_delivery",
};

const offerCodePrefixes = {
  Coupon: "ORG",
  "Flash Sale": "FLASH",
  Bundle: "BUNDLE",
  "Scratch Card": "SCR",
  "Free Delivery": "FREE",
};

const scratchDiscountTypes = ["Percentage (%)", "Fixed Amount"];
const scratchRuleBases = [
  { label: "Product Quantity", value: "quantity", thresholdLabel: "Minimum items", unit: "items" },
  { label: "Order Amount", value: "order_amount", thresholdLabel: "Minimum order amount", unit: "₹" },
];
const scratchProductConditions = ["Selected Products", "All Products"];

let scratchRuleSequence = 0;
const nextScratchRuleId = () => {
  scratchRuleSequence += 1;
  return `scratch-rule-${scratchRuleSequence}`;
};

let offerCodeSequence = 1000;
const buildOfferCode = (prefix) => {
  offerCodeSequence = (offerCodeSequence + 1) % 10000;
  return `${prefix}${String(offerCodeSequence).padStart(4, "0")}`;
};

const createScratchRule = (basis = "quantity", threshold = "", discountValue = "") => ({
  id: nextScratchRuleId(),
  basis,
  threshold,
  discountType: "Percentage (%)",
  discountValue,
  label: "",
});

const createDefaultScratchRules = () => [
  { ...createScratchRule("quantity", "1", "5"), label: "Single product reward" },
  { ...createScratchRule("quantity", "10", "12"), label: "Bulk product reward" },
  { ...createScratchRule("order_amount", "1000", "15"), label: "High value order reward" },
];

const deliveryDistrictOptions = [
  "Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Kolhapur", "Solapur", "Amravati", "Nanded",
  "Delhi", "New Delhi", "Noida", "Gurgaon", "Faridabad", "Ghaziabad", "Greater Noida", "Dwarka", "Rohini",
  "Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Davanagere", "Udupi", "Hassan", "Mysore",
  "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Vijayawada", "Visakhapatnam",
  "Chennai", "Coimbatore", "Madurai", "Trichy", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore",
  "Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Kottayam", "Alappuzha",
  "Kolkata", "Howrah", "Hooghly", "Nadia", "Darjeeling", "Jalpaiguri", "Siliguri", "Cooch Behar", "Malda",
  "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Gandhinagar", "Jamnagar", "Junagadh", "Bharuch",
  "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur", "Sikar",
  "Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Bareilly", "Aligarh", "Ghaziabad", "Ayodhya",
  "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Begusarai", "Chapra",
  "Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Satna", "Ratlam", "Dewas", "Rewa",
  "Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Jagdalpur", "Ambikapur",
  "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Daltonganj", "Chatra",
  "Kurnool", "Kadapa", "Nellore", "Ongole", "Rajahmundry", "Srikakulam", "Vizianagaram", "Machilipatnam", "Tirupati",
  "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahabubnagar", "Nalgonda", "Adilabad", "Wanaparthy", "Bhongir",
  "Ratlam", "Dhar", "Khandwa", "Bemetara", "Betul", "Chhindwara", "Balaghat", "Seoni", "Mandla", "Shajapur",
  "Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Naga", "Imphal", "Shillong", "Agartala", "Aizawl",
  "Srinagar", "Jammu", "Anantnag", "Baramulla", "Doda", "Kathua", "Udhampur",
  "Puducherry", "Panaji", "Daman", "Diu",
  "Chandigarh", "Mohali", "Panchkula", "Ambala", "Kurukshetra", "Hisar", "Rohtak", "Sonipat", "Panipat", "Yamunanagar",
  "Dehradun", "Haridwar", "Haldwani", "Rudrapur", "Rishikesh", "Kotdwar", "Shimla", "Solan", "Mandi", "Dharamshala",
  "Ernakulam", "Angamaly", "Kalamassery", "Thrissur", "Alappuzha", "Kottayam", "Malappuram", "Kasaragod",
  "Salem", "Namakkal", "Karur", "Periyar", "Dharmapuri", "Villupuram", "Cuddalore", "Kannur",
];

const normalizeDistrictKey = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const dedupeDistrictList = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeDistrictKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const homeCategories = [
  "All Categories",
  "Dryfruits",
  "Nuts",
  "Flour",
  "Ready 2 Eat",
  "Grains",
  "Juices",
  "Pooja Items",
];

const products = [
  {
    id: "PRD-FLR-001",
    name: "Premium Sharbati Atta",
    meta: "Whole Wheat - 5 kg",
    category: "Flour",
    price: 340,
    art: "bg-[linear-gradient(135deg,#2f160a,#aa7435_55%,#f2d4a1)]",
  },
  {
    id: "PRD-GRN-002",
    name: "Organic Pearl Millet",
    meta: "Millet - 1 kg",
    category: "Grains",
    price: 260,
    art: "bg-[linear-gradient(135deg,#f2d1a2,#6f3718_55%,#251109)]",
  },
  {
    id: "PRD-FLR-003",
    name: "MACHINICHI ATTA",
    meta: "Flour - 5 kg",
    category: "Flour",
    price: 250,
    art: "bg-[linear-gradient(135deg,#5b2b0e,#d68a3a_58%,#fff0c8)]",
  },
  {
    id: "PRD-GRN-004",
    name: "Organic Rice",
    meta: "Grains - 5 kg",
    category: "Grains",
    price: 399,
    art: "bg-[linear-gradient(135deg,#f7e8c9,#9c7439_54%,#42200f)]",
  },
  {
    id: "PRD-GRN-005",
    name: "Basmati Rice",
    meta: "Grains - 2 kg",
    category: "Grains",
    price: 249,
    art: "bg-[linear-gradient(135deg,#fff5df,#caa56f_50%,#351707)]",
  },
  {
    id: "PRD-RTE-006",
    name: "Cold Pressed Oil",
    meta: "Ready 2 Eat - 1 L",
    category: "Ready 2 Eat",
    price: 599,
    art: "bg-[linear-gradient(135deg,#321304,#7a421c_45%,#d99d4d)]",
  },
  {
    id: "PRD-DRY-007",
    name: "Raw Honey",
    meta: "Dryfruits - 500 g",
    category: "Dryfruits",
    price: 299,
    art: "bg-[linear-gradient(135deg,#7c3c0a,#e49a2d_50%,#ffe2a5)]",
  },
  {
    id: "PRD-NUT-008",
    name: "Premium Almond Mix",
    meta: "Nuts - 500 g",
    category: "Nuts",
    price: 450,
    art: "bg-[linear-gradient(135deg,#3b1a0b,#a06832_55%,#f5c98c)]",
  },
  {
    id: "PRD-JUI-009",
    name: "Wellness Herbal Juice",
    meta: "Juices - 1 L",
    category: "Juices",
    price: 180,
    art: "bg-[linear-gradient(135deg,#244015,#91b951_56%,#e7f7c7)]",
  },
  {
    id: "PRD-POO-010",
    name: "Organic Pooja Samagri",
    meta: "Pooja Items - Combo",
    category: "Pooja Items",
    price: 220,
    art: "bg-[linear-gradient(135deg,#391504,#c9722f_48%,#f7cf91)]",
  },
];

const formatInr = (value) => `₹${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

function Createoffers({ onAdminLogout }) {
  const navigate = useNavigate();
  const [selectedOfferType, setSelectedOfferType] = useState("Coupon");
  const [productView, setProductView] = useState("All Products");
  const [productSearch, setProductSearch] = useState("");
  const [bundleCategoryFilter, setBundleCategoryFilter] = useState("All Categories");
  const [bundleSelectedProducts, setBundleSelectedProducts] = useState([]);
  const [createdBundleProducts, setCreatedBundleProducts] = useState([]);
  const [submittedBundleOffer, setSubmittedBundleOffer] = useState(null);
  const [isBundlePreviewOpen, setIsBundlePreviewOpen] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [bundlePricingMode, setBundlePricingMode] = useState("Discount Percentage");
  const [bundleDiscountPercent, setBundleDiscountPercent] = useState("");
  const [manualBundlePrice, setManualBundlePrice] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const [bundleError, setBundleError] = useState("");
  const [selectedProducts, setSelectedProducts] = useState(() =>
    products.map((product) => product.name),
  );
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    startHour: "10",
    startMinute: "00",
    startAmPm: "AM",
    endDate: "",
    endHour: "11",
    endMinute: "45",
    endAmPm: "PM",
    couponCode: "",
    discountValue: "",
    discountType: "Percentage (%)",
    minPurchase: "",
    minQuantity: "",
    totalUsageLimit: "",
    limitPerCustomer: "",
    scratchCardOfferType: "Checkout Scratch Reward",
    scratchProductCondition: "Selected Products",
  });

  const [scratchRules, setScratchRules] = useState(() => createDefaultScratchRules());
  const [freeDeliveryDistricts, setFreeDeliveryDistricts] = useState([]);
  const [districtSearch, setDistrictSearch] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");

  const [datesConfirmed, setDatesConfirmed] = useState(false);
  const [dateError, setDateError] = useState("");

  const visibleBundleProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.meta.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        bundleCategoryFilter === "All Categories" ||
        product.category === bundleCategoryFilter;
      const matchesView =
        productView === "All Products" ||
        bundleSelectedProducts.includes(product.name);

      return matchesSearch && matchesCategory && matchesView;
    });
  }, [bundleCategoryFilter, bundleSelectedProducts, productSearch, productView]);

  const selectedBundleProductDetails = useMemo(
    () => products.filter((product) => bundleSelectedProducts.includes(product.name)),
    [bundleSelectedProducts],
  );
  const bundleSourceProducts = createdBundleProducts.length
    ? createdBundleProducts
    : selectedBundleProductDetails;
  const originalBundleTotal = bundleSourceProducts.reduce(
    (total, product) => total + product.price,
    0,
  );
  const discountPercent = Number(bundleDiscountPercent) || 0;
  const manualPrice = Number(manualBundlePrice) || 0;
  const finalBundlePrice =
    bundlePricingMode === "Manual Bundle Price"
      ? Math.min(originalBundleTotal, Math.max(0, manualPrice))
      : Math.max(0, originalBundleTotal - (originalBundleTotal * discountPercent) / 100);
  const effectiveDiscountPercent = originalBundleTotal
    ? ((originalBundleTotal - finalBundlePrice) / originalBundleTotal) * 100
    : 0;
  const bundleSavings = Math.max(0, originalBundleTotal - finalBundlePrice);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (field === "startDate" || field === "startHour" || field === "startMinute" || field === "startAmPm" ||
        field === "endDate" || field === "endHour" || field === "endMinute" || field === "endAmPm") {
      setDatesConfirmed(false);
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  const toIsoFromParts = (dateStr, hour, minute, ampm) => {
    if (!dateStr) return "";
    const h12 = parseInt(hour, 10);
    const h24 = ampm === "PM" ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    const d = new Date(dateStr);
    d.setHours(h24, parseInt(minute, 10), 0, 0);
    return d.toISOString();
  };

  const formatDisplayDate = (dateStr, hour, minute, ampm) => {
    if (!dateStr) return "Not set";
    const d = new Date(dateStr);
    const day = d.getDate();
    const mon = d.toLocaleString("en-IN", { month: "short" });
    const yr = d.getFullYear();
    return `${day} ${mon} ${yr}, ${hour}:${minute} ${ampm}`;
  };

  const confirmDates = () => {
    setDateError("");
    if (!formData.startDate) { setDateError("Start date is required"); return; }
    if (!formData.endDate) { setDateError("End date is required"); return; }
    const startIso = toIsoFromParts(formData.startDate, formData.startHour, formData.startMinute, formData.startAmPm);
    const endIso = toIsoFromParts(formData.endDate, formData.endHour, formData.endMinute, formData.endAmPm);
    if (new Date(endIso) <= new Date(startIso)) { setDateError("End date & time must be after start date & time"); return; }
    setDatesConfirmed(true);
    setDateError("");
  };

  const resetForm = () => {
    setSelectedOfferType("Coupon");
    setProductView("All Products");
    setProductSearch("");
    setBundleCategoryFilter("All Categories");
    setBundleSelectedProducts([]);
    setCreatedBundleProducts([]);
    setSubmittedBundleOffer(null);
    setIsBundlePreviewOpen(false);
    setBundleName("");
    setBundlePricingMode("Discount Percentage");
    setBundleDiscountPercent("");
    setManualBundlePrice("");
    setBundleMessage("");
    setBundleError("");
    setSelectedProducts(products.map((product) => product.name));
    setFormData({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      couponCode: "",
      discountValue: "",
      discountType: "Percentage (%)",
      minPurchase: "",
      minQuantity: "",
      totalUsageLimit: "",
      limitPerCustomer: "",
      scratchCardOfferType: "Checkout Scratch Reward",
      scratchProductCondition: "Selected Products",
    });
    setScratchRules(createDefaultScratchRules());
    setFreeDeliveryDistricts([]);
    setDistrictSearch("");
    setCustomDistrict("");
  };

  const updateOfferType = (offerType) => {
    setSelectedOfferType(offerType);
    setProductView("All Products");
    setProductSearch("");
    setBundleError("");
    setBundleMessage("");
    setIsBundlePreviewOpen(false);
    if (!formData.couponCode.trim()) {
      updateField("couponCode", buildOfferCode(offerCodePrefixes[offerType] || "OFFER"));
    }
    if (offerType === "Free Delivery" || offerType === "Scratch Card") {
      setSaveError("");
    }
  };

  const generateCouponCode = () => {
    updateField("couponCode", buildOfferCode(offerCodePrefixes[selectedOfferType] || "OFFER"));
  };

  const addScratchRule = () => {
    setSaveError("");
    setScratchRules((current) => [...current, createScratchRule()]);
  };

  const updateScratchRule = (id, field, value) => {
    setSaveError("");
    setScratchRules((current) => current.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)));
  };

  const removeScratchRule = (id) => {
    setSaveError("");
    setScratchRules((current) => current.filter((rule) => rule.id !== id));
  };

  const toggleDistrict = (district) => {
    setSaveError("");
    const key = normalizeDistrictKey(district);
    setFreeDeliveryDistricts((current) =>
      dedupeDistrictList(
        current.some((item) => normalizeDistrictKey(item) === key)
          ? current.filter((item) => normalizeDistrictKey(item) !== key)
          : [...current, district],
      ),
    );
  };

  const addCustomDistrict = () => {
    const value = customDistrict.trim();
    if (!value) return;
    toggleDistrict(value);
    setCustomDistrict("");
  };

  const filteredDistrictOptions = useMemo(() => {
    const query = districtSearch.trim().toLowerCase();
    const selectedKeys = new Set(freeDeliveryDistricts.map(normalizeDistrictKey));
    return dedupeDistrictList(deliveryDistrictOptions)
      .filter((district) => !selectedKeys.has(normalizeDistrictKey(district)))
      .filter((district) => !query || district.toLowerCase().includes(query))
      .slice(0, 60);
  }, [districtSearch, freeDeliveryDistricts]);

  const validateScratchRules = (rules) => {
    if (!rules.length) return "Add at least one scratch card discount rule";

    const seen = new Set();
    for (const rule of rules) {
      const threshold = Number(rule.threshold);
      const minimumThreshold = rule.basis === "quantity" ? 1 : 0;
      if (!Number.isFinite(threshold) || threshold < minimumThreshold) {
        return rule.basis === "quantity"
          ? "Product quantity rules need a minimum of 1 item"
          : "Order amount rules need an amount of 0 or more";
      }

      const discountValue = Number(rule.discountValue);
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return "Every scratch card rule needs a discount value greater than 0";
      }
      if (rule.discountType === "Percentage (%)" && discountValue > 100) {
        return "Scratch card percentage cannot exceed 100";
      }

      const key = `${rule.basis}:${threshold}`;
      if (seen.has(key)) return "Two rules use the same condition. Change or remove the duplicate.";
      seen.add(key);
    }

    return "";
  };

  const buildScratchRulePayload = (rules) =>
    rules.map((rule) => ({
      basis: rule.basis,
      threshold: Number(rule.threshold) || 0,
      discountType: rule.discountType === "Fixed Amount" ? "fixed" : "percentage",
      discountValue: Number(rule.discountValue) || 0,
      ...(rule.label.trim() ? { label: rule.label.trim() } : {}),
    }));

  const toggleBundleProduct = (productName) => {
    setBundleError("");
    setBundleMessage("");
    setCreatedBundleProducts([]);
    setSubmittedBundleOffer(null);
    setIsBundlePreviewOpen(false);
    setBundleSelectedProducts((current) =>
      current.includes(productName)
        ? current.filter((name) => name !== productName)
        : [...current, productName],
    );
  };

  const createBundle = () => {
    if (!bundleSelectedProducts.length) {
      setBundleError("Select at least one product before creating a bundle.");
      setBundleMessage("");
      setCreatedBundleProducts([]);
      return;
    }

    const selectedBundleProducts = products.filter((product) =>
      bundleSelectedProducts.includes(product.name),
    );

    setCreatedBundleProducts(selectedBundleProducts);
    setSubmittedBundleOffer(null);
    setIsBundlePreviewOpen(false);
    setBundleError("");
    setBundleMessage(`${selectedBundleProducts.length} products added to this bundle offer.`);
  };

  const submitBundleOffer = () => {
    const trimmedBundleName = bundleName.trim();

    if (!trimmedBundleName) {
      setBundleError("Enter a bundle name before submitting this offer.");
      setBundleMessage("");
      return;
    }

    if (!bundleSourceProducts.length) {
      setBundleError("Select at least one product before submitting this bundle offer.");
      setBundleMessage("");
      return;
    }

    if (bundlePricingMode === "Discount Percentage" && discountPercent > 100) {
      setBundleError("Discount percentage cannot be greater than 100%.");
      setBundleMessage("");
      return;
    }

    if (bundlePricingMode === "Manual Bundle Price" && manualPrice <= 0) {
      setBundleError("Enter a manual bundle price before submitting this offer.");
      setBundleMessage("");
      return;
    }

    const bundleOffer = {
      name: trimmedBundleName,
      products: bundleSourceProducts,
      originalPrice: originalBundleTotal,
      offerPrice: finalBundlePrice,
      discountPercent: effectiveDiscountPercent,
      savings: bundleSavings,
      pricingMode: bundlePricingMode,
    };

    setCreatedBundleProducts(bundleSourceProducts);
    setSubmittedBundleOffer(bundleOffer);
    setIsBundlePreviewOpen(true);
    setBundleError("");
    setBundleMessage("Review the bundle preview before confirming this offer.");
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const getApiErrorMessage = (err) => {
    const issues = err.response?.data?.errors;
    if (Array.isArray(issues) && issues.length) {
      const first = issues[0];
      const field = Array.isArray(first.path) && first.path.length ? `${first.path.join(".")}: ` : "";
      const detail = [field, first.message].filter(Boolean).join("");
      return issues.length > 1 ? `${detail} (+${issues.length - 1} more)` : detail;
    }
    return err.response?.data?.message || "Failed to save offer";
  };

  const saveOffer = async (status) => {
    if (selectedOfferType === "Bundle" && !submittedBundleOffer) {
      setBundleError("Submit the bundle offer before saving this offer.");
      setBundleMessage("");
      return;
    }

    const rawUsageLimit = formData.totalUsageLimit.trim().toLowerCase();
    const usageLimitValue = rawUsageLimit === "unlimited" ? 0 : toFiniteNumber(formData.totalUsageLimit, -1);
    const perCustomerValue = toFiniteNumber(formData.limitPerCustomer, 0);

    if (selectedOfferType !== "Bundle") {
      if (!formData.name.trim()) { setSaveError("Offer name is required"); return; }
      if (formData.name.trim().length > 100) { setSaveError("Offer name cannot exceed 100 characters"); return; }
      if (!formData.description.trim()) { setSaveError("Internal description is required"); return; }
      if (formData.description.trim().length > 500) { setSaveError("Internal description cannot exceed 500 characters"); return; }
      if (!formData.couponCode.trim()) { setSaveError("Offer code is required"); return; }
      if (!/^[A-Za-z0-9]{3,10}$/.test(formData.couponCode.trim())) {
        setSaveError("Offer code must be 3 to 10 letters or numbers only (no spaces or dashes)");
        return;
      }
      if (!formData.startDate) { setSaveError("Start date is required"); return; }
      if (!formData.endDate) { setSaveError("End date is required"); return; }
      if (!datesConfirmed) { setSaveError("Please confirm dates by clicking OK"); return; }
      if (!formData.totalUsageLimit.trim()) { setSaveError("Total usage limit is required (enter 0 or unlimited)"); return; }
      if (!Number.isInteger(usageLimitValue) || usageLimitValue < 0) {
        setSaveError("Total usage limit must be 0 (unlimited) or a whole number");
        return;
      }
      if (!formData.limitPerCustomer.trim()) { setSaveError("Limit per customer is required"); return; }
      if (!Number.isInteger(perCustomerValue) || perCustomerValue < 1) {
        setSaveError("Limit per customer must be a whole number of at least 1");
        return;
      }
    }

    if (selectedOfferType === "Coupon" || selectedOfferType === "Flash Sale") {
      if (!formData.discountValue.trim()) { setSaveError("Discount value is required"); return; }
      if (!Number.isFinite(Number(formData.discountValue)) || Number(formData.discountValue) < 0) {
        setSaveError("Discount value must be a number of 0 or more");
        return;
      }
      if (formData.discountType === "Percentage (%)" && Number(formData.discountValue) > 100) {
        setSaveError("Percentage discount cannot exceed 100");
        return;
      }
      if (formData.discountType === "Percentage (%)" && Number(formData.discountValue) <= 0) {
        setSaveError("Percentage discount must be greater than 0");
        return;
      }
    }

    if (selectedOfferType !== "Bundle") {
      if (!formData.minPurchase.trim()) { setSaveError("Minimum purchase is required"); return; }
      if (!Number.isFinite(Number(formData.minPurchase)) || Number(formData.minPurchase) < 0) {
        setSaveError("Minimum purchase must be a number of 0 or more");
        return;
      }
      if (!formData.minQuantity.trim()) { setSaveError("Minimum quantity is required"); return; }
      if (!Number.isInteger(Number(formData.minQuantity)) || Number(formData.minQuantity) < 1) {
        setSaveError("Minimum quantity must be a whole number of at least 1");
        return;
      }
    }

    if (selectedOfferType === "Scratch Card") {
      const scratchRuleError = validateScratchRules(scratchRules);
      if (scratchRuleError) { setSaveError(scratchRuleError); return; }
    }

    setSaveError("");
    setSaving(true);

    try {
      if (selectedOfferType !== "Bundle") {
        const discountTypeMap = { "Percentage (%)": "percentage", "Free Delivery": "free_delivery" };
        const isFreeDeliveryOffer = selectedOfferType === "Free Delivery" || formData.discountType === "Free Delivery";
        const payload = {
          name: formData.name.trim(),
          code: formData.couponCode.trim().toUpperCase(),
          description: formData.description.trim(),
          offerType: offerTypeToApi[selectedOfferType] || "coupon",
          discountType: selectedOfferType === "Scratch Card"
            ? "percentage"
            : isFreeDeliveryOffer
              ? "free_delivery"
              : discountTypeMap[formData.discountType] || "percentage",
          discountValue: selectedOfferType === "Scratch Card"
            ? 0
            : toFiniteNumber(formData.discountValue, 0),
          minOrderAmount: toFiniteNumber(formData.minPurchase, 0),
          minQuantity: toFiniteNumber(formData.minQuantity, 1),
          scratchRules: selectedOfferType === "Scratch Card" ? buildScratchRulePayload(scratchRules) : [],
          freeDeliveryDistricts: isFreeDeliveryOffer ? dedupeDistrictList(freeDeliveryDistricts) : [],
          usageLimit: usageLimitValue,
          perUserLimit: perCustomerValue,
          startsAt: toIsoFromParts(formData.startDate, formData.startHour, formData.startMinute, formData.startAmPm),
          expiresAt: toIsoFromParts(formData.endDate, formData.endHour, formData.endMinute, formData.endAmPm),
          isActive: status === "Active",
          status: status === "Active" ? "active" : "draft",
        };
        await API.post("/coupons", payload);
      }
      navigate("/admin/offers-coupons");
    } catch (err) {
      setSaveError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveOffer("Active");
  };

  return (
    <AdminLayout onAdminLogout={onAdminLogout}>
      <div className="min-h-screen bg-[#fff7f0] text-[#21150f]">
        <div className="flex flex-col gap-4 border-b border-[#eaded6] bg-[#fffaf6] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-[28px] font-black leading-none tracking-[-0.04em] text-[#21150f]">
              Create New Offer
            </h1>
            <p className="mt-1 text-[13px] font-medium text-[#6d5e55]">
              Configure promotions and discounts for your artisanal products.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="h-11 rounded-full border border-[#b9aaa0] bg-white px-7 text-[13px] font-black text-[#5d4e45] shadow-[0_8px_16px_rgba(66,36,18,0.05)] transition hover:-translate-y-0.5 hover:bg-[#fff7f0] active:translate-y-0 active:scale-[0.98]"
              onClick={() => {
                resetForm();
                navigate("/admin/offers-coupons");
              }}
              type="button"
            >
              Discard Draft
            </button>
            <button
              className="h-11 rounded-full bg-[#d85f0d] px-8 text-[13px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(216,95,13,0.24)] transition hover:-translate-y-0.5 hover:bg-[#bf5108] active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
              onClick={() => saveOffer("Active")}
              type="button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Create Offer"}
            </button>
          </div>
        </div>

        <form className="px-4 py-6 sm:px-6 lg:px-8" onSubmit={handleSubmit}>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Panel
              icon={Info}
              title="Basic Information"
              className="min-h-[360px]"
            >
              <Field label={<span>Offer Name <span className="text-red-500">*</span></span>}>
                <input
                  className="admin-input"
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g. Harvest Festival 2024"
                  type="text"
                  value={formData.name}
                />
              </Field>

              <Field label={<span>Internal Description <span className="text-red-500">*</span></span>}>
                <textarea
                  className="admin-input min-h-[96px] resize-none py-4"
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Explain the purpose of this offer for the marketing team..."
                  value={formData.description}
                />
              </Field>

              <div>
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#76665c]">
                  Offer Type
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {offerTypes.map(({ label, icon: Icon }) => (
                    <button
                      className={`flex h-[86px] flex-col items-center justify-center gap-2 rounded-[10px] border text-[12px] font-black transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                        selectedOfferType === label
                          ? "border-[#b5480b] bg-white text-[#b5480b] shadow-[0_10px_20px_rgba(181,72,11,0.08)]"
                          : "border-[#dfcfc3] bg-[#fffaf6] text-[#4c3d35] hover:bg-white"
                      }`}
                      key={label}
                      onClick={() => updateOfferType(label)}
                      type="button"
                    >
                      <Icon size={19} strokeWidth={2.2} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel icon={CalendarDays} title="Active Dates">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Field label="Start Date & Time *">
                    <input
                      className="admin-input mb-2"
                      onChange={(event) => updateField("startDate", event.target.value)}
                      type="date"
                      value={formData.startDate}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select className="time-select" value={formData.startHour} onChange={(e) => updateField("startHour", e.target.value)}>
                        {hours.map((h) => <option key={h}>{h}</option>)}
                      </select>
                      <select className="time-select" value={formData.startMinute} onChange={(e) => updateField("startMinute", e.target.value)}>
                        {minutes.map((m) => <option key={m}>{m}</option>)}
                      </select>
                      <select className="time-select" value={formData.startAmPm} onChange={(e) => updateField("startAmPm", e.target.value)}>
                        <option>AM</option>
                        <option>PM</option>
                      </select>
                    </div>
                  </Field>
                  {datesConfirmed && formData.startDate ? (
                    <p className="mt-1 text-[11px] font-bold text-[#389e0d]">Start: {formatDisplayDate(formData.startDate, formData.startHour, formData.startMinute, formData.startAmPm)}</p>
                  ) : null}
                </div>
                <div>
                  <Field label="End Date & Time *">
                    <input
                      className="admin-input mb-2"
                      onChange={(event) => updateField("endDate", event.target.value)}
                      type="date"
                      value={formData.endDate}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select className="time-select" value={formData.endHour} onChange={(e) => updateField("endHour", e.target.value)}>
                        {hours.map((h) => <option key={h}>{h}</option>)}
                      </select>
                      <select className="time-select" value={formData.endMinute} onChange={(e) => updateField("endMinute", e.target.value)}>
                        {minutes.map((m) => <option key={m}>{m}</option>)}
                      </select>
                      <select className="time-select" value={formData.endAmPm} onChange={(e) => updateField("endAmPm", e.target.value)}>
                        <option>AM</option>
                        <option>PM</option>
                      </select>
                    </div>
                  </Field>
                  {datesConfirmed && formData.endDate ? (
                    <p className="mt-1 text-[11px] font-bold text-[#389e0d]">End: {formatDisplayDate(formData.endDate, formData.endHour, formData.endMinute, formData.endAmPm)}</p>
                  ) : null}
                </div>
              </div>
              {dateError ? <p className="mt-2 text-[11px] font-bold text-red-500">{dateError}</p> : null}
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={confirmDates}
                  className="h-10 rounded-lg bg-[#b5480b] px-6 text-[12px] font-black uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-[#9a3d09] active:translate-y-0 active:scale-[0.98]"
                >
                  OK
                </button>
                {datesConfirmed ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#389e0d]">
                    <Check size={14} /> Dates Confirmed
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-[#8a7a71]">Select dates and click OK to confirm</span>
                )}
              </div>
              <div className="mt-5 rounded-[9px] bg-[#f1ffd2] px-4 py-4 text-[12px] font-bold leading-5 text-[#597219]">
                <span className="font-black">Visibility Tip:</span> Flash sales
                typically perform best during evening hours (18:00 - 22:00).
              </div>
            </Panel>
          </section>

          {selectedOfferType === "Coupon" || selectedOfferType === "Flash Sale" ? (
            <Panel icon={Settings} title="Configuration" className="mt-4 animate-[offerSectionIn_280ms_ease-out_both]">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1.4fr]">
                <Field label="Coupon Code *">
                  <div className="flex gap-3">
                    <input
                      className="admin-input"
                      onChange={(event) => {
                        const val = event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
                        updateField("couponCode", val);
                      }}
                      placeholder="E.G. ORGANIC20"
                      type="text"
                      maxLength={10}
                      value={formData.couponCode}
                    />
                    <button
                      aria-label="Generate coupon code"
                      className="grid h-12 w-14 shrink-0 place-items-center rounded-[8px] bg-[#eee5dd] text-[#b5480b] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7d9cf] active:translate-y-0 active:scale-[0.98]"
                      onClick={generateCouponCode}
                      type="button"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </Field>

                <Field label={<span>Discount Value <span className="text-red-500">*</span></span>}>
                  <div className="relative">
                    <input
                      className="admin-input pr-10"
                      onChange={(event) => updateField("discountValue", event.target.value)}
                      placeholder="0.00"
                      value={formData.discountValue}
                    />
                    <Percent
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                      size={16}
                    />
                  </div>
                </Field>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.6fr_0.6fr]">
                <Field label={<span>Discount Type <span className="text-red-500">*</span></span>}>
                  <div className="relative">
                    <select
                      className="admin-input appearance-none"
                      onChange={(event) => updateField("discountType", event.target.value)}
                      value={formData.discountType}
                    >
                      <option>Percentage (%)</option>
                      <option>Free Delivery</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                      size={16}
                    />
                  </div>
                </Field>
                <Field label={<span>Min. Purchase (₹) <span className="text-red-500">*</span></span>}>
                  <input
                    className="admin-input"
                    onChange={(event) => updateField("minPurchase", event.target.value)}
                    placeholder="0.00"
                    value={formData.minPurchase}
                  />
                </Field>
                <Field label={<span>Min. Quantity <span className="text-red-500">*</span></span>}>
                  <input
                    className="admin-input"
                    onChange={(event) => updateField("minQuantity", event.target.value)}
                    placeholder="1"
                    value={formData.minQuantity}
                  />
                </Field>
              </div>

              {formData.discountType === "Free Delivery" ? (
                <div className="mt-4 rounded-[10px] border border-[#e2d2c6] bg-[#fffaf6] p-4">
                  <DistrictPicker
                    districts={freeDeliveryDistricts}
                    filteredOptions={filteredDistrictOptions}
                    search={districtSearch}
                    customDistrict={customDistrict}
                    onSearchChange={setDistrictSearch}
                    onCustomDistrictChange={setCustomDistrict}
                    onToggleDistrict={toggleDistrict}
                    onAddCustomDistrict={addCustomDistrict}
                  />
                </div>
              ) : null}
            </Panel>
          ) : null}

          {selectedOfferType === "Free Delivery" ? (
            <Panel icon={Truck} title="Free Delivery Configuration" className="mt-4 animate-[offerSectionIn_280ms_ease-out_both]">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.6fr_0.6fr]">
                <Field label="Offer Code *">
                  <div className="flex gap-3">
                    <input
                      className="admin-input"
                      onChange={(event) => {
                        const val = event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
                        updateField("couponCode", val);
                      }}
                      maxLength={10}
                      placeholder="E.G. FREE1234"
                      type="text"
                      value={formData.couponCode}
                    />
                    <button
                      aria-label="Generate offer code"
                      className="grid h-12 w-14 shrink-0 place-items-center rounded-[8px] bg-[#eee5dd] text-[#b5480b] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7d9cf] active:translate-y-0 active:scale-[0.98]"
                      onClick={generateCouponCode}
                      type="button"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </Field>
                <Field label={<span>Min. Purchase (₹) <span className="text-red-500">*</span></span>}>
                  <input
                    className="admin-input"
                    onChange={(event) => updateField("minPurchase", event.target.value)}
                    placeholder="0.00"
                    value={formData.minPurchase}
                  />
                </Field>
                <Field label={<span>Min. Quantity <span className="text-red-500">*</span></span>}>
                  <input
                    className="admin-input"
                    onChange={(event) => updateField("minQuantity", event.target.value)}
                    placeholder="1"
                    value={formData.minQuantity}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <DistrictPicker
                  districts={freeDeliveryDistricts}
                  filteredOptions={filteredDistrictOptions}
                  search={districtSearch}
                  customDistrict={customDistrict}
                  onSearchChange={setDistrictSearch}
                  onCustomDistrictChange={setCustomDistrict}
                  onToggleDistrict={toggleDistrict}
                  onAddCustomDistrict={addCustomDistrict}
                />
              </div>
            </Panel>
          ) : null}

          {selectedOfferType === "Scratch Card" ? (
            <Panel icon={Sparkles} title="Scratch Card Settings" className="mt-4 animate-[offerSectionIn_280ms_ease-out_both]">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-[10px] border border-[#e2d2c6] bg-[#fffaf6] p-4">
                  <Field label="Scratch Card Offer Type">
                    <input
                      className="admin-input"
                      onChange={(event) => updateField("scratchCardOfferType", event.target.value)}
                      placeholder="Checkout Scratch Reward"
                      value={formData.scratchCardOfferType}
                    />
                  </Field>

                  <Field label="Product Conditions">
                    <div className="relative">
                      <select
                        className="admin-input appearance-none"
                        onChange={(event) => updateField("scratchProductCondition", event.target.value)}
                        value={formData.scratchProductCondition}
                      >
                        {scratchProductConditions.map((condition) => (
                          <option key={condition}>{condition}</option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                        size={16}
                      />
                    </div>
                  </Field>

                  <Field label="Offer Code *">
                    <div className="flex gap-3">
                      <input
                        className="admin-input"
                        onChange={(event) => {
                          const val = event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
                          updateField("couponCode", val);
                        }}
                        maxLength={10}
                        placeholder="E.G. SCR1234"
                        type="text"
                        value={formData.couponCode}
                      />
                      <button
                        aria-label="Generate offer code"
                        className="grid h-12 w-14 shrink-0 place-items-center rounded-[8px] bg-[#eee5dd] text-[#b5480b] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7d9cf] active:translate-y-0 active:scale-[0.98]"
                        onClick={generateCouponCode}
                        type="button"
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                  </Field>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label={<span>Min. Purchase (₹) <span className="text-red-500">*</span></span>}>
                      <input
                        className="admin-input"
                        onChange={(event) => updateField("minPurchase", event.target.value)}
                        placeholder="0.00"
                        value={formData.minPurchase}
                      />
                    </Field>
                    <Field label={<span>Min. Quantity <span className="text-red-500">*</span></span>}>
                      <input
                        className="admin-input"
                        onChange={(event) => updateField("minQuantity", event.target.value)}
                        placeholder="1"
                        value={formData.minQuantity}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 rounded-[9px] bg-[#fff0e8] px-4 py-3 text-[12px] font-bold leading-5 text-[#8d3500]">
                    The customer scratches once at checkout. The rule that gives the highest discount for their cart wins, so bigger carts always unlock the better reward.
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#e2d2c6] bg-[#fffaf6] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-black tracking-[-0.02em] text-[#2b1d15]">Discount Rules</h3>
                      <p className="text-[11px] font-semibold text-[#8a7a71]">
                        Set the percentage or amount for each quantity or order value condition.
                      </p>
                    </div>
                    <button
                      className="flex h-10 items-center gap-2 rounded-full bg-[#b5480b] px-5 text-[11px] font-black uppercase tracking-[0.06em] text-white transition hover:-translate-y-0.5 hover:bg-[#9a3d09] active:translate-y-0 active:scale-[0.98]"
                      onClick={addScratchRule}
                      type="button"
                    >
                      <Plus size={15} /> Add Rule
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {scratchRules.map((rule, index) => {
                      const basis = scratchRuleBases.find((item) => item.value === rule.basis) || scratchRuleBases[0];
                      const threshold = Number(rule.threshold);
                      const discountValue = Number(rule.discountValue);
                      const previewAmount = rule.discountType === "Fixed Amount"
                        ? discountValue
                        : Math.round((1000 * discountValue) / 100);
                      const previewValid = Number.isFinite(threshold) && Number.isFinite(discountValue) && discountValue > 0;

                      return (
                        <article
                          className="rounded-[10px] border border-[#e2d2c6] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                          key={rule.id}
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="rounded-full bg-[#ffe4d6] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#b5480b]">
                              Rule {index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              {previewValid ? (
                                <span className="rounded-full bg-[#f1ffd2] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#597219]">
                                  On ₹1,000 cart: {rule.discountType === "Fixed Amount" ? "₹" : ""}
                                  {previewValid ? previewAmount : 0}
                                  {rule.discountType === "Fixed Amount" ? " off" : "% off"}
                                </span>
                              ) : null}
                              <button
                                aria-label={`Remove rule ${index + 1}`}
                                className="grid h-8 w-8 place-items-center rounded-full bg-[#fdecea] text-[#c0392b] transition hover:bg-[#f8d7d3] disabled:opacity-40"
                                disabled={scratchRules.length === 1}
                                onClick={() => removeScratchRule(rule.id)}
                                type="button"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Applies When">
                              <div className="relative">
                                <select
                                  className="admin-input appearance-none"
                                  onChange={(event) => updateScratchRule(rule.id, "basis", event.target.value)}
                                  value={rule.basis}
                                >
                                  {scratchRuleBases.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                                  size={16}
                                />
                              </div>
                            </Field>

                            <Field label={basis.thresholdLabel}>
                              <input
                                className="admin-input"
                                min={rule.basis === "quantity" ? 1 : 0}
                                onChange={(event) => updateScratchRule(rule.id, "threshold", event.target.value)}
                                placeholder={rule.basis === "quantity" ? "10" : "1000"}
                                type="number"
                                value={rule.threshold}
                              />
                            </Field>

                            <Field label="Reward Type">
                              <div className="relative">
                                <select
                                  className="admin-input appearance-none"
                                  onChange={(event) => updateScratchRule(rule.id, "discountType", event.target.value)}
                                  value={rule.discountType}
                                >
                                  {scratchDiscountTypes.map((type) => (
                                    <option key={type}>{type}</option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                                  size={16}
                                />
                              </div>
                            </Field>

                            <Field label={rule.discountType === "Fixed Amount" ? "Reward Amount (₹)" : "Discount (%)"}>
                              <input
                                className="admin-input"
                                max={rule.discountType === "Fixed Amount" ? undefined : 100}
                                min={0}
                                onChange={(event) => updateScratchRule(rule.id, "discountValue", event.target.value)}
                                placeholder={rule.discountType === "Fixed Amount" ? "200" : "12"}
                                type="number"
                                value={rule.discountValue}
                              />
                            </Field>
                          </div>

                          <div className="mt-3">
                            <Field label="Reward Label (shown to the customer)">
                              <input
                                className="admin-input"
                                maxLength={80}
                                onChange={(event) => updateScratchRule(rule.id, "label", event.target.value)}
                                placeholder={rule.basis === "quantity"
                                  ? `${discountValue || 0}% OFF for ${threshold || 0}+ items`
                                  : `${discountValue || 0}% OFF on orders above ₹${threshold || 0}`}
                                value={rule.label}
                              />
                            </Field>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}


          <section className="mt-4 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
            <Panel icon={Timer} title="Usage Limits">
              <Field label={<span>Total Usage Limit <span className="text-red-500">*</span></span>}>
                <input
                  className="admin-input"
                  onChange={(event) => updateField("totalUsageLimit", event.target.value)}
                  placeholder="Unlimited"
                  value={formData.totalUsageLimit}
                />
              </Field>
              <Field label={<span>Limit Per Customer <span className="text-red-500">*</span></span>}>
                <input
                  className="admin-input"
                  onChange={(event) => updateField("limitPerCustomer", event.target.value)}
                  placeholder="1"
                  value={formData.limitPerCustomer}
                />
              </Field>
            </Panel>

            {selectedOfferType === "Bundle" ? (
              <Panel icon={Gift} title="Bundle Product Selection" className="animate-[offerSectionIn_280ms_ease-out_both]">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative lg:w-56">
                    <select
                      className="admin-input appearance-none"
                      onChange={(event) => {
                        setBundleCategoryFilter(event.target.value);
                        setBundleError("");
                        setBundleMessage("");
                      }}
                      value={bundleCategoryFilter}
                    >
                      {homeCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                      size={16}
                    />
                  </div>

                  <div className="flex rounded-full bg-[#eee5dd] p-1">
                    <button
                      className={`rounded-full px-4 py-1.5 text-[11px] font-black transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                        productView === "All Products"
                          ? "bg-white text-[#b5480b] shadow-[0_6px_14px_rgba(66,36,18,0.08)]"
                          : "text-[#7a6b62] hover:bg-white"
                      }`}
                      onClick={() => setProductView("All Products")}
                      type="button"
                    >
                      All Products
                    </button>
                    <button
                      className={`rounded-full px-4 py-1.5 text-[11px] font-black transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                        productView === "Selected"
                          ? "bg-white text-[#b5480b] shadow-[0_6px_14px_rgba(66,36,18,0.08)]"
                          : "text-[#7a6b62] hover:bg-white"
                      }`}
                      onClick={() => setProductView("Selected")}
                      type="button"
                    >
                      Selected ({bundleSelectedProducts.length})
                    </button>
                  </div>
                </div>

                <label className="flex h-10 items-center gap-3 rounded-full bg-[#eee5dd] px-4 text-[#9a8a80] transition focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(173,77,0,0.09)]">
                  <Search size={15} />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#302119] outline-none placeholder:text-[#998980]"
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Search products or categories..."
                    type="search"
                    value={productSearch}
                  />
                </label>

                <div className="mt-4 grid max-h-[430px] gap-3 overflow-y-auto pr-1 lg:grid-cols-2">
                  {visibleBundleProducts.map((product) => {
                    const isSelected = bundleSelectedProducts.includes(product.name);

                    return (
                      <label
                        className={`flex cursor-pointer items-center gap-4 rounded-[10px] border p-3 transition duration-300 hover:-translate-y-0.5 hover:bg-white ${
                          isSelected
                            ? "border-[#b5480b] bg-white shadow-[0_10px_18px_rgba(181,72,11,0.08)]"
                            : "border-[#eaded6] bg-[#fffaf6]"
                        }`}
                        key={product.name}
                      >
                        <input
                          checked={isSelected}
                          className="sr-only"
                          onChange={() => toggleBundleProduct(product.name)}
                          type="checkbox"
                        />
                        <span
                          className={`h-12 w-14 shrink-0 rounded-[7px] ${product.art}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-black text-[#2b1d15]">
                            {product.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.04em] text-[#8a7a71]">
                            {product.id} / {product.category}
                          </span>
                          <span className="mt-1 block text-[12px] font-black text-[#b5480b]">
                            {formatInr(product.price)}
                          </span>
                        </span>
                        <span
                          className={`grid h-5 w-5 place-items-center rounded-[5px] transition duration-300 ${
                            isSelected
                              ? "bg-[#b5480b] text-white"
                              : "border border-[#cbb7a8] bg-white text-transparent"
                          }`}
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                      </label>
                    );
                  })}
                </div>

                {visibleBundleProducts.length === 0 ? (
                  <div className="mt-4 rounded-[10px] border border-[#eaded6] bg-[#fffaf6] px-4 py-5 text-center text-[12px] font-bold text-[#8a7a71]">
                    No products match this category or search.
                  </div>
                ) : null}

                {bundleError ? (
                  <p className="mt-4 rounded-[9px] bg-[#fff0e8] px-4 py-3 text-[12px] font-bold text-[#8d3500]">
                    {bundleError}
                  </p>
                ) : null}
                {bundleMessage ? (
                  <p className="mt-4 rounded-[9px] bg-[#f1ffd2] px-4 py-3 text-[12px] font-bold text-[#597219]">
                    {bundleMessage}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 border-t border-[#eaded6] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[12px] font-bold text-[#7a6b62]">
                    {bundleSelectedProducts.length} products selected for this bundle.
                  </p>
                  <button
                    className="h-11 rounded-full bg-[#d85f0d] px-7 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(216,95,13,0.2)] transition hover:-translate-y-0.5 hover:bg-[#bf5108] active:translate-y-0 active:scale-[0.98]"
                    onClick={createBundle}
                    type="button"
                  >
                    Create Bundle
                  </button>
                </div>

                {createdBundleProducts.length ? (
                  <div className="mt-5 rounded-[12px] border border-[#dfcfc3] bg-white p-4 shadow-[0_10px_22px_rgba(66,36,18,0.06)] animate-[offerSectionIn_280ms_ease-out_both]">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_300px]">
                      <div>
                        <Field label="Bundle Name">
                          <input
                            className="admin-input"
                            onChange={(event) => {
                              setBundleName(event.target.value);
                              setSubmittedBundleOffer(null);
                              setBundleError("");
                              setBundleMessage("");
                            }}
                            placeholder="e.g. Healthy Breakfast Combo"
                            value={bundleName}
                          />
                        </Field>

                        <h3 className="text-[14px] font-black tracking-[-0.02em] text-[#2b1d15]">
                          Bundle Details
                        </h3>
                        <div className="mt-3 space-y-3">
                          {createdBundleProducts.map((product) => (
                            <article
                              className="grid gap-3 rounded-[10px] border border-[#eaded6] bg-[#fffaf6] p-3 sm:grid-cols-[56px_minmax(0,1fr)_96px] sm:items-center"
                              key={product.id}
                            >
                              <span
                                className={`h-14 w-14 rounded-[8px] ${product.art}`}
                                aria-label={`${product.name} image`}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-black text-[#2b1d15]">
                                  {product.name}
                                </p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.04em] text-[#8a7a71]">
                                  {product.id} / {product.category}
                                </p>
                              </div>
                              <p className="text-left text-[14px] font-black text-[#b5480b] sm:text-right">
                                {formatInr(product.price)}
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[#76665c]">
                            Total Bundle Price
                          </span>
                          <strong className="text-[22px] font-black tracking-[-0.04em] text-[#2b1d15]">
                            {formatInr(originalBundleTotal)}
                          </strong>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-[#eee5dd] p-1">
                          {["Discount Percentage", "Manual Bundle Price"].map((mode) => (
                            <button
                              className={`rounded-full px-3 py-2 text-[10px] font-black transition duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                                bundlePricingMode === mode
                                  ? "bg-white text-[#b5480b] shadow-[0_6px_14px_rgba(66,36,18,0.08)]"
                                  : "text-[#7a6b62] hover:bg-white"
                              }`}
                              key={mode}
                              onClick={() => {
                                setBundlePricingMode(mode);
                                setSubmittedBundleOffer(null);
                              }}
                              type="button"
                            >
                              {mode === "Discount Percentage" ? "Discount %" : "Manual Price"}
                            </button>
                          ))}
                        </div>

                        {bundlePricingMode === "Discount Percentage" ? (
                          <Field label="Discount Percentage">
                            <div className="relative">
                              <input
                                className="admin-input pr-10"
                                inputMode="decimal"
                                max="100"
                                min="0"
                                onChange={(event) => {
                                  setBundleDiscountPercent(event.target.value);
                                  setSubmittedBundleOffer(null);
                                }}
                                placeholder="10"
                                type="number"
                                value={bundleDiscountPercent}
                              />
                              <Percent
                                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7a6b62]"
                                size={16}
                              />
                            </div>
                          </Field>
                        ) : (
                          <Field label="Manual Bundle Price">
                            <input
                              className="admin-input"
                              inputMode="decimal"
                              min="0"
                              onChange={(event) => {
                                setManualBundlePrice(event.target.value);
                                setSubmittedBundleOffer(null);
                              }}
                              placeholder="850"
                              type="number"
                              value={manualBundlePrice}
                            />
                          </Field>
                        )}

                        <div className="mt-4 space-y-2 rounded-[10px] bg-white p-4">
                          <PriceLine label="Original Total Price" value={formatInr(originalBundleTotal)} />
                          <PriceLine
                            label="Discount Percentage"
                            value={`${effectiveDiscountPercent.toFixed(1)}%`}
                          />
                          <PriceLine
                            label="Final Bundle Offer Price"
                            value={formatInr(finalBundlePrice)}
                            strong
                          />
                          <PriceLine label="Total Savings" value={formatInr(bundleSavings)} green />
                        </div>

                        <button
                          className="mt-4 h-11 w-full rounded-full bg-[#2a0f04] px-6 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(42,15,4,0.2)] transition hover:-translate-y-0.5 hover:bg-[#3a1100] active:translate-y-0 active:scale-[0.98]"
                          onClick={submitBundleOffer}
                          type="button"
                        >
                          Submit Bundle Offer
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

              </Panel>
            ) : null}
          </section>

          <div className="mt-8 flex flex-col gap-3 border-t border-[#eaded6] pt-5 sm:flex-row sm:justify-end">
            {saveError && (
              <p className="mr-auto rounded-lg bg-red-50 px-4 py-2 text-[12px] font-semibold text-red-600">{saveError}</p>
            )}
            <button
              className="h-12 rounded-full border border-[#b9aaa0] bg-white px-9 text-[13px] font-black uppercase tracking-[0.04em] text-[#5d4e45] shadow-[0_8px_16px_rgba(66,36,18,0.05)] transition hover:-translate-y-0.5 hover:bg-[#fff7f0] active:translate-y-0 active:scale-[0.98]"
              onClick={() => saveOffer("Draft")}
              type="button"
              disabled={saving}
            >
              Save As Draft
            </button>
            <button
              className="h-12 rounded-full bg-[#d85f0d] px-10 text-[13px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(216,95,13,0.24)] transition hover:-translate-y-0.5 hover:bg-[#bf5108] active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              {saving ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving...</span> : "Create New Offer"}
            </button>
          </div>
        </form>

        {submittedBundleOffer && isBundlePreviewOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#21150f]/50 px-4 py-6 backdrop-blur-sm"
            onClick={() => setIsBundlePreviewOpen(false)}
          >
            <div
              aria-modal="true"
              className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[20px] border border-[#dfcfc3] bg-[#fffaf6] p-5 shadow-[0_30px_80px_rgba(33,21,15,0.28)] animate-[bundlePreviewIn_260ms_ease-out_both] sm:p-6"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#eaded6] pb-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b5480b]">
                    Bundle Offer Preview
                  </p>
                  <h2 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-[#21150f]">
                    {submittedBundleOffer.name}
                  </h2>
                  <p className="mt-2 text-[13px] font-semibold text-[#7a6b62]">
                    Review all bundle details before creating this offer.
                  </p>
                </div>
                <button
                  aria-label="Close bundle preview"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eee5dd] text-[#5d4e45] transition duration-300 hover:-translate-y-0.5 hover:bg-[#e7d9cf] hover:text-[#2a0f04] active:translate-y-0 active:scale-[0.98]"
                  onClick={() => setIsBundlePreviewOpen(false)}
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
                <section className="rounded-[16px] border border-[#eaded6] bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-[16px] font-black tracking-[-0.02em] text-[#2b1d15]">
                        Included Products
                      </h3>
                      <p className="mt-1 text-[12px] font-semibold text-[#8a7a71]">
                        {submittedBundleOffer.products.length} products selected
                      </p>
                    </div>
                    <div className="flex -space-x-3">
                      {submittedBundleOffer.products.slice(0, 5).map((product) => (
                        <span
                          aria-label={`${product.name} image`}
                          className={`h-11 w-11 rounded-full border-2 border-white shadow-[0_8px_16px_rgba(66,36,18,0.12)] ${product.art}`}
                          key={product.id}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {submittedBundleOffer.products.map((product) => (
                      <article
                        className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-[12px] border border-[#eaded6] bg-[#fffaf6] p-3 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                        key={product.id}
                      >
                        <span
                          aria-label={`${product.name} image`}
                          className={`h-16 w-16 rounded-[10px] ${product.art}`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-black text-[#2b1d15]">
                            {product.name}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.05em] text-[#8a7a71]">
                            {product.id}
                          </p>
                          <p className="mt-2 text-[15px] font-black text-[#b5480b]">
                            {formatInr(product.price)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <aside className="rounded-[16px] bg-[#3a1100] p-5 text-white shadow-[0_18px_36px_rgba(58,17,0,0.22)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ffb17e]">
                    Pricing Summary
                  </p>
                  <div className="mt-5 space-y-3 rounded-[12px] bg-white/10 p-4">
                    <PriceLine
                      label="Original Price"
                      value={formatInr(submittedBundleOffer.originalPrice)}
                      light
                    />
                    <PriceLine
                      label="Discount (%)"
                      value={`${submittedBundleOffer.discountPercent.toFixed(1)}%`}
                      light
                    />
                    <PriceLine
                      label="Final Offer Price"
                      value={formatInr(submittedBundleOffer.offerPrice)}
                      light
                      strong
                    />
                    <PriceLine
                      label="Total Amount Saved"
                      value={formatInr(submittedBundleOffer.savings)}
                      green
                      light
                    />
                  </div>

                  <div className="mt-5 rounded-[12px] bg-white p-4 text-[#21150f]">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a7a71]">
                      Offer Card Preview
                    </p>
                    <h3 className="mt-2 text-[20px] font-black tracking-[-0.04em]">
                      {submittedBundleOffer.name}
                    </h3>
                    <p className="mt-2 text-[12px] font-semibold leading-5 text-[#7a6b62]">
                      {submittedBundleOffer.products.map((product) => product.name).join(", ")}
                    </p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <span className="text-[12px] font-black text-[#9b8a80] line-through">
                        {formatInr(submittedBundleOffer.originalPrice)}
                      </span>
                      <strong className="text-[26px] font-black tracking-[-0.05em] text-[#b5480b]">
                        {formatInr(submittedBundleOffer.offerPrice)}
                      </strong>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-[#eaded6] pt-5 sm:flex-row sm:justify-end">
                <button
                  className="h-11 rounded-full border border-[#cbb7a8] bg-white px-6 text-[12px] font-black uppercase tracking-[0.04em] text-[#5d4e45] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff7f0] active:translate-y-0 active:scale-[0.98]"
                  onClick={() => {
                    setIsBundlePreviewOpen(false);
                    setSubmittedBundleOffer(null);
                    setBundleMessage("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-11 rounded-full border border-[#cbb7a8] bg-[#f8eee7] px-6 text-[12px] font-black uppercase tracking-[0.04em] text-[#5d4e45] transition duration-300 hover:-translate-y-0.5 hover:bg-white active:translate-y-0 active:scale-[0.98]"
                  onClick={() => setIsBundlePreviewOpen(false)}
                  type="button"
                >
                  Edit Bundle
                </button>
                <button
                  className="h-11 rounded-full bg-[#d85f0d] px-7 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(216,95,13,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#bf5108] active:translate-y-0 active:scale-[0.98]"
                  onClick={() => saveOffer("Active")}
                  type="button"
                >
                  Confirm & Create Offer
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <style>{`
          @keyframes offerSectionIn {
            from {
              opacity: 0;
              transform: translateY(12px) scale(0.99);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes bundlePreviewIn {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.97);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}

function Panel({ icon: Icon, title, className = "", children }) {
  return (
    <section
      className={`rounded-[12px] border border-[#dfcfc3] bg-[#f8eee7] p-5 shadow-[0_12px_24px_rgba(66,36,18,0.05)] ${className}`}
    >
      <h2 className="mb-4 flex items-center gap-2 text-[17px] font-black tracking-[-0.02em] text-[#2a1a12]">
        <Icon className="text-[#b5480b]" size={18} strokeWidth={2.3} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.08em] text-[#76665c]">
        {label}
      </span>
      {children}
    </label>
  );
}

function PriceLine({ green = false, label, light = false, strong = false, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12px] font-bold">
      <span className={light ? "text-white/68" : "text-[#7a6b62]"}>{label}</span>
      <span
        className={`text-right ${
          green
            ? light
              ? "text-[#c8fb65]"
              : "text-[#597219]"
            : light
              ? "text-white"
              : "text-[#2b1d15]"
        } ${strong ? "text-[16px] font-black" : "font-black"}`}
      >
        {value}
      </span>
    </div>
  );
}

function DistrictPicker({
  districts,
  filteredOptions,
  search,
  customDistrict,
  onSearchChange,
  onCustomDistrictChange,
  onToggleDistrict,
  onAddCustomDistrict,
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-black tracking-[-0.02em] text-[#2b1d15]">Eligible Delivery Districts</p>
          <p className="text-[11px] font-semibold text-[#8a7a71]">
            Matched against the customer&apos;s saved delivery city at checkout. Leave empty to offer free delivery everywhere.
          </p>
        </div>
        <span className="rounded-full bg-[#ffe4d6] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#b5480b]">
          {districts.length} selected
        </span>
      </div>

      {districts.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {districts.map((district) => (
            <span
              className="inline-flex items-center gap-2 rounded-full bg-[#f1ffd2] px-3 py-1.5 text-[11px] font-black text-[#597219]"
              key={normalizeDistrictKey(district)}
            >
              <MapPin size={13} />
              {district}
              <button
                aria-label={`Remove ${district}`}
                className="text-[#7a9c1f] transition hover:text-[#4d6b12]"
                onClick={() => onToggleDistrict(district)}
                type="button"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[9px] bg-[#f1ffd2] px-4 py-3 text-[12px] font-bold leading-5 text-[#597219]">
          No district selected: this offer gives free delivery to every customer.
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
        <label className="flex h-12 items-center gap-3 rounded-[8px] bg-[#f7f1ec] px-4 text-[#9a8a80] transition focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(173,77,0,0.09)]">
          <Search size={15} />
          <input
            className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#302119] outline-none placeholder:text-[#998980]"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search districts..."
            type="text"
            value={search}
          />
        </label>

        <div className="flex gap-3">
          <input
            className="admin-input"
            maxLength={80}
            onChange={(event) => onCustomDistrictChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddCustomDistrict();
              }
            }}
            placeholder="Add district"
            type="text"
            value={customDistrict}
          />
          <button
            className="h-12 shrink-0 rounded-[8px] bg-[#b5480b] px-5 text-[11px] font-black uppercase tracking-[0.06em] text-white transition hover:-translate-y-0.5 hover:bg-[#9a3d09] active:translate-y-0 active:scale-[0.98]"
            onClick={onAddCustomDistrict}
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      {filteredOptions.length ? (
        <div className="mt-4 flex max-h-[220px] flex-wrap gap-2 overflow-y-auto rounded-[9px] border border-[#e2d2c6] bg-white p-3">
          {filteredOptions.map((district) => (
            <button
              className="rounded-full border border-[#dfcfc3] bg-[#fffaf6] px-3 py-1.5 text-[11px] font-bold text-[#4c3d35] transition hover:border-[#b5480b] hover:text-[#b5480b]"
              key={normalizeDistrictKey(district)}
              onClick={() => onToggleDistrict(district)}
              type="button"
            >
              + {district}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[11px] font-bold text-[#8a7a71]">
          No matching district in the list. Use &quot;Add district&quot; to create a custom one.
        </p>
      )}
    </div>
  );
}

export default Createoffers;
