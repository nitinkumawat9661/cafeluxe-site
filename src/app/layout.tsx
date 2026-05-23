import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cafeluxesite.in"),
  title: {
    default: "CafeLuxe | QR Ordering & Restaurant POS Software",
    template: "%s | CafeLuxe",
  },
  description:
    "CafeLuxe is a QR ordering, restaurant POS, KOT billing, staff app, and digital menu software for cafes, restaurants, cloud kitchens, and food businesses.",
  keywords: [
    "CafeLuxe",
    "QR ordering software",
    "restaurant POS software",
    "KOT billing software",
    "digital menu software",
    "restaurant ordering system",
    "cafe billing software",
    "QR menu for restaurants",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CafeLuxe | QR Ordering & Restaurant POS Software",
    description:
      "Launch QR ordering, digital menus, KOT billing, staff operations, and restaurant POS workflows with CafeLuxe.",
    url: "https://cafeluxesite.in",
    siteName: "CafeLuxe",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-brand-bg antialiased">
      <body className="min-h-full bg-brand-bg text-brand-dark flex flex-col">
        {children}
      </body>
    </html>
  );
}
