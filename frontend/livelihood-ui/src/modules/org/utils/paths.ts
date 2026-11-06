import { contextPath } from "@/shared";
import { ORG_ROUTES } from "../constants/routes";
import type { OrgType } from "../types/organisation";

export function orgPlatformsPath() {
  return `/${contextPath()}${ORG_ROUTES.platforms}`;
}

export function orgVendorsPath() {
  return `/${contextPath()}${ORG_ROUTES.vendors}`;
}

export function orgListPath(orgType: OrgType) {
  return orgType === "PLATFORM" ? orgPlatformsPath() : orgVendorsPath();
}

export function orgDetailPath(organisationId: string) {
  return `/${contextPath()}${ORG_ROUTES.organisations}/${encodeURIComponent(organisationId)}`;
}

export function orgMyOrganisationPath() {
  return `/${contextPath()}${ORG_ROUTES.myOrganisation}`;
}
