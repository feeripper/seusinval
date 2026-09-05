import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Itaú | Governança de dados e IA",
  description: "Privacidade, proteção de dados e riscos de IA com Seu Sinval.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
