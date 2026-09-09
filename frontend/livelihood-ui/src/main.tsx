import "@/ui/globals.css";
import { getConfigString } from "@/shared";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const FAVICON_MIME_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  ico: "image/x-icon",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const faviconUrl = getConfigString("LOGO_ICON");
if (faviconUrl) {
  const faviconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (faviconLink) {
    faviconLink.href = faviconUrl;
    const extension = faviconUrl.split(".").pop()?.toLowerCase().split(/[?#]/)[0];
    if (extension && FAVICON_MIME_TYPES[extension]) {
      faviconLink.type = FAVICON_MIME_TYPES[extension];
    }
  }
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
