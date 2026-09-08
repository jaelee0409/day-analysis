import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, Noto_Sans_KR } from "next/font/google";
import { SignInGate } from "@/components/auth/SignInGate";
import { AppShell } from "@/components/ui/AppShell";
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/locale-context";
import { SettingsProvider } from "@/lib/settings-context";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
});

// Instrument Sans carries no Hangul, so it is listed first and Korean falls
// through to this per glyph. Latin and every numeral stay in Instrument Sans,
// which keeps the figures identical in both languages.
const korean = Noto_Sans_KR({
  // Hangul is this font's primary script and always ships; the subsets list
  // only names the optional extras, and "korean" is not a valid value.
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-korean",
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
    <html lang="en" className={`${sans.variable} ${serif.variable} ${korean.variable}`}>
      <body>
        <LocaleProvider>
          <AuthProvider>
            <SignInGate>
              <SettingsProvider>
                <AppShell>{children}</AppShell>
              </SettingsProvider>
            </SignInGate>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
