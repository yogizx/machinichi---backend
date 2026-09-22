import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bookmark, Heart, Menu, Mic, MicOff, Search, ShoppingCart, User, X } from "lucide-react";
import logo from "../pages/images/machinichi.png";
import SearchDropdown from "./search/SearchDropdown";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function Header({ cartCount = 0, favoriteCount = 0, savedCount = 0, onCartClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleVoiceSearch = useCallback(() => {
    if (!SpeechRecognition) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      navigate(`/product?search=${encodeURIComponent(transcript)}`);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, navigate]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-50 w-full shrink-0 border-b border-[#3b1f13] bg-[#5a3322] transition-shadow duration-300 ease-out ${scrolled ? "shadow-[0_8px_24px_rgba(45,22,12,0.22)]" : "shadow-none"}`}>
        <div className="relative mx-auto flex h-[68px] w-full max-w-[1390px] items-center justify-between px-4 sm:h-[82px] sm:px-6 lg:px-[54px]">
          <NavLink
            aria-label="Machinichi home"
            className="flex shrink-0 items-center gap-2 sm:gap-3"
            to="/"
          >
            <img
              alt="Machinichi logo"
              className="h-[38px] w-auto shrink-0 object-contain sm:h-[48px] lg:h-[54px]"
              src={logo}
            />
            <span className="hidden text-[17px] font-black tracking-[-0.035em] text-white sm:block sm:text-[20px] lg:text-[22px]">
              Machinichi
            </span>
          </NavLink>

          <div className="hidden items-center lg:flex lg:flex-1 lg:justify-center lg:gap-6 xl:gap-10">
            <nav className="flex items-center gap-1 text-[14px] font-semibold xl:gap-1.5 xl:text-[15px]">
              <NavLink className={({isActive}) => `rounded-lg px-3 py-1.5 transition-all duration-200 ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`} end to="/">Home</NavLink>
              <NavLink className={({isActive}) => `rounded-lg px-3 py-1.5 transition-all duration-200 ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`} to="/about">About</NavLink>
              <NavLink className={({isActive}) => `rounded-lg px-3 py-1.5 transition-all duration-200 ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`} to="/categories">Categories</NavLink>
              <NavLink className={({isActive}) => `rounded-lg px-3 py-1.5 transition-all duration-200 ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`} to="/product">Product</NavLink>
              <NavLink className={({isActive}) => `rounded-lg px-3 py-1.5 transition-all duration-200 ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`} to="/bulk">Bulk</NavLink>
              <NavLink className={({isActive}) => `rounded-lg px-3 py-1.5 transition-all duration-200 ${isActive ? "bg-white/15 text-white font-bold" : "text-white/70 hover:text-white hover:bg-white/10"}`} to="/contact">Contact</NavLink>
            </nav>

            <div className="relative w-[200px] xl:w-[260px]">
              <SearchDropdown onClose={() => {}} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 text-white sm:gap-1.5 lg:gap-2">
            <button
              aria-label="Search"
              className="flex h-[38px] w-[38px] items-center justify-center text-white/90 transition-all duration-200 hover:scale-110 hover:text-white lg:hidden"
              onClick={() => navigate("/product")}
            >
              <Search size={18} strokeWidth={2.4} />
            </button>
            {SpeechRecognition && (
              <button
                aria-label={isListening ? "Stop voice search" : "Voice search"}
                className={`flex h-[38px] w-[38px] items-center justify-center transition-all duration-200 lg:hidden ${isListening ? "text-[#fd761a] animate-pulse" : "text-white/90 hover:scale-110 hover:text-white"}`}
                onClick={toggleVoiceSearch}
              >
                {isListening ? <MicOff size={18} strokeWidth={2.4} /> : <Mic size={18} strokeWidth={2.4} />}
              </button>
            )}

            <NavLink
              aria-label={`Favorites with ${favoriteCount} items`}
              className="relative flex h-[38px] w-[38px] items-center justify-center text-white/90 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:text-white sm:h-[40px] sm:w-[40px]"
              to="/favouite"
            >
              <Heart size={18} strokeWidth={2.4} />
              {favoriteCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[#f7e6cf] px-[3px] text-[10px] font-black leading-none text-[#4b2819] shadow-sm">
                  {favoriteCount}
                </span>
              )}
            </NavLink>

            <NavLink
              aria-label={`Saved products with ${savedCount} items`}
              className="relative hidden h-[38px] w-[38px] items-center justify-center text-white/90 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:text-white sm:flex sm:h-[40px] sm:w-[40px]"
              to="/saveproduct"
            >
              <Bookmark size={18} strokeWidth={2.4} />
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-[#f7e6cf] px-[3px] text-[10px] font-black leading-none text-[#4b2819] shadow-sm">
                  {savedCount}
                </span>
              )}
            </NavLink>

            <button
              aria-label={`Cart with ${cartCount} items`}
              className="relative flex h-[38px] w-[38px] items-center justify-center text-white/90 transition-all duration-200 hover:scale-110 hover:text-white sm:h-[40px] sm:w-[40px]"
              onClick={onCartClick}
              data-cart-icon
            >
              <ShoppingCart size={18} strokeWidth={2.4} />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#f7e6cf] px-[3px] text-[10px] font-black leading-none text-[#4b2819] shadow-[0_2px_4px_rgba(0,0,0,0.2)] animate-[cartBadgeBounce_500ms_ease-out]"
                >
                  {cartCount}
                </span>
              )}
            </button>

            <NavLink
              aria-label="Profile"
              className="hidden h-[38px] w-[38px] items-center justify-center text-white/90 transition-all duration-200 hover:scale-110 hover:text-white sm:flex sm:h-[40px] sm:w-[40px]"
              to="/profile"
            >
              <User size={18} strokeWidth={2.4} />
            </NavLink>

            <button
              aria-label="Toggle menu"
              className="flex h-[38px] w-[38px] items-center justify-center text-white lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[300px] max-w-[85vw] bg-[#321304] shadow-2xl animate-slideInRight">
            <div className="flex items-center justify-between border-b border-[#5a3322] px-6 py-5">
              <span className="text-[18px] font-black text-white">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-[44px] w-[44px] items-center justify-center text-white/80 hover:text-white"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex flex-col gap-2 px-6 pt-6">
              <MobileNavLink to="/" onClick={() => setMenuOpen(false)}>Home</MobileNavLink>
              <MobileNavLink to="/about" onClick={() => setMenuOpen(false)}>About</MobileNavLink>
              <MobileNavLink to="/categories" onClick={() => setMenuOpen(false)}>Categories</MobileNavLink>
              <MobileNavLink to="/product" onClick={() => setMenuOpen(false)}>Product</MobileNavLink>
              <MobileNavLink to="/bulk" onClick={() => setMenuOpen(false)}>Bulk Orders</MobileNavLink>
              <MobileNavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact</MobileNavLink>
            </nav>

            <div className="mt-6 border-t border-[#5a3322] px-6 pt-6">
              <p className="mb-3 text-[13px] font-semibold text-[#f7e6cf]/60 uppercase tracking-wider">Account</p>
              <MobileNavLink to="/profile" onClick={() => setMenuOpen(false)}>Profile</MobileNavLink>
              <MobileNavLink to="/orders" onClick={() => setMenuOpen(false)}>Orders</MobileNavLink>
              <MobileNavLink to="/favouite" onClick={() => setMenuOpen(false)}>Wishlist</MobileNavLink>
              <MobileNavLink to="/saveproduct" onClick={() => setMenuOpen(false)}>Saved Items</MobileNavLink>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileNavLink({ to, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-xl px-4 py-3 text-[16px] font-bold transition ${
          isActive
            ? "bg-[#5a3322] text-white"
            : "text-[#f7e6cf]/84 hover:bg-[#5a3322]/60 hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default Header;
