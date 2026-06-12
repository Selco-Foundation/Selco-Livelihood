export interface GlobalConfigs {
  getConfig: (key: string) => string | boolean | string[] | undefined;
}

declare global {
  interface Window {
    globalConfigs?: GlobalConfigs;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export {};
