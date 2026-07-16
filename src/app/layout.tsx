import type { Metadata } from "next";
import "@fontsource-variable/inter";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StudyFlow",
    template: "%s · StudyFlow",
  },
  description: "A calm student productivity and academic management workspace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
