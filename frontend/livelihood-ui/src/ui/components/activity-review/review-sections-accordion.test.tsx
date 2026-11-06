import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewSectionsAccordion } from "./review-sections-accordion";
import type {
  ActivityDocument,
  AssetSectionContent,
  ImageChecklistSectionContent,
  ReportSectionContent,
  ReviewSectionContent,
  SectionMediaPatch,
} from "./types";

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderSections(overrides: Partial<React.ComponentProps<typeof ReviewSectionsAccordion>> = {}) {
  const loadSectionMedia =
    vi.fn<(section: ReviewSectionContent, documents: ActivityDocument[]) => Promise<SectionMediaPatch>>();
  const props: React.ComponentProps<typeof ReviewSectionsAccordion> = {
    sections,
    sectionDocuments: {},
    loadSectionMedia,
    ...overrides,
  };
  const result = render(<ReviewSectionsAccordion {...props} />);
  return { ...result, loadSectionMedia };
}

function sectionTrigger(label: string) {
  return screen.getByRole("button", { name: new RegExp(label) });
}

describe("ReviewSectionsAccordion", () => {
  it("renders one accordion header per section, in the given order", () => {
    renderSections();
    const headers = screen.getAllByRole("button", { name: /Panel|Installation Completion Report|Site overview photo/ });
    const labels = headers.map((el) => el.textContent).filter(Boolean);
    expect(labels.some((text) => text?.includes("Panel"))).toBe(true);
    expect(labels.some((text) => text?.includes("Installation Completion Report"))).toBe(true);
    expect(labels.some((text) => text?.includes("Site overview photo"))).toBe(true);
  });

  it("renders no header action and no reason chips when both render props are omitted", () => {
    renderSections();
    expect(screen.queryByRole("button", { name: "Add rejection reason" })).not.toBeInTheDocument();
  });

  it("renders the given header action and reason chips per section when provided", () => {
    renderSections({
      renderHeaderAction: (section) => <button type="button">Action for {section.id}</button>,
      renderReasonChips: (section) => <span>Chips for {section.id}</span>,
    });
    expect(screen.getByRole("button", { name: "Action for PANEL" })).toBeInTheDocument();
    expect(screen.getByText("Chips for PANEL")).toBeInTheDocument();
  });

  it("shows a loading skeleton while media is being fetched for a newly expanded section, then the resolved body", async () => {
    const { promise, resolve } = deferred<SectionMediaPatch>();
    const { loadSectionMedia } = renderSections();
    loadSectionMedia.mockReturnValue(promise);

    const user = userEvent.setup();
    await user.click(sectionTrigger("Panel"));

    expect(loadSectionMedia).toHaveBeenCalledTimes(1);
    // The accordion body shows only a skeleton while media is loading — the
    // section's own content (e.g. its specifications) isn't rendered yet.
    expect(screen.queryByText("Capacity")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

    resolve({ images: [{ url: "https://example.com/p.jpg" }], videos: [] });

    await waitFor(() => expect(screen.getByText("Images")).toBeInTheDocument());
    expect(screen.getByText("Capacity")).toBeInTheDocument();
  });

  it("does not call loadSectionMedia again when a section is collapsed and re-expanded", async () => {
    const { loadSectionMedia } = renderSections();
    loadSectionMedia.mockResolvedValue({ images: [], videos: [] });

    const user = userEvent.setup();
    await user.click(sectionTrigger("Panel"));
    await waitFor(() => expect(loadSectionMedia).toHaveBeenCalledTimes(1));

    await user.click(sectionTrigger("Panel"));
    await user.click(sectionTrigger("Panel"));

    expect(loadSectionMedia).toHaveBeenCalledTimes(1);
  });

  it("shows an error banner with a Retry button when loadSectionMedia rejects, and retrying calls it again", async () => {
    const { loadSectionMedia } = renderSections();
    loadSectionMedia.mockRejectedValueOnce(new Error("network error"));
    loadSectionMedia.mockResolvedValueOnce({ images: [], videos: [] });

    const user = userEvent.setup();
    await user.click(sectionTrigger("Panel"));

    await waitFor(() => expect(screen.getByText("Couldn't load media for this section.")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(loadSectionMedia).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByText("Couldn't load media for this section.")).not.toBeInTheDocument(),
    );
  });
});
