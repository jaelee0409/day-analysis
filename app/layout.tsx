import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { AppShell } from "@/components/ui/AppShell";
import { SettingsProvider } from "@/lib/settings-context";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Day Analysis",
  description: "Record what you actually did with your day, then read it back as measurement.",
};

export const viewport: Viewport = {
  themeColor: "#f5f6f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <SettingsProvider>
          <AppShell>{children}</AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
