import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/react";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Hatian", template: "%s · Hatian" },
  description:
    "Split shared expenses with friends, housemates and trip groups. Real-time balances and settle-up with the fewest payments.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#15140F" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${plexMono.variable} h-full`}
      // next-themes sets the theme class before React hydrates.
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
