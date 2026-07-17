import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordInSession,
  employeeLoginPath,
  employeeProfilePath,
  extractApiErrorMessage,
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
  PageHeader,
  toast,
} from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordChangedDialog } from "../../components/PasswordChangedDialog";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ProfileChangePasswordPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearJurisdiction = useJurisdictionStore((state) => state.clearJurisdiction);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const [currentPasswordValue, newPasswordValue, confirmPasswordValue] = form.watch([
    "currentPassword",
    "newPassword",
    "confirmPassword",
  ]);
  const canSave = Boolean(currentPasswordValue && newPasswordValue && confirmPasswordValue);

  const onSubmit = async (values: ChangePasswordFormValues) => {
    if (!employeeTenantId || !accessToken) {
      return;
    }

    setIsSubmitting(true);

    try {
      await changePasswordInSession(
        {
          existingPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
          username: user?.userName ?? "",
          tenantId: employeeTenantId,
        },
        accessToken,
        user,
      );

      setIsSuccess(true);
    } catch (error) {
      toast.error(translateOr(t, "CORE_CHANGE_PASSWORD_FAILED", "Failed to update password"), {
        description:
          extractApiErrorMessage(error) ??
          translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={translateOr(t, "CORE_CHANGE_PASSWORD_TITLE", "Change Password")} />

      <section className="livelihood-card max-w-2xl space-y-6 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                    {translateOr(t, "CORE_PROFILE_CURRENT_PASSWORD_LABEL", "Current Password")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        className="h-9 rounded border-ink-300 px-3 py-2 pr-10 text-sm leading-[21px] text-ink-950"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((current) => !current)}
                        aria-label={
                          showCurrentPassword
                            ? translateOr(t, "CORE_LOGIN_PASSWORD_HIDE", "Hide password")
                            : translateOr(t, "CORE_LOGIN_PASSWORD_SHOW", "Show password")
                        }
                        className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-ink-400"
                      >
                        {showCurrentPassword ? (
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

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                    {translateOr(t, "CORE_PROFILE_NEW_PASSWORD_LABEL", "New Password")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="h-9 rounded border-ink-300 px-3 py-2 pr-10 text-sm leading-[21px] text-ink-950"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((current) => !current)}
                        aria-label={
                          showNewPassword
                            ? translateOr(t, "CORE_LOGIN_PASSWORD_HIDE", "Hide password")
                            : translateOr(t, "CORE_LOGIN_PASSWORD_SHOW", "Show password")
                        }
                        className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-ink-400"
                      >
                        {showNewPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                    {translateOr(t, "CORE_PROFILE_CONFIRM_PASSWORD_LABEL", "Confirm New Password")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="h-9 rounded border-ink-300 px-3 py-2 pr-10 text-sm leading-[21px] text-ink-950"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                        aria-label={
                          showConfirmPassword
                            ? translateOr(t, "CORE_LOGIN_PASSWORD_HIDE", "Hide password")
                            : translateOr(t, "CORE_LOGIN_PASSWORD_SHOW", "Show password")
                        }
                        className="absolute inset-y-0 right-3 flex cursor-pointer items-center text-ink-400"
                      >
                        {showConfirmPassword ? (
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

            <div className="flex items-center gap-4">
              <Button type="submit" size="lg" disabled={isSubmitting || !canSave} className="w-fit">
                {isSubmitting
                  ? translateOr(t, "CORE_CHANGE_PASSWORD_BUTTON_LOADING", "Changing password...")
                  : translateOr(t, "CORE_CHANGE_PASSWORD_BUTTON", "Change Password")}
              </Button>
              <Link
                to={employeeProfilePath()}
                className="text-sm font-medium text-ink-600 hover:underline"
              >
                {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
              </Link>
            </div>
          </form>
        </Form>
      </section>

      {isSuccess ? (
        <PasswordChangedDialog
          onConfirm={() => {
            clearSession();
            clearJurisdiction();
            void navigate({ to: employeeLoginPath() });
          }}
        />
      ) : null}
    </div>
  );
}
