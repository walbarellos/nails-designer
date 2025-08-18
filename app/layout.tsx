// app/layout.tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-sans",
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: dark)", color: "#0f1215" },
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    ],
};

const metadataBase =
process.env.NEXT_PUBLIC_SITE_URL
? new URL(process.env.NEXT_PUBLIC_SITE_URL)
: process.env.VERCEL_URL
? new URL(`https://${process.env.VERCEL_URL}`)
: new URL("http://localhost:3000");

export const metadata: Metadata = {
    metadataBase, // ✅ resolve URLs absolutas (OG/Twitter/etc.)
    title: {
        default: "Agenda — Vânia Maria",
            template: "%s · Agenda — Vânia Maria",
    },
    description:
    "Agenda simples e auditável para confirmação de horários (30 dias) com envio por WhatsApp.",
    applicationName: "Agenda Vânia Maria",
    icons: {
        icon: [
            { url: "/favicon.ico" },
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/icon-192.png" }],
    },
    manifest: "/manifest.webmanifest",
    // ❌ NÃO declare themeColor aqui (já está no viewport)
    openGraph: {
        title: "Agenda — Vânia Maria",
        description:
        "Confirmação de agendamentos com horário e protocolo. Simples, claro e confiável.",
        images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
        type: "website",
    },
    twitter: {
        card: "summary",
        title: "Agenda — Vânia Maria",
        description:
        "Confirmação de agendamentos com horário e protocolo. Simples, claro e confiável.",
        images: ["/icons/icon-512.png"],
    },
    robots: { index: true, follow: true },
    other: {
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "black-translucent",
        "format-detection": "telephone=no, email=no, address=no",
    },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
        <body
        className={[
            inter.variable,
            "font-sans",
            "bg-[#0f1215] text-white antialiased",
            "min-h-screen",
            "selection:bg-white/10 selection:text-white",
            "scroll-smooth",
        ].join(" ")}
        >
        {children}
        <Script id="pwa-sw" strategy="afterInteractive">
        {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }`}
        </Script>
        </body>
        </html>
    );
}
