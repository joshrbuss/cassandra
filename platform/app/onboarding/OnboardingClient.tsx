"use client";

import { useActionState } from "react";
import {
  connectLichessUsername,
  connectChessComUsername,
  type ConnectState,
} from "@/app/actions/auth";

interface Props {
  lichessUsername: string | null;
  chessComUsername: string | null;
}

export default function OnboardingClient({ lichessUsername, chessComUsername }: Props) {
  const [lichessState, lichessAction, lichessPending] = useActionState<ConnectState, FormData>(
    connectLichessUsername,
    null
  );
  const [ccState, ccAction, ccPending] = useActionState<ConnectState, FormData>(
    connectChessComUsername,
    null
  );

  const hasLinked = !!(lichessUsername || chessComUsername);

  return (
    <div className="space-y-4">
      {/* Lichess */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Lichess</p>
            {lichessUsername ? (
              <p className="text-xs text-gray-500">
                Connected as{" "}
                <a
                  href={`https://lichess.org/@/${lichessUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {lichessUsername}
                </a>
              </p>
            ) : (
              <p className="text-xs text-gray-400">Enter your username</p>
            )}
          </div>
          {lichessUsername && (
            <span className="ml-auto text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              Connected ✓
            </span>
          )}
        </div>

        {!lichessUsername && (
          <form action={lichessAction} className="flex gap-2">
            <input type="hidden" name="callbackUrl" value="/onboarding" />
            <input
              type="text"
              name="username"
              placeholder="Your Lichess username"
              autoComplete="off"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={lichessPending}
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {lichessPending ? "Checking…" : "Connect"}
            </button>
          </form>
        )}

        {lichessState?.error && (
          <p className="text-xs text-red-600 mt-2">{lichessState.error}</p>
        )}
      </div>

      {/* Chess.com */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Chess.com</p>
            {chessComUsername ? (
              <p className="text-xs text-gray-500">
                Connected as{" "}
                <a
                  href={`https://www.chess.com/member/${chessComUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {chessComUsername}
                </a>
              </p>
            ) : (
              <p className="text-xs text-gray-400">Optional — enter your username</p>
            )}
          </div>
          {chessComUsername && (
            <span className="ml-auto text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              Connected ✓
            </span>
          )}
        </div>

        {!chessComUsername && (
          <form action={ccAction} className="flex gap-2">
            <input type="hidden" name="callbackUrl" value="/onboarding" />
            <input
              type="text"
              name="username"
              placeholder="Your Chess.com username"
              autoComplete="off"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              disabled={ccPending}
              className="text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {ccPending ? "Checking…" : "Connect"}
            </button>
          </form>
        )}

        {ccState?.error && (
          <p className="text-xs text-red-600 mt-2">{ccState.error}</p>
        )}
      </div>

      {/* Continue */}
      <a
        href="/dashboard"
        className={`flex items-center justify-center w-full h-12 rounded-full font-semibold transition-colors ${
          hasLinked
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-400 pointer-events-none"
        }`}
        aria-disabled={!hasLinked}
      >
        Continue to my puzzles →
      </a>

      {!hasLinked && (
        <p className="text-center text-xs text-gray-400">
          Connect at least one account to continue.
        </p>
      )}

      {hasLinked && (
        <p className="text-center text-xs text-gray-400 pt-2">
          <a href="/api/auth/signout" className="hover:underline">
            Sign out
          </a>
        </p>
      )}
    </div>
  );
}
