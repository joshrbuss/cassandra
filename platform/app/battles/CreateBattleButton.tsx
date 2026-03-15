"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateBattleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battles", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create battle");
        return;
      }
      const battle = await res.json();
      router.push(`/battles/${battle.id}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCreate}
        disabled={loading}
        className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
      >
        {loading ? "Creating…" : "⚔️ Create Battle"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
