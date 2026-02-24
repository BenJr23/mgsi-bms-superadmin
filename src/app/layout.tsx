import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AuthGuard from "./AuthGuard";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Booking Management System",
  description: "Streamline your workspace with Greatwork's Booking Management System. Effortlessly reserve meeting rooms, manage client contracts, and eliminate scheduling conflicts through our centralized, real-time dual-portal platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased text-black`}>
        {/* Layout UI */}
        {/* Place children where you want to render a page or nested layout */}
        <main>
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}
