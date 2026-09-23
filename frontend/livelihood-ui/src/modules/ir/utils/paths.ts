import { contextPath } from "@/shared";
import { IR_ROUTES } from "../constants/routes";

export function irInstallationPlansPath() {
  return `/${contextPath()}${IR_ROUTES.installationPlans}`;
}

export function irActivitiesPath(planId: string) {
  return `/${contextPath()}${IR_ROUTES.installationPlans}/${planId}/activities`;
}

export function irActivityReviewPath(planId: string, activityId: string) {
  return `/${contextPath()}${IR_ROUTES.installationPlans}/${planId}/activities/${activityId}/review`;
}
