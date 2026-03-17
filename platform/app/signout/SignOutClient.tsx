"use client";

import { signOut } from "next-auth/react";

export default function SignOutClient() {
  return (
    <div className="space-y-3">
      <button
        onClick={() => signOut({ callbackUrl: "/connect" })}
        className="w-full h-12 rounded-full bg-[#c8942a] text-white font-semibold hover:bg-[#b5852a] transition-colors text-sm"
      >
        Sign out
      </button>
      <a
        href="/home"
        className="block text-center text-gray-500 text-sm hover:text-gray-300 transition-colors"
      >
        Cancel — go back
      </a>
    </div>
  );
}
