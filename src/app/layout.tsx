import type { Metadata } from "next";
// import { Inter, JetBrains_Mono } from "next/font/google"; // Temporairement désactivé
import "./globals.css";
import { Providers } from "@/components/providers";
import { FontFallbackDetector } from "@/components/ui/font-fallback-detector";

// Forcer le rendu dynamique pour toute l'application
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Configuration temporaire avec polices système uniquement
const systemFonts = {
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', 'Courier New', monospace"
};

export const metadata: Metadata = {
  title: "Système de Gestion de Bibliothèque de l'Université des Montagnes",
  description: "Plateforme moderne de gestion documentaire pour l'excellence académique de l'Université des Montagnes",
  keywords: ["bibliothèque", "gestion", "livres", "thèses", "emprunts", "université des montagnes", "udm", "cameroun"],
  authors: [{ name: "Université des Montagnes" }],
  creator: "Université des Montagnes",
  publisher: "Université des Montagnes",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-gradient-to-br from-gray-50 to-green-50 dark:from-gray-900 dark:to-gray-800 font-sans overflow-x-hidden text-gray-900 dark:text-gray-100"
        style={{ fontFamily: systemFonts.sans }}
      >
        <FontFallbackDetector>
          <Providers>
            {children}
          </Providers>
        </FontFallbackDetector>
      </body>
    </html>
  );
}
