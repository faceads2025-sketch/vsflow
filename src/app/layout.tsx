import type { Metadata } from "next";
import "./globals.css";
import "reactflow/dist/style.css";

export const metadata: Metadata = {
  title: "VS Flow — Automação de WhatsApp",
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
        {/* aplica o tema salvo antes de renderizar (evita piscar) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('cf-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
