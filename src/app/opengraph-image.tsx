import { ImageResponse } from "next/og";

export const alt = "PinoyBH: a community marketplace and job board for Filipinos in Bahrain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview picture used when a page without its own photo is shared. */
export default function OpengraphImage() {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#13286b", color: "#fff", position: "relative", fontFamily: "sans-serif" }}>
        <svg width="560" height="560" viewBox="0 0 100 100" style={{ position: "absolute", right: -90, top: -60 }}>
          {rays.map((a) => (
            <polygon key={a} points="50,2 46.5,24 53.5,24" fill="#f6c343" transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="20" fill="#f6c343" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", width: 820 }}>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 800, letterSpacing: -2 }}>
            Pinoy<span style={{ color: "#ff4d5e" }}>BH</span>
          </div>
          <div style={{ fontSize: 40, marginTop: 24, lineHeight: 1.3, color: "#e8ecf8" }}>
            Marketplace, jobs and events for Filipinos in Bahrain
          </div>
          <div style={{ fontSize: 30, marginTop: 40, color: "#f6c343", fontWeight: 700 }}>pinoybh.com</div>
        </div>
      </div>
    ),
    size,
  );
}
