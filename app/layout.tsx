import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const hosted = process.env.GEM_HOSTED === "1";
  const requestHeaders = hosted ? null : await headers();
  const host = requestHeaders?.get("x-forwarded-host") ?? requestHeaders?.get("host") ?? "localhost:3001";
  const protocol = requestHeaders?.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = hosted ? "https://halo.tail34c017.ts.net:8443" : `${protocol}://${host}`;
  const base = hosted ? "/gem-automata" : "";
  const description = "Gather, refine, automate, defend, and overwhelm a rival machine intelligence.";

  return {
    metadataBase: new URL(origin),
    title: "GEM — Automata Duel",
    description,
    icons: { icon: `${base}/favicon.svg`, shortcut: `${base}/favicon.svg` },
    openGraph: {
      title: "GEM — Automata Duel",
      description,
      type: "website",
      images: [{ url: `${origin}${base}/og.png`, width: 1728, height: 910, alt: "GEM Automata Duel — cyan and red machines battle over a golden gem" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "GEM — Automata Duel",
      description,
      images: [`${origin}${base}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="gem-document">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
