/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { API_PROXY_PATHS } from "./src/config/proxy-paths";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, "src");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyApi = env.VITE_PROXY_API;
  const contextPath = env.VITE_CONTEXT_PATH;
  const globalConfigUrl = env.VITE_GLOBAL_CONFIG_URL?.trim();
  const base = `/${contextPath}/`;

  const proxyConfig = proxyApi
    ? Object.fromEntries(
        API_PROXY_PATHS.map((proxyPath) => [
          proxyPath,
          { target: proxyApi, changeOrigin: true, secure: false },
        ]),
      )
    : undefined;

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "inject-global-config",
        transformIndexHtml(html) {
          if (!globalConfigUrl) return html;
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
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      restoreMocks: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        reportsDirectory: "./coverage",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          // Bootstrap/composition — zero branching, wiring only.
          "src/main.tsx",
          "src/vite-env.d.ts",
          "src/App.tsx",
          "src/router.tsx",
          "src/modules.ts",
          "src/config/proxy-paths.ts",
          // Barrel re-export files — no logic (shared/i18n/index.ts is NOT a
          // barrel, it holds real init logic, so it's deliberately excluded here).
          "src/shared/index.ts",
          "src/ui/index.ts",
          "src/modules/core/index.ts",
          "src/modules/im/index.ts",
          // Type-only files — no runtime code.
          "src/shared/modules/types.ts",
          "src/modules/im/types/**",
          // Pure data/config constants, no functions (workflow-actions.ts and
          // workflow.ts DO have functions and are deliberately not excluded).
          "src/modules/im/constants/inbox-statuses.ts",
          "src/modules/im/constants/routes.ts",
          // Trivial QueryClient config/wrapper, no branching.
          "src/shared/query/query-client.ts",
          "src/shared/query/provider.tsx",
          // Stock shadcn-generated primitives — verbatim wrappers, no custom
          // logic (split-button.tsx and sidebar.tsx are custom/have real
          // logic and are deliberately not excluded).
          "src/ui/components/ui/alert-dialog.tsx",
          "src/ui/components/ui/avatar.tsx",
          "src/ui/components/ui/badge.tsx",
          "src/ui/components/ui/breadcrumb.tsx",
          "src/ui/components/ui/button.tsx",
          "src/ui/components/ui/card.tsx",
          "src/ui/components/ui/checkbox.tsx",
          "src/ui/components/ui/dialog.tsx",
          "src/ui/components/ui/dropdown-menu.tsx",
          "src/ui/components/ui/form.tsx",
          "src/ui/components/ui/input.tsx",
          "src/ui/components/ui/label.tsx",
          "src/ui/components/ui/popover.tsx",
          "src/ui/components/ui/scroll-area.tsx",
          "src/ui/components/ui/separator.tsx",
          "src/ui/components/ui/sheet.tsx",
          "src/ui/components/ui/skeleton.tsx",
          "src/ui/components/ui/sonner.tsx",
          "src/ui/components/ui/table.tsx",
          "src/ui/components/ui/tooltip.tsx",
          // Presentational-only components, no branching logic of their own.
          "src/modules/im/components/create/FormSectionCard.tsx",
          "src/modules/im/components/create/TicketSubmittedDialog.tsx",
          "src/modules/im/components/details/ComplaintSummarySection.tsx",
          "src/modules/im/components/details/ComplaintMediaSection.tsx",
          "src/modules/im/components/ImBreadcrumbs.tsx",
          "src/modules/im/components/inbox/ComplaintLinks.tsx",
          "src/modules/im/components/inbox/MobileComplaintList.tsx",
          "src/modules/im/pages/employee/CreateIncidentPage.tsx",
          // Test infra itself.
          "src/test/**",
        ],
      },
    },
  };
});
