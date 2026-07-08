import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Capture Engine",
  description: "Internal event registration, count tracking, check-in, and external sync."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
