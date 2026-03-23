"use client";

import { useState } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";

type FeedbackType = "bug" | "feature" | "general";

export default function FeedbackForm() {
  const { t } = useTranslation();
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError(false);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "bug" ? "Bug report" : type === "feature" ? "Feature request" : "General feedback",
          message: message.trim(),
          email: email.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e5e0] shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-8 text-center">
        <p className="text-[22px] text-[#111] mb-2" style={{ fontFamily: "Georgia, serif" }}>
          {t("feedback.thankYou")}
        </p>
        <p className="text-[14px] text-[#777]">{t("feedback.thankYouDesc")}</p>
      </div>
    );
  }

  const types: { key: FeedbackType; label: string }[] = [
    { key: "bug", label: t("feedback.typeBug") },
    { key: "feature", label: t("feedback.typeFeature") },
    { key: "general", label: t("feedback.typeGeneral") },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#e8e5e0] shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-6 sm:p-8"
    >
      {/* Type toggle */}
      <label className="block text-[13px] font-semibold text-[#111] mb-2">
        {t("feedback.typeLabel")}
      </label>
      <div className="flex gap-2 mb-6">
        {types.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className={`text-[13px] px-4 py-2 rounded-lg border transition-colors ${
              type === key
                ? "bg-[#111] text-white border-[#333] font-semibold"
                : "bg-transparent text-[#777] border-[#ddd] hover:border-[#bbb]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Message */}
      <label className="block text-[13px] font-semibold text-[#111] mb-2">
        {t("feedback.messageLabel")}
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("feedback.messagePlaceholder")}
        required
        rows={5}
        className="w-full text-[14px] text-[#111] bg-[#faf9f7] border border-[#e5e5e5] rounded-lg p-3 focus:outline-none focus:border-[#c8942a] transition-colors resize-none placeholder-[#aaa] mb-6"
      />

      {/* Email */}
      <label className="block text-[13px] font-semibold text-[#111] mb-1">
        {t("feedback.emailLabel")}
      </label>
      <p className="text-[12px] text-[#999] mb-2">{t("feedback.emailHint")}</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full h-11 text-[14px] text-[#111] bg-[#faf9f7] border border-[#e5e5e5] rounded-lg px-3 focus:outline-none focus:border-[#c8942a] transition-colors placeholder-[#aaa] mb-6"
      />

      {/* Submit */}
      <div className="flex flex-col items-end gap-2">
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="bg-[#c8942a] text-white text-[14px] font-semibold px-6 py-3 rounded-lg hover:bg-[#b5852a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? t("feedback.sending") : t("feedback.submit")}
        </button>
        <p className="text-[12px] text-[#999]">{t("feedback.note")}</p>
      </div>

      {error && (
        <p className="text-[13px] text-red-600 mt-3">{t("feedback.error")}</p>
      )}
    </form>
  );
}
