import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess OS",
  description: "Single-user world-class chess improvement system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <Sidebar />
        <CommandPalette />
        <main className="min-h-screen py-6 pl-14 pr-4 lg:ml-56 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
