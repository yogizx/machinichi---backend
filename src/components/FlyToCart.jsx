import { useEffect, useLayoutEffect, useRef } from "react";

function FlyToCart({ product, onDone }) {
  const elRef = useRef(null);

  useLayoutEffect(() => {
    if (!product) return;
    const img = product._flySource;
    let sx = 0, sy = 0, sw = 80, sh = 80;
    if (img instanceof HTMLElement) {
      const r = img.getBoundingClientRect();
      sx = r.left; sy = r.top; sw = r.width; sh = r.height;
    }
    const cartIcon = document.querySelector("[data-cart-icon]");
    let tx = 0, ty = 0;
    if (cartIcon) {
      const r = cartIcon.getBoundingClientRect();
      tx = r.left + r.width / 2 - 20;
      ty = r.top + r.height / 2 - 20;
    }
    const el = elRef.current;
    if (el) {
      el.style.setProperty("--sx", `${sx}px`);
      el.style.setProperty("--sy", `${sy}px`);
      el.style.setProperty("--sw", `${sw}px`);
      el.style.setProperty("--sh", `${sh}px`);
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const timer = setTimeout(() => onDone?.(), 650);
    return () => clearTimeout(timer);
  }, [product, onDone]);

  if (!product) return null;

  return (
    <div
      ref={elRef}
      className="fixed z-[9999] pointer-events-none flying-cart"
      style={{
        left: "var(--sx)",
        top: "var(--sy)",
        width: "var(--sw)",
        height: "var(--sh)",
      }}
    >
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `url(${product.image || product.images?.[0]?.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          borderRadius: "8px",
          animation: "flyToCart 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      />
      <style>{`
        @keyframes flyToCart {
          0% {
            border-radius: 8px;
            width: 100%;
            height: 100%;
          }
          100% {
            border-radius: 50%;
            width: 40px;
            height: 40px;
            opacity: 0.7;
            transform: translate(calc(var(--tx) - var(--sx)), calc(var(--ty) - var(--sy)));
          }
        }
      `}</style>
    </div>
  );
}

export default FlyToCart;
