import { QueryProvider } from "@/shared";
import { Toaster, TooltipProvider } from "@/ui";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";

const router = createAppRouter();

export function App() {
  return (
    <TooltipProvider>
      <QueryProvider>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </QueryProvider>
    </TooltipProvider>
  );
}
