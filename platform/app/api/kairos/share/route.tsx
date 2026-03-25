import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const headline = searchParams.get("headline") ?? "Find your chess habits";
  const number = searchParams.get("number") ?? "";
  const stat = searchParams.get("stat") ?? "";

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
          padding: "60px",
        }}
      >
        {/* Kairos wordmark */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            fontSize: 20,
            color: "#c8942a",
            fontWeight: 600,
            letterSpacing: 2,
          }}
        >
          KAIROS
        </div>

        {/* Big number */}
        {number && (
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#c8942a",
              letterSpacing: -2,
              marginBottom: 16,
            }}
          >
            {number}
          </div>
        )}

        {/* Headline insight */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#ededed",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          {headline}
        </div>

        {/* Stat */}
        {stat && (
          <div
            style={{
              fontSize: 20,
              color: "#888",
              marginTop: 20,
              textAlign: "center",
              maxWidth: 800,
            }}
          >
            {stat}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 18, color: "#666" }}>
            cassandrachess.com/kairos
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#555",
              borderLeft: "1px solid #333",
              paddingLeft: 16,
            }}
          >
            Find your chess habits
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
