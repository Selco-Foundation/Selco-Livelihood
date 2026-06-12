import { getViteEnv } from "../env";

const gaId = getViteEnv("VITE_GA_ID") || undefined;

export function isAnalyticsEnabled(): boolean {
  return Boolean(gaId && typeof window.gtag === "function");
}

export function trackPageView(path: string, title?: string): void {
  if (!isAnalyticsEnabled()) return;

  window.gtag?.("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
  });
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (!isAnalyticsEnabled()) return;
  window.gtag?.("event", name, params);
}
