import type { NextConfig } from "next";

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "";
let appwriteOrigin = "";
try {
  appwriteOrigin = appwriteEndpoint ? new URL(appwriteEndpoint).origin : "";
} catch {
  appwriteOrigin = "";
}

const connectSrcParts = ["'self'"];
if (appwriteOrigin) {
  connectSrcParts.push(appwriteOrigin);
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `connect-src ${connectSrcParts.join(" ")}`,
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
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
