"use client";

import dynamic from "next/dynamic";

const ConnectClient = dynamic(() => import("./ConnectClient"), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 h-[120px] animate-pulse" />
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 h-[120px] animate-pulse" />
    </div>
  ),
});

export default ConnectClient;
