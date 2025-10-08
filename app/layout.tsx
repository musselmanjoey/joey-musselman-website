import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Joey Musselman | FSU Flying High Circus",
  description: "Experience the incredible circus performances of Joey Musselman, featuring juggling, trapeze, Russian bar, teeter board, and more from the FSU Flying High Circus.",
  keywords: "Joey Musselman, FSU Flying High Circus, circus performer, juggling, trapeze, Russian bar, acrobatics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${notoSans.variable} ${notoSerif.variable} antialiased font-sans`}
      >
        <Navigation />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
