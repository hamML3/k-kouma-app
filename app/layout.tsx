import type { Metadata } from "next";
import { Lora, Mulish } from "next/font/google";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "K-Kouma — Soutien psychologique en ligne",
  description:
    "Plateforme de téléconsultation psychologique pour le Mali et la sous-région UEMOA. Consultez un psychologue qualifié par visio, appel ou message.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${lora.variable} ${mulish.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
