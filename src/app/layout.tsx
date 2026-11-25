import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/newsreader";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Atlas Acadêmico",
    template: "%s · Atlas Acadêmico",
  },
  description: "Sistema pessoal de organização acadêmica: caderno digital, disciplinas, provas e estudos.",
  applicationName: "Atlas Acadêmico",
  appleWebApp: { capable: true, title: "Atlas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#10151d" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
