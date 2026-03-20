import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cassandra — Train smarter. Chess On.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0e0e0e",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Crown / chess icon */}
        <div
          style={{
            fontSize: 72,
            marginBottom: 24,
          }}
        >
          ♛
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#c8942a",
            letterSpacing: -1,
          }}
        >
          Cassandra
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#999",
            marginTop: 16,
          }}
        >
          Train smarter. Chess On.
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: "#666",
            marginTop: 32,
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Personalised chess puzzles from your own games
        </div>
      </div>
    ),
    { ...size },
  );
}
