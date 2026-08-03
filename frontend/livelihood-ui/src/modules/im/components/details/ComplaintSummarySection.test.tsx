/**
 * Unit tests for ComplaintSummarySection.
 *
 * Covers the single exported component `ComplaintSummarySection`, a purely
 * presentational component that renders a `FormSectionCard` (title "Ticket
 * Details") containing a `<dl>` with one label/value pair per entry in
 * `complaintDetails.rows`. For each row it renders:
 *   - a `<dt>` from `translateOr(t, row.labelKey, row.labelKey)` (falls back
 *     to the raw label key when no translation exists), and
 *   - a `<dd>` from `translateDetailValue(row.value, t)`, which is itself
 *     `translateOr(t, value, value)` (falls back to the raw value when no
 *     translation exists).
 *
 * Testing approach: the component only reads `complaintDetails` props and
 * calls `useTranslate()` (react-i18next's `useTranslation` under the hood),
 * so no router, query client, or API mocking is needed. We wrap renders in a
 * lightweight test-only i18next instance (same pattern as
 * ComplaintTimelineSection.test.tsx) so we can exercise both branches of the
 * translate-or-fallback behavior: supplying a translation resource proves the
 * translated string is used, and omitting one proves the raw key/value is
 * rendered verbatim as a fallback.
 */
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import type { ComplaintDetailsData, ComplaintDetailsRow } from "../../types/incident-details";
import { ComplaintSummarySection } from "./ComplaintSummarySection";

function createTestI18n(resources: Record<string, string> = {}) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: resources } },
    react: { useSuspense: false },
  });
  return instance;
}

function buildComplaintDetails(rows: ComplaintDetailsRow[]): ComplaintDetailsData {
  return {
    incidentId: "INC-1",
    tenantId: "livelihood",
    rows,
    incident: {
      tenantId: "livelihood",
      incidentId: "INC-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "streetlight",
      incidentSubType: "not-working",
    },
    workflow: {},
    images: [],
    videos: [],
    thumbnails: [],
  };
}

function renderSection(rows: ComplaintDetailsRow[], resources: Record<string, string> = {}) {
  return render(
    <I18nextProvider i18n={createTestI18n(resources)}>
      <ComplaintSummarySection complaintDetails={buildComplaintDetails(rows)} />
    </I18nextProvider>,
  );
}

// ComplaintSummarySection: renders a FormSectionCard titled "Ticket Details"
// wrapping a <dl> with one <dt>/<dd> pair per row in complaintDetails.rows.
// It expects `complaintDetails.rows` to be an array of { labelKey, value }
// pairs; it does not read any other field off complaintDetails.
describe("ComplaintSummarySection", () => {
  it("renders the section title, falling back to the English default when no translation resource exists", () => {
    // No "CS_HEADER_TICKET_DETAILS" resource is registered, so translateOr
    // must fall back to the hardcoded default "Ticket Details" rather than
    // rendering the raw translation key.
    renderSection([]);
    expect(screen.getByRole("heading", { name: "Ticket Details" })).toBeInTheDocument();
  });

  it("uses the translated title when a matching i18n resource is registered", () => {
    renderSection([], { CS_HEADER_TICKET_DETAILS: "Detalles del ticket" });
    expect(screen.getByRole("heading", { name: "Detalles del ticket" })).toBeInTheDocument();
    expect(screen.queryByText("Ticket Details")).not.toBeInTheDocument();
  });

  it("renders one label/value pair per row, in order", () => {
    renderSection([
      { labelKey: "CS_COMPLAINT_DETAILS_TICKET_NO", value: "INC-1" },
      { labelKey: "CS_ADDCOMPLAINT_BLOCK", value: "Block A" },
    ]);

    // Both label keys have no translation registered, so translateOr falls
    // back to rendering the raw label key text as the <dt>.
    expect(screen.getByText("CS_COMPLAINT_DETAILS_TICKET_NO")).toBeInTheDocument();
    expect(screen.getByText("INC-1")).toBeInTheDocument();
    expect(screen.getByText("CS_ADDCOMPLAINT_BLOCK")).toBeInTheDocument();
    expect(screen.getByText("Block A")).toBeInTheDocument();
  });

  it("translates the label and the value independently when resources exist for each", () => {
    // The label key and the value are looked up as two separate translation
    // keys (translateDetailValue re-runs translateOr on `row.value`), so a
    // translated application-status value like "CS_COMMON_PENDING" must not
    // affect whether its sibling label key gets translated, and vice versa.
    renderSection(
      [{ labelKey: "CS_COMPLAINT_DETAILS_APPLICATION_STATUS", value: "CS_COMMON_PENDING" }],
      {
        CS_COMPLAINT_DETAILS_APPLICATION_STATUS: "Application Status",
        CS_COMMON_PENDING: "Pending",
      },
    );

    expect(screen.getByText("Application Status")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("CS_COMPLAINT_DETAILS_APPLICATION_STATUS")).not.toBeInTheDocument();
    expect(screen.queryByText("CS_COMMON_PENDING")).not.toBeInTheDocument();
  });

  it("falls back to rendering the raw value verbatim when the value has no translation (e.g. a ticket number or '-' placeholder)", () => {
    renderSection([{ labelKey: "CS_ADDCOMPLAINT_DISTRICT", value: "-" }]);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders an empty definition list without throwing when there are no rows", () => {
    const { container } = renderSection([]);
    const dl = container.querySelector("dl");
    expect(dl).toBeInTheDocument();
    expect(dl?.children).toHaveLength(0);
  });
});
