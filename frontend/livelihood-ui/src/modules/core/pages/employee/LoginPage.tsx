import { zodResolver } from "@hookform/resolvers/zod";
import {
  assertEmployeeRolesAllowed,
  employeeHomePath,
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
  loginUser,
  tenantId,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
} from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

function extractOAuthErrorDescription(error: unknown): string | undefined {
  const response = (
    error as { response?: { data?: { error_description?: string } } }
  )?.response;
  return response?.data?.error_description;
}

function resolveRedirectPath(from?: string): string {
  const fallback = employeeHomePath();

  if (!from) {
    return fallback;
  }

  try {
    return decodeURIComponent(from) || fallback;
  } catch {
    return fallback;
  }
}

export function LoginPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const from = new URLSearchParams(window.location.search).get("from") ?? undefined;
  const setSession = useAuthStore((state) => state.setSession);
  const setJurisdictionData = useJurisdictionStore((state) => state.setJurisdictionData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await loginUser({
        username: values.username.trim(),
        password: values.password.trim(),
        tenantId: tenantId(),
      });

      const userInfo = response.UserRequest;
      if (!userInfo?.tenantId) {
        throw new Error("Could not resolve employee tenant");
      }

      const scopedUser = filterRolesForEmployeeTenant(userInfo, userInfo.tenantId);
      assertEmployeeRolesAllowed(scopedUser);

      const jurisdictionData = await hydrateEmployeeJurisdictions(
        scopedUser,
        response.access_token,
      );

      setSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: scopedUser,
        employeeTenantId: userInfo.tenantId,
      });
      setJurisdictionData(jurisdictionData);

      toast.success("Signed in successfully");
      await navigate({ to: resolveRedirectPath(from) });
    } catch (error) {
      const message =
        error instanceof Error && error.message === "ES_ERROR_USER_NOT_PERMITTED"
          ? translateOr(
              t,
              "ES_ERROR_USER_NOT_PERMITTED",
              "You are not permitted to access this application.",
            )
          : (extractOAuthErrorDescription(error) ??
            translateOr(
              t,
              "CS_LOGIN_INVALID_CREDENTIALS",
              "Check your credentials and try again.",
            ));

      toast.error(translateOr(t, "CS_LOGIN_FAILED", "Sign in failed"), {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <Card className="livelihood-card w-full max-w-md">
        <CardHeader>
          <CardTitle>Livelihood UI</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input autoComplete="username" placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
