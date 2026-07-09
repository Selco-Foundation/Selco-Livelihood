import { getModuleNavItems } from "@/module-registry";
import {
  contextPath,
  employeeLoginPath,
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
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  toast,
} from "@/ui";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/modules/core";

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
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <span className="text-lg font-semibold">Livelihood</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const homePath = `${basePath}/employee`;
                  const isActive =
                    item.to === homePath
                      ? pathname === item.to
                      : pathname === item.to || pathname.startsWith(`${item.to}/`);

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.to}>
                          {Icon ? <Icon /> : null}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.name ?? user?.userName ?? "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.userName}</p>
            </div>
          </div>
          <Separator className="my-3" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <LogOut />
                Sign out
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
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h2 className="text-sm font-medium text-muted-foreground">Employee workspace</h2>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 bg-page p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
