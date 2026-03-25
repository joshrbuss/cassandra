import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kairos — How do you actually think at the board?";
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
        <div
          style={{
            fontSize: 20,
            color: "#c8942a",
            fontWeight: 600,
            letterSpacing: 4,
            marginBottom: 32,
          }}
        >
          KAIROS
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#ededed",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.2,
          }}
        >
          How do you actually think at the board?
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#888",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 600,
          }}
        >
          20 positions. 10 minutes. No account needed.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 16,
            color: "#555",
          }}
        >
          cassandrachess.com/kairos
        </div>
      </div>
    ),
    { ...size },
  );
}
