import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import {
  API_PROXY_PATHS,
  ASSETS_PROXY_PATHS,
  MDMS_PROXY_PATHS,
} from "./src/config/proxy-paths";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, "src");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyApi = env.VITE_PROXY_API || "https://e4h-dev.selcofoundation.org";
  const proxyAssets = env.VITE_PROXY_ASSETS || proxyApi;
  const proxyMdms = env.VITE_PROXY_MDMS || "http://localhost:8080";
  const contextPath = env.VITE_CONTEXT_PATH || "livelihood-ui";
  const base = `/${contextPath}/`;
  const globalConfigUrl =
    env.VITE_GLOBAL_CONFIG_URL?.trim() || `${base}sampleGlobalConfig.js`;

  const proxyConfig = Object.fromEntries(
    API_PROXY_PATHS.map((proxyPath) => [
      proxyPath,
      { target: proxyApi, changeOrigin: true, secure: false },
    ]),
  );

  for (const proxyPath of ASSETS_PROXY_PATHS) {
    proxyConfig[proxyPath] = { target: proxyAssets, changeOrigin: true, secure: false };
  }

  for (const proxyPath of MDMS_PROXY_PATHS) {
    proxyConfig[proxyPath] = { target: proxyMdms, changeOrigin: true, secure: false };
  }

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "inject-global-config",
        transformIndexHtml(html) {
          const script = `<script src="${globalConfigUrl}"></script>`;
          return html.replace("<!-- GLOBAL_CONFIG_SCRIPT -->", script);
        },
      },
      {
        name: "root-favicon",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url === "/favicon.ico") {
              req.url = `${base}favicon.svg`;
            }
            next();
          });
        },
      },
      {
        name: "inject-ga-id",
        transformIndexHtml(html) {
          const gaId = env.VITE_GA_ID;
          if (!gaId) return html;

          const gaScripts = `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag("js", new Date());
      gtag("config", "${gaId}", { send_page_view: false, anonymize_ip: true });
    </script>`;

          return html.replace("<!-- GA scripts injected when VITE_GA_ID is set -->", gaScripts);
        },
      },
    ],
    resolve: {
      alias: {
        "@": srcDir,
        "@/ui": path.resolve(srcDir, "ui"),
        "@/shared": path.resolve(srcDir, "shared"),
        "@/modules": path.resolve(srcDir, "modules"),
      },
    },
    server: {
      port: 5173,
      proxy: proxyConfig,
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
