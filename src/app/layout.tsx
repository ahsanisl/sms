import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/lib/auth/session-context";
import { AppDataProvider } from "@/lib/store/app-data-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "EduFlow — School Management",
  description:
    "EduFlow is a school management platform for private school groups — students, teachers, attendance, fees, exams and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <SessionProvider>
          <AppDataProvider>{children}</AppDataProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
