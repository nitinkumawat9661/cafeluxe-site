import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://cafeluxesite.in";
const ogImage = "/luxury/cafeluxe-og-logoonly.png?v=6";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "CafeLuxe",
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
    "restaurant staff app",
    "restaurant technology India",
    "cloud kitchen order management",
  ],
  authors: [{ name: "CafeLuxe" }],
  creator: "CafeLuxe",
  publisher: "CafeLuxe",
  category: "Restaurant Software",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CafeLuxe | QR Ordering & Restaurant POS Software",
    description:
      "Launch QR ordering, digital menus, KOT billing, staff operations, and restaurant POS workflows with CafeLuxe.",
    url: siteUrl,
    siteName: "CafeLuxe",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "CafeLuxe QR ordering and restaurant POS software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CafeLuxe | QR Ordering & Restaurant POS Software",
    description:
      "QR ordering, digital menu, KOT billing, staff app and restaurant POS workflows with CafeLuxe.",
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "CafeLuxe",
      url: siteUrl,
      email: "nitinkumawat985@gmail.com",
      telephone: "+91-7414853321",
      founder: { "@type": "Person", name: "Nitin Kumawat" },
      areaServed: { "@type": "Country", name: "India" },
      logo: `${siteUrl}/luxury/cafeluxe-og-logoonly.png?v=6`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "CafeLuxe",
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en-IN",
      potentialAction: {
        "@type": "ContactAction",
        target: `${siteUrl}/contact`,
        name: "Request a CafeLuxe demo",
      },
    },
    {
      "@type": "ProfessionalService",
      "@id": `${siteUrl}/#service`,
      name: "CafeLuxe Restaurant Software",
      url: siteUrl,
      provider: { "@id": `${siteUrl}/#organization` },
      areaServed: { "@type": "Country", name: "India" },
      serviceType: [
        "Restaurant QR Ordering Software",
        "Restaurant POS Software",
        "KOT Billing Software",
        "Digital Menu Software",
        "Restaurant Staff App",
        "Restaurant Technology Setup",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "restaurants, cafes, cloud kitchens and food businesses",
      },
      description:
        "CafeLuxe provides QR ordering, digital menu, POS workflow, KOT billing and staff app solutions for restaurants, cafes and cloud kitchens.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "CafeLuxe",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android",
      publisher: { "@id": `${siteUrl}/#organization` },
      featureList: [
        "QR table ordering",
        "Digital menu",
        "Restaurant POS workflow",
        "KOT billing",
        "Staff Android app",
        "Payment status tracking",
        "Business records",
      ],
      description:
        "Restaurant QR ordering, digital menu, POS workflow, KOT billing, staff app and business records software.",
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/contact`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className="h-full bg-brand-bg antialiased">
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
