"use client";

import { Download, MonitorSmartphone, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppCard() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window !== "undefined" ? isStandalone() : false,
  );
  const [isIos] = useState(() =>
    typeof window !== "undefined"
      ? /iphone|ipad|ipod/i.test(window.navigator.userAgent)
      : false,
  );

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setPromptEvent(null);
  };

  if (installed) {
    return (
      <div className="rounded-card border border-secondary/30 bg-secondary-container/45 p-5 text-on-secondary-container">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <MonitorSmartphone className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">StudyFlow is installed</h2>
            <p className="mt-1 text-sm leading-6">
              Open it from your home screen, Start menu, or app launcher.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-outline-variant/55 bg-surface-container-lowest p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Download className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Install StudyFlow</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Install the public web app for a full-screen experience and quick access from your device.
            </p>
          </div>
        </div>

        {promptEvent ? (
          <Button className="mt-5 w-full" size="lg" onClick={install}>
            <Download className="size-5" aria-hidden="true" />
            Install on this device
          </Button>
        ) : null}
      </div>

      <div className="rounded-card border border-outline-variant/55 bg-surface-container-low p-5">
        <div className="flex items-start gap-3">
          <Share2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h3 className="font-semibold">
              {isIos ? "Install on iPhone or iPad" : "No install button showing?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isIos
                ? "Open StudyFlow in Safari, tap Share, then choose Add to Home Screen."
                : "Open your browser menu and choose Install StudyFlow, Install app, or Add to Home screen. Chrome and Edge usually show the option in the address bar or menu."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
