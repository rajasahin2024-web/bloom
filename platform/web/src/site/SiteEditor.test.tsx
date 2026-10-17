import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("./useMediaUpload", () => ({
  useMediaUpload: () => vi.fn().mockResolvedValue("https://cdn.test/img.png"),
}));

import { SiteEditor } from "./SiteEditor";
import type { SiteSection } from "./sections/types";

const heroSection: SiteSection = {
  id: "s1",
  label: "Hero",
  type: "hero",
  enabled: true,
  animation: null,
  props: {
    badge: "Old badge",
    headline: "Old headline",
    subhead: "Old subhead",
    primary_btn: { label: "Start", href: "/start" },
    secondary_btn: { label: "See", href: "/see" },
    stats_line: { students: "100", band_gain: "+1", reach_pct: "90%" },
    avatars: [],
  },
};

const statsSection: SiteSection = {
  id: "s2",
  label: "Stats",
  type: "stats_strip",
  enabled: true,
  animation: null,
  props: {
    items: [
      { label: "Students", value: "100", prefix: "", suffix: "" },
      { label: "Countries", value: "34", prefix: "", suffix: "" },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SiteEditor", () => {
  it("renders the form for the section type", () => {
    render(
      <SiteEditor
        section={heroSection}
        token="tok"
        onSave={vi.fn()}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Hero")).toBeTruthy();
    expect(screen.getByDisplayValue("Old badge")).toBeTruthy();
    expect(screen.getByDisplayValue("Old headline")).toBeTruthy();
  });

  it("editing a field updates the draft and save calls onSave", async () => {
    const onSave = vi.fn();
    render(
      <SiteEditor
        section={heroSection}
        token="tok"
        onSave={onSave}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByDisplayValue("Old badge");
    fireEvent.change(input, { target: { value: "New badge" } });

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    const saved = onSave.mock.calls[0][0] as SiteSection;
    expect(saved.props.badge).toBe("New badge");
    expect(saved.id).toBe("s1");
  });

  it("delete calls onDelete", () => {
    const onDelete = vi.fn();
    render(
      <SiteEditor
        section={heroSection}
        token="tok"
        onSave={vi.fn()}
        onClose={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Delete section"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("add/remove card in a list field works", async () => {
    const onSave = vi.fn();
    render(
      <SiteEditor
        section={statsSection}
        token="tok"
        onSave={onSave}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Students")).toBeTruthy();
    expect(screen.getByDisplayValue("100")).toBeTruthy();

    const addBtn = screen.getByText("+ Add item");
    fireEvent.click(addBtn);

    expect(screen.getAllByDisplayValue("").length).toBeGreaterThan(0);

    const removeBtns = screen.getAllByText("✕");
    fireEvent.click(removeBtns[0]);

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });
    const saved = onSave.mock.calls[0][0] as SiteSection;
    // started with 2, added 1 (→3), removed 1 (→2)
    expect(saved.props.items).toHaveLength(2);
  });

  it("close calls onClose", () => {
    const onClose = vi.fn();
    render(
      <SiteEditor
        section={heroSection}
        token="tok"
        onSave={vi.fn()}
        onClose={onClose}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
