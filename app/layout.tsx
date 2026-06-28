import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

const display = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://no-scalp.vercel.app"),
  title: "NoScalp · Drops decided fairly",
  description:
    "Limited drops, minus the bots. Every release is a random draw: one entry per real person, winners picked fairly, never oversold.",
  openGraph: {
    title: "NoScalp · Drops decided fairly",
    description:
      "A provably-fair drops platform on Amazon Aurora DSQL. One entry per real person, winners drawn at random, never oversold.",
    siteName: "NoScalp",
    type: "website",
    url: "https://no-scalp.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "NoScalp · Drops decided fairly",
    description: "A provably-fair drops platform on Amazon Aurora DSQL. Won by fans, not bots.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
