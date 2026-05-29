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
  alternates: { canonical: "/" },
  openGraph: {
    title: "CafeLuxe | QR Ordering & Restaurant POS Software",
    description:
      "Launch QR ordering, digital menus, KOT billing, staff operations, and restaurant POS workflows with CafeLuxe.",
    url: "https://cafeluxesite.in",
    siteName: "CafeLuxe",
    type: "website",
    images: [
      {
        url: "/luxury/cafeluxe-og-banner.png?v=1",
        width: 1200,
        height: 630,
        alt: "CafeLuxe QR ordering and restaurant POS software preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CafeLuxe | QR Ordering & Restaurant POS Software",
    description:
      "QR ordering, digital menu, KOT billing, staff app and restaurant POS workflows with CafeLuxe.",
    images: ["/luxury/cafeluxe-og-banner.png?v=1"],
  },
  robots: { index: true, follow: true },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "CafeLuxe",
    url: "https://cafeluxesite.in",
    email: "nitinkumawat985@gmail.com",
    telephone: "+91-7414853321",
    founder: { "@type": "Person", name: "Nitin Kumawat" },
    areaServed: {
      "@type": "Country",
      name: "India"
    },
    serviceType: [
      "Restaurant QR Ordering Software",
      "Restaurant POS Software",
      "KOT Billing Software",
      "Digital Menu Software",
      "Restaurant Staff App"
    ],
    description:
      "CafeLuxe provides QR ordering, digital menu, POS workflow, KOT billing and staff app solutions for restaurants, cafes and cloud kitchens."
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CafeLuxe",
    url: "https://cafeluxesite.in",
    email: "nitinkumawat985@gmail.com",
    telephone: "+91-7414853321",
    founder: { "@type": "Person", name: "Nitin Kumawat" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CafeLuxe",
    url: "https://cafeluxesite.in",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CafeLuxe",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    description:
      "Restaurant QR ordering, digital menu, POS workflow, KOT billing, staff app and business records software.",
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-brand-bg antialiased">
      <body className="min-h-full bg-brand-bg text-brand-dark flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}