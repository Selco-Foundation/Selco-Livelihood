import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActivityDocument,
  AssetSectionContent,
  ImageChecklistSectionContent,
  ReportSectionContent,
  ReviewSectionContent,
  SectionMediaPatch,
} from "@/ui";
import type { SectionRejectionReasons } from "../../types/activity-review";
import { ReviewSections } from "./ReviewSections";

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

const panelSection: AssetSectionContent = {
  kind: "ASSET",
  id: "PANEL",
  labelKey: "ES_IR_PANEL",
  label: "Panel",
  specifications: [{ labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: "5kW" }],
  images: [],
  videos: [],
};

const reportSection: ReportSectionContent = {
  kind: "REPORT",
  id: "INSTALLATION_COMPLETION_REPORT",
  labelKey: "ES_IR_REPORT",
  label: "Installation Completion Report",
  report: null,
  supportingDocuments: [],
};

const imageChecklistSection: ImageChecklistSectionContent = {
  kind: "IMAGE_CHECKLIST",
  id: "SITE_PHOTO",
  label: "Site overview photo",
  images: [],
};

const sections: ReviewSectionContent[] = [panelSection, reportSection, imageChecklistSection];

function renderSections(overrides: Partial<React.ComponentProps<typeof ReviewSections>> = {}) {
  const loadSectionMedia =
    vi.fn<(section: ReviewSectionContent, documents: ActivityDocument[]) => Promise<SectionMediaPatch>>();
  const onAddReason = vi.fn();
  const onEditReason = vi.fn();
  const onRemoveReason = vi.fn();
  const props: React.ComponentProps<typeof ReviewSections> = {
    sections,
    sectionDocuments: {},
    loadSectionMedia,
    reasonOptions: [
      { code: "DAMAGED", name: "Damaged" },
      { code: "OTHER", name: "Other" },
    ],
    rejectionReasons: {} as SectionRejectionReasons,
    canEditReasons: true,
    onAddReason,
    onEditReason,
    onRemoveReason,
    ...overrides,
  };
  const result = render(<ReviewSections {...props} />);
  return { ...result, loadSectionMedia, onAddReason, onEditReason, onRemoveReason };
}

describe("ReviewSections", () => {
  it("renders one accordion header per section via the shared ReviewSectionsAccordion", () => {
    renderSections();
    const headers = screen.getAllByRole("button", { name: /Panel|Installation Completion Report|Site overview photo/ });
    const labels = headers.map((el) => el.textContent).filter(Boolean);
    expect(labels.some((text) => text?.includes("Panel"))).toBe(true);
    expect(labels.some((text) => text?.includes("Installation Completion Report"))).toBe(true);
    expect(labels.some((text) => text?.includes("Site overview photo"))).toBe(true);
  });

  it("renders no Add rejection reason button when canEditReasons is false", () => {
    renderSections({ canEditReasons: false });
    expect(screen.queryByRole("button", { name: "Add rejection reason" })).not.toBeInTheDocument();
  });

  it("renders an Add rejection reason button per section when canEditReasons is true", () => {
    renderSections({ canEditReasons: true });
    expect(screen.getAllByRole("button", { name: "Add rejection reason" })).toHaveLength(3);
  });

  it("renders existing reason chips for a section, editable when canEditReasons is true", () => {
    renderSections({
      rejectionReasons: {
        PANEL: [{ id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "Cracked panel" }],
      },
    });
    expect(screen.getByText("Damaged — Cracked panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove reason" })).toBeInTheDocument();
  });

  it("renders reason chips read-only, with no remove control, when canEditReasons is false", () => {
    renderSections({
      canEditReasons: false,
      rejectionReasons: {
        PANEL: [{ id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "Cracked panel" }],
      },
    });
    expect(screen.getByText("Damaged — Cracked panel")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove reason" })).not.toBeInTheDocument();
  });

  it("calls onRemoveReason with the section id and reason id when a chip's remove control is clicked", async () => {
    const user = userEvent.setup();
    const { onRemoveReason } = renderSections({
      rejectionReasons: {
        PANEL: [{ id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "" }],
      },
    });

    await user.click(screen.getByRole("button", { name: "Remove reason" }));

    expect(onRemoveReason).toHaveBeenCalledWith("PANEL", "r1");
  });

  it("opens the rejection reason dialog for the clicked section and calls onAddReason with its section id on submit", async () => {
    const user = userEvent.setup();
    const { onAddReason } = renderSections();

    const addButtons = screen.getAllByRole("button", { name: "Add rejection reason" });
    await user.click(addButtons[0]); // Panel section's own button

    expect(screen.getByRole("heading", { name: "Add rejection reason" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Damaged" }));
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onAddReason).toHaveBeenCalledWith("PANEL", {
      reasonCode: "DAMAGED",
      reasonLabel: "Damaged",
      comment: "",
    });
  });

  it("excludes a reason code already used elsewhere in the section from the dialog's options", async () => {
    const user = userEvent.setup();
    renderSections({
      rejectionReasons: {
        PANEL: [{ id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "" }],
      },
    });

    const addButtons = screen.getAllByRole("button", { name: "Add rejection reason" });
    await user.click(addButtons[0]);
    await user.click(screen.getByRole("combobox"));

    expect(screen.queryByRole("option", { name: "Damaged" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Other" })).toBeInTheDocument();
  });

  it("keeps the reason being edited selectable as itself, opening prefilled from its chip", async () => {
    const user = userEvent.setup();
    const { onEditReason } = renderSections({
      rejectionReasons: {
        PANEL: [{ id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "Old comment" }],
      },
    });

    await user.click(screen.getByText("Damaged — Old comment"));

    expect(screen.getByText("Edit rejection reason")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Damaged");
    expect(screen.getByDisplayValue("Old comment")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Add details for this reason"));
    await user.type(screen.getByPlaceholderText("Add details for this reason"), "New comment");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onEditReason).toHaveBeenCalledWith("PANEL", "r1", {
      reasonCode: "DAMAGED",
      reasonLabel: "Damaged",
      comment: "New comment",
    });
  });

  it("calls onRemoveReason when Delete is clicked from within the edit dialog", async () => {
    const user = userEvent.setup();
    const { onRemoveReason } = renderSections({
      rejectionReasons: {
        PANEL: [{ id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "" }],
      },
    });

    await user.click(screen.getByText("Damaged"));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onRemoveReason).toHaveBeenCalledWith("PANEL", "r1");
  });
});
