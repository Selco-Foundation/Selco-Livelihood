/**
 * Unit tests for the Avatar component family
 * (src/ui/components/ui/avatar.tsx).
 *
 * The file wraps Radix's `radix-ui` Avatar primitive (`Avatar`, `AvatarImage`,
 * `AvatarFallback`) and adds three purely-presentational siblings
 * (`AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`). Every export follows the
 * same shape: a thin function that sets a `data-slot` (and, for `Avatar`
 * only, a `data-size`) attribute, merges a base Tailwind class string with the
 * caller's `className` via `cn()` (clsx + tailwind-merge), and spreads the
 * remaining props onto the underlying element/primitive.
 *
 * Behaviors/branches verified:
 *  - `Avatar`: default `data-size="default"`, `size="sm"`/`size="lg"` set the
 *    matching `data-size` attribute (this is the one piece of real branching
 *    logic in the file -- everything else is static-string composition), and
 *    a caller className that conflicts with a base utility (e.g. `size-*`)
 *    wins via tailwind-merge rather than being appended alongside it.
 *  - `AvatarImage` / `AvatarFallback`: Radix's real (not mocked-away) loading
 *    state machine -- the fallback renders while the image has not yet
 *    loaded, the image renders (and the fallback disappears) once loading
 *    succeeds, and the fallback stays put (image absent) if loading errors.
 *  - `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`: `data-slot`, base
 *    classes, children, and className-merge passthrough.
 *
 * Mocking strategy: no provider wrapper is used -- Avatar is a stateless
 * presentational component with no i18n, routing, or query-client
 * dependency, so plain RTL `render`/`screen` is enough (matching the
 * convention already used for SplitButton).
 *
 * The one real mock is `window.Image`: Radix's `AvatarImage` creates its own
 * `new window.Image()` internally and drives `AvatarFallback`'s visibility
 * off that image's `load`/`error` events via shared context -- jsdom never
 * fires those events on its own (it doesn't fetch/decode images), so without
 * a controllable stand-in the image branch could never be exercised and
 * would stay permanently "loading". `MockImage` implements just enough of
 * the `Image` surface (`src` setter/getter, `addEventListener`/
 * `removeEventListener`) for Radix's `useImageLoadingStatus` hook to work,
 * plus an `emit` helper the tests use to fire `load`/`error` deliberately.
 */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";

class MockImage {
  static instances: MockImage[] = [];
  complete = false;
  naturalWidth = 0;
  private _src = "";
  private listeners: Partial<Record<"load" | "error", Array<() => void>>> = {};

  constructor() {
    MockImage.instances.push(this);
  }

  set src(value: string) {
    this._src = value;
  }
  get src() {
    return this._src;
  }

  addEventListener(type: "load" | "error", cb: () => void) {
    (this.listeners[type] ??= []).push(cb);
  }
  removeEventListener(type: "load" | "error", cb: () => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== cb);
  }

  /** Test helper: simulate the browser firing a load/error event on this image. */
  emit(type: "load" | "error") {
    if (type === "load") {
      this.complete = true;
      this.naturalWidth = 100;
    }
    this.listeners[type]?.forEach((cb) => cb());
  }
}

const OriginalImage = window.Image;

beforeEach(() => {
  MockImage.instances = [];
  window.Image = MockImage as unknown as typeof window.Image;
});

afterEach(() => {
  window.Image = OriginalImage;
});

// Avatar is the Root primitive: it sets data-slot="avatar", mirrors the
// `size` prop ("default" | "sm" | "lg", default "default") onto a
// `data-size` attribute that its Tailwind classes and sibling components
// (AvatarBadge/Fallback) key off via `group-data-[size=...]/avatar`
// selectors, and merges `className` with its base sizing classes.
describe("Avatar", () => {
  it("renders with data-slot='avatar' and data-size='default' when size is omitted", () => {
    const { container } = render(<Avatar />);

    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-size", "default");
    expect(avatar).toHaveClass("size-8", "rounded-full");
  });

  it("sets data-size='sm' when size='sm' is passed", () => {
    const { container } = render(<Avatar size="sm" />);

    expect(container.querySelector('[data-slot="avatar"]')).toHaveAttribute("data-size", "sm");
  });

  it("sets data-size='lg' when size='lg' is passed", () => {
    const { container } = render(<Avatar size="lg" />);

    expect(container.querySelector('[data-slot="avatar"]')).toHaveAttribute("data-size", "lg");
  });

  // Business rule under test: className is merged via tailwind-merge, not
  // just appended -- a caller-supplied utility from the same group (`size-*`)
  // must replace the component's default `size-8`, not sit alongside it.
  it("lets a conflicting className override the default size utility via tailwind-merge", () => {
    const { container } = render(<Avatar className="size-16" />);

    const avatar = container.querySelector('[data-slot="avatar"]');
    expect(avatar).toHaveClass("size-16");
    expect(avatar).not.toHaveClass("size-8");
  });
});

// AvatarImage/AvatarFallback share Radix's imageLoadingStatus context:
// AvatarImage only renders an <img> once the underlying image's load status
// becomes "loaded"; AvatarFallback renders its children whenever that status
// is anything other than "loaded" (immediately, since no delayMs is passed
// through this wrapper). Together they require an Avatar ancestor to share
// context, and a real load/error event on the mocked Image to move status
// out of the initial "loading" state.
describe("AvatarImage and AvatarFallback", () => {
  it("shows the fallback and renders no image before the image has loaded", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/jane.png" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.queryByAltText("Jane Doe")).not.toBeInTheDocument();
  });

  it("renders the image and hides the fallback once the image finishes loading", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/jane.png" alt="Jane Doe" className="custom-img" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    // Fire the load event on the Image instance Radix created internally --
    // this is what flips the shared imageLoadingStatus context to "loaded".
    act(() => {
      MockImage.instances[0].emit("load");
    });

    const image = screen.getByAltText("Jane Doe");
    expect(image).toHaveAttribute("data-slot", "avatar-image");
    expect(image).toHaveClass("custom-img", "aspect-square");
    expect(screen.queryByText("JD")).not.toBeInTheDocument();
  });

  it("keeps showing the fallback (and never renders the image) if loading errors", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/broken.png" alt="Broken" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    act(() => {
      MockImage.instances[0].emit("error");
    });

    expect(screen.getByText("JD")).toBeInTheDocument();
    expect(screen.queryByAltText("Broken")).not.toBeInTheDocument();
  });
});

// AvatarBadge is a plain <span> (no Radix primitive involved): data-slot,
// base positioning/color classes, className merge, and children passthrough.
describe("AvatarBadge", () => {
  it("renders children with data-slot='avatar-badge' and the base classes", () => {
    render(<AvatarBadge data-testid="badge">•</AvatarBadge>);

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("data-slot", "avatar-badge");
    expect(badge).toHaveTextContent("•");
    expect(badge).toHaveClass("absolute", "bg-primary");
  });

  it("lets a conflicting className override the default background color", () => {
    render(
      <AvatarBadge data-testid="badge" className="bg-red-500">
        •
      </AvatarBadge>,
    );

    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("bg-red-500");
    expect(badge).not.toHaveClass("bg-primary");
  });
});

// AvatarGroup is a plain <div> wrapper meant to contain multiple Avatars,
// applying the negative-space overlap layout and a ring around each child
// avatar via a `*:data-[slot=avatar]:` arbitrary variant.
describe("AvatarGroup", () => {
  it("renders with data-slot='avatar-group' and its Avatar children", () => {
    render(
      <AvatarGroup data-testid="group">
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </AvatarGroup>,
    );

    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("data-slot", "avatar-group");
    expect(group).toHaveClass("flex", "-space-x-2");
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("merges a custom className with the base layout classes", () => {
    render(<AvatarGroup data-testid="group" className="gap-1" />);

    const group = screen.getByTestId("group");
    expect(group).toHaveClass("gap-1", "flex");
  });
});

// AvatarGroupCount is the "+N" overflow indicator shown at the end of an
// AvatarGroup: a plain <div> with data-slot, base sizing/color classes, and
// className merge, same as AvatarBadge.
describe("AvatarGroupCount", () => {
  it("renders its count text with data-slot='avatar-group-count' and base classes", () => {
    render(<AvatarGroupCount data-testid="count">+3</AvatarGroupCount>);

    const count = screen.getByTestId("count");
    expect(count).toHaveAttribute("data-slot", "avatar-group-count");
    expect(count).toHaveTextContent("+3");
    expect(count).toHaveClass("rounded-full", "bg-muted");
  });

  it("lets a conflicting className override the default background color", () => {
    render(
      <AvatarGroupCount data-testid="count" className="bg-red-500">
        +3
      </AvatarGroupCount>,
    );

    const count = screen.getByTestId("count");
    expect(count).toHaveClass("bg-red-500");
    expect(count).not.toHaveClass("bg-muted");
  });
});
