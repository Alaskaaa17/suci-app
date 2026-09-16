import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Amiri } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegistration } from "@/components/service-worker";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Suci",
  description:
    "Pelacak siklus haid berbasis fiqih thaharah empat mazhab, dengan jadwal ibadah harian.",
  applicationName: "Suci",
  // iOS ignores the manifest for these; they are what makes an installed app
  // open without Safari's chrome.
  appleWebApp: {
    capable: true,
    title: "Suci",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  // A cycle tracker has no business in search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#211316" },
  ],
};

/**
 * Resolves the theme before first paint. Without this the app flashes light
 * on a dark-mode device, which is exactly the moment someone is most likely
 * to be reading this in bed.
 */
const themeScript = `(function(){try{var s=localStorage.getItem("suci.theme");var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${jakarta.variable} ${amiri.variable}`}>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
