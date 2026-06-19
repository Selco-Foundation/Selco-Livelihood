export const IM_ROUTES = {
  imRoot: "/employee/im",
  inbox: "/employee/im/inbox",
  createIncident: "/employee/im/incident/create",
} as const;

export const ORDERED_INBOX_STATUSES = [
  {
    code: "PENDINGFORASSIGNMENT",
    statuses: [
      "PENDINGFORASSIGNMENT",
      "PENDINGFORASSIGNMENT_THEFT",
      "PENDINGFORASSIGNMENT_RMS_DEVICE",
    ],
  },
  {
    code: "PENDINGRESOLUTION",
    statuses: ["PENDINGRESOLUTION", "PENDING_REVISION", "RMS_DEVICE_PENDINGRESOLUTION"],
  },
  { code: "RESOLVED", statuses: ["RESOLVED"] },
  { code: "CLOSEDAFTERRESOLUTION", statuses: ["CLOSEDAFTERRESOLUTION"] },
  { code: "REJECTED", statuses: ["REJECTED"] },
  { code: "CLOSEDAFTERREJECTION", statuses: ["CLOSEDAFTERREJECTION"] },
  {
    code: "PENDING_ASSIGNMENT_SPARE_PART_NEEDED",
    statuses: ["PENDING_ASSIGNMENT_SPARE_PART_NEEDED"],
  },
  {
    code: "PENDING_ASSIGNMENT_OUT_OF_WARRANTY",
    statuses: ["PENDING_ASSIGNMENT_OUT_OF_WARRANTY"],
  },
  {
    code: "PENDING_RESOLUTION_SPARE_PART_NEEDED",
    statuses: ["PENDING_RESOLUTION_SPARE_PART_NEEDED"],
  },
  {
    code: "PENDING_RESOLUTION_OUT_OF_WARRANTY",
    statuses: ["PENDING_RESOLUTION_OUT_OF_WARRANTY"],
  },
  {
    code: "OUT_OF_WARRANTY_PENDING_TECH_POC",
    statuses: [
      "OUT_OF_WARRANTY_PENDING_TECH_POC",
      "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2",
    ],
  },
] as const;
