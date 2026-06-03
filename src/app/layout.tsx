import type { Metadata } from "next";
import "./globals.css";
import "reactflow/dist/style.css";

export const metadata: Metadata = {
  title: "ConversaFlow — Automação de WhatsApp",
  description: "SaaS de automação de atendimento e fluxos para WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
