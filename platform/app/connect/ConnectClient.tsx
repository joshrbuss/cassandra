"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

interface Props {
  refCode: string | null;
  prefillUsername?: string | null;
  prefillPlatform?: "chesscom" | "lichess" | null;
}

export default function ConnectClient({ refCode, prefillUsername, prefillPlatform }: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"chesscom" | "lichess" | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Auto-submit when prefilled from homepage hero form
  useEffect(() => {
    if (prefillUsername && prefillPlatform && !autoSubmitted) {
      setAutoSubmitted(true);
      handleConnect(prefillPlatform, prefillUsername);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect(platform: "chesscom" | "lichess", username: string) {
    setError(null);
    setPending(platform);

    const endpoint = platform === "chesscom" ? "/api/auth/chesscom" : "/api/auth/lichess-username";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, ...(refCode ? { ref: refCode } : {}) }),
      });
      const data = (await res.json()) as { userId?: string; isReturning?: boolean; error?: string };

      if (!res.ok || !data.userId) {
        setError(data.error ?? t("connect.error"));
        setPending(null);
        return;
      }

      // Returning users go straight to /home; new users go to /analysing
      const dest = data.isReturning ? "/home" : "/analysing";
      await signIn("credentials", { userId: data.userId, callbackUrl: dest });
    } catch {
      setError(t("connect.error"));
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Chess.com — on top with "Most popular" badge */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            C
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Chess.com</p>
              <span className="text-[9px] font-bold text-[#c8942a] bg-[#c8942a]/10 border border-[#c8942a]/30 px-1.5 py-0.5 rounded-full uppercase">
                {t("connect.mostPopular")}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{t("connect.chesscomSubtitle")}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const username = (e.currentTarget.elements.namedItem("cc_username") as HTMLInputElement).value.trim();
            if (username) handleConnect("chesscom", username);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name="cc_username"
            placeholder={t("connect.chesscomPlaceholder")}
            autoComplete="off"
            required
            className="flex-1 text-sm text-white bg-[#0e0e0e] border border-[#333] rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-[#c8942a] transition-colors"
          />
          <button
            type="submit"
            disabled={pending !== null}
            className="text-sm font-semibold bg-[#c8942a] text-white px-5 py-2 rounded-lg hover:bg-[#b5852a] disabled:opacity-50 transition-colors"
          >
            {pending === "chesscom" ? t("connect.connecting") : t("connect.connect")}
          </button>
        </form>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-xs text-gray-600">{t("connect.or")}</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {/* Lichess */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black text-sm font-bold shrink-0">
            L
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Lichess</p>
            <p className="text-xs text-gray-500 mt-0.5">{t("connect.lichessSubtitle")}</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const username = (e.currentTarget.elements.namedItem("li_username") as HTMLInputElement).value.trim();
            if (username) handleConnect("lichess", username);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name="li_username"
            placeholder={t("connect.lichessPlaceholder")}
            autoComplete="off"
            required
            className="flex-1 text-sm text-white bg-[#0e0e0e] border border-[#333] rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-[#c8942a] transition-colors"
          />
          <button
            type="submit"
            disabled={pending !== null}
            className="text-sm font-semibold bg-white text-black px-5 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {pending === "lichess" ? t("connect.connecting") : t("connect.connect")}
          </button>
        </form>
      </div>

      {error && (
        <p className="text-xs text-red-400 text-center mt-2">{error}</p>
      )}
    </div>
  );
}
