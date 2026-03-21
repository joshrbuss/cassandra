"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HeroForm() {
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
          className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors ${
            platform === "chesscom"
              ? "bg-[#111] text-white border-[#333]"
              : "bg-transparent text-[#999] border-[#ddd] hover:border-[#bbb]"
          }`}
        >
          Chess.com
        </button>
        <button
          type="button"
          onClick={() => setPlatform("lichess")}
          className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors ${
            platform === "lichess"
              ? "bg-[#111] text-white border-[#333]"
              : "bg-transparent text-[#999] border-[#ddd] hover:border-[#bbb]"
          }`}
        >
          Lichess
        </button>
      </div>

      {/* Username input + CTA */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={platform === "chesscom" ? "Chess.com username" : "Lichess username"}
          autoComplete="off"
          required
          className="flex-1 text-sm text-[#111] bg-white border border-[#ddd] rounded-lg px-3.5 py-2.5 placeholder-[#aaa] focus:outline-none focus:border-[#c8942a] transition-colors"
        />
        <button
          type="submit"
          className="text-sm font-semibold bg-[#c8942a] text-white px-5 py-2.5 rounded-lg hover:bg-[#b5852a] transition-colors whitespace-nowrap"
        >
          See your mistakes &rarr;
        </button>
      </form>

      {/* Trust row */}
      <div className="flex items-center gap-2 mt-3 text-xs text-[#aaa]">
        <span>Free</span>
        <span className="text-[#c8942a]">&middot;</span>
        <span>Unlimited</span>
        <span className="text-[#c8942a]">&middot;</span>
        <span>No paywall</span>
        <span className="text-[#c8942a]">&middot;</span>
        <span>Personalised</span>
      </div>
    </div>
  );
}
