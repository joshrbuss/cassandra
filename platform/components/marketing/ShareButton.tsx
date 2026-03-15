"use client";

interface ShareButtonProps {
  /** The tweet text (without URL) */
  text: string;
  /** The URL to share — defaults to current page */
  url?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ShareButton({
  text,
  url,
  className = "",
  children = "Share on X",
}: ShareButtonProps) {
  function handleShare() {
    const shareUrl =
      url ??
      (typeof window !== "undefined" ? window.location.href : "");

    const tweetUrl =
      "https://twitter.com/intent/tweet" +
      "?text=" +
      encodeURIComponent(text) +
      "&url=" +
      encodeURIComponent(shareUrl);

    window.open(tweetUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  }

  return (
    <button
      onClick={handleShare}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
      }
    >
      {children}
    </button>
  );
}
