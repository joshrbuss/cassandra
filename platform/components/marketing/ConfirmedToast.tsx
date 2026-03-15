"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export default function ConfirmedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const confirmed = searchParams.get("confirmed");
    if (confirmed === "true") {
      setVisible(true);
      setInvalid(false);
      // Remove the query param so refresh doesn't re-show it
      const params = new URLSearchParams(searchParams.toString());
      params.delete("confirmed");
      const qs = params.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    } else if (confirmed === "invalid") {
      setVisible(true);
      setInvalid(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("confirmed");
      const qs = params.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-opacity ${
        invalid ? "bg-red-600 text-white" : "bg-green-600 text-white"
      }`}
    >
      <span>{invalid ? "⚠️ Confirmation link expired or invalid." : "✓ You're subscribed!"}</span>
      <button onClick={() => setVisible(false)} className="ml-2 opacity-75 hover:opacity-100 text-lg leading-none">
        ×
      </button>
    </div>
  );
}
