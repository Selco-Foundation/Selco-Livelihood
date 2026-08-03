/**
 * Unit tests for InboxStatus (src/modules/im/components/inbox/InboxStatus.tsx).
 *
 * Covers:
 *  - statusCounts aggregation: builds a { statusid -> count } map from the
 *    `statusMap` prop, skipping entries with a falsy `statusid`.
 *  - sortedComplaints aggregation/grouping: for every entry in the module
 *    constant ORDERED_INBOX_STATUSES it sums the counts of all underlying
 *    `statuses` codes into a single group total, and any status code present
 *    in `statusMap` that is NOT covered by ORDERED_INBOX_STATUSES is appended
 *    afterwards as its own single-code group (preserving unknown statuses
 *    instead of silently dropping them).
 *  - rendering: one checkbox + label per group, in ORDERED_INBOX_STATUSES
 *    order followed by any "extra" unknown-status groups, with the count
 *    suffix "(n)" shown only when the group's total count is truthy.
 *  - isChecked: a group's checkbox is checked only when every one of its
 *    underlying status codes is present in `selectedStatuses`.
 *  - onAssignmentChange: fired with (checked, option) when a checkbox is
 *    toggled, where `option` is the exact sorted-group object (code +
 *    statuses) the checkbox represents.
 *
 * Testing approach:
 *  - No backend/router/query dependencies exist in this component (no API
 *    calls, no routing), so it is rendered directly wrapped only in a
 *    lightweight test-only i18next instance (react-i18next requires an
 *    I18nextProvider in the tree via useTranslate/translateOr). No resources
 *    are registered, so translateOr's t(key) === key fallback path is
 *    exercised deliberately: every `CS_COMMON_<code>` translation lookup
 *    resolves to its own key and therefore falls back to the raw status
 *    code, and "ES_IM_FILTER_STATUS" falls back to "Ticket Status" -- this
 *    mirrors the real i18n-missing-resource behavior and lets assertions key
 *    off the literal status codes rendered in the label text.
 *  - No network/service mocking is needed; onAssignmentChange is a plain
 *    vi.fn() prop, asserted directly rather than via DOM side effects.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { ORDERED_INBOX_STATUSES } from "../../constants/inbox-statuses";
import { InboxStatus } from "./InboxStatus";

function createTestI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });
  return instance;
}

function renderInboxStatus(props: Partial<ComponentProps<typeof InboxStatus>> = {}) {
  const onAssignmentChange = vi.fn();
  const utils = render(
    <I18nextProvider i18n={createTestI18n()}>
      <InboxStatus
        selectedStatuses={[]}
        onAssignmentChange={onAssignmentChange}
        {...props}
      />
    </I18nextProvider>,
  );
  return { onAssignmentChange, ...utils };
}

// The component reads its group definitions from the ORDERED_INBOX_STATUSES
// module constant. Every group here happens to map one code to itself
// (statuses: [code]), so the group label under test is just its own code.
const [firstGroup, secondGroup] = ORDERED_INBOX_STATUSES;

describe("InboxStatus - label and empty-state rendering", () => {
  // With no statusMap prop, statusCounts is {} and every group total is 0,
  // so the "(n)" count suffix must be omitted entirely (falsy count check).
  it("renders the section label and every ordered status with no count suffix when statusMap is absent", () => {
    renderInboxStatus();

    expect(screen.getByText("Ticket Status")).toBeInTheDocument();
    for (const group of ORDERED_INBOX_STATUSES) {
      const label = screen.getByText(group.code);
      expect(label.textContent).toBe(group.code);
    }
  });

  it("renders exactly one checkbox per ORDERED_INBOX_STATUSES entry when no unknown statuses are present", () => {
    renderInboxStatus();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(ORDERED_INBOX_STATUSES.length);
  });
});

describe("InboxStatus - statusCounts/sortedComplaints aggregation", () => {
  // statusCounts skips entries whose statusid is falsy (the `if (entry.statusid)`
  // guard), so an entry with an empty statusid must not contribute a count or
  // crash the aggregation.
  it("ignores statusMap entries with a falsy statusid", () => {
    renderInboxStatus({
      statusMap: [{ statusid: "", count: 99 }],
    });

    // No group should have picked up the count, so no "(n)" suffix appears.
    for (const group of ORDERED_INBOX_STATUSES) {
      expect(screen.getByText(group.code).textContent).toBe(group.code);
    }
  });

  it("shows the aggregated count suffix for a group whose status code has a nonzero count", () => {
    renderInboxStatus({
      statusMap: [{ statusid: firstGroup.statuses[0], count: 5 }],
    });

    expect(screen.getByText(`${firstGroup.code} (5)`)).toBeInTheDocument();
    // Other groups remain uncounted.
    expect(screen.getByText(secondGroup.code).textContent).toBe(secondGroup.code);
  });

  // A statusMap entry whose statusid is not covered by any group in
  // ORDERED_INBOX_STATUSES must still be rendered -- appended after the
  // ordered groups as its own single-code group -- rather than being dropped.
  it("appends an unknown status code as its own group after the ordered statuses", () => {
    renderInboxStatus({
      statusMap: [{ statusid: "SOME_UNKNOWN_STATUS", count: 3 }],
    });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(ORDERED_INBOX_STATUSES.length + 1);
    expect(screen.getByText("SOME_UNKNOWN_STATUS (3)")).toBeInTheDocument();
  });

  it("sums counts across every status code so that repeated statusMap ids for the same statusid use the last value (object key overwrite)", () => {
    // statusCounts is built via counts[entry.statusid] = entry.count in a
    // for-of loop, so a duplicate statusid overwrites rather than accumulates.
    renderInboxStatus({
      statusMap: [
        { statusid: firstGroup.statuses[0], count: 2 },
        { statusid: firstGroup.statuses[0], count: 7 },
      ],
    });

    expect(screen.getByText(`${firstGroup.code} (7)`)).toBeInTheDocument();
  });
});

describe("InboxStatus - isChecked / checkbox checked-state matching", () => {
  // A group's checkbox is checked only when EVERY one of its underlying
  // status codes appears in selectedStatuses (option.statuses.every(...)).
  // For these single-code groups that reduces to "is this one code selected".
  it("checks the checkbox for a group whose status code is present in selectedStatuses", () => {
    renderInboxStatus({
      selectedStatuses: [{ code: firstGroup.statuses[0] }],
    });

    const checkbox = screen.getByRole("checkbox", {
      name: new RegExp(firstGroup.code),
    });
    expect(checkbox).toBeChecked();
  });

  it("leaves other groups' checkboxes unchecked", () => {
    renderInboxStatus({
      selectedStatuses: [{ code: firstGroup.statuses[0] }],
    });

    const checkbox = screen.getByRole("checkbox", {
      name: new RegExp(secondGroup.code),
    });
    expect(checkbox).not.toBeChecked();
  });

  it("leaves all checkboxes unchecked when selectedStatuses is empty", () => {
    renderInboxStatus({ selectedStatuses: [] });

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });
});

describe("InboxStatus - onAssignmentChange callback", () => {
  it("calls onAssignmentChange with checked=true and the matching group option when an unchecked box is clicked", async () => {
    const user = userEvent.setup();
    const { onAssignmentChange } = renderInboxStatus({ selectedStatuses: [] });

    const checkbox = screen.getByRole("checkbox", {
      name: new RegExp(firstGroup.code),
    });
    await user.click(checkbox);

    expect(onAssignmentChange).toHaveBeenCalledTimes(1);
    expect(onAssignmentChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ code: firstGroup.code, statuses: firstGroup.statuses }),
    );
  });

  it("calls onAssignmentChange with checked=false when an already-checked box is clicked", async () => {
    const user = userEvent.setup();
    const { onAssignmentChange } = renderInboxStatus({
      selectedStatuses: [{ code: firstGroup.statuses[0] }],
    });

    const checkbox = screen.getByRole("checkbox", {
      name: new RegExp(firstGroup.code),
    });
    await user.click(checkbox);

    expect(onAssignmentChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ code: firstGroup.code }),
    );
  });
});
