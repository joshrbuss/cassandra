"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  dark?: boolean;
  ctaLabel: string;
  chesscomPlaceholder: string;
  lichessPlaceholder: string;
  trustFree: string;
  trustUnlimited: string;
  trustNoPaywall: string;
  trustPersonalised: string;
}

export default function HeroForm({
  dark = false,
  ctaLabel,
  chesscomPlaceholder,
  lichessPlaceholder,
  trustFree,
  trustUnlimited,
  trustNoPaywall,
  trustPersonalised,
}: Props) {
  const [platform, setPlatform] = useState<"chesscom" | "lichess">("chesscom");
  const [username, setUsername] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!u) return;
    router.push(`/connect?username=${encodeURIComponent(u)}&platform=${platform}`);
  }

  return (
    <div>
      {/* Platform toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setPlatform("chesscom")}
          className={`text-xs font-semibold px-4 py-1.5 rounded-md border transition-colors ${
            platform === "chesscom"
              ? dark ? "bg-[#c8942a] text-[#0e0e0e] border-[#c8942a]" : "bg-[#111] text-white border-[#333]"
              : dark ? "bg-[#1a1a1a] text-[#888] border-[#333] hover:border-[#555]" : "bg-transparent text-[#999] border-[#ddd] hover:border-[#bbb]"
          }`}
        >
          Chess.com
        </button>
        <button
          type="button"
          onClick={() => setPlatform("lichess")}
          className={`text-xs font-semibold px-4 py-1.5 rounded-md border transition-colors ${
            platform === "lichess"
              ? dark ? "bg-[#c8942a] text-[#0e0e0e] border-[#c8942a]" : "bg-[#111] text-white border-[#333]"
              : dark ? "bg-[#1a1a1a] text-[#888] border-[#333] hover:border-[#555]" : "bg-transparent text-[#999] border-[#ddd] hover:border-[#bbb]"
          }`}
        >
          Lichess
        </button>
      </div>

      {/* Username input + CTA */}
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={platform === "chesscom" ? chesscomPlaceholder : lichessPlaceholder}
          autoComplete="off"
          required
          className={`flex-1 h-12 text-sm rounded-l-lg px-3.5 focus:outline-none focus:border-[#c8942a] transition-colors ${
            dark
              ? "bg-[#1a1a1a] border border-[#333] text-[#eee] placeholder-[#666]"
              : "bg-white border border-[#d0d0d0] text-[#111] placeholder-[#aaa]"
          }`}
        />
        <button
          type="submit"
          className="h-12 text-sm font-semibold bg-[#c8942a] text-white px-5 rounded-r-lg hover:bg-[#b5852a] transition-colors whitespace-nowrap border border-[#c8942a]"
        >
          {ctaLabel}
        </button>
      </form>

      {/* Trust row */}
      <div className={`flex items-center gap-2 mt-3 text-xs ${dark ? "text-[#666]" : "text-[#aaa]"}`}>
        <span>{trustFree}</span>
        <span className="text-[#c8942a]">&middot;</span>
        <span>{trustUnlimited}</span>
        <span className="text-[#c8942a]">&middot;</span>
        <span>{trustNoPaywall}</span>
        <span className="text-[#c8942a]">&middot;</span>
        <span>{trustPersonalised}</span>
      </div>
    </div>
  );
}
