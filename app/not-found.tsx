// app/not-found.tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "O recurso solicitado não foi encontrado.",
  // ❌ não coloque themeColor aqui
};

export const viewport: Viewport = {
  // opcional: se quiser sobrescrever algo apenas para not-found
  // themeColor: "#0f1215",
};

export default function NotFound() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">404 — Não encontrado</h1>
      <p className="mt-2 text-sm text-white/70">
        Verifique o endereço e tente novamente.
      </p>
    </main>
  );
}

