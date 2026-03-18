"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/components/i18n/LocaleProvider";
import { extractBlundersFromPgn } from "@/lib/chess-client/extractBlundersFromPgn";
import { terminateEngine } from "@/lib/chess-client/stockfishBrowser";

interface Props {
  lastSyncedAt: string | null;
  /** True if user has never had puzzles imported before */
  isFirstSync?: boolean;
  /** Chess.com or Lichess username for puzzle extraction */
  username?: string | null;
}

function formatTimeAgo(isoString: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 1 ? t("sync.justNow") : t("sync.minutesAgo", { count: mins });
  }
  return hours === 1 ? t("sync.oneHourAgo") : t("sync.hoursAgo", { count: hours });
}

export default function SyncButton({ lastSyncedAt, isFirstSync = false, username }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "loading" | "result">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"success" | "error">("success");
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clean up timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  async function handleSync() {
    setStatus("loading");
    setResultMessage(null);
    try {
      // Phase 1: fetch and queue games
      const res = await fetch("/api/users/me/import", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        gamesQueued?: number;
        gamesTotal?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setResultMessage(t("sync.failed"));
        setResultType("error");
        setStatus("result");
        timerRef.current = setTimeout(() => { setStatus("idle"); setResultMessage(null); }, 5000);
        return;
      }

      const totalGames = data.gamesTotal ?? data.gamesQueued ?? 0;
      if (totalGames === 0) {
        setResultMessage(t("sync.upToDate"));
        setResultType("success");
        setSyncedAt(new Date().toISOString());
        setStatus("result");
        timerRef.current = setTimeout(() => { setStatus("idle"); setResultMessage(null); }, 5000);
        return;
      }

      // Phase 2: analyse games client-side with browser Stockfish
      setResultMessage(t("sync.syncing"));
      let totalPuzzles = 0;
      let gamesAnalysed = 0;
      const playerName = username ?? "";

      while (true) {
        // Get next pending game from server
        const analyseRes = await fetch("/api/puzzles/analyse-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            gamesAnalysed > 0
              ? { gameId: null } // just pick next (previous already marked done below)
              : {}
          ),
        });
        const gameData = (await analyseRes.json()) as {
          done: boolean;
          gameId: string | null;
          pgn: string | null;
          platform: string | null;
          remaining: number;
        };

        if (gameData.done || !gameData.gameId || !gameData.pgn) break;

        // Analyse the PGN client-side
        let puzzlesFromGame = 0;
        try {
          const puzzles = await extractBlundersFromPgn(gameData.pgn, playerName);
          if (puzzles.length > 0) {
            // Save puzzles via import API
            const importRes = await fetch("/api/puzzles/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ puzzles }),
            });
            if (importRes.ok) {
              const importData = await importRes.json();
              puzzlesFromGame = importData.imported ?? 0;
            }
          }
        } catch (err) {
          console.error(`[sync] Game ${gameData.gameId} analysis failed:`, err);
        }

        // Mark game as done on server
        await fetch("/api/puzzles/analyse-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: gameData.gameId,
            puzzlesFound: puzzlesFromGame,
          }),
        }).catch(() => {});

        gamesAnalysed++;
        totalPuzzles += puzzlesFromGame;
        setResultMessage(`${gamesAnalysed}/${totalGames} games... ${totalPuzzles} puzzles`);
      }

      terminateEngine();

      // Show final result
      if (totalPuzzles > 0 && isFirstSync) {
        setResultMessage(t("sync.firstSync", { puzzles: totalPuzzles, games: gamesAnalysed }));
      } else if (totalPuzzles > 0) {
        setResultMessage(t("sync.newFound", { puzzles: totalPuzzles, games: gamesAnalysed }));
      } else {
        setResultMessage(t("sync.noBlunders", { games: gamesAnalysed }));
      }
      setResultType("success");
      setSyncedAt(new Date().toISOString());
    } catch {
      setResultMessage(t("sync.failed"));
      setResultType("error");
    }
    setStatus("result");
    timerRef.current = setTimeout(() => {
      setStatus("idle");
      setResultMessage(null);
    }, 5000);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {/* Last synced timestamp */}
      {syncedAt && status !== "loading" && (
        <p className="text-xs text-[#666]">
          {t("sync.lastSynced", { time: formatTimeAgo(syncedAt, t) })}
        </p>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <p className="text-xs text-[#c8942a] font-medium animate-pulse">
          {resultMessage ?? t("sync.syncing")}
        </p>
      )}

      {/* Result message */}
      {status === "result" && resultMessage && (
        <p className={`text-xs font-medium ${resultType === "error" ? "text-red-500" : "text-[#c8942a]"}`}>
          {resultMessage}
        </p>
      )}

      {/* Sync button — always visible when not loading */}
      {status !== "loading" && (
        <button
          onClick={handleSync}
          className="text-xs font-medium text-[#c8942a] border border-[#c8942a]/40 px-3 py-1 rounded-full hover:bg-[#c8942a]/10 transition-colors"
        >
          {t("sync.syncNow")}
        </button>
      )}
    </div>
  );
}
