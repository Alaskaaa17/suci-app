import type { MetadataRoute } from "next";

/**
 * The web manifest.
 *
 * Suci keeps everything on the device, so installing it to the home screen
 * is not a nicety — it is the shape the product already has. `display:
 * standalone` drops the browser chrome so the design is what the user
 * actually sees.
 *
 * No `orientation` lock: the shell is responsive (phone, tablet, desktop —
 * see components/shell.tsx), so there is nothing left for a portrait lock to
 * protect. Android's own packagers (Bubblewrap, PWABuilder) read this field
 * to decide whether the installed app may resize or rotate — a lock here is
 * exactly what Google Play flags as unsupported for large-screen devices.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Suci, pelacak siklus & ibadah",
    short_name: "Suci",
    description:
      "Pelacak siklus haid berbasis fiqih thaharah empat mazhab, dengan jadwal ibadah harian. Catatanmu tersimpan di ponselmu saja.",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Matches --bg and --rose in the light theme, so the splash screen and the
    // first paint agree instead of flashing white.
    background_color: "#FDFBF7",
    theme_color: "#FBEAF0",
    categories: ["health", "lifestyle", "education"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Catat hari ini",
        short_name: "Catat",
        url: "/catat",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Jadwal ibadah",
        short_name: "Ibadah",
        url: "/ibadah",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
