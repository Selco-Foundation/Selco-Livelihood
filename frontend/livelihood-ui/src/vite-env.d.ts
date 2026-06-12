/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_API: string;
  readonly VITE_PROXY_ASSETS: string;
  readonly VITE_PROXY_MDMS: string;
  readonly VITE_STATE_LEVEL_TENANT_ID: string;
  readonly VITE_CONTEXT_PATH: string;
  readonly VITE_GLOBAL_CONFIG_URL: string;
  readonly VITE_GA_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
