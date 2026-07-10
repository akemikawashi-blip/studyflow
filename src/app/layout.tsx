import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StudyFlow",
    template: "%s · StudyFlow",
  },
  description:
    "A private student productivity workspace for courses, tasks, study sessions, notes, skills, and finances.",
  applicationName: "StudyFlow",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StudyFlow",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8fd" },
    { media: "(prefers-color-scheme: dark)", color: "#141318" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
