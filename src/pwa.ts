import { useEffect, useState } from "react";

let registered = false;

export function registerServiceWorker() {
  if (registered) return;
  registered = true;
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  window.addEventListener("load", () => {
    const url = new URL("sw.js", document.baseURI).href;
    navigator.serviceWorker.register(url, { scope: "./" }).catch(() => {
      /* در محیط‌های بدون سرویس‌ورکر بی‌صدا رد می‌شود */
    });
  });
}

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(
    typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        // iOS
        (window.navigator as unknown as { standalone?: boolean }).standalone === true)
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!evt) return false;
    await evt.prompt();
    const res = await evt.userChoice;
    if (res.outcome === "accepted") setInstalled(true);
    setEvt(null);
    return res.outcome === "accepted";
  };

  return { canInstall: !!evt && !installed, installed, install };
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
