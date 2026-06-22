import axios from "axios";
import { tenantId } from "../config/global-config";
import { employeeLoginPath } from "../config/routes";
import { getViteEnv } from "../env";
import { useAuthStore } from "../stores/auth-store";
import { useJurisdictionStore } from "../stores/jurisdiction-store";

export const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  const employeeTenant = useAuthStore.getState().employeeTenantId;
  const tenant =
    employeeTenant ?? tenantId(getViteEnv("VITE_STATE_LEVEL_TENANT_ID"));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenant && !config.headers["X-Tenant-Id"]) {
    config.headers["X-Tenant-Id"] = tenant;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
      useJurisdictionStore.getState().clearJurisdiction();

      if (typeof window !== "undefined" && !window.location.pathname.includes("/employee/user/login")) {
        const returnPath = `${window.location.pathname}${window.location.search}`;
        window.location.href = `${employeeLoginPath()}?from=${encodeURIComponent(returnPath)}`;
      }
    }
    return Promise.reject(error);
  },
);
