import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const idToken = params.get("id_token");

      if (idToken && window.opener) {
        window.opener.postMessage({ type: "GOOGLE_AUTH", idToken }, window.location.origin);
      }
    } catch (err) {
      if (window.opener) {
        window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: err.message }, window.location.origin);
      }
    }

    setTimeout(() => {
      if (window.opener) {
        window.close();
      } else {
        navigate("/signin");
      }
    }, 1000);
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbf5ef]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#ad4d00] border-t-transparent" />
        <p className="mt-4 text-[15px] text-[#5a4f48]">Completing Google sign-in...</p>
      </div>
    </main>
  );
}
