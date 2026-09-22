import { useState, useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onSuccess, label = "Continue with Google" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const popupRef = useRef(null);
  const listenerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener("message", listenerRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  const handleClick = () => {
    setLoading(true);
    setError("");

    if (!GOOGLE_CLIENT_ID) {
      setError("Google Client ID is not configured");
      setLoading(false);
      return;
    }

    if (listenerRef.current) {
      window.removeEventListener("message", listenerRef.current);
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const state = Math.random().toString(36).substring(2);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&response_type=id_token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent("openid profile email")}` +
      `&state=${state}` +
      `&nonce=${state}`;

    listenerRef.current = (event) => {
      if (event.origin !== window.location.origin || !event.data?.type) return;

      if (event.data.type === "GOOGLE_AUTH") {
        setLoading(false);
        if (event.data.idToken) {
          onSuccess(event.data.idToken);
        } else {
          setError("No ID token received");
        }
        if (listenerRef.current) {
          window.removeEventListener("message", listenerRef.current);
          listenerRef.current = null;
        }
      } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
        setLoading(false);
        setError(event.data.error || "Google sign-in failed");
        if (listenerRef.current) {
          window.removeEventListener("message", listenerRef.current);
          listenerRef.current = null;
        }
      }
    };

    window.addEventListener("message", listenerRef.current);

    const width = 500;
    const height = 600;
    const left = Math.max(0, Math.round(window.screenX + (window.innerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.innerHeight - height) / 2));

    popupRef.current = window.open(
      authUrl,
      "google-auth",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popupRef.current || popupRef.current.closed) {
      setLoading(false);
      setError("Popup was blocked. Please allow popups for this site.");
      return;
    }

    const checkClosed = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(checkClosed);
        setLoading(false);
        if (listenerRef.current) {
          window.removeEventListener("message", listenerRef.current);
          listenerRef.current = null;
        }
      }
    }, 500);
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex h-[48px] w-full items-center justify-center gap-3 rounded-[10px] border border-[#dad1c9] bg-white px-4 text-[14px] font-bold text-[#3d3834] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] active:translate-y-0 disabled:opacity-60"
      >
        {loading ? (
          <svg className="h-5 w-5 animate-spin text-[#9d948d]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
        )}
        {loading ? "Signing in..." : label}
      </button>
      {error && <p className="mt-2 text-[12px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}
