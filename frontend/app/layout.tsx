
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AppShell from "./components/app-shell";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EnviePro CRM",
    template: "%s | EnviePro CRM",
  },
  description: "Gestão comercial e relacionamento com clientes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
