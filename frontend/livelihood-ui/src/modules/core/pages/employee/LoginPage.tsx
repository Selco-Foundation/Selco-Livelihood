import { zodResolver } from "@hookform/resolvers/zod";
import {
  assertEmployeeRolesAllowed,
  employeeHomePath,
  filterRolesForEmployeeTenant,
  getConfigString,
  hydrateEmployeeJurisdictions,
  loginUser,
  tenantId,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
  useLoginBannerImages,
} from "@/shared";
import {
  Button,
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
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { LoginCarousel } from "../../components/LoginCarousel";

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
  const [showPassword, setShowPassword] = useState(false);
  const bannerImages = useLoginBannerImages();

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
    <div className="font-poppins flex min-h-screen bg-white">
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-8 py-8 lg:w-[60%] lg:min-w-[480px]">
        <div className="absolute inset-x-8 top-8 flex items-center justify-between">
          <img
            src={getConfigString("SELCO_LOGO")}
            alt="Selco Foundation Logo"
            className="h-[68px] w-auto object-contain"
          />
          <LanguageSwitcher />
        </div>

        <div className="flex w-full max-w-[360px] flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-[32px] font-semibold leading-[48px] text-ink-950">Welcome</h1>
            <p className="text-sm leading-[21px] text-ink-600">
              Please enter your details to login.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
              <div className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                        Username <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="username"
                          placeholder="Enter your username"
                          className="h-9 rounded border-ink-300 px-3 py-2 text-sm leading-[21px] text-ink-950 placeholder:text-ink-400"
                          {...field}
                        />
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
                      <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                        Password <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            className="h-9 rounded border-ink-300 px-3 py-2 pr-10 text-sm leading-[21px] text-ink-950 placeholder:text-ink-400"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-ink-400"
                          >
                            {showPassword ? (
                              <EyeOff className="size-5" />
                            ) : (
                              <Eye className="size-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full rounded-lg bg-primary text-base leading-[24px] font-semibold text-white hover:bg-primary/90"
              >
                {isSubmitting ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      <div className="hidden py-6 pr-6 lg:block lg:w-[40%] lg:min-w-[520px]">
        <LoginCarousel slides={bannerImages} />
      </div>
    </div>
  );
}
