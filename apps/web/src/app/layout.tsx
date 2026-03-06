import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chess OS",
  description: "Single-user world-class chess improvement system"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
