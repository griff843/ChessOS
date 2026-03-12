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
        <main className="ml-56 min-h-screen px-8 py-6">{children}</main>
      </body>
    </html>
  );
}
