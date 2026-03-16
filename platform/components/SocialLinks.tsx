/**
 * Social links row — used in homepage and dashboard footers.
 * Accepts a variant for light vs dark background styling.
 */

interface SocialLinksProps {
  variant?: "light" | "dark";
}

const links = [
  { href: "https://www.chess.com/member/j_r_b_01", label: "Play me on Chess.com" },
  { href: "mailto:josh@cassandrachess.com", label: "Contact" },
  { href: "https://www.instagram.com/behaviourbydesign", label: "Instagram" },
  { href: "https://www.tiktok.com/@cassandra_chess", label: "TikTok" },
  { href: "https://x.com/joshrbuss", label: "X" },
];

export default function SocialLinks({ variant = "light" }: SocialLinksProps) {
  const textColor = variant === "dark" ? "text-[#c8942a]/70 hover:text-[#c8942a]" : "text-[#c8942a]/70 hover:text-[#c8942a]";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target={link.href.startsWith("mailto:") ? undefined : "_blank"}
          rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
          className={`text-xs transition-colors ${textColor}`}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
