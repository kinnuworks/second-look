import type { Metadata } from "next";
import "./foundation.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Look: is this text a scam?",
  description: "Paste a text or email you're not sure about. Second Look checks the link, the sender and the real company's website, then tells you in plain words whether to trust it.",
  icons: { icon: "/icon.png", apple: "/icon.png" },
  metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? "https://second-look-phi.vercel.app"),
  openGraph: {
    title: "Second Look: is this text a scam?",
    description: "Paste a text you're not sure about. Open-weight models through Mozilla's Otari check the link, the sender and the real company's site, then tell you in plain words.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Second Look showing a parcel-fee text marked as very likely a scam, with the reasons" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-accent="amber" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
