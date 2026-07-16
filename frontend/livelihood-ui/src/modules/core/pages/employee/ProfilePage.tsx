import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordInSession,
  employeeLoginPath,
  extractApiErrorMessage,
  searchCurrentUser,
  translateOr,
  updateUserProfile,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
  type EmployeeProfile,
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
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordChangedDialog } from "../../components/PasswordChangedDialog";

const profileSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email), {
    message: "Enter a valid email address",
    path: ["email"],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearJurisdiction = useJurisdictionStore((state) => state.clearJurisdiction);

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordChangedSuccess, setIsPasswordChangedSuccess] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const uuid = user?.uuid;
    if (!uuid || !employeeTenantId || !accessToken) {
      setIsLoading(false);
      return;
    }

    let isCurrent = true;

    (async () => {
      try {
        const result = await searchCurrentUser(uuid, employeeTenantId, accessToken, user);
        if (!isCurrent) {
          return;
        }

        setProfile(result);
        form.reset({
          name: result?.name ?? "",
          email: result?.emailId ?? "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (error) {
        toast.error(translateOr(t, "CORE_PROFILE_LOAD_FAILED", "Failed to load profile"), {
          description:
            extractApiErrorMessage(error) ??
            translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
        });
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uuid, employeeTenantId, accessToken]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile || !employeeTenantId || !accessToken) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateUserProfile(
        {
          ...profile,
          name: values.name.trim(),
          emailId: values.email?.trim() || undefined,
        },
        employeeTenantId,
        accessToken,
        user,
      );

      if (user) {
        setUser({ ...user, name: values.name.trim() });
      }

      if (isChangingPassword) {
        const currentPassword = values.currentPassword?.trim();
        const newPassword = values.newPassword?.trim();
        const confirmPassword = values.confirmPassword?.trim();

        if (!currentPassword || !newPassword || !confirmPassword) {
          toast.error(
            translateOr(
              t,
              "CORE_PROFILE_PASSWORD_MANDATORY",
              "Enter your current password and a new password to change it",
            ),
          );
          return;
        }

        await changePasswordInSession(
          {
            existingPassword: currentPassword,
            newPassword,
            confirmPassword,
            username: profile.userName ?? "",
            tenantId: employeeTenantId,
          },
          accessToken,
          user,
        );

        setIsPasswordChangedSuccess(true);
      } else {
        form.reset(values);
        toast.success(translateOr(t, "CORE_PROFILE_UPDATE_SUCCESS", "Profile updated successfully"));
      }
    } catch (error) {
      toast.error(translateOr(t, "CORE_PROFILE_UPDATE_FAILED", "Failed to update profile"), {
        description:
          extractApiErrorMessage(error) ??
          translateOr(t, "ES_SOMETHING_WRONG", "Something went wrong. Please try again."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasProfileChanges = Boolean(form.formState.dirtyFields.name || form.formState.dirtyFields.email);
  const [currentPasswordValue, newPasswordValue, confirmPasswordValue] = form.watch([
    "currentPassword",
    "newPassword",
    "confirmPassword",
  ]);
  const passwordFieldsFilled = Boolean(
    currentPasswordValue?.trim() && newPasswordValue?.trim() && confirmPasswordValue?.trim(),
  );
  const canSave = isChangingPassword ? passwordFieldsFilled : hasProfileChanges;

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={translateOr(t, "CORE_PROFILE_TITLE", "Profile")} />

      <section className="livelihood-card max-w-2xl space-y-6 p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                      {translateOr(t, "CORE_PROFILE_NAME_LABEL", "Name")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="h-9 rounded border-ink-300 px-3 py-2 text-sm leading-[21px] text-ink-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm leading-[21px] font-medium text-ink-950">
                  {translateOr(t, "CORE_PROFILE_MOBILE_LABEL", "Mobile No.")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-ink-600">
                    +91
                  </span>
                  <Input
                    value={profile?.mobileNumber ?? ""}
                    disabled
                    className="h-9 rounded border-ink-300 bg-muted px-3 py-2 pl-10 text-sm leading-[21px] text-ink-950"
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                      {translateOr(t, "CORE_PROFILE_EMAIL_LABEL", "Email")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        className="h-9 rounded border-ink-300 px-3 py-2 text-sm leading-[21px] text-ink-950"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isChangingPassword ? (
              <div className="flex flex-col gap-4 border-t border-border pt-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                        {translateOr(t, "CORE_PROFILE_CURRENT_PASSWORD_LABEL", "Current Password")}
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
                        {translateOr(t, "CORE_PROFILE_NEW_PASSWORD_LABEL", "New Password")}
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
                            {showNewPassword ? (
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
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm leading-[21px] font-medium text-ink-950">
                        {translateOr(t, "CORE_PROFILE_CONFIRM_PASSWORD_LABEL", "Confirm New Password")}
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
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsChangingPassword(true)}
                className="self-start cursor-pointer text-sm font-medium text-destructive hover:underline"
              >
                {translateOr(t, "CORE_PROFILE_CHANGE_PASSWORD", "Change Password")}
              </button>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting || !canSave} className="w-fit">
              {isSubmitting
                ? translateOr(t, "CORE_PROFILE_SAVE_LOADING", "Saving...")
                : translateOr(t, "CORE_PROFILE_SAVE", "Save")}
            </Button>
          </form>
        </Form>
      </section>

      {isPasswordChangedSuccess ? (
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
