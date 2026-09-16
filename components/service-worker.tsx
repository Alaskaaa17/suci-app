"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes Suci work with no signal.
 *
 * Deliberately silent: there is no update toast. The app holds no server state
 * to fall out of sync with, so an update can wait for the next cold start
 * rather than interrupting someone mid-entry.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Registering during dev would cache the dev server's unhashed bundles.
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Blocked by browser settings or a non-secure origin. The app still
        // works; it just will not be available offline.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
