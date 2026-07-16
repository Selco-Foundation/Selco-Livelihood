import { getConfigString } from "../config/global-config";
import { apiClient } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
  tenantId: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  UserRequest?: {
    uuid?: string;
    name?: string;
    userName?: string;
    tenantId?: string;
    roles?: Array<{ code?: string; name?: string; tenantId?: string }>;
  };
}

const DEFAULT_JWT_TOKEN = "ZWdvdi11c2VyLWNsaWVudDo=";

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.append("username", payload.username);
  body.append("password", payload.password);
  body.append("tenantId", payload.tenantId);
  body.append("userType", "EMPLOYEE");
  body.append("scope", "read");
  body.append("grant_type", "password");

  const response = await apiClient.post<LoginResponse>("/user/oauth/token", body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getConfigString("JWT_TOKEN", DEFAULT_JWT_TOKEN)}`,
    },
  });

  return response.data;
}

export interface SendPasswordResetOtpPayload {
  mobileNumber: string;
  tenantId: string;
}

export async function sendPasswordResetOtp(payload: SendPasswordResetOtpPayload): Promise<void> {
  await apiClient.post(
    "/user-otp/v1/_send",
    {
      otp: {
        mobileNumber: payload.mobileNumber,
        userType: "EMPLOYEE",
        type: "passwordreset",
        tenantId: payload.tenantId,
      },
    },
    { params: { tenantId: payload.tenantId } },
  );
}

export interface ResetPasswordWithOtpPayload {
  userName: string;
  newPassword: string;
  confirmPassword: string;
  otpReference: string;
  tenantId: string;
}

export async function resetPasswordWithOtp(payload: ResetPasswordWithOtpPayload): Promise<void> {
  await apiClient.post(
    "/user/password/nologin/_update",
    { ...payload, type: "EMPLOYEE" },
    { params: { tenantId: payload.tenantId } },
  );
}

export function extractPasswordResetErrorMessage(error: unknown): string | undefined {
  const data = (
    error as {
      response?: {
        data?: {
          Errors?: Array<{ message?: string }>;
          error?: { message?: string; fields?: Array<{ message?: string }> };
        };
      };
    }
  )?.response?.data;

  return (
    (Array.isArray(data?.Errors) ? data?.Errors[0]?.message : undefined) ??
    (Array.isArray(data?.error?.fields) ? data?.error?.fields[0]?.message : undefined) ??
    data?.error?.message
  );
}
