import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nanu Da Dhaba QR Ordering",
  description: "QR ordering for Nanu Da Dhaba.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-brand-bg antialiased"
    >
      <body className="min-h-full bg-brand-bg text-brand-dark flex flex-col">
        {children}
      </body>
    </html>
  );
}
