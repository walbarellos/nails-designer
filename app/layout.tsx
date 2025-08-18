import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
    title: 'Agenda Nails – Controle Rápido',
    description: 'Landing simples para controle de agendamentos (30 dias) com WhatsApp.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
        <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#111316" />
        </head>
        <body>
        {children}
        <Script id="pwa-sw" strategy="afterInteractive">{
            `if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(()=>{});
                });
            }`
        }</Script>
        </body>
        </html>
    )
}
