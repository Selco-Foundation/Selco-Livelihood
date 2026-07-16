import { zodResolver } from "@hookform/resolvers/zod";
import {
  assertEmployeeRolesAllowed,
  employeeForgotPasswordPath,
  employeeHomePath,
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
  loginUser,
  tenantId,
  translateOr,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
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
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "../../components/AuthLayout";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

      toast.success(translateOr(t, "CORE_LOGIN_SUCCESS_TOAST", "Signed in successfully"));
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
    <AuthLayout
      title={translateOr(t, "CORE_LOGIN_WELCOME_TITLE", "Welcome")}
      subtitle={translateOr(t, "CORE_LOGIN_SUBTITLE", "Please enter your details to login.")}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                    {translateOr(t, "CORE_LOGIN_USERNAME_LABEL", "Username")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="username"
                      placeholder={translateOr(
                        t,
                        "CORE_LOGIN_USERNAME_PLACEHOLDER",
                        "Enter your username",
                      )}
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
                  <div className="flex items-baseline justify-between">
                    <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                      <span>
                        {translateOr(t, "CORE_LOGIN_PASSWORD_LABEL", "Password")}{" "}
                        <span className="text-destructive">*</span>
                      </span>
                    </FormLabel>
                    <Link
                      to={employeeForgotPasswordPath()}
                      className="text-sm leading-[21px] font-medium text-primary hover:underline"
                    >
                      {translateOr(t, "CORE_LOGIN_FORGOT_PASSWORD", "Forgot Password?")}
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={translateOr(
                          t,
                          "CORE_LOGIN_PASSWORD_PLACEHOLDER",
                          "Enter your password",
                        )}
                        className="h-9 rounded border-ink-300 px-3 py-2 pr-10 text-sm leading-[21px] text-ink-950 placeholder:text-ink-400"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={
                          showPassword
                            ? translateOr(t, "CORE_LOGIN_PASSWORD_HIDE", "Hide password")
                            : translateOr(t, "CORE_LOGIN_PASSWORD_SHOW", "Show password")
                        }
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

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? translateOr(t, "CORE_LOGIN_BUTTON_LOADING", "Logging in...")
              : translateOr(t, "CORE_LOGIN_BUTTON", "Log in")}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
