import { contextPath } from "@/shared";
import { EU_ROUTES } from "../constants/routes";

export function euFacilitiesPath() {
  return `/${contextPath()}${EU_ROUTES.facilities}`;
}

export function euFacilityDetailPath(facilityId: string) {
  return `/${contextPath()}${EU_ROUTES.facilities}/${encodeURIComponent(facilityId)}`;
}

export function euActivityDetailPath(facilityId: string, activityId: string) {
  return `${euFacilityDetailPath(facilityId)}/activities/${encodeURIComponent(activityId)}`;
}

export function euFacilitiesBulkAddPath() {
  return `/${contextPath()}${EU_ROUTES.facilitiesBulkAdd}`;
}

export function euBoundariesPath() {
  return `/${contextPath()}${EU_ROUTES.boundaries}`;
}

export function euBoundaryUploadPath() {
  return `/${contextPath()}${EU_ROUTES.boundaryUpload}`;
}
