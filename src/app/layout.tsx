import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif-display", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: "CareerOS", template: "%s · CareerOS" },
  description: "Your job search, run like an operating system: matched roles, tailored resumes and tracked applications.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
