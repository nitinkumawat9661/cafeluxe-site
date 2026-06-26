import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

function getConnectSources() {
  const sources = new Set(["'self'", "https://api.telegram.org"]);
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;

  if (endpoint) {
    try {
      const url = new URL(endpoint);
      sources.add(url.origin);
      if (url.protocol === "https:") {
        sources.add(`wss://${url.host}`);
      }
      if (url.protocol === "http:") {
        sources.add(`ws://${url.host}`);
      }
    } catch {
      // Ignore malformed Appwrite endpoint at build time.
    }
  }

  sources.add("https://cloud.appwrite.io");
  sources.add("wss://cloud.appwrite.io");
  return `connect-src ${Array.from(sources).join(" ")}`;
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  getConnectSources(),
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
