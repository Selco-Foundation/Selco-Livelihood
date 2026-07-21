import { zodResolver } from "@hookform/resolvers/zod";
import {
  employeeLoginPath,
  extractApiErrorMessage,
  resetPasswordWithOtp,
  sendPasswordResetOtp,
  tenantId,
  translateOr,
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
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthLayout } from "../../components/AuthLayout";
import { OtpInput } from "../../components/OtpInput";
import { PasswordChangedDialog } from "../../components/PasswordChangedDialog";
import { PasswordFormField } from "../../components/PasswordFormField";
import {
  passwordConfirmationShape,
  refinePasswordConfirmation,
} from "../../utils/password-confirmation-schema";

function createChangePasswordSchema(t: (key: string) => string) {
  return refinePasswordConfirmation(
    z.object({
      userName: z
        .string()
        .min(1, translateOr(t, "CORE_CHANGE_PASSWORD_USERNAME_REQUIRED", "Username is required")),
      ...passwordConfirmationShape(t, {
        newRequiredKey: "CORE_CHANGE_PASSWORD_NEW_REQUIRED",
        confirmRequiredKey: "CORE_CHANGE_PASSWORD_CONFIRM_REQUIRED",
        mismatchKey: "CORE_CHANGE_PASSWORD_MISMATCH",
      }),
    }),
    t,
    "CORE_CHANGE_PASSWORD_MISMATCH",
  );
}

type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>;

const RESEND_COOLDOWN_SECONDS = 30;

export function ChangePasswordPage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { mobileNumber?: string };
  const mobileNumber = search.mobileNumber ?? "";

  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const changePasswordSchema = useMemo(() => createChangePasswordSchema(t), [t]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const id = setInterval(() => {
      setResendCooldown((current) => current - 1);
    }, 1000);

    return () => clearInterval(id);
  }, [resendCooldown]);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      userName: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleResendOtp = async () => {
    if (isResendingOtp) {
      return;
    }

    setIsResendingOtp(true);
    try {
      await sendPasswordResetOtp({ mobileNumber, tenantId: tenantId() });
      toast.success(translateOr(t, "CORE_CHANGE_PASSWORD_OTP_RESENT", "OTP resent"));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(translateOr(t, "CS_FORGOT_PASSWORD_OTP_FAILED", "Failed to send OTP"), {
        description:
          extractApiErrorMessage(error) ??
          translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
      });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const onSubmit = async (values: ChangePasswordFormValues) => {
    if (!/^\d{4}$/.test(otp)) {
      toast.error(translateOr(t, "CORE_CHANGE_PASSWORD_OTP_INVALID", "Enter the 4-digit OTP"));
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordWithOtp({
        userName: values.userName.trim(),
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
        otpReference: otp,
        tenantId: tenantId(),
      });
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
    <AuthLayout
      title={translateOr(t, "CORE_RESET_PASSWORD_TITLE", "Reset Password")}
      subtitle={`${translateOr(t, "CORE_CHANGE_PASSWORD_OTP_SENT", "OTP sent to")} +91 - ${mobileNumber}`}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
          <div className="flex flex-col gap-2">
            <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
              {translateOr(t, "CORE_CHANGE_PASSWORD_OTP_LABEL", "OTP")}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <OtpInput value={otp} onChange={setOtp} />
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={resendCooldown > 0 || isResendingOtp}
              className="self-start cursor-pointer text-sm leading-[21px] font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
            >
              {resendCooldown > 0
                ? `${translateOr(t, "CORE_CHANGE_PASSWORD_RESEND_IN", "Resend OTP in")} ${resendCooldown} ${translateOr(t, "CORE_COMMON_SECONDS", "Seconds")}`
                : translateOr(t, "CORE_CHANGE_PASSWORD_RESEND", "Resend OTP")}
            </button>
          </div>

          <FormField
            control={form.control}
            name="userName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                  {translateOr(t, "CORE_CHANGE_PASSWORD_USERNAME_LABEL", "Username")}{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    autoComplete="username"
                    placeholder={translateOr(
                      t,
                      "CORE_CHANGE_PASSWORD_USERNAME_PLACEHOLDER",
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

          <PasswordFormField
            control={form.control}
            name="newPassword"
            label={translateOr(t, "CORE_CHANGE_PASSWORD_NEW_LABEL", "New Password")}
            placeholder={translateOr(
              t,
              "CORE_CHANGE_PASSWORD_NEW_PLACEHOLDER",
              "Enter your new password",
            )}
            autoComplete="new-password"
          />

          <PasswordFormField
            control={form.control}
            name="confirmPassword"
            label={translateOr(t, "CORE_CHANGE_PASSWORD_CONFIRM_LABEL", "Confirm Password")}
            placeholder={translateOr(
              t,
              "CORE_CHANGE_PASSWORD_CONFIRM_PLACEHOLDER",
              "Re-enter your new password",
            )}
            autoComplete="new-password"
          />

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? translateOr(t, "CORE_CHANGE_PASSWORD_BUTTON_LOADING", "Changing password...")
              : translateOr(t, "CORE_CHANGE_PASSWORD_BUTTON", "Change Password")}
          </Button>
        </form>
      </Form>

      {isSuccess ? (
        <PasswordChangedDialog
          onConfirm={() => {
            navigate({ to: employeeLoginPath() });
          }}
        />
      ) : null}
    </AuthLayout>
  );
}
