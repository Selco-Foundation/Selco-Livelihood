import { contextPath } from "@/shared";
import { IR_ROUTES } from "../constants/routes";

export function irInstallationPlansPath() {
  return `/${contextPath()}${IR_ROUTES.installationPlans}`;
}

export function irFacilityEntriesPath(planId: string) {
  return `/${contextPath()}${IR_ROUTES.facilityEntries}/${planId}`;
}

export function irFacilityReviewPath(planId: string, entryId: string) {
  return `/${contextPath()}${IR_ROUTES.facilityReview}/${planId}/${entryId}`;
}
