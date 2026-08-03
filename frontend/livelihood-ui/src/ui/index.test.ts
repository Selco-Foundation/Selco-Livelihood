/**
 * Unit tests for src/ui/index.ts
 *
 * This file is a pure barrel: every line is either `export { X } from "./somewhere"`
 * or `export type { X } from "./somewhere"` (or, for `toast`, from the third-party
 * "sonner" package). It contains no logic of its own, so there is nothing to branch
 * on — the only thing that can actually go wrong in a barrel is the wiring itself:
 *   - a name is exported from the wrong module (or a stale/renamed one),
 *   - a name silently stops being re-exported (a consumer import breaks),
 *   - an extra/unintended name gets exposed on the public surface,
 *   - a type-only export accidentally gets treated as (or replaced by) a value.
 *
 * Approach: rather than shallow "is it truthy" smoke checks, every runtime export
 * is compared by strict reference (`===`) against the same named export pulled
 * directly from its source module (or from "sonner" for `toast`). Reference
 * equality is meaningful here because these are forwardRef components, cva
 * variant functions, and a Zustand-style hook — if the barrel re-exported a copy,
 * a different instance, or the wrong symbol, `===` would fail even though a
 * shallow "defined" check would still pass. `Object.keys` of the compiled barrel
 * is also diffed against the full expected export list, which catches additions/
 * removals that individual per-module checks (looping only over "expected" names)
 * would miss.
 *
 * No provider wrapper / render is used: every concrete component behavior
 * (Button variants, DataTable rows, Sidebar context, SplitButton clicks, Toaster
 * icons, etc.) already has its own colocated test next to its source file — this
 * file's only job is to prove the re-export wiring in index.ts itself, so
 * re-rendering those components here would just duplicate coverage that already
 * exists elsewhere without exercising anything this file is responsible for.
 * The two `cva` variant functions (buttonVariants/badgeVariants) and `cn` do get
 * one small functional call each, since "the re-exported function still behaves
 * like the real thing" is itself part of what a barrel needs to guarantee.
 */
import { describe, expect, it } from "vitest";
import * as toastModule from "sonner";
import * as UI from "./index";

// Mirrors the grouping and source paths in src/ui/index.ts exactly, so this
// manifest is easy to keep in sync by eye when index.ts is edited.
const reExportGroups: Array<{ path: string; names: string[] }> = [
  { path: "./lib/utils", names: ["cn"] },
  { path: "./components/ui/button", names: ["Button", "buttonVariants"] },
  { path: "./components/ui/split-button", names: ["SplitButton"] },
  { path: "./components/ui/input", names: ["Input"] },
  { path: "./components/ui/label", names: ["Label"] },
  {
    path: "./components/ui/card",
    names: ["Card", "CardContent", "CardDescription", "CardFooter", "CardHeader", "CardTitle"],
  },
  {
    path: "./components/ui/form",
    names: ["Form", "FormControl", "FormDescription", "FormField", "FormItem", "FormLabel", "FormMessage"],
  },
  {
    path: "./components/ui/table",
    names: ["Table", "TableBody", "TableCaption", "TableCell", "TableFooter", "TableHead", "TableHeader", "TableRow"],
  },
  {
    path: "./components/ui/dialog",
    names: [
      "Dialog",
      "DialogClose",
      "DialogContent",
      "DialogDescription",
      "DialogFooter",
      "DialogHeader",
      "DialogTitle",
      "DialogTrigger",
    ],
  },
  {
    path: "./components/ui/alert-dialog",
    names: [
      "AlertDialog",
      "AlertDialogAction",
      "AlertDialogCancel",
      "AlertDialogContent",
      "AlertDialogDescription",
      "AlertDialogFooter",
      "AlertDialogHeader",
      "AlertDialogTitle",
      "AlertDialogTrigger",
    ],
  },
  { path: "./components/ui/sonner", names: ["Toaster"] },
  {
    path: "./components/ui/sidebar",
    names: [
      "Sidebar",
      "SidebarContent",
      "SidebarFooter",
      "SidebarGroup",
      "SidebarGroupContent",
      "SidebarGroupLabel",
      "SidebarHeader",
      "SidebarInset",
      "SidebarMenu",
      "SidebarMenuButton",
      "SidebarMenuItem",
      "SidebarProvider",
      "SidebarSeparator",
      "SidebarTrigger",
      "useSidebar",
    ],
  },
  { path: "./components/ui/separator", names: ["Separator"] },
  {
    path: "./components/ui/breadcrumb",
    names: [
      "Breadcrumb",
      "BreadcrumbEllipsis",
      "BreadcrumbItem",
      "BreadcrumbLink",
      "BreadcrumbList",
      "BreadcrumbPage",
      "BreadcrumbSeparator",
    ],
  },
  { path: "./components/ui/avatar", names: ["Avatar", "AvatarFallback", "AvatarImage"] },
  {
    path: "./components/ui/tooltip",
    names: ["Tooltip", "TooltipContent", "TooltipProvider", "TooltipTrigger"],
  },
  { path: "./components/ui/badge", names: ["Badge", "badgeVariants"] },
  {
    path: "./components/ui/dropdown-menu",
    names: [
      "DropdownMenu",
      "DropdownMenuContent",
      "DropdownMenuItem",
      "DropdownMenuLabel",
      "DropdownMenuSeparator",
      "DropdownMenuTrigger",
    ],
  },
  { path: "./components/ui/skeleton", names: ["Skeleton"] },
  { path: "./components/ui/checkbox", names: ["Checkbox"] },
  {
    path: "./components/ui/popover",
    names: ["Popover", "PopoverAnchor", "PopoverContent", "PopoverTrigger"],
  },
  { path: "./components/ui/scroll-area", names: ["ScrollArea", "ScrollBar"] },
  {
    path: "./components/ui/sheet",
    names: [
      "Sheet",
      "SheetClose",
      "SheetContent",
      "SheetDescription",
      "SheetFooter",
      "SheetHeader",
      "SheetTitle",
      "SheetTrigger",
    ],
  },
  { path: "./components/data-table", names: ["DataTable"] },
  { path: "./components/stat-tile", names: ["StatTile"] },
  { path: "./components/page-header", names: ["PageHeader"] },
];

const allExpectedRuntimeExportNames = reExportGroups.flatMap((group) => group.names).concat(["toast"]);

// The barrel re-exports every named value listed in `reExportGroups` above,
// each straight from its own component/util module (one `export { X } from
// "./..."` line per group in src/ui/index.ts). For a re-export to be correct,
// the barrel's binding must be the exact same reference as the source module's
// — not merely "some function/component with the same name".
describe("component and utility re-exports", () => {
  it.each(reExportGroups)("re-exports $names from $path unchanged", async ({ path, names }) => {
    const sourceModule = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;

    for (const name of names) {
      expect(sourceModule[name]).toBeDefined();
      // Strict reference equality: catches a barrel accidentally pointing at a
      // different module, a stale copy, or a name that no longer resolves.
      expect(UI[name as keyof typeof UI]).toBe(sourceModule[name]);
    }
  });
});

// `toast` is the one export in this barrel that comes from a third-party
// package ("sonner") rather than from a local component file. It's the
// imperative function consumers call (toast.success(...), toast.error(...))
// to enqueue a notification that <Toaster /> renders.
describe("toast re-export (from sonner)", () => {
  it("re-exports the same toast function instance as the sonner package", () => {
    expect(UI.toast).toBe(toastModule.toast);
    expect(typeof UI.toast).toBe("function");
  });
});

// The full runtime export surface of the barrel should be exactly the set of
// value exports listed in src/ui/index.ts — no more, no less. This is the
// check that would fail if a new export were added to index.ts without being
// added here (or vice versa), independent of the per-group identity checks
// above (which only ever look at names they already expect).
describe("module export surface", () => {
  it("exposes exactly the expected set of runtime (value) exports, nothing more or less", () => {
    const actualNames = Object.keys(UI).sort();
    const expectedNames = [...new Set(allExpectedRuntimeExportNames)].sort();

    expect(actualNames).toEqual(expectedNames);
  });

  // `SplitButtonProps` and `StatTileProps` are declared with `export type { ... }`
  // in index.ts, so the TypeScript compiler erases them entirely — they exist
  // only at the type level and must leave no trace on the compiled JS namespace
  // object. If either ever accidentally became a value export (e.g. the `type`
  // keyword were dropped, or a runtime constant of the same name were added),
  // it would start showing up in Object.keys(UI) and this would catch it.
  it("does not expose type-only exports (SplitButtonProps, StatTileProps) as runtime bindings", () => {
    expect(Object.keys(UI)).not.toContain("SplitButtonProps");
    expect(Object.keys(UI)).not.toContain("StatTileProps");
  });

  // src/ui/components/ui/sidebar.tsx exports several additional primitives
  // (SidebarRail, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton,
  // SidebarMenuSub and friends, SidebarInput, SidebarGroupAction) that the
  // barrel deliberately does NOT re-export because nothing in the app consumes
  // them yet. This asserts that curation is intentional and still holds, so a
  // future edit that widens the sidebar barrel exports does so on purpose.
  it("does not widen the curated Sidebar re-export surface with unused internals", () => {
    const uncuratedSidebarExports = [
      "SidebarRail",
      "SidebarInput",
      "SidebarGroupAction",
      "SidebarMenuAction",
      "SidebarMenuBadge",
      "SidebarMenuSkeleton",
      "SidebarMenuSub",
      "SidebarMenuSubButton",
      "SidebarMenuSubItem",
    ];
    for (const name of uncuratedSidebarExports) {
      expect(Object.keys(UI)).not.toContain(name);
    }
  });
});

// `cn` (src/ui/lib/utils.ts) merges class-name inputs through clsx + tailwind-merge,
// so conditional/falsy inputs are dropped and conflicting Tailwind utility classes
// dedupe to the last one. This is exercised elsewhere in isolation
// (src/ui/lib/utils.test.ts); here it's enough to confirm the barrel's binding
// still behaves like the real function rather than a stub.
describe("cn (class name merge utility)", () => {
  it("merges class names and dedupes conflicting Tailwind utilities, dropping falsy inputs", () => {
    expect(UI.cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });
});

// `buttonVariants` / `badgeVariants` (src/ui/components/ui/button.tsx and
// badge.tsx) are `cva(...)` variant resolvers: given a `{ variant, size }`
// selection they return the matching Tailwind class string, falling back to
// each variant group's declared `defaultVariants` when a field is omitted.
describe("cva variant resolvers (buttonVariants, badgeVariants)", () => {
  it("buttonVariants applies the requested variant's classes, not the default", () => {
    // "destructive" only appears in the destructive variant's class string, so
    // its presence proves the explicit variant argument was actually used
    // rather than silently falling back to defaultVariants.variant = "default".
    const classes = UI.buttonVariants({ variant: "destructive", size: "sm" });
    expect(classes).toContain("bg-destructive");
  });

  it("buttonVariants falls back to its declared defaultVariants when none are given", () => {
    const classes = UI.buttonVariants();
    expect(classes).toContain("bg-brand-primary"); // default variant
    expect(classes).toContain("h-11"); // default size
  });

  it("badgeVariants applies the requested variant's classes", () => {
    const classes = UI.badgeVariants({ variant: "success" });
    expect(classes).toContain("bg-chip-success");
  });
});
