"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "email_popup_dismissed";

interface EmailPopupProps {
  /** User has no email on their account */
  hasNoEmail: boolean;
  /** User has solved at least 3 puzzles */
  hasEnoughAttempts: boolean;
}

export default function EmailPopup({ hasNoEmail, hasEnoughAttempts }: EmailPopupProps) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    if (!hasNoEmail || !hasEnoughAttempts) return;
    // Don't show if dismissed or already submitted
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // Don't show if already shown this session
    if (sessionStorage.getItem("email_popup_shown")) return;
    sessionStorage.setItem("email_popup_shown", "1");
    // Small delay so it doesn't flash on page load
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [hasNoEmail, hasEnoughAttempts]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/users/me/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      localStorage.setItem(DISMISSED_KEY, "1");
      setTimeout(() => setVisible(false), 2000);
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-[#0e0e0e] rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-[#2a2a2a]">
        {status === "done" ? (
          <div className="text-center py-4">
            <p className="text-[#c8942a] font-bold text-lg">You&apos;re on the list. Chess On!</p>
          </div>
        ) : (
          <>
            <h2 className="text-[#c8942a] font-bold text-lg text-center">
              Get your weekly Chess On! digest
            </h2>
            <p className="text-gray-400 text-sm text-center mt-1.5 mb-5">
              We&apos;ll send you your weekly puzzle stats!
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#c8942a] transition-colors"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full bg-[#c8942a] text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-[#b5852a] disabled:opacity-50 transition-colors"
              >
                {status === "sending" ? "Sending..." : "Notify me"}
              </button>
              {status === "error" && (
                <p className="text-red-400 text-xs text-center">Something went wrong. Try again.</p>
              )}
            </form>

            <button
              onClick={dismiss}
              className="block mx-auto mt-3 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              No thanks
            </button>
          </>
        )}
      </div>
    </div>
  );
}
