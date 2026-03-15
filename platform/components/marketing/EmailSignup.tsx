"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

interface EmailSignupProps {
  source: string;
  headline?: string;
  cta?: string;
}

export default function EmailSignup({
  source,
  headline,
  cta,
}: EmailSignupProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const resolvedHeadline = headline ?? t("email.headline");
  const resolvedCta = cta ?? t("email.cta");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setErrorMsg(data.error ?? t("email.error.generic"));
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg(t("email.error.network"));
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-center">
        <p className="text-blue-800 font-semibold text-sm">{t("email.success.title")}</p>
        <p className="text-blue-600 text-xs mt-1">
          {t("email.success.body", { email })}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      {resolvedHeadline && (
        <p className="text-sm font-semibold text-gray-800 mb-3">{resolvedHeadline}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("email.placeholder")}
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-blue-600 text-white font-semibold px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {status === "loading" ? t("email.sending") : resolvedCta}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-red-600 mt-2">{errorMsg}</p>
      )}
    </div>
  );
}
