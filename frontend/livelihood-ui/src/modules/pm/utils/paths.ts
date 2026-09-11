import { contextPath } from "@/shared";
import { PM_ROUTES } from "../constants/routes";

export function pmMyProjectsPath() {
  return `/${contextPath()}${PM_ROUTES.myProjects}`;
}

export function pmCreateProjectPath() {
  return `/${contextPath()}${PM_ROUTES.createProject}`;
}

export function pmProjectDetailsPath() {
  return `/${contextPath()}${PM_ROUTES.projectDetails}`;
}

export function pmCreateInstallationPlanPath() {
  return `/${contextPath()}${PM_ROUTES.createInstallationPlan}`;
}
