import { contextPath } from "@/shared";
import { EU_ROUTES } from "../constants/routes";

export function euFacilitiesPath() {
  return `/${contextPath()}${EU_ROUTES.facilities}`;
}

export function euBoundariesPath() {
  return `/${contextPath()}${EU_ROUTES.boundaries}`;
}

export function euBoundaryUploadPath() {
  return `/${contextPath()}${EU_ROUTES.boundaryUpload}`;
}
