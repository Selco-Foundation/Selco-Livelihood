import type { ActivityAuditCheckpoint, ActivityDocument, ActivityInfoCardFields, ReviewSectionContent } from "@/ui";

export interface ActivityDetail {
  /** The facility's human-readable name — not part of the shared
   * ActivityInfoCardFields (ir's info card doesn't show it), but still
   * needed to name downloaded report documents sensibly. */
  facilityName?: string;
  info: ActivityInfoCardFields;
  auditTrail: ActivityAuditCheckpoint[];
  sections: ReviewSectionContent[];
  /** Raw, unresolved documents per section id — the media (images/videos/
   * report files) for a section is only fetched when the section is
   * expanded (see hooks/use-activity-details.ts's useLoadSectionMedia). */
  sectionDocuments: Partial<Record<string, ActivityDocument[]>>;
}
