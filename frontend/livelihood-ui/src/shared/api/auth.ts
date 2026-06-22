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
