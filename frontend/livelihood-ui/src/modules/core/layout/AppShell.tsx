import { getModuleNavItems } from "@/module-registry";
import {
  contextPath,
  employeeLoginPath,
  getConfigString,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
  type NavItem,
} from "@/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  toast,
} from "@/ui";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, LogOut } from "lucide-react";

export function AppShell() {
  const navItems = getModuleNavItems();
  const basePath = `/${contextPath()}`;
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearJurisdiction = useJurisdictionStore((state) => state.clearJurisdiction);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useTranslate();

  const initials =
    user?.name?.slice(0, 2).toUpperCase() ??
    user?.userName?.slice(0, 2).toUpperCase() ??
    "LU";

  const allNavItems: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      to: `${basePath}/employee`,
      icon: Home,
    },
    ...navItems,
  ];

  return (
    <SidebarProvider className="h-svh overflow-hidden bg-sidebar">
      <Sidebar
        collapsible="none"
        style={{ borderRight: "none" }}
        className="w-(--sidebar-width-icon) items-center md:w-(--sidebar-width) md:items-stretch"
      >
        <SidebarHeader className="items-center gap-6 px-2 pt-12 pb-5 md:px-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-[3px] p-1 md:h-[80px] md:w-[80px]">
            <img
              src={getConfigString("SELCO_LOGO")}
              alt="Selco Foundation Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <SidebarSeparator className="mx-0 h-[5px] w-full bg-white/60" />
        </SidebarHeader>
        <SidebarContent className="px-2 md:px-7">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const homePath = `${basePath}/employee`;
                  const matchAgainst = [item.to, ...(item.matchPrefixes ?? [])];
                  const isActive =
                    item.to === homePath
                      ? pathname === item.to
                      : matchAgainst.some(
                          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
                        );

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="justify-center rounded-lg md:justify-start"
                      >
                        <Link to={item.to} aria-label={item.label}>
                          {Icon ? <Icon /> : null}
                          <span className="hidden md:inline">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-3 px-2 pb-12 md:px-7">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <Avatar className="h-11 w-11 border-[1.5px] border-ink-300">
              <AvatarFallback className="bg-white/15 text-sidebar-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-sm font-medium">
                {user?.name ?? user?.userName ?? "User"}
              </p>
            </div>
          </div>
          <SidebarSeparator className="mx-0 h-[5px] w-full bg-white/60" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-foreground md:justify-start"
              >
                <LogOut />
                <span className="hidden md:inline">Sign out</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearSession();
                    clearJurisdiction();
                    toast.success(t("CORE_LOGOUT_SUCCESS_TOAST"));
                    void navigate({ to: employeeLoginPath() });
                  }}
                >
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-h-0 [scrollbar-gutter:stable] overflow-y-auto rounded-tl-[48px] rounded-bl-[48px] bg-page pt-12 pr-8 pb-10 pl-8">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
