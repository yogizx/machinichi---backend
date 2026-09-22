import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "./components/Toaster";
import api from "./services/api";
import CartDrawer from "./components/CartDrawer";
import FlyToCart from "./components/FlyToCart";

const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));

const formatINR = (num) => {
  if (num == null || num <= 0) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
};
const AdminOrders = lazy(() => import("./admin/pages/AdminOrders"));
const Adminlogin = lazy(() => import("./admin/pages/Adminlogin"));
const Adminprofile = lazy(() => import("./admin/pages/Adminprofile"));
const Analytics = lazy(() => import("./admin/pages/Analytics"));
const BusinessApprovals = lazy(() => import("./admin/pages/BusinessApprovals"));
const Createoffers = lazy(() => import("./admin/pages/Createoffers"));
const Customers = lazy(() => import("./admin/pages/Customers"));
const Inventory = lazy(() => import("./admin/pages/Inventory"));
const AdminCategories = lazy(() => import("./admin/pages/AdminCategories"));
const ProductListing = lazy(() => import("./admin/pages/ProductListing"));
const OffersCoupons = lazy(() => import("./admin/pages/OffersCoupons"));
const ReturnRequest = lazy(() => import("./admin/pages/ReturnRequest"));
const Bannerimage = lazy(() => import("./admin/pages/Bannerimage"));
const Footer = lazy(() => import("./components/Footer"));
const Header = lazy(() => import("./components/Header"));
import { ToasterProvider } from "./components/Toaster";
const About = lazy(() => import("./pages/About"));
const Bulk = lazy(() => import("./pages/Bulk"));
const Cart = lazy(() => import("./pages/Cart"));
const Categories = lazy(() => import("./pages/Categories"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Contact = lazy(() => import("./pages/Contact"));
const Consultation = lazy(() => import("./pages/Consultation"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const CreateAccount = lazy(() => import("./pages/CreateAccount"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const DryFriut = lazy(() => import("./pages/DryFriut"));
const Favouite = lazy(() => import("./pages/Favouite"));
const Forgotpassword = lazy(() => import("./pages/Forgotpassword"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const Home = lazy(() => import("./pages/Home"));
const Industries = lazy(() => import("./pages/Industries/Industries"));
const Order = lazy(() => import("./pages/Order"));
const Overview = lazy(() => import("./pages/Overview"));
const Partnership = lazy(() => import("./pages/Partnership"));
const PaymentMethod = lazy(() => import("./pages/PaymentMethod"));
const PaymentFailure = lazy(() => import("./pages/PaymentFailure"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Profile = lazy(() => import("./pages/Profile"));
const Product = lazy(() => import("./pages/Product"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Return = lazy(() => import("./pages/Return"));
const Saveproduct = lazy(() => import("./pages/Saveproduct"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const SignIn = lazy(() => import("./pages/SignIn"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const Trackorder = lazy(() => import("./pages/Trackorder"));

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf5]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eadfd7] border-t-[#fd761a]" />
        <p className="text-sm font-medium text-[#796d66]">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToasterProvider>
        <ScrollToTop />
        <AppLayout />
      </ToasterProvider>
    </BrowserRouter>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
}

function getAnalyticsVisitorId() {
  let vid = localStorage.getItem("analytics_visitor_id");
  if (!vid) {
    vid = crypto.randomUUID();
    localStorage.setItem("analytics_visitor_id", vid);
  }
  return vid;
}

function trackEvent(url, body = {}) {
  return api.post(url, { ...body, sessionId: getAnalyticsVisitorId() }).catch(() => {});
}

function getValidImageUrl(itemImage, productImages) {
  if (itemImage && typeof itemImage === "string" && !itemImage.startsWith("[object") && (itemImage.startsWith("http") || itemImage.startsWith("/") || itemImage.startsWith("data:"))) {
    return itemImage;
  }
  if (Array.isArray(productImages) && productImages[0]?.url) return productImages[0].url;
  if (typeof productImages === "string") return productImages;
  return "";
}

function RequireAuth({ isSignedIn, authLoading, children }) {
  const location = useLocation();
  if (!isSignedIn && !authLoading) {
    return <Navigate to={`/signin?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (authLoading) return null;
  return children;
}

function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isSignedIn, setIsSignedIn] = useState(() => {
    return !!localStorage.getItem("accessToken");
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const [isAdminSignedIn, setIsAdminSignedIn] = useState(false);
  const [adminAuthLoading, setAdminAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) { setAuthLoading(false); setAdminAuthLoading(false); return; }
      try {
        const { data } = await api.get("/auth/me", { timeout: 5000 });
        if (data?.user) {
          setIsSignedIn(true);
          setUserId(data.user._id || data.user.id || null);
          if (data.user.role === "admin" || data.user.role === "super_admin") {
            setIsAdminSignedIn(true);
          }
          try {
            const cartRes = await api.get("/cart");
            if (cartRes?.data?.success && cartRes.data.data?.items) {
              const backendItems = cartRes.data.data.items.map((item) => {
                const product = item.productId || {};
                return {
                  cartItemId: item._id,
                  _id: product._id || item.productId,
                  key: `${item.name}-${item.variantSize || "default"}`,
                  name: item.name,
                  image: getValidImageUrl(item.image, product.images),
                  sellingPrice: item.sellingPrice,
                  mrpPrice: item.mrpPrice,
                  price: formatINR(item.sellingPrice),
                  oldPrice: item.mrpPrice > item.sellingPrice ? formatINR(item.mrpPrice) : null,
                  selectedSize: item.variantSize || "",
                  sizes: item.variantSize ? [item.variantSize] : [],
                  quantity: item.quantity,
                  category: product.category || {},
                };
              });
              setCartItems(backendItems);
            }
          } catch {
            // Keep existing local cart on fetch failure
          }
        }
      } catch {
        localStorage.removeItem("accessToken");
        setIsSignedIn(false);
      }
      setAuthLoading(false);
      setAdminAuthLoading(false);
    })();
  }, []);

  const [cartItems, setCartItems] = useState(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) return [];
      const saved = localStorage.getItem("machinichi_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favoriteProducts, setFavoriteProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("machinichi_wishlist");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  const [savedProducts, setSavedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("machinichi_saved");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [flyingProduct, setFlyingProduct] = useState(null);
  const addToast = useToast();

  useEffect(() => {
    if (!isSignedIn) {
      localStorage.setItem("machinichi_cart", JSON.stringify(cartItems));
    } else {
      localStorage.removeItem("machinichi_cart");
    }
  }, [cartItems, isSignedIn]);

  useEffect(() => {
    localStorage.setItem("machinichi_wishlist", JSON.stringify([...favoriteProducts]));
  }, [favoriteProducts]);

  useEffect(() => {
    localStorage.setItem("machinichi_saved", JSON.stringify(savedProducts));
  }, [savedProducts]);

  // Reconciliation: on load, re-assert a cart-add event for every product
  // already sitting in this browser's cart. trackCartAdd is idempotent
  // ($addToSet), so this can never inflate Cart Count — it only guarantees
  // that a product genuinely in the customer's cart is never permanently
  // stuck unreported to the backend (e.g. if an earlier attempt was missed).
  useEffect(() => {
    cartItems.forEach((item) => {
      if (item?._id) {
        trackEvent(`/tracking/products/${item._id}/cart-add`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    const timer = setTimeout(() => {
      api.post("/tracking/identity/merge", {
        sessionId: getAnalyticsVisitorId(),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [isSignedIn]);

  const isStandaloneCheckout =
    pathname === "/checkout" ||
    pathname === "/payment-method" ||
    pathname === "/payment-success" ||
    pathname === "/payment-failure" ||
    pathname === "/signin" ||
    pathname === "/create-account" ||
    pathname === "/forgot-password" ||
    pathname === "/forgotpassword";

  const isAdminLoginPage = pathname === "/admin/login" || pathname === "/admin-login";
  const isAdminRoute = pathname.startsWith("/admin/") || pathname === "/admin-login";

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const favoriteCount = favoriteProducts.size;
  const savedCount = savedProducts.length;

  const addToCart = async (product, quantity = 1, sourceElement = null) => {
    if (!product) return;
    const key = `${product.name}-${product.selectedSize || product.sizes?.[0] || "default"}`;
    if (product._id) {
      trackEvent(`/tracking/products/${product._id}/cart-add`);
    }
    if (isSignedIn && product._id) {
      try {
        const { data } = await api.post("/cart/add", {
          productId: product._id,
          quantity,
          variantSize: product.selectedSize || product.sizes?.[0],
        });
        if (data?.success && data.data?.items) {
          const backendItems = data.data.items.map((item) => {
            const p = item.productId || {};
            return {
              cartItemId: item._id,
              _id: p._id || item.productId,
              key: `${item.name}-${item.variantSize || "default"}`,
              name: item.name,
              image: getValidImageUrl(item.image, p.images),
              sellingPrice: item.sellingPrice,
              mrpPrice: item.mrpPrice,
              price: formatINR(item.sellingPrice),
              oldPrice: item.mrpPrice > item.sellingPrice ? formatINR(item.mrpPrice) : null,
              selectedSize: item.variantSize || "",
              sizes: item.variantSize ? [item.variantSize] : [],
              quantity: item.quantity,
              category: p.category || {},
            };
          });
          setCartItems(backendItems);
          if (sourceElement) setFlyingProduct({ ...product, _flySource: sourceElement });
          if (typeof addToast === "function") addToast("Added to Cart", "cart", 3000, product);
          return;
        }
      } catch {
        // Fall through to local-only add
      }
    }
    setCartItems((items) => {
      const existingItem = items.find((item) => item.key === key);
      if (existingItem) {
        return items.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...items, { ...product, key, quantity }];
    });
    if (sourceElement) {
      setFlyingProduct({ ...product, _flySource: sourceElement });
    }
    if (typeof addToast === "function") {
      addToast("Added to Cart", "cart", 3000, product);
    }
  };

  const saveForLater = (product) => {
    if (!product) return;
    const name = product.name || product.title;
    if (!name) return;
    setSavedProducts((items) => {
      const key = product.key || `${name}-${product.selectedSize || product.sizes?.[0] || "default"}`;
      const existingIndex = items.findIndex(
        (item) => item.key === key || (item.name || item.title) === name
      );
      if (existingIndex !== -1) {
        const updated = [...items];
        updated[existingIndex] = { ...updated[existingIndex], ...product, name, key };
        return updated;
      }
      return [...items, { ...product, name, key, quantity: product.quantity || 1 }];
    });
  };

  const removeSavedProduct = (key) =>
    setSavedProducts((items) => items.filter((item) => item.key !== key));

  const moveSavedProductToCart = (key) => {
    const product = savedProducts.find((item) => item.key === key);
    if (!product) return;
    addToCart(product, product.quantity || 1);
    removeSavedProduct(key);
  };

  const updateCartQuantity = (key, quantity) => {
    const item = cartItems.find((i) => i.key === key);
    if (isSignedIn && item?._id) {
      const qs = item.selectedSize ? `?variantSize=${encodeURIComponent(item.selectedSize)}` : "";
      api.put(`/cart/item/${item._id}${qs}`, { quantity: Math.max(1, quantity) })
        .then(({ data }) => {
          if (data?.success && data.data?.items) {
            const backendItems = data.data.items.map((ci) => {
              const p = ci.productId || {};
              return {
                cartItemId: ci._id,
                _id: p._id || ci.productId,
                key: `${ci.name}-${ci.variantSize || "default"}`,
                name: ci.name,
                image: getValidImageUrl(ci.image, p.images),
                sellingPrice: ci.sellingPrice,
                mrpPrice: ci.mrpPrice,
                price: formatINR(ci.sellingPrice),
                oldPrice: ci.mrpPrice > ci.sellingPrice ? formatINR(ci.mrpPrice) : null,
                selectedSize: ci.variantSize || "",
                sizes: ci.variantSize ? [ci.variantSize] : [],
                quantity: ci.quantity,
                category: p.category || {},
              };
            });
            setCartItems(backendItems);
          }
        })
        .catch(() => {});
    }
    setCartItems((items) =>
      items
        .map((i) =>
          i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeCartItem = (key) => {
    const removed = cartItems.find((item) => item.key === key);
    if (removed?._id) {
      trackEvent(`/tracking/products/${removed._id}/cart-remove`);
    }
    if (isSignedIn && removed?._id) {
      const qs = removed.selectedSize ? `?variantSize=${encodeURIComponent(removed.selectedSize)}` : "";
      api.delete(`/cart/item/${removed._id}${qs}`)
        .then(({ data }) => {
          if (data?.success && data.data?.items) {
            const backendItems = data.data.items.map((ci) => {
              const p = ci.productId || {};
              return {
                cartItemId: ci._id,
                _id: p._id || ci.productId,
                key: `${ci.name}-${ci.variantSize || "default"}`,
                name: ci.name,
                image: getValidImageUrl(ci.image, p.images),
                sellingPrice: ci.sellingPrice,
                mrpPrice: ci.mrpPrice,
                price: formatINR(ci.sellingPrice),
                oldPrice: ci.mrpPrice > ci.sellingPrice ? formatINR(ci.mrpPrice) : null,
                selectedSize: ci.variantSize || "",
                sizes: ci.variantSize ? [ci.variantSize] : [],
                quantity: ci.quantity,
                category: p.category || {},
              };
            });
            setCartItems(backendItems);
          }
        })
        .catch(() => {});
    }
    setCartItems((items) => items.filter((item) => item.key !== key));
  };

  const toggleFavoriteProduct = (productName, productId) => {
    setFavoriteProducts((current) => {
      const next = new Set(current);
      const adding = !next.has(productName);
      adding ? next.add(productName) : next.delete(productName);
      if (productId) {
        api.post(`/wishlist/${adding ? "add" : "remove"}`, { productId, sessionId: getAnalyticsVisitorId() }).catch(() => {});
      }
      return next;
    });
  };

  const handleCartClick = useCallback(() => {
    setCartDrawerOpen(true);
  }, []);

  const handleCheckoutFromDrawer = useCallback(() => {
    setCartDrawerOpen(false);
    if (cartItems.length) {
      navigate("/checkout", {
        state: { cartItems, product: cartItems[0] },
      });
    }
  }, [cartItems]);

  const completeSignIn = () => setIsSignedIn(true);
  const completeSignOut = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("machinichi_cart");
    setCartItems([]);
    setUserId(null);
    setIsSignedIn(false);
  };
  const completeAdminLogin = () => setIsAdminSignedIn(true);
  const completeAdminLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("machinichi_cart");
    setCartItems([]);
    setUserId(null);
    setIsAdminSignedIn(false);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      completeSignOut();
      completeAdminLogout();
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  if (isAdminRoute) {
    if (adminAuthLoading) return <LoadingScreen />;
    if (!isAdminSignedIn && !isAdminLoginPage) {
      return <Adminlogin onAdminLogin={completeAdminLogin} />;
    }
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/admin/login" element={<Adminlogin onAdminLogin={completeAdminLogin} />} />
          <Route path="/admin-login" element={<Adminlogin onAdminLogin={completeAdminLogin} />} />
          <Route path="/admin/dashboard" element={<AdminDashboard onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/profile" element={<Adminprofile onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/customers" element={<Customers onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/categories" element={<AdminCategories onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/product-listing" element={<ProductListing onAdminLogout={completeAdminLogout} favoriteProducts={favoriteProducts} />} />
          <Route path="/admin/inventory" element={<Inventory onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/orders" element={<AdminOrders onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/analytics" element={<Analytics onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/return-request" element={<ReturnRequest onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/businesses" element={<BusinessApprovals onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/offers-coupons" element={<OffersCoupons onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/create-offers" element={<Createoffers onAdminLogout={completeAdminLogout} />} />
          <Route path="/admin/banner-images" element={<Bannerimage onAdminLogout={completeAdminLogout} />} />
        </Routes>
      </Suspense>
    );
  }

  if (pathname === "/auth/google/callback") {
    return <GoogleCallback />;
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="flex min-h-screen flex-col bg-[#fffaf5]">
        {!isStandaloneCheckout && (
          <Suspense fallback={null}>
            <Header
              cartCount={cartCount}
              favoriteCount={favoriteCount}
              savedCount={savedCount}
              onCartClick={handleCartClick}
            />
          </Suspense>
        )}

        <main id="main-content" className="min-w-0 flex-1">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Home favoriteProducts={favoriteProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} />} />
              <Route path="/about" element={<About />} />
              <Route path="/industries" element={<Industries />} />
              <Route path="/industries/:slug" element={<Industries />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/consultation" element={<Consultation />} />
              <Route path="/partnership" element={<Partnership />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/disclaimer" element={<Disclaimer />} />

              <Route path="/cart" element={<Cart cartItems={cartItems} onClearCart={() => {
                if (isSignedIn) api.delete("/cart/clear").catch(() => {});
                setCartItems([]);
              }} onRemoveItem={removeCartItem} onUpdateQuantity={updateCartQuantity} />} />

              <Route path="/dryfriut" element={<DryFriut favoriteProducts={favoriteProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} />} />

              <Route path="/fruit" element={<DryFriut favoriteProducts={favoriteProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} />} />

              <Route path="/product" element={<Product favoriteProducts={favoriteProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} onSaveForLater={saveForLater} />} />

              <Route path="/product/:slug" element={<ProductDetails favoriteProducts={favoriteProducts} savedProducts={savedProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} onSaveForLater={saveForLater} />} />

              <Route path="/bulk" element={<Bulk onAddToCart={addToCart} />} />

              <Route path="/checkout" element={<Checkout isSignedIn={isSignedIn} />} />
              <Route path="/payment-method" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><PaymentMethod /></RequireAuth>} />
              <Route path="/payment-failure" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><PaymentFailure /></RequireAuth>} />
              <Route path="/payment-success" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><PaymentSuccess /></RequireAuth>} />

              <Route path="/account" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><Profile onSignOut={completeSignOut} /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><Profile onSignOut={completeSignOut} /></RequireAuth>} />
              <Route path="/overview" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><Overview /></RequireAuth>} />
              <Route path="/orders" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><Order /></RequireAuth>} />
              <Route path="/trackorder" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><Trackorder /></RequireAuth>} />
              <Route path="/return-request" element={<RequireAuth isSignedIn={isSignedIn} authLoading={authLoading}><Return /></RequireAuth>} />
              <Route path="/saveproduct" element={<Saveproduct savedProducts={savedProducts} onMoveToCart={moveSavedProductToCart} onRemoveSaved={removeSavedProduct} isSignedIn={isSignedIn} />} />
              <Route path="/save-product" element={<Saveproduct savedProducts={savedProducts} onMoveToCart={moveSavedProductToCart} onRemoveSaved={removeSavedProduct} isSignedIn={isSignedIn} />} />
              <Route path="/savedproduct" element={<Saveproduct savedProducts={savedProducts} onMoveToCart={moveSavedProductToCart} onRemoveSaved={removeSavedProduct} isSignedIn={isSignedIn} />} />
              <Route path="/saved-products" element={<Saveproduct savedProducts={savedProducts} onMoveToCart={moveSavedProductToCart} onRemoveSaved={removeSavedProduct} isSignedIn={isSignedIn} />} />
              <Route path="/favouite" element={<Favouite favoriteProducts={favoriteProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} isSignedIn={isSignedIn} />} />
              <Route path="/favourite" element={<Favouite favoriteProducts={favoriteProducts} onAddToCart={addToCart} onFavoriteToggle={toggleFavoriteProduct} isSignedIn={isSignedIn} />} />

              <Route path="/signin" element={<SignIn onSignIn={completeSignIn} />} />
              <Route path="/create-account" element={<CreateAccount onSignIn={completeSignIn} />} />
              <Route path="/forgot-password" element={<Forgotpassword />} />
              <Route path="/forgotpassword" element={<Forgotpassword />} />
              <Route path="/reset-password" element={<Forgotpassword />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
            </Routes>
          </Suspense>
        </main>
        {!isStandaloneCheckout && <Footer />}

        <CartDrawer
          open={cartDrawerOpen}
          items={cartItems}
          onClose={() => setCartDrawerOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeCartItem}
          onCheckout={handleCheckoutFromDrawer}
        />

        <FlyToCart
          product={flyingProduct}
          onDone={() => setFlyingProduct(null)}
        />
      </div>
    </>
  );
}

export default App;
