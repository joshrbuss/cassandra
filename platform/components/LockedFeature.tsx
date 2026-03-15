"use client";

import EmailSignup from "@/components/marketing/EmailSignup";

interface Props {
  emoji: string;
  name: string;
  description: string;
  source: string;
}

export default function LockedFeature({ emoji, name, description, source }: Props) {
  return (
    <div className="relative bg-white border border-dashed border-gray-300 rounded-xl overflow-hidden shadow-sm">
      {/* Blur tint overlay behind content */}
      <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] pointer-events-none" />

      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between mb-1">
          <p className="font-semibold text-gray-500">
            {emoji} {name}
          </p>
          <span className="text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full shrink-0 ml-2">
            Coming Soon
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">{description}</p>
        <EmailSignup source={source} headline="" cta="Notify me" />
      </div>
    </div>
  );
}
