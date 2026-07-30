import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, type RenderOptions } from "@testing-library/react";
import i18next from "i18next";
import type { ReactElement, ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { TooltipProvider } from "@/ui";

function createTestI18n(resources: Record<string, string> = {}) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    fallbackLng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: {
      en_IN: { translations: resources },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  withRouter?: boolean;
  queryClient?: QueryClient;
  i18nResources?: Record<string, string>;
}

export function renderWithProviders(
  ui: ReactElement,
  { withRouter = false, queryClient, i18nResources, ...renderOptions }: RenderWithProvidersOptions = {},
) {
  const testQueryClient =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  const testI18n = createTestI18n(i18nResources);

  function Wrapper({ children }: { children: ReactNode }) {
    const content = (
      <TooltipProvider>
        <I18nextProvider i18n={testI18n}>
          <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
        </I18nextProvider>
      </TooltipProvider>
    );

    if (!withRouter) {
      return content;
    }

    const rootRoute = createRootRoute({ component: () => content });
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    return <RouterProvider router={router} />;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
    i18n: testI18n,
  };
}
