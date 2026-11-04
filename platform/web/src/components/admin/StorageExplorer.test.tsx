/**
 * StorageExplorer — full-screen explorer overlay (TEC-175). API calls are
 * mocked at the @/lib/storage boundary; the share flow additionally stubs
 * the clipboard so the generated link can be asserted end-to-end.
 *
 * Covers the issue's test asks: context-menu actions (rename, folder
 * delete with "contains N objects"), the share-link flow (TTL → generate
 * → copy), and the text-edit save path (GET content → textarea → PUT).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    fetchStorageObjects: vi.fn(),
    mkdirStorageObject: vi.fn(),
    renameStorageObject: vi.fn(),
    deleteStorageObject: vi.fn(),
    fetchStorageObjectContent: vi.fn(),
    putStorageObjectContent: vi.fn(),
    shareStorageObject: vi.fn(),
    fetchStorageObjectBlob: vi.fn(),
    uploadStorageObject: vi.fn(),
  };
});

import {
  deleteStorageObject,
  fetchStorageObjectContent,
  fetchStorageObjects,
  putStorageObjectContent,
  renameStorageObject,
  shareStorageObject,
} from "@/lib/storage";
import { StorageExplorer } from "./StorageExplorer";

const listMock = vi.mocked(fetchStorageObjects);
const renameMock = vi.mocked(renameStorageObject);
const deleteMock = vi.mocked(deleteStorageObject);
const contentMock = vi.mocked(fetchStorageObjectContent);
const putContentMock = vi.mocked(putStorageObjectContent);
const shareMock = vi.mocked(shareStorageObject);

const ROOT_PAGE = {
  folders: ["docs/"],
  objects: [
    {
      key: "notes.txt",
      size: 128,
      last_modified: "2026-11-01T10:00:00Z",
    },
    {
      key: "photo.png",
      size: 4096,
      last_modified: "2026-11-02T10:00:00Z",
    },
  ],
  next_token: null,
  truncated: false,
};

function renderExplorer(onClose = vi.fn()) {
  const utils = render(
    <StorageExplorer token="tok" bucket="bloom-media" onClose={onClose} />,
  );
  return { onClose, ...utils };
}

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue(ROOT_PAGE);
  renameMock.mockResolvedValue({ key: "renamed.txt" });
  deleteMock.mockResolvedValue(undefined);
  contentMock.mockResolvedValue({
    content: "line one\nline two",
    mime: "text/plain",
    size: 17,
    truncated: false,
  });
  putContentMock.mockResolvedValue({ key: "notes.txt", size: 20 });
  shareMock.mockResolvedValue({
    url: "https://r2.example.com/signed/notes.txt?sig=abc",
    expires_at: "2026-11-11T12:00:00Z",
  });
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("StorageExplorer", () => {
  it("lists folders and files from the bucket root", async () => {
    renderExplorer();
    expect(await screen.findByText("docs/")).toBeTruthy();
    expect(screen.getByText("notes.txt")).toBeTruthy();
    expect(screen.getByText("photo.png")).toBeTruthy();
    expect(listMock).toHaveBeenCalledWith("tok", {
      bucket: "bloom-media",
      prefix: "",
      continuationToken: null,
    });
  });

  it("opens the context menu on right-click and renames a file inline", async () => {
    renderExplorer();
    const row = await screen.findByText("notes.txt");
    fireEvent.contextMenu(row);

    const menu = await screen.findByRole("menu");
    expect(menu).toBeTruthy();
    // text file → Edit offered; both menu actions present
    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: /share public link/i }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: /rename/i }));
    const input = await screen.findByLabelText("Rename file");
    fireEvent.change(input, { target: { value: "renamed.txt" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(renameMock).toHaveBeenCalledWith("tok", {
        bucket: "bloom-media",
        key: "notes.txt",
        new_key: "renamed.txt",
        recursive: undefined,
      }),
    );
    // menu closed and the listing refetched after the rename
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });

  it("warns about folder contents before a recursive delete", async () => {
    // folder listing for the "contains N objects" count
    listMock.mockImplementation((_token, args) => {
      if (args.prefix === "docs/") {
        return Promise.resolve({
          folders: [],
          objects: [
            { key: "docs/a.txt", size: 1, last_modified: null },
            { key: "docs/b.txt", size: 2, last_modified: null },
          ],
          next_token: null,
          truncated: false,
        });
      }
      return Promise.resolve(ROOT_PAGE);
    });

    renderExplorer();
    const dots = await screen.findByLabelText("Actions for folder docs");
    fireEvent.click(dots);

    fireEvent.click(
      await screen.findByRole("menuitem", { name: /delete/i }),
    );

    expect(
      await screen.findByText(/contains\s*2\s*objects/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith("tok", {
        bucket: "bloom-media",
        key: "docs/",
        recursive: true,
      }),
    );
  });

  it("generates a share link with the chosen TTL and copies it", async () => {
    renderExplorer();
    const row = await screen.findByText("photo.png");
    fireEvent.contextMenu(row);

    fireEvent.click(
      await screen.findByRole("menuitem", { name: /share public link/i }),
    );

    // PNG → no Edit item, but share is there; modal opens
    const dialog = await screen.findByRole("dialog", {
      name: /share public link/i,
    });
    expect(dialog).toBeTruthy();

    fireEvent.click(screen.getByLabelText("7 days"));
    fireEvent.click(screen.getByRole("button", { name: /generate link/i }));

    await waitFor(() =>
      expect(shareMock).toHaveBeenCalledWith("tok", {
        bucket: "bloom-media",
        key: "photo.png",
        expires_in: 604800,
      }),
    );

    const link = await screen.findByLabelText("Public link");
    expect((link as HTMLInputElement).value).toBe(
      "https://r2.example.com/signed/notes.txt?sig=abc",
    );
    // "anyone with this link … until <expiry>" — the date sits inside a
    // <b>, so match on the paragraph's full textContent.
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          /anyone with this link can read the file until/i.test(
            el?.textContent ?? "",
          ) &&
          /\d{1,2} \w{3} \d{4}/.test(el?.textContent ?? ""),
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://r2.example.com/signed/notes.txt?sig=abc",
      ),
    );
  });

  it("edits a text file in the drawer and saves via PUT content", async () => {
    renderExplorer();
    const row = await screen.findByText("notes.txt");
    fireEvent.contextMenu(row);

    fireEvent.click(await screen.findByRole("menuitem", { name: /edit/i }));

    await waitFor(() =>
      expect(contentMock).toHaveBeenCalledWith("tok", {
        bucket: "bloom-media",
        key: "notes.txt",
      }),
    );

    const editor = await screen.findByLabelText("Edit notes.txt");
    expect((editor as HTMLTextAreaElement).value).toBe("line one\nline two");
    fireEvent.change(editor, { target: { value: "line one\nchanged" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(putContentMock).toHaveBeenCalledWith("tok", {
        bucket: "bloom-media",
        key: "notes.txt",
        content: "line one\nchanged",
      }),
    );
    expect(await screen.findByText(/saved “notes\.txt”/i)).toBeTruthy();
  });

  it("navigates into a folder and back up via the toolbar", async () => {
    renderExplorer();
    fireEvent.click(await screen.findByText("docs/"));
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith("tok", {
        bucket: "bloom-media",
        prefix: "docs/",
        continuationToken: null,
      }),
    );

    fireEvent.click(screen.getByLabelText("Up one level"));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith("tok", {
        bucket: "bloom-media",
        prefix: "",
        continuationToken: null,
      }),
    );
  });

  it("closes the overlay on Escape when nothing else is open", async () => {
    const { onClose } = renderExplorer();
    await screen.findByText("notes.txt");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
