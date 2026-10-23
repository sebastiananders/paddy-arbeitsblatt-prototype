import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* Self-hosted Poppins (paddy design system font). */
const poppins = localFont({
  variable: "--font-poppins",
  src: [
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: "600" },
  ],
});

export const metadata: Metadata = {
  title: "paddy · Arbeitsblatt-Prototyp",
  description: "Prototyp: Arbeitsblatt aus Magic Chat als Word-Datei, mit Streaming und Vorschau.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
